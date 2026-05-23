export function DashboardPage({
  header,
  searchPanel,
  resetModal,
  updateModal,
  children,
}) {
  return (
    <div className="h-screen flex flex-col max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 overflow-hidden transition-colors duration-300">
      {header}
      {searchPanel}
      {resetModal}
      {updateModal}
      {children}
    </div>
  );
}
