import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Use a fixed port for consistent restarts (tsx watch restarts the process)
  const port = parseInt(process.env.PORT || "3001", 10);

  await new Promise<void>((resolve, reject) => {
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
      resolve();
    });
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port in use, try one fallback port
        const nextPort = port + 1;
        server.listen(nextPort, () => {
          console.log(`Server running on http://localhost:${nextPort}/ (fallback)`);
          resolve();
        }).once('error', (err2: NodeJS.ErrnoException) => {
          if (err2.code === 'EADDRINUSE') {
            console.error(`Ports ${port} and ${nextPort} are in use. Please free a port.`);
            process.exit(1);
          } else {
            reject(err2);
          }
        });
      } else {
        reject(err);
      }
    });
  });
}

startServer().catch(console.error);
