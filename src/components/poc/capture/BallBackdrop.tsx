import { Canvas, LinearGradient, Rect, vec } from "@shopify/react-native-skia";
import type { JSX } from "react";
import { useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { STAGE_INK } from "./palette";

/**
 * The ground the ball stands on, coloured by the ball itself.
 *
 * This is the whole reason the layout works: the old screen was the same grey
 * whichever ball was selected, so a Dusk Ball's phosphor green and a Master
 * Ball's violet stopped at their own outlines and the page never registered the
 * choice. Here the identity leaves the object and fills the frame.
 *
 * **The colour has a POSITION, not a state.** It is interpolated straight from
 * the carousel's fractional `offset`, on the UI thread, so dragging half way
 * between a Dusk Ball and a Love Ball puts the room half way between green and
 * pink — and letting go carries the colour home on the same spring that carries
 * the ball.
 *
 * That is the fix for "the background does not hand over between two colours".
 * The previous version took the SETTLED ball's colour and crossfaded to it over
 * 420ms: correct colours, but the change was a consequence of the gesture
 * finishing rather than part of the gesture, so it read as a field being
 * updated rather than as a light turning. There is nothing to crossfade any
 * more, because nothing changes state — which is also why the old two-colour
 * `from`/`to`/`mix` machinery is gone rather than retuned.
 *
 * Two layers, still. The tint is a plain view whose colour is interpolated by
 * Reanimated — colour interpolation is the one thing a Skia gradient makes
 * awkward and an animated style makes trivial. The falloff over it is Skia and
 * never changes: a fixed vertical ramp back down to stage ink, so the bottom of
 * the screen stays dark enough to print the chips, the button and the strip on.
 *
 * `drain` gives the colour back. Equipping ends on the encounter's ground, which
 * is `STAGE_INK` and nothing else, so the tint has to be gone BEFORE the route
 * swaps — otherwise the last thing the player sees here is a teal or violet
 * field and the first thing they see next is near-black.
 */
export function BallBackdrop({
  colors,
  drain,
  height,
  offset,
  total,
}: {
  /**
   * One ground colour per carousel slot, in slot order. See `groundFromBall`.
   */
  colors: readonly string[];
  /** 0 while the ball is on display, 1 once the ground is back to stage ink. */
  drain: SharedValue<number>;
  /** Screen height — the falloff is a ramp down the screen, so it needs one. */
  height: number;
  /** The carousel's position in slots. Fractional, unbounded, and the driver. */
  offset: SharedValue<number>;
  /** How many balls are on the loop. `offset` is taken modulo this. */
  total: number;
}): JSX.Element {
  /**
   * The ramp, and the reason this needs no per-frame allocation: one static
   * input range and one static colour list, both handed to `interpolateColor`
   * unchanged every frame.
   *
   * The first colour is REPEATED at the end. The catalog is a loop, so the last
   * ball's neighbour is the first one — without the repeat, the slot between
   * them would interpolate backwards through all twenty-six colours in a single
   * frame, which is the one place a continuous ramp can visibly tear.
   */
  const ramp = useMemo(() => [...colors, colors[0] ?? STAGE_INK], [colors]);
  const stops = useMemo(() => ramp.map((_, index) => index), [ramp]);

  const tintStyle = useAnimatedStyle(() => {
    // Wrapped into [0, total) here rather than in the carousel: `offset` is
    // deliberately unbounded there — it accumulates freely so a fling never
    // hits an edge — and this is the only reader that needs it bounded.
    const position = total > 0 ? ((offset.get() % total) + total) % total : 0;
    return {
      backgroundColor: interpolateColor(position, stops, ramp),
      opacity: 1 - drain.get(),
    };
  });

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, tintStyle]} />
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Rect height={height} width={4000} x={0} y={0}>
          <LinearGradient
            colors={[
              "rgba(6,8,12,0.55)",
              "rgba(6,8,12,0.05)",
              "rgba(6,8,12,0.42)",
              STAGE_INK,
              STAGE_INK,
            ]}
            end={vec(0, height)}
            positions={[0, 0.32, 0.74, 0.92, 1]}
            start={vec(0, 0)}
          />
        </Rect>
      </Canvas>
    </Animated.View>
  );
}
