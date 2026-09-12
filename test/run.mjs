// Test vectors for KeyPath. Run with `npm test` (builds first, then checks dist/lib.bundle.js).
import { readFileSync } from 'node:fs';
import * as btcSigner from '@scure/btc-signer'; // test-only reference implementation, not bundled
const BTC = new Function(readFileSync(new URL('../dist/lib.bundle.js', import.meta.url), 'utf8') + '; return BTC;')();
const { bip39, wordlists, HDKey, schnorr, secp256k1, hash160, base58check, bech32, bech32m, hex, slip39, entropy, multisig } = BTC;
const en = wordlists.english.words;
let pass = 0, fail = 0;
const check = (name, got, want) => { if (got === want) pass++; else { fail++; console.log(`FAIL ${name}\n  got:  ${got}\n  want: ${want}`); } };

/* ---- dice entropy: hardware-wallet convention when a word count is chosen ---- */
const phraseFrom = (rolls, len, type) => { const e = entropy.entropyFromString(rolls, type); const r = entropy.entropyBits(e, len); return r.entBytes ? bip39.entropyToMnemonic(r.entBytes, en) : null; };
const A = '5455166441346642362333165523212234151363253263223232553225134324163321663414';
check('A dice 12 words', phraseFrom(A, '12'), 'youth spot place private target office ice spike brave ginger improve shy');
check('A dice 15 words', phraseFrom(A, '15'), 'youth spot place private target office ice spike brave ginger improve shop security awesome rather');
check('A dice 18 words', phraseFrom(A, '18'), 'youth spot place private target office ice spike brave ginger improve shop security awesome raw melt charge beef');
check('A dice raw (unbiased base-6, no hash)', phraseFrom(A, 'raw'), 'document lift cool oven hen right vault roof voice review weekend grab');
const B = '123456'.repeat(9);
check('B dice 12 words (myseedphrase.app self-test)', phraseFrom(B, '12'), 'universe intact render tank net oval paddle thought trick movie chimney bullet');
const C = '123456'.repeat(16) + '1234';
check('C dice 21 words', phraseFrom(C, '21'), 'tornado cactus wheel picture target finish home neither trend picture shoulder endless deputy glide open oxygen another ability forum swear search');
check('C dice 24 words', phraseFrom(C, '24'), 'tornado cactus wheel picture target finish home neither trend picture shoulder endless deputy glide open oxygen another ability forum swear side alcohol devote random');
// digits 0-5 are base 6, not dice: hashed over cleanStr as typed
const A0 = A.replace(/6/g, '0');
check('A with 6->0 auto-detects base 6', entropy.entropyFromString(A0).base.str, 'base 6');
check('A with 6->0, 12 words (base 6 path)', phraseFrom(A0, '12'), 'rent chase subway they force exact hungry seed powder rice quiz spend');
check('A with 6->0, raw (base 6 path)', phraseFrom(A0, 'raw'), 'document lift cool oven hen right vault roof voice review weekend grab');
check('dice hashStr is the rolls as typed', entropy.entropyFromString(A).hashStr, A);
check('dice type label', entropy.entropyFromString(A).base.str, 'base 6 (dice)');
check('non-dice hashStr equals cleanStr', entropy.entropyFromString('4187a8bfd9c0ffee').hashStr, entropy.entropyFromString('4187a8bfd9c0ffee').cleanStr);
// event encodings
check('dice raw bits', entropy.entropyFromString('62535634').binaryStr, '0010111100110');
check('cards bits', entropy.entropyFromString('ahqs9dtc').binaryStr, '11010101010101001');
check('cards cleanStr', entropy.entropyFromString('ahqs9dtc').cleanStr, 'A♥ Q♠ 9♦ T♣');
check('base10 bits', entropy.entropyFromString('90834528').binaryStr, '100000111001010100');
check('auto hex', entropy.entropyFromString('4187a8bfd9').base.str, 'hexadecimal');
check('auto binary', entropy.entropyFromString('101010011').base.str, 'binary');

/* ---- BIP32/44/49/84/86 (abandon x11 about) ---- */
const seed = bip39.mnemonicToSeedSync('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', '');
const root = HDKey.fromMasterSeed(seed);
const cat = (...a) => new Uint8Array(a.flatMap((x) => [...x]));
const p2tr = (pub) => { const x = pub.slice(1); const P = schnorr.utils.lift_x(BigInt('0x' + hex.encode(x))); const t = schnorr.utils.taggedHash('TapTweak', x); return bech32m.encode('bc', [1, ...bech32m.toWords(schnorr.utils.pointToBytes(P.add(secp256k1.Point.BASE.multiply(BigInt('0x' + hex.encode(t))))))]); };
check('fingerprint', root.fingerprint.toString(16).padStart(8, '0'), '73c5da0a');
check('BIP44', base58check.encode(cat([0], hash160(root.derive("m/44'/0'/0'/0/0").publicKey))), '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA');
check('BIP49', base58check.encode(cat([5], hash160(cat([0, 0x14], hash160(root.derive("m/49'/0'/0'/0/0").publicKey))))), '37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf');
check('BIP84', bech32.encode('bc', [0, ...bech32.toWords(hash160(root.derive("m/84'/0'/0'/0/0").publicKey))]), 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');
check('BIP86', p2tr(root.derive("m/86'/0'/0'/0/0").publicKey), 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr');

/* ---- multisig (BIP48 / BIP67 / descriptors); addresses cross-checked against an independent Python implementation ---- */
{
  const H = 0x80000000, netM = { hrp: 'bc', p2sh: 5 };
  const cos = [0, 1, 2].map((a) => multisig.cosignerFromNode(root, [48 + H, 0 + H, a + H, 2 + H]));
  check('BIP48 cosigner xpub (account 0, P2WSH)', multisig.serExt(cos[0].node, 0x0488b21e, false), 'xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf');
  check('BIP48 Zpub prefix', multisig.serExt(cos[0].node, multisig.MS_VERSIONS.mainnet.p2wsh.pub, false).slice(0, 4), 'Zpub');
  check('2-of-3 P2WSH address 0/0', multisig.multisigAddress(2, cos, 'p2wsh', 0, 0, netM), 'bc1q2sz6vvu6k7y9gtc6kfgfe0p6xkhmvmdlu97eecjkykpdktvps08scdjgr5');
  check('2-of-3 P2SH-P2WSH address 1/3', multisig.multisigAddress(2, cos, 'p2sh-p2wsh', 1, 3, netM), '3AdiZaJHF2NREUYbbhewvYWKgQ2d5zAqUz');
  check('BIP67: key order does not matter', multisig.multisigAddress(2, [...cos].reverse(), 'p2wsh', 0, 0, netM), multisig.multisigAddress(2, cos, 'p2wsh', 0, 0, netM));
  const d = multisig.buildDescriptors(2, cos, 'p2wsh', 0x0488b21e);
  check('descriptor form', d.combined.slice(0, 41), 'wsh(sortedmulti(2,[73c5da0a/48h/0h/0h/2h]');
  check('descriptor checksum', d.combined.split('#')[1], multisig.descChecksum(d.combined.split('#')[0]));
  check('descriptor checksum reference (Core docs)', multisig.descChecksum('wpkh([d34db33f/84h/0h/0h]xpub6DJ2dNUysrn5Vt36jH2KLBT2i1auw1tTSSomg8PhqNiUtx8QX2SvC9nrHu81fT41fvDUnhMjEzQgXnQjKEu3oaqMSzhSrHMxyyoEAmUHQbY/0/*)'), 'cjjspncu');
  const table = [{ net: 'mainnet', private: 0x0488ade4, public: 0x0488b21e }];
  const cc = multisig.coldcardConfig('KeyPath 2of3', 2, cos, 'p2wsh', 0x0488b21e);
  const back = multisig.parseCosigners(cc, table);
  check('setup file round trip: keys', back.cosigners.length, 3);
  check('setup file round trip: policy', back.meta.threshold, 2);
  check('setup file round trip: address', multisig.multisigAddress(2, back.cosigners, 'p2wsh', 0, 0, netM), 'bc1q2sz6vvu6k7y9gtc6kfgfe0p6xkhmvmdlu97eecjkykpdktvps08scdjgr5');
  const lines = cos.map((c) => `[${c.fp}${c.path}]${multisig.serExt(c.node, 0x0488b21e, false)}`).join('\n');
  const back2 = multisig.parseCosigners(lines, table);
  check('origin lines round trip', back2.cosigners.map((c) => c.path).join(','), '/48h/0h/0h/2h,/48h/0h/1h/2h,/48h/0h/2h/2h');
  check('validate: too few keys', multisig.validate(2, cos.slice(0, 1), 'mainnet').some((p) => p.level === 'bad'), true);
  check('validate: duplicate key', multisig.validate(2, [cos[0], cos[0]], 'mainnet').some((p) => p.text.includes('twice')), true);
  check('validate: ok', multisig.validate(2, cos, 'mainnet').filter((p) => p.level === 'bad').length, 0);

  /* ---- Taproot multisig (BIP48 3', tr(NUMS, sortedmulti_a)); addresses cross-checked against @scure/btc-signer ---- */
  const tr = [0, 1, 2].map((a) => multisig.cosignerFromNode(root, [48 + H, 0 + H, a + H, 3 + H]));
  check('BIP48 cosigner xpub (account 0, P2TR)', multisig.serExt(tr[0].node, 0x0488b21e, false), 'xpub6DkFAXWQ2dHxr7LX1ByDVebj6u3C5KSKTVXWkiVKb3tdYfh9t7FhXzvUVSxNSikoVTRb2bGjvYoW8PqYBReMeswi3megtqDwRCeVs3vxMeH');
  check('NUMS key matches btc-signer', multisig.NUMS_HEX, hex.encode(btcSigner.TAPROOT_UNSPENDABLE_KEY));
  check('2-of-3 P2TR address 0/0', multisig.multisigAddress(2, tr, 'p2tr', 0, 0, netM), 'bc1pwwej59cyn4zmnp3pyjdmjtdn8ag9hm2wqhfc28tm7ntegzfcmzqst9w59z');
  check('2-of-3 P2TR address 0/1', multisig.multisigAddress(2, tr, 'p2tr', 0, 1, netM), 'bc1pealw8edu2t2hcwhehmts5hcqekf29qn6pluh3g574wjjgj5tvmhssmv6yd');
  check('2-of-3 P2TR address 1/0', multisig.multisigAddress(2, tr, 'p2tr', 1, 0, netM), 'bc1py9ncpfnn27uegp5p7xm9jveph2khcc05fv0fgx9ljj663cm3vrzsv3v7l6');
  check('2-of-3 P2TR address 1/7', multisig.multisigAddress(2, tr, 'p2tr', 1, 7, netM), 'bc1pnf8plqfdn5tt8q5jdq456t7y3rt0nse4awqk69f98zm5rgwvfmpqsu8dwu');
  check('2-of-3 P2TR testnet address 0/0', multisig.multisigAddress(2, tr, 'p2tr', 0, 0, { hrp: 'tb' }), 'tb1pwwej59cyn4zmnp3pyjdmjtdn8ag9hm2wqhfc28tm7ntegzfcmzqsudcmld');
  // live comparison with btc-signer's p2tr(NUMS, [multi_a leaf]) on x-only-sorted keys, including a leaf longer than 252 bytes (5-of-9)
  const xsort = (a, b) => { for (let i = 0; i < 32; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const refTr = (k, cs, chain, idx, network) => btcSigner.p2tr(undefined, btcSigner.p2tr_ms(k, cs.map((c) => c.node.deriveChild(chain).deriveChild(idx).publicKey.slice(1)).sort(xsort)), network).address;
  for (const [chain, idx] of [[0, 0], [0, 1], [1, 0], [1, 7], [0, 23]]) check(`btc-signer P2TR ${chain}/${idx}`, multisig.multisigAddress(2, tr, 'p2tr', chain, idx, netM), refTr(2, tr, chain, idx));
  const tr9 = Array.from({ length: 9 }, (_, a) => multisig.cosignerFromNode(root, [48 + H, 0 + H, a + H, 3 + H]));
  check('btc-signer 5-of-9 P2TR (leaf > 252 bytes)', multisig.multisigAddress(5, tr9, 'p2tr', 0, 0, netM), refTr(5, tr9, 0, 0));
  check('btc-signer P2TR testnet', multisig.multisigAddress(2, tr, 'p2tr', 0, 0, { hrp: 'tb' }), refTr(2, tr, 0, 0, btcSigner.TEST_NETWORK));
  check('sortedmulti_a: key order does not matter', multisig.multisigAddress(2, [tr[2], tr[0], tr[1]], 'p2tr', 0, 0, netM), multisig.multisigAddress(2, tr, 'p2tr', 0, 0, netM));
  check('multi_a leaf script 2-of-3', hex.encode(multisig.multiAScript(2, tr.map((c) => c.node.deriveChild(0).deriveChild(0).publicKey))).replace(/^20[0-9a-f]{64}ac20[0-9a-f]{64}ba20[0-9a-f]{64}ba529c$/, 'shape-ok'), 'shape-ok');
  // BIP341 wallet test vectors (single-leaf trees): leaf hash and tweak
  for (const [ipk, script, spk] of [
    ['187791b6f712a8ea41c8ecdd0ee77fab3e85263b37e1ec18a3651926b3a6cf27', '20d85a959b0290bf19bb89ed43c916be835475d013da4b362117393e25a48229b8ac', '5120147c9c57132f6e7ecddba9800bb0c4449251c92a1e60371ee77557b6620f3ea3'],
    ['93478e9488f956df2396be2ce6c5cced75f900dfa18e7dabd2428aae78451820', '20b617298552a72ade070667e86ca63b8f5789a9fe8731ef91202a91c9f3459007ac', '5120e4d810fd50586274face62b8a807eb9719cef49c04177cc6b76a9a4251d5450e'],
  ]) check(`BIP341 vector ${ipk.slice(0, 8)}`, '5120' + hex.encode(multisig.taprootTweakedKey(hex.decode(ipk), multisig.tapLeafHash(hex.decode(script)))), spk);
  const dt = multisig.buildDescriptors(2, tr, 'p2tr', 0x0488b21e);
  check('P2TR descriptor form', dt.combined.startsWith(`tr(${multisig.NUMS_HEX},sortedmulti_a(2,[73c5da0a/48h/0h/0h/3h]xpub`), true);
  check('P2TR descriptor combined', dt.combined, 'tr(50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0,sortedmulti_a(2,[73c5da0a/48h/0h/0h/3h]xpub6DkFAXWQ2dHxr7LX1ByDVebj6u3C5KSKTVXWkiVKb3tdYfh9t7FhXzvUVSxNSikoVTRb2bGjvYoW8PqYBReMeswi3megtqDwRCeVs3vxMeH/<0;1>/*,[73c5da0a/48h/0h/1h/3h]xpub6DzhyrnFFYQ1KXnhK7D7U1sD9jf9Cq2E5Ut5HhXdXZFVgEpjz4jNsvEnL1FzP2p4RkMW7MTJC7GWK8CqEWdZsM4XR7Yn8BbbUieRkaTntL2/<0;1>/*,[73c5da0a/48h/0h/2h/3h]xpub6EGx8sPr9FxPQtmPagzaNqpcvG1JsN9m9tFyimaK4tUdfx3kxmJ76M25uDyZVD1mvrH8H1UcX24dVWLEqa51Li5x39WGpWc2eG2jTZdMzrR/<0;1>/*))#e47ahyq5');
  for (const [k, v] of Object.entries(dt)) check(`P2TR descriptor checksum verifies (${k})`, v.split('#')[1], multisig.descChecksum(v.split('#')[0]));
  check('P2TR receive descriptor tail', dt.receive.includes('/0/*))#'), true);
  const cct = multisig.coldcardConfig('KeyPath 2of3 tr', 2, tr, 'p2tr', 0x0488b21e);
  check('setup file Format: P2TR', cct.includes('\nFormat: P2TR\n'), true);
  const backT = multisig.parseCosigners(cct, table);
  check('setup file round trip: P2TR script', backT.meta.script, 'p2tr');
  check('setup file round trip: P2TR address', multisig.multisigAddress(2, backT.cosigners, 'p2tr', 0, 0, netM), 'bc1pwwej59cyn4zmnp3pyjdmjtdn8ag9hm2wqhfc28tm7ntegzfcmzqst9w59z');
}

/* ---- SLIP-39 official vectors ---- */
const vectors = JSON.parse(readFileSync(new URL('./slip39-vectors.json', import.meta.url), 'utf8'));
for (const [desc, mnemonics, secret] of vectors) {
  let got = null; try { got = hex.encode(slip39.combineMnemonics(mnemonics, 'TREZOR')); } catch (e) {}
  check(`SLIP-39 ${desc}`, got, secret || null);
  if (secret) for (const m of mnemonics) check(`SLIP-39 re-encode ${desc}`, slip39.shareToMnemonic(slip39.mnemonicToShare(m)), m);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
