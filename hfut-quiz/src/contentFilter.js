/**
 * 内容审核过滤器
 * 用于检测和过滤用户输入中的不文明词汇
 */

const PROFANITY_WORDS = [
    '傻逼', '傻b', 'sb', 'SB', '煞笔', '傻比',
    '操', '草泥马', 'cnm', 'CNM', '艹',
    '他妈', '他吗', '她妈', 'tm', 'TM', 'tmd', 'TMD',
    '妈的', '麻痹', '马勒戈壁', 'mlgb', 'MLGB',
    'fuck', 'shit', 'bitch', 'damn',
    '婊', '贱', '蠢', '白痴', '脑残',
    '滚', '去死', '找死',
    '垃圾', 'lj', 'LJ',
    '尼玛', 'nm', 'NM',
    '王八', '混蛋', '狗屎',
    '妈卖批', 'mmb', 'MMB'
];

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 预编译正则表达式
const PROFANITY_PATTERNS = PROFANITY_WORDS.map(word => {
    // 检测是否纯英文单词
    const isEnglish = /^[a-zA-Z]+$/.test(word);

    // 如果是纯英文，加上单词边界 \b，防止匹配到 substring (如 matching "ass" in "class")
    // 如果是中文或混合，直接匹配
    const patternStr = isEnglish ? `\\b${escapeRegex(word)}\\b` : escapeRegex(word);

    return {
        original: word,
        pattern: new RegExp(patternStr, 'gi') // 'g' 全局匹配, 'i' 忽略大小写
    };
});

/**
 * 检测文本是否包含不文明词汇
 */
export function checkContent(text) {
    if (!text || typeof text !== 'string') {
        return { isClean: true, detectedWords: [] };
    }

    const detectedWords = [];

    for (const { original, pattern } of PROFANITY_PATTERNS) {
        // test() 会移动 lastIndex，所以对于简单的检测，match 或者 search 可能更直观
        // 但为了复用 pattern 对象，这里手动重置
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
            detectedWords.push(original);
        }
    }

    return {
        isClean: detectedWords.length === 0,
        detectedWords: detectedWords
    };
}

/**
 * 过滤文本中的不文明词汇
 * 【重要修改】使用 '■' 代替 '*'，避免破坏 Markdown 格式
 */
export function filterContent(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let filteredText = text;

    for (const { original, pattern } of PROFANITY_PATTERNS) {
        // 重置 lastIndex 确保 replace 正常工作
        pattern.lastIndex = 0;

        // 使用 '■' 替换，长度与原词一致
        filteredText = filteredText.replace(pattern, (match) => '■'.repeat(match.length));
    }

    return filteredText;
}

/**
 * 验证内容是否可以发布
 * 注意：既然你在前端使用了 validateContent 阻止提交，
 * 其实 filterContent 可能根本用不上（因为不允许提交脏话）。
 * 但保留 filterContent 用于显示“敏感词屏蔽”的 UI 展示也是很好的。
 */
export function validateContent(text) {
    if (!text || !text.trim()) {
        return {
            valid: false,
            message: '内容不能为空'
        };
    }

    const checkResult = checkContent(text);

    if (!checkResult.isClean) {
        // 这里可以选择直接告诉用户包含了哪些词，或者只提示模糊信息
        return {
            valid: false,
            message: `内容包含不文明用语，请文明发言`
        };
    }

    return {
        valid: true,
        message: ''
    };
}