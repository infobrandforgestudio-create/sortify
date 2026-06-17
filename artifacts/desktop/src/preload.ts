import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("sortify", {
  platform: process.platform,
  version: process.env.npm_package_version ?? "1.0.0",
});
