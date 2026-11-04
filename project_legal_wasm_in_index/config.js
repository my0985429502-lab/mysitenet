// Defaults for the local demo proxy. The webui lets the user override
// wallet + pool at runtime; these are just the fallback values used when
// the user hasn't customised anything.
module.exports = {
  // Default donation wallet. Replace with your own monero address if you
  // want this demo to mine to your own payout.
  WALLET:    '42SatWxpVwXjndN4o1vNu31Xo1fDjKHxUYLYG6gkQFa8X7pZrVGWYrSV28fmsy6ZWifmd18jNM2g26NFVPty6ybaLv5aXc6',
  POOL_HOST: 'pool.supportxmr.com',
  POOL_PORT: 3333,
  WORKER_NAME: 'mysitenet',

  // Local HTTP + WebSocket port for the webui.
  WS_PORT: 8080,
  // Raw TCP stratum port for xmrig and other standard stratum clients.
  STRATUM_TCP_PORT: 8081,
};
