import fs from "fs/promises";
import path, { extname } from "path";

import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import type { App, Dialog, IpcMain } from "electron";

import { shell } from "electron";
import { spawn, execFile  } from "child_process";

import {getFileType} from '../../src/helpers/fileTypeHelper';
import {
  getAllPatients,
  getPatientByFolderPath,
  updatePatientMetadata,
  createPatient,
  getAppointmentData,
  updateAppointmentData,
  getPatientTests,
  createPatientTest,
  updatePatientTest,
  deletePatientTest,
  getAllDoctors,
  getAllDiagnoses,
  createDoctor,
  createDiagnosis,
  getSetting,
  setSetting,
  getSessionData,
  setSessionData,
  getAllTabs,
  updateTabs,
} from '../../database/dao';

const isClip = (f: string) =>
  [".mp4", ".avi"].includes(extname(f).toLowerCase());

const ensureDir = (dir: string) => fs.mkdir(dir, { recursive: true });

const exists = async (p: string) =>
  fs.access(p).then(() => true).catch(() => false);


const USB_PATTERN =
  /^(.+?_\d{4}-\d{2}-\d{2})_(?:[^_]+)_(\d{4}-\d{2}-\d{2})_\d{6}$/;


const copySession = async (
  patientsRoot: string,
  usbDir: string,
  usbFolderName: string,
  defaultPatientCard?: string | null,
) => {
  const m = usbFolderName.match(USB_PATTERN);
  if (!m) return;

  const [, patientBase, recDate] = m;
  const patientRoot     = path.join(patientsRoot, patientBase);
  const appointmentRoot = path.join(patientRoot, recDate);
  const videoDir        = path.join(appointmentRoot, "video");
  const voiceDir        = path.join(appointmentRoot, "voice");

  await ensureDir(videoDir);
  await ensureDir(voiceDir);

  // Create patient in database if doesn't exist
  try {
    // Parse patient info from folder name
    const [surname = '', name = '', dob = ''] = patientBase.split('_');
    createPatient(patientBase, recDate, {
      name: `${surname} ${name}`.trim(),
      birthdate: dob,
      doctor: '',
      diagnosis: '',
      patientCard: defaultPatientCard || undefined,
    });
  } catch (error) {
    console.error('Failed to create patient in database:', error);
  }

  if ((await fs.readdir(videoDir)).some(isClip)) return;

  await fs.cp(usbDir, videoDir, { recursive: true, force: false });

  // Copy default patient card if available
  if (defaultPatientCard) {
    try {
      const settingsRoot = path.join(app.getPath("userData"), "appData", "settings");
      const patientCardsRoot = path.join(settingsRoot, "patientCards");
      const sourceCardPath = path.join(patientCardsRoot, defaultPatientCard);
      
      // Check if source card exists
      if (await exists(sourceCardPath)) {
        // Extract card name and extension
        const cardNameWithoutExt = defaultPatientCard.replace(/\.[^/.]+$/, '');
        const cardExt = path.extname(defaultPatientCard);
        
        // Create destination filename: PatientFolderName_CardName.ext
        const destinationFileName = `${patientBase}_${cardNameWithoutExt}${cardExt}`;
        const destinationPath = path.join(patientRoot, destinationFileName);
        
        // Copy the file
        await fs.copyFile(sourceCardPath, destinationPath);
        
        // Update patient card in database
        updatePatientMetadata(patientBase, { patientCard: defaultPatientCard });
      }
    } catch (error) {
      console.error('Failed to copy patient card during USB import:', error);
      // Don't throw error - USB import should continue even if card copy fails
    }
  }
};

const latestDate = async (patientRoot: string) => {
  const sub = await fs.readdir(patientRoot, { withFileTypes: true });
  return sub
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort()
    .pop() || "";
};

const parsePatientFolder = (folder: string) => {
  const [surname = "", name = "", dob = ""] = folder.split("_");
  return { surname, name, dob };
};

const buildProjects = async (patientsRoot: string) => {
  const dirs = await fs.readdir(patientsRoot, { withFileTypes: true });
  return Promise.all(
    dirs
      .filter((d) => d.isDirectory())
      .map(async (d) => {
        const patientConfigFile = path.join(patientsRoot, d.name, "patient.config");
        let patientConfig = { doctor: "", diagnosis: "", patientCard: "" };
        
        try {
          const configContent = await fs.readFile(patientConfigFile, "utf8");
          patientConfig = { ...patientConfig, ...JSON.parse(configContent) };
        } catch {
          // If patient.config doesn't exist or is invalid, use defaults
        }
        
        const { surname, name, dob } = parsePatientFolder(d.name);
        const latestAppointmentDate = await latestDate(path.join(patientsRoot, d.name));
        
        return {
          name: `${surname} ${name}`.trim(),
          birthdate: dob,
          latestAppointmentDate,
          doctor: patientConfig.doctor || "",
          diagnosis: patientConfig.diagnosis || "",
          patientCard: patientConfig.patientCard || "",
          folder: d.name // Keep folder for backward compatibility
        };
      }),
  );
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

  const patientsRoot = path.join(appDataFolder, "patients");
  await ensureDir(patientsRoot);

  const settingsRoot = path.join(appDataFolder, "settings");
  await ensureDir(settingsRoot);

  ipcMain.handle("getProjects", async () => {
    return getAllPatients();
  });

  ipcMain.handle("scanUsb", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled || !filePaths.length) return [];

    const usb = filePaths[0];

    // Get default patient card from settings
    const defaultPatientCard = getSetting('defaultPatientCard');

    const entries = await fs.readdir(usb, { withFileTypes: true });
    
    // Filter folders that match the USB pattern
    const validFolders = entries.filter(e => e.isDirectory() && USB_PATTERN.test(e.name));
    const totalFolders = validFolders.length;
    
    if (totalFolders === 0) {
      return getAllPatients();
    }
    
    // Process folders with progress updates
    for (let i = 0; i < validFolders.length; i++) {
      const e = validFolders[i];
      const progress = Math.round(((i + 1) / totalFolders) * 100);
      
      // Send progress update to renderer
      mainWindow.webContents.send('import-progress', {
        current: i + 1,
        total: totalFolders,
        progress,
        folderName: e.name
      });
      
      await copySession(patientsRoot, path.join(usb, e.name), e.name, defaultPatientCard);
    }

    return getAllPatients();
  });


  ipcMain.handle("dict:get", async () => {
    const doctors = getAllDoctors();
    const diagnoses = getAllDiagnoses();
    return {
      doctors: doctors.map(d => d.name),
      diagnosis: diagnoses.map(d => d.name),
    };
  });

  ipcMain.handle(
    "dict:add",
    async (_e, type: "doctors" | "diagnosis", value: string) => {
      if (type === "doctors") {
        createDoctor(value);
      } else {
        createDiagnosis(value);
      }
    },
  );

  ipcMain.handle("settings:get", async () => {
    return {
      theme: getSetting('theme') || 'light',
      locale: getSetting('locale') || 'en',
      praatPath: getSetting('praatPath') || '',
      defaultPatientCard: getSetting('defaultPatientCard') || null,
    };
  });
  
  ipcMain.handle("settings:set", async (_e, patch) => {
    if (patch.theme !== undefined) setSetting('theme', patch.theme);
    if (patch.locale !== undefined) setSetting('locale', patch.locale);
    if (patch.praatPath !== undefined) setSetting('praatPath', patch.praatPath);
    if (patch.defaultPatientCard !== undefined) setSetting('defaultPatientCard', patch.defaultPatientCard);
  });

  ipcMain.handle("session:get", async () => {
    return {
      currentDoctor: getSessionData('currentDoctor') || null,
    };
  });
  
  ipcMain.handle("session:set", async (_e, patch) => {
    if (patch.currentDoctor !== undefined) setSessionData('currentDoctor', patch.currentDoctor);
  });

  ipcMain.handle("shownTabs:get", async () => {
    const tabs = getAllTabs();
    return tabs.map(t => ({ name: t.name, folder: t.folder }));
  });
  
  ipcMain.handle("shownTabs:set", async (_e, tabs) => {
    updateTabs(tabs);
  });

  ipcMain.handle("patient:getMeta", async (_e, folder: string) => {
    return getPatientByFolderPath(folder);
  });
  
  ipcMain.handle("patient:setMeta", async (_e, folder: string, data: any) => {
    updatePatientMetadata(folder, data);
  });

  ipcMain.handle("patient:appointments", async (_e, folder: string) => {
    const patient = getPatientByFolderPath(folder);
    return patient?.appointments || [];
  });

  ipcMain.handle("patient:getAppointment", async (_e, appointmentPath: string) => {
    const [folder, date] = appointmentPath.split('/').slice(-2);
    const fullFolder = appointmentPath.replace(`/${date}`, '');
    return getAppointmentData(fullFolder, date);
  });

  ipcMain.handle("patient:setAppointment", async (_e, appointmentPath: string, data: any) => {
    const parts = appointmentPath.split('/');
    const date = parts[parts.length - 1];
    const folder = parts.slice(0, -1).join('/');
    updateAppointmentData(folder, date, data);
  });

  /* ---------- live counts & clips ---------- */
  ipcMain.handle("patient:counts", async (_e, folder: string) => {
    const apptDir   = await latestAppointmentDir(patientsRoot, folder);
    const videoDir  = path.join(apptDir, "video");
    const video     = await listDirClips(videoDir);
    return { videoCount: video.length };
  });

  ipcMain.handle("patient:clips", async (_e, folder: string) => {
    const apptDir  = await latestAppointmentDir(patientsRoot, folder);
    const videoDir = path.join(apptDir, "video");
    const toUrl    = (p: string) => `file://${p}`;
    return { video: (await listDirClips(videoDir)).map(toUrl) };
  });

  ipcMain.handle("patient:new", async (_e, base: string, date: string, metadata?: { name: string; birthdate: string; doctor: string; diagnosis: string; patientCard?: string }) => {
    const pRoot = path.join(patientsRoot, base);
    const appt  = path.join(pRoot, date, "video");
    await ensureDir(appt);
    
    // Create patient in database
    createPatient(base, date, metadata);
  });

  ipcMain.handle("patient:openFolder", async (_e, folder: string) => {
    const dir = path.join(patientsRoot, folder);
    return shell.openPath(dir);     // resolves to "" on success or error-string
  });

  // Enhanced clips with pagination and audio detection
  ipcMain.handle("patient:clipsDetailed", async (_e, folder: string, offset: number = 0, limit: number = 12, currentAppointment?: string) => {
    let videoDir: string;
    
    if (currentAppointment) {
      videoDir = path.join(patientsRoot, folder, currentAppointment, "video");
    } else {
      const apptDir = await latestAppointmentDir(patientsRoot, folder);
      videoDir = path.join(apptDir, "video");
    }
    
    const allClips = await listDirClips(videoDir);
    
    const paginatedClips = allClips.slice(offset, offset + limit);
    const detailedClips = await Promise.all(
      paginatedClips.map(async (filePath) => {
        const ext = extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        const stats = await fs.stat(filePath);
        
        // Determine file type and audio capability
        let fileType = 'video';
        let hasAudio = true;
        
        return {
          url: `file://${filePath}`,
          fileName,
          fileType,
          hasAudio,
          size: stats.size,
          modified: stats.mtime,
          extension: ext
        };
      })
    );
    
    return {
      clips: detailedClips,
      total: allClips.length,
      hasMore: offset + limit < allClips.length
    };
  });

  // Load more videos from external sources
  ipcMain.handle("patient:loadMoreVideos", async (_e, folder: string, currentAppointment?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Video Files", extensions: ["mp4", "avi"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    
    if (canceled || !filePaths.length) return { success: false, count: 0 };
    
    let videoDir: string;
    
    if (currentAppointment) {
      videoDir = path.join(patientsRoot, folder, currentAppointment, "video");
    } else {
      const apptDir = await latestAppointmentDir(patientsRoot, folder);
      videoDir = path.join(apptDir, "video");
    }
    
    await ensureDir(videoDir);
    
    let copiedCount = 0;
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destPath = path.join(videoDir, fileName);
      
      try {
        // Check if file already exists
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

  // CustomTab file operations
  ipcMain.handle("getCustomTabFiles", async (_e, folder: string, tabFolder: string, currentAppointment?: string) => {
    let targetDir: string;
    
    if (currentAppointment) {
      targetDir = path.join(patientsRoot, folder, currentAppointment, tabFolder);
    } else {
      targetDir = path.join(patientsRoot, folder, tabFolder);
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
              modified: stats.mtime
            };
          })
      );
      
      return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Error loading custom tab files:', error);
      return [];
    }
  });

  ipcMain.handle("selectAndCopyFiles", async (_e, folder: string, tabFolder: string, currentAppointment?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "All Files", extensions: ["*"] }
      ]
    });
    
    if (canceled || !filePaths.length) return { success: false, count: 0 };
    
    let targetDir: string;
    if (currentAppointment) {
      targetDir = path.join(patientsRoot, folder, currentAppointment, tabFolder);
    } else {
      targetDir = path.join(patientsRoot, folder, tabFolder);
    }
    
    await ensureDir(targetDir);
    
    let copiedCount = 0;
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destPath = path.join(targetDir, fileName);
      
      try {
        // Check if file already exists
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

  ipcMain.handle("openFileInDefaultApp", async (_e, filePath: string) => {
    try {
      const result = await shell.openPath(filePath);
      if (result === "") {
        return { success: true, error: null };
      } else {
        // If opening file failed, try opening the folder containing the file
        console.log('Failed to open file, trying to open folder:', result);
        const folderPath = path.dirname(filePath);
        const folderResult = await shell.openPath(folderPath);
        return { 
          success: folderResult === "", 
          error: folderResult === "" ? null : folderResult,
          fallbackUsed: true 
        };
      }
    } catch (error) {
      console.error('Error opening file:', error);
      // Try opening the folder as fallback
      try {
        const folderPath = path.dirname(filePath);
        const folderResult = await shell.openPath(folderPath);
        return { 
          success: folderResult === "", 
          error: folderResult === "" ? null : folderResult,
          fallbackUsed: true 
        };
      } catch (fallbackError) {
        return { 
          success: false, 
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) 
        };
      }
    }
  });

  // Audio file operations (now supports all file types)
  ipcMain.handle("patient:audioFiles", async (_e, folder: string, currentAppointment?: string) => {
    let audioDir: string;
    
    if (currentAppointment) {
      audioDir = path.join(patientsRoot, folder, currentAppointment, "audio");
    } else {
      const apptDir = await latestAppointmentDir(patientsRoot, folder);
      audioDir = path.join(apptDir, "audio");
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
              isAudio: fileType === 'audio'
            };
          })
      );
      
      return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Error loading audio files:', error);
      return [];
    }
  });

  ipcMain.handle("patient:loadMoreAudio", async (_e, folder: string, currentAppointment?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "All Files", extensions: ["*"] }
      ]
    });
    
    if (canceled || !filePaths.length) return { success: false, count: 0 };
    
    let audioDir: string;
    if (currentAppointment) {
      audioDir = path.join(patientsRoot, folder, currentAppointment, "audio");
    } else {
      const apptDir = await latestAppointmentDir(patientsRoot, folder);
      audioDir = path.join(apptDir, "audio");
    }
    
    await ensureDir(audioDir);
    
    let copiedCount = 0;
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destPath = path.join(audioDir, fileName);
      
      try {
        // Check if file already exists
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

  ipcMain.handle("patient:openAudioFolder", async (_e, folder: string, currentAppointment?: string) => {
    let audioDir: string;
    
    if (currentAppointment) {
      audioDir = path.join(patientsRoot, folder, currentAppointment, "audio");
    } else {
      const apptDir = await latestAppointmentDir(patientsRoot, folder);
      audioDir = path.join(apptDir, "audio");
    }
    
    await ensureDir(audioDir);
    return shell.openPath(audioDir);
  });

  ipcMain.handle("patient:saveRecordedAudio", async (_e, folder: string, currentAppointment: string | undefined, audioBuffer: ArrayBuffer, filename: string) => {
    try {
      let audioDir: string;
      
      if (currentAppointment) {
        audioDir = path.join(patientsRoot, folder, currentAppointment, "audio");
      } else {
        const apptDir = await latestAppointmentDir(patientsRoot, folder);
        audioDir = path.join(apptDir, "audio");
      }
      
      await ensureDir(audioDir);
      
      // Ensure filename has a valid audio extension, default to .wav
      const supportedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.webm', '.mp4'];
      const hasValidExtension = supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      
      const finalFilename = hasValidExtension ? filename : `${filename}.wav`;
      const filePath = path.join(audioDir, finalFilename);
      
      // Convert ArrayBuffer to Buffer and save
      const buffer = Buffer.from(audioBuffer);
      await fs.writeFile(filePath, buffer);
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Error saving recorded audio:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Praat integration handlers
  ipcMain.handle("praat:selectExecutable", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Praat Executable", extensions: ["exe"] },
        { name: "All Files", extensions: ["*"] }
      ],
      title: "Select Praat Executable"
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
    try { await fs.access(p); return true; } catch { return false; }
  }

  function buildOpenArgs(files: string[]) {
    // Ensure Praat receives --open before EACH file (more robust than one --open)
    return files.flatMap(f => ["--open", f]);
  }

  async function launchPraat(praatPath: string, audioFilePaths: string | string[]) {
    const platform = process.platform;
    const files = Array.isArray(audioFilePaths) ? audioFilePaths : [audioFilePaths];

    if (files.length === 0) throw new Error("No audio files provided");

    // Verify all files exist
    const checks = await Promise.all(files.map(f => pathExists(f)));
    const missingIdx = checks.findIndex(ok => !ok);
    if (missingIdx !== -1) {
      throw new Error(`Audio file not found: ${files[missingIdx]}`);
    }

    // Working directory = directory of the first file
    const cwd = path.dirname(files[0]);

    const args = buildOpenArgs(files);

    // Spawn detached so Electron doesn’t wait on Praat
    const child = spawn(praatPath, args, {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsVerbatimArguments: true, // safer for paths with spaces on Windows
    });

    child.unref();
  }

  ipcMain.handle(
    "praat:openFile",
    async (_e, praatPath: string, audioFilePaths: string | string[]) => {
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
    }
  );

  // Patient Cards operations
  const patientCardsRoot = path.join(settingsRoot, "patientCards");
  await ensureDir(patientCardsRoot);

  ipcMain.handle("patientCards:get", async () => {
    try {
      const entries = await fs.readdir(patientCardsRoot, { withFileTypes: true });
      
      const cards = await Promise.all(
        entries
          .filter(entry => entry.isFile())
          .filter(entry => {
            // Filter out temporary files (starting with ~$ or .)
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
              path: filePath,
              size: stats.size,
              extension: ext,
              modified: stats.mtime
            };
          })
      );
      return cards.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Error loading patient cards:', error);
      return [];
    }
  });

  ipcMain.handle("patientCards:import", async (_e, cardName: string, arrayBuffer: ArrayBuffer, originalFileName: string) => {
    try {
      // Validate card name
      const invalidChars = /[<>:"/\\|?*]/g;
      if (invalidChars.test(cardName) || !cardName.trim()) {
        return { success: false, error: "Invalid card name" };
      }

      // Get file extension from original file
      const originalExt = extname(originalFileName).toLowerCase();
      if (!['.doc', '.docx', '.rtf'].includes(originalExt)) {
        return { success: false, error: "Unsupported file type" };
      }

      // Create filename with proper extension
      const fileName = `${cardName.trim()}${originalExt}`;
      const filePath = path.join(patientCardsRoot, fileName);
      
      // Check if file already exists
      if (await exists(filePath)) {
        return { success: false, error: "File with this name already exists" };
      }
      
      // Convert ArrayBuffer to Buffer and save
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);
      
      return { success: true };
    } catch (error) {
      console.error('Error importing patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Default Patient Card operations
  ipcMain.handle("defaultPatientCard:get", async () => {
    return getSetting('defaultPatientCard') || null;
  });

  ipcMain.handle("defaultPatientCard:set", async (_e, fileName: string | null) => {
    setSetting('defaultPatientCard', fileName);
  });

  // Copy patient card to patient folder
  ipcMain.handle("patientCards:copyToPatient", async (_e, cardFileName: string, patientFolderName: string) => {
    try {
      const sourceCardPath = path.join(patientCardsRoot, cardFileName);
      
      // Check if source card exists
      if (!(await exists(sourceCardPath))) {
        return { success: false, error: "Patient card not found" };
      }
      
      // Create destination path in patient folder
      const patientFolderPath = path.join(patientsRoot, patientFolderName);
      await ensureDir(patientFolderPath);
      
      // Extract card name and extension
      const cardNameWithoutExt = cardFileName.replace(/\.[^/.]+$/, '');
      const cardExt = extname(cardFileName);
      
      // Create destination filename: PatientFolderName_CardName.ext
      const destinationFileName = `${patientFolderName}_${cardNameWithoutExt}${cardExt}`;
      const destinationPath = path.join(patientFolderPath, destinationFileName);
      
      // Copy the file
      await fs.copyFile(sourceCardPath, destinationPath);
      
      return { success: true };
    } catch (error) {
      console.error('Error copying patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Delete patient card
  ipcMain.handle("patientCards:delete", async (_e, cardFileName: string) => {
    try {
      const cardPath = path.join(patientCardsRoot, cardFileName);
      
      // Check if file exists
      if (!(await exists(cardPath))) {
        return { success: false, error: "Patient card not found" };
      }
      
      // Delete the file
      await fs.unlink(cardPath);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Medical Tests operations
  const medicalTestsRoot = path.join(settingsRoot, "medicalTest");
  await ensureDir(medicalTestsRoot);

  ipcMain.handle("tests:getAll", async () => {
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

  ipcMain.handle("tests:getById", async (_e, testId: string) => {
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

  ipcMain.handle("tests:create", async (_e, testData: any) => {
    try {
      const now = new Date().toISOString();
      const testId = `test_${Date.now()}`;
      
      const test = {
        id: testId,
        ...testData,
        createdAt: now,
        updatedAt: now
      };
      
      // Create filename based on test name (sanitized)
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

  ipcMain.handle("tests:update", async (_e, testId: string, testData: any) => {
    try {
      // Find the existing test file
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
        updatedAt: new Date().toISOString()
      };
      
      // Check if we need to rename the file (if name changed)
      const sanitizedName = testData.name
        .replace(/[^a-zA-Z0-9а-яА-ЯіІїЇєЄ\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      
      const newFileName = `${sanitizedName}_${testId}.json`;
      const newFilePath = path.join(medicalTestsRoot, newFileName);
      
      // Write to new file path
      await fs.writeFile(newFilePath, JSON.stringify(updatedTest, null, 2), 'utf8');
      
      // Delete old file if path changed
      if (existingFilePath !== newFilePath) {
        await fs.unlink(existingFilePath);
      }
      
      return updatedTest;
    } catch (error) {
      console.error('Error updating test:', error);
      throw error;
    }
  });

  ipcMain.handle("tests:delete", async (_e, testId: string) => {
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

  ipcMain.handle("tests:validateName", async (_e, name: string, excludeId?: string) => {
    try {
      const files = await fs.readdir(medicalTestsRoot, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.json')) {
          const filePath = path.join(medicalTestsRoot, file.name);
          const content = await fs.readFile(filePath, 'utf8');
          const test = JSON.parse(content);
          
          if (test.name.toLowerCase() === name.toLowerCase() && test.id !== excludeId) {
            return false; // Name already exists
          }
        }
      }
      
      return true; // Name is available
    } catch (error) {
      console.error('Error validating test name:', error);
      return false;
    }
  });

  ipcMain.handle("tests:openFolder", async () => {
    try {
      const result = await shell.openPath(medicalTestsRoot);
      if (result === "") {
        return { success: true, error: null };
      } else {
        console.log('Failed to open tests folder:', result);
        return { 
          success: false, 
          error: result 
        };
      }
    } catch (error) {
      console.error('Error opening tests folder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });

  ipcMain.handle("tests:export", async (_e, testId: string) => {
    try {
      // Find the test file
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
      
      // Show save dialog
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const sanitizedName = testData.name.replace(/[^a-zA-Z0-9а-яА-ЯіІїЇєЄ\s]/g, '').replace(/\s+/g, '_');
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Test',
        defaultPath: `${sanitizedName}_${currentDate}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' };
      }
      
      // Write test data to selected file
      await fs.writeFile(filePath, JSON.stringify(testData, null, 2), 'utf8');
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting test:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });

  ipcMain.handle("tests:import", async () => {
    try {
      // Show open dialog
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Test',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (canceled || !filePaths.length) {
        return { success: false, error: 'Import cancelled' };
      }
      
      // Read and parse the test file
      const filePath = filePaths[0];
      const content = await fs.readFile(filePath, 'utf8');
      const testData = JSON.parse(content);
      
      // Validate basic test structure
      if (!testData.name || !testData.description || !testData.testType) {
        return { success: false, error: 'Invalid test file format' };
      }
      
      // Generate new ID and update timestamps
      const now = new Date().toISOString();
      const importedTest = {
        ...testData,
        id: `test_${Date.now()}`,
        createdAt: now,
        updatedAt: now
      };
      
      // Check for name conflicts and modify if necessary
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
      
      // Save the imported test
      const fileName = `${importedTest.name.replace(/[^a-zA-Z0-9]/g, '_')}_${importedTest.id}.json`;
      const testFilePath = path.join(medicalTestsRoot, fileName);
      await fs.writeFile(testFilePath, JSON.stringify(importedTest, null, 2), 'utf8');
      
      return { success: true, test: importedTest };
    } catch (error) {
      console.error('Error importing test:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });

  // Open patient card file
  ipcMain.handle("patientCards:openPatientCard", async (_e, patientFolderName: string, cardFileName: string) => {
    try {
      // Construct the path to the patient card in the patient's folder
      const cardNameWithoutExt = cardFileName.replace(/\.[^/.]+$/, '');
      const cardExt = path.extname(cardFileName);
      const patientCardFileName = `${patientFolderName}_${cardNameWithoutExt}${cardExt}`;
      const patientCardPath = path.join(patientsRoot, patientFolderName, patientCardFileName);
      
      // Check if file exists
      if (!(await exists(patientCardPath))) {
        return { success: false, error: "Patient card not found in patient folder" };
      }
      
      // Open the file
      const result = await shell.openPath(patientCardPath);
      if (result === "") {
        return { success: true, error: null };
      } else {
        // If opening file failed, try opening the folder containing the file
        console.log('Failed to open patient card, trying to open folder:', result);
        const folderPath = path.dirname(patientCardPath);
        const folderResult = await shell.openPath(folderPath);
        return { 
          success: folderResult === "", 
          error: folderResult === "" ? null : folderResult,
          fallbackUsed: true 
        };
      }
    } catch (error) {
      console.error('Error opening patient card:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Patient Test operations

  ipcMain.handle("patientTests:getAll", async (_e, folder: string, currentAppointment?: string) => {
    try {
      return getPatientTests(folder, currentAppointment);
    } catch (error) {
      console.error('Error loading patient tests:', error);
      return [];
    }
  });

  ipcMain.handle("patientTests:create", async (_e, folder: string, currentAppointment: string | undefined, testId: string, testData: any) => {
    try {
      return createPatientTest(folder, currentAppointment, testId, testData);
    } catch (error) {
      console.error('Error creating patient test:', error);
      throw error;
    }
  });

  ipcMain.handle("patientTests:update", async (_e, folder: string, currentAppointment: string | undefined, patientTestId: string, progressData: any) => {
    try {
      return updatePatientTest(folder, currentAppointment, patientTestId, progressData);
    } catch (error) {
      console.error('Error updating patient test:', error);
      throw error;
    }
  });

  ipcMain.handle("patientTests:delete", async (_e, folder: string, currentAppointment: string | undefined, patientTestId: string) => {
    try {
      return deletePatientTest(folder, patientTestId);
    } catch (error) {
      console.error('Error deleting patient test:', error);
      throw error;
    }
  });
};


