import fs from "fs/promises";
import path, { extname } from "path";
import type { App, Dialog, IpcMain } from "electron";
import mammoth from "mammoth";
import { shell } from "electron";
const parseVoiceMetrics = (text: string) => {
  const rx = {
    pitch:   /Median pitch:\s+([\d.]+)\s*Hz/i,
    jitter:  /Jitter \(local\):\s+([\d.]+)\s*%/i,
    shimmer: /Shimmer \(local\):\s+([\d.]+)\s*%/i,
    hnr:     /Mean harmonics-to-noise ratio:\s+([\d.]+)\s*dB/i,
  };
  const m = {
    pitch:   text.match(rx.pitch)?.[1],
    jitter:  text.match(rx.jitter)?.[1],
    shimmer: text.match(rx.shimmer)?.[1],
    hnr:     text.match(rx.hnr)?.[1],
  };
  return m.pitch && m.jitter && m.shimmer && m.hnr
    ? {
        length: null,
        medianPitch:  Number(m.pitch),
        jitter:       Number(m.jitter),
        shimmer:      Number(m.shimmer),
        ratio:        Number(m.hnr),
      }
    : null;
};


export const makePatientsRoot = (app: App) =>
  path.join(app.getPath("userData"), "patients");

const PATTERN =
  /^(.+?_\d{4}-\d{2}-\d{2})_([^_]+)_(\d{4}-\d{2}-\d{2})_\d{6}$/; // ПІБ_DOB_code_Date_Time

export const isClip = (f: string) =>
  [".mp4", ".avi"].includes(extname(f).toLowerCase());

export const ensureDir = (dir: string) => fs.mkdir(dir, { recursive: true });

export const exists = async (p: string) =>
  fs
    .access(p)
    .then(() => true)
    .catch(() => false);

/* ------------------------------------------------------------------ */
/*  LOW-LEVEL HELPERS                                                 */
/* ------------------------------------------------------------------ */

const copySession = async (
  patientsRoot: string,
  srcDir: string,
  folderName: string,
) => {
  const [, patientBase, code, recDate] = folderName.match(PATTERN)!;

  const combined = `${patientBase}_${recDate}`; // e.g. Петров_Петро_1980-01-01_2025-06-30
  const destRoot = path.join(patientsRoot, combined);
  const sub      = code === "1" ? "video" : "video_audio";
  const destDir  = path.join(destRoot, sub);

  if (!(await exists(destRoot))) {
    await ensureDir(destRoot);
    await fs.writeFile(path.join(destRoot, "patient.config"), "{}");
  }
  if (await exists(destDir)) return; // already copied earlier
  await fs.cp(srcDir, destDir, { recursive: true, force: false });
};

const buildProjects = async (patientsRoot: string) => {
  const dirs = await fs.readdir(patientsRoot, { withFileTypes: true });
  return dirs
    .filter((d) => d.isDirectory())
    .map((d) => {
      const parts = d.name.split("_");
      return { folder: d.name, date: parts.at(-1) ?? "" };
    });
};

/* ---------------- counts & clip list ---------------- */
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

/* ------------------------------------------------------------------ */
/*  IPC REGISTRATION                                                  */
/* ------------------------------------------------------------------ */

/** Call once from main/index.ts */
export const registerFsIpc = (
  app: App,
  ipc: IpcMain,
  dialog: Dialog,
): void => {
  const patientsRoot = makePatientsRoot(app);

  /* ensure base dir exists on any call */
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
      if (e.isDirectory() && PATTERN.test(e.name))
        await copySession(patientsRoot, path.join(usb, e.name), e.name);

    return buildProjects(patientsRoot);
  });

  /* ---------- dictionaries (global) ---------- */
  const appCfg = () => path.join(patientsRoot, "app.config");
  const ensureJson = async (file: string, init: any) => {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify(init, null, 2), "utf8");
      return structuredClone(init);
    }

    try {
      const raw = await fs.readFile(file, "utf8");
      return JSON.parse(raw);
    } catch {
      await fs.writeFile(file, JSON.stringify(init, null, 2), "utf8");
      return structuredClone(init);
    }
  };
  const saveJson = (file: string, data: any) =>
    fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");

  ipc.handle("dict:get", async () => {
    const cfg = await ensureJson(appCfg(), { dictionaries: { doctors: [], diagnosis: [] } });
    return cfg.dictionaries;
  });
  ipc.handle("dict:add", async (_e, type: "doctors" | "diagnosis", value: string) => {
    const cfg = await ensureJson(appCfg(), { dictionaries: { doctors: [], diagnosis: [] } });
    if (!cfg.dictionaries[type].includes(value)) {
      cfg.dictionaries[type].push(value);
      await saveJson(appCfg(), cfg);
    }
  });

  const patCfg = (f: string) => path.join(patientsRoot, f, "patient.config");

  ipc.handle("patient:get", async (_e, folder: string) =>
    ensureJson(patCfg(folder), { doctor: "", diagnosis: "" }),
  );
  ipc.handle("patient:set", async (_e, folder: string, data: any) => {
    const file = patCfg(folder);
    const cur = await ensureJson(file, {});
    await saveJson(file, { ...cur, ...data });
  });

  /* live counts */
  ipc.handle("patient:counts", async (_e, folder: string) => {
    const base = path.join(patientsRoot, folder);
    const video      = await listDirClips(path.join(base, "video"));
    const videoAudio = await listDirClips(path.join(base, "video_audio"));
    return { videoCount: video.length, videoAudioCount: videoAudio.length };
  });

  ipc.handle("patient:clips", async (_e, folder: string) => {
    const base = path.join(patientsRoot, folder);

    const toUrl = (p: string) => `file://${p}`;

    return {
      video:      (await listDirClips(path.join(base, "video"))).map(toUrl),
      videoAudio: (await listDirClips(path.join(base, "video_audio"))).map(toUrl),
    };
  });

  ipc.handle("voice:add", async (_e, folder: string) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Word Docs", extensions: ["doc", "docx"] }],
    });
    if (canceled || !filePaths.length) return { ok: false, reason: "cancel" };

    const src = filePaths[0];

    /* destination = patients/<folder>/voice-reports/ */
    const patientDir = path.join(patientsRoot, folder);
    const vrDir      = path.join(patientDir, "voice-reports");
    await fs.mkdir(vrDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:T\-]/g, "").slice(0, 15);
    const { name: base, ext } = path.parse(src);
    const fileName = `${base}_${timestamp}${ext}`;
    const dest     = path.join(vrDir, fileName);
    await fs.copyFile(src, dest);

    /* read document */
    let text: string;
    if (/\.docx$/i.test(src)) {
      text = (await mammoth.extractRawText({ path: src })).value;
    } else {
      text = await fs.readFile(src, "utf8");
    }

    const metrics = parseVoiceMetrics(text);
    if (!metrics) {
      await fs.unlink(dest);
      return { ok: false, reason: "invalid" };
    }

    /* update patient.config */
    const cfgPath = patCfg(folder);
    const cfg = await ensureJson(cfgPath, {});
    cfg.voiceReport = Array.isArray(cfg.voiceReport) ? cfg.voiceReport : [];
    cfg.voiceReport.push({ file: fileName, ...metrics });
    await saveJson(cfgPath, cfg);

    return { ok: true, report: cfg.voiceReport };
  });


  ipc.handle("voice:open", async (_e, folder: string, fileName: string) => {
    const full = path.join(patientsRoot, folder, "voice-reports", fileName);
    shell.showItemInFolder(full);
  });

  ipc.handle("voice:delete", async (_e, folder: string, file: string) => {
    const full = path.join(patientsRoot, folder, "voice-reports", file);

    /* remove file if it exists */
    try { await fs.unlink(full); } catch {/* ignore */ }

    /* pull it out of patient.config */
    const cfgFile = patCfg(folder);
    const cfg = await ensureJson(cfgFile, {});
    cfg.voiceReport = (Array.isArray(cfg.voiceReport) ? cfg.voiceReport : [])
      .filter((r: any) => r.file !== file);
    await saveJson(cfgFile, cfg);

    return cfg.voiceReport;
  });

};
