/**
 * 内容审核过滤器
 * 用于检测和过滤用户输入中的不文明词汇
 */

// 不文明词汇列表（示例，实际应用中应该更完善）
const PROFANITY_WORDS = [
    // 常见不文明用语
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

// 转义正则表达式特殊字符
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 预编译正则表达式模式以提高性能
const PROFANITY_PATTERNS = PROFANITY_WORDS.map(word => ({
    original: word,
    pattern: new RegExp(escapeRegex(word), 'gi')
}));

/**
 * 检测文本是否包含不文明词汇
 * @param {string} text - 待检测的文本
 * @returns {Object} - { isClean: boolean, detectedWords: string[] }
 */
export function checkContent(text) {
    if (!text || typeof text !== 'string') {
        return { isClean: true, detectedWords: [] };
    }

    const detectedWords = [];

    for (const { original, pattern } of PROFANITY_PATTERNS) {
        if (pattern.test(text)) {
            detectedWords.push(original);
            // 重置正则表达式的 lastIndex
            pattern.lastIndex = 0;
        }
    }

    return {
        isClean: detectedWords.length === 0,
        detectedWords: detectedWords
    };
}

/**
 * 过滤文本中的不文明词汇（用星号替换）
 * @param {string} text - 待过滤的文本
 * @returns {string} - 过滤后的文本
 */
export function filterContent(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let filteredText = text;

    for (const { original, pattern } of PROFANITY_PATTERNS) {
        // 使用箭头函数确保每个匹配都被替换
        filteredText = filteredText.replace(pattern, () => '*'.repeat(original.length));
        // 重置正则表达式的 lastIndex
        pattern.lastIndex = 0;
    }

    return filteredText;
}

/**
 * 验证内容是否可以发布
 * @param {string} text - 待验证的文本
 * @returns {Object} - { valid: boolean, message: string }
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
        return {
            valid: false,
            message: '内容包含不文明用语，请修改后再提交'
        };
    }

    return {
        valid: true,
        message: ''
    };
}
