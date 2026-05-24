import { AlertOctagon } from 'lucide-react';

export function ResetConfirmModal({ open, currentUser, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-enter">
      <div style={{ viewTransitionName: 'modal' }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <AlertOctagon size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">确认重置进度？</h3>
          <p className="text-slate-500 mt-2 text-sm">这将清除本地所有的刷题记录、错题本和统计数据。此操作无法撤销。</p>
          {currentUser && <p className="text-orange-500 text-xs mt-2 bg-orange-50 p-2 rounded-lg text-left w-full">注意：云端数据不会自动清除。如需清空云端备份，请在重置后点击“备份”按钮以覆盖。</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">取消</button>
          <button onClick={onConfirm} className="py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-colors">确认重置</button>
        </div>
      </div>
    </div>
  );
}
