import React, { useState, useEffect } from 'react';
import {
    Brain, Rocket, Zap, BarChart3, ShieldCheck, Users,
    ChevronRight, Star, CheckCircle, ArrowRight,
    GraduationCap, Globe, Github, AlertTriangle, Target,
    Layers, BookOpen, Clock, Search
} from 'lucide-react';

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);
    const [userName, setUserName] = useState(null);

    // 监听滚动以改变导航栏样式
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 🟢 修改点：适配新的 Auth 系统，从 user_info 读取用户信息
    useEffect(() => {
        try {
            const raw = localStorage.getItem('user_info');
            if (raw) {
                const obj = JSON.parse(raw);
                // user_info 结构为 { id, username, email }
                if (obj && obj.username) setUserName(obj.username);
            }
        } catch (e) {
            console.warn('load current user failed', e);
        }
    }, []);

    const goApp = () => { window.location.hash = '#/'; };
    const goReport = () => { window.location.hash = '#/report'; };
    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
            {/* --- 背景氛围光斑 --- */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-violet-200/40 blur-[120px] mix-blend-multiply animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-200/40 blur-[100px] mix-blend-multiply animate-pulse delay-1000"></div>
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-blue-200/30 blur-[80px] mix-blend-multiply animate-pulse delay-2000"></div>
            </div>

            {/* --- 导航栏 --- */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={goApp}>
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
                            <GraduationCap size={22} />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">HFUT CXCY Pro</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
                        <button onClick={() => scrollToSection('features')} className="hover:text-indigo-600 transition-colors">核心功能</button>
                        <button onClick={() => scrollToSection('product')} className="hover:text-indigo-600 transition-colors">产品展示</button>
                        <button onClick={() => scrollToSection('reviews')} className="hover:text-indigo-600 transition-colors">用户评价</button>
                    </div>

                    <div className="flex items-center gap-4">
                        {userName && (
                            <div className="flex items-center gap-3">
                                <span className="hidden md:inline-flex items-center px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold">Hi, {userName}</span>
                                <button onClick={goApp} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                                    进入题库
                                </button>
                            </div>
                        )}
                        {!userName && (
                            <>
                                <button onClick={goApp} className="hidden md:block px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                                    登录
                                </button>
                                <button onClick={() => window.open('register.html', '_blank')} className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-black hover:scale-105 transition-all shadow-lg shadow-slate-200 flex items-center gap-2">
                                    立即注册 <ArrowRight size={14} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- Hero 区域 --- */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Cloudflare 极速驱动
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                            掌握创新思维 <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600">
                                开启高分之旅
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-lg">
                            专为工大学子打造的智能刷题系统。基于边缘计算技术，秒级响应，大数据分析与自动错题收录，让你的复习效率提升 300%。
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={goApp} className="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 text-lg">
                                <Rocket size={20} /> 开始免费练习
                            </button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                            <div className="flex -space-x-2">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                                    </div>
                                ))}
                            </div>
                            <p>加入 <span className="text-slate-800 font-bold">HFUT CXCY Pro</span> 学习社区</p>
                        </div>
                    </div>

                    {/* 右侧：模拟 App 界面悬浮卡片 */}
                    <div className="relative animate-in slide-in-from-right-10 duration-1000 delay-200 hidden lg:block">
                        <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-[2.5rem] rotate-3 opacity-20 blur-2xl"></div>
                        <div className="relative bg-white/60 backdrop-blur-xl border border-white/50 rounded-[2rem] p-6 shadow-2xl shadow-indigo-500/10">
                            {/* 模拟 App 头部 */}
                            <div className="flex justify-between items-center mb-6 opacity-80">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                </div>
                                <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
                            </div>
                            {/* 模拟题目卡片 */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">单选题</span>
                                    <span className="text-xs text-slate-400 font-bold">创新思维与方法</span>
                                </div>
                                <div className="h-4 w-3/4 bg-slate-800 rounded mb-2"></div>
                                <div className="h-4 w-1/2 bg-slate-800 rounded mb-6"></div>
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-12 w-full border-2 border-slate-50 rounded-xl flex items-center px-4 gap-3 opacity-60">
                                            <div className="w-5 h-5 rounded-full border border-slate-200"></div>
                                            <div className="h-2 w-1/3 bg-slate-200 rounded"></div>
                                        </div>
                                    ))}
                                    {/* 选中项 */}
                                    <div className="h-12 w-full bg-indigo-50 border-2 border-indigo-500 rounded-xl flex items-center px-4 gap-3 relative overflow-hidden">
                                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">✓</div>
                                        <div className="h-2 w-2/3 bg-indigo-900/10 rounded"></div>
                                        <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-indigo-100 to-transparent"></div>
                                    </div>
                                </div>
                            </div>
                            {/* 模拟底部数据 */}
                            <div className="flex justify-between items-center px-2">
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><BarChart3 size={18}/></div>
                                    <div>
                                        <div className="h-3 w-8 bg-slate-200 rounded mb-1"></div>
                                        <div className="h-2 w-12 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                                <button className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">下一题</button>
                            </div>
                        </div>

                        {/* 悬浮小卡片 - 错题本 */}
                        <div className="absolute -left-12 bottom-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-bounce delay-700 duration-[3000ms]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">自动收录</div>
                                    <div className="text-lg font-bold text-slate-800">12 题</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 特性介绍区域 --- */}
            <section id="features" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm">Powerful Features</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-6">
                            不仅仅是题库，<br/>更是你的私人助教
                        </h2>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            告别盲目刷题，迎来智能备考新时代。HFUT CXCY Pro 深度融合了“学、练、测、评”的学习闭环，像一位 24 小时待命的 AI 助教。
                            它不仅提供海量题库，更通过智能分析你的每一次点击，精准识别知识盲区，量身定制最高效的提分路径。
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={Layers}
                            color="indigo"
                            title="多模式智能练习"
                            desc="灵活应对不同备考阶段。开启“刷题模式”进行实战演练，模拟真实考试环境；切换“背题模式”快速浏览核心考点与解析，实现短时间内的知识高密度输入。"
                        />
                        <FeatureCard
                            icon={BookOpen}
                            color="rose"
                            title="自动错题收录"
                            desc="所有的错误都是通往满分的阶梯。系统会自动捕捉你的每一次答错记录，生成个性化“错题本”。你可以随时对薄弱环节进行专项突击，确保不二过，稳步提升正确率。"
                        />
                        <FeatureCard
                            icon={Search}
                            color="emerald"
                            title="全局题目搜索"
                            desc="遇到不懂的概念？无需翻阅厚重的教材。内置强大的全文搜索引擎，支持题目、选项、解析的模糊匹配。输入关键词，毫秒级直达知识源头，让知识盲区无所遁形。"
                        />
                        <FeatureCard
                            icon={Zap}
                            color="amber"
                            title="边缘计算加速"
                            desc="基于 Cloudflare 边缘网络，0 秒启动，无广告干扰，极简交互设计。无论是在食堂排队还是课间休息，随时拿出手机刷几道。利用好每一分钟。"
                        />
                        <FeatureCard
                            icon={ShieldCheck}
                            color="blue"
                            title="云端实时同步"
                            desc="采用 D1 分布式数据库，确保学习进度在电脑、平板和手机间无缝流转。在宿舍用电脑刷题，出门用手机复习，数据永不丢失，体验如影随形。"
                        />
                        <FeatureCard
                            icon={Users}
                            color="violet"
                            title="社区互动解析"
                            desc="学习不再是孤军奋战。官方解析晦涩难懂？看看评论区学霸们的通俗解读和独家记忆法。你也可以分享见解，点赞优质内容，与数千名同学互帮互助，共同进步。"
                        />
                    </div>
                </div>
            </section>

            {/* --- 产品深度展示区域 --- */}
            <section id="product" className="py-24 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 space-y-24">

                    {/* 展示 1：智能刷题 */}
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1 relative">
                            {/* 装饰背景 */}
                            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-[100px] opacity-20"></div>
                            {/* 界面模拟 */}
                            <div className="relative bg-white p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex flex-col gap-1">
                                        <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
                                        <div className="h-4 w-32 bg-slate-800 rounded-lg"></div>
                                    </div>
                                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                        <Brain size={20} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">A</div>
                                        <div className="h-2 w-32 bg-indigo-200 rounded-full"></div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 opacity-60">
                                        <div className="w-8 h-8 rounded-full border border-slate-200"></div>
                                        <div className="h-2 w-24 bg-slate-200 rounded-full"></div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 opacity-60">
                                        <div className="w-8 h-8 rounded-full border border-slate-200"></div>
                                        <div className="h-2 w-40 bg-slate-200 rounded-full"></div>
                                    </div>
                                </div>
                                {/* 浮动元素 */}
                                <div className="absolute -right-6 top-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 animate-pulse">
                                    <CheckCircle className="text-emerald-500" size={24} />
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase">正确率</div>
                                        <div className="text-emerald-600 font-bold">+15%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                                <Layers size={24} />
                            </div>
                            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">沉浸式刷题体验</h3>
                            <p className="text-lg text-slate-500 leading-relaxed mb-6">
                                告别繁杂的界面干扰。我们精心设计的刷题界面，让你专注于题目本身。
                                支持键盘快捷键操作，配合流畅的动效反馈，让刷题变成一种享受。
                            </p>
                            <ul className="space-y-3">
                                {[
                                    '支持单选、多选、判断多种题型',
                                    '实时反馈正误，即时解析',
                                    '自动记录做题进度，随时中断继续'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                                        <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <CheckCircle size={14} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 展示 2：错题本 */}
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">自动错题收录</h3>
                            <p className="text-lg text-slate-500 leading-relaxed mb-6">
                                所有的错误都是宝贵的财富。系统会自动将你的错题收录进“错题本”。
                                你可以随时回顾这些薄弱环节，针对性地进行复习，消灭盲点。
                            </p>
                            <div className="flex gap-4">
                                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex-1">
                                    <div className="text-2xl font-bold text-rose-500 mb-1">自动</div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">收录错题</div>
                                </div>
                                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex-1">
                                    <div className="text-2xl font-bold text-amber-500 mb-1">专项</div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">强化训练</div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-rose-200 rounded-full blur-[100px] opacity-20"></div>
                            <div className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                                {/* 错题卡片列表 */}
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 ${i===1 ? 'bg-white border-slate-200 shadow-md scale-105' : 'bg-slate-50 border-transparent opacity-60'}`}>
                                            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                                                <AlertTriangle size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-2 w-20 bg-slate-200 rounded-full mb-2"></div>
                                                <div className="h-2 w-32 bg-slate-100 rounded-full"></div>
                                            </div>
                                            <div className="text-xs font-bold text-rose-500">
                                                {i === 1 ? '待复习' : '已掌握'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* 浮动徽章 */}
                                <div className="absolute -left-4 bottom-10 bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                                    <Clock size={16} />
                                    <span className="text-xs font-bold">复习提醒</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- 用户评价 --- */}
            <section id="reviews" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">听听同学们怎么说</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <ReviewCard
                            name="张同学"
                            text="界面真的太好看了，完全不像是一个刷题软件，像是在用一个高端的 App。错题本功能帮了大忙！"
                            avatar={1}
                        />
                        <ReviewCard
                            name="李同学"
                            text="之前一直担心这门课会挂，用了 HFUT CXCY Pro 刷了一周，考试的时候发现好多原题，稳过！"
                            avatar={5}
                        />
                        <ReviewCard
                            name="王同学"
                            text="搜索功能很强大，复习的时候遇到不懂的概念直接搜题，解析也很详细。强烈推荐给学弟学妹。"
                            avatar={3}
                        />
                    </div>
                </div>
            </section>

            {/* --- CTA (Call to Action) --- */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-300">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-900 opacity-20 rounded-full blur-3xl -ml-20 -mb-20"></div>

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">准备好开始逆袭了吗？</h2>
                        <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                            无需下载 App，打开浏览器即可开始使用。加入 HFUT CXCY Pro，让创新创业课程不再是负担。
                        </p>
                        <button onClick={() => window.open('register.html', '_blank')} className="px-10 py-5 bg-white text-indigo-600 text-lg font-bold rounded-2xl hover:bg-indigo-50 hover:scale-105 transition-all shadow-xl flex items-center gap-2 mx-auto">
                            免费注册账号 <ChevronRight size={20} />
                        </button>
                        <p className="mt-6 text-indigo-200 text-sm opacity-80">
                            * 支持 PC、平板、手机全平台访问
                        </p>
                    </div>
                </div>
            </section>

            {/* --- 页脚 --- */}
            <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                    <GraduationCap size={18} />
                                </div>
                                <span className="text-xl font-bold text-slate-800">HFUT CXCY Pro</span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                                致力于为大学生提供最优质的创新创业课程辅助工具。技术改变学习，创新驱动未来。
                            </p>
                        </div>
                        <div>
                            {/* 产品列已移除 */}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-4">联系我们</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li>
                                    <a
                                        href="https://github.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-indigo-600 flex items-center gap-2"
                                    >
                                        <Github size={14}/> GitHub
                                    </a>
                                </li>
                                <li>
                                    <button onClick={goApp} className="hover:text-indigo-600 flex items-center gap-2">
                                        <Brain size={14}/> 返回主页
                                    </button>
                                </li>
                                <li>
                                    <button onClick={goReport} className="hover:text-indigo-600 flex items-center gap-2">
                                        <BarChart3 size={14}/> 数据报表
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
                        <p>© 2026 HFUT Innovation & Entrepreneurship Pro. All rights reserved.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-slate-600">隐私政策</a>
                            <a href="#" className="hover:text-slate-600">服务条款</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// --- 子组件 ---

const FeatureCard = ({ icon: Icon, color, title, desc }) => {
    const colorClasses = {
        indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
        rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
        emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
        amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
        blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
        violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
    };

    return (
        <div className="group p-8 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 hover:-translate-y-1">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${colorClasses[color]}`}>
                <Icon size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
            <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
        </div>
    );
};

const ReviewCard = ({ name, text, avatar }) => (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex gap-1 text-amber-400 mb-4">
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
        </div>
        <p className="text-slate-600 mb-6 leading-relaxed italic">"{text}"</p>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar}`} alt={name} />
            </div>
            <div>
                <div className="font-bold text-slate-900 text-sm">{name}</div>
            </div>
        </div>
    </div>
);

export default LandingPage;