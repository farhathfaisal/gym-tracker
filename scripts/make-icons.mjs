import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const mark = `
  <rect x="168" y="500" width="688" height="24" rx="12" fill="url(#metal)"/>
  <rect x="196" y="340" width="78" height="344" rx="18" fill="url(#metal)"/>
  <rect x="292" y="400" width="52" height="224" rx="14" fill="url(#metal)"/>
  <rect x="680" y="400" width="52" height="224" rx="14" fill="#30D158"/>
  <rect x="750" y="340" width="78" height="344" rx="18" fill="url(#metal)"/>
`;

function svg(scale) {
  const transform =
    scale === 1
      ? ""
      : `transform="translate(512 512) scale(${scale}) translate(-512 -512)"`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1C1E24"/>
      <stop offset="1" stop-color="#0A0B0E"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#D5D6DC"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g ${transform}>${mark}</g>
</svg>`;
}

await mkdir("public/icons", { recursive: true });
await mkdir("src/app", { recursive: true });

const targets = [
  ["public/icons/icon-192.png", 192, 1],
  ["public/icons/icon-512.png", 512, 1],
  ["public/icons/apple-touch-icon.png", 180, 1],
  ["public/icons/icon-maskable-512.png", 512, 0.68],
  ["src/app/icon.png", 512, 1],
  ["src/app/apple-icon.png", 180, 1],
];

for (const [file, size, scale] of targets) {
  await sharp(Buffer.from(svg(scale))).resize(size, size).png().toFile(file);
}
