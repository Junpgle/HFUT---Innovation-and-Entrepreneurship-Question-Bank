import { useMemo } from 'react';
import { BookOpen, Brain, DownloadCloud, FileDown, FileUp, Github, GraduationCap, Info, Loader2, Settings, Trash2, UploadCloud, Wand2 } from 'lucide-react';
import CustomUploadModal from './CustomUploadModal.jsx';
import AIQuestionModal from './AIQuestionModal.jsx';
import ApiSettingsModal from './ApiSettingsModal.jsx';
import mottos from './data/mottos.json';

export const SubjectSelector = ({ 
    allSubjects, 
    showUploadModal, 
    setShowUploadModal, 
    showAiModal,
    setShowAiModal,
    showApiSettingsModal,
    setShowApiSettingsModal,
    setSelectedSubject, 
    setBankStatus, 
    setAllQuestionBank, 
    handleDeleteCustomSubject, 
    customSubjects, 
    setCustomSubjects, 
    safeSet, 
    getBankCacheKey,
    currentUser,
    onLogout,
    themeMode,
    setThemeMode,
    onManualSync,
    onManualRestore,
    onExport,
    onImport,
    syncStatus,
    onRequireLogin,
}) => {
    const isGuest = !currentUser;
    const motto = useMemo(() => {
        const now = new Date();
        const seed = now.getHours() + now.getDate() * 24 + (now.getMonth() * 744);
        return mottos[seed % mottos.length];
    }, []);
    const nextModeMap = {
        'system': 'light',
        'light': 'dark',
        'dark': 'auto',
        'auto': 'system'
    };
    
    const labelMap = {
        'system': '🌗 主题: 跟随系统',
        'light': '☀️ 主题: 极简日间',
        'dark': '🌙 主题: 护眼夜间',
        'auto': '⏰ 主题: 自动切换'
    };

    return (
        <div className="min-h-screen w-full overflow-x-hidden flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
            <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl">
                <div className="text-center mb-8 md:mb-14 flex flex-col items-center">
                    {currentUser && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700 mb-4 shadow-sm animate-fade-in shrink-0 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            👋 欢迎回来，{currentUser.username}
                        </div>
                    )}
                    {!currentUser && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700 mb-4 shadow-sm animate-fade-in shrink-0 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-400">
                            未登录：仅可使用自定义本地题库
                            <button
                                onClick={onRequireLogin}
                                className="ml-1 px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-300"
                            >
                                去登录
                            </button>
                        </div>
                    )}
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-3 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3 hover:rotate-12 transition-transform duration-300 dark:shadow-indigo-900/20">
                        <BookOpen size={24} className="sm:w-8 sm:h-8 md:w-10 md:h-10"/>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight dark:text-slate-100">HFUT 刷题系统</h1>
                    <p className="text-slate-500 mt-2 font-semibold text-xs sm:text-sm md:text-base dark:text-slate-400">{motto}</p>
                    
                    {/* 快捷直达操作菜单 */}
                    <div className="flex justify-center gap-2 sm:gap-3 mt-6 flex-wrap relative z-30">
                        {/* 学习报表 */}
                        <a href="/#/report" className="px-3 sm:px-4 py-2.5 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 no-underline dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:border-blue-900/50">
                            📈 数据报表
                        </a>
                        {/* 产品介绍 */}
                        <a href="/#/introduce" className="px-3 sm:px-4 py-2.5 bg-white text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 no-underline dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-indigo-400 dark:hover:border-indigo-900/50">
                            <Info size={14} /> 产品介绍
                        </a>
                        {/* 备份 */}
                        <button onClick={onManualSync} disabled={syncStatus === 'uploading' || isGuest} className="px-3 sm:px-4 py-2.5 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:border-blue-900/50">
                            {syncStatus === 'uploading' ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} 备份
                        </button>
                        {/* 恢复 */}
                        <button onClick={onManualRestore} disabled={syncStatus === 'downloading' || isGuest} className="px-3 sm:px-4 py-2.5 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-60 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:border-blue-900/50">
                            {syncStatus === 'downloading' ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />} 恢复
                        </button>
                        {/* 导出 */}
                        <button onClick={onExport} className="px-3 sm:px-4 py-2.5 bg-white text-blue-600 hover:text-blue-700 border border-blue-100 hover:border-blue-300 hover:bg-blue-50 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-950/40">
                            <FileUp size={14} /> 导出
                        </button>
                        {/* 导入 */}
                        <label className="px-3 sm:px-4 py-2.5 bg-white text-indigo-600 hover:text-indigo-700 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-950/40">
                            <FileDown size={14} /> 导入
                            <input type="file" className="hidden" accept=".json" onChange={onImport} />
                        </label>
                        <button onClick={() => setShowApiSettingsModal(true)} className="px-3 sm:px-4 py-2.5 bg-white text-violet-600 hover:text-violet-700 border border-violet-100 hover:border-violet-300 hover:bg-violet-50 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-violet-950/20 dark:border-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-950/40">
                            <Settings size={14} /> API 设置
                        </button>
                        {/* 主题切换 */}
                        <button onClick={() => setThemeMode(nextModeMap[themeMode])} className="px-3 sm:px-4 py-2.5 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:border-blue-900/50">
                            {labelMap[themeMode] || '🌗 切换主题'}
                        </button>
                        {/* 登录/退出 */}
                        {currentUser ? (
                            <button onClick={() => {
                                if (window.confirm('确定要退出当前账号登录吗？')) {
                                    onLogout();
                                }
                            }} className="px-3 sm:px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/40">
                                🚪 退出登录
                            </button>
                        ) : (
                            <button onClick={onRequireLogin} className="px-3 sm:px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
                                🔐 去登录
                            </button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {allSubjects.map(subject => {
                        const isCustom = subject.isCustom;
                        const isInnovation = subject.id === 'innovation';
                        const Icon = isCustom ? GraduationCap : (isInnovation ? Brain : BookOpen);
                        const disabledForGuest = isGuest && !isCustom;
                        return (
                            <div
                                key={subject.id}
                                role="button"
                                tabIndex={0}
                                onClick={async () => {
                                    if (disabledForGuest) {
                                        alert("未登录状态仅支持自定义本地题库。请先登录后使用在线题库。");
                                        return;
                                    }
                                    setSelectedSubject(subject.id);
                                    setBankStatus('idle');
                                    setAllQuestionBank({});
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (disabledForGuest) {
                                            alert("未登录状态仅支持自定义本地题库。请先登录后使用在线题库。");
                                            return;
                                        }
                                        setSelectedSubject(subject.id);
                                        setBankStatus('idle');
                                        setAllQuestionBank({});
                                    }
                                }}
                                className={`group relative overflow-hidden bg-white rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 shadow-sm transition-all duration-300 border-2 text-left dark:bg-slate-900 dark:border-slate-800 dark:shadow-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    disabledForGuest
                                        ? 'opacity-55 border-slate-200 dark:border-slate-800'
                                        : 'hover:shadow-xl border-slate-100 hover:border-blue-200 hover:-translate-y-1 dark:hover:border-blue-900/60 dark:hover:shadow-blue-900/5'
                                }`}
                            >
                                {isCustom && (
                                    <button
                                        onClick={(e) => handleDeleteCustomSubject(e, subject.id)}
                                        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-20 dark:hover:bg-red-950/30"
                                        title="删除该自定义学科"
                                    >
                                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                    </button>
                                )}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:opacity-100 transition-opacity blur-2xl dark:bg-blue-950/20"/>
                                <div className="relative z-10">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-5 ${isCustom ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' : (isInnovation ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400')}`}>
                                        {isCustom ? <span className="text-lg sm:text-xl md:text-2xl">{subject.icon}</span> : <Icon size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7"/>}
                                    </div>
                                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-1 sm:mb-2 dark:text-slate-100">{subject.shortName || subject.name}</h2>
                                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed dark:text-slate-400">
                                        {isCustom
                                            ? '用户自定义本地上传题库，纯离线安全刷题'
                                            : (isInnovation
                                                ? '7个章节 + 经典旧题库，涵盖创新创业基础全部内容'
                                                : '9个章节，涵盖毛泽东思想和中国特色社会主义理论体系概论全部内容')}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="group relative overflow-hidden bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 hover:bg-white hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] md:min-h-[220px] hover:-translate-y-1 dark:bg-slate-950/20 dark:border-slate-800 dark:hover:bg-slate-900/30 dark:hover:border-blue-900"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-blue-950/40 dark:group-hover:text-blue-400">
                            <UploadCloud size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" />
                        </div>
                        <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-700 group-hover:text-slate-800 mb-1 dark:text-slate-300 dark:group-hover:text-slate-100">从本地上传自定义题库</h2>
                        <p className="text-xs text-slate-400 max-w-[180px] sm:max-w-[200px] leading-relaxed dark:text-slate-500">支持 JSON 或 Excel 格式，纯离线安全使用</p>
                    </button>
                    <button
                        onClick={() => setShowAiModal(true)}
                        className="group relative overflow-hidden bg-violet-50/60 border-2 border-dashed border-violet-300 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 hover:bg-white hover:border-violet-500 hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] md:min-h-[220px] hover:-translate-y-1 dark:bg-violet-950/10 dark:border-violet-900/50 dark:hover:bg-slate-900/30"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 bg-violet-100 text-violet-600 group-hover:bg-violet-200 transition-colors dark:bg-violet-950/40 dark:text-violet-400">
                            <Wand2 size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" />
                        </div>
                        <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-700 group-hover:text-slate-800 mb-1 dark:text-slate-300 dark:group-hover:text-slate-100">AI 出题并导入题库</h2>
                        <p className="text-xs text-slate-400 max-w-[180px] sm:max-w-[200px] leading-relaxed dark:text-slate-500">独立页面填写 API 与资料，支持提示词复制和直连生成</p>
                    </button>
                </div>
                <div className="flex justify-center mt-10">
                    <a
                        href="https://github.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors text-xs"
                    >
                        <Github size={16} />
                        <span>GitHub</span>
                    </a>
                </div>
            </div>
            <CustomUploadModal
                show={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onUploadComplete={(newSubject, bankData) => {
                    const updated = [...customSubjects, newSubject];
                    setCustomSubjects(updated);
                    safeSet('custom_subjects_list', updated);
                    safeSet(getBankCacheKey(newSubject.id), bankData);
                    setShowUploadModal(false);
                    setSelectedSubject(newSubject.id);
                    setBankStatus('idle');
                    setAllQuestionBank({});
                }}
            />
            <AIQuestionModal
                show={showAiModal}
                onClose={() => setShowAiModal(false)}
                onUploadComplete={(newSubject, bankData) => {
                    const updated = [...customSubjects, newSubject];
                    setCustomSubjects(updated);
                    safeSet('custom_subjects_list', updated);
                    safeSet(getBankCacheKey(newSubject.id), bankData);
                    setShowAiModal(false);
                    setSelectedSubject(newSubject.id);
                    setBankStatus('idle');
                    setAllQuestionBank({});
                }}
            />
            <ApiSettingsModal
                show={showApiSettingsModal}
                onClose={() => setShowApiSettingsModal(false)}
            />
        </div>
    );
};
