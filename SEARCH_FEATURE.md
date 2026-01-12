# 题库搜索功能文档 (Question Bank Search Feature Documentation)

## 功能概述 (Feature Overview)

题库搜索功能允许用户通过关键词快速查找题目，并支持多种筛选条件，方便针对性练习。

The Question Bank Search feature allows users to quickly find questions using keywords and supports various filtering options for targeted practice.

## 功能特点 (Key Features)

### 1. 关键词搜索 (Keyword Search)
- 支持搜索题目内容 (Search question content)
- 支持搜索选项内容 (Search option content)
- 支持搜索解析内容 (Search explanation content)
- 不区分大小写 (Case-insensitive search)
- 实时搜索，按Enter键或点击搜索按钮 (Real-time search, press Enter or click search button)

### 2. 高级筛选 (Advanced Filters)

#### 章节筛选 (Lecture Filter)
- 可选择特定章节或所有章节 (Select specific lecture or all lectures)
- 支持7个章节的独立筛选 (Supports filtering by 7 individual lectures)

#### 题型筛选 (Question Type Filter)
- 所有类型 (All types)
- 单选题 (Single choice)
- 多选题 (Multiple choice)
- 判断题 (True/False)

#### 答题状态筛选 (Answer Status Filter)
- 已做题目 (Answered questions) - 显示已经做过的题目
- 未做题目 (Unanswered questions) - 显示尚未做过的题目
- 可以同时勾选或取消勾选 (Can select both or neither)

### 3. 搜索结果展示 (Search Results Display)

#### 结果列表 (Results List)
- 显示找到的题目数量 (Shows number of questions found)
- 最多显示前50个结果 (Displays up to 50 results)
- 每个结果显示：
  - 题号 (Question number)
  - 题型标签（彩色） (Question type tag - colored)
  - 章节信息 (Lecture information)
  - 答题状态（已做/错题） (Answer status - answered/wrong)
  - 题目内容预览（最多2行） (Question preview - max 2 lines)

#### 交互功能 (Interactive Features)
- 点击任一结果可立即进入单题练习 (Click any result to start single question practice)
- 点击"开始练习"按钮可对所有搜索结果进行练习 (Click "Start Practice" button to practice all search results)
- 支持鼠标悬停高亮效果 (Hover highlight effect)

### 4. 一键清除 (Quick Clear)
- 输入框右侧的 X 按钮可快速清除搜索内容 (X button on input clears search content)
- 自动隐藏搜索结果 (Automatically hides search results)

## 使用方法 (How to Use)

### 基本搜索 (Basic Search)
1. 在搜索框中输入关键词 (Enter keyword in search box)
2. 按Enter键或点击"搜索"按钮 (Press Enter or click "Search" button)
3. 查看搜索结果列表 (View search results list)
4. 点击任一题目或"开始练习"按钮开始答题 (Click any question or "Start Practice" button)

### 高级筛选 (Advanced Filtering)
1. 进行基本搜索后 (After performing basic search)
2. 使用下拉菜单选择章节和题型 (Use dropdown menus to select lecture and type)
3. 勾选或取消"已做"/"未做"复选框 (Check/uncheck "Answered"/"Unanswered" checkboxes)
4. 搜索结果会根据筛选条件自动更新 (Results automatically update based on filters)

### 搜索技巧 (Search Tips)
- 使用短关键词获得更多结果 (Use short keywords for more results)
- 使用具体术语获得精确匹配 (Use specific terms for precise matches)
- 结合多个筛选条件缩小范围 (Combine multiple filters to narrow results)
- 如果结果过多（超过50个），使用筛选器缩小范围 (If too many results (>50), use filters to narrow down)

## 技术实现 (Technical Implementation)

### 搜索算法 (Search Algorithm)
```javascript
// 搜索逻辑：在题目、选项、解析中查找关键词
const results = allQuestions.filter(q => {
    const keyword = searchKeyword.toLowerCase().trim();
    const questionMatch = q.question.toLowerCase().includes(keyword);
    const optionsMatch = q.options.some(opt => opt.toLowerCase().includes(keyword));
    const explanationMatch = q.explanation.toLowerCase().includes(keyword);
    return questionMatch || optionsMatch || explanationMatch;
});
```

### 筛选逻辑 (Filter Logic)
- 章节筛选：按 `lectureId` 匹配
- 题型筛选：按 `type` 匹配 (single/multiple/judgment)
- 答题状态：检查题目ID是否在 `brushedIds` 集合中

### 状态管理 (State Management)
```javascript
const [searchKeyword, setSearchKeyword] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [showSearchResults, setShowSearchResults] = useState(false);
const [searchFilters, setSearchFilters] = useState({
    lectureId: 0,
    type: 'all',
    includeAnswered: true,
    includeUnanswered: true
});
```

## UI组件位置 (UI Component Location)

搜索栏位于主控制台的以下位置：
- 在"继续上次的学习"卡片之后（如果有）
- 在同步消息之后（如果有）
- 在主要练习配置区域之前

The search bar is located in the main dashboard:
- After the "Continue last session" card (if present)
- After sync messages (if present)
- Before the main practice configuration area

## 样式特点 (Styling Features)

- 🔍 蓝色搜索图标，突出显示功能
- 圆角卡片设计，与整体UI风格一致
- 响应式布局，在移动设备上也能良好显示
- 悬停效果和过渡动画，提升用户体验
- 禁用状态的视觉反馈

## 浏览器兼容性 (Browser Compatibility)

支持所有现代浏览器：
- Chrome/Edge (推荐)
- Firefox
- Safari
- 移动浏览器 (Mobile browsers)

## 性能优化 (Performance Optimization)

- 搜索结果限制在50个以内，避免渲染过多DOM元素
- 使用trim()和toLowerCase()优化搜索性能
- 懒加载搜索结果，只在需要时执行搜索

## 未来改进 (Future Improvements)

可能的功能增强：
1. 添加搜索历史记录功能
2. 支持正则表达式搜索
3. 添加拼音搜索支持
4. 保存常用搜索条件
5. 添加搜索结果排序选项（按相关度、难度等）
6. 支持模糊匹配和同义词搜索

## 问题反馈 (Feedback)

如果您在使用搜索功能时遇到问题或有改进建议，请：
1. 在GitHub仓库提交Issue
2. 详细描述问题和预期行为
3. 提供搜索关键词示例（如适用）

## 版本历史 (Version History)

- **v1.0.0** (2026-01-12): 初始版本，支持基本搜索和高级筛选功能
  - 关键词搜索
  - 章节筛选
  - 题型筛选
  - 答题状态筛选
  - 搜索结果展示
  - 快速练习功能
