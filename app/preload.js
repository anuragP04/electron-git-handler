const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hookAPI", {
  getStatus: () => ipcRenderer.invoke("hook:getStatus"),
  install: () => ipcRenderer.invoke("hook:install"),
  uninstall: () => ipcRenderer.invoke("hook:uninstall"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (config) => ipcRenderer.invoke("config:set", config),
  getHistory: (limit) => ipcRenderer.invoke("history:get", limit),
  onHistoryUpdated: (callback) => ipcRenderer.on("history:updated", callback),
});
