import { getBall } from "./ballCatalog";

export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];

export const BALL_ENTITY_NAMES = [
  "shell-upper",
  "shell-lower",
  "band",
  "button",
  "mark-great",
  "mark-ultra",
  "mark-master-patch",
  "mark-master-emblem",
] as const;

export const FILAMENT_CAMERA = {
  aspect: 1,
  far: 100,
  fovDirection: "vertical",
  fovDegrees: 26,
  near: 0.1,
  position: [0, 0, 5.9] as Vec3,
  target: [0, 0, 0] as Vec3,
  tiltDegrees: 25,
  up: [0, 1, 0] as Vec3,
} as const;

export function cameraProjectionArguments(): [number, number, number, number, "vertical"] {
  "worklet";
  return [
    FILAMENT_CAMERA.fovDegrees,
    FILAMENT_CAMERA.aspect,
    FILAMENT_CAMERA.near,
    FILAMENT_CAMERA.far,
    FILAMENT_CAMERA.fovDirection,
  ];
}

export function ballViewport(size: number): {
  center: [number, number];
  height: number;
  width: number;
} {
  return { center: [size / 2, size / 2], height: size, width: size };
}

export function cameraOrbitPosition(tilt: number): Vec3 {
  "worklet";
  const clampedTilt = Math.max(-1, Math.min(1, tilt));
  const angle = clampedTilt * FILAMENT_CAMERA.tiltDegrees * (Math.PI / 180);
  return [
    FILAMENT_CAMERA.position[0],
    Math.sin(angle) * FILAMENT_CAMERA.position[2],
    Math.cos(angle) * FILAMENT_CAMERA.position[2],
  ];
}

export const BALL_HARDWARE_COLORS = {
  band: "#000000",
  button: "#E7E7E7",
  lower: "#E7E7E7",
} as const;

function srgbChannelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function hexToLinearRgba(hex: string): Vec4 {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [
    srgbChannelToLinear((value >> 16) & 255),
    srgbChannelToLinear((value >> 8) & 255),
    srgbChannelToLinear(value & 255),
    1,
  ];
}

export const BALL_GLTF_MATERIALS = {
  band: {
    baseColorFactor: hexToLinearRgba(BALL_HARDWARE_COLORS.band),
    metallicFactor: 0,
    roughnessFactor: 0.14,
  },
  button: {
    baseColorFactor: hexToLinearRgba(BALL_HARDWARE_COLORS.button),
    metallicFactor: 0,
    roughnessFactor: 0,
  },
  lower: {
    baseColorFactor: hexToLinearRgba(BALL_HARDWARE_COLORS.lower),
    metallicFactor: 0,
    roughnessFactor: 0,
  },
  upper: {
    baseColorFactor: [1, 1, 1, 1] as Vec4,
    metallicFactor: 0.1,
    roughnessFactor: 0,
  },
} as const;

/** Three's unitless lights mapped to Filament's physical lux/lumen units. */
export const FILAMENT_LIGHT_UNIT_SCALE = {
  directionalLuxPerThreeUnit: 10_000,
  pointLumensPerThreeUnit: 1_000,
} as const;

function directionToOrigin(position: Vec3): Vec3 {
  const length = Math.hypot(position[0], position[1], position[2]);
  return [-position[0] / length, -position[1] / length, -position[2] / length];
}

type DirectionalLightContract = {
  direction: Vec3;
  filamentIntensity: number;
  linearColor: Vec3;
  sourceColor: string;
  sourceIntensity: number;
  sourcePosition: Vec3;
  type: "directional";
};

type PointLightContract = {
  falloffRadius: number;
  filamentIntensity: number;
  linearColor: Vec3;
  position: Vec3;
  sourceColor: string;
  sourceIntensity: number;
  type: "point";
};

export type FilamentDirectLightContract = DirectionalLightContract | PointLightContract;

const keyPosition: Vec3 = [-2.4, 3.2, 3.4];
const fillPosition: Vec3 = [2.6, -1.4, 1.8];

export function filamentDirectLights(ballId: Parameters<typeof getBall>[0]) {
  const ball = getBall(ballId);
  return {
    fill: {
      direction: directionToOrigin(fillPosition),
      filamentIntensity: 0.35 * FILAMENT_LIGHT_UNIT_SCALE.directionalLuxPerThreeUnit,
      linearColor: hexToLinearRgba("#8FA6C4").slice(0, 3) as Vec3,
      sourceColor: "#8FA6C4",
      sourceIntensity: 0.35,
      sourcePosition: fillPosition,
      type: "directional",
    },
    key: {
      direction: directionToOrigin(keyPosition),
      filamentIntensity: 2.2 * FILAMENT_LIGHT_UNIT_SCALE.directionalLuxPerThreeUnit,
      linearColor: hexToLinearRgba("#FFFFFF").slice(0, 3) as Vec3,
      sourceColor: "#FFFFFF",
      sourceIntensity: 2.2,
      sourcePosition: keyPosition,
      type: "directional",
    },
    rim: {
      falloffRadius: 14,
      filamentIntensity: 9 * FILAMENT_LIGHT_UNIT_SCALE.pointLumensPerThreeUnit,
      linearColor: hexToLinearRgba(ball.fx.aura).slice(0, 3) as Vec3,
      position: [2.1, -0.9, -1.7],
      sourceColor: ball.fx.aura,
      sourceIntensity: 9,
      type: "point",
    },
    rimBack: {
      falloffRadius: 14,
      filamentIntensity: 5.5 * FILAMENT_LIGHT_UNIT_SCALE.pointLumensPerThreeUnit,
      linearColor: hexToLinearRgba(ball.fx.aura).slice(0, 3) as Vec3,
      position: [-2.1, 0.7, -1.8],
      sourceColor: ball.fx.aura,
      sourceIntensity: 5.5,
      type: "point",
    },
  } satisfies Record<string, FilamentDirectLightContract>;
}
