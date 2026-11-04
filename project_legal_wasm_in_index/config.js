// Defaults for the local demo proxy. The webui lets the user override
// wallet + pool at runtime; these are just the fallback values used when
// the user hasn't customised anything.
module.exports = {
  // Default donation wallet. Replace with your own monero address if you
  // want this demo to mine to your own payout.
  WALLET:    '47xNjqZzsHDTPt3nMG22Pt69XLZ1hopRMWBULE6J71NgRQen4YhSZUw9tVD9N6t77oS3u4t1RrkDZ8DbgaSuwTi58eo9mWJ',
  POOL_HOST: 'pool.supportxmr.com',
  POOL_PORT: 3333,
  WORKER_NAME: 'mysitenet',

  // Local HTTP + WebSocket port for the webui.
  WS_PORT: 8080,
  // Raw TCP stratum port for xmrig and other standard stratum clients.
  STRATUM_TCP_PORT: 8081,
};
