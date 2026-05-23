import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Layers, RefreshCw, TrendingUp, Trophy, X, CheckCircle, XCircle, Zap } from 'lucide-react';
import { Markdown } from './Markdown';

export const RankingPage = ({ wrongQuestionRanking, onBack, onRefresh, onOpenRankingQuestion }) => (
    <div className="h-screen flex flex-col bg-slate-100">
        <div className="bg-white border-b border-slate-200 p-3 sm:p-4 md:p-6 flex justify-between items-center sticky top-0 z-10">
            <button onClick={onBack} className="flex items-center gap-1 sm:gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm sm:text-base">
                <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]"/> 返回
            </button>
            <h1 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-1 sm:gap-2">
                <TrendingUp className="text-orange-600" size={20}/> 全站易错榜
            </h1>
            <button onClick={onRefresh} className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all touchable" title="刷新榜单">
                <RefreshCw size={16} className="sm:w-5 sm:h-5"/>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
                {wrongQuestionRanking.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 sm:p-8 text-center text-slate-400">
                        <AlertCircle size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50"/>
                        <p className="text-sm sm:text-base">暂无数据或加载中...</p>
                    </div>
                ) : (
                    wrongQuestionRanking.map((item, index) => (
                        <div key={item.questionId} onClick={() => onOpenRankingQuestion(item)}
                             className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-sm border border-slate-200 hover:border-orange-300 transition-all cursor-pointer group">
                            <div className="flex gap-3 sm:gap-4">
                                <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-xl ${
                                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                    'bg-slate-100 text-slate-600'}`}>
                                    {index < 3 ? <Trophy size={18} className="sm:w-6 sm:h-6"/> : (index + 1)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 sm:gap-4 mb-1 sm:mb-2">
                                        <h3 className="font-semibold text-slate-800 text-sm sm:text-base md:text-lg leading-snug group-hover:text-orange-600 transition-colors line-clamp-2 sm:line-clamp-none">
                                            {item.questionTitle}
                                        </h3>
                                        <span className="shrink-0 px-2 sm:px-3 py-0.5 sm:py-1 bg-red-100 text-red-700 rounded-lg text-xs sm:text-sm font-bold">
                                            错{item.errorCount}次
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500">
                                        <span className="flex items-center gap-1"><Layers size={12} className="sm:w-3.5 sm:h-3.5"/> {item.category}</span>
                                        <span className="flex items-center gap-1"><AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5"/> 错误率 {item.errorRate}%</span>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center">
                                    <ChevronRight size={16} className="sm:w-5 sm:h-5 text-slate-300 group-hover:text-orange-500 transition-colors"/>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
);

export const QuestionDetailModal = ({ viewingRankQuestion, onClose, renderUserExplanations }) => {
    if (!viewingRankQuestion) return null;

    const {question, options, rawAnswer, explanation, id, rankInfo} = viewingRankQuestion;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-enter">
            <div className="bg-white w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-100 p-4 sm:p-6 flex justify-between items-start z-10">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy size={16} className="sm:w-[18px] sm:h-[18px] text-amber-500"/>
                            <span className="text-xs font-bold text-slate-500">错题排行榜 #{rankInfo.rank}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${
                                viewingRankQuestion.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                                (viewingRankQuestion.type === 'judgment' ? 'bg-orange-100 text-orange-700' :
                                (viewingRankQuestion.type === 'fill' ? 'bg-indigo-100 text-indigo-700' :
                                (viewingRankQuestion.type === 'big' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700')))}`}>
                                {viewingRankQuestion.type === 'multiple' ? '多选' :
                                 viewingRankQuestion.type === 'judgment' ? '判断' :
                                 viewingRankQuestion.type === 'fill' ? '填空' :
                                 viewingRankQuestion.type === 'big' ? '简答' : '单选'}
                            </span>
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">{viewingRankQuestion.category}</span>
                            <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded font-bold">
                                错误 {rankInfo.errorCount} 次 · 错误率 {rankInfo.errorRate}%
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors ml-4 shrink-0">
                        <X size={18} className="sm:w-5 sm:h-5 text-slate-400"/>
                    </button>
                </div>
                <div className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6 leading-relaxed">{question}</h3>
                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                        {options.map((opt, i) => {
                            const isCorrect = rawAnswer.includes(i);
                            const optionLetter = ['A', 'B', 'C', 'D', 'E'][i];
                            const optionStats = rankInfo?.optionStats || {};
                            const selectionCount = optionStats[optionLetter] || 0;
                            const totalSelections = Object.values(optionStats).reduce((sum, count) => sum + count, 0);
                            const selectionRate = totalSelections > 0 ? Math.round((selectionCount / totalSelections) * 100) : 0;
                            const isFrequentlyWrong = !isCorrect && selectionCount > 0 && selectionRate >= 15;
                            return (
                                <div key={i} className={`p-3 sm:p-4 rounded-xl border-2 text-xs sm:text-sm flex gap-2 sm:gap-3 transition-all ${
                                    isCorrect ? 'bg-green-50 border-green-300 text-green-900 shadow-sm' :
                                    isFrequentlyWrong ? 'bg-red-50 border-red-300 text-red-900 shadow-sm' :
                                    'bg-white border-slate-100 text-slate-600'}`}>
                                    <span className={`font-bold shrink-0 ${isCorrect ? 'text-green-700' : isFrequentlyWrong ? 'text-red-700' : 'text-slate-400'}`}>
                                        {optionLetter}.
                                    </span>
                                    <span className="flex-1 min-w-0">{opt}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {isCorrect && <CheckCircle size={14} className="sm:w-[18px] sm:h-[18px] text-green-600"/>}
                                        {isFrequentlyWrong && <XCircle size={14} className="sm:w-[18px] sm:h-[18px] text-red-600"/>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="bg-indigo-50 p-4 sm:p-5 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-xs sm:text-sm">
                            <Zap size={16} className="sm:w-[18px] sm:h-[18px] text-indigo-600"/> <span>答案解析</span>
                        </div>
                        <Markdown content={explanation} size="sm" className="text-indigo-800 text-xs sm:text-sm leading-relaxed"/>
                        {renderUserExplanations(id)}
                    </div>
                </div>
            </div>
        </div>
    );
};
