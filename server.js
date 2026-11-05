const express = require("express");
const path = require("path");

const app = express();
const ROOT = __dirname;

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check for Render
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, site: "mysite" });
});

// Do not expose server/configuration files through the static file server.
app.use((req, res, next) => {
  const blocked = [
    /^\\/(?:server\\.js|package(?:-lock)?\\.json|Dockerfile|render\\.yaml)$/i,
    /^\\/(?:\\.git|node_modules|\\.env)(?:\\/|$)/i
  ];
  if (blocked.some((pattern) => pattern.test(req.path))) {
    return res.sendStatus(404);
  }
  next();
});

// Serve the existing GitHub Pages files from the repository root.
// Keep your existing index.html, CSS, JavaScript, images, and folders.
app.use(express.static(ROOT, {
  index: "index.html",
  dotfiles: "deny",
  etag: true,
  maxAge: "1h"
}));

// Fallback to the existing homepage for the root URL.
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

const PORT = Number(process.env.PORT) || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MYSITENET server listening on port ${PORT}`);
});
