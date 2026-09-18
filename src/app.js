(() => {
'use strict';
const { bip39, wordlists, HDKey, secp256k1, schnorr, sha256, sha512, hmac, base58check, bech32, bech32m, hex, slip39, encodeQR, multisig } = BTC;
const hash160 = BTC.hash160;
const $ = (id) => document.getElementById(id);
const H = 0x80000000;
const nfkd = (s) => s.normalize('NFKD');
const concat = (...arrs) => { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
const bytesToBig = (b) => BigInt('0x' + hex.encode(b));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- networks ---------------- */
const NETS = {
  mainnet: { name: 'Bitcoin mainnet', coin: 0, p2pkh: 0x00, p2sh: 0x05, hrp: 'bc', wif: 0x80,
    xprv: 0x0488ade4, xpub: 0x0488b21e, yprv: 0x049d7878, ypub: 0x049d7cb2, zprv: 0x04b2430c, zpub: 0x04b24746,
    slip: { bip49: ['yprv', 'ypub'], bip84: ['zprv', 'zpub'] } },
  testnet: { name: 'Bitcoin testnet / signet', coin: 1, p2pkh: 0x6f, p2sh: 0xc4, hrp: 'tb', wif: 0xef,
    xprv: 0x04358394, xpub: 0x043587cf, yprv: 0x044a4e28, ypub: 0x044a5262, zprv: 0x045f18bc, zpub: 0x045f1cf6,
    slip: { bip49: ['uprv', 'upub'], bip84: ['vprv', 'vpub'] } },
};
const VERSION_TABLE = [];
for (const [netName, n] of Object.entries(NETS)) for (const [prv, pub] of [['xprv', 'xpub'], ['yprv', 'ypub'], ['zprv', 'zpub']]) VERSION_TABLE.push({ net: netName, private: n[prv], public: n[pub] });
for (const [netName, m] of Object.entries(multisig.MS_VERSIONS)) for (const v of Object.values(m)) VERSION_TABLE.push({ net: netName, private: v.prv, public: v.pub });

const TABS = {
  bip44: { purpose: 44, script: 'p2pkh', help: 'Legacy (P2PKH) addresses start with 1 (m or n on testnet); every wallet ever written understands them, but they pay the highest fees.' },
  bip49: { purpose: 49, script: 'p2sh-p2wpkh', help: 'SegWit wrapped in P2SH so that older wallets can pay to it; addresses start with 3 (2 on testnet).' },
  bip84: { purpose: 84, script: 'p2wpkh', help: 'Native SegWit (P2WPKH) addresses start with bc1q (tb1q on testnet); most wallets default to it, with lower fees than legacy.' },
  bip86: { purpose: 86, script: 'p2tr', help: 'Single-key Taproot (P2TR) addresses start with bc1p (tb1p on testnet) and are the cheapest, most private single-signature type. Bitcoin Core 22 and later, Sparrow, Ledger and Trezor support it.' },
  bip48: { purpose: 48, script: 'multisig', help: 'The seed\'s xpub for a multisig wallet: hand the line below to whoever sets up the wallet, or build it in the Multisig card.' },
  custom: { purpose: null, script: null, help: 'Any BIP32 path with any script type, covering the original tool\'s BIP32 and BIP141 tabs.' },
};
const SCRIPT_NAMES = { p2pkh: 'P2PKH (legacy)', 'p2sh-p2wpkh': 'P2WPKH in P2SH', p2wpkh: 'P2WPKH (native SegWit)', p2tr: 'P2TR (Taproot)', multisig: 'multisig cosigner key' };
const BIP85_LANG = { english: 0, japanese: 1, korean: 2, spanish: 3, simplifiedChinese: 4, traditionalChinese: 5, french: 6, italian: 7, czech: 8, portuguese: 9 };

/* ---------------- state ---------------- */
const S = {
  net: 'mainnet', lang: 'english', prevLang: 'english', words: 12,
  phraseWords: [], phraseValid: false, seed: null,
  root: null, rootFromKey: false, rootPublicOnly: false, computedRootKey: '',
  tab: 'bip84', account: 0, change: 0, coin: 0, customPath: "m/0'/0", customScript: 'p2wpkh', slip132: false, origin: false,
  pathNode: null, pathIndices: null, script: 'p2wpkh',
  hardened: false, start: 0, count: 10, rows: [], renderToken: 0,
};
const net = () => NETS[S.net];

/* ---------------- small utils ---------------- */
let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1400); }
let clipTimer = null;
// Secrets are cleared from the clipboard after 60 s, the way password managers do.
function scheduleClipboardClear(text) {
  clearTimeout(clipTimer);
  clipTimer = setTimeout(async () => { try { const cur = await navigator.clipboard.readText().catch(() => text); if (cur === text) await navigator.clipboard.writeText(' '); } catch (e) {} }, 60000);
}
async function copyText(text, secret = false) {
  if (!text) return false;
  if (secret) scheduleClipboardClear(text);
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
  try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
// Terminal boxes keep their copy button; the value lives in a span.val child.
function setBox(id, value, opts = {}) {
  const el = $(id); el.classList.remove('err');
  let v = el.querySelector('span.val');
  if (!v) { v = document.createElement('span'); v.className = 'val'; const ph = el.querySelector('span.ph'); if (ph) ph.remove(); el.appendChild(v); }
  if (value == null || value === '') { v.innerHTML = `<span class="ph">${esc(opts.empty || '—')}</span>`; el.dataset.value = ''; return; }
  if (opts.error) el.classList.add('err');
  v.textContent = value; el.dataset.value = opts.error ? '' : value;
}
function setMeter(id, html) { $(id).innerHTML = html; }
const count = (txt, cls = '') => `<span class="count ${cls}">${esc(txt)}</span>`;
const note = (txt) => `<span class="meter-note">${esc(txt)}</span>`;
const fpHex = (node) => node.fingerprint.toString(16).padStart(8, '0');
const toH = (i) => (i >= H ? (i - H) + "'" : String(i));
const pathToString = (idx) => 'm' + idx.map((i) => '/' + toH(i)).join('');
const pathToDesc = (idx) => idx.map((i) => '/' + (i >= H ? (i - H) + 'h' : i)).join('');

/* ---------------- keys & addresses ---------------- */
function serExt(node, version, priv) {
  if (priv && !node.privateKey) return null;
  const b = new Uint8Array(78); const dv = new DataView(b.buffer);
  dv.setUint32(0, version); b[4] = node.depth; dv.setUint32(5, node.parentFingerprint); dv.setUint32(9, node.index);
  b.set(node.chainCode, 13);
  if (priv) { b[45] = 0; b.set(node.privateKey, 46); } else b.set(node.publicKey, 45);
  return base58check.encode(b);
}
function wif(priv, n = net()) { return base58check.encode(concat(new Uint8Array([n.wif]), priv, new Uint8Array([1]))); }
function taprootOutputKey(pub) {
  const x = pub.slice(1);
  const P = schnorr.utils.lift_x(bytesToBig(x));
  const t = schnorr.utils.taggedHash('TapTweak', x);
  const Q = P.add(secp256k1.Point.BASE.multiply(bytesToBig(t)));
  return schnorr.utils.pointToBytes(Q);
}
function address(pub, script, n = net()) {
  switch (script) {
    case 'p2pkh': return base58check.encode(concat(new Uint8Array([n.p2pkh]), hash160(pub)));
    case 'p2sh-p2wpkh': return base58check.encode(concat(new Uint8Array([n.p2sh]), hash160(concat(new Uint8Array([0x00, 0x14]), hash160(pub)))));
    case 'p2wpkh': return bech32.encode(n.hrp, [0, ...bech32.toWords(hash160(pub))]);
    case 'p2tr': return bech32m.encode(n.hrp, [1, ...bech32m.toWords(taprootOutputKey(pub))]);
  }
  throw new Error('unknown script ' + script);
}
function parsePath(str) {
  const s = str.trim().replace(/\s+/g, '');
  if (!/^m(\/\d+['hH]?)*\/?$/.test(s)) return null;
  const out = [];
  for (const p of s.split('/').slice(1).filter(Boolean)) {
    const hard = /['hH]$/.test(p); const n = parseInt(p, 10);
    if (!Number.isFinite(n) || n >= H) return null;
    out.push(hard ? n + H : n);
  }
  return out;
}
function deriveIdx(node, idx) { let n = node; for (const i of idx) n = n.deriveChild(i); return n; }

/* descriptor checksum (Bitcoin Core) */
const INPUT_CHARSET = "0123456789()[],'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#\"\\ ";
const CHECKSUM_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function descPolymod(c, val) {
  const c0 = c >> 35n;
  c = ((c & 0x7ffffffffn) << 5n) ^ BigInt(val);
  if (c0 & 1n) c ^= 0xf5dee51989n; if (c0 & 2n) c ^= 0xa9fdca3312n; if (c0 & 4n) c ^= 0x1bab10e32dn; if (c0 & 8n) c ^= 0x3706b1677an; if (c0 & 16n) c ^= 0x644d626ffdn;
  return c;
}
function descChecksum(s) {
  let c = 1n, cls = 0, clscount = 0;
  for (const ch of s) {
    const pos = INPUT_CHARSET.indexOf(ch); if (pos < 0) return '';
    c = descPolymod(c, pos & 31); cls = cls * 3 + (pos >> 5);
    if (++clscount === 3) { c = descPolymod(c, cls); cls = 0; clscount = 0; }
  }
  if (clscount > 0) c = descPolymod(c, cls);
  for (let j = 0; j < 8; j++) c = descPolymod(c, 0);
  c ^= 1n;
  let ret = ''; for (let j = 0; j < 8; j++) ret += CHECKSUM_CHARSET[Number((c >> (5n * BigInt(7 - j))) & 31n)];
  return ret;
}
function descriptor(script, originFp, originPath, xpub, tail) {
  const key = `[${originFp}${originPath}]${xpub}${tail}`;
  const inner = { p2pkh: `pkh(${key})`, 'p2sh-p2wpkh': `sh(wpkh(${key}))`, p2wpkh: `wpkh(${key})`, p2tr: `tr(${key})` }[script];
  return inner + '#' + descChecksum(inner);
}

/* ---------------- wordlists ---------------- */
const wordSets = {};
function wordSet(lang) { if (!wordSets[lang]) wordSets[lang] = new Set(wordlists[lang].words.map(nfkd)); return wordSets[lang]; }
function splitWords(raw) { return nfkd(raw).trim().toLowerCase().split(/\s+/).filter(Boolean); }
function detectLang(words) {
  for (const l of [S.lang, ...Object.keys(wordlists).filter((k) => k !== S.lang)]) if (words.every((w) => wordSet(l).has(w))) return l;
  return null;
}

/* ---------------- chrome ---------------- */
/* ---------------- top-right menu ---------------- */
/* theme: "system" is the default and follows the computer live; a click cycles system -> dark -> light -> system */
const themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function themeMode() { try { const s = localStorage.getItem('keypath-theme'); return s === 'dark' || s === 'light' ? s : 'system'; } catch (e) { return 'system'; } }
function themeLabel() { $('themeBtn').querySelector('span').textContent = { system: 'Dark mode', dark: 'Light mode', light: 'System theme' }[themeMode()]; }
function applyTheme(mode) {
  // a downloaded copy (file:) defaults to dark: offline browsers often hide or block the system preference
  const dark = mode === 'dark' || (mode === 'system' && (location.protocol === 'file:' || (themeMedia && themeMedia.matches)));
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeLabel();
}
$('themeBtn').addEventListener('click', () => {
  const next = { system: 'dark', dark: 'light', light: 'system' }[themeMode()];
  try { if (next === 'system') localStorage.removeItem('keypath-theme'); else localStorage.setItem('keypath-theme', next); } catch (e) {}
  applyTheme(next);
});
if (themeMedia && themeMedia.addEventListener) themeMedia.addEventListener('change', () => { if (themeMode() === 'system') applyTheme('system'); });
applyTheme(themeMode()); // re-applied at boot so the theme is right even where storage is blocked (e.g. a downloaded file on file://)
/* every card that can show a secret hides on its own; the eye in its header toggles just that card, the menu item sets them all */
const SECRET_CARDS = ['phrase-card', 'shamir-card', 'seed-card', 'derivation-card', 'addresses-card', 'multisig-card'];
function allHidden() { return SECRET_CARDS.every((id) => $(id).classList.contains('sec-hidden')); }
function setCardHidden(id, on) {
  $(id).classList.toggle('sec-hidden', on);
  const b = $(id).querySelector('.barbtn.eye'); // the multisig card has no header eye: its seeds carry their own reveal buttons
  if (b) { b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = on ? 'Reveal' : 'Hide'; }
  const all = allHidden();
  $('menuHide').setAttribute('aria-pressed', all); $('menuHide').querySelector('span').textContent = all ? 'Reveal private info' : 'Hide private info';
}
function setHidden(on) { for (const id of SECRET_CARDS) setCardHidden(id, on); if (on) msGenCover(true); } // hiding everything also covers seeds created in the multisig card; revealing them stays deliberate
document.querySelectorAll('.barbtn.eye').forEach((b) => b.addEventListener('click', () => {
  const card = b.closest('.console'); setCardHidden(card.id, !card.classList.contains('sec-hidden'));
}));
$('menuHide').addEventListener('click', () => setHidden(!allHidden()));
function menuOpen(open) { $('menuBtn').setAttribute('aria-expanded', open); $('menuPanel').hidden = !open; }
$('menuBtn').addEventListener('click', () => menuOpen($('menuPanel').hidden));
document.addEventListener('click', (e) => { if (!$('menuPanel').hidden && !e.target.closest('#menuWrap')) menuOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('menuPanel').hidden) menuOpen(false); });
$('menuPanel').querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menuOpen(false)));
$('fpValue').addEventListener('click', async () => { if (S.root && (await copyText(fpHex(S.root)))) toast('Fingerprint copied'); });
$('phraseFpVal').addEventListener('click', async () => { if (S.root && (await copyText(fpHex(S.root)))) toast('Fingerprint copied'); });
$('pathOut').addEventListener('click', async () => { const p = $('pathOut').textContent; if (p.startsWith('m') && (await copyText(p))) toast('Path copied'); });
$('clearBtn').addEventListener('click', () => {
  for (const id of ['phrase', 'passphrase', 'entropy', 'shPass', 'shInput', 'shPassR', 'msKeys', 'msSeeds']) $(id).value = ''; $('msGen').innerHTML = ''; msUpdate();
  $('entropyLen').value = 'raw'; $('entropyType').value = 'auto'; entropyLenTouched = false; $('startIdx').value = '0';
  S.rootFromKey = false; $('rootOut').textContent = '';
  onPhraseInput(false); shamirClear(); shamirRecover(); setHidden(false); toast('Cleared'); // nothing private is left, so the blur comes off too
});
$('warnMore').addEventListener('click', () => { const open = $('warnDetail').hidden; $('warnDetail').hidden = !open; $('warnMore').setAttribute('aria-expanded', open); $('warnMore').textContent = open ? 'Show less' : 'Read more'; });
$('network').addEventListener('change', () => { S.net = $('network').value; S.coin = net().coin; $('coin').value = S.coin; rebuildRoot(); });
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy'); if (!btn) return;
  const el = $(btn.dataset.copy); const v = el.dataset.value || '';
  if (!v) return toast('Nothing to copy');
  if (await copyText(v, el.classList.contains('secret'))) { btn.classList.add('done'); btn.textContent = 'copied'; setTimeout(() => { btn.classList.remove('done'); btn.textContent = 'copy'; }, 1100); if (el.classList.contains('secret')) toast('Copied · clipboard clears in 60 s'); }
});
if (!(window.crypto && crypto.getRandomValues)) { $('rngWarn').classList.remove('hidden'); $('generateBtn').disabled = true; }

/* ---------------- entropy: see src/entropy.js ---------------- */
const { entropyFromString, entropyBits } = BTC.entropy;

function crackTime(bits, events) {
  // Attacker who knows the method, trying every possibility at 1e10 guesses per second.
  const seconds = Math.pow(2, bits) / 1e10;
  const r = (n) => Math.round(n);
  let t;
  if (seconds < 1) t = 'less than a second';
  else if (seconds < 60) t = `${r(seconds)} seconds`;
  else if (seconds < 3600) t = `${r(seconds / 60)} minutes`;
  else if (seconds < 86400) t = `${r(seconds / 3600)} hours`;
  else if (seconds < 2678400) t = `${r(seconds / 86400)} days`;
  else if (seconds < 32140800) t = `${r(seconds / 2678400)} months`;
  else if (seconds < 3214080000) t = `${r(seconds / 32140800)} years`;
  else t = 'centuries';
  const s = events.join('').toLowerCase();
  if (s.length >= 4) {
    if (new Set(s).size === 1) t += ' — repeats like "aaaa" are easy to guess';
    else { for (let l = 1; l <= s.length / 2; l++) { if (s.length % l === 0 && s === s.slice(0, l).repeat(s.length / l)) { t += ' — repeated patterns are easy to guess'; break; } } }
  }
  return t;
}
const spaceEvery11 = (b) => b.replace(/(.{11})/g, '$1 ').trim();
function checksumBits(entBytes) {
  const cs = entBytes.length * 8 / 32;
  return parseInt(hex.encode(sha256(entBytes)).slice(0, 2), 16).toString(2).padStart(8, '0').slice(0, cs);
}

// Rebuild the phrase from whatever is in the entropy box (user typed entropy).
// The entropy box stays readable while it is being typed; the moment it holds enough for a phrase, everything private
// hides, and if the phrase disappears again (more words chosen, entropy edited) the page opens back up.
function setMnemonicFromEntropy() {
  const wasValid = S.phraseValid;
  setMnemonicFromEntropyInner();
  if (S.phraseValid && !wasValid) setHidden(true);
  else if (!S.phraseValid && wasValid) setHidden(false);
}
function setMnemonicFromEntropyInner() {
  const raw = $('entropy').value;
  const typeSel = $('entropyType').value;
  const e = entropyFromString(raw, typeSel === 'auto' ? undefined : typeSel);
  // Until the user picks a mode, dice get hashed the way hardware wallets do (word count from the Words selector); everything else stays raw.
  if (!entropyLenTouched && e.binaryStr.length) { const want = e.base.str === 'base 6 (dice)' ? String(S.words) : 'raw'; if ($('entropyLen').value !== want) $('entropyLen').value = want; }
  const lenSel = $('entropyLen').value;
  $('diceRawNote').classList.toggle('hidden', !(lenSel === 'raw' && e.base.str === 'base 6 (dice)' && e.binaryStr.length));
  if (!e.binaryStr.length) { $('phrase').value = ''; renderEntropyDetails(e, null); onPhraseInput(true); return; }
  const r = entropyBits(e, lenSel);
  if (r.weak) {
    // A fixed word count with fewer real bits than it needs: no phrase until the threshold is reached, so nothing looks safer than it is.
    const need = parseInt(lenSel, 10) * 32 / 3, more = Math.ceil((need - r.fullBits) / Math.log2(e.base.asInt));
    renderEntropyDetails(e, null, `${r.fullBits} of the ${need} bits needed for ${lenSel} words: about ${more} more ${(e.base.str === 'card' ? 'card' : e.base.str === 'base 6 (dice)' ? 'roll' : 'event') + (more === 1 ? '' : 's')}.`);
    $('phrase').value = ''; onPhraseInput(true); return;
  }
  if (!r.entBytes) {
    const hashedOk = r.fullBits >= 128;
    renderEntropyDetails(e, null, `Raw mode has ${r.bits.length} unbiased bits and needs 128 for 12 words: about ${r.needMore} more ${e.base.str === 'card' ? 'cards' : 'events'}.` + (hashedOk ? ` Or choose "12 words" above: hashing uses all ${Math.log2(e.base.asInt).toFixed(2)} bits per event and your ${r.fullBits} bits are already enough.` : ''));
    $('phrase').value = ''; onPhraseInput(true); return;
  }
  $('phrase').value = bip39.entropyToMnemonic(r.entBytes, wordlists[S.lang].words);
  renderEntropyDetails(e, r.entBytes);
  onPhraseInput(true);
}
function filteredRow(e, filtered) {
  const discarded = filtered ? ' <span class="cs">(some characters were discarded)</span>' : '';
  if (e.base.str !== 'base 6 (dice)') return e.cleanHtml + discarded;
  const hashed = $('entropyLen').value !== 'raw';
  return hashed ? `${esc(e.hashStr)} <span class="cs">(rolls as typed; this is what is hashed)</span>${discarded}` : `${e.cleanHtml} <span class="cs">(each 6 written as 0 for the raw base-6 conversion)</span>${discarded}`;
}
function renderEntropyDetails(e, entBytes, error) {
  const el = $('entropyInfo');
  if (!e || !e.binaryStr.length) { el.innerHTML = ''; setMeter('entropyStatus', error ? count(error, 'bad') : ''); return; }
  const events = e.base.events;
  const rawNoSpaces = $('entropy').value.replace(/\s/g, ''); const filtered = rawNoSpaces.length !== e.cleanStr.replace(/\s/g, '').length && e.base.asInt !== 52;
  const rows = [
    ['Time to crack', crackTime(e.binaryStr.length, events), 'sans', 'crack'],
    ['Event count', events.length, '', 'events'],
    ['Entropy type', e.base.str, 'sans', 'etype'],
    ['Bits per event', `${e.bitsPerEvent.toFixed(2)} unbiased (raw mode) · ${Math.log2(e.base.asInt).toFixed(2)} full (hashed)`, '', 'bitsper'],
    ['Raw entropy words', Math.floor(e.binaryStr.length / 32) * 3, '', 'rawwords'],
    ['Total bits', `${e.binaryStr.length} unbiased · ${Math.floor(events.length * Math.log2(e.base.asInt))} full`, '', 'totalbits'],
    ['Filtered entropy', filteredRow(e, filtered), 'html', 'filtered'],
    ['Raw binary', spaceEvery11(e.binaryStr), '', 'rawbinary'],
  ];
  if (entBytes) {
    const words = $('phrase').value.split(/\s+/); const wl = wordlists[S.lang].words;
    rows.push(['Binary checksum', checksumBits(entBytes), '', 'checksumbits'], ['Word indexes', words.map((w) => wl.indexOf(w)).join(', '), '', 'indexes']);
  }
  const tipBtn = (k) => (k ? `<button type="button" class="tip" data-tip="${k}" aria-label="What does this mean?">?</button>` : '');
  const SECRET_ROWS = new Set(['filtered', 'rawbinary', 'checksumbits', 'indexes']); // these rows are the entropy in another form
  el.innerHTML = rows.map(([k, v, m, t]) => `<dt>${esc(k)}${tipBtn(t)}</dt><dd class="${m === 'sans' ? 'sans' : ''}${SECRET_ROWS.has(t) ? ' secret' : ''}">${m === 'html' ? v : esc(v)}</dd>`).join('');
  if (error) setMeter('entropyStatus', count(error, 'bad'));
  else {
    const hashed = $('entropyLen').value !== 'raw'; const shown = hashed ? Math.floor(events.length * Math.log2(e.base.asInt)) : e.binaryStr.length;
    const auto = hashed && e.base.str === 'base 6 (dice)' && !entropyLenTouched ? ' · dice hashed the way hardware wallets do; the word count follows the Words selector' : '';
    setMeter('entropyStatus', count(`${shown} bits${hashed ? ' (hashed)' : ''}`, shown >= 128 ? 'ok' : 'warn') + note((entBytes ? `${entBytes.length * 8} bits used → ${entBytes.length * 8 * 3 / 32} words` : '') + auto));
  }
}
// When the phrase itself is the source, show its entropy in the panel.
function setEntropyFromPhrase() {
  if (!S.phraseValid) { $('entropy').value = ''; renderEntropyDetails(null); return; }
  const ent = bip39.mnemonicToEntropy(S.phraseWords.join(' '), wordlists[S.lang].words);
  $('entropy').value = hex.encode(ent); $('entropyLen').value = 'raw';
  renderEntropyDetails(entropyFromString($('entropy').value, $('entropyType').value === 'auto' ? undefined : $('entropyType').value), ent);
}
$('showEntropy').addEventListener('click', () => { const on = $('showEntropy').getAttribute('aria-pressed') !== 'true'; $('showEntropy').setAttribute('aria-pressed', on); $('entropyPanel').classList.toggle('hidden', !on); $('showEntropy').textContent = on ? 'Hide entropy details' : 'Show entropy details'; });
$('entropy').addEventListener('input', debounce(setMnemonicFromEntropy, 200));
$('entropyType').addEventListener('change', setMnemonicFromEntropy);
let entropyLenTouched = false; // once the user picks a mode, stop choosing for them
$('entropyLen').addEventListener('change', () => { entropyLenTouched = true; setMnemonicFromEntropy(); });

/* ---------------- mnemonic ---------------- */
for (const [k, v] of Object.entries(wordlists)) {
  $('lang').insertAdjacentHTML('beforeend', `<option value="${k}">${esc(v.name)}</option>`);
  $('bip85Lang').insertAdjacentHTML('beforeend', `<option value="${k}">${esc(v.name)}</option>`);
}
$('lang').addEventListener('change', () => {
  S.lang = $('lang').value;
  if (S.phraseValid) {
    try { const ent = bip39.mnemonicToEntropy(S.phraseWords.join(' '), wordlists[S.prevLang].words); $('phrase').value = bip39.entropyToMnemonic(ent, wordlists[S.lang].words); } catch (e) {}
  }
  S.prevLang = S.lang; onPhraseInput();
});
document.querySelectorAll('#wordCount button').forEach((b) => b.addEventListener('click', () => { markWordCount(+b.dataset.n); S.words = +b.dataset.n; if (!entropyLenTouched && $('entropy').value.trim() && entropyFromString($('entropy').value).base.str === 'base 6 (dice)') setMnemonicFromEntropy(); }));
function markWordCount(n) { document.querySelectorAll('#wordCount button').forEach((x) => x.setAttribute('aria-pressed', +x.dataset.n === n ? 'true' : 'false')); }
$('generateBtn').addEventListener('click', () => {
  const strength = S.words * 32 / 3;
  const data = crypto.getRandomValues(new Uint8Array(strength / 8));
  $('phrase').value = bip39.entropyToMnemonic(data, wordlists[S.lang].words);
  // Like the original: show the drawn entropy, in raw mode, so the details panel describes this phrase.
  $('entropy').value = hex.encode(data); $('entropyLen').value = 'raw';
  renderEntropyDetails(entropyFromString($('entropy').value, $('entropyType').value === 'auto' ? undefined : $('entropyType').value), data);
  onPhraseInput(true);
  setHidden(true); // a freshly generated phrase is private from the first moment
});
$('phrase').addEventListener('input', debounce(() => {
  const wasValid = S.phraseValid; onPhraseInput(false);
  // the moment a typed or pasted phrase becomes valid it is real money: hide everything private (the demo phrase stays visible)
  if (S.phraseValid && !wasValid && splitWords($('phrase').value).join(' ') !== DEMO_PHRASE) setHidden(true);
}, 220));
// Demo: the well-known BIP39 test phrase, so people can explore every feature without creating a real seed.
const DEMO_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
$('demoBtn').addEventListener('click', () => {
  $('lang').value = 'english'; S.lang = S.prevLang = 'english'; $('passphrase').value = '';
  $('phrase').value = DEMO_PHRASE; onPhraseInput(false); setHidden(false);
  toast('Demo phrase loaded: explore freely, never fund it');
});
$('passphrase').addEventListener('input', debounce(() => { S.rootFromKey = false; recompute(); }, 250));

function onPhraseInput(fromEntropy) {
  S.rootFromKey = false;
  const words = splitWords($('phrase').value);
  S.phraseWords = words; S.phraseValid = false;
  $('phraseList').classList.toggle('hidden', !words.length);
  if (!words.length) {
    $('phraseOl').innerHTML = '';
    setMeter('phraseStatus', ''); $('phrase').classList.remove('bad'); if (!fromEntropy) setEntropyFromPhrase();
    return recompute();
  }
  const detected = detectLang(words);
  if (detected && detected !== S.lang) { S.lang = detected; S.prevLang = detected; $('lang').value = detected; }
  const set = wordSet(S.lang);
  const badWords = words.filter((w) => !set.has(w));
  $('phraseOl').innerHTML = words.map((w, i) => `<li${set.has(w) ? '' : ' class="bad"'}><i>${i + 1}</i><b title="${esc(w)}">${esc(w)}</b></li>`).join('');
  $('phraseListSummary').textContent = `Show as a numbered list (${words.length} words)`;
  let msg;
  if (badWords.length) msg = count(`${badWords.length} word${badWords.length > 1 ? 's' : ''} not in the ${wordlists[S.lang].name} list`, 'bad') + note(`Not recognised: ${badWords.slice(0, 6).join(', ')}${badWords.length > 6 ? '…' : ''} (${words.length} words entered)`);
  else if (![12, 15, 18, 21, 24].includes(words.length)) msg = count(`${words.length} words`, 'bad') + note('A phrase needs 12, 15, 18, 21 or 24 words.');
  else if (!bip39.validateMnemonic(words.join(' '), wordlists[S.lang].words)) msg = count('checksum failed', 'bad') + note('The last word does not match the rest of the phrase.');
  else {
    S.phraseValid = true; markWordCount(words.length); S.words = words.length;
    msg = words.join(' ') === DEMO_PHRASE
      ? count('demo phrase', 'warn') + note('The well-known test phrase. Everyone on earth knows it, so never send coins to its addresses. Everything else on the page works normally.')
      : count('valid', 'ok') + note(`${words.length} words · ${words.length * 32 / 3} bits of entropy · ${wordlists[S.lang].name}`);
  }
  $('phrase').classList.toggle('bad', !S.phraseValid);
  setMeter('phraseStatus', msg);
  if (!fromEntropy) setEntropyFromPhrase();
  recompute();
  shamirPhraseChanged();
  $('seedQrBtn').disabled = !S.phraseValid; $('phraseCopy').disabled = !S.phraseValid;
  const hasEnt = !!$('entropy').value.trim(); $('entropyCopy').disabled = !hasEnt; $('entropyQrBtn').disabled = !hasEnt;
}

/* ---------------- seed & root ---------------- */
function recompute() {
  if (S.rootFromKey) return rebuildRoot();
  S.seed = null; S.root = null; S.rootPublicOnly = false;
  if (S.phraseValid) S.seed = bip39.mnemonicToSeedSync(S.phraseWords.join(' '), $('passphrase').value);
  rebuildRoot();
}
function rebuildRoot() {
  const n = net();
  if (!S.rootFromKey) {
    S.root = S.seed ? HDKey.fromMasterSeed(S.seed, { private: n.xprv, public: n.xpub }) : null;
    setBox('seedOut', S.seed ? hex.encode(S.seed) : '', { empty: 'Waiting for a valid phrase…' });
    S.computedRootKey = S.root ? serExt(S.root, n.xprv, true) : '';
    $('rootOut').textContent = S.computedRootKey;
    setMeter('rootStatus', '');
  } else {
    setBox('seedOut', '', { empty: 'Not applicable: the root key was entered directly.' });
  }
  renderRootInfo(); derive(); bip85();
}
function renderRootInfo() {
  const el = $('rootInfo');
  $('fpValue').textContent = S.root ? fpHex(S.root) : '—';
  // Under the phrase: the fingerprint of the phrase (plus passphrase) currently entered.
  const showFp = !!(S.root && S.phraseValid && !S.rootFromKey);
  $('phraseFp').classList.toggle('hidden', !showFp);
  if (showFp) { $('phraseFpVal').textContent = fpHex(S.root); $('phraseFpNote').textContent = $('passphrase').value ? 'with the passphrase entered below. Check it matches your wallet.' : 'Check it matches what your wallet shows.'; }
  if (!S.root) { el.innerHTML = ''; return; }
  const rows = [['Key material', S.rootPublicOnly ? 'public only: addresses and public keys, no private keys, no hardened paths' : 'private (full derivation)']];
  if (S.rootFromKey) rows.push(['Depth', S.root.depth + (S.root.depth ? ' (not a master key: paths below are relative to it)' : '')]);
  el.innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
}
$('rootOut').addEventListener('input', debounce(() => {
  const v = $('rootOut').textContent.trim();
  if (!v || v === S.computedRootKey) { if (S.rootFromKey) { S.rootFromKey = false; recompute(); } return; }
  let node = null, found = null;
  for (const ver of VERSION_TABLE) { try { node = HDKey.fromExtendedKey(v, { private: ver.private, public: ver.public }); found = ver; break; } catch (e) {} }
  if (!node) { setMeter('rootStatus', count('not a valid extended key', 'bad')); return; }
  if (found.net !== S.net) { S.net = found.net; S.coin = net().coin; $('coin').value = S.coin; $('network').value = S.net; }
  S.rootFromKey = true; S.root = node; S.rootPublicOnly = !node.privateKey; S.seed = null;
  setMeter('rootStatus', count(`using pasted ${S.rootPublicOnly ? 'public' : 'private'} key`, 'ok') + note('Edit the phrase to go back to deriving from it.'));
  rebuildRoot();
}, 300));

/* ---------------- derivation ---------------- */
document.querySelectorAll('#tabs .mode-btn').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));
function selectTab(tab) {
  S.tab = tab;
  document.querySelectorAll('#tabs .mode-btn').forEach((x) => { const on = x.dataset.tab === tab; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  $('tabHelp').textContent = TABS[tab].help;
  const std = tab !== 'custom';
  $('stdFields').classList.toggle('hidden', !std); $('customFields').classList.toggle('hidden', std);
  $('accountBlock').classList.toggle('hidden', !std); $('customDescWrap').classList.toggle('hidden', std);
  if (std) $('purpose').value = TABS[tab].purpose + "'";
  const ms = tab === 'bip48';
  $('msScriptWrap').classList.toggle('hidden', !ms); $('changeWrap').classList.toggle('hidden', ms);
  $('cosignerWrap').classList.toggle('hidden', !ms); $('descWrap').classList.toggle('hidden', ms); $('pathKeysBlock').classList.toggle('hidden', ms);
  const slip = ms ? (multisig.MS_VERSIONS[S.net][$('msScript').value] || {}).names : (std && net().slip[tab]);
  $('slipWrap').classList.toggle('hidden', !slip);
  $('msTrNote48').classList.toggle('hidden', !(ms && $('msScript').value === 'p2tr'));
  if (slip) $('slipNames').textContent = `xpub ↔ ${slip[1]}`;
  derive();
}
for (const id of ['coin', 'account', 'change']) $(id).addEventListener('input', debounce(() => { S.coin = +$('coin').value || 0; S.account = +$('account').value || 0; S.change = +$('change').value || 0; derive(); }, 200));
$('customPreset').addEventListener('change', () => { const v = $('customPreset').value; if (v !== 'custom') { $('customPath').value = v; S.customPath = v; derive(); } });
$('customPath').addEventListener('input', debounce(() => { S.customPath = $('customPath').value; $('customPreset').value = 'custom'; derive(); }, 250));
$('customScript').addEventListener('change', () => { S.customScript = $('customScript').value; derive(); });
$('slip132').addEventListener('change', () => { S.slip132 = $('slip132').checked; derive(); });
$('originBox').addEventListener('change', () => { S.origin = $('originBox').checked; derive(); });
$('msScript').addEventListener('change', () => selectTab('bip48'));

function derive() {
  const n = net(); const std = S.tab !== 'custom';
  const clear = (msg) => { for (const id of ['acctXprv', 'acctXpub', 'descRecv', 'descChange', 'pathXprv', 'pathXpub', 'descPath']) setBox(id, '', { empty: msg }); S.pathNode = null; renderRows(); };
  $('pathWarn').classList.add('hidden');
  let idx, script, acctIdx = null;
  const ms = S.tab === 'bip48';
  if (ms) { script = 'multisig'; acctIdx = [48 + H, S.coin + H, S.account + H, multisig.SCRIPT_INDEX[$('msScript').value] + H]; idx = acctIdx; }
  else if (std) { const p = TABS[S.tab].purpose; script = TABS[S.tab].script; acctIdx = [p + H, S.coin + H, S.account + H]; idx = [...acctIdx, S.change]; }
  else {
    idx = parsePath(S.customPath); script = S.customScript;
    $('customPath').classList.toggle('bad', !idx);
    if (!idx) { $('pathOut').textContent = '(invalid path)'; return clear("Invalid path. Use the form m/0'/1/2h"); }
  }
  S.script = script; S.pathIndices = idx;
  $('pathOut').textContent = pathToString(idx); $('pathLbl2').textContent = pathToString(idx);
  if (!S.root) return clear('Waiting for a root key…');
  const fp = fpHex(S.root);
  let pathNode;
  try {
    const og = S.origin && acctIdx ? `[${fp}${pathToDesc(acctIdx)}]` : ''; // the key origin, same bracket the descriptors use
    const withOg = (s) => (s ? og + s : s);
    if (ms) {
      const acct = deriveIdx(S.root, acctIdx);
      $('accountPathLbl').textContent = pathToString(acctIdx);
      const mv = S.slip132 && multisig.MS_VERSIONS[S.net][$('msScript').value]; // no SLIP-132 prefix for Taproot: xpub only
      setBox('acctXprv', withOg(serExt(acct, mv ? mv.prv : n.xprv, true)), { empty: 'Not available from a public key.' });
      setBox('acctXpub', withOg(serExt(acct, mv ? mv.pub : n.xpub, false)));
      setBox('cosignerLine', `[${fp}${pathToDesc(acctIdx)}]${serExt(acct, n.xpub, false)}`);
      S.pathNode = null; renderRows(); return;
    }
    if (std) {
      const acct = deriveIdx(S.root, acctIdx);
      $('accountPathLbl').textContent = pathToString(acctIdx);
      const slip = S.slip132 && n.slip[S.tab];
      setBox('acctXprv', withOg(serExt(acct, slip ? n[slip[0]] : n.xprv, true)), { empty: 'Not available from a public key.' });
      setBox('acctXpub', withOg(serExt(acct, slip ? n[slip[1]] : n.xpub, false)));
      const xpub = serExt(acct, n.xpub, false);
      setBox('descRecv', descriptor(script, fp, pathToDesc(acctIdx), xpub, '/0/*'));
      setBox('descChange', descriptor(script, fp, pathToDesc(acctIdx), xpub, '/1/*'));
      pathNode = acct.deriveChild(S.change);
    } else {
      pathNode = deriveIdx(S.root, idx);
      setBox('descPath', descriptor(script, fp, pathToDesc(idx), serExt(pathNode, n.xpub, false), S.hardened ? '/*h' : '/*'));
    }
    setBox('pathXprv', serExt(pathNode, n.xprv, true), { empty: 'Not available from a public key.' });
    setBox('pathXpub', serExt(pathNode, n.xpub, false));
  } catch (e) {
    $('pathWarn').querySelector('p').innerHTML = '<strong>Hardened step on a public key.</strong> This path contains a hardened step, which cannot be derived from a public key. Paste the private key (xprv) or use a non-hardened path.';
    $('pathWarn').classList.remove('hidden');
    return clear('Hardened derivation needs a private key.');
  }
  S.pathNode = pathNode;
  S.start = Math.max(0, parseInt($('startIdx').value, 10) || 0);
  renderRows();
}

/* ---------------- address table ---------------- */
document.querySelectorAll('.cols .chip').forEach((c) => c.addEventListener('click', () => {
  const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', on ? 'true' : 'false');
  $('tableWrap').classList.toggle('hidecol-' + c.dataset.col, !on);
}));
$('hardened').addEventListener('change', () => { S.hardened = $('hardened').checked; derive(); });
$('startIdx').addEventListener('input', debounce(() => { S.start = Math.max(0, parseInt($('startIdx').value, 10) || 0); renderRows(); }, 250));
$('rowCount').addEventListener('input', debounce(() => { S.count = Math.min(1000, Math.max(1, parseInt($('rowCount').value, 10) || 10)); renderRows(); }, 250));
$('moreBtn').addEventListener('click', () => { S.start += S.count; $('startIdx').value = S.start; renderRows(true); });

function renderRows(append = false) {
  const body = $('addrBody'); const token = ++S.renderToken;
  if (!append) { body.innerHTML = ''; S.rows = []; }
  const node = S.pathNode;
  $('addrNone').textContent = S.tab === 'bip48' ? 'A multisig xpub has no addresses of its own. The wallet\'s addresses are built from the xpubs of all its seeds in the Multisig wallet card below.' : 'Nothing to show yet.';
  $('addrNone').classList.toggle('hidden', !!node);
  if (!node) { setMeter('addrStatus', ''); return; }
  if (S.hardened && !node.privateKey) { setMeter('addrStatus', count('hardened children need a private key', 'bad')); return; }
  const start = S.start, cnt = S.count, n = net(), base = pathToString(S.pathIndices);
  let i = 0;
  setMeter('addrStatus', '<span class="busy"></span>');
  const step = () => {
    if (token !== S.renderToken) return;
    const frag = document.createDocumentFragment(); const t0 = performance.now();
    while (i < cnt && performance.now() - t0 < 12) {
      const k = start + i;
      const child = node.deriveChild(S.hardened ? k + H : k);
      const row = { path: `${base}/${k}${S.hardened ? "'" : ''}`, address: address(child.publicKey, S.script, n), pub: hex.encode(child.publicKey), priv: child.privateKey ? wif(child.privateKey, n) : '' };
      S.rows.push(row);
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="path col-path">${esc(row.path)}</td><td class="addr col-addr"><span data-c="${esc(row.address)}">${esc(row.address)}</span></td><td class="pub col-pub"><span data-c="${esc(row.pub)}">${esc(row.pub)}</span></td><td class="priv col-priv secret">${row.priv ? `<span data-c="${esc(row.priv)}">${esc(row.priv)}</span>` : '<span class="na">n/a</span>'}</td>`;
      frag.appendChild(tr); i++;
    }
    body.appendChild(frag);
    if (i < cnt) requestAnimationFrame(step);
    else setMeter('addrStatus', note(`${S.rows.length} rows, indexes ${S.rows[0].path.split('/').pop()} to ${S.rows[S.rows.length - 1].path.split('/').pop()}`));
  };
  requestAnimationFrame(step);
}
$('addrBody').addEventListener('click', async (e) => {
  const s = e.target.closest('span[data-c]'); if (!s) return;
  if (s.closest('.sec-hidden') && s.closest('.secret')) return;
  const isSecret = !!s.closest('.secret'); if (await copyText(s.dataset.c, isSecret)) toast(isSecret ? 'Copied · clipboard clears in 60 s' : 'Copied');
});
function csv() {
  const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  return ['path,address,public key,private key (WIF)', ...S.rows.map((r) => [r.path, r.address, r.pub, r.priv].map(q).join(','))].join('\n');
}
$('csvBtn').addEventListener('click', () => {
  if (!S.rows.length) return toast('No rows yet');
  const blob = new Blob([csv()], { type: 'text/csv' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `keypath-${S.tab}-${S.net}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$('csvCopyBtn').addEventListener('click', async () => { if (!S.rows.length) return toast('No rows yet'); if (await copyText(csv(), true)) toast('CSV copied · clipboard clears in 60 s'); });

/* ---------------- BIP85: child phrases ---------------- */
for (const id of ['bip85Lang', 'bip85Words', 'bip85Index']) $(id).addEventListener('input', bip85);
function bip85() {
  const index = Math.max(0, parseInt($('bip85Index').value, 10) || 0);
  const words = +$('bip85Words').value, lang = $('bip85Lang').value;
  const path = [83696968, 39, BIP85_LANG[lang], words, index];
  $('bip85Path').textContent = 'm' + path.map((i) => `/${i}'`).join('');
  if (!S.root || !S.root.privateKey) return setBox('bip85Out', '', { empty: 'Needs a private root key.' });
  const node = deriveIdx(S.root, path.map((i) => i + H));
  const ent = hmac(sha512, new TextEncoder().encode('bip-entropy-from-k'), node.privateKey);
  setBox('bip85Out', bip39.entropyToMnemonic(ent.slice(0, words * 4 / 3), wordlists[lang].words));
}

/* ---------------- Shamir backup (SLIP-39) ---------------- */
function shamirInit() {
  for (let i = 1; i <= 16; i++) { $('shThreshold').insertAdjacentHTML('beforeend', `<option>${i}</option>`); $('shCount').insertAdjacentHTML('beforeend', `<option>${i}</option>`); }
  $('shThreshold').value = '2'; $('shCount').value = '3';
  $('shSplit').addEventListener('click', () => shamirMode('split'));
  $('shRecover').addEventListener('click', () => shamirMode('recover'));
  $('shThreshold').addEventListener('change', () => { if (+$('shCount').value < +$('shThreshold').value) $('shCount').value = $('shThreshold').value; shamirClear(); });
  $('shCount').addEventListener('change', () => { if (+$('shThreshold').value > +$('shCount').value) $('shThreshold').value = $('shCount').value; shamirClear(); });
  $('shPass').addEventListener('input', shamirClear); $('shExt').addEventListener('change', shamirClear);
  $('shMake').addEventListener('click', shamirMake);
  $('shInput').addEventListener('input', debounce(shamirRecover, 250));
  $('shPassR').addEventListener('input', debounce(shamirRecover, 250));
  $('shUse').addEventListener('click', () => { if (!S.shRecovered) return; $('phrase').value = S.shRecovered.phrase; onPhraseInput(false); setHidden(true); $('phrase-card').scrollIntoView({ behavior: 'smooth' }); toast('Phrase loaded'); });
  document.addEventListener('click', async (e) => { const b = e.target.closest('.share .copy'); if (!b) return; if (await copyText(b.dataset.text, true)) { b.classList.add('done'); b.textContent = 'copied'; setTimeout(() => { b.classList.remove('done'); b.textContent = 'copy'; }, 1100); } });
  shamirPhraseChanged();
}
function shamirMode(m) {
  $('shSplit').setAttribute('aria-pressed', m === 'split'); $('shRecover').setAttribute('aria-pressed', m === 'recover');
  $('shamirSplit').classList.toggle('hidden', m !== 'split'); $('shamirRecover').classList.toggle('hidden', m !== 'recover');
}
function shamirClear() { $('shShares').innerHTML = ''; $('shNote').classList.add('hidden'); shamirPhraseChanged(); }
function shamirPhraseChanged() {
  $('shShares').innerHTML = ''; $('shNote').classList.add('hidden');
  const ok = S.phraseValid; $('shMake').disabled = !ok;
  setMeter('shStatus', ok ? note(`Ready to split the ${S.phraseWords.length * 32 / 3}-bit entropy behind the current phrase into ${$('shThreshold').value}-of-${$('shCount').value} shares.`) : count('enter or generate a valid phrase first', 'warn'));
}
function shamirMake() {
  if (!S.phraseValid) return;
  const t = +$('shThreshold').value, n = +$('shCount').value, pass = $('shPass').value;
  if (t === 1 && n > 1) return setMeter('shStatus', count('a threshold of 1 only makes sense as 1-of-1', 'bad') + note('With threshold 1 every share is the whole secret. Choose 2 or more.'));
  let shares;
  try { shares = slip39.generateMnemonics(t, n, bip39.mnemonicToEntropy(S.phraseWords.join(' '), wordlists[S.lang].words), pass, $('shExt').checked); }
  catch (e) { return setMeter('shStatus', count(e.message, 'bad')); }
  const info = slip39.describeShare(shares[0]);
  setMeter('shStatus', count(`${t} of ${n} shares`, 'ok') + note(`${shares[0].split(' ').length} words each · `) + `<span class="meter-note gloss" data-tip="setid">set identifier ${info.identifier}</span>` + (pass ? note(' · passphrase protected') : ''));
  $('shShares').innerHTML = `<div class="share-list">${shares.map((m, i) => `<div class="share"><button class="copy" type="button" data-text="${esc(m)}">copy</button><h4>Share ${i + 1} of ${n}<small>any ${t} recover</small></h4><ol>${m.split(' ').map((w, j) => `<li><i>${j + 1}</i><b>${esc(w)}</b></li>`).join('')}</ol></div>`).join('')}</div>
    <div class="share-actions"><button type="button" class="btn small" id="shCopyAll">Copy all shares</button><button type="button" class="btn small" id="shTest">Test recovery with these shares</button></div>`;
  $('shCopyAll').addEventListener('click', async () => { if (await copyText(shares.map((m, i) => `Share ${i + 1} of ${n} (${t} needed): ${m}`).join('\n'), true)) toast('All shares copied · clipboard clears in 60 s'); });
  $('shTest').addEventListener('click', () => { $('shInput').value = shares.slice(0, t).join('\n'); $('shPassR').value = pass; shamirMode('recover'); shamirRecover(); });
  $('shNote').classList.remove('hidden');
}
function shamirRecover() {
  const wasRecovered = !!S.shRecovered;
  S.shRecovered = null; $('shUse').classList.add('hidden');
  const lines = $('shInput').value.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const clear = (msg, cls = 'bad') => { setBox('shRecHex', '', { empty: 'Paste enough shares above.' }); setBox('shRecPhrase', ''); $('shRecLang').textContent = ''; setMeter('shRecStatus', msg ? count(msg, cls) : ''); };
  if (!lines.length) return clear('');
  const good = [], bad = [];
  lines.forEach((l, i) => { try { good.push(slip39.describeShare(l)); } catch (e) { bad.push(`line ${i + 1}: ${e.message}`); } });
  if (bad.length) return clear(bad[0]);
  const need = good[0].memberThreshold, ids = new Set(good.map((g) => g.identifier));
  if (ids.size > 1) return clear('These shares come from different sets (different identifiers) and cannot be combined.');
  const distinct = new Set(good.map((g) => `${g.groupIndex}/${g.index}`)).size;
  if (good[0].groupCount === 1 && distinct < need) return clear(`${distinct} of ${need} shares so far. Paste ${need - distinct} more.`, 'warn');
  let ent;
  try { ent = slip39.combineMnemonics(lines, $('shPassR').value); } catch (e) { return clear(e.message); }
  if (![16, 20, 24, 28, 32].includes(ent.length)) return clear(`Recovered a ${ent.length * 8}-bit secret, which is not a BIP39 entropy size.`);
  const phrase = bip39.entropyToMnemonic(ent, wordlists[S.lang].words);
  S.shRecovered = { phrase };
  if (!wasRecovered && phrase !== DEMO_PHRASE) setHidden(true); // a freshly recovered phrase is private from the first moment
  setMeter('shRecStatus', count('recovered', 'ok') + note(`${ent.length * 8} bits from ${distinct} shares (set ${good[0].identifier}). A wrong share passphrase gives a different, valid-looking phrase, so check it against what you expect.`));
  setBox('shRecHex', hex.encode(ent)); setBox('shRecPhrase', phrase); $('shRecLang').textContent = wordlists[S.lang].name;
  $('shUse').classList.remove('hidden');
}

/* ---------------- Seed QR ---------------- */
let qrFormat = 'standard';
let qrMode = 'seed'; // 'seed' (SeedQR of the phrase), 'entropy' (typed entropy as text), 'msseed' (SeedQR of a generated multisig seed), 'text' (a public value as text)
let qrTextData = null; // for 'text': { text }
let qrSeedData = null; // for 'msseed': { words, wl, fp }
const QR_NOTES = {
  seed: 'Scan with SeedSigner, Krux, Sparrow, Passport or any wallet that reads SeedQR. <strong>This code is your entire phrase.</strong> Anyone who photographs it owns your coins.',
  entropy: 'The entropy exactly as typed, as a plain text QR code, for moving it to another device. <strong>This code is the seed of your phrase.</strong> Anyone who photographs it owns your coins.',
  msseed: 'Scan with SeedSigner, Krux, Sparrow, Passport or any wallet that reads SeedQR. <strong>This code is this seed in full.</strong> Anyone who photographs it holds one of the wallet\'s seeds.',
  text: 'This is public information: it can watch, never spend. Scan it where the other wallet asks for it.',
};
function qrOpen(mode, opts = {}) {
  qrMode = mode;
  $('qrTitle').textContent = opts.title || (mode === 'seed' ? 'Seed QR' : 'Entropy QR'); $('qrNote').innerHTML = QR_NOTES[mode]; $('qrFormats').classList.toggle('hidden', mode !== 'seed' && mode !== 'msseed');
  if (mode === 'seed') seedQrRender(); else if (mode === 'msseed') msSeedQrRender(); else if (mode === 'text') textQrRender(); else entropyQrRender();
  document.querySelector('.qr-stage').classList.toggle('covered', opts.secret !== false); // public codes open in the clear
  $('qrModal').hidden = false; $('qrModal').querySelector('[data-close]:not(.modal-backdrop)').focus();
}
function seedQrOpen() { if (S.phraseValid) qrOpen('seed'); }
// SVG for the modal: paulmillr/qr, error correction L, 2-module quiet zone. Returns the module count too.
function qrSvg(text, opts) {
  const o = { ecc: 'low', border: 2, ...opts };
  return { svg: encodeQR(text, 'svg', o), modules: encodeQR(text, 'raw', o).length - 2 * o.border }; // raw output includes the quiet zone
}
const latin1 = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');
const latin1Encoder = (t) => Uint8Array.from(t, (c) => c.charCodeAt(0));
function entropyQrRender() {
  const text = $('entropy').value.trim();
  const q = qrSvg(text, {});
  $('qrWrap').innerHTML = q.svg;
  $('qrFoot').textContent = `${text.length} characters as text · ${q.modules}×${q.modules}`;
  $('qrFp').innerHTML = '';
}
function renderSeedQr(words, wl, fpLine) {
  const idx = words.map((w) => wl.indexOf(w));
  const q = qrFormat === 'standard'
    ? qrSvg(idx.map((i) => String(i).padStart(4, '0')).join(''), { encoding: 'numeric' })
    : qrSvg(latin1(bip39.mnemonicToEntropy(words.join(' '), wl)), { encoding: 'byte', textEncoder: latin1Encoder });
  $('qrWrap').innerHTML = q.svg;
  $('qrFoot').textContent = qrFormat === 'standard' ? `${words.length} words as ${words.length * 4} digits · ${q.modules}×${q.modules}` : `${words.length * 32 / 3 / 8} raw entropy bytes · ${q.modules}×${q.modules}`;
  $('qrFp').innerHTML = fpLine;
  $('qrStd').setAttribute('aria-pressed', qrFormat === 'standard'); $('qrCompact').setAttribute('aria-pressed', qrFormat !== 'standard');
}
function seedQrRender() { renderSeedQr(S.phraseWords, wordlists[S.lang].words, S.root ? `Master fingerprint${$('passphrase').value ? ' (with your passphrase)' : ''}<b>${esc(fpHex(S.root))}</b>` : ''); }
function msSeedQrRender() { renderSeedQr(qrSeedData.words, qrSeedData.wl, `Fingerprint<b>${esc(qrSeedData.fp)}</b>`); }
function textQrRender() {
  const q = qrSvg(qrTextData.text, {});
  $('qrWrap').innerHTML = q.svg;
  $('qrFoot').textContent = `${qrTextData.text.length} characters as text · ${q.modules}×${q.modules}`;
  $('qrFp').innerHTML = '';
}
// any element with data-qr shows the named box's public value as a QR code
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-qr]'); if (!b) return;
  const el = $(b.dataset.qr); const v = (el.dataset.value || el.value || '').trim();
  if (!v) return toast('Nothing to show yet');
  qrTextData = { text: v };
  qrOpen('text', { title: b.dataset.qrtitle, secret: false });
});
// each generated multisig seed has its own SeedQR
document.addEventListener('click', (e) => {
  const b = e.target.closest('#msGen .qr'); if (!b) return;
  const share = b.closest('.share');
  const words = splitWords(share.querySelector('.copy').dataset.text);
  qrSeedData = { words, wl: wordlists[detectLang(words) || 'english'].words, fp: b.dataset.fp };
  qrOpen('msseed', { title: `${share.querySelector('h4').firstChild.textContent} · SeedQR` });
});
$('seedQrBtn').addEventListener('click', seedQrOpen);
$('entropyQrBtn').addEventListener('click', () => { if ($('entropy').value.trim()) qrOpen('entropy'); });
$('entropyCopy').addEventListener('click', async () => {
  const b = $('entropyCopy'), v = $('entropy').value.trim(); if (!v) return;
  if (await copyText(v, true)) { b.classList.add('done'); toast('Entropy copied; the clipboard is cleared in 60 seconds'); setTimeout(() => b.classList.remove('done'), 1100); }
});
$('entropy').addEventListener('input', () => { const has = !!$('entropy').value.trim(); $('entropyCopy').disabled = !has; $('entropyQrBtn').disabled = !has; });
$('phraseCopy').addEventListener('click', async () => {
  const b = $('phraseCopy');
  if (await copyText(S.phraseWords.join(wordlists[S.lang].sep || ' '), true)) { b.classList.add('done'); toast('Phrase copied; the clipboard is cleared in 60 seconds'); setTimeout(() => b.classList.remove('done'), 1100); }
});
$('qrReveal').addEventListener('click', () => document.querySelector('.qr-stage').classList.remove('covered'));
$('qrHide').addEventListener('click', () => document.querySelector('.qr-stage').classList.add('covered'));
$('qrStd').addEventListener('click', () => { qrFormat = 'standard'; qrMode === 'msseed' ? msSeedQrRender() : seedQrRender(); });
$('qrCompact').addEventListener('click', () => { qrFormat = 'compact'; qrMode === 'msseed' ? msSeedQrRender() : seedQrRender(); });
$('qrModal').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { $('qrModal').hidden = true; $('qrWrap').innerHTML = ''; } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('qrModal').hidden) { $('qrModal').hidden = true; $('qrWrap').innerHTML = ''; } });

/* ---------------- multisig wallet (BIP48 / BIP67 / descriptors) ---------------- */
let msLast = null, msKeysSeen = '', msDemoKeys = null, msModeV = 'build';
// Restore: seeds typed in directly, each derived at m/48'/coin'/account'/script'. Returns { cosigners, errors }.
function msSeedCosigners(text, script, account) {
  const cosigners = [], errors = [], netc = net();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim().toLowerCase(); if (!line) return;
    const words = line.split(/\s+/);
    if (![12, 15, 18, 21, 24].includes(words.length)) { errors.push(`seed line ${i + 1}: a seed has 12, 15, 18, 21 or 24 words (this line has ${words.length})`); return; }
    const lang = detectLang(words);
    if (!lang || !bip39.validateMnemonic(words.join(' '), wordlists[lang].words)) { errors.push(`seed line ${i + 1}: not a valid seed (check every word and the last one, which carries the checksum)`); return; }
    const root = HDKey.fromMasterSeed(bip39.mnemonicToSeedSync(words.join(wordlists[lang].sep || ' '), ''), { private: netc.xprv, public: netc.xpub });
    const c = multisig.cosignerFromNode(root, [48 + H, netc.coin + H, account + H, multisig.SCRIPT_INDEX[script] + H]);
    cosigners.push({ ...c, net: S.net, source: `seed line ${i + 1}` });
  });
  return { cosigners, errors };
}
// Two exclusive panels: build (paste xpubs, new or existing wallet) and gen (generate every seed here).
// Everything in the card back to its empty state: keys, seeds, name, address check, policy.
function msReset() {
  $('msKeys').value = ''; $('msSeeds').value = ''; $('msAccount').value = '0'; msGenCover(false); $('msGen').innerHTML = ''; $('msGenEye').classList.add('hidden');
  $('msName').value = 'KeyPath multisig'; $('msThreshold').value = '2'; $('msGenCount').value = '3'; $('msGenWords').value = '12'; $('msScript2').value = 'p2wsh';
  msDemoKeys = null; msKeysSeen = '';
}
function msMode(m) {
  if (m !== msModeV) msReset(); // a fresh slate for each panel
  msModeV = m;
  for (const [id, v] of [['msModeBuild', 'build'], ['msModeRestore', 'restore']]) $(id).setAttribute('aria-pressed', m === v);
  const card = $('multisig-card');
  for (const v of ['build', 'restore']) card.querySelectorAll('.ms-' + v).forEach((el) => el.classList.toggle('hidden', !el.classList.contains('ms-' + m)));
  msUpdate();
}
function msInit() {
  for (const [id, v] of [['msModeBuild', 'build'], ['msModeRestore', 'restore']]) $(id).addEventListener('click', () => msMode(v));
  $('msSeeds').addEventListener('input', debounce(msUpdate, 250)); $('msAccount').addEventListener('input', debounce(msUpdate, 250));
  for (let i = 1; i <= 15; i++) $('msThreshold').insertAdjacentHTML('beforeend', `<option>${i}</option>`);
  $('msThreshold').value = '2';
  $('msKeys').addEventListener('input', debounce(msUpdate, 250));
  for (const id of ['msThreshold', 'msScript2', 'msChain']) $(id).addEventListener('change', msUpdate);
  $('msName').addEventListener('input', debounce(msUpdate, 250)); // the setup file follows the name as it is typed
  $('msRows').addEventListener('input', debounce(msUpdate, 250));
  $('cosignerToMs').addEventListener('click', () => {
    const line = $('cosignerLine').dataset.value; if (!line) return toast('Enter a phrase first');
    if ($('msKeys').value.includes(line)) { toast('Already in the list'); }
    else { if (msModeV !== 'build') msMode('build'); $('msKeys').value = ($('msKeys').value.trim() ? $('msKeys').value.trim() + '\n' : '') + line; $('msScript2').value = $('msScript').value; msUpdate(); toast('Xpub added to the multisig wallet'); }
    $('multisig-card').scrollIntoView({ behavior: 'smooth' });
  });
  $('msDownload').addEventListener('click', () => {
    if (!msLast) return;
    const blob = new Blob([msLast.config], { type: 'text/plain' }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${msLast.name.replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase() || 'multisig'}.txt`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('msAddrBody').addEventListener('click', async (e) => { const sp = e.target.closest('span[data-c]'); if (sp && (await copyText(sp.dataset.c))) toast('Copied'); });
  $('network').addEventListener('change', msUpdate);
  for (let i = 2; i <= 15; i++) $('msGenCount').insertAdjacentHTML('beforeend', `<option>${i}</option>`);
  $('msGenCount').value = '3';
  $('msGenBtn').addEventListener('click', () => msGenerate(false));
  $('msDemoBtn').addEventListener('click', () => msGenerate(true));
  for (const id of ['msClearBtn', 'msClearBtn2']) $(id).addEventListener('click', () => { msReset(); msUpdate(); toast('Multisig wallet cleared'); });
  $('msGenEye').addEventListener('click', () => msGenCover(!$('msGen').classList.contains('covered')));
  $('msGenCount').addEventListener('change', () => { if (+$('msThreshold').value > +$('msGenCount').value) $('msThreshold').value = $('msGenCount').value; msUpdate(); });
  document.addEventListener('click', async (e) => { const b = e.target.closest('#msGen .copy'); if (!b) return; if (await copyText(b.dataset.text, true)) { b.classList.add('done'); b.textContent = 'copied'; setTimeout(() => { b.classList.remove('done'); b.textContent = 'copy'; }, 1100); } });
  document.addEventListener('click', (e) => { const b = e.target.closest('#msGen .reveal'); if (!b) return; const s = b.closest('.share'); msShareCover(s, !s.classList.contains('covered')); msGenEyeSync(); });
  msMode('build');
}
// The generated phrases have their own cover, independent of the page-wide Hide private info, so revealing
// the page (for example with the demo phrase) never exposes them by accident.
function msGenCover(on) { for (const s of $('msGen').querySelectorAll('.share')) msShareCover(s, on); msGenEyeSync(); }
function msShareCover(share, on) {
  share.classList.toggle('covered', on);
  const b = share.querySelector('.reveal'); b.setAttribute('aria-pressed', on); b.textContent = on ? 'reveal' : 'hide';
}
// "covered" on #msGen means every seed is covered; the strip button reveals all when it holds, hides all when it does not
function msGenEyeSync() {
  const shares = $('msGen').querySelectorAll('.share');
  const all = shares.length > 0 && [...shares].every((s) => s.classList.contains('covered'));
  $('msGen').classList.toggle('covered', all);
  const b = $('msGenEye'); b.setAttribute('aria-pressed', all); b.lastChild.textContent = all ? 'Reveal seeds' : 'Hide seeds';
}
// A complete wallet: one fresh phrase per cosigner, keys filled in, threshold kept sensible.
// demo: the well-known all-"abandon" test phrases (entropy 0, 1, 2 … so each ends in a different checksum word), shown unblurred.
function msGenerate(demo) {
  const n = +$('msGenCount').value, words = +$('msGenWords').value, script = $('msScript2').value, netc = net();
  const H = 0x80000000, wl = demo ? wordlists.english.words : wordlists[S.lang].words, cosigners = [];
  for (let i = 0; i < n; i++) {
    const ent = new Uint8Array(words * 4 / 3); if (demo) ent[ent.length - 1] = i; else crypto.getRandomValues(ent);
    const phrase = bip39.entropyToMnemonic(ent, wl);
    const root = HDKey.fromMasterSeed(bip39.mnemonicToSeedSync(phrase, ''), { private: netc.xprv, public: netc.xpub });
    const c = multisig.cosignerFromNode(root, [48 + H, netc.coin + H, 0 + H, multisig.SCRIPT_INDEX[script] + H]);
    cosigners.push({ phrase, fp: c.fp, node: c.node, line: `[${c.fp}${c.path}]${serExt(c.node, netc.xpub, false)}` });
  }
  const t = Math.min(Math.max(1, +$('msThreshold').value || 2), n); // the policy chosen above, clamped to the number of seeds
  $('msThreshold').value = String(t);
  $('msName').value = `KeyPath ${demo ? 'demo ' : ''}${t}-of-${n}`;
  $('msKeys').value = cosigners.map((c) => c.line).join('\n'); msDemoKeys = demo ? $('msKeys').value : null;
  $('msGen').innerHTML = `<div class="share-list">${cosigners.map((c, i) => `<div class="share"><button class="copy" type="button" data-text="${esc(c.phrase)}">copy</button><button class="reveal" type="button" aria-pressed="true">reveal</button><button class="qr" type="button" data-fp="${esc(c.fp)}" aria-label="Show this seed as a QR code"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v2M17 20h4M14 20h1"/></svg></button><h4>Seed ${i + 1} of ${n}<small>fingerprint ${esc(c.fp)}</small></h4><ol>${c.phrase.split(' ').map((w, j) => `<li><i>${j + 1}</i><b>${esc(w)}</b></li>`).join('')}</ol></div>`).join('')}</div>`;
  msGenCover(!demo); $('msGenEye').classList.remove('hidden');
  msUpdate(); setHidden(!demo); // demo phrases are public: reveal the page, like the phrase card's demo does
  toast(demo ? 'Demo wallet loaded: explore freely, never fund it' : `${n} seeds created and hidden`);
}
function msUpdate() {
  msLast = null; $('msOut').classList.add('hidden'); $('msWarnings').innerHTML = '';
  $('msTrNote').classList.toggle('hidden', $('msScript2').value !== 'p2tr');
  const text = $('msKeys').value, seedText = msModeV === 'restore' ? $('msSeeds').value : '';
  const account = Math.max(0, parseInt($('msAccount').value, 10) || 0);
  $('msPathLbl').textContent = `m/48'/${net().coin}'/${account}'/${multisig.SCRIPT_INDEX[$('msScript2').value]}'`;
  if (!text.trim() && !seedText.trim()) {
    const msg = msModeV === 'restore' ? 'Waiting for the wallet\'s seeds, xpubs or setup file.' : 'Waiting for the xpubs: paste them from each device, or press Create the seeds here.';
    setMeter('msStatus', note(msg)); return;
  }
  const parsed = multisig.parseCosigners(text, VERSION_TABLE);
  const fromSeeds = msSeedCosigners(seedText, $('msScript2').value, account);
  // a seed and its own xpub both entered count once
  const seedKeys = new Set(fromSeeds.cosigners.map((c) => multisig.serExt(c.node, 0, false)));
  const dup = parsed.cosigners.filter((c) => seedKeys.has(multisig.serExt(c.node, 0, false))).length;
  parsed.cosigners = [...fromSeeds.cosigners, ...parsed.cosigners.filter((c) => !seedKeys.has(multisig.serExt(c.node, 0, false)))];
  parsed.errors = [...fromSeeds.errors, ...parsed.errors];
  if (dup) parsed.errors.push(`${dup === 1 ? 'one xpub line is' : dup + ' xpub lines are'} the xpub of a seed entered above, so it is counted once (level: note)`);
  if (parsed.meta.threshold) $('msThreshold').value = String(parsed.meta.threshold);
  if (text !== msKeysSeen) { msKeysSeen = text; if (parsed.cosigners.length >= 2 && parsed.cosigners.length <= 15) $('msGenCount').value = String(parsed.cosigners.length); } // "of N" follows newly pasted keys, but never overrides a later choice
  if (parsed.meta.script) $('msScript2').value = parsed.meta.script;
  if (parsed.meta.name && $('msName').value === 'KeyPath multisig') $('msName').value = parsed.meta.name;
  const threshold = +$('msThreshold').value, script = $('msScript2').value, cos = parsed.cosigners, n = net();
  $('msTrNote').classList.toggle('hidden', script !== 'p2tr');
  const problems = [...parsed.errors.map((e) => (e.endsWith('(level: note)') ? { level: 'warn', text: e.replace(' (level: note)', '.') } : { level: 'bad', text: e })), ...multisig.validate(threshold, cos, S.net)];
  $('msWarnings').innerHTML = problems.map((p) => `<div class="inputwarn${p.level === 'bad' ? ' bad' : ''}"><p>${esc(p.text)}</p></div>`).join('');
  if (problems.some((p) => p.level === 'bad')) { setMeter('msStatus', count(`${cos.length} key${cos.length === 1 ? '' : 's'} read`, 'bad')); return; }
  const d = multisig.buildDescriptors(threshold, cos, script, n.xpub);
  const name = $('msName').value.trim() || 'KeyPath multisig';
  const config = multisig.coldcardConfig(name, threshold, cos, script, n.xpub);
  msLast = { config, name };
  setBox('msDesc', d.combined); setBox('msDescRecv', d.receive); setBox('msDescChange', d.change); setBox('msConfig', config);
  const chain = +$('msChain').value, rows = Math.min(100, Math.max(1, parseInt($('msRows').value, 10) || 5));
  const demo = text.trim() === msDemoKeys;
  $('msAddrBody').innerHTML = Array.from({ length: rows }, (_, i) => { const a = multisig.multisigAddress(threshold, cos, script, chain, i, n); return `<tr><td class="idx">${chain}/${i}</td><td><span data-c="${esc(a)}">${esc(a)}</span></td></tr>`; }).join('');
  const nS = fromSeeds.cosigners.length, nX = cos.length - nS;
  const what = msModeV === 'restore' ? `rebuilt from ${nS ? nS + ' seed' + (nS === 1 ? '' : 's') : ''}${nS && nX ? ' and ' : ''}${nX ? nX + ' xpub' + (nX === 1 ? '' : 's') : ''}` : demo || $('msGen').children.length ? `built from the ${cos.length} seeds created here` : `built from the ${cos.length} pasted xpubs`;
  setMeter('msStatus', count(`${threshold} of ${cos.length} · ${multisig.MS_FORMAT[script]} · ${S.net === 'mainnet' ? 'mainnet' : 'testnet'}${demo ? ' · demo' : ''}`, demo ? 'warn' : 'ok') + note(demo ? `Demo wallet ${what}, from the public test seeds: explore it, never fund it.` : `Wallet ${what}.`));
  $('msOut').classList.remove('hidden');
}

/* ---------------- multisig lab: what do you need to keep? ---------------- */
function labInit() {
  const netc = NETS.mainnet, H2 = 0x80000000;
  const seeds = [0, 1, 2].map((k) => {
    const ent = new Uint8Array(16); ent[15] = k;
    const phrase = bip39.entropyToMnemonic(ent, wordlists.english.words);
    const root = HDKey.fromMasterSeed(bip39.mnemonicToSeedSync(phrase, ''), { private: netc.xprv, public: netc.xpub });
    const c = multisig.cosignerFromNode(root, [48 + H2, 0 + H2, 0 + H2, 2 + H2]);
    return { phrase, fp: c.fp, node: c.node, xpub: serExt(c.node, netc.xpub, false) };
  });
  const target = multisig.multisigAddress(2, seeds, 'p2wsh', 0, 0, netc);
  $('labRows').innerHTML = seeds.map((sd, i) => `<tr><td><strong>Seed ${i + 1}</strong><small>abandon × 11, ${esc(sd.phrase.split(' ').pop())}</small><span class="xk" data-lab-xk="${i}"></span></td><td><label><input type="checkbox" data-lab-seed="${i}"> the 12 words<small>fingerprint ${esc(sd.fp)}</small></label></td><td><label><input type="checkbox" data-lab-xpub="${i}"> its xpub<small>${esc(sd.xpub.slice(0, 12))}…</small></label></td></tr>`).join('');
  const have = () => ({ seed: [0, 1, 2].map((i) => $('labRows').querySelector(`[data-lab-seed="${i}"]`).checked), xpub: [0, 1, 2].map((i) => $('labRows').querySelector(`[data-lab-xpub="${i}"]`).checked), def: $('labDef').checked });
  const YES = '<span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-7"/></svg></span>';
  const NO = '<span class="mark"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/></svg></span>';
  const box = (level, tag, html) => `<div class="limit verdict ${level}">${level === 'good' ? YES : level === 'no' ? NO : '<span class="mark"></span>'}<span class="lm-tag">${tag}</span><p>${html}</p></div>`;
  const update = (e) => {
    // a seed implies its xpub: the xpub box follows the seed box and is greyed out while the seed is ticked
    [0, 1, 2].forEach((i) => { const sd = $('labRows').querySelector(`[data-lab-seed="${i}"]`), xp = $('labRows').querySelector(`[data-lab-xpub="${i}"]`); if (sd.checked || (e && e.target === sd)) xp.checked = sd.checked; xp.disabled = sd.checked; });
    const h = have();
    const known = seeds.map((_, i) => h.def || h.seed[i] || h.xpub[i]);
    const how = seeds.map((_, i) => (h.seed[i] ? 'comes from its seed' : h.def ? 'comes from the definition' : h.xpub[i] ? 'was kept on its own' : 'is missing'));
    const nSeeds = h.seed.filter(Boolean).length, nKnown = known.filter(Boolean).length, missing = seeds.map((_, i) => i).filter((i) => !known[i]);
    const canFind = nKnown === 3, canSpend = canFind && nSeeds >= 2;
    seeds.forEach((_, i) => { const el = $('labRows').querySelector(`[data-lab-xk="${i}"]`); el.className = 'xk ' + (known[i] ? 'ok' : 'bad'); el.textContent = known[i] ? '✓ xpub known' : '✗ xpub missing'; });
    let out = box('', 'Xpubs known', `<strong>${nKnown} of 3</strong> are known. ` + seeds.map((_, i) => `Seed ${i + 1}'s xpub ${how[i]}`).join('. ') + '.');
    if (canFind) out += box('good', 'Find the coins', `<strong>Yes.</strong> All three xpubs are known, so the wallet's addresses can be rebuilt. First address: <code>${esc(target)}</code>`);
    else {
      let alt = '';
      if (nKnown >= 2) { const partial = seeds.filter((_, i) => known[i]); alt = ` Building a wallet from only the ${nKnown} xpubs you have gives <code>${esc(multisig.multisigAddress(Math.min(2, nKnown), partial, 'p2wsh', 0, 0, netc))}</code>: a different wallet, with no coins in it.`; }
      out += box('no', 'Find the coins', `<strong>No.</strong> The xpub of seed ${missing.map((i) => i + 1).join(' and seed ')} is unknown, so the wallet's addresses cannot be rebuilt and the coins cannot even be located.${alt}`);
    }
    if (canSpend) out += box('good', 'Spend', `<strong>Yes.</strong> ${nSeeds} of 3 seeds can sign, and the wallet can be rebuilt. Enter the seeds into wallets, load the definition, and spend.`);
    else if (!canFind && nSeeds >= 2) out += box('no', 'Spend', `<strong>No.</strong> ${nSeeds} seeds are enough to sign, but the wallet cannot be rebuilt, so there is nothing to sign.`);
    else out += box('no', 'Spend', `<strong>No.</strong> ${nSeeds === 0 ? 'No seed' : 'Only 1 seed'} present; 2 of 3 must sign.${nSeeds === 0 && canFind ? ' Xpubs alone can only watch the coins, never move them.' : ''}`);
    if (!canSpend) {
      const fixes = [];
      if (missing.length) fixes.push(`the xpub of seed ${missing.map((i) => i + 1).join(' and of seed ')} (its 12 words would do, since an xpub derives from its seed) or else the wallet definition`);
      if (nSeeds < 2) fixes.push(`${2 - nSeeds} more seed${2 - nSeeds > 1 ? 's' : ''}`);
      out += box('', 'To recover', `You still need ${fixes.join(', and ')}.`);
    }
    out += box('', 'Lesson', 'Keep the wallet definition with every seed backup. Then any 2 of the 3 seeds, plus that one public file, recover the wallet.');
    $('labVerdict').innerHTML = out;
    // the scenario button matching the current boxes stays highlighted
    // (an xpub implied by its seed is ignored on both sides, since ticking a seed ticks its xpub)
    const norm = (spec) => { const [sd, xp, df] = spec.split('|'); const S = sd.split(','), X = xp.split(','); return S.join(',') + '|' + X.map((v, i) => (S[i] === '1' ? '0' : v)).join(',') + '|' + df; };
    const cur = norm([h.seed, h.xpub].map((a) => a.map((v) => (v ? '1' : '0')).join(',')).join('|') + '|' + (h.def ? '1' : '0'));
    $('lab-card').querySelectorAll('[data-lab]').forEach((b) => b.setAttribute('aria-pressed', norm(b.dataset.lab) === cur));
  };
  const set = (spec) => { const [sd, xp, df] = spec.split('|'); sd.split(',').forEach((v, i) => { $('labRows').querySelector(`[data-lab-seed="${i}"]`).checked = v === '1'; }); xp.split(',').forEach((v, i) => { $('labRows').querySelector(`[data-lab-xpub="${i}"]`).checked = v === '1'; }); $('labDef').checked = df === '1'; update(); };
  $('lab-card').addEventListener('change', update);
  $('lab-card').querySelectorAll('[data-lab]').forEach((b) => b.addEventListener('click', () => set(b.dataset.lab)));
  $('labClear').addEventListener('click', () => set('0,0,0|0,0,0|0'));
  set('0,0,0|0,0,0|0');
}

/* ---------------- tooltips & definitions ---------------- */
const GLOSS = window.KEYPATH_GLOSSARY || {};
function initTips() {
  const box = $('tipBox'); let pinned = null, current = null;
  const show = (el) => {
    if (document.documentElement.classList.contains('no-tips')) return;
    const g = GLOSS[el.dataset.tip]; if (!g) return;
    current = el; box.innerHTML = `<strong>${esc(g.t)}</strong>${esc(g.d)}`; box.hidden = false;
    const r = el.getBoundingClientRect(); const bw = box.offsetWidth, bh = box.offsetHeight;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), innerWidth - bw - 8);
    let top = r.bottom + 8; if (top + bh > innerHeight - 8) top = r.top - bh - 8;
    box.style.left = left + 'px'; box.style.top = Math.max(8, top) + 'px';
  };
  const hide = () => { box.hidden = true; current = null; if (pinned) { pinned.removeAttribute('aria-expanded'); pinned = null; } };
  // On touch there is no hover: only the "?" buttons open tips (tap to pin, tap again or elsewhere to close).
  document.addEventListener('pointerover', (e) => { if (pinned) return; const el = e.target.closest('[data-tip]'); if (!el || el === current) return; if (e.pointerType === 'touch' && !el.classList.contains('tip')) return; show(el); });
  document.addEventListener('pointerout', (e) => { if (pinned) return; const el = e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest('.tip[data-tip]'); if (el && !pinned) show(el); });
  document.addEventListener('focusout', (e) => { if (!pinned && e.target.closest && e.target.closest('.tip[data-tip]')) hide(); });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.tip[data-tip]');
    if (el) { e.preventDefault(); if (pinned === el) { hide(); return; } if (pinned) pinned.removeAttribute('aria-expanded'); pinned = el; el.setAttribute('aria-expanded', 'true'); show(el); return; }
    if (pinned) hide();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  $('tipsBtn').setAttribute('aria-pressed', !document.documentElement.classList.contains('no-tips'));
  $('tipsBtn').querySelector('span:last-child').textContent = document.documentElement.classList.contains('no-tips') ? 'Tooltips off' : 'Tooltips on';
  $('tipsBtn').addEventListener('click', () => {
    const off = document.documentElement.classList.toggle('no-tips'); hide();
    $('tipsBtn').setAttribute('aria-pressed', !off); $('tipsBtn').querySelector('span:last-child').textContent = off ? 'Tooltips off' : 'Tooltips on'; try { localStorage.setItem('keypath-tips', off ? 'off' : 'on'); } catch (e) {}
    toast(off ? 'Tooltips off' : 'Tooltips on');
  });
  addEventListener('scroll', () => { if (!box.hidden) hide(); }, { passive: true });
  // Definitions list, generated from the same glossary (deduplicated by title).
  const seen = new Set();
  $('defList').innerHTML = Object.values(GLOSS).filter((g) => !seen.has(g.t) && seen.add(g.t)).sort((a, b) => a.t.localeCompare(b.t)).map((g) => `<div><dt>${esc(g.t)}</dt><dd>${esc(g.d)}</dd></div>`).join('');
}

/* ---------------- session hygiene ---------------- */
function wipeAll() {
  for (const id of ['phrase', 'passphrase', 'entropy', 'shPass', 'shInput', 'shPassR', 'msKeys', 'msSeeds']) $(id).value = ''; $('msGen').innerHTML = ''; msUpdate();
  $('rootOut').textContent = ''; S.rootFromKey = false; S.seed = null; S.root = null; S.shRecovered = null;
  onPhraseInput(false); shamirClear(); shamirRecover();
  $('qrModal').hidden = true; $('qrWrap').innerHTML = '';
}
// Leaving the page (navigation, tab close, back/forward cache) wipes every secret from the DOM.
addEventListener('pagehide', wipeAll);
// Five minutes without activity re-blurs private values; nothing is deleted.
let idleTimer;
function idleReset() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!allHidden()) { setHidden(true); toast('Private info hidden after 5 minutes idle'); } }, 5 * 60 * 1000);
}
for (const ev of ['pointerdown', 'keydown', 'scroll', 'input']) addEventListener(ev, idleReset, { passive: true });
idleReset();
// Connection indicator. navigator.onLine can say "online" without real internet, but "offline" is reliable.
function netStatus() {
  const off = navigator.onLine === false; const el = $('netStatus');
  el.hidden = false; el.classList.toggle('off', off);
  $('netStatusText').textContent = off ? 'This computer is offline. Good.' : 'This computer is connected to a network. For real funds, disconnect before generating or entering a seed phrase.';
}
addEventListener('online', netStatus); addEventListener('offline', netStatus); netStatus();

/* ---------------- init ---------------- */
$('coin').value = S.coin;
selectTab('bip84');
shamirInit();
msInit(); labInit();
initTips();
window.KEYPATH = { S, address, descriptor, descChecksum, serExt, taprootOutputKey, parsePath, entropyFromString, entropyBits, crackTime };
})();
