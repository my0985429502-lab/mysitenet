(function () {
    "use strict";

    let miner = null;
    let running = false;
    let timer = null;
    let hashrate = 0;

    function send(type, data) {
        window.postMessage({
            type: type,
            ...data
        }, "*");
    }

    function status(message) {
        send("status", { msg: message });
    }

    function updateHashrate(value) {
        hashrate = Number(value) || 0;
        send("hashrate", { h: hashrate });
    }

    // Запуск майнера
    window.minerStart = async function () {

        if (running) return;

        running = true;
        status("Loading");

        try {

            // Загружаем модуль майнера
            const response = await fetch("/public/miner_module.js");

            if (!response.ok) {
                throw new Error("miner_module.js не найден");
            }

            const source = await response.text();

            const blob = new Blob(
                [source],
                { type: "text/javascript" }
            );

            const moduleURL = URL.createObjectURL(blob);

            miner = await import(moduleURL);

            URL.revokeObjectURL(moduleURL);

            if (typeof miner.startMiner !== "function") {
                throw new Error(
                    "В модуле отсутствует функция startMiner"
                );
            }

            // Загружаем WASM
            const wasmResponse = await fetch("/public/miner.wasm");

            if (!wasmResponse.ok) {
                throw new Error("miner.wasm не найден");
            }

            const wasmBytes = await wasmResponse.arrayBuffer();

            // Запускаем модуль
            await miner.startMiner({
                wasm: wasmBytes,

                onHashrate: function (value) {
                    updateHashrate(value);
                }
            });

            status("Running");

        } catch (error) {

            console.error("Miner error:", error);

            running = false;

            status("Error: " + error.message);

            updateHashrate(0);

        }

    };

    // Остановка майнера
    window.minerStop = function () {

        if (!running) return;

        running = false;

        try {

            if (miner &&
                typeof miner.stopMiner === "function") {

                miner.stopMiner();

            }

        } catch (error) {

            console.error(error);

        }

        miner = null;

        updateHashrate(0);

        status("Stopped");

    };

})();