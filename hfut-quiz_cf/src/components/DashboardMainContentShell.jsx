export function DashboardMainContentShell({ children }) {
  return (
    <div className="flex-1 overflow-y-auto pb-10 no-scrollbar pr-1 md:pr-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">{children}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 已移除重复统计卡片 */}
      </div>
    </div>
  );
}
