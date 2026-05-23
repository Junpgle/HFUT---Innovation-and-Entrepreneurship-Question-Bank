import { Brain, AlertCircle, ChevronRight } from 'lucide-react';

export function LoginScreen({ brushedCount, username, password, authLoading, authError, onUsernameChange, onPasswordChange, onSubmit }) {
  return (
    <div className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900">
      <div className="glass p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 dark:border-slate-800/60">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3">
            <Brain size={32} className="md:w-10 md:h-10" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">HFUT 刷题系统</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium text-sm md:text-base">Pro 学习系统</p>
          {brushedCount > 0 && <p className="text-xs text-blue-500 mt-2">本地缓存: {brushedCount} 题记录</p>}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
          <div className="space-y-4">
            <input type="text" required placeholder="用户名" className="w-full px-5 py-3 bg-white/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" value={username} onChange={(e) => onUsernameChange(e.target.value)} />
            <input type="password" required placeholder="密码" className="w-full px-5 py-3 bg-white/50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" value={password} onChange={(e) => onPasswordChange(e.target.value)} />
          </div>
          {authError && <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} />{authError}</div>}
          <button disabled={authLoading} className="w-full py-3.5 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-slate-200 dark:shadow-blue-900/20 hover:shadow-xl transition-all disabled:opacity-70">
            {authLoading ? '登录中...' : '立即登录'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/#/register" className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors flex items-center justify-center gap-1">
            没有账号？<span className="underline decoration-blue-300 decoration-2 underline-offset-2">去注册新账号</span>
            <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
