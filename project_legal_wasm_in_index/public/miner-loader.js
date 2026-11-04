(function () {
    "use strict";

    let minerInstance = null;
    let running = false;
    let startTime = 0;
    let lastHashes = 0;
    let reportTimer = null;

    function send(type, data) {
        window.postMessage({
            type: type,
            ...data
        }, "*");
    }

    function setStatus(msg) {
        send("status", { msg: msg });
    }

    function setHashrate(value) {
        send("hashrate", { h: Math.round(value) });
    }

    // ЗАПУСК
    window.minerStart = async function () {

        if (running) return;

        running = true;
        startTime = Date.now();
        lastHashes = 0;

        setStatus("Loading");

        try {

            // Загружаем твой модуль
            const minerModule = await import(
                "/public/miner_module.js"
            );

            // Проверяем правильное имя функции
            if (typeof minerModule.startMining !== "function") {
                throw new Error(
                    "Функция startMining не найдена"
                );
            }

            setStatus("Running");

            // Запускаем майнинг
            minerInstance = await minerModule.startMining({

                message: "Legal miner demo",

                target: "00000",

                onProgress: function (result) {

                    if (!running) return;

                    if (result.total) {
                        lastHashes = result.total;
                    }

                    if (result.found) {
                        console.log(
                            "Найден результат:",
                            result.hash,
                            result.nonceHex
                        );
                    }

                }

            });

            // Обновление скорости каждую секунду
            reportTimer = setInterval(function () {

                if (!running) return;

                const seconds =
                    (Date.now() - startTime) / 1000;

                const speed = seconds > 0
                    ? lastHashes / seconds
                    : 0;

                setHashrate(speed);

            }, 1000);

        } catch (error) {

            console.error("Miner error:", error);

            running = false;

            setStatus("Error: " + error.message);

            setHashrate(0);

        }

    };


    // ОСТАНОВКА
    window.minerStop = function () {

        if (!running) return;

        running = false;

        if (reportTimer) {
            clearInterval(reportTimer);
            reportTimer = null;
        }

        if (minerInstance &&
            typeof minerInstance.stop === "function") {

            minerInstance.stop();

        }

        minerInstance = null;

        setHashrate(0);

        setStatus("Stopped");

    };


    console.log("Miner loader loaded successfully");

})();
