const express = require("express");
const path = require("path");

const app = express();
const ROOT = __dirname;

app.disable("x-powered-by");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Проверка работы сервера Render
app.get("/health", (req, res) => {
    res.json({
        ok: true,
        site: "mysite"
    });
});

// Защита служебных файлов
const blockedFiles = new Set([
    "/server.js",
    "/package.json",
    "/package-lock.json",
    "/dockerfile",
    "/render.yaml",
    "/.env"
]);

app.use((req, res, next) => {
    if (blockedFiles.has(req.path.toLowerCase())) {
        return res.sendStatus(404);
    }
    next();
});

// Запуск существующего сайта
app.use(express.static(ROOT, {
    index: "index.html",
    dotfiles: "deny",
    etag: true,
    maxAge: "1h"
}));

app.get("/", (req, res) => {
    res.sendFile(path.join(ROOT, "index.html"));
});

// Порт Render
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("MYSITENET запущен на порту " + PORT);
});
