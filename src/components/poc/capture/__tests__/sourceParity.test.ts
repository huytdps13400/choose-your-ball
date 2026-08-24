import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

const root = fileURLToPath(new URL("../../../../../", import.meta.url));

const expected = {
  "assets/env/warehouse.png": "4963c48c277b927f40a7679841de4edb5ce39254c6f39c12389cb4cb1f3e03ec",
  "assets/models/ball-marks.png":
    "d22e2dd6fada67fe22fb709eb34924ed9dfe83ab7a7cad726efa8b30c2dc8196",
  "assets/models/ball.glb": "1c718014c19242b1a6f7ce207dbc32a645299cb17c44dabc6cfbd570197c29e5",
  "src/components/poc/capture/ActionButton.tsx":
    "3e3c91ab63d2928958d12a11c21bbbe43989719d6495a5f8814bc85d0db9e040",
  "src/components/poc/capture/BallBackdrop.tsx":
    "631c4b7f19a28ca4ab7a32e2ed47ee533fdd8aa822737c1396f559b95e6f8390",
  "src/components/poc/capture/BallStrip.tsx":
    "f4fe46ea578f83ab232e20f41b7824baa0f7fef495f60bc859908fc22e57ed76",
  "src/components/poc/capture/BallWordmark.tsx":
    "a9c9b957c8052a4584b28a728c2c5e4feb72dd197acd42fed190da469acf064f",
  "src/components/poc/capture/MorphingLabel.tsx":
    "07d224b33fe358fcc5024a4a038ca272004f0312754fe323812a1fbc5cf7df26",
  "src/components/poc/capture/MorphingText.tsx":
    "31f122fa8c2c253ef4b89141202e0ce8888eec70a75ec1a4321bc8d29c18403d",
  "src/components/poc/capture/PokeBallGraphic.tsx":
    "f9c94b4edbf9355cfb8f046c5fd411d8a9cd25e7a94e3d6bbbaa5331ae8e0c07",
  "src/components/poc/capture/ballCatalog.ts":
    "246ec22d2b92780fc493416ff4c1a236a8f06d62a7004e5172ea1f2a55c38b81",
  "src/components/poc/capture/ballEditorial.ts":
    "a221f7633b5e402be2d24e2d72a3b08d0199c2f9ca726bab7dedf363ac5b7b98",
  "src/components/poc/capture/ballPickerGeometry.ts":
    "9476d31d1edcd7d1d368015231384aa2758753052f7fad633f5ad9bed41cd3e4",
  "src/components/poc/capture/ballStageMotion.ts":
    "8e378830cd15f0b307024fcfbbd8ec9b10bfc0414963bab548bc8b25091f801d",
  "src/components/poc/capture/ballSurface.ts":
    "d8db471e36c3b72858802aadadb6b53069337dfea5a7823bb3986a3311372001",
  "src/components/poc/capture/constants.ts":
    "08232dd16edd095c28ae1ab0e2f75866d8dc6339fd4e2903fee576e66b7de8ba",
  "src/components/poc/capture/palette.ts":
    "a4be9957b730490abe0a5d253d5fb76aa18eaea8866c0f47146db2b0a6d0dd54",
  "src/components/poc/capture/useBallTilt.ts":
    "0d75e9117049430fc96db2c0f98e37111a338c0eb2d2df0ebbc4132a179f3653",
} as const;

const sha256 = (path: string): string =>
  createHash("sha256")
    .update(readFileSync(`${root}${path}`))
    .digest("hex");

describe("the standalone showcase preserves the Three.js product contract", () => {
  for (const [path, hash] of Object.entries(expected)) {
    test(`${path} is byte-identical to the locked reference`, () => {
      expect(sha256(path)).toBe(hash);
    });
  }
});
