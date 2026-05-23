export const getSubjectById = (subjects, subjectId) => {
  if (!subjectId) return null;
  return subjects.find((s) => s.id === subjectId) || null;
};

export const getSubjectChapterOptions = (subject) => {
  if (!subject) return [];
  if (Array.isArray(subject.lectures)) {
    return subject.lectures.map((x) => ({ id: x.id, name: x.name }));
  }
  if (Array.isArray(subject.chapters)) {
    return subject.chapters.map((x) => ({ id: x.id, name: x.name }));
  }
  return [];
};
