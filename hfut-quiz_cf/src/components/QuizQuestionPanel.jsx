import { CheckCircle, CheckSquare, XCircle } from 'lucide-react';
import { getQuestionTypeBadgeClass, getQuestionTypeLabel } from '../utils/questionType';

export function QuizQuestionPanel({
  currentQ,
  isQuiz,
  isAnswered,
  selectedIndices,
  onOptionClick,
  onSubmit,
}) {
  return (
    <div className="md:col-span-2 bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-200 animate-enter h-full flex flex-col dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getQuestionTypeBadgeClass(currentQ.type)}`}>
          {`${getQuestionTypeLabel(currentQ.type)}题`}
        </span>
        <span className="text-slate-400 text-xs md:text-sm font-medium flex items-center gap-1 dark:text-slate-500">{currentQ.category}</span>
      </div>
      <h2 className="text-lg md:text-2xl font-bold text-slate-900 leading-relaxed mb-4 dark:text-slate-100">{currentQ.question}</h2>
      <div className="grid gap-3">
        {currentQ.options.map((opt, idx) => {
          let status = 'default';
          if (isQuiz) {
            if (isAnswered) {
              if (currentQ.rawAnswer?.includes(idx)) status = 'correct';
              else if (selectedIndices.includes(idx)) status = 'wrong';
              else status = 'dimmed';
            } else if (selectedIndices.includes(idx)) {
              status = 'selected';
            }
          } else if (currentQ.rawAnswer?.includes(idx)) {
            status = 'correct';
          }

          return (
            <button
              key={idx}
              onClick={() => onOptionClick(idx)}
              className={`w-full p-3.5 sm:p-4 md:p-5 rounded-xl text-left border-2 transition-all flex items-start gap-3 md:gap-4 group relative
                ${status === 'default' ? 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-900/60 dark:hover:bg-slate-850' : ''}
                ${status === 'selected' ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-800/80 dark:bg-blue-950/20 dark:text-blue-200' : ''}
                ${status === 'correct' ? 'border-green-500 bg-green-50 text-green-900 dark:border-green-800/80 dark:bg-green-950/20 dark:text-green-200' : ''}
                ${status === 'wrong' ? 'border-red-500 bg-red-50 text-red-900 dark:border-red-800/80 dark:bg-red-950/20 dark:text-red-200' : ''}
                ${status === 'dimmed' ? 'bg-white border-slate-100 text-slate-400 dark:bg-slate-900/40 dark:border-slate-850 dark:text-slate-500' : ''}
                ${status === 'default' ? 'text-slate-700 dark:text-slate-300' : ''}`}
            >
              <div className={`mt-0.5 w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold border transition-colors shrink-0
                ${status === 'selected' ? 'bg-blue-500 border-blue-500 text-white dark:bg-blue-600 dark:border-blue-600' : ''}
                ${status === 'correct' ? 'bg-green-500 border-green-500 text-white dark:bg-green-600 dark:border-green-600' : ''}
                ${status === 'wrong' ? 'bg-red-500 border-red-500 text-white dark:bg-red-600 dark:border-red-600' : ''}
                ${status === 'default' || status === 'dimmed' ? 'bg-white border-slate-300 text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400' : ''}`}
              >
                {['A', 'B', 'C', 'D', 'E'][idx]}
              </div>
              <span className="flex-1 text-sm sm:text-base md:text-lg leading-snug">{opt}</span>
              {status === 'correct' && <CheckCircle className="text-green-500 shrink-0 w-5 h-5 md:w-6 md:h-6 dark:text-green-400" />}
              {status === 'wrong' && <XCircle className="text-red-500 shrink-0 w-5 h-5 md:w-6 md:h-6 dark:text-red-400" />}
            </button>
          );
        })}
      </div>
      {isQuiz && !isAnswered && currentQ.type === 'multiple' && (
        <div className="flex justify-end animate-enter pt-4">
          <button
            onClick={() => onSubmit()}
            className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
              ${selectedIndices.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'}`}
          >
            确认提交 <CheckSquare size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
