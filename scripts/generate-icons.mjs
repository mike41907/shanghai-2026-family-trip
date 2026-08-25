import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const iconDirectory = resolve("public", "icons");
mkdirSync(iconDirectory, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBuffer.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return result;
}

function isInsideRoundedSquare(x, y, size, radius) {
  const left = radius;
  const right = size - radius - 1;
  const top = radius;
  const bottom = size - radius - 1;
  if (x >= left && x <= right) return y >= 0 && y < size;
  if (y >= top && y <= bottom) return x >= 0 && x < size;
  const cx = x < left ? left : right;
  const cy = y < top ? top : bottom;
  return ((x - cx) ** 2 + (y - cy) ** 2) <= radius ** 2;
}

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const radius = Math.round(size * 0.225);
  const circleRadius = size * 0.25;
  const centerX = size / 2;
  const centerY = size * 0.49;
  const lineWidth = Math.max(3, Math.round(size * 0.035));

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = row + 1 + x * 4;
      if (!isInsideRoundedSquare(x, y, size, radius)) {
        raw[offset + 3] = 0;
        continue;
      }
      const blend = (x / size + y / size) / 2;
      raw[offset] = Math.round(35 + blend * 88);
      raw[offset + 1] = Math.round(55 + blend * 95);
      raw[offset + 2] = Math.round(75 + blend * 110);
      raw[offset + 3] = 255;

      const inCircle = (x - centerX) ** 2 + (y - centerY) ** 2 <= circleRadius ** 2;
      if (inCircle) {
        raw[offset] = 247;
        raw[offset + 1] = 248;
        raw[offset + 2] = 250;
      }

      const horizontalLine = [0.44, 0.52, 0.60].some((line) => Math.abs(y / size - line) < lineWidth / size / 2 && x > size * 0.31 && x < size * 0.69);
      const verticalLine = Math.abs(x / size - 0.5) < lineWidth / size / 2 && y > size * 0.23 && y < size * 0.75;
      const bottomLine = Math.abs(y / size - 0.75) < lineWidth / size / 2 && x > size * 0.38 && x < size * 0.62;
      if (horizontalLine || verticalLine || bottomLine) {
        raw[offset] = verticalLine || bottomLine ? 229 : 35;
        raw[offset + 1] = verticalLine || bottomLine ? 140 : 55;
        raw[offset + 2] = verticalLine || bottomLine ? 89 : 75;
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

for (const [filename, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  writeFileSync(join(iconDirectory, filename), makePng(size));
}

console.log(`Generated icons in ${iconDirectory}`);
