# Changelog

## v2.5.3 — 2026-09-13

- In **Generate the seeds here**, the xpubs box is a result, not an input: it is read-only and appears only after the seeds are created. Pasting xpubs now happens only in Build from xpubs and Check or restore a wallet, so each panel does one thing.
- Far fewer words. The introduction, the three panel descriptions, the wallet-definition text and the hints are each cut to one or two sentences; "usually by its own person" and "when one person will hold every seed" are gone.

## v2.5.2 — 2026-09-13

- The multisig card now uses one plain vocabulary. A **seed** is one recovery phrase on its own device, usually held by its own person; the word "cosigner" is gone from the page except as the jargon name inside the Seeds definition, and "phrase" no longer appears in the card. "You" no longer stands for an unnamed person: the text says "whoever sets up the wallet" and "each device". The introduction is three plain sentences: what a multisig wallet is, what a seed is, and that KeyPath combines xpubs and never needs the seeds. Panels and labels follow: "Build from xpubs", Seeds, Words per seed, "Xpubs, one per seed", "Create the seeds and build the wallet", Seed 1 of 3, Reveal / Hide seeds. The BIP48 tab calls its output "Your multisig xpub". The definitions for multisig, seeds, threshold, BIP48, script type, key origin, sortedmulti, setup file and addresses say the same, and so do the warnings under the xpubs box.

## v2.5.1 — 2026-09-13

- The two output sections are now one, **The wallet definition**: one public thing in two formats, the descriptor for software wallets and the setup file for hardware wallets. The text says plainly that it cannot spend and carries no seed: each cosigner's device already holds its own phrase, and the definition tells software and devices which wallet those keys belong to. The Setup file definition and the how-to's Combine step say the same.
- The status line now says what happened in the current panel ("2 of 3 · P2WSH · mainnet", "Wallet built from the 3 pasted xpubs" / "rebuilt from the 3 pasted keys" / "built from the 3 generated seeds") instead of a generic instruction.
- The addresses section is labelled as verification.

## v2.5.0 — 2026-09-13

**Multisig card split into three panels, one job each.**

- **Build from cosigner xpubs** (default): signatures needed, script type, the pasted xpub lines. Nothing else.
- **Generate the seeds here**: signatures needed of how many seeds, words, script type, one Generate button with Reveal / Hide phrases and Try the demo wallet, the phrase cards, and the xpubs derived from them.
- **Check or restore a wallet**: signatures needed, script type, the wallet's xpubs or setup file, and the optional "First address shown by your wallet" check, which now lives only here.
- One Clear button in the card header. The wallet name moved into the Setup file section next to Download, since that is the only place it is used. The separate key-source toggle, the second Clear button and the duplicate help paragraphs are gone; each panel opens with one short paragraph saying what it is for.

## v2.4.0 — 2026-09-13

- **First address shown by your wallet**: an optional box under the cosigner xpubs. Paste the first receive address a wallet or device shows and KeyPath says whether these keys, threshold and script type rebuild the wallet that owns it (the first 50 receive and change addresses are searched). Match or No match, with the reason a match can fail: a missing or wrong xpub, or a different threshold or script type.
- **Prove why the descriptor must be backed up**: Try the demo wallet pre-fills that box with the demo wallet's own first address and invites you to delete one xpub line. The address changes and the check says No match, because two phrases alone cannot rebuild a 2-of-3 wallet; every cosigner's xpub is needed, which is what the descriptor or setup file holds. The how-to's Back up step and the Multisig wallet definition say the same.

## v2.3.5 — 2026-09-13

- Try the demo wallet now sits inside the Generate box, at the right end of the Generate / Clear row.

## v2.3.4 — 2026-09-13

- Try the demo wallet moved to the right end of the "Where do the cosigner keys come from?" line, above the Generate strip.

## v2.3.3 — 2026-09-13

- Try the demo wallet now also lifts the page-wide Hide private info, so the demo seeds are readable even when an earlier Generate had hidden the page.

## v2.3.2 — 2026-09-13

- A "Try the demo wallet" button on the Cosigner xpubs field builds a multisig wallet from the well-known test phrases (abandon × 11 then about, actual, age…; with 24 words, abandon × 23 then art, diesel, false…), one per cosigner with the count, words, signatures and script type chosen above. The phrases are shown unblurred, the name says demo, and the status line says never to fund it.

## v2.3.1 — 2026-09-13

- Generated multisig phrases have their own cover, independent of the page-wide Hide private info. Revealing the page (for example with the demo phrase) no longer exposes them; a Reveal phrases / Hide phrases button beside Generate controls them, and copy is refused while they are covered.
- Clear moved next to Generate; in the paste and check modes a small Clear sits on the Cosigner xpubs field instead.

## v2.3.0 — 2026-09-12

**Multisig card reorganised around what you are doing.**

- A switch at the top: **Create a new wallet** or **Check or restore an existing wallet**. Create shows the policy row (signatures needed of how many seeds, script type) and asks where the cosigner keys come from: **paste the xpubs from each cosigner's device** (the default and safest way) or **generate the phrases here**. Check shows only signatures needed and script type, and asks for the existing wallet's xpubs or setup file.
- The introduction and the output headings now say what each result is for: the descriptor goes into your software wallet, which becomes a watch-only wallet that also prepares spends for the cosigners to sign; the setup file goes onto every cosigner's hardware wallet so the device can verify addresses and sign. The Setup file definition says the same.
- The empty-state line under the xpubs box changes with the mode, Clear sits beside the wallet name, and the "Why paste xpubs here?" tip is gone because the switch answers it. "Use this key in the multisig wallet below" in the BIP48 tab lands in Create / Paste.

## v2.2.1 — 2026-09-12

- Multisig card reordered the way people think about a multisig wallet: "Signatures needed of Cosigners / seeds", then Words and Script type, then the Generate and Clear buttons, then the wallet name and the cosigner xpubs. Generate now uses the threshold you chose (clamped to the number of seeds) instead of picking one; lowering the seed count pulls the threshold down; pasting keys sets the seed count to match them.
- The card's introduction now describes both ways to create a wallet: generate a complete one here, or paste each cosigner's exported xpubs.
- The KeyPath definitions section moved to the end of the page, below Take it offline, and lost its intro paragraph; it is the same collapsed list.

## v2.2.0 — 2026-09-12

**Taproot multisig.**

- **P2TR (Taproot multisig)** is a third script type in the BIP48 tab and in the Multisig wallet card. The cosigner key lives at m/48'/coin'/account'/3' (the path Sparrow uses) and is a plain xpub; there is no SLIP-132 prefix for it.
- The descriptor is `tr(NUMS, sortedmulti_a(k, …))` with the BIP341 unspendable internal key, combined and as separate receive/change lines, each with its checksum. Addresses start with bc1p (tb1p on testnet): one `multi_a` leaf with the keys sorted as x-only keys, the way `sortedmulti_a` does it.
- The setup file says `Format: P2TR`, the line hardware wallets use for Taproot multisig, and a pasted file with that line selects the type.
- A short note explains that Taproot multisig is newer, with cheaper and more private spends, supported by Sparrow, Bitcoin Core 24 and later and recent hardware wallets, and that older wallets cannot import it. Definitions for BIP48, script type and sortedmulti mention it.
- Tests: Taproot addresses are cross-checked against @scure/btc-signer (a test-only dependency, not bundled), including a 5-of-9 wallet and testnet, plus the BIP341 single-leaf wallet vectors for the leaf hash and tweak; key order, descriptor checksums and the setup-file round trip are checked too. The suite now has 146 checks.

## v2.1.4 — 2026-09-12

- BIP85 is now simply "derive a new phrase from this master key": language, word count and index. The WIF, xprv and raw-hex applications are gone from the page (they were for developers; the derivation code and its test vectors remain).

## v2.1.3 — 2026-09-12

- Multisig card: the empty state and a new "?" explain why you would paste xpubs: to build a new wallet from each cosigner's exported key, or to check or recover an existing wallet by rebuilding its addresses and descriptor.

## v2.1.2 — 2026-09-12

- Multisig card: "Signatures needed" and "Cosigner xpubs" labels; the xpubs field says plainly that phrases and private keys do not belong there, and a pasted phrase gets a specific message.

## v2.1.1 — 2026-09-12

- Multisig card: a Clear button beside Generate wipes the generated phrases and cosigner keys; the count is labelled "Cosigners / seeds" and the definition explains that a cosigner is one person or device with its own seed.

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
