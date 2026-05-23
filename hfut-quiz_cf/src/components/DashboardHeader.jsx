import {
  AlertCircle,
  CheckCircle,
  Clock,
  DownloadCloud,
  GraduationCap,
  Loader2,
  Monitor,
  Moon,
  Search,
  Sun,
} from 'lucide-react';

export function DashboardHeader(props) {
  const {
    currentSubject,
    currentUser,
    syncMsg,
    syncStatus,
    themeMode = 'system',
    setThemeMode,
    onSwitchSubject,
    onToggleSearch,
  } = props;

  const nextModeMap = {
    'system': 'light',
    'light': 'dark',
    'dark': 'auto',
    'auto': 'system'
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light': return <Sun size={18} className="md:w-5 md:h-5 text-amber-500" />;
      case 'dark': return <Moon size={18} className="md:w-5 md:h-5 text-indigo-400" />;
      case 'auto': return <Clock size={18} className="md:w-5 md:h-5 text-emerald-500" />;
      default: return <Monitor size={18} className="md:w-5 md:h-5 text-slate-500" />;
    }
  };

  const getThemeTitle = () => {
    switch (themeMode) {
      case 'light': return '主题: 极简日间 (点击切换)';
      case 'dark': return '主题: 护眼夜间 (点击切换)';
      case 'auto': return '主题: 自动切换 (18:00-06:00夜间, 点击切换)';
      default: return '主题: 跟随系统 (点击切换)';
    }
  };

  const displayName = currentUser?.username || '游客';

  return (
    <header className="flex justify-between items-center mb-6 md:mb-8 shrink-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 md:gap-3 dark:text-slate-100">
          <GraduationCap className="text-blue-600 w-6 h-6 md:w-8 md:h-8 dark:text-blue-400" />
          <span>{currentSubject?.shortName || currentSubject?.name || '刷题系统'}</span>
          <button onClick={onSwitchSubject} className="ml-2 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300">切换</button>
        </h1>
        <p className="text-slate-500 text-xs md:text-sm font-medium mt-1 pl-8 md:pl-11 dark:text-slate-400">欢迎, {displayName}</p>
      </div>
      <div className="flex gap-2 md:gap-3 items-center">
        {syncMsg && <div className="px-3 py-2 rounded-xl border text-xs md:text-sm font-semibold flex items-center gap-2 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800" aria-live="polite">{syncStatus === 'success' && <CheckCircle size={14} className="text-green-600" />}{syncStatus === 'error' && <AlertCircle size={14} className="text-red-500" />}{syncStatus === 'uploading' && <Loader2 size={14} className="animate-spin text-blue-500" />}{syncStatus === 'downloading' && <DownloadCloud size={14} className="text-blue-500" />}<span className="text-slate-600 dark:text-slate-300">{syncMsg}</span></div>}
        <button onClick={onToggleSearch} className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md hover:text-blue-600 transition-all border border-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400" title="搜索题目"><Search size={18} className="md:w-5 md:h-5" /></button>
        {/* 🌗 日夜模式切换按钮 */}
        <button onClick={() => setThemeMode(nextModeMap[themeMode])} className="p-2 md:p-3 bg-white text-slate-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400" title={getThemeTitle()}>
          {getThemeIcon()}
        </button>
      </div>
    </header>
  );
}
