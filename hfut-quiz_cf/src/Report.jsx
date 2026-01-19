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

// ❌ 移除 LeanCloud 配置
// AV.init(...)

// ✅ 静态题库配置 (与 App.js 保持一致)
const GITHUB_BASE = 'https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/';
const LECTURES = [
  { id: 1, name: '第一讲：创新创业概述', file: '创新创业基础第一讲习题.xlsx', url: '' },
  { id: 2, name: '第二讲：创新思维与方法', file: '创新创业基础第二讲习题.xlsx', url: '' },
  { id: 3, name: '第三讲：机会与风险识别', file: '创新创业基础第三讲习题.xlsx', url: '' },
  { id: 4, name: '第四讲：团队与资源整合', file: '创新创业基础第四讲习题.xlsx', url: '' },
  { id: 5, name: '第五讲：商业模式与计划', file: '创新创业基础第五讲习题.xlsx', url: '' },
  { id: 6, name: '第六讲：融资与企业设立', file: '创新创业基础第六讲习题.xlsx', url: '' },
  { id: 7, name: '第七讲：新企业成长管理', file: '创新创业基础第七讲习题.xlsx', url: '' },
];

const safeText = (v) => typeof v === 'string' ? v : (v ? String(v) : '');

// 组件：Markdown 渲染
const Markdown = ({ content }) => (
    <div className="prose prose-sm max-w-none text-slate-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{safeText(content)}</ReactMarkdown>
    </div>
);

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

// 工具：加载 Excel (与 App.js 逻辑一致)
const fetchLectureArrayBuffer = async (lecture) => {
  const urls = [];
  if (lecture.url) urls.push(lecture.url);
  urls.push(`${GITHUB_BASE}${encodeURIComponent(lecture.file)}`);

  const errors = [];
  for (const url of urls) {
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) { errors.push(e.message); }
  }
  throw new Error(errors.join(' | '));
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

function Report() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(null);
  const [bank, setBank] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [gateReason, setGateReason] = useState('');

  // 评论与解析相关
  const [userExplanations, setUserExplanations] = useState({}); // 缓存题目详情页的解析
  const [editingExpId, setEditingExpId] = useState(null);
  const [editingExpContent, setEditingExpContent] = useState('');

  const [localProgress, setLocalProgress] = useState({ history: [], brushedIds: [], masteredIds: [] });

  // 个人中心数据
  const [userComments, setUserComments] = useState([]);
  const [userExplList, setUserExplList] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  // UI 状态
  const [showModal, setShowModal] = useState(null); // 'comments' or 'explanations'
  const [commentPage, setCommentPage] = useState(1);
  const [explanationPage, setExplanationPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      // 1. 检查登录
      const user = api.getCurrentUser();
      if (!user) { setGateReason('尚未登录，请先登录后查看报表'); return; }
      // Cloudflare 版本的 user 对象直接包含 email
      if (!user.email) {
        // 注意：如果您的注册逻辑里没强制邮箱，这里可能会拦截。
        // 建议：暂时放宽限制，或者在后端实现 email_verified 字段
        // setGateReason('需要绑定并验证邮箱后才能查看学习报表');
        // return;
      }

      // 2. 加载云端进度 (假设后端提供了 /api/user/progress 接口)
      try {
        // 如果后端还没写这个接口，这里会报错。可以用 safeGet 读取本地缓存兜底。
        // 这里尝试调用后端恢复接口获取数据
        const res = await api.request('/userProgress'); // 复用恢复进度的接口
        if (res && res.found && res.progress) {
          setData(res.progress);
        }
      } catch (e) { console.error('Data fetch error', e); }

      // 3. 加载题库 (带缓存)
      try {
        const cached = await localforage.getItem('hf_bank_v2');
        if (cached && Object.keys(cached).length > 0) {
          setBank(cached);
        } else {
          const newBank = {};
          for (const lecture of LECTURES) {
            try {
              const buf = await fetchLectureArrayBuffer(lecture);
              const wb = XLSX.read(buf, { type: 'array' });
              const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
              newBank[lecture.id] = parseExcelData(raw, lecture.id);
            } catch (e) { console.warn('Bank load error', lecture.file, e); }
          }
          setBank(newBank);
          await localforage.setItem('hf_bank_v2', newBank);
        }
      } catch (e) { console.warn('Bank load error', e); }

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

      // 5. 加载我的评论和解析 (需要后端支持)
      if (user) {
        try {
          // 假设后端新增了 GET /api/user/comments 和 /api/user/explanations
          // 如果没实现，这里会 404，不影响主页面显示
          const myComments = await api.request('/user/comments');
          if (Array.isArray(myComments)) setUserComments(myComments);

          const myExps = await api.request('/user/explanations');
          if (Array.isArray(myExps)) setUserExplList(myExps);
        } catch (e) { console.warn('Load user data fail', e); }
      }
    };
    init();
  }, []);

  // 合并逻辑
  const mergedHistory = useMemo(() => {
    // 兼容 D1 数据库返回的 JSON 结构 (可能是 JSON string 也可能是 Object)
    let remoteHistory = [];
    if (data?.history) {
      remoteHistory = typeof data.history === 'string' ? JSON.parse(data.history) : data.history;
    }

    const local = Array.isArray(localProgress.history) ? localProgress.history : [];
    const map = new Map();

    [...remoteHistory, ...local].forEach((h, idx) => {
      if (!h || !h.timestamp) return;
      const key = `${h.timestamp}-${h.questionId || idx}-${h.action || ''}`;
      if (!map.has(key)) map.set(key, h);
    });
    return [...map.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [data, localProgress]);

  const brushedSet = useMemo(() => {
    const remote = data?.brushedIds ? (typeof data.brushedIds === 'string' ? JSON.parse(data.brushedIds) : data.brushedIds) : [];
    return new Set([...remote, ...(localProgress.brushedIds || [])]);
  }, [data, localProgress]);

  const masteredSet = useMemo(() => {
    const remote = data?.masteredIds ? (typeof data.masteredIds === 'string' ? JSON.parse(data.masteredIds) : data.masteredIds) : [];
    return new Set([...remote, ...(localProgress.masteredIds || [])]);
  }, [data, localProgress]);

  const history = mergedHistory;

  const dates = useMemo(() => {
    const uniqueDates = new Set();
    history.forEach(h => {
      if (h && h.timestamp) {
        const date = new Date(h.timestamp).toLocaleDateString();
        uniqueDates.add(date);
      }
    });
    const sortedDates = [...uniqueDates].sort((a, b) => new Date(b) - new Date(a));
    return sortedDates.length ? sortedDates : [new Date().toLocaleDateString()];
  }, [history]);

  useEffect(() => { if (!selectedDate && dates.length) setSelectedDate(dates[0]); }, [dates, selectedDate]);

  const dailyRecords = useMemo(() => {
    if (!selectedDate) return [];
    return history
        .filter(h => new Date(h.timestamp).toLocaleDateString() === selectedDate)
        .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(h => ({ ...h, questionTitle: safeText(h.questionTitle), userAnswer: safeText(h.userAnswer) }));
  }, [history, selectedDate]);

  const dailyStats = useMemo(() => {
    const total = dailyRecords.filter(h => h.action === 'answer').length;
    const correct = dailyRecords.filter(h => h.action === 'answer' && h.isCorrect).length;
    const mastered = new Set(dailyRecords.filter(h => h.isCorrect).map(h => h.questionId)).size;
    return { total, correct, rate: total ? Math.round((correct/total)*100) : 0, mastered };
  }, [dailyRecords]);

  const getQuestionDetails = (qid) => {
    for (const lid in bank) {
      const q = bank[lid]?.find(i => i.id === qid);
      if (q) return q;
    }
    return null;
  };

  // 获取特定题目的解析列表 (包含点赞数)
  const loadQuestionExplanations = async (questionId) => {
    try {
      const list = await api.request(`/explanations?questionId=${questionId}`);
      setUserExplanations(prev => ({ ...prev, [questionId]: list }));
    } catch (e) { console.warn('load explanations fail', e); }
  };

  // --- CRUD 操作 (改为 api.request) ---

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
      // 简单起见，本地更新列表
      setUserComments(prev => prev.map(c => c.id === commentId ? {...c, content: editingCommentContent} : c));
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

  // --- 渲染辅助 ---

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
                    {isOwner && !isEditing && <button onClick={() => {setEditingExpId(exp.id); setEditingExpContent(exp.content)}} className="text-blue-600 text-xs">编辑</button>}
                  </div>
                  {isEditing ? (
                      <div className="space-y-2">
                        <textarea value={editingExpContent} onChange={e=>setEditingExpContent(e.target.value)} rows={3} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                        <div className="flex justify-end gap-2 text-xs">
                          <button onClick={() => handleUpdateExp(questionId)} className="px-3 py-1 bg-blue-600 text-white rounded-lg">保存</button>
                          <button onClick={() => {setEditingExpId(null); setEditingExpContent('');}} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg">取消</button>
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

  // 评论详情浮窗
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
                return (
                    <div key={comment.id} className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600" onClick={() => {openQuestion(comment.questionId); setShowModal(null);}}>题目 {comment.questionId}</p>
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
                              <button onClick={() => {setEditingCommentId(comment.id); setEditingCommentContent(comment.content)}} className="text-blue-600">编辑</button>
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

  // 解析详情浮窗
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
              {userExplList.length === 0 ? <p className="text-center text-slate-400">暂无解析</p> : paginated.map(exp => (
                  <div key={exp.id} className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-indigo-900 cursor-pointer hover:text-indigo-600" onClick={() => {openQuestion(exp.questionId); setShowModal(null);}}>题目 {exp.questionId}</p>
                      <span className="text-xs text-amber-600">👍 {exp.votes}</span>
                    </div>
                    <div className="text-sm text-indigo-900 line-clamp-3"><Markdown content={exp.content}/></div>
                    <div className="flex justify-end gap-2 text-xs">
                      <button onClick={() => handleDeleteExplanation(exp.id)} className="text-red-600">删除</button>
                    </div>
                  </div>
              ))}
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

  const openQuestion = (qid) => {
    const q = getQuestionDetails(qid);
    if (!q) { alert('题库中未找到该题'); return; }
    const normalized = {
      ...q,
      question: safeText(q.question),
      explanation: safeText(q.explanation),
      options: Array.isArray(q.options) ? q.options.map(safeText) : [],
      rawAnswer: Array.isArray(q.rawAnswer) ? q.rawAnswer : [],
    };
    setViewingQuestion(normalized);
    loadQuestionExplanations(q.id);
  };

  useEffect(() => { if (viewingQuestion) loadQuestionExplanations(viewingQuestion.id); }, [viewingQuestion]);

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

  return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => location.href='/'} className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full flex items-center gap-1">
            <ChevronLeft size={20} /> <span className="text-sm font-bold">返回主页</span>
          </button>
          <h1 className="font-bold text-slate-800">数据报表</h1>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 max-w-3xl mx-auto w-full p-4 space-y-6">
          {/* 日期选择器 */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 px-2">选择日期 ({dates.length} 天)</div>
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

          {/* 入口按钮 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderMyCommentsSection()}
            {renderMyExplanationsSection()}
          </div>

          {/* 核心统计卡片 */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-6 opacity-90">
              <Calendar size={18} /> <span className="font-bold">{selectedDate} 概览</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-blue-100 text-xs mb-1">刷题量</div><div className="text-3xl font-bold">{dailyStats.total}</div></div>
              <div><div className="text-blue-100 text-xs mb-1">正确率</div><div className="text-3xl font-bold">{dailyStats.rate}%</div></div>
              <div><div className="text-blue-100 text-xs mb-1">新掌握</div><div className="text-3xl font-bold">{dailyStats.mastered}</div></div>
            </div>
          </div>

          {/* 章节进度 */}
          <div>
            <h3 className="text-slate-500 font-bold text-sm mb-3 ml-1">章节统计</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LECTURES.map(l => {
                const total = bank[l.id]?.length || 0;
                const done = [...brushedSet].filter(id => id.startsWith(`L${l.id}-`)).length;
                const pct = total ? Math.round((done/total)*100) : 0;
                return (
                    <div key={l.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="font-bold text-slate-700 text-sm truncate">{safeText(l.name.split('：')[1])}</div>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18}/> 详细记录</h3>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingQuestion(null)}>
              <div className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                          <div key={i} className={`p-3 rounded-lg border text-sm flex gap-3 ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-100 text-slate-600'}`}>
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