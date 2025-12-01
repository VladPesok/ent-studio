import { app, BrowserWindow, shell, dialog, ipcMain, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

import { setAutoUpdater } from './autoUpdater'
import { setFsOperations } from "../../filesystem/fs"
import { initializeDatabase, closeDatabase } from '../../database/connection'
import { runMigrations } from '../../database/migrate'
import { needsMigration, createBackup, runMigration } from '../../database/oldConfigMigration'
import { setupAllDatabaseIpcHandlers } from '../../database/dao'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))


process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'ENT Studio',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    show: false, // Don't show until ready
    backgroundColor: '#1f2937', // Dark background to prevent white flash
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  // Initialize database before loading content
  try {
    console.log('Initializing database...');
    initializeDatabase();
    
    // Run migrations first to ensure schema is up to date
    await runMigrations();
    
    // Setup database IPC handlers after migrations
    setupAllDatabaseIpcHandlers();
    
    // Check if old config file migration is needed
    if (await needsMigration()) {
      console.log('Old config migration needed, creating backup...');
      const backupPath = await createBackup();
      console.log(`Backup created at: ${backupPath}`);
      
      console.log('Running old config migration...');
      const result = await runMigration((progress) => {
        win?.webContents.send('migration-progress', progress);
      });
      
      if (result.success) {
        console.log('Config migration completed successfully:', result.stats);
      } else {
        console.error('Config migration failed:', result.message, result.errors);
        dialog.showErrorBox(
          'Migration Failed',
          `Failed to migrate data: ${result.message}\n\nBackup location: ${backupPath}\n\nPlease contact support.`
        );
      }
    } else {
      console.log('No old config migration needed');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    dialog.showErrorBox(
      'Database Error',
      `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThe application may not work correctly.`
    );
  }

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Show window when ready to prevent white flash
  win.once('ready-to-show', () => {
    win?.show()
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  setAutoUpdater(win);
  await setFsOperations(win);
}

app.whenReady().then(() => {
  createWindow();
  Menu.setApplicationMenu(null);
});

app.on('window-all-closed', () => {
  win = null
  closeDatabase(); // Close database connection
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
