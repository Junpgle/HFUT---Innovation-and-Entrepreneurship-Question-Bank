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
// 在文件顶部定义缓存
const AUTHOR_CACHE = new Map();

async function handleLikeToggle(config) {
  const { currentUser, targetId, targetClass, likeClass, targetIdField, countField, arrayField } = config;

  // 1. 获取作者 ID (优先查缓存)
  let targetAuthorId = AUTHOR_CACHE.get(targetId);
  if (!targetAuthorId) {
    const targetObj = await new AV.Query(targetClass)
        .select(['author', countField]) // 仅读取必要字段
        .get(targetId, { useMasterKey: true });
    targetAuthorId = targetObj.get('author')?.id || 'unknown';
    AUTHOR_CACHE.set(targetId, targetAuthorId);
  }

  if (targetAuthorId === currentUser.id) {
    throw new AV.Cloud.Error('不能给自己点赞', { code: 400 });
  }

  // 2. 检查点赞记录
  const likeQuery = new AV.Query(likeClass);
  likeQuery.equalTo('user', currentUser);
  likeQuery.equalTo(targetIdField, targetId);
  const existing = await likeQuery.first({ useMasterKey: true });

  // 3. 构造 Pointer 对象进行原子操作
  const targetPointer = AV.Object.createWithoutData(targetClass, targetId);
  let liked;

  if (existing) {
    // 取消点赞
    await existing.destroy({ useMasterKey: true });
    targetPointer.increment(countField, -1);
    if (arrayField) targetPointer.remove(arrayField, currentUser);

    // 为了兼容返回 count，这里执行 save 后 fetch
    const savedTarget = await targetPointer.save(null, { useMasterKey: true });
    // 如果不放心负数，这里可以做个兜底逻辑
    liked = false;
    return { success: true, liked, count: savedTarget.get(countField) || 0 };
  } else {
    // 添加点赞
    const Like = AV.Object.extend(likeClass);
    const like = new Like();
    like.set('user', currentUser);
    like.set(targetIdField, targetId);

    const acl = new AV.ACL(currentUser); // 为当前用户设置读写权限
    acl.setPublicReadAccess(true);        // 额外开启所有人可读权限
    like.setACL(acl);                     // 显式传递 ACL 对象

    targetPointer.increment(countField, 1);
    if (arrayField) targetPointer.addUnique(arrayField, currentUser);

    // 使用 saveAll 合并请求
    await AV.Object.saveAll([like, targetPointer], { useMasterKey: true });
    liked = true;

    // 注意：saveAll 后的 targetPointer 已包含最新数据
    return { success: true, liked, count: targetPointer.get(countField) || 0 };
  }
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
 * 1. 安全同步进度 (secureSync)
 */
AV.Cloud.define('secureSync', async (request) => {
  const currentUser = request.currentUser;

  // 1. 基础权限校验
  if (!currentUser) throw new AV.Cloud.Error('未登录用户无法保存进度', { code: 401 });

  const email = currentUser.get('email');
  const emailVerified = currentUser.get('emailVerified');

  if (!email) throw new AV.Cloud.Error('请先绑定邮箱后再同步进度', { code: 403 });
  if (!emailVerified) throw new AV.Cloud.Error('您的邮箱尚未验证，请完成验证后再同步', { code: 403 });

  const params = request.params;
  const now = new Date();

  // 2. 数据格式校验
  if (!Array.isArray(params.brushedIds)) throw new AV.Cloud.Error('数据格式错误');

  // --- 3. 原有的用户进度保存逻辑 ---

  const query = new AV.Query('UserProgress');
  query.equalTo('user', currentUser);
  let progressRecord = await query.first({ useMasterKey: true });

  // 防作弊检查 (保留原有逻辑)
  if (progressRecord) {
    const oldBrushedIds = progressRecord.get('brushedIds') || [];
    const lastUpdatedAt = progressRecord.updatedAt;
    const diffCount = params.brushedIds.length - oldBrushedIds.length;
    const timeDeltaSeconds = (now.getTime() - lastUpdatedAt.getTime()) / 1000;

    if (diffCount > 10 && timeDeltaSeconds < diffCount) {
      console.warn(`[Suspicious] User: ${currentUser.id}, Speed: ${diffCount} in ${timeDeltaSeconds}s`);
    }
  } else {
    const UserProgress = AV.Object.extend('UserProgress');
    progressRecord = new UserProgress();
    progressRecord.set('user', currentUser);
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, false);
    progressRecord.setACL(acl);
  }

  // 更新字段
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

/**
 * 【独立补录接口】recoverOutageStats
 * 作用：专门用于扫描客户端上传的历史记录，将故障期间的答题数据补录到排行榜
 */
AV.Cloud.define('recoverOutageStats', async (request) => {
  const currentUser = request.currentUser;

  // 1. 必须登录才能确保不重复统计
  if (!currentUser) return { success: false, msg: '未登录，跳过补录' };

  const params = request.params;

  // 2. 获取用户进度对象（用于检查是否已经补录过）
  const query = new AV.Query('UserProgress');
  query.equalTo('user', currentUser);
  let progressRecord = await query.first({ useMasterKey: true });

  // 如果用户还没有进度记录，说明他是新用户，肯定没参与过那次故障，直接跳过
  if (!progressRecord) return { success: true, msg: '无进度记录，无需补录' };

  // 3. 检查标记：如果已经补录过 v3 版本，直接结束
  const hasPatched = progressRecord.get('patched_20260118_v3');
  if (hasPatched) {
    return { success: true, msg: '已完成补录，无需重复操作' };
  }

  // =========================================================
  // 🔥 核心补录逻辑
  // =========================================================
  const WINDOWS = [
    { start: new Date('2026-01-17T18:52:51.000+08:00'), end: new Date('2026-01-17T23:59:59.000+08:00') },
    { start: new Date('2026-01-18T22:05:00.000+08:00'), end: new Date('2026-01-19T00:00:00.000+08:00') }
  ];

  try {
    const history = Array.isArray(params.history) ? params.history : [];
    const pendingStats = {};

    history.forEach(h => {
      // 筛选条件：答题操作 + 有题号 + 在故障时间窗内
      if (h.action === 'answer' && h.questionId) {
        const recordTime = new Date(h.timestamp);
        const inWindow = WINDOWS.some(w => recordTime >= w.start && recordTime <= w.end);

        if (inWindow) {

          if (!pendingStats[h.questionId]) {
            pendingStats[h.questionId] = { errors: 0, attempts: 0 };
          }
          pendingStats[h.questionId].attempts += 1;
          if (h.isCorrect === false) {
            pendingStats[h.questionId].errors += 1;
          }
        }
      }
    });

    const questionIdsToUpdate = Object.keys(pendingStats);

    if (questionIdsToUpdate.length > 0) {
      console.log(`[Auto Recovery] User ${currentUser.id} patching ${questionIdsToUpdate.length} questions.`);

      const statQuery = new AV.Query('WrongQuestionStats');
      statQuery.containedIn('questionId', questionIdsToUpdate);
      statQuery.limit(1000);
      const existingStats = await statQuery.find({ useMasterKey: true });

      const statsMap = new Map();
      existingStats.forEach(stat => statsMap.set(stat.get('questionId'), stat));

      const dirtyObjects = [];

      for (const qId of questionIdsToUpdate) {
        const { errors, attempts } = pendingStats[qId];
        let statObj = statsMap.get(qId);

        if (!statObj) {
          const WrongQuestionStats = AV.Object.extend('WrongQuestionStats');
          statObj = new WrongQuestionStats();
          statObj.set('questionId', qId);
          statObj.set('questionTitle', '补录数据-等待刷新');
          statObj.set('category', '未知');
          statObj.set('errorCount', 0);
          statObj.set('totalAttempts', 0);
          const acl = new AV.ACL();
          acl.setPublicReadAccess(true);
          acl.setPublicWriteAccess(false);
          statObj.setACL(acl);
        }

        if (errors > 0) statObj.increment('errorCount', errors);
        if (attempts > 0) statObj.increment('totalAttempts', attempts);
        dirtyObjects.push(statObj);
      }

      if (dirtyObjects.length > 0) {
        await AV.Object.saveAll(dirtyObjects, { useMasterKey: true });
      }
    }

    // ✅ 无论这次有没有找到数据，都打上标记。
    // 因为只要检查过一次历史记录没发现问题，以后也不用再检查了。
    progressRecord.set('patched_20260118_v3', true);
    await progressRecord.save(null, { useMasterKey: true });

    return { success: true, count: questionIdsToUpdate.length };

  } catch (err) {
    console.error('[Auto Recovery Failed]', err);
    throw new AV.Cloud.Error('补录失败: ' + err.message);
  }
});

/**
 * 9. 批量提交答题统计 (batchRecordQuestionResult)
 * 作用：接收前端攒的一批数据，一次性写入数据库
 */
AV.Cloud.define('batchRecordQuestionResult', async (request) => {
  const currentUser = request.currentUser;
  if (!currentUser) throw new AV.Cloud.Error('未登录', { code: 401 });

  const { results } = request.params; // results 是一个数组
  if (!Array.isArray(results) || results.length === 0) return { success: true };

  try {
    // 1. 提取所有涉及的 questionId
    const qIds = results.map(r => r.questionId);

    // 2. 批量查询现有的统计对象 (只需 1 次 API)
    const query = new AV.Query('WrongQuestionStats');
    query.containedIn('questionId', qIds);
    query.limit(1000);
    const existingStats = await query.find({ useMasterKey: true });

    // 建立映射表方便查找: questionId -> AV.Object
    const statMap = new Map();
    existingStats.forEach(stat => statMap.set(stat.get('questionId'), stat));

    const dirtyObjects = [];

    // 3. 遍历上传的结果，更新统计数据
    for (const item of results) {
      const { questionId, isCorrect, userAnswer, questionTitle, category } = item;

      let stat = statMap.get(questionId);

      // 如果数据库还没这题，新建一个
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

        // 放入 Map 防止同一次批次里有重复题目导致创建多个对象
        statMap.set(questionId, stat);
      }

      // 原子更新数据
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

      // 标记为待保存 (去重，防止同一个对象被 push 两次)
      if (!dirtyObjects.includes(stat)) {
        dirtyObjects.push(stat);
      }
    }

    // 4. 批量保存 (只需 1 次 API)
    if (dirtyObjects.length > 0) {
      await AV.Object.saveAll(dirtyObjects, { useMasterKey: true });
    }

    return { success: true, count: results.length };

  } catch (error) {
    console.error('Batch stats error:', error);
    // 不抛出错误，避免前端红字
    return { success: false, msg: error.message };
  }
});

module.exports = AV.Cloud;