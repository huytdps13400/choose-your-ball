import { Host, Text as SwiftText } from "@expo/ui/swift-ui";
import {
  Animation,
  animation,
  contentTransition,
  font,
  foregroundColor,
  frame,
  kerning,
} from "@expo/ui/swift-ui/modifiers";
import type { JSX } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { MAX_TYPE_SCALE } from "./constants";

/**
 * A label whose TEXT changes without the change being a cut.
 *
 * The loadout's call to action is `EQUIP <BALL>`, and the ball under it turns
 * with every swipe. On React Native that is a re-render: one string is torn
 * down and another is put up, on one frame, in a pill the player is looking
 * straight at while they decide. Everything else on that screen crossfades — the
 * ground, the wordmark, the ball itself turning between two paints — and the one
 * element naming the choice popped.
 *
 * There is no way to fix that from the React side. A crossfade between two RN
 * `Text`s is two views, two measurements and a layout that jumps as the widths
 * disagree mid-transition; a per-glyph morph is not something the platform text
 * engine will do for you. SwiftUI will: `contentTransition` is a property of the
 * TEXT, so the label morphs in place, laid out once, with the shared glyphs
 * ("EQUIP", "BALL") held still while only the word between them changes.
 *
 * ## Why it is `numericText`
 *
 * Per direction, and it is the right one of the four for this label even though
 * nothing here is a number. `identity` is a cut, which is what we have.
 * `interpolate` needs two states of the same shape and text has none. `opacity`
 * crossfades the WHOLE string, so "EQUIP" and "BALL" — which did not change —
 * fade out and back in with the word that did. `numericText` is the only one
 * that diffs the run and animates the difference, which is precisely the
 * behaviour this label wants.
 *
 * ## The transition value is an INDEX, not the string
 *
 * `animation(_, value)` takes a number or a boolean: SwiftUI re-runs the
 * transition when the value it is given changes, and a string cannot be handed
 * across that bridge. The slot index is what actually changed anyway — one
 * number per selection, monotonic through the swipe — so it is both the honest
 * trigger and the only one available.
 *
 * ## Everything but iOS gets the plain text
 *
 * `@expo/ui/swift-ui` is SwiftUI, and there is no Android or web behind it. The
 * fallback is the same `Text` this component replaced, with the same style, so
 * the label is never missing — only unanimated. Same trade `PokemonCard3D`
 * makes for the card's foil.
 */

/**
 * The spring, per direction: `response` 0.4s, `dampingFraction` 0.6. Under-damped
 * enough that the new word arrives with a little life in it, and inside the
 * ~450ms the carousel's own snap takes — the label must not still be settling
 * after the ball it names has stopped turning.
 */
const LABEL_SPRING = { dampingFraction: 0.6, response: 0.4 } as const;

/**
 * Restated for SwiftUI, which cannot read a React Native `StyleSheet`. The two
 * have to agree, so the numbers live here once and both paths read them: the
 * fallback through `styles.label`, the SwiftUI path through the modifiers.
 */
const LABEL = {
  color: "#071015",
  kerning: 0.55,
  size: 12,
  weight: "black",
} as const;

export function MorphingLabel({
  text,
  token,
}: {
  text: string;
  /** What changed. See "the transition value is an INDEX" above. */
  token: number;
}): JSX.Element {
  if (Platform.OS !== "ios") {
    return (
      <Text maxFontSizeMultiplier={MAX_TYPE_SCALE} style={styles.label}>
        {text}
      </Text>
    );
  }

  return (
    // `matchContents` so the host is exactly as wide as the words. Without it
    // the host takes whatever the row gives it and the label — centred by the
    // button, not by SwiftUI — sits off the icon it belongs to.
    // This SwiftUI island is visual content inside a native gesture-handler
    // button. It must never become a second hit-test owner: with the default
    // `auto`, taps over the words stop at the Host while taps over the arrow
    // reach RectButton, splitting one pill into live and dead regions.
    <View pointerEvents="none">
      <Host matchContents pointerEvents="none" style={styles.host}>
        <SwiftText
          modifiers={[
            contentTransition("numericText"),
            animation(Animation.spring(LABEL_SPRING), token),
            font({ size: LABEL.size, weight: LABEL.weight }),
            kerning(LABEL.kerning),
            foregroundColor(LABEL.color),
            frame({ alignment: "leading" }),
          ]}
        >
          {text}
        </SwiftText>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    // A floor only. `matchContents` sets the real size; this stops the host
    // collapsing to zero on the frame before SwiftUI has reported a layout,
    // which is what made the button flash empty on mount.
    minHeight: LABEL.size + 4,
  },
  label: {
    color: LABEL.color,
    fontSize: LABEL.size,
    fontWeight: "900",
    letterSpacing: LABEL.kerning,
  },
});
