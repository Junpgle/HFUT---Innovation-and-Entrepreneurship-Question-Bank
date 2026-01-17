const AV = require('leanengine');

// ==========================================
// 工具函数区 (Helper Functions)
// ==========================================

/**
 * 通用点赞处理逻辑
 */
async function handleLikeToggle(config) {
  const { currentUser, targetId, targetClass, likeClass, targetIdField, countField, arrayField } = config;

  // 1. 查询目标对象
  const target = await new AV.Query(targetClass).get(targetId, { useMasterKey: true });

  // 2. 禁止给自己点赞
  const author = target.get('author');
  if (author && author.id === currentUser.id) {
    // FIX: 使用对象传递错误码，防止 TypeError
    throw new AV.Cloud.Error('不能给自己点赞', { code: 400 });
  }

  // 3. 查询是否已点赞
  const Like = AV.Object.extend(likeClass);
  const likeQuery = new AV.Query(likeClass);
  likeQuery.equalTo('user', currentUser);
  likeQuery.equalTo(targetIdField, targetId);

  let existing;
  try {
    existing = await likeQuery.first({ useMasterKey: true });
  } catch (error) {
    if (error.code === 101 || error.code === 404 || error.message.indexOf('Class or object') > -1) {
      existing = null;
    } else {
      throw error;
    }
  }

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
 */
async function updateQuestionStats({ questionId, isCorrect, userAnswer, questionTitle, category }) {
  if (!questionId) throw new AV.Cloud.Error('缺少 questionId');

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

  // FIX: 使用 { code: 401 } 对象格式，修复 TypeError crash
  if (!currentUser) throw new AV.Cloud.Error('未登录用户无法保存进度', { code: 401 });

  const email = currentUser.get('email');
  const emailVerified = currentUser.get('emailVerified');

  // FIX: 修复 crash，不要直接传数字
  if (!email) throw new AV.Cloud.Error('请先绑定邮箱后再同步进度', { code: 403 });
  if (!emailVerified) throw new AV.Cloud.Error('您的邮箱尚未验证，请完成验证后再同步', { code: 403 });

  const params = request.params;
  const now = new Date();

  if (!Array.isArray(params.brushedIds) || !Array.isArray(params.masteredIds)) {
    throw new AV.Cloud.Error('数据格式错误：必须为数组');
  }

  // --- 防作弊 ---
  const MIN_SECONDS_PER_QUESTION = 1.5;
  const CHECK_THRESHOLD_COUNT = 10;

  const query = new AV.Query('UserProgress');
  query.equalTo('user', currentUser);
  let progressRecord = await query.first({ useMasterKey: true });

  if (progressRecord) {
    const oldBrushedIds = progressRecord.get('brushedIds') || [];
    const lastUpdatedAt = progressRecord.updatedAt;
    const newBrushedCount = params.brushedIds.length;
    const oldBrushedCount = oldBrushedIds.length;
    const diffCount = newBrushedCount - oldBrushedCount;
    const timeDeltaSeconds = (now.getTime() - lastUpdatedAt.getTime()) / 1000;

    if (diffCount > CHECK_THRESHOLD_COUNT) {
      const minRequiredTime = diffCount * MIN_SECONDS_PER_QUESTION;
      if (timeDeltaSeconds < minRequiredTime) {
        const msg = `同步失败：异常刷题行为。${Math.round(timeDeltaSeconds)}秒完成了${diffCount}题。`;
        console.warn(`[Anti-Cheat] User: ${currentUser.id}, Diff: ${diffCount}, Time: ${timeDeltaSeconds}s`);
        throw new AV.Cloud.Error(msg, { code: 400 });
      }
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

  progressRecord.set('brushedIds', params.brushedIds);
  progressRecord.set('memorizedIds', params.memorizedIds);
  progressRecord.set('masteredIds', params.masteredIds);
  progressRecord.set('wrongIds', params.wrongIds);
  progressRecord.set('history', params.history);

  await progressRecord.save(null, { useMasterKey: true });
  return { success: true, message: '云端同步成功' };
});

/**
 * 2. 用户心跳 (heartbeat)
 */
AV.Cloud.define('heartbeat', async (request) => {
  const currentUser = request.currentUser;
  if (!currentUser) throw new AV.Cloud.Error('未登录', { code: 401 });

  const mode = request.params && request.params.mode ? String(request.params.mode) : 'unknown';
  const Presence = AV.Object.extend('UserPresence');
  const q = new AV.Query('UserPresence');
  q.equalTo('user', currentUser);

  let rec;
  try {
    rec = await q.first({ useMasterKey: true });
  } catch (err) {
    // ignore
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
 * 3. 在线人数 (onlineCount)
 * OPTIMIZATION: 添加 { fetchUser: false } 选项
 * 这个接口不需要验证用户身份，关闭 fetchUser 可以大幅减少 429 错误
 */
AV.Cloud.define('onlineCount', { fetchUser: false }, async (request) => {
  const windowSec = Math.max(30, Math.min(3600, Number(request.params?.windowSec || 600)));
  const since = new Date(Date.now() - windowSec * 1000);

  const q = new AV.Query('UserPresence');
  q.greaterThan('updatedAt', since);

  const modes = request.params?.modes;
  if (modes) {
    const list = Array.isArray(modes) ? modes : [String(modes)];
    q.containedIn('mode', list);
  }

  try {
    const count = await q.count({ useMasterKey: true });
    return { count };
  } catch (err) {
    return { count: 0 };
  }
});

/**
 * 4. 提交答题统计 (recordQuestionResult)
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
    throw new AV.Cloud.Error('记录统计失败: ' + error.message);
  }
});

/**
 * 5. 【兼容修复】提交错题 (recordWrongAnswer)
 */
AV.Cloud.define('recordWrongAnswer', async function(request) {
  const user = request.currentUser;
  if (!user) console.warn('Legacy recordWrongAnswer called without user');

  const { questionId, questionTitle, category } = request.params;

  try {
    await updateQuestionStats({
      questionId,
      isCorrect: false,
      userAnswer: 'OLD',
      questionTitle,
      category
    });
    return { success: true };
  } catch (error) {
    console.error('recordWrongAnswer compatibility error:', error);
    return { success: false };
  }
});

/**
 * 6. 获取错题排行榜 (getWrongQuestionRanking)
 * OPTIMIZATION: 添加 { fetchUser: false }，减少API调用
 */
AV.Cloud.define('getWrongQuestionRanking', { fetchUser: false }, async function(request) {
  const { limit = 20 } = request.params;

  try {
    const query = new AV.Query('WrongQuestionStats');
    query.descending('errorCount');
    query.limit(limit);

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
 * 7. 评论点赞 (likeComment)
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
 * 8. 解析点赞 (likeExplanation)
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