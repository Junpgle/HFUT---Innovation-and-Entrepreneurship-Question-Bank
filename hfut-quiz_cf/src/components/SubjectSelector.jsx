import { BookOpen, ChevronRight, GraduationCap } from 'lucide-react';

export function SubjectSelector({ subjects, onSelectSubject }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-6 border border-slate-200">
            <GraduationCap size={40} className="text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">选择学科</h1>
          <p className="text-slate-500 text-lg">请选择要开始学习的课程</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {subjects.map((subject) => (
            <button key={subject.id} onClick={() => onSelectSubject(subject.id)} className="group bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl border border-slate-200 hover:border-blue-300 transition-all duration-300 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-500" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-5xl">{subject.icon}</div>
                  <div className="p-3 bg-slate-100 group-hover:bg-blue-100 rounded-xl transition-colors">
                    <ChevronRight size={24} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">{subject.shortName || subject.name}</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{subject.name}</p>

                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  <BookOpen size={16} />
                  <span className="text-sm">开始学习</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
