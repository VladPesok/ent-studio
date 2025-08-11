import fs from "fs/promises";
import path, { extname } from "path";
import type { App, Dialog, IpcMain } from "electron";
import { shell } from "electron";
import { spawn, execFile  } from "child_process";

export const makePatientsRoot = (app: App) =>
  path.join(app.getPath("userData"), "patients");

export const isClip = (f: string) =>
  [".mp4", ".avi"].includes(extname(f).toLowerCase());

export const ensureDir = (dir: string) => fs.mkdir(dir, { recursive: true });

export const exists = async (p: string) =>
  fs.access(p).then(() => true).catch(() => false);


const USB_PATTERN =
  /^(.+?_\d{4}-\d{2}-\d{2})_(?:[^_]+)_(\d{4}-\d{2}-\d{2})_\d{6}$/;


const copySession = async (
  patientsRoot: string,
  usbDir: string,
  usbFolderName: string,
) => {
  const m = usbFolderName.match(USB_PATTERN);
  if (!m) return;

  const [, patientBase, recDate] = m;
  const patientRoot     = path.join(patientsRoot, patientBase);
  const appointmentRoot = path.join(patientRoot, recDate);
  const videoDir        = path.join(appointmentRoot, "video");
  const voiceDir        = path.join(appointmentRoot, "voice");

  /* create patient / appointment dirs on first encounter */
  await ensureDir(videoDir);
  await ensureDir(voiceDir);

  /* create patient.config in patient folder if it doesn't exist */
  const patientConfigFile = path.join(patientRoot, "patient.config");
  if (!(await exists(patientConfigFile))) {
    await fs.writeFile(patientConfigFile, JSON.stringify({ doctor: "", diagnosis: "" }, null, 2), "utf8");
  }

  /* cfg stub per appointment */
  const cfgFile = path.join(appointmentRoot, "appointment.config");
  if (!(await exists(cfgFile))) await fs.writeFile(cfgFile, "{}", "utf8");

  if ((await fs.readdir(videoDir)).some(isClip)) return;

  await fs.cp(usbDir, videoDir, { recursive: true, force: false });
};

const latestDate = async (patientRoot: string) => {
  const sub = await fs.readdir(patientRoot, { withFileTypes: true });
  return sub
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort()
    .pop() || "";
};

const buildProjects = async (patientsRoot: string) => {
  const dirs = await fs.readdir(patientsRoot, { withFileTypes: true });
  return Promise.all(
    dirs
      .filter((d) => d.isDirectory())
      .map(async (d) => {
        const patientConfigFile = path.join(patientsRoot, d.name, "patient.config");
        let patientConfig = { doctor: "", diagnosis: "" };
        
        try {
          const configContent = await fs.readFile(patientConfigFile, "utf8");
          patientConfig = { ...patientConfig, ...JSON.parse(configContent) };
        } catch {
          // If patient.config doesn't exist or is invalid, use defaults
        }
        
        return {
          folder: d.name,
          date: await latestDate(path.join(patientsRoot, d.name)),
          doctor: patientConfig.doctor || "",
          diagnosis: patientConfig.diagnosis || ""
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

export const registerFsIpc = (
  app: App,
  ipc: IpcMain,
  dialog: Dialog,
): void => {
  const patientsRoot = makePatientsRoot(app);

  ipc.handle("getProjects", async () => {
    await ensureDir(patientsRoot);
    return buildProjects(patientsRoot);
  });

  ipc.handle("scanUsb", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled || !filePaths.length) return [];

    await ensureDir(patientsRoot);
    const usb = filePaths[0];

    const entries = await fs.readdir(usb, { withFileTypes: true });
    for (const e of entries)
      if (e.isDirectory() && USB_PATTERN.test(e.name))
        await copySession(patientsRoot, path.join(usb, e.name), e.name);

    return buildProjects(patientsRoot);
  });



  const appCfg = () => path.join(patientsRoot, "app.config");

  const ensureJson = async (file: string, init: any) => {
    try { await fs.access(file); }
    catch {
      await fs.writeFile(file, JSON.stringify(init, null, 2), "utf8");
      return structuredClone(init);
    }
    try { return JSON.parse(await fs.readFile(file, "utf8")); }
    catch {
      await fs.writeFile(file, JSON.stringify(init, null, 2), "utf8");
      return structuredClone(init);
    }
  };

  const saveJson = (file: string, data: any) =>
    fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");

  const DEFAULT_CFG = {
    dictionaries: { doctors: [] as string[], diagnosis: [] as string[] },
    settings    : { theme: "light" as "light" | "dark", locale: "en" as "en" | "ua", praatPath: "" as string },
    session     : { currentDoctor: null as string | null },
    shownTabs   : [
      { name: "video_materials", folder: "video" },
      { name: "voice_report", folder: "audio" }
    ] as { name: string; folder: string }[],
  };

  ipc.handle("dict:get", async () => {
    const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
    return cfg.dictionaries;
  });

  ipc.handle(
    "dict:add",
    async (_e, type: "doctors" | "diagnosis", value: string) => {
      const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
      if (!cfg.dictionaries[type].includes(value)) {
        cfg.dictionaries[type].push(value);
        await saveJson(appCfg(), cfg);
      }
    },
  );

  ipc.handle("settings:get", async () => {
    const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
    return cfg.settings;
  });
  ipc.handle("settings:set", async (_e, patch) => {
    const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
    cfg.settings = { ...cfg.settings, ...patch };
    await saveJson(appCfg(), cfg);
  });

  ipc.handle("session:get", async () => {
    const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
    return cfg.session;
  });
  ipc.handle("session:set", async (_e, patch) => {
    const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
    cfg.session = { ...cfg.session, ...patch };
    await saveJson(appCfg(), cfg);
  });

  ipc.handle("shownTabs:get", async () => {
    const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
    return cfg.shownTabs;
  });
  ipc.handle("shownTabs:set", async (_e, tabs) => {
    const cfg = await ensureJson(appCfg(), DEFAULT_CFG);
    cfg.shownTabs = tabs;
    await saveJson(appCfg(), cfg);
  });

  const patientCfg = (folder: string) => {
    return path.join(patientsRoot, folder, "patient.config");
  };

  // Patient-level config (main doctor/diagnosis)
  ipc.handle("patient:getMeta", async (_e, folder: string) =>
    ensureJson(patientCfg(folder), { doctor: "", diagnosis: "" }),
  );
  ipc.handle("patient:setMeta", async (_e, folder: string, data: any) => {
    const file = patientCfg(folder);
    const cur = await ensureJson(file, {});
    await saveJson(file, { ...cur, ...data });
  });



  ipc.handle("patient:appointments", async (_e, folder: string) => {
    const patientRoot = path.join(patientsRoot, folder);
    try {
      const entries = await fs.readdir(patientRoot, { withFileTypes: true });
      const appointments = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
          const appointmentDir = path.join(patientRoot, entry.name);
          const configFile = path.join(appointmentDir, "appointment.config");
          const config = await ensureJson(configFile, { doctor: "", diagnosis: "", notes: "" });
          
          appointments.push({
            date: entry.name,
            doctor: config.doctor || "",
            diagnosis: config.diagnosis || ""
          });
        }
      }
      
      // Sort appointments by date (newest first)
      return appointments.sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  });

  // Get appointment-specific data from appointment.config
  ipc.handle("patient:getAppointment", async (_e, appointmentPath: string) => {
    const configFile = path.join(patientsRoot, appointmentPath, "appointment.config");
    return ensureJson(configFile, { doctor: "", diagnosis: "", notes: "" });
  });

  // Save appointment-specific data to appointment.config
  ipc.handle("patient:setAppointment", async (_e, appointmentPath: string, data: any) => {
    const configFile = path.join(patientsRoot, appointmentPath, "appointment.config");
    const cur = await ensureJson(configFile, { doctor: "", diagnosis: "", notes: "" });
    await saveJson(configFile, { ...cur, ...data });
  });

  /* ---------- live counts & clips ---------- */
  ipc.handle("patient:counts", async (_e, folder: string) => {
    const apptDir   = await latestAppointmentDir(patientsRoot, folder);
    const videoDir  = path.join(apptDir, "video");
    const video     = await listDirClips(videoDir);
    return { videoCount: video.length };
  });

  ipc.handle("patient:clips", async (_e, folder: string) => {
    const apptDir  = await latestAppointmentDir(patientsRoot, folder);
    const videoDir = path.join(apptDir, "video");
    const toUrl    = (p: string) => `file://${p}`;
    return { video: (await listDirClips(videoDir)).map(toUrl) };
  });

  ipc.handle("patient:new", async (_e, base: string, date: string) => {
    const pRoot = path.join(patientsRoot, base);
    const appt  = path.join(pRoot, date, "video");
    await ensureDir(appt);
    
    // Create patient.config in patient folder
    const patientConfigFile = path.join(pRoot, "patient.config");
    if (!(await exists(patientConfigFile))) {
      await fs.writeFile(patientConfigFile, JSON.stringify({ doctor: "", diagnosis: "" }, null, 2), "utf8");
    }
    
    // Create appointment.config in appointment folder
    await fs.writeFile(path.join(pRoot, date, "appointment.config"), "{}", "utf8");
  });

  ipc.handle("patient:openFolder", async (_e, folder: string) => {
    const dir = path.join(patientsRoot, folder);
    return shell.openPath(dir);     // resolves to "" on success or error-string
  });

  // Enhanced clips with pagination and audio detection
  ipc.handle("patient:clipsDetailed", async (_e, folder: string, offset: number = 0, limit: number = 12) => {
    const apptDir = await latestAppointmentDir(patientsRoot, folder);
    const videoDir = path.join(apptDir, "video");
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
  ipc.handle("patient:loadMoreVideos", async (_e, folder: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Video Files", extensions: ["mp4", "avi"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    
    if (canceled || !filePaths.length) return { success: false, count: 0 };
    
    const apptDir = await latestAppointmentDir(patientsRoot, folder);
    const videoDir = path.join(apptDir, "video");
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
  ipc.handle("getCustomTabFiles", async (_e, folder: string, tabFolder: string, currentAppointment?: string) => {
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

  ipc.handle("selectAndCopyFiles", async (_e, folder: string, tabFolder: string, currentAppointment?: string) => {
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

  ipc.handle("openFileInDefaultApp", async (_e, filePath: string) => {
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

  // Audio file operations
  ipc.handle("patient:audioFiles", async (_e, folder: string, currentAppointment?: string) => {
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
      
      const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.webm', '.mp4'];
      
      const files = await Promise.all(
        entries
          .filter(entry => entry.isFile())
          .filter(entry => {
            const ext = extname(entry.name).toLowerCase();
            return audioExtensions.includes(ext);
          })
          .map(async (entry) => {
            const filePath = path.join(audioDir, entry.name);
            const stats = await fs.stat(filePath);
            const ext = extname(entry.name).toLowerCase();
            
            return {
              url: `file://${filePath}`,
              fileName: entry.name,
              path: filePath,
              size: stats.size,
              extension: ext,
              modified: stats.mtime,
              fileType: 'audio'
            };
          })
      );
      
      return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      console.error('Error loading audio files:', error);
      return [];
    }
  });

  ipc.handle("patient:loadMoreAudio", async (_e, folder: string, currentAppointment?: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Audio Files", extensions: ["mp3", "wav", "m4a", "aac", "ogg", "flac", "wma", "webm", "mp4"] },
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

  ipc.handle("patient:openAudioFolder", async (_e, folder: string, currentAppointment?: string) => {
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

  ipc.handle("patient:saveRecordedAudio", async (_e, folder: string, currentAppointment: string | undefined, audioBuffer: ArrayBuffer, filename: string) => {
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
  ipc.handle("praat:selectExecutable", async () => {
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

  async function closePraatProcesses() {
    const platform = process.platform;
    
    try {
      if (platform === "win32") {
        // Windows: kill all Praat processes
        spawn("taskkill", ["/F", "/IM", "Praat.exe"], { stdio: "ignore" });
      } else if (platform === "darwin") {
        // macOS: kill all Praat processes
        spawn("pkill", ["-f", "Praat"], { stdio: "ignore" });
      } else {
        // Linux/Unix: kill all Praat processes
        spawn("pkill", ["-f", "praat"], { stdio: "ignore" });
      }
      
      // Wait a moment for processes to close
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log('Note: Could not close existing Praat processes:', error);
      // Continue anyway - this is not a critical error
    }
  }

  async function launchPraat(praatPath: string, audioFilePath: string) {
    const platform = process.platform;
    console.log('Platform:', platform);

    // First, try to close any existing Praat processes
    await closePraatProcesses();

    if (platform === "darwin") {
      // macOS: use --open flag
      const child = spawn(praatPath, ["--open", audioFilePath], { stdio: "ignore", detached: true });
      child.unref();
      return;
    }

    if (platform === "win32") {
      // Windows: use --open flag with spawn
      const child = spawn(praatPath, ["--open", audioFilePath], {
        stdio: "ignore",
        detached: true
      });
      child.unref();
      return;
    }

    // Linux/Unix: use --open flag
    const child = spawn(praatPath, ["--open", audioFilePath], { stdio: "ignore", detached: true });
    child.unref();
  }

  ipc.handle("praat:openFile", async (_e, praatPath: string, audioFilePath: string) => {
    try {
      // Basic checks + helpful diagnostics
      if (!praatPath || !audioFilePath) {
        return { success: false, error: "Missing praatPath or audioFilePath" };
      }

      const [praatExists, audioExists] = await Promise.all([
        isExecutable(praatPath),
        fs.access(audioFilePath).then(() => true).catch(() => false),
      ]);

      if (!praatExists) return { success: false, error: `Praat not found or not executable: ${praatPath}` };
      if (!audioExists) return { success: false, error: `Audio file not found: ${audioFilePath}` };

      await launchPraat(praatPath, audioFilePath);
      return { success: true };
    } catch (error) {
      console.error("Error opening file with Praat:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });


};


