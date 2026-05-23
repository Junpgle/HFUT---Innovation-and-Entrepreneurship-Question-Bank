import { MAOGAO_CHAPTERS } from './constants';

export const parseHgdmyMaogaiJson = (data) => {
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

export const parseMaogaiJson = (data) => {
    const chapters = {};
    const chapterMap = {};
    MAOGAO_CHAPTERS.forEach(ch => { chapterMap[String(ch.id)] = ch.name; });

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
