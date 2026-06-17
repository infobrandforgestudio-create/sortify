import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import router from "./routes";

export async function startServer(): Promise<number> {
  const app = express();

  app.use(cors({ credentials: true, origin: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", router);

  const rendererPath = path.join(__dirname, "renderer");
  app.use(express.static(rendererPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(rendererPath, "index.html"));
  });

  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      console.log(`[Sortify] Server listening on port ${addr.port}`);
      resolve(addr.port);
    });
  });
}
