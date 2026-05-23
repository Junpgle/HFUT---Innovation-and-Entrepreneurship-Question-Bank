import { Maximize, Minimize, RotateCcw } from 'lucide-react';

export function QuizMobileTopBar({ currentIndex, total, isFullscreen, onExit, onToggleFullscreen }) {
  return (
    <div className="md:hidden p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-10">
      <button onClick={onExit} className="p-2 -ml-2 text-slate-600 dark:text-slate-300"><RotateCcw size={20} /></button>
      <span className="font-bold text-slate-700 dark:text-slate-200">{currentIndex + 1}/{total}</span>
      <button onClick={onToggleFullscreen} className="p-2 -mr-2 text-slate-600 dark:text-slate-300">{isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
    </div>
  );
}
