import React, { useEffect, useMemo, useState } from 'react';
import AV from 'leancloud-storage';
import * as XLSX from 'xlsx';
import localforage from 'localforage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronLeft, Calendar, CheckCircle, XCircle, Clock, ArrowRight, BookOpen,
  Zap, AlertCircle, Eye, X
} from 'lucide-react';
import './index.css';

const LC_APP_ID = '5wPsbnakcoOjfaPzfC44vfW5-gzGzoHsz';
const LC_APP_KEY = 'j9qbdfjiJAPsqbGUy04COFTD';
const LC_SERVER_URL = 'https://5wpsbnak.lc-cn-n1-shared.com';
const GITHUB_BASE = 'https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/';

// LeanCloud 文件 objectId 映射，优先从 _File 拉取题库
const FILE_ID_MAP = {
  1: '69650188d606e2613f1b18e1',
  2: '69650188d606e2613f1b18dc',
  3: '69650188d606e2613f1b18de',
  4: '69650188d606e2613f1b18df',
  5: '69650188d606e2613f1b18e0',
  6: '69650188d606e2613f1b18db',
  7: '69650188d606e2613f1b18dd',
};
const LECTURES = [
  { id: 1, name: '第一讲：创新创业概述', file: '创新创业基础第一讲习题.xlsx', fileId: FILE_ID_MAP[1], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/sCwXv74yKdHuwzz440gSIKvciB8w5Oxt/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%80%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 2, name: '第二讲：创新思维与方法', file: '创新创业基础第二讲习题.xlsx', fileId: FILE_ID_MAP[2], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/LW7iNTXd04MjT6xIIgoghNavzJh78BM3/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%8C%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 3, name: '第三讲：机会与风险识别', file: '创新创业基础第三讲习题.xlsx', fileId: FILE_ID_MAP[3], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/89otiFHMEs0D6EPKY7h6nLLlKT4e3FlW/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%89%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 4, name: '第四讲：团队与资源整合', file: '创新创业基础第四讲习题.xlsx', fileId: FILE_ID_MAP[4], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/iDvr6YL2DqyDJNQ8WtHF8JoGu8VhXJpB/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%9B%9B%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 5, name: '第五讲：商业模式与计划', file: '创新创业基础第五讲习题.xlsx', fileId: FILE_ID_MAP[5], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/pmwL2rBspHySjkkGLY6cT4jTSENOw2QE/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%94%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 6, name: '第六讲：融资与企业设立', file: '创新创业基础第六讲习题.xlsx', fileId: FILE_ID_MAP[6], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/7ftQpmkKv4VtISulAbszw5y9gMtShUUO/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%85%AD%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 7, name: '第七讲：新企业成长管理', file: '创新创业基础第七讲习题.xlsx', fileId: FILE_ID_MAP[7], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/ng2YT8p8yeERNwiaPXWMJBFwEdPwM7XI/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%83%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
];

AV.init({ appId: LC_APP_ID, appKey: LC_APP_KEY, serverURL: LC_SERVER_URL });

const safeText = (v) => typeof v === 'string' ? v : (v ? String(v) : '');
const Markdown = ({ content }) => (
  <div className="prose prose-sm max-w-none text-slate-800">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{safeText(content)}</ReactMarkdown>
  </div>
);

const fetchLectureArrayBuffer = async (lecture) => {
  const urls = [];
  const mapId = lecture?.fileId || FILE_ID_MAP[lecture?.id];
  // 优先从 _File 解析 URL（带缓存）
  if (!fetchLectureArrayBuffer.cache) fetchLectureArrayBuffer.cache = {};
  if (mapId && fetchLectureArrayBuffer.cache[mapId]) urls.push(fetchLectureArrayBuffer.cache[mapId]);
  if (mapId && !fetchLectureArrayBuffer.cache[mapId]) {
    try {
      const obj = await new AV.Query('_File').get(mapId);
      const url = obj.get('url');
      if (url) {
        fetchLectureArrayBuffer.cache[mapId] = url;
        urls.push(url);
      }
    } catch (e) {
      console.warn('resolve file url fail', lecture?.name, e);
    }
  }
  if (lecture?.url && !urls.includes(lecture.url)) urls.push(lecture.url);
  urls.push(`${GITHUB_BASE}${encodeURIComponent(lecture.file)}`);

  const errors = [];
  for (const url of urls) {
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) { errors.push(`HTTP ${res.status}`); continue; }
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) { errors.push(e.message); }
  }
  throw new Error(errors.join(' | '));
};

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
  const [userExplanations, setUserExplanations] = useState({});
  const [editingExpId, setEditingExpId] = useState(null);
  const [editingExpContent, setEditingExpContent] = useState('');
  const [localProgress, setLocalProgress] = useState({ history: [], brushedIds: [], masteredIds: [] });

  useEffect(() => {
    (async () => {
      const user = AV.User.current();
      if (!user) { setGateReason('尚未登录，请先登录后查看报表'); return; }
      if (!user.getEmail() || !user.get('emailVerified')) { setGateReason('需要绑定并验证邮箱后才能查看学习报表'); return; }

      try {
        const query = new AV.Query('UserProgress');
        query.equalTo('user', user);
        const record = await query.first();
        if (record) setData(record.toJSON());
      } catch (e) { console.error('Data fetch error', e); }

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

      // 叠加本地缓存进度，避免日期缺失
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
    })();
  }, []);

  // 合并云端与本地的历史与进度，避免遗漏任何有数据的日期
  const mergedHistory = useMemo(() => {
    const remote = Array.isArray(data?.history) ? data.history : [];
    const local = Array.isArray(localProgress.history) ? localProgress.history : [];
    const map = new Map();
    [...remote, ...local].forEach((h, idx) => {
      if (!h || !h.timestamp) return;
      const key = `${h.timestamp}-${h.questionId || idx}-${h.action || ''}`;
      if (!map.has(key)) map.set(key, h);
    });
    return [...map.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [data, localProgress]);

  const brushedSet = useMemo(() => new Set([...(data?.brushedIds || []), ...(localProgress.brushedIds || [])]), [data, localProgress]);
  const masteredSet = useMemo(() => new Set([...(data?.masteredIds || []), ...(localProgress.masteredIds || [])]), [data, localProgress]);
  const history = mergedHistory;

  const dates = useMemo(() => {
    const d = [...new Set(history.map(h => new Date(h.timestamp).toLocaleDateString()))].sort((a,b) => new Date(b) - new Date(a));
    return d.length ? d : [new Date().toLocaleDateString()];
  }, [history]);
  useEffect(() => { if (!selectedDate && dates.length) setSelectedDate(dates[0]); }, [dates, selectedDate]);

  const sanitizeRecord = (h) => ({ ...h, questionTitle: safeText(h.questionTitle), userAnswer: safeText(h.userAnswer) });
  const dailyRecords = useMemo(() => {
    if (!selectedDate) return [];
    return history
      .filter(h => new Date(h.timestamp).toLocaleDateString() === selectedDate)
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map(sanitizeRecord);
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

  const loadUserExplanations = async (questionId) => {
    try {
      const query = new AV.Query('UserExplanation');
      query.equalTo('questionId', questionId);
      query.descending('votes');
      query.include('author');
      const res = await query.find();
      const list = res.map(r => ({
        id: r.id,
        content: String(r.get('content') || ''),
        author: r.get('author')?.get('username') || '匿名',
        authorId: r.get('author')?.id || '',
        votes: r.get('votes') || 0,
        createdAt: r.get('createdAt'),
      }));
      setUserExplanations(prev => ({ ...prev, [questionId]: list }));
    } catch (e) { console.warn('load explanations fail', e); }
  };

  const handleStartEditExp = (exp) => {
    setEditingExpId(exp.id);
    setEditingExpContent(exp.content);
  };

  const handleUpdateExp = async (questionId) => {
    if (!editingExpId || !editingExpContent.trim()) return;
    try {
      const obj = AV.Object.createWithoutData('UserExplanation', editingExpId);
      obj.set('content', editingExpContent.trim());
      await obj.save();
      setEditingExpId(null);
      setEditingExpContent('');
      await loadUserExplanations(questionId);
    } catch (e) { alert('更新解析失败'); }
  };

  const renderUserExps = (questionId) => {
    const list = userExplanations[questionId];
    if (!list || !list.length) return null;
    const currentUser = AV.User.current();
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
                <span>{exp.author} · {new Date(exp.createdAt).toLocaleString()}</span>
                {isOwner && !isEditing && <button onClick={() => handleStartEditExp(exp)} className="text-blue-600 text-xs">编辑</button>}
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
    loadUserExplanations(q.id);
  };

  useEffect(() => { if (viewingQuestion) loadUserExplanations(viewingQuestion.id); }, [viewingQuestion]);

  if (gateReason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-6 w-full max-w-md space-y-4 text-center">
          <AlertCircle className="mx-auto text-amber-500" size={32}/>
          <div className="text-lg font-bold text-slate-800">访问受限</div>
          <p className="text-slate-600 text-sm">{gateReason}</p>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => location.href='profile.html'} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold">前往账号中心绑定邮箱</button>
            <button onClick={() => location.href='/'} className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold">返回主页</button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 text-sm">正在同步云端数据...</div>
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
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {dates.map(d => (
              <button key={d} onClick={() => setSelectedDate(d)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${selectedDate === d ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>
                {d === new Date().toLocaleDateString() ? '今天' : d.split('/')[1] + '.' + d.split('/')[2]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg animate-fade-in">
          <div className="flex items-center gap-2 mb-6 opacity-90">
            <Calendar size={18} />
            <span className="font-bold">{selectedDate} 概览</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-blue-100 text-xs mb-1">刷题量</div><div className="text-3xl font-bold">{dailyStats.total}</div></div>
            <div><div className="text-blue-100 text-xs mb-1">正确率</div><div className="text-3xl font-bold">{dailyStats.rate}%</div></div>
            <div><div className="text-blue-100 text-xs mb-1">新掌握</div><div className="text-3xl font-bold">{dailyStats.mastered}</div></div>
          </div>
        </div>

        <div>
          <h3 className="text-slate-500 font-bold text-sm mb-3 ml-1">全章节统计</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LECTURES.map(l => {
              const total = bank[l.id]?.length || 0;
              const done = [...brushedSet].filter(id => id.startsWith(`L${l.id}-`)).length;
              const right = [...masteredSet].filter(id => id.startsWith(`L${l.id}-`)).length;
              const pct = total ? Math.round((done/total)*100) : 0;
              return (
                <div key={l.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
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

        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18}/> 详细记录</h3>
          <div className="space-y-4">
            {dailyRecords.length === 0 ? <p className="text-center text-slate-400 py-8">本日暂无记录</p> : dailyRecords.map(h => {
              const q = getQuestionDetails(h.questionId);
              const correctText = q ? q.rawAnswer.map(i => ['A','B','C','D','E'][i]).join('') : '?';
              return (
                <div key={h.id} onClick={() => openQuestion(h.questionId)} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                  <div className={`mt-0.5 ${h.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {h.action==='memorize' ? <Eye size={18} className="text-purple-500"/> : (h.isCorrect ? <CheckCircle size={18}/> : <XCircle size={18}/>)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 line-clamp-2">{safeText(h.questionTitle)}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      {h.action==='answer' && (
                        <>
                          <span className={`px-1.5 py-0.5 rounded border ${h.isCorrect?'bg-green-50 border-green-200 text-green-700':'bg-red-50 border-red-200 text-red-700'}`}>选 {safeText(h.userAnswer)}</span>
                          {!h.isCorrect && <span className="font-bold text-green-600">正解 {correctText}</span>}
                        </>
                      )}
                      {h.action==='memorize' && <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">背题模式</span>}
                      <span className="ml-auto text-slate-400">{new Date(h.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="self-center text-slate-300"/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {viewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setViewingQuestion(null)}>
          <div className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded font-bold ${viewingQuestion.type==='multiple'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>
                  {viewingQuestion.type==='multiple'?'多选':(viewingQuestion.type==='judgment'?'判断':'单选')}
                </span>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">{safeText(viewingQuestion.id)}</span>
              </div>
              <button onClick={() => setViewingQuestion(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 md:mb-6">{safeText(viewingQuestion.question)}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span space-y-3 mb-6 md:mb-0">
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
    </div>
  );
}

export default Report;

