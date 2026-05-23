/* eslint-disable no-unused-vars, no-empty */
import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api'; // ✅ 引入 API 适配器
import * as XLSX from 'xlsx';
import localforage from 'localforage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronLeft, Calendar, CheckCircle, XCircle, Clock, ArrowRight, BookOpen,
  Zap, AlertCircle, Eye, X, MessageCircle, RefreshCw
} from 'lucide-react';
import './index.css';

// ✅ 静态题库配置
const LECTURES = [
  { id: 1, name: '第一讲：创新创业概述', file: '创新创业基础第一讲习题.xlsx' },
  { id: 2, name: '第二讲：创新思维与方法', file: '创新创业基础第二讲习题.xlsx' },
  { id: 3, name: '第三讲：机会与风险识别', file: '创新创业基础第三讲习题.xlsx' },
  { id: 4, name: '第四讲：团队与资源整合', file: '创新创业基础第四讲习题.xlsx' },
  { id: 5, name: '第五讲：商业模式与计划', file: '创新创业基础第五讲习题.xlsx' },
  { id: 6, name: '第六讲：融资与企业设立', file: '创新创业基础第六讲习题.xlsx' },
  { id: 7, name: '第七讲：新企业成长管理', file: '创新创业基础第七讲习题.xlsx' },
];

const MAOGAI_CHAPTERS = [
  { id: 1, name: '导论' },
  { id: 2, name: '第一章' },
  { id: 3, name: '第二章' },
  { id: 4, name: '第三章' },
  { id: 5, name: '第四章' },
  { id: 6, name: '第五章' },
  { id: 7, name: '第六章' },
  { id: 8, name: '第七章' },
  { id: 9, name: '第八章' }
];

const SUBJECTS = [
  { id: 'innovation', name: '创新创业', icon: '🚀' },
  { id: 'maogai', name: '毛概', icon: '📖' },
  { id: 'hgdmy-maogai', name: '马院毛概', icon: '📖' }
];

const safeText = (v) => typeof v === 'string' ? v : (v ? String(v) : '');

// 新旧题目 ID 偏移投影转换器，将历史老ID MG-188440+ 智能向后投射为 MG-1+ 新ID，彻底激活数据报表
const normalizeQuestionId = (id) => {
  if (!id) return id;
  const s = String(id).trim();
  if (s.startsWith('MG-') || s.startsWith('MG')) {
    const numStr = s.startsWith('MG-') ? s.substring(3) : s.substring(2);
    const num = parseInt(numStr);
    if (!isNaN(num)) {
      if (num > 188439) {
        return `MG-${num - 188439}`;
      } else {
        return `MG-${num}`;
      }
    }
  }
  const num = parseInt(s);
  if (!isNaN(num) && /^\d+$/.test(s)) {
    if (num > 188439) {
      return `MG-${num - 188439}`;
    } else {
      return `MG-${num}`;
    }
  }
  return id;
};

// 组件：Markdown 渲染
const Markdown = ({ content }) => (
  <div className="prose prose-sm max-w-none text-slate-800">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{safeText(content)}</ReactMarkdown>
  </div>
);

// 🕒 时间格式化工具：强制将数据库时间视为 UTC 并转为本地时间
const formatDate = (isoString) => {
  if (!isoString) return '未知时间';
  let dateStr = String(isoString);
  if (!dateStr.includes('T') && !dateStr.includes('Z')) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // 24小时制
  });
};

// 工具：本地加载 Excel (抛弃外部 GitHub 和云存储链接，极速秒开)
const fetchLectureArrayBuffer = async (lecture) => {
  const url = `/${encodeURIComponent(lecture.file)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

// 工具：解析 Excel
const parseExcelData = (rows, lectureId) => {
  const clean = rows.filter(r => r && r.length > 0);
  if (!clean.length) return [];
  const hasHeader = JSON.stringify(clean[0]).includes('题型');
  const start = hasHeader ? 1 : 0;
  const list = [];
  for (let i = start; i < clean.length; i++) {
    const r = clean[i];
    const content = safeText(r[1]).trim();
    if (!content) continue;
    const type = String(r[0] || '').includes('多选') ? 'multiple' : (String(r[0] || '').includes('判断') ? 'judgment' : 'single');
    const ansRaw = safeText(r[2]).toUpperCase();
    let correct = [];
    let options = [];
    if (type === 'judgment') {
      correct = /^[对T]/.test(ansRaw) ? [0] : [1];
      options = ['正确', '错误'];
    } else {
      options = [r[6], r[7], r[8], r[9], r[10]].filter(Boolean).map(safeText);
      for (const c of ansRaw) {
        const idx = c.charCodeAt(0) - 65;
        if (idx >= 0 && idx < options.length) correct.push(idx);
      }
    }
    list.push({
      id: `L${lectureId}-${i}`,
      type,
      question: content,
      options,
      rawAnswer: correct.sort(),
      explanation: safeText(r[3] || '暂无解析'),
      category: LECTURES.find(l => l.id === lectureId)?.name || ''
    });
  }
  return list;
};

// 工具：解析毛概 JSON (与 App.jsx 保持高度一致，智能题型识别 + 章节容灾)
const parseMaogaiJson = (data) => {
  const chapters = {};
  for (let i = 1; i <= 9; i++) chapters[String(i)] = [];

  const srcToChId = {};
  srcToChId['0（题库更新时间:2025-5-6）'] = 1;
  for (let i = 1; i <= 8; i++) srcToChId[String(i)] = i + 1;

  for (const q of data) {
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
      question: String(q['题干'] || '').trim(),
      options,
      rawAnswer,
      explanation: String(q['解析'] || '暂无解析').trim(),
      category: MAOGAI_CHAPTERS.find(c => c.id === chId)?.name || `第${chId}章`
    });
  }
  return chapters;
};

const parseHgdmyMaogaiJson = (data) => {
    const questions = data?.questions || data || [];
    if (!Array.isArray(questions)) return { '1': [] };

    const chapterId = '1';
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

function Report() {
  const [ready, setReady] = useState(false);
  const [customSubjects, setCustomSubjects] = useState([]);
  const allSubjects = useMemo(() => [...SUBJECTS, ...customSubjects], [customSubjects]);
  const [customBanks, setCustomBanks] = useState({}); // { [subjectId]: bankData }
  
  const [selectedSubject, setSelectedSubject] = useState(() => {
    // 从 URL hash 参数读取来源学科，实现从哪个学科进入就默认展示哪个学科的报表
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    if (queryIndex !== -1) {
      const searchParams = new URLSearchParams(hash.substring(queryIndex));
      const sub = searchParams.get('subject');
      if (sub) return sub;
    }
    return 'innovation';
  });
  const [data, setData] = useState(null);
  
  // 两个学科独立的题库状态，实现全局题库秒加载与高速查询
  const [innovationBank, setInnovationBank] = useState({});
  const [maogaiBank, setMaogaiBank] = useState({});
  const [hgdmyMaogaiBank, setHgdmyMaogaiBank] = useState({});
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [gateReason, setGateReason] = useState('');

  // 评论与解析相关
  const [userExplanations, setUserExplanations] = useState({}); 
  const [editingExpId, setEditingExpId] = useState(null);
  const [editingExpContent, setEditingExpContent] = useState('');

  const [localProgress, setLocalProgress] = useState({ history: [], brushedIds: [], masteredIds: [] });

  // 个人中心数据 (我的评论与我的解析)
  const [userComments, setUserComments] = useState([]);
  const [userExplList, setUserExplList] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // UI 状态
  const [showModal, setShowModal] = useState(null); // 'comments' or 'explanations'
  const [commentPage, setCommentPage] = useState(1);
  const [explanationPage, setExplanationPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 初始化加载：并行极速抓取云端与本地缓存
  useEffect(() => {
    const init = async () => {
      const user = api.getCurrentUser();
      if (!user) { setGateReason('尚未登录，请先登录后查看报表'); return; }

      // 1. 获取云端进度
      try {
        const res = await api.request('/userProgress');
        if (res && res.found && res.progress) {
          setData(res.progress);
        }
      } catch (e) { console.error('Data fetch error', e); }

      // 2. 加载创新创业题库 (带 localforage 缓存 + 同源 public 并行极速抓取)
      try {
        const cached = await localforage.getItem('hf_bank_v2');
        if (cached && Object.keys(cached).length > 0) {
          setInnovationBank(cached);
        } else {
          const newBank = {};
          await Promise.all(LECTURES.map(async (lecture) => {
            try {
              const buf = await fetchLectureArrayBuffer(lecture);
              const wb = XLSX.read(buf, { type: 'array' });
              const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
              newBank[lecture.id] = parseExcelData(raw, lecture.id);
            } catch (e) { console.warn('Innovation bank load error', lecture.file, e); }
          }));
          setInnovationBank(newBank);
          await localforage.setItem('hf_bank_v2', newBank);
        }
      } catch (e) { console.warn('Innovation bank load error', e); }

      // 3. 加载毛概题库 (带 localforage 缓存 + 同源 JSON 抓取)
      try {
        const cachedM = await localforage.getItem('hf_bank_maogai_v3');
        if (cachedM && Object.keys(cachedM).length > 0) {
          setMaogaiBank(cachedM);
        } else {
          const res = await fetch('/maogai_full.json');
          if (res.ok) {
            const rawJson = await res.json();
            const parsed = parseMaogaiJson(rawJson);
            setMaogaiBank(parsed);
            await localforage.setItem('hf_bank_maogai_v3', parsed);
          }
        }
      } catch (e) { console.warn('Maogai bank load error', e); }

      // 3.5 加载马院毛概题库
      try {
        const cachedH = await localforage.getItem('hf_bank_hgdmy_maogai');
        if (cachedH && Object.keys(cachedH).length > 0) {
          setHgdmyMaogaiBank(cachedH);
        } else {
          const res = await fetch('/hgdmy-maogai.json');
          if (res.ok) {
            const rawJson = await res.json();
            const parsed = parseHgdmyMaogaiJson(rawJson);
            setHgdmyMaogaiBank(parsed);
            await localforage.setItem('hf_bank_hgdmy_maogai', parsed);
          }
        }
      } catch (e) { console.warn('Hgdmy maogai bank load error', e); }

      // 3.8 加载自定义学科列表与本地自定义题库
      try {
        const cSubs = await localforage.getItem('custom_subjects_list') || [];
        setCustomSubjects(cSubs);
        const cBanks = {};
        if (Array.isArray(cSubs)) {
          await Promise.all(cSubs.map(async (sub) => {
            try {
              const cachedBank = await localforage.getItem(`hf_question_bank_${sub.id}`);
              if (cachedBank && Object.keys(cachedBank).length > 0) {
                cBanks[sub.id] = cachedBank;
              }
            } catch (e) { console.warn('Load custom bank fail', sub.id, e); }
          }));
        }
        setCustomBanks(cBanks);
      } catch (e) { console.warn('Load custom subjects fail', e); }

      // 4. 加载本地进度
      try {
        const [localHist, localBrushed, localMastered] = await Promise.all([
          localforage.getItem('app_history').catch(() => []),
          localforage.getItem('app_brushedIds').catch(() => []),
          localforage.getItem('app_masteredIds').catch(() => []),
        ]);
        setLocalProgress({
          history: Array.isArray(localHist) ? localHist : [],
          brushedIds: Array.isArray(localBrushed) ? localBrushed : [],
          masteredIds: Array.isArray(localMastered) ? localMastered : [],
        });
      } catch (e) { console.warn('Load local progress fail', e); }
      
      setReady(true);

      // 5. 加载我的评论和解析
      if (user) {
        try {
          const myComments = await api.request('/user/comments');
          if (Array.isArray(myComments)) setUserComments(myComments);

          const myExps = await api.request('/user/explanations');
          if (Array.isArray(myExps)) setUserExplList(myExps);
        } catch (e) { console.warn('Load user data fail', e); }
      }
    };
    init();
  }, []);

  // 统一按学科过滤并归一化题目ID
  const mergedHistory = useMemo(() => {
    let remoteHistory = [];
    if (data?.history) {
      remoteHistory = typeof data.history === 'string' ? JSON.parse(data.history) : data.history;
    }

    const local = Array.isArray(localProgress.history) ? localProgress.history : [];
    const map = new Map();

    [...remoteHistory, ...local].forEach((h, idx) => {
      if (!h || !h.timestamp) return;
      const normalizedQid = normalizeQuestionId(h.questionId);
      const key = `${h.timestamp}-${normalizedQid || idx}-${h.action || ''}`;
      if (!map.has(key)) {
        map.set(key, { ...h, questionId: normalizedQid });
      }
    });
    return [...map.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [data, localProgress]);

  const normalizedBrushed = useMemo(() => {
    const remote = data?.brushedIds ? (typeof data.brushedIds === 'string' ? JSON.parse(data.brushedIds) : data.brushedIds) : [];
    const local = localProgress.brushedIds || [];
    return new Set([...remote, ...local].map(normalizeQuestionId));
  }, [data, localProgress]);



  // ✅ 核心：按学科分类隔离计算
  const activeHistory = useMemo(() => {
    return mergedHistory.filter(h => {
      const qid = h.questionId || '';
      const isMaogai = qid.startsWith('MG-');
      const isHgdmy = qid.startsWith('HGD-MG-') || qid.startsWith('HGD-MG');
      const isCustom = qid.startsWith('custom_');
      if (selectedSubject && selectedSubject.startsWith('custom_')) {
        return qid.startsWith(selectedSubject);
      }
      if (selectedSubject === 'maogai') return isMaogai && !isHgdmy;
      if (selectedSubject === 'hgdmy-maogai') return isHgdmy;
      return !isMaogai && !isHgdmy && !isCustom;
    });
  }, [mergedHistory, selectedSubject]);

  const activeBrushed = useMemo(() => {
    return new Set([...normalizedBrushed].filter(id => {
      const isMaogai = id.startsWith('MG-');
      const isHgdmy = id.startsWith('HGD-MG-') || id.startsWith('HGD-MG');
      const isCustom = id.startsWith('custom_');
      if (selectedSubject && selectedSubject.startsWith('custom_')) {
        return id.startsWith(selectedSubject);
      }
      if (selectedSubject === 'maogai') return isMaogai && !isHgdmy;
      if (selectedSubject === 'hgdmy-maogai') return isHgdmy;
      return !isMaogai && !isHgdmy && !isCustom;
    }));
  }, [normalizedBrushed, selectedSubject]);

  // 日期提取
  const dates = useMemo(() => {
    const uniqueDates = new Set();
    activeHistory.forEach(h => {
      if (h && h.timestamp) {
        const date = new Date(h.timestamp).toLocaleDateString();
        uniqueDates.add(date);
      }
    });
    const sortedDates = [...uniqueDates].sort((a, b) => new Date(b) - new Date(a));
    return sortedDates.length ? sortedDates : [new Date().toLocaleDateString()];
  }, [activeHistory]);

  // 保证选中的日期一定在可用日期列表中
  useEffect(() => {
    if (dates.length > 0) {
      if (!selectedDate || !dates.includes(selectedDate)) {
        const timer = setTimeout(() => {
          setSelectedDate(dates[0]);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [dates, selectedDate]);

  const dailyRecords = useMemo(() => {
    if (!selectedDate) return [];
    return activeHistory
        .filter(h => new Date(h.timestamp).toLocaleDateString() === selectedDate)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(h => ({ ...h, questionTitle: safeText(h.questionTitle), userAnswer: safeText(h.userAnswer) }));
  }, [activeHistory, selectedDate]);

  const dailyStats = useMemo(() => {
    const total = dailyRecords.filter(h => h.action === 'answer').length;
    const correct = dailyRecords.filter(h => h.action === 'answer' && h.isCorrect).length;
    const mastered = new Set(dailyRecords.filter(h => h.isCorrect).map(h => h.questionId)).size;
    return { total, correct, rate: total ? Math.round((correct / total) * 100) : 0, mastered };
  }, [dailyRecords]);

  // 跨学科全局题目智能查找器
  const getQuestionDetails = (qid) => {
    if (!qid) return null;
    const normalizedQid = normalizeQuestionId(qid);
    if (normalizedQid.startsWith('custom_')) {
      for (const subId in customBanks) {
        if (normalizedQid.startsWith(subId)) {
          const bank = customBanks[subId];
          for (const chId in bank) {
            const q = bank[chId]?.find(i => i.id === normalizedQid);
            if (q) return q;
          }
        }
      }
    } else if (normalizedQid.startsWith('HGD-MG-') || normalizedQid.startsWith('HGD-MG')) {
      for (const chId in hgdmyMaogaiBank) {
        const q = hgdmyMaogaiBank[chId]?.find(i => i.id === normalizedQid);
        if (q) return q;
      }
    } else if (normalizedQid.startsWith('MG-')) {
      for (const chId in maogaiBank) {
        const q = maogaiBank[chId]?.find(i => i.id === normalizedQid);
        if (q) return q;
      }
    } else {
      for (const lid in innovationBank) {
        const q = innovationBank[lid]?.find(i => i.id === normalizedQid);
        if (q) return q;
      }
    }
    return null;
  };

  const loadQuestionExplanations = async (questionId) => {
    try {
      const list = await api.request(`/explanations?questionId=${questionId}`);
      setUserExplanations(prev => ({ ...prev, [questionId]: list }));
    } catch (e) { console.warn('load explanations fail', e); }
  };

  const handleUpdateExp = async (questionId) => {
    if (!editingExpId || !editingExpContent.trim()) return;
    try {
      await api.request(`/explanations/${editingExpId}`, 'PUT', { content: editingExpContent.trim() });
      setEditingExpId(null);
      setEditingExpContent('');
      await loadQuestionExplanations(questionId);
    } catch (e) { alert('更新解析失败: ' + e.message); }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentId || !editingCommentContent.trim()) return;
    try {
      await api.request(`/comments/${commentId}`, 'PUT', { content: editingCommentContent.trim() });
      setEditingCommentId(null);
      setEditingCommentContent('');
      setUserComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editingCommentContent } : c));
    } catch (e) { alert('更新评论失败: ' + e.message); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('确定删除此评论吗？')) return;
    try {
      await api.request(`/comments/${commentId}`, 'DELETE');
      setUserComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) { alert('删除失败: ' + e.message); }
  };

  const handleDeleteExplanation = async (explanationId) => {
    if (!confirm('确定删除此解析吗？')) return;
    try {
      await api.request(`/explanations/${explanationId}`, 'DELETE');
      setUserExplList(prev => prev.filter(e => e.id !== explanationId));
    } catch (e) { alert('删除失败: ' + e.message); }
  };

  const openQuestion = (qid) => {
    const normalized = normalizeQuestionId(qid);
    const q = getQuestionDetails(normalized);
    if (!q) { alert('题库中未找到该题（当前可能尚未加载完整）'); return; }
    const formatted = {
      ...q,
      question: safeText(q.question),
      explanation: safeText(q.explanation),
      options: Array.isArray(q.options) ? q.options.map(safeText) : [],
      rawAnswer: Array.isArray(q.rawAnswer) ? q.rawAnswer : [],
    };
    setViewingQuestion(formatted);
    loadQuestionExplanations(formatted.id);
  };

  useEffect(() => {
    if (viewingQuestion) {
      const timer = setTimeout(() => {
        loadQuestionExplanations(viewingQuestion.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [viewingQuestion]);

  const renderUserExps = (questionId) => {
    const list = userExplanations[questionId];
    if (!list || !list.length) return null;
    const currentUser = api.getCurrentUser();
    return (
      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
        <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
          <BookOpen size={14}/> 用户提供的解析
        </div>
        {list.map(exp => {
          const isOwner = currentUser && exp.authorId === currentUser.id;
          const isEditing = editingExpId === exp.id;
          return (
            <div key={exp.id} className="bg-white border border-slate-100 p-3 rounded-lg space-y-2">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>{exp.author} · {formatDate(exp.createdAt)}</span>
                {isOwner && !isEditing && <button onClick={() => { setEditingExpId(exp.id); setEditingExpContent(exp.content); }} className="text-blue-600 text-xs">编辑</button>}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea value={editingExpContent} onChange={e=>setEditingExpContent(e.target.value)} rows={3} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => handleUpdateExp(questionId)} className="px-3 py-1 bg-blue-600 text-white rounded-lg">保存</button>
                    <button onClick={() => { setEditingExpId(null); setEditingExpContent(''); }} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <Markdown content={exp.content} />
                  <div className="text-xs text-amber-600">👍 {exp.votes || 0}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMyCommentsSection = () => (
    <button onClick={() => { setShowModal('comments'); setCommentPage(1); }}
            className="glass-card rounded-2xl p-6 w-full hover:shadow-lg transition-shadow bg-white border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle size={24} className="text-blue-600" />
          <div className="text-left">
            <div className="font-bold text-slate-800">我的评论</div>
            <div className="text-sm text-slate-500">共 {userComments.length} 条</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-blue-600">{userComments.length}</div>
      </div>
    </button>
  );

  const renderMyExplanationsSection = () => (
    <button onClick={() => { setShowModal('explanations'); setExplanationPage(1); }}
            className="glass-card rounded-2xl p-6 w-full hover:shadow-lg transition-shadow bg-white border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap size={24} className="text-yellow-600" />
          <div className="text-left">
            <div className="font-bold text-slate-800">我的解析</div>
            <div className="text-sm text-slate-500">共 {userExplList.length} 条</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-yellow-600">{userExplList.length}</div>
      </div>
    </button>
  );

  const renderCommentsModal = () => {
    const paginatedComments = userComments.slice((commentPage - 1) * ITEMS_PER_PAGE, commentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(userComments.length / ITEMS_PER_PAGE);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(null)}>
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[80vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><MessageCircle size={20} className="text-blue-600"/>我的评论</h2>
            <button onClick={() => setShowModal(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {userComments.length === 0 ? <p className="text-center text-slate-400">暂无评论</p> : paginatedComments.map(comment => {
              const isEditing = editingCommentId === comment.id;
              const normId = normalizeQuestionId(comment.questionId);
              const isMaogai = normId.startsWith('MG-');
              return (
                <div key={comment.id} className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600" onClick={() => { openQuestion(comment.questionId); setShowModal(null); }}>
                      <span className={`px-1.5 py-0.5 rounded text-xs mr-2 font-bold ${isMaogai ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isMaogai ? '毛概' : '创新创业'}
                      </span>
                      ID: {normId}
                    </p>
                    <span className="text-xs text-amber-600">👍 {comment.likes}</span>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea value={editingCommentContent} onChange={e=>setEditingCommentContent(e.target.value)} className="w-full p-2 border rounded text-sm"/>
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => handleUpdateComment(comment.id)} className="text-blue-600">保存</button>
                        <button onClick={() => setEditingCommentId(null)} className="text-slate-500">取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-end">
                      <p className="text-sm text-slate-600">{comment.content}</p>
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }} className="text-blue-600">编辑</button>
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-red-600">删除</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between p-6 border-t border-slate-200">
              <button onClick={() => setCommentPage(p => Math.max(1, p-1))} disabled={commentPage===1} className="text-sm disabled:opacity-50">上一页</button>
              <span className="text-sm">{commentPage} / {totalPages}</span>
              <button onClick={() => setCommentPage(p => Math.min(totalPages, p+1))} disabled={commentPage===totalPages} className="text-sm disabled:opacity-50">下一页</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExplanationsModal = () => {
    const paginated = userExplList.slice((explanationPage - 1) * ITEMS_PER_PAGE, explanationPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(userExplList.length / ITEMS_PER_PAGE);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(null)}>
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[80vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Zap size={20} className="text-yellow-600"/>我的解析</h2>
            <button onClick={() => setShowModal(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {userExplList.length === 0 ? <p className="text-center text-slate-400">暂无解析</p> : paginated.map(exp => {
              const normId = normalizeQuestionId(exp.questionId);
              const isMaogai = normId.startsWith('MG-');
              return (
                <div key={exp.id} className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-indigo-900 cursor-pointer hover:text-indigo-600" onClick={() => { openQuestion(exp.questionId); setShowModal(null); }}>
                      <span className={`px-1.5 py-0.5 rounded text-xs mr-2 font-bold ${isMaogai ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isMaogai ? '毛概' : '创新创业'}
                      </span>
                      ID: {normId}
                    </p>
                    <span className="text-xs text-amber-600">👍 {exp.votes}</span>
                  </div>
                  <div className="text-sm text-indigo-900 line-clamp-3"><Markdown content={exp.content}/></div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => handleDeleteExplanation(exp.id)} className="text-red-600">删除</button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between p-6 border-t border-slate-200">
              <button onClick={() => setExplanationPage(p => Math.max(1, p-1))} disabled={explanationPage===1} className="text-sm disabled:opacity-50">上一页</button>
              <span className="text-sm">{explanationPage} / {totalPages}</span>
              <button onClick={() => setExplanationPage(p => Math.min(totalPages, p+1))} disabled={explanationPage===totalPages} className="text-sm disabled:opacity-50">下一页</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (gateReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-6 w-full max-w-md space-y-4 text-center">
          <AlertCircle className="mx-auto text-amber-500" size={32}/>
          <div className="text-lg font-bold text-slate-800">访问受限</div>
          <p className="text-slate-600 text-sm">{gateReason}</p>
          <button onClick={() => location.href='/'} className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold">返回主页</button>
        </div>
      </div>
    );
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-slate-500 text-sm"><RefreshCw className="animate-spin" size={16}/> 正在同步数据...</div>
    </div>
  );

  const currentSubjectObj = allSubjects.find(sub => sub.id === selectedSubject);

  const activeBank = selectedSubject && selectedSubject.startsWith('custom_')
    ? (customBanks[selectedSubject] || {})
    : (selectedSubject === 'maogai' ? maogaiBank : selectedSubject === 'hgdmy-maogai' ? hgdmyMaogaiBank : innovationBank);

  const activeChapters = selectedSubject && selectedSubject.startsWith('custom_')
    ? (currentSubjectObj?.lectures || [])
    : (selectedSubject === 'maogai' ? MAOGAI_CHAPTERS : selectedSubject === 'hgdmy-maogai' ? [{ id: 1, name: '全部题目' }] : LECTURES);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => location.href='/'} className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full flex items-center gap-1">
          <ChevronLeft size={20} /> <span className="text-sm font-bold">返回主页</span>
        </button>
        <h1 className="font-bold text-slate-800">学习数据报表</h1>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full p-4 space-y-6">
        
        {/* ✅ 学科切换选项卡 (WOW 高级设计) */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
          {allSubjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => { setSelectedSubject(sub.id); setSelectedDate(null); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 min-w-[100px] ${
                selectedSubject === sub.id
                  ? 'bg-white shadow text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{sub.icon}</span>
              <span>{sub.shortName || sub.name}</span>
            </button>
          ))}
        </div>

        {/* 日期选择器 */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 px-2">选择学习记录日期 ({dates.length} 天)</div>
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
            <div className="flex gap-2 w-max">
              {dates.map(d => (
                <button key={d} onClick={() => setSelectedDate(d)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all border flex-shrink-0 ${selectedDate === d ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>
                  {d === new Date().toLocaleDateString() ? '今天' : d.split('/')[1] + '.' + d.split('/')[2]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 个人评论与解析入口 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderMyCommentsSection()}
          {renderMyExplanationsSection()}
        </div>

        {/* 核心统计卡片 */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-6 opacity-90">
            <Calendar size={18} /> <span className="font-bold">{selectedDate} · {currentSubjectObj?.shortName || currentSubjectObj?.name || '未知学科'} 概览</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-blue-100 text-xs mb-1">刷题量</div><div className="text-3xl font-bold">{dailyStats.total}</div></div>
            <div><div className="text-blue-100 text-xs mb-1">正确率</div><div className="text-3xl font-bold">{dailyStats.rate}%</div></div>
            <div><div className="text-blue-100 text-xs mb-1">新掌握</div><div className="text-3xl font-bold">{dailyStats.mastered}</div></div>
          </div>
        </div>

        {/* 章节进度 */}
        <div>
          <h3 className="text-slate-500 font-bold text-sm mb-3 ml-1">{currentSubjectObj?.shortName || currentSubjectObj?.name || '未知学科'} 章节统计</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeChapters.map(l => {
              const total = activeBank[l.id]?.length || 0;
              const done = [...activeBrushed].filter(id => {
                if (selectedSubject && selectedSubject.startsWith('custom_')) {
                  const qDetails = getQuestionDetails(id);
                  return qDetails && qDetails.category === l.name;
                }
                if (selectedSubject === 'maogai') {
                  const qDetails = getQuestionDetails(id);
                  return qDetails && qDetails.category === l.name;
                } else if (selectedSubject === 'hgdmy-maogai') {
                  return id.startsWith('HGD-MG-') || id.startsWith('HGD-MG');
                } else {
                  return id.startsWith(`L${l.id}-`);
                }
              }).length;
              const pct = total ? Math.round((done/total)*100) : 0;
              return (
                <div key={l.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="font-bold text-slate-700 text-sm truncate">{safeText(l.name.includes('：') ? l.name.split('：')[1] : l.name)}</div>
                    <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{width: `${pct}%`}}></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-800">{pct}%</div>
                    <div className="text-xs text-slate-400">{done}/{total}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 详细记录列表 */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-4 sm:p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18}/> 详细做题记录</h3>
          <div className="space-y-4">
            {dailyRecords.length === 0 ? <p className="text-center text-slate-400 py-8">本日暂无记录</p> : dailyRecords.map(h => (
              <div key={h.id} onClick={() => openQuestion(h.questionId)} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                <div className={`mt-0.5 ${h.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                  {h.action==='memorize' ? <Eye size={18} className="text-purple-500"/> : (h.isCorrect ? <CheckCircle size={18}/> : <XCircle size={18}/>)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 line-clamp-2">{safeText(h.questionTitle)}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    {h.action==='answer' && <span className={`px-1.5 py-0.5 rounded border ${h.isCorrect?'bg-green-50 border-green-200 text-green-700':'bg-red-50 border-red-200 text-red-700'}`}>选 {safeText(h.userAnswer)}</span>}
                    {h.action==='memorize' && <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">背题模式</span>}
                    <span className="ml-auto text-slate-400">{formatDate(h.timestamp).split(' ')[1]}</span>
                  </div>
                </div>
                <ArrowRight size={16} className="self-center text-slate-300"/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {viewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setViewingQuestion(null)}>
          <div className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">{safeText(viewingQuestion.id)}</span>
              <button onClick={() => setViewingQuestion(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-6">{safeText(viewingQuestion.question)}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {viewingQuestion.options.map((opt, i) => {
                  const isCorrect = viewingQuestion.rawAnswer.includes(i);
                  return (
                    <div key={i} className={`p-3 rounded-xl border text-sm flex gap-3 ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-100 text-slate-600'}`}>
                      <span className={`font-bold ${isCorrect?'text-green-600':'text-slate-400'}`}>{['A','B','C','D','E'][i]}.</span>
                      <span>{safeText(opt)}</span>
                      {isCorrect && <CheckCircle size={16} className="ml-auto text-green-600"/>}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold text-sm"><Zap size={16}/> 解析</div>
                  <Markdown content={safeText(viewingQuestion.explanation)} />
                </div>
                {renderUserExps(viewingQuestion.id)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal === 'comments' && renderCommentsModal()}
      {showModal === 'explanations' && renderExplanationsModal()}
    </div>
  );
}

export default Report;