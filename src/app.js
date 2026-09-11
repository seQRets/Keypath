(() => {
'use strict';
const { bip39, wordlists, HDKey, secp256k1, schnorr, sha256, sha512, hmac, base58check, bech32, bech32m, hex, slip39, qrcode } = BTC;
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

const TABS = {
  bip44: { purpose: 44, script: 'p2pkh', help: 'Legacy pay-to-pubkey-hash. Addresses start with 1 (m or n on testnet). Understood by every wallet ever written, but transactions cost the most in fees.' },
  bip49: { purpose: 49, script: 'p2sh-p2wpkh', help: 'SegWit wrapped inside a P2SH script so that older wallets can pay to it. Addresses start with 3 (2 on testnet).' },
  bip84: { purpose: 84, script: 'p2wpkh', help: 'Native SegWit (P2WPKH). Addresses start with bc1q (tb1q on testnet). The default in most wallets today, with lower fees than legacy.' },
  bip86: { purpose: 86, script: 'p2tr', help: 'Single-key Taproot (P2TR). Addresses start with bc1p (tb1p on testnet), spend with Schnorr signatures and are the cheapest, most private single-signature type. Supported by Bitcoin Core 22+, Sparrow, Ledger, Trezor and BlueWallet among others.' },
  custom: { purpose: null, script: null, help: 'Any BIP32 path with the script type of your choice. This covers what the original tool split across its BIP32 and BIP141 tabs.' },
};
const SCRIPT_NAMES = { p2pkh: 'P2PKH (legacy)', 'p2sh-p2wpkh': 'P2WPKH in P2SH', p2wpkh: 'P2WPKH (native SegWit)', p2tr: 'P2TR (Taproot)' };
const BIP85_LANG = { english: 0, japanese: 1, korean: 2, spanish: 3, simplifiedChinese: 4, traditionalChinese: 5, french: 6, italian: 7, czech: 8, portuguese: 9 };

/* ---------------- state ---------------- */
const S = {
  net: 'mainnet', lang: 'english', prevLang: 'english', words: 12,
  phraseWords: [], phraseValid: false, seed: null,
  root: null, rootFromKey: false, rootPublicOnly: false, computedRootKey: '',
  tab: 'bip84', account: 0, change: 0, coin: 0, customPath: "m/0'/0", customScript: 'p2wpkh', slip132: false,
  pathNode: null, pathIndices: null, script: 'p2wpkh',
  hardened: false, start: 0, count: 20, rows: [], renderToken: 0,
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
function themeLabel() { $('themeBtn').querySelector('span').textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'Light mode' : 'Dark mode'; }
$('themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  try { localStorage.setItem('keypath-theme', cur); } catch (e) {}
  themeLabel();
});
themeLabel();
function setHidden(on) {
  $('hideSecrets').setAttribute('aria-pressed', on); document.documentElement.classList.toggle('hide-secrets', on);
  const label = on ? 'Reveal private info' : 'Hide private info';
  $('hideSecrets').querySelector('span').textContent = label;
  $('menuHide').setAttribute('aria-pressed', on); $('menuHide').querySelector('span').textContent = label;
}
$('hideSecrets').addEventListener('click', () => setHidden($('hideSecrets').getAttribute('aria-pressed') !== 'true'));
$('menuHide').addEventListener('click', () => setHidden(!document.documentElement.classList.contains('hide-secrets')));
function menuOpen(open) { $('menuBtn').setAttribute('aria-expanded', open); $('menuPanel').hidden = !open; }
$('menuBtn').addEventListener('click', () => menuOpen($('menuPanel').hidden));
document.addEventListener('click', (e) => { if (!$('menuPanel').hidden && !e.target.closest('#menuWrap')) menuOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('menuPanel').hidden) menuOpen(false); });
$('menuPanel').querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menuOpen(false)));
$('fpValue').addEventListener('click', async () => { if (S.root && (await copyText(fpHex(S.root)))) toast('Fingerprint copied'); });
$('phraseFpVal').addEventListener('click', async () => { if (S.root && (await copyText(fpHex(S.root)))) toast('Fingerprint copied'); });
$('clearBtn').addEventListener('click', () => {
  for (const id of ['phrase', 'passphrase', 'entropy', 'shPass', 'shInput', 'shPassR']) $(id).value = '';
  $('entropyLen').value = 'raw'; $('entropyType').value = 'auto'; entropyLenTouched = false; $('entropyWeak').classList.add('hidden'); $('startIdx').value = '0';
  S.rootFromKey = false; $('rootOut').textContent = '';
  onPhraseInput(false); shamirClear(); shamirRecover(); toast('Cleared');
});
$('network').addEventListener('change', () => { S.net = $('network').value; S.coin = net().coin; $('coin').value = S.coin; rebuildRoot(); });
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy'); if (!btn) return;
  const el = $(btn.dataset.copy); const v = el.dataset.value || '';
  if (!v) return toast('Nothing to copy');
  if (document.documentElement.classList.contains('hide-secrets') && el.classList.contains('secret')) return toast('Private info is hidden');
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
function setMnemonicFromEntropy() {
  const raw = $('entropy').value;
  const typeSel = $('entropyType').value;
  const e = entropyFromString(raw, typeSel === 'auto' ? undefined : typeSel);
  // Until the user picks a mode, dice get hashed the way hardware wallets do (word count from the Words selector); everything else stays raw.
  if (!entropyLenTouched && e.binaryStr.length) { const want = e.base.str === 'base 6 (dice)' ? String(S.words) : 'raw'; if ($('entropyLen').value !== want) $('entropyLen').value = want; }
  const lenSel = $('entropyLen').value;
  $('entropyWeak').classList.add('hidden');
  $('diceRawNote').classList.toggle('hidden', !(lenSel === 'raw' && e.base.str === 'base 6 (dice)' && e.binaryStr.length));
  if (!e.binaryStr.length) { $('phrase').value = ''; renderEntropyDetails(e, null); onPhraseInput(true); return; }
  const r = entropyBits(e, lenSel);
  $('entropyWeak').classList.toggle('hidden', !r.weak);
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
  el.innerHTML = rows.map(([k, v, m, t]) => `<dt>${esc(k)}${tipBtn(t)}</dt><dd class="${m === 'sans' ? 'sans' : ''}">${m === 'html' ? v : esc(v)}</dd>`).join('');
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
$('entropy').addEventListener('change', () => { if (S.phraseValid) setHidden(true); });
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
  $('entropy').value = hex.encode(data); $('entropyLen').value = 'raw'; $('entropyWeak').classList.add('hidden');
  renderEntropyDetails(entropyFromString($('entropy').value, $('entropyType').value === 'auto' ? undefined : $('entropyType').value), data);
  onPhraseInput(true);
  setHidden(true); // a freshly generated phrase is private from the first moment
});
$('phrase').addEventListener('input', debounce(() => onPhraseInput(false), 220));
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
  else { S.phraseValid = true; msg = count('valid', 'ok') + note(`${words.length} words · ${words.length * 32 / 3} bits of entropy · ${wordlists[S.lang].name}`); markWordCount(words.length); S.words = words.length; }
  $('phrase').classList.toggle('bad', !S.phraseValid);
  setMeter('phraseStatus', msg);
  if (!fromEntropy) setEntropyFromPhrase();
  recompute();
  shamirPhraseChanged();
  $('seedQrBtn').disabled = !S.phraseValid;
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
  const slip = std && net().slip[tab];
  $('slipWrap').classList.toggle('hidden', !slip);
  if (slip) $('slipNames').textContent = slip.join(' / ');
  derive();
}
for (const id of ['coin', 'account', 'change']) $(id).addEventListener('input', debounce(() => { S.coin = +$('coin').value || 0; S.account = +$('account').value || 0; S.change = +$('change').value || 0; derive(); }, 200));
$('customPreset').addEventListener('change', () => { const v = $('customPreset').value; if (v !== 'custom') { $('customPath').value = v; S.customPath = v; derive(); } });
$('customPath').addEventListener('input', debounce(() => { S.customPath = $('customPath').value; $('customPreset').value = 'custom'; derive(); }, 250));
$('customScript').addEventListener('change', () => { S.customScript = $('customScript').value; derive(); });
$('slip132').addEventListener('change', () => { S.slip132 = $('slip132').checked; derive(); });

function derive() {
  const n = net(); const std = S.tab !== 'custom';
  const clear = (msg) => { for (const id of ['acctXprv', 'acctXpub', 'descRecv', 'descChange', 'pathXprv', 'pathXpub', 'descPath']) setBox(id, '', { empty: msg }); S.pathNode = null; renderRows(); };
  $('pathWarn').classList.add('hidden');
  let idx, script, acctIdx = null;
  if (std) { const p = TABS[S.tab].purpose; script = TABS[S.tab].script; acctIdx = [p + H, S.coin + H, S.account + H]; idx = [...acctIdx, S.change]; }
  else {
    idx = parsePath(S.customPath); script = S.customScript;
    $('customPath').classList.toggle('bad', !idx);
    if (!idx) { $('pathOut').textContent = '(invalid path)'; return clear("Invalid path. Use the form m/0'/1/2h"); }
  }
  S.script = script; S.pathIndices = idx;
  $('pathOut').textContent = pathToString(idx); $('pathLbl2').textContent = pathToString(idx);
  $('addrTypeNote').textContent = SCRIPT_NAMES[script];
  if (!S.root) return clear('Waiting for a root key…');
  const fp = fpHex(S.root);
  let pathNode;
  try {
    if (std) {
      const acct = deriveIdx(S.root, acctIdx);
      $('accountPathLbl').textContent = pathToString(acctIdx);
      const slip = S.slip132 && n.slip[S.tab];
      setBox('acctXprv', serExt(acct, slip ? n[slip[0]] : n.xprv, true), { empty: 'Not available from a public key.' });
      setBox('acctXpub', serExt(acct, slip ? n[slip[1]] : n.xpub, false));
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
$('rowCount').addEventListener('input', debounce(() => { S.count = Math.min(1000, Math.max(1, parseInt($('rowCount').value, 10) || 20)); renderRows(); }, 250));
$('moreBtn').addEventListener('click', () => { S.start += S.count; $('startIdx').value = S.start; renderRows(true); });

function renderRows(append = false) {
  const body = $('addrBody'); const token = ++S.renderToken;
  if (!append) { body.innerHTML = ''; S.rows = []; }
  const node = S.pathNode;
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
  if (document.documentElement.classList.contains('hide-secrets') && s.closest('.secret')) return;
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

/* ---------------- BIP85 ---------------- */
for (const id of ['bip85App', 'bip85Lang', 'bip85Words', 'bip85Bytes', 'bip85Index']) $(id).addEventListener('input', bip85);
function bip85() {
  const app = $('bip85App').value;
  $('bip85LangWrap').classList.toggle('hidden', app !== 'bip39'); $('bip85WordsWrap').classList.toggle('hidden', app !== 'bip39'); $('bip85BytesWrap').classList.toggle('hidden', app !== 'hex');
  const index = Math.max(0, parseInt($('bip85Index').value, 10) || 0);
  const words = +$('bip85Words').value, lang = $('bip85Lang').value, nbytes = Math.min(64, Math.max(16, parseInt($('bip85Bytes').value, 10) || 32));
  const path = { bip39: [83696968, 39, BIP85_LANG[lang], words, index], wif: [83696968, 2, index], xprv: [83696968, 32, index], hex: [83696968, 128169, nbytes, index] }[app];
  $('bip85Path').textContent = 'm' + path.map((i) => `/${i}'`).join('');
  if (!S.root || !S.root.privateKey) return setBox('bip85Out', '', { empty: 'Needs a private root key.' });
  const node = deriveIdx(S.root, path.map((i) => i + H));
  const ent = hmac(sha512, new TextEncoder().encode('bip-entropy-from-k'), node.privateKey);
  const n = net(); let out;
  if (app === 'bip39') out = bip39.entropyToMnemonic(ent.slice(0, words * 4 / 3), wordlists[lang].words);
  else if (app === 'wif') out = wif(ent.slice(0, 32), n);
  else if (app === 'xprv') out = base58check.encode(concat(new Uint8Array([(n.xprv >>> 24) & 255, (n.xprv >>> 16) & 255, (n.xprv >>> 8) & 255, n.xprv & 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]), ent.slice(0, 32), new Uint8Array([0]), ent.slice(32, 64)));
  else out = hex.encode(ent.slice(0, nbytes));
  setBox('bip85Out', out);
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
  document.addEventListener('click', async (e) => { const b = e.target.closest('.share .copy'); if (!b) return; if (document.documentElement.classList.contains('hide-secrets')) return toast('Private info is hidden'); if (await copyText(b.dataset.text, true)) { b.classList.add('done'); b.textContent = 'copied'; setTimeout(() => { b.classList.remove('done'); b.textContent = 'copy'; }, 1100); } });
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
  $('shCopyAll').addEventListener('click', async () => { if (document.documentElement.classList.contains('hide-secrets')) return toast('Private info is hidden'); if (await copyText(shares.map((m, i) => `Share ${i + 1} of ${n} (${t} needed): ${m}`).join('\n'), true)) toast('All shares copied · clipboard clears in 60 s'); });
  $('shTest').addEventListener('click', () => { $('shInput').value = shares.slice(0, t).join('\n'); $('shPassR').value = pass; shamirMode('recover'); shamirRecover(); });
  $('shNote').classList.remove('hidden');
}
function shamirRecover() {
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
  setMeter('shRecStatus', count('recovered', 'ok') + note(`${ent.length * 8} bits from ${distinct} shares (set ${good[0].identifier}). A wrong share passphrase gives a different, valid-looking phrase, so check it against what you expect.`));
  setBox('shRecHex', hex.encode(ent)); setBox('shRecPhrase', phrase); $('shRecLang').textContent = wordlists[S.lang].name;
  $('shUse').classList.remove('hidden');
}

/* ---------------- Seed QR ---------------- */
let qrFormat = 'standard';
function seedQrOpen() {
  if (!S.phraseValid) return;
  seedQrRender(); document.querySelector('.qr-stage').classList.add('covered'); $('qrModal').hidden = false; $('qrModal').querySelector('[data-close]:not(.modal-backdrop)').focus();
}
function seedQrRender() {
  const wl = wordlists[S.lang].words; const idx = S.phraseWords.map((w) => wl.indexOf(w));
  const qr = qrcode(0, 'L');
  if (qrFormat === 'standard') qr.addData(idx.map((i) => String(i).padStart(4, '0')).join(''), 'Numeric');
  else { const ent = bip39.mnemonicToEntropy(S.phraseWords.join(' '), wl); qr.addData(Array.from(ent, (b) => String.fromCharCode(b)).join(''), 'Byte'); }
  qr.make();
  $('qrWrap').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  $('qrFoot').textContent = qrFormat === 'standard' ? `${S.phraseWords.length} words as ${S.phraseWords.length * 4} digits · version ${qr.getModuleCount()}×${qr.getModuleCount()}` : `${S.phraseWords.length * 32 / 3 / 8} raw entropy bytes · version ${qr.getModuleCount()}×${qr.getModuleCount()}`;
  $('qrFp').innerHTML = S.root ? `Master fingerprint${$('passphrase').value ? ' (with your passphrase)' : ''}<b>${esc(fpHex(S.root))}</b>` : '';
  $('qrStd').setAttribute('aria-pressed', qrFormat === 'standard'); $('qrCompact').setAttribute('aria-pressed', qrFormat !== 'standard');
}
$('seedQrBtn').addEventListener('click', seedQrOpen);
$('qrReveal').addEventListener('click', () => document.querySelector('.qr-stage').classList.remove('covered'));
$('qrStd').addEventListener('click', () => { qrFormat = 'standard'; seedQrRender(); });
$('qrCompact').addEventListener('click', () => { qrFormat = 'compact'; seedQrRender(); });
$('qrModal').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { $('qrModal').hidden = true; $('qrWrap').innerHTML = ''; } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('qrModal').hidden) { $('qrModal').hidden = true; $('qrWrap').innerHTML = ''; } });

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
  for (const id of ['phrase', 'passphrase', 'entropy', 'shPass', 'shInput', 'shPassR']) $(id).value = '';
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
  idleTimer = setTimeout(() => { if (!document.documentElement.classList.contains('hide-secrets')) { setHidden(true); toast('Private info hidden after 5 minutes idle'); } }, 5 * 60 * 1000);
}
for (const ev of ['pointerdown', 'keydown', 'scroll', 'input']) addEventListener(ev, idleReset, { passive: true });
idleReset();
// Connection indicator. navigator.onLine can say "online" without real internet, but "offline" is reliable.
function netStatus() {
  const off = navigator.onLine === false; const el = $('netStatus');
  el.hidden = false; el.classList.toggle('off', off);
  $('netStatusText').textContent = off ? 'This computer is offline. Good.' : 'This computer is connected to a network. For real funds, disconnect before generating or entering a phrase.';
}
addEventListener('online', netStatus); addEventListener('offline', netStatus); netStatus();

/* ---------------- init ---------------- */
$('coin').value = S.coin;
selectTab('bip84');
shamirInit();
initTips();
window.KEYPATH = { S, address, descriptor, descChecksum, serExt, taprootOutputKey, parsePath, entropyFromString, entropyBits, crackTime };
})();
