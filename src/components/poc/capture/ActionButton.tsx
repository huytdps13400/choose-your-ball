import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { MAX_TYPE_SCALE } from "./constants";
import { MorphingLabel } from "./MorphingLabel";

// RectButton's default underlay is black, and `activeOpacity={1}` drove it to full
// opacity — every press cut the pill to a solid black hole. The overlay is tone-aware
// now: the two light surfaces darken, and ghost LIGHTENS, because ink on ink is no
// press state at all.
const PRESS_FEEDBACK_BY_TONE = Object.freeze({
  light: {
    activeOpacity: 0.1,
    rippleColor: "rgba(7,16,21,0.12)",
    underlayColor: "#071015",
  },
  prism: {
    activeOpacity: 0.08,
    rippleColor: "rgba(7,16,21,0.12)",
    underlayColor: "#071015",
  },
  ghost: {
    activeOpacity: 0.1,
    rippleColor: "rgba(255,255,255,0.12)",
    underlayColor: "#FFFFFF",
  },
} as const);

/** Stage action button with a press-scale response on the UI thread. */
export function ActionButton({
  compact = false,
  disabled = false,
  icon,
  label,
  labelToken,
  onPress,
  tone = "light",
}: {
  compact?: boolean;
  disabled?: boolean;
  icon: string;
  label: string;
  /**
   * Present when the label is a value that CHANGES under the player rather than
   * a fixed caption — the loadout's `EQUIP <BALL>`. It is what changed, as a
   * number, and it turns the swap into a morph instead of a cut. See
   * `MorphingLabel`; only the light tone is wired for it, because it is the only
   * tone whose foreground colour that component restates.
   */
  labelToken?: number;
  onPress: () => void;
  /**
   * There is deliberately no saturated tone here. A cyan primary button on a
   * dark stage is the single loudest piece of engineering UI a screen can have,
   * and it was the one thing pulling the capture flow back toward a console.
   */
  tone?: "light" | "prism" | "ghost";
}): JSX.Element {
  const pressFeedback = PRESS_FEEDBACK_BY_TONE[tone];
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    opacity: withTiming(disabled ? 0.42 : 1, { duration: 160, easing: Easing.out(Easing.cubic) }),
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.97]) }],
  }));

  return (
    <Animated.View style={[compact ? styles.compactButtonWrap : styles.buttonWrap, pressStyle]}>
      <RectButton
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        activeOpacity={pressFeedback.activeOpacity}
        enabled={!disabled}
        onActiveStateChange={(active) => {
          pressed.set(
            withTiming(active ? 1 : 0, {
              duration: active ? 100 : 160,
              easing: Easing.out(Easing.cubic),
            })
          );
        }}
        onPress={onPress}
        rippleColor={pressFeedback.rippleColor}
        style={[
          styles.actionButton,
          compact && styles.actionButtonCompact,
          tone === "prism" && styles.actionButtonPrism,
          tone === "ghost" && styles.actionButtonGhost,
        ]}
        underlayColor={pressFeedback.underlayColor}
      >
        <Text
          maxFontSizeMultiplier={MAX_TYPE_SCALE}
          style={[
            styles.actionIcon,
            tone === "ghost" && styles.actionButtonGhostText,
            tone === "prism" && styles.actionButtonPrismText,
          ]}
        >
          {icon}
        </Text>
        {labelToken !== undefined && tone === "light" ? (
          <MorphingLabel text={label} token={labelToken} />
        ) : (
          <Text
            maxFontSizeMultiplier={MAX_TYPE_SCALE}
            style={[
              styles.actionButtonText,
              tone === "ghost" && styles.actionButtonGhostText,
              tone === "prism" && styles.actionButtonPrismText,
            ]}
          >
            {label}
          </Text>
        )}
        {/* Lit from above, like everything else on this stage. A pure white pill
            on a near-black set has no top edge at all, which is what made it
            read as a hole cut in the screen rather than as a surface on it. One
            hairline, at 18% — visible as light, never as a border. */}
        <View pointerEvents="none" style={styles.topLight} />
      </RectButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: "#F4F7FA",
    borderRadius: 17,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 56,
    overflow: "hidden",
    paddingHorizontal: 18,
  },
  actionButtonCompact: {
    minHeight: 50,
  },
  actionButtonGhost: {
    backgroundColor: "#11161D",
    borderColor: "#2A3540",
    borderWidth: 1,
  },
  actionButtonGhostText: {
    color: "#DCE4EB",
  },
  actionButtonPrism: {
    backgroundColor: "#FFF8E9",
    borderColor: "#F0C548",
    borderWidth: 1,
  },
  actionButtonPrismText: {
    color: "#071015",
  },
  actionButtonText: {
    color: "#071015",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.55,
  },
  actionIcon: {
    color: "#071015",
    fontSize: 16,
    fontWeight: "900",
  },
  buttonWrap: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 56,
    minWidth: 0,
  },
  compactButtonWrap: {
    minHeight: 50,
    width: 106,
  },
  topLight: {
    // Near-white, because the surface under it is already #F4F7FA. A 0.18 white
    // — the value this started at — is invisible on a light pill and only shows
    // on the ghost tone, which is the opposite of the point.
    backgroundColor: "rgba(255,255,255,0.95)",
    height: StyleSheet.hairlineWidth,
    left: 14,
    position: "absolute",
    right: 14,
    top: 0,
  },
});
