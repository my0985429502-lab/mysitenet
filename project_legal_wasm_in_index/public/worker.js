// worker.js - supports 'js' simulation or 'wasm' mode (expects wasm binary with an exported loop function).
// The exact interface for your wasm miner depends on the wasm you use; adapt accordingly.

let running = false;
let mode = 'js';
let wasmInstance = null;

function sha1str(s){
  let h=0;
  for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i))|0; }
  return h>>>0;
}

let hashes = 0;
function workLoop(){
  const start = Date.now();
  while(Date.now() - start < 200){
    if(mode === 'js'){
      sha1str(Math.random().toString(36) + Date.now());
    } else if(mode === 'wasm' && wasmInstance && wasmInstance.exports && wasmInstance.exports.step){
      // call exported step() repeatedly if available
      try { wasmInstance.exports.step(); } catch(e){ /* ignore */ }
    }
    hashes++;
  }
}

function tick(){
  if(!running) return;
  workLoop();
  postMessage({type:'hashrate', h: Math.round(hashes/1)});
  hashes = 0;
  setTimeout(tick, 1000);
}

onmessage = async (e) => {
  const d = e.data;
  if(d.cmd === 'start'){
    mode = d.mode || 'js';
    if(mode === 'wasm' && d.wasmUrl){
      try {
        const resp = await fetch(d.wasmUrl);
        const bytes = await resp.arrayBuffer();
        const results = await WebAssembly.instantiate(bytes, {});
        wasmInstance = results.instance;
      } catch(err){
        // fallback to js
        mode = 'js';
      }
    }
    running = true;
    postMessage({type:'status', msg:'Started ('+mode+')'});
    tick();
  } else if(d.cmd === 'stop'){
    running = false;
    postMessage({type:'status', msg:'Stopped'});
    close();
  }
};
