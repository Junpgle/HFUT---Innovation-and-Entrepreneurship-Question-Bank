# LeanCloud 后端配置说明

本文档说明如何在 LeanCloud 上配置云函数和数据表，以支持新增的三个功能。

## 需要创建的数据表 (Class)

### 1. WrongQuestionStats (错题统计表)
用于记录每道题被答错的次数，生成全站易错题排行榜。

**字段 (Columns):**
- `questionId` (String): 题目ID
- `questionTitle` (String): 题目标题
- `category` (String): 题目分类/章节
- `errorCount` (Number): 答错次数
- `totalAttempts` (Number): 总尝试次数（可选）

**ACL权限:**
- 所有用户可读
- 仅云代码可写

### 2. QuestionComment (题目评论表)
用于存储用户对题目的评论。

**字段 (Columns):**
- `questionId` (String): 题目ID
- `content` (String): 评论内容
- `author` (Pointer -> _User): 评论作者
- `likes` (Number): 点赞数（默认0）
- `createdAt` (Date): 自动创建
- `updatedAt` (Date): 自动更新

**ACL权限:**
- 所有用户可读
- 仅作者可编辑删除

### 3. UserExplanation (用户贡献解析表)
用于存储用户贡献的题目解析。

**字段 (Columns):**
- `questionId` (String): 题目ID
- `content` (String): 解析内容
- `author` (Pointer -> _User): 贡献者
- `votes` (Number): 投票数（默认0）
- `createdAt` (Date): 自动创建
- `updatedAt` (Date): 自动更新

**ACL权限:**
- 所有用户可读
- 仅作者可编辑删除

## 需要添加的云函数 (Cloud Functions)

### 1. recordWrongAnswer
记录错题统计

```javascript
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
```

### 2. getWrongQuestionRanking
获取错题排行榜

```javascript
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
```

## 配置步骤

1. 登录 LeanCloud 控制台
2. 进入应用 > 数据存储 > 结构化数据
3. 创建上述三个 Class（WrongQuestionStats, QuestionComment, UserExplanation）
4. 为每个 Class 添加相应的字段
5. 设置适当的 ACL 权限
6. 进入云引擎 > 云函数
7. 添加上述两个云函数代码
8. 部署云函数

## 注意事项

1. **安全性**: WrongQuestionStats 表应该只允许云代码写入，防止恶意刷数据
2. **性能**: 如果题目数量很大，考虑在 questionId 字段上建立索引
3. **内容审核**: QuestionComment 和 UserExplanation 可能需要内容审核机制
4. **限流**: 建议为云函数添加限流机制，防止滥用
5. **已有的云函数**: 原有的 `secureSync`、`heartbeat`、`onlineCount` 等云函数需要保持不变

## 测试

完成配置后，可以通过以下方式测试：

1. 登录应用，答错一道题
2. 检查 WrongQuestionStats 表是否有新记录
3. 进入错题排行榜页面，查看是否显示数据
4. 在有解析的题目下发表评论
5. 在没有解析的题目下贡献解析

## 故障排查

如果功能不正常：

1. 检查浏览器控制台是否有错误信息
2. 检查 LeanCloud 应用日志
3. 确认云函数是否正确部署
4. 确认数据表权限设置是否正确
5. 确认用户是否已登录
