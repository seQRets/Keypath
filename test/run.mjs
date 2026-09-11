// Test vectors for KeyPath. Run with `npm test` (builds first, then checks dist/lib.bundle.js).
import { readFileSync } from 'node:fs';
const BTC = new Function(readFileSync(new URL('../dist/lib.bundle.js', import.meta.url), 'utf8') + '; return BTC;')();
const { bip39, wordlists, HDKey, schnorr, secp256k1, hash160, base58check, bech32, bech32m, hex, slip39, entropy } = BTC;
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

/* ---- SLIP-39 official vectors ---- */
const vectors = JSON.parse(readFileSync(new URL('./slip39-vectors.json', import.meta.url), 'utf8'));
for (const [desc, mnemonics, secret] of vectors) {
  let got = null; try { got = hex.encode(slip39.combineMnemonics(mnemonics, 'TREZOR')); } catch (e) {}
  check(`SLIP-39 ${desc}`, got, secret || null);
  if (secret) for (const m of mnemonics) check(`SLIP-39 re-encode ${desc}`, slip39.shareToMnemonic(slip39.mnemonicToShare(m)), m);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
