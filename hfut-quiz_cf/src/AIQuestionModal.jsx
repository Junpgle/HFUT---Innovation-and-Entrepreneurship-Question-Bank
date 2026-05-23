import { useRef, useState } from 'react';
import { AlertCircle, Copy, Loader2, Wand2, X } from 'lucide-react';
import { parseCustomJson } from './CustomUploadModal.jsx';
import { loadApiSettings } from './ApiSettingsModal.jsx';

const extractJsonFromText = (text) => {
    const source = String(text || '').trim();
    if (!source) throw new Error('模型返回为空');
    try { return JSON.parse(source); } catch (_) {}
    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
        try { return JSON.parse(fenced[1]); } catch (_) {}
    }
    const firstBrace = source.indexOf('{');
    const lastBrace = source.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        try { return JSON.parse(source.slice(firstBrace, lastBrace + 1)); } catch (_) {}
    }
    const firstBracket = source.indexOf('[');
    const lastBracket = source.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
        try { return JSON.parse(source.slice(firstBracket, lastBracket + 1)); } catch (_) {}
    }
    throw new Error('无法从模型输出中提取 JSON，请让模型仅输出 JSON');
};

export default function AIQuestionModal({ show, onClose, onUploadComplete }) {
    const [subjectName, setSubjectName] = useState('');
    const [shortName, setShortName] = useState('');
    const [icon, setIcon] = useState('🤖');
    const [questionCount, setQuestionCount] = useState('20');
    const [materialText, setMaterialText] = useState('');
    const [generatedText, setGeneratedText] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const materialInputRef = useRef(null);

    const reset = () => {
        setSubjectName('');
        setShortName('');
        setIcon('🤖');
        setQuestionCount('20');
        setMaterialText('');
        setGeneratedText('');
        setError('');
        setLoading(false);
        if (materialInputRef.current) materialInputRef.current.value = '';
    };

    const getPrompt = () => `请根据我提供的资料，生成 ${Math.max(1, Number(questionCount) || 20)} 道中文题目用于大学生刷题。只输出 JSON。
格式：
{
  "questions": [{
    "type": "single | multiple | judgment | fill | big",
    "question": "题干",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "answer": "A 或 AB 或 正确/错误 或 填空答案文本",
    "explanation": "解析",
    "category": "章节或知识点"
  }]
}
规则：single/multiple 用字母答案；judgment 只能正确/错误；fill/big 必须给答案；尽量按章节分类，避免重复。
资料：
${materialText || '（无资料，请基于创新创业基础常见知识点生成）'}`;

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(getPrompt());
            alert('提示词已复制');
        } catch (_) {
            setError('复制失败，请手动复制');
        }
    };

    const handleMaterialUpload = async (file) => {
        if (!file) return;
        try {
            const text = await file.text();
            setMaterialText(prev => prev ? `${prev}\n\n${text}` : text);
        } catch (_) {
            setError('资料读取失败，请上传文本文件');
        } finally {
            if (materialInputRef.current) materialInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!subjectName.trim()) return setError('请输入学科名称');
        const cfg = loadApiSettings();
        if (!cfg?.apiBaseUrl || !cfg?.apiKey || !cfg?.apiModel) return setError('请先在“API 设置”里完成配置');
        setLoading(true);
        setError('');
        try {
            const base = String(cfg.apiBaseUrl).replace(/\/+$/, '');
            const resp = await fetch(`${base}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${String(cfg.apiKey).trim()}`
                },
                body: JSON.stringify({
                    model: String(cfg.apiModel).trim(),
                    temperature: Number(cfg.apiTemperature) || 0.7,
                    max_tokens: Number(cfg.apiMaxTokens) || 4096,
                    messages: [
                        { role: 'system', content: '你是出题助手。只返回 JSON。' },
                        { role: 'user', content: getPrompt() }
                    ]
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error?.message || `请求失败 (${resp.status})`);
            const content = data?.choices?.[0]?.message?.content || '';
            if (!content) throw new Error('模型没有返回内容');
            setGeneratedText(content);
        } catch (err) {
            setError(err.message || '生成失败');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = () => {
        if (!subjectName.trim()) return setError('请输入学科名称');
        if (!generatedText.trim()) return setError('请先生成或粘贴模型输出');
        try {
            const subjectId = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            const parsedBank = parseCustomJson(extractJsonFromText(generatedText), subjectId);
            const totalQ = Object.values(parsedBank).flat().length;
            if (!totalQ) throw new Error('未解析到有效题目');
            const numericBank = {};
            const lectures = Object.entries(parsedBank).map(([catName, questions], idx) => {
                const chId = idx + 1;
                numericBank[chId] = questions.map(q => ({ ...q, category: catName, lectureId: chId }));
                return { id: chId, name: catName };
            });
            const displayName = subjectName.trim();
            onUploadComplete({
                id: subjectId,
                name: displayName,
                shortName: shortName.trim() || displayName,
                icon,
                isCustom: true,
                lectures
            }, numericBank);
            reset();
            onClose();
            setTimeout(() => alert(`AI 题库导入成功：${displayName}，共 ${totalQ} 题`), 100);
        } catch (err) {
            setError(err.message || '导入失败');
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full h-[100dvh] sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6 flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">AI 出题导入</h2>
                        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">独立配置 API，生成后直接导入本地题库</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
                </div>
                <div className="p-5 sm:p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                    <input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="学科名称 *" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                        <input value={shortName} onChange={e => setShortName(e.target.value)} placeholder="简称（可选）" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                        <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="图标（如 🤖）" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                    </div>
                    <input value={questionCount} onChange={e => setQuestionCount(e.target.value)} placeholder="题目数" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                    <label className="block border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-500 cursor-pointer">
                        上传资料文本（txt/md/json/csv）
                        <input ref={materialInputRef} type="file" className="hidden" onChange={e => handleMaterialUpload(e.target.files?.[0])} />
                    </label>
                    <textarea value={materialText} onChange={e => setMaterialText(e.target.value)} placeholder="资料文本（可手动粘贴）" rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                    <div className="flex gap-2">
                        <button onClick={handleCopyPrompt} className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1"><Copy size={14} />复制提示词</button>
                        <button onClick={handleGenerate} disabled={loading} className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">{loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}直连生成</button>
                    </div>
                    <textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)} placeholder="粘贴模型输出（支持 ```json）" rows={8} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
                    <button onClick={handleImport} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">导入模型输出为题库</button>
                </div>
            </div>
        </div>
    );
}
