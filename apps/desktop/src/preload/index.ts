import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nativeScreen', {
  listSources: () => ipcRenderer.invoke('screen:sources')
});
