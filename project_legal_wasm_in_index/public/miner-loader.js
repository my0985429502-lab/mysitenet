(function () {
"use strict";

const loaderURL = document.currentScript.src;

let miner = null;
let running = false;
let timer = null;
let lastHashes = 0;

function send(type, data) {
    window.postMessage({
        type,
        ...data
    }, location.origin);
}

window.minerStart = async function () {

    if (running) return;

    running = true;
    lastHashes = 0;

    send("status", { msg: "Loading" });
    send("hashrate", { h: 0 });

    try {

        const moduleURL = new URL(
            "miner_module.js",
            loaderURL
        );

        const mod = await import(moduleURL.href);

        if (typeof mod.startMining !== "function") {
            throw new Error("Функция startMining не найдена");
        }

        miner = await mod.startMining({

            message: "Legal miner demo",
            target: "00000",

            onProgress: function (result) {

                if (Number.isFinite(result.total)) {
                    lastHashes = result.total;
                }

                if (result.found) {
                    console.log("Найден хеш:", result.hash);
                }

            }

        });

        if (!running) {
            if (miner) miner.stop();
            return;
        }

        send("status", { msg: "Running" });

        timer = setInterval(function () {

            if (!running || !miner) return;

            const current = miner.getTotalHashes
                ? miner.getTotalHashes()
                : lastHashes;

            const speed = current - lastHashes;

            lastHashes = current;

            send("hashrate", {
                h: Math.max(0, Math.round(speed))
            });

        }, 1000);

    } catch (error) {

        running = false;

        clearInterval(timer);

        send("status", {
            msg: "Error: " + error.message
        });

        send("hashrate", { h: 0 });

        console.error("Miner error:", error);

    }

};

window.minerStop = function () {

    running = false;

    clearInterval(timer);
    timer = null;

    if (miner) {
        miner.stop();
        miner = null;
    }

    send("hashrate", { h: 0 });
    send("status", { msg: "Stopped" });

};

console.log("Miner loader loaded!");

})();
