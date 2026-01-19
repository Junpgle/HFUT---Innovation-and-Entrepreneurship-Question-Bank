import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Loader2, ArrowLeft, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

// --- API 基础配置 ---
const API_BASE = 'https://worker.junpgle.me/api';

const api = {
    async request(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('auth_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });

            if (res.status === 401) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_info');
                return null;
            }

            const responseText = await res.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                if (!res.ok) {
                    throw new Error(`[${res.status}] ${responseText || '接口不存在或服务器异常'}`);
                }
                return responseText;
            }

            if (!res.ok) {
                throw new Error(data.error || `请求失败 (${res.status})`);
            }
            return data;
        } catch (err) {
            console.error('API Error:', err.message);
            throw err;
        }
    },

    async register(username, password, email) {
        return await this.request('/register', 'POST', { username, password, email });
    },

    async verifyEmail(email, code) {
        return await this.request('/verify-email', 'POST', { email, code });
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        window.location.hash = "/";
        window.location.reload();
    }
};

const Register = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', code: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', isError: false });

    // 倒计时状态
    const [countdown, setCountdown] = useState(0);

    // 处理倒计时逻辑
    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const showMsg = (text, isError = true) => {
        setMessage({ text, isError });
        if (isError) setTimeout(() => setMessage({ text: '', isError: false }), 6000);
    };

    // 1. 提交注册 (同时也用于重发)
    const handleRegister = async (e, isResend = false) => {
        if (e) e.preventDefault();
        setLoading(true);
        setMessage({ text: '', isError: false });

        try {
            await api.register(formData.username, formData.password, formData.email);
            if (!isResend) setStep(2);
            setCountdown(60); // 开启 60 秒重发倒计时
            showMsg(isResend ? "验证码已重新发送" : "验证码已发送至您的邮箱", false);
        } catch (err) {
            showMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 2. 验证激活
    const handleVerify = async (e) => {
        e.preventDefault();
        if (formData.code.length !== 6) return showMsg("请输入 6 位验证码");

        setLoading(true);
        try {
            await api.verifyEmail(formData.email, formData.code);
            showMsg("🎉 账号激活成功！正在为您跳转...", false);
            setTimeout(() => { window.location.hash = "/"; }, 2000);
        } catch (err) {
            showMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4"
             style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(30, 64, 175, 0.2) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.2) 0, transparent 50%)' }}>
            <div className="w-full max-w-md p-8 rounded-[2rem] bg-slate-800/60 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl inline-flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                        {step === 1 ? <UserPlus size={32} /> : <Mail size={32} />}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {step === 1 ? '注册新账号' : '验证您的邮箱'}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {step === 1 ? 'HFUT 创新创业题库' : `验证码已发送至 ${formData.email}`}
                    </p>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm animate-in zoom-in-95 duration-200 ${
                        message.isError ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                    }`}>
                        {message.isError ? <XCircle className="shrink-0" size={18} /> : <CheckCircle2 className="shrink-0" size={18} />}
                        <span className="flex-1 break-all leading-relaxed">{message.text}</span>
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={(e) => handleRegister(e, false)} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">用户名 *</label>
                            <input type="text" placeholder="设置用户名" required className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">电子邮箱 *</label>
                            <input type="email" placeholder="接收激活邮件" required className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">密码 *</label>
                            <input type="password" placeholder="至少6位密码" required className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        </div>
                        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] py-4 rounded-xl font-bold flex justify-center shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : '注册并发送验证码'}
                        </button>
                        <a href="/#/" className="block text-center text-sm text-slate-400 hover:text-white mt-4 transition-colors">
                            已有账号？ <span className="text-blue-400 font-medium">返回登录</span>
                        </a>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">请输入 6 位验证码</label>
                            <input type="text" placeholder="000000" maxLength={6} required className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-4 text-center text-3xl font-bold tracking-[0.75rem] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                        </div>

                        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] py-4 rounded-xl font-bold flex justify-center shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : '验证并激活账号'}
                        </button>

                        <div className="space-y-4 pt-2">
                            <button
                                type="button"
                                disabled={loading || countdown > 0}
                                onClick={() => handleRegister(null, true)}
                                className="w-full flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:text-slate-500 transition-colors font-medium"
                            >
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                {countdown > 0 ? `${countdown}秒后可重新发送` : '没有收到邮件？点击重发'}
                            </button>

                            <button type="button" onClick={() => setStep(1)} className="w-full flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                                <ArrowLeft size={16} /> 信息填错了？返回修改
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Register;