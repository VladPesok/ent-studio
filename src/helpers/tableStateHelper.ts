// Helper for persisting table state (filters, sorting, pagination) to app settings

export interface PersistedTableState {
  pageSize?: number;
  filters?: Record<string, any>;
  sorter?: {
    field?: string;
    order?: 'ascend' | 'descend';
  };
}

const SETTINGS_PREFIX = 'tableState_';

/**
 * Save table state to app settings
 */
export const saveTableState = async (tableKey: string, state: PersistedTableState): Promise<void> => {
  try {
    await window.ipcRenderer.invoke('db:settings:set', `${SETTINGS_PREFIX}${tableKey}`, state);
  } catch (error) {
    console.error(`Failed to save table state for ${tableKey}:`, error);
  }
};

/**
 * Load table state from app settings
 */
export const loadTableState = async (tableKey: string): Promise<PersistedTableState | null> => {
  try {
    const state = await window.ipcRenderer.invoke('db:settings:get', `${SETTINGS_PREFIX}${tableKey}`);
    return state || null;
  } catch (error) {
    console.error(`Failed to load table state for ${tableKey}:`, error);
    return null;
  }
};

/**
 * Table keys for different tables
 */
export const TABLE_KEYS = {
  PATIENTS: 'patients',
  DOCTORS: 'doctors',
  DIAGNOSES: 'diagnoses',
  STATUSES: 'statuses',
} as const;

