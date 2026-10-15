# blocktrails verify

A single-page, zero-build verifier for [blocktrails](https://blocktrails.org) trails.
Point it at any `blocktrails.json` and it fetches the trail and checks every git
mark against the Bitcoin chain it names.

## Use

```
https://blocktrails.github.io/verify/?uri=<URL of a blocktrails.json>
```

e.g. `…/verify/?uri=https://melvin.me/public/worldcup/blocktrails.json`

Or open it and paste a URL, or paste the trail's JSON itself. The `uri=` may point at
the `blocktrails.json`, at the directory containing it (the app appends `blocktrails.json`),
or at a path on this site such as `examples/datawiki.json`.

## Chains

A trail names its chain by the `txo:` scheme's ids, as [bitcoin-kernel.com/utxo](https://bitcoin-kernel.com/utxo/)
uses them: `btc`, `tbtc4`, `xbt` (Bitcoin BLAKE2b) and `txbt4` (Bitcoin BLAKE2b testnet4), plus `tbtc3`.
Older spellings (`mainnet`, `bitcoin`, `tbtc`, `txbt`) are accepted. The table of chains and the
explorers tried for each is `chains.js`, shared by both pages.

## Marks by name and by value

Each entry of `trail.txo` is either a **name**, the `txo:` URI as a string, or a **value**, an
object with the URI as `@id` (or `uri`), the transaction's bytes as `hex`, and optionally the block
it sits in as `block: { hash, height }`:

```json
{ "@id": "txo:txbt4:c16fa17f…:1?amount=10000&pubkey=…&commit=bc48590…",
  "hex": "02000000000101…",
  "block": { "hash": "000000005addb5b5…", "height": 153040 } }
```

A mark by name is fetched from the chain's explorer. A mark by value is decoded here with
bitcoin-kernel's codec: the bytes must hash to the txid named, the output must be the recomputed
key, the amount must match, and the input must spend the previous mark, all with no network. What
a value cannot carry is the present: whether the mark is confirmed, and still the head. So the
chain is still asked, when it answers, and the mark reads "verified by value" with its block "as
given" when it does not. A trail by value is what a chain without a browser-readable explorer
needs, and what a fraud proof has to carry.

The value can also ride inside the name, so one string is a complete mark: the `txo:` URI's
query takes `hex=<bytes>` and `block=<height>:<hash>` beside `amount`, `pubkey` and `commit`.
Without its query it is still the name. And a whole trail can ride inside the verifier's link,
`?trail=<the JSON, URL-encoded>` (or `?uri=data:application/json,…`), so one link carries the
proof and nothing is fetched.

The same trail, the datawiki genesis on `txbt4`, in the three shapes:
- `examples/datawiki.json`: the mark as an object, bytes and block beside the URI;
- `examples/datawiki-uri.json`: the mark as one `txo:` URI, bytes and block in its query (705 characters);
- `examples/datawiki-link.txt`: the whole trail in one verifier link (1,168 characters).

## What it checks

First the commitment, with no network: from the trail's base key (`pubkeyBase`, a
full compressed point) and its states, every mark's output key is recomputed —
each tweak added to the point as it is, never its even-y lift, which is how the
trails are made (git-mark: `TapTweak(x(P) || sha256(commit as text))`; the plain
profiles: `TapTweak(x(P) || sha256(state))`, a string state as its UTF-8 text and an
object state as its JCS, as the reference implementation hashes them). The arithmetic is sidestr/spec's
`keys.mjs` on the engine's curve code, both pinned by commit.

Then, for each mark in `trail.txo`:
- the transaction exists on the named chain (fetched from its explorer, or decoded from the bytes the trail carries),
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
- The re-derivation needs the two pinned libraries from the CDN; if they cannot
  be loaded, the page says the commitments were not checked and reports
  confirmation only.

## License

AGPL-3.0-or-later.
