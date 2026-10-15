// The chains a trail can name, by the txo: scheme's ids (https://bitcoin-kernel.com/utxo/): btc, tbtc4, xbt, txbt4.
// Older spellings are aliases. Each chain lists the explorer APIs tried in order for a mark given by name.
const CHAINS = {
  btc:   { api: ['https://mempool.space/api'],          explorer: 'https://mempool.space/tx/',          testnet: false },
  tbtc4: { api: ['https://mempool.space/testnet4/api'], explorer: 'https://mempool.space/testnet4/tx/', testnet: true },
  tbtc3: { api: ['https://mempool.space/testnet/api'],  explorer: 'https://mempool.space/testnet/tx/',  testnet: true },
  xbt:   { api: ['https://mempool.kilombino.com/api'],  explorer: 'https://mempool.kilombino.com/tx/',  testnet: false },
  txbt4: { api: ['https://mempool.guide/testnet4/api', 'https://mempool.kilombino.com/testnet4/api'], explorer: 'https://mempool.guide/testnet4/tx/', testnet: true },
};
const ALIAS = { mainnet: 'btc', bitcoin: 'btc', tbtc: 'tbtc3', txbt: 'txbt4' };
const canon = (c) => ALIAS[c] || c;
const explorer = (chain, txid) => (CHAINS[canon(chain)] || CHAINS.btc).explorer + txid;
// GET a path from the chain's explorers in turn; the last error is thrown when none answers
async function apiGet(chain, path) {
  const C = CHAINS[canon(chain)]; if (!C) throw new Error('unknown chain ' + chain + '; known: ' + Object.keys(CHAINS).join(', '));
  let last;
  for (const base of C.api) {
    try {
      const r = await fetch(base + path);
      if (r.status === 404) throw new Error('not found on ' + new URL(base).host);
      if (!r.ok) throw new Error(r.status + ' from ' + new URL(base).host);
      return await r.json();
    } catch (e) { last = e; }
  }
  throw last;
}
