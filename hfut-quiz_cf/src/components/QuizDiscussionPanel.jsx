import { Award, Edit3, MessageSquare, Send, ThumbsUp, Zap } from 'lucide-react';
import { Markdown } from './Markdown';

export function QuizDiscussionPanel({
  currentQ,
  isCustomSubject,
  questionThread,
  customNotes,
  renderUserExplanations,
  showExplanationForm,
  setShowExplanationForm,
  newExplanation,
  setNewExplanation,
  submitUserExplanation,
  commentSectionRef,
  newComment,
  setNewComment,
  submitComment,
  submitLocalNote,
  currentUser,
  editingCommentId,
  editingCommentContent,
  setEditingCommentId,
  setEditingCommentContent,
  handleUpdateComment,
  handleStartEditComment,
  handleDeleteComment,
  handleLikeComment,
  formatDate,
}) {
  if (isCustomSubject) {
    const noteList = Array.isArray(customNotes?.[currentQ.id]) ? customNotes[currentQ.id] : [];
    return (
      <div className="grid grid-cols-1 gap-4 md:gap-6 items-stretch">
        <div className="animate-enter bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 scroll-mt-24 h-full flex flex-col dark:bg-slate-900 dark:border-slate-800" ref={commentSectionRef}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-slate-100">
              <MessageSquare size={20} className="text-slate-500 dark:text-slate-400" />
              备注 {noteList.length ? `(${noteList.length})` : ''}
            </div>
          </div>
          <div className="space-y-4 pb-1 flex flex-col flex-1">
            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="记录你的理解、易错点或记忆口诀（仅本地保存）..."
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                rows={3}
              />
              <button onClick={() => submitLocalNote(currentQ.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                <Send size={16} /> 保存备注
              </button>
            </div>

            {noteList.length > 0 ? (
              <div className="space-y-3 max-h-full overflow-y-auto flex-1">
                {noteList.map((note) => (
                  <div key={note.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 dark:bg-slate-950 dark:border-slate-850">
                    <div className="text-slate-800 text-sm mb-1 break-words dark:text-slate-200">
                      <Markdown content={note.content} size="sm" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{note.author || '本地备注'}</span>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4 dark:text-slate-500">暂无备注，写下你的第一条笔记吧。</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-stretch">
      <div className="animate-enter bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 h-full flex flex-col gap-4 dark:bg-slate-900 dark:border-slate-800">
        {questionThread[currentQ.id]?.explanations?.length > 0 && (
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30">
            <div className="flex items-center gap-2 mb-3 text-purple-900 font-bold dark:text-purple-300">
              <Award size={20} className="text-purple-500" /> 用户贡献的解析
            </div>
            {renderUserExplanations(currentQ.id)}
          </div>
        )}
        <div className="animate-enter bg-indigo-50 p-5 md:p-6 rounded-[1.5rem] border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30">
          <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-sm dark:text-indigo-300">
            <Zap size={18} className="text-indigo-600 dark:text-indigo-400" /> <span>答案解析</span>
          </div>
          <Markdown content={currentQ.explanation} size="sm" className="text-indigo-800 leading-relaxed opacity-90 text-sm md:text-base flex-1 dark:text-indigo-200" />
          {(!currentQ.explanation || currentQ.explanation === '暂无解析') && (
            <div className="mt-4">
              {!showExplanationForm ? (
                <button onClick={() => setShowExplanationForm(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                  <Edit3 size={16} /> 贡献解析
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={newExplanation}
                    onChange={(e) => setNewExplanation(e.target.value)}
                    placeholder="分享你对这道题的理解（支持Markdown格式）..."
                    className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => submitUserExplanation(currentQ.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                      <Send size={16} /> 提交解析
                    </button>
                    <button onClick={() => { setShowExplanationForm(false); setNewExplanation(''); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300">
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="animate-enter bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-200 scroll-mt-24 h-full flex flex-col dark:bg-slate-900 dark:border-slate-800" ref={commentSectionRef}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold dark:text-slate-100">
            <MessageSquare size={20} className="text-slate-500 dark:text-slate-400" />
            评论区 {questionThread[currentQ.id]?.comments?.length ? `(${questionThread[currentQ.id].comments.length})` : ''}
          </div>
        </div>
        <div className="space-y-4 pb-1 flex flex-col flex-1">
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="分享你的想法..."
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              rows={3}
            />
            <button onClick={() => submitComment(currentQ.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              <Send size={16} /> 发表评论
            </button>
          </div>

          {questionThread[currentQ.id]?.comments?.length > 0 ? (
            <div className="space-y-3 max-h-full overflow-y-auto flex-1">
              {questionThread[currentQ.id].comments.map((comment) => {
                const isOwner = comment.authorId === currentUser?.id;
                const isEditing = editingCommentId === comment.id;
                return (
                  <div key={comment.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2 dark:bg-slate-950 dark:border-slate-850">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end text-xs">
                          <button onClick={() => handleUpdateComment(currentQ.id)} className="px-3 py-1 bg-blue-600 text-white rounded-lg">保存</button>
                          <button onClick={() => { setEditingCommentId(null); setEditingCommentContent(''); }} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-300">取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-slate-800 text-sm mb-1 break-words dark:text-slate-200">
                          <Markdown content={comment.content} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{comment.author}</span>
                          <span>{formatDate(comment.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {isOwner ? (
                            <>
                              <div className={`flex items-center gap-1 cursor-default ${comment.likes > 0 ? 'text-amber-600 font-bold dark:text-amber-500' : 'text-slate-400'}`} title="收获的点赞数">
                                <ThumbsUp size={12} fill={comment.likes > 0 ? 'currentColor' : 'none'} />
                                {comment.likes || 0}
                              </div>
                              <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800" />
                              <button onClick={() => handleStartEditComment(comment)} className="text-blue-600 hover:text-blue-700 transition-colors dark:text-blue-400 dark:hover:text-blue-300">编辑</button>
                              <button onClick={() => handleDeleteComment(currentQ.id, comment)} className="text-red-600 hover:text-red-700 transition-colors dark:text-red-400 dark:hover:text-red-300">删除</button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleLikeComment(currentQ.id, comment)}
                              className={`flex items-center gap-1 transition-colors ${comment.liked ? 'text-amber-600 font-bold dark:text-amber-500' : 'text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400'}`}
                            >
                              <ThumbsUp size={12} fill={comment.liked ? 'currentColor' : 'none'} />
                              {comment.likes || 0}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-4 dark:text-slate-500">暂无评论，来抢沙发吧！</p>
          )}
        </div>
      </div>
    </div>
  );
}
