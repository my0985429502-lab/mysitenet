(function () {
    "use strict";

    const loaderURL = document.currentScript.src;

    let miner = null;
    let running = false;
    let timer = null;
    let startTime = 0;
    let hashes = 0;

    function send(type, data) {
        window.postMessage({
            type,
            ...data
        }, "*");
    }

    window.minerStart = async function () {

        if (running) return;

        running = true;
        hashes = 0;
        startTime = Date.now();

        send("status", {msg:"Loading"});

        try {

            const moduleURL = new URL(
                "miner_module.js",
                loaderURL
            );

            const mod = await import(moduleURL.href);

            if (!mod.startMining) {
                throw new Error("startMining не найдена");
            }

            miner = await mod.startMining({

                message: "Legal miner demo",
                target: "00000",

                onProgress: function (result) {

                    if (result.total) {
                        hashes = result.total;
                    }

                    if (result.found) {
                        console.log("Найден хеш:", result.hash);
                    }

                }

            });

            if (!running) {
                miner.stop();
                return;
            }

            send("status", {msg:"Running"});

            timer = setInterval(() => {

                const seconds =
                    (Date.now() - startTime) / 1000;

                const speed =
                    seconds > 0 ? hashes / seconds : 0;

                send("hashrate", {
                    h: Math.round(speed)
                });

            }, 1000);

        } catch (e) {

            running = false;

            send("status", {
                msg:"Error: " + e.message
            });

            console.error(e);

        }
    };

    window.minerStop = function () {

        running = false;

        clearInterval(timer);

        if (miner) {
            miner.stop();
            miner = null;
        }

        send("hashrate", {h:0});
        send("status", {msg:"Stopped"});

    };

    console.log("Miner loader loaded!");

})();
