import { useState } from 'react';
import { AlertCircle, Brain, ChevronRight } from 'lucide-react';
import { api } from './api';

export const LoginScreen = ({ brushedCount, setCurrentUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);
        try {
            const user = await api.login(username, password);
            setCurrentUser(user);
            setAuthLoading(false);
        } catch (err) {
            setAuthError(err.message || "登录失败");
            setAuthLoading(false);
        }
    };

    return (
        <div className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="glass p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
                <div className="text-center mb-8">
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3">
                        <Brain size={32} className="md:w-10 md:h-10"/>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">HFUT 刷题系统</h1>
                    <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">Pro 学习系统</p>
                    {brushedCount > 0 &&
                        <p className="text-xs text-blue-500 mt-2">本地缓存: {brushedCount} 题记录</p>}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                    <div className="space-y-4">
                        <input type="text" required placeholder="用户名"
                               className="w-full px-5 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                               value={username} onChange={e => setUsername(e.target.value)}/>
                        <input type="password" required placeholder="密码"
                               className="w-full px-5 py-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                               value={password} onChange={e => setPassword(e.target.value)}/>
                    </div>
                    {authError &&
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle size={16}/>{authError}</div>}
                    <button disabled={authLoading}
                            className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:shadow-xl transition-all disabled:opacity-70">
                        {authLoading ? '登录中...' : '立即登录'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <a href="/#/register"
                       className="text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors flex items-center justify-center gap-1">
                        没有账号？<span className="underline decoration-blue-300 decoration-2 underline-offset-2">去注册新账号</span>
                        <ChevronRight size={14}/>
                    </a>
                </div>
            </div>
        </div>
    );
};
