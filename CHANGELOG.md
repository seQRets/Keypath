# Changelog

## v2.1.0 — 2026-09-12

- **Generate a complete multisig wallet**: choose how many cosigners and 12 or 24 words, and KeyPath creates a fresh phrase for each, shows them as numbered cards (blurred, with fingerprints), fills in the cosigner keys and builds the wallet. The page notes that making every phrase on one computer is weaker than one device per cosigner.
- Download moved from the top navigation into the menu; the word "file" in the subtitle links to the download section.
- Wording no longer names a hardware wallet brand outside the setup-file section.

## v2.0.0 — 2026-09-12

**Multisig.**

- **BIP48 tab** in the Derivation card: your multisig cosigner key at m/48'/coin'/account'/script', with the P2WSH (2') or P2SH-P2WSH (1') choice, SLIP-132 Zpub/Ypub prefixes, and the one-line key-with-origin (`[fingerprint/path]xpub`) that Sparrow, Bitcoin Core and Coldcard accept. One click adds it to the multisig builder.
- **Multisig wallet card**: paste any number of cosigner keys (origin lines, bare xpubs, or a whole Coldcard setup file), choose the threshold and script type, and get the `sortedmulti` descriptor with checksum (combined and separate receive/change), a downloadable setup file for Coldcard, Passport, Keystone and Sparrow, and the wallet's first receive and change addresses so every cosigner can verify their device shows the same one. Keys are sorted per BIP67, so listing order does not matter.
- **Checks**: mixed networks, duplicate keys, missing key origin, unusual key depth, 1-of-N and N-of-N are flagged in plain language.
- **Guidance**: a five-step walkthrough of setting up a multisig wallet, and definitions for multisig, cosigner, threshold, BIP48, script type, key origin, sortedmulti and the setup file.
- Signing is deliberately not included; that belongs on each cosigner's device. Taproot multisig will follow.
- Tests: multisig addresses were cross-checked against an independent Python implementation; the suite now has 120 checks.


## v1.3.5 — 2026-09-12

- Numbered word lists (the phrase and each Shamir share) now read down each column and then across, the way words are written on a backup card.

## v1.3.4 — 2026-09-12

- The subtitle and page title now mention Shamir backup.

## v1.3.3 — 2026-09-12

- A "Try the demo phrase" button beside the mnemonic field fills in the well-known BIP39 test phrase (abandon × 11, about) so the whole page can be explored without creating a real seed. The status line marks it as the demo phrase and warns never to fund it.

## v1.3.2 — 2026-09-11

- The warning at the top is now one line with a "Read more" link that expands the rest.

## v1.3.1 — 2026-09-11

- Blurred fields can be clicked into and typed in while they stay blurred, so a passphrase, phrase, entropy or share can be entered without ever appearing on screen. The focused field shows a red ring so you know where you are typing. Copying from blurred values remains blocked.
- The Seed QR modal has a Hide QR button to blur the code again after revealing it.

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
