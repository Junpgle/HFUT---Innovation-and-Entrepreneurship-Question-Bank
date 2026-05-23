import { ChevronLeft, ChevronRight } from 'lucide-react';

export function QuizNavControls({
  currentIndex,
  total,
  isQuiz,
  onPrev,
  onNext,
  onMemorizeNext,
}) {
  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center gap-2 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-3 w-full">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex-1 max-w-[120px] px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 shadow-sm text-center inline-flex items-center justify-center gap-1 whitespace-nowrap border border-slate-200"
          >
            <ChevronLeft size={14} /> 上一题
          </button>
          <div className="text-xs text-slate-500 font-semibold w-16 text-center shrink-0">{currentIndex + 1}/{total}</div>
          <button
            onClick={isQuiz ? onNext : onMemorizeNext}
            className="flex-1 max-w-[140px] px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-md text-center inline-flex items-center justify-center gap-1 whitespace-nowrap"
          >
            {isQuiz ? (currentIndex === total - 1 ? '完成' : '下一题') : '记住了'}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="hidden md:block sticky md:top-24 self-start">
        <div className="flex flex-col items-center gap-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200 px-3 py-5 w-fit min-w-[64px]">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 transition flex items-center justify-center text-[12px] shadow-sm px-2"
            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
          >
            <ChevronLeft size={12} /> 上一题
          </button>
          <div className="text-[11px] text-slate-500 font-semibold border-y border-slate-100 py-1 w-full text-center">{currentIndex + 1}/{total}</div>
          {isQuiz ? (
            <button
              onClick={onNext}
              className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-white bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition flex items-center justify-center text-[12px] shadow-md px-2"
              style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
            >
              {currentIndex === total - 1 ? '完成' : '下一题'}
              <ChevronRight size={12} />
            </button>
          ) : (
            <button
              onClick={onMemorizeNext}
              className="w-full min-w-[64px] min-h-[110px] rounded-full font-bold text-white bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 transition flex items-center justify-center text-[12px] shadow-md px-2"
              style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
            >
              记住了，下一题 <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
