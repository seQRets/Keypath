// Entropy input handling. Event encodings follow iancoleman/bip39 entropy.js (MIT).
// When a word count is chosen, dice rolls are hashed exactly as typed (digits 1-6),
// the convention hardware wallets that accept dice follow.
import { sha256 } from '@noble/hashes/sha2.js';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- entropy (ported from iancoleman/bip39 entropy.js) ---------------- */
// Each event maps to a variable-length bit string so that non-power-of-two
// sources (dice, base 10, cards) are debiased the same way the original tool does.
export const EVENT_BITS = {
  binary: { 0: '0', 1: '1' },
  'base 6': { 0: '00', 1: '01', 2: '10', 3: '11', 4: '0', 5: '1' },
  'base 6 (dice)': { 0: '00', 1: '01', 2: '10', 3: '11', 4: '0', 5: '1' },
  'base 10': { 0: '000', 1: '001', 2: '010', 3: '011', 4: '100', 5: '101', 6: '110', 7: '111', 8: '0', 9: '1' },
  hexadecimal: Object.fromEntries('0123456789abcdef'.split('').map((c, i) => [c, i.toString(2).padStart(4, '0')])),
  card: (() => { const t = {}; const ranks = 'a23456789tjqk', suits = 'cdhs'; let i = 0;
    for (const s of suits) for (const r of ranks) { t[r + s] = i < 32 ? i.toString(2).padStart(5, '0') : i < 48 ? (i - 32).toString(2).padStart(4, '0') : (i - 48).toString(2).padStart(2, '0'); i++; }
    return t; })(),
};
export const MATCHERS = {
  binary: (s) => s.match(/[0-1]/gi) || [], base6: (s) => s.match(/[0-5]/gi) || [], dice: (s) => s.match(/[1-6]/gi) || [],
  base10: (s) => s.match(/[0-9]/gi) || [], hex: (s) => s.match(/[0-9A-F]/gi) || [], card: (s) => s.match(/([A2-9TJQK][CDHS])/gi) || [],
};
export function getBase(str, baseStr) {
  const auto = !baseStr;
  const bin = MATCHERS.binary(str), hx = MATCHERS.hex(str);
  if ((bin.length === hx.length && hx.length > 0 && auto) || baseStr === 'binary') return { events: bin, asInt: 2, bitsPerEvent: 1, str: 'binary' };
  const card = MATCHERS.card(str);
  if ((card.length >= hx.length / 2 && auto) || baseStr === 'card') return { events: card, asInt: 52, bitsPerEvent: (32 * 5 + 16 * 4 + 4 * 2) / 52, str: 'card' };
  const dice = MATCHERS.dice(str);
  if ((dice.length === hx.length && hx.length > 0 && auto) || baseStr === 'dice') return { events: dice, asInt: 6, bitsPerEvent: (4 * 2 + 2 * 1) / 6, str: 'dice' };
  const b6 = MATCHERS.base6(str);
  if ((b6.length === hx.length && hx.length > 0 && auto) || baseStr === 'base 6') return { events: b6, asInt: 6, bitsPerEvent: (4 * 2 + 2 * 1) / 6, str: 'base 6' };
  const b10 = MATCHERS.base10(str);
  if ((b10.length === hx.length && hx.length > 0 && auto) || baseStr === 'base 10') return { events: b10, asInt: 10, bitsPerEvent: (8 * 3 + 2 * 1) / 10, str: 'base 10' };
  return { events: hx, asInt: 16, bitsPerEvent: 4, str: 'hexadecimal' };
}
export function entropyFromString(raw, baseStr) {
  const base = getBase(raw, baseStr);
  let hashStr; // what a word count feeds to SHA-256
  if (base.str === 'dice') {
    hashStr = base.events.join(''); // the rolls as typed, 1-6: the hardware-wallet convention
    base.events = base.events.map((c) => ('12345'.includes(c) ? c : '0')); // Coleman's base-6 remap, used by raw mode
    base.str = 'base 6 (dice)';
  }
  if (!base.events.length) return { binaryStr: '', cleanStr: '', cleanHtml: '', hashStr: '', base, bitsPerEvent: base.bitsPerEvent };
  const binaryStr = base.events.map((e) => EVENT_BITS[base.str][e.toLowerCase()]).join('');
  let cleanStr = base.events.join(''), cleanHtml = esc(cleanStr);
  if (base.asInt === 52) {
    const up = base.events.join(' ').toUpperCase();
    cleanStr = up.replace(/C/g, '♣').replace(/D/g, '♦').replace(/H/g, '♥').replace(/S/g, '♠');
    cleanHtml = esc(up).replace(/C/g, "<span class='club'>♣</span>").replace(/D/g, "<span class='diamond'>♦</span>").replace(/H/g, "<span class='heart'>♥</span>").replace(/S/g, "<span class='spade'>♠</span>");
  }
  return { binaryStr, cleanStr, cleanHtml, hashStr: hashStr ?? cleanStr, base, bitsPerEvent: base.bitsPerEvent };
}

const hexOf = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
// Turn parsed entropy into BIP39 entropy bytes for the chosen mode.
// lenSel: 'raw' (Coleman's unbiased bits, trailing, no hash) or a word count (SHA-256 of hashStr, leading bits).
export function entropyBits(e, lenSel) {
  const fullBits = Math.floor(e.base.events.length * Math.log2(e.base.asInt));
  let bits = e.binaryStr, weak = false;
  const hashed = lenSel !== 'raw';
  if (hashed) {
    const n = parseInt(lenSel, 10) * 32 / 3;
    bits = BigInt('0x' + hexOf(sha256(new TextEncoder().encode(e.hashStr)))).toString(2).padStart(256, '0').substring(0, n);
    weak = n > fullBits;
  }
  const usable = Math.min(256, Math.floor(bits.length / 32) * 32);
  if (usable < 128) return { hashed, bits, fullBits, usable, weak, entBytes: null, needMore: Math.ceil((128 - bits.length) / e.bitsPerEvent) };
  const bin = bits.substring(bits.length - usable);
  const entBytes = new Uint8Array(usable / 8); for (let i = 0; i < entBytes.length; i++) entBytes[i] = parseInt(bin.substring(i * 8, i * 8 + 8), 2);
  return { hashed, bits, fullBits, usable, weak, entBytes, needMore: 0 };
}
