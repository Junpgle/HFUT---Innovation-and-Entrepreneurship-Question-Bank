export const getQuestionTypeLabel = (type) => {
  if (type === 'multiple') return '多选';
  if (type === 'judgment') return '判断';
  if (type === 'fill') return '填空';
  if (type === 'big') return '简答';
  return '单选';
};

export const getQuestionTypeBadgeClass = (type) => {
  if (type === 'multiple') return 'bg-purple-100 text-purple-700';
  if (type === 'judgment') return 'bg-orange-100 text-orange-700';
  if (type === 'fill') return 'bg-indigo-100 text-indigo-700';
  if (type === 'big') return 'bg-pink-100 text-pink-700';
  return 'bg-blue-100 text-blue-700';
};
