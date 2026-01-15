# 云函数点赞逻辑整合说明

## 概述

Report.jsx中的"我的评论"和"我的解析"板块的点赞功能由cloud.js中的两个云函数管理：
- `likeComment` - 评论点赞
- `likeExplanation` - 解析点赞

## 点赞逻辑流程

### 整体流程图
```
用户点击点赞数
    ↓
调用云函数 (likeComment/likeExplanation)
    ↓
云端处理
├─ 检查登录状态
├─ 检查是否为目标作者（禁止自赞）
├─ 查询是否已点赞
│  ├─ 已点赞 → 删除点赞记录，计数-1
│  └─ 未点赞 → 创建点赞记录，计数+1
├─ 更新目标对象的点赞计数
└─ 返回结果
    ↓
前端更新UI
```

## likeComment 云函数

### 函数定义
```javascript
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
```

### 参数说明
| 参数 | 类型 | 说明 |
|------|------|------|
| commentId | String | 评论的objectId |

### 返回值
```javascript
{
  success: true,
  liked: boolean,  // 点赞后的状态（true=已点赞，false=未点赞）
  likes: number,   // 当前点赞总数
}
```

### 使用示例
```javascript
// 前端调用
AV.Cloud.run('likeComment', { commentId: 'xxx' })
  .then(res => {
    console.log('点赞成功', res);
    // res.liked = true 表示现在已点赞
    // res.likes = 5 表示该评论现在有5个赞
  })
  .catch(err => {
    console.error('点赞失败:', err.message);
  });
```

## likeExplanation 云函数

### 函数定义
```javascript
AV.Cloud.define('likeExplanation', async (request) => {
  const currentUser = request.currentUser;
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
```

### 参数说明
| 参数 | 类型 | 说明 |
|------|------|------|
| explanationId | String | 解析的objectId |

### 返回值
```javascript
{
  success: true,
  liked: boolean,  // 点赞后的状态
  votes: number,   // 当前点赞总数
}
```

## handleLikeToggle 辅助函数

### 核心逻辑

```javascript
async function handleLikeToggle(config) {
  const { 
    currentUser,      // 当前用户
    targetId,         // 目标对象ID
    targetClass,      // 目标对象类名（QuestionComment/UserExplanation）
    likeClass,        // 点赞记录类名（CommentLike/ExplanationLike）
    targetIdField,    // 点赞记录中的关联字段名
    countField        // 点赞计数字段名（likes/votes）
  } = config;

  // 1. 查询目标对象
  const target = await new AV.Query(targetClass).get(targetId);

  // 2. 禁止自赞
  const author = target.get('author');
  if (author && author.id === currentUser.id) {
    throw new AV.Cloud.Error('不能给自己点赞', 400);
  }

  // 3. 查询是否已点赞
  const likeQuery = new AV.Query(likeClass);
  likeQuery.equalTo('user', currentUser);
  likeQuery.equalTo(targetIdField, targetId);
  let existing = await likeQuery.first();

  // 4. 切换点赞状态
  let liked;
  if (existing) {
    // 已点赞 → 取消
    await existing.destroy();
    target.increment(countField, -1);
    liked = false;
  } else {
    // 未点赞 → 新增
    const like = new AV.Object(likeClass);
    like.set('user', currentUser);
    like.set(targetIdField, targetId);
    like.setACL(/* 权限控制 */);
    await like.save();
    target.increment(countField, 1);
    liked = true;
  }

  // 5. 防止计数为负
  if ((target.get(countField) || 0) < 0) {
    target.set(countField, 0);
  }

  // 6. 保存更新
  await target.save();
  return { success: true, liked, count: target.get(countField) || 0 };
}
```

### 关键特性

1. **原子操作**
   - 点赞和计数更新同时进行
   - 避免数据不一致

2. **防止自赞**
   - 检查目标对象的作者
   - 自己不能给自己的内容点赞

3. **一人一赞**
   - 通过CommentLike/ExplanationLike表管理
   - 同一用户同一对象最多一条记录

4. **计数保护**
   - 防止计数为负数
   - 确保数据合理性

## 数据库表结构

### CommentLike 表
```
objectId: String (主键)
user: Pointer (指向User)
commentId: String (关联评论ID)
createdAt: Date
updatedAt: Date
ACL: (公开读，用户可写)
```

### ExplanationLike 表
```
objectId: String (主键)
user: Pointer (指向User)
explanationId: String (关联解析ID)
createdAt: Date
updatedAt: Date
ACL: (公开读，用户可写)
```

### QuestionComment 表 (更新)
```
...
likes: Number (评论点赞数，默认0)
likedBy: Array (点赞用户ID列表)
...
```

### UserExplanation 表 (更新)
```
...
votes: Number (解析点赞数，默认0)
votedBy: Array (点赞用户ID列表)
...
```

## Report.jsx 的调用方式

### 在renderMyCommentsSection中
```javascript
// 显示点赞数和点赞者
<button 
  onClick={() => setShowCommentLikes(showCommentLikes === comment.id ? null : comment.id)}
  className="text-xs text-amber-600"
>
  👍 {comment.likes}
</button>

// 展开时显示点赞者列表
{showCommentLikes === comment.id && comment.likedBy.length > 0 && (
  <div className="mt-2 pt-2 border-t border-slate-200">
    <p className="font-semibold mb-1">👍 点赞者：</p>
    <p>{comment.likedBy.join(', ')}</p>
  </div>
)}
```

### 在renderMyExplanationsSection中
```javascript
// 显示点赞数和点赞者
<button 
  onClick={() => setShowExplanationVotes(showExplanationVotes === exp.id ? null : exp.id)}
  className="text-xs text-amber-600"
>
  👍 {exp.votes}
</button>

// 展开时显示点赞者列表
{showExplanationVotes === exp.id && exp.votedBy.length > 0 && (
  <div className="mt-2 pt-2 border-t border-indigo-200">
    <p className="font-semibold mb-1">👍 点赞者：</p>
    <p>{exp.votedBy.join(', ')}</p>
  </div>
)}
```

## 错误处理

### 常见错误与处理

| 错误 | 原因 | 处理方式 |
|------|------|---------|
| 未登录 | currentUser为null | 提示用户登录 |
| 缺少评论ID | commentId未传入 | 检查参数 |
| 自赞错误 | 用户给自己点赞 | 客户端预防+服务端拒绝 |
| 数据库错误 | 网络或数据库问题 | 重试或提示用户 |

### 前端错误处理示例
```javascript
try {
  const res = await AV.Cloud.run('likeComment', { commentId });
  if (res.success) {
    // 更新本地状态
    const updatedComment = { ...comment, likes: res.likes };
  }
} catch (err) {
  if (err.code === 401) {
    alert('请先登录');
  } else if (err.code === 400) {
    alert('不能给自己点赞');
  } else {
    alert('操作失败: ' + err.message);
  }
}
```

## 性能考虑

### 查询优化
- 使用索引优化CommentLike和ExplanationLike的查询
- 建议在user + commentId/explanationId上建立复合索引

### 缓存策略
- 前端可缓存用户的点赞状态
- 避免频繁重复调用

### 并发处理
- LeanCloud SDK自动处理原子增量操作
- 不需要手动加锁

## 安全性

### 权限控制
1. **认证**
   - 必须登录才能点赞
   - 通过currentUser验证

2. **业务规则**
   - 禁止自赞（服务端强制）
   - 一人一赞（通过表结构保证）

3. **数据隐私**
   - 点赞记录仅作者和点赞者可见（ACL控制）
   - 点赞者列表公开显示

## 与其他功能的交互

### 与刷题页面的关系
- 用户在刷题时可点赞他人评论和解析
- 点赞记录实时同步到数据报表

### 与题目详情弹窗的关系
- 弹窗内也显示点赞数
- 使用相同的云函数处理

### 与错题排行榜的关系
- 排行榜按点赞数排序
- 点赞数实时更新

## 测试建议

### 单元测试
```javascript
// 测试正常点赞
test('点赞成功', async () => {
  const res = await AV.Cloud.run('likeComment', { commentId: 'xxx' });
  expect(res.success).toBe(true);
  expect(res.liked).toBe(true);
});

// 测试取消点赞
test('取消点赞', async () => {
  const res = await AV.Cloud.run('likeComment', { commentId: 'xxx' });
  expect(res.liked).toBe(false);
});

// 测试自赞被拒
test('禁止自赞', async () => {
  expect(() => {
    AV.Cloud.run('likeComment', { commentId: 'myCommentId' });
  }).toThrow('不能给自己点赞');
});
```

### 集成测试
1. 在刷题页面点赞评论
2. 跳转到数据报表验证点赞数更新
3. 编辑/删除评论，验证点赞数保留
4. 删除整条评论，验证点赞记录也删除

## 已知限制

1. 点赞者列表可能很长，超过限制时建议分页
2. 当前不支持点踩功能
3. 点赞者信息仅显示用户名，未来可扩展为用户卡片

