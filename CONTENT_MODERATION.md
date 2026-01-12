# 内容审核系统说明

## 功能概述

本系统实现了用户共建内容的审核功能，用于过滤评论和用户贡献解析中的不文明词汇。

## 实现位置

- **核心模块**: `hfut-quiz/src/contentFilter.js`
- **集成位置**: `hfut-quiz/src/App.jsx` 的 `submitComment()` 和 `submitUserExplanation()` 函数

## 功能特性

### 1. 内容验证 (`validateContent`)
- 检查内容是否为空
- 检查内容是否包含不文明词汇
- 返回验证结果和友好的错误提示

### 2. 内容检测 (`checkContent`)
- 检测文本中是否包含不文明词汇
- 返回检测结果和检测到的词汇列表

### 3. 内容过滤 (`filterContent`)
- 将不文明词汇替换为星号 (*)
- 可用于日志记录或其他需要显示过滤后内容的场景

## 技术实现

### 性能优化
- 使用预编译的正则表达式模式，避免重复编译
- 在模块加载时一次性编译所有模式

### 安全性
- 对特殊正则表达式字符进行转义，防止注入攻击
- 正确重置 `lastIndex` 避免状态污染

### 词汇列表
当前包含常见的中文和英文不文明用语，位于 `PROFANITY_WORDS` 数组中。

## 使用方式

### 在提交内容前进行验证

```javascript
import { validateContent } from './contentFilter.js';

const handleSubmit = async () => {
    const validation = validateContent(userInput);
    
    if (!validation.valid) {
        // 显示错误消息
        showError(validation.message);
        return;
    }
    
    // 继续提交内容
    await submitContent(userInput);
};
```

## 维护和扩展

### 更新词汇列表

编辑 `contentFilter.js` 中的 `PROFANITY_WORDS` 数组：

```javascript
const PROFANITY_WORDS = [
    '不文明词汇1',
    '不文明词汇2',
    // 添加新词汇...
];
```

### 测试

运行构建命令确保没有语法错误：

```bash
npm run build
```

## 注意事项

1. **词汇列表维护**: 定期根据反馈更新不文明词汇列表
2. **误判处理**: 如发现误判，考虑使用词边界或更精确的匹配规则
3. **多语言支持**: 当前主要支持中文和英文，如需支持其他语言需扩展词汇列表
4. **性能考虑**: 词汇列表不宜过大（建议保持在 100 个以内），过多会影响检测性能

## 安全审计

- ✅ CodeQL 安全扫描通过 (0 告警)
- ✅ 正则表达式注入防护
- ✅ 输入验证和清理

## 相关 Issue

- Issue #1: 用户共建的内容能否增加审核？过滤不文明词汇
