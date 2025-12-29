export interface DictionaryItem {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PatientStatusItem {
  id: number;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type DictionaryType = 'doctors' | 'diagnoses' | 'statuses';

// Format date for display
export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

