/**
 * Loadout geometry and timing — the single source of truth for the ball picker.
 *
 * The screen shows ONE ball at a time, large, on a ground coloured by that ball
 * (see `BallBackdrop`). There is no belt any more: the arc, the strap, the clips
 * and the lean that went with them are gone, and with them the layout that left
 * most of the screen empty. What remains is a loop of balls, a drag that turns
 * it, and a spring that lands it.
 */

/**
 * Finger distance that moves the selection by one ball, in points. Long, because
 * the gesture is a page turn rather than a scroll — one deliberate swipe, one
 * ball, not a flick through a list.
 */
export const ITEM_STRIDE = 128;

/**
 * The snap. One interruptible spring, tuned so a released fling settles without
 * a visible bounce but still overshoots enough to read as landing rather than
 * as a value being assigned.
 *
 * **It is deliberately slower than it used to be** (`damping: 24, mass: 0.8,
 * stiffness: 260` — ζ 0.83, ω₀ 18.0, settled in ~0.27 s). Once the ball started
 * TURNING between the two selections rather than cutting between them, the snap
 * stopped being a value arriving and became the moment the transition is
 * actually shown.
 *
 * ζ = 0.79 and ω₀ = 11.40 rad/s: it settles in ~0.44 s and still overshoots once.
 *
 * **Why not slower still.** ω₀ 9.5 was tried and is too slow, for a reason that
 * has nothing to do with how it looks: `settled` is only written when the spring
 * reports finished, and the CTA reads `SELECTING…` and refuses a press until it
 * is. Measured on device, that spring left the button dead for **0.91 s** after
 * every selection. At this rate it is ~0.65 s, against ~0.45 s before. Making the
 * exchange legible is `BallStage3D`'s `SWAP_FROM`/`SWAP_TO` job, not this one's —
 * a spring cannot buy much of it, because the crossing sits in the middle of the
 * travel, which is exactly where a spring moves fastest.
 */
export const SNAP_SPRING = { damping: 18, mass: 1, stiffness: 130 } as const;

/**
 * One gesture moves the loop by at most this many balls, and the DRAG itself is
 * held to it — see `useBallCarousel`'s `onUpdate`, which resists past the limit
 * rather than stopping dead, so the loop still answers a finger that keeps
 * going.
 *
 * **One wipe, one ball.** Projection alone could not deliver that. It decides
 * where a fling coasts to, and a fling that starts halfway through a slot and
 * carries hard still crossed three or four — every one of them drawn, none of
 * them seen, which is the opposite of a screen whose whole point is watching one
 * object become another.
 *
 * Travelling further is what the strip is for: it moves any distance in one tap,
 * and `selectSlot` is deliberately NOT clamped.
 */
export const PAN_REACH = 1;
/**
 * How hard the drag resists past `PAN_REACH` — the coefficient in
 * `over / (1 + over * PAN_RESIST)`. The excess is asymptotic, so no amount of
 * finger travel pushes the loop more than 1/6 of a ball beyond the limit: the
 * shell turns at most ~420° in one gesture, and it never feels stuck.
 */
export const PAN_RESIST = 6;

/**
 * How much of the release velocity carries into the projected landing slot, in
 * seconds.
 *
 * It went 0.22 → 0.13 while this was the only brake, then back UP to 0.18 once
 * `PAN_REACH` took over. With the landing held to one ball, this no longer
 * decides how FAR a flick travels, only whether a light one commits at all —
 * so generous is now the safe direction. A short quick flick that meant to
 * change ball should not leave the loop where it started.
 */
export const FLING_PROJECTION_S = 0.18;

/**
 * Idle material for the ball on display. It starts after the screen has been
 * still for IDLE_DELAY_MS and is cut — not faded — the instant a finger lands.
 */
export const IDLE_DELAY_MS = 600;
export const IDLE_FADE_MS = 900;
/** One full turn of the ball's drift, and one breath of its glow. */
export const IDLE_TURN_MS = 5200;
export const IDLE_BREATH_MS = 3100;

/** Shared vertical anchors for the source picker and opening-stage ball. */
export const PICKER_BALL_CENTER_FRACTION = 0.47;
export const OPENING_BALL_CENTER_FRACTION = 0.36;

/** Deterministic source translation from the picker anchor to the opening anchor. */
export function sourcePortalTravelY(height: number): number {
  return height * (OPENING_BALL_CENTER_FRACTION - PICKER_BALL_CENTER_FRACTION);
}

/**
 * The catalog is a LOOP.
 *
 * There is no first ball and no last one, which is the only way 26 balls avoid a
 * broken-looking edge. `offset` is therefore unbounded and accumulates freely —
 * drag long enough and it passes 100 — and everything that needs an actual ball
 * index normalises it through `wrapIndex`. Every layout decision uses
 * `cyclicDelta`, which answers "how far is this ball from the centre, taking the
 * short way round".
 */
export function wrapIndex(slot: number, total: number): number {
  "worklet";
  if (total <= 0) return 0;
  return ((slot % total) + total) % total;
}

/**
 * Signed distance from `offset` to `index` in slots, wrapped to the shorter arc:
 * always in [-total/2, total/2). With 26 balls, ball 25 sits ONE slot to the
 * left of ball 0 rather than twenty-five to the right.
 */
export function cyclicDelta(index: number, offset: number, total: number): number {
  "worklet";
  if (total <= 0) return 0;
  const half = total / 2;
  let delta = (((index - offset) % total) + total) % total;
  if (delta >= half) delta -= total;
  return delta;
}

/**
 * Equip, as one continuous move rather than a screen change.
 *
 *   0        the page clears — type, chips and strip go — and the coloured
 *            ground starts draining back to the stage ink the encounter paints
 *   HANDOFF  the retained receiver warms while the real source freezes, then
 *            that source translates and scales to the opening-stage anchor on
 *            the UI thread before the modal is dismissed (`loadoutHandoff`)
 *
 * **The travel does not live here any more, and must not come back.** This file
 * used to own a `dock` timeline that walked the ball into the pocket, plus a
 * `stow` crossfade that swapped renderers once it arrived, plus a hold that
 * guaranteed stillness before the cut — an elaborate way of making two frames
 * identical so that a CUT between them would not show. It worked, but the
 * ceiling of that approach is a cut. The source canvas now remains mounted,
 * opaque and frozen until it has reached the receiver's canonical center and
 * visible diameter. The instant route dismissal then exchanges matched poses.
 *
 * What remains here is only what belongs to this screen: how fast its own
 * furniture leaves, and when to hand over.
 */
export const EQUIP_MS = 190;
/**
 * When receiver preparation begins. Long enough for the press to answer before
 * source queue drain and hidden receiver warmup take over.
 */
export const HANDOFF_AT = 140;
export const HANDOFF_AT_REDUCED = 80;

/** Keeps the Equip deadline anchored to the press, even if JS setup delays effects. */
export function remainingHandoffDelay(dueAt: number, now: number): number {
  return Math.max(0, dueAt - now);
}
/**
 * The ground gives up the ball's colour while preparation and travel proceed.
 *
 * Matched to the preparation plus 420ms source travel rather than to the press.
 * At 420 the field was already black a third of the way in, and since the
 * loadout's JS thread is blocked by the encounter's mount for most of what
 * follows, that left the ball sitting on a dead stage with nothing anywhere on
 * screen still changing. The drain is a Reanimated timing, so it keeps running
 * on the UI thread through exactly that stretch: the room is still emptying
 * while the object is being put away, which is the difference between a pause
 * and a stall.
 */
export const DRAIN_MS = 700;
export const DRAIN_MS_REDUCED = 200;

/** The original large Choose Ball source stage. */
export const PICKER_SOURCE_WIDTH_FRACTION = 1.06;
export const PICKER_SOURCE_MAX = 460;

/**
 * The picker keeps this large local Three stage and scales it to the receiver's
 * visible sphere during hand-off. The compact reduction is historical picker
 * composition, not a hand-off adjustment.
 */
export function pickerSourceBoundarySize(width: number, compact: boolean): number {
  return Math.min(PICKER_SOURCE_MAX, width * PICKER_SOURCE_WIDTH_FRACTION) * (compact ? 0.86 : 1);
}

/** Legacy pure geometry retained for tests and any equal-size host composition. */
export function sourcePortalInset(portalBoundarySize: number, sourceBoundarySize: number): number {
  return (portalBoundarySize - sourceBoundarySize) / 2;
}

/**
 * The source transform that maps its rendered visible diameter to the
 * receiver's rendered visible diameter. Empty canvas headroom is not a
 * silhouette measurement.
 */
export function sourcePortalEndScale(
  sourceVisibleSize: number,
  receiverVisibleSize: number
): number {
  return sourceVisibleSize > 0 ? receiverVisibleSize / sourceVisibleSize : 1;
}

/** The actual source-stage transform at an already-eased UI-thread progress. */
export function sourcePortalScaleAtProgress(endScale: number, progress: number): number {
  const t = Math.min(Math.max(progress, 0), 1);
  return 1 + (endScale - 1) * t;
}

/**
 * How big the hero Poké Ball is drawn on the encounter stage.
 *
 * It lives here, next to the loadout's own geometry, because two components need
 * to agree on it — the ball and the copy that sits under it — and a number
 * computed independently in both is a number that drifts.
 */
export function openingBallSize(stageWidth: number): number {
  return Math.min(BALL_HERO_SIZE, stageWidth * 0.58);
}

/** The hero ball's ceiling, in points. */
export const BALL_HERO_SIZE = 220;
