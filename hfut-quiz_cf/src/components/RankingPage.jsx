import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Layers, RefreshCw, TrendingUp, Trophy } from 'lucide-react';

export function RankingPage({ wrongQuestionRanking, onBack, onRefresh, onOpenQuestion }) {
  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <div className="bg-white border-b border-slate-200 p-4 md:p-6 flex justify-between items-center sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
          <ChevronLeft size={18} /> 返回
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="text-orange-600" size={24} /> 全站易错榜
        </h1>
        <button onClick={onRefresh} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all" title="刷新榜单">
          <RefreshCw size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {wrongQuestionRanking.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无数据或加载中...</p>
            </div>
          ) : (
            wrongQuestionRanking.map((item, index) => (
              <div key={item.questionId} onClick={() => onOpenQuestion(item)} className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 hover:border-orange-300 transition-all cursor-pointer group">
                <div className="flex gap-4">
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {index < 3 ? <Trophy size={24} /> : (index + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-slate-800 text-base md:text-lg leading-snug group-hover:text-orange-600 transition-colors">{item.questionTitle}</h3>
                      <span className="shrink-0 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold">错{item.errorCount}次</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Layers size={14} /> {item.category}</span>
                      <span className="flex items-center gap-1"><AlertTriangle size={14} /> 错误率 {item.errorRate}%</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
