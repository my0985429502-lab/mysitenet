// НАСТРОЙКИ SUPABASE
const SUPABASE_URL = "https://blmpavrvdesudcvqjhlz.supabase.co";
const SUPABASE_KEY = "sb_publishable_y0w8frnME_NmWfavG7byJg_0zkeZ0vN";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ОБЩИЕ ФУНКЦИИ
function showMessage(id, text, isError = false) {
    const el = document.getElementById(id);
    if (!el) return;

    el.textContent = text;
    el.style.color = isError ? "#ff6b6b" : "#22c55e";
}

function safeHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

// ==========================================
// 1. ОТПРАВКА РЕКЛАМНОЙ ЗАЯВКИ
// ==========================================

const adForm = document.getElementById("adForm");

if (adForm) {
    adForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        showMessage("message", "Отправка заявки...");

        let uploadedPath = null;

        try {
            const company = document.getElementById("company").value.trim();
            const title = document.getElementById("title").value.trim();
            const target_url = document.getElementById("url").value.trim();
            const description = document.getElementById("description").value.trim();
            const file = document.getElementById("banner").files[0];

            if (!company || !title || !target_url) {
                throw new Error("Заполни обязательные поля.");
            }

            if (!safeHttpUrl(target_url)) {
                throw new Error("Неправильная ссылка.");
            }

            if (!file) {
                throw new Error("Выбери изображение.");
            }

            if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
                throw new Error("Разрешены JPG, PNG, GIF и WEBP.");
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Максимальный размер файла 5 МБ.");
            }

            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

            uploadedPath =
                Date.now() + "_" +
                Math.random().toString(36).slice(2) +
                "_" + cleanName;

            // ЗАГРУЗКА БАННЕРА
            const uploadResult = await db.storage
                .from("ads-banners")
                .upload(uploadedPath, file);

            if (uploadResult.error) {
                throw uploadResult.error;
            }

            // СОХРАНЕНИЕ ЗАЯВКИ
            const insertResult = await db
                .from("ads")
                .insert([{
                    company: company,
                    title: title,
                    target_url: target_url,
                    description: description,
                    image_path: uploadedPath,
                    status: "pending"
                }]);

            if (insertResult.error) {
                throw insertResult.error;
            }

            showMessage(
                "message",
                "Заявка отправлена! Ожидайте модерации."
            );

            adForm.reset();
            uploadedPath = null;

        } catch (error) {
            console.error(error);

            if (uploadedPath) {
                await db.storage
                    .from("ads-banners")
                    .remove([uploadedPath]);
            }

            showMessage(
                "message",
                "Ошибка: " + error.message,
                true
            );
        }
    });
}

// ==========================================
// 2. ПРОВЕРКА АДМИНИСТРАТОРА
// ==========================================

async function isCurrentUserAdmin() {
    const { data, error } = await db.rpc("is_ad_admin");

    if (error) throw error;

    return data === true;
}

function setAdminView(isAdmin) {
    const loginBox = document.getElementById("loginBox");
    const adminPanel = document.getElementById("adminPanel");

    if (loginBox) loginBox.hidden = isAdmin;
    if (adminPanel) adminPanel.hidden = !isAdmin;
}

// ==========================================
// 3. КНОПКИ АДМИНКИ
// ==========================================

function makeAdminButton(label, action) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action);

    return button;
}

// ==========================================
// 4. ЗАГРУЗКА ВСЕХ ЗАЯВОК
// ==========================================

async function loadAdminAds() {
    const adminAds = document.getElementById("adminAds");

    if (!adminAds) return;

    adminAds.textContent = "Загрузка заявок...";

    try {
        const { data, error } = await db
            .from("ads")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        adminAds.replaceChildren();

        if (!data || data.length === 0) {
            adminAds.textContent = "Заявок пока нет.";
            return;
        }

        data.forEach(function(ad) {
            const card = document.createElement("section");

            card.className = "ad-card";

            const heading = document.createElement("h3");
            heading.textContent = ad.title || "Без названия";

            const company = document.createElement("p");
            company.textContent = "Компания: " + (ad.company || "—");

            const description = document.createElement("p");
            description.textContent = ad.description || "";

            const status = document.createElement("p");
            status.textContent = "Статус: " + ad.status;

            const link = document.createElement("a");
            link.textContent = "Открыть сайт";

            link.href = safeHttpUrl(ad.target_url || "")
                ? ad.target_url
                : "#";

            link.target = "_blank";
            link.rel = "noopener noreferrer";

            card.append(
                heading,
                company,
                description,
                status,
                link
            );

            // ИЗОБРАЖЕНИЕ
            if (ad.image_path) {
                const { data: imageData } = db.storage
                    .from("ads-banners")
                    .getPublicUrl(ad.image_path);

                if (imageData && imageData.publicUrl) {
                    const image = document.createElement("img");

                    image.src = imageData.publicUrl;
                    image.alt = "Рекламный баннер";
                    image.style.maxWidth = "240px";
                    image.style.maxHeight = "160px";
                    image.style.display = "block";

                    card.appendChild(image);
                }
            }

            // ОДОБРЕНИЕ
            if (ad.status !== "approved") {
                card.appendChild(
                    makeAdminButton(
                        "Одобрить",
                        () => updateAdStatus(ad.id, "approved")
                    )
                );
            }

            // ОТКЛОНЕНИЕ
            if (ad.status !== "rejected") {
                card.appendChild(
                    makeAdminButton(
                        "Отклонить",
                        () => updateAdStatus(ad.id, "rejected")
                    )
                );
            }

            // УДАЛЕНИЕ
            card.appendChild(
                makeAdminButton(
                    "Удалить",
                    () => deleteAd(ad.id, ad.image_path)
                )
            );

            card.style.padding = "16px";
            card.style.margin = "12px 0";
            card.style.border = "1px solid #64748b";
            card.style.borderRadius = "12px";

            adminAds.appendChild(card);
        });

    } catch (error) {
        console.error(error);

        adminAds.textContent =
            "Ошибка загрузки заявок: " + error.message;
    }
}

// ==========================================
// 5. ОДОБРЕНИЕ И ОТКЛОНЕНИЕ
// ==========================================

async function updateAdStatus(id, status) {
    try {
        const { error } = await db
            .from("ads")
            .update({ status: status })
            .eq("id", id);

        if (error) throw error;

        showMessage(
            "adminMessage",
            "Статус изменён: " + status
        );

        await loadAdminAds();

    } catch (error) {
        console.error(error);

        showMessage(
            "adminMessage",
            "Ошибка: " + error.message,
            true
        );
    }
}

// ==========================================
// 6. УДАЛЕНИЕ ЗАЯВКИ И БАННЕРА
// ==========================================

async function deleteAd(id, imagePath) {
    if (!confirm("Удалить рекламную заявку?")) {
        return;
    }

    try {
        const { error } = await db
            .from("ads")
            .delete()
            .eq("id", id);

        if (error) throw error;

        if (imagePath) {
            const result = await db.storage
                .from("ads-banners")
                .remove([imagePath]);

            if (result.error) {
                console.warn(result.error);
            }
        }

        showMessage("adminMessage", "Заявка удалена.");

        await loadAdminAds();

    } catch (error) {
        console.error(error);

        showMessage(
            "adminMessage",
            "Ошибка удаления: " + error.message,
            true
        );
    }
}

// ==========================================
// 7. ВХОД АДМИНИСТРАТОРА
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        showMessage("adminMessage", "Проверка входа...");

        try {
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            const { error } = await db.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            const allowed = await isCurrentUserAdmin();

            if (!allowed) {
                await db.auth.signOut();
                setAdminView(false);

                throw new Error(
                    "Пользователь не добавлен в admin_users."
                );
            }

            setAdminView(true);

            showMessage("adminMessage", "Вход выполнен!");

            await loadAdminAds();

        } catch (error) {
            console.error(error);

            showMessage(
                "adminMessage",
                "Ошибка входа: " + error.message,
                true
            );
        }
    });
}

// ==========================================
// 8. ОБНОВИТЬ ЗАЯВКИ
// ==========================================

const refreshButton = document.getElementById("refreshAds");

if (refreshButton) {
    refreshButton.addEventListener("click", loadAdminAds);
}

// ==========================================
// 9. ВЫХОД
// ==========================================

const logoutButton = document.getElementById("logout");

if (logoutButton) {
    logoutButton.addEventListener("click", async function() {
        await db.auth.signOut();

        setAdminView(false);

        showMessage(
            "adminMessage",
            "Вы вышли из админ-панели."
        );
    });
}

// ==========================================
// 10. ВОССТАНОВЛЕНИЕ СЕССИИ
// ==========================================

if (loginForm) {
    (async function() {
        try {
            const { data } = await db.auth.getSession();

            if (data.session) {
                const allowed = await isCurrentUserAdmin();

                if (allowed) {
                    setAdminView(true);
                    await loadAdminAds();
                } else {
                    await db.auth.signOut();
                    setAdminView(false);
                }
            }

        } catch (error) {
            console.error(error);

            setAdminView(false);

            showMessage(
                "adminMessage",
                "Ошибка проверки: " + error.message,
                true
            );
        }
    })();
}

// ==========================================
// 11. ПУБЛИЧНЫЙ ПОКАЗ ОДОБРЕННОЙ РЕКЛАМЫ
// ==========================================

const publicAds = document.getElementById("publicAds");

if (publicAds) {
    (async function() {
        publicAds.textContent = "Загрузка рекламы...";

        try {
            const { data, error } = await db
                .from("ads")
                .select("id, company, title, target_url, description, image_path")
                .eq("status", "approved")
                .order("created_at", { ascending: false });

            if (error) throw error;

            publicAds.replaceChildren();

            if (!data || data.length === 0) {
                publicAds.textContent = "Пока нет одобренной рекламы.";
                return;
            }

            data.forEach(function(ad) {
                const card = document.createElement("div");
                card.className = "ad-card";

                const title = document.createElement("h3");
                title.textContent = ad.title || "Реклама";

                const company = document.createElement("p");
                company.textContent = ad.company || "";

                const description = document.createElement("p");
                description.textContent = ad.description || "";

                card.append(title, company, description);

                const { data: imageData } = db.storage
                    .from("ads-banners")
                    .getPublicUrl(ad.image_path);

                if (imageData && imageData.publicUrl) {
                    const image = document.createElement("img");

                    image.src = imageData.publicUrl;
                    image.alt = ad.title || "Рекламный баннер";
                    image.style.maxWidth = "100%";

                    card.appendChild(image);
                }

                if (safeHttpUrl(ad.target_url || "")) {
                    const link = document.createElement("a");

                    link.href = ad.target_url;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = "Перейти на сайт";

                    card.appendChild(link);
                }

                publicAds.appendChild(card);
            });

        } catch (error) {
            console.error(error);

            publicAds.textContent =
                "Ошибка загрузки рекламы: " + error.message;
        }
    })();
}