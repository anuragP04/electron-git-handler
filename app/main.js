const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const hookManager = require("./lib/hookManager");

let mainWindow = null;
let logsWatcher = null;

function watchLogs(win) {
  const { logsDir } = hookManager.paths();
  fs.mkdirSync(logsDir, { recursive: true });
  if (logsWatcher) logsWatcher.close();

  let debounce = null;
  logsWatcher = fs.watch(logsDir, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (win && !win.isDestroyed()) win.webContents.send("history:updated");
    }, 200);
  });
}

function registerIpcHandlers() {
  ipcMain.handle("hook:getStatus", () => hookManager.getStatus());

  ipcMain.handle("hook:install", () => hookManager.performInstall());

  ipcMain.handle("hook:uninstall", async () => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["Cancel", "Uninstall"],
      defaultId: 0,
      cancelId: 0,
      title: "Uninstall Git Handler Hook",
      message: "Remove the global git hook from this machine?",
      detail:
        "This unsets git's core.hooksPath globally. Any repo with its own local .git/hooks/pre-commit will go back to using that.",
      checkboxLabel: "Also delete commit history",
      checkboxChecked: false,
    });

    if (result.response !== 1) return { cancelled: true, status: hookManager.getStatus() };

    return { cancelled: false, status: hookManager.performUninstall(undefined, result.checkboxChecked) };
  });

  ipcMain.handle("config:get", () => hookManager.readConfig());

  ipcMain.handle("config:set", (_event, config) => {
    hookManager.writeConfig(undefined, config);
    return { ok: true };
  });

  ipcMain.handle("history:get", (_event, limit) => hookManager.readHistory(undefined, limit));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    title: "Git Handler Hook",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  watchLogs(mainWindow);
}

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "Edit",
      submenu: [{ role: "copy" }, { role: "paste" }, { role: "selectAll" }],
    },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "toggleDevTools" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  registerIpcHandlers();

  if (!hookManager.isInstalled()) {
    try {
      hookManager.performInstall();
    } catch (err) {
      console.error("[git-handler-hook] first-launch install failed:", err);
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (logsWatcher) logsWatcher.close();
  if (process.platform !== "darwin") app.quit();
});
