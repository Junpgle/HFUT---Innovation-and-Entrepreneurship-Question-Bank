import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Markdown = ({content, size = 'sm', className = ''}) => {
    const components = {
        h1: ({...props}) => <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-6 mb-4 border-b border-slate-100 pb-2" {...props} />,
        h2: ({...props}) => <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-5 mb-3" {...props} />,
        h3: ({...props}) => <h3 className="text-lg md:text-xl font-bold text-slate-800 mt-4 mb-2" {...props} />,
        h4: ({...props}) => <h4 className="text-base md:text-lg font-bold text-slate-700 mt-3 mb-2" {...props} />,
        p: ({...props}) => <p className="leading-7 text-slate-700 mb-4 break-words" {...props} />,
        strong: ({...props}) => <strong className="font-bold text-slate-900" {...props} />,
        em: ({...props}) => <em className="italic text-slate-600" {...props} />,
        del: ({...props}) => <del className="line-through text-slate-400" {...props} />,
        hr: ({...props}) => <hr className="my-6 border-slate-200" {...props} />,
        blockquote: ({...props}) => (
            <blockquote className="border-l-4 border-blue-400 bg-blue-50/50 text-slate-600 italic px-4 py-3 rounded-r-lg my-4" {...props} />
        ),
        ul: ({...props}) => <ul className="list-disc pl-5 space-y-1.5 my-3 text-slate-700 marker:text-slate-400" {...props} />,
        ol: ({...props}) => <ol className="list-decimal pl-5 space-y-1.5 my-3 text-slate-700 marker:text-slate-500" {...props} />,
        li: ({...props}) => <li className="pl-1" {...props} />,
        a: ({href, children, ...props}) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors break-all" {...props}>
                {children}
            </a>
        ),
        code: ({node, inline, className, children, ...props}) => {
            if (inline) {
                return <code className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 text-pink-600 font-mono text-[0.9em] border border-slate-200" {...props}>{children}</code>;
            }
            return (
                <div className="relative my-4 rounded-xl overflow-hidden bg-slate-800 shadow-sm group">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700/50">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"/>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"/>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"/>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Code</span>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm text-slate-50 font-mono leading-relaxed custom-scrollbar">
                        <code className={className} {...props}>{children}</code>
                    </pre>
                </div>
            );
        },
        table: ({...props}) => (
            <div className="my-6 w-full overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm text-slate-600" {...props} />
            </div>
        ),
        thead: ({...props}) => <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-xs" {...props} />,
        tbody: ({...props}) => <tbody className="divide-y divide-slate-100 bg-white" {...props} />,
        tr: ({...props}) => <tr className="hover:bg-slate-50/50 transition-colors" {...props} />,
        th: ({...props}) => <th className="px-4 py-3 whitespace-nowrap" {...props} />,
        td: ({...props}) => <td className="px-4 py-3 whitespace-normal align-top" {...props} />,
        img: ({src, alt, ...props}) => (
            <div className="my-5">
                <img src={src} alt={alt} className="max-w-full h-auto rounded-xl shadow-sm border border-slate-100 mx-auto" loading="lazy" {...props} />
                {alt && <p className="text-center text-xs text-slate-400 mt-2">{alt}</p>}
            </div>
        ),
        input: ({type, ...props}) => {
            if (type === 'checkbox') {
                return <input type="checkbox" className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none" disabled {...props} />;
            }
            return <input type={type} {...props} />;
        }
    };

    return (
        <div className={`prose prose-${size} max-w-none text-slate-800 ${className}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    );
};
