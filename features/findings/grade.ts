import type { Finding } from '@/lib/domain';

export const gradeLabel = (grade: Finding['grade']) =>
  grade === 'strong' ? 'Strong candidate' : 'Promising · needs more evidence';

export const gradeTone = (grade: Finding['grade']) => (grade === 'strong' ? 'green' : 'amber');
