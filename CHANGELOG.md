# Changelog

## v1.3.0 — 2026-09-11

- The floating buttons are replaced by a single menu button in the top-right corner. It opens a small panel with Hide / Reveal private info, Tooltips on / off, Dark / Light mode and Back to top, so private values can be hidden from anywhere on the page without anything covering the content. Larger tap targets on touch screens.

## v1.2.4 — 2026-09-11

- The floating buttons (hide/reveal, tooltips, theme) now sit in the bottom-right corner.

## v1.2.3 — 2026-09-11

- A floating Hide / Reveal private info button appears whenever the one in the phrase card's header is scrolled out of view, so private values can be hidden from anywhere on the page. The floating buttons are stacked vertically, and on wide screens they sit in the margin beside the content so they cover nothing.

## v1.2.2 — 2026-09-11

- The master fingerprint is shown directly under the phrase once it is valid, and inside the Seed QR modal, so it can be compared with a wallet without scrolling. The duplicate copies in the Seed & master key card header and its detail rows are gone; the highlighted fingerprint box remains.

## v1.2.1 — 2026-09-11

- Private values are visible when the page opens. They are blurred automatically the moment a phrase is generated (Generate button, dice or other entropy, or a Shamir recovery loaded into the page), and after five minutes idle. Reveal and Hide work as before.

## v1.2.0 — 2026-09-11

**Dice are hashed the hardware-wallet way by default.**

- When dice rolls are detected, the Mnemonic length menu now follows the Words selector automatically (12 to 24 words) instead of defaulting to raw mode, so a dice roller gets a wallet-compatible phrase without touching a menu. Other input types still default to raw. Once you change the menu yourself, KeyPath stops choosing for you until you press Clear.
- Raw mode is still available and unchanged; selecting it with dice shows a note that no hardware wallet reproduces it.
- Text, tooltips and the README describe KeyPath's behavior on its own terms. KeyPath does not aim to reproduce results from other tools; the legacy 6-as-0 instructions are gone.


## v1.1.0 — 2026-09-11

**Dice rolls with a word count now match hardware wallets.**

When dice are entered and a word count (12 to 24 words) is chosen, the rolls are now SHA-256 hashed exactly as typed (digits 1 to 6). This is the convention of hardware wallets that accept dice, confirmed on a Krux device and against myseedphrase.app. Before this release, KeyPath hashed the rolls with every 6 rewritten as 0, a behavior inherited from Ian Coleman's BIP39 tool, so any roll string containing a 6 produced a phrase no wallet would reproduce.

Example, 76 rolls `5455166441346642362333165523212234151363253263223232553225134324163321663414`, 12 words:

- now: `youth spot place private target office ice spike brave ginger improve shy` (same as a hardware wallet)
- before: `rent chase subway they force exact hungry seed powder rice quiz spend`

A phrase written down from an earlier version still works; only re-deriving it from the same rolls gives different words now.

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
