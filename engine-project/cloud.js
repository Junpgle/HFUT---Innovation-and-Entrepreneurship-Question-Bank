const AV = require('leanengine');

/**
 * 云函数：secureSync (安全同步) - Pro Max 防作弊版
 * 包含逻辑：权限校验、邮箱验证、数据格式校验、速率限制、异常检测
 * 功能描述：同步用户的刷题进度数据到云端，核心具备防作弊熔断机制，保障数据真实性
 * 入参格式（request.params）：
 * {
 *   brushedIds: Array,    // 已刷题 ID 列表
 *   memorizedIds: Array,  // 已记忆 ID 列表
 *   masteredIds: Array,   // 已掌握 ID 列表
 *   wrongIds: Array,      // 错题 ID 列表
 *   history: Any          // 刷题历史记录（格式由业务定义）
 * }
 * 返回结果：{ success: Boolean, message: String }
 */
// engine-project/cloud.js
AV.Cloud.define('secureSync', async (request) => {
  // 1. 第一步：用户登录状态校验
  // 获取当前请求对应的登录用户（LeanEngine 自动关联登录态）
  const currentUser = request.currentUser;
  if (!currentUser) {
    // 401 未授权状态码：表示用户未完成登录，无法执行同步操作
    throw new AV.Cloud.Error('未登录用户无法保存进度', 401);
  }

  // 2. 第二步：用户邮箱绑定与验证状态校验（提升账号安全性，防止匿名恶意同步）
  const email = currentUser.get('email'); // 获取用户绑定的邮箱
  const emailVerified = currentUser.get('emailVerified'); // 获取用户邮箱验证状态
  if (!email) {
    // 403 禁止访问状态码：表示用户权限不足，需要先完成邮箱绑定
    throw new AV.Cloud.Error('请先绑定邮箱后再同步进度', 403);
  }
  if (!emailVerified) {
    // 403 禁止访问状态码：表示用户邮箱未验证，需要完成验证后再操作
    throw new AV.Cloud.Error('您的邮箱尚未验证，请完成验证后再同步', 403);
  }

  // ------------------------- 数据校验与防作弊逻辑分割线 -------------------------

  // 获取前端传递的同步参数
  const params = request.params;
  // 获取当前服务器时间（用于计算同步时间差，核心防作弊依据）
  const now = new Date();

  // 3. 第三步：基础数据格式校验（防止非法格式数据入库）
  if (!Array.isArray(params.brushedIds) || !Array.isArray(params.masteredIds)) {
    throw new AV.Cloud.Error('数据格式错误：必须为数组');
  }

  // --- 防作弊策略配置区（可根据业务需求调整阈值）---
  const MIN_SECONDS_PER_QUESTION = 1.5; // 阈值：每题至少需要 1.5 秒（极速模式，合理区间可调整为 2-5 秒）
  const CHECK_THRESHOLD_COUNT = 10;     // 只有新增超过 10 题时才启动检测（忽略小批量波动，减少误判）
  // --------------------- 防作弊配置结束 ---------------------

  // 4. 第四步：查询数据库中用户已存在的进度记录
  const query = new AV.Query('UserProgress'); // 实例化 UserProgress 表查询对象
  query.equalTo('user', currentUser); // 条件：查询当前登录用户的进度记录

  // 使用 useMasterKey 强制查询（绕过 ACL 权限限制，确保云函数能获取到用户进度记录）
  let progressRecord = await query.first({ useMasterKey: true });

  if (progressRecord) {
    // === 核心防作弊逻辑：增量速率检测（针对已有进度记录的用户）===

    // 从已有记录中获取旧的刷题 ID 列表（默认空数组，防止 null 报错）
    const oldBrushedIds = progressRecord.get('brushedIds') || [];
    // 获取上次同步的更新时间（LeanEngine 内置字段，自动维护）
    const lastUpdatedAt = progressRecord.updatedAt;

    // 计算本次同步与上次同步的刷题数量增量
    const newBrushedCount = params.brushedIds.length; // 本次同步的刷题总数
    const oldBrushedCount = oldBrushedIds.length; // 上次同步的刷题总数
    const diffCount = newBrushedCount - oldBrushedCount; // 新增刷题数量

    // 计算距离上次同步经过的秒数（时间差：毫秒转秒）
    const timeDeltaSeconds = (now.getTime() - lastUpdatedAt.getTime()) / 1000;

    // 防作弊判定逻辑（双重条件，减少误判）：
    // 1. 只有当题目数量是在“增加”时才检测（允许用户重置进度或减少题目数量）
    // 2. 增量数量必须超过检测阈值（避免网络卡顿导致的瞬间并发同步误判）
    if (diffCount > CHECK_THRESHOLD_COUNT) {

      // 计算完成新增题目所需的最小合理时间（基于预设的每题耗时阈值）
      // 示例：增加了 100 题，至少应该过去 150 秒（100 * 1.5）
      const minRequiredTime = diffCount * MIN_SECONDS_PER_QUESTION;

      // 判定：实际耗时 < 最小合理时间，触发防作弊熔断
      if (timeDeltaSeconds < minRequiredTime) {
        // 构造友好的错误提示信息
        const msg = `同步失败：检测到异常刷题行为。您在 ${Math.round(timeDeltaSeconds)} 秒内完成了 ${diffCount} 道题，速度过快。`;
        // 打印防作弊日志，便于后台排查问题（记录用户 ID、增量、耗时等关键信息）
        console.warn(`[Anti-Cheat] User: ${currentUser.id}, Diff: ${diffCount}, Time: ${timeDeltaSeconds}s, Limit: ${minRequiredTime}s`);

        // 400 错误请求状态码：表示请求参数/行为非法，同步终止
        throw new AV.Cloud.Error(msg, 400);
      }
    }

    // === 防作弊逻辑结束：通过检测则继续执行后续数据落地操作 ===
  } else {
    // 分支逻辑：用户首次同步，无现有进度记录
    // 风控策略：首次同步数据量过大拦截（可选开启，防止批量伪造数据）
    if (params.brushedIds.length > 200) {
      // 注释：如需开启该风控，删除注释即可
      // throw new AV.Cloud.Error('初次同步数据量过大，请分批同步或联系管理员', 400);
    }

    // 实例化 UserProgress 表对象，创建新记录
    const UserProgress = AV.Object.extend('UserProgress');
    progressRecord = new UserProgress();
    progressRecord.set('user', currentUser); // 关联当前登录用户

    // 初始化 ACL 权限控制：保障数据安全，用户只读、不可直接写入（仅云函数可更新）
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true); // 授予当前用户读取权限
    acl.setWriteAccess(currentUser, false); // 禁止当前用户直接写入/修改
    progressRecord.setACL(acl); // 为新记录绑定 ACL 权限
  }

  // 5. 第五步：数据落地（只有通过所有校验和防作弊检测才会执行到此处）
  // 同步更新各类进度数据到记录对象
  progressRecord.set('brushedIds', params.brushedIds);
  progressRecord.set('memorizedIds', params.memorizedIds);
  progressRecord.set('masteredIds', params.masteredIds);
  progressRecord.set('wrongIds', params.wrongIds);
  progressRecord.set('history', params.history);

  // 6. 第六步：管理员权限保存记录（绕过 ACL 限制，确保云函数能写入数据）
  await progressRecord.save(null, { useMasterKey: true });

  // 返回同步成功结果给前端
  return { success: true, message: '云端同步成功' };
});

/**
 * 云函数：heartbeat（用户在线心跳）
 * 功能描述：记录用户最近一次活跃时间与当前操作模式，用于统计在线用户、监控用户活跃度
 * 入参格式（request.params）：
 * {
 *   mode: String (可选) // 用户当前操作模式：quiz(刷题)/mistakes(错题)/memorize(记忆)/dashboard(仪表盘)
 * }
 * 返回结果：{ ok: Boolean }
 */
AV.Cloud.define('heartbeat', async (request) => {
  // 1. 登录状态校验
  const currentUser = request.currentUser;
  if (!currentUser) throw new AV.Cloud.Error('未登录', 401);

  // 2. 获取并格式化用户操作模式（默认值：unknown，防止参数缺失报错）
  const mode = request.params && request.params.mode ? String(request.params.mode) : 'unknown';

  // 3. 实例化 UserPresence 表（用户在线状态表）
  const Presence = AV.Object.extend('UserPresence');
  const q = new AV.Query('UserPresence');
  q.equalTo('user', currentUser);

  let rec; // 用于存储用户在线状态记录对象
  try {
    // 4. 查询用户已有在线状态记录（管理员权限）
    rec = await q.first({ useMasterKey: true });
  } catch (err) {
    // 异常处理：表不存在或记录不存在时，创建新记录
    const msg = String(err && (err.message || err));
    if (err && (err.code === 101 || err.code === 404 || msg.includes('Class or object doesn\'t exists'))) {
      rec = new Presence();
      rec.set('user', currentUser); // 关联当前用户
      // 初始化 ACL 权限：用户只读，不可直接修改
      const acl = new AV.ACL();
      acl.setReadAccess(currentUser, true);
      acl.setWriteAccess(currentUser, false);
      rec.setACL(acl);
    } else {
      // 其他未知异常，向上抛出
      throw err;
    }
  }

  // 兜底逻辑：如果查询结果为空，创建新记录
  if (!rec) {
    rec = new Presence();
    rec.set('user', currentUser);
    const acl = new AV.ACL();
    acl.setReadAccess(currentUser, true);
    acl.setWriteAccess(currentUser, false);
    rec.setACL(acl);
  }

  // 5. 更新用户在线状态数据：当前操作模式 + 最新活跃时间
  rec.set('mode', mode);
  rec.set('lastSeenAt', new Date());

  // 6. 管理员权限保存记录
  await rec.save(null, { useMasterKey: true });
  // 返回心跳记录成功结果
  return { ok: true };
});

/**
 * 云函数：onlineCount（在线人数统计）
 * 功能描述：统计指定时间窗口内活跃的用户数量，支持按操作模式过滤
 * 入参格式（request.params）：
 * {
 *   windowSec: Number (可选) // 时间窗口（秒），默认 600 秒（10 分钟），范围 30-3600 秒
 *   modes: String/Array (可选) // 操作模式过滤，如 ['quiz', 'mistakes']
 * }
 * 返回结果：{ count: Number } // 符合条件的在线用户数量
 */
AV.Cloud.define('onlineCount', async (request) => {
  // 1. 格式化时间窗口参数：限制取值范围（30秒 - 1小时），防止非法参数
  const windowSec = Math.max(30, Math.min(3600, Number(request.params?.windowSec || 600)));
  // 计算活跃时间阈值：当前时间往前推 windowSec 秒
  const since = new Date(Date.now() - windowSec * 1000);
  // 2. 实例化 UserPresence 表查询对象
  const Presence = AV.Object.extend('UserPresence');
  const q = new AV.Query('UserPresence');
  q.greaterThan('updatedAt', since);

  // 3. 可选：按操作模式过滤（如仅统计刷题中的用户）
  const modes = request.params?.modes;
  if (modes) {
    // 格式化过滤条件：统一转为数组格式
    const list = Array.isArray(modes) ? modes : [String(modes)];
    q.containedIn('mode', list); // 条件2：模式在指定列表内
  }

  try {
    // 4. 统计符合条件的记录数量（管理员权限）
    const count = await q.count({ useMasterKey: true });
    // 返回在线用户数量
    return { count };
  } catch (err) {
    // 异常处理：表不存在时，返回 0 （避免前端报错）
    const msg = String(err && (err.message || err));
    if (err && (err.code === 101 || err.code === 404 || msg.includes('Class or object doesn\'t exists'))) {
      return { count: 0 };
    }
    // 其他未知异常，向上抛出
    throw err;
  }
});

/**
 * 云函数：recordWrongAnswer（记录错题统计）
 * 功能描述：记录用户作答错误的题目信息，统计每题的错误次数、总尝试次数和选项选择分布
 * 入参格式（request.params）：
 * {
 *   questionId: String,    // 题目唯一 ID
 *   questionTitle: String, // 题目标题
 *   category: String,      // 题目分类
 *   userAnswer: String     // 用户作答选项（如 "A"、"AB"、"BCD"）
 * }
 * 返回结果：{ success: Boolean }
 */
AV.Cloud.define('recordQuestionResult', async function(request) {
  const { questionId, isCorrect, userAnswer, questionTitle, category } = request.params;
  const user = request.currentUser;

  if (!user) {
    throw new AV.Cloud.Error('用户未登录');
  }

  // 简单参数校验
  if (!questionId) {
    throw new AV.Cloud.Error('缺少 questionId');
  }

  try {
    const query = new AV.Query('WrongQuestionStats');
    query.equalTo('questionId', questionId);
    let stat = await query.first({ useMasterKey: true });

    if (!stat) {
      // 如果没有记录，创建新记录
      const WrongQuestionStats = AV.Object.extend('WrongQuestionStats');
      stat = new WrongQuestionStats();
      stat.set('questionId', questionId);
      stat.set('questionTitle', questionTitle || '未知题目');
      stat.set('category', category || '默认');
      stat.set('errorCount', 0); // 初始错误数 0
      stat.set('totalAttempts', 0); // 初始尝试数 0
      stat.set('optionStats', {});

      // ACL: 所有人可读（看排行榜），不可写
      const acl = new AV.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(false);
      stat.setACL(acl);
    }

    // ------------------------------------------------------
    // 【核心修复逻辑】
    // 1. 无论对错，总尝试次数 +1
    stat.increment('totalAttempts', 1);

    // 2. 只有做错时，错误次数 +1，并记录选项分布
    if (isCorrect === false) {
      stat.increment('errorCount', 1);

      // 更新错题选项分布（用于分析干扰项）
      if (userAnswer) {
        const optionStats = stat.get('optionStats') || {};
        // 假设 userAnswer 是 "A" 或 "BC" 这种字符串
        for (const option of userAnswer) {
          optionStats[option] = (optionStats[option] || 0) + 1;
        }
        stat.set('optionStats', optionStats);
      }
    }
    // ------------------------------------------------------

    await stat.save(null, { useMasterKey: true });
    return { success: true };
  } catch (error) {
    console.error('recordQuestionResult error:', error);
    throw new AV.Cloud.Error('记录统计失败: ' + error.message);
  }
});

/**
 * 云函数：getWrongQuestionRanking（获取错题排行榜）
 * 功能描述：按题目错误次数降序排列，返回错题排行榜，包含错误率和选项统计
 * 入参格式（request.params）：
 * {
 *   limit: Number (可选) // 返回排行榜条数，默认 20 条
 * }
 * 返回结果：{ success: Boolean, ranking: Array } // 排行榜数据列表
 */
AV.Cloud.define('getWrongQuestionRanking', async function(request) {
  // 1. 获取并格式化排行榜条数（默认 20 条）
  const { limit = 20 } = request.params;

  try {
    // 2. 构建错题排行榜查询
    const query = new AV.Query('WrongQuestionStats');
    query.descending('errorCount'); // 排序：按错误次数降序
    query.limit(limit); // 限制返回条数

    // 3. 查询排行榜数据
    const results = await query.find();
    // 4. 格式化返回数据（处理原始查询结果，计算错误率）
    const ranking = results.map((item, index) => {
      const errorCount = item.get('errorCount'); // 错误次数
      const totalAttempts = item.get('totalAttempts') || errorCount; // 总尝试次数（兜底：默认等于错误次数）
      const errorRate = Math.round((errorCount / totalAttempts) * 100); // 计算错误率（四舍五入取整）
      const optionStats = item.get('optionStats') || {}; // 选项统计数据

      return {
        rank: index + 1, // 排行榜名次（从 1 开始）
        questionId: item.get('questionId'),
        questionTitle: item.get('questionTitle'),
        category: item.get('category'),
        errorCount: errorCount,
        totalAttempts: totalAttempts,
        errorRate: errorRate, // 错误率（百分比）
        optionStats: optionStats
      };
    });

    // 5. 返回格式化后的排行榜数据
    return { success: true, ranking };
  } catch (error) {
    // 捕获并打印异常日志
    console.error('getWrongQuestionRanking error:', error);
    throw new AV.Cloud.Error('获取排行榜失败: ' + error.message);
  }
});

/**
 * 通用点赞处理函数（内部工具函数）
 * 功能描述：通用的点赞/取消点赞逻辑，支持评论和解析两种类型
 * @param {Object} config - 配置对象
 * @param {AV.User} config.currentUser - 当前登录用户
 * @param {String} config.targetId - 目标对象 ID（评论 ID 或解析 ID）
 * @param {String} config.targetClass - 目标对象类名（'QuestionComment' 或 'UserExplanation'）
 * @param {String} config.likeClass - 点赞记录类名（'CommentLike' 或 'ExplanationLike'）
 * @param {String} config.targetIdField - 目标 ID 字段名（'commentId' 或 'explanationId'）
 * @param {String} config.countField - 点赞计数字段名（'likes' 或 'votes'）
 * @returns {Object} { success: Boolean, liked: Boolean, count: Number }
 */
async function handleLikeToggle(config) {
  const { currentUser, targetId, targetClass, likeClass, targetIdField, countField } = config;

  // 1. 查询目标对象
  const target = await new AV.Query(targetClass).get(targetId, { useMasterKey: true });

  // 2. 禁止给自己点赞
  const author = target.get('author');
  if (author && author.id === currentUser.id) {
    throw new AV.Cloud.Error('不能给自己点赞', 400);
  }

  // 3. 查询当前用户是否已点赞
  const Like = AV.Object.extend(likeClass);
  const likeQuery = new AV.Query(likeClass);
  likeQuery.equalTo('user', currentUser);
  likeQuery.equalTo(targetIdField, targetId);

  let existing;
  try {
    // 【关键修复】尝试查询点赞记录，捕获表不存在的错误
    existing = await likeQuery.first({ useMasterKey: true });
  } catch (error) {
    if (error.code === 101 || error.code === 404 || error.message.indexOf('Class or object') > -1) {
      existing = null; // 表不存在，视为未点赞
    } else {
      throw error; // 其他错误正常抛出
    }
  }

  let liked;
  if (existing) {
    // 已点赞 -> 取消点赞
    await existing.destroy({ useMasterKey: true });
    target.increment(countField, -1);
    liked = false;
  } else {
    // 未点赞 -> 添加点赞
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
    liked = true;
  }

  // 4. 防止计数为负
  if ((target.get(countField) || 0) < 0) target.set(countField, 0);

  // 5. 保存目标对象
  await target.save(null, { useMasterKey: true });

  return { success: true, liked, count: target.get(countField) || 0 };
}

/**
 * 云函数：likeComment（评论点赞/取消点赞）
 * 功能描述：实现评论的点赞切换功能（已点赞则取消，未点赞则添加），禁止给自己的评论点赞
 * 入参格式（request.params）：
 * {
 *   commentId: String // 评论唯一 ID
 * }
 * 返回结果：{ success: Boolean, liked: Boolean, likes: Number } // liked：当前是否点赞状态，likes：最新点赞数
 */
AV.Cloud.define('likeComment', async (request) => {
  const currentUser = request.currentUser;
  const { commentId } = request.params || {};

  if (!currentUser) throw new AV.Cloud.Error('未登录', 401);
  if (!commentId) throw new AV.Cloud.Error('缺少评论 ID', 400);

  const result = await handleLikeToggle({
    currentUser,
    targetId: commentId,
    targetClass: 'QuestionComment',
    likeClass: 'CommentLike',
    targetIdField: 'commentId',
    countField: 'likes'
  });

  return { ...result, likes: result.count };
});

/**
 * 云函数：likeExplanation（解析点赞/取消点赞）
 * 功能描述：实现用户解析的点赞切换功能（已点赞则取消，未点赞则添加），禁止给自己的解析点赞
 * 入参格式（request.params）：
 * {
 *   explanationId: String // 解析唯一 ID
 * }
 * 返回结果：{ success: Boolean, liked: Boolean, votes: Number } // liked：当前是否点赞状态，votes：最新点赞数
 */
AV.Cloud.define('likeExplanation', async (request) => {
  // 1. 登录状态校验
  const currentUser = request.currentUser;
  // 2. 获取解析 ID 参数
  const { explanationId } = request.params || {};

  if (!currentUser) throw new AV.Cloud.Error('未登录', 401);
  if (!explanationId) throw new AV.Cloud.Error('缺少解析 ID', 400);

  const result = await handleLikeToggle({
    currentUser,
    targetId: explanationId,
    targetClass: 'UserExplanation',
    likeClass: 'ExplanationLike',
    targetIdField: 'explanationId',
    countField: 'votes'
  });

  return { ...result, votes: result.count };
});