import { useState, useRef } from 'react';
import {
    UploadCloud, X, FileUp, AlertCircle, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth/mammoth.browser';
import JSZip from 'jszip';

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

export const parseCustomJson = (jsonData, subjectId) => {
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
    let strictCorrectAnswerCol = -1;
    let explanationCol = -1;
    let categoryCol = -1;
    let optionCols = [];
    let questionCandidates = [];

    if (startIndex === 1) {
        const header = cleanRows[0].map(v => String(v || '').trim());
        
        header.forEach((val, idx) => {
            const vUpper = val.toUpperCase();
            if ((val.includes("题型") || val.includes("类型") || vUpper.includes("TYPE")) && !val.includes("选项") && !val.includes("答案")) {
                typeCol = idx;
            } else if (val.includes("题干") || val.includes("题目") || val.includes("内容") || val.includes("问题") || vUpper.includes("STEM") || vUpper.includes("QUESTION")) {
                questionCol = idx;
                questionCandidates.push(idx);
            } else if ((val.includes("正确答案") || vUpper.includes("CORRECTANSWER") || vUpper.includes("RIGHTANSWER")) && !val.includes("选项")) {
                strictCorrectAnswerCol = idx;
                answerCol = idx;
            } else if ((val.includes("答案") || vUpper.includes("ANSWER")) && !val.includes("选项")) {
                // 仅在还未锁定“正确答案”列时使用通用答案列，避免误命中“我的答案”
                if (strictCorrectAnswerCol === -1 && !val.includes("我的答案")) {
                    answerCol = idx;
                }
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
        if (!questionCandidates.length) questionCandidates = [questionCol];
    }

    const isPlaceholderText = (s) => /^[_\-—=~·•.。]+$/.test(s) || /^(暂无|无|n\/a|null)$/i.test(s);
    const normalizeQuestionText = (s) => {
        return String(s || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/^(\d+\s*[\.、:：\)]\s*)/, '')
            .replace(/^\(?\s*(单选题|多选题|判断题|填空题|简答题)\s*\)?/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };
    const pickQuestionContent = (row) => {
        const indices = Array.from(new Set([questionCol, ...questionCandidates, 1, 2]));
        for (const idx of indices) {
            if (idx < 0 || idx >= row.length) continue;
            const normalized = normalizeQuestionText(row[idx]);
            if (!normalized || isPlaceholderText(normalized)) continue;
            return normalized;
        }
        return '';
    };
    const normalizeAnswerText = (s) => String(s || '')
        .replace(/[Ａ-Ｈａ-ｈ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248))
        .replace(/\s+/g, '')
        .trim();
    const parseChoiceAnswer = (raw, optionsLen) => {
        const ans = normalizeAnswerText(raw);
        if (!ans) return [];
        // 常见前缀：答案: / 正确答案:
        const tail = ans.replace(/^(?:我的答案|正确答案|参考答案|答案)[:：]*/i, '');
        const fromLetters = (tail.match(/[A-H]/gi) || []).map(ch => ch.toUpperCase().charCodeAt(0) - 65);
        if (fromLetters.length) {
            return Array.from(new Set(fromLetters)).filter(i => i >= 0 && i < Math.max(optionsLen, 8)).sort((a, b) => a - b);
        }
        const nums = (tail.match(/\d+/g) || []).map(n => Number(n));
        if (nums.length) {
            const mapped = nums.map(n => n - 1).filter(i => i >= 0 && i < optionsLen);
            return Array.from(new Set(mapped)).sort((a, b) => a - b);
        }
        return [];
    };
    const pickAnswerRaw = (row) => {
        const direct = answerCol < row.length ? String(row[answerCol] || '').trim() : '';
        if (direct && !/^(?:我的答案[:：]?)?$/i.test(direct.replace(/\s+/g, ''))) return direct;
        // 兜底：整行搜索“正确答案: X”
        for (let i = 0; i < row.length; i++) {
            const cell = String(row[i] || '').trim();
            if (!cell) continue;
            if (/(?:^|[\s])(?:正确答案|参考答案|答案)\s*[:：]/.test(cell) && !/^我的答案/.test(cell)) {
                return cell;
            }
        }
        return direct;
    };

    for (let i = startIndex; i < cleanRows.length; i++) {
        const row = cleanRows[i];
        if (!row || row.length === 0) continue;

        const typeRaw = typeCol < row.length ? String(row[typeCol] || "").trim() : "";
        const content = pickQuestionContent(row);
        const answerRaw = pickAnswerRaw(row);
        const explanation = (explanationCol !== -1 && explanationCol < row.length)
            ? String(row[explanationCol] || "").trim()
            : "";
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
            const ansStr = normalizeAnswerText(answerRaw).replace(/^(?:我的答案|正确答案|参考答案|答案)[:：]*/i, '').toUpperCase();
            if (/^(对|√|正确|TRUE|T)$/.test(ansStr) || ansStr === 'B') {
                correctAnswers = [0];
            } else if (/^(错|×|错误|FALSE|F)$/.test(ansStr) || ansStr === 'A') {
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

            // 兼容“选项整列合并在一个单元格（A...B...C...D...）”的导出格式
            if (options.length === 1) {
                const merged = String(options[0] || '');
                const m = merged.match(/(?:^|\n|\s)[A-H]\s*[\.．、:：\)]\s*[\s\S]+/);
                if (m) {
                    const split = [];
                    const optionRegex = /(?:^|\n|\s)([A-H])\s*[\.\．、:：\)]\s*([\s\S]*?)(?=(?:\s+[A-H]\s*[\.\．、:：\)])|$)/g;
                    let om;
                    while ((om = optionRegex.exec(merged)) !== null) {
                        const txt = String(om[2] || '').replace(/\s+/g, ' ').trim();
                        if (txt) split.push(txt);
                    }
                    if (split.length >= 2) options = split;
                }
            }

            if (options.length === 0) continue;

            correctAnswers = parseChoiceAnswer(answerRaw, options.length);

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

const extractDocxRawTextFallback = async (arrayBuffer) => {
    try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const candidates = [
            'word/document.xml',
            'word/footnotes.xml',
            'word/endnotes.xml'
        ];
        let merged = '';
        for (const p of candidates) {
            const f = zip.file(p);
            if (!f) continue;
            const xml = await f.async('string');
            // 保留段落/换行边界，再提取文本节点
            const withBreaks = xml
                .replace(/<\/w:p>/g, '\n')
                .replace(/<w:br[^>]*\/>/g, '\n')
                .replace(/<w:tab[^>]*\/>/g, '\t');
            const texts = [];
            const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
            let m;
            while ((m = re.exec(withBreaks)) !== null) {
                texts.push(String(m[1] || ''));
            }
            merged += '\n' + texts.join('');
        }
        return merged
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\r/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    } catch (_) {
        return '';
    }
};

const parseCustomDocxText = (text, subjectId) => {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map(s => s.trim());
    if (!lines.length) return {};

    const parsedBank = {};
    let currentCategory = '默认章节';
    let currentType = 'single';
    let qIndex = 1;
    let currentBlock = [];
    let currentBlockHasAnswerLine = false;

    const normalizeTypeByText = (s = '') => {
        const t = String(s);
        if (/多选|多项/.test(t)) return 'multiple';
        if (/判断|是非|对错/.test(t)) return 'judgment';
        if (/填空/.test(t)) return 'fill';
        if (/简答|论述|大题|问答/.test(t)) return 'big';
        return 'single';
    };

    const parseAnswerToken = (token, qType) => {
        const ans = String(token || '').trim();
        if (!ans) return [];
        if (qType === 'judgment') {
            const u = ans.toUpperCase();
            if (/^(正确|对|√|T|TRUE|YES)$/.test(u)) return [0];
            if (/^(错误|错|×|F|FALSE|NO)$/.test(u)) return [1];
            return [];
        }
        const normalized = ans.toUpperCase().replace(/[^A-H]/g, '');
        if (!normalized) return [];
        return Array.from(new Set(normalized.split('').map(ch => ch.charCodeAt(0) - 65))).filter(i => i >= 0 && i < 8).sort((a, b) => a - b);
    };

    const extractAnswerFromBlock = (blockText) => {
        const ansLine = blockText.match(/(?:^|\n)\s*(?:答案|参考答案|正确答案)\s*[:：]\s*([A-Ha-h]{1,8}|正确|错误|对|错|√|×|T|F)\s*$/m);
        if (ansLine) return String(ansLine[1] || '').trim();
        const bracket = blockText.match(/[（(]\s*([A-Ha-h]{1,8}|正确|错误|对|错|√|×|T|F)\s*[)）]/);
        if (bracket) return String(bracket[1] || '').trim();
        return '';
    };

    const pushQuestionBlock = (blockLines) => {
        if (!blockLines.length) return;
        const merged = blockLines.join('\n').trim();
        if (!merged) return;

        const numberMatch = merged.match(/^\s*(?:第?\d+\s*[题\.、:]|\d+\s*[\.、:）\)]|[（(]?\d+[)）])\s*/);
        const body = numberMatch ? merged.slice(numberMatch[0].length).trim() : merged;
        if (!body) return;

        const ansRaw = extractAnswerFromBlock(body);
        const bodyNoAnswer = body
            .replace(/[（(]\s*([A-Ha-h]{1,8}|正确|错误|对|错|√|×|T|F)\s*[)）]/g, '（  ）')
            .replace(/(?:^|\n)\s*(?:答案|参考答案|正确答案)\s*[:：]\s*([A-Ha-h]{1,8}|正确|错误|对|错|√|×|T|F)\s*$/gm, '')
            .trim();

        const optionStart = bodyNoAnswer.search(/(?:^|\n|\s)([A-H])\s*[\.\．、:：\)]\s*/);
        let questionText = bodyNoAnswer;
        let optionsPart = '';
        if (optionStart >= 0) {
            questionText = bodyNoAnswer.slice(0, optionStart).trim();
            optionsPart = bodyNoAnswer.slice(optionStart).trim();
        }

        let type = currentType;
        let options = [];
        let rawAnswer = [];

        if (type === 'judgment') {
            options = ['正确', '错误'];
            rawAnswer = parseAnswerToken(ansRaw, 'judgment');
            if (!rawAnswer.length && /(正确|错误|对错|是非)/.test(questionText)) {
                rawAnswer = parseAnswerToken(ansRaw, 'judgment');
            }
            if (!rawAnswer.length && /(正确|对|√)\s*$/.test(body)) rawAnswer = [0];
            else if (!rawAnswer.length && /(错误|错|×)\s*$/.test(body)) rawAnswer = [1];
            if (!rawAnswer.length) rawAnswer = [0];
        } else if (type === 'fill' || type === 'big') {
            const explicitAns = String(ansRaw || '').trim();
            options = [explicitAns || '（暂无标准答案，点击查看解析）'];
            rawAnswer = [0];
        } else {
            if (optionsPart) {
                const optionRegex = /(?:^|\n|\s)([A-H])\s*[\.\．、:：\)]\s*([\s\S]*?)(?=(?:\s+[A-H]\s*[\.\．、:：\)])|$)/g;
                let m;
                while ((m = optionRegex.exec(optionsPart)) !== null) {
                    const optText = String(m[2] || '').replace(/\s+/g, ' ').trim();
                    if (optText) options.push(optText);
                }
            }
            if (!options.length) {
                const inline = bodyNoAnswer.match(/([A-H])\s*[\.\．、:：\)]\s*([^A-H]+)(?=(?:\s+[A-H]\s*[\.\．、:：\)])|$)/g) || [];
                options = inline.map(v => v.replace(/^[A-H]\s*[\.\．、:：\)]\s*/, '').trim()).filter(Boolean);
            }
            if (!options.length && /判断|是非|对错/.test(currentCategory + questionText)) {
                type = 'judgment';
                options = ['正确', '错误'];
                rawAnswer = parseAnswerToken(ansRaw, 'judgment');
                if (!rawAnswer.length) rawAnswer = [0];
            } else {
                rawAnswer = parseAnswerToken(ansRaw, type);
                if (type === 'single' && rawAnswer.length > 1) type = 'multiple';
                if (!options.length && (type === 'single' || type === 'multiple')) return;
            }
        }

        questionText = questionText
            .replace(/\s+/g, ' ')
            .replace(/(?:^|\s)(?:A|B|C|D|E|F|G|H)\s*[\.\．、:：\)]\s*$/, '')
            .trim();

        if (!questionText) return;
        if (!parsedBank[currentCategory]) parsedBank[currentCategory] = [];
        parsedBank[currentCategory].push({
            id: `${subjectId}-Q${qIndex++}`,
            type,
            question: questionText,
            options,
            rawAnswer,
            explanation: '暂无解析',
            category: currentCategory
        });
    };

    for (const line of lines) {
        const isBlank = !line;
        const isSeparator = /^=+$/.test(line);
        const isAnswerLine = /^(?:答案|参考答案|正确答案)\s*[:：]/.test(line);
        const isOptionLine = /^[A-H]\s*[\.\．、:：\)]\s*/.test(line);
        const isLikelyQuestionStartNoNumber = !isOptionLine && !isAnswerLine && !isSeparator
            && /[。？！?）)]\s*$/.test(line)
            && line.length >= 8;

        // 规则1：显式分隔线直接断题
        if (isSeparator) {
            if (currentBlock.length) {
                pushQuestionBlock(currentBlock);
                currentBlock = [];
                currentBlockHasAnswerLine = false;
            }
            continue;
        }

        if (/^[一二三四五六七八九十]+[、.．]/.test(line) && /题|选择|判断|填空|简答|论述|问答/.test(line)) {
            if (currentBlock.length) {
                pushQuestionBlock(currentBlock);
                currentBlock = [];
                currentBlockHasAnswerLine = false;
            }
            currentCategory = line;
            currentType = normalizeTypeByText(line);
            continue;
        }

        if (/^\s*(?:第?\d+\s*[题\.、:]|\d+\s*[\.、:）\)]|[（(]?\d+[)）])\s*/.test(line)) {
            if (currentBlock.length) pushQuestionBlock(currentBlock);
            currentBlock = [line];
            currentBlockHasAnswerLine = false;
        } else if (currentBlock.length) {
            // 规则2：已有答案行后，遇到空行/疑似新题行，断题重启
            if ((isBlank || isLikelyQuestionStartNoNumber) && currentBlockHasAnswerLine) {
                pushQuestionBlock(currentBlock);
                currentBlock = isBlank ? [] : [line];
                currentBlockHasAnswerLine = false;
                continue;
            }
            if (!isBlank) currentBlock.push(line);
            if (isAnswerLine) currentBlockHasAnswerLine = true;
        } else {
            // 无题号文档：把整段“题干 + 选项 + 答案”视作一个块
            if (!isBlank && (/[A-H]\s*[\.\．、:：\)]/.test(line) || /(?:答案|参考答案|正确答案)\s*[:：]/.test(line) || isLikelyQuestionStartNoNumber)) {
                currentBlock = [line];
                currentBlockHasAnswerLine = isAnswerLine;
            }
        }
    }
    if (currentBlock.length) pushQuestionBlock(currentBlock);

    // 回退：若未解析到题目，尝试按空行段落粗解析
    if (Object.values(parsedBank).flat().length === 0) {
        const paragraphs = String(text || '').split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
        for (const p of paragraphs) {
            if (/^\s*(?:第?\d+\s*[题\.、:]|\d+\s*[\.、:）\)]|[（(]?\d+[)）])/.test(p) || /[A-H]\s*[\.\．、:：\)]/.test(p)) {
                pushQuestionBlock([p]);
            }
        }
    }

    return parsedBank;
};

const decodeLegacyDocBuffer = (arrayBuffer) => {
    const tryDecode = (encoding) => {
        try {
            return new TextDecoder(encoding, { fatal: false }).decode(arrayBuffer);
        } catch (_) {
            return '';
        }
    };
    const scoreText = (s) => {
        if (!s) return -1e9;
        const len = s.length || 1;
        const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
        const bad = (s.match(/�/g) || []).length;
        const ctrl = (s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
        return (cjk / len) * 3 - (bad / len) * 8 - (ctrl / len) * 2;
    };
    const candidates = [
        tryDecode('utf-8'),
        tryDecode('gb18030'),
        tryDecode('gbk'),
        tryDecode('utf-16le')
    ];
    candidates.sort((a, b) => scoreText(b) - scoreText(a));
    return String(candidates[0] || '')
        .replace(/\0/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

export default function CustomUploadModal({ show, onClose, onUploadComplete, existingCategories }) {
    const [subjectName, setSubjectName] = useState('');
    const [shortName, setShortName] = useState('');
    const [category, setCategory] = useState('自建题库');
    const [icon, setIcon] = useState('📚');
    const [file, setFile] = useState(null);
    const [previewRows, setPreviewRows] = useState([]);
    const [previewMeta, setPreviewMeta] = useState(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const reset = () => {
        setSubjectName('');
        setShortName('');
        setCategory('自建题库');
        setIcon('📚');
        setFile(null);
        setPreviewRows([]);
        setPreviewMeta(null);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const parseFileToBank = async (targetFile, subjectId) => {
        const fileName = targetFile.name.toLowerCase();
        if (fileName.endsWith('.json')) {
            const text = await targetFile.text();
            const jsonData = JSON.parse(text);
            return parseCustomJson(jsonData, subjectId);
        }
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const buf = await targetFile.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
            return parseCustomExcel(raw, subjectId);
        }
        if (fileName.endsWith('.docx')) {
            const buf = await targetFile.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: buf });
            let docText = String(result?.value || '').trim();
            if (!docText) {
                docText = await extractDocxRawTextFallback(buf);
            }
            return parseCustomDocxText(docText, subjectId);
        }
        if (fileName.endsWith('.doc')) {
            const buf = await targetFile.arrayBuffer();
            return parseCustomDocxText(decodeLegacyDocBuffer(buf), subjectId);
        }
        throw new Error('不支持的文件格式，请使用 JSON (.json)、Excel (.xlsx / .xls) 或 Word (.docx / .doc) 文件');
    };

    const buildPreview = (parsedBank) => {
        const all = Object.values(parsedBank).flat();
        const rows = all.slice(0, 10).map(q => {
            let ans = '';
            if (q.type === 'judgment') ans = q.rawAnswer?.[0] === 0 ? '正确' : '错误';
            else if (q.type === 'fill' || q.type === 'big') ans = q.options?.[0] || '';
            else ans = (q.rawAnswer || []).map(i => String.fromCharCode(65 + i)).join('');
            return { id: q.id, type: q.type, category: q.category, question: q.question, answer: ans };
        });
        return { rows, total: all.length, chapters: Object.keys(parsedBank).length };
    };

    const handlePreview = async () => {
        if (!file) { setError('请先选择题库文件'); return; }
        setUploading(true);
        setError('');
        try {
            const parsedBank = await parseFileToBank(file, 'preview');
            const totalQ = Object.values(parsedBank).flat().length;
            if (totalQ === 0) throw new Error('未解析到有效题目，请检查文件内容格式');
            const { rows, total, chapters } = buildPreview(parsedBank);
            setPreviewRows(rows);
            setPreviewMeta({ total, chapters });
        } catch (err) {
            setPreviewRows([]);
            setPreviewMeta(null);
            setError(err.message || '预览失败');
        } finally {
            setUploading(false);
        }
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
            const parsedBank = await parseFileToBank(file, subjectId);

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
                category: category.trim() || '自建题库',
                isCustom: true,
                lectures: lectures,
                questionCount: totalQ
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
        <div style={{ viewTransitionName: 'modal-backdrop' }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60" onClick={handleClose}>
            <div style={{ viewTransitionName: 'modal' }} className="bg-white dark:bg-slate-900 w-full h-[100dvh] sm:h-auto sm:max-w-lg md:max-w-4xl sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-2xl shadow-2xl transition-all duration-300" onClick={e => e.stopPropagation()}>
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
                            <label className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">分类名称 *</label>
                            <input type="text" placeholder="例如：自建题库、公共课程、专业课" value={category} onChange={e => setCategory(e.target.value)} disabled={uploading} required
                                   className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                            {existingCategories && existingCategories.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">推荐:</span>
                                    {existingCategories.filter(c => c !== '全部').map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCategory(c)}
                                            disabled={uploading}
                                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-semibold border-0 cursor-pointer transition-colors"
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            )}
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
                                <input ref={fileInputRef} type="file" accept=".json,.xlsx,.xls,.docx,.doc" onChange={e => setFile(e.target.files[0])} disabled={uploading} className="hidden" />
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
                                        <p className="text-xs text-slate-400 dark:text-slate-500">支持 JSON、Excel、Word (.docx / .doc)</p>
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
                                Excel 须含"题型"、"题干"、"答案"等列名。JSON 支持章节键值或平面数组。Word(.docx/.doc) 支持“题干 + A/B/C/D 选项 + 答案行（答案: X）/括号答案”等常见格式。
                            </p>
                        </div>

                        {previewMeta && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">导入预览（前10题）</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">共 {previewMeta.total} 题，{previewMeta.chapters} 个章节</p>
                                <div className="max-h-44 overflow-y-auto space-y-1.5">
                                    {previewRows.map((row, idx) => (
                                        <div key={row.id || idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                            <p className="text-[11px] text-slate-500">{row.category} · {row.type}</p>
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">{idx + 1}. {row.question}</p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">答案：{row.answer || '（空）'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button onClick={handleClose} disabled={uploading}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm">
                                取消
                            </button>
                            <button onClick={handlePreview} disabled={uploading || !file}
                                    className="flex-1 py-3 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all text-sm disabled:opacity-50">
                                预览解析
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
