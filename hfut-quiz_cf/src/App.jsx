/* eslint-disable no-unused-vars, no-undef, react-hooks/exhaustive-deps, no-empty */
/*
* version: 4.0.4 (Cloudflare Migration)
* 1. 迁移至 Cloudflare Workers + D1
* 2. 优化 API 调用，适配 Hono 后端
* 3. 数据结构适配 SQL 模式
* 4. 题库文件托管在 public 目录
* 5. 新增数据导入和导出功能,可以无缝从原有网站迁移旧有刷题数据
* 6. 优化api调用次数我真没招了
* 7. 一直在优化api我真没招了
* */
import {useState, useEffect, useRef, useMemo} from 'react';
import {api} from './api'; //
import * as XLSX from 'xlsx';
import localforage from 'localforage';
import {
    BookOpen, CheckCircle, XCircle, Brain, Settings,
    ChevronRight, ChevronLeft, RotateCcw, LogOut, AlertCircle, Layers, Loader2,
    AlertTriangle, PieChart, BarChart3, CheckSquare, GraduationCap, Zap,
    UploadCloud, DownloadCloud, RefreshCw, Bookmark, User, Database,
    Maximize, Minimize, Trash2, AlertOctagon, Eye, TrendingUp, MessageSquare,
    ThumbsUp, Send, Edit3, Award, Search, X, Filter, Trophy, FileUp, FileDown
} from 'lucide-react';
import {validateContent} from './contentFilter.js';
import {Markdown} from './components/Markdown';
import {LoginScreen} from './components/LoginScreen';
import {QuestionDetailModal} from './components/QuestionDetailModal';
import {RankingPage} from './components/RankingPage';
import {SubjectSelector} from './SubjectSelector';
import {ResetConfirmModal} from './components/ResetConfirmModal';
import {UpdateNoticeModal} from './components/UpdateNoticeModal';
import {DashboardHeader} from './components/DashboardHeader';
import {DashboardSearchPanel} from './components/DashboardSearchPanel';
import {DashboardPage} from './components/DashboardPage';
import {DashboardMainContentShell} from './components/DashboardMainContentShell';
import {QuizSidebar} from './components/QuizSidebar';
import {QuizMobileTopBar} from './components/QuizMobileTopBar';
import {QuizNavControls} from './components/QuizNavControls';
import {QuizQuestionPanel} from './components/QuizQuestionPanel';
import {QuizDiscussionPanel} from './components/QuizDiscussionPanel';
import {
    BANK_CACHE_VERSION,
    CURRENT_APP_VERSION,
    GITHUB_BASE,
    getBankCacheKey,
    getBankCacheVersionKey,
    LECTURES,
    LEADERBOARD_LIMIT,
    MAOGAO_CHAPTERS,
    REPORT_URL,
    SUBJECTS
} from './config/quizConfig';
import {formatDate} from './utils/date';
import {safeGet, safeSet} from './utils/storage';
import {normalizeSet} from './utils/questionId';
import {getSubjectById, getSubjectChapterOptions} from './utils/subjectAdapter';
import {
    getThemeMode,
    setThemeMode as saveThemeMode,
    applyTheme,
    initThemeListener,
    destroyThemeListener
} from './utils/theme';

function App() {
    const initialUser = api.getCurrentUser();
    const [currentUser, setCurrentUser] = useState(initialUser);
    const [showLoginScreen, setShowLoginScreen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 🌗 全局日夜模式偏好状态
    const [themeMode, setThemeModeState] = useState(getThemeMode());

    const setThemeMode = (mode) => {
        setThemeModeState(mode);
        saveThemeMode(mode);
    };

    // 学科选择
    const [customSubjects, setCustomSubjects] = useState([]);
    const allSubjects = useMemo(() => [...SUBJECTS, ...customSubjects], [customSubjects]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [showApiSettingsModal, setShowApiSettingsModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const lastSelectedSubjectRef = useRef(null);
    const currentSubject = getSubjectById(allSubjects, selectedSubject);
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

    // 新增：根据当前选中学科加载的题库，实现对已掌握、已背诵、已刷过题目以及历史记录的 100% 精准学科隔离
    const currentSubjectQids = useMemo(() => {
        if (!allQuestionBank) return new Set();
        const ids = Object.values(allQuestionBank).flat().map(q => q.id);
        return new Set(ids);
    }, [allQuestionBank]);

    const currentMasteredIds = useMemo(() => {
        const filtered = Array.from(masteredIds).filter(id => currentSubjectQids.has(id));
        return new Set(filtered);
    }, [masteredIds, currentSubjectQids]);

    const currentMemorizedIds = useMemo(() => {
        const filtered = Array.from(memorizedIds).filter(id => currentSubjectQids.has(id));
        return new Set(filtered);
    }, [memorizedIds, currentSubjectQids]);

    const currentBrushedIds = useMemo(() => {
        const filtered = Array.from(brushedIds).filter(id => currentSubjectQids.has(id));
        return new Set(filtered);
    }, [brushedIds, currentSubjectQids]);

    const currentHistory = useMemo(() => {
        return history.filter(h => h && h.questionId && currentSubjectQids.has(h.questionId));
    }, [history, currentSubjectQids]);
    const getQuestionSubjectId = (questionId) => {
        const qid = String(questionId || '');
        if (!qid) return null;
        if (qid.startsWith('custom_')) {
            const idx = qid.lastIndexOf('-Q');
            return idx > 0 ? qid.slice(0, idx) : null;
        }
        if (qid.startsWith('HGD-MG-')) return 'hgdmy-maogai';
        if (qid.startsWith('MG-')) return 'maogai';
        if (/^(OLD-|L\d+-)/.test(qid)) return 'innovation';
        return 'innovation';
    };
    const filterProgressBySubject = (items = [], subjectId = 'all') => {
        if (subjectId === 'all') return items;
        return items.filter(item => getQuestionSubjectId(item) === subjectId);
    };
    const filterHistoryBySubject = (items = [], subjectId = 'all') => {
        if (subjectId === 'all') return items;
        return items.filter(h => h && h.questionId && getQuestionSubjectId(h.questionId) === subjectId);
    };
    const sanitizeCloudIds = (ids = []) => itemsWithoutCustom(filterProgressBySubject(ids, 'all'));
    const sanitizeCloudHistory = (items = []) => filterHistoryBySubject(items, 'all').filter(h => h && h.questionId && !String(h.questionId).startsWith('custom_'));
    const itemsWithoutCustom = (items = []) => items.filter(id => id && !String(id).startsWith('custom_'));
    const getProgressSnapshot = (subjectId = 'all') => {
        const brushed = filterProgressBySubject(Array.from(brushedIds), subjectId);
        const memorized = filterProgressBySubject(Array.from(memorizedIds), subjectId);
        const mastered = filterProgressBySubject(Array.from(masteredIds), subjectId);
        const wrong = filterProgressBySubject(Array.from(wrongIds), subjectId);
        const hist = filterHistoryBySubject(history, subjectId);
        return { brushed, memorized, mastered, wrong, history: hist };
    };
    const dedupeAndSortHistory = (items = []) => {
        const seen = new Set();
        return (items || []).filter(h => {
            if (!h) return false;
            const key = h.id || `${h.timestamp}-${h.questionId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };
    const toStorableCustomSubject = (s) => ({
        id: s?.id,
        name: s?.name || s?.shortName || s?.id || '自定义题库',
        shortName: s?.shortName || s?.name || s?.id || '自定义',
        icon: s?.icon || '📚',
        category: s?.category || '自建题库',
        isCustom: true,
        lectures: Array.isArray(s?.lectures)
            ? s.lectures.map((l, i) => ({ id: l?.id ?? (i + 1), name: l?.name || `章节${l?.id ?? (i + 1)}` }))
            : []
    });
    const normalizeCustomSubjects = (list = []) => {
        if (!Array.isArray(list)) return [];
        return list.filter(s => s && s.id && s.isCustom).map(toStorableCustomSubject);
    };

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
    const [selectedByQuestion, setSelectedByQuestion] = useState({});
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
    const [customNotes, setCustomNotes] = useState({});
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
    const [selectorModal, setSelectorModal] = useState({
        open: false,
        title: '',
        description: '',
        allowMulti: false,
        options: [],
        selectedValues: []
    });
    const selectorResolveRef = useRef(null);
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
    useEffect(() => {
        if (selectedSubject) {
            lastSelectedSubjectRef.current = selectedSubject;
        }
    }, [selectedSubject]);
    useEffect(() => {
        // 兜底恢复：如果学科被异常清空，但仍有练习会话，则恢复到上一次有效学科
        if (!selectedSubject && questions.length > 0 && ['quiz', 'memorize', 'mistakes', 'dashboard'].includes(currentMode)) {
            const fallback = lastSelectedSubjectRef.current;
            if (fallback) {
                setSelectedSubject(fallback);
            }
        }
    }, [selectedSubject, questions.length, currentMode]);
    const openSubjectSelectorModal = ({title, description, options, allowMulti = false, defaultValues = []}) => {
        return new Promise((resolve) => {
            selectorResolveRef.current = resolve;
            setSelectorModal({
                open: true,
                title: title || '选择题库',
                description: description || '',
                allowMulti,
                options: options || [],
                selectedValues: Array.isArray(defaultValues) ? defaultValues : []
            });
        });
    };
    const closeSubjectSelectorModal = (result = null) => {
        setSelectorModal(prev => ({...prev, open: false}));
        if (selectorResolveRef.current) {
            selectorResolveRef.current(result);
            selectorResolveRef.current = null;
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
                brushedIds: Array.from(brushedIds).filter(id => id && !id.startsWith('custom_')),
                memorizedIds: Array.from(memorizedIds).filter(id => id && !id.startsWith('custom_')),
                masteredIds: Array.from(masteredIds).filter(id => id && !id.startsWith('custom_')),
                wrongIds: Array.from(wrongIds).filter(id => id && !id.startsWith('custom_')),
                history: history.filter(h => h && h.questionId && !h.questionId.startsWith('custom_')).slice(0, 500)
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
    // 初始化日夜模式监听器与时钟轮询（仅挂载时执行一次）
    useEffect(() => {
        // 挂载时应用一次当前主题
        applyTheme(getThemeMode());
        initThemeListener();

        // 监听系统/自动切换抛出的事件，同步 React state
        const handleThemeChanged = (e) => {
            setThemeModeState(e.detail);
        };
        window.addEventListener('app_theme_changed', handleThemeChanged);

        return () => {
            destroyThemeListener();
            window.removeEventListener('app_theme_changed', handleThemeChanged);
        };
    }, []); // ⚠️ 仅执行一次，手动切换时 setThemeMode 会直接调用 applyTheme

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
    const isCustomQuestionId = (questionId) => String(questionId || '').startsWith('custom_');
    const loadQuestionThread = async (questionId) => {
        if (!questionId || !currentUser || isCustomQuestionId(questionId)) return;
        try {
            const res = await api.request(`/thread/${questionId}`);
            const safeRes = (res && typeof res === 'object') ? res : {};
            setQuestionThread(prev => ({
                ...prev,
                [questionId]: {
                    comments: Array.isArray(safeRes.comments) ? safeRes.comments : [],
                    explanations: Array.isArray(safeRes.explanations) ? safeRes.explanations : []
                }
            }));
        } catch (e) {
            console.error("加载互动内容失败", e);
            // 未登录/鉴权失败时不应打断刷题流程，写入空线程以阻止重复请求
            setQuestionThread(prev => ({
                ...prev,
                [questionId]: {
                    comments: [],
                    explanations: []
                }
            }));
        }
    };
    useEffect(() => {
        if (!currentUser || !questions.length) return;
        const q = questions[currentIndex];
        if (q && !isCustomQuestionId(q.id) && !questionThread[q.id]) {
            loadQuestionThread(q.id);
        }
    }, [currentIndex, questions, currentUser]);
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
        if (!questionId || !currentUser || isCustomQuestionId(questionId)) return;
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
            if (/(多选|多项|多项选择)/.test(typeCheck)) type = 'multiple';
            else if (/(判断|是非)/.test(typeCheck)) type = 'judgment';
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
                if (type === 'single' && rawAnswer.length > 1) {
                    type = 'multiple';
                }
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
            if (/(多选|多项|多项选择)/.test(typeRaw)) type = 'multiple';
            else if (/(判断|是非)/.test(typeRaw)) type = 'judgment';
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
                options = [optA, optB, optC, optD].map(v => String(v || '').trim()).filter(Boolean);
                const normalizedAns = answerRaw.toUpperCase().replace(/[^A-E]/g, '');
                for (let char of normalizedAns) {
                    const idx = char.charCodeAt(0) - 65;
                    if (idx >= 0 && idx < options.length) correctAnswers.push(idx);
                }
                if (type === 'single' && correctAnswers.length > 1) {
                    type = 'multiple';
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
            if (/(多选|多项|多项选择)/.test(rawTypeName) || rawTypeName === '2') {
                type = 'multiple';
            } else if (/(判断|是非)/.test(rawTypeName) || rawTypeName === '4') {
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
                const ans = String(q['正确答案'] || '').trim().toUpperCase();
                if (/^(对|√|TRUE|T)$/.test(ans)) {
                    rawAnswer = [0];
                } else if (/^(错|×|FALSE|F)$/.test(ans)) {
                    rawAnswer = [1];
                } else if (ans === 'A') {
                    // 毛概题库中 A/B 与“正确/错误”语义相反：A=错误，B=正确
                    rawAnswer = [1];
                } else if (ans === 'B') {
                    rawAnswer = [0];
                } else {
                    rawAnswer = [0];
                }
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
                if (type === 'single' && rawAnswer.length > 1) {
                    type = 'multiple';
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
    const parseHgdmyMaogaiJson = (data) => {
        const questions = data?.questions || data || [];
        if (!Array.isArray(questions)) return { '1': [] };

        const list = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q || !q.stem) continue;

            let type = 'single';
            if (q.type === 'multiple') type = 'multiple';
            else if (q.type === 'judge') type = 'judgment';

            let options = [];
            let rawAnswer = [];

            if (type === 'judgment') {
                options = ['正确', '错误'];
                rawAnswer = q.answer === true ? [0] : [1];
            } else {
                options = Array.isArray(q.options) ? q.options : [];
                const ans = q.answer;
                if (typeof ans === 'number') {
                    rawAnswer = [ans];
                } else if (Array.isArray(ans)) {
                    rawAnswer = ans.filter(a => typeof a === 'number').sort((a, b) => a - b);
                }
            }

            list.push({
                id: `HGD-MG-${i + 1}`,
                type,
                question: q.stem || '',
                options,
                rawAnswer,
                explanation: q.analysis || '暂无解析',
                category: '全部题目',
                lectureId: 1,
            });
        }

        return { '1': list };
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
                const notes = await safeGet('app_custom_notes', {});
                if (notes && typeof notes === 'object') setCustomNotes(notes);
                const sess = await safeGet('app_lastSession');
                if (sess) setLastSession(sess);
                const customSubs = normalizeCustomSubjects(await safeGet('custom_subjects_list', []));
                setCustomSubjects(customSubs);
                setHydrated(true);
            } catch (e) {
                console.error(e);
                setHydrated(true);
            }
        };
        loadLocal();
    }, []);

    const handleDeleteCustomSubject = async (e, subjectId) => {
        e.stopPropagation();
        if (!confirm("确定要删除该自定义学科吗？此操作不可恢复，且该学科的本地刷题进度也会被清除。")) return;
        const updated = customSubjects.filter(s => s.id !== subjectId);
        setCustomSubjects(updated);
        await safeSet('custom_subjects_list', normalizeCustomSubjects(updated));
        await localforage.removeItem(getBankCacheKey(subjectId)).catch(console.warn);
        await localforage.removeItem(getBankCacheVersionKey(subjectId)).catch(console.warn);
        try { localStorage.removeItem(getBankCacheKey(subjectId)); localStorage.removeItem(getBankCacheVersionKey(subjectId)); } catch {}
        
        // 物理清理本地进度中该学科的题目
        const updatedBrushed = new Set(Array.from(brushedIds).filter(id => id && !id.startsWith(subjectId)));
        const updatedMemorized = new Set(Array.from(memorizedIds).filter(id => id && !id.startsWith(subjectId)));
        const updatedMastered = new Set(Array.from(masteredIds).filter(id => id && !id.startsWith(subjectId)));
        const updatedWrong = new Set(Array.from(wrongIds).filter(id => id && !id.startsWith(subjectId)));
        const updatedHistory = history.filter(h => h && h.questionId && !h.questionId.startsWith(subjectId));
        setBrushedIds(updatedBrushed);
        setMemorizedIds(updatedMemorized);
        setMasteredIds(updatedMastered);
        setWrongIds(updatedWrong);
        setHistory(updatedHistory);
        
        if (selectedSubject === subjectId) {
            setSelectedSubject(null);
            setAllQuestionBank({});
            setBankStatus('idle');
        }
    };
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
        if (hydrated) safeSet('app_custom_notes', customNotes);
    }, [customNotes, hydrated]);
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
        const subject = getSubjectById(allSubjects, selectedSubject);
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
                
                if (subject.isCustom) {
                    if (cachedBank && isValidBank(cachedBank)) {
                        setAllQuestionBank(cachedBank);
                        setBankStatus('ready');
                        setBankProgress('题库已就绪');
                        setBankPercent(100);
                        return;
                    }
                    if (subject.questionBank && isValidBank(subject.questionBank)) {
                        setAllQuestionBank(subject.questionBank);
                        setBankStatus('ready');
                        await safeSet(cacheKey, subject.questionBank);
                        setBankProgress('题库已就绪');
                        setBankPercent(100);
                        return;
                    }
                    throw new Error("自定义题库本地缓存为空或已损坏，请重新上传。");
                }
                
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
                if (subject.id === 'hgdmy-maogai') {
                    setBankProgress('正在加载马院毛概题库...');
                    try {
                        const url = '/hgdmy-maogai.json';
                        const res = await fetch(url);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const rawJson = await res.json();
                        const parsed = parseHgdmyMaogaiJson(rawJson);
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
                        console.warn('马院毛概题库加载失败', error);
                        setBankStatus('error');
                        setErrorMsg("马院毛概题库加载失败: " + error.message);
                        setBankPercent(0);
                    }
                    return;
                }
                const lectures = subject.lectures || LECTURES;
                const total = lectures.length;
                const newBank = {};
                let loaded = 0;
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
                    } finally {
                        loaded++;
                        setBankPercent(Math.round((loaded / total) * 100));
                        setBankProgress(`正在加载题库 (${loaded}/${total})...`);
                    }
                });
                setBankProgress(`正在加载题库 (0/${total})...`);
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
        const subject = getSubjectById(allSubjects, selectedSubject);
        if (!subject) return;
        if (subject.isCustom) return; // 自定义学科纯离线，不需要强制从网络更新
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
        if (subject.id === 'hgdmy-maogai') {
            try {
                const url = '/hgdmy-maogai.json';
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const rawJson = await res.json();
                const parsed = parseHgdmyMaogaiJson(rawJson);
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
                console.warn('马院毛概题库强制更新失败', error);
                setBankStatus('error');
                setErrorMsg("马院毛概题库强制更新失败: " + error.message);
                setBankPercent(0);
                return;
            }
        }
        const lectures = subject.lectures || LECTURES;
        const total = lectures.length;
        const newBank = {};
        let loaded = 0;
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
            } finally {
                loaded++;
                setBankPercent(Math.round((loaded / total) * 100));
                setBankProgress(`正在更新题库 (${loaded}/${total})...`);
            }
        });
        setBankProgress(`正在更新题库 (0/${total})...`);
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
            const ok = window.confirm(
                "将备份到云端的内容：\n- 创新创业/毛概/马院毛概的答题状态（已刷/已背/已掌握/错题）\n- 历史记录（最多500条）\n\n不会备份：\n- 自定义题库及其进度（仅保留本地）\n\n是否继续备份？"
            );
            if (!ok) return;
        }
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
            const snapshot = getProgressSnapshot('all');
            const response = await api.request('/secureSync', 'POST', {
                brushedIds: sanitizeCloudIds(snapshot.brushed),
                memorizedIds: sanitizeCloudIds(snapshot.memorized),
                masteredIds: sanitizeCloudIds(snapshot.mastered),
                wrongIds: sanitizeCloudIds(snapshot.wrong),
                history: sanitizeCloudHistory(snapshot.history).slice(0, 500) // 限制长度
            });
            if (response && response.success) {
                if (!silent) {
                    setSyncStatus('success');
                    setSyncMsg("备份成功");
                    alert("备份完成：已将三套内置题库的答题状态与历史记录同步到云端；自定义题库未上传。");
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
            const ok = window.confirm(
                "将从云端恢复的内容：\n- 创新创业/毛概/马院毛概的答题状态（已刷/已背/已掌握/错题）\n- 历史记录\n\n恢复方式：与本地合并去重，不会覆盖自定义题库。\n\n是否继续恢复？"
            );
            if (!ok) return;
        }
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
                const cloudBrushed = itemsWithoutCustom(getArr(data.brushedIds));
                const cloudMemorized = itemsWithoutCustom(getArr(data.memorizedIds));
                const cloudMastered = itemsWithoutCustom(getArr(data.masteredIds));
                const cloudWrong = itemsWithoutCustom(getArr(data.wrongIds));
                const cloudHistory = getArr(data.history).filter(h => h && h.questionId && !String(h.questionId).startsWith('custom_'));
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
                    alert("恢复完成：已从云端合并恢复三套内置题库的答题状态与历史记录；自定义题库未受影响。");
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
    const handleExportProgress = async () => {
        try {
            const action = await openSubjectSelectorModal({
                title: '导出类型',
                description: '请选择要导出的内容',
                allowMulti: false,
                options: [
                    {value: 'progress', label: '答题状态'},
                    {value: 'raw_bank', label: '原始题库'},
                    {value: 'bundle', label: '题库+答题状态（一体包）'}
                ],
                defaultValues: ['progress']
            });
            if (!action || !action.length) return;
            const exportType = action[0];
            const chosenSubjects = await openSubjectSelectorModal({
                title: '选择题库',
                description: '支持单选/多选；手机端可滚动勾选',
                allowMulti: true,
                options: allSubjects.map(s => ({value: s.id, label: s.name})),
                defaultValues: selectedSubject ? [selectedSubject] : allSubjects.map(s => s.id)
            });
            if (!chosenSubjects || !chosenSubjects.length) {
                alert("请至少选择一个题库。");
                return;
            }
            const isAll = chosenSubjects.length === allSubjects.length;
            const scopeSnapshot = {
                brushed: [],
                memorized: [],
                mastered: [],
                wrong: [],
                history: []
            };
            chosenSubjects.forEach(subId => {
                const one = getProgressSnapshot(subId);
                scopeSnapshot.brushed.push(...one.brushed);
                scopeSnapshot.memorized.push(...one.memorized);
                scopeSnapshot.mastered.push(...one.mastered);
                scopeSnapshot.wrong.push(...one.wrong);
                scopeSnapshot.history.push(...one.history);
            });
            if (exportType === 'progress') {
                const data = {
                    header: {
                        appName: "HFUT Innovation & Entrepreneurship Question Bank (CF)",
                        version: CURRENT_APP_VERSION,
                        exportDate: new Date().toISOString(),
                        userId: currentUser?.id || 'guest',
                        exportType: 'progress',
                        scopeSubjectIds: chosenSubjects,
                        scopeMode: isAll ? 'all' : 'partial'
                    },
                    payload: {
                        brushedIds: Array.from(new Set(scopeSnapshot.brushed)),
                        memorizedIds: Array.from(new Set(scopeSnapshot.memorized)),
                        masteredIds: Array.from(new Set(scopeSnapshot.mastered)),
                        wrongIds: Array.from(new Set(scopeSnapshot.wrong)),
                        history: dedupeAndSortHistory(scopeSnapshot.history)
                    }
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `HFUT_Quiz_CF_Progress_${isAll ? 'all' : chosenSubjects.join('_')}_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setSyncStatus('success');
                setSyncMsg("导出成功");
                return;
            }
            const subjectList = allSubjects.filter(s => chosenSubjects.includes(s.id));
            const banks = {};
            for (const sub of subjectList) {
                const key = getBankCacheKey(sub.id);
                const cached = await safeGet(key, null);
                if (cached && Object.keys(cached).length > 0) {
                    banks[sub.id] = cached;
                } else if (sub.id === selectedSubject && allQuestionBank && Object.keys(allQuestionBank).length > 0) {
                    banks[sub.id] = allQuestionBank;
                }
            }
            if (!Object.keys(banks).length) {
                throw new Error("未找到可导出的题库缓存，请先进入对应题库页面完成加载。");
            }
            if (exportType === 'bundle') {
                const bundleData = {
                    header: {
                        appName: "HFUT Innovation & Entrepreneurship Question Bank (CF)",
                        version: CURRENT_APP_VERSION,
                        exportDate: new Date().toISOString(),
                        userId: currentUser?.id || 'guest',
                        exportType: 'bundle',
                        scopeSubjectIds: chosenSubjects,
                        scopeMode: isAll ? 'all' : 'partial'
                    },
                    subjects: subjectList.map(s => ({
                        id: s.id,
                        name: s.name,
                        isCustom: !!s.isCustom,
                        shortName: s.shortName || '',
                        icon: s.icon || '',
                        lectures: s.lectures || []
                    })),
                    banks,
                    payload: {
                        brushedIds: Array.from(new Set(scopeSnapshot.brushed)),
                        memorizedIds: Array.from(new Set(scopeSnapshot.memorized)),
                        masteredIds: Array.from(new Set(scopeSnapshot.mastered)),
                        wrongIds: Array.from(new Set(scopeSnapshot.wrong)),
                        history: dedupeAndSortHistory(scopeSnapshot.history)
                    }
                };
                const blob = new Blob([JSON.stringify(bundleData, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `HFUT_Quiz_CF_Bundle_${isAll ? 'all' : chosenSubjects.join('_')}_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setSyncStatus('success');
                setSyncMsg("导出成功");
                return;
            }
            const rawData = {
                header: {
                    appName: "HFUT Innovation & Entrepreneurship Question Bank (CF)",
                    version: CURRENT_APP_VERSION,
                    exportDate: new Date().toISOString(),
                    userId: currentUser?.id || 'guest',
                    exportType: 'raw_bank',
                    scopeSubjectIds: chosenSubjects,
                    scopeMode: isAll ? 'all' : 'partial'
                },
                subjects: subjectList.map(s => ({
                    id: s.id,
                    name: s.name,
                    isCustom: !!s.isCustom,
                    shortName: s.shortName || '',
                    icon: s.icon || ''
                })),
                banks
            };
            const blob = new Blob([JSON.stringify(rawData, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HFUT_Quiz_CF_RawBank_${isAll ? 'all' : chosenSubjects.join('_')}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setSyncStatus('success');
            setSyncMsg("导出成功");
            return;
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
                const exportType = data?.header?.exportType || (data?.banks ? 'raw_bank' : 'progress');
                const fileScopeIds = Array.isArray(data?.header?.scopeSubjectIds)
                    ? data.header.scopeSubjectIds
                    : (data?.header?.scopeSubjectId ? [data.header.scopeSubjectId] : []);
                const subjectMetaMap = new Map();
                (Array.isArray(data?.subjects) ? data.subjects : []).forEach(s => {
                    if (s && s.id) subjectMetaMap.set(s.id, s);
                });
                const idsFromBanks = data?.banks && typeof data.banks === 'object' ? Object.keys(data.banks) : [];
                const idsFromPayload = (() => {
                    const p = data?.payload || data?.progress || {};
                    const allIds = [
                        ...(Array.isArray(p.brushedIds) ? p.brushedIds : []),
                        ...(Array.isArray(p.memorizedIds) ? p.memorizedIds : []),
                        ...(Array.isArray(p.masteredIds) ? p.masteredIds : []),
                        ...(Array.isArray(p.wrongIds) ? p.wrongIds : []),
                        ...((Array.isArray(p.history) ? p.history : []).map(h => h?.questionId).filter(Boolean))
                    ];
                    return Array.from(new Set(allIds.map(id => getQuestionSubjectId(id)).filter(Boolean)));
                })();
                const importScopeIds = Array.from(new Set([
                    ...fileScopeIds,
                    ...idsFromBanks,
                    ...idsFromPayload
                ]));
                const importScopeOptions = importScopeIds.map(id => {
                    const meta = subjectMetaMap.get(id);
                    const local = allSubjects.find(s => s.id === id);
                    return {
                        value: id,
                        label: meta?.name || local?.name || id
                    };
                });
                if (!importScopeOptions.length) {
                    throw new Error("导入文件中未解析到题库范围信息。");
                }
                const chosenSubjects = await openSubjectSelectorModal({
                    title: '导入目标题库',
                    description: '支持单选/多选，只导入到你选中的题库范围',
                    allowMulti: true,
                    options: importScopeOptions,
                    defaultValues: importScopeIds
                });
                if (!chosenSubjects || !chosenSubjects.length) {
                    event.target.value = '';
                    return;
                }
                const importBanks = exportType === 'raw_bank' || exportType === 'bundle' || !!data?.banks;
                if (importBanks && data?.banks && typeof data.banks === 'object') {
                    const importedSubjects = Array.isArray(data.subjects) ? data.subjects : [];
                    const importedCustomSubs = importedSubjects
                        .filter(s => s && s.isCustom && chosenSubjects.includes(s.id))
                        .map(s => {
                            const lectures = Array.isArray(s.lectures) && s.lectures.length
                                ? s.lectures
                                : (data?.banks?.[s.id] ? Object.keys(data.banks[s.id]).map((k, i) => ({ id: Number(k) || (i + 1), name: `章节${k}` })) : []);
                            return toStorableCustomSubject({
                                id: s.id,
                                name: s.name,
                                shortName: s.shortName || s.name,
                                icon: s.icon || '📚',
                                isCustom: true,
                                lectures
                            });
                        });
                    const missingCustomFromBanks = chosenSubjects
                        .filter(id => String(id).startsWith('custom_'))
                        .filter(id => !importedCustomSubs.find(s => s.id === id))
                        .map(id => {
                            const bank = data?.banks?.[id] || {};
                            const lectures = Object.keys(bank).map((k, i) => ({ id: Number(k) || (i + 1), name: `章节${k}` }));
                            return toStorableCustomSubject({
                                id,
                                name: subjectMetaMap.get(id)?.name || id,
                                shortName: subjectMetaMap.get(id)?.shortName || subjectMetaMap.get(id)?.name || id,
                                icon: subjectMetaMap.get(id)?.icon || '📚',
                                isCustom: true,
                                lectures
                            });
                        });
                    const nextImportedCustoms = [...importedCustomSubs, ...missingCustomFromBanks];
                    if (nextImportedCustoms.length) {
                        const mergedCustom = [...customSubjects];
                        nextImportedCustoms.forEach(sub => {
                            const idx = mergedCustom.findIndex(x => x.id === sub.id);
                            if (idx >= 0) mergedCustom[idx] = sub;
                            else mergedCustom.push(sub);
                        });
                        const normalizedMergedCustom = normalizeCustomSubjects(mergedCustom);
                        setCustomSubjects(normalizedMergedCustom);
                        await safeSet('custom_subjects_list', normalizedMergedCustom);
                    }
                    for (const subId of chosenSubjects) {
                        if (data.banks[subId]) {
                            await safeSet(getBankCacheKey(subId), data.banks[subId]);
                            if (subId === selectedSubject) {
                                setAllQuestionBank(data.banks[subId]);
                                setBankStatus('ready');
                            }
                        }
                    }
                }
                const hasProgress = exportType === 'progress' || exportType === 'bundle' || !!data?.payload || !!data?.progress;
                if (!hasProgress) {
                    setSyncStatus('success');
                    setSyncMsg("题库导入完成");
                    alert("题库导入完成，可直接开始刷题。");
                    event.target.value = '';
                    return;
                }
                // 允许一些宽松的格式检查
                const p = data.payload || data.progress || data;
                if (!p.brushedIds && !p.history) {
                    setSyncStatus('success');
                    setSyncMsg("题库导入完成");
                    alert("题库导入完成（该文件不包含答题状态）。");
                    event.target.value = '';
                    return;
                }
                const importedBrushed = filterProgressBySubject(Array.from(normalizeSet(p.brushedIds)), 'all')
                    .filter(id => chosenSubjects.includes(getQuestionSubjectId(id)));
                const importedMemorized = filterProgressBySubject(Array.from(normalizeSet(p.memorizedIds)), 'all')
                    .filter(id => chosenSubjects.includes(getQuestionSubjectId(id)));
                const importedMastered = filterProgressBySubject(Array.from(normalizeSet(p.masteredIds)), 'all')
                    .filter(id => chosenSubjects.includes(getQuestionSubjectId(id)));
                const importedWrong = filterProgressBySubject(Array.from(normalizeSet(p.wrongIds)), 'all')
                    .filter(id => chosenSubjects.includes(getQuestionSubjectId(id)));
                const importedHistory = dedupeAndSortHistory(filterHistoryBySubject(p.history || [], 'all')
                    .filter(h => chosenSubjects.includes(getQuestionSubjectId(h.questionId))));
                const confirmMerge = window.confirm("发现有效数据。点击'确定'将新数据与当前进度【合并】，点击'取消'则【覆盖】当前进度。");
                if (confirmMerge) {
                    setBrushedIds(prev => new Set([...prev, ...importedBrushed]));
                    setMemorizedIds(prev => new Set([...prev, ...importedMemorized]));
                    setMasteredIds(prev => new Set([...prev, ...importedMastered]));
                    setWrongIds(prev => new Set([...prev, ...importedWrong]));
                    setHistory(prev => {
                        const combined = [...importedHistory, ...prev];
                        return dedupeAndSortHistory(combined);
                    });
                } else {
                    if (window.confirm("❗ 警告：完全覆盖将清空当前所有本地进度及历史，确定继续吗？")) {
                        if (chosenSubjects.length === allSubjects.length) {
                            setBrushedIds(new Set(importedBrushed));
                            setMemorizedIds(new Set(importedMemorized));
                            setMasteredIds(new Set(importedMastered));
                            setWrongIds(new Set(importedWrong));
                            setHistory(dedupeAndSortHistory(importedHistory));
                        } else {
                            setBrushedIds(prev => new Set([
                                ...filterProgressBySubject(Array.from(prev), 'all').filter(id => !chosenSubjects.includes(getQuestionSubjectId(id))),
                                ...importedBrushed
                            ]));
                            setMemorizedIds(prev => new Set([
                                ...filterProgressBySubject(Array.from(prev), 'all').filter(id => !chosenSubjects.includes(getQuestionSubjectId(id))),
                                ...importedMemorized
                            ]));
                            setMasteredIds(prev => new Set([
                                ...filterProgressBySubject(Array.from(prev), 'all').filter(id => !chosenSubjects.includes(getQuestionSubjectId(id))),
                                ...importedMastered
                            ]));
                            setWrongIds(prev => new Set([
                                ...filterProgressBySubject(Array.from(prev), 'all').filter(id => !chosenSubjects.includes(getQuestionSubjectId(id))),
                                ...importedWrong
                            ]));
                            setHistory(prev => {
                                const remained = prev.filter(h => !h?.questionId || !chosenSubjects.includes(getQuestionSubjectId(h.questionId)));
                                return dedupeAndSortHistory([...remained, ...importedHistory]);
                            });
                        }
                    } else {
                        event.target.value = '';
                        return;
                    }
                }
                setSyncStatus('success');
                setSyncMsg("导入完成");
                if (importBanks) {
                    alert("导入完成：题库与答题状态均已处理，可直接使用。");
                }
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
    const performReset = () => {
        setBrushedIds(new Set());
        setMemorizedIds(new Set());
        setMasteredIds(new Set());
        setWrongIds(new Set());
        setHistory([]);
        setLastSession(null);
        
        // 同时物理清理 IndexedDB (localforage) 与 localStorage 的进度缓存，确保重置彻底干净
        localforage.removeItem('app_brushedIds').catch(console.warn);
        localforage.removeItem('app_memorizedIds').catch(console.warn);
        localforage.removeItem('app_masteredIds').catch(console.warn);
        localforage.removeItem('app_wrongIds').catch(console.warn);
        localforage.removeItem('app_history').catch(console.warn);
        localforage.removeItem('app_lastSession').catch(console.warn);

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
        setCurrentIndex(0);
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
        setSelectedByQuestion({});
        startMode(mode);
    };
    const resumeLastSession = () => {
        if (!lastSession) return;
        setQuestions(lastSession.questions);
        setCurrentIndex(lastSession.currentIndex);
        setQuizConfig(lastSession.mode);
        startMode(lastSession.mode);
        const restoredAnswers = lastSession.answerResults || {};
        const restoredSelections = lastSession.selectedByQuestion || {};
        setAnswerResults(restoredAnswers);
        setSelectedByQuestion(restoredSelections);
        const currentQ = lastSession.questions?.[lastSession.currentIndex];
        const currentQid = currentQ?.id;
        const currentSelection = currentQid ? (restoredSelections[currentQid] || []) : [];
        const answered = currentQid ? Object.prototype.hasOwnProperty.call(restoredAnswers, currentQid) : false;
        setSelectedIndices(currentSelection);
        setIsAnswered(answered);
        setShowExplanation(answered);
    };
    const startMistakeNotebook = () => {
        if (bankStatus !== 'ready') return;
        setCurrentIndex(0);
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
        setSelectedByQuestion({});
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
        setCurrentIndex(0);
        setLastSession(null);
        setQuestions([...searchResults]);
        setAnswerResults({});
        setSelectedByQuestion({});
        startMode('quiz');
        setShowSearchResults(false);
    };
    // ✅ 改动：提交问题结果 (推入缓冲池)
    const submitQuestionResult = async (questionId, isCorrect, questionTitle, category, userAnswer = '') => {
        if (questionId && questionId.startsWith('custom_')) return; // 自定义离线题库不提交结果
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
    const getQuestionDetails = (questionId) => {
        for (const lectureId in allQuestionBank) {
            const questions = allQuestionBank[lectureId];
            const question = questions.find(q => q.id === questionId);
            if (question) return question;
        }
        return null;
    };
    // ✅ 改动：加载排行榜 (仅官方题库可用)
    const loadWrongQuestionRanking = async (subjectId = selectedSubject) => {
        if (!subjectId || subjectId.startsWith('custom_')) {
            setWrongQuestionRanking([]);
            return;
        }
        try {
            const result = await api.request(`/getWrongQuestionRanking?limit=${LEADERBOARD_LIMIT}&subject=${subjectId}`);
            if (result && Array.isArray(result.ranking)) {
                const parsedRanking = result.ranking.map(item => ({
                    ...item,
                    questionId: item.questionId
                }));
                setWrongQuestionRanking(parsedRanking);
            }
        } catch (e) {
            console.error('加载错题排行榜失败:', e);
        }
    };
    const openRankingQuestion = (rankItem) => {
        const questionDetail = getQuestionDetails(rankItem.questionId);
        if (questionDetail) {
            setViewingRankQuestion({...questionDetail, rankInfo: rankItem});
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
        if (!currentUser || isCustomQuestionId(questionId)) return;
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
        if (!questionId || !currentUser || isCustomQuestionId(questionId)) return;
        if (!userExplanations[questionId]) loadUserExplanations(questionId);
    };
    const submitLocalNote = (questionId) => {
        const content = String(newComment || '').trim();
        if (!questionId || !content) return;
        const note = {
            id: Date.now(),
            content,
            createdAt: new Date().toISOString(),
            author: '本地备注'
        };
        setCustomNotes(prev => ({
            ...prev,
            [questionId]: [note, ...(Array.isArray(prev[questionId]) ? prev[questionId] : [])]
        }));
        setNewComment('');
        setSyncStatus('success');
        setSyncMsg('备注已保存（本地）');
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
    const normalizeAnswerIndices = (value) => {
        if (Array.isArray(value)) {
            return value.map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0);
        }
        if (value instanceof Set) {
            return Array.from(value).map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0);
        }
        if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
            return [value];
        }
        if (typeof value === 'string') {
            const letters = value.toUpperCase().match(/[A-E]/g);
            if (letters?.length) {
                return letters.map(ch => ch.charCodeAt(0) - 65);
            }
            const nums = value.split(/[^0-9]+/).map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0);
            return nums;
        }
        return [];
    };
    // ✅ 优化版：提交答案 (移除冗余加载逻辑)
    const submitAnswer = (finalSelection = selectedIndices) => {
        const normalizedSelection = normalizeAnswerIndices(finalSelection);
        if (normalizedSelection.length === 0) return;
        const currentQ = questions[currentIndex];
        // 1. 判定对错
        const correctSet = new Set(normalizeAnswerIndices(currentQ.rawAnswer));
        const userSet = new Set(normalizedSelection);
        const isCorrect = correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x));
        const answerText = [...normalizedSelection]
            .sort((a, b) => a - b)
            .map(i => ['A', 'B', 'C', 'D', 'E'][i])
            .join('');
        // 2. 更新基础交互状态
        setIsAnswered(true);
        setSelectedIndices(normalizedSelection);
        setSelectedByQuestion(prev => ({...prev, [currentQ.id]: normalizedSelection}));
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
            setSelectedByQuestion({});
            setIsAnswered(false);
            setShowExplanation(false);
        }
    };
    const changeQuestion = (idx) => {
        const q = questions[idx];
        const qid = q?.id;
        const restored = qid ? (selectedByQuestion[qid] || []) : [];
        const answered = qid ? Object.prototype.hasOwnProperty.call(answerResults, qid) : false;
        setCurrentIndex(idx);
        setSelectedIndices(restored);
        setIsAnswered(answered);
        setShowExplanation(answered);
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
            setLastSession({
                mode: currentMode,
                questions,
                currentIndex,
                quizConfig,
                answerResults,
                selectedByQuestion
            });
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
        <>
            <SubjectSelector
                allSubjects={allSubjects}
                showUploadModal={showUploadModal}
                setShowUploadModal={setShowUploadModal}
                showAiModal={showAiModal}
                setShowAiModal={setShowAiModal}
                showApiSettingsModal={showApiSettingsModal}
                setShowApiSettingsModal={setShowApiSettingsModal}
                setSelectedSubject={setSelectedSubject}
                setBankStatus={setBankStatus}
                setAllQuestionBank={setAllQuestionBank}
                handleDeleteCustomSubject={handleDeleteCustomSubject}
                customSubjects={customSubjects}
                setCustomSubjects={setCustomSubjects}
                safeSet={safeSet}
                getBankCacheKey={getBankCacheKey}
                currentUser={currentUser}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                syncStatus={syncStatus}
                onManualSync={() => handleManualSync()}
                onManualRestore={() => handleManualRestore()}
                onExport={handleExportProgress}
                onImport={handleImportProgress}
                onRequireLogin={() => setShowLoginScreen(true)}
                onLogout={() => {
                    api.logout();
                    setCurrentUser(null);
                    setShowLoginScreen(false);
                }}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                onlineCount={onlineCount}
            />
            {renderSubjectSelectionModal()}
        </>
    );
    const renderDashboard = () => (
        <DashboardPage
            header={
                <DashboardHeader
                    currentSubject={currentSubject}
                    currentUser={currentUser}
                    syncMsg={syncMsg}
                    syncStatus={syncStatus}
                    themeMode={themeMode}
                    setThemeMode={setThemeMode}
                    onSwitchSubject={switchSubject}
                    onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
                />
            }
            searchPanel={
                <DashboardSearchPanel
                    open={isSearchOpen}
                    searchSectionRef={searchSectionRef}
                    searchKeyword={searchKeyword}
                    setSearchKeyword={setSearchKeyword}
                    searchFilters={searchFilters}
                    setSearchFilters={setSearchFilters}
                    chapterOptions={getSubjectChapterOptions(currentSubject)}
                    performSearch={performSearch}
                    searchResults={searchResults}
                    showSearchResults={showSearchResults}
                    setSearchResults={setSearchResults}
                    setShowSearchResults={setShowSearchResults}
                    openSearchQuestion={openSearchQuestion}
                    setIsSearchOpen={setIsSearchOpen}
                />
            }
            resetModal={
                <ResetConfirmModal
                    open={showResetModal}
                    currentUser={currentUser}
                    onCancel={() => setShowResetModal(false)}
                    onConfirm={performReset}
                />
            }
            updateModal={
                <UpdateNoticeModal
                    open={showUpdateModal}
                    currentVersion={CURRENT_APP_VERSION}
                    remoteVersionInfo={remoteVersionInfo}
                    onReload={() => window.location.reload()}
                    onClose={() => setShowUpdateModal(false)}
                />
            }
        >
            <DashboardMainContentShell>
                    {/* 左侧主内容 */}
                    <div className="lg:col-span-8 space-y-6">
                        <div
                            className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-200 p-5 md:p-8 relative overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                            <div
                                className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl dark:bg-blue-950/20"/>
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-950/40 dark:text-blue-400"><Settings size={20}/>
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg md:text-xl text-slate-800 dark:text-slate-100">开始新的练习</h2>
                                        <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500">自定义你的刷题计划</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="md:col-span-2">
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1 dark:text-slate-500">题库章节</label>
                                        <select value={quizConfig.lectureId} onChange={e => setQuizConfig({
                                            ...quizConfig,
                                            lectureId: Number(e.target.value)
                                        })}
                                                className="w-full p-3 md:p-4 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm md:text-base font-medium focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-100 appearance-none dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                                            <option value={0}>📚 综合练习 (所有章节)</option>
                                            {getSubjectChapterOptions(currentSubject).map(l => <option key={l.id}
                                                                         value={l.id}>{l.name} ({allQuestionBank[l.id]?.length || 0}题)</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1 dark:text-slate-500">题目数量</label>
                                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-1.5 rounded-2xl dark:bg-slate-950">
                                            {[10, 20, 50, 'all'].map(n => (
                                                <button key={n}
                                                        onClick={() => setQuizConfig({...quizConfig, count: n})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.count === n ? 'bg-white shadow text-blue-600 dark:bg-slate-900 dark:text-blue-400 dark:shadow-indigo-950/45' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>{n === 'all' ? '全部' : n}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1 dark:text-slate-500">题目类型</label>
                                        <div
                                            className="grid grid-cols-3 md:grid-cols-6 gap-2 bg-slate-50 p-1.5 rounded-2xl dark:bg-slate-950">
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
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.type === t.v ? 'bg-white shadow text-blue-600 dark:bg-slate-900 dark:text-blue-400 dark:shadow-indigo-950/45' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>{t.l}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1 dark:text-slate-500">模式</label>
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl dark:bg-slate-950">
                                            {[{v: 'all', l: '随机'}, {v: 'new', l: '未做'}, {
                                                v: 'wrong',
                                                l: '错题'
                                            }].map(m => (
                                                <button key={m.v}
                                                        onClick={() => setQuizConfig({...quizConfig, filter: m.v})}
                                                        className={`py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${quizConfig.filter === m.v ? 'bg-white shadow text-blue-600 dark:bg-slate-900 dark:text-blue-400 dark:shadow-indigo-950/45' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>{m.l}</button>
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
                                            className="py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base inline-flex items-center justify-center gap-2 dark:shadow-indigo-900/10">
                                        {bankStatus === 'ready' ? <><Brain size={20}/> 开始刷题</> : <><Loader2
                                            size={20} className="animate-spin"/> {bankProgress}</>}
                                    </button>
                                    <button onClick={() => {
                                        setCurrentIndex(0);
                                        generateAndStartQuiz('memorize');
                                    }}
                                            disabled={bankStatus !== 'ready'}
                                            className="py-3 md:py-4 bg-white border-2 border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-base dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:border-indigo-900">
                                        <BookOpen size={20}/> 背题模式
                                    </button>
                                </div>
                                {bankStatus === 'loading' && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{bankProgress}</span>
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{bankPercent}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${bankPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {bankStatus === 'ready' && (
                                    <div className="text-center">
                                        <button onClick={forceUpdateBank}
                                                className="text-xs text-slate-300 hover:text-blue-500 underline decoration-dotted dark:text-slate-600 dark:hover:text-blue-400">发现题库旧?
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
                                    color: 'text-slate-600 dark:text-slate-300',
                                    bg: 'bg-slate-100 dark:bg-slate-800'
                                },
                                {
                                    label: '已掌握',
                                    val: currentMasteredIds.size,
                                    icon: CheckCircle,
                                    color: 'text-green-600 dark:text-green-400',
                                    bg: 'bg-green-50 dark:bg-green-950/30'
                                },
                                {
                                    label: '已背诵',
                                    val: currentMemorizedIds.size,
                                    icon: Eye,
                                    color: 'text-purple-600 dark:text-purple-400',
                                    bg: 'bg-purple-50 dark:bg-purple-950/30'
                                },
                                {
                                    label: '正确率',
                                    val: currentBrushedIds.size ? Math.round(currentMasteredIds.size / currentBrushedIds.size * 100) + '%' : '-',
                                    icon: BarChart3,
                                    color: 'text-orange-600 dark:text-orange-400',
                                    bg: 'bg-orange-50 dark:bg-orange-950/30'
                                }
                            ].map((item, i) => (
                                <div key={i}
                                     className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm transition-transform duration-300 ease-in-out dark:bg-slate-900 dark:border-slate-800">
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                                        <item.icon size={20}/>
                                    </div>
                                    <div>
                                        <div
                                            className="text-xl md:text-2xl font-bold text-slate-800 leading-none mb-1 dark:text-slate-100">{item.val}</div>
                                        <span
                                            className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500">{item.label}</span>
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
                        <div className={`grid ${currentSubject?.isCustom ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
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
                            
                            {!currentSubject?.isCustom && (
                                <div onClick={() => {
                                    setCurrentMode('ranking');
                                    loadWrongQuestionRanking();
                                }}
                                     className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] shadow-lg shadow-orange-200 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-300 ease-in-out will-change-transform relative overflow-hidden group">
                                    <div
                                        className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
                                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                                <TrendingUp size={20}/>
                                            </div>
                                            <span className="font-mono text-3xl font-bold opacity-90">📊</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold mb-0.5">易错题排行</h3>
                                            <p className="text-orange-100 text-xs opacity-90">查看全站最易错的题目</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <a href={`/#/report?subject=${selectedSubject}`}
                           className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 transition-transform duration-300 ease-in-out will-change-transform flex flex-col no-underline group flex-1 min-h-0 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-blue-900/60">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-950/40 dark:text-blue-400"><PieChart size={20}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-base text-slate-800 dark:text-slate-100">数据报表</div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500">近7天学习趋势</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mb-4">
                                <div
                                    className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100 flex flex-col justify-center dark:bg-slate-950 dark:border-slate-850">
                                    <div className="text-[10px] text-slate-400 mb-1 uppercase font-bold dark:text-slate-500">累计已刷
                                    </div>
                                    <div
                                        className="font-bold text-xl text-slate-700 leading-none dark:text-slate-200">{currentBrushedIds.size}</div>
                                </div>
                                <div
                                    className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100 flex flex-col justify-center dark:bg-green-950/10 dark:border-green-900/20">
                                    <div className="text-[10px] text-green-600/70 mb-1 uppercase font-bold dark:text-green-500">已掌握
                                    </div>
                                    <div
                                        className="font-bold text-xl text-green-600 leading-none dark:text-green-400">{currentMasteredIds.size}</div>
                                </div>
                            </div>
                            <div
                                className="flex items-end justify-between gap-2 border-t border-slate-50 pt-4 flex-1 min-h-[80px] dark:border-slate-800">
                                {weeklyStats.data.map((day, idx) => {
                                    const rawPercent = (day.count / weeklyStats.max) * 100;
                                    const heightPercent = day.count === 0 ? 8 : Math.max(15, rawPercent);
                                    return (
                                        <div key={idx}
                                             className="flex-1 h-full flex flex-col justify-end items-center gap-1 group/bar">
                                            <div className="w-full flex items-end justify-center relative flex-1">
                                                {day.count > 0 && (
                                                    <div
                                                        className="absolute -top-7 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-1.5 rounded mb-1 whitespace-nowrap z-10 pointer-events-none dark:bg-slate-950 dark:border dark:border-slate-800">
                                                        {day.count}题
                                                    </div>
                                                )}
                                                <div style={{height: `${heightPercent}%`}}
                                                     className={`w-3 md:w-3.5 rounded-t-[4px] transition-all duration-500 ease-out relative ${day.isToday ? 'bg-gradient-to-t from-blue-500 to-indigo-400 shadow-lg shadow-blue-200 dark:from-blue-600 dark:to-indigo-500 dark:shadow-indigo-900/20' : (day.count > 0 ? 'bg-blue-200 group-hover/bar:bg-blue-400 dark:bg-blue-950/60 dark:group-hover/bar:bg-blue-800' : 'bg-slate-100 dark:bg-slate-800')}`}></div>
                                            </div>
                                            <div
                                                className={`text-[10px] ${day.isToday ? 'font-bold text-blue-600 dark:text-blue-450' : 'text-slate-300 dark:text-slate-500'}`}>{day.date}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </a>
                    </div>
            </DashboardMainContentShell>
        </DashboardPage>)
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
            const count = currentHistory.filter(h => {
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
        if (!currentQ) {
            return <div className="h-screen flex items-center justify-center text-slate-400">题目索引异常，请返回重试</div>;
        }
        const isQuiz = currentMode !== 'memorize';
        const showContent = !isQuiz || showExplanation;
        return (
            <div className="h-screen flex flex-col md:flex-row bg-slate-100 dark:bg-slate-900">
                <QuizSidebar
                    questions={questions}
                    currentIndex={currentIndex}
                    answerResults={answerResults}
                    currentMode={currentMode}
                    isQuiz={isQuiz}
                    isFullscreen={isFullscreen}
                    onExit={exitToDashboard}
                    onToggleFullscreen={toggleFullscreen}
                    onChangeQuestion={changeQuestion}
                />
                <div className="flex-1 flex flex-col h-screen relative">
                    <QuizMobileTopBar
                        currentIndex={currentIndex}
                        total={questions.length}
                        isFullscreen={isFullscreen}
                        onExit={exitToDashboard}
                        onToggleFullscreen={toggleFullscreen}
                    />
                    <div
                        className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 flex justify-center pb-20 mobile-safe-bottom">
                        <div className="w-full max-w-5xl space-y-6 md:space-y-8">
                            <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-start">
                                <QuizQuestionPanel
                                    currentQ={currentQ}
                                    isQuiz={isQuiz}
                                    isAnswered={isAnswered}
                                    selectedIndices={selectedIndices}
                                    onOptionClick={handleOptionClick}
                                    onSubmit={submitAnswer}
                                />
                                <QuizNavControls
                                    currentIndex={currentIndex}
                                    total={questions.length}
                                    isQuiz={isQuiz}
                                    onPrev={prevQuestion}
                                    onNext={nextQuestion}
                                    onMemorizeNext={handleMemorizeCheck}
                                />
                            </div>
                            {showContent && (
                                <QuizDiscussionPanel
                                    currentQ={currentQ}
                                    isCustomSubject={String(currentQ?.id || '').startsWith('custom_')}
                                    questionThread={questionThread}
                                    customNotes={customNotes}
                                    renderUserExplanations={renderUserExplanations}
                                    showExplanationForm={showExplanationForm}
                                    setShowExplanationForm={setShowExplanationForm}
                                    newExplanation={newExplanation}
                                    setNewExplanation={setNewExplanation}
                                    submitUserExplanation={submitUserExplanation}
                                    commentSectionRef={commentSectionRef}
                                    newComment={newComment}
                                    setNewComment={setNewComment}
                                    submitComment={submitComment}
                                    submitLocalNote={submitLocalNote}
                                    currentUser={currentUser}
                                    editingCommentId={editingCommentId}
                                    editingCommentContent={editingCommentContent}
                                    setEditingCommentId={setEditingCommentId}
                                    setEditingCommentContent={setEditingCommentContent}
                                    handleUpdateComment={handleUpdateComment}
                                    handleStartEditComment={handleStartEditComment}
                                    handleDeleteComment={handleDeleteComment}
                                    handleLikeComment={handleLikeComment}
                                    formatDate={formatDate}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    };
    // --- 登录界面 (适配 Cloudflare API) ---
    const renderLoginScreen = () => (
        <LoginScreen
            brushedCount={brushedIds.size}
            username={username}
            password={password}
            authLoading={authLoading}
            authError={authError}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={async (e) => {
                e.preventDefault();
                setAuthLoading(true);
                setAuthError(null);
                try {
                    const user = await api.login(username, password);
                    setCurrentUser(user);
                    setShowLoginScreen(false);
                    setAuthLoading(false);
                } catch (err) {
                    setAuthError(err.message || '登录失败');
                    setAuthLoading(false);
                }
            }}
        />
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
    const renderQuestionDetailModal = () => (
        <QuestionDetailModal
            viewingRankQuestion={viewingRankQuestion}
            onClose={() => setViewingRankQuestion(null)}
            renderUserExplanations={renderUserExplanations}
        />
    );
    // --- 排行榜页面 ---
    const renderRankingPage = () => (
        <RankingPage
            wrongQuestionRanking={wrongQuestionRanking}
            onBack={() => setCurrentMode('dashboard')}
            onRefresh={() => {
                setWrongQuestionRanking([]);
                loadWrongQuestionRanking();
            }}
            onOpenQuestion={openRankingQuestion}
        />
    );
    const renderSubjectSelectionModal = () => {
        if (!selectorModal.open) return null;
        const selectedSet = new Set(selectorModal.selectedValues || []);
        const toggleValue = (value) => {
            setSelectorModal(prev => {
                const current = new Set(prev.selectedValues || []);
                if (prev.allowMulti) {
                    if (current.has(value)) current.delete(value);
                    else current.add(value);
                    return {...prev, selectedValues: Array.from(current)};
                }
                return {...prev, selectedValues: [value]};
            });
        };
        const selectAll = () => {
            setSelectorModal(prev => ({...prev, selectedValues: prev.options.map(o => o.value)}));
        };
        const clearAll = () => setSelectorModal(prev => ({...prev, selectedValues: []}));
        return (
            <div className="fixed inset-0 z-[120] bg-slate-900/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[82vh] flex flex-col">
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">{selectorModal.title}</h3>
                        {selectorModal.description && (
                            <p className="text-xs sm:text-sm mt-1 text-slate-500 dark:text-slate-400">{selectorModal.description}</p>
                        )}
                    </div>
                    <div className="px-4 sm:px-5 pt-3 flex items-center justify-between">
                        {selectorModal.allowMulti ? (
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">全选</button>
                                <button onClick={clearAll} className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">清空</button>
                            </div>
                        ) : <div />}
                        <div className="text-xs text-slate-400 dark:text-slate-500">已选 {selectedSet.size}</div>
                    </div>
                    <div className="p-4 sm:p-5 overflow-y-auto space-y-2">
                        {selectorModal.options.map(opt => {
                            const active = selectedSet.has(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleValue(opt.value)}
                                    className={`w-full text-left px-3.5 py-3 rounded-xl border text-sm font-medium transition ${active ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                        <button onClick={() => closeSubjectSelectorModal(null)} className="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold dark:bg-slate-800 dark:text-slate-200">取消</button>
                        <button onClick={() => closeSubjectSelectorModal(Array.from(selectedSet))} className="py-2.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60" disabled={selectedSet.size === 0}>确定</button>
                    </div>
                </div>
            </div>
        );
    };
    if (!currentUser && showLoginScreen) return renderLoginScreen();
    const hasActiveQuizSession = ['quiz', 'memorize', 'mistakes'].includes(currentMode) && questions.length > 0;
    if (!selectedSubject && !hasActiveQuizSession) return renderSubjectSelector();
    return (
        <div className="h-full font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {currentMode === 'dashboard' && renderDashboard()}
            {['quiz', 'memorize', 'mistakes'].includes(currentMode) && renderCard()}
            {currentMode === 'ranking' && renderRankingPage()}
            {viewingRankQuestion && renderQuestionDetailModal()}
            {renderSubjectSelectionModal()}
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
