/**
 * 内容审核过滤器
 * 用于检测和过滤用户输入中的不文明词汇
 */

const PROFANITY_WORDS = [
    // --- 常见缩写/拼音 ---
    '傻逼', '傻b', 'sb', 'SB', '煞笔', '傻比',
    'cnm', 'CNM',
    'tm', 'TM', 'tmd', 'TMD',
    'mlgb', 'MLGB',
    'nmb', 'NMB', // 补一个漏掉的
    'lj', 'LJ',   // 垃圾的缩写，有时候容易误伤（如 Log4J），可视情况保留或删除
    'nm', 'NM',   // 尼玛/你妈
    'mmb', 'MMB',

    // --- 中文脏话 (移除单字，改为词组) ---
    // ❌ 已删除单字 '操'，避免误伤 "操作"
    '我操', '操你', '操他', '卧槽', // 改用这些替代
    '草泥马', '艹', // '艹'字生僻，误伤概率较低，可以保留，或者也改成 '我艹'

    '他妈', '他吗', '她妈', '你妈', '尼玛',
    '妈的', '麻痹', '马勒戈壁', '妈卖批',
    '狗日', // 也不要屏蔽单字 '日'

    // --- 侮辱性词汇 ---
    '婊子', '贱人', // 改为双字，避免误伤单字 '贱' (如 "价格低贱" 虽不常用但存在)
    '蠢货', '白痴', '脑残', '智障',
    '去死', '找死',
    '垃圾', // "垃圾"这个词在某些技术语境(垃圾回收 GC)也可能出现，但在评论区通常是脏话，可酌情保留
    '王八蛋', '混蛋', '狗屎', '畜生',

    // --- 英文 ---
    'fuck', 'shit', 'bitch', 'damn'
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
        // 1. 获取检测到的词
        const words = checkResult.detectedWords;

        // 2. (可选) 简单的去重处理
        // 因为你的词库里同时有 'sb' 和 'SB'，且正则不区分大小写，可能导致同一个词被检测出两次
        // 这里用 Set 做个简单的去重，让提示更清爽
        const uniqueWords = [...new Set(words)];

        return {
            valid: false,
            // 3. 将数组用逗号连接，并放入提示消息中
            message: `内容包含不文明用语 “${uniqueWords.join(', ')}”，请修改后再提交`
        };
    }

    return {
        valid: true,
        message: ''
    };
}