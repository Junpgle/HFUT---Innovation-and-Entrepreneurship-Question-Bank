export const formatDate = (isoString) => {
  if (!isoString) return '未知时间';

  let dateStr = String(isoString);
  if (!dateStr.includes('T') && !dateStr.includes('Z')) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return isoString;

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};
