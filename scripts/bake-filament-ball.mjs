import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const sourcePath = resolve(projectRoot, "assets/models/ball.glb");
const outputPath = resolve(projectRoot, "assets/models/ball-filament.glb");

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([header, typeBuffer, data, checksum]);
}

function whitePixelPng() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(Buffer.from([0, 255, 255, 255, 255]))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function paddedJsonBuffer(value) {
  const source = Buffer.from(JSON.stringify(value), "utf8");
  const padding = (4 - (source.length % 4)) % 4;
  return Buffer.concat([source, Buffer.alloc(padding, 0x20)]);
}

function chunk(type, contents) {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(contents.length, 0);
  header.writeUInt32LE(type, 4);
  return Buffer.concat([header, contents]);
}

function parseGlb(source) {
  if (source.readUInt32LE(0) !== GLB_MAGIC || source.readUInt32LE(4) !== GLB_VERSION) {
    throw new Error("Expected a glTF 2.0 binary asset");
  }

  const declaredLength = source.readUInt32LE(8);
  if (declaredLength !== source.length) {
    throw new Error(`Invalid GLB length: header=${declaredLength}, bytes=${source.length}`);
  }

  let cursor = 12;
  let json;
  let binary;
  while (cursor < source.length) {
    const length = source.readUInt32LE(cursor);
    const type = source.readUInt32LE(cursor + 4);
    const contents = source.subarray(cursor + 8, cursor + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(contents.toString("utf8"));
    if (type === BIN_CHUNK) binary = Buffer.from(contents);
    cursor += 8 + length;
  }

  if (!json || !binary) throw new Error("Expected one JSON chunk and one BIN chunk");
  return { binary, json };
}

const source = await readFile(sourcePath);
const { binary, json } = parseGlb(source);
const whiteTexture = whitePixelPng();
const imageOffset = binary.length;
const imagePadding = (4 - (whiteTexture.length % 4)) % 4;
const derivedBinary = Buffer.concat([binary, whiteTexture, Buffer.alloc(imagePadding)]);
const imageBufferView = json.bufferViews.length;

json.bufferViews.push({
  buffer: 0,
  byteLength: whiteTexture.length,
  byteOffset: imageOffset,
});
json.buffers[0].byteLength = derivedBinary.length;
json.images = [{ bufferView: imageBufferView, mimeType: "image/png", name: "filament-white" }];
json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
json.textures = [{ sampler: 0, source: 0 }];

json.materials = json.meshes.map(({ name }, index) => ({
  name: name ?? `ball-part-${index}`,
  pbrMetallicRoughness: {
    baseColorFactor: [1, 1, 1, 1],
    baseColorTexture: { index: 0 },
    metallicFactor: 0,
    roughnessFactor: 1,
  },
}));

json.meshes.forEach((mesh, materialIndex) => {
  mesh.primitives.forEach((primitive) => {
    primitive.material = materialIndex;
  });
});

const jsonChunk = chunk(JSON_CHUNK, paddedJsonBuffer(json));
const binaryChunk = chunk(BIN_CHUNK, derivedBinary);
const header = Buffer.alloc(12);
header.writeUInt32LE(GLB_MAGIC, 0);
header.writeUInt32LE(GLB_VERSION, 4);
header.writeUInt32LE(header.length + jsonChunk.length + binaryChunk.length, 8);

await writeFile(outputPath, Buffer.concat([header, jsonChunk, binaryChunk]));
console.log(`Baked ${json.materials.length} independent Filament materials → ${outputPath}`);
