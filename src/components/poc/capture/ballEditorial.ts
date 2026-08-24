import type { BallSpec } from "./ballCatalog";
import { BALL_CATALOG } from "./ballCatalog";

/**
 * The editorial layer of a ball: how its name is set, what colour the page
 * takes from it, and the three facts worth printing next to it.
 *
 * It lives apart from `ballCatalog` on purpose. The catalog is what a ball IS —
 * shell colours, catch multiplier, tier — and it is shared with the encounter,
 * the throw and the ritual. This is what the loadout screen SAYS about a ball,
 * which is a presentation decision and belongs to the screen that makes it.
 */

/**
 * The name, split for setting: everything before the last word on one line, the
 * last word on the next.
 *
 * Every ball in the catalog is "<Something> Ball", so the second line is always
 * BALL — which is the point. It becomes a fixed rhythm the eye stops reading
 * after the first screen, and the first line carries the whole identity.
 */
export function wordmark(label: string): [string, string] {
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return [label.toUpperCase(), ""];
  return [parts.slice(0, -1).join(" ").toUpperCase(), parts[parts.length - 1].toUpperCase()];
}

/**
 * Every hero word the wordmark will ever show, so the display size can be
 * fitted to the widest of them ONCE. Without it the type resizes as the
 * carousel turns, which reads as a layout bug rather than as a feature — and it
 * would fight the glyph morph, since a letter that survives a swap would also
 * have to change size mid-glide.
 */
export const WORDMARK_HEROES: readonly string[] = Object.values(BALL_CATALOG).map(
  (ball) => wordmark(ball.label)[0]
);

/** What the tier is called in the one place the player sees it. */
export function tierLabel(tier: BallSpec["tier"]): string {
  if (tier === 1) return "STANDARD";
  if (tier === 2) return "SITUATIONAL";
  if (tier === 3) return "RARE";
  return "CHERISH";
}

/**
 * The ground colour the page takes from a ball.
 *
 * Not the shell colour: a screen filled with a Master Ball's violet at full
 * strength is a violet screen, and the ball stops being the brightest thing on
 * it. This darkens and desaturates toward the stage's own near-black until the
 * hue is a LEAN rather than a wash — the page reads as lit by the ball rather
 * than painted the same colour as it.
 */
export function groundFromBall(hex: string): string {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  /**
   * How far the ground travels from stage ink toward the ball, and the reason
   * it is not one number.
   *
   * A flat 0.32 treats every hue as equally bright, which they are not: a Dusk
   * Ball's deep green lands as a lean, and an Ultra Ball's near-white yellow
   * lands as a field of olive mud — the same fraction of a luminous colour is a
   * WASH. So the reach is scaled down by the source's own luminance: dark auras
   * keep almost the whole of it, bright ones give most of it back, and every
   * ball ends up at a comparable weight on the page rather than at a comparable
   * distance from it.
   */
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const reach = 0.3 * (1 - luma * 0.55);
  // Toward the stage ink (#06080C) but not all the way, and biased down — a
  // ground lighter than the object standing on it inverts the whole image.
  const mix = (channel: number, ink: number): number =>
    Math.round(Math.min(255, ink + (channel - ink) * reach));
  const out = [mix(r, 6), mix(g, 8), mix(b, 12)];
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** The three chips printed under the ball, in reading order. */
export function ballFacts(ball: BallSpec, blurb: string): string[] {
  return [`×${ball.catchMod} CATCH`, tierLabel(ball.tier), keyword(blurb)];
}

/**
 * One word lifted out of the blurb, so the third chip says something specific
 * to this ball rather than repeating its tier. Falls back to the tier's own
 * word when the blurb has nothing distinctive in it.
 */
function keyword(blurb: string): string {
  const known = [
    "night",
    "cave",
    "water",
    "surfing",
    "fishing",
    "turn",
    "first",
    "friend",
    "gift",
    "speed",
    "heavy",
    "light",
    "fast",
    "slow",
    "moon",
    "sun",
    "bug",
    "dark",
  ];
  const lower = blurb.toLowerCase();
  const hit = known.find((word) => lower.includes(word));
  return (hit ?? "field").toUpperCase();
}
