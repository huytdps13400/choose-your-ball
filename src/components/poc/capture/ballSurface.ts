/**
 * What a Poké Ball's surfaces are made of — the one table every renderer of the
 * object reads.
 *
 * There are three of them in this app and there is no prospect of there being
 * fewer: `BallStage3D` draws a baked mesh lit by a real renderer, `PokeBall3D`
 * raymarches a hollow shell that has to HINGE OPEN, and `PokeBallGraphic` is
 * flat vector art that has to survive being drawn at 20pt. Those are three
 * legitimate answers to three different problems. What was not legitimate is
 * that they disagreed about what the object looks like.
 *
 * **`ballStageScene` is the reference**, together with `ballShellArt` for the
 * markings and `ballCatalog` for the paint: that is the ball as it was actually
 * modelled and lit, and the other two are the same object drawn by cheaper
 * means. Numbers travel outward from there — never the reverse.
 *
 * ## The values are stated in sRGB and derived in linear, not the other way
 *
 * This is the whole reason the seam drifted. The mesh and the vector art are
 * authored as sRGB hex; `pokeBall3DShader` shades in linear light and had its
 * own literals. Read as text all three looked like reasonable ways to write
 * "nearly black" — rendered, the shader's band was SEVEN TIMES lighter in linear
 * than the mesh's, so the same seam was a dark grey moulding on one screen and a
 * black interval on the next. A number that has to be converted by hand in order
 * to be compared is a number that will drift again, so it is converted here.
 */

/** One sRGB channel 0–255 as linear light. The usual transfer curve. */
function decode(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/** `#rrggbb` as the linear triple a shader wants. */
export function hexToLinear(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(decode) as [
    number,
    number,
    number,
  ];
}

/** Formats a linear triple as an SKSL `float3` literal. */
export function skslFloat3(linear: readonly [number, number, number]): string {
  return `float3(${linear.map((channel) => channel.toFixed(5)).join(", ")})`;
}

/**
 * The seam band, and it is BLACK rather than the near-black it used to be.
 *
 * Both of these are now the source model's own material colours rather than this
 * project's approximations of them — `Material.003` and `Material.002` of the
 * GLB the reference implementation loads, which is exported from the same FBX
 * `scripts/bake-ball-model.mjs` reads. They are here rather than in the mesh
 * scene because three renderers draw this ball and all three have to agree:
 * `PokeBallGraphic` (flat), `pokeBall3DShader` (raymarched) and
 * `ballStageScene` (mesh).
 *
 * The band is no longer treated as matte either — see `ballStageScene`, where it
 * now takes roughness 0.14 and the full environment. In the reference it is the
 * glossiest thing on the ball after the shell.
 */
export const BAND_HEX = "#000000";

/**
 * The lower shell's paint — the half that is white on every ball in the catalog.
 * `ballCatalog`'s `shell` pair describes the UPPER half only.
 */
export const LOWER_SHELL_HEX = "#E7E7E7";

export const BAND_LINEAR = hexToLinear(BAND_HEX);
export const LOWER_SHELL_LINEAR = hexToLinear(LOWER_SHELL_HEX);

/**
 * The ball's SHAPE, in ball radii, measured off `assets/models/ball.glb`.
 *
 * The mesh gets these for free — it is the model. `pokeBall3DShader` builds its
 * ball out of signed distance functions instead, because it has to open, and it
 * was built before the model existed: it had a proud stripe for a seam and a
 * bulging dome for a button, against the model's recessed groove and seated
 * disc. Same ball, one screen apart, and the button was the tell — a nose stuck
 * on the front in one renderer and a fitting sunk into the housing in the other.
 *
 * Every number here is measured, and `__tests__/ballSurface.test.ts` re-measures
 * them from the shipped model. A re-bake that changes the object fails there
 * rather than leaving the two renderers to drift apart again quietly.
 */
export const BALL_SHAPE = {
  /**
   * Where each half stops, as a height above and below the equator. The halves
   * do NOT meet: the seam is a groove they close over, and this gap is what the
   * band shows through.
   */
  seamHalf: 0.073,
  /** The band ring's own radius — recessed below the shell's 1.0 skin. */
  bandRadius: 0.95,
  /** The button's outer radius, and how much of it is the rounded rim. */
  buttonRadius: 0.27,
  buttonRound: 0.09,
  /** Where the button's flat face stands: a hair proud of the shell. */
  buttonFace: 1.005,
  /**
   * The housing the button sits in, and it is a HOLE rather than a dent: the
   * lower shell is cut away inside this axial radius on the front face, and a
   * dished black plate sits `collarDepth` behind the skin, showing through.
   *
   * Worth stating because measuring it wrong is easy and looks catastrophic.
   * The plate itself runs out to axial 0.8 in the model — but everything past
   * the hole is UNDER the shell and never seen. Colouring the shell black out
   * to that radius, which is what taking the plate's own extent at face value
   * does, paints most of the lower hemisphere black.
   */
  collarHole: 0.338,
  collarDepth: 0.085,
} as const;
