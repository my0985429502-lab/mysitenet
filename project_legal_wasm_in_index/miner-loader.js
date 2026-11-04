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
            type,
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

    window.minerStart = async function () {

        if (running || loading) return;

        loading = true;
        cancelStart = false;

        status("Loading");
        updateHashrate(0);

        try {

            const module = await import(
                "/public/miner_module.js"
            );

            if (cancelStart) return;

            if (typeof module.startMining !== "function") {
                throw new Error("startMining не найдена");
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
                        status("Hash found");
                        console.log("Hash:", data.hash);
                    }
                }
            });

            if (cancelStart) {
                controller.stop();
                return;
            }

            miner = controller;
            running = true;

            status("Running");

        } catch (error) {

            console.error(error);

            running = false;
            miner = null;

            status("Error: " + error.message);
            updateHashrate(0);

            throw error;

        } finally {

            loading = false;

        }
    };

    window.minerStop = function () {

        cancelStart = true;

        if (miner) {
            miner.stop();
        }

        miner = null;
        running = false;

        updateHashrate(0);
        status("Stopped");
    };

})();
