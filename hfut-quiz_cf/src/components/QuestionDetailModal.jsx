import { CheckCircle, XCircle, X, Trophy, Zap } from 'lucide-react';
import { Markdown } from './Markdown';

export function QuestionDetailModal({ viewingRankQuestion, onClose, renderUserExplanations }) {
  if (!viewingRankQuestion) return null;
  const { question, options, rawAnswer, explanation, id, rankInfo } = viewingRankQuestion;
  const typeBadgeClass =
    viewingRankQuestion.type === 'multiple'
      ? 'bg-purple-100 text-purple-700'
      : viewingRankQuestion.type === 'judgment'
        ? 'bg-orange-100 text-orange-700'
        : viewingRankQuestion.type === 'fill'
          ? 'bg-indigo-100 text-indigo-700'
          : viewingRankQuestion.type === 'big'
            ? 'bg-pink-100 text-pink-700'
            : 'bg-blue-100 text-blue-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-enter">
      <div style={{ viewTransitionName: 'modal' }} className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-start z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={18} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">错题排行榜 #{rankInfo.rank}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2 py-1 rounded font-bold ${typeBadgeClass}`}>
                {viewingRankQuestion.type === 'multiple' ? '多选' : viewingRankQuestion.type === 'judgment' ? '判断' : viewingRankQuestion.type === 'fill' ? '填空' : viewingRankQuestion.type === 'big' ? '简答' : '单选'}
              </span>
              <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">{viewingRankQuestion.category}</span>
              <span className="text-xs px-2 py-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded font-bold">错误 {rankInfo.errorCount} 次 · 错误率 {rankInfo.errorRate}%</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors ml-4">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-relaxed">{question}</h3>
          <div className="space-y-3 mb-6">
            {options.map((opt, i) => {
              const isCorrect = rawAnswer.includes(i);
              const optionLetter = ['A', 'B', 'C', 'D', 'E'][i];
              const optionStats = rankInfo?.optionStats || {};
              const selectionCount = optionStats[optionLetter] || 0;
              const totalSelections = Object.values(optionStats).reduce((sum, count) => sum + count, 0);
              const selectionRate = totalSelections > 0 ? Math.round((selectionCount / totalSelections) * 100) : 0;
              const isFrequentlyWrong = !isCorrect && selectionCount > 0 && selectionRate >= 15;

              return (
                <div key={i} className={`p-4 rounded-xl border-2 text-sm flex gap-3 transition-all ${isCorrect ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800/60 text-green-900 dark:text-green-200 shadow-sm' : isFrequentlyWrong ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800/60 text-red-900 dark:text-red-200 shadow-sm' : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  <span className={`font-bold shrink-0 ${isCorrect ? 'text-green-700 dark:text-green-400' : isFrequentlyWrong ? 'text-red-700 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>{optionLetter}.</span>
                  <span className="flex-1">{opt}</span>
                  {isCorrect && <div className="flex items-center gap-1 shrink-0"><CheckCircle size={18} className="text-green-600 dark:text-green-400" /><span className="text-xs font-bold text-green-700 dark:text-green-400">正确答案</span></div>}
                  {isFrequentlyWrong && <div className="flex items-center gap-1 shrink-0"><XCircle size={18} className="text-red-600 dark:text-red-400" /><span className="text-xs font-bold text-red-700 dark:text-red-400">易错项 {selectionRate}%</span></div>}
                </div>
              );
            })}
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-2 mb-3 text-indigo-900 dark:text-indigo-300 font-bold text-sm">
              <Zap size={18} className="text-indigo-600 dark:text-indigo-400" /> <span>答案解析</span>
            </div>
            <Markdown content={explanation} size="sm" className="text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed" />
            {renderUserExplanations(id)}
          </div>
        </div>
      </div>
    </div>
  );
}
