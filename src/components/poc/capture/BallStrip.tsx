import type { JSX } from "react";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import type { BallId } from "./ballCatalog";
import { getBall } from "./ballCatalog";
import { cyclicDelta } from "./ballPickerGeometry";
import { PokeBallGraphic } from "./PokeBallGraphic";

/** How many slots either side of the centre are drawn at all. */
const REACH = 3;
/** Distance between two thumbnails, in points. */
const STRIDE = 40;
/** Diameter of a thumbnail. The selected one is drawn larger — see SELECTED. */
const THUMB = 26;
const SELECTED = 36;

/**
 * The rest of the belt, reduced to an index.
 *
 * The screen shows one ball at a time on purpose, so this exists to answer the
 * two questions that raises — how many are there, and where am I — without
 * competing with the ball it is indexing. It is deliberately small, low
 * contrast, and the only place on the screen where more than one ball is
 * visible at once.
 */
export function BallStrip({
  offset,
  onPick,
  order,
  total,
}: {
  offset: SharedValue<number>;
  onPick: (slot: number) => void;
  order: BallId[];
  total: number;
}): JSX.Element {
  return (
    <View pointerEvents="box-none" style={styles.host}>
      {order.map((id, index) => (
        <Thumb id={id} index={index} key={id} offset={offset} onPick={onPick} total={total} />
      ))}
    </View>
  );
}

const Thumb = memo(function Thumb({
  id,
  index,
  offset,
  onPick,
  total,
}: {
  id: BallId;
  index: number;
  offset: SharedValue<number>;
  onPick: (slot: number) => void;
  total: number;
}): JSX.Element {
  const ball = getBall(id);
  const handlePress = useCallback(() => onPick(index), [index, onPick]);

  // Everything about a thumbnail is its distance from the centre, so the strip
  // needs no layout pass and no list — each one places itself.
  const style = useAnimatedStyle(() => {
    const slot = cyclicDelta(index, offset.get(), total);
    const distance = Math.abs(slot);
    return {
      opacity: interpolate(distance, [0, 1, REACH], [1, 0.42, 0], "clamp"),
      transform: [
        { translateX: slot * STRIDE },
        { scale: interpolate(distance, [0, 1], [SELECTED / THUMB, 1], "clamp") },
      ],
    };
  });

  return (
    <Animated.View style={[styles.slot, style]}>
      <Pressable
        accessibilityLabel={ball.label}
        accessibilityRole="button"
        hitSlop={10}
        onPress={handlePress}
      >
        <PokeBallGraphic showButton={false} size={THUMB} variant={id} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    height: SELECTED,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  slot: {
    height: THUMB,
    position: "absolute",
    width: THUMB,
  },
});
