import { app, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import type {
  ProgressInfo,
  UpdateDownloadedEvent,
} from 'electron-updater'

const { autoUpdater } = createRequire(import.meta.url)('electron-updater');


export function update(win: Electron.BrowserWindow) {

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
    return {
      isUpdateAvailable: false, // This would need to be tracked based on update events
      isDownloading: false,     // This would need to be tracked during download
      isUpdateDownloaded: false // This would need to be tracked after download
    }
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void,
) {
  autoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info))
  autoUpdater.on('error', (error: Error) => callback(error, null))
  autoUpdater.on('update-downloaded', complete)
  autoUpdater.downloadUpdate()
}
