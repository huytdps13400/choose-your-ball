import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import type { PanGesture } from "react-native-gesture-handler";
import { useSharedValue, withSpring } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

/**
 * Free look on the loadout ball: drag UP or DOWN to fly the camera over it.
 *
 * The ball became a real model rather than three partial spheres
 * (`ballModel.ts`), and a real model has a shape that a fixed head-on camera
 * never shows — the seam is a recessed ring and the button sits in a dished
 * housing, and both of those read as flat decals until the light moves across
 * them at an angle. This is what lets the player see that.
 *
 * ## The CAMERA moves; the ball does not
 *
 * That distinction is load-bearing rather than stylistic. Turning the ball would
 * fight the carousel, which already owns the ball's rotation about Y and derives
 * it from `offset` — the paint crossfade in `BallStage3D` is timed to the point
 * in that turn where the face is hidden, so a second source of rotation would
 * put the exchange back where it can be seen. It would also carry the ball's own
 * lights with it, which is precisely how a thing stops looking lit by a room.
 * An orbiting camera leaves the key where it is, so a tilt sweeps the highlight
 * across the shell exactly as moving your head over a real object does.
 *
 * ## Why it is its own gesture and not part of the pan
 *
 * `useBallCarousel`'s pan already declares `failOffsetY([-28, 28])` — it gives
 * up as soon as a drag turns out to be vertical — so the vertical axis was
 * free. Racing the two means each one claims the axis it is about, and neither
 * has to know the other exists. Composed in `BallPicker`, which is the file that
 * owns what a touch on this screen means.
 */

/**
 * How far the finger travels for the full tilt, in points, and how hard it
 * resists past that.
 *
 * Deliberately short. This is a LOOK, not a navigation: the whole range is
 * available inside a thumb's natural arc without repositioning, and the point of
 * the resistance is that the end of the range feels like the end of the range
 * rather than like a value that stopped responding.
 */
const TILT_REACH = 190;
const TILT_RESIST = 2.6;

/**
 * The spring home. Slightly slower and looser than the carousel's snap, because
 * this one is not deciding anything — nothing is selected by letting go, so it
 * can take the time to read as the object settling back rather than as a control
 * returning to zero.
 */
const TILT_HOME_SPRING = { damping: 17, mass: 0.9, stiffness: 150 };

export type BallTilt = {
  /**
   * −1 … 1, the player's intent, not an angle. How much of an angle that is
   * belongs to the camera, and lives in `ballStageScene`'s `orbitCamera`.
   * Positive is a downward drag, which flies the camera UP and looks down on
   * the crown — the mapping you get from putting a finger on a real object and
   * pulling its near face towards you.
   */
  tilt: SharedValue<number>;
  tiltGesture: PanGesture;
};

export function useBallTilt({
  enabled,
  reducedMotion,
}: {
  enabled: boolean;
  reducedMotion: boolean;
}): BallTilt {
  const tilt = useSharedValue(0);

  const tiltGesture = useMemo(
    () =>
      Gesture.Pan()
        // The mirror image of the carousel's own thresholds: this one only
        // claims the gesture once it is clearly vertical, and gives up the
        // moment it turns out to be a swipe across the loop.
        .activeOffsetY([-10, 10])
        .failOffsetX([-28, 28])
        // One finger, for the reason the carousel gives: the default tracks the
        // centroid, so a second thumb landing mid-drag jumps the value.
        .maxPointers(1)
        // Reduced Motion turns it off outright rather than shortening it. A
        // camera swinging over a subject is the largest vestibular movement on
        // this screen, and unlike the sway or the turn there is no reduced form
        // of it that is still the same feature — so the ball simply stays
        // head-on, which is the pose everything else on the screen is composed
        // around anyway.
        .enabled(enabled && !reducedMotion)
        .onUpdate((event) => {
          const reach = event.translationY / TILT_REACH;
          const over = Math.abs(reach) - 1;
          tilt.set(over <= 0 ? reach : Math.sign(reach) * (1 + over / (1 + over * TILT_RESIST)));
        })
        // Home on every exit path, `onFinalize` rather than `onEnd`: a gesture
        // the system cancels mid-drag never reaches `onEnd`, and a camera left
        // parked at 20° because a notification arrived is a bug the player
        // cannot undo without dragging it back by hand.
        .onFinalize(() => {
          tilt.set(withSpring(0, TILT_HOME_SPRING));
        }),
    [enabled, reducedMotion, tilt]
  );

  return { tilt, tiltGesture };
}
