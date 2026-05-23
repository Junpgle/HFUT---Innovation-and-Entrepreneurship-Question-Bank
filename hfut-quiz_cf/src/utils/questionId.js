export const normalizeQuestionId = (id) => {
  if (!id || typeof id !== 'string') return id;
  if (id.startsWith('MG-')) {
    const numStr = id.substring(3);
    const num = Number.parseInt(numStr, 10);
    if (!Number.isNaN(num) && num > 188439) {
      return `MG-${num - 188439}`;
    }
  }
  return id;
};

export const normalizeSet = (value) => {
  if (!value) return new Set();
  const setObj = Array.isArray(value)
    ? new Set(value)
    : value instanceof Set
      ? value
      : new Set(Array.from(value));

  const normalized = new Set();
  setObj.forEach((item) => {
    normalized.add(normalizeQuestionId(item));
  });
  return normalized;
};
