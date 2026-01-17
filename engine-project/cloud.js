const AV = require('leanengine');

// ==========================================
// 内存缓存区 (Memory Cache) - 省钱的关键
// ==========================================

// 1. 在线人数缓存
const ONLINE_COUNT_CACHE = {
  data: 0,
  timestamp: 0,
  TTL: 30 * 1000 // 缓存有效期 30 秒 (30秒内多次调用不消耗数据库额度)
};

// 2. 题目统计对象 ID 缓存
// 映射: questionId (String) -> objectId (String)
// 作用: 答对题时，直接通过 ID 写数据库，省去“查询”步骤
const STATS_ID_CACHE = new Map();

// ==========================================
// 工具函数区 (Helper Functions)
// ==========================================

/**
 * 通用点赞处理逻辑
 * OPTIMIZATION: 使用 Promise.all 并行查询，虽不减 API 数但提升速度
 */
async function handleLikeToggle(config) {
  const { currentUser, targetId, targetClass, likeClass, targetIdField, countField, arrayField } = config;

  // 1. 并行执行两次查询
  const targetQuery = new AV.Query(targetClass).get(targetId, { useMasterKey: true });

  const likeQuery = new AV.Query(likeClass);
  likeQuery.equalTo('user', currentUser);
  likeQuery.equalTo(targetIdField, targetId);
  const existQuery = likeQuery.first({ useMasterKey: true }).catch(e => null); // 忽略查询不到的错误

  const [target, existing] = await Promise.all([targetQuery, existQuery]);

  // 2. 禁止给自己点赞
  const author = target.get('author');
  if (author && author.id === currentUser.id) {
    throw new AV.Cloud.Error('不能给自己点赞', { code: 400 });
  }

  const Like = AV.Object.extend(likeClass);
  let liked;

  if (existing) {
    // 已点赞 -> 取消
    await existing.destroy({ useMasterKey: true });
    target.increment(countField, -1);
    if (arrayField) target.remove(arrayField, currentUser);
    liked = false;
  } else {
    // 未点赞 -> 添加
    const like = new Like();
    like.set('user', currentUser);
    like.set(targetIdField, targetId);

    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    acl.setWriteAccess(currentUser, true);
    like.setACL(acl);
    await like.save(null, { useMasterKey: true });
    target.increment(countField, 1);
    if (arrayField) target.addUnique(arrayField, currentUser);
    liked = true;
  }

  if ((target.get(countField) || 0) < 0) target.set(countField, 0);

  await target.save(null, { useMasterKey: true });
  return { success: true, liked, count: target.get(countField) || 0 };
}

/**
 * 核心统计逻辑：更新题目答题统计
 * OPTIMIZATION: 引入缓存机制，答对时跳过 Query 步骤
 */
async function updateQuestionStats({ questionId, isCorrect, userAnswer, questionTitle, category }) {
  if (!questionId) throw new AV.Cloud.Error('缺少 questionId');

  // 场景 A: 答对 (isCorrect === true)
  // 只需要原子增加 totalAttempts，不需要读取 optionStats。
  // 如果缓存里有 ID，我们可以直接写，省 1 次读 API。
  if (isCorrect === true && STATS_ID_CACHE.has(questionId)) {
    try {
      const objId = STATS_ID_CACHE.get(questionId);
      // 创建一个不带数据的指针对象，直接操作
      const stat = AV.Object.createWithoutData('WrongQuestionStats', objId);
      stat.increment('totalAttempts', 1);
      // 原子保存，无需 useMasterKey (如果 ACL 允许) 或带上 MasterKey
      await stat.save(null, { useMasterKey: true });
      return; // 结束，节省了一次 Query
    } catch (e) {
      // 如果保存失败（比如对象被删了），清除缓存，回退到下面的常规逻辑
      console.warn(`Cache hit failed for ${questionId}, falling back to query.`);
      STATS_ID_CACHE.delete(questionId);
    }
  }

  // 场景 B: 答错 或 缓存未命中
  // 答错必须读取 optionStats 来更新 JSON，无法原子操作，必须 Query。
  const query = new AV.Query('WrongQuestionStats');
  query.equalTo('questionId', questionId);
  let stat = await query.first({ useMasterKey: true });

  if (!stat) {
    const WrongQuestionStats = AV.Object.extend('WrongQuestionStats');
    stat = new WrongQuestionStats();
    stat.set('questionId', questionId);
    stat.set('questionTitle', questionTitle || '未知题目');
    stat.set('category', category || '默认');
    stat.set('errorCount', 0);
    stat.set('totalAttempts', 0);
    stat.set('optionStats', {});

    const acl = new AV.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    stat.setACL(acl);
  } else {
    // 查到了对象，写入缓存，下次答对时就可以省流量了
    STATS_ID_CACHE.set(questionId, stat.id);
  }

  stat.increment('totalAttempts', 1);

  if (isCorrect === false) {
    stat.increment('errorCount', 1);
    if (userAnswer) {
      const optionStats = stat.get('optionStats') || {};
      for (const char of String(userAnswer)) {
        optionStats[char] = (optionStats[char] || 0) + 1;
      }
      stat.set('optionStats', optionStats);
    }
  }

  return await stat.save(null, { useMasterKey: true });
}


// ==========================================
// 云函数定义区 (Cloud Functions)
// ==========================================

/**
 * 1. 安全同步进度
 */
AV.Cloud.define('secureSync', async (request) => {
  const currentUser = request.currentUser;
  if (!currentUser) throw new AV.Cloud.Error('未登录用户无法保存进度', { code: 401 });

  const email = currentUser.get('email');
  const emailVerified = currentUser.get('emailVerified');

  if (!email) throw new AV.Cloud.Error('请先绑定邮箱后再同步进度', { code: 403 });
  if (!emailVerified) throw new AV.Cloud.Error('您的邮箱尚未验证，请完成验证后再同步', { code: 403 });

  const params = request.params;
  const now = new Date();

  // 基础校验
  if (!Array.isArray(params.brushedIds)) throw new AV.Cloud.Error('数据格式错误');

  // --- 防作弊 ---
  const query = new AV.Query('UserProgress');
  query.equalTo('user', currentUser);
  let progressRecord = await query.first({ useMasterKey: true });

  if (progressRecord) {
    const oldBrushedIds = progressRecord.get('brushedIds') || [];
    const lastUpdatedAt = progressRecord.updatedAt;
    const diffCount = params.brushedIds.length - oldBrushedIds.length;
    const timeDeltaSeconds = (now.getTime() - lastUpdatedAt.getTime()) / 1000;

    // 简单限流检查：如果是大量数据更新，检查时间间隔
    if (diffCount > 10 && timeDeltaSeconds < diffCount * 1.0) { // 稍微放宽到 1.0秒/题
      // 仅做警告，暂不阻断，避免误伤
      console.warn(`[Suspicious] User: ${currentUser.id}, Speed: ${diffCount} in ${timeDeltaSeconds}s`);
    }
  } else {
    const UserProgress = AV.Object.extend('UserProgress');
    progressRecord = new UserProgress();
    progressRecord.set('user', currentUser);
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, false); // 用户不可直接写，必须走云函数
    progressRecord.setACL(acl);
  }

  progressRecord.set('brushedIds', params.brushedIds);
  progressRecord.set('memorizedIds', params.memorizedIds);
  progressRecord.set('masteredIds', params.masteredIds);
  progressRecord.set('wrongIds', params.wrongIds);
  progressRecord.set('history', params.history);

  await progressRecord.save(null, { useMasterKey: true });
  return { success: true, message: '云端同步成功' };
});

/**
 * 2. 用户心跳
 */
AV.Cloud.define('heartbeat', async (request) => {
  const currentUser = request.currentUser;
  if (!currentUser) throw new AV.Cloud.Error('未登录', { code: 401 });

  const mode = request.params && request.params.mode ? String(request.params.mode) : 'unknown';

  // OPTIMIZATION: 这里虽然还是要查，但无法避免。
  // 唯一能做的是前端减少 heartbeat 频率（比如从 30s 改为 60s）
  const Presence = AV.Object.extend('UserPresence');
  const q = new AV.Query('UserPresence');
  q.equalTo('user', currentUser);

  let rec = await q.first({ useMasterKey: true });

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
 * 3. 在线人数 (onlineCount)
 * OPTIMIZATION:
 * 1. { fetchUser: false }
 * 2. 增加服务器端内存缓存，30秒内直接返回缓存值
 */
AV.Cloud.define('onlineCount', { fetchUser: false }, async (request) => {
  const now = Date.now();

  // 1. 检查缓存是否有效
  if (now - ONLINE_COUNT_CACHE.timestamp < ONLINE_COUNT_CACHE.TTL) {
    return { count: ONLINE_COUNT_CACHE.data };
  }

  // 2. 缓存失效，查询数据库
  const windowSec = Math.max(30, Math.min(3600, Number(request.params?.windowSec || 600)));
  const since = new Date(now - windowSec * 1000);

  const q = new AV.Query('UserPresence');
  q.greaterThan('updatedAt', since);

  try {
    const count = await q.count({ useMasterKey: true });

    // 3. 更新缓存
    ONLINE_COUNT_CACHE.data = count;
    ONLINE_COUNT_CACHE.timestamp = now;

    return { count };
  } catch (err) {
    return { count: 0 };
  }
});

/**
 * 4. 提交答题统计
 */
AV.Cloud.define('recordQuestionResult', async function(request) {
  const user = request.currentUser;
  if (!user) throw new AV.Cloud.Error('用户未登录');

  const { questionId, isCorrect, userAnswer, questionTitle, category } = request.params;

  try {
    await updateQuestionStats({
      questionId,
      isCorrect,
      userAnswer,
      questionTitle,
      category
    });
    return { success: true };
  } catch (error) {
    console.error('recordQuestionResult error:', error);
    // 不抛出错误，避免前端中断
    return { success: false, msg: error.message };
  }
});

/**
 * 5. 兼容旧版错题提交
 */
AV.Cloud.define('recordWrongAnswer', async function(request) {
  const { questionId, questionTitle, category } = request.params;
  try {
    await updateQuestionStats({
      questionId,
      isCorrect: false, // 强制为错
      userAnswer: 'OLD',
      questionTitle,
      category
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
});

/**
 * 6. 获取错题排行榜
 */
AV.Cloud.define('getWrongQuestionRanking', { fetchUser: false }, async function(request) {
  const { limit = 20 } = request.params;

  try {
    const query = new AV.Query('WrongQuestionStats');
    query.descending('errorCount');
    query.limit(limit);

    // 排行榜数据变化不快，这里也可以考虑加内存缓存，但考虑到 limit 较小，查询开销不大，暂不加
    const results = await query.find();

    const ranking = results.map((item, index) => {
      const errorCount = item.get('errorCount');
      const totalAttempts = item.get('totalAttempts') || errorCount;
      const errorRate = totalAttempts > 0 ? Math.round((errorCount / totalAttempts) * 100) : 0;

      return {
        rank: index + 1,
        questionId: item.get('questionId'),
        questionTitle: item.get('questionTitle'),
        category: item.get('category'),
        errorCount: errorCount,
        totalAttempts: totalAttempts,
        errorRate: errorRate,
        optionStats: item.get('optionStats') || {}
      };
    });

    return { success: true, ranking };
  } catch (error) {
    console.error('getWrongQuestionRanking error:', error);
    throw new AV.Cloud.Error('获取排行榜失败');
  }
});

/**
 * 7. 评论点赞
 */
AV.Cloud.define('likeComment', async (request) => {
  const currentUser = request.currentUser;
  const { commentId } = request.params || {};

  if (!currentUser) throw new AV.Cloud.Error('未登录', { code: 401 });
  if (!commentId) throw new AV.Cloud.Error('缺少评论 ID', { code: 400 });

  const result = await handleLikeToggle({
    currentUser,
    targetId: commentId,
    targetClass: 'QuestionComment',
    likeClass: 'CommentLike',
    targetIdField: 'commentId',
    countField: 'likes',
    arrayField: 'likedBy'
  });

  return { ...result, likes: result.count };
});

/**
 * 8. 解析点赞
 */
AV.Cloud.define('likeExplanation', async (request) => {
  const currentUser = request.currentUser;
  const { explanationId } = request.params || {};

  if (!currentUser) throw new AV.Cloud.Error('未登录', { code: 401 });
  if (!explanationId) throw new AV.Cloud.Error('缺少解析 ID', { code: 400 });

  const result = await handleLikeToggle({
    currentUser,
    targetId: explanationId,
    targetClass: 'UserExplanation',
    likeClass: 'ExplanationLike',
    targetIdField: 'explanationId',
    countField: 'votes',
    arrayField: 'votedBy'
  });

  return { ...result, votes: result.count };
});

module.exports = AV.Cloud;