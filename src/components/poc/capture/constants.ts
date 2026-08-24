// Thresholds and fixed sizes for the Capture Chamber. Anything that depends on
// the screen lives in stageMetrics.ts — this file holds only what never scales.
// See docs/superpowers/specs/2026-07-28-capture-chamber-polish-design.md.

/**
 * There is deliberately no `OPENING_BALL` here any more.
 *
 * It used to pin the encounter's opening to the standard red-and-white shell so
 * that equipping a Master Ball could never recolour it — the opening being the
 * wild Pokémon's ball, and the loadout's being the one thrown at it. The
 * 2026-08-04 direction reversed that: the loadout's hand-off now lands on the
 * hero ball itself rather than on a pocket badge, so the ball the player chose
 * IS the ball on the stage, and a second hard-wired ball in the middle of it
 * would be the thing that made the hand-off a lie. `AuraCapturePOC` passes
 * `captureBall` down to `OrbScene` and `OrbCopy`; there is one ball again.
 */

/**
 * The stage's ground line, as a fraction of `pokemonSize` below `pokemonY`.
 * Every species stands ON it — the contact light, the landing shockwave and the
 * art box's baseline all derive from this one number, which is what stops a
 * Rayquaza and an Eevee standing on two different floors.
 */
export const POKEMON_GROUND_OFFSET = 0.36;

export const BALL_SIZE = 220;
export const CAPTURE_BALL_SIZE = 84;
/**
 * The equipped ball while it is stowed. It is small on purpose: the dock is a
 * statement of what you are carrying, not a control, and the two things it has
 * to stay clear of are the hero ball above it and the action row below it.
 */
export const INVENTORY_BALL_SIZE = 34;
/**
 * The single slot the staged throw hints cross-fade inside, and the gap it
 * keeps from the ball's top edge. Shared with `stageMetrics.hintY` so the
 * metric and the component can never disagree about how tall the slot is —
 * disagreeing is what put the hint behind the ball.
 */
export const HINT_SLOT_HEIGHT = 60;
export const HINT_BALL_GAP = 16;
export const CARD_WIDTH = 232;
export const CARD_HEIGHT = 319;
export const CARD_RADIUS = 18;

// Pull–Track–Release: one slingshot gesture carries both force and direction.
// Pull distance → power, pull direction → launch direction (mirrored), and the
// Capture Ring previews the impact point from the same solver the flight uses.
/** Pull distance (pt) that reads as full power. */
export const MAX_PULL_PT = 190;
/** Below this power a release snaps the ball back — it never counts as a throw. */
export const MIN_LAUNCH_POWER = 0.25;
/** How much of the finger's travel past MAX_PULL_PT the ball still follows. */
export const PULL_FRICTION = 0.22;
/**
 * Lateral gearing: the impact point mirrors the pull at this ratio, so ~82pt of
 * sideways pull sweeps the reticle a full half-screen. Geared high on purpose —
 * the moving target is horizontal, and the thumb's comfortable travel is not.
 */
export const AIM_LATERAL_GAIN = 2.4;
/**
 * The reticle's ceiling: how far below the top inset a full pull can reach.
 * Depth is mapped per-axis (pull-down fraction → reach fraction), NOT along the
 * pull direction — direction-scaled range meant aiming wide always cost reach,
 * and the reticle could never cover the whole stage.
 */
export const AIM_TOP_MARGIN = 72;

// Hit quality is judged at IMPACT TIME: the ball's landing point against where
// the Pokémon actually is on that frame — never where it was at release.
export const GRADE_PERFECT = 0.15;
export const GRADE_GREAT = 0.35;

// The Capture Ring's shrink cycle — Pokémon GO's catch circle, and the reason
// aiming has a WHEN as well as a WHERE. The ring closes from RING_MAX_SCALE to
// RING_MIN_SCALE (both multiples of the species hit ellipse) over one cycle and
// hard-resets; the size at release is the throw's own multiplier ladder.
/** One full close. Scaled per awareness state — see `awareness.ts`. */
export const RING_CYCLE_MS = 2200;
export const RING_MAX_SCALE = 1.75;
export const RING_MIN_SCALE = 0.22;
/** The GO ladder, in ring scale. Tighter is better; past NICE there is no bonus. */
export const RING_EXCELLENT = 0.42;
export const RING_GREAT = 0.82;
export const RING_NICE = 1.3;
/**
 * The circle lock. When the target tells — an ear flick, a fake-out, a type
 * tell — the ring FREEZES at whatever size it had reached, and the player gets
 * this long to aim without also having to beat the clock. This is the technique
 * GO players actually use (the circle holds during the target's attack
 * animation), wired to the tells this encounter already ships.
 */
export const LOCK_WINDOW_MS = 900;

// Curveball. Measured off the pull PATH, not the pull vector: an arced drag
// sweeps a real signed area around the ball's rest point and a straight one
// sweeps none. Worth 1.7× in GO, and the single biggest lever a skilled player
// has — so it is worth the same here.
/** Normalised swept area a pull has to reach before it counts as curved. */
export const CURVE_THRESHOLD = 0.28;
/** And where the bend is at its full value. */
export const CURVE_FULL = 0.9;
/** How far a full curve pushes the flight's control point sideways, in points. */
export const CURVE_BEND_PT = 78;
// Past this the throw misses entirely and the ball bounces away.
export const HIT_TOLERANCE = 1;
// A miss inside this band still grazes the silhouette — the near-miss beat.
export const NEAR_MISS_TOLERANCE = 1.4;
/**
 * The only camera move in the encounter, and the only one during a throw. The
 * default encounter camera is locked; a 4.5% push and a 14pt pan is enough to
 * ride up with the ball without the stage reading as a thing being filmed.
 */
export const THROW_CAMERA_PUSH = 1.045;
export const THROW_CAMERA_PAN_PT = 14;

export type Phase = "orb" | "opening" | "pokemon" | "capture" | "ritual" | "card" | "fled";

/** Balls the player gets per encounter. Running out ends the encounter. */
export const BALLS_PER_ENCOUNTER = 3;

export type ThrowGrade = "perfect" | "great" | "hit" | "miss";

/**
 * Dynamic Type is respected, but capped.
 *
 * The loadout screen is a fixed-height carousel between a header and a CTA, and
 * the belt cannot shrink — a ball that is clipped is a bug the direction calls
 * out by name. So text scales with the player's setting up to this multiplier
 * and then stops, which keeps the header off the belt and the belt off the CTA
 * at every accessibility size. Everything that is prose rather than chrome
 * (the ball's description) is left uncapped, because it is allowed to grow.
 */
export const MAX_TYPE_SCALE = 1.6;

/** The quiet matte crop that enters only while a Trainer is actively drawing. */
export const LETTERBOX_HEIGHT = 32;

/**
 * Where the release shaft's driver ENDS — past full extension, not back at the
 * start. `releaseBeam` feeds both the shaft's LENGTH and its BRIGHTNESS in
 * `ReleaseBeam`, so a driver that ran 0 → 1 → 0 would retrace its own curve:
 * the shaft would dim to nothing exactly at full extension and then re-light as
 * it retracted into the mouth — light crawling back into the ball, the opposite
 * of the beat. On a monotonic 0 → 1 → 2 each stage is single-valued: [0, 1]
 * extends the shaft, [1, 2] lets the pool swallow the light where it stands.
 * Shared by `beats.ts` (which drives it) and `ReleaseBeam` (which reads it).
 */
export const BEAM_SPENT = 2;

/** The pool shares the shaft's monotonic hand-off shape without retracing it. */
export const POOL_SPENT = 2;
