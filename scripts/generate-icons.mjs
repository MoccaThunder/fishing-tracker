import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/icon-source.svg");

const targets = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(file);
  console.log(`Wrote ${file}`);
}
