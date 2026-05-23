import { useState, useRef } from 'react';
import {
    UploadCloud, X, FileUp, AlertCircle, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const parseOldFormatData = (rows, subjectId) => {
    const cleanRows = rows.filter(r => r && r.length > 0);
    if (cleanRows.length === 0) return {};
    let startIndex = 0;
    const h = cleanRows[0];
    if (h && (String(h[0]).includes('目录') || String(h[1]).includes('题目类型'))) startIndex = 1;
    
    const parsedBank = {};
    for (let i = startIndex; i < cleanRows.length; i++) {
        const row = cleanRows[i];
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
        const isFill = typeCheck.includes('填空');
        const isBig = typeCheck.includes('大题') || mainType.includes('大题') || typeCheck.includes('简答') || mainType.includes('简答');
        
        let qText = subQ;
        if (bigQ && bigQ !== subQ) {
            if (!subQ) qText = bigQ;
            else qText = `【背景】${bigQ}\n\n${subQ}`;
        }
        if (!qText && bigQ) qText = bigQ;
        if (!qText) qText = "题目内容缺失";
        
        let options = [];
        let rawAnswer = [];
        if (isFill || isBig) {
            const fillAns = String(row[11] || "").trim();
            const explicitAns = fillAns || ansRaw;
            options = [explicitAns || "（暂无标准答案，点击查看解析）"];
            rawAnswer = [0];
            if (isFill) type = 'fill';
            else if (isBig) type = 'big';
        } else if (type === 'judgment') {
            const optA = String(row[11] || "").trim();
            const optB = String(row[12] || "").trim();
            if (optA || optB) {
                if (optA) options.push(optA);
                if (optB) options.push(optB);
            } else {
                options = ['正确', '错误'];
            }
            if (/^[对TtA√Yes]/.test(ansRaw) || ansRaw === '正确') rawAnswer = [0];
            else if (/^[错FfB×No]/.test(ansRaw) || ansRaw === '错误') rawAnswer = [1];
            else {
                if (ansRaw.toUpperCase() === 'A') rawAnswer = [0];
                else rawAnswer = [1];
            }
        } else {
            const optIndices = [11, 12, 13, 14, 15, 16, 17, 18];
            options = optIndices.map(idx => String(row[idx] || "").trim()).filter(Boolean);
            if (options.length === 0) continue;
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
        
        let displayCat = categoryRaw;
        if (displayCat.includes('/')) {
            const parts = displayCat.split('/');
            if (parts.length > 0) displayCat = parts[parts.length - 1];
        }
        if (!displayCat) displayCat = "默认章节";
        
        if (!parsedBank[displayCat]) parsedBank[displayCat] = [];
        parsedBank[displayCat].push({
            id: `${subjectId}-Q${i}`,
            type,
            question: qText,
            options,
            rawAnswer,
            explanation: exp || "暂无解析",
            category: displayCat
        });
    }
    return parsedBank;
};

const parseCustomJson = (jsonData, subjectId) => {
    let parsedBank = {};
    let questionIndex = 1;

    const processQuestion = (q, index) => {
        const questionText = String(
            q.question || q.题干 || q.stem || q.content || q.title || q.text || q.题目 || ''
        ).trim();
        if (!questionText) return null;

        let type = 'single';
        const typeRaw = String(
            q.type || q.题型 || q.题型名称 || q.questionType || q.category || ''
        ).trim().toLowerCase();
        
        if (typeRaw.includes('多选') || typeRaw.includes('multiple') || typeRaw === '2') {
            type = 'multiple';
        } else if (typeRaw.includes('判断') || typeRaw.includes('judge') || typeRaw.includes('judgment') || typeRaw === '4') {
            type = 'judgment';
        } else if (typeRaw.includes('填空') || typeRaw.includes('fill') || typeRaw === '7') {
            type = 'fill';
        } else if (typeRaw.includes('大题') || typeRaw.includes('简答') || typeRaw.includes('essay') || typeRaw.includes('big')) {
            type = 'big';
        }

        let options = [];
        let rawAnswer = [];

        const rawOpts = q.options || q.选项 || q.choices || q.answers || null;
        let optionsKeys = [];
        if (Array.isArray(rawOpts)) {
            options = rawOpts.map(String).map(s => s.trim());
        } else if (typeof rawOpts === 'object' && rawOpts !== null) {
            optionsKeys = Object.keys(rawOpts).sort();
            options = optionsKeys.map(k => String(rawOpts[k] || '').trim());
        }

        if (options.length === 0) {
            const tempOpts = [];
            const possibleKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            possibleKeys.forEach(k => {
                const val = q[k] || q[`选项${k}`] || q[`opt${k}`] || q[`option${k}`];
                if (val !== undefined && val !== null) {
                    const strVal = String(val).trim();
                    if (strVal !== '') {
                        tempOpts.push({ key: k, value: strVal });
                    }
                }
            });
            if (tempOpts.length > 0) {
                optionsKeys = tempOpts.map(o => o.key);
                options = tempOpts.map(o => o.value);
            }
        }

        const ansRaw = (q.answer !== undefined && q.answer !== null) ? q.answer :
                       ((q.正确答案 !== undefined && q.正确答案 !== null) ? q.正确答案 :
                       ((q.rawAnswer !== undefined && q.rawAnswer !== null) ? q.rawAnswer :
                       ((q.答案 !== undefined && q.答案 !== null) ? q.答案 : '')));

        if (type === 'judgment') {
            options = ['正确', '错误'];
            const ansStr = String(ansRaw).trim().toUpperCase();
            if (ansStr === 'B' || /^(对|√|正确|TRUE|T)$/.test(ansStr) || ansRaw === true || ansRaw === 0) {
                rawAnswer = [0];
            } else if (ansStr === 'A' || /^(错|×|错误|FALSE|F)$/.test(ansStr) || ansRaw === false || ansRaw === 1) {
                rawAnswer = [1];
            } else {
                rawAnswer = [0];
            }
        } else if (type === 'fill' || type === 'big') {
            options = [String(ansRaw || q.解析 || q.explanation || '点击查看解析')];
            rawAnswer = [0];
        } else {
            if (typeof ansRaw === 'number') {
                rawAnswer = [ansRaw];
            } else if (Array.isArray(ansRaw)) {
                rawAnswer = ansRaw.map(Number).filter(n => !isNaN(n));
            } else {
                const ansStr = String(ansRaw).trim().toUpperCase();
                if (optionsKeys.length > 0) {
                    const parts = ansStr.split(/[^a-zA-Z0-9]+/).map(s => s.trim()).filter(Boolean);
                    parts.forEach(part => {
                        const idx = optionsKeys.indexOf(part);
                        if (idx >= 0) rawAnswer.push(idx);
                    });
                    
                    if (rawAnswer.length === 0) {
                        for (let i = 0; i < ansStr.length; i++) {
                            const char = ansStr[i];
                            const idx = optionsKeys.indexOf(char);
                            if (idx >= 0) rawAnswer.push(idx);
                        }
                    }
                }
                
                if (rawAnswer.length === 0) {
                    const parts = ansStr.split(/[^a-zA-Z0-9]+/).map(s => s.trim()).filter(Boolean);
                    parts.forEach(part => {
                        if (part.length === 1 && part >= 'A' && part <= 'H') {
                            const idx = part.charCodeAt(0) - 65;
                            if (idx >= 0 && idx < options.length) rawAnswer.push(idx);
                        }
                    });
                    
                    if (rawAnswer.length === 0) {
                        const letters = ansStr.replace(/[^A-H]/g, '');
                        for (let i = 0; i < letters.length; i++) {
                            const idx = letters.charCodeAt(i) - 65;
                            if (idx >= 0 && idx < options.length) rawAnswer.push(idx);
                        }
                    }
                }
                
                if (rawAnswer.length === 0) {
                    const numMatch = ansStr.match(/\d+/g);
                    if (numMatch) {
                        rawAnswer = numMatch.map(Number).filter(n => n >= 0 && n < options.length);
                    }
                }
            }

            if (type === 'single' && rawAnswer.length > 1) {
                type = 'multiple';
            }
        }

        const category = String(q.category || q.章节 || q.章节名称 || q.分类 || q.来源章节 || '默认章节').trim();
        const explanation = String(q.explanation || q.解析 || q.答案解析 || q.analysis || q.详解 || '暂无解析').trim();

        return {
            id: `${subjectId}-Q${index}`,
            type,
            question: questionText,
            options,
            rawAnswer: Array.from(new Set(rawAnswer)).sort((a, b) => a - b),
            explanation,
            category
        };
    };

    let questionsList = [];
    if (jsonData && Array.isArray(jsonData.questions)) {
        questionsList = jsonData.questions;
    } else if (Array.isArray(jsonData)) {
        questionsList = jsonData;
    } else if (typeof jsonData === 'object' && jsonData !== null) {
        Object.keys(jsonData).forEach(cat => {
            const qs = jsonData[cat];
            if (Array.isArray(qs)) {
                qs.forEach(q => {
                    const parsedQ = processQuestion(q, questionIndex++);
                    if (parsedQ) {
                        const finalCat = String(q.category || q.章节 || q.章节名称 || q.分类 || cat).trim();
                        if (!parsedBank[finalCat]) parsedBank[finalCat] = [];
                        parsedBank[finalCat].push({ ...parsedQ, category: finalCat });
                    }
                });
            }
        });
        return parsedBank;
    }

    questionsList.forEach(q => {
        const parsedQ = processQuestion(q, questionIndex++);
        if (parsedQ) {
            const cat = parsedQ.category;
            if (!parsedBank[cat]) parsedBank[cat] = [];
            parsedBank[cat].push(parsedQ);
        }
    });

    return parsedBank;
};

const parseCustomExcel = (rawData, subjectId) => {
    const cleanRows = rawData.filter(r => r && r.length > 0);
    if (cleanRows.length === 0) return {};

    const firstRowStr = JSON.stringify(cleanRows[0]);
    const isOldFormat = cleanRows[0] && (
        String(cleanRows[0][0] || '').includes('目录') || 
        String(cleanRows[0][1] || '').includes('题目类型') ||
        firstRowStr.includes('题目小题')
    );
    if (isOldFormat) {
        return parseOldFormatData(cleanRows, subjectId);
    }

    let parsedBank = {};
    let startIndex = 0;
    
    if (firstRowStr.includes("题型") || firstRowStr.includes("题干") || firstRowStr.includes("题目") || firstRowStr.includes("类型") || firstRowStr.includes("答案")) {
        startIndex = 1;
    }

    let typeCol = 0;
    let questionCol = 1;
    let answerCol = 2;
    let explanationCol = 3;
    let categoryCol = -1;
    let optionCols = [];

    if (startIndex === 1) {
        const header = cleanRows[0].map(v => String(v || '').trim());
        
        header.forEach((val, idx) => {
            const vUpper = val.toUpperCase();
            if ((val.includes("题型") || val.includes("类型") || vUpper.includes("TYPE")) && !val.includes("选项") && !val.includes("答案")) {
                typeCol = idx;
            } else if (val.includes("题干") || val.includes("题目") || val.includes("内容") || val.includes("问题") || vUpper.includes("STEM") || vUpper.includes("QUESTION")) {
                questionCol = idx;
            } else if ((val.includes("答案") || val.includes("正确答案") || vUpper.includes("ANSWER")) && !val.includes("选项")) {
                answerCol = idx;
            } else if (val.includes("解析") || val.includes("详解") || vUpper.includes("EXPLANATION") || vUpper.includes("ANALYSIS")) {
                explanationCol = idx;
            } else if (val.includes("章节") || val.includes("分类") || val.includes("课时") || vUpper.includes("CATEGORY")) {
                categoryCol = idx;
            }
        });

        header.forEach((val, idx) => {
            const vUpper = val.toUpperCase();
            if (val.includes("选项") || /^[A-H]$/.test(vUpper) || vUpper.startsWith("OPT") || vUpper.startsWith("CHOICE")) {
                optionCols.push(idx);
            }
        });
        optionCols.sort((a, b) => a - b);
    }

    for (let i = startIndex; i < cleanRows.length; i++) {
        const row = cleanRows[i];
        if (!row || row.length === 0) continue;

        const typeRaw = typeCol < row.length ? String(row[typeCol] || "").trim() : "";
        const content = questionCol < row.length ? String(row[questionCol] || "").trim() : "";
        const answerRaw = answerCol < row.length ? String(row[answerCol] || "").trim() : "";
        const explanation = explanationCol < row.length ? String(row[explanationCol] || "").trim() : "";
        const category = (categoryCol !== -1 && categoryCol < row.length) ? String(row[categoryCol] || "默认章节").trim() : "默认章节";

        if (!content) continue;

        let type = 'single';
        if (typeRaw.includes("多选") || typeRaw.includes("multiple")) type = 'multiple';
        else if (typeRaw.includes("判断") || typeRaw.includes("judgment") || typeRaw.includes("judge")) type = 'judgment';
        else if (typeRaw.includes("填空") || typeRaw.includes("fill")) type = 'fill';
        else if (typeRaw.includes("简答") || typeRaw.includes("大题") || typeRaw.includes("essay") || typeRaw.includes("big")) type = 'big';

        let options = [];
        let correctAnswers = [];

        if (type === 'judgment') {
            options = ['正确', '错误'];
            const ansStr = answerRaw.trim().toUpperCase();
            if (/^[对Tt√正确]/.test(ansStr) || ansStr === 'B' || ansStr === '正确') {
                correctAnswers = [0];
            } else if (/^[错Ff×错误]/.test(ansStr) || ansStr === 'A' || ansStr === '错误') {
                correctAnswers = [1];
            } else {
                correctAnswers = [0];
            }
        } else if (type === 'fill' || type === 'big') {
            options = [answerRaw || "（暂无标准答案，点击查看解析）"];
            correctAnswers = [0];
        } else {
            if (optionCols.length > 0) {
                options = optionCols.map(idx => idx < row.length ? String(row[idx] || '').trim() : '').filter(Boolean);
            } else {
                let col = Math.max(typeCol, questionCol, answerCol, explanationCol) + 1;
                if (col < row.length) {
                    while (col < row.length && row[col] !== undefined && row[col] !== null && String(row[col]).trim() !== '') {
                        options.push(String(row[col]).trim());
                        col++;
                    }
                }
                if (options.length === 0) {
                    const defaultOptIndices = [6, 7, 8, 9, 10];
                    options = defaultOptIndices.map(idx => idx < row.length ? String(row[idx] || '').trim() : '').filter(Boolean);
                }
            }

            if (options.length === 0) continue;

            const normalizedAns = answerRaw.toUpperCase().replace(/[^A-H]/g, '');
            for (let char of normalizedAns) {
                const idx = char.charCodeAt(0) - 65;
                if (idx >= 0 && idx < options.length) correctAnswers.push(idx);
            }

            if (type === 'single' && correctAnswers.length > 1) {
                type = 'multiple';
            }
        }

        if (!parsedBank[category]) parsedBank[category] = [];
        parsedBank[category].push({
            id: `${subjectId}-Q${i}`,
            type,
            question: content,
            options,
            rawAnswer: Array.from(new Set(correctAnswers)).sort((a, b) => a - b),
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg md:max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl transition-all duration-300" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6 flex justify-between items-start z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                            <UploadCloud size={22} className="sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">上传自定义题库</h2>
                            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500">纯离线解析，数据安全地保存在本地</p>
                        </div>
                    </div>
                    <button onClick={handleClose} disabled={uploading} className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0">
                        <X size={18} className="text-slate-400 sm:w-5 sm:h-5" />
                    </button>
                </div>

                <div className="p-5 sm:p-6 flex flex-col md:grid md:grid-cols-2 md:gap-8 md:items-start space-y-5 md:space-y-0">
                    {error && (
                        <div className="md:col-span-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-center gap-3">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* 左侧栏：学科配置栏 */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">学科名称 *</label>
                            <input type="text" placeholder="例如：高等数学、大学物理" value={subjectName} onChange={e => setSubjectName(e.target.value)} disabled={uploading}
                                   className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">简称（可选）</label>
                            <input type="text" placeholder="例如：高数、大物" value={shortName} onChange={e => setShortName(e.target.value)} disabled={uploading}
                                   className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">图标选择（可选）</label>
                            <div className="flex gap-2 flex-wrap max-h-[120px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl no-scrollbar">
                                {['📚', '📖', '📝', '✏️', '🔬', '🧮', '💻', '⚛️', '🎨', '🌍', '📐', '🔭', '🧬', '🏛️', '📊'].map(emoji => (
                                    <button key={emoji} type="button" onClick={() => setIcon(emoji)} disabled={uploading}
                                            className={'w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all ' + (icon === emoji ? 'bg-blue-100 dark:bg-blue-950/60 border-2 border-blue-500 scale-105 shadow-sm' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700')}>
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 右侧栏：文件与提交区 */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">题库文件 *</label>
                            <label className={'block border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ' + (file ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800/60' : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50')}>
                                <input ref={fileInputRef} type="file" accept=".json,.xlsx,.xls" onChange={e => setFile(e.target.files[0])} disabled={uploading} className="hidden" />
                                {file ? (
                                    <div className="space-y-1">
                                        <FileUp size={24} className="mx-auto text-blue-500 animate-bounce" />
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[220px] mx-auto">{file.name}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <UploadCloud size={24} className="mx-auto text-slate-400 dark:text-slate-500" />
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">点击选择文件</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">支持 JSON、Excel (.xlsx / .xls)</p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 space-y-0.5">
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>导入指南</span>
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
                                Excel 须含"题型"、"题干"、"答案"等列名。JSON 支持以章节名为键的键值数组或直接以题目为元素的平面数组，系统将智能提取。
                            </p>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button onClick={handleClose} disabled={uploading}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm">
                                取消
                            </button>
                            <button onClick={handleUpload} disabled={uploading || !file || !subjectName.trim()}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 dark:shadow-blue-900/20">
                                {uploading ? <><Loader2 size={16} className="animate-spin" /> 正在解析...</> : <><UploadCloud size={16} /> 上传并解析</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

