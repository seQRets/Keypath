// Multisig wallet helpers: parse cosigner keys, build sortedmulti descriptors and
// Coldcard config text, and derive P2WSH / P2SH-P2WSH addresses (BIP48, BIP67).
import { HDKey } from '@scure/bip32';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { base58check as mkBase58check, bech32 } from '@scure/base';

const base58check = mkBase58check(sha256);
const hash160 = (b) => ripemd160(sha256(b));
const concat = (...arrs) => { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
const H = 0x80000000;
const fpHex = (node) => node.fingerprint.toString(16).padStart(8, '0');

// SLIP-132 multisig prefixes.
export const MS_VERSIONS = {
  mainnet: { p2wsh: { prv: 0x02aa7a99, pub: 0x02aa7ed3, names: ['Zprv', 'Zpub'] }, 'p2sh-p2wsh': { prv: 0x0295b005, pub: 0x0295b43f, names: ['Yprv', 'Ypub'] } },
  testnet: { p2wsh: { prv: 0x02575048, pub: 0x02575483, names: ['Vprv', 'Vpub'] }, 'p2sh-p2wsh': { prv: 0x024285b5, pub: 0x024289ef, names: ['Uprv', 'Upub'] } },
};
export const SCRIPT_INDEX = { p2wsh: 2, 'p2sh-p2wsh': 1 }; // BIP48 script_type level

export function serExt(node, version, priv) {
  if (priv && !node.privateKey) return null;
  const b = new Uint8Array(78); const dv = new DataView(b.buffer);
  dv.setUint32(0, version); b[4] = node.depth; dv.setUint32(5, node.parentFingerprint); dv.setUint32(9, node.index);
  b.set(node.chainCode, 13);
  if (priv) { b[45] = 0; b.set(node.privateKey, 46); } else b.set(node.publicKey, 45);
  return base58check.encode(b);
}
// Decode any extended key whose version is in `table` ([{net, private, public}]). Returns { node, net, isPrivate }.
export function decodeExtended(str, table) {
  for (const v of table) { try { const node = HDKey.fromExtendedKey(str.trim(), { private: v.private, public: v.public }); return { node, net: v.net, isPrivate: !!node.privateKey }; } catch (e) {} }
  return null;
}
const pathToH = (idx) => idx.map((i) => '/' + (i >= H ? (i - H) + 'h' : i)).join('');
export function parsePathStr(str) {
  const parts = str.replace(/^m/, '').split('/').filter(Boolean); const out = [];
  for (const p of parts) { const m = /^(\d+)(['hH])?$/.exec(p); if (!m) return null; out.push(parseInt(m[1], 10) + (m[2] ? H : 0)); }
  return out;
}
// A cosigner record from this page's own key.
export function cosignerFromNode(rootNode, pathIdx) {
  const acct = pathIdx.reduce((n, i) => n.deriveChild(i), rootNode);
  return { fp: fpHex(rootNode), path: pathToH(pathIdx), node: acct.wipePrivateData ? publicOnly(acct) : acct, source: 'this page' };
}
function publicOnly(node) { return HDKey.fromExtendedKey(node.publicExtendedKey, node.versions); }

// Parse pasted cosigner text. Accepts, one per line:
//   [fingerprint/48h/0h/0h/2h]xpub...      key with origin (what wallets export)
//   xpub... / Zpub... / tpub... / Vpub...  bare key (origin unknown)
//   Coldcard config lines: "Derivation: m/48'/0'/0'/2'", "Policy: 2 of 3", "Format: P2WSH", "<fp>: <xpub>", comments (#)
export function parseCosigners(text, table) {
  const cosigners = [], errors = [], meta = {}; let curPath = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim(); if (!line || line.startsWith('#')) return;
    const kv = /^([A-Za-z][A-Za-z ]*|[0-9a-fA-F]{8}):\s*(.+)$/.exec(line);
    if (kv) {
      const k = kv[1].trim().toLowerCase(), v = kv[2].trim();
      if (k === 'derivation') { curPath = parsePathStr(v); if (!curPath) errors.push(`line ${i + 1}: cannot read derivation path`); return; }
      if (k === 'policy') { const m = /(\d+)\s*of\s*(\d+)/i.exec(v); if (m) meta.threshold = +m[1]; return; }
      if (k === 'format') { const f = v.toUpperCase(); meta.script = f === 'P2WSH' ? 'p2wsh' : f.includes('P2SH') ? 'p2sh-p2wsh' : undefined; return; }
      if (k === 'name') { meta.name = v; return; }
      if (/^[0-9a-f]{8}$/i.test(k)) { const d = decodeExtended(v, table); if (!d) { errors.push(`line ${i + 1}: not a valid extended key`); return; } cosigners.push({ fp: k.toLowerCase(), path: curPath ? pathToH(curPath) : '', node: d.isPrivate ? publicOnly(d.node) : d.node, net: d.net, isPrivate: d.isPrivate, source: `line ${i + 1}` }); return; }
      errors.push(`line ${i + 1}: unrecognised "${kv[1]}:" line`); return;
    }
    const m = /^(?:\[([0-9a-fA-F]{8})((?:\/[0-9]+['hH]?)*)\])?\s*([A-Za-z0-9]{100,120})(\/.*)?$/.exec(line);
    if (!m) {
      const words = line.split(/\s+/).length;
      if (words >= 12 && /^[a-z\s]+$/i.test(line)) errors.push(`line ${i + 1}: that looks like a recovery phrase. Never paste phrases here; paste each cosigner's public xpub line instead (the BIP48 tab makes yours).`);
      else errors.push(`line ${i + 1}: not a cosigner xpub`);
      return;
    }
    const d = decodeExtended(m[3], table); if (!d) { errors.push(`line ${i + 1}: not a valid extended key (check the prefix and for typos)`); return; }
    const pathIdx = m[2] ? parsePathStr(m[2]) : (curPath || null);
    cosigners.push({ fp: m[1] ? m[1].toLowerCase() : fpHex(d.node), path: pathIdx ? pathToH(pathIdx) : '', originKnown: !!m[1], node: d.isPrivate ? publicOnly(d.node) : d.node, net: d.net, isPrivate: d.isPrivate, source: `line ${i + 1}`, trailing: m[4] || '' });
  });
  return { cosigners, errors, meta };
}

// Descriptor checksum (Bitcoin Core).
const INPUT_CHARSET = "0123456789()[],'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#\"\\ ";
const CHECKSUM_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function polymod(c, val) { const c0 = c >> 35n; c = ((c & 0x7ffffffffn) << 5n) ^ BigInt(val); if (c0 & 1n) c ^= 0xf5dee51989n; if (c0 & 2n) c ^= 0xa9fdca3312n; if (c0 & 4n) c ^= 0x1bab10e32dn; if (c0 & 8n) c ^= 0x3706b1677an; if (c0 & 16n) c ^= 0x644d626ffdn; return c; }
export function descChecksum(s) {
  let c = 1n, cls = 0, n = 0;
  for (const ch of s) { const pos = INPUT_CHARSET.indexOf(ch); if (pos < 0) return ''; c = polymod(c, pos & 31); cls = cls * 3 + (pos >> 5); if (++n === 3) { c = polymod(c, cls); cls = 0; n = 0; } }
  if (n > 0) c = polymod(c, cls);
  for (let j = 0; j < 8; j++) c = polymod(c, 0);
  c ^= 1n; let r = ''; for (let j = 0; j < 8; j++) r += CHECKSUM_CHARSET[Number((c >> (5n * BigInt(7 - j))) & 31n)];
  return r;
}
const withChecksum = (d) => d + '#' + descChecksum(d);

// Build descriptors. xpubVersion: the plain xpub/tpub version for the network (descriptors never use SLIP-132 prefixes).
export function buildDescriptors(threshold, cosigners, script, xpubVersion) {
  const key = (c, tail) => `[${c.fp}${c.path}]${serExt(c.node, xpubVersion, false)}${tail}`;
  const inner = (tail) => `sortedmulti(${threshold},${cosigners.map((c) => key(c, tail)).join(',')})`;
  const wrap = (s) => (script === 'p2wsh' ? `wsh(${s})` : `sh(wsh(${s}))`);
  return { combined: withChecksum(wrap(inner('/<0;1>/*'))), receive: withChecksum(wrap(inner('/0/*'))), change: withChecksum(wrap(inner('/1/*'))) };
}

// BIP67-sorted k-of-n script and its address.
export function multisigScript(threshold, pubkeys) {
  const sorted = [...pubkeys].sort((a, b) => { for (let i = 0; i < 33; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
  return concat(new Uint8Array([0x50 + threshold]), ...sorted.map((p) => concat(new Uint8Array([0x21]), p)), new Uint8Array([0x50 + sorted.length, 0xae]));
}
export function multisigAddress(threshold, cosigners, script, chain, index, net) {
  const pubs = cosigners.map((c) => c.node.deriveChild(chain).deriveChild(index).publicKey);
  const redeem = multisigScript(threshold, pubs);
  const wsh = sha256(redeem);
  if (script === 'p2wsh') return bech32.encode(net.hrp, [0, ...bech32.toWords(wsh)]);
  return base58check.encode(concat(new Uint8Array([net.p2sh]), hash160(concat(new Uint8Array([0x00, 0x20]), wsh))));
}

// Coldcard / generic multisig config text (also imported by Sparrow, Nunchuk, Keystone, Passport).
export function coldcardConfig(name, threshold, cosigners, script, xpubVersion) {
  const paths = new Set(cosigners.map((c) => c.path));
  const fmtPath = (p) => 'm' + p.replace(/h/g, "'");
  const lines = [`# ${name}`, `Name: ${name.slice(0, 20)}`, `Policy: ${threshold} of ${cosigners.length}`];
  if (paths.size === 1 && cosigners[0].path) lines.push(`Derivation: ${fmtPath(cosigners[0].path)}`);
  lines.push(`Format: ${script === 'p2wsh' ? 'P2WSH' : 'P2SH-P2WSH'}`, '');
  for (const c of cosigners) { if (paths.size > 1 && c.path) lines.push(`Derivation: ${fmtPath(c.path)}`); lines.push(`${c.fp}: ${serExt(c.node, xpubVersion, false)}`); }
  return lines.join('\n') + '\n';
}

// Sanity checks; returns a list of { level: 'bad'|'warn', text }.
export function validate(threshold, cosigners, netName) {
  const out = [];
  if (cosigners.length < 2) out.push({ level: 'bad', text: 'A multisig wallet needs at least two cosigner keys.' });
  if (cosigners.length > 15) out.push({ level: 'bad', text: 'At most 15 cosigners.' });
  if (threshold < 1 || threshold > cosigners.length) out.push({ level: 'bad', text: `The threshold must be between 1 and the number of cosigners (${cosigners.length}).` });
  const seen = new Set();
  for (const c of cosigners) { const k = serExt(c.node, 0, false); if (seen.has(k)) out.push({ level: 'bad', text: 'The same key appears twice. Each cosigner must contribute a different key.' }); seen.add(k); }
  if (cosigners.some((c) => c.net && c.net !== netName)) out.push({ level: 'bad', text: `A key belongs to a different network than the one selected (${netName}).` });
  if (cosigners.some((c) => c.isPrivate)) out.push({ level: 'warn', text: 'A private extended key was pasted. Only its public part is used here; never share the private one.' });
  if (cosigners.some((c) => c.originKnown === false)) out.push({ level: 'warn', text: 'A key was pasted without its origin ([fingerprint/path]). The descriptor uses the key\'s own fingerprint, so a hardware wallet may not recognise it as its key. Paste the full origin line the device exports if you can.' });
  if (cosigners.some((c) => c.node.depth !== 4 && c.node.depth !== 0)) out.push({ level: 'warn', text: 'A key is not at the usual account depth (four levels, like m/48\'/0\'/0\'/2\'). Check it is the multisig account key the wallet exported.' });
  if (threshold === 1 && cosigners.length > 1) out.push({ level: 'warn', text: '1-of-N means any single cosigner can spend alone.' });
  if (threshold === cosigners.length && cosigners.length > 1) out.push({ level: 'warn', text: 'N-of-N means losing any one key loses the wallet. Most people choose 2-of-3 or 3-of-5.' });
  return out;
}
