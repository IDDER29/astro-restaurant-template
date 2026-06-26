/**
 * qr-encode.js — Self-contained QR Code encoder
 * Byte mode only, ECC level L, versions 1-10.
 * Algorithm based on ISO/IEC 18004 and Nayuki QR Code generator (MIT).
 * No external dependencies.
 */

'use strict';

// ── GF(256) tables (primitive polynomial 0x11D) ────────────────────────────────
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  return (a !== 0 && b !== 0) ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0;
}

// ── Reed-Solomon generator polynomial ─────────────────────────────────────────
function rsGenPoly(degree) {
  // Returns coefficients [c_{n-1}, ..., c_0] for x^n + c_{n-1}*x^{n-1} + ... + c_0
  // = (x - α^0)(x - α^1)...(x - α^{degree-1})
  let g = new Array(degree).fill(0);
  g[degree - 1] = 1; // polynomial = 1 (constant)
  let root = 1;
  for (let i = 0; i < degree; i++) {
    // Multiply g by (x - root)
    for (let j = 0; j < degree; j++) {
      g[j] = gfMul(g[j], root);
      if (j + 1 < degree) g[j] ^= g[j + 1];
    }
    root = gfMul(root, 2);
  }
  return g;
}

// ── Reed-Solomon remainder ─────────────────────────────────────────────────────
function rsRemainder(data, gen) {
  const result = new Array(gen.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    for (let i = 0; i < gen.length; i++) result[i] ^= gfMul(gen[i], factor);
  }
  return result;
}

// ── Version table: [size, dataCodewords, eccPerBlock, numBlocks] ECC level L ──
// Data capacity is dataCodewords bytes total (for byte mode, max chars = dataCodewords - 3)
// Byte mode overhead: 4 bits mode + 8 bits count + 4 bits terminator = 2 header bytes + partial
const VERSIONS = [
  null,              // 0 unused
  [21,  19,  7, 1], // v1
  [25,  34, 10, 1], // v2
  [29,  55, 15, 1], // v3
  [33,  80, 20, 1], // v4
  [37, 108, 26, 1], // v5
  [41, 136, 18, 2], // v6
  [45, 156, 20, 2], // v7 — 2 blocks of 78 data codewords, 20 ECC each
  [49, 194, 24, 2], // v8
  [53, 232, 30, 2], // v9
  [57, 274, 18, 4], // v10
];

// Remainder bits to append after data+ECC codewords
const REMAINDER_BITS = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];

// Alignment pattern center positions for each version (all combinations placed,
// minus those overlapping finder patterns)
const ALIGN_POS = [
  [],           // v1
  [6, 18],      // v2
  [6, 22],      // v3
  [6, 26],      // v4
  [6, 30],      // v5
  [6, 34],      // v6
  [6, 22, 38],  // v7
  [6, 24, 42],  // v8
  [6, 26, 46],  // v9
  [6, 28, 50],  // v10
];

// ── Select version for given byte length ───────────────────────────────────────
function selectVersion(byteLen) {
  // Available data bytes for byte mode = dataCodewords - 2 (mode+count header bytes) - 1 (terminator/padding)
  // but more precisely: available bits = dataCodewords*8, we need 4+8+byteLen*8+4 bits
  for (let v = 1; v <= 10; v++) {
    const info = VERSIONS[v];
    if (!info) continue;
    const dataBits = info[1] * 8;
    const needed = 4 + 8 + byteLen * 8 + 4; // mode + count + data + terminator
    if (needed <= dataBits) return v;
  }
  return null; // too long
}

// ── Encode data bytes into QR bit stream (byte mode, ECC L) ───────────────────
function encodeData(bytes, version) {
  const info = VERSIONS[version];
  const [, dataWords, eccPerBlock, numBlocks] = info;
  const totalDataBits = dataWords * 8;
  const bits = [];

  // Mode indicator: 0100 = byte mode
  bits.push(0, 1, 0, 0);

  // Character count (8 bits for versions 1-9)
  const len = bytes.length;
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);

  // Data bytes
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }

  // Terminator (up to 4 zero bits)
  const termLen = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad with 0xEC, 0x11 alternating
  let padByte = 0;
  while (bits.length < totalDataBits) {
    const p = padByte === 0 ? 0xEC : 0x11;
    for (let i = 7; i >= 0; i--) bits.push((p >> i) & 1);
    padByte ^= 1;
  }

  // Convert to codewords
  const codewords = [];
  for (let i = 0; i < dataWords; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    codewords.push(byte);
  }

  // Interleave data blocks and compute ECC
  const dataPerBlock = Math.floor(dataWords / numBlocks);
  const eccGen = rsGenPoly(eccPerBlock);

  const dataBlocks = [];
  const eccBlocks = [];
  for (let blk = 0; blk < numBlocks; blk++) {
    const start = blk * dataPerBlock;
    // For uneven splits (last block may be larger)
    const end = blk === numBlocks - 1 ? dataWords : start + dataPerBlock;
    const block = codewords.slice(start, end);
    dataBlocks.push(block);
    eccBlocks.push(rsRemainder(block, eccGen));
  }

  // Interleave data codewords
  const interleaved = [];
  const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) {
      if (i < blk.length) interleaved.push(blk[i]);
    }
  }
  // Interleave ECC codewords
  for (let i = 0; i < eccPerBlock; i++) {
    for (const blk of eccBlocks) {
      if (i < blk.length) interleaved.push(blk[i]);
    }
  }

  // Convert to bit stream
  const stream = [];
  for (const cw of interleaved) {
    for (let i = 7; i >= 0; i--) stream.push((cw >> i) & 1);
  }
  // Append remainder bits
  const rem = REMAINDER_BITS[version];
  for (let i = 0; i < rem; i++) stream.push(0);

  return stream;
}

// ── Matrix helpers ─────────────────────────────────────────────────────────────
// Encoding:
//   2 = unset (available for data placement)
//   0 = function white (finder separator, timing white, format info)
//   1 = function dark (finder, timing, alignment, format bits, dark module)
//   4 = data white (placed by zigzag)
//   5 = data dark  (placed by zigzag)
// Only data modules (4/5) are flipped by the mask.

function makeMatrix(size) {
  return Array.from({ length: size }, () => new Uint8Array(size).fill(2));
}

// Set a function module (not maskable)
function setModule(m, row, col, dark) {
  m[row][col] = dark ? 1 : 0;
}

// ── Finder pattern (7×7 with border) ──────────────────────────────────────────
function placeFinder(m, topRow, topCol) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = topRow + r, mc = topCol + c;
      if (mr < 0 || mr >= m.length || mc < 0 || mc >= m.length) continue;
      const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
        (r === 0 || r === 6 || c === 0 || c === 6);
      const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      const dark = inOuter || inInner;
      setModule(m, mr, mc, dark);
    }
  }
}

// ── Timing patterns ────────────────────────────────────────────────────────────
function placeTiming(m, size) {
  for (let i = 8; i < size - 8; i++) {
    setModule(m, 6, i, i % 2 === 0);
    setModule(m, i, 6, i % 2 === 0);
  }
}

// ── Alignment pattern (5×5) ───────────────────────────────────────────────────
function placeAlignment(m, row, col) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = (r === -2 || r === 2 || c === -2 || c === 2 ||
        (r === 0 && c === 0));
      setModule(m, row + r, col + c, dark);
    }
  }
}

// ── Format info placeholder (reserve modules so zigzag skips them) ────────────
// Uses the ISO 18004 / Arase convention:
//   First copy:  col 8 rows 0-8 (skip timing row 6) + row 8 cols 0-7 (skip timing col 6)
//   Second copy: row 8 cols size-8..size-1 + col 8 rows size-7..size-1
//   Always-dark: (size-8, 8)
function reserveFormatArea(m, size) {
  // First copy — vertical strip (col 8, rows 0..8, skip row 6 = timing)
  for (let r = 0; r <= 8; r++) {
    if (r !== 6 && m[r][8] === 2) setModule(m, r, 8, false);
  }
  // First copy — horizontal strip (row 8, cols 0..7, skip col 6 = timing)
  for (let c = 0; c <= 7; c++) {
    if (c !== 6 && m[8][c] === 2) setModule(m, 8, c, false);
  }
  // Always-dark module at (size-8, 8)
  setModule(m, size - 8, 8, true);
  // Second copy — horizontal (row 8, cols size-8..size-1)
  for (let c = size - 8; c < size; c++) {
    if (m[8][c] === 2) setModule(m, 8, c, false);
  }
  // Second copy — vertical (col 8, rows size-7..size-1)
  for (let r = size - 7; r < size; r++) {
    if (m[r][8] === 2) setModule(m, r, 8, false);
  }
}

// ── Write format bits ──────────────────────────────────────────────────────────
function computeFormatBits(maskNum) {
  // ECC level L: formatBits = 1
  const data = (1 << 3) | maskNum;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

// ISO 18004 format-info placement (Arase convention, compatible with jsQR):
//   Bit numbering: bits 14-13 = ECC indicator, bits 12-10 = mask, bits 9-0 = BCH
//
//   First copy vertical  (col 8): bit i at row i (i=0..5), bit 6 at row 7, bit 7 at row 8
//   First copy horizontal (row 8): bit 8 at col 7, bits 9..14 at cols 5..0
//   Second copy horizontal(row 8): bit 0 at col size-1 down to bit 7 at col size-8
//   Second copy vertical  (col 8): bit 8 at row size-7 up to bit 14 at row size-1
//   Always-dark module            : (size-8, 8)
function writeFormatBits(m, size, maskNum) {
  const bits = computeFormatBits(maskNum);

  // First copy — vertical (col 8, rows 0-8, skip timing row 6)
  for (let i = 0; i < 6; i++) m[i][8] = ((bits >> i) & 1) ? 1 : 0;   // bits 0-5
  m[7][8] = ((bits >> 6) & 1) ? 1 : 0;                                  // bit 6
  m[8][8] = ((bits >> 7) & 1) ? 1 : 0;                                  // bit 7

  // First copy — horizontal (row 8, cols 0-7, skip timing col 6)
  m[8][7] = ((bits >> 8) & 1) ? 1 : 0;                                  // bit 8
  for (let i = 9; i < 15; i++) m[8][14 - i] = ((bits >> i) & 1) ? 1 : 0; // bits 9-14 → cols 5..0

  // Second copy — horizontal (row 8, cols size-8..size-1)
  for (let i = 0; i < 8; i++) m[8][size - 1 - i] = ((bits >> i) & 1) ? 1 : 0;

  // Second copy — vertical (col 8, rows size-7..size-1)
  for (let i = 8; i < 15; i++) m[size - 15 + i][8] = ((bits >> i) & 1) ? 1 : 0;

  // Always-dark module
  m[size - 8][8] = 1;
}

// ── Build full matrix ──────────────────────────────────────────────────────────
function buildMatrix(version, dataBits) {
  const info = VERSIONS[version];
  const size = info[0];
  const m = makeMatrix(size);

  // Finder patterns
  placeFinder(m, 0, 0);
  placeFinder(m, 0, size - 7);
  placeFinder(m, size - 7, 0);

  // Timing
  placeTiming(m, size);

  // Alignment patterns
  const ap = ALIGN_POS[version - 1] || [];
  for (let ri = 0; ri < ap.length; ri++) {
    for (let ci = 0; ci < ap.length; ci++) {
      const r = ap[ri], c = ap[ci];
      // Skip if overlaps with finder patterns
      if (r <= 8 && c <= 8) continue;           // top-left
      if (r <= 8 && c >= size - 8) continue;    // top-right
      if (r >= size - 8 && c <= 8) continue;    // bottom-left
      placeAlignment(m, r, c);
    }
  }

  // Reserve format info area (so zigzag skips it)
  reserveFormatArea(m, size);

  // Place data bits via zigzag scan
  let bitIdx = 0;
  let goingUp = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    for (let vert = 0; vert < size; vert++) {
      const row = goingUp ? size - 1 - vert : vert;
      for (let dx = 0; dx <= 1; dx++) {
        const col = right - dx;
        if (m[row][col] === 2) { // unset — available for data
          const bit = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
          m[row][col] = bit ? 5 : 4; // 5=data dark, 4=data white
        }
      }
    }
    goingUp = !goingUp;
  }

  return m;
}

// ── Apply mask ────────────────────────────────────────────────────────────────
function applyMask(m, maskNum) {
  const size = m.length;
  const masked = m.map(row => Uint8Array.from(row));
  const maskFns = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
  ];
  const fn = maskFns[maskNum];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = masked[r][c];
      if (v === 4 || v === 5) { // data module only
        masked[r][c] = fn(r, c) ? (v === 5 ? 4 : 5) : v;
      }
    }
  }
  return masked;
}

// ── Penalty score for mask evaluation ─────────────────────────────────────────
function penaltyScore(m) {
  const size = m.length;
  let score = 0;

  function isDark(r, c) {
    const v = m[r][c];
    return v === 1 || v === 5; // function dark or data dark
  }

  // Rule 1: consecutive run of 5+ same-color in row or col
  for (let r = 0; r < size; r++) {
    for (let isCol = 0; isCol <= 1; isCol++) {
      let runLen = 0, runColor = -1;
      for (let i = 0; i < size; i++) {
        const dark = isCol ? isDark(i, r) : isDark(r, i);
        if (dark === (runColor === 1)) {
          runLen++;
        } else {
          if (runLen >= 5) score += runLen - 2;
          runLen = 1;
          runColor = dark ? 1 : 0;
        }
      }
      if (runLen >= 5) score += runLen - 2;
    }
  }

  // Rule 2: 2×2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const d = isDark(r, c);
      if (isDark(r, c + 1) === d && isDark(r + 1, c) === d && isDark(r + 1, c + 1) === d) {
        score += 3;
      }
    }
  }

  // Rule 3: finder-like patterns
  const p1 = [1,0,1,1,1,0,1,0,0,0,0]; // 1 0 1 1 1 0 1 0 0 0 0
  const p2 = [0,0,0,0,1,0,1,1,1,0,1]; // 0 0 0 0 1 0 1 1 1 0 1
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      let m1 = true, m2 = true;
      for (let k = 0; k < 11; k++) {
        if (isDark(r, c + k) !== (p1[k] === 1)) m1 = false;
        if (isDark(r, c + k) !== (p2[k] === 1)) m2 = false;
      }
      if (m1) score += 40;
      if (m2) score += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      let m1 = true, m2 = true;
      for (let k = 0; k < 11; k++) {
        if (isDark(r + k, c) !== (p1[k] === 1)) m1 = false;
        if (isDark(r + k, c) !== (p2[k] === 1)) m2 = false;
      }
      if (m1) score += 40;
      if (m2) score += 40;
    }
  }

  // Rule 4: dark module proportion
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDark(r, c)) darkCount++;
    }
  }
  const total = size * size;
  const pct = (darkCount * 100) / total;
  const k = Math.floor(Math.abs(pct - 50) / 5);
  score += k * 10;

  return score;
}

// ── Build the best-masked matrix ──────────────────────────────────────────────
function buildQrMatrix(text) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const version = selectVersion(bytes.length);
  if (version === null) throw new Error('Text too long for QR code (max ~200 bytes)');

  const dataBits = encodeData(Array.from(bytes), version);
  const baseMatrix = buildMatrix(version, dataBits);

  // Try all 8 masks, pick lowest penalty
  let bestMask = 0, bestScore = Infinity, bestMatrix = null;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = applyMask(baseMatrix, mask);
    writeFormatBits(candidate, baseMatrix.length, mask);
    const score = penaltyScore(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}

// ── SVG renderer ──────────────────────────────────────────────────────────────
export function generateQrSvg(text, { fg = '#000', bg = '#fff', quiet = 4 } = {}) {
  try {
    const m = buildQrMatrix(text);
    const size = m.length;
    const total = size + quiet * 2;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">`,
      `<rect width="${total}" height="${total}" fill="${bg}"/>`,
    ];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const v = m[r][c];
        const dark = v === 1 || v === 5; // function dark or data dark
        if (dark) {
          parts.push(`<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1" fill="${fg}"/>`);
        }
      }
    }
    parts.push('</svg>');
    return parts.join('');
  } catch (e) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><text y="1" font-size="1">${String(e)}</text></svg>`;
  }
}

// ── PNG generator (browser only, async) ───────────────────────────────────────
export async function generateQrPng(text, size = 300) {
  if (typeof document === 'undefined') return ''; // Node/test environment
  try {
    const m = buildQrMatrix(text);
    const modules = m.length;
    const quiet = 4;
    const total = modules + quiet * 2;
    const scale = size / total;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        const v = m[r][c];
        const dark = v === 1 || v === 5; // function dark or data dark
        if (dark) {
          ctx.fillRect(
            (c + quiet) * scale,
            (r + quiet) * scale,
            scale,
            scale,
          );
        }
      }
    }

    return canvas.toDataURL('image/png');
  } catch (e) {
    return '';
  }
}
