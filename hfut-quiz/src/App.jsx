/*
* version:3.6.5
* log: 非常感谢大家的支持!目前服务器爆火，若遇到api受限提示，请明天再来同步数据！
* 1. 此版本优化api调用次数,新增api受限提示
* 2. 查询在线人数为修改为5分钟一次
* 3. 新增API受限期间错题自动补录
* 4. 新增后端批量保存功能，大幅减少api调用次数
* 5. 修复了函数丢失的问题
* 6. 新增api耗尽时cloudflare版本指引
* */

import {useState, useEffect, useRef} from 'react';
import AV from 'leancloud-storage';
import * as XLSX from 'xlsx';
import localforage from 'localforage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    BookOpen, CheckCircle, XCircle, Brain, Settings,
    ChevronRight, ChevronLeft, RotateCcw, LogOut, AlertCircle, Layers, Loader2,
    AlertTriangle, PieChart, BarChart3, CheckSquare, GraduationCap, Zap,
    UploadCloud, DownloadCloud, RefreshCw, Bookmark, User, Database,
    Maximize, Minimize, Trash2, AlertOctagon, Eye, TrendingUp, MessageSquare,
    ThumbsUp, Send, Edit3, Award, Search, X, Filter, Trophy
} from 'lucide-react';
import { validateContent } from './contentFilter.js';

// --- 配置常量 ---
const LC_APP_ID = "5wPsbnakcoOjfaPzfC44vfW5-gzGzoHsz";
const LC_APP_KEY = "j9qbdfjiJAPsqbGUy04COFTD";
const LC_SERVER_URL = "https://5wpsbnak.lc-cn-n1-shared.com";
const CURRENT_APP_VERSION = '3.6.5';
const LEADERBOARD_LIMIT = 20; // Number of top wrong questions to display

// 题库源：LeanCloud 为主，GitHub raw 兜底
const GITHUB_BASE = "https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/";
const REPORT_URL = "/#/report"; // Hash 路由到 Report.jsx，适配静态托管

// LeanCloud 文件 objectId 映射，优先从 _File 拉取题库
const FILE_ID_MAP = {
    1: "69650188d606e2613f1b18e1",
    2: "69650188d606e2613f1b18dc",
    3: "69650188d606e2613f1b18de",
    4: "69650188d606e2613f1b18df",
    5: "69650188d606e2613f1b18e0",
    6: "69650188d606e2613f1b18db",
    7: "69650188d606e2613f1b18dd",
};

const LECTURES = [
    {id: 1, name: "第一讲：创新创业概述", file: "创新创业基础第一讲习题.xlsx", fileId: FILE_ID_MAP[1], url: "http://lc-5wPsbnak.cn-n1.lcfile.com/sCwXv74yKdHuwzz440gSIKvciB8w5Oxt/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%80%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"},
    {id: 2, name: "第二讲：创新思维与方法", file: "创新创业基础第二讲习题.xlsx", fileId: FILE_ID_MAP[2], url: "http://lc-5wPsbnak.cn-n1.lcfile.com/LW7iNTXd04MjT6xIIgoghNavzJh78BM3/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%8C%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"},
    {id: 3, name: "第三讲：机会与风险识别", file: "创新创业基础第三讲习题.xlsx", fileId: FILE_ID_MAP[3], url: "http://lc-5wPsbnak.cn-n1.lcfile.com/89otiFHMEs0D6EPKY7h6nLLlKT4e3FlW/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%89%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"},
    {id: 4, name: "第四讲：团队与资源整合", file: "创新创业基础第四讲习题.xlsx", fileId: FILE_ID_MAP[4], url: "http://lc-5wPsbnak.cn-n1.lcfile.com/iDvr6YL2DqyDJNQ8WtHF8JoGu8VhXJpB/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%9B%9B%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"},
    {id: 5, name: "第五讲：商业模式与计划", file: "创新创业基础第五讲习题.xlsx", fileId: FILE_ID_MAP[5], url: "http://lc-5wPsbnak.cn-n1.lcfile.com/pmwL2rBspHySjkkGLY6cT4jTSENOw2QE/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%94%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"},
    {id: 6, name: "第六讲：融资与企业设立", file: "创新创业基础第六讲习题.xlsx", fileId: FILE_ID_MAP[6], url: "http://lc-5wPsbnak.cn-n1.lcfile.com/7ftQpmkKv4VtISulAbszw5y9gMtShUUO/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%85%AD%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"},
    {id: 7, name: "第七讲：新企业成长管理", file: "创新创业基础第七讲习题.xlsx", fileId: FILE_ID_MAP[7], url: "http://lc-5wPsbnak.cn-n1.lcfile.com/ng2YT8p8yeERNwiaPXWMJBFwEdPwM7XI/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%83%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"},
];

// 版本号用于兼容未来结构变更
const BANK_CACHE_KEY = 'hf_question_bank';
const BANK_CACHE_VERSION_KEY = 'hf_bank_version';
const BANK_CACHE_VERSION = 1;

// 初始化 SDK
AV.init({appId: LC_APP_ID, appKey: LC_APP_KEY, serverURL: LC_SERVER_URL});

const formatDate = (isoString) => {
    if (!isoString) return '未知时间';

    // 如果是 SQLite 默认格式 "YYYY-MM-DD HH:MM:SS" (没有 T 和 Z)
    // 我们手动补上 " UTC" 让浏览器正确识别
    let dateStr = String(isoString);
    if (!dateStr.includes('T') && !dateStr.includes('Z')) {
        dateStr = dateStr.replace(' ', 'T') + 'Z';
    }

    // 如果已经是 ISO 格式但没带 Z (极少见)，也补上
    // 这里主要处理 D1 返回的格式

    const date = new Date(dateStr);

    // 检查是否有效
    if (isNaN(date.getTime())) return isoString;

    // 转为本地字符串 (例如: 2026/1/17 21:00:00)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // 24小时制
    });
};

// 安全存储封装：IndexedDB 不可用时回退到 localStorage
const safeGet = async (key, fallback = null) => {
    try {
        const v = await localforage.getItem(key);
        if (v !== null && v !== undefined) {
            try {
                localStorage.setItem(key, JSON.stringify(v));
            } catch {
                // Ignore localStorage errors
            }
            return v;
        }
    } catch (err) {
        console.warn(`localforage.getItem(${key}) failed`, err);
    }
    try {
        const raw = localStorage.getItem(key);
        if (raw !== null) return JSON.parse(raw);
    } catch (err) {
        console.warn(`localStorage.getItem(${key}) failed`, err);
    }
    return fallback;
};

const safeSet = async (key, value) => {
    try {
        await localforage.setItem(key, value);
    } catch (err) {
        console.warn(`localforage.setItem(${key}) failed`, err);
    }
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
        console.warn(`localStorage.setItem(${key}) failed`, err);
    }
};

function App() {
    const Markdown = ({ content, size = 'sm', className = '' }) => {
        const components = {
            // --- 标题 ---
            h1: ({ ...props }) => <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-6 mb-4 border-b border-slate-100 pb-2" {...props} />,
            h2: ({ ...props }) => <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-5 mb-3" {...props} />,
            h3: ({ ...props }) => <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-4 mb-2" {...props} />,
            h4: ({ ...props }) => <h4 className="text-base md:text-lg font-bold text-slate-700 mt-3 mb-2" {...props} />,

            // --- 文本段落与排版 ---
            p: ({ ...props }) => <p className="leading-7 text-slate-700 mb-4 break-words" {...props} />,
            strong: ({ ...props }) => <strong className="font-bold text-slate-900" {...props} />,
            em: ({ ...props }) => <em className="italic text-slate-600" {...props} />,
            del: ({ ...props }) => <del className="line-through text-slate-400" {...props} />,
            hr: ({ ...props }) => <hr className="my-6 border-slate-200" {...props} />,

            // --- 引用块 (保持你原有的蓝色风格并微调) ---
            blockquote: ({ ...props }) => (
                <blockquote className="border-l-4 border-blue-400 bg-blue-50/50 text-slate-600 italic px-4 py-3 rounded-r-lg my-4" {...props} />
            ),

            // --- 列表 ---
            ul: ({ ...props }) => <ul className="list-disc pl-5 space-y-1.5 my-3 text-slate-700 marker:text-slate-400" {...props} />,
            ol: ({ ...props }) => <ol className="list-decimal pl-5 space-y-1.5 my-3 text-slate-700 marker:text-slate-500" {...props} />,
            li: ({ ...props }) => <li className="pl-1" {...props} />,

            // --- 链接 (在新标签页打开，增加交互色) ---
            a: ({ href, children, ...props }) => (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors break-all"
                    {...props}
                >
                    {children}
                </a>
            ),

            // --- 代码块与行内代码 ---
            code: ({ node, inline, className, children, ...props }) => {
                // 如果是行内代码 `code`
                if (inline) {
                    return (
                        <code className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-pink-600 font-mono text-[0.9em] border border-slate-200" {...props}>
                            {children}
                        </code>
                    );
                }
                // 如果是代码块 ```code```
                return (
                    <div className="relative my-4 rounded-xl overflow-hidden bg-slate-800 shadow-sm group">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700/50">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                            </div>
                            <span className="text-xs text-slate-400 font-mono">Code</span>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm text-slate-50 font-mono leading-relaxed custom-scrollbar">
                        <code className={className} {...props}>
                            {children}
                        </code>
                    </pre>
                    </div>
                );
            },

            // --- 表格 (基于 remark-gfm) ---
            table: ({ ...props }) => (
                <div className="my-6 w-full overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm text-slate-600" {...props} />
                </div>
            ),
            thead: ({ ...props }) => <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-xs" {...props} />,
            tbody: ({ ...props }) => <tbody className="divide-y divide-slate-100 bg-white" {...props} />,
            tr: ({ ...props }) => <tr className="hover:bg-slate-50/50 transition-colors" {...props} />,
            th: ({ ...props }) => <th className="px-4 py-3 whitespace-nowrap" {...props} />,
            td: ({ ...props }) => <td className="px-4 py-3 whitespace-normal align-top" {...props} />,

            // --- 图片 ---
            img: ({ src, alt, ...props }) => (
                <div className="my-5">
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full h-auto rounded-xl shadow-sm border border-slate-100 mx-auto"
                        loading="lazy"
                        {...props}
                    />
                    {alt && <p className="text-center text-xs text-slate-400 mt-2">{alt}</p>}
                </div>
            ),

            // --- 任务列表复选框 ---
            input: ({ type, ...props }) => {
                if (type === 'checkbox') {
                    return <input type="checkbox" className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none" disabled {...props} />;
                }
                return <input type={type} {...props} />;
            }
        };

        return (
            <div className={`prose prose-${size} max-w-none text-slate-800 ${className}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                    {content}
                </ReactMarkdown>
            </div>
        );
    };

    const [currentUser, setCurrentUser] = useState(AV.User.current());
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 题库状态
    const [allQuestionBank, setAllQuestionBank] = useState({});
    const [bankStatus, setBankStatus] = useState('idle');
    const [bankProgress, setBankProgress] = useState("");
    // eslint-disable-next-line no-unused-vars
    const [bankPercent, setBankPercent] = useState(0);
    const [errorMsg, setErrorMsg] = useState(null);

    // 学习数据
    const [brushedIds, setBrushedIds] = useState(new Set());
    const [memorizedIds, setMemorizedIds] = useState(new Set());
    const [masteredIds, setMasteredIds] = useState(new Set());
    const [wrongIds, setWrongIds] = useState(new Set());
    const [history, setHistory] = useState([]);
    const [lastSession, setLastSession] = useState(null);
    const [hydrated, setHydrated] = useState(false);

    // 交互状态
    const [quizConfig, setQuizConfig] = useState({lectureId: 0, count: 20, type: 'all', filter: 'all'});
    const [questions, setQuestions] = useState([]);
    const [syncStatus, setSyncStatus] = useState(null);
    const [syncMsg, setSyncMsg] = useState("");
    const [showResetModal, setShowResetModal] = useState(false);

    const [currentMode, setCurrentMode] = useState('dashboard');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [isAnswered, setIsAnswered] = useState(false);
    const [answerResults, setAnswerResults] = useState({});

    // 在线人数统计
    const [onlineCount, setOnlineCount] = useState(null);

    // 新功能状态
    const [wrongQuestionRanking, setWrongQuestionRanking] = useState([]);
    const [viewingRankQuestion, setViewingRankQuestion] = useState(null);
    const [questionComments, setQuestionComments] = useState({});
    const [userExplanations, setUserExplanations] = useState({});
    const [showComments, setShowComments] = useState(false);
    const [showExplanationForm, setShowExplanationForm] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [newExplanation, setNewExplanation] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentContent, setEditingCommentContent] = useState('');
    const [editingExplanationId, setEditingExplanationId] = useState(null);
    const [editingExplanationContent, setEditingExplanationContent] = useState('');
    const commentSectionRef = useRef(null);
    const searchSectionRef = useRef(null);
    const [showEmailHint, setShowEmailHint] = useState(false);
    // 版本状态
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [remoteVersionInfo, setRemoteVersionInfo] = useState({ version: '', log: '' });

    // API 额度受限状态
    const [apiLimitReached, setApiLimitReached] = useState(false);

    // 批量发送题目状态策略
    const statsBuffer = useRef([]);
    const BATCH_THRESHOLD = 15; // 攒够 15 题发一次
    const FLUSH_INTERVAL = 60 * 1000; // 或者每 60 秒发一次

    // 统一处理 API 限制错误
    const checkApiLimitError = (error) => {
        if (!error) return;
        // 错误码 140: 超过应用额度 (免费版每天3万次)
        // 错误码 429: 请求过于频繁
        if (error.code === 140) {
            setApiLimitReached(true);
            console.error("API Daily Limit Exceeded");
        }
    };

    // 💾 新增：内存缓存池 (不会触发重新渲染，专门存数据)
    const dataCache = useRef({
        comments: {},     // 格式: { questionId: [list...] }
        explanations: {}  // 格式: { questionId: [list...] }
    });

    // 将缓冲区的数据发送到云端
    const flushStats = async () => {
        const payload = [...statsBuffer.current]; // 复制一份
        if (payload.length === 0) return;

        // 立刻清空缓冲区，防止重复发送
        statsBuffer.current = [];

        try {
            // console.log(`正在批量发送 ${payload.length} 条统计数据...`);
            await AV.Cloud.run('batchRecordQuestionResult', { results: payload });
        } catch (e) {
            checkApiLimitError(e);
            console.error('批量统计发送失败', e);
            // 可选：发送失败可以把数据塞回去下次再发，但为了逻辑简单，这里选择丢弃（非核心数据）
        }
    };

    // 搜索功能状态
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchFilters, setSearchFilters] = useState({
        lectureId: 0,
        type: 'all',
        includeAnswered: true,
        includeUnanswered: true
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);


    // --- 数据加载工具 ---

    // Security: Add file size validation to mitigate ReDoS and Prototype Pollution
    const MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    const EXCEL_PARSE_TIMEOUT = 10000; // 10 second timeout

    // Safe XLSX parsing with timeout and size validation
    const safeParseXLSX = (data) => {
        return new Promise((resolve, reject) => {
            // Validate file size
            if (data.byteLength > MAX_EXCEL_FILE_SIZE) {
                reject(new Error(`File too large: ${data.byteLength} bytes (max: ${MAX_EXCEL_FILE_SIZE})`));
                return;
            }

            // Set timeout to prevent ReDoS attacks
            const timeoutId = setTimeout(() => {
                reject(new Error('Excel parsing timeout - possible ReDoS attack'));
            }, EXCEL_PARSE_TIMEOUT);

            try {
                const workbook = XLSX.read(data, { type: 'array' });
                clearTimeout(timeoutId);
                resolve(workbook);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    };

    const fileUrlCache = {};
    const resolveLectureUrl = async (lecture) => {
        const mapId = lecture?.fileId || FILE_ID_MAP[lecture?.id];
        if (mapId && fileUrlCache[mapId]) return fileUrlCache[mapId];
        if (lecture?.url) return lecture.url;
        if (!mapId) return null;
        try {
            const obj = await new AV.Query('_File').get(mapId);
            const url = obj.get('url');
            if (url) fileUrlCache[mapId] = url;
            return url || null;
        } catch (e) {
            console.warn('resolveLectureUrl failed', lecture?.name, e);
            return null;
        }
    };

    const fetchLectureArrayBuffer = async (lecture) => {
        const urls = [];
        const resolved = await resolveLectureUrl(lecture);
        if (resolved) urls.push(resolved);
        if (lecture?.url && !urls.includes(lecture.url)) urls.push(lecture.url);
        urls.push(`${GITHUB_BASE}${encodeURIComponent(lecture.file)}`);
        const errors = [];
        for (const url of urls) {
            if (!url) continue;
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    errors.push(`HTTP ${res.status}`);
                    continue;
                }
                const arrayBuffer = await res.arrayBuffer();
                return new Uint8Array(arrayBuffer);
            } catch (e) {
                errors.push(e.message);
            }
        }
        return Promise.reject(new Error(`所有题库源均不可用: ${errors.join(' | ')}`));
    };

    const parseExcelData = (rows, lectureId, lectureName) => {
        const cleanRows = rows.filter(r => r && r.length > 0);
        if (cleanRows.length === 0) return [];
        const questions = [];
        let startIndex = 0;
        const headerStr = JSON.stringify(cleanRows[0]);
        if (headerStr.includes("题型") || headerStr.includes("题干")) startIndex = 1;

        for (let i = startIndex; i < cleanRows.length; i++) {
            const row = cleanRows[i];
            const typeRaw = String(row[0] || "").trim();
            const content = String(row[1] || "").trim();
            const answerRaw = String(row[2] || "").trim();
            const explanation = String(row[3] || "").trim();
            if (!content) continue;

            let type = 'single';
            if (typeRaw.includes("多选")) type = 'multiple';
            else if (typeRaw.includes("判断")) type = 'judgment';

            let options = [];
            let correctAnswers = [];

            if (type === 'judgment') {
                options = ['正确', '错误'];
                if (/^[对TtA√]/.test(answerRaw)) correctAnswers = [0];
                else if (/^[错FfB×]/.test(answerRaw)) correctAnswers = [1];
                else correctAnswers = [0];
            } else {
                const optA = row[6];
                const optB = row[7];
                const optC = row[8];
                const optD = row[9];
                const optE = row[10];
                if (optA) options.push(String(optA).trim());
                if (optB) options.push(String(optB).trim());
                if (optC) options.push(String(optC).trim());
                if (optD) options.push(String(optD).trim());
                if (optE) options.push(String(optE).trim());

                const normalizedAns = answerRaw.toUpperCase().replace(/[^A-E]/g, '');
                for (let char of normalizedAns) {
                    const idx = char.charCodeAt(0) - 65;
                    if (idx >= 0 && idx < options.length) correctAnswers.push(idx);
                }
            }
            if (options.length === 0) continue;

            questions.push({
                id: `L${lectureId}-${i}`, type, question: content, options,
                rawAnswer: correctAnswers.sort((a, b) => a - b),
                explanation: explanation || "暂无解析",
                category: lectureName, lectureId: lectureId
            });
        }
        return questions;
    };

    // 【新增】检查版本更新
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const query = new AV.Query('SystemConfig');
                query.equalTo('key', 'app_version');
                const config = await query.first();

                if (config) {
                    const latestVersion = config.get('value');
                    const changelog = config.get('changelog') || '修复了一些已知问题，优化了使用体验。';

                    // 如果云端版本与本地不一致，且云端版本存在
                    if (latestVersion && latestVersion !== CURRENT_APP_VERSION) {
                        setRemoteVersionInfo({
                            version: latestVersion,
                            log: changelog
                        });
                        setShowUpdateModal(true);
                    }
                }
                console.log('查到的配置:', config);
            } catch (e) {
                console.error('检查更新失败', e);
            }
        };

        // 延迟 2 秒检查，避免跟主数据加载抢网络资源
        const timer = setTimeout(() => checkVersion(), 2000);
        return () => clearTimeout(timer);
    }, []);

    // --- Hooks ---
    // 加载本地数据
    useEffect(() => {
        const loadLocal = async () => {
            try {
                const getSet = async (k) => {
                    const val = await safeGet(k);
                    return Array.isArray(val) ? new Set(val) : (val instanceof Set ? val : new Set());
                }
                setBrushedIds(await getSet('app_brushedIds'));
                setMemorizedIds(await getSet('app_memorizedIds'));
                setMasteredIds(await getSet('app_masteredIds'));
                setWrongIds(await getSet('app_wrongIds'));

                const hist = await safeGet('app_history');
                if (hist) setHistory(hist);

                const sess = await safeGet('app_lastSession');
                if (sess) setLastSession(sess);
                setHydrated(true);
            } catch (e) {
                console.error(e);
                setHydrated(true);
            }
        };
        loadLocal();
    }, []);

    // 保存本地数据
    useEffect(() => {
        if (!hydrated) return;
        const save = async () => {
            await safeSet('app_brushedIds', Array.from(brushedIds));
        };
        save().catch(console.error);
    }, [brushedIds, hydrated]);
    useEffect(() => {
        if (!hydrated) return;
        const save = async () => {
            await safeSet('app_memorizedIds', Array.from(memorizedIds));
        };
        save().catch(console.error);
    }, [memorizedIds, hydrated]);
    useEffect(() => {
        if (!hydrated) return;
        const save = async () => {
            await safeSet('app_masteredIds', Array.from(masteredIds));
        };
        save().catch(console.error);
    }, [masteredIds, hydrated]);
    useEffect(() => {
        if (!hydrated) return;
        const save = async () => {
            await safeSet('app_wrongIds', Array.from(wrongIds));
        };
        save().catch(console.error);
    }, [wrongIds, hydrated]);
    useEffect(() => {
        if (!hydrated) return;
        const save = async () => {
            await safeSet('app_history', history);
        };
        save().catch(console.error);
    }, [history, hydrated]);
    useEffect(() => {
        if (!hydrated) return;
        const save = async () => {
            if (lastSession) await safeSet('app_lastSession', lastSession);
            else {
                await localforage.removeItem('app_lastSession').catch(console.warn);
                try {
                    localStorage.removeItem('app_lastSession');
                } catch {
                    // Ignore localStorage errors
                }
            }
        };
        save().catch(console.error);
    }, [lastSession, hydrated]);

    // 一次性迁移（从 localStorage 迁移到 localforage，并修复旧格式）
    useEffect(() => {
        (async () => {
            try {
                const v = await localforage.getItem(BANK_CACHE_VERSION_KEY);
                if (v === BANK_CACHE_VERSION) return; // 已是最新

                const legacy = localStorage.getItem(BANK_CACHE_KEY);
                if (legacy) {
                    try {
                        const obj = JSON.parse(legacy);
                        // 尝试修复：确保每章节是数组且项包含 id/options/rawAnswer
                        const repaired = {};
                        Object.keys(obj || {}).forEach(k => {
                            const arr = Array.isArray(obj[k]) ? obj[k] : [];
                            repaired[k] = arr.filter(x => x && typeof x === 'object').map((x, i) => ({
                                id: x.id || `L${k}-${i}`,
                                type: x.type || 'single',
                                question: x.question || String(x.q || x.title || ''),
                                options: Array.isArray(x.options) ? x.options : (Array.isArray(x.opts) ? x.opts : []),
                                rawAnswer: Array.isArray(x.rawAnswer) ? x.rawAnswer : (Array.isArray(x.answer) ? x.answer : []),
                                explanation: x.explanation || x.exp || '',
                                category: x.category || '',
                                lectureId: Number(k)
                            })).filter(q => q.question && q.options && q.options.length > 0);
                        });
                        await safeSet(BANK_CACHE_KEY, repaired);
                        await safeSet(BANK_CACHE_VERSION_KEY, BANK_CACHE_VERSION);
                    } catch (err) {
                        console.warn('Legacy cache parse failed', err);
                    }
                } else {
                    // 若无 legacy，但也未设置版本，则仅设置版本避免重复迁移
                    await safeSet(BANK_CACHE_VERSION_KEY, BANK_CACHE_VERSION);
                }
            } catch (err) {
                console.warn('Migration step failed', err);
            }
        })();
    }, []);

    // 【新增】自动补录故障期间的数据
    useEffect(() => {
        const tryAutoRecovery = async () => {
            // 必须满足：已加载本地数据、用户已登录、API 没受限
            if (!hydrated || !currentUser || apiLimitReached) return;

            // 为了避免每次刷新页面都请求 API，我们可以先在本地 localStorage 查一下标记
            // 这样能节省大量的 API 调用（连云函数都不用调）
            const localPatchedKey = `patched_20260117_v2_${currentUser.id}`;
            if (localStorage.getItem(localPatchedKey) === 'true') {
                return; // 本地标记已处理，直接跳过
            }

            try {
                // console.log('正在尝试自动补录数据...');
                const res = await AV.Cloud.run('recoverOutageStats', {
                    history: history // 把本地历史传上去
                });

                if (res && res.success) {
                    // 云端处理成功（或者是显示"无需补录"），在本地打个标记
                    // 这样下次刷新页面就不用再发请求了
                    localStorage.setItem(localPatchedKey, 'true');
                    console.log('数据补录检查完成:', res.msg || res.count);
                }
            } catch (e) {
                // 补录失败（可能是网络问题），不打标记，下次进来再试
                console.warn('自动补录请求失败（不影响使用）:', e);
            }
        };

        // 延迟 5 秒执行，让网页先渲染完，避免抢占启动资源
        const timer = setTimeout(tryAutoRecovery, 5000);
        return () => clearTimeout(timer);
    }, [hydrated, currentUser, history, apiLimitReached]);

    // 加载题库
    useEffect(() => {
        const isValidBank = (bank) => {
            if (!bank || typeof bank !== 'object') return false;
            const chapters = Object.values(bank);
            if (!chapters.length) return false;
            const firstChapter = chapters[0];
            if (!Array.isArray(firstChapter) || firstChapter.length === 0) return false;
            const item = firstChapter[0];
            // 兼容较旧结构：存在 id 和 options 即认为可用；若有 rawAnswer 更佳
            return !!(item && typeof item === 'object' && item.id && Array.isArray(item.options));
        };

        const tryRepairBank = (bank) => {
            try {
                const repaired = {};
                Object.keys(bank || {}).forEach(k => {
                    const arr = Array.isArray(bank[k]) ? bank[k] : [];
                    repaired[k] = arr.map((x, i) => ({
                        id: x.id || `L${k}-${i}`,
                        type: x.type || 'single',
                        question: x.question || String(x.q || x.title || ''),
                        options: Array.isArray(x.options) ? x.options : (Array.isArray(x.opts) ? x.opts : []),
                        rawAnswer: Array.isArray(x.rawAnswer) ? x.rawAnswer : (Array.isArray(x.answer) ? x.answer : []),
                        explanation: x.explanation || x.exp || '',
                        category: x.category || '',
                        lectureId: Number(k)
                    })).filter(q => q.question && q.options && q.options.length > 0);
                });
                return repaired;
            } catch {
                return null;
            }
        };

        const loadBankData = async () => {
            // UI 优先渲染
            await new Promise(r => setTimeout(r, 100));
            setBankStatus('loading');
            setBankPercent(0);
            try {
                setBankProgress("检查本地缓存...");
                const cachedBank = await safeGet(BANK_CACHE_KEY);

                if (cachedBank) {
                    if (isValidBank(cachedBank)) {
                        setAllQuestionBank(cachedBank);
                        setBankStatus('ready');
                        setBankProgress('题库已就绪');
                        setBankPercent(100);
                        return;
                    } else {
                        const repaired = tryRepairBank(cachedBank);
                        if (repaired && isValidBank(repaired)) {
                            setAllQuestionBank(repaired);
                            setBankStatus('ready');
                            await safeSet(BANK_CACHE_KEY, repaired);
                            await safeSet(BANK_CACHE_VERSION_KEY, BANK_CACHE_VERSION);
                            setBankProgress('题库已就绪');
                            setBankPercent(100);
                            return;
                        }
                    }
                }

                const total = LECTURES.length;
                const newBank = {};
                let done = 0;
                setBankProgress(`正在下载题库... (0/${total})`);

                for (const lecture of LECTURES) {
                    try {
                        const data = await fetchLectureArrayBuffer(lecture);
                        // Use safe parsing with timeout and size validation
                        const workbook = await safeParseXLSX(data);
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        const parsed = parseExcelData(rawData, lecture.id, lecture.name);
                        if (parsed.length > 0) newBank[lecture.id] = parsed;
                    } catch (error) {
                        console.warn(`Load failed: ${lecture.file}`, error);
                    } finally {
                        done += 1;
                        const percent = Math.round(done / total * 100);
                        setBankPercent(percent);
                        setBankProgress(`正在下载题库... (${done}/${total}) ${percent}%`);
                    }
                }

                if (Object.keys(newBank).length > 0) {
                    setAllQuestionBank(newBank);
                    setBankStatus('ready');
                    await safeSet(BANK_CACHE_KEY, newBank);
                    await safeSet(BANK_CACHE_VERSION_KEY, BANK_CACHE_VERSION);
                    setBankProgress('题库已更新');
                    setBankPercent(100);
                } else {
                    setBankStatus('error');
                    setErrorMsg("无法加载任何题库，请检查网络连接");
                    setBankPercent(0);
                }
            } catch (error) {
                setBankStatus('error');
                setErrorMsg("题库初始化失败: " + error.message);
                setBankPercent(0);
            }
        };
        loadBankData();
    }, []);

    // 消息提示清除
    useEffect(() => {
        if (syncMsg) {
            const timer = setTimeout(() => {
                setSyncMsg("");
                setSyncStatus(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [syncMsg]);

    const refreshBankFromServer = async () => {
        setBankStatus('loading');
        setBankProgress('正在强制更新题库... (0%)');
        setBankPercent(0);
        const newBank = {};
        const total = LECTURES.length;
        let done = 0;
        for (const lecture of LECTURES) {
            try {
                const data = await fetchLectureArrayBuffer(lecture);
                // Use safe parsing with timeout and size validation
                const workbook = await safeParseXLSX(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const parsed = parseExcelData(rawData, lecture.id, lecture.name);
                if (parsed.length > 0) newBank[lecture.id] = parsed;
            } catch (error) {
                console.warn(`强制更新失败: ${lecture.file}`, error);
            } finally {
                done += 1;
                const percent = Math.round(done / total * 100);
                setBankPercent(percent);
                setBankProgress(`正在强制更新题库... (${done}/${total}) ${percent}%`);
            }
        }

        if (Object.keys(newBank).length > 0) {
            setAllQuestionBank(newBank);
            setBankStatus('ready');
            await safeSet(BANK_CACHE_KEY, newBank);
            await safeSet(BANK_CACHE_VERSION_KEY, BANK_CACHE_VERSION);
            setBankProgress('题库已更新');
            setBankPercent(100);
        } else {
            setBankStatus('error');
            setErrorMsg('强制更新失败：所有来源均不可用');
            setBankPercent(0);
        }
    };

    const forceUpdateBank = async () => {
        await refreshBankFromServer();
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleManualSync = async (silent = false) => {
        if (!currentUser) return;
        if (!silent) {
            setSyncStatus('uploading');
            setSyncMsg("备份中...");
        }

        try {
            const email = currentUser.get('email');
            if (!email) {
                if (!silent) {
                    setSyncStatus('error');
                    setSyncMsg("需绑定邮箱");
                    alert("同步失败：\n为了您的数据安全，系统要求必须绑定邮箱才能进行云端备份。\n\n请在注册/设置中绑定邮箱。");
                }
                return;
            }

            const response = await AV.Cloud.run('secureSync', {
                brushedIds: Array.from(brushedIds),
                memorizedIds: Array.from(memorizedIds),
                masteredIds: Array.from(masteredIds),
                wrongIds: Array.from(wrongIds),
                history: history.slice(0, 500) // 限制长度，防止包太大
            });

            if (response && response.success) {
                if (!silent) {
                    setSyncStatus('success');
                    setSyncMsg("备份成功");
                }
            } else {
                return Promise.reject(new Error(response ? response.message : "云端未返回成功状态"));
            }

        } catch (e) {
            checkApiLimitError(e);
            if (!silent) {
                setSyncStatus('error');

                let displayMsg = "备份失败";
                const serverMsg = e.message || "";

                if (serverMsg.includes("邮箱")) {
                    displayMsg = "需验证邮箱";
                    alert("同步失败：\n" + serverMsg);
                    // 【新增】触发 UI 提示，引导用户点击头像
                    setShowEmailHint(true);

                    // 3秒后自动隐藏提示，避免一直挡着（可选，如果想一直显示直到用户点击，就把这行删掉）
                    setTimeout(() => setShowEmailHint(false), 5000);
                } else if (serverMsg.includes("速度过快") || serverMsg.includes("异常")) {
                    displayMsg = "被拦截";
                    alert("同步被拒绝：\n" + serverMsg);
                } else if (serverMsg.includes("Forbidden") || e.code === 403) {
                    displayMsg = "权限不足";
                }

                setSyncMsg(displayMsg);
            }
            console.error("云同步失败:", e);
        }
    };


    const handleManualRestore = async (silent = false) => {
        if (!currentUser) return;
        if (!silent) {
            setSyncStatus('downloading');
            setSyncMsg("恢复中...");
        }
        try {
            const query = new AV.Query('UserProgress');
            query.equalTo('user', currentUser);
            let result;
            try {
                result = await query.first();
            } catch {
                result = null;
            }

            if (result) {
                const data = result.toJSON();

                let newBrushed = new Set(brushedIds);
                let newMemorized = new Set(memorizedIds);
                let newMastered = new Set(masteredIds);
                let newWrong = new Set(wrongIds);
                let newHistory = [...history];

                if (data.brushedIds) newBrushed = new Set([...newBrushed, ...data.brushedIds]);
                if (data.memorizedIds) newMemorized = new Set([...newMemorized, ...data.memorizedIds]);
                if (data.masteredIds) newMastered = new Set([...newMastered, ...data.masteredIds]);
                if (data.wrongIds) newWrong = new Set([...newWrong, ...data.wrongIds]);
                if (data.history && Array.isArray(data.history)) {
                    const existingIds = new Set(newHistory.map(h => h.id));
                    const merged = [...data.history.filter(h => !existingIds.has(h.id)), ...newHistory]
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    newHistory = merged;
                }

                setBrushedIds(newBrushed);
                setMemorizedIds(newMemorized);
                setMasteredIds(newMastered);
                setWrongIds(newWrong);
                setHistory(newHistory);

                // 立即持久化，避免刷新丢失
                await Promise.all([
                    safeSet('app_brushedIds', Array.from(newBrushed)),
                    safeSet('app_memorizedIds', Array.from(newMemorized)),
                    safeSet('app_masteredIds', Array.from(newMastered)),
                    safeSet('app_wrongIds', Array.from(newWrong)),
                    safeSet('app_history', newHistory)
                ]);

                if (!silent) {
                    setSyncStatus('success');
                    setSyncMsg("同步完成");
                }
            } else {
                if (!silent) {
                    setSyncMsg("无数据");
                    setSyncStatus(null);
                }
            }
        } catch {
            if (!silent) {
                setSyncStatus('error');
                setSyncMsg("失败");
            }
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleManualLocalSave = async () => {
        setSyncStatus('saving-local');
        setSyncMsg("本地保存中...");
        try {
            await Promise.all([
                safeSet('app_brushedIds', Array.from(brushedIds)),
                safeSet('app_memorizedIds', Array.from(memorizedIds)),
                safeSet('app_masteredIds', Array.from(masteredIds)),
                safeSet('app_wrongIds', Array.from(wrongIds)),
                safeSet('app_history', history),
                lastSession ? safeSet('app_lastSession', lastSession) : localforage.removeItem('app_lastSession')
            ]);
            if (!lastSession) {
                try {
                    localStorage.removeItem('app_lastSession');
                } catch {
                    // Ignore localStorage errors
                }
            }
            setSyncStatus('success');
            setSyncMsg("本地已保存");
        } catch (err) {
            console.error('手动本地保存失败', err);
            setSyncStatus('error');
            setSyncMsg("本地保存失败");
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleDebugDump = async () => {
        try {
            const payload = {
                brushedIds: Array.from(brushedIds),
                memorizedIds: Array.from(memorizedIds),
                masteredIds: Array.from(masteredIds),
                wrongIds: Array.from(wrongIds),
                historyCount: history.length,
                lastSession: lastSession ? {
                    mode: lastSession.mode,
                    idx: lastSession.currentIndex,
                    qlen: lastSession.questions?.length
                } : null,
                localStorageKeys: Object.keys(localStorage)
            };
            console.log('本地缓存导出', payload);
            alert(`已在控制台打印本地缓存摘要\n已刷:${payload.brushedIds.length}\n错题:${payload.wrongIds.length}\n掌握:${payload.masteredIds.length}`);
        } catch (err) {
            console.error('导出本地缓存失败', err);
            alert('导出本地缓存失败');
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleReloadLocal = async () => {
        try {
            const getSet = async (k) => {
                const val = await safeGet(k);
                return Array.isArray(val) ? new Set(val) : (val instanceof Set ? val : new Set());
            }
            setBrushedIds(await getSet('app_brushedIds'));
            setMemorizedIds(await getSet('app_memorizedIds'));
            setMasteredIds(await getSet('app_masteredIds'));
            setWrongIds(await getSet('app_wrongIds'));
            const hist = await safeGet('app_history');
            if (hist) setHistory(hist); else setHistory([]);
            const sess = await safeGet('app_lastSession');
            if (sess) setLastSession(sess); else setLastSession(null);
            setHydrated(true);
            setSyncStatus('success');
            setSyncMsg('本地已重载');
        } catch (err) {
            console.error('重载本地缓存失败', err);
            setSyncStatus('error');
            setSyncMsg('重载失败');
        }
    };

    const performReset = () => {
        setBrushedIds(new Set());
        setMemorizedIds(new Set());
        setMasteredIds(new Set());
        setWrongIds(new Set());
        setHistory([]);
        setLastSession(null);

        localStorage.removeItem('app_brushedIds');
        localStorage.removeItem('app_memorizedIds');
        localStorage.removeItem('app_masteredIds');
        localStorage.removeItem('app_wrongIds');
        localStorage.removeItem('app_history');
        localStorage.removeItem('app_lastSession');

        setShowResetModal(false);
        setSyncMsg("进度已重置");
        setSyncStatus("success");
    };

    const generateAndStartQuiz = (mode = 'quiz') => {
        if (bankStatus !== 'ready') return;
        setLastSession(null);
        let sourcePool = quizConfig.lectureId === 0 ? Object.values(allQuestionBank).flat() : (allQuestionBank[quizConfig.lectureId] || []);

        if (quizConfig.type !== 'all') {
            sourcePool = sourcePool.filter(q => q.type === quizConfig.type);
        }
        if (quizConfig.filter === 'new') sourcePool = sourcePool.filter(q => !brushedIds.has(q.id));
        else if (quizConfig.filter === 'wrong') sourcePool = sourcePool.filter(q => wrongIds.has(q.id));

        if (sourcePool.length === 0) {
            alert("该条件下没有可用题目");
            return;
        }
        const shuffled = [...sourcePool].sort(() => 0.5 - Math.random());
        const limit = quizConfig.count === 'all' ? shuffled.length : Number(quizConfig.count);
        setQuestions(shuffled.slice(0, limit));
        setAnswerResults({});
        startMode(mode);
    };

    const resumeLastSession = () => {
        if (!lastSession) return;
        setQuestions(lastSession.questions);
        setCurrentIndex(lastSession.currentIndex);
        setQuizConfig(lastSession.quizConfig);
        startMode(lastSession.mode);
    };

    const startMistakeNotebook = () => {
        if (bankStatus !== 'ready') return;
        setLastSession(null);
        const allQs = Object.values(allQuestionBank).flat();
        const wrongQs = allQs.filter(q => wrongIds.has(q.id));
        if (wrongQs.length === 0) {
            alert("暂无错题记录，继续保持！");
            return;
        }
        wrongQs.sort(() => 0.5 - Math.random());
        setQuestions(wrongQs);
        setAnswerResults({});
        startMode('mistakes');
    };

    // 搜索功能
    const performSearch = (keyword = searchKeyword) => {
        if (bankStatus !== 'ready') return;
        if (!keyword.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        const allQs = Object.values(allQuestionBank).flat();
        const lowerKeyword = keyword.toLowerCase().trim();

        let results = allQs.filter(q => {
            // 搜索题目内容、选项和解析
            const questionMatch = q.question?.toLowerCase().includes(lowerKeyword) || false;
            const optionsMatch = q.options?.some(opt => opt && opt.toLowerCase().includes(lowerKeyword)) || false;
            const explanationMatch = q.explanation?.toLowerCase().includes(lowerKeyword) || false;

            return questionMatch || optionsMatch || explanationMatch;
        });

        // 应用过滤器
        if (searchFilters.lectureId !== 0) {
            results = results.filter(q => q.lectureId === searchFilters.lectureId);
        }
        if (searchFilters.type !== 'all') {
            results = results.filter(q => q.type === searchFilters.type);
        }

        // 处理答题状态筛选的边界情况
        if (!searchFilters.includeAnswered && !searchFilters.includeUnanswered) {
            // 两个都不选时，显示所有题目
            // 不应用任何过滤
        } else {
            if (!searchFilters.includeAnswered) {
                results = results.filter(q => !brushedIds.has(q.id));
            }
            if (!searchFilters.includeUnanswered) {
                results = results.filter(q => brushedIds.has(q.id));
            }
        }

        setSearchResults(results);
        setShowSearchResults(true);
    };

    const clearSearch = () => {
        setSearchKeyword('');
        setSearchResults([]);
        setShowSearchResults(false);
    };

    const startSearchQuiz = () => {
        if (searchResults.length === 0) {
            alert("没有搜索结果");
            return;
        }
        setLastSession(null);
        setQuestions([...searchResults]);
        setCurrentIndex(0);
        startMode('quiz');
        setShowSearchResults(false);
    };

    // 发送问题状态
    const submitQuestionResult = async (questionId, isCorrect, questionTitle, category, userAnswer = '') => {
        if (!currentUser) return;

        // 1. 推入缓冲区
        statsBuffer.current.push({
            questionId,
            isCorrect,
            questionTitle,
            category,
            userAnswer
        });

        // 2. 检查是否达到发送阈值
        if (statsBuffer.current.length >= BATCH_THRESHOLD) {
            await flushStats();
        }
    };

    // 加载错题排行榜
    const loadWrongQuestionRanking = async () => {
        try {
            const result = await AV.Cloud.run('getWrongQuestionRanking', { limit: LEADERBOARD_LIMIT });
            if (result && Array.isArray(result.ranking)) {
                setWrongQuestionRanking(result.ranking);
            }
        } catch (e) {
            console.error('加载错题排行榜失败:', e);
        }
    };

    // 从题库中查找题目详情
    const getQuestionDetails = (questionId) => {
        for (const lectureId in allQuestionBank) {
            const questions = allQuestionBank[lectureId];
            const question = questions.find(q => q.id === questionId);
            if (question) return question;
        }
        return null;
    };

    // 打开排行榜题目详情
    const openRankingQuestion = (rankItem) => {
        const questionDetail = getQuestionDetails(rankItem.questionId);
        if (questionDetail) {
            setViewingRankQuestion({ ...questionDetail, rankInfo: rankItem });
            ensureExplanationsLoaded(questionDetail.id);
        } else {
            alert('题库中未找到该题（强制刷新题库可能可以解决）');
        }
    };

    const openSearchQuestion = (param) => {
        let questionItem = null;

        // 1. 兼容性逻辑：判断传入的是对象还是索引数字
        if (typeof param === 'number') {
            if (typeof searchResults !== 'undefined' && searchResults[param]) {
                questionItem = searchResults[param];
            }
        } else {
            questionItem = param;
        }

        // 2. 基础合法性校验
        if (!questionItem || !questionItem.id) {
            console.error("无法打开题目：题目数据不完整或 ID 缺失", param);
            return;
        }

        // 3. 关联排行榜数据：检查该题是否在已加载的排行榜中
        // 这样如果搜到的是热门错题，能直接看到真实的统计数据
        const existingRankData = (typeof wrongQuestionRanking !== 'undefined' && Array.isArray(wrongQuestionRanking))
            ? wrongQuestionRanking.find(r => r.questionId === questionItem.id)
            : null;

        // 4. 构造“安全”的题目对象
        const safeQuestion = {
            ...questionItem,
            options: Array.isArray(questionItem.options) ? questionItem.options : [],
            rawAnswer: Array.isArray(questionItem.rawAnswer) ? questionItem.rawAnswer : [],
            explanation: questionItem.explanation || "暂无解析",
            // 如果找到了排行榜数据则使用真实的，否则使用搜索占位符
            rankInfo: existingRankData ? {
                ...existingRankData,
                rank: `榜单 #${existingRankData.rank}`
            } : {
                rank: '搜索预览',
                errorCount: '-',
                totalAttempts: '-',
                errorRate: '-',
                optionStats: {}
            }
        };

        // 5. 设置预览状态（触发详情弹窗渲染）
        if (typeof setViewingRankQuestion === 'function') {
            setViewingRankQuestion(safeQuestion);
        }

        // 6. 触发云端数据加载（解析与评论）
        if (typeof ensureExplanationsLoaded === 'function') {
            ensureExplanationsLoaded(questionItem.id);
        }
        if (typeof loadQuestionComments === 'function') {
            loadQuestionComments(questionItem.id);
        }
    };

    // 加载题目评论
    const loadQuestionComments = async (questionId) => {
        try {
            const query = new AV.Query('QuestionComment');
            query.equalTo('questionId', questionId);
            query.descending('createdAt');
            query.limit(50);
            query.include('author');
            const results = await query.find();
            const ids = results.map(r => r.id);
            let likedSet = new Set();
            if (currentUser && ids.length) {
                const likeQuery = new AV.Query('CommentLike');
                likeQuery.equalTo('user', currentUser);
                likeQuery.containedIn('commentId', ids);
                const liked = await likeQuery.find();
                likedSet = new Set(liked.map(l => l.get('commentId')));
            }
            const comments = results.map(r => ({
                id: r.id,
                content: r.get('content'),
                author: r.get('author')?.get('username') || '匿名',
                authorId: r.get('author')?.id || '',
                createdAt: r.get('createdAt'),
                likes: r.get('likes') || 0,
                liked: likedSet.has(r.id)
            }));
            setQuestionComments(prev => ({...prev, [questionId]: comments}));
        } catch (e) {
            console.error('加载评论失败:', e);
        }
    };

    // 提交评论
    const submitComment = async (questionId) => {
        if (!currentUser || !newComment.trim()) return;

        // 内容审核
        const validation = validateContent(newComment.trim());
        if (!validation.valid) {
            alert(validation.message);
            setSyncMsg(validation.message);
            setSyncStatus('error');
            return;
        }

        try {
            const Comment = AV.Object.extend('QuestionComment');
            const comment = new Comment();
            comment.set('questionId', questionId);
            comment.set('content', newComment.trim());
            comment.set('author', currentUser);
            comment.set('likes', 0);
            await comment.save();
            setNewComment('');
            await loadQuestionComments(questionId);
            setSyncMsg('评论发布成功');
            setSyncStatus('success');
        } catch (e) {
            console.error('发布评论失败:', e);
            setSyncMsg('评论发布失败');
            setSyncStatus('error');
        }
    };

    const handleLikeComment = async (questionId, comment) => {
        // 1. 基础校验
        if (!currentUser || !comment?.id) return;

        // 2. 防止作者给自己点赞 (保持原有逻辑)
        if (comment.authorId && comment.authorId === currentUser.id) {
            alert("不能给自己点赞哦");
            return;
        }

        try {
            // 3. 请求云函数 (后端会自动判断是点赞还是取消)
            const result = await AV.Cloud.run('likeComment', { commentId: comment.id });

            // result 结构预期: { liked: boolean, likes: number }

            // 4. 精准更新本地状态 (局部刷新，体验更丝滑)
            setQuestionComments(prev => {
                const currentList = prev[questionId] || [];
                // 遍历当前题目的评论列表，找到刚才操作的那一条
                const newList = currentList.map(c => {
                    if (c.id === comment.id) {
                        return {
                            ...c,
                            likes: result.likes, // 使用后端返回的最新数量
                            liked: result.liked  // 使用后端返回的最新状态(true/false)
                        };
                    }
                    return c;
                });

                return { ...prev, [questionId]: newList };
            });

        } catch (e) {
            console.error('点赞操作失败', e);
            // 可以在这里加个 alert 或 setSyncMsg 提示网络错误
        }
    };

    const handleDeleteComment = async (questionId, comment) => {
        if (!currentUser || !comment?.id || comment.authorId !== currentUser.id) return;
        if (!window.confirm('确定删除这条评论吗？')) return;
        try {
            const obj = AV.Object.createWithoutData('QuestionComment', comment.id);
            await obj.destroy();
            setEditingCommentId(null);
            setEditingCommentContent('');
            await loadQuestionComments(questionId);
        } catch (e) {
            console.error('删除评论失败', e);
        }
    };

    const handleStartEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
    };

    const handleUpdateComment = async (questionId) => {
        if (!editingCommentId) return;
        const content = editingCommentContent.trim();
        if (!content) return;
        const validation = validateContent(content);
        if (!validation.valid) {
            setSyncMsg(validation.message);
            setSyncStatus('error');
            return;
        }
        try {
            const obj = AV.Object.createWithoutData('QuestionComment', editingCommentId);
            obj.set('content', content);
            await obj.save();
            setEditingCommentId(null);
            setEditingCommentContent('');
            await loadQuestionComments(questionId);
            setSyncStatus('success');
            setSyncMsg('评论已更新');
        } catch (e) {
            console.error('更新评论失败', e);
            setSyncStatus('error');
            setSyncMsg('更新失败');
        }
    };

    const handleLikeExplanation = async (questionId, explanation) => {
        if (!currentUser || !explanation?.id) return;
        // 只允许给他人点赞
        if (explanation.authorId && explanation.authorId === currentUser.id) return;
        try {
            await AV.Cloud.run('likeExplanation', { explanationId: explanation.id });
            await loadUserExplanations(questionId);
        } catch (e) {
            console.error('解析点赞失败', e);
        }
    };

    const loadUserExplanations = async (questionId) => {
        try {
            const query = new AV.Query('UserExplanation');
            query.equalTo('questionId', questionId);
            query.descending('votes');
            query.include('author');
            const results = await query.find();
            const ids = results.map(r => r.id);
            let likedSet = new Set();
            if (currentUser && ids.length) {
                try {
                    const likeQuery = new AV.Query('ExplanationLike');
                    likeQuery.equalTo('user', currentUser);
                    likeQuery.containedIn('explanationId', ids);
                    const liked = await likeQuery.find();
                    likedSet = new Set(liked.map(l => l.get('explanationId')));
                } catch (err) {
                    // 如果点赞表未建或无权限，忽略错误，保持功能可用
                    console.debug('load ExplanationLike failed, skip likes', err?.message || err);
                    likedSet = new Set();
                }
            }
            const explanations = results.map(r => ({
                id: r.id,
                content: r.get('content'),
                author: r.get('author')?.get('username') || '匿名',
                authorId: r.get('author')?.id || '',
                votes: r.get('votes') || 0,
                createdAt: r.get('createdAt'),
                liked: likedSet.has(r.id)
            }));
            setUserExplanations(prev => ({...prev, [questionId]: explanations}));
        } catch (e) {
            console.error('加载用户解析失败:', e);
        }
    };

    // 复用刷题的解析加载与展示逻辑
    const ensureExplanationsLoaded = (questionId) => {
        if (!questionId) return;
        if (!userExplanations[questionId]) loadUserExplanations(questionId);
    };
    const renderUserExplanations = (questionId) => {
        const list = userExplanations[questionId];
        if (!list || list.length === 0) return null;
        return (
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                    <BookOpen size={14}/> 用户提供的解析
                </p>
                {list.map((exp) => {
                    const isOwner = exp.authorId === currentUser?.id;
                    const isEditing = editingExplanationId === exp.id;
                    return (
                        <div key={exp.id} className="p-2 rounded-lg bg-white border border-slate-100 space-y-2">
                            <div className="text-xs text-slate-500 flex justify-between items-center">
                                <span>{exp.author} · {formatDate(exp.createdAt)}</span>
                                {isOwner && !isEditing && (
                                    <button onClick={() => {setEditingExplanationId(exp.id); setEditingExplanationContent(exp.content);}} className="text-blue-600 text-xs">编辑</button>
                                )}
                            </div>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editingExplanationContent}
                                        onChange={(e) => setEditingExplanationContent(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                        rows={4}
                                    />
                                    <div className="flex gap-2 justify-end text-xs">
                                        <button onClick={() => handleUpdateExplanation(questionId)} className="px-3 py-1 bg-blue-600 text-white rounded-lg">保存</button>
                                        <button onClick={() => {setEditingExplanationId(null); setEditingExplanationContent('');}} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg">取消</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Markdown content={exp.content} />
                                    <div className="flex items-center gap-3 text-xs">
                                        {isOwner ? (
                                            <div className="text-amber-600 flex items-center gap-1">
                                                <ThumbsUp size={12}/> {exp.votes || 0}
                                            </div>
                                        ) : (
                                            <button onClick={() => handleLikeExplanation(questionId, exp)} className="flex items-center gap-1 text-amber-600 hover:text-amber-700">
                                                <ThumbsUp size={12}/> {exp.votes || 0}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // 提交用户解析
    const submitUserExplanation = async (questionId) => {
        if (!currentUser || !newExplanation.trim()) return;

        // 内容审核
        const validation = validateContent(newExplanation.trim());
        if (!validation.valid) {
            alert(validation.message); // 强制弹出提示，告知具体违规词汇
            setSyncMsg(validation.message);
            setSyncStatus('error');
            return;
        }

        try {
            const Explanation = AV.Object.extend('UserExplanation');
            const explanation = new Explanation();
            explanation.set('questionId', questionId);
            explanation.set('content', newExplanation.trim());
            explanation.set('author', currentUser);
            explanation.set('votes', 0);
            await explanation.save();
            setNewExplanation('');
            setShowExplanationForm(false);
            await loadUserExplanations(questionId);
            setSyncMsg('解析提交成功');
            setSyncStatus('success');
        } catch (e) {
            console.error('提交解析失败:', e);
            // 这里你原本已经加了 alert，保持不动即可
            alert("提交解析失败: " + (e.message || "未知错误"));
            setSyncMsg('解析提交失败');
            setSyncStatus('error');
        }
    };

    const handleUpdateExplanation = async (questionId) => {
        if (!editingExplanationId) return;
        const content = editingExplanationContent.trim();
        if (!content) return;
        const validation = validateContent(content);
        if (!validation.valid) {
            setSyncMsg(validation.message);
            setSyncStatus('error');
            return;
        }
        try {
            const obj = AV.Object.createWithoutData('UserExplanation', editingExplanationId);
            obj.set('content', content);
            await obj.save();
            setEditingExplanationId(null);
            setEditingExplanationContent('');
            await loadUserExplanations(questionId);
            setSyncStatus('success');
            setSyncMsg('解析已更新');
        } catch (e) {
            console.error('更新解析失败:', e);
            setSyncStatus('error');
            setSyncMsg('更新解析失败');
        }
    };

    const handleOptionClick = (idx) => {
        if (currentMode === 'memorize' || isAnswered) return;
        const currentQ = questions[currentIndex];
        if (currentQ.type === 'multiple') {
            setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
        } else {
            submitAnswer([idx]);
        }
    };

    const submitAnswer = (finalSelection = selectedIndices) => {
        if (finalSelection.length === 0) return;
        const currentQ = questions[currentIndex];

        // 1. 计算正确性
        const correctSet = new Set(currentQ.rawAnswer);
        const userSet = new Set(finalSelection);
        const isCorrect = correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x));

        // 2. 提前计算用户答案字符串 (如 "AB")，用于 API 提交和历史记录
        // 使用 [...finalSelection] 创建副本再排序，避免修改原数组
        const answerText = [...finalSelection].sort((a, b) => a - b).map(i => ['A', 'B', 'C', 'D', 'E'][i]).join('');

        setIsAnswered(true);
        setSelectedIndices(finalSelection);
        setShowExplanation(true);
        setBrushedIds(prev => new Set(prev).add(currentQ.id));

        if (isCorrect) {
            setWrongIds(prev => {
                const n = new Set(prev);
                n.delete(currentQ.id);
                return n;
            });
            setMasteredIds(prev => new Set(prev).add(currentQ.id));
            setAnswerResults(prev => ({ ...prev, [currentQ.id]: 'correct' }));
        } else {
            setMasteredIds(prev => {
                const n = new Set(prev);
                n.delete(currentQ.id);
                return n;
            });
            setWrongIds(prev => new Set(prev).add(currentQ.id));
            setAnswerResults(prev => ({ ...prev, [currentQ.id]: 'wrong' }));

        }

        // 3. 【新增】无论对错，都提交结果到云端
        // 必须传入 isCorrect (true/false) 和 answerText
        submitQuestionResult(currentQ.id, isCorrect, currentQ.question, currentQ.category, answerText);

        // 4. 更新本地历史记录
        setHistory(prev => [{
            id: Date.now(),
            questionId: currentQ.id,
            questionTitle: currentQ.question,
            action: 'answer',
            isCorrect,
            userAnswer: answerText,
            timestamp: new Date().toISOString(),
        }, ...prev]);

        // 5. 加载评论和用户解析
        loadQuestionComments(currentQ.id);
        if (!isCorrect || !currentQ.explanation || currentQ.explanation === '暂无解析') {
            loadUserExplanations(currentQ.id);
        }
    };

    const handleMemorizeCheck = () => {
        setMemorizedIds(prev => new Set(prev).add(questions[currentIndex].id));
        setHistory(prev => [{
            id: Date.now(),
            questionId: questions[currentIndex].id,
            questionTitle: questions[currentIndex].question,
            action: 'memorize',
            timestamp: new Date().toISOString(),
        }, ...prev]);
        setTimeout(() => nextQuestion(), 400);
    };

    const startMode = (mode) => {
        setCurrentMode(mode);
        if (mode !== currentMode) {
            setSelectedIndices([]);
            setIsAnswered(false);
            setShowExplanation(false);
        }
    };

    const changeQuestion = (idx) => {
        setCurrentIndex(idx);
        setSelectedIndices([]);
        setIsAnswered(false);
        setShowExplanation(false);
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) changeQuestion(currentIndex + 1);
        else {
            alert("本组练习完成！");
            setLastSession(null);
            setCurrentMode('dashboard');
        }
    };
    const prevQuestion = () => {
        if (currentIndex > 0) changeQuestion(currentIndex - 1);
    };
    const exitToDashboard = () => {
        if (['quiz', 'memorize', 'mistakes'].includes(currentMode) && questions.length > 0 && currentIndex < questions.length - 1) {
            setLastSession({mode: currentMode, questions, currentIndex, quizConfig});
        } else {
            setLastSession(null);
        }
        setCurrentMode('dashboard');
    };


    // Helper renderers moved out of JSX return
    const renderDashboard = () => (
        <div className="h-screen flex flex-col max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 overflow-hidden">
            <header className="flex justify-between items-center mb-6 md:mb-8 shrink-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
                        <GraduationCap className="text-blue-600 w-6 h-6 md:w-8 md:h-8"/>
                        <span>创新创业</span>
                    </h1>
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 pl-8 md:pl-11">欢迎, {currentUser.getUsername()}</p>
                </div>
                <div className="flex gap-2 md:gap-3 items-center">
                    {onlineCount !== null && (
                        <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 text-xs md:text-sm font-medium flex items-center gap-2">
                            <User size={16}/> 在线：{onlineCount}
                        </div>
                    )}
                    {syncMsg && (
                        <div className="px-3 py-2 rounded-xl border text-xs md:text-sm font-semibold flex items-center gap-2 bg-white shadow-sm" aria-live="polite">
                            {syncStatus === 'success' && <CheckCircle size={14} className="text-green-600" />}
                            {syncStatus === 'error' && <AlertCircle size={14} className="text-red-500" />}
                            {syncStatus === 'uploading' && <Loader2 size={14} className="animate-spin text-blue-500" />}
                            {syncStatus === 'downloading' && <DownloadCloud size={14} className="text-blue-500" />}
                            <span className="text-slate-600">{syncMsg}</span>
                        </div>
                    )}
                    <button
                        onClick={() => { window.location.hash = '#/introduce'; }}
                        className="p-2 md:px-3 md:py-2 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-indigo-600 transition-all border border-slate-100"
                        title="产品介绍"
                    >
                        <GraduationCap size={18} className="md:w-5 md:h-5" />
                    </button>
                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-blue-600 transition-all border border-slate-100"
                        title="搜索题目"
                    >
                        <Search size={18} className="md:w-5 md:h-5"/>
                    </button>
                    <button onClick={toggleFullscreen}
                            className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100">
                        {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}
                    </button>
                    {/* 【修改】个人中心按钮及提示气泡 */}
                    <div className="relative inline-block"> {/* 1. 加一个 relative 容器 */}
                        <button onClick={() => location.href = 'profile.html'}
                                className={`p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 relative ${showEmailHint ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
                                title="个人中心">
                            <User size={18} className={`md:w-5 md:h-5 ${showEmailHint ? 'text-red-500' : ''}`}/>

                            {/* 如果有提示，给按钮加个小红点 */}
                            {showEmailHint && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                        </button>

                        {/* 2. 悬浮提示气泡 */}
                        {showEmailHint && (
                            <div className="absolute top-12 right-0 w-32 z-50 animate-bounce">
                                <div className="bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg relative text-center">
                                    <div className="absolute -top-1 right-4 w-3 h-3 bg-red-500 rotate-45"></div> {/* 小箭头 */}
                                    点我验证邮箱
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="hidden md:flex gap-3">
                        {bankStatus === 'ready' && (
                            <div
                                className="px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm font-medium flex items-center gap-2">
                                <Database size={16}/> 题库已就绪
                            </div>
                        )}
                        <button onClick={() => handleManualSync()} disabled={syncStatus === 'uploading'}
                                className="px-4 py-2 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-all">
                            {syncStatus === 'uploading' ? <Loader2 className="animate-spin" size={16}/> :
                                <UploadCloud size={18}/>} 备份
                        </button>
                        <button onClick={() => handleManualRestore()} disabled={syncStatus === 'downloading'}
                                className="px-4 py-2 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-all">
                            {syncStatus === 'downloading' ? <Loader2 className="animate-spin" size={16}/> :
                                <DownloadCloud size={18}/>} 恢复
                        </button>
                        <button onClick={() => setShowResetModal(true)}
                                className="px-4 py-2 bg-white text-red-600 rounded-xl shadow-sm border border-slate-200 hover:bg-red-50 flex items-center gap-2 text-sm font-medium transition-all"
                                title="重置进度">
                            <Trash2 size={18}/>
                        </button>
                    </div>
                    <button onClick={() => {
                        AV.User.logOut();
                        setCurrentUser(null)
                    }}
                            className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-red-600 transition-all border border-slate-100">
                        <LogOut size={18} className="md:w-5 md:h-5"/>
                    </button>
                </div>
            </header>

            {isSearchOpen && (
                <section
                    id="search-panel"
                    ref={searchSectionRef}
                    className="mb-6 md:mb-8 rounded-2xl border border-blue-100 bg-white shadow-sm p-4 md:p-6 animate-enter"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <Search size={18} className="text-blue-600" />
                            <span>题目搜索</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 rounded-lg bg-slate-50 border border-slate-200"
                        >
                            收起
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">关键词</label>
                            <input
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="题干 / 选项 / 解析"
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">章节</label>
                            <select
                                value={searchFilters.lectureId}
                                onChange={(e) => setSearchFilters({...searchFilters, lectureId: Number(e.target.value)})}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={0}>全部章节</option>
                                {LECTURES.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题型</label>
                            <select
                                value={searchFilters.type}
                                onChange={(e) => setSearchFilters({...searchFilters, type: e.target.value})}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">全部</option>
                                <option value="single">单选</option>
                                <option value="multiple">多选</option>
                                <option value="judgment">判断</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center mt-3 md:mt-4">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={searchFilters.includeAnswered}
                                onChange={(e) => setSearchFilters({...searchFilters, includeAnswered: e.target.checked})}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            已作答
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={searchFilters.includeUnanswered}
                                onChange={(e) => setSearchFilters({...searchFilters, includeUnanswered: e.target.checked})}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            未作答
                        </label>
                        <div className="ml-auto flex gap-2">
                            <button
                                onClick={() => performSearch()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                            >
                                <Search size={16}/> 搜索
                            </button>
                            <button
                                onClick={() => { setSearchResults([]); setShowSearchResults(false); setSearchKeyword(''); }}
                                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold border border-slate-200"
                            >
                                清空
                            </button>
                        </div>
                    </div>

                    {showSearchResults && (
                        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                            {searchResults.length === 0 ? (
                                <p className="text-sm text-slate-500">暂无结果</p>
                            ) : (
                                searchResults.map((res, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => openSearchQuestion(idx)}
                                        className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 transition flex flex-col gap-1 group"
                                    >
                                        <div className="text-slate-800 font-semibold group-hover:text-blue-600 transition">{res.question}</div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] text-slate-500">{res.category} · {res.type === 'multiple' ? '多选' : res.type === 'judgment' ? '判断' : '单选'}</span>
                                            <span className="text-blue-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition">查看详情 →</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </section>
            )}

            {bankStatus === 'ready' && (
                <div className="md:hidden mb-4 flex gap-2">
                    <div
                        className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-200 text-xs font-medium flex items-center justify-center gap-2">
                        <Database size={14}/> 题库就绪
                    </div>
                    <button onClick={() => handleManualSync()}
                            className="flex-1 px-3 py-2 bg-white text-slate-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center gap-2">
                        <UploadCloud size={14}/> 备份
                    </button>
                    <button onClick={() => handleManualRestore()}
                            className="flex-1 px-3 py-2 bg-white text-slate-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center gap-2">
                        <DownloadCloud size={14}/> 恢复
                    </button>
                    <button onClick={() => setShowResetModal(true)}
                            className="px-3 py-2 bg-white text-red-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center gap-2">
                        <Trash2 size={14}/>
                    </button>
                </div>
            )}

            {/* Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-enter">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div
                                className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <AlertOctagon size={32}/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">确认重置进度？</h3>
                            <p className="text-slate-500 mt-2 text-sm">这将清除本地所有的刷题记录、错题本和统计数据。此操作无法撤销。</p>
                            {currentUser &&
                                <p className="text-orange-500 text-xs mt-2 bg-orange-50 p-2 rounded-lg text-left w-full">注意：云端数据不会自动清除。如需清空云端备份，请在重置后点击“备份”按钮以覆盖。</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowResetModal(false)}
                                    className="py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">取消
                            </button>
                            <button onClick={performReset}
                                    className="py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-colors">确认重置
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 【新增】版本更新提示窗口 */}
            {showUpdateModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-enter backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                        {/* 装饰背景 */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>

                        <div className="relative z-10">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                    <RefreshCw size={32} className="animate-spin-slow" /> {/* 需要确保导入了 RefreshCw 图标 */}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">发现新版本 {remoteVersionInfo.version}</h3>
                                <p className="text-xs text-slate-400 mt-1">当前版本: {CURRENT_APP_VERSION}</p>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-left">
                                <div className="text-xs font-bold text-slate-400 mb-2 uppercase">更新内容</div>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {remoteVersionInfo.log}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={18} /> 立即刷新体验
                                </button>
                                <button
                                    onClick={() => setShowUpdateModal(false)}
                                    className="py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 transition-colors text-sm"
                                >
                                    暂不更新
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pb-10 no-scrollbar pr-1 md:pr-2">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                    {/* 左侧主内容 */}
                    <div className="lg:col-span-8 space-y-6">
                        <div
                            className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-5 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl" />
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Settings size={20} /></div>
                                    <div>
                                        <h2 className="font-bold text-lg md:text-xl text-slate-800">开始新的练习</h2>
                                        <p className="text-xs md:text-sm text-slate-400">自定义你的刷题计划</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题库章节</label>
                                        <select value={quizConfig.lectureId} onChange={e => setQuizConfig({...quizConfig, lectureId: Number(e.target.value)})}
                                                className="w-full p-3 md:p-4 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm md:text-base font-medium focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-100 appearance-none">
                                            <option value={0}>📚 综合练习 (所有章节)</option>
                                            {LECTURES.map(l => <option key={l.id} value={l.id}>{l.name} ({allQuestionBank[l.id]?.length || 0}题)</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题目数量</label>
                                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                            {[10,20,50,'all'].map(n => (
                                                <button key={n} onClick={()=>setQuizConfig({...quizConfig, count:n})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.count===n?'bg-white shadow text-blue-600':'text-slate-400 hover:text-slate-600'}`}>{n==='all'?'全部':n}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题目类型</label>
                                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                            {[{v:'all',l:'全部'},{v:'single',l:'单选'},{v:'multiple',l:'多选'},{v:'judgment',l:'判断'}].map(t=>(
                                                <button key={t.v} onClick={()=>setQuizConfig({...quizConfig, type:t.v})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.type===t.v?'bg-white shadow text-blue-600':'text-slate-400 hover:text-slate-600'}`}>{t.l}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">模式</label>
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                            {[{v:'all',l:'随机'},{v:'new',l:'未做'},{v:'wrong',l:'错题'}].map(m=>(
                                                <button key={m.v} onClick={()=>setQuizConfig({...quizConfig, filter:m.v})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.filter===m.v?'bg-white shadow text-blue-600':'text-slate-400 hover:text-slate-600'}`}>{m.l}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <button onClick={()=>{setCurrentIndex(0);generateAndStartQuiz('quiz');}}
                                            disabled={bankStatus!=='ready'}
                                            className="py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base inline-flex items-center justify-center gap-2">
                                        {bankStatus==='ready'?<><Brain size={20}/> 开始刷题</>:<><Loader2 size={20} className="animate-spin"/> {bankProgress}</>}
                                    </button>
                                    <button onClick={()=>{setCurrentIndex(0);generateAndStartQuiz('memorize');}}
                                            disabled={bankStatus!=='ready'}
                                            className="py-3 md:py-4 bg-white border-2 border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-base">
                                        <BookOpen size={20}/> 背题模式
                                    </button>
                                </div>
                                {bankStatus==='ready' && (
                                    <div className="text-center">
                                        <button onClick={forceUpdateBank} className="text-xs text-slate-300 hover:text-blue-500 underline decoration-dotted">发现题库旧? 点击强制更新缓存</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                {label:'总题库',val:bankStatus==='ready'?Object.values(allQuestionBank).flat().length:'-',icon:Layers,color:'text-slate-600',bg:'bg-slate-100'},
                                {label:'已掌握',val:masteredIds.size,icon:CheckCircle,color:'text-green-600',bg:'bg-green-50'},
                                {label:'已背诵',val:memorizedIds.size,icon:Eye,color:'text-purple-600',bg:'bg-purple-50'},
                                {label:'正确率',val:brushedIds.size?Math.round(masteredIds.size/brushedIds.size*100)+'%':'-',icon:BarChart3,color:'text-orange-600',bg:'bg-orange-50'}
                            ].map((item,i)=>(
                                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm transition-transform duration-300 ease-in-out">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}><item.icon size={20}/></div>
                                    <div>
                                        <div className="text-xl md:text-2xl font-bold text-slate-800 leading-none mb-1">{item.val}</div>
                                        <span className="text-xs font-bold text-slate-400 uppercase">{item.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 右侧栏：继续学习 + 错题/排行并排 + 数据报表 */}
                    <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                        {lastSession && (
                            <div onClick={resumeLastSession} className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] p-5 md:p-6 text-white shadow-lg cursor-pointer hover:scale-[1.01] transition-transform flex justify-between items-center animate-enter">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><Bookmark size={24}/></div>
                                    <div>
                                        <h3 className="font-bold text-lg">继续上次的学习</h3>
                                        <p className="text-indigo-100 text-xs md:text-sm">{lastSession.mode === 'memorize' ? '背题模式' : (lastSession.mode === 'mistakes' ? '错题攻坚' : '刷题模式')} · 剩余 {lastSession.questions.length - lastSession.currentIndex} 题</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><ChevronRight size={24}/></div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div onClick={startMistakeNotebook} className="bg-gradient-to-br from-red-500 to-rose-600 p-5 rounded-[2rem] shadow-lg shadow-red-200 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-300 ease-in-out will-change-transform relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm"><AlertTriangle size={20}/></div>
                                        <span className="font-mono text-3xl font-bold opacity-90">{wrongIds.size}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-0.5">错题攻坚</h3>
                                        <p className="text-red-100 text-xs opacity-90">点击开始专项复习</p>
                                    </div>
                                </div>
                            </div>

                            <div onClick={()=>{setCurrentMode('ranking'); loadWrongQuestionRanking();}} className="bg-gradient-to-br from-orange-500 to-amber-600 p-5 rounded-[2rem] shadow-lg shadow-orange-200 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-300 ease-in-out will-change-transform relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm"><TrendingUp size={20}/></div>
                                        <span className="font-mono text-3xl font-bold opacity-90">📊</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-0.5">易错题排行</h3>
                                        <p className="text-orange-100 text-xs opacity-90">查看全站最易错的题目</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <a href={REPORT_URL} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 transition-transform duration-300 ease-in-out will-change-transform flex flex-col no-underline group flex-1 min-h-0">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><PieChart size={20}/></div>
                                    <div>
                                        <div className="font-bold text-base text-slate-800">数据报表</div>
                                        <div className="text-xs text-slate-400">近7天学习趋势</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mb-4">
                                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100 flex flex-col justify-center">
                                    <div className="text-[10px] text-slate-400 mb-1 uppercase font-bold">累计已刷</div>
                                    <div className="font-bold text-xl text-slate-700 leading-none">{brushedIds.size}</div>
                                </div>
                                <div className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100 flex flex-col justify-center">
                                    <div className="text-[10px] text-green-600/70 mb-1 uppercase font-bold">已掌握</div>
                                    <div className="font-bold text-xl text-green-600 leading-none">{masteredIds.size}</div>
                                </div>
                            </div>
                            <div className="flex items-end justify-between gap-2 border-t border-slate-50 pt-4 flex-1 min-h-[80px]">
                                {weeklyStats.data.map((day, idx) => {
                                    const rawPercent = (day.count / weeklyStats.max) * 100;
                                    const heightPercent = day.count === 0 ? 8 : Math.max(15, rawPercent);
                                    return (
                                        <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1 group/bar">
                                            <div className="w-full flex items-end justify-center relative flex-1">
                                                {day.count > 0 && (
                                                    <div className="absolute -top-7 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-1.5 rounded mb-1 whitespace-nowrap z-10 pointer-events-none">
                                                        {day.count}题
                                                    </div>
                                                )}
                                                <div style={{height: `${heightPercent}%`}}
                                                     className={`w-3 md:w-3.5 rounded-t-[4px] transition-all duration-500 ease-out relative ${day.isToday ? 'bg-gradient-to-t from-blue-500 to-indigo-400 shadow-lg shadow-blue-200' : (day.count > 0 ? 'bg-blue-200 group-hover/bar:bg-blue-400' : 'bg-slate-100')}`}></div>
                                            </div>
                                            <div className={`text-[10px] ${day.isToday ? 'font-bold text-blue-600' : 'text-slate-300'}`}>{day.date}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* 已移除重复统计卡片 */}
                </div>
            </div>
        </div>)

    // --- 修复版：计算最近7天刷题数据 ---
    const weeklyStats = (() => {
        const stats = [];
        const today = new Date();
        // 设置基准最大值，防止全是0的时候图表不显示
        let maxCount = 5;

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            // 重置时间部分，只比较日期，解决时区和时间戳不一致问题
            d.setHours(0, 0, 0, 0);

            const dateStr = d.toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'});

            // 筛选当天的数据
            const count = history.filter(h => {
                const hDate = new Date(h.timestamp);
                hDate.setHours(0, 0, 0, 0);
                return hDate.getTime() === d.getTime();
            }).length;

            if (count > maxCount) maxCount = count;
            stats.push({date: dateStr, count, isToday: i === 0});
        }

        return {data: stats, max: maxCount};
    })();

    const renderCard = () => {
        if (!questions.length) return <div
            className="h-screen flex items-center justify-center text-slate-400">题库为空</div>;
        const currentQ = questions[currentIndex];
        const isQuiz = currentMode !== 'memorize';
        const showContent = !isQuiz || showExplanation;

        return (
            <div className="h-screen flex flex-col md:flex-row bg-slate-100">
                <div className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <button onClick={exitToDashboard}
                                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                            <RotateCcw size={18}/> 退出练习
                        </button>
                        <button onClick={toggleFullscreen}
                                className="p-2 text-slate-400 hover:text-slate-600">{isFullscreen ?
                            <Minimize size={18}/> : <Maximize size={18}/>}</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((_, i) => {
                                let statusColor = 'bg-slate-50 text-slate-400 hover:bg-slate-100';
                                const qid = questions[i].id;
                                if (i === currentIndex) statusColor = 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200';
                                else if (answerResults[qid] === 'correct') statusColor = 'bg-green-50 text-green-700 border border-green-200';
                                else if (answerResults[qid] === 'wrong') statusColor = 'bg-red-50 text-red-700 border border-red-200';
                                return (
                                    <button key={i} onClick={() => changeQuestion(i)}
                                            className={`aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-all ${statusColor}`}>
                                        {i + 1}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 text-xs text-center text-slate-400">
                        {currentMode === 'mistakes' ? '错题复习模式' : (isQuiz ? '刷题模式' : '背题模式')}
                    </div>
                </div>

                <div className="flex-1 flex flex-col h-screen relative">
                    <div className="md:hidden p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                        <button onClick={exitToDashboard} className="p-2 -ml-2 text-slate-600"><RotateCcw size={20}
                        /></button>
                        <span className="font-bold text-slate-700">{currentIndex + 1}/{questions.length}</span>
                        <button onClick={toggleFullscreen} className="p-2 -mr-2 text-slate-600">{isFullscreen ?
                            <Minimize size={20}/> : <Maximize size={20}/>}</button>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 flex justify-center pb-12 mobile-safe-bottom">
                        <div className="w-full max-w-5xl space-y-6 md:space-y-8">
                            {/* Mobile bottom nav pill */}
                            <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                                <div className="flex items-center justify-center gap-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 px-4 py-2.5 h-[58px] min-w-[320px]">
                                    <button
                                        onClick={prevQuestion}
                                        disabled={currentIndex === 0}
                                        className="flex-1 min-w-[110px] px-4 py-2 rounded-full text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 shadow-sm text-center inline-flex items-center justify-center gap-1 whitespace-nowrap"
                                    >
                                        <ChevronLeft size={12}/> 上一题
                                    </button>
                                    <div className="text-xs font-semibold text-slate-500 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                                        {currentIndex + 1}/{questions.length}
                                    </div>
                                    <button
                                        onClick={isQuiz ? nextQuestion : handleMemorizeCheck}
                                        className="flex-1 min-w-[130px] px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-md text-center inline-flex items-center justify-center gap-1 whitespace-nowrap"
                                    >
                                        {isQuiz ? (currentIndex === questions.length - 1 ? '完成' : '下一题') : '记住了，下一题'} <ChevronRight size={14}/>
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-start">
                                <div className="md:col-span-2 bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-200 animate-enter h-full flex flex-col">
                                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${currentQ.type === 'multiple' ? 'bg-purple-100 text-purple-700' : (currentQ.type === 'judgment' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}`}>
                                            {currentQ.type === 'multiple' ? '多选题' : (currentQ.type === 'judgment' ? '判断题' : '单选题')}
                                        </span>
                                        <span className="text-slate-400 text-xs md:text-sm font-medium flex items-center gap-1"><Layers size={14}/> {currentQ.category}</span>
                                    </div>
                                    <h2 className="text-lg md:text-2xl font-bold text-slate-900 leading-relaxed mb-4">
                                        {currentQ.question}
                                    </h2>

                                    <div className="grid gap-3">
                                        {currentQ.options.map((opt, idx) => {
                                            let status = 'default';

                                            if (isQuiz) {
                                                if (isAnswered) {
                                                    if (currentQ.rawAnswer?.includes(idx)) status = 'correct';
                                                    else if (selectedIndices.includes(idx)) status = 'wrong';
                                                    else status = 'dimmed';
                                                } else if (selectedIndices.includes(idx)) {
                                                    status = 'selected';
                                                }
                                            } else if (currentQ.rawAnswer?.includes(idx)) {
                                                status = 'correct';
                                            }

                                            return (
                                                <button key={idx}
                                                        onClick={() => handleOptionClick(idx)}
                                                        className={`w-full p-4 md:p-5 rounded-xl text-left border-2 transition-all flex items-start gap-3 md:gap-4 group relative
                                                                        ${status === 'default' ? 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50' : ''}
                                                                        ${status === 'selected' ? 'border-blue-500 bg-blue-50 text-blue-900' : ''}
                                                                        ${status === 'correct' ? 'border-green-500 bg-green-50 text-green-900' : ''}
                                                                        ${status === 'wrong' ? 'border-red-500 bg-red-50 text-red-900' : ''}
                                                                        ${status === 'default' || status === 'dimmed' ? 'bg-white border-slate-300 text-slate-500' : ''}
                                                                    `}
                                                >
                                                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors shrink-0
                                                                        ${status === 'selected' ? 'bg-blue-500 border-blue-500 text-white' : ''}
                                                                        ${status === 'correct' ? 'bg-green-500 border-green-500 text-white' : ''}
                                                                        ${status === 'wrong' ? 'bg-red-500 border-red-500 text-white' : ''}
                                                                        ${status === 'default' || status === 'dimmed' ? 'bg-white border-slate-300 text-slate-500' : ''}
                                                                    `}>
                                                        {['A', 'B', 'C', 'D', 'E'][idx]}
                                                    </div>
                                                    <span className="flex-1 text-base md:text-lg leading-snug">{opt}</span>
                                                    {status === 'correct' && <CheckCircle className="text-green-500 shrink-0 w-5 h-5 md:w-6 md:h-6"/>}
                                                    {status === 'wrong' && <XCircle className="text-red-500 shrink-0 w-5 h-5 md:w-6 md:h-6"/>}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {isQuiz && !isAnswered && currentQ.type === 'multiple' && (
                                        <div className="flex justify-end animate-enter pt-4">
                                            <button onClick={() => submitAnswer()}
                                                    className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                                                                    ${selectedIndices.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                            >
                                                确认提交 <CheckSquare size={18}/>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="hidden md:block sticky md:top-24 self-start">
                                    <div className="flex flex-col items-center gap-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 px-3 py-5 w-fit min-w-[64px]">
                                        <button
                                            onClick={prevQuestion}
                                            disabled={currentIndex === 0}
                                            className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 transition flex items-center justify-center text-[12px] shadow-sm px-2"
                                            style={{writingMode:'vertical-rl', textOrientation:'upright'}}
                                        >
                                            <ChevronLeft size={12}/> 上一题
                                        </button>
                                        <div className="text-[11px] text-slate-500 font-semibold border-y border-slate-100 py-1 w-full text-center">{currentIndex + 1}/{questions.length}</div>
                                        {isQuiz ? (
                                            <button
                                                onClick={nextQuestion}
                                                className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-white bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition flex items-center justify-center text-[12px] shadow-md px-2"
                                                style={{writingMode:'vertical-rl', textOrientation:'upright'}}
                                            >
                                                {currentIndex === questions.length - 1 ? '完成' : '下一题'} <ChevronRight size={12}/>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleMemorizeCheck}
                                                className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-white bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition flex items-center justify-center text-[12px] shadow-md px-2"
                                                style={{writingMode:'vertical-rl', textOrientation:'upright'}}
                                            >
                                                记住了，下一题 <ChevronRight size={12}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                             {showContent && (
                                <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-stretch">
                                    <div className="animate-enter bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 h-full flex flex-col gap-4">
                                        {userExplanations[currentQ.id] && userExplanations[currentQ.id].length > 0 && (
                                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                <div className="flex items-center gap-2 mb-3 text-purple-900 font-bold">
                                                    <Award size={20} className="text-purple-500"/> 用户贡献的解析
                                                </div>
                                                {renderUserExplanations(currentQ.id)}
                                            </div>
                                        )}

                                        <div className="animate-enter bg-indigo-50 p-5 md:p-6 rounded-[1.5rem] border border-indigo-100">
                                            <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold">
                                                <Zap size={20} className="text-indigo-500" />
                                                <span>答案解析</span>
                                            </div>
                                            <Markdown content={currentQ.explanation} size="sm" className="text-indigo-800 leading-relaxed opacity-90 text-sm md:text-base flex-1" />

                                            {(!currentQ.explanation || currentQ.explanation === '暂无解析') && (
                                                <div className="mt-4">
                                                    {!showExplanationForm ? (
                                                        <button
                                                            onClick={() => setShowExplanationForm(true)}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                                                            <Edit3 size={16}/> 贡献解析
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <textarea
                                                                value={newExplanation}
                                                                onChange={(e) => setNewExplanation(e.target.value)}
                                                                placeholder="分享你对这道题的理解（支持Markdown格式）..."
                                                                className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                                rows={4}
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => submitUserExplanation(currentQ.id)}
                                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                                                                    <Send size={16}/> 提交解析
                                                                </button>
                                                                <button
                                                                    onClick={() => {setShowExplanationForm(false); setNewExplanation('');}}
                                                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium">
                                                                    取消
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="animate-enter bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 scroll-mt-24 h-full flex flex-col" ref={commentSectionRef}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                                                <MessageSquare size={20} className="text-slate-500"/>
                                                评论区 {questionComments[currentQ.id] ? `(${questionComments[currentQ.id].length})` : ''}
                                            </div>
                                        </div>
                                        <div className="space-y-4 pb-1 flex flex-col flex-1">
                                            <div className="space-y-2">
                                                <textarea
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="分享你的想法..."
                                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                    rows={3}
                                                />
                                                <button
                                                    onClick={() => submitComment(currentQ.id)}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                                                    <Send size={16}/> 发表评论
                                                </button>
                                            </div>

                                            {questionComments[currentQ.id] && questionComments[currentQ.id].length > 0 ? (
                                                <div className="space-y-3 max-h-full overflow-y-auto flex-1">
                                                    {questionComments[currentQ.id].map((comment) => {
                                                        const isOwner = comment.authorId === currentUser?.id;
                                                        const isEditing = editingCommentId === comment.id;
                                                        return (
                                                            <div key={comment.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                                                                {isEditing ? (
                                                                    <div className="space-y-2">
                                                                        <textarea
                                                                            value={editingCommentContent}
                                                                            onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                                            rows={3}
                                                                        />
                                                                        <div className="flex gap-2 justify-end text-xs">
                                                                            <button onClick={() => handleUpdateComment(currentQ.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg">保存</button>
                                                                            <button onClick={() => {setEditingCommentId(null); setEditingCommentContent('');}} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg">取消</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="text-slate-800 text-sm mb-1 break-words">
                                                                            <Markdown content={comment.content} size="sm" />
                                                                        </div>
                                                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                                                            <span>{comment.author}</span>
                                                                            <span>{new Date(comment.createdAt).toLocaleString('zh-CN')}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-xs">
                                                                            {isOwner ? (
                                                                                <>
                                                                                    {/* --- 作者视角：只显示数量，不可点击 --- */}
                                                                                    <div
                                                                                        className={`flex items-center gap-1 cursor-default ${comment.likes > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}
                                                                                        title="收获的点赞数"
                                                                                    >
                                                                                        {/* 如果有赞，图标设为实心/高亮，看着更舒服 */}
                                                                                        <ThumbsUp size={12} fill={comment.likes > 0 ? "currentColor" : "none"} />
                                                                                        {comment.likes || 0}
                                                                                    </div>

                                                                                    {/* 增加一个小竖线分隔符，视觉更清晰 */}
                                                                                    <div className="w-[1px] h-3 bg-slate-200"></div>

                                                                                    <button onClick={() => handleStartEditComment(comment)} className="text-blue-600 hover:text-blue-700 transition-colors">编辑</button>
                                                                                    <button onClick={() => handleDeleteComment(currentQ.id, comment)} className="text-red-600 hover:text-red-700 transition-colors">删除</button>
                                                                                </>
                                                                            ) : (
                                                                                // --- 他人视角：可点击的 Toggle 按钮 ---
                                                                                <button
                                                                                    onClick={() => handleLikeComment(currentQ.id, comment)}
                                                                                    className={`flex items-center gap-1 transition-colors ${
                                                                                        comment.liked
                                                                                            ? 'text-amber-600 font-bold'
                                                                                            : 'text-slate-400 hover:text-amber-600'
                                                                                    }`}
                                                                                >
                                                                                    <ThumbsUp size={12} fill={comment.liked ? "currentColor" : "none"}/>
                                                                                    {comment.likes || 0}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 text-sm text-center py-4">暂无评论，来抢沙发吧！</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                             )}
                         </div>
                     </div>

                    {/* 已移除底部浮动导航，避免遮挡解析提交按钮。桌面右侧栏或移动端顶部栏保留导航。 */}
                </div>
            </div>
        );
    };

    // --- UI 渲染 ---

    // const LoadingScreen = ({ msg }) => (
    //     <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50">
    //         <div className="relative mb-6">
    //             <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
    //             <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={24} className="text-blue-600" /></div>
    //         </div>
    //         <h2 className="text-xl font-bold text-gray-800">{msg}</h2>
    //     </div>
    // );

    const renderLoginScreen = () => (
        <div className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200 relative">
            {/* API 受限提示横幅 - 登录界面专用 */}
            {apiLimitReached && (
                <div className="fixed top-0 left-0 right-0 z-[100] animate-enter">
                    <div className="bg-red-600 text-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                        <div className="max-w-4xl mx-auto flex items-start md:items-center gap-4">
                            <div className="p-2 bg-white/20 rounded-full shrink-0 animate-pulse">
                                <Zap size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    服务暂时受限 (API 额度耗尽)
                                </h3>
                                <p className="text-red-100 text-sm mt-1 leading-snug">
                                    今天的服务器免费资源已被耗尽，<strong>请前往备用网站继续刷题</strong>：<br className="hidden md:block"/>
                                    👉 <a
                                        href="https://cxcy.junpgle.me/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline font-bold hover:text-white transition-colors text-yellow-200"
                                    >
                                        https://cxcy.junpgle.me/
                                    </a>
                                    <br className="hidden md:block"/>
                                    <span className="text-xs opacity-90">(已迁移全部数据，截止 2026.1.18 11:00)</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setApiLimitReached(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
                <div className="text-center mb-8">
                    <div
                        className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3">
                        <Brain size={32} className="md:w-10 md:h-10"/>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">HFUT 创新创业</h1>
                    <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Pro 学习系统</p>
                    {brushedIds.size > 0 &&
                        <p className="text-xs text-blue-500 mt-2">本地缓存: {brushedIds.size} 题记录</p>}
                </div>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    setAuthLoading(true);
                    setAuthError(null);
                    AV.User.logIn(username, password).then(u => {
                        setCurrentUser(u);
                        setAuthLoading(false)
                    }).catch(err => {
                        setAuthError(err.message || "登录失败");
                        setAuthLoading(false)
                    })
                }} className="space-y-4 md:space-y-5">
                    <div className="space-y-4">
                        <input type="text" required placeholder="用户名"
                               className="w-full px-5 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                               value={username} onChange={e => setUsername(e.target.value)}/>
                        <input type="password" required placeholder="密码"
                               className="w-full px-5 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                               value={password} onChange={e => setPassword(e.target.value)}/>
                    </div>
                    {authError &&
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16}/>{authError}</div>}
                    <button disabled={authLoading}
                            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:shadow-xl transition-all disabled:opacity-70">
                        {authLoading ? '请稍候...' : '立即登录'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <a href="register.html" target="_blank"
                       className="text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors flex items-center justify-center gap-1">
                        没有账号？<span className="underline decoration-blue-300 decoration-2 underline-offset-2">去注册新账号</span> <ChevronRight size={14}/>
                    </a>
                </div>
            </div>
        </div>
    );


    // 心跳与在线人数轮询
    useEffect(() => {
        if (!currentUser) return;
        let cancelled = false;

        const sendHeartbeat = async (mode = currentMode) => {
            try {
                await AV.Cloud.run('heartbeat', { mode });
            } catch (error) {
                checkApiLimitError(error); // 别忘了保留之前的额度检查
                console.debug('Heartbeat failed:', error);
            }
        };

        const fetchCount = async () => {
            try {
                const res = await AV.Cloud.run('onlineCount', { windowSec: 180 });
                // 🟢 核心修改：取 1 和服务端返回值的最大值
                if (!cancelled) setOnlineCount(Math.max(1, res?.count ?? 0));
            } catch (error) {
                checkApiLimitError(error);
                console.debug('Online count fetch failed:', error);
            }
        };

        // 首次立即上报与拉取
        sendHeartbeat();
        fetchCount();

        // 这里的 300000 是 5 分钟，非常省流
        const hTimer = setInterval(() => sendHeartbeat(), 300000);
        const cTimer = setInterval(() => fetchCount(), 300000);

        return () => { cancelled = true; clearInterval(hTimer); clearInterval(cTimer); };
    }, [currentUser, currentMode]);

    // // 在模式切换时立即发送心跳（确保 mode 最新）
    // useEffect(() => {
    //     if (!currentUser) return;
    //     AV.Cloud.run('heartbeat', { mode: currentMode }).catch(()=>{});
    // }, [currentMode, currentUser]);

    // 自动加载评论和用户解析（无官方解析时）
    useEffect(() => {
        if (!questions.length) return;
        const q = questions[currentIndex];
        // 预加载评论
        if (q && !questionComments[q.id]) {
            loadQuestionComments(q.id);
        }
        // 背题模式或展示解析时，加载用户解析
        const isMemorizeMode = currentMode === 'memorize';
        const shouldShowContent = isMemorizeMode || showExplanation;
        if (shouldShowContent && q && (!q.explanation || q.explanation === '暂无解析')) {
            ensureExplanationsLoaded(q.id);
        }
    }, [showExplanation, currentIndex, questions, currentMode]);

    // 定时发送统计数据，确保数据不滞留太久
    useEffect(() => {
        const timer = setInterval(() => {
            if (statsBuffer.current.length > 0) {
                flushStats();
            }
        }, FLUSH_INTERVAL);

        // 组件卸载或页面刷新时，尝试发送剩余数据
        return () => {
            clearInterval(timer);
            // 注意：React卸载时的异步请求不一定能保证发出，但在单页应用切换路由时是有效的
            if (statsBuffer.current.length > 0) {
                flushStats();
            }
        };
    }, []);

    // 渲染错题排行榜页面
    const renderRankingPage = () => (
        <div className="h-screen flex flex-col bg-slate-100">
            <div className="bg-white border-b border-slate-200 p-4 md:p-6 flex justify-between items-center">
                <button
                    onClick={() => setCurrentMode('dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                    <ChevronLeft size={18}/> 返回
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="text-orange-600" size={24}/> 全站易错题排行榜
                </h1>
                <div className="w-20"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    {wrongQuestionRanking.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center text-slate-400">
                            <AlertCircle size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>暂无数据，继续刷题吧！</p>
                        </div>
                    ) : (
                        wrongQuestionRanking.map((item, index) => (
                            <div
                                key={item.questionId}
                                onClick={() => openRankingQuestion(item)}
                                className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 hover:border-orange-300 transition-all cursor-pointer group"
                            >
                                <div className="flex gap-4">
                                    {/* 排名徽章 */}
                                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl
                                        ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                                          index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                          index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                          'bg-slate-100 text-slate-600'}`}>
                                        {index < 3 ? <Trophy size={24} /> : (index + 1)}
                                    </div>

                                    {/* 题目信息 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="font-semibold text-slate-800 text-base md:text-lg leading-snug group-hover:text-orange-600 transition-colors">
                                                {item.questionTitle}
                                            </h3>
                                            <span className="shrink-0 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold">
                                                错{item.errorCount}次
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Layers size={14}/> {item.category}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <AlertTriangle size={14}/> 错误率 {item.errorRate}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* 点击提示 */}
                                    <div className="shrink-0 flex items-center">
                                        <ChevronRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    // Question Detail Modal for Leaderboard
    const renderQuestionDetailModal = () => {
        if (!viewingRankQuestion) return null;
        const { question, options, rawAnswer, explanation, id, rankInfo } = viewingRankQuestion;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-enter">
                <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-start z-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy size={18} className="text-amber-500" />
                                <span className="text-xs font-bold text-slate-500">错题排行榜 #{rankInfo.rank}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${
                                    viewingRankQuestion.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                                    (viewingRankQuestion.type === 'judgment' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')
                                }`}>
                                    {viewingRankQuestion.type === 'multiple' ? '多选' : viewingRankQuestion.type === 'judgment' ? '判断' : '单选'}
                                </span>
                                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">{viewingRankQuestion.category}</span>
                                <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded font-bold">
                                    错误 {rankInfo.errorCount} 次 · 错误率 {rankInfo.errorRate}%
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setViewingRankQuestion(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors ml-4">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 leading-relaxed">
                            {question}
                        </h3>

                        <div className="space-y-3 mb-6">
                            {options.map((opt, i) => {
                                const isCorrect = rawAnswer.includes(i);
                                const optionLetter = ['A', 'B', 'C', 'D', 'E'][i];
                                const optionStats = rankInfo?.optionStats || {};
                                const selectionCount = optionStats[optionLetter] || 0;

                                // 计算该选项被选择的比例
                                const totalSelections = Object.values(optionStats).reduce((sum, count) => sum + count, 0);
                                const selectionRate = totalSelections > 0 ? Math.round((selectionCount / totalSelections) * 100) : 0;

                                // 判断是否为易错选项（非正确答案且被选择次数较多）
                                const isFrequentlyWrong = !isCorrect && selectionCount > 0 && selectionRate >= 15;

                                return (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-xl border-2 text-sm flex gap-3 transition-all ${
                                            isCorrect
                                                ? 'bg-green-50 border-green-300 text-green-900 shadow-sm'
                                                : isFrequentlyWrong
                                                ? 'bg-red-50 border-red-300 text-red-900 shadow-sm'
                                                : 'bg-white border-slate-100 text-slate-600'
                                        }`}
                                    >
                                        <span className={`font-bold shrink-0 ${
                                            isCorrect ? 'text-green-700' : isFrequentlyWrong ? 'text-red-700' : 'text-slate-400'
                                        }`}>
                                            {optionLetter}.
                                        </span>
                                        <span className="flex-1">{opt}</span>
                                        {isCorrect && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <CheckCircle size={18} className="text-green-600" />
                                                <span className="text-xs font-bold text-green-700">正确答案</span>
                                            </div>
                                        )}
                                        {isFrequentlyWrong && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <XCircle size={18} className="text-red-600" />
                                                <span className="text-xs font-bold text-red-700">易错项 {selectionRate}%</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-sm">
                                <Zap size={18} className="text-indigo-600" />
                                <span>答案解析</span>
                            </div>
                            <Markdown content={explanation} size="sm" className="text-indigo-800 text-sm leading-relaxed" />
                            {renderUserExplanations(id)}
                        </div>

                        <div className="mt-5 p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-2 text-amber-900 text-sm font-bold mb-2">
                                <AlertTriangle size={16} className="text-amber-600" />
                                <span>易错提示</span>
                            </div>
                            <p className="text-amber-800 text-xs leading-relaxed">
                                该题已被 <span className="font-bold">{rankInfo.totalAttempts}</span> 人次作答，
                                其中 <span className="font-bold text-red-600">{rankInfo.errorCount}</span> 次答错，
                                错误率高达 <span className="font-bold text-red-600">{rankInfo.errorRate}%</span>。
                                请仔细理解题意和正确答案！
                            </p>
                        </div>
                    </div>
                </div>
            </div>);
    };

    if (!currentUser) return renderLoginScreen();

    return (
        <div className="h-full bg-slate-50 font-sans text-slate-900">
            {currentMode === 'dashboard' && renderDashboard()}
            {['quiz', 'memorize', 'mistakes'].includes(currentMode) && renderCard()}
            {currentMode === 'ranking' && renderRankingPage()}

            {/* Question Detail Modal for Leaderboard */}
            {viewingRankQuestion && renderQuestionDetailModal()}

            {/* 【修改】API 额度耗尽提示横幅 - 区分登录状态 */}
            {apiLimitReached && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] animate-enter">
                    <div className="bg-red-600 text-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
                        <div className="max-w-4xl mx-auto flex items-start md:items-center gap-4">
                            <div className="p-2 bg-white/20 rounded-full shrink-0 animate-pulse">
                                <Zap size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    服务暂时受限 (API 额度耗尽)
                                </h3>
                                {!currentUser ? (
                                    // 未登录用户的提示
                                    <p className="text-red-100 text-sm mt-1 leading-snug">
                                        今天的服务器免费资源已被耗尽，<strong>请前往备用网站继续刷题</strong>：<br className="hidden md:block"/>
                                        👉 <a
                                            href="https://cxcy.junpgle.me/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline font-bold hover:text-white transition-colors text-yellow-200"
                                        >
                                            https://cxcy.junpgle.me/
                                        </a>
                                        <br className="hidden md:block"/>
                                        <span className="text-xs opacity-90">(已迁移全部数据，截止 2026.1.18 11:00)</span>
                                    </p>
                                ) : (
                                    // 已登录用户的提示
                                    <p className="text-red-100 text-sm mt-1 leading-snug">
                                        开发者也是"用爱发电"💸，今天的服务器免费资源已被大家的热情耗尽啦！<br className="hidden md:block"/>
                                        <strong>云端同步、用户提供的解析、评论、点赞和全站错题统计功能</strong>暂时无法使用，但<strong>本地刷题不受影响</strong>。请明天再来同步数据吧！
                                        或者尝试我的备用网站 <a
                                            href="https://cxcy.junpgle.me/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline font-bold hover:text-white transition-colors"
                                        >
                                            https://cxcy.junpgle.me/
                                        </a>, 已迁移Leancloud数据 (截止2026.1.18 11:00)
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setApiLimitReached(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;

