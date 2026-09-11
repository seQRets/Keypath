// Bundle entry: exposes audited primitives (noble / scure) as window.BTC.
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import { wordlist as japanese } from '@scure/bip39/wordlists/japanese.js';
import { wordlist as spanish } from '@scure/bip39/wordlists/spanish.js';
import { wordlist as simplifiedChinese } from '@scure/bip39/wordlists/simplified-chinese.js';
import { wordlist as traditionalChinese } from '@scure/bip39/wordlists/traditional-chinese.js';
import { wordlist as french } from '@scure/bip39/wordlists/french.js';
import { wordlist as italian } from '@scure/bip39/wordlists/italian.js';
import { wordlist as korean } from '@scure/bip39/wordlists/korean.js';
import { wordlist as czech } from '@scure/bip39/wordlists/czech.js';
import { wordlist as portuguese } from '@scure/bip39/wordlists/portuguese.js';
import { HDKey, HARDENED_OFFSET } from '@scure/bip32';
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { hmac } from '@noble/hashes/hmac.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { base58check as mkBase58check, bech32, bech32m, hex, utf8 } from '@scure/base';

const base58check = mkBase58check(sha256);
const hash160 = (b) => ripemd160(sha256(b));

export const wordlists = {
  english: { name: 'English', words: english },
  japanese: { name: '日本語', words: japanese, sep: '　' },
  spanish: { name: 'Español', words: spanish },
  simplifiedChinese: { name: '中文(简体)', words: simplifiedChinese },
  traditionalChinese: { name: '中文(繁體)', words: traditionalChinese },
  french: { name: 'Français', words: french },
  italian: { name: 'Italiano', words: italian },
  korean: { name: '한국어', words: korean },
  czech: { name: 'Čeština', words: czech },
  portuguese: { name: 'Português', words: portuguese },
};

export {
  bip39, HDKey, HARDENED_OFFSET, secp256k1, schnorr,
  sha256, sha512, ripemd160, hmac, pbkdf2, randomBytes,
  base58check, bech32, bech32m, hex, utf8, hash160,
};
import * as slip39 from './slip39.js';
export { slip39 };
import qrcode from 'qrcode-generator';
export { qrcode };
