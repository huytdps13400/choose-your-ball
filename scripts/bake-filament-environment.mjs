import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cmgen = process.env.CMGEN_BIN;
if (!cmgen) {
  throw new Error(
    "Set CMGEN_BIN to Filament cmgen (v1.68.3 is the version paired with RNF 1.11.0)."
  );
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const source = resolve(projectRoot, "assets/env/warehouse.png");
const output = resolve(projectRoot, "assets/env/warehouse-ibl.ktx");
const work = mkdtempSync(resolve(tmpdir(), "choose-ball-ibl-"));
const rgbaSource = resolve(work, "warehouse-rgbe.rgba");
const hdrSource = resolve(work, "warehouse-rgbe.hdr");
const deploy = resolve(work, "ktx");

// warehouse.png is not an LDR RGBA photograph: it is the source Radiance RGBE
// stream re-containered as PNG, with the shared exponent in alpha. Restore a
// real .hdr stream before cmgen or the room loses its 0.1–240 radiance range.
const png = readFileSync(source);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
execFileSync(
  "ffmpeg",
  ["-v", "error", "-i", source, "-f", "rawvideo", "-pix_fmt", "rgba", rgbaSource],
  { stdio: "inherit" }
);

const rgba = readFileSync(rgbaSource);
if (rgba.length !== width * height * 4) throw new Error("Unexpected decoded RGBE byte count");
const hdr = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`)];
for (let y = 0; y < height; y += 1) {
  // Three's DataTexture uploads the decoded RGBE rows without flipY. cmgen's
  // equirectangular importer uses the opposite vertical convention, so feed
  // it bottom-to-top rows to preserve the room orientation seen by Three.
  const sourceY = height - 1 - y;
  hdr.push(Buffer.from([2, 2, width >> 8, width & 255]));
  for (let channel = 0; channel < 4; channel += 1) {
    for (let x = 0; x < width; x += 128) {
      const count = Math.min(128, width - x);
      const literal = Buffer.alloc(count + 1);
      literal[0] = count;
      for (let i = 0; i < count; i += 1) {
        // Filament's equirectangular forward axis is half a turn from the
        // Three/PMREM room orientation, so preserve that yaw in the bake.
        const sourceX = (x + i + width / 2) % width;
        literal[i + 1] = rgba[(sourceY * width + sourceX) * 4 + channel];
      }
      hdr.push(literal);
    }
  }
}
writeFileSync(hdrSource, Buffer.concat(hdr));

execFileSync(cmgen, ["--quiet", "--format=ktx", "--size=256", `--deploy=${deploy}`, hdrSource], {
  stdio: "inherit",
});
copyFileSync(resolve(deploy, "ktx_ibl.ktx"), output);
console.log(`Baked warehouse Filament IBL → ${output}`);
