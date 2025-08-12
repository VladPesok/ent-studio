export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface UpdateCheckResult {
  updateAvailable?: boolean;
  updateInfo?: UpdateInfo;
  message?: string;
  error?: any;
  version?: string;
  newVersion?: string;
}

export interface UpdateStatus {
  isUpdateAvailable: boolean;
  isDownloading: boolean;
  isUpdateDownloaded: boolean;
}

export interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

// Helper function to compare semantic versions
function isNewerVersion(newVersion: string, currentVersion: string): boolean {
  const parseVersion = (version: string) => {
    return version.replace(/^v/, '').split('.').map(num => parseInt(num, 10))
  }
  
  const newParts = parseVersion(newVersion)
  const currentParts = parseVersion(currentVersion)
  
  for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
    const newPart = newParts[i] || 0
    const currentPart = currentParts[i] || 0
    
    if (newPart > currentPart) return true
    if (newPart < currentPart) return false
  }
  
  return false;
}

export const checkForUpdates = async (): Promise<UpdateCheckResult> => {
  try {
    const result = await window.ipcRenderer.invoke('check-update');
    
    if (result && result.error) {
      throw new Error(result.message || 'Update check failed');
    }
    
    const currentVersion = await getAppVersion();
    
    const hasUpdate = result?.updateInfo && isNewerVersion(result.updateInfo.version, currentVersion);
    
    return {
      updateAvailable: hasUpdate,
      updateInfo: result?.updateInfo ? {
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate,
        releaseNotes: result.updateInfo.releaseNotes || ''
      } : undefined,
      version: currentVersion,
      newVersion: result?.updateInfo?.version
    };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    throw error;
  }
};

export const downloadUpdate = async (): Promise<void> => {
  try {
    await window.ipcRenderer.invoke('download-update');
  } catch (error) {
    console.error('Failed to download update:', error);
    throw error;
  }
};

export const installUpdate = async (): Promise<void> => {
  try {
    await window.ipcRenderer.invoke('quit-and-install');
  } catch (error) {
    console.error('Failed to install update:', error);
    throw error;
  }
};

export const getUpdateStatus = async (): Promise<UpdateStatus> => {
  try {
    return await window.ipcRenderer.invoke('get-update-status');
  } catch (error) {
    console.error('Failed to get update status:', error);
    throw error;
  }
};

export const getAppVersion = async (): Promise<string> => {
  try {
    return await window.ipcRenderer.invoke('get-app-version');
  } catch (error) {
    console.error('Failed to get app version:', error);
    throw error;
  }
};