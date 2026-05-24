import { useMemo, useState } from 'react';
import { BookOpen, Brain, ChevronLeft, ChevronRight, DownloadCloud, FileDown, FileUp, Github, GraduationCap, Info, Loader2, Maximize, Minimize, Settings, Trash2, UploadCloud, User, Wand2 } from 'lucide-react';
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
    isFullscreen,
    onToggleFullscreen,
    onlineCount,
}) => {
    const isGuest = !currentUser;
    const [activeCategory, setActiveCategory] = useState('全部');
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);

    // 从本地存储加载分类/简称/图标的属性覆盖
    const [overrides, setOverrides] = useState(() => {
        try {
            const raw = localStorage.getItem('hf_subject_overrides');
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    });

    // 从本地存储加载学科的自定义排列顺序
    const [sortOrder, setSortOrder] = useState(() => {
        try {
            const raw = localStorage.getItem('hf_subject_sort_order');
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    });

    // 1. 合并自定义属性覆盖，并依据 sortOrder 进行用户排序，计算出定制后的科目列表
    const customizedSubjects = useMemo(() => {
        let list = allSubjects.map(s => {
            const override = overrides[s.id] || {};
            return {
                ...s,
                name: override.name || s.name,
                shortName: override.shortName || s.shortName,
                icon: override.icon || s.icon,
                category: override.category !== undefined ? override.category : (s.category || (s.isCustom ? '自建题库' : '官方课程'))
            };
        });

        if (sortOrder && sortOrder.length > 0) {
            const orderMap = {};
            sortOrder.forEach((id, index) => {
                orderMap[id] = index;
            });
            list.sort((a, b) => {
                const indexA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999;
                const indexB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999;
                return indexA - indexB;
            });
        }
        return list;
    }, [allSubjects, overrides, sortOrder]);

    // 2. 前移或后移题库排序 (与相邻节点位置对换)
    const handleMoveSubject = (id, direction) => {
        const currentIds = customizedSubjects.map(s => s.id);
        const idx = currentIds.indexOf(id);
        if (idx === -1) return;

        if (direction === 'left' && idx > 0) {
            const newIds = [...currentIds];
            const temp = newIds[idx];
            newIds[idx] = newIds[idx - 1];
            newIds[idx - 1] = temp;
            setSortOrder(newIds);
            localStorage.setItem('hf_subject_sort_order', JSON.stringify(newIds));
        } else if (direction === 'right' && idx < currentIds.length - 1) {
            const newIds = [...currentIds];
            const temp = newIds[idx];
            newIds[idx] = newIds[idx + 1];
            newIds[idx + 1] = temp;
            setSortOrder(newIds);
            localStorage.setItem('hf_subject_sort_order', JSON.stringify(newIds));
        }
    };

    // 3. 一键清空所有分类覆盖和排序历史，恢复到出厂默认状态
    const handleResetCustomization = () => {
        if (window.confirm('确定要重置所有学科的分类、名称和排序回默认状态吗？')) {
            setOverrides({});
            setSortOrder([]);
            localStorage.removeItem('hf_subject_overrides');
            localStorage.removeItem('hf_subject_sort_order');
            setIsEditingOrder(false);
            setActiveCategory('全部');
        }
    };

    // 动态从定制后的科目列表中收集所有现有分类
    const categories = useMemo(() => {
        const cats = new Set();
        cats.add('全部');
        customizedSubjects.forEach(s => {
            cats.add(s.category);
        });
        return Array.from(cats);
    }, [customizedSubjects]);

    // 筛选当前分类下的学科列表，具备自适应防错能力（若当前选中分类已被重命名改写，则自动安全退回至“全部”显示）
    const filteredSubjects = useMemo(() => {
        const isPresent = categories.includes(activeCategory);
        const currentCat = isPresent ? activeCategory : '全部';
        if (currentCat === '全部') return customizedSubjects;
        return customizedSubjects.filter(s => s.category === currentCat);
    }, [customizedSubjects, activeCategory, categories]);

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
        'system': '🌗 跟随系统',
        'light': '☀️ 极简日间',
        'dark': '🌙 护眼夜间',
        'auto': '⏰ 自动切换'
    };

    return (
        <div className="min-h-screen w-full overflow-x-hidden flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-transparent">
            {/* 手机端右上角全屏按钮 */}
            <button onClick={onToggleFullscreen} className="fixed top-3 right-3 z-50 p-2.5 bg-white/80 backdrop-blur text-slate-600 rounded-full shadow-md border border-slate-200 sm:hidden dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-300">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
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
                    {onlineCount !== null && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700 mb-4 shadow-sm animate-fade-in dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400">
                            <User size={12} /> 在线：{onlineCount}
                        </div>
                    )}
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mb-3 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3 hover:rotate-12 transition-transform duration-300 dark:shadow-indigo-900/20">
                        <BookOpen size={24} className="sm:w-8 sm:h-8 md:w-10 md:h-10"/>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight dark:text-slate-100">HFUT 刷题系统</h1>
                    <p className="text-slate-500 mt-2 font-semibold text-xs sm:text-sm md:text-base dark:text-slate-400">{motto}</p>
                    
                    {/* 快捷直达操作菜单 */}
                    <div className="flex justify-center gap-2 sm:gap-3 mt-6 flex-wrap relative z-30">
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
                        {/* 全屏 */}
                        <button onClick={onToggleFullscreen} className="hidden sm:flex px-3 sm:px-4 py-2.5 bg-white text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-xl text-xs sm:text-sm font-bold items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:border-blue-900/50">
                            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />} {isFullscreen ? '退出全屏' : '全屏'}
                        </button>
                        {/* 整理与排序 */}
                        <button
                            onClick={() => setIsEditingOrder(!isEditingOrder)}
                            className={`px-3 sm:px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${
                                isEditingOrder
                                    ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900/40 dark:text-orange-400'
                                    : 'bg-white text-slate-600 hover:text-blue-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:border-blue-900/50'
                            }`}
                        >
                            ✏️ {isEditingOrder ? '完成整理' : '整理 & 排序'}
                        </button>
                        {isEditingOrder && (
                            <button
                                onClick={handleResetCustomization}
                                className="px-3 sm:px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                                🔄 恢复默认
                            </button>
                        )}

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

                {/* 🏷️ 首页题库分类页签导航栏 (高颜值微交互) */}
                <div className="flex justify-center items-center mb-8 md:mb-10 animate-fade-in relative z-20">
                    <div className="inline-flex p-1.5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm max-w-full overflow-x-auto no-scrollbar gap-1 sm:gap-2">
                        {categories.map(cat => {
                            const isActive = activeCategory === cat;
                            // 智能匹配美观的 Emoji 图标
                            let icon = '🌟';
                            if (cat === '公共课程') icon = '🚀';
                            else if (cat === '思想政治') icon = '📖';
                            else if (cat === '自建题库') icon = '📁';
                            else if (cat === '官方课程') icon = '📚';
                            
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 transform outline-none shrink-0 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 scale-[1.03]'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <span className="text-sm shrink-0">{icon}</span>
                                    <span>{cat}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {filteredSubjects.map(subject => {
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
                                {isEditingOrder && (
                                    <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center gap-3 transition-all animate-fade-in rounded-2xl sm:rounded-[2rem]">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveSubject(subject.id, 'left'); }}
                                                disabled={customizedSubjects.findIndex(s => s.id === subject.id) === 0}
                                                className="p-2 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 border-0 cursor-pointer flex items-center justify-center"
                                                title="前移"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingSubject(subject); }}
                                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 text-xs border-0 cursor-pointer"
                                                title="编辑分类和属性"
                                            >
                                                <Settings size={14} /> 编辑
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveSubject(subject.id, 'right'); }}
                                                disabled={customizedSubjects.findIndex(s => s.id === subject.id) === customizedSubjects.length - 1}
                                                className="p-2 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 border-0 cursor-pointer flex items-center justify-center"
                                                title="后移"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                        <span className="text-[10px] text-white/95 font-semibold bg-slate-900/60 px-2.5 py-0.5 rounded-full select-none">
                                            分类: {subject.category || '未归类'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* 只有在“全部”或者“自建题库”分类下，才显示自定义本地上传及 AI 出题卡片，防止官方课程栏被无关卡片打乱 */}
                    {(activeCategory === '全部' || activeCategory === '自建题库') && (
                        <>
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
                        </>
                    )}
                </div>
                <div className="flex justify-center items-center gap-4 sm:gap-6 mt-10 text-xs text-slate-400 dark:text-slate-500">
                    <a href="/#/report" className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline">
                        📈 数据报表
                    </a>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <a href="/#/introduce" className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors no-underline">
                        <Info size={13} /> 产品介绍
                    </a>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <a
                        href="https://github.com/Junpgle/HFUT---Innovation-and-Entrepreneurship-Question-Bank"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <Github size={13} /> GitHub
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
            <EditSubjectModal
                key={editingSubject?.id || 'none'}
                show={editingSubject !== null}
                subject={editingSubject}
                existingCategories={categories}
                onClose={() => setEditingSubject(null)}
                onSave={(id, newAttrs) => {
                    const newOverrides = {
                        ...overrides,
                        [id]: newAttrs
                    };
                    setOverrides(newOverrides);
                    localStorage.setItem('hf_subject_overrides', JSON.stringify(newOverrides));
                    setEditingSubject(null);
                }}
            />
        </div>
    );
};

// ✏️ 学科属性及分类高级编辑器模态框 (高档毛玻璃感 UI)
const EditSubjectModal = ({ show, subject, onSave, onClose, existingCategories }) => {
    const [name, setName] = useState(subject?.name || '');
    const [shortName, setShortName] = useState(subject?.shortName || '');
    const [icon, setIcon] = useState(subject?.icon || '');
    const [category, setCategory] = useState(subject?.category || '');

    if (!show || !subject) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(subject.id, { name, shortName, icon, category });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/80 rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scale-up relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>✏️ 编辑题库属性</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 border-0 bg-transparent cursor-pointer text-xl outline-none"
                    >
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1">分类名称 (直接在下方输入框打字创建新分类)</label>
                        <input
                            type="text"
                            required
                            placeholder="如: 公共课程, 思想政治, 大三课程"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-200"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                        {/* 常用分类快捷填入 */}
                        {existingCategories && existingCategories.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-1">常用:</span>
                                {existingCategories.filter(c => c !== '全部').map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setCategory(c)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-colors"
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1">图标 (Emoji)</label>
                            <input
                                type="text"
                                required
                                placeholder="🚀"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 text-center outline-none text-base font-bold text-slate-800 dark:text-slate-200"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1">显示简称</label>
                            <input
                                type="text"
                                required
                                placeholder="如: 毛概"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-200"
                                value={shortName}
                                onChange={(e) => setShortName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1">题库全称</label>
                        <input
                            type="text"
                            required
                            placeholder="如: 创新创业基础习题"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-200"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border-0 cursor-pointer text-sm"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all border-0 cursor-pointer text-sm"
                        >
                            保存修改
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
