export const CURRENT_APP_VERSION = '4.0.4';
export const LEADERBOARD_LIMIT = 50;
export const GITHUB_BASE = 'https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/';
export const REPORT_URL = '/#/report';
export const BANK_CACHE_VERSION = 3;

const FILE_ID_MAP = {
  1: '69650188d606e2613f1b18e1',
  2: '69650188d606e2613f1b18dc',
  3: '69650188d606e2613f1b18de',
  4: '69650188d606e2613f1b18df',
  5: '69650188d606e2613f1b18e0',
  6: '69650188d606e2613f1b18db',
  7: '69650188d606e2613f1b18dd',
};

export const LECTURES = [
  { id: 1, name: '第一讲：创新创业概述', file: '创新创业基础第一讲习题.xlsx', fileId: FILE_ID_MAP[1], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/sCwXv74yKdHuwzz440gSIKvciB8w5Oxt/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%80%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 2, name: '第二讲：创新思维与方法', file: '创新创业基础第二讲习题.xlsx', fileId: FILE_ID_MAP[2], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/LW7iNTXd04MjT6xIIgoghNavzJh78BM3/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%8C%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 3, name: '第三讲：机会与风险识别', file: '创新创业基础第三讲习题.xlsx', fileId: FILE_ID_MAP[3], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/89otiFHMEs0D6EPKY7h6nLLlKT4e3FlW/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%89%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 4, name: '第四讲：团队与资源整合', file: '创新创业基础第四讲习题.xlsx', fileId: FILE_ID_MAP[4], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/iDvr6YL2DqyDJNQ8WtHF8JoGu8VhXJpB/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%9B%9B%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 5, name: '第五讲：商业模式与计划', file: '创新创业基础第五讲习题.xlsx', fileId: FILE_ID_MAP[5], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/pmwL2rBspHySjkkGLY6cT4jTSENOw2QE/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%BA%94%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 6, name: '第六讲：融资与企业设立', file: '创新创业基础第六讲习题.xlsx', fileId: FILE_ID_MAP[6], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/7ftQpmkKv4VtISulAbszw5y9gMtShUUO/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E5%85%AD%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 7, name: '第七讲：新企业成长管理', file: '创新创业基础第七讲习题.xlsx', fileId: FILE_ID_MAP[7], url: 'http://lc-5wPsbnak.cn-n1.lcfile.com/ng2YT8p8yeERNwiaPXWMJBFwEdPwM7XI/%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E5%9F%BA%E7%A1%80%E7%AC%AC%E4%B8%83%E8%AE%B2%E4%B9%A0%E9%A2%98.xlsx' },
  { id: 99, name: '经典旧题库 (综合)', file: 'questions_old.xls', fileId: null, url: 'https://raw.githubusercontent.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank/refs/heads/main/questions/questions_old.xls' },
];

const MAOGAO_CHAPTERS = [
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
    icon: '🚀',
    lectures: LECTURES,
    getChapters: (bank) => LECTURES.filter((l) => bank[l.id]?.length),
    getChapterName: (id) => LECTURES.find((l) => l.id === id)?.name || `章节${id}`,
  },
  {
    id: 'maogai',
    name: '毛泽东思想和中国特色社会主义理论体系概论',
    shortName: '毛概',
    icon: '📖',
    file: 'maogai_full.json',
    chapters: MAOGAO_CHAPTERS,
    getChapters: (bank) => MAOGAO_CHAPTERS.filter((ch) => bank[ch.id]?.length),
    getChapterName: (id) => MAOGAO_CHAPTERS.find((ch) => ch.id === id)?.name || `章节${id}`,
  },
];

export const getBankCacheKey = (subjectId) => `hf_question_bank_${subjectId}`;
export const getBankCacheVersionKey = (subjectId) => `hf_bank_version_${subjectId}`;
