import { useCallback, useMemo, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import type { PanGesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import type { BallId } from "./ballCatalog";
import {
  cyclicDelta,
  FLING_PROJECTION_S,
  ITEM_STRIDE,
  PAN_REACH,
  PAN_RESIST,
  SNAP_SPRING,
  wrapIndex,
} from "./ballPickerGeometry";
import { chooseBallOrder } from "./chooseBallOrder";

export type ChooseBallCarousel = {
  offset: SharedValue<number>;
  order: BallId[];
  panGesture: PanGesture;
  preview: number;
  previewBall: BallId;
  selectSlot: (slot: number) => void;
  total: number;
};

export function useChooseBallCarousel(initialBall: BallId): ChooseBallCarousel {
  const order = useMemo(chooseBallOrder, []);
  const startSlot = Math.max(0, order.indexOf(initialBall));
  const total = order.length;
  const offset = useSharedValue(startSlot);
  const panStart = useSharedValue(startSlot);
  const panHome = useSharedValue(startSlot);
  const panActivated = useSharedValue(0);
  const [preview, setPreview] = useState(startSlot);

  useAnimatedReaction(
    () => wrapIndex(Math.round(offset.get()), total),
    (index, previous) => {
      if (index !== previous) scheduleOnRN(setPreview, index);
    }
  );

  const finish = useCallback(
    (rawTarget: number) => {
      const index = wrapIndex(rawTarget, total);
      setPreview(index);
    },
    [total]
  );

  const settleOn = useCallback(
    (target: number) => {
      offset.set(
        withSpring(target, SNAP_SPRING, (finished) => {
          "worklet";
          if (finished) scheduleOnRN(finish, target);
        })
      );
    },
    [finish, offset]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-28, 28])
        .maxPointers(1)
        .onBegin(() => {
          cancelAnimation(offset);
          panActivated.set(0);
          panStart.set(offset.get());
          panHome.set(Math.round(offset.get()));
        })
        .onStart(() => {
          panActivated.set(1);
        })
        .onUpdate((event) => {
          const home = panHome.get();
          const drift = panStart.get() - event.translationX / ITEM_STRIDE - home;
          const over = Math.abs(drift) - PAN_REACH;
          offset.set(
            over <= 0
              ? home + drift
              : home + Math.sign(drift) * (PAN_REACH + over / (1 + over * PAN_RESIST))
          );
        })
        .onEnd((event) => {
          const slotsPerSecond = -event.velocityX / ITEM_STRIDE;
          const projected = offset.get() + slotsPerSecond * FLING_PROJECTION_S;
          const home = panHome.get();
          const target = Math.max(home - PAN_REACH, Math.min(home + PAN_REACH, projected));
          scheduleOnRN(settleOn, Math.round(target));
        })
        .onFinalize((_event, success) => {
          if (!success && panActivated.get() === 1) {
            scheduleOnRN(settleOn, Math.round(offset.get()));
          }
        }),
    [offset, panActivated, panHome, panStart, settleOn]
  );

  const selectSlot = useCallback(
    (slot: number) => {
      cancelAnimation(offset);
      const here = Math.round(offset.get());
      settleOn(here + cyclicDelta(slot, here, total));
    },
    [offset, settleOn, total]
  );

  return {
    offset,
    order,
    panGesture,
    preview,
    previewBall: order[preview] ?? order[0],
    selectSlot,
    total,
  };
}
