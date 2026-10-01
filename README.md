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

First the commitment, with no network: from the trail's base key (`pubkeyBase`, a
full compressed point) and its states, every mark's output key is recomputed —
each tweak added to the point as it is, never its even-y lift, which is how the
trails are made (git-mark: `TapTweak(x(P) || sha256(commit as text))`; the plain
profiles: `TapTweak(x(P) || sha256(JCS(state)))`). The arithmetic is sidestr/spec's
`keys.mjs` on the engine's curve code, both pinned by commit.

Then, for each mark in `trail.txo`:
- the transaction exists on the named chain (via mempool.space),
- its output **is the recomputed key** — the mark commits to its state,
- it is **confirmed** in a block,
- the output amount matches what the trail records,
- it **spends the previous mark** (the chain is unbroken).

Every link is checked, not the head alone: a chain of plain additions commits only
to the sum of its tweaks at the head; the intermediate outputs pin each state.

A green "verified" means: every output is the key its state derives, and that git
snapshot was timestamped on Bitcoin at that block with the mark chain intact. It
proves the history is **committed, timestamped and tamper-evident — not** that the
repo's contents are correct. A trail with no base key, or one the arithmetic cannot
walk, is reported as **confirmed** only, and says why.

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
