const AV = require('leanengine');

/**
 * 云函数：secureSync (安全同步) - Pro Max 防作弊版
 * 包含逻辑：权限校验、邮箱验证、数据格式校验、速率限制、异常检测
 */
// engine-project/cloud.js
AV.Cloud.define('secureSync', async (request) => {
  const currentUser = request.currentUser;
  if (!currentUser) {
    throw new AV.Cloud.Error('未登录用户无法保存进度', 401);
  }

  // 必须绑定且已验证邮箱
  const email = currentUser.get('email');
  const emailVerified = currentUser.get('emailVerified');
  if (!email) {
    throw new AV.Cloud.Error('请先绑定邮箱后再同步进度', 403);
  }
  if (!emailVerified) {
    throw new AV.Cloud.Error('您的邮箱尚未验证，请完成验证后再同步', 403);
  }

  // -------------------------

  const params = request.params;
  const now = new Date();

  // 2. 基础数据格式校验
  if (!Array.isArray(params.brushedIds) || !Array.isArray(params.masteredIds)) {
    throw new AV.Cloud.Error('数据格式错误：必须为数组');
  }

  // --- 防作弊策略配置 ---
  const MIN_SECONDS_PER_QUESTION = 1.5; // 阈值：每题至少需要 1.5 秒（极速模式）
  const CHECK_THRESHOLD_COUNT = 10;     // 只有新增超过 10 题时才启动检测（忽略小批量波动）
  // ---------------------

  // 3. 查询数据库中现存的记录
  const query = new AV.Query('UserProgress');
  query.equalTo('user', currentUser);

  // 使用 useMasterKey 强制查询（绕过 ACL 限制）
  let progressRecord = await query.first({ useMasterKey: true });

  if (progressRecord) {
    // === 核心防作弊逻辑：增量速率检测 ===

    // 获取旧数据
    const oldBrushedIds = progressRecord.get('brushedIds') || [];
    const lastUpdatedAt = progressRecord.updatedAt; // 上次同步时间

    // 计算增量
    const newBrushedCount = params.brushedIds.length;
    const oldBrushedCount = oldBrushedIds.length;
    const diffCount = newBrushedCount - oldBrushedCount;

    // 计算距离上次同步经过的秒数
    const timeDeltaSeconds = (now.getTime() - lastUpdatedAt.getTime()) / 1000;

    // 判定逻辑：
    // 1. 只有当题目数量是在“增加”时才检测（允许重置或减少）
    // 2. 增量数量必须超过检测阈值（避免网络卡顿导致的瞬间并发误判）
    if (diffCount > CHECK_THRESHOLD_COUNT) {

      // 计算所需的最小合理时间
      // 例如：增加了 100 题，至少应该过去 150 秒
      const minRequiredTime = diffCount * MIN_SECONDS_PER_QUESTION;

      if (timeDeltaSeconds < minRequiredTime) {
        // 触发防作弊熔断
        const msg = `同步失败：检测到异常刷题行为。您在 ${Math.round(timeDeltaSeconds)} 秒内完成了 ${diffCount} 道题，速度过快。`;
        console.warn(`[Anti-Cheat] User: ${currentUser.id}, Diff: ${diffCount}, Time: ${timeDeltaSeconds}s, Limit: ${minRequiredTime}s`);

        throw new AV.Cloud.Error(msg, 400);
      }
    }

    // === 逻辑结束 ===
  } else {
    // 如果是第一次创建记录
    // 策略：如果是首次同步，且数量巨大（比如直接上传 1000 题），也可以进行拦截
    if (params.brushedIds.length > 200) {
      // 首次同步通常不应该有太多数据，除非是老用户迁移，这里做一个简单的风控
      // throw new AV.Cloud.Error('初次同步数据量过大，请分批同步或联系管理员', 400);
    }

    const UserProgress = AV.Object.extend('UserProgress');
    progressRecord = new UserProgress();
    progressRecord.set('user', currentUser);

    // 初始化 ACL：只读不写
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, false);
    progressRecord.setACL(acl);
  }

  // 4. 数据落地 (只有通过防作弊检测才会执行到这里)
  progressRecord.set('brushedIds', params.brushedIds);
  progressRecord.set('memorizedIds', params.memorizedIds);
  progressRecord.set('masteredIds', params.masteredIds);
  progressRecord.set('wrongIds', params.wrongIds);
  progressRecord.set('history', params.history);

  // 5. 管理员权限保存
  await progressRecord.save(null, { useMasterKey: true });

  return { success: true, message: '云端同步成功' };
});

/**
 * 在线心跳：记录用户最近一次活跃时间与模式
 * 参数：mode 可选（quiz/mistakes/memorize/dashboard）
 */
AV.Cloud.define('heartbeat', async (request) => {
  const currentUser = request.currentUser;
  if (!currentUser) throw new AV.Cloud.Error('未登录', 401);

  const mode = request.params && request.params.mode ? String(request.params.mode) : 'unknown';

  const Presence = AV.Object.extend('UserPresence');
  const q = new AV.Query('UserPresence');
  q.equalTo('user', currentUser);

  let rec;
  try {
    rec = await q.first({ useMasterKey: true });
  } catch (err) {
    const msg = String(err && (err.message || err))
    if (err && (err.code === 101 || err.code === 404 || msg.includes('Class or object doesn\'t exists'))) {
      rec = new Presence();
      rec.set('user', currentUser);
      const acl = new AV.ACL();
      acl.setReadAccess(currentUser, true);
      acl.setWriteAccess(currentUser, false);
      rec.setACL(acl);
    } else {
      throw err;
    }
  }

  if (!rec) {
    rec = new Presence();
    rec.set('user', currentUser);
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, false);
    rec.setACL(acl);
  }

  rec.set('mode', mode);
  rec.set('lastSeenAt', new Date());

  await rec.save(null, { useMasterKey: true });
  return { ok: true };
});

/**
 * 在线人数统计：统计最近 windowSec 秒内活跃的用户数量
 * 参数：windowSec (默认 600 秒)，modes (可选字符串或字符串数组过滤)
 */
AV.Cloud.define('onlineCount', async (request) => {
  const windowSec = Math.max(30, Math.min(3600, Number(request.params?.windowSec || 600)));
  const since = new Date(Date.now() - windowSec * 1000);
  const Presence = AV.Object.extend('UserPresence');
  const q = new AV.Query('UserPresence');
  q.greaterThan('updatedAt', since);

  // 过滤模式（如仅统计 quiz/mistakes）
  const modes = request.params?.modes;
  if (modes) {
    const list = Array.isArray(modes) ? modes : [String(modes)];
    q.containedIn('mode', list);
  }

  try {
    const count = await q.count({ useMasterKey: true });
    return { count };
  } catch (err) {
    const msg = String(err && (err.message || err));
    if (err && (err.code === 101 || err.code === 404 || msg.includes('Class or object doesn\'t exists'))) {
      return { count: 0 };
    }
    throw err;
  }
});

AV.Cloud.define('recordWrongAnswer', async function(request) {
  const { questionId, questionTitle, category } = request.params;
  const user = request.currentUser;

  if (!user) {
    throw new AV.Cloud.Error('用户未登录');
  }

  try {
    const query = new AV.Query('WrongQuestionStats');
    query.equalTo('questionId', questionId);
    let stat = await query.first({ useMasterKey: true });

    if (stat) {
      // 更新已有记录
      stat.increment('errorCount', 1);
      stat.increment('totalAttempts', 1);
    } else {
      // 创建新记录
      const WrongQuestionStats = AV.Object.extend('WrongQuestionStats');
      stat = new WrongQuestionStats();
      stat.set('questionId', questionId);
      stat.set('questionTitle', questionTitle);
      stat.set('category', category);
      stat.set('errorCount', 1);
      stat.set('totalAttempts', 1);

      // 设置ACL：所有人可读，仅云代码可写
      const acl = new AV.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(false);
      stat.setACL(acl);
    }

    await stat.save(null, { useMasterKey: true });
    return { success: true };
  } catch (error) {
    console.error('recordWrongAnswer error:', error);
    throw new AV.Cloud.Error('记录错题失败: ' + error.message);
  }
});

AV.Cloud.define('getWrongQuestionRanking', async function(request) {
  const { limit = 20 } = request.params;

  try {
    const query = new AV.Query('WrongQuestionStats');
    query.descending('errorCount');
    query.limit(limit);

    const results = await query.find();
    const ranking = results.map((item, index) => {
      const errorCount = item.get('errorCount');
      const totalAttempts = item.get('totalAttempts') || errorCount;
      const errorRate = Math.round((errorCount / totalAttempts) * 100);

      return {
        rank: index + 1,
        questionId: item.get('questionId'),
        questionTitle: item.get('questionTitle'),
        category: item.get('category'),
        errorCount: errorCount,
        totalAttempts: totalAttempts,
        errorRate: errorRate
      };
    });

    return { success: true, ranking };
  } catch (error) {
    console.error('getWrongQuestionRanking error:', error);
    throw new AV.Cloud.Error('获取排行榜失败: ' + error.message);
  }
});