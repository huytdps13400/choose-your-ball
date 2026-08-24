import { useEffect } from "react";
import { useFilamentContext } from "react-native-filament";
import { runOnUI } from "react-native-reanimated";
import type { SharedValue as ReanimatedSharedValue } from "react-native-reanimated";
import { useSharedValue } from "react-native-worklets-core";
import type { ISharedValue as FilamentSharedValue } from "react-native-worklets-core";

/**
 * RNF's `useSyncSharedValue` reads the Reanimated value during React render to
 * seed its own cell. Reanimated 4 correctly warns for that on every commit.
 * This is the same listener bridge, with the known initial value supplied by
 * the caller so render remains pure.
 */
export function useFilamentSharedValueBridge<T>(
  reanimatedValue: ReanimatedSharedValue<T>,
  initialValue: T
): FilamentSharedValue<T> {
  const filamentValue = useSharedValue(initialValue);
  const { workletContext } = useFilamentContext();

  useEffect(() => {
    const listenerId = Math.floor(Math.random() * 1_000_000);
    const forward = workletContext.createRunAsync((value: T) => {
      "worklet";
      filamentValue.value = value;
    });

    runOnUI(() => {
      "worklet";
      reanimatedValue.addListener(listenerId, forward);
    })();

    return () => {
      runOnUI(() => {
        "worklet";
        reanimatedValue.removeListener(listenerId);
      })();
    };
  }, [filamentValue, reanimatedValue, workletContext]);

  return filamentValue;
}
