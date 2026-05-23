import {
  AlertCircle,
  CheckCircle,
  Database,
  DownloadCloud,
  FileDown,
  FileUp,
  GraduationCap,
  Loader2,
  LogOut,
  Maximize,
  Minimize,
  Search,
  Trash2,
  UploadCloud,
  User,
} from 'lucide-react';

export function DashboardHeader(props) {
  const {
    currentSubject,
    currentUser,
    onlineCount,
    syncMsg,
    syncStatus,
    isFullscreen,
    showEmailHint,
    bankStatus,
    onSwitchSubject,
    onToggleSearch,
    onToggleFullscreen,
    onGoProfile,
    onManualSync,
    onManualRestore,
    onExport,
    onImport,
    onShowReset,
    onLogout,
  } = props;

  return (
    <header className="flex justify-between items-center mb-6 md:mb-8 shrink-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
          <GraduationCap className="text-blue-600 w-6 h-6 md:w-8 md:h-8" />
          <span>{currentSubject?.shortName || currentSubject?.name || '刷题系统'}</span>
          <button onClick={onSwitchSubject} className="ml-2 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors">切换</button>
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 pl-8 md:pl-11">欢迎, {currentUser.username}</p>
      </div>
      <div className="flex gap-2 md:gap-3 items-center">
        {onlineCount !== null && <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 text-xs md:text-sm font-medium flex items-center gap-2"><User size={16} /> 在线：{onlineCount}</div>}
        {syncMsg && <div className="px-3 py-2 rounded-xl border text-xs md:text-sm font-semibold flex items-center gap-2 bg-white shadow-sm" aria-live="polite">{syncStatus === 'success' && <CheckCircle size={14} className="text-green-600" />}{syncStatus === 'error' && <AlertCircle size={14} className="text-red-500" />}{syncStatus === 'uploading' && <Loader2 size={14} className="animate-spin text-blue-500" />}{syncStatus === 'downloading' && <DownloadCloud size={14} className="text-blue-500" />}<span className="text-slate-600">{syncMsg}</span></div>}
        <button onClick={() => { window.location.hash = '#/introduce'; }} className="p-2 md:px-3 md:py-2 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-indigo-600 transition-all border border-slate-100" title="产品介绍"><GraduationCap size={18} className="md:w-5 md:h-5" /></button>
        <button onClick={onToggleSearch} className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-blue-600 transition-all border border-slate-100" title="搜索题目"><Search size={18} className="md:w-5 md:h-5" /></button>
        <button onClick={onToggleFullscreen} className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100">{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
        <div className="relative inline-block">
          <button onClick={onGoProfile} className={`p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 relative ${showEmailHint ? 'ring-2 ring-red-400 animate-pulse' : ''}`} title="个人中心">
            <User size={18} className={`md:w-5 md:h-5 ${showEmailHint ? 'text-red-500' : ''}`} />
            {showEmailHint && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
          {showEmailHint && <div className="absolute top-12 right-0 w-32 z-50 animate-bounce"><div className="bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg relative text-center"><div className="absolute -top-1 right-4 w-3 h-3 bg-red-500 rotate-45" />点我验证邮箱</div></div>}
        </div>
        <div className="hidden md:flex gap-3">
          {bankStatus === 'ready' && <div className="px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm font-medium flex items-center gap-2"><Database size={16} /> 题库已就绪</div>}
          <button onClick={onManualSync} disabled={syncStatus === 'uploading'} className="px-4 py-2 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-all">{syncStatus === 'uploading' ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={18} />} 备份</button>
          <button onClick={onManualRestore} disabled={syncStatus === 'downloading'} className="px-4 py-2 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium transition-all">{syncStatus === 'downloading' ? <Loader2 className="animate-spin" size={16} /> : <DownloadCloud size={18} />} 恢复</button>
          <div className="flex gap-2">
            <button onClick={onExport} className="px-4 py-2 bg-slate-50 text-blue-600 rounded-xl shadow-sm border border-blue-100 hover:bg-blue-100 flex items-center gap-2 text-sm font-bold transition-all" title="将本地进度导出为文件"><FileUp size={18} /> 导出</button>
            <label className="px-4 py-2 bg-slate-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100 hover:bg-indigo-100 flex items-center gap-2 text-sm font-bold transition-all cursor-pointer" title="从文件恢复本地进度"> <FileDown size={18} /> 导入 <input type="file" className="hidden" accept=".json" onChange={onImport} /></label>
          </div>
          <button onClick={onShowReset} className="px-4 py-2 bg-white text-red-600 rounded-xl shadow-sm border border-slate-200 hover:bg-red-50 flex items-center gap-2 text-sm font-medium transition-all" title="重置进度"><Trash2 size={18} /></button>
        </div>
        <button onClick={onLogout} className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-red-600 transition-all border border-slate-100"><LogOut size={18} className="md:w-5 md:h-5" /></button>
      </div>
    </header>
  );
}
