/**
 * How the hero ball MOVES: the numbers behind its turn, its crossfade and its
 * drift, plus the two functions that shape them.
 *
 * Split out of `BallStage3D` for the reason `ballStageScene` was — the component
 * is now only the frame loop and the canvas around it, and everything it needs
 * to answer "how far, how fast, how eased" lives here. It is the loadout's own
 * `ballPickerGeometry`: constants with the argument for their value attached,
 * because on this screen every one of them was arrived at rather than picked.
 *
 * Nothing here knows about three, React, or the carousel.
 */

/**
 * The idle drift, as a slow OSCILLATION rather than a spin. A ball that keeps
 * turning takes its release button around the back, and the button facing the
 * player is most of how a Poké Ball is recognised — at REST. Under the finger it
 * is the opposite: see `TURN_PER_SLOT`. Radians of sway, and seconds for one
 * full cycle.
 */
export const IDLE_SWAY = 0.13;
export const IDLE_PERIOD_S = 7.5;

/**
 * How far the shell turns for one ball of travel. Exactly one revolution, and
 * the exactness is load-bearing twice over: the carousel rests on whole slots, so
 * the button is always home when it lands, and the halfway point of a crossing is
 * a half turn, which is the pose that puts the ball's face furthest from view.
 */
export const TURN_PER_SLOT = Math.PI * 2;

/**
 * Where the shell's paint crosses over, in slot fractions, and — crucially — it
 * ramps LINEARLY between them rather than on a smoothstep.
 *
 * Both of those are the answer to "the change is too fast to see", and the
 * arithmetic is worth keeping because it is counter-intuitive. A crossing is a
 * spring, and a spring spends most of its time at the two ends: with the snap at
 * ζ 0.79 / ω₀ 11.4, `frac` runs 0.30 → 0.70 in **90 ms**. Slowing the spring
 * cannot fix that on its own — it is bounded by how long the CTA may stay dead,
 * see `SNAP_SPRING` — and neither can widening this window while a smoothstep
 * sits inside it, because smoothstep's own derivative peaks in the middle and
 * hands the compression straight back. Widening to 0.10/0.90 under a smoothstep
 * bought 20 ms.
 *
 * Linear over 0.10 → 0.90 runs the full exchange in ~205 ms — 3.6× the original
 * design — and it makes a DRAG map the paint to the finger proportionally, which
 * is the most legible mapping there is.
 *
 * What is given up is less than it looks. The substantive middle of the ramp,
 * blend 0.1 → 0.9, still falls between `frac` 0.18 and 0.82 — 65° to 295° of
 * turn — so the release button, the one part no two balls share, is still at or
 * behind the limb for all of it. The dome's MARKING was never fully hidden at
 * any usable width: a stripe sits ~31° off the face and a wedge spans out to
 * ~108°, so part of one is always on the visible hemisphere. What the turn buys
 * for those is that they change while swept to the limb, foreshortened and in
 * shadow.
 */
export const SWAP_FROM = 0.1;
export const SWAP_TO = 0.9;

/**
 * Reduced Motion has no turn to hide anything behind, so it gets the whole
 * crossing as a plain dissolve. It is a colour change either way, which is the
 * one kind of motion that mode keeps.
 */
export const SWAP_FROM_REDUCED = 0.05;
export const SWAP_TO_REDUCED = 0.95;

/**
 * How far the ball draws back at the midpoint of a crossing, as a fraction of its
 * size. Small on purpose. Without it the turn is a lathe; with it the object
 * reads as being turned over and offered back, which is the beat the swipe is
 * actually asking for.
 */
export const TURN_RECESS = 0.045;

/**
 * How far the position may wander back across a slot boundary before the pair of
 * balls under the crossfade is re-anchored.
 *
 * It exists because `SNAP_SPRING` overshoots on purpose. Measured on device, one
 * swipe put the position at 1.0250, then 1.1090, then 0.9993, then 1.0000 — four
 * crossings of the same boundary in under half a second. Re-anchoring on each of
 * them rebinds two mask textures, re-flags eight marking meshes and flips the
 * blend between its two ends, on alternating frames, for a ball that is not
 * changing. 0.06 of a slot is far wider than that chatter (which never exceeded
 * 0.008) and far narrower than a real crossing.
 */
export const PAIR_DEADBAND = 0.06;

/**
 * Fades the ambient yaw into the receiver's canonical forward pose during the
 * Equip prelude. A whole carousel slot is exactly one revolution, so the slot
 * term is already visually identical to zero when settled; only the idle sway
 * has to be removed before ownership moves to the opening renderer.
 */
export function handoffYaw(
  slotPosition: number,
  idleSway: number,
  handoffProgress: number
): number {
  const t = Math.min(1, Math.max(0, handoffProgress));
  return -slotPosition * TURN_PER_SLOT + idleSway * (1 - t);
}

/** Linear, deliberately — see `SWAP_FROM`, where the easing is the whole point. */
export function ramp(low: number, high: number, x: number): number {
  return Math.max(0, Math.min(1, (x - low) / (high - low)));
}

/**
 * How fast a DRAWN value catches the shared value behind it, as a time constant
 * in seconds. This is the fix for a swipe that stuttered, and it is worth
 * setting the reasoning out, because the obvious diagnosis was wrong twice.
 *
 * A WebGPU canvas renders from the JS thread, so the loop that draws the ball is
 * a JS-thread `requestAnimationFrame`. The carousel's `offset` is a Reanimated
 * shared value written by a gesture on the UI thread, and what a shared value
 * gives the JS thread is a MIRROR refreshed asynchronously. Reading it once per
 * frame therefore does not sample the finger — it samples whatever the last
 * batch happened to deliver.
 *
 * Measured on device across one swipe (713 frames, Reanimated 4.5): the loop
 * itself was healthy — 16.7 ms median frame, 0.2 ms of JS inside the tick —
 * while the values arriving were not. Consecutive frames read the SAME position
 * and then jumped, and the jumps ran 0.042, 0.055, 0.112, 0.219 slots: one, then
 * two, then five touch samples arriving at once. The ball was drawing a
 * staircase at a perfect 60 Hz. That is also why the ground underneath it
 * (`BallBackdrop`, which reads the same value on the UI thread) stayed smooth
 * while the object on top of it juddered — two clocks, one signal.
 *
 * Nothing can make the mirror arrive on time, so the loop stops treating it as a
 * position and treats it as a TARGET, moving toward it on its own clock. The
 * step is `1 - exp(-dt/τ)` rather than a fixed fraction, which makes it
 * frame-rate independent: a dropped frame produces one correctly-sized larger
 * step instead of a hitch, so the ~30 ms the JS thread spends re-rendering the
 * screen at the start of a gesture comes out as motion rather than as a stall.
 *
 * 40 ms, chosen by replaying that trace back through this function and then
 * confirmed live. Over the 81 frames of a crossing on device it left 5 frozen
 * frames instead of 23, and cut the step-to-step variation — the thing the eye
 * actually reads as stutter — from 1.37× the mean step to 0.49×, with the mean
 * step itself unchanged: the ball covers the same ground, evenly. Longer
 * constants keep helping but flatten out (0.53 at 55 ms, 0.47 at 70 ms) and each
 * one is paid for in lag. Lag costs unusually little here, because nothing on
 * this screen sits under the finger — a shell trailing it by a tenth of a slot
 * reads as the weight of a thing being turned over rather than as latency.
 */
const FOLLOW_TAU = 0.04;

/**
 * The fastest the carousel's position may be DRAWN moving, in slots per second.
 *
 * A slot is one whole revolution of the shell — `TURN_PER_SLOT` — so this value
 * is really an angular speed, and 2.4 slots/s is 864°/s, or about 14° per frame
 * at 60 Hz. It is a cap on the follower's output, not on the carousel: `offset`
 * still goes wherever the finger and the spring put it, and the ball still lands
 * on exactly the same slot at exactly the same moment.
 *
 * **Why a cap at all.** A first-order filter smooths transients but cannot slow
 * a sustained fast input: if a flick moves one slot in 200 ms, any tracking
 * filter eventually outputs one slot in 200 ms, which is a full revolution in
 * twelve frames. Measured on device, a normal swipe drew steps of 25–40° per
 * frame with one of 89°, and Great, Ultra and Net all carry two-fold markings —
 * a pattern that repeats every 180°. Sampling a 180° pattern at 40° a frame is
 * four and a half samples per cycle, and at 89° it is barely two: the markings
 * stop reading as a turning object and start reading as a strobe. That is the
 * flicker that survived every other fix, and no amount of smoothing removes it,
 * because the signal being sampled is genuinely that fast.
 *
 * 2.4 was chosen by replaying the measured trace through this function. It takes
 * the worst frame from 170° to 43° and the steady middle of a swipe to about
 * 14°, and it costs nothing in responsiveness: the ball still reaches its slot
 * on frame 38 of the trace, exactly as it did uncapped, because what governs the
 * landing is the spring's own tail and not the cap.
 *
 * What it buys beyond legibility is weight. The shell now falls behind a hard
 * flick and keeps rolling for a moment after the finger has gone, which is what
 * a heavy object does and what the carousel was always pretending its ball was.
 */
export const MAX_SLOT_RATE = 2.4;

/**
 * A follower for one shared value: hand it the sample and the frame's `dt`, get
 * back the value to draw.
 *
 * It seeds itself from the first sample rather than from zero, which is not a
 * detail — the carousel opens on whatever slot the equipped ball sits at, and a
 * follower starting at zero would spin the shell in from slot 0 on mount.
 *
 * `maxRate` is opt-in because only one of the two callers needs it. The
 * carousel's position drives a full revolution per unit and has to be capped
 * (`MAX_SLOT_RATE`); the free look's −1…1 tilt drives 25° across its whole
 * range, so capping it would only make the camera lazy.
 */
export function makeFollower(maxRate: number = Infinity): (target: number, dt: number) => number {
  let current: number | null = null;
  return (target, dt) => {
    if (current === null) {
      current = target;
      return current;
    }
    const step = (target - current) * (1 - Math.exp(-dt / FOLLOW_TAU));
    const limit = maxRate * dt;
    current += Math.max(-limit, Math.min(limit, step));
    return current;
  };
}
