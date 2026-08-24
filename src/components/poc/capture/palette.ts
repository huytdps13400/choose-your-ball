/**
 * The stage palette.
 *
 * One rule decides every colour here: this is a Trainer's ritual, not a
 * laboratory. Cyan and violet neon are what made the old stage read as
 * engineering UI — a cyan kicker over a cyan hint over a cyan contact light is
 * a readout, whatever the words say. So the chrome is warm and neutral, and
 * saturated colour is spent only where it means something: the Pokémon's type,
 * and the ball's own aura.
 *
 * Anything that wants a hue therefore takes it from `ball.fx` or from the
 * species accent, and everything else picks a neutral from this file.
 */

/** Stage ground: the void the whole flow is staged on. */
export const STAGE_INK = "#06080C";
/** The dip frame between phases — a shade under the stage, so a cut reads as a cut. */
export const STAGE_DIP = "#04060A";

/** Primary copy. */
export const TEXT_PRIMARY = "#F4F7FA";
/** Supporting copy under a title. */
export const TEXT_SECONDARY = "#8B97A3";
/** Labels, counts, and anything the eye should skip unless it is looking for it. */
export const TEXT_MUTED = "#65727F";

/**
 * The one accent the chrome is allowed. Warm gold reads as a Poké Ball's own
 * trim and as the light inside it — the same family as the success stars — so
 * a kicker in this colour belongs to the object rather than to a HUD.
 */
export const RITUAL_GOLD = "#F0C548";
/** Where light is genuinely light: seams, sweeps, sparks, contact. */
export const RITUAL_LIGHT = "#FFF6DC";
/** Daylight inside a Poké Ball. Neutral on purpose — it is not an energy colour. */
export const DAYLIGHT = "#FFFDF6";

/**
 * Daylight carrying a species' colour — the light of the opening beat once the
 * blind box direction (2026-07-30) put the creature INSIDE it: the shell is
 * holding a living thing, so the light that escapes is that thing's light,
 * warmed by the neutral daylight so it still reads as illumination rather than
 * as an energy discharge. `amount` is how much of the accent survives the mix.
 */
export function speciesDaylight(accent: string, amount = 0.6): string {
  const hex = (value: string) => parseInt(value, 16);
  const day = DAYLIGHT.slice(1);
  const tint = accent.slice(1);
  const channel = (offset: number) => {
    const mixed = Math.round(
      hex(day.slice(offset, offset + 2)) * (1 - amount) +
        hex(tint.slice(offset, offset + 2)) * amount
    );
    return mixed.toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}
