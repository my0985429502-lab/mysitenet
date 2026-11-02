// Настройки Supabase
const SUPABASE_URL = "https://blmpavrvdesudcvqjhlz.supabase.co";
const SUPABASE_KEY = "sb_publishable_y0w8frnME_NmWfavG7byJg_0zkeZ0vN";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Отправка рекламной заявки
const form = document.getElementById("adForm");

if (form) {
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const message = document.getElementById("message");
        message.textContent = "Отправка заявки...";

        try {
            const company = document.getElementById("company").value.trim();
            const title = document.getElementById("title").value.trim();
            const target_url = document.getElementById("url").value.trim();
            const description = document.getElementById("description").value.trim();
            const file = document.getElementById("banner").files[0];

            if (!file) {
                throw new Error("Выбери изображение баннера.");
            }

            if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
                throw new Error("Разрешены JPG, PNG, GIF и WEBP.");
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Размер баннера не должен превышать 5 МБ.");
            }

            const fileName = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const imagePath = fileName;

            const upload = await db.storage
                .from("ads-banners")
                .upload(imagePath, file);

            if (upload.error) throw upload.error;

            const { error } = await db
                .from("ads")
                .insert([{
                    company: company,
                    title: title,
                    target_url: target_url,
                    description: description,
                    image_path: imagePath,
                    status: "pending"
                }]);

            if (error) {
                await db.storage.from("ads-banners").remove([imagePath]);
                throw error;
            }

            message.textContent = "Заявка успешно отправлена на модерацию!";
            form.reset();

        } catch (error) {
            console.error(error);
            message.textContent = "Ошибка: " + error.message;
        }
    });
}
