import { BookOpen, Brain, GraduationCap, Trash2, UploadCloud } from 'lucide-react';
import CustomUploadModal from './CustomUploadModal.jsx';

export const SubjectSelector = ({ allSubjects, showUploadModal, setShowUploadModal, setSelectedSubject, setBankStatus, setAllQuestionBank, handleDeleteCustomSubject, customSubjects, setCustomSubjects, safeSet, getBankCacheKey }) => (
    <div className="h-full flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="w-full max-w-2xl">
            <div className="text-center mb-6 md:mb-10">
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-6 shadow-lg shadow-blue-500/30 text-white transform rotate-3">
                    <BookOpen size={24} className="sm:w-8 sm:h-8 md:w-10 md:h-10"/>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">HFUT 刷题系统</h1>
                <p className="text-slate-500 mt-2 font-medium text-xs sm:text-sm md:text-base">请选择要练习的学科</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {allSubjects.map(subject => {
                    const isCustom = subject.isCustom;
                    const isInnovation = subject.id === 'innovation';
                    const Icon = isCustom ? GraduationCap : (isInnovation ? Brain : BookOpen);
                    return (
                        <button
                            key={subject.id}
                            onClick={async () => {
                                setSelectedSubject(subject.id);
                                setBankStatus('idle');
                                setAllQuestionBank({});
                            }}
                            className="group relative bg-white rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 text-left hover:-translate-y-1"
                        >
                            {isCustom && (
                                <button
                                    onClick={(e) => handleDeleteCustomSubject(e, subject.id)}
                                    className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-20"
                                    title="删除该自定义学科"
                                >
                                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                </button>
                            )}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:opacity-100 transition-opacity blur-2xl"/>
                            <div className="relative z-10">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 md:mb-5 ${isCustom ? 'bg-amber-100 text-amber-600' : (isInnovation ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600')}`}>
                                    {isCustom ? <span className="text-lg sm:text-xl md:text-2xl">{subject.icon}</span> : <Icon size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7"/>}
                                </div>
                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-1 sm:mb-2">{subject.shortName || subject.name}</h2>
                                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                    {isCustom
                                        ? '用户自定义本地上传题库，纯离线安全刷题'
                                        : (isInnovation
                                            ? '7个章节 + 经典旧题库，涵盖创新创业基础全部内容'
                                            : '9个章节，涵盖毛泽东思想和中国特色社会主义理论体系概论全部内容')}
                                </p>
                            </div>
                        </button>
                    );
                })}
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="group relative bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 hover:bg-white hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-center flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] md:min-h-[220px] hover:-translate-y-1"
                >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <UploadCloud size={20} className="sm:w-6 sm:h-6 md:w-7 md:h-7" />
                    </div>
                    <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-700 group-hover:text-slate-800 mb-1">从本地上传自定义题库</h2>
                    <p className="text-xs text-slate-400 max-w-[180px] sm:max-w-[200px] leading-relaxed">支持 JSON 或 Excel 格式，纯离线安全使用</p>
                </button>
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
    </div>
);
