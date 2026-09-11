// SLIP-39 (Shamir's Secret-Sharing for Mnemonic Codes), ported from the reference
// implementation at github.com/trezor/python-shamir-mnemonic. Single- and multi-group
// recovery; single-group splitting.
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { randomBytes } from '@noble/hashes/utils.js';

export const WORDLIST = 'academic acid acne acquire acrobat activity actress adapt adequate adjust admit adorn adult advance advocate afraid again agency agree aide aircraft airline airport ajar alarm album alcohol alien alive alpha already alto aluminum always amazing ambition amount amuse analysis anatomy ancestor ancient angel angry animal answer antenna anxiety apart aquatic arcade arena argue armed artist artwork aspect auction august aunt average aviation avoid award away axis axle beam beard beaver become bedroom behavior being believe belong benefit best beyond bike biology birthday bishop black blanket blessing blimp blind blue body bolt boring born both boundary bracelet branch brave breathe briefing broken brother browser bucket budget building bulb bulge bumpy bundle burden burning busy buyer cage calcium camera campus canyon capacity capital capture carbon cards careful cargo carpet carve category cause ceiling center ceramic champion change charity check chemical chest chew chubby cinema civil class clay cleanup client climate clinic clock clogs closet clothes club cluster coal coastal coding column company corner costume counter course cover cowboy cradle craft crazy credit cricket criminal crisis critical crowd crucial crunch crush crystal cubic cultural curious curly custody cylinder daisy damage dance darkness database daughter deadline deal debris debut decent decision declare decorate decrease deliver demand density deny depart depend depict deploy describe desert desire desktop destroy detailed detect device devote diagnose dictate diet dilemma diminish dining diploma disaster discuss disease dish dismiss display distance dive divorce document domain domestic dominant dough downtown dragon dramatic dream dress drift drink drove drug dryer duckling duke duration dwarf dynamic early earth easel easy echo eclipse ecology edge editor educate either elbow elder election elegant element elephant elevator elite else email emerald emission emperor emphasis employer empty ending endless endorse enemy energy enforce engage enjoy enlarge entrance envelope envy epidemic episode equation equip eraser erode escape estate estimate evaluate evening evidence evil evoke exact example exceed exchange exclude excuse execute exercise exhaust exotic expand expect explain express extend extra eyebrow facility fact failure faint fake false family famous fancy fangs fantasy fatal fatigue favorite fawn fiber fiction filter finance findings finger firefly firm fiscal fishing fitness flame flash flavor flea flexible flip float floral fluff focus forbid force forecast forget formal fortune forward founder fraction fragment frequent freshman friar fridge friendly frost froth frozen fumes funding furl fused galaxy game garbage garden garlic gasoline gather general genius genre genuine geology gesture glad glance glasses glen glimpse goat golden graduate grant grasp gravity gray greatest grief grill grin grocery gross group grownup grumpy guard guest guilt guitar gums hairy hamster hand hanger harvest have havoc hawk hazard headset health hearing heat helpful herald herd hesitate hobo holiday holy home hormone hospital hour huge human humidity hunting husband hush husky hybrid idea identify idle image impact imply improve impulse include income increase index indicate industry infant inform inherit injury inmate insect inside install intend intimate invasion involve iris island isolate item ivory jacket jerky jewelry join judicial juice jump junction junior junk jury justice kernel keyboard kidney kind kitchen knife knit laden ladle ladybug lair lamp language large laser laundry lawsuit leader leaf learn leaves lecture legal legend legs lend length level liberty library license lift likely lilac lily lips liquid listen literary living lizard loan lobe location losing loud loyalty luck lunar lunch lungs luxury lying lyrics machine magazine maiden mailman main makeup making mama manager mandate mansion manual marathon march market marvel mason material math maximum mayor meaning medal medical member memory mental merchant merit method metric midst mild military mineral minister miracle mixed mixture mobile modern modify moisture moment morning mortgage mother mountain mouse move much mule multiple muscle museum music mustang nail national necklace negative nervous network news nuclear numb numerous nylon oasis obesity object observe obtain ocean often olympic omit oral orange orbit order ordinary organize ounce oven overall owner paces pacific package paid painting pajamas pancake pants papa paper parcel parking party patent patrol payment payroll peaceful peanut peasant pecan penalty pencil percent perfect permit petition phantom pharmacy photo phrase physics pickup picture piece pile pink pipeline pistol pitch plains plan plastic platform playoff pleasure plot plunge practice prayer preach predator pregnant premium prepare presence prevent priest primary priority prisoner privacy prize problem process profile program promise prospect provide prune public pulse pumps punish puny pupal purchase purple python quantity quarter quick quiet race racism radar railroad rainbow raisin random ranked rapids raspy reaction realize rebound rebuild recall receiver recover regret regular reject relate remember remind remove render repair repeat replace require rescue research resident response result retailer retreat reunion revenue review reward rhyme rhythm rich rival river robin rocky romantic romp roster round royal ruin ruler rumor sack safari salary salon salt satisfy satoshi saver says scandal scared scatter scene scholar science scout scramble screw script scroll seafood season secret security segment senior shadow shaft shame shaped sharp shelter sheriff short should shrimp sidewalk silent silver similar simple single sister skin skunk slap slavery sled slice slim slow slush smart smear smell smirk smith smoking smug snake snapshot sniff society software soldier solution soul source space spark speak species spelling spend spew spider spill spine spirit spit spray sprinkle square squeeze stadium staff standard starting station stay steady step stick stilt story strategy strike style subject submit sugar suitable sunlight superior surface surprise survive sweater swimming swing switch symbolic sympathy syndrome system tackle tactics tadpole talent task taste taught taxi teacher teammate teaspoon temple tenant tendency tension terminal testify texture thank that theater theory therapy thorn threaten thumb thunder ticket tidy timber timely ting tofu together tolerate total toxic tracks traffic training transfer trash traveler treat trend trial tricycle trip triumph trouble true trust twice twin type typical ugly ultimate umbrella uncover undergo unfair unfold unhappy union universe unkind unknown unusual unwrap upgrade upstairs username usher usual valid valuable vampire vanish various vegan velvet venture verdict verify very veteran vexed victim video view vintage violence viral visitor visual vitamins vocal voice volume voter voting walnut warmth warn watch wavy wealthy weapon webcam welcome welfare western width wildlife window wine wireless wisdom withdraw wits wolf woman work worthy wrap wrist writing wrote year yelp yield yoga zero'.split(' ');
const WORD_INDEX = new Map(WORDLIST.map((w, i) => [w, i]));

const RADIX_BITS = 10, RADIX = 1024, ID_LENGTH_BITS = 15, ITER_EXP_BITS = 4, EXT_FLAG_BITS = 1;
const ID_EXP_WORDS = 2, CHECKSUM_WORDS = 3, METADATA_WORDS = ID_EXP_WORDS + 2 + CHECKSUM_WORDS;
const MIN_STRENGTH_BITS = 128, MIN_MNEMONIC_WORDS = METADATA_WORDS + Math.ceil(MIN_STRENGTH_BITS / RADIX_BITS);
const BASE_ITERATION_COUNT = 10000, ROUND_COUNT = 4, SECRET_INDEX = 255, DIGEST_INDEX = 254, DIGEST_LENGTH = 4, MAX_SHARE_COUNT = 16;
const CS_ORIG = new TextEncoder().encode('shamir'), CS_EXT = new TextEncoder().encode('shamir_extendable');

export class MnemonicError extends Error {}
const bitsToBytes = (n) => Math.ceil(n / 8);
const bitsToWords = (n) => Math.ceil(n / RADIX_BITS);

/* ---------- GF(256) ---------- */
const EXP = new Array(255), LOG = new Array(256).fill(0);
{ let poly = 1; for (let i = 0; i < 255; i++) { EXP[i] = poly; LOG[poly] = i; poly = (poly << 1) ^ poly; if (poly & 0x100) poly ^= 0x11b; } }
function interpolate(shares, x) {
  const xs = new Set(shares.map((s) => s.x));
  if (xs.size !== shares.length) throw new MnemonicError('Invalid set of shares. Share indices must be unique.');
  const lens = new Set(shares.map((s) => s.data.length));
  if (lens.size !== 1) throw new MnemonicError('Invalid set of shares. All share values must have the same length.');
  if (xs.has(x)) return shares.find((s) => s.x === x).data;
  const logProd = shares.reduce((a, s) => a + LOG[s.x ^ x], 0);
  const len = shares[0].data.length; const result = new Uint8Array(len);
  for (const s of shares) {
    const logBasis = (((logProd - LOG[s.x ^ x] - shares.reduce((a, o) => a + LOG[s.x ^ o.x], 0)) % 255) + 255 * 4) % 255;
    for (let i = 0; i < len; i++) { const v = s.data[i]; result[i] ^= v !== 0 ? EXP[(LOG[v] + logBasis) % 255] : 0; }
  }
  return result;
}
const createDigest = (randomData, sharedSecret) => hmac(sha256, randomData, sharedSecret).slice(0, DIGEST_LENGTH);
function splitSecret(threshold, shareCount, secret, rng = randomBytes) {
  if (threshold < 1) throw new Error('The threshold must be a positive integer.');
  if (threshold > shareCount) throw new Error('The threshold must not exceed the number of shares.');
  if (shareCount > MAX_SHARE_COUNT) throw new Error(`The number of shares must not exceed ${MAX_SHARE_COUNT}.`);
  if (threshold === 1) return Array.from({ length: shareCount }, (_, i) => ({ x: i, data: secret }));
  const randomShareCount = threshold - 2;
  const shares = Array.from({ length: randomShareCount }, (_, i) => ({ x: i, data: rng(secret.length) }));
  const randomPart = rng(secret.length - DIGEST_LENGTH);
  const digest = createDigest(randomPart, secret);
  const base = [...shares, { x: DIGEST_INDEX, data: concat(digest, randomPart) }, { x: SECRET_INDEX, data: secret }];
  for (let i = randomShareCount; i < shareCount; i++) shares.push({ x: i, data: interpolate(base, i) });
  return shares;
}
function recoverSecret(threshold, shares) {
  if (threshold === 1) return shares[0].data;
  const secret = interpolate(shares, SECRET_INDEX);
  const digestShare = interpolate(shares, DIGEST_INDEX);
  const digest = digestShare.slice(0, DIGEST_LENGTH), randomPart = digestShare.slice(DIGEST_LENGTH);
  const expect = createDigest(randomPart, secret);
  if (digest.length !== expect.length || digest.some((b, i) => b !== expect[i])) throw new MnemonicError('Invalid digest of the shared secret.');
  return secret;
}
function concat(...arrs) { const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; }

/* ---------- cipher ---------- */
const xor = (a, b) => a.map((v, i) => v ^ b[i]);
function roundFn(i, passphrase, e, salt, r) { return pbkdf2(sha256, concat(new Uint8Array([i]), passphrase), concat(salt, r), { c: (BASE_ITERATION_COUNT << e) / ROUND_COUNT, dkLen: r.length }); }
function getSalt(identifier, extendable) { if (extendable) return new Uint8Array(0); const id = new Uint8Array(bitsToBytes(ID_LENGTH_BITS)); id[0] = identifier >> 8; id[1] = identifier & 255; return concat(CS_ORIG, id); }
function feistel(data, passphrase, e, identifier, extendable, rounds) {
  if (data.length % 2) throw new Error('The master secret length in bytes must be even.');
  let l = data.slice(0, data.length / 2), r = data.slice(data.length / 2);
  const salt = getSalt(identifier, extendable);
  for (const i of rounds) { const f = roundFn(i, passphrase, e, salt, r); [l, r] = [r, xor(l, f)]; }
  return concat(r, l);
}
export const encrypt = (ms, pass, e, id, ext) => feistel(ms, pass, e, id, ext, [0, 1, 2, 3]);
export const decrypt = (ems, pass, e, id, ext) => feistel(ems, pass, e, id, ext, [3, 2, 1, 0]);

/* ---------- rs1024 checksum ---------- */
const GEN = [0xe0e040, 0x1c1c080, 0x3838100, 0x7070200, 0xe0e0009, 0x1c0c2412, 0x38086c24, 0x3090fc48, 0x21b1f890, 0x3f3f120];
function polymod(values) {
  let chk = 1;
  for (const v of values) { const b = chk >>> 20; chk = ((chk & 0xfffff) * 1024) ^ v; for (let i = 0; i < 10; i++) if ((b >>> i) & 1) chk ^= GEN[i]; }
  return chk >>> 0;
}
function createChecksum(data, cs) { const pm = polymod([...cs, ...data, 0, 0, 0]) ^ 1; return [2, 1, 0].map((i) => (pm >>> (10 * i)) & 1023); }
const verifyChecksum = (data, cs) => polymod([...cs, ...data]) === 1;

/* ---------- share encoding ---------- */
function intToIndices(value, length, bits) { const out = []; let v = BigInt(value); const mask = (1n << BigInt(bits)) - 1n; for (let i = 0; i < length; i++) { out.unshift(Number(v & mask)); v >>= BigInt(bits); } return out; }
function indicesToInt(idx) { let v = 0n; for (const i of idx) v = v * BigInt(RADIX) + BigInt(i); return v; }
function bytesToBig(b) { let v = 0n; for (const x of b) v = (v << 8n) | BigInt(x); return v; }
function bigToBytes(v, len) { const out = new Uint8Array(len); for (let i = len - 1; i >= 0; i--) { out[i] = Number(v & 255n); v >>= 8n; } if (v !== 0n) throw new MnemonicError('Invalid mnemonic padding.'); return out; }

export function shareToMnemonic(s) {
  const idExp = (s.identifier << (ITER_EXP_BITS + EXT_FLAG_BITS)) + ((s.extendable ? 1 : 0) << ITER_EXP_BITS) + s.iterationExponent;
  let p = s.groupIndex; p = (p << 4) + (s.groupThreshold - 1); p = (p << 4) + (s.groupCount - 1); p = (p << 4) + s.index; p = (p << 4) + (s.memberThreshold - 1);
  const data = [...intToIndices(idExp, ID_EXP_WORDS, RADIX_BITS), ...intToIndices(p, 2, RADIX_BITS), ...intToIndices(bytesToBig(s.value), bitsToWords(s.value.length * 8), RADIX_BITS)];
  const cs = createChecksum(data, s.extendable ? CS_EXT : CS_ORIG);
  return [...data, ...cs].map((i) => WORDLIST[i]).join(' ');
}
export function mnemonicToShare(mnemonic) {
  const words = mnemonic.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const data = words.map((w) => { const i = WORD_INDEX.get(w); if (i === undefined) throw new MnemonicError(`Invalid mnemonic word "${w}".`); return i; });
  if (data.length < MIN_MNEMONIC_WORDS) throw new MnemonicError(`Invalid mnemonic length. Each mnemonic must be at least ${MIN_MNEMONIC_WORDS} words.`);
  const paddingLen = (RADIX_BITS * (data.length - METADATA_WORDS)) % 16;
  if (paddingLen > 8) throw new MnemonicError('Invalid mnemonic length.');
  const idExp = Number(indicesToInt(data.slice(0, ID_EXP_WORDS)));
  const identifier = idExp >> (EXT_FLAG_BITS + ITER_EXP_BITS), extendable = !!((idExp >> ITER_EXP_BITS) & 1), iterationExponent = idExp & ((1 << ITER_EXP_BITS) - 1);
  if (!verifyChecksum(data, extendable ? CS_EXT : CS_ORIG)) throw new MnemonicError(`Invalid mnemonic checksum for "${words.slice(0, 4).join(' ')} …".`);
  const [groupIndex, gt, gc, index, mt] = intToIndices(Number(indicesToInt(data.slice(ID_EXP_WORDS, ID_EXP_WORDS + 2))), 5, 4);
  if (gc < gt) throw new MnemonicError(`Invalid mnemonic "${words.slice(0, 4).join(' ')} …". Group threshold cannot be greater than group count.`);
  const valueData = data.slice(ID_EXP_WORDS + 2, data.length - CHECKSUM_WORDS);
  const value = bigToBytes(indicesToInt(valueData), bitsToBytes(RADIX_BITS * valueData.length - paddingLen));
  return { identifier, extendable, iterationExponent, groupIndex, groupThreshold: gt + 1, groupCount: gc + 1, index, memberThreshold: mt + 1, value };
}

/* ---------- high level ---------- */
const commonKey = (s) => [s.identifier, s.extendable, s.iterationExponent, s.groupThreshold, s.groupCount].join('/');
const groupKey = (s) => commonKey(s) + '/' + [s.groupIndex, s.memberThreshold].join('/');
export function decodeMnemonics(mnemonics) {
  const groups = new Map(); const common = new Set();
  for (const m of mnemonics) {
    const s = mnemonicToShare(m); common.add(commonKey(s));
    if (!groups.has(s.groupIndex)) groups.set(s.groupIndex, []);
    const g = groups.get(s.groupIndex);
    if (g.length && groupKey(g[0]) !== groupKey(s)) throw new MnemonicError("Invalid set of mnemonics. The member threshold parameters don't match.");
    if (!g.some((o) => o.index === s.index && o.value.every((b, i) => b === s.value[i]))) g.push(s);
  }
  if (common.size !== 1) throw new MnemonicError(`Invalid set of mnemonics. All mnemonics must begin with the same ${ID_EXP_WORDS} words, must have the same group threshold and the same group count.`);
  return groups;
}
export function recoverEms(groups) {
  if (!groups.size) throw new MnemonicError('The set of shares is empty.');
  const first = groups.values().next().value[0];
  if (groups.size < first.groupThreshold) throw new MnemonicError(`Insufficient number of mnemonic groups. The required number of groups is ${first.groupThreshold}.`);
  if (groups.size !== first.groupThreshold) throw new MnemonicError(`Wrong number of mnemonic groups. Expected ${first.groupThreshold} groups, but ${groups.size} were provided.`);
  const groupShares = [];
  for (const [gi, g] of groups) {
    if (g.length !== g[0].memberThreshold) throw new MnemonicError(`Wrong number of mnemonics. Expected ${g[0].memberThreshold} mnemonics starting with "${shareToMnemonic(g[0]).split(' ').slice(0, 3).join(' ')} …", but ${g.length} were provided.`);
    groupShares.push({ x: gi, data: recoverSecret(g[0].memberThreshold, g.map((s) => ({ x: s.index, data: s.value }))) });
  }
  return { identifier: first.identifier, extendable: first.extendable, iterationExponent: first.iterationExponent, ciphertext: recoverSecret(first.groupThreshold, groupShares) };
}
export function combineMnemonics(mnemonics, passphrase = '') {
  if (!mnemonics.length) throw new MnemonicError('The list of mnemonics is empty.');
  const ems = recoverEms(decodeMnemonics(mnemonics));
  return decrypt(ems.ciphertext, new TextEncoder().encode(passphrase), ems.iterationExponent, ems.identifier, ems.extendable);
}
// Single-group split: `threshold` of `shareCount` shares recover the master secret.
export function generateMnemonics(threshold, shareCount, masterSecret, passphrase = '', extendable = true, iterationExponent = 1, rng = randomBytes) {
  if (!/^[\x20-\x7e]*$/.test(passphrase)) throw new Error('The passphrase must contain only printable ASCII characters (code points 32-126).');
  if (masterSecret.length * 8 < MIN_STRENGTH_BITS) throw new Error('The master secret must be at least 16 bytes.');
  if (masterSecret.length % 2) throw new Error('The master secret length in bytes must be even.');
  if (threshold === 1 && shareCount > 1) throw new Error('Creating multiple shares with threshold 1 is not allowed. Use 1-of-1 instead.');
  const idBytes = rng(bitsToBytes(ID_LENGTH_BITS)); const identifier = ((idBytes[0] << 8) | idBytes[1]) & ((1 << ID_LENGTH_BITS) - 1);
  const ems = encrypt(masterSecret, new TextEncoder().encode(passphrase), iterationExponent, identifier, extendable);
  const groupShares = splitSecret(1, 1, ems, rng);
  return splitSecret(threshold, shareCount, groupShares[0].data, rng).map((s) => shareToMnemonic({ identifier, extendable, iterationExponent, groupIndex: 0, groupThreshold: 1, groupCount: 1, index: s.x, memberThreshold: threshold, value: s.data }));
}
// Describe a share for the UI without needing the full set.
export function describeShare(mnemonic) { const s = mnemonicToShare(mnemonic); return { identifier: s.identifier, extendable: s.extendable, groupIndex: s.groupIndex, groupThreshold: s.groupThreshold, groupCount: s.groupCount, index: s.index, memberThreshold: s.memberThreshold, bits: s.value.length * 8 }; }
