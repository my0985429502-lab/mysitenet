(function () {
    "use strict";

    let miner = null;
    let running = false;
    let loading = false;
    let cancelStart = false;

    let lastTotal = 0;
    let lastTime = 0;

    function send(type, data) {
        window.postMessage({
            type: type,
            ...data
        }, "*");
    }

    function status(msg) {
        send("status", {msg});
    }

    function updateHashrate(value) {
        send("hashrate", {
            h: Math.round(Number(value) || 0)
        });
    }

    // ЗАПУСК
    window.minerStart = async function () {

        if (running || loading) return;

        loading = true;
        cancelStart = false;

        status("Loading");
        updateHashrate(0);

        try {

            // Загружаем настоящий JS-модуль
            const module = await import(
                "/public/miner_module.js"
            );

            if (cancelStart) {
                loading = false;
                return;
            }

            if (typeof module.startMining !== "function") {
                throw new Error(
                    "Функция startMining не найдена"
                );
            }

            lastTotal = 0;
            lastTime = Date.now();

            const controller = await module.startMining({

                message: "Casino Miner Demo",

                target: "00000",

                onProgress: function (data) {

                    if (cancelStart) return;

                    if (data.total !== undefined) {

                        const now = Date.now();

                        if (now - lastTime >= 1000) {

                            const elapsed =
                                (now - lastTime) / 1000;

                            const rate =
                                (data.total - lastTotal) / elapsed;

                            updateHashrate(rate);

                            lastTotal = data.total;
                            lastTime = now;
                        }
                    }

                    if (data.found) {

                        status("Hash found!");

                        console.log(
                            "Найден хеш:",
                            data.hash
                        );

                    }

                }

            });

            if (cancelStart) {

                controller.stop();

                loading = false;

                return;
            }

            miner = controller;

            running = true;
            loading = false;

            status("Running");

        } catch (error) {

            console.error("Miner error:", error);

            running = false;
            loading = false;
            miner = null;

            updateHashrate(0);

            status("Error: " + error.message);

            throw error;
        }

    };


    // ОСТАНОВКА
    window.minerStop = function () {

        cancelStart = true;

        if (miner) {

            try {
                miner.stop();
            } catch (error) {
                console.error(error);
            }

        }

        miner = null;

        running = false;
        loading = false;

        updateHashrate(0);

        status("Stopped");

    };

})();
