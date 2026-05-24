import localforage from 'localforage';

export const CURRENT_APP_VERSION = '4.0.4';
export const LEADERBOARD_LIMIT = 50;

export const GITHUB_BASE = "https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/";
export const REPORT_URL = "/#/report";

export const LECTURES = [
    { id: 1, name: "第一讲：创新创业概述", file: "创新创业基础第一讲习题.xlsx" },
    { id: 2, name: "第二讲：创新思维与方法", file: "创新创业基础第二讲习题.xlsx" },
    { id: 3, name: "第三讲：机会与风险识别", file: "创新创业基础第三讲习题.xlsx" },
    { id: 4, name: "第四讲：团队与资源整合", file: "创新创业基础第四讲习题.xlsx" },
    { id: 5, name: "第五讲：商业模式与计划", file: "创新创业基础第五讲习题.xlsx" },
    { id: 6, name: "第六讲：融资与企业设立", file: "创新创业基础第六讲习题.xlsx" },
    { id: 7, name: "第七讲：新企业成长管理", file: "创新创业基础第七讲习题.xlsx" },
    { id: 99, name: "经典旧题库 (综合)", file: "questions_old.xls" },
];

export const MAOGAO_CHAPTERS = [
    { id: 1, name: '导论' },
    { id: 2, name: '第一章' },
    { id: 3, name: '第二章' },
    { id: 4, name: '第三章' },
    { id: 5, name: '第四章' },
    { id: 6, name: '第五章' },
    { id: 7, name: '第六章' },
    { id: 8, name: '第七章' },
    { id: 9, name: '第八章' },
];

export const SUBJECTS = [
    {
        id: 'innovation',
        name: '创新创业',
        category: '公共课程',
        icon: '🚀',
        lectures: LECTURES,
        getChapters: (bank) => LECTURES.filter(l => bank[l.id]?.length),
        getChapterName: (id) => LECTURES.find(l => l.id === id)?.name || `章节${id}`,
    },
    {
        id: 'maogai',
        name: '毛泽东思想和中国特色社会主义理论体系概论',
        shortName: '毛概',
        category: '思想政治',
        icon: '📖',
        file: 'maogai_full.json',
        chapters: MAOGAO_CHAPTERS,
        getChapters: (bank) => MAOGAO_CHAPTERS.filter(ch => bank[ch.id]?.length),
        getChapterName: (id) => MAOGAO_CHAPTERS.find(ch => ch.id === id)?.name || `章节${id}`,
    },
    {
        id: 'hgdmy-maogai',
        name: '合工大智慧马院-毛概（学习通）',
        shortName: '马院毛概',
        category: '思想政治',
        icon: '📖',
        file: 'hgdmy-maogai.json',
        chapters: [{ id: 1, name: '全部题目' }],
        getChapters: (bank) => bank['1']?.length ? [{ id: 1, name: '全部题目' }] : [],
        getChapterName: () => '全部题目',
    },
];

export const getBankCacheKey = (subjectId) => `hf_question_bank_${subjectId}`;
export const getBankCacheVersionKey = (subjectId) => `hf_bank_version_${subjectId}`;
export const BANK_CACHE_VERSION = 3;

export const formatDate = (isoString) => {
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
        hour12: false
    });
};

export const safeGet = async (key, fallback = null) => {
    try {
        const v = await localforage.getItem(key);
        if (v !== null && v !== undefined) {
            try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
            return v;
        }
    } catch {}
    try {
        const raw = localStorage.getItem(key);
        if (raw !== null) return JSON.parse(raw);
    } catch {}
    return fallback;
};

export const safeSet = async (key, value) => {
    try { await localforage.setItem(key, value); } catch {}
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const normalizeQuestionId = (id) => {
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
