// miner-loader.js
// Exposes window.minerStart() and window.minerStop() and posts messages about hashrate/status.
// Behavior:
// - If public/miner.wasm exists, it will be fetched and the worker will be started with 'wasm' mode.
// - Otherwise, fallback to JS simulation (worker.js).

let worker = null;

async function startWasmWorker(){
  // try to fetch wasm to check if exists
  try {
    const resp = await fetch('/public/miner.wasm', {method: 'HEAD'});
    if(!resp.ok) throw new Error('no wasm');
    // start worker that can use wasm (we send mode 'wasm' and url)
    worker = new Worker('/public/worker.js');
    worker.postMessage({cmd:'start', mode:'wasm', wasmUrl:'/public/miner.wasm'});
    worker.onmessage = (e) => window.postMessage(e.data, '*');
    return true;
  } catch(e){
    return false;
  }
}

function startJsWorker(){
  worker = new Worker('/public/worker.js');
  worker.postMessage({cmd:'start', mode:'js'});
  worker.onmessage = (e) => window.postMessage(e.data, '*');
}

window.minerStart = async function(){
  const ok = await startWasmWorker();
  if(!ok) startJsWorker();
  window.postMessage({type:'status', msg:'Mining started'}, '*');
};

window.minerStop = function(){
  if(worker){ worker.postMessage({cmd:'stop'}); worker.terminate(); worker = null; }
  window.postMessage({type:'status', msg:'Stopped'}, '*');
};
