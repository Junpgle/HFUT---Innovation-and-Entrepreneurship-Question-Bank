import { Search } from 'lucide-react';
import { getQuestionTypeLabel } from '../utils/questionType';

export function DashboardSearchPanel({
  open,
  searchSectionRef,
  searchKeyword,
  setSearchKeyword,
  searchFilters,
  setSearchFilters,
  chapterOptions,
  performSearch,
  searchResults,
  showSearchResults,
  setSearchResults,
  setShowSearchResults,
  openSearchQuestion,
  setIsSearchOpen,
}) {
  if (!open) return null;

  return (
    <section id="search-panel" ref={searchSectionRef} className="mb-6 md:mb-8 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900 shadow-sm p-4 md:p-6 animate-enter">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold"><Search size={18} className="text-blue-600" /><span>题目搜索</span></div>
        <button type="button" onClick={() => setIsSearchOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">收起</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1">关键词</label><input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="题干 / 选项 / 解析" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500" /></div>
        <div><label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1">章节</label><select value={searchFilters.lectureId} onChange={(e) => setSearchFilters({ ...searchFilters, lectureId: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500"><option value={0}>全部章节</option>{chapterOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div><label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1">题型</label><select value={searchFilters.type} onChange={(e) => setSearchFilters({ ...searchFilters, type: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500"><option value="all">全部</option><option value="single">单选</option><option value="multiple">多选</option><option value="judgment">判断</option><option value="fill">填空</option><option value="big">简答</option></select></div>
      </div>
      <div className="flex flex-wrap gap-3 items-center mt-3 md:mt-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><input type="checkbox" checked={searchFilters.includeAnswered} onChange={(e) => setSearchFilters({ ...searchFilters, includeAnswered: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />已作答</label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><input type="checkbox" checked={searchFilters.includeUnanswered} onChange={(e) => setSearchFilters({ ...searchFilters, includeUnanswered: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />未作答</label>
        <div className="ml-auto flex gap-2"><button onClick={() => performSearch()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><Search size={16} /> 搜索</button><button onClick={() => { setSearchResults([]); setShowSearchResults(false); setSearchKeyword(''); }} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700">清空</button></div>
      </div>
      {showSearchResults && <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">{searchResults.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">暂无结果</p> : searchResults.map((res, idx) => <button key={idx} onClick={() => openSearchQuestion(idx)} className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition flex flex-col gap-1 group"><div className="text-slate-800 dark:text-slate-100 font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">{res.question}</div><div className="flex items-center justify-between"><span className="text-[12px] text-slate-500 dark:text-slate-400">{res.category} · {getQuestionTypeLabel(res.type)}</span><span className="text-blue-600 dark:text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition">查看详情 →</span></div></button>)}</div>}
    </section>
  );
}
