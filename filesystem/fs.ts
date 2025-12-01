/**
 * Filesystem IPC Handlers
 */

import fs from "fs/promises";
import path, { extname } from "path";

import { app, ipcMain, dialog, BrowserWindow } from 'electron';
import { shell } from "electron";
import { spawn } from "child_process";

import { getFileType } from '../src/helpers/fileTypeHelper';
import { getActivePatientsRoot, getDefaultPatientsRoot, resolvePatientFolderPath } from '../database/dao/storagePathDao';

const isClip = (f: string) =>
  [".mp4", ".avi"].includes(extname(f).toLowerCase());

const ensureDir = (dir: string) => fs.mkdir(dir, { recursive: true });

const exists = async (p: string) =>
  fs.access(p).then(() => true).catch(() => false);

const latestDate = async (patientRoot: string) => {
  try {
    const sub = await fs.readdir(patientRoot, { withFileTypes: true });
    return sub
      .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
      .map((d) => d.name)
      .sort()
      .pop() || "";
  } catch {
    return "";
  }
};

const listDirClips = async (dir: string) => {
  try {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    return ents
      .filter((e) => e.isFile() && isClip(e.name))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
};

const latestAppointmentDir = async (patientsRoot: string, folder: string) => {
  const dates = await latestDate(path.join(patientsRoot, folder));
  return path.join(patientsRoot, folder, dates);
};

export const setFsOperations = async (mainWindow: BrowserWindow): Promise<void> => {
  const appDataFolder = path.join(app.getPath("userData"), "appData");
  const defaultPatientsRoot = getDefaultPatientsRoot();
  const settingsRoot = path.join(appDataFolder, "settings");
  const patientCardsRoot = path.join(settingsRoot, "patientCards");
  const medicalTestsRoot = path.join(settingsRoot, "medicalTest");

  // Helper to get active patients root (may change during runtime)
  const getPatientsRoot = () => getActivePatientsRoot();

  await ensureDir(defaultPatientsRoot);
  await ensureDir(settingsRoot);
  await ensureDir(patientCardsRoot);
  await ensureDir(medicalTestsRoot);

  // ==================== USB Import ====================

  // Returns list of USB folders that match the pattern (for processing)
  ipcMain.handle("fs:scanUsb", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled || !filePaths.length) return { canceled: true, folders: [] };

    const usb = filePaths[0];
    const USB_PATTERN = /^(.+?_\d{4}-\d{2}-\d{2})_(?:[^_]+)_(\d{4}-\d{2}-\d{2})_\d{6}$/;

    const entries = await fs.readdir(usb, { withFileTypes: true });
    const validFolders = entries.filter(e => e.isDirectory() && USB_PATTERN.test(e.name));

    return {
      canceled: false,
      usbPath: usb,
      folders: validFolders.map(e => {
        const m = e.name.match(USB_PATTERN);
        return {
          folderName: e.name,
          patientBase: m ? m[1] : '',
          recDate: m ? m[2] : '',
          fullPath: path.join(usb, e.name),
        };
      }),
    };
  });

  // Copy a single session from USB to patients folder
  ipcMain.handle("fs:copyUsbSession", async (_e, usbDir: string, patientBase: string, recDate: string) => {
    const patientsRoot = getPatientsRoot();
    const patientRoot = path.join(patientsRoot, patientBase);
    const appointmentRoot = path.join(patientRoot, recDate);
    const videoDir = path.join(appointmentRoot, "video");
    const voiceDir = path.join(appointmentRoot, "voice");

    await ensureDir(videoDir);
    await ensureDir(voiceDir);

    // Check if already has clips
    if ((await fs.readdir(videoDir)).some(isClip)) {
      return { success: true, skipped: true };
    }

    await fs.cp(usbDir, videoDir, { recursive: true, force: false });
    return { success: true, skipped: false };
  });

  // Send import progress to renderer
  ipcMain.handle("fs:sendImportProgress", async (_e, progress: { current: number; total: number; progress: number; folderName: string }) => {
    mainWindow.webContents.send('import-progress', progress);
  });

  // ==================== Patient Folder Operations ====================

  ipcMain.handle("fs:patient:createFolders", async (_e, base: string, date: string) => {
    const patientsRoot = getPatientsRoot();
    const pRoot = path.join(patientsRoot, base);
    const appt = path.join(pRoot, date, "video");
    await ensureDir(appt);
    return { success: true };
  });

  ipcMain.handle("fs:patient:openFolder", async (_e, folder: string) => {
    const dir = await resolvePatientFolderPath(folder);
    if (!dir) {
      console.error('Patient folder not found:', folder);
      return '';
    }
    return shell.openPath(dir);
  });

  ipcMain.handle("fs:patient:renameFolder", async (_e, oldFolder: string, newFolder: string) => {
    try {
      const oldPath = await resolvePatientFolderPath(oldFolder);
      if (!oldPath) {
        return { success: false, error: 'Папку пацієнта не знайдено' };
      }
      
      // Get the parent directory and construct new path
      const parentDir = path.dirname(oldPath);
      const newPath = path.join(parentDir, newFolder);
      
      // Check if new path already exists
      if (await exists(newPath)) {
        return { success: false, error: 'Папка з такою назвою вже існує' };
      }
      
      // Rename the folder
      await fs.rename(oldPath, newPath);
      
      return { success: true, newPath };
    } catch (error) {
      console.error('Failed to rename patient folder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Помилка перейменування папки' };
    }
  });

  // ==================== Video Operations ====================

  ipcMain.handle("fs:patient:counts", async (_e, folder: string) => {
    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return { videoCount: 0 };
    
    const latestApptDate = await latestDate(patientPath);
    const videoDir = path.join(patientPath, latestApptDate, "video");
    const video = await listDirClips(videoDir);
    return { videoCount: video.length };
  });

  ipcMain.handle("fs:patient:clips", async (_e, folder: string) => {
    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return { video: [] };
    
    const latestApptDate = await latestDate(patientPath);
    const videoDir = path.join(patientPath, latestApptDate, "video");
    const toUrl = (p: string) => `file://${p}`;
    return { video: (await listDirClips(videoDir)).map(toUrl) };
  });

  ipcMain.handle("fs:patient:clipsDetailed", async (_e, folder: string, offset: number = 0, limit: number = 12, currentAppointment?: string) => {
    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return { clips: [], hasMore: false, total: 0 };
    
    let videoDir: string;

    if (currentAppointment) {
      videoDir = path.join(patientPath, currentAppointment, "video");
    } else {
      const latestApptDate = await latestDate(patientPath);
      videoDir = path.join(patientPath, latestApptDate, "video");
    }

    const allClips = await listDirClips(videoDir);
    const paginatedClips = allClips.slice(offset, offset + limit);

    const detailedClips = await Promise.all(
      paginatedClips.map(async (filePath) => {
        const ext = extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        const stats = await fs.stat(filePath);

        return {
          url: `file://${filePath}`,
          fileName,
          fileType: 'video',
          hasAudio: true,
          size: stats.size,
          modified: stats.mtime,
          extension: ext,
        };
      })
    );

    return {
      clips: detailedClips,
      total: allClips.length,
      hasMore: offset + limit < allClips.length,
    };
  });

  ipcMain.handle("fs:patient:loadMoreVideos", async (_e, folder: string, currentAppointment?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Video Files", extensions: ["mp4", "avi"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (canceled || !filePaths.length) return { success: false, count: 0 };

    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return { success: false, count: 0 };
    
    let videoDir: string;
    if (currentAppointment) {
      videoDir = path.join(patientPath, currentAppointment, "video");
    } else {
      const latestApptDate = await latestDate(patientPath);
      videoDir = path.join(patientPath, latestApptDate, "video");
    }

    await ensureDir(videoDir);

    let copiedCount = 0;
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destPath = path.join(videoDir, fileName);

      try {
        if (!(await exists(destPath))) {
          await fs.copyFile(filePath, destPath);
          copiedCount++;
        }
      } catch (error) {
        console.error(`Failed to copy ${fileName}:`, error);
      }
    }

    return { success: true, count: copiedCount };
  });

  // ==================== Audio Operations ====================

  ipcMain.handle("fs:patient:audioFiles", async (_e, folder: string, currentAppointment?: string) => {
    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return [];
    
    let audioDir: string;

    if (currentAppointment) {
      audioDir = path.join(patientPath, currentAppointment, "audio");
    } else {
      const latestApptDate = await latestDate(patientPath);
      audioDir = path.join(patientPath, latestApptDate, "audio");
    }

    try {
      await ensureDir(audioDir);
      const entries = await fs.readdir(audioDir, { withFileTypes: true });

      const files = await Promise.all(
        entries
          .filter(entry => entry.isFile())
          .map(async (entry) => {
            const filePath = path.join(audioDir, entry.name);
            const stats = await fs.stat(filePath);
            const ext = extname(entry.name).toLowerCase();
            const fileType = getFileType(ext);

            return {
              url: `file://${filePath}`,
              fileName: entry.name,
              path: filePath,
              size: stats.size,
              extension: ext,
              modified: stats.mtime,
              fileType: fileType,
              isAudio: fileType === 'audio',
            };
          })
      );

      return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Error loading audio files:', error);
      return [];
    }
  });

  ipcMain.handle("fs:patient:loadMoreAudio", async (_e, folder: string, currentAppointment?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "All Files", extensions: ["*"] }],
    });

    if (canceled || !filePaths.length) return { success: false, count: 0 };

    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return { success: false, count: 0 };
    
    let audioDir: string;
    if (currentAppointment) {
      audioDir = path.join(patientPath, currentAppointment, "audio");
    } else {
      const latestApptDate = await latestDate(patientPath);
      audioDir = path.join(patientPath, latestApptDate, "audio");
    }

    await ensureDir(audioDir);

    let copiedCount = 0;
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destPath = path.join(audioDir, fileName);

      try {
        if (!(await exists(destPath))) {
          await fs.copyFile(filePath, destPath);
          copiedCount++;
        }
      } catch (error) {
        console.error(`Failed to copy ${fileName}:`, error);
      }
    }

    return { success: true, count: copiedCount };
  });

  ipcMain.handle("fs:patient:openAudioFolder", async (_e, folder: string, currentAppointment?: string) => {
    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return '';
    
    let audioDir: string;

    if (currentAppointment) {
      audioDir = path.join(patientPath, currentAppointment, "audio");
    } else {
      const latestApptDate = await latestDate(patientPath);
      audioDir = path.join(patientPath, latestApptDate, "audio");
    }

    await ensureDir(audioDir);
    return shell.openPath(audioDir);
  });

  ipcMain.handle("fs:patient:saveRecordedAudio", async (_e, folder: string, currentAppointment: string | undefined, audioBuffer: ArrayBuffer, filename: string) => {
    try {
      const patientPath = await resolvePatientFolderPath(folder);
      if (!patientPath) return { success: false, error: 'Patient folder not found' };
      
      let audioDir: string;

      if (currentAppointment) {
        audioDir = path.join(patientPath, currentAppointment, "audio");
      } else {
        const latestApptDate = await latestDate(patientPath);
        audioDir = path.join(patientPath, latestApptDate, "audio");
      }

      await ensureDir(audioDir);

      const supportedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.webm', '.mp4'];
      const hasValidExtension = supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      const finalFilename = hasValidExtension ? filename : `${filename}.wav`;
      const filePath = path.join(audioDir, finalFilename);

      const buffer = Buffer.from(audioBuffer);
      await fs.writeFile(filePath, buffer);

      return { success: true, filePath };
    } catch (error) {
      console.error('Error saving recorded audio:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // ==================== Custom Tab Files ====================

  ipcMain.handle("fs:customTab:getFiles", async (_e, folder: string, tabFolder: string, currentAppointment?: string) => {
    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return [];
    
    let targetDir: string;

    if (currentAppointment) {
      targetDir = path.join(patientPath, currentAppointment, tabFolder);
    } else {
      targetDir = path.join(patientPath, tabFolder);
    }

    try {
      await ensureDir(targetDir);
      const entries = await fs.readdir(targetDir, { withFileTypes: true });

      const files = await Promise.all(
        entries
          .filter(entry => entry.isFile())
          .map(async (entry) => {
            const filePath = path.join(targetDir, entry.name);
            const stats = await fs.stat(filePath);
            const ext = extname(entry.name).toLowerCase();

            return {
              name: entry.name,
              path: filePath,
              size: stats.size,
              extension: ext,
              modified: stats.mtime,
            };
          })
      );

      return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Error loading custom tab files:', error);
      return [];
    }
  });

  ipcMain.handle("fs:customTab:selectAndCopyFiles", async (_e, folder: string, tabFolder: string, currentAppointment?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "All Files", extensions: ["*"] }],
    });

    if (canceled || !filePaths.length) return { success: false, count: 0 };

    const patientPath = await resolvePatientFolderPath(folder);
    if (!patientPath) return { success: false, count: 0 };
    
    let targetDir: string;
    if (currentAppointment) {
      targetDir = path.join(patientPath, currentAppointment, tabFolder);
    } else {
      targetDir = path.join(patientPath, tabFolder);
    }

    await ensureDir(targetDir);

    let copiedCount = 0;
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destPath = path.join(targetDir, fileName);

      try {
        if (!(await exists(destPath))) {
          await fs.copyFile(filePath, destPath);
          copiedCount++;
        }
      } catch (error) {
        console.error(`Failed to copy ${fileName}:`, error);
      }
    }

    return { success: true, count: copiedCount };
  });

  ipcMain.handle("fs:openFileInDefaultApp", async (_e, filePath: string) => {
    try {
      const result = await shell.openPath(filePath);
      if (result === "") {
        return { success: true, error: null };
      } else {
        console.log('Failed to open file, trying to open folder:', result);
        const folderPath = path.dirname(filePath);
        const folderResult = await shell.openPath(folderPath);
        return {
          success: folderResult === "",
          error: folderResult === "" ? null : folderResult,
          fallbackUsed: true,
        };
      }
    } catch (error) {
      console.error('Error opening file:', error);
      try {
        const folderPath = path.dirname(filePath);
        const folderResult = await shell.openPath(folderPath);
        return {
          success: folderResult === "",
          error: folderResult === "" ? null : folderResult,
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        };
      }
    }
  });

  // ==================== Praat Integration ====================

  ipcMain.handle("fs:praat:selectExecutable", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Praat Executable", extensions: ["exe"] },
        { name: "All Files", extensions: ["*"] },
      ],
      title: "Select Praat Executable",
    });

    if (canceled || !filePaths.length) return { success: false, path: null };
    return { success: true, path: filePaths[0] };
  });

  async function isExecutable(p: string) {
    try {
      await fs.access(p, process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  async function pathExists(p: string) {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  function buildOpenArgs(files: string[]) {
    return files.flatMap(f => ["--open", f]);
  }

  async function launchPraat(praatPath: string, audioFilePaths: string | string[]) {
    const files = Array.isArray(audioFilePaths) ? audioFilePaths : [audioFilePaths];

    if (files.length === 0) throw new Error("No audio files provided");

    const checks = await Promise.all(files.map(f => pathExists(f)));
    const missingIdx = checks.findIndex(ok => !ok);
    if (missingIdx !== -1) {
      throw new Error(`Audio file not found: ${files[missingIdx]}`);
    }

    const cwd = path.dirname(files[0]);
    const args = buildOpenArgs(files);

    const child = spawn(praatPath, args, {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsVerbatimArguments: true,
    });

    child.unref();
  }

  ipcMain.handle("fs:praat:openFile", async (_e, praatPath: string, audioFilePaths: string | string[]) => {
    try {
      if (!praatPath || !audioFilePaths) {
        return { success: false, error: "Missing praatPath or audioFilePaths" };
      }

      const praatOk = await isExecutable(praatPath);
      if (!praatOk) {
        return { success: false, error: `Praat not found or not executable: ${praatPath}` };
      }

      await launchPraat(praatPath, audioFilePaths);
      return { success: true };
    } catch (error) {
      console.error("Error opening file(s) with Praat:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // ==================== Patient Cards (File Operations) ====================

  ipcMain.handle("fs:patientCards:get", async () => {
    try {
      const entries = await fs.readdir(patientCardsRoot, { withFileTypes: true });

      const cards = await Promise.all(
        entries
          .filter(entry => entry.isFile())
          .filter(entry => {
            if (entry.name.startsWith('~$') || entry.name.startsWith('.')) {
              return false;
            }
            const ext = extname(entry.name).toLowerCase();
            return ['.doc', '.docx', '.rtf'].includes(ext);
          })
          .map(async (entry) => {
            const filePath = path.join(patientCardsRoot, entry.name);
            const stats = await fs.stat(filePath);
            const ext = extname(entry.name).toLowerCase();
            const nameWithoutExt = entry.name.replace(/\.[^/.]+$/, '');

            return {
              name: nameWithoutExt,
              fileName: entry.name,
              path: filePath,
              size: stats.size,
              extension: ext,
              modified: stats.mtime,
            };
          })
      );

      return cards.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Error loading patient cards:', error);
      return [];
    }
  });

  ipcMain.handle("fs:patientCards:import", async (_e, cardName: string, arrayBuffer: ArrayBuffer, originalFileName: string) => {
    try {
      const invalidChars = /[<>:"/\\|?*]/g;
      if (invalidChars.test(cardName) || !cardName.trim()) {
        return { success: false, error: "Invalid card name" };
      }

      const originalExt = extname(originalFileName).toLowerCase();
      if (!['.doc', '.docx', '.rtf'].includes(originalExt)) {
        return { success: false, error: "Unsupported file type" };
      }

      const fileName = `${cardName.trim()}${originalExt}`;
      const filePath = path.join(patientCardsRoot, fileName);

      if (await exists(filePath)) {
        return { success: false, error: "File with this name already exists" };
      }

      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      return { success: true, fileName };
    } catch (error) {
      console.error('Error importing patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("fs:patientCards:copyToPatient", async (_e, cardFileName: string, patientFolderName: string) => {
    try {
      const sourceCardPath = path.join(patientCardsRoot, cardFileName);

      if (!(await exists(sourceCardPath))) {
        return { success: false, error: "Patient card not found" };
      }

      const patientFolderPath = await resolvePatientFolderPath(patientFolderName);
      if (!patientFolderPath) return { success: false, error: "Patient folder not found" };
      
      await ensureDir(patientFolderPath);

      const cardNameWithoutExt = cardFileName.replace(/\.[^/.]+$/, '');
      const cardExt = extname(cardFileName);
      const destinationFileName = `${patientFolderName}_${cardNameWithoutExt}${cardExt}`;
      const destinationPath = path.join(patientFolderPath, destinationFileName);

      await fs.copyFile(sourceCardPath, destinationPath);

      return { success: true };
    } catch (error) {
      console.error('Error copying patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("fs:patientCards:delete", async (_e, cardFileName: string) => {
    try {
      const cardPath = path.join(patientCardsRoot, cardFileName);

      if (!(await exists(cardPath))) {
        return { success: false, error: "Patient card not found" };
      }

      await fs.unlink(cardPath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("fs:patientCards:openPatientCard", async (_e, patientFolderName: string, cardFileName: string) => {
    try {
      const patientFolderPath = await resolvePatientFolderPath(patientFolderName);
      if (!patientFolderPath) return { success: false, error: "Patient folder not found" };
      
      const cardNameWithoutExt = cardFileName.replace(/\.[^/.]+$/, '');
      const cardExt = path.extname(cardFileName);
      const patientCardFileName = `${patientFolderName}_${cardNameWithoutExt}${cardExt}`;
      const patientCardPath = path.join(patientFolderPath, patientCardFileName);

      if (!(await exists(patientCardPath))) {
        return { success: false, error: "Patient card not found in patient folder" };
      }

      const result = await shell.openPath(patientCardPath);
      if (result === "") {
        return { success: true, error: null };
      } else {
        console.log('Failed to open patient card, trying to open folder:', result);
        const folderPath = path.dirname(patientCardPath);
        const folderResult = await shell.openPath(folderPath);
        return {
          success: folderResult === "",
          error: folderResult === "" ? null : folderResult,
          fallbackUsed: true,
        };
      }
    } catch (error) {
      console.error('Error opening patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // ==================== Medical Tests (File Operations) ====================

  ipcMain.handle("fs:tests:getAll", async () => {
    try {
      const entries = await fs.readdir(medicalTestsRoot, { withFileTypes: true });

      const tests = await Promise.all(
        entries
          .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
          .map(async (entry) => {
            const filePath = path.join(medicalTestsRoot, entry.name);
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
          })
      );

      return tests.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error loading tests:', error);
      return [];
    }
  });

  ipcMain.handle("fs:tests:getById", async (_e, testId: string) => {
    try {
      const files = await fs.readdir(medicalTestsRoot, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.json')) {
          const filePath = path.join(medicalTestsRoot, file.name);
          const content = await fs.readFile(filePath, 'utf8');
          const test = JSON.parse(content);

          if (test.id === testId) {
            return test;
          }
        }
      }

      throw new Error('Test not found');
    } catch (error) {
      console.error('Error loading test:', error);
      throw error;
    }
  });

  ipcMain.handle("fs:tests:create", async (_e, testData: any) => {
    try {
      const now = new Date().toISOString();
      const testId = `test_${Date.now()}`;

      const test = {
        id: testId,
        ...testData,
        createdAt: now,
        updatedAt: now,
      };

      const sanitizedName = testData.name
        .replace(/[^a-zA-Z0-9а-яА-ЯіІїЇєЄ\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      const fileName = `${sanitizedName}_${testId}.json`;
      const filePath = path.join(medicalTestsRoot, fileName);

      await fs.writeFile(filePath, JSON.stringify(test, null, 2), 'utf8');

      return test;
    } catch (error) {
      console.error('Error creating test:', error);
      throw error;
    }
  });

  ipcMain.handle("fs:tests:update", async (_e, testId: string, testData: any) => {
    try {
      const files = await fs.readdir(medicalTestsRoot, { withFileTypes: true });
      let existingFilePath = null;
      let existingTest = null;

      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.json')) {
          const filePath = path.join(medicalTestsRoot, file.name);
          const content = await fs.readFile(filePath, 'utf8');
          const test = JSON.parse(content);

          if (test.id === testId) {
            existingFilePath = filePath;
            existingTest = test;
            break;
          }
        }
      }

      if (!existingTest || !existingFilePath) {
        throw new Error('Test not found');
      }

      const updatedTest = {
        ...existingTest,
        ...testData,
        id: testId,
        createdAt: existingTest.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const sanitizedName = testData.name
        .replace(/[^a-zA-Z0-9а-яА-ЯіІїЇєЄ\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      const newFileName = `${sanitizedName}_${testId}.json`;
      const newFilePath = path.join(medicalTestsRoot, newFileName);

      await fs.writeFile(newFilePath, JSON.stringify(updatedTest, null, 2), 'utf8');

      if (existingFilePath !== newFilePath) {
        await fs.unlink(existingFilePath);
      }

      return updatedTest;
    } catch (error) {
      console.error('Error updating test:', error);
      throw error;
    }
  });

  ipcMain.handle("fs:tests:delete", async (_e, testId: string) => {
    try {
      const files = await fs.readdir(medicalTestsRoot, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.json')) {
          const filePath = path.join(medicalTestsRoot, file.name);
          const content = await fs.readFile(filePath, 'utf8');
          const test = JSON.parse(content);

          if (test.id === testId) {
            await fs.unlink(filePath);
            return { success: true };
          }
        }
      }

      throw new Error('Test not found');
    } catch (error) {
      console.error('Error deleting test:', error);
      throw error;
    }
  });

  ipcMain.handle("fs:tests:validateName", async (_e, name: string, excludeId?: string) => {
    try {
      const files = await fs.readdir(medicalTestsRoot, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.json')) {
          const filePath = path.join(medicalTestsRoot, file.name);
          const content = await fs.readFile(filePath, 'utf8');
          const test = JSON.parse(content);

          if (test.name.toLowerCase() === name.toLowerCase() && test.id !== excludeId) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating test name:', error);
      return false;
    }
  });

  ipcMain.handle("fs:tests:openFolder", async () => {
    try {
      const result = await shell.openPath(medicalTestsRoot);
      if (result === "") {
        return { success: true, error: null };
      } else {
        return { success: false, error: result };
      }
    } catch (error) {
      console.error('Error opening tests folder:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("fs:tests:export", async (_e, testId: string) => {
    try {
      const files = await fs.readdir(medicalTestsRoot, { withFileTypes: true });
      let testData = null;

      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.json')) {
          const filePath = path.join(medicalTestsRoot, file.name);
          const content = await fs.readFile(filePath, 'utf8');
          const test = JSON.parse(content);

          if (test.id === testId) {
            testData = test;
            break;
          }
        }
      }

      if (!testData) {
        return { success: false, error: 'Test not found' };
      }

      const currentDate = new Date().toISOString().split('T')[0];
      const sanitizedName = testData.name.replace(/[^a-zA-Z0-9а-яА-ЯіІїЇєЄ\s]/g, '').replace(/\s+/g, '_');
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Test',
        defaultPath: `${sanitizedName}_${currentDate}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      await fs.writeFile(filePath, JSON.stringify(testData, null, 2), 'utf8');

      return { success: true };
    } catch (error) {
      console.error('Error exporting test:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle("fs:tests:import", async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Test',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (canceled || !filePaths.length) {
        return { success: false, error: 'Import cancelled' };
      }

      const filePath = filePaths[0];
      const content = await fs.readFile(filePath, 'utf8');
      const testData = JSON.parse(content);

      if (!testData.name || !testData.description || !testData.testType) {
        return { success: false, error: 'Invalid test file format' };
      }

      const now = new Date().toISOString();
      const importedTest = {
        ...testData,
        id: `test_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      let finalName = importedTest.name;
      let counter = 1;

      while (true) {
        const files = await fs.readdir(medicalTestsRoot, { withFileTypes: true });
        let nameExists = false;

        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.json')) {
            const existingFilePath = path.join(medicalTestsRoot, file.name);
            const existingContent = await fs.readFile(existingFilePath, 'utf8');
            const existingTest = JSON.parse(existingContent);

            if (existingTest.name.toLowerCase() === finalName.toLowerCase()) {
              nameExists = true;
              break;
            }
          }
        }

        if (!nameExists) break;

        finalName = `${importedTest.name} (${counter})`;
        counter++;
      }

      importedTest.name = finalName;

      const fileName = `${importedTest.name.replace(/[^a-zA-Z0-9]/g, '_')}_${importedTest.id}.json`;
      const testFilePath = path.join(medicalTestsRoot, fileName);
      await fs.writeFile(testFilePath, JSON.stringify(importedTest, null, 2), 'utf8');

      return { success: true, test: importedTest };
    } catch (error) {
      console.error('Error importing test:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
};
