import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import { getBall } from "../ballCatalog";
import {
  BALL_GLTF_MATERIALS,
  BALL_HARDWARE_COLORS,
  BALL_ENTITY_NAMES,
  FILAMENT_CAMERA,
  FILAMENT_COLOR_GRADING,
  FILAMENT_ENVIRONMENT_INTENSITY,
  FILAMENT_LIGHT_UNIT_SCALE,
  ballViewport,
  cameraProjectionArguments,
  cameraOrbitPosition,
  filamentDirectLights,
} from "../BallStage3D.contract";

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const rendererSource = readFileSync(`${root}src/components/poc/capture/BallStage3D.tsx`, "utf8");
const appSource = readFileSync(`${root}App.tsx`, "utf8");

function glbNodeNames(): string[] {
  const bytes = readFileSync(`${root}assets/models/ball.glb`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")) as {
    nodes: { name?: string }[];
  };
  return json.nodes.flatMap((node) => (node.name ? [node.name] : []));
}

function filamentGlbJson(): {
  images: { bufferView: number; mimeType: string }[];
  materials: {
    name?: string;
    pbrMetallicRoughness?: { baseColorTexture?: { index: number } };
  }[];
  meshes: { name?: string; primitives: { material?: number }[] }[];
} {
  const bytes = readFileSync(`${root}assets/models/ball-filament.glb`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(12, true);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
}

describe("BallStage3D Filament parity contract", () => {
  test("keeps the exact square camera and viewport contract", () => {
    expect(FILAMENT_CAMERA).toEqual({
      aspect: 1,
      far: 100,
      fovDirection: "vertical",
      fovDegrees: 26,
      near: 0.1,
      position: [0, 0, 5.9],
      target: [0, 0, 0],
      tiltDegrees: 25,
      up: [0, 1, 0],
    });
    expect(cameraProjectionArguments()).toEqual([26, 1, 0.1, 100, "vertical"]);
    expect(FILAMENT_COLOR_GRADING).toEqual({
      exposureStops: Math.log2(1.15),
      toneMapper: "acesLegacy",
    });
    expect(FILAMENT_ENVIRONMENT_INTENSITY).toBe(30_000);
    expect(ballViewport(320)).toEqual({ center: [160, 160], height: 320, width: 320 });
  });

  test("orbits the camera through plus or minus 25 degrees around the origin", () => {
    expect(cameraOrbitPosition(0)).toEqual([0, 0, 5.9]);

    const upper = cameraOrbitPosition(1);
    const lower = cameraOrbitPosition(-1);
    const expectedY = Math.sin((25 * Math.PI) / 180) * 5.9;
    const expectedZ = Math.cos((25 * Math.PI) / 180) * 5.9;

    expect(Math.abs(upper[1] - expectedY)).toBeLessThan(1e-12);
    expect(Math.abs(lower[1] + expectedY)).toBeLessThan(1e-12);
    expect(Math.abs(upper[2] - expectedZ)).toBeLessThan(1e-12);
    expect(Math.abs(lower[2] - expectedZ)).toBeLessThan(1e-12);
    expect(cameraOrbitPosition(2)).toEqual(upper);
    expect(cameraOrbitPosition(-2)).toEqual(lower);
  });

  test("selects all eight GLB entities by their exact baked names", () => {
    expect(BALL_ENTITY_NAMES).toEqual([
      "shell-upper",
      "shell-lower",
      "band",
      "button",
      "mark-great",
      "mark-ultra",
      "mark-master-patch",
      "mark-master-emblem",
    ]);
    expect(glbNodeNames().toSorted()).toEqual([...BALL_ENTITY_NAMES].toSorted());
  });

  test("gives every Filament mesh its own material instance", () => {
    const glb = filamentGlbJson();
    const meshNames = glb.meshes.map(({ name }) => name);

    expect(glb.materials.map(({ name }) => name)).toEqual(meshNames);
    expect(meshNames.toSorted()).toEqual([...BALL_ENTITY_NAMES].toSorted());
    expect(glb.meshes.map(({ primitives }) => primitives[0]?.material)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(
      glb.materials.map(({ pbrMetallicRoughness }) => pbrMetallicRoughness?.baseColorTexture)
    ).toEqual(Array.from({ length: 8 }, () => ({ index: 0 })));
    expect(glb.images).toHaveLength(1);
    expect(glb.images[0]?.mimeType).toBe("image/png");
  });

  test("uses textured shell paint and fixed reference hardware colors", () => {
    expect(BALL_HARDWARE_COLORS).toEqual({
      band: "#000000",
      button: "#E7E7E7",
      lower: "#E7E7E7",
    });
    expect(BALL_GLTF_MATERIALS.button.baseColorFactor).toEqual([1.16, 1.32, 1.65, 1]);
    expect(BALL_GLTF_MATERIALS.lower.baseColorFactor).toEqual([1.16, 1.32, 1.65, 1]);
    expect(BALL_GLTF_MATERIALS.upper).toEqual({
      baseColorFactor: [1, 1, 1, 1],
      metallicFactor: 0.1,
      roughnessFactor: 0,
    });
    expect(BALL_GLTF_MATERIALS.lower.roughnessFactor).toBe(0);
    expect(BALL_GLTF_MATERIALS.band.roughnessFactor).toBe(0.14);
    expect(BALL_GLTF_MATERIALS.button.roughnessFactor).toBe(0);
  });

  test("preserves source light geometry and explicit Filament unit mapping", () => {
    const lights = filamentDirectLights("dusk");
    expect(lights.key.sourcePosition).toEqual([-2.4, 3.2, 3.4]);
    expect(lights.fill.sourcePosition).toEqual([2.6, -1.4, 1.8]);
    expect(lights.rim.position).toEqual([2.1, -0.9, -1.7]);
    expect(lights.rimBack.position).toEqual([-2.1, 0.7, -1.8]);
    expect(lights.key.sourceColor).toBe("#FFFFFF");
    expect(lights.fill.sourceColor).toBe("#8FA6C4");
    expect(lights.rim.sourceColor).toBe(getBall("dusk").fx.aura);
    expect(lights.rimBack.sourceColor).toBe(getBall("dusk").fx.aura);
    expect(FILAMENT_LIGHT_UNIT_SCALE).toEqual({
      directionalLuxPerThreeUnit: 10_000,
      pointLumensPerThreeUnit: 1_000,
    });
  });

  test("uses one transparent, bounded FilamentView and no legacy renderer imports", () => {
    expect(rendererSource.match(/<FilamentView\b/g) ?? []).toHaveLength(1);
    expect(rendererSource.match(/<EntitySelector\b/g) ?? []).toHaveLength(8);
    expect(rendererSource).toContain("enableTransparentRendering");
    expect(rendererSource).toContain("<EnvironmentalLight");
    expect(rendererSource).toContain("engine.setACESLegacyColorGrading(");
    expect(rendererSource).toContain('require("../../../../assets/env/warehouse-ibl.ktx")');
    expect(rendererSource).toContain("useFilamentSharedValueBridge(tilt, 0)");
    expect(rendererSource).toContain("useFilamentSharedValueBridge(offset, 0)");
    expect(rendererSource).toContain("TURN_PER_SLOT");
    expect(rendererSource).not.toContain("tilt.get()");
    expect(rendererSource).toContain("useBallFilamentTextures()[variant]");
    expect(rendererSource).toContain("filamentSurface(variant)");
    expect(rendererSource).not.toContain("DuskBallModel");
    expect(rendererSource).not.toContain("Spike");
    expect(rendererSource).toContain('materialName: "shell-upper"');
    expect(rendererSource).toContain('require("../../../../assets/models/ball-filament.glb")');
    expect(rendererSource).not.toMatch(/from ["'][^"']*(?:three|webgpu)/i);
    expect(rendererSource).not.toContain("StyleSheet.absoluteFill");
    expect(rendererSource).not.toContain("flex: 1");
    expect(rendererSource).toContain("projection[4]");
  });

  test("keeps the interactive App screen on the copied source composition formulas", () => {
    expect(appSource).toContain('backgroundColor: "#06080C"');
    expect(appSource).toContain("<BallBackdrop");
    expect(appSource).toContain("<BallWordmark");
    expect(appSource).toContain("<BallStage3D");
    expect(appSource).toContain("height * PICKER_BALL_CENTER_FRACTION");
    expect(appSource).toContain("pickerSourceBoundarySize(width, compact)");
    expect(appSource).toContain("<BallStrip");
    expect(appSource).toContain("<ActionButton");
    expect(appSource).toContain('useChooseBallCarousel("dusk")');
    expect(appSource).toContain("useBallTilt");
    expect(appSource).toContain("Gesture.Race(panGesture, tiltGesture)");
    expect(appSource).toContain("variant={previewBall}");
    expect(appSource).not.toContain("disabled={!settled}");
    expect(appSource).toContain("order={order}");
    expect(appSource).toContain("total={total}");
    expect(appSource).not.toContain("DUSK_BALL");
  });
});
