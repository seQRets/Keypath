# Changelog

## v2.11.3 — 2026-09-17

- A new checkbox under the account keys, "Show [fingerprint/path] in front", turns the account keys into descriptor-style keys with the key origin attached, like [73c5da0a/84h/0h/0h]xpub…, and back. It combines with the xpub ↔ zpub switch, works on the multisig tab too, and its "?" explains what the bracket means. Wallets such as Sparrow and multisig coordinators read this prefix to learn which seed a key came from.
- The Account level introduction now says what the key is for: paste the account extended public key into Sparrow or another wallet to create a watch-only wallet, which sees addresses and balance but can never spend. The output descriptors remain the equivalent route for Bitcoin Core and other descriptor wallets.
- The two account-key checkboxes sit in a properly spaced row instead of running together.

## v2.11.2 — 2026-09-17

- Dark is now the page's built-in default, set in the markup before any script runs. Viewers that do not run JavaScript at all, such as the macOS Quick Look preview, now show the file dark instead of light. The script then switches to light only where that is right: a saved light choice, or the hosted page on a computer set to light. A saved choice still wins everywhere; if a downloaded copy keeps opening light, pick "System theme" from the menu once to clear an old saved choice.

## v2.11.1 — 2026-09-17

- The entropy details panel no longer exposes the secret while the card is hidden. Filtered entropy, raw binary, the binary checksum and the word indexes — each of which is the phrase in another form — now blur with the card. The harmless statistics (time to crack, event count, entropy type, bits per event, word and bit counts) stay readable.
- A downloaded copy of the file now opens in dark mode by default. Before, browsers that block storage for downloaded pages (Safari does) silently broke the theme detection and the file always opened light. The hosted page still follows the computer's theme, a choice made from the menu still wins everywhere, and the download stays byte-identical to the hosted file, so the hash check is unchanged.
- The SLIP-132 checkbox in the Derivation path card is now labelled "xpub ↔ zpub" (or ypub, matching the address type), with the explanation kept behind its "?".

## v2.11.0 — 2026-09-17

**Each card hides on its own, and Shamir recovery hides the page.**

- Recovering a phrase from Shamir shares now hides all private information the moment the recovery succeeds, the same as generating or pasting a phrase does. Before, the recovered entropy and phrase appeared in the open. Recovering the demo phrase leaves the page open, and editing the shares after a deliberate reveal does not re-hide it.
- Every card that can show a secret — Recovery phrase, Shamir backup, Seed & master key, Derivation path, Derived addresses and Multisig wallet — has an eye button in its top-right corner reading Hide or Reveal. It blurs or reveals just that card, so one section can be checked while the rest stay hidden. The menu's "Hide private info" still sets every card at once, and the automatic hiding (a new phrase, a recovery, five idle minutes) covers every card too.
- In dark mode the open eye wears the same amber → orange → red gradient as the brand mark; the crossed eye stays red while a card is hidden. Copy buttons keep working through the blur, and empty boxes stay readable.

## v2.10.3 — 2026-09-16

- The theme now follows your computer by default, and keeps following it while the page is open. The menu choice cycles from the system theme to dark, to light, and back to the system theme; picking the system theme forgets the stored choice. Before, the computer's preference was only read on the first visit, and one click pinned a theme for good.

## v2.10.2 — 2026-09-16

- The faintest grey in dark mode is a shade lighter, #78787f instead of #6e6e77. On black it measured 4.16:1, under the 4.5:1 minimum for body text, and now measures 4.79:1. It sets placeholder text, field hints, disabled labels and the footer line, so the change is small but it is the text that was hardest to read.
- The lockfile is back in step with package.json. It still recorded version 2.8.8 and the qrcode-generator dependency that v2.9.0 removed.

## v2.10.1 — 2026-09-16

- The browser tab icon is now the brand mark: the amber → orange → red gradient tile with the key glyph, replacing the old flat orange icon with the branching-path design. It matches the logo above the title and stays readable at tab size.

## v2.10.0 — 2026-09-16

**A new dark theme in the style of IttyBitz.**

- Dark mode is redesigned around a true black page with glass cards: a faint white tint, soft white borders and 20-pixel corners. The accent is amber, and primary buttons, the selected side of each switch and the step badges wear an amber → orange → red gradient. Text on those gradient surfaces is bolder so it stays readable.
- A gradient key brand mark now sits above the title in dark mode. The word "Key" carries the same gradient as the mark, in the header and in the footer, while "Path" is silver. Each word clips its own gradient, so the tail of the y no longer picks up a stray sliver of the other word's colour.
- Lab scenario pills and address-column chips highlight orange on hover and stay highlighted while selected, and the Multisig lab gains a Clear pill.
- Typography stays IBM Plex in both themes.

## v2.9.1 — 2026-09-16

- The number in each card header is now a small round badge instead of a bold numeral beside the title, so "1 Recovery phrase" no longer reads as "one recovery phrase".
- Dark mode is now pure black with neutral greys instead of the brown wash: black page and terminal boxes, near-black cards, grey lines, off-white text. The orange accent and the red and green states are unchanged.

## v2.9.0 — 2026-09-14

**QR codes now come from paulmillr/qr.**

- The QR library is now [qr](https://github.com/paulmillr/qr) by Paul Miller, the author of the noble and scure cryptography libraries KeyPath already relies on: zero dependencies, a few hundred lines, and it ships a decoder. qrcode-generator is gone. The test suite now encodes the Standard and Compact SeedQR of the test phrase and an entropy string, then reads each code back with the library's decoder and checks the payload and the symbol size (25×25 and 21×21).
- The entropy box has the same two buttons as the phrase box: copy the entropy (clipboard cleared after 60 seconds) and show it as a plain-text QR code for moving it to another device. The QR modal says which kind of code it is showing.

## v2.8.8 — 2026-09-14

- The passphrase box no longer discourages use. Its placeholder reads: "Optional. Adds a second secret to your wallet: write it down and store it apart from the seed phrase."

## v2.8.7 — 2026-09-14

- Typed entropy (dice, coins, cards, hex) stays readable while it is being entered. The moment it is enough for a phrase of the chosen length, all private information hides. If the phrase disappears again, for example after choosing more words so the entropy no longer suffices, the page opens back up until the threshold is reached again. Clear and Reveal work as before.
- With a fixed word count, no phrase is shown until the entropy really has enough bits for it (for dice, 50 rolls for 12 words, 100 for 24); the status line counts how many more are needed. Before, a phrase appeared from the first roll with a warning that it was weaker than it looked.

## v2.8.6 — 2026-09-14

- Empty secret boxes (the phrase, passphrase, entropy, Shamir shares, multisig seeds) are no longer blurred while private info is hidden; the blur applies once they hold something.
- The network notice at the top says "seed phrase" instead of "phrase".
- The Shamir backup card opens in plain words: split the seed phrase into backup pieces called shares, choose how many are needed to get it back, with a 2-of-3 example.
- Plain-English introductions for Seed & master key, Derivation path, Derived addresses and the Multisig wallet card, including its Build and Restore explanations and the Restore field hints.
- The address table shows 10 rows by default instead of 20.
- Multisig card: the Build a wallet / Restore a wallet switch is the first thing in the card, followed by one paragraph for the chosen side; the shared introduction that said KeyPath never needs the seeds is gone. Clear sits beside "Create the seeds here" in Build and beside Account in Restore, instead of in the card header.
- The Split / Recover switch in the Shamir card is centred, like the Build / Restore switch in the multisig card.
- The definitions section is now titled "KeyPath glossary" (and the nav pill says Glossary). The KeyPath name in the footer is styled like the logo at the top, orange "Key" and dark "Path", and is larger.
- The small right-hand labels in card headers (SLIP-39, the address type, "2-of-3 · demo seeds") are gone; card headers are now just a number and a name.
- The "First address shown by your wallet" box is gone from Restore a wallet: the address table right below already shows the first address to compare, and the Multisig lab teaches what a backup needs.

## v2.8.5 — 2026-09-14

- The entropy panel is much shorter: the heading, the explanatory paragraph and the "Advanced feature" box are gone, replaced by one hint on the Entropy field. The details about how dice are hashed moved into the Entropy definition behind the "?".

## v2.8.4 — 2026-09-14

- Clear in the Recovery phrase card also turns the blur off, since nothing private is left on the page.

## v2.8.3 — 2026-09-14

- Copying works while private info is hidden. The phrase's copy button, the copy buttons on secret boxes, the Shamir share copies and the multisig seed cards all copy through the blur, so a secret can be moved somewhere private without ever being shown on screen. The clipboard is still cleared after 60 seconds.

## v2.8.2 — 2026-09-14

- Two small buttons sit in the top-right corner of the Recovery phrase box: copy the phrase (the clipboard is cleared after 60 seconds; refused while private info is hidden) and show the Seed QR. The Seed QR button in the card header moved there.

## v2.8.1 — 2026-09-14

- Typing or pasting a phrase into the Recovery phrase field now hides all private information the moment the phrase becomes valid, the same as Generate does. The demo phrase stays visible.

## v2.8.0 — 2026-09-14

**Build a wallet / Restore a wallet.**

- The multisig card has two centred tabs. **Build a wallet**: choose the policy, then paste the xpub from each device or press "Create the seeds here" (with the demo wallet beside it). **Restore a wallet**: enter what you have of an existing wallet in any mix, its seeds, its xpubs or its setup file, and get its addresses and definition back, with the optional first-address check.
- **Seeds can be entered directly.** The Restore tab has a Seeds box (blurred with Hide private info): one recovery phrase per line in any language, no passphrase. Each seed's xpub is derived at m/48'/coin'/account'/script', shown next to a new Account field, so nobody has to run each seed through the top of the page and copy its xpub by hand. A seed and its own xpub entered together count once, and the status line says what the wallet was rebuilt from, for example "2 seeds and 1 xpub".

## v2.7.5 — 2026-09-13

- The Multisig lab starts with nothing checked.

## v2.7.4 — 2026-09-13

- The "Signatures needed" column in the multisig card is wide enough for its label and "?" on one line.

## v2.7.3 — 2026-09-13

- BlueWallet is listed among the wallets that import the descriptor and the setup file (verified in its source: it reads `sortedmulti` descriptors and the Policy / Format / Derivation setup-file lines for P2WSH and P2SH-P2WSH). The Taproot note says BlueWallet cannot import Taproot multisig.

## v2.7.2 — 2026-09-13

- Multisig lab: the status under each seed is now just "xpub known" or "xpub missing", so the table no longer shifts when a box is checked. Where each xpub comes from is still stated in the Xpubs known box.

## v2.7.1 — 2026-09-13

- Multisig lab wording: it now asks "What do you need to recover a multisig wallet?", says "Check the boxes for what you still have", and states the one-way rule as "An xpub can always be produced from its seed, but a seed can never be produced from its xpub." The lab definition, the lesson line, the demo note, the SLIP-132 definition and the Recover definition use the same words.

## v2.7.0 — 2026-09-13

**One type scale.** Every card now uses three text styles in one size: prose (regular, soft ink) for introductions, help lines, hints and notes; labels (semibold, dark ink); and section headings (bold, dark ink, no more small capitals). Emphasis comes from weight and colour only. Data keeps the mono font. Table headers, panel buttons and bar buttons are one size too. The narrow input columns are a little wider so labels such as "Signatures needed" stay on one line.

## v2.6.5 — 2026-09-13

- Every line in the multisig card and the lab is now a full sentence. The output heading is "Your wallet definition", introduced by "This is your wallet's definition: its policy, its script type and the xpub of every seed. It is public information; it cannot spend and it contains no seed." The descriptor and setup-file notes, the field hints, the wallet-name hint, the lab's definition checkbox and the lab's verdict lines were rewritten the same way.

## v2.6.4 — 2026-09-13

- Build a wallet from xpubs, in plain words: "Paste the xpub from each device, or an existing wallet's xpubs or setup file, and choose how many signatures are needed." The field is now just "Xpubs", with the hint "paste each device's xpub on its own line, or paste a setup file. Never paste seeds or private keys here."

## v2.6.3 — 2026-09-13

- The two multisig panels now answer "Pick what you are doing": **Build a wallet from xpubs** and **Generate multisig seeds**.

## v2.6.2 — 2026-09-13

- Multisig lab: visual cues. "Find the coins" and "Spend" carry a green check or a red cross with a matching tinted box, and each seed row shows a green "xpub known" line (with where it comes from) or a red "xpub missing" line.

## v2.6.1 — 2026-09-13

- Multisig lab: ticking a seed now ticks and greys out its xpub box, since a seed always gives its xpub. A line under the table says so. The only independent choices left are which seeds you hold, which extra xpubs you kept, and whether you kept the definition.

## v2.6.0 — 2026-09-13

**Multisig lab, and two panels instead of three.**

- **Card 7, Multisig lab**: a sandbox for one question, what must you keep to get a multisig wallet back? Its wallet is a 2-of-3 built from the three public test seeds (abandon × 11 then about, actual, age), so nothing in it is secret. Tick which seeds, which xpubs and whether the wallet definition you still have, or press a scenario button (all 3 seeds; 2 seeds + definition; 2 seeds + the 3rd xpub; 2 seeds only; 1 seed + definition; 3 xpubs, no seed). The lab answers in plain boxes: how many xpubs are known and where each comes from, whether the coins can be found (every xpub known, first address shown), whether they can be spent (enough seeds to sign), what is still needed, and the lesson: keep the definition with every seed backup. When xpubs are missing it also shows the address a wallet built from only the xpubs you have would get, a different wallet with no coins.
- The multisig card's Build from xpubs and Check or restore a wallet panels were the same computation, so they are now one panel, **From xpubs**, for new and existing wallets alike; a setup file can be pasted there and the optional "first address shown by your wallet" check sits at its bottom. The demo note points to the lab.

## v2.5.4 — 2026-09-13

- Switching between Build from xpubs, Generate the seeds here and Check or restore a wallet now clears the whole card: xpubs, seeds, the address check, the wallet name and the policy go back to their defaults, so each panel starts from a fresh slate.

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
