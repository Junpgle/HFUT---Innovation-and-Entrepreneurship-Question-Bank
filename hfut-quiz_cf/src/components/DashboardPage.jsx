export function DashboardPage({
  header,
  searchPanel,
  bankStatus,
  onManualSync,
  onManualRestore,
  onExport,
  onImport,
  resetModal,
  updateModal,
  children,
}) {
  return (
    <div className="h-screen flex flex-col max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 overflow-hidden">
      {header}
      {searchPanel}

      {bankStatus === 'ready' && (
        <div className="md:hidden mb-4 flex gap-2">
          <div className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-xl border border-green-200 text-xs font-medium flex items-center justify-center gap-2">题库就绪</div>
          <button onClick={onManualSync} className="flex-1 px-3 py-2 bg-white text-slate-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center gap-2">备份</button>
          <button onClick={onManualRestore} className="flex-1 px-3 py-2 bg-white text-slate-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center gap-2">恢复</button>
          <button onClick={onExport} className="p-2 bg-white text-blue-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center">导出</button>
          <label className="p-2 bg-white text-indigo-600 rounded-xl border border-slate-200 text-xs font-medium flex items-center justify-center cursor-pointer">
            导入
            <input type="file" className="hidden" accept=".json" onChange={onImport} />
          </label>
        </div>
      )}

      {resetModal}
      {updateModal}

      {children}
    </div>
  );
}
