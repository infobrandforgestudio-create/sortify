import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { mkdirSync } from "fs";
import { startServer } from "./server/app";

let mainWindow: BrowserWindow | null = null;

async function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Sortify",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const userData = app.getPath("userData");
  mkdirSync(userData, { recursive: true });

  process.env.DB_PATH = path.join(userData, "sortify.db");

  try {
    const port = await startServer();
    await createWindow(port);
  } catch (err) {
    console.error("[Sortify] Failed to start server:", err);
    app.quit();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        const port = await startServer();
        await createWindow(port);
      } catch (err) {
        console.error("[Sortify] Failed to start server on activate:", err);
      }
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
