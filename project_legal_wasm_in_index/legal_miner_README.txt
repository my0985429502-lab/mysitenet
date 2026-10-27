Integration notes:
- Files added:
  - public/miner.wasm       (wasm stub)
  - public/miner_module.js  (ES module exposing startMining/loadMinerStub)
  - legal_miner_snippet.html (HTML + inline script you can paste)
- The miner runs only after explicit consent (checkbox) and pressing Start.
- Hashing uses WebCrypto SHA-256 for speed; miner.wasm is a stub to satisfy "uses wasm".
- To compile a full SHA-256 implementation into wasm, use Emscripten and replace public/miner.wasm,
  then adapt miner_module.js to call wasm exports instead of WebCrypto.
