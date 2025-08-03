import fs from "fs/promises";
import path, { extname } from "path";
import type { App, Dialog, IpcMain } from "electron";
import { shell } from "electron";

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

  /* cfg stub per appointment */
  const cfgFile = path.join(appointmentRoot, "data.cfg");
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
      .map(async (d) => ({
        folder: d.name,
        date:   await latestDate(path.join(patientsRoot, d.name)),
      })),
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
    settings    : { theme: "light" as "light" | "dark", locale: "en" as "en" | "ua" },
    session     : { currentDoctor: null as string | null },
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


  const apptCfg = async (folder: string) => {
    const apptDir = await latestAppointmentDir(patientsRoot, folder);
    return path.join(apptDir, "data.cfg");
  };

  ipc.handle("patient:get", async (_e, folder: string) =>
    ensureJson(await apptCfg(folder), { doctor:"", diagnosis:"", notes:"" }),
  );
  ipc.handle("patient:set", async (_e, folder: string, data: any) => {
    const file = await apptCfg(folder);
    const cur  = await ensureJson(file, {});
    await saveJson(file, { ...cur, ...data });
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
    await fs.writeFile(path.join(pRoot, date, "data.cfg"), "{}", "utf8");
  });

  ipc.handle("patient:openFolder", async (_e, folder: string) => {
    const dir = path.join(patientsRoot, folder);
    return shell.openPath(dir);     // resolves to "" on success or error-string
  });

};


