const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json({ limit: '20kb' }));

// SQLite
const DB_FILE = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS payouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        amount REAL,
        status TEXT,
        created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
});

// Не разрешаем скачивать важные файлы
app.use((req, res, next) => {
    const p = req.path;

    if (
        /^\/(server\.js|data\.db|package(-lock)?\.json)$/i.test(p) ||
        /^\/\.env/i.test(p) ||
        p.startsWith('/node_modules/')
    ) {
        return res.sendStatus(404);
    }

    next();
});

// Запрещаем доступ к служебным файлам
app.use((req, res, next) => {
    const blocked = [
        "/server.js",
        "/config.js",
        "/package.json",
        "/package-lock.json",
        "/data.db",
        "/.env"
    ];

    if (blocked.includes(req.path)) {
        return res.status(403).send("Доступ запрещён");
    }

    if (
        req.path.startsWith("/node_modules/") ||
        req.path.startsWith("/.git/")
    ) {
        return res.status(403).send("Доступ запрещён");
    }

    next();
});

// Публичные файлы
app.use(express.static(path.join(__dirname, "public")));

// Главная страница
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Панель администратора
app.get("/admin.html", (req, res) => {
    res.sendFile(path.join(__dirname, "admin.html"));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Проверка администратора через Supabase
async function requireAdmin(req, res, next) {
    try {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;

        if (!url || !key) {
            return res.status(503).json({
                ok: false,
                error: 'Supabase server configuration missing'
            });
        }

        const authorization = req.headers.authorization || '';

        if (!authorization.startsWith('Bearer ')) {
            return res.status(401).json({
                ok: false,
                error: 'Требуется авторизация'
            });
        }

        const token = authorization.substring(7);

        // Проверяем токен
        const userResponse = await fetch(
            url + '/auth/v1/user',
            {
                headers: {
                    apikey: key,
                    Authorization: 'Bearer ' + token
                }
            }
        );

        if (!userResponse.ok) {
            return res.status(401).json({
                ok: false,
                error: 'Недействительная авторизация'
            });
        }

        const user = await userResponse.json();

        // Проверяем пользователя в admin_users
        const adminResponse = await fetch(
            url + '/rest/v1/admin_users?select=user_id&user_id=eq.' +
            encodeURIComponent(user.id) +
            '&limit=1',
            {
                headers: {
                    apikey: key,
                    Authorization: 'Bearer ' + token
                }
            }
        );

        if (!adminResponse.ok) {
            return res.status(403).json({
                ok: false,
                error: 'Не удалось проверить администратора'
            });
        }

        const admins = await adminResponse.json();

        if (!Array.isArray(admins) || admins.length === 0) {
            return res.status(403).json({
                ok: false,
                error: 'Нет прав администратора'
            });
        }

        req.admin = user;
        next();

    } catch (error) {
        console.error('Admin authentication:', error);

        res.status(500).json({
            ok: false,
            error: 'Ошибка проверки администратора'
        });
    }
}

// Сохранение настроек
function setSetting(key, value, callback) {
    db.run(
        'INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)',
        [key, String(value)],
        callback
    );
}

// Получение настроек
function getSettings(callback) {
    db.all(
        'SELECT key,value FROM settings',
        [],
        (err, rows) => {
            if (err) return callback(err, {});

            const result = {};

            rows.forEach(row => {
                result[row.key] = row.value;
            });

            callback(null, result);
        }
    );
}

// Заявка на вывод
app.post('/api/request-jackpot', (req, res) => {
    const userId = String(
        req.body.userId || ('anon-' + uuidv4())
    ).slice(0, 100);

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            ok: false,
            error: 'Некорректная сумма'
        });
    }

    const created_at = new Date().toISOString();

    db.run(
        `INSERT INTO payouts
        (user_id,amount,status,created_at)
        VALUES(?,?,?,?)`,
        [userId, amount, 'requested', created_at],
        function(err) {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    error: err.message
                });
            }

            res.json({
                ok: true,
                id: this.lastID
            });
        }
    );
});

// Заявки — только администратору
app.get('/api/requests', requireAdmin, (req, res) => {
    db.all(
        `SELECT id,user_id AS userId,amount,status,created_at
         FROM payouts ORDER BY id DESC LIMIT 1000`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    error: err.message
                });
            }

            res.json({
                ok: true,
                payouts: rows
            });
        }
    );
});

// Изменение настроек — только администратору
app.post('/api/admin/settings', requireAdmin, (req, res) => {
    const body = req.body || {};

    if (
        typeof body !== 'object' ||
        Array.isArray(body)
    ) {
        return res.status(400).json({
            ok: false,
            error: 'Invalid body'
        });
    }

    const entries = Object.entries(body);

    if (entries.length > 50) {
        return res.status(400).json({
            ok: false,
            error: 'Too many settings'
        });
    }

    db.serialize(() => {
        let completed = 0;
        let failed = false;

        if (entries.length === 0) {
            return res.json({ ok: true });
        }

        entries.forEach(([key, value]) => {
            if (
                !/^[a-zA-Z0-9_-]{1,100}$/.test(key) ||
                typeof value === 'object'
            ) {
                failed = true;
                return;
            }

            setSetting(key, value, err => {
                if (err) failed = true;

                completed++;

                if (completed === entries.length) {
                    res.status(failed ? 500 : 200).json({
                        ok: !failed,
                        error: failed ? 'Ошибка сохранения настроек' : undefined
                    });
                }
            });
        });

        if (failed && completed === entries.length) {
            res.status(400).json({
                ok: false,
                error: 'Некорректные настройки'
            });
        }
    });
});

// Чтение настроек
app.get('/api/settings', (req, res) => {
    getSettings((err, settings) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                error: err.message
            });
        }

        res.json({
            ok: true,
            settings
        });
    });
});

// Проверка состояния сервера
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        server: 'online',
        algorithm: 'RandomX',
        mining: 'not connected'
    });
});

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
    console.log('Server listening on', port);
});
