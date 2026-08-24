import type { BallArt, BallId } from "./ballCatalog";
import { getBall } from "./ballCatalog";

export type BallMeshMark = "mark-great" | "mark-master-emblem" | "mark-master-patch" | "mark-ultra";

export const FILAMENT_SHELL_TEXTURE_SIZE = { height: 256, width: 512 } as const;
export const FILAMENT_MARK_FEATHER = 0.006;

export const BALL_FILAMENT_MESH_PAINT: Record<BallMeshMark, string> = {
  "mark-great": "#850007",
  "mark-master-emblem": "#FFFFFF",
  "mark-master-patch": "#EB0997",
  "mark-ultra": "#AAA000",
};

const EXACT_SHELL: Readonly<Partial<Record<BallId, string>>> = {
  great: "#274786",
  master: "#35175C",
  poke: "#FF0000",
  ultra: "#000000",
};

const BALL_MESH_MARKS: Readonly<Partial<Record<BallId, BallMeshMark[]>>> = {
  great: ["mark-great"],
  master: ["mark-master-patch", "mark-master-emblem"],
  ultra: ["mark-ultra"],
};

const BALL_MESH_MARK_LIFT: Record<BallMeshMark, number> = {
  "mark-great": 1.006,
  "mark-master-emblem": 1.02,
  "mark-master-patch": 1.006,
  "mark-ultra": 1.006,
};

const SHELL_MARK = {
  band: { high: 0.55, low: 0.36 },
  crest: { centre: 0.52, halfWidth: 0.035, radius: 0.13, spread: 2.4 },
  emblem: { halfHeight: 0.035, halfWidth: 0.018, offset: 0.115 },
  stripes: { centre: 0.085, halfWidth: 0.02 },
  wedge: { inner: 0.125, outer: 0.3, top: 0.86 },
} as const;

export type FilamentBallSurface = {
  accent: string;
  art: BallArt;
  base: string;
  button: "#E7E7E7";
  meshMarks: BallMeshMark[];
};

export function filamentSurface(ballId: BallId): FilamentBallSurface {
  const ball = getBall(ballId);
  const meshMarks = BALL_MESH_MARKS[ballId] ?? [];
  return {
    accent: ball.accent,
    art: meshMarks.length > 0 ? "solid" : ball.art,
    base: EXACT_SHELL[ballId] ?? ball.shell[0],
    button: "#E7E7E7",
    meshMarks: [...meshMarks],
  };
}

export function filamentMarkScale(ballId: BallId, mark: BallMeshMark): [number, number, number] {
  const visible = BALL_MESH_MARKS[ballId]?.includes(mark) ?? false;
  const scale = visible ? BALL_MESH_MARK_LIFT[mark] : 0;
  return [scale, scale, scale];
}

export function filamentShellMaskCoverage(art: BallArt, u: number, v: number): number {
  const du = Math.abs((((u - 0.25 + 0.5) % 1) + 1) % 1) - 0.5;
  const front = Math.abs(du);
  let distance = 1;

  if (art === "stripes") {
    const { centre, halfWidth } = SHELL_MARK.stripes;
    distance = Math.abs(front - centre) - halfWidth;
  } else if (art === "wedge") {
    const { inner, outer, top } = SHELL_MARK.wedge;
    distance = Math.max(inner - front, front - outer, v - top);
  } else if (art === "band") {
    const { low, high } = SHELL_MARK.band;
    distance = Math.max(low - v, v - high);
  } else if (art === "crest" || art === "emblem") {
    const { spread, centre, radius, halfWidth } = SHELL_MARK.crest;
    const dx = front * spread;
    const dy = v - centre;
    distance = Math.abs(Math.sqrt(dx * dx + dy * dy) - radius) - halfWidth;
    if (art === "emblem") {
      const dot = SHELL_MARK.emblem;
      distance = Math.min(
        distance,
        Math.max(Math.abs(dy) - dot.halfHeight, Math.abs(front - dot.offset) - dot.halfWidth)
      );
    }
  }

  const coverage = 0.5 - distance / (FILAMENT_MARK_FEATHER * 2);
  return Math.max(0, Math.min(1, coverage));
}
