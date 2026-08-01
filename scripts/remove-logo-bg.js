'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'logos', 'f1site logo.png');
const OUT = path.join(ROOT, 'logos', 'f1site-logo-transparent.png');

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(buffer) {
  const sig = buffer.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') throw new Error('Not a PNG');

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  let offset = 8;
  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error('Expected 8-bit RGB or RGBA PNG');
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bytesPerPixel;
  const raw = Buffer.alloc(height * stride);
  let src = 0;

  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    let row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      row[x] = inflated[src++];
    }

    const prev = y > 0 ? raw.slice((y - 1) * stride, y * stride) : null;
    const out = Buffer.alloc(stride);

    for (let i = 0; i < stride; i++) {
      const bpp = bytesPerPixel;
      const left = i >= bpp ? out[i - bpp] : 0;
      const up = prev ? prev[i] : 0;
      const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
      let val = row[i];

      if (filter === 1) val = (val + left) & 255;
      else if (filter === 2) val = (val + up) & 255;
      else if (filter === 3) val = (val + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) val = (val + paeth(left, up, upLeft)) & 255;

      out[i] = val;
    }

    out.copy(raw, y * stride);
  }

  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rawIdx = y * stride + x * bytesPerPixel;
      const idx = (y * width + x) << 2;
      pixels[idx] = raw[rawIdx];
      pixels[idx + 1] = raw[rawIdx + 1];
      pixels[idx + 2] = raw[rawIdx + 2];
      pixels[idx + 3] = colorType === 6 ? raw[rawIdx + 3] : 255;
    }
  }

  return { width, height, pixels };
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  let dst = 0;

  for (let y = 0; y < height; y++) {
    raw[dst++] = 0;
    pixels.copy(raw, dst, y * stride, y * stride + stride);
    dst += stride;
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function removeBackground(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (max < 50 || lum < 42) {
      pixels[i + 3] = 0;
    } else if (lum < 95) {
      const t = (lum - 42) / 53;
      pixels[i + 3] = Math.round(Math.min(255, Math.pow(t, 1.6) * 255));
    }
  }
}

const png = decodePNG(fs.readFileSync(SRC));
removeBackground(png.pixels);
fs.writeFileSync(OUT, encodePNG(png.width, png.height, png.pixels));
console.log('Created', OUT);
