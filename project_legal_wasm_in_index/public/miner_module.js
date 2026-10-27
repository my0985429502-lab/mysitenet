// miner_module.js - Consent-first SHA-256 miner module.
// Intended to be placed as public/miner_module.js and used by the site's frontend.
// It loads public/miner.wasm (stub) and runs SHA-256 hashing via WebCrypto after explicit consent.
export async function loadMinerStub() {
  try {
    const resp = await fetch('/public/miner.wasm');
    const bytes = await resp.arrayBuffer();
    await WebAssembly.instantiate(bytes, {});
    console.log('WASM stub loaded.');
  } catch (e) {
    console.warn('WASM stub failed to load:', e);
  }
}

export async function startMining({message='Legal miner demo', target='00000', onProgress}) {
  await loadMinerStub();
  let stopFlag = false;
  let totalHashes = 0;
  const enc = new TextEncoder();
  const messageBytes = enc.encode(message);

  function toHex(bytes) {
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function concatUint8(a,b){ const out=new Uint8Array(a.length+b.length); out.set(a,0); out.set(b,a.length); return out; }
  function randomNonceBytes(){ const arr=new Uint8Array(8); crypto.getRandomValues(arr); return arr; }

  async function sha256(data){ const hash = await crypto.subtle.digest('SHA-256', data); return new Uint8Array(hash); }

  // miner loop (non-blocking)
  (async ()=>{
    const batch = 1000;
    while(!stopFlag){
      for(let i=0;i<batch;i++){
        const nonce = randomNonceBytes();
        const data = concatUint8(messageBytes, nonce);
        const h = await sha256(data);
        totalHashes++;
        if(onProgress) onProgress({hash: toHex(h), nonce, total: totalHashes});
        if(toHex(h).startsWith(target)){
          if(onProgress) onProgress({found: true, nonceHex: toHex(nonce), hash: toHex(h)});
          stopFlag = true;
          break;
        }
      }
      await new Promise(r=>setTimeout(r,0));
    }
  })();

  return {
    stop(){ stopFlag = true; },
    getTotalHashes(){ return totalHashes; }
  };
}
