import { Maximize, Minimize, RotateCcw } from 'lucide-react';

export function QuizSidebar({
  questions,
  currentIndex,
  answerResults,
  currentMode,
  isQuiz,
  isFullscreen,
  onExit,
  onToggleFullscreen,
  onChangeQuestion,
}) {
  return (
    <div className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <button onClick={onExit} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
          <RotateCcw size={18} /> 退出练习
        </button>
        <button onClick={onToggleFullscreen} className="p-2 text-slate-400 hover:text-slate-600">
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            let statusColor = 'bg-slate-50 text-slate-400 hover:bg-slate-100';
            const qid = q.id;
            if (i === currentIndex) statusColor = 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200';
            else if (answerResults[qid] === 'correct') statusColor = 'bg-green-50 text-green-700 border border-green-200';
            else if (answerResults[qid] === 'wrong') statusColor = 'bg-red-50 text-red-700 border border-red-200';

            return (
              <button key={i} onClick={() => onChangeQuestion(i)} className={`aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-all ${statusColor}`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 text-xs text-center text-slate-400">
        {currentMode === 'mistakes' ? '错题复习模式' : (isQuiz ? '刷题模式' : '背题模式')}
      </div>
    </div>
  );
}
