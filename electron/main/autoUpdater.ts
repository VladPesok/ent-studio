import { app, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import type {
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater');

// Track update state at module level
let updateState = {
  isUpdateAvailable: false,
  isDownloading: false,
  isUpdateDownloaded: false
}

export const setAutoUpdater = (win: Electron.BrowserWindow): void => {

  // When set to false, the update download will be triggered through the API
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  // Checking for updates
  ipcMain.handle('check-update', async () => {
    if (!app.isPackaged) {
      const error = new Error('The update feature is only available after the package.')
      return { message: error.message, error }
    }

    try {
      const result = await autoUpdater.checkForUpdatesAndNotify()
      return result
    } catch (error: any) {
      console.error('Update check failed:', error)
      
      // Provide more specific error messages
      let message = 'Network error'
      if (error.message) {
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          message = 'Cannot connect to update server. Please check your internet connection.'
        } else if (error.message.includes('404')) {
          message = 'Update server not found. The application may not be configured for automatic updates.'
        } else if (error.message.includes('403') || error.message.includes('401')) {
          message = 'Access denied to update server.'
        } else {
          message = `Update check failed: ${error.message}`
        }
      }
      
      return { message, error: error.message || error }
    }
  })

  // Start downloading and feedback on progress
  ipcMain.handle('start-download', (event: Electron.IpcMainInvokeEvent) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          // feedback download error message
          event.sender.send('update-error', { message: error.message, error })
        } else {
          // feedback update progress message
          event.sender.send('download-progress', progressInfo)
        }
      },
      () => {
        // feedback update downloaded message
        event.sender.send('update-downloaded')
      }
    )
  })

  // Install now
  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Download update handler
  ipcMain.handle('download-update', () => {
    return new Promise((resolve, reject) => {
      startDownload(
        (error, progressInfo) => {
          if (error) {
            reject(error)
          }
        },
        () => {
          resolve(true)
        }
      )
    })
  })

  // Get update status handler
  ipcMain.handle('get-update-status', () => {
    return updateState
  })

  // Update event handlers to track state
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const currentVersion = app.getVersion()
    const hasNewerVersion = isNewerVersion(info.version, currentVersion)
    updateState.isUpdateAvailable = hasNewerVersion
    win.webContents.send('update-can-available', { update: hasNewerVersion })
  })

  autoUpdater.on('update-not-available', () => {
    updateState.isUpdateAvailable = false
    win.webContents.send('update-can-available', { update: false })
  })

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    updateState.isDownloading = true
    win.webContents.send('download-progress', progressObj)
  })

  autoUpdater.on('update-downloaded', () => {
    updateState.isDownloading = false
    updateState.isUpdateDownloaded = true
    win.webContents.send('update-downloaded')
  })

  autoUpdater.on('error', (error: Error) => {
    updateState.isDownloading = false
    win.webContents.send('update-error', { message: error.message })
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
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
  
  return false
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  updateState.isDownloading = true
  autoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info))
  autoUpdater.on('error', (error: Error) => {
    updateState.isDownloading = false
    callback(error, null)
  })
  autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    updateState.isDownloading = false
    updateState.isUpdateDownloaded = true
    complete(event)
  })
  autoUpdater.downloadUpdate()
}
