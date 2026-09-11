# KeyPath

**BIP39 seed phrase generator with Shamir backup and Taproot support, in one offline HTML file.**

KeyPath is a modern re-imagining of Ian Coleman's [BIP39 tool](https://github.com/iancoleman/bip39). Download `dist/index.html`, move it to an offline computer, open it in a browser, and you have everything needed to create, inspect, back up and verify a Bitcoin recovery phrase.

## Download and verify

1. Download `dist/index.html` from the latest release (or this repository).
2. Check its SHA-256 against `dist/index.html.sha256`:
   - macOS / Linux: `shasum -a 256 index.html`
   - Windows PowerShell: `Get-FileHash index.html`
3. Copy the file to a computer that is disconnected from the internet and open it there in a fresh browser profile with no extensions.

## Features

- Generate 12/15/18/21/24-word phrases in all ten BIP39 languages, or type/paste an existing one (per-word validation, checksum check, automatic language detection, re-encode a phrase in another language)
- Optional BIP39 passphrase
- **SLIP-39 Shamir backup**: split the entropy behind the phrase into T-of-N share mnemonics (Trezor's standard, 20 or 33 words each, optional share passphrase, extendable flag), recover the exact BIP39 phrase from any threshold of shares, one-click test of a fresh share set
- "Show entropy details" panel, ported from the original: entropy input (binary, base 6, dice, base 10, hex, playing cards) with the same debiased bit encoding, time-to-crack estimate, event count, bits per event, raw binary, checksum bits and word indexes. Generate fills the panel with the bytes it drew; a typed phrase shows its own entropy. Raw mode keeps only the unbiased bits per event (1.67 per die roll, so about 77 rolls for 12 words); fixed lengths hash the input and count the full 2.58 bits per roll, so 50 rolls suffice
- SeedQR export (Standard and Compact SeedQR, as read by SeedSigner, Krux, Sparrow and Passport) shown in a modal
- BIP39 seed, BIP32 root key, master fingerprint shown prominently. Paste an xprv/xpub (or ypub/zpub/tpub…) to derive from a key instead of a phrase
- Derivation tabs: BIP44 (P2PKH), BIP49 (P2SH-P2WPKH), BIP84 (P2WPKH), **BIP86 (P2TR Taproot, bech32m)**, and Custom (any path plus any script type, covering the original BIP32 and BIP141 tabs)
- Account extended keys with optional SLIP-132 prefixes (ypub/zpub/upub/vpub), extended keys at the derivation path
- Output descriptors with checksums for Bitcoin Core / Sparrow
- Address table with path / address / public key / WIF columns, hardened children, paging, click-to-copy, CSV download and copy
- BIP85 child secrets (BIP39 phrase, WIF, xprv, raw hex)
- Bitcoin mainnet and testnet/signet, light and dark themes, "Hide all private info" blur for screen sharing

Styled to match the [OP_RETURN Message Builder](https://seqrets.github.io/op_return/): parchment palette, orange accent, IBM Plex type, pill navigation and terminal-style output boxes.

- Plain-language tooltips: a "?" beside every label that uses a technical term, plus a collapsible "KeyPath definitions" list. Both come from one glossary in `src/glossary.js`, so a definition is written once

## Project layout

- `dist/index.html` — the single-file application (this is the only file users need)
- `dist/index.html.sha256` — hash of the current build, for verification
- `src/` — page shell, markup, styles, application logic, glossary, SLIP-39 port and the library bundle entry
- `build.mjs` — bundles the libraries with esbuild and assembles the single file

## Build

```bash
npm install
npm run build
```

`src/slip39.js` is a port of the SLIP-39 reference implementation with the official 1024-word list embedded. `build.mjs` bundles `src/lib.js` (the audited [noble](https://paulmillr.com/noble/) and [scure](https://github.com/paulmillr/scure-bip39) libraries) with esbuild and assembles `src/app.html`, `src/style.css`, `src/body.html` and `src/app.js` into `dist/index.html`.

## Security

- **No network.** A Content Security Policy in the page blocks every outbound connection (`default-src 'none'`, `connect-src 'none'`) and allows only the build's own inline scripts by SHA-256 hash, so an injected or modified script will not run. `referrer` is `no-referrer` and external links open in a new tab with `noopener noreferrer`.
- **No storage of secrets.** Only the theme and the tooltip preference are kept in `localStorage`. All fields are wiped on `pagehide`, private values start blurred and re-blur after five minutes idle.
- **Clipboard.** Copying a secret clears it from the clipboard after 60 seconds.
- **XSS.** Every dynamic HTML insertion is escaped; the bundle contains no `eval` or `Function`.
- **Integrity.** `npm run build` writes `dist/index.html.sha256`. Publish that hash with each release so users can verify their copy with `shasum -a 256 index.html`.
- **Out of scope.** Malware on the host, browser extensions, screen capture and clipboard sync are outside what a page can defend against; the page tells users to work offline in a fresh browser profile without extensions.

## Verification

Address derivation was checked against the official test vectors in BIP44/49/84/86 (the `abandon … about` phrase), BIP85 (all four applications), the descriptor checksum example from Bitcoin Core's documentation, and all 45 SLIP-39 vectors from the trezor/python-shamir-mnemonic reference (the share encoder also reproduces every reference share string byte for byte).

## License

MIT. Cryptography by noble-curves, noble-hashes, scure-bip32, scure-bip39 and scure-base (MIT). QR codes by qrcode-generator (MIT).
