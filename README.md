# blocktrails verify

A single-page, zero-build verifier for [blocktrails](https://blocktrails.org) trails.
Point it at any `blocktrails.json` and it fetches the trail and checks every git
mark against the Bitcoin chain it names.

## Use

```
https://blocktrails.github.io/verify/?uri=<URL of a blocktrails.json>
```

e.g. `…/verify/?uri=https://melvin.me/public/worldcup/blocktrails.json`

Or open it and paste a URL. The `uri=` may point at the `blocktrails.json`
itself or at the directory containing it (the app appends `blocktrails.json`).

## What it checks

For each mark in `trail.txo`:
- the transaction exists on the named chain (via mempool.space),
- it is **confirmed** in a block,
- the output amount matches what the trail records,
- it **spends the previous mark** (the chain is unbroken).

A green "verified" means: that git snapshot was timestamped on Bitcoin at that
block and the mark chain is intact. It proves the history is **timestamped and
tamper-evident — not** that the repo's contents are correct.

## Notes

- The target host must allow cross-origin reads (CORS). Solid pods (jss) and
  GitHub Pages do; arbitrary hosts may not.
- Chains: `tbtc4` → testnet4, `tbtc3` → testnet, mainnet → Bitcoin. Testnet
  marks are demonstrations, not mainnet-grade value.
- A future version can add full client-side re-derivation of each taproot
  address from `pubkeyBase` + the commit tweaks (what `git mark verify` does),
  for cryptographic verification rather than chain lookup alone.

## License

AGPL-3.0-or-later.
