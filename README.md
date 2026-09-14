# KeyPath

**BIP39 seed phrase generator with Shamir backup, multisig wallet builder and Taproot support, in one offline HTML file.**

**Use it online:** [seqrets.github.io/Keypath](https://seqrets.github.io/Keypath/) (for real funds, download the file and use it offline).

KeyPath is a modern re-imagining of Ian Coleman's [BIP39 tool](https://github.com/iancoleman/bip39). It keeps what that tool got right and improves the rest; see [Dice rolls](#dice-rolls) for one example. Download `dist/index.html`, move it to an offline computer, open it in a browser, and you have everything needed to create, inspect, back up and verify a Bitcoin recovery phrase.

## Download and verify

1. Download `keypath.html` and `SHA256SUMS.txt` from the [latest release](https://github.com/seQRets/Keypath/releases/latest). (Do not use the browser's "Save page as" on the hosted page; browsers rewrite the file and change its hash.)
2. Check the hash:
   - macOS / Linux: `shasum -a 256 -c SHA256SUMS.txt` (or `shasum -a 256 keypath.html` and compare by eye)
   - Windows PowerShell: `Get-FileHash keypath.html` and compare with the line for keypath.html in `SHA256SUMS.txt`
3. Copy the file to a computer that is disconnected from the internet and open it there in a fresh browser profile with no extensions.

`dist/keypath.html` and `dist/index.html` in this repository are byte-identical to the release asset; `dist/SHA256SUMS.txt` is the committed hash.

## Features

- Generate 12/15/18/21/24-word phrases in all ten BIP39 languages, or type/paste an existing one (per-word validation, checksum check, automatic language detection, re-encode a phrase in another language)
- Optional BIP39 passphrase
- **SLIP-39 Shamir backup**: split the entropy behind the phrase into T-of-N share mnemonics (Trezor's standard, 20 or 33 words each, optional share passphrase, extendable flag), recover the exact BIP39 phrase from any threshold of shares, one-click test of a fresh share set
- "Show entropy details" panel, ported from the original: entropy input (binary, base 6, dice, base 10, hex, playing cards) with the same debiased bit encoding, time-to-crack estimate, event count, bits per event, raw binary, checksum bits and word indexes. Generate fills the panel with the bytes it drew; a typed phrase shows its own entropy. Raw mode keeps only the unbiased bits per event (1.67 per die roll, so about 77 rolls for 12 words); fixed lengths hash the input and count the full 2.58 bits per roll, so 50 rolls suffice
- SeedQR export (Standard and Compact SeedQR, as read by SeedSigner, Krux, Sparrow and Passport) shown in a modal
- BIP39 seed, BIP32 root key, master fingerprint shown prominently. Paste an xprv/xpub (or ypub/zpub/tpub…) to derive from a key instead of a phrase
- Derivation tabs: BIP44 (P2PKH), BIP49 (P2SH-P2WPKH), BIP84 (P2WPKH), **BIP86 (P2TR Taproot, bech32m)**, **BIP48 (multisig cosigner key for P2WSH, P2SH-P2WSH or Taproot multisig, with Zpub/Ypub prefixes and the key-origin line)**, and Custom (any path plus any script type, covering the original BIP32 and BIP141 tabs)
- Account extended keys with optional SLIP-132 prefixes (ypub/zpub/upub/vpub), extended keys at the derivation path
- Output descriptors with checksums for Bitcoin Core / Sparrow
- Address table with path / address / public key / WIF columns, hardened children, paging, click-to-copy, CSV download and copy
- **Multisig wallet builder** with Build and Restore tabs: build from the xpubs each device exported or create the seeds here; restore from any mix of seeds, xpubs and a setup file (seeds are derived at the BIP48 path for the chosen account and script type); pick the threshold and P2WSH, P2SH-P2WSH or **P2TR (Taproot multisig)**, and get the `sortedmulti` or `tr(NUMS, sortedmulti_a(…))` descriptor with checksum, a hardware-wallet setup file, and the wallet's first addresses for cross-device verification (BIP48, BIP67, BIP341)
- **Multisig lab**: a sandbox 2-of-3 built from the public test seeds where you tick which seeds, xpubs and wallet definition you still have and see whether the coins can be found and spent, to learn what a multisig backup must contain
- BIP85 child phrases (one master phrase, many independent child phrases by index)
- Bitcoin mainnet and testnet/signet, light and dark themes, "Hide all private info" blur for screen sharing

Styled to match the [OP_RETURN Message Builder](https://seqrets.github.io/op_return/): parchment palette, orange accent, IBM Plex type, pill navigation and terminal-style output boxes.

- Plain-language tooltips: a "?" beside every label that uses a technical term, plus a collapsible "KeyPath glossary" list. Both come from one glossary in `src/glossary.js`, so a definition is written once

## Project layout

- `dist/keypath.html` — the single-file application, the only file users need (`dist/index.html` is the identical copy GitHub Pages serves)
- `dist/SHA256SUMS.txt` — hash of the current build, for verification
- `.github/workflows/` — Pages deployment on every push, and a release on every `v*` tag that attaches `keypath.html` and `SHA256SUMS.txt`
- `src/` — page shell, markup, styles, application logic, glossary, SLIP-39 port and the library bundle entry
- `build.mjs` — bundles the libraries with esbuild and assembles the single file

## Releasing

```bash
npm run build
git add -A && git commit -m "Release vX.Y.Z"
git tag vX.Y.Z && git push && git push --tags
```

The release workflow verifies `dist/SHA256SUMS.txt` against `dist/keypath.html`, then creates the GitHub release with both files attached. Bump `version` in `package.json` first; it is stamped into the page footer.

## Build

```bash
npm install
npm run build
```

`src/slip39.js` is a port of the SLIP-39 reference implementation with the official 1024-word list embedded. `build.mjs` bundles `src/lib.js` (the audited [noble](https://paulmillr.com/noble/) and [scure](https://github.com/paulmillr/scure-bip39) libraries) with esbuild and assembles `src/app.html`, `src/style.css`, `src/body.html` and `src/app.js` into `dist/index.html`.

## Dice rolls

Type your rolls into the entropy panel (digits 1 to 6; anything else is ignored). KeyPath hashes the rolls with SHA-256 exactly as typed, keeps the leading 128 to 256 bits for the word count chosen in the Words selector, and appends the BIP39 checksum. This is the convention followed by hardware wallets that accept dice, confirmed against a Krux device and against [myseedphrase.app](https://myseedphrase.app), which is the reference. A wallet that hashes dice the same way will reproduce the phrase. 50 rolls are enough for 12 words; 100 for 24.

The Mnemonic length menu can be switched to **Raw entropy (no hashing)**, an unbiased base-6 conversion that needs about 77 rolls for 12 words. No hardware wallet reproduces it, and the page says so when it is selected with dice.

## Security

- **No network.** A Content Security Policy in the page blocks every outbound connection (`default-src 'none'`, `connect-src 'none'`) and allows only the build's own inline scripts by SHA-256 hash, so an injected or modified script will not run. `referrer` is `no-referrer` and external links open in a new tab with `noopener noreferrer`.
- **No storage of secrets.** Only the theme and the tooltip preference are kept in `localStorage`. All fields are wiped on `pagehide`; private values are blurred automatically whenever a phrase is generated and again after five minutes idle.
- **Clipboard.** Copying a secret clears it from the clipboard after 60 seconds. Copy buttons work while values are blurred, so a secret can be moved to a private place without being shown.
- **XSS.** Every dynamic HTML insertion is escaped; the bundle contains no `eval` or `Function`.
- **Integrity.** `npm run build` writes `dist/SHA256SUMS.txt`. Tagging `vX.Y.Z` publishes a release whose assets are the committed file and that sums file; the workflow refuses to release if they disagree.
- **Out of scope.** Malware on the host, browser extensions, screen capture and clipboard sync are outside what a page can defend against; the page tells users to work offline in a fresh browser profile without extensions.

## Tests

```bash
npm test
```

Builds, then runs `test/run.mjs`: the dice vectors (hashed and raw), the event encodings for every input type, the BIP44/49/84/86 vectors, multisig (BIP48 keys, BIP67 sorting, P2WSH and P2SH-P2WSH addresses cross-checked against an independent Python implementation, Taproot multisig addresses cross-checked against `@scure/btc-signer` and the BIP341 wallet vectors, descriptor checksums, setup-file round trips), and all 45 official SLIP-39 vectors including share re-encoding.

## Verification

Address derivation was checked against the official test vectors in BIP44/49/84/86 (the `abandon … about` phrase), BIP85 (BIP39 application), the descriptor checksum example from Bitcoin Core's documentation, the BIP341 wallet test vectors (single-leaf script trees), `@scure/btc-signer` for Taproot multisig addresses (a test-only dependency; nothing of it is bundled), and all 45 SLIP-39 vectors from the trezor/python-shamir-mnemonic reference (the share encoder also reproduces every reference share string byte for byte).

## License

MIT. Cryptography by noble-curves, noble-hashes, scure-bip32, scure-bip39 and scure-base (MIT). QR codes by qrcode-generator (MIT).
