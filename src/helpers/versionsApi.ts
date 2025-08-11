const api = window.electronAPI;

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  updateInfo?: UpdateInfo;
}

/**
 * Check for available updates
 */
export const checkForUpdates = async (): Promise<UpdateCheckResult> => {
  try {
    const result = await api.checkForUpdates();
    return result;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    throw error;
  }
};

/**
 * Download the available update
 */
export const downloadUpdate = async (): Promise<void> => {
  try {
    await api.downloadUpdate();
  } catch (error) {
    console.error('Failed to download update:', error);
    throw error;
  }
};

/**
 * Install the downloaded update and restart the app
 */
export const installUpdate = async (): Promise<void> => {
  try {
    await api.installUpdate();
  } catch (error) {
    console.error('Failed to install update:', error);
    throw error;
  }
};

/**
 * Get current update status
 */
export const getUpdateStatus = async (): Promise<any> => {
  try {
    return await api.getUpdateStatus();
  } catch (error) {
    console.error('Failed to get update status:', error);
    throw error;
  }
};

/**
 * Get current app version
 */
export const getAppVersion = async (): Promise<string> => {
  try {
    return await api.getAppVersion();
  } catch (error) {
    console.error('Failed to get app version:', error);
    throw error;
  }
};