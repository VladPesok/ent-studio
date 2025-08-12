import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

export type DictionaryType = "doctors" | "diagnosis";

export interface ElectronAPI {
  /* projects & USB */
  scanUsb(): Promise<any>;
  getProjects(): Promise<any>;

  /* patient data */
  getPatient(folder: string): Promise<any>; // returns data from patient.config
  setPatient(folder: string, data: any): Promise<void>; // saves data to patient.config
  getPatientAppointments(folder: string): Promise<{ date: string; doctor: string; diagnosis: string }[]>;
  getPatientAppointment(appointmentPath: string): Promise<any>; // returns data from appointment.config
  setPatientAppointments(appointmentPath: string, data: any): Promise<void>; // saves appointment.config
  getCounts(folder: string): Promise<{ videoCount: number }>;
  getClips(folder: string): Promise<{ video: string[] }>;
  getClipsDetailed(folder: string, offset?: number, limit?: number): Promise<{
    clips: Array<{
      url: string;
      fileName: string;
      fileType: string;
      hasAudio: boolean;
      size: number;
      modified: Date;
      extension: string;
    }>;
    total: number;
    hasMore: boolean;
  }>;
  loadMoreVideos(folder: string): Promise<{ success: boolean; count: number }>;
  makePatient(base: string, date: string): Promise<void>;
  openPatientFolderInFs(base: string): Promise<void>;

  /* settings & session & dictionaries */
  getSettings(): Promise<{ theme: "light" | "dark"; locale: "en" | "ua"; praatPath: string }>;
  setSettings(patch: Partial<{ theme: "light" | "dark"; locale: "en" | "ua"; praatPath?: string }>): Promise<void>;

  getSession(): Promise<{ currentDoctor: string | null }>;
  setSession(patch: Partial<{ currentDoctor: string | null }>): Promise<void>;

  getShownTabs(): Promise<{ name: string; folder: string }[]>;
  setShownTabs(tabs: { name: string; folder: string }[]): Promise<void>;

  getDictionaries(): Promise<{ doctors: string[]; diagnosis: string[] }>;
  addDictionaryEntry(type: DictionaryType, value: string): Promise<void>;

  /* CustomTab file operations */
  getCustomTabFiles(folder: string, tabFolder: string, currentAppointment?: string): Promise<Array<{
    name: string;
    path: string;
    size: number;
    extension: string;
    modified: Date;
  }>>;
  selectAndCopyFiles(folder: string, tabFolder: string, currentAppointment?: string): Promise<{ success: boolean; count: number }>;
  openFileInDefaultApp(filePath: string): Promise<{ success: boolean; error?: string }>;

  /* Audio file operations */
  getAudioFiles(folder: string, currentAppointment?: string): Promise<Array<{
    url: string;
    fileName: string;
    path: string;
    size: number;
    extension: string;
    modified: Date;
    fileType: string;
  }>>;
  loadMoreAudio(folder: string, currentAppointment?: string): Promise<{ success: boolean; count: number }>;
  openAudioFolder(folder: string, currentAppointment?: string): Promise<string>;
  saveRecordedAudio(folder: string, currentAppointment: string | undefined, audioBuffer: ArrayBuffer, filename: string): Promise<{ success: boolean; filePath?: string; error?: string }>;

  /* Praat integration */
  selectPraatExecutable(): Promise<{ success: boolean; path: string | null }>;
  openFileWithPraat(praatPath: string, audioFilePath: string): Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}


contextBridge.exposeInMainWorld("electronAPI", {
  /* projects & USB */
  scanUsb     : ()                => ipcRenderer.invoke("scanUsb"),
  getProjects : ()                => ipcRenderer.invoke("getProjects"),

  /* patient data */
  getPatient : (f: string)         => ipcRenderer.invoke("patient:getMeta", f), // returns data from patient.config
  setPatient : (f: string, d: any) => ipcRenderer.invoke("patient:setMeta", f, d), // saves data to patient.config
  
  getPatientAppointments: (f: string) => ipcRenderer.invoke("patient:appointments", f),
  getPatientAppointment: (appointmentPath: string) => ipcRenderer.invoke("patient:getAppointment", appointmentPath), // returns data from appointment.config
  setPatientAppointments: (appointmentPath: string, d: any) => ipcRenderer.invoke("patient:setAppointment", appointmentPath, d), // saves appointment.config
  
  getCounts  : (f: string)         => ipcRenderer.invoke("patient:counts", f),
  getClips   : (f: string)         => ipcRenderer.invoke("patient:clips",  f),
  getClipsDetailed: (f: string, offset?: number, limit?: number) => ipcRenderer.invoke("patient:clipsDetailed", f, offset, limit),
  loadMoreVideos: (f: string)      => ipcRenderer.invoke("patient:loadMoreVideos", f),
  makePatient: (base: string, date: string) => ipcRenderer.invoke("patient:new", base, date),

  openPatientFolderInFs: (folder: string) => ipcRenderer.invoke("patient:openFolder", folder),

  /* settings & session & dictionaries */
  getSettings: ()                 => ipcRenderer.invoke("settings:get"),
  setSettings: (p: any)           => ipcRenderer.invoke("settings:set", p),

  getSession : ()                 => ipcRenderer.invoke("session:get"),
  setSession : (p: any)           => ipcRenderer.invoke("session:set", p),

  getShownTabs: ()                => ipcRenderer.invoke("shownTabs:get"),
  setShownTabs: (tabs: any)       => ipcRenderer.invoke("shownTabs:set", tabs),

  getDictionaries  : ()                                   => ipcRenderer.invoke("dict:get"),
  addDictionaryEntry: (t: DictionaryType, e: string)     => ipcRenderer.invoke("dict:add", t, e),

  /* CustomTab file operations */
  getCustomTabFiles: (folder: string, tabFolder: string, currentAppointment?: string) => 
    ipcRenderer.invoke("getCustomTabFiles", folder, tabFolder, currentAppointment),
  selectAndCopyFiles: (folder: string, tabFolder: string, currentAppointment?: string) => 
    ipcRenderer.invoke("selectAndCopyFiles", folder, tabFolder, currentAppointment),
  openFileInDefaultApp: (filePath: string) => 
    ipcRenderer.invoke("openFileInDefaultApp", filePath),

  /* Audio file operations */
  getAudioFiles: (folder: string, currentAppointment?: string) => 
    ipcRenderer.invoke("patient:audioFiles", folder, currentAppointment),
  loadMoreAudio: (folder: string, currentAppointment?: string) => 
    ipcRenderer.invoke("patient:loadMoreAudio", folder, currentAppointment),
  openAudioFolder: (folder: string, currentAppointment?: string) => 
    ipcRenderer.invoke("patient:openAudioFolder", folder, currentAppointment),
  saveRecordedAudio: (folder: string, currentAppointment: string | undefined, audioBuffer: ArrayBuffer, filename: string) => 
    ipcRenderer.invoke("patient:saveRecordedAudio", folder, currentAppointment, audioBuffer, filename),

  /* Praat integration */
  selectPraatExecutable: () => 
    ipcRenderer.invoke("praat:selectExecutable"),
  openFileWithPraat: (praatPath: string, audioFilePath: string) => 
    ipcRenderer.invoke("praat:openFile", praatPath, audioFilePath),
});

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)