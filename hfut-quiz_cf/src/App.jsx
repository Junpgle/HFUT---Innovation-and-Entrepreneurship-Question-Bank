/*
* version: 4.0.4 (Cloudflare Migration)
* 1. 移除 LeanCloud SDK，完全迁移至 Cloudflare Workers + D1
* 2. 优化 API 调用，适配 Hono 后端
* 3. 数据结构适配 SQL 模式
* 4. 题库源加回Leancloud File 直链
* 5. 新增数据导入和导出功能,可以无缝从原有网站迁移旧有刷题数据
* 6. 优化api调用次数我真没招了
* 7. 一直在优化api我真没招了
* */
import {useState, useEffect, useRef, useMemo} from 'react';
import {api} from './api'; //
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
    ThumbsUp, Send, Edit3, Award, Search, X, Filter, Trophy, FileUp, FileDown
} from 'lucide-react';
import {validateContent} from './contentFilter.js';
// --- 配置常量 ---
const CURRENT_APP_VERSION = '4.0.4';
const LEADERBOARD_LIMIT = 50;
// 题库源：GitHub raw 兜底
const GITHUB_BASE = "https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/";
const REPORT_URL = "/#/report";
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
    {
        id: 1,
        name: "第一讲：创新创业概述",
        file: "创新创业基础第一讲习题.xlsx",
        fileId: FILE_ID_MAP[1],
        url: "http://lc-5wPsbnak.cn-n1.lcfile.com/sCwXv74yKdHuwzz440gSIKvciB8w5Oxt/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%80%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"
    },
    {
        id: 2,
        name: "第二讲：创新思维与方法",
        file: "创新创业基础第二讲习题.xlsx",
        fileId: FILE_ID_MAP[2],
        url: "http://lc-5wPsbnak.cn-n1.lcfile.com/LW7iNTXd04MjT6xIIgoghNavzJh78BM3/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%8C%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"
    },
    {
        id: 3,
        name: "第三讲：机会与风险识别",
        file: "创新创业基础第三讲习题.xlsx",
        fileId: FILE_ID_MAP[3],
        url: "http://lc-5wPsbnak.cn-n1.lcfile.com/89otiFHMEs0D6EPKY7h6nLLlKT4e3FlW/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%89%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"
    },
    {
        id: 4,
        name: "第四讲：团队与资源整合",
        file: "创新创业基础第四讲习题.xlsx",
        fileId: FILE_ID_MAP[4],
        url: "http://lc-5wPsbnak.cn-n1.lcfile.com/iDvr6YL2DqyDJNQ8WtHF8JoGu8VhXJpB/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%9B%9B%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"
    },
    {
        id: 5,
        name: "第五讲：商业模式与计划",
        file: "创新创业基础第五讲习题.xlsx",
        fileId: FILE_ID_MAP[5],
        url: "http://lc-5wPsbnak.cn-n1.lcfile.com/pmwL2rBspHySjkkGLY6cT4jTSENOw2QE/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%94%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"
    },
    {
        id: 6,
        name: "第六讲：融资与企业设立",
        file: "创新创业基础第六讲习题.xlsx",
        fileId: FILE_ID_MAP[6],
        url: "http://lc-5wPsbnak.cn-n1.lcfile.com/7ftQpmkKv4VtISulAbszw5y9gMtShUUO/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%85%AD%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"
    },
    {
        id: 7,
        name: "第七讲：新企业成长管理",
        file: "创新创业基础第七讲习题.xlsx",
        fileId: FILE_ID_MAP[7],
        url: "http://lc-5wPsbnak.cn-n1.lcfile.com/ng2YT8p8yeERNwiaPXWMJBFwEdPwM7XI/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%83%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx"
    },
    {
        id: 99,
        name: "经典旧题库 (综合)",
        file: "questions_old.xls",
        fileId: null,
        url: "https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/questions_old.xls"
    },
];
const MAOGAO_CHAPTERS = [
    {id: 1, name: '导论'},
    {id: 2, name: '第一章'},
    {id: 3, name: '第二章'},
    {id: 4, name: '第三章'},
    {id: 5, name: '第四章'},
    {id: 6, name: '第五章'},
    {id: 7, name: '第六章'},
    {id: 8, name: '第七章'},
    {id: 9, name: '第八章'},
];
const SUBJECTS = [
    {
        id: 'innovation',
        name: '创新创业',
        icon: '🚀',
        lectures: LECTURES,
        getChapters: (bank) => LECTURES.filter(l => bank[l.id]?.length),
        getChapterName: (id) => LECTURES.find(l => l.id === id)?.name || `章节${id}`,
    },
    {
        id: 'maogai',
        name: '毛泽东思想和中国特色社会主义理论体系概论',
        shortName: '毛概',
        icon: '📖',
        file: 'maogai_full.json',
        chapters: MAOGAO_CHAPTERS,
        getChapters: (bank) => MAOGAO_CHAPTERS.filter(ch => bank[ch.id]?.length),
        getChapterName: (id) => MAOGAO_CHAPTERS.find(ch => ch.id === id)?.name || `章节${id}`,
    },
];
const getBankCacheKey = (subjectId) => `hf_question_bank_${subjectId}`;
const getBankCacheVersionKey = (subjectId) => `hf_bank_version_${subjectId}`;
const BANK_CACHE_VERSION = 3;
// 🕒 时间格式化工具：强制将数据库时间视为 UTC 并转为本地时间
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
// 安全存储封装
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
    const Markdown = ({content, size = 'sm', className = ''}) => {
        const components = {
            h1: ({...props}) => <h1
                className="text-2xl md:text-3xl font-bold text-slate-900 mt-6 mb-4 border-b border-slate-100 pb-2" {...props} />,
            h2: ({...props}) => <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-5 mb-3" {...props} />,
            h3: ({...props}) => <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-4 mb-2" {...props} />,
            h4: ({...props}) => <h4 className="text-base md:text-lg font-bold text-slate-700 mt-3 mb-2" {...props} />,
            p: ({...props}) => <p className="leading-7 text-slate-700 mb-4 break-words" {...props} />,
            strong: ({...props}) => <strong className="font-bold text-slate-900" {...props} />,
            em: ({...props}) => <em className="italic text-slate-600" {...props} />,
            del: ({...props}) => <del className="line-through text-slate-400" {...props} />,
            hr: ({...props}) => <hr className="my-6 border-slate-200" {...props} />,
            blockquote: ({...props}) => (
                <blockquote
                    className="border-l-4 border-blue-400 bg-blue-50/50 text-slate-600 italic px-4 py-3 rounded-r-lg my-4" {...props} />
            ),
            ul: ({...props}) => <ul
                className="list-disc pl-5 space-y-1.5 my-3 text-slate-700 marker:text-slate-400" {...props} />,
            ol: ({...props}) => <ol
                className="list-decimal pl-5 space-y-1.5 my-3 text-slate-700 marker:text-slate-500" {...props} />,
            li: ({...props}) => <li className="pl-1" {...props} />,
            a: ({href, children, ...props}) => (
                <a href={href} target="_blank" rel="noopener noreferrer"
                   className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors break-all" {...props}>
                    {children}
                </a>
            ),
            code: ({node, inline, className, children, ...props}) => {
                if (inline) {
                    return <code
                        className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-pink-600 font-mono text-[0.9em] border border-slate-200" {...props}>{children}</code>;
                }
                return (
                    <div className="relative my-4 rounded-xl overflow-hidden bg-slate-800 shadow-sm group">
                        <div
                            className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700/50">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"/>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"/>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"/>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">Code</span>
                        </div>
                        <pre
                            className="p-4 overflow-x-auto text-sm text-slate-50 font-mono leading-relaxed custom-scrollbar">
                        <code className={className} {...props}>{children}</code>
                    </pre>
                    </div>
                );
            },
            table: ({...props}) => (
                <div className="my-6 w-full overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm text-slate-600" {...props} />
                </div>
            ),
            thead: ({...props}) => <thead
                className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-xs" {...props} />,
            tbody: ({...props}) => <tbody className="divide-y divide-slate-100 bg-white" {...props} />,
            tr: ({...props}) => <tr className="hover:bg-slate-50/50 transition-colors" {...props} />,
            th: ({...props}) => <th className="px-4 py-3 whitespace-nowrap" {...props} />,
            td: ({...props}) => <td className="px-4 py-3 whitespace-normal align-top" {...props} />,
            img: ({src, alt, ...props}) => (
                <div className="my-5">
                    <img src={src} alt={alt}
                         className="max-w-full h-auto rounded-xl shadow-sm border border-slate-100 mx-auto"
                         loading="lazy" {...props} />
                    {alt && <p className="text-center text-xs text-slate-400 mt-2">{alt}</p>}
                </div>
            ),
            input: ({type, ...props}) => {
                if (type === 'checkbox') {
                    return <input type="checkbox"
                                  className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                                  disabled {...props} />;
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
    // ✅ 改动：使用 api.getCurrentUser() 替代 AV.User.current()
    const [currentUser, setCurrentUser] = useState(api.getCurrentUser());
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // 学科选择
    // 新旧题目 ID 偏移投影转换器，将历史老ID MG-188440+ 智能向后投射为 MG-1+ 新ID，彻底激活全站易错排行榜
    const normalizeQuestionId = (id) => {
        if (!id || typeof id !== 'string') return id;
        if (id.startsWith('MG-')) {
            const numStr = id.substring(3);
            const num = parseInt(numStr);
            if (!isNaN(num) && num > 188439) {
                return `MG-${num - 188439}`;
            }
        }
        return id;
    };
    // 个人缓存及云端进度 ID 智能投影转换，完美保留用户的历史进度和错题记录
    const normalizeSet = (s) => {
        if (!s) return new Set();
        const setObj = Array.isArray(s) ? new Set(s) : (s instanceof Set ? s : new Set(Array.from(s)));
        const newSet = new Set();
        setObj.forEach(val => {
            newSet.add(normalizeQuestionId(val));
        });
        return newSet;
    };
    const [selectedSubject, setSelectedSubject] = useState(null);
    const currentSubject = selectedSubject ? SUBJECTS.find(s => s.id === selectedSubject) : null;
    // 题库状态
    const [allQuestionBank, setAllQuestionBank] = useState({});
    const [bankStatus, setBankStatus] = useState('idle');
    const [bankProgress, setBankProgress] = useState("");
    const [bankPercent, setBankPercent] = useState(0);
    const [errorMsg, setErrorMsg] = useState(null);
    // 学习数据
    const [brushedIds, setBrushedIds] = useState(new Set());
    const [memorizedIds, setMemorizedIds] = useState(new Set());
    const [masteredIds, setMasteredIds] = useState(new Set());
    const [wrongIds, setWrongIds] = useState(new Set());
    // 动态计算当前选中学科下的错题数量，实现错题卡片学科隔离
    const currentWrongCount = useMemo(() => {
        if (!allQuestionBank) return 0;
        const currentQs = Object.values(allQuestionBank).flat();
        return currentQs.filter(q => wrongIds.has(q.id)).length;
    }, [allQuestionBank, wrongIds]);
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
    // 统一管理评论和解析的状态：{ [questionId]: { comments: [], explanations: [] } }
    const [questionThread, setQuestionThread] = useState({});
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
    const [remoteVersionInfo, setRemoteVersionInfo] = useState({version: '', log: ''});
    // API 额度受限状态
    const [apiLimitReached, setApiLimitReached] = useState(false);
    // 批量发送题目状态策略
    const statsBuffer = useRef([]);
    const BATCH_THRESHOLD = 30; // 攒够 30 题发一次
    const FLUSH_INTERVAL = 300 * 1000; // 或者每 300 秒发一次
    // 统一处理 API 限制错误 (适配 Cloudflare 429 错误)
    const checkApiLimitError = (error) => {
        if (!error) return;
        // 如果后端返回 429 或者错误信息包含 limit
        if (error.status === 429 || (error.message && error.message.toLowerCase().includes('limit'))) {
            setApiLimitReached(true);
            console.error("API Daily Limit Exceeded");
        }
    };
    // ==========================================
    // 🚀 优化逻辑 1: 登录 & 初始同步
    // ==========================================
    const handleLogin = async (username, password) => {
        setAuthLoading(true);
        try {
            const res = await api.login(username, password);
            setCurrentUser(res.user);
            if (res.initialProgress) {
                const p = res.initialProgress;
                setBrushedIds(normalizeSet(p.brushedIds));
                setMemorizedIds(normalizeSet(p.memorizedIds));
                setMasteredIds(normalizeSet(p.masteredIds));
                setWrongIds(normalizeSet(p.wrongIds));
                setHistory(p.history || []);
                if (res.onlineCount) setOnlineCount(res.onlineCount);
                setSyncMsg("同步已完成");
                setSyncStatus('success');
            }
        } catch (err) {
            alert(err.message || "登录失败");
        } finally {
            setAuthLoading(false);
        }
    };
    // ==========================================
    // 🚀 优化逻辑 2: 聚合同步 (心跳 + 进度)
    // ==========================================
    const performGlobalSync = async (includeProgress = false) => {
        if (!currentUser) return;
        const payload = {
            heartbeat: true,
            progress: includeProgress ? {
                brushedIds: Array.from(brushedIds),
                memorizedIds: Array.from(memorizedIds),
                masteredIds: Array.from(masteredIds),
                wrongIds: Array.from(wrongIds),
                history: history.slice(0, 500)
            } : null
        };
        try {
            if (includeProgress) {
                setSyncStatus('uploading');
                setSyncMsg("同步中...");
            }
            const res = await api.request('/sync-all', 'POST', payload);
            if (res.success) {
                if (res.onlineCount) setOnlineCount(res.onlineCount);
                if (includeProgress) {
                    setSyncStatus('success');
                    setSyncMsg("备份成功");
                }
            }
        } catch (e) {
            console.error("同步失败", e);
            if (includeProgress) {
                setSyncStatus('error');
                setSyncMsg("同步失败");
            }
        }
    };
    useEffect(() => {
        if (!currentUser) return;
        // 1. 进入页面（或登录成功）立即执行一次，获取初始在线人数和进度
        performGlobalSync(true);
        // 2. 开启 5 分钟一次的定时心跳
        const timer = setInterval(() => performGlobalSync(true), 5 * 60 * 1000);
        return () => clearInterval(timer);
        // 💡 只依赖 currentUser。即使 brushedIds 变了，定时器也不会重启
    }, [currentUser]);
    // ==========================================
    // 🚀 优化逻辑 3: 聚合加载互动内容
    // ==========================================
    const loadQuestionThread = async (questionId) => {
        if (!questionId) return;
        try {
            const res = await api.request(`/thread/${questionId}`);
            setQuestionThread(prev => ({
                ...prev,
                [questionId]: {
                    comments: res.comments || [],
                    explanations: res.explanations || []
                }
            }));
        } catch (e) {
            console.error("加载互动内容失败", e);
        }
    };
    useEffect(() => {
        if (!questions.length) return;
        const q = questions[currentIndex];
        if (q && !questionThread[q.id]) {
            loadQuestionThread(q.id);
        }
    }, [currentIndex, questions]);
    // ✅ 改动：使用 api.batchRecord
    const flushStats = async () => {
        const payload = [...statsBuffer.current];
        if (payload.length === 0) return;
        statsBuffer.current = [];
        try {
            await api.batchRecord(payload);
        } catch (e) {
            checkApiLimitError(e);
            console.error('批量统计发送失败', e);
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
    // --- 核心工具函数：数据加载与防抖 ---
    // 加载单题的评论和解析数据 (带缓存检查)
    const loadThreadData = async (questionId) => {
        if (!questionId) return;
        // 如果本地已有且不为空，暂时跳过（根据需要可增加过期时间策略）
        if (questionThread[questionId]) return;
        try {
            const [comments, explanations] = await Promise.all([
                api.getComments(questionId).catch(e => {
                    console.warn(`Load comments failed for ${questionId}`, e);
                    return [];
                }),
                api.getExplanations(questionId).catch(e => {
                    console.warn(`Load explanations failed for ${questionId}`, e);
                    return [];
                })
            ]);
            setQuestionThread(prev => ({
                ...prev,
                [questionId]: {
                    comments: Array.isArray(comments) ? comments : [],
                    explanations: Array.isArray(explanations) ? explanations : []
                }
            }));
        } catch (e) {
            console.error(`Load thread failed for ${questionId}`, e);
        }
    };
    // --- 数据加载工具 ---
    const MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024;
    const EXCEL_PARSE_TIMEOUT = 10000;
    const safeParseXLSX = (data) => {
        return new Promise((resolve, reject) => {
            if (data.byteLength > MAX_EXCEL_FILE_SIZE) {
                reject(new Error(`File too large: ${data.byteLength} bytes (max: ${MAX_EXCEL_FILE_SIZE})`));
                return;
            }
            const timeoutId = setTimeout(() => {
                reject(new Error('Excel parsing timeout - possible ReDoS attack'));
            }, EXCEL_PARSE_TIMEOUT);
            try {
                const workbook = XLSX.read(data, {type: 'array'});
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
        // 直接读取同源本地 public 目录，几十毫秒内极速完成，抛弃外部 GitHub 和云存储链接
        const urls = [`/${encodeURIComponent(lecture.file)}`];
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
        return Promise.reject(new Error(`所有本地题库源均不可用: ${errors.join(' | ')}`));
    }
    // 新增：旧题库格式解析器
    const parseOldFormatData = (rows, lectureId, lectureName) => {
        const cleanRows = rows.filter(r => r && r.length > 0);
        if (cleanRows.length === 0) return [];
        let startIndex = 0;
        const h = cleanRows[0];
        // 简单判断表头
        if (h && (String(h[0]).includes('目录') || String(h[1]).includes('题目类型'))) startIndex = 1;
        const questions = [];
        for (let i = startIndex; i < cleanRows.length; i++) {
            const row = cleanRows[i];
            // 防止空行
            if (!row || row.length < 2) continue;
            const categoryRaw = String(row[0] || "").trim();
            const mainType = String(row[1] || "").trim();
            const bigQ = String(row[2] || "").trim();
            const subType = String(row[3] || "").trim();
            const subQ = String(row[4] || "").trim();
            const ansRaw = String(row[5] || "").trim();
            const exp = String(row[6] || "").trim();
            if (!subQ && !bigQ) continue;
            let type = 'single';
            const typeCheck = (mainType + subType);
            if (typeCheck.includes('多选')) type = 'multiple';
            else if (typeCheck.includes('判断')) type = 'judgment';
            // 填空题和大题特殊处理
            const isFill = typeCheck.includes('填空');
            const isBig = typeCheck.includes('大题') || mainType.includes('大题') || typeCheck.includes('简答') || mainType.includes('简答');
            // 构造题干
            let qText = subQ;
            if (bigQ && bigQ !== subQ) {
                if (!subQ) qText = bigQ;
                else qText = `【背景】${bigQ}\n\n${subQ}`;
            }
            if (!qText && bigQ) qText = bigQ; // 只有大题题干的情况
            if (!qText) qText = "题目内容缺失";
            let options = [];
            let rawAnswer = [];
            if (isFill || isBig) {
                // 填空题/简答题：将答案放在 Option A (index 11)
                const fillAns = String(row[11] || "").trim(); // 尝试获取选项A作为答案
                const explicitAns = fillAns || ansRaw; // 优先使用选项A，用户指出答案在这里
                // 为了让用户能“翻卡片”看答案，构造一个“点击查看答案”的选项
                options = [explicitAns || "（暂无标准答案，点击查看解析）"];
                rawAnswer = [0];
                if (isFill) type = 'fill';
                else if (isBig) type = 'big';
                else type = 'single'; // 兜底
            } else if (type === 'judgment') {
                // 判断
                const optA = String(row[11] || "").trim();
                const optB = String(row[12] || "").trim();
                if (optA || optB) {
                    if (optA) options.push(optA);
                    if (optB) options.push(optB);
                } else {
                    options = ['正确', '错误'];
                }
                // 答案解析
                if (/^[对TtA√Yes]/.test(ansRaw) || ansRaw === '正确') rawAnswer = [0];
                else if (/^[错FfB×No]/.test(ansRaw) || ansRaw === '错误') rawAnswer = [1];
                else {
                    // 默认按 A=对 B=错
                    if (ansRaw.toUpperCase() === 'A') rawAnswer = [0];
                    else rawAnswer = [1];
                }
            } else {
                // 单选/多选
                const optIndices = [11, 12, 13, 14, 15, 16, 17, 18];
                options = optIndices.map(idx => String(row[idx] || "").trim()).filter(Boolean);
                if (options.length === 0) continue; // 没有选项
                const normalized = ansRaw.toUpperCase().replace(/[^A-H]/g, '');
                for (let char of normalized) {
                    const idx = char.charCodeAt(0) - 65;
                    if (idx >= 0 && idx < options.length) rawAnswer.push(idx);
                }
                rawAnswer.sort((a, b) => a - b);
            }
            // Category精简: "/创新创业/第3讲" -> "第3讲"
            let displayCat = categoryRaw;
            if (displayCat.includes('/')) {
                const parts = displayCat.split('/');
                if (parts.length > 0) displayCat = parts[parts.length - 1];
            }
            if (!displayCat) displayCat = lectureName;
            questions.push({
                id: `OLD-${lectureId}-${i}`,
                type,
                question: qText,
                options,
                rawAnswer,
                explanation: exp || "暂无解析",
                category: displayCat,
                lectureId: lectureId
            });
        }
        return questions;
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
    const parseMaogaiJson = (data) => {
        const chapters = {};
        const chapterMap = {};
        MAOGAO_CHAPTERS.forEach(ch => {
            chapterMap[String(ch.id)] = ch.name;
        });
        const srcToChId = {};
        srcToChId['0（题库更新时间:2025-5-6）'] = 1;
        for (let i = 1; i <= 8; i++) srcToChId[String(i)] = i + 1;
        for (const q of data) {
            // 1. 兼容获取章节ID (带有200%防御性容灾以同时支持新版1-9及历史版1468等章节编号，彻底修复全部被归为导论的Bug)
            let chId = 1;
            if (q['章节ID'] !== undefined) {
                const tempChId = Number(q['章节ID']);
                if (tempChId > 0 && tempChId <= 9) {
                    chId = tempChId;
                } else {
                    chId = (tempChId - 1467 > 0 && tempChId - 1467 <= 9) ? (tempChId - 1467) : 1;
                }
            } else {
                const rawCh = String(q['来源章节请求'] || '0（题库更新时间:2025-5-6）');
                chId = srcToChId[rawCh] || 1;
            }
            const chKey = String(chId);
            if (!chapters[chKey]) chapters[chKey] = [];
            let type = 'single';
            const rawTypeName = String(q['题型名称'] || q['题型'] || '');
            if (rawTypeName.includes('多选') || rawTypeName === '2') {
                type = 'multiple';
            } else if (rawTypeName.includes('判断') || rawTypeName === '4') {
                type = 'judgment';
            } else if (rawTypeName.includes('填空') || rawTypeName === '7') {
                type = 'fill';
            } else {
                type = 'single';
            }
            const optionsObj = q['选项'] || {};
            let options = [];
            let rawAnswer = [];
            if (type === 'judgment') {
                options = ['正确', '错误'];
                rawAnswer = q['正确答案'] === 'A' ? [0] : [1];
            } else if (type === 'fill') {
                options = [q['正确答案'] || ''];
                rawAnswer = [0];
            } else {
                const keys = Object.keys(optionsObj).sort();
                options = keys.map(k => optionsObj[k]);
                const answerStr = q['正确答案'] || '';
                const parts = answerStr.split('、').map(s => s.trim()).filter(Boolean);
                if (parts.length > 0) {
                    parts.forEach(ch => {
                        const idx = keys.indexOf(ch);
                        if (idx >= 0) rawAnswer.push(idx);
                    });
                }
                if (rawAnswer.length === 0 && Array.isArray(q['原始answer'])) {
                    rawAnswer = q['原始answer'];
                }
            }
            // 2. 智能规范化处理题目唯一 ID，兼容新旧格式，避免 "MG-MG-1" 错误拼写
            const rawQId = String(q['题目ID'] || '');
            let finalId = rawQId;
            if (!rawQId.startsWith('MG-')) {
                if (rawQId.startsWith('MG')) {
                    finalId = 'MG-' + rawQId.substring(2);
                } else {
                    finalId = `MG-${rawQId}`;
                }
            }
            chapters[chKey].push({
                id: finalId,
                type,
                question: q['题干'] || '',
                options,
                rawAnswer: rawAnswer.sort((a, b) => a - b),
                explanation: q['解析'] || '暂无解析',
                category: chapterMap[chKey] || `第${chKey}章`,
                lectureId: chId
            });
        }
        return chapters;
    };
    useEffect(() => {
        const checkVersion = async () => {
            if (!currentUser || apiLimitReached) return;
            try {
                // 假设后端接口返回格式: { success: true, version: "4.0.3", changelog: "..." }
                // 或者直接存放在 SystemConfig 表中
                const res = await api.request('/SystemConfig?key=app_version');
                if (res && res.success) {
                    const latestVersion = res.version || res.data?.value;
                    const changelog = res.changelog || res.data?.changelog || '修复了一些已知问题并提升了稳定性。';
                    // 只有当远程版本号与本地 CURRENT_APP_VERSION 不一致时才弹窗
                    if (latestVersion && latestVersion !== CURRENT_APP_VERSION) {
                        setRemoteVersionInfo({
                            version: latestVersion,
                            log: changelog
                        });
                        setShowUpdateModal(true);
                    }
                }
            } catch (e) {
                // 静默处理，不打扰用户正常刷题
                console.warn('[Version Check] 检查更新跳过:', e.message);
            }
        };
        // 延迟 3 秒检查，避开首屏题库加载的高峰期
        const timer = setTimeout(checkVersion, 3000);
        return () => clearTimeout(timer);
    }, [currentUser, apiLimitReached]);
    // --- Hooks (本地数据加载) ---
    useEffect(() => {
        const loadLocal = async () => {
            try {
                const getSet = async (k) => {
                    const val = await safeGet(k);
                    return Array.isArray(val) ? new Set(val) : (val instanceof Set ? val : new Set());
                }
                setBrushedIds(normalizeSet(await getSet('app_brushedIds')));
                setMemorizedIds(normalizeSet(await getSet('app_memorizedIds')));
                setMasteredIds(normalizeSet(await getSet('app_masteredIds')));
                setWrongIds(normalizeSet(await getSet('app_wrongIds')));
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
    // 保存本地数据 (Hooks)
    useEffect(() => {
        if (hydrated) safeSet('app_brushedIds', Array.from(brushedIds));
    }, [brushedIds, hydrated]);
    useEffect(() => {
        if (hydrated) safeSet('app_memorizedIds', Array.from(memorizedIds));
    }, [memorizedIds, hydrated]);
    useEffect(() => {
        if (hydrated) safeSet('app_masteredIds', Array.from(masteredIds));
    }, [masteredIds, hydrated]);
    useEffect(() => {
        if (hydrated) safeSet('app_wrongIds', Array.from(wrongIds));
    }, [wrongIds, hydrated]);
    useEffect(() => {
        if (hydrated) safeSet('app_history', history);
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
                }
            }
        };
        save().catch(console.error);
    }, [lastSession, hydrated]);
    // 迁移旧缓存 (to subject-specific keys)
    useEffect(() => {
        (async () => {
            try {
                const oldKeys = ['hf_question_bank', 'hf_bank_version'];
                for (const k of oldKeys) {
                    const val = await localforage.getItem(k);
                    if (val) {
                        if (k === 'hf_question_bank' && typeof val === 'object') {
                            const newKey = getBankCacheKey('innovation');
                            const existing = await safeGet(newKey);
                            if (!existing) {
                                await safeSet(newKey, val);
                                await safeSet(getBankCacheVersionKey('innovation'), BANK_CACHE_VERSION);
                            }
                        }
                        await localforage.removeItem(k).catch(() => {
                        });
                        try {
                            localStorage.removeItem(k);
                        } catch {
                        }
                    }
                }
            } catch (err) {
                console.warn('Migration step failed', err);
            }
        })();
    }, []);
    // ✅ 改动：自动补录 (Cloudflare 版)
    useEffect(() => {
        const tryAutoRecovery = async () => {
            if (!hydrated || !currentUser || apiLimitReached) return;
            // ⚠️ Cloudflare 模式下 id 直接在 currentUser 对象中
            const localPatchedKey = `patched_20260117_v2_${currentUser.id}`;
            if (localStorage.getItem(localPatchedKey) === 'true') {
                return;
            }
            try {
                // 调用后端补录接口
                const res = await api.request('/recoverOutageStats', 'POST', {
                    history: history
                });
                if (res && res.success) {
                    localStorage.setItem(localPatchedKey, 'true');
                    console.log('数据补录检查完成:', res.msg || res.count);
                }
            } catch (e) {
                console.warn('自动补录请求失败（不影响使用）:', e);
            }
        };
        const timer = setTimeout(tryAutoRecovery, 5000);
        return () => clearTimeout(timer);
    }, [hydrated, currentUser, history, apiLimitReached]);
    // 加载题库 (subject-aware)
    useEffect(() => {
        if (!selectedSubject) return;
        const cacheKey = getBankCacheKey(selectedSubject);
        const cacheVerKey = getBankCacheVersionKey(selectedSubject);
        const subject = SUBJECTS.find(s => s.id === selectedSubject);
        if (!subject) return;
        const isValidBank = (bank) => {
            if (!bank || typeof bank !== 'object') return false;
            const chapters = Object.values(bank);
            if (!chapters.length) return false;
            const firstChapter = chapters[0];
            if (!Array.isArray(firstChapter) || firstChapter.length === 0) return false;
            const item = firstChapter[0];
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
            await new Promise(r => setTimeout(r, 100));
            setBankStatus('loading');
            setBankPercent(0);
            try {
                setBankProgress("检查本地缓存...");
                const cachedBank = await safeGet(cacheKey);
                const cachedVer = await safeGet(cacheVerKey);
                if (cachedBank && Number(cachedVer) === BANK_CACHE_VERSION) {
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
                            await safeSet(cacheKey, repaired);
                            await safeSet(cacheVerKey, BANK_CACHE_VERSION);
                            setBankProgress('题库已就绪');
                            setBankPercent(100);
                            return;
                        }
                    }
                }
                if (subject.id === 'maogai') {
                    setBankProgress('正在加载毛概题库...');
                    try {
                        const url = '/maogai_full.json';
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const rawJson = await res.json();
                        const parsed = parseMaogaiJson(rawJson);
                        if (Object.keys(parsed).length > 0) {
                            setAllQuestionBank(parsed);
                            setBankStatus('ready');
                            await safeSet(cacheKey, parsed);
                            await safeSet(cacheVerKey, BANK_CACHE_VERSION);
                            setBankProgress('题库已就绪');
                            setBankPercent(100);
                        } else {
                            throw new Error('解析结果为空');
                        }
                    } catch (error) {
                        console.warn('毛概题库加载失败', error);
                        setBankStatus('error');
                        setErrorMsg("毛概题库加载失败: " + error.message);
                        setBankPercent(0);
                    }
                    return;
                }
                const lectures = subject.lectures || LECTURES;
                const total = lectures.length;
                const newBank = {};
                // 使用 Promise.all 并行并发加载并解析所有 Excel 题库，加载速度飙升！
                const loadPromises = lectures.map(async (lecture) => {
                    try {
                        const data = await fetchLectureArrayBuffer(lecture);
                        const workbook = await safeParseXLSX(data);
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rawData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                        let parsed = [];
                        if (lecture.id === 99) {
                            parsed = parseOldFormatData(rawData, lecture.id, lecture.name);
                        } else {
                            parsed = parseExcelData(rawData, lecture.id, lecture.name);
                        }
                        if (parsed.length > 0) {
                            newBank[lecture.id] = parsed;
                        }
                    } catch (error) {
                        console.warn(`Load failed: ${lecture.file}`, error);
                    }
                });
                setBankProgress("正在极速装载本地题库...");
                await Promise.all(loadPromises);
                if (Object.keys(newBank).length > 0) {
                    setAllQuestionBank(newBank);
                    setBankStatus('ready');
                    await safeSet(cacheKey, newBank);
                    await safeSet(cacheVerKey, BANK_CACHE_VERSION);
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
    }, [selectedSubject]);
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
        if (!selectedSubject) return;
        const cacheKey = getBankCacheKey(selectedSubject);
        const cacheVerKey = getBankCacheVersionKey(selectedSubject);
        const subject = SUBJECTS.find(s => s.id === selectedSubject);
        if (!subject) return;
        setBankStatus('loading');
        setBankProgress('正在强制更新题库... (0%)');
        setBankPercent(0);
        if (subject.id === 'maogai') {
            try {
                const url = '/maogai_full.json';
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const rawJson = await res.json();
                const parsed = parseMaogaiJson(rawJson);
                if (Object.keys(parsed).length > 0) {
                    setAllQuestionBank(parsed);
                    setBankStatus('ready');
                    await safeSet(cacheKey, parsed);
                    await safeSet(cacheVerKey, BANK_CACHE_VERSION);
                    setBankProgress('题库已更新');
                    setBankPercent(100);
                    return;
                }
            } catch (error) {
                console.warn('毛概题库强制更新失败', error);
                setBankStatus('error');
                setErrorMsg("毛概题库强制更新失败: " + error.message);
                setBankPercent(0);
                return;
            }
        }
        const lectures = subject.lectures || LECTURES;
        const total = lectures.length;
        const newBank = {};
        // 使用 Promise.all 并行并发加载并解析所有 Excel 题库，加载速度飙升！
        const loadPromises = lectures.map(async (lecture) => {
            try {
                const data = await fetchLectureArrayBuffer(lecture);
                const workbook = await safeParseXLSX(data);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                let parsed = [];
                if (lecture.id === 99) {
                    parsed = parseOldFormatData(rawData, lecture.id, lecture.name);
                } else {
                    parsed = parseExcelData(rawData, lecture.id, lecture.name);
                }
                if (parsed.length > 0) {
                    newBank[lecture.id] = parsed;
                }
            } catch (error) {
                console.warn(`Load failed: ${lecture.file}`, error);
            }
        });
        setBankProgress("正在极速装载本地题库...");
        await Promise.all(loadPromises);
        if (Object.keys(newBank).length > 0) {
            setAllQuestionBank(newBank);
            setBankStatus('ready');
            await safeSet(cacheKey, newBank);
            await safeSet(cacheVerKey, BANK_CACHE_VERSION);
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
    // ✅ 改动：手动同步 (适配 Cloudflare 后端 secureSync)
    const handleManualSync = async (silent = false) => {
        if (!currentUser) return;
        if (!silent) {
            setSyncStatus('uploading');
            setSyncMsg("备份中...");
        }
        try {
            // Cloudflare 模式下，currentUser 是普通对象
            const email = currentUser.email;
            if (!email) {
                if (!silent) {
                    setSyncStatus('error');
                    setSyncMsg("需绑定邮箱");
                    alert("同步失败：\n为了您的数据安全，系统要求必须绑定邮箱才能进行云端备份。\n\n请在注册/设置中绑定邮箱。");
                }
                return;
            }
            // 调用后端
            const response = await api.request('/secureSync', 'POST', {
                brushedIds: Array.from(brushedIds),
                memorizedIds: Array.from(memorizedIds),
                masteredIds: Array.from(masteredIds),
                wrongIds: Array.from(wrongIds),
                history: history.slice(0, 500) // 限制长度
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
                    setShowEmailHint(true);
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
    // 如果您需要此功能，请在后端添加 GET 接口。
    const handleManualRestore = async (silent = false) => {
        if (!currentUser) return;
        if (!silent) {
            setSyncStatus('downloading');
            setSyncMsg("恢复中...");
        }
        try {
            // 尝试从后端获取数据。如果后端未实现，此步会失败
            // 建议在后端补充: app.get('/api/userProgress', ...)
            // 这里假设接口存在
            const result = await api.request('/userProgress');
            if (result && result.progress) {
                const data = result.progress;
                let newBrushed = new Set(brushedIds);
                let newMemorized = new Set(memorizedIds);
                let newMastered = new Set(masteredIds);
                let newWrong = new Set(wrongIds);
                let newHistory = [...history];
                // 解析 JSON (D1 中存的是 JSON 字符串，后端可能已解析或需前端解析)
                // 假设后端返回的是对象
                const getArr = (v) => {
                    if (Array.isArray(v)) return v;
                    if (typeof v === 'string') {
                        try {
                            return JSON.parse(v);
                        } catch {
                            return [];
                        }
                    }
                    return [];
                };
                const cloudBrushed = getArr(data.brushedIds);
                const cloudMemorized = getArr(data.memorizedIds);
                const cloudMastered = getArr(data.masteredIds);
                const cloudWrong = getArr(data.wrongIds);
                const cloudHistory = getArr(data.history);
                if (cloudBrushed.length) newBrushed = new Set([...newBrushed, ...cloudBrushed]);
                if (cloudMemorized.length) newMemorized = new Set([...newMemorized, ...cloudMemorized]);
                if (cloudMastered.length) newMastered = new Set([...newMastered, ...cloudMastered]);
                if (cloudWrong.length) newWrong = new Set([...newWrong, ...cloudWrong]);
                if (cloudHistory.length) {
                    const existingIds = new Set(newHistory.map(h => h.id));
                    const merged = [...cloudHistory.filter(h => !existingIds.has(h.id)), ...newHistory]
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    newHistory = merged;
                }
                setBrushedIds(newBrushed);
                setMemorizedIds(newMemorized);
                setMasteredIds(newMastered);
                setWrongIds(newWrong);
                setHistory(newHistory);
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
        } catch (e) {
            console.error(e);
            if (!silent) {
                setSyncStatus('error');
                setSyncMsg("失败");
            }
        }
    };
    /**
     * 【新增】本地刷题记录导出为 JSON 文件
     */
    const handleExportProgress = () => {
        try {
            const data = {
                header: {
                    appName: "HFUT Innovation & Entrepreneurship Question Bank (CF)",
                    version: CURRENT_APP_VERSION,
                    exportDate: new Date().toISOString(),
                    userId: currentUser?.id || 'guest'
                },
                payload: {
                    brushedIds: Array.from(brushedIds),
                    memorizedIds: Array.from(memorizedIds),
                    masteredIds: Array.from(masteredIds),
                    wrongIds: Array.from(wrongIds),
                    history: history
                }
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HFUT_Quiz_CF_Sync_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setSyncStatus('success');
            setSyncMsg("导出成功");
        } catch (err) {
            console.error('Export failed', err);
            setSyncStatus('error');
            setSyncMsg("导出失败");
        }
    };
    /**
     * 【新增】从 JSON 文件恢复本地刷题记录
     */
    const handleImportProgress = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // 允许一些宽松的格式检查
                const p = data.payload || data.progress || data;
                if (!p.brushedIds && !p.history) {
                    throw new Error("文件格式不正确，未发现有效的刷题进度数据");
                }
                const confirmMerge = window.confirm("发现有效数据。点击'确定'将新数据与当前进度【合并】，点击'取消'则【覆盖】当前进度。");
                if (confirmMerge) {
                    setBrushedIds(prev => new Set([...prev, ...Array.from(normalizeSet(p.brushedIds))]));
                    setMemorizedIds(prev => new Set([...prev, ...Array.from(normalizeSet(p.memorizedIds))]));
                    setMasteredIds(prev => new Set([...prev, ...Array.from(normalizeSet(p.masteredIds))]));
                    setWrongIds(prev => new Set([...prev, ...Array.from(normalizeSet(p.wrongIds))]));
                    setHistory(prev => {
                        const combined = [...(p.history || []), ...prev];
                        const seen = new Set();
                        return combined.filter(h => {
                            const key = h.id || `${h.timestamp}-${h.questionId}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    });
                } else {
                    if (window.confirm("❗ 警告：完全覆盖将清空当前所有本地进度及历史，确定继续吗？")) {
                        setBrushedIds(normalizeSet(p.brushedIds));
                        setMemorizedIds(normalizeSet(p.memorizedIds));
                        setMasteredIds(normalizeSet(p.masteredIds));
                        setWrongIds(normalizeSet(p.wrongIds));
                        setHistory((p.history || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                    } else {
                        event.target.value = '';
                        return;
                    }
                }
                setSyncStatus('success');
                setSyncMsg("导入完成");
            } catch (err) {
                console.error('Import failed', err);
                alert("导入失败: " + err.message);
                setSyncStatus('error');
                setSyncMsg("导入出错");
            }
        };
        reader.readAsText(file);
        // 清空 input 确保同一个文件能多次触发
        event.target.value = '';
    };
    // 迁移至新结构
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
        setQuizConfig(lastSession.mode);
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
            const questionMatch = q.question?.toLowerCase().includes(lowerKeyword) || false;
            const optionsMatch = q.options?.some(opt => opt && opt.toLowerCase().includes(lowerKeyword)) || false;
            const explanationMatch = q.explanation?.toLowerCase().includes(lowerKeyword) || false;
            return questionMatch || optionsMatch || explanationMatch;
        });
        if (searchFilters.lectureId !== 0) {
            results = results.filter(q => q.lectureId === searchFilters.lectureId);
        }
        if (searchFilters.type !== 'all') {
            results = results.filter(q => q.type === searchFilters.type);
        }
        if (!searchFilters.includeAnswered && !searchFilters.includeUnanswered) {
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
    // ✅ 改动：提交问题结果 (推入缓冲池)
    const submitQuestionResult = async (questionId, isCorrect, questionTitle, category, userAnswer = '') => {
        if (!currentUser) return;
        statsBuffer.current.push({
            questionId,
            isCorrect,
            questionTitle,
            category,
            userAnswer
        });
        if (statsBuffer.current.length >= BATCH_THRESHOLD) {
            await flushStats();
        }
    };
    // ✅ 改动：加载排行榜 (api.request)
    const loadWrongQuestionRanking = async (subjectId = selectedSubject) => {
        try {
            const result = await api.request(`/getWrongQuestionRanking?limit=${LEADERBOARD_LIMIT}&subject=${subjectId}`);
            if (result && Array.isArray(result.ranking)) {
                const parsedRanking = result.ranking.map(item => ({
                    ...item,
                    questionId: normalizeQuestionId(item.questionId)
                }));
                setWrongQuestionRanking(parsedRanking);
            }
        } catch (e) {
            console.error('加载错题排行榜失败:', e);
        }
    };
    const getQuestionDetails = (questionId) => {
        for (const lectureId in allQuestionBank) {
            const questions = allQuestionBank[lectureId];
            const question = questions.find(q => q.id === questionId);
            if (question) return question;
        }
        return null;
    };
    const openRankingQuestion = (rankItem) => {
        const questionDetail = getQuestionDetails(rankItem.questionId);
        if (questionDetail) {
            setViewingRankQuestion({...questionDetail, rankInfo: rankItem});
            // 💡 修改这里：使用新的加载函数
            loadQuestionThread(questionDetail.id);
        } else {
            alert('题库中未找到该题');
        }
    };
    const openSearchQuestion = (param) => {
        let questionItem = null;
        if (typeof param === 'number') {
            if (typeof searchResults !== 'undefined' && searchResults[param]) {
                questionItem = searchResults[param];
            }
        } else {
            questionItem = param;
        }
        if (!questionItem || !questionItem.id) {
            console.error("无法打开题目：题目数据不完整或 ID 缺失", param);
            return;
        }
        const existingRankData = (typeof wrongQuestionRanking !== 'undefined' && Array.isArray(wrongQuestionRanking))
            ? wrongQuestionRanking.find(r => r.questionId === questionItem.id)
            : null;
        const safeQuestion = {
            ...questionItem,
            options: Array.isArray(questionItem.options) ? questionItem.options : [],
            rawAnswer: Array.isArray(questionItem.rawAnswer) ? questionItem.rawAnswer : [],
            explanation: questionItem.explanation || "暂无解析",
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
        if (typeof setViewingRankQuestion === 'function') {
            setViewingRankQuestion(safeQuestion);
        }
        // 触发数据加载
        loadThreadData(questionItem.id);
    };
    // --- 交互逻辑重构 (本地乐观更新) ---
    // 提交评论
    const submitComment = async (questionId) => {
        if (!currentUser || !newComment.trim()) return;
        const validation = validateContent(newComment.trim());
        if (!validation.valid) {
            alert(validation.message);
            setSyncMsg(validation.message);
            setSyncStatus('error');
            return;
        }
        const tempId = 'temp_' + Date.now();
        const commentPayload = {
            id: tempId,
            questionId,
            content: newComment.trim(),
            author: currentUser.username || '我',
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
            likes: 0,
            liked: false,
            isTemp: true
        };
        // 乐观更新 UI
        setQuestionThread(prev => {
            const thread = prev[questionId] || {comments: [], explanations: []};
            return {
                ...prev,
                [questionId]: {
                    ...thread,
                    comments: [commentPayload, ...thread.comments]
                }
            };
        });
        setNewComment('');
        try {
            // 发送请求
            await api.postComment(questionId, commentPayload.content);
            setSyncMsg('评论发布成功');
            setSyncStatus('success');
            // 成功后重新拉取以获取真实 ID 和时间
            // 这里可以不做全量拉取，但为了 ID 同步，简单起见重新拉取一次也无妨。
            // 为了严格符合"不重复拉取"的要求，这里其实可以只保留 UI 状态，
            // 但真实情况需要 ID 才能后续删除。这里折中：静默后台刷新一次 ID。
            // 或者我们可以假设 api.postComment 返回了新 ID。如果 api 支持的话。
            // 暂时强制刷新一次数据以确保一致性 (debounce 会过滤掉频繁操作)
            loadThreadData(questionId);
        } catch (e) {
            console.error('发布评论失败:', e);
            setSyncMsg('评论发布失败');
            setSyncStatus('error');
            // 回滚
            setQuestionThread(prev => {
                const thread = prev[questionId];
                if (!thread) return prev;
                return {
                    ...prev,
                    [questionId]: {
                        ...thread,
                        comments: thread.comments.filter(c => c.id !== tempId)
                    }
                };
            });
        }
    };
    // 点赞评论
    const handleLikeComment = async (questionId, comment) => {
        if (!currentUser || !comment?.id) return;
        if (comment.authorId && comment.authorId === currentUser.id) {
            alert("不能给自己点赞哦");
            return;
        }
        // 乐观更新
        const originalLiked = comment.liked;
        const originalLikes = comment.likes;
        setQuestionThread(prev => {
            const thread = prev[questionId];
            if (!thread) return prev;
            const newComments = thread.comments.map(c => {
                if (c.id === comment.id) {
                    return {
                        ...c,
                        liked: !originalLiked,
                        likes: originalLiked ? Math.max(0, originalLikes - 1) : originalLikes + 1
                    };
                }
                return c;
            });
            return {...prev, [questionId]: {...thread, comments: newComments}};
        });
        try {
            const result = await api.likeComment(comment.id);
            // 使用服务器返回的准确计数校准
            setQuestionThread(prev => {
                const thread = prev[questionId];
                if (!thread) return prev;
                return {
                    ...prev,
                    [questionId]: {
                        ...thread,
                        comments: thread.comments.map(c =>
                            c.id === comment.id ? {...c, likes: result.likes, liked: result.liked} : c
                        )
                    }
                };
            });
        } catch (e) {
            console.error('点赞操作失败', e);
            // 回滚
            setQuestionThread(prev => {
                const thread = prev[questionId];
                if (!thread) return prev;
                return {
                    ...prev,
                    [questionId]: {
                        ...thread,
                        comments: thread.comments.map(c =>
                            c.id === comment.id ? {...c, likes: originalLikes, liked: originalLiked} : c
                        )
                    }
                };
            });
        }
    };
    // 删除评论
    const handleDeleteComment = async (questionId, comment) => {
        if (!currentUser || !comment?.id || comment.authorId !== currentUser.id) return;
        if (!window.confirm('确定删除这条评论吗？')) return;
        // 乐观更新：直接移除
        setQuestionThread(prev => {
            const thread = prev[questionId];
            if (!thread) return prev;
            return {
                ...prev,
                [questionId]: {
                    ...thread,
                    comments: thread.comments.filter(c => c.id !== comment.id)
                }
            };
        });
        setEditingCommentId(null);
        setEditingCommentContent('');
        try {
            await api.request(`/comments/${comment.id}`, 'DELETE');
        } catch (e) {
            console.error('删除评论失败', e);
            alert("删除失败，请重试");
            // 恢复（需重新加载）
            loadThreadData(questionId);
        }
    };
    const handleStartEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
    };
    // 更新评论
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
        // 乐观更新
        setQuestionThread(prev => {
            const thread = prev[questionId];
            if (!thread) return prev;
            return {
                ...prev,
                [questionId]: {
                    ...thread,
                    comments: thread.comments.map(c =>
                        c.id === editingCommentId ? {...c, content: content} : c
                    )
                }
            };
        });
        const originalId = editingCommentId;
        setEditingCommentId(null);
        setEditingCommentContent('');
        try {
            await api.request(`/comments/${originalId}`, 'PUT', {content});
            setSyncStatus('success');
            setSyncMsg('评论已更新');
        } catch (e) {
            console.error('更新评论失败', e);
            setSyncStatus('error');
            setSyncMsg('更新失败');
            loadThreadData(questionId); // 这里回滚比较麻烦，直接重载
        }
    };
    // 解析点赞
    const handleLikeExplanation = async (questionId, explanation) => {
        if (!currentUser || !explanation?.id) return;
        if (explanation.authorId && explanation.authorId === currentUser.id) return;
        // 乐观更新
        const originalVotes = explanation.votes || 0;
        // 注意：当前 API 可能没返回 liked 状态给 explanations 列表（需确认），假设有
        // 如果没有 liked 字段，只能简单 +1
        // 假设前端没有维护 'liked' 状态在 explanations 里，只能盲加
        // 这里为稳妥起见，仍暂时使用重载，或者改进 API 返回结构。
        // 按照用户要求 "不要重复拉取"，我们尝试手动修改本地。
        // 由于不知道当前是“已赞”还是“未赞”（UserExplanation 数据结构如果不含 liked），
        // 我们只能假设这是一个 toggle。但通常点赞 UI 需要 distinct visual state。
        // 检查 loadUserExplanations 里的 api.getExplanations 返回，确实包含 liked。
        setQuestionThread(prev => {
            const thread = prev[questionId];
            if (!thread) return prev;
            const newExps = thread.explanations.map(e => {
                if (e.id === explanation.id) {
                    const isLiked = !!e.liked;
                    return {
                        ...e,
                        liked: !isLiked,
                        votes: isLiked ? Math.max(0, originalVotes - 1) : originalVotes + 1
                    };
                }
                return e;
            });
            return {...prev, [questionId]: {...thread, explanations: newExps}};
        });
        try {
            const result = await api.voteExplanation(explanation.id);
            setQuestionThread(prev => {
                const thread = prev[questionId];
                if (!thread) return prev;
                return {
                    ...prev,
                    [questionId]: {
                        ...thread,
                        explanations: thread.explanations.map(e =>
                            e.id === explanation.id ? {...e, votes: result.votes, liked: result.liked} : e
                        )
                    }
                };
            });
        } catch (e) {
            console.error('解析点赞失败', e);
            loadThreadData(questionId); // 回滚
        }
    };
    // 提交解析
    const submitUserExplanation = async (questionId) => {
        if (!currentUser || !newExplanation.trim()) return;
        const validation = validateContent(newExplanation.trim());
        if (!validation.valid) {
            alert(validation.message);
            setSyncMsg(validation.message);
            setSyncStatus('error');
            return;
        }
        const tempId = 'temp_exp_' + Date.now();
        const expPayload = {
            id: tempId,
            questionId,
            content: newExplanation.trim(),
            author: currentUser.username || '我',
            authorId: currentUser.id,
            createdAt: new Date().toISOString(),
            votes: 0,
            liked: false
        };
        setQuestionThread(prev => {
            const thread = prev[questionId] || {comments: [], explanations: []};
            return {
                ...prev,
                [questionId]: {
                    ...thread,
                    explanations: [expPayload, ...thread.explanations]
                }
            };
        });
        setNewExplanation('');
        setShowExplanationForm(false);
        try {
            await api.postExplanation(questionId, expPayload.content);
            setSyncMsg('解析提交成功');
            setSyncStatus('success');
            loadThreadData(questionId); // 刷新以获取真实 ID
        } catch (e) {
            console.error('提交解析失败:', e);
            alert("提交解析失败: " + (e.message || "未知错误"));
            setSyncMsg('解析提交失败');
            setSyncStatus('error');
            // 回滚
            loadThreadData(questionId);
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
        setQuestionThread(prev => {
            const thread = prev[questionId];
            if (!thread) return prev;
            return {
                ...prev,
                [questionId]: {
                    ...thread,
                    explanations: thread.explanations.map(e =>
                        e.id === editingExplanationId ? {...e, content: content} : e
                    )
                }
            };
        });
        const originalId = editingExplanationId;
        setEditingExplanationId(null);
        setEditingExplanationContent('');
        try {
            await api.request(`/explanations/${originalId}`, 'PUT', {content});
            setSyncStatus('success');
            setSyncMsg('解析已更新');
        } catch (e) {
            console.error('更新解析失败:', e);
            setSyncStatus('error');
            setSyncMsg('更新解析失败');
            loadThreadData(questionId);
        }
    };
    const renderUserExplanations = (questionId) => {
        // 安全引用
        const list = questionThread[questionId]?.explanations;
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
                                    <button onClick={() => {
                                        setEditingExplanationId(exp.id);
                                        setEditingExplanationContent(exp.content);
                                    }} className="text-blue-600 text-xs">编辑</button>
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
                                        <button onClick={() => handleUpdateExplanation(questionId)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded-lg">保存
                                        </button>
                                        <button onClick={() => {
                                            setEditingExplanationId(null);
                                            setEditingExplanationContent('');
                                        }} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg">取消
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Markdown content={exp.content}/>
                                    <div className="flex items-center gap-3 text-xs">
                                        {isOwner ? (
                                            <div className="text-amber-600 flex items-center gap-1">
                                                <ThumbsUp size={12}/> {exp.votes || 0}
                                            </div>
                                        ) : (
                                            <button onClick={() => handleLikeExplanation(questionId, exp)}
                                                    className="flex items-center gap-1 text-amber-600 hover:text-amber-700">
                                                <ThumbsUp size={12}
                                                          fill={exp.liked ? "currentColor" : "none"}/> {exp.votes || 0}
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
    // // ✅ 改动：加载评论 (api.getComments)
    // const loadQuestionComments = async (questionId) => {
    //     try {
    //         // api.getComments 返回数组，包含 liked 字段
    //         const comments = await api.getComments(questionId);
    //         if (Array.isArray(comments)) {
    //             setQuestionComments(prev => ({...prev, [questionId]: comments}));
    //         }
    //     } catch (e) {
    //         console.error('加载评论失败:', e);
    //     }
    // };
    // ✅ 改动：加载解析 (api.getExplanations)
    const loadUserExplanations = async (questionId) => {
        try {
            const explanations = await api.getExplanations(questionId);
            if (Array.isArray(explanations)) {
                setUserExplanations(prev => ({...prev, [questionId]: explanations}));
            }
        } catch (e) {
            console.error('加载用户解析失败:', e);
        }
    };
    const ensureExplanationsLoaded = (questionId) => {
        if (!questionId) return;
        if (!userExplanations[questionId]) loadUserExplanations(questionId);
    };
    const handleOptionClick = (idx) => {
        // 如果是背题模式，或者已经作答过了，点击无效
        if (currentMode === 'memorize' || isAnswered) return;
        const currentQ = questions[currentIndex];
        // 多选题逻辑：点击只是选中/取消选中，不自动提交
        if (currentQ.type === 'multiple') {
            setSelectedIndices(prev =>
                prev.includes(idx)
                    ? prev.filter(i => i !== idx)
                    : [...prev, idx]
            );
        } else {
            // 单选/判断：点击立即执行提交逻辑
            submitAnswer([idx]);
        }
    };
    // ✅ 优化版：提交答案 (移除冗余加载逻辑)
    const submitAnswer = (finalSelection = selectedIndices) => {
        if (finalSelection.length === 0) return;
        const currentQ = questions[currentIndex];
        // 1. 判定对错
        const correctSet = new Set(currentQ.rawAnswer);
        const userSet = new Set(finalSelection);
        const isCorrect = correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x));
        const answerText = [...finalSelection]
            .sort((a, b) => a - b)
            .map(i => ['A', 'B', 'C', 'D', 'E'][i])
            .join('');
        // 2. 更新基础交互状态
        setIsAnswered(true);
        setSelectedIndices(finalSelection);
        setShowExplanation(true); // 💡 这一步会触发我们之前写的 useEffect，自动去加载互动数据
        // 3. 更新统计数据 (本地 Set 操作)
        setBrushedIds(prev => new Set(prev).add(currentQ.id));
        if (isCorrect) {
            setWrongIds(prev => {
                const n = new Set(prev);
                n.delete(currentQ.id);
                return n;
            });
            setMasteredIds(prev => new Set(prev).add(currentQ.id));
            setAnswerResults(prev => ({...prev, [currentQ.id]: 'correct'}));
        } else {
            setMasteredIds(prev => {
                const n = new Set(prev);
                n.delete(currentQ.id);
                return n;
            });
            setWrongIds(prev => new Set(prev).add(currentQ.id));
            setAnswerResults(prev => ({...prev, [currentQ.id]: 'wrong'}));
        }
        // 4. 提交到缓冲区 (由 flushStats 批量发送，不会导致 API 爆炸)
        submitQuestionResult(currentQ.id, isCorrect, currentQ.question, currentQ.category, answerText);
        // 5. 记录本地历史
        setHistory(prev => [{
            id: Date.now(),
            questionId: currentQ.id,
            questionTitle: currentQ.question,
            action: 'answer',
            isCorrect,
            userAnswer: answerText,
            timestamp: new Date().toISOString(),
        }, ...prev]);
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
    const switchSubject = () => {
        setSelectedSubject(null);
        setAllQuestionBank({});
        setBankStatus('idle');
        setCurrentMode('dashboard');
        setQuestions([]);
        setLastSession(null);
    };
    const renderSubjectSelector = () => (
        <div className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-10">
                    <div
                        className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3">
                        <BookOpen size={32} className="md:w-10 md:h-10"/>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">HFUT 刷题系统</h1>
                    <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">请选择要练习的学科</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {SUBJECTS.map(subject => {
                        const isInnovation = subject.id === 'innovation';
                        const Icon = isInnovation ? Brain : BookOpen;
                        return (
                            <button
                                key={subject.id}
                                onClick={async () => {
                                    setSelectedSubject(subject.id);
                                    setBankStatus('idle');
                                    setAllQuestionBank({});
                                }}
                                className="group relative bg-white rounded-[2rem] p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 text-left hover:-translate-y-1"
                            >
                                <div
                                    className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:opacity-100 transition-opacity blur-2xl"/>
                                <div className="relative z-10">
                                    <div
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${isInnovation ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <Icon size={28}/>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">{subject.shortName || subject.name}</h2>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        {isInnovation
                                            ? '7个章节 + 经典旧题库，涵盖创新创业基础全部内容'
                                            : '9个章节，涵盖毛泽东思想和中国特色社会主义理论体系概论全部内容'}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
    // Helper renderers moved out of JSX return
    const renderDashboard = () => (
        <div className="h-screen flex flex-col max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 overflow-hidden">
            <header className="flex justify-between items-center mb-6 md:mb-8 shrink-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
                        <GraduationCap className="text-blue-600 w-6 h-6 md:w-8 md:h-8"/>
                        <span>{currentSubject?.shortName || currentSubject?.name || '刷题系统'}</span>
                        <button onClick={switchSubject}
                                className="ml-2 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors">
                            切换
                        </button>
                    </h1>
                    {/* ✅ 改动：Cloudflare 模式下直接访问 username 属性 */}
                    <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 pl-8 md:pl-11">欢迎, {currentUser.username}</p>
                </div>
                <div className="flex gap-2 md:gap-3 items-center">
                    {onlineCount !== null && (
                        <div
                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 text-xs md:text-sm font-medium flex items-center gap-2">
                            <User size={16}/> 在线：{onlineCount}
                        </div>
                    )}
                    {syncMsg && (
                        <div
                            className="px-3 py-2 rounded-xl border text-xs md:text-sm font-semibold flex items-center gap-2 bg-white shadow-sm"
                            aria-live="polite">
                            {syncStatus === 'success' && <CheckCircle size={14} className="text-green-600"/>}
                            {syncStatus === 'error' && <AlertCircle size={14} className="text-red-500"/>}
                            {syncStatus === 'uploading' &&
                                <Loader2 size={14} className="animate-spin text-blue-500"/>}
                            {syncStatus === 'downloading' && <DownloadCloud size={14} className="text-blue-500"/>}
                            <span className="text-slate-600">{syncMsg}</span>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            window.location.hash = '#/introduce';
                        }}
                        className="p-2 md:px-3 md:py-2 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-indigo-600 transition-all border border-slate-100"
                        title="产品介绍"
                    >
                        <GraduationCap size={18} className="md:w-5 md:h-5"/>
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
                                <div
                                    className="bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg relative text-center">
                                    <div className="absolute -top-1 right-4 w-3 h-3 bg-red-500 rotate-45"></div>
                                    {/* 小箭头 */}
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
                        {/* 【新增】本地备份与恢复按钮 */}
                        <div className="flex gap-2">
                            <button onClick={handleExportProgress}
                                    className="px-4 py-2 bg-slate-50 text-blue-600 rounded-xl shadow-sm border border-blue-100 hover:bg-blue-100 flex items-center gap-2 text-sm font-bold transition-all"
                                    title="将本地进度导出为文件">
                                <FileUp size={18}/> 导出
                            </button>
                            <label
                                className="px-4 py-2 bg-slate-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100 hover:bg-indigo-100 flex items-center gap-2 text-sm font-bold transition-all cursor-pointer"
                                title="从文件恢复本地进度">
                                <FileDown size={18}/> 导入
                                <input type="file" className="hidden" accept=".json" onChange={handleImportProgress}/>
                            </label>
                        </div>
                        <button onClick={() => setShowResetModal(true)}
                                className="px-4 py-2 bg-white text-red-600 rounded-xl shadow-sm border border-slate-200 hover:bg-red-50 flex items-center gap-2 text-sm font-medium transition-all"
                                title="重置进度">
                            <Trash2 size={18}/>
                        </button>
                    </div>
                    {/* ✅ 改动：使用 api.logout */}
                    <button onClick={() => {
                        api.logout();
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
                            <Search size={18} className="text-blue-600"/>
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
                            <label
                                className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">关键词</label>
                            <input
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="题干 / 选项 / 解析"
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label
                                className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">章节</label>
                            <select
                                value={searchFilters.lectureId}
                                onChange={(e) => setSearchFilters({
                                    ...searchFilters,
                                    lectureId: Number(e.target.value)
                                })}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={0}>全部章节</option>
                                {(currentSubject?.lectures || (currentSubject?.chapters?.map(ch => ({
                                    id: ch.id,
                                    name: ch.name
                                }))) || []).map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label
                                className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题型</label>
                            <select
                                value={searchFilters.type}
                                onChange={(e) => setSearchFilters({...searchFilters, type: e.target.value})}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">全部</option>
                                <option value="single">单选</option>
                                <option value="multiple">多选</option>
                                <option value="judgment">判断</option>
                                <option value="fill">填空</option>
                                <option value="big">简答</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center mt-3 md:mt-4">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={searchFilters.includeAnswered}
                                onChange={(e) => setSearchFilters({
                                    ...searchFilters,
                                    includeAnswered: e.target.checked
                                })}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            已作答
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={searchFilters.includeUnanswered}
                                onChange={(e) => setSearchFilters({
                                    ...searchFilters,
                                    includeUnanswered: e.target.checked
                                })}
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
                                onClick={() => {
                                    setSearchResults([]);
                                    setShowSearchResults(false);
                                    setSearchKeyword('');
                                }}
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
                                        <div
                                            className="text-slate-800 font-semibold group-hover:text-blue-600 transition">{res.question}</div>
                                        <div className="flex items-center justify-between">
                                                <span
                                                    className="text-[12px] text-slate-500">{res.category} · {
                                                    res.type === 'multiple' ? '多选' :
                                                        res.type === 'judgment' ? '判断' :
                                                            res.type === 'fill' ? '填空' :
                                                                res.type === 'big' ? '简答' : '单选'
                                                }</span>
                                            <span
                                                className="text-blue-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition">查看详情 →</span>
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
                    <button onClick={handleExportProgress}
                            className="p-2 bg-white text-blue-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center">
                        <FileUp size={16}/>
                    </button>
                    <label
                        className="p-2 bg-white text-indigo-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center cursor-pointer">
                        <FileDown size={16}/>
                        <input type="file" className="hidden" accept=".json" onChange={handleImportProgress}/>
                    </label>
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
                <div
                    className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-enter backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                        {/* 装饰背景 */}
                        <div
                            className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div
                                    className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                    <RefreshCw size={32}
                                               className="animate-spin-slow"/> {/* 需要确保导入了 RefreshCw 图标 */}
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
                                    <RefreshCw size={18}/> 立即刷新体验
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
                            <div
                                className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"/>
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Settings size={20}/>
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg md:text-xl text-slate-800">开始新的练习</h2>
                                        <p className="text-xs md:text-sm text-slate-400">自定义你的刷题计划</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="md:col-span-2">
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题库章节</label>
                                        <select value={quizConfig.lectureId} onChange={e => setQuizConfig({
                                            ...quizConfig,
                                            lectureId: Number(e.target.value)
                                        })}
                                                className="w-full p-3 md:p-4 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm md:text-base font-medium focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-100 appearance-none">
                                            <option value={0}>📚 综合练习 (所有章节)</option>
                                            {(currentSubject?.lectures || (currentSubject?.chapters?.map(ch => ({
                                                id: ch.id,
                                                name: ch.name
                                            })) || [])).map(l => <option key={l.id}
                                                                         value={l.id}>{l.name} ({allQuestionBank[l.id]?.length || 0}题)</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题目数量</label>
                                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                            {[10, 20, 50, 'all'].map(n => (
                                                <button key={n}
                                                        onClick={() => setQuizConfig({...quizConfig, count: n})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.count === n ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>{n === 'all' ? '全部' : n}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">题目类型</label>
                                        <div
                                            className="grid grid-cols-3 md:grid-cols-6 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                            {[
                                                {v: 'all', l: '全部'},
                                                {v: 'single', l: '单选'},
                                                {v: 'multiple', l: '多选'},
                                                {v: 'judgment', l: '判断'},
                                                {v: 'fill', l: '填空'},
                                                {v: 'big', l: '简答'}
                                            ].map(t => (
                                                <button key={t.v}
                                                        onClick={() => setQuizConfig({...quizConfig, type: t.v})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.type === t.v ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>{t.l}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">模式</label>
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                            {[{v: 'all', l: '随机'}, {v: 'new', l: '未做'}, {
                                                v: 'wrong',
                                                l: '错题'
                                            }].map(m => (
                                                <button key={m.v}
                                                        onClick={() => setQuizConfig({...quizConfig, filter: m.v})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.filter === m.v ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>{m.l}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <button onClick={() => {
                                        setCurrentIndex(0);
                                        generateAndStartQuiz('quiz');
                                    }}
                                            disabled={bankStatus !== 'ready'}
                                            className="py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base inline-flex items-center justify-center gap-2">
                                        {bankStatus === 'ready' ? <><Brain size={20}/> 开始刷题</> : <><Loader2
                                            size={20} className="animate-spin"/> {bankProgress}</>}
                                    </button>
                                    <button onClick={() => {
                                        setCurrentIndex(0);
                                        generateAndStartQuiz('memorize');
                                    }}
                                            disabled={bankStatus !== 'ready'}
                                            className="py-3 md:py-4 bg-white border-2 border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-base">
                                        <BookOpen size={20}/> 背题模式
                                    </button>
                                </div>
                                {bankStatus === 'ready' && (
                                    <div className="text-center">
                                        <button onClick={forceUpdateBank}
                                                className="text-xs text-slate-300 hover:text-blue-500 underline decoration-dotted">发现题库旧?
                                            点击强制更新缓存
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                {
                                    label: '总题库',
                                    val: bankStatus === 'ready' ? Object.values(allQuestionBank).flat().length : '-',
                                    icon: Layers,
                                    color: 'text-slate-600',
                                    bg: 'bg-slate-100'
                                },
                                {
                                    label: '已掌握',
                                    val: masteredIds.size,
                                    icon: CheckCircle,
                                    color: 'text-green-600',
                                    bg: 'bg-green-50'
                                },
                                {
                                    label: '已背诵',
                                    val: memorizedIds.size,
                                    icon: Eye,
                                    color: 'text-purple-600',
                                    bg: 'bg-purple-50'
                                },
                                {
                                    label: '正确率',
                                    val: brushedIds.size ? Math.round(masteredIds.size / brushedIds.size * 100) + '%' : '-',
                                    icon: BarChart3,
                                    color: 'text-orange-600',
                                    bg: 'bg-orange-50'
                                }
                            ].map((item, i) => (
                                <div key={i}
                                     className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm transition-transform duration-300 ease-in-out">
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                                        <item.icon size={20}/>
                                    </div>
                                    <div>
                                        <div
                                            className="text-xl md:text-2xl font-bold text-slate-800 leading-none mb-1">{item.val}</div>
                                        <span
                                            className="text-xs font-bold text-slate-400 uppercase">{item.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* 右侧栏：继续学习 + 错题/排行并排 + 数据报表 */}
                    <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                        {lastSession && (
                            <div onClick={resumeLastSession}
                                 className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 md:p-6 text-white shadow-lg cursor-pointer hover:scale-[1.01] transition-transform flex justify-between items-center animate-enter">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><Bookmark
                                        size={24}/></div>
                                    <div>
                                        <h3 className="font-bold text-lg">继续上次的学习</h3>
                                        <p className="text-indigo-100 text-xs md:text-sm">{lastSession.mode === 'memorize' ? '背题模式' : (lastSession.mode === 'mistakes' ? '错题攻坚' : '刷题模式')} ·
                                            剩余 {lastSession.questions.length - lastSession.currentIndex} 题</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                                    <ChevronRight size={24}/></div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div onClick={startMistakeNotebook}
                                 className="bg-gradient-to-br from-red-500 to-rose-600 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] shadow-lg shadow-red-200 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-300 ease-in-out will-change-transform relative overflow-hidden group">
                                <div
                                    className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <AlertTriangle size={20}/></div>
                                        <span
                                            className="font-mono text-3xl font-bold opacity-90">{currentWrongCount}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-0.5">错题攻坚</h3>
                                        <p className="text-red-100 text-xs opacity-90">点击开始专项复习</p>
                                    </div>
                                </div>
                            </div>
                            <div onClick={() => {
                                setCurrentMode('ranking');
                                loadWrongQuestionRanking();
                            }}
                                 className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] shadow-lg shadow-orange-200 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-300 ease-in-out will-change-transform relative overflow-hidden group">
                                <div
                                    className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm"><TrendingUp
                                            size={20}/></div>
                                        <span className="font-mono text-3xl font-bold opacity-90">📊</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-0.5">易错题排行</h3>
                                        <p className="text-orange-100 text-xs opacity-90">查看全站最易错的题目</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <a href={`/#/report?subject=${selectedSubject}`}
                           className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 transition-transform duration-300 ease-in-out will-change-transform flex flex-col no-underline group flex-1 min-h-0">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><PieChart size={20}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-base text-slate-800">数据报表</div>
                                        <div className="text-xs text-slate-400">近7天学习趋势</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mb-4">
                                <div
                                    className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100 flex flex-col justify-center">
                                    <div className="text-[10px] text-slate-400 mb-1 uppercase font-bold">累计已刷
                                    </div>
                                    <div
                                        className="font-bold text-xl text-slate-700 leading-none">{brushedIds.size}</div>
                                </div>
                                <div
                                    className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100 flex flex-col justify-center">
                                    <div className="text-[10px] text-green-600/70 mb-1 uppercase font-bold">已掌握
                                    </div>
                                    <div
                                        className="font-bold text-xl text-green-600 leading-none">{masteredIds.size}</div>
                                </div>
                            </div>
                            <div
                                className="flex items-end justify-between gap-2 border-t border-slate-50 pt-4 flex-1 min-h-[80px]">
                                {weeklyStats.data.map((day, idx) => {
                                    const rawPercent = (day.count / weeklyStats.max) * 100;
                                    const heightPercent = day.count === 0 ? 8 : Math.max(15, rawPercent);
                                    return (
                                        <div key={idx}
                                             className="flex-1 h-full flex flex-col justify-end items-center gap-1 group/bar">
                                            <div className="w-full flex items-end justify-center relative flex-1">
                                                {day.count > 0 && (
                                                    <div
                                                        className="absolute -top-7 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-1.5 rounded mb-1 whitespace-nowrap z-10 pointer-events-none">
                                                        {day.count}题
                                                    </div>
                                                )}
                                                <div style={{height: `${heightPercent}%`}}
                                                     className={`w-3 md:w-3.5 rounded-t-[4px] transition-all duration-500 ease-out relative ${day.isToday ? 'bg-gradient-to-t from-blue-500 to-indigo-400 shadow-lg shadow-blue-200' : (day.count > 0 ? 'bg-blue-200 group-hover/bar:bg-blue-400' : 'bg-slate-100')}`}></div>
                                            </div>
                                            <div
                                                className={`text-[10px] ${day.isToday ? 'font-bold text-blue-600' : 'text-slate-300'}`}>{day.date}</div>
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
        let maxCount = 5;
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const dateStr = d.toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'});
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
                    <div
                        className="md:hidden p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                        <button onClick={exitToDashboard} className="p-2 -ml-2 text-slate-600"><RotateCcw size={20}
                        /></button>
                        <span className="font-bold text-slate-700">{currentIndex + 1}/{questions.length}</span>
                        <button onClick={toggleFullscreen} className="p-2 -mr-2 text-slate-600">{isFullscreen ?
                            <Minimize size={20}/> : <Maximize size={20}/>}</button>
                    </div>
                    <div
                        className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 flex justify-center pb-20 mobile-safe-bottom">
                        <div className="w-full max-w-5xl space-y-6 md:space-y-8">
                            {/* Mobile bottom nav bar */}
                            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
                                <div
                                    className="flex items-center justify-center gap-2 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-3 w-full">
                                    <button
                                        onClick={prevQuestion}
                                        disabled={currentIndex === 0}
                                        className="flex-1 max-w-[120px] px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 shadow-sm text-center inline-flex items-center justify-center gap-1 whitespace-nowrap border border-slate-200">
                                        <ChevronLeft size={14}/> 上一题
                                    </button>
                                    <div
                                        className="text-xs text-slate-500 font-semibold w-16 text-center shrink-0">{currentIndex + 1}/{questions.length}
                                    </div>
                                    <button
                                        onClick={isQuiz ? nextQuestion : handleMemorizeCheck}
                                        className="flex-1 max-w-[140px] px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-md text-center inline-flex items-center justify-center gap-1 whitespace-nowrap">
                                        {isQuiz ? (currentIndex === questions.length - 1 ? '完成' : '下一题') : '记住了'}
                                        <ChevronRight size={14}/>
                                    </button>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-start">
                                <div
                                    className="md:col-span-2 bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-200 animate-enter h-full flex flex-col">
                                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                                        <span
                                            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                                currentQ.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                                                    (currentQ.type === 'judgment' ? 'bg-orange-100 text-orange-700' :
                                                        (currentQ.type === 'fill' ? 'bg-indigo-100 text-indigo-700' :
                                                            (currentQ.type === 'big' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700')))
                                            }`}>
                                            {
                                                currentQ.type === 'multiple' ? '多选题' :
                                                    (currentQ.type === 'judgment' ? '判断题' :
                                                        (currentQ.type === 'fill' ? '填空题' :
                                                            (currentQ.type === 'big' ? '简答题' : '单选题')))
                                            }
                                        </span>
                                        <span
                                            className="text-slate-400 text-xs md:text-sm font-medium flex items-center gap-1"><Layers
                                            size={14}/> {currentQ.category}</span>
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
                                                        className={`w-full p-3.5 sm:p-4 md:p-5 rounded-xl text-left border-2 transition-all flex items-start gap-3 md:gap-4 group relative
                                                                        ${status === 'default' ? 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50' : ''}
                                                                        ${status === 'selected' ? 'border-blue-500 bg-blue-50 text-blue-900' : ''}
                                                                        ${status === 'correct' ? 'border-green-500 bg-green-50 text-green-900' : ''}
                                                                        ${status === 'wrong' ? 'border-red-500 bg-red-50 text-red-900' : ''}
                                                                        ${status === 'default' || status === 'dimmed' ? 'bg-white border-slate-300 text-slate-500' : ''}
                                                                    `}
                                                >
                                                    <div className={`mt-0.5 w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold border transition-colors shrink-0
                                                                        ${status === 'selected' ? 'bg-blue-500 border-blue-500 text-white' : ''}
                                                                        ${status === 'correct' ? 'bg-green-500 border-green-500 text-white' : ''}
                                                                        ${status === 'wrong' ? 'bg-red-500 border-red-500 text-white' : ''}
                                                                        ${status === 'default' || status === 'dimmed' ? 'bg-white border-slate-300 text-slate-500' : ''}
                                                                    `}>
                                                        {['A', 'B', 'C', 'D', 'E'][idx]}
                                                    </div>
                                                    <span
                                                        className="flex-1 text-sm sm:text-base md:text-lg leading-snug">{opt}</span>
                                                    {status === 'correct' && <CheckCircle
                                                        className="text-green-500 shrink-0 w-5 h-5 md:w-6 md:h-6"/>}
                                                    {status === 'wrong' && <XCircle
                                                        className="text-red-500 shrink-0 w-5 h-5 md:w-6 md:h-6"/>}
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
                                    <div
                                        className="flex flex-col items-center gap-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 px-3 py-5 w-fit min-w-[64px]">
                                        <button
                                            onClick={prevQuestion}
                                            disabled={currentIndex === 0}
                                            className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 transition flex items-center justify-center text-[12px] shadow-sm px-2"
                                            style={{writingMode: 'vertical-rl', textOrientation: 'upright'}}
                                        >
                                            <ChevronLeft size={12}/> 上一题
                                        </button>
                                        <div
                                            className="text-[11px] text-slate-500 font-semibold border-y border-slate-100 py-1 w-full text-center">{currentIndex + 1}/{questions.length}
                                        </div>
                                        {isQuiz ? (
                                            <button
                                                onClick={nextQuestion}
                                                className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-white bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition flex items-center justify-center text-[12px] shadow-md px-2"
                                                style={{writingMode: 'vertical-rl', textOrientation: 'upright'}}
                                            >
                                                {currentIndex === questions.length - 1 ? '完成' : '下一题'}
                                                <ChevronRight size={12}/>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleMemorizeCheck}
                                                className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-white bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition flex items-center justify-center text-[12px] shadow-md px-2"
                                                style={{writingMode: 'vertical-rl', textOrientation: 'upright'}}
                                            >
                                                记住了，下一题 <ChevronRight size={12}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {showContent && (
                                <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-stretch">
                                    <div
                                        className="animate-enter bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 h-full flex flex-col gap-4">
                                        {/* 使用 Optional Chaining 安全访问 */}
                                        {questionThread[currentQ.id]?.explanations?.length > 0 && (
                                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                <div
                                                    className="flex items-center gap-2 mb-3 text-purple-900 font-bold">
                                                    <Award size={20} className="text-purple-500"/> 用户贡献的解析
                                                </div>
                                                {renderUserExplanations(currentQ.id)}
                                            </div>
                                        )}
                                        <div
                                            className="animate-enter bg-indigo-50 p-5 md:p-6 rounded-[1.5rem] border border-indigo-100">
                                            <div
                                                className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-sm">
                                                <Zap size={18} className="text-indigo-600"/> <span>答案解析</span>
                                            </div>
                                            <Markdown content={currentQ.explanation} size="sm"
                                                      className="text-indigo-800 leading-relaxed opacity-90 text-sm md:text-base flex-1"/>
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
                                                                className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                                rows={4}
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => submitUserExplanation(currentQ.id)}
                                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                                                                    <Send size={16}/> 提交解析
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowExplanationForm(false);
                                                                        setNewExplanation('');
                                                                    }}
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
                                    <div
                                        className="animate-enter bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 scroll-mt-24 h-full flex flex-col"
                                        ref={commentSectionRef}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                                                <MessageSquare size={20} className="text-slate-500"/>
                                                {/* 使用 Optional Chaining 安全访问 */}
                                                评论区 {questionThread[currentQ.id]?.comments?.length ? `(${questionThread[currentQ.id].comments.length})` : ''}
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
                                            {/* 使用 Optional Chaining 安全访问 */}
                                            {questionThread[currentQ.id]?.comments?.length > 0 ? (
                                                <div className="space-y-3 max-h-full overflow-y-auto flex-1">
                                                    {questionThread[currentQ.id].comments.map((comment) => {
                                                        const isOwner = comment.authorId === currentUser?.id;
                                                        const isEditing = editingCommentId === comment.id;
                                                        return (
                                                            <div key={comment.id}
                                                                 className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                                                                {isEditing ? (
                                                                    <div className="space-y-2">
                                                                        <textarea
                                                                            value={editingCommentContent}
                                                                            onChange={(e) => setEditingCommentContent(e.target.value)}
                                                                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                                            rows={3}
                                                                        />
                                                                        <div
                                                                            className="flex gap-2 justify-end text-xs">
                                                                            <button
                                                                                onClick={() => handleUpdateComment(currentQ.id)}
                                                                                className="px-3 py-1 bg-blue-600 text-white rounded-lg">保存
                                                                            </button>
                                                                            <button onClick={() => {
                                                                                setEditingCommentId(null);
                                                                                setEditingCommentContent('');
                                                                            }}
                                                                                    className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg">取消
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div
                                                                            className="text-slate-800 text-sm mb-1 break-words">
                                                                            <Markdown content={comment.content}
                                                                                      size="sm"/>
                                                                        </div>
                                                                        <div
                                                                            className="flex items-center justify-between text-xs text-slate-500">
                                                                            <span>{comment.author}</span>
                                                                            <span>{formatDate(comment.createdAt)}</span>
                                                                        </div>
                                                                        <div
                                                                            className="flex items-center gap-3 text-xs">
                                                                            {isOwner ? (
                                                                                <>
                                                                                    {/* --- 作者视角：只显示数量，不可点击 --- */}
                                                                                    <div
                                                                                        className={`flex items-center gap-1 cursor-default ${comment.likes > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}
                                                                                        title="收获的点赞数"
                                                                                    >
                                                                                        {/* 如果有赞，图标设为实心/高亮，看着更舒服 */}
                                                                                        <ThumbsUp size={12}
                                                                                                  fill={comment.likes > 0 ? "currentColor" : "none"}/>
                                                                                        {comment.likes || 0}
                                                                                    </div>
                                                                                    {/* 增加一个小竖线分隔符，视觉更清晰 */}
                                                                                    <div
                                                                                        className="w-[1px] h-3 bg-slate-200"></div>
                                                                                    <button
                                                                                        onClick={() => handleStartEditComment(comment)}
                                                                                        className="text-blue-600 hover:text-blue-700 transition-colors">编辑
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteComment(currentQ.id, comment)}
                                                                                        className="text-red-600 hover:text-red-700 transition-colors">删除
                                                                                    </button>
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
                                                                                    <ThumbsUp size={12}
                                                                                              fill={comment.liked ? "currentColor" : "none"}/>
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
                </div>
            </div>
        )
    };
    // --- 登录界面 (适配 Cloudflare API) ---
    const renderLoginScreen = () => (
        <div className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="glass p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
                <div className="text-center mb-8">
                    <div
                        className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3">
                        <Brain size={32} className="md:w-10 md:h-10"/>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">HFUT 刷题系统</h1>
                    <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Pro 学习系统</p>
                    {brushedIds.size > 0 &&
                        <p className="text-xs text-blue-500 mt-2">本地缓存: {brushedIds.size} 题记录</p>}
                </div>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthLoading(true);
                    setAuthError(null);
                    try {
                        // ✅ 改动：调用 api.login
                        const user = await api.login(username, password);
                        setCurrentUser(user);
                        setAuthLoading(false);
                    } catch (err) {
                        setAuthError(err.message || "登录失败");
                        setAuthLoading(false);
                    }
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
                        {authLoading ? '登录中...' : '立即登录'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <a href="/#/register"
                       className="text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors flex items-center justify-center gap-1">
                        没有账号？<span
                        className="underline decoration-blue-300 decoration-2 underline-offset-2">去注册新账号</span>
                        <ChevronRight size={14}/>
                    </a>
                </div>
            </div>
        </div>
    );
// ✅ 优化版：自动加载互动数据 (防抖 + 缓存检查)
    useEffect(() => {
        if (!questions.length) return;
        const q = questions[currentIndex];
        if (!q || !q.id) return;
        // 💡 确定加载时机：背题模式直接加载，或者刷题模式已显示解析（答题后）
        const isMemorizeMode = currentMode === 'memorize';
        const shouldShowContent = isMemorizeMode || showExplanation;
        if (!shouldShowContent) return;
        // 1. 💡 增加防抖 (Debounce)：防止快速翻题导致瞬间发出几十个请求
        const timer = setTimeout(() => {
            // 2. 💡 检查缓存：如果 questionThread 里已经有这道题的数据，就不再请求 API
            if (!questionThread[q.id]) {
                console.log(`[API] 正在拉取题目互动数据: ${q.id}`);
                loadQuestionThread(q.id); // 统一拉取评论和用户解析
            }
        }, 300); // 延迟 300ms，用户停留在某题才会加载
        // 3. 清理定时器，如果用户在 300ms 内翻到下一题，上一个请求会被取消
        return () => clearTimeout(timer);
    }, [currentIndex, showExplanation, currentMode, questions.length]);
// 💡 注意：这里移除了 questions 本身作为依赖，改用 length，防止无关变动触发
    // 定时发送答题缓冲数据
    useEffect(() => {
        const timer = setInterval(() => {
            if (statsBuffer.current.length > 0) flushStats();
        }, FLUSH_INTERVAL);
        return () => {
            clearInterval(timer);
            if (statsBuffer.current.length > 0) flushStats();
        };
    }, []);
    // --- 排行榜页面 ---
    const renderRankingPage = () => (
        <div className="h-screen flex flex-col bg-slate-100">
            <div
                className="bg-white border-b border-slate-200 p-4 md:p-6 flex justify-between items-center sticky top-0 z-10">
                <button
                    onClick={() => setCurrentMode('dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                    <ChevronLeft size={18}/> 返回
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="text-orange-600" size={24}/> 全站易错榜
                </h1>
                <button
                    onClick={() => {
                        setWrongQuestionRanking([]);
                        loadWrongQuestionRanking();
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all"
                    title="刷新榜单"
                >
                    <RefreshCw size={20}/>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                    {wrongQuestionRanking.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center text-slate-400">
                            <AlertCircle size={48} className="mx-auto mb-4 opacity-50"/>
                            <p>暂无数据或加载中...</p>
                        </div>
                    ) : (
                        wrongQuestionRanking.map((item, index) => (
                            <div
                                key={item.questionId}
                                onClick={() => openRankingQuestion(item)}
                                className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 hover:border-orange-300 transition-all cursor-pointer group"
                            >
                                <div className="flex gap-4">
                                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl
                                        ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                                'bg-slate-100 text-slate-600'}`}>
                                        {index < 3 ? <Trophy size={24}/> : (index + 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="font-semibold text-slate-800 text-base md:text-lg leading-snug group-hover:text-orange-600 transition-colors">
                                                {item.questionTitle}
                                            </h3>
                                            <span
                                                className="shrink-0 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold">
                                                错{item.errorCount}次
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <span className="flex items-center gap-1"><Layers
                                                    size={14}/> {item.category}</span>
                                            <span className="flex items-center gap-1"><AlertTriangle
                                                size={14}/> 错误率 {item.errorRate}%</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center">
                                        <ChevronRight size={20}
                                                      className="text-slate-300 group-hover:text-orange-500 transition-colors"/>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
    // --- 错题详情弹窗 ---
    const renderQuestionDetailModal = () => {
        if (!viewingRankQuestion) return null;
        const {question, options, rawAnswer, explanation, id, rankInfo} = viewingRankQuestion;
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-enter">
                <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl"
                     onClick={e => e.stopPropagation()}>
                    <div
                        className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-start z-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Trophy size={18} className="text-amber-500"/>
                                <span
                                    className="text-xs font-bold text-slate-500">错题排行榜 #{rankInfo.rank}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${
                                    viewingRankQuestion.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                                        (viewingRankQuestion.type === 'judgment' ? 'bg-orange-100 text-orange-700' :
                                            (viewingRankQuestion.type === 'fill' ? 'bg-indigo-100 text-indigo-700' :
                                                (viewingRankQuestion.type === 'big' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700')))
                                }`}>
                                    {
                                        viewingRankQuestion.type === 'multiple' ? '多选' :
                                            viewingRankQuestion.type === 'judgment' ? '判断' :
                                                viewingRankQuestion.type === 'fill' ? '填空' :
                                                    viewingRankQuestion.type === 'big' ? '简答' : '单选'
                                    }
                                </span>
                                <span
                                    className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">{viewingRankQuestion.category}</span>
                                <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded font-bold">
                                    错误 {rankInfo.errorCount} 次 · 错误率 {rankInfo.errorRate}%
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setViewingRankQuestion(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors ml-4">
                            <X size={20} className="text-slate-400"/>
                        </button>
                    </div>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 leading-relaxed">{question}</h3>
                        <div className="space-y-3 mb-6">
                            {options.map((opt, i) => {
                                const isCorrect = rawAnswer.includes(i);
                                const optionLetter = ['A', 'B', 'C', 'D', 'E'][i];
                                const optionStats = rankInfo?.optionStats || {};
                                const selectionCount = optionStats[optionLetter] || 0;
                                const totalSelections = Object.values(optionStats).reduce((sum, count) => sum + count, 0);
                                const selectionRate = totalSelections > 0 ? Math.round((selectionCount / totalSelections) * 100) : 0;
                                const isFrequentlyWrong = !isCorrect && selectionCount > 0 && selectionRate >= 15;
                                return (
                                    <div key={i}
                                         className={`p-4 rounded-xl border-2 text-sm flex gap-3 transition-all ${
                                             isCorrect ? 'bg-green-50 border-green-300 text-green-900 shadow-sm' :
                                                 isFrequentlyWrong ? 'bg-red-50 border-red-300 text-red-900 shadow-sm' :
                                                     'bg-white border-slate-100 text-slate-600'
                                         }`}>
                                        <span
                                            className={`font-bold shrink-0 ${isCorrect ? 'text-green-700' : isFrequentlyWrong ? 'text-red-700' : 'text-slate-400'}`}>
                                            {optionLetter}.
                                        </span>
                                        <span className="flex-1">{opt}</span>
                                        {isCorrect &&
                                            <div className="flex items-center gap-1 shrink-0"><CheckCircle size={18}
                                                                                                           className="text-green-600"/><span
                                                className="text-xs font-bold text-green-700">正确答案</span></div>}
                                        {isFrequentlyWrong &&
                                            <div className="flex items-center gap-1 shrink-0"><XCircle size={18}
                                                                                                       className="text-red-600"/><span
                                                className="text-xs font-bold text-red-700">易错项 {selectionRate}%</span>
                                            </div>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-sm">
                                <Zap size={18} className="text-indigo-600"/> <span>答案解析</span>
                            </div>
                            <Markdown content={explanation} size="sm"
                                      className="text-indigo-800 text-sm leading-relaxed"/>
                            {renderUserExplanations(id)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    if (!currentUser) return renderLoginScreen();
    if (!selectedSubject) return renderSubjectSelector();
    return (
        <div className="h-full bg-slate-50 font-sans text-slate-900">
            {currentMode === 'dashboard' && renderDashboard()}
            {['quiz', 'memorize', 'mistakes'].includes(currentMode) && renderCard()}
            {currentMode === 'ranking' && renderRankingPage()}
            {viewingRankQuestion && renderQuestionDetailModal()}
            {/* API 受限提示 */}
            {apiLimitReached && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] animate-enter">
                    <div className="bg-red-600 text-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
                        <div className="max-w-4xl mx-auto flex items-start md:items-center gap-4">
                            <div className="p-2 bg-white/20 rounded-full shrink-0 animate-pulse"><Zap size={24}
                                                                                                      className="text-white"/>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">服务受限</h3>
                                <p className="text-red-100 text-sm mt-1 leading-snug">
                                    API 请求过于频繁，云端同步等功能暂时不可用，本地刷题不受影响。
                                </p>
                            </div>
                            <button onClick={() => setApiLimitReached(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg shrink-0"><X size={20}/></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default App;
