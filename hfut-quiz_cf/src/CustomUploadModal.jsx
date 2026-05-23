import { useState, useRef } from 'react';
import {
    UploadCloud, X, FileUp, AlertCircle, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const parseCustomJson = (jsonData, subjectId) => {
    let parsedBank = {};
    let questionIndex = 1;

    const processQuestion = (q, index) => {
        const questionText = String(q.question || q.题干 || q.content || '').trim();
        if (!questionText) return null;

        let type = 'single';
        const typeRaw = String(q.type || q.题型 || q.题型名称 || '').trim();
        if (typeRaw.includes('多选') || typeRaw === 'multiple' || typeRaw === '2') {
            type = 'multiple';
        } else if (typeRaw.includes('判断') || typeRaw === 'judgment' || typeRaw === '4') {
            type = 'judgment';
        } else if (typeRaw.includes('填空') || typeRaw === 'fill' || typeRaw === '7') {
            type = 'fill';
        } else if (typeRaw.includes('大题') || typeRaw.includes('简答') || typeRaw === 'big' || typeRaw === 'essay') {
            type = 'big';
        }

        let options = [];
        let rawAnswer = [];

        if (type === 'judgment') {
            options = ['正确', '错误'];
            const ansRaw = String(q.answer || q.正确答案 || q.rawAnswer || q.答案 || '');
            rawAnswer = /^[对TtA√正确]/.test(ansRaw) ? [0] : [1];
        } else if (type === 'fill' || type === 'big') {
            const ansRaw = String(q.answer || q.正确答案 || q.rawAnswer || q.答案 || '');
            options = [ansRaw || '点击查看解析'];
            rawAnswer = [0];
        } else {
            const rawOpts = q.options || q.选项 || [];
            if (Array.isArray(rawOpts)) {
                options = rawOpts.map(String);
            } else if (typeof rawOpts === 'object' && rawOpts !== null) {
                const keys = Object.keys(rawOpts).sort();
                options = keys.map(k => rawOpts[k]);
            }
            if (options.length === 0) {
                const optA = q.A || q.选项A || q.optA;
                const optB = q.B || q.选项B || q.optB;
                const optC = q.C || q.选项C || q.optC;
                const optD = q.D || q.选项D || q.optD;
                const optE = q.E || q.选项E || q.optE;
                options = [optA, optB, optC, optD, optE].filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(String);
            }
            const ansRaw = q.answer || q.正确答案 || q.rawAnswer || q.答案 || '';
            if (Array.isArray(ansRaw)) {
                rawAnswer = ansRaw.map(Number).filter(n => !isNaN(n));
            } else {
                const ansStr = String(ansRaw).toUpperCase().replace(/[^A-E]/g, '');
                for (let i = 0; i < ansStr.length; i++) {
                    const idx = ansStr.charCodeAt(i) - 65;
                    if (idx >= 0 && idx < options.length) {
                        rawAnswer.push(idx);
                    }
                }
            }
        }

        const category = String(q.category || q.章节 || q.章节名称 || '默认章节').trim();
        const explanation = String(q.explanation || q.解析 || q.答案解析 || '暂无解析').trim();

        return {
            id: `${subjectId}-Q${index}`,
            type,
            question: questionText,
            options,
            rawAnswer: rawAnswer.sort((a, b) => a - b),
            explanation,
            category
        };
    };

    if (Array.isArray(jsonData)) {
        jsonData.forEach(q => {
            const parsedQ = processQuestion(q, questionIndex++);
            if (parsedQ) {
                const cat = parsedQ.category;
                if (!parsedBank[cat]) parsedBank[cat] = [];
                parsedBank[cat].push(parsedQ);
            }
        });
    } else if (typeof jsonData === 'object' && jsonData !== null) {
        Object.keys(jsonData).forEach(cat => {
            const qs = jsonData[cat];
            if (Array.isArray(qs)) {
                qs.forEach(q => {
                    const parsedQ = processQuestion(q, questionIndex++);
                    if (parsedQ) {
                        const finalCat = String(q.category || q.章节 || q.章节名称 || cat).trim();
                        if (!parsedBank[finalCat]) parsedBank[finalCat] = [];
                        parsedBank[finalCat].push({ ...parsedQ, category: finalCat });
                    }
                });
            }
        });
    }

    return parsedBank;
};

const parseCustomExcel = (rawData, subjectId) => {
    const cleanRows = rawData.filter(r => r && r.length > 0);
    if (cleanRows.length === 0) return {};

    let parsedBank = {};
    let startIndex = 0;
    const firstRowStr = JSON.stringify(cleanRows[0]);
    if (firstRowStr.includes("题型") || firstRowStr.includes("题干") || firstRowStr.includes("题目") || firstRowStr.includes("类型")) {
        startIndex = 1;
    }

    let typeCol = 0, questionCol = 1, answerCol = 2, explanationCol = 3, categoryCol = -1, optionStartCol = 6;

    if (startIndex === 1) {
        const header = cleanRows[0].map(v => String(v || '').trim());
        header.forEach((val, idx) => {
            if (val.includes("题型") || val.includes("类型")) typeCol = idx;
            else if (val.includes("题干") || val.includes("题目") || val.includes("内容") || val.includes("问题")) questionCol = idx;
            else if (val.includes("答案") || val.includes("正确答案")) answerCol = idx;
            else if (val.includes("解析") || val.includes("详解")) explanationCol = idx;
            else if (val.includes("章节") || val.includes("分类") || val.includes("课时")) categoryCol = idx;
        });

        const opts = [];
        header.forEach((val, idx) => {
            if (val.includes("选项") || /^[A-E]$/.test(val) || val.startsWith("opt")) opts.push(idx);
        });
        if (opts.length > 0) optionStartCol = opts[0];
    }

    for (let i = startIndex; i < cleanRows.length; i++) {
        const row = cleanRows[i];
        const typeRaw = String(row[typeCol] || "").trim();
        const content = String(row[questionCol] || "").trim();
        const answerRaw = String(row[answerCol] || "").trim();
        const explanation = String(row[explanationCol] || "").trim();
        const category = categoryCol !== -1 ? String(row[categoryCol] || "默认章节").trim() : "默认章节";

        if (!content) continue;

        let type = 'single';
        if (typeRaw.includes("多选")) type = 'multiple';
        else if (typeRaw.includes("判断")) type = 'judgment';
        else if (typeRaw.includes("填空")) type = 'fill';
        else if (typeRaw.includes("简答") || typeRaw.includes("大题")) type = 'big';

        let options = [];
        let correctAnswers = [];

        if (type === 'judgment') {
            options = ['正确', '错误'];
            if (/^[对TtA√正确]/.test(answerRaw)) correctAnswers = [0];
            else if (/^[错FfB×错误]/.test(answerRaw)) correctAnswers = [1];
            else correctAnswers = [0];
        } else if (type === 'fill' || type === 'big') {
            options = [answerRaw || "点击查看解析"];
            correctAnswers = [0];
        } else {
            let col = optionStartCol;
            while (col < row.length && row[col] !== undefined && row[col] !== null && String(row[col]).trim() !== '') {
                options.push(String(row[col]).trim());
                col++;
            }
            if (options.length === 0) {
                options = [row[6], row[7], row[8], row[9], row[10]].filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(String);
            }
            const normalizedAns = answerRaw.toUpperCase().replace(/[^A-E]/g, '');
            for (let char of normalizedAns) {
                const idx = char.charCodeAt(0) - 65;
                if (idx >= 0 && idx < options.length) correctAnswers.push(idx);
            }
        }

        if (options.length === 0) continue;

        if (!parsedBank[category]) parsedBank[category] = [];
        parsedBank[category].push({
            id: `${subjectId}-Q${i}`,
            type,
            question: content,
            options,
            rawAnswer: correctAnswers.sort((a, b) => a - b),
            explanation: explanation || "暂无解析",
            category
        });
    }

    return parsedBank;
};

export default function CustomUploadModal({ show, onClose, onUploadComplete }) {
    const [subjectName, setSubjectName] = useState('');
    const [shortName, setShortName] = useState('');
    const [icon, setIcon] = useState('📚');
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const reset = () => {
        setSubjectName('');
        setShortName('');
        setIcon('📚');
        setFile(null);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        if (uploading) return;
        reset();
        onClose();
    };

    const handleUpload = async () => {
        if (!file) { setError('请选择题库文件'); return; }
        if (!subjectName.trim()) { setError('请输入学科名称'); return; }

        setUploading(true);
        setError('');

        try {
            const subjectId = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            const fileName = file.name.toLowerCase();
            let parsedBank = {};

            if (fileName.endsWith('.json')) {
                const text = await file.text();
                const jsonData = JSON.parse(text);
                parsedBank = parseCustomJson(jsonData, subjectId);
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                const buf = await file.arrayBuffer();
                const wb = XLSX.read(buf, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
                parsedBank = parseCustomExcel(raw, subjectId);
            } else {
                throw new Error('不支持的文件格式，请使用 JSON (.json) 或 Excel (.xlsx / .xls) 文件');
            }

            const totalQ = Object.values(parsedBank).flat().length;
            if (totalQ === 0) throw new Error('未解析到有效题目，请检查文件内容格式');

            const chapterEntries = Object.entries(parsedBank);
            const numericBank = {};
            const lectures = [];
            chapterEntries.forEach(([catName, questions], idx) => {
                const chId = idx + 1;
                numericBank[chId] = questions.map(q => ({ ...q, category: catName, lectureId: chId }));
                lectures.push({ id: chId, name: catName });
            });

            const displayName = subjectName.trim();
            onUploadComplete({
                id: subjectId,
                name: displayName,
                shortName: shortName.trim() || displayName,
                icon: icon,
                isCustom: true,
                lectures: lectures,
                getChapters: (bank) => lectures.filter(l => bank[l.id]?.length),
                getChapterName: (id) => lectures.find(l => l.id === id)?.name || ('章节' + id),
                questionBank: numericBank
            }, numericBank);

            reset();
            onClose();
            setTimeout(() => alert('成功导入"' + displayName + '"，共 ' + totalQ + ' 道题目（' + lectures.length + ' 个章节）'), 100);
        } catch (err) {
            setError(err.message || '上传失败');
        } finally {
            setUploading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
            <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-start z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <UploadCloud size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">上传自定义题库</h2>
                            <p className="text-sm text-slate-400">纯离线解析，数据仅保存在本地</p>
                        </div>
                    </div>
                    <button onClick={handleClose} disabled={uploading} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">学科名称 *</label>
                        <input type="text" placeholder="例如：高等数学、大学物理" value={subjectName} onChange={e => setSubjectName(e.target.value)} disabled={uploading}
                               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">简称（可选）</label>
                        <input type="text" placeholder="例如：高数、大物" value={shortName} onChange={e => setShortName(e.target.value)} disabled={uploading}
                               className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">图标（可选）</label>
                        <div className="flex gap-2 flex-wrap">
                            {['📚', '📖', '📝', '✏️', '🔬', '🧮', '💻', '⚛️', '🎨', '🌍', '📐', '🔭', '🧬', '🏛️', '📊'].map(emoji => (
                                <button key={emoji} type="button" onClick={() => setIcon(emoji)} disabled={uploading}
                                        className={'w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ' + (icon === emoji ? 'bg-blue-100 border-2 border-blue-500 scale-110 shadow-sm' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100')}>
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">题库文件 *</label>
                        <label className={'block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ' + (file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50')}>
                            <input ref={fileInputRef} type="file" accept=".json,.xlsx,.xls" onChange={e => setFile(e.target.files[0])} disabled={uploading} className="hidden" />
                            {file ? (
                                <div className="space-y-2">
                                    <FileUp size={28} className="mx-auto text-blue-500" />
                                    <p className="text-sm font-bold text-slate-700">{file.name}</p>
                                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <UploadCloud size={28} className="mx-auto text-slate-400" />
                                    <p className="text-sm font-bold text-slate-600">点击选择文件</p>
                                    <p className="text-xs text-slate-400">支持 JSON、Excel (.xlsx / .xls) 格式</p>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                        <p className="text-xs font-bold text-amber-800">格式说明</p>
                        <p className="text-xs text-amber-700 leading-relaxed">
                            JSON 格式：{'{'}"章节名": [ {'{'} "question": "题干", "options": [...], "answer": "A" {'}'} ]{'}'}，
                            自动识别单选/多选/判断/填空/简答。Excel 表头需包含"题型"、"题干"、"答案"等列名。
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={handleClose} disabled={uploading}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm">
                            取消
                        </button>
                        <button onClick={handleUpload} disabled={uploading || !file || !subjectName.trim()}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                            {uploading ? <><Loader2 size={16} className="animate-spin" /> 正在解析...</> : <><UploadCloud size={16} /> 上传并解析</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
