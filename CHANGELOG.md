# Changelog

## v1.1.0 — 2026-09-11

**Dice rolls with a word count now match hardware wallets.**

When dice are entered and a word count (12 to 24 words) is chosen, the rolls are now SHA-256 hashed exactly as typed (digits 1 to 6). This is the convention of hardware wallets that accept dice, confirmed on a Krux device and against myseedphrase.app. Before this release, KeyPath hashed the rolls with every 6 rewritten as 0, a behavior inherited from Ian Coleman's BIP39 tool, so any roll string containing a 6 produced a phrase no wallet would reproduce.

Example, 76 rolls `5455166441346642362333165523212234151363253263223232553225134324163321663414`, 12 words:

- now: `youth spot place private target office ice spike brave ginger improve shy` (same as a hardware wallet)
- before: `rent chase subway they force exact hungry seed powder rice quiz spend`

**If you made a phrase from dice with a word count in an earlier KeyPath (or in Coleman's tool):** the phrase you wrote down still works and has not changed. Only re-deriving it from the rolls gives different words now. To reproduce the old result, type the rolls with every 6 written as 0; KeyPath detects that as base 6 and hashes it the old way.

Not changed:

- Raw entropy mode (the default) is exactly as before: Coleman's unbiased base-6 conversion with no hash.
- Binary, base 6, base 10, hex and card inputs are unchanged.

Also in this release:

- A note appears when dice are entered in raw mode, pointing dice rollers who want a wallet-compatible phrase to choose a word count.
- The "Filtered entropy" row shows the rolls as typed when a word count is chosen (what is hashed), and the 6-as-0 form in raw mode (what is converted).
- The tooltip and the About entropy notes explain the convention and the one deliberate difference from Coleman's tool.
- Entropy handling moved to `src/entropy.js`, and `npm test` now runs 104 vectors: dice (before and after), Coleman encodings, BIP32/44/49/84/86, and all official SLIP-39 vectors.

## v1.0.1 — 2026-09-11

- About entropy and Security sections are collapsible.
- Donate link in the footer.

## v1.0.0 — 2026-09-11

First release.
