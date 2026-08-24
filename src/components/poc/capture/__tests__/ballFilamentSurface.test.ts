import { describe, expect, test } from "bun:test";

import {
  BALL_FILAMENT_MESH_PAINT,
  filamentMarkScale,
  filamentShellMaskCoverage,
  filamentSurface,
} from "../ballFilamentSurface";

describe("Filament ball surface parity", () => {
  test("keeps procedural Dusk paint on the shell instead of borrowing Ultra geometry", () => {
    expect(filamentSurface("dusk")).toEqual({
      accent: "#62D539",
      art: "wedge",
      base: "#525252",
      button: "#E7E7E7",
      meshMarks: [],
    });
  });

  test("keeps the three artist-authored mesh markings and exact paint", () => {
    expect(filamentSurface("great").art).toBe("solid");
    expect(filamentSurface("great").meshMarks).toEqual(["mark-great"]);
    expect(filamentSurface("ultra").meshMarks).toEqual(["mark-ultra"]);
    expect(filamentSurface("master").meshMarks).toEqual([
      "mark-master-patch",
      "mark-master-emblem",
    ]);
    expect(BALL_FILAMENT_MESH_PAINT).toEqual({
      "mark-great": "#850007",
      "mark-master-emblem": "#FFFFFF",
      "mark-master-patch": "#EB0997",
      "mark-ultra": "#AAA000",
    });
    expect(filamentMarkScale("great", "mark-great")).toEqual([1.006, 1.006, 1.006]);
    expect(filamentMarkScale("dusk", "mark-ultra")).toEqual([0, 0, 0]);
    expect(filamentMarkScale("master", "mark-master-emblem")).toEqual([1.02, 1.02, 1.02]);
  });

  test("uses the same feathered procedural mask geometry as the Three renderer", () => {
    expect(filamentShellMaskCoverage("solid", 0.25, 0.5)).toBe(0);
    expect(filamentShellMaskCoverage("wedge", 0.25, 0.5)).toBe(0);
    expect(filamentShellMaskCoverage("wedge", 0.08, 0.95)).toBe(0);
    expect(filamentShellMaskCoverage("wedge", 0.08, 0.75)).toBe(1);
    expect(filamentShellMaskCoverage("band", 0.25, 0.45)).toBe(1);
    expect(filamentShellMaskCoverage("band", 0.25, 0.7)).toBe(0);
  });
});
