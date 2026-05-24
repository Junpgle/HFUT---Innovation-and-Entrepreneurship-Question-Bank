import { RefreshCw } from 'lucide-react';

export function UpdateNoticeModal({ open, currentVersion, remoteVersionInfo, onReload, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-enter backdrop-blur-sm">
      <div style={{ viewTransitionName: 'modal' }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl" />
        <div className="relative z-10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <RefreshCw size={32} className="animate-spin-slow" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">发现新版本 {remoteVersionInfo.version}</h3>
            <p className="text-xs text-slate-400 mt-1">当前版本: {currentVersion}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-left">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase">更新内容</div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{remoteVersionInfo.log}</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button onClick={onReload} className="py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2">
              <RefreshCw size={18} /> 立即刷新体验
            </button>
            <button onClick={onClose} className="py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 transition-colors text-sm">暂不更新</button>
          </div>
        </div>
      </div>
    </div>
  );
}
