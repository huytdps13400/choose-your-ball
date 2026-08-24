import type { JSX } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MAX_TYPE_SCALE } from "./constants";
import { WORDMARK_HEROES } from "./ballEditorial";
import { MorphingText } from "./MorphingText";

/**
 * The ball's name, set as the largest thing on the screen and printed BEHIND
 * the ball.
 *
 * The overlap is the idea. Type that clears the object is a caption; type the
 * object stands in front of belongs to the same picture as the object — one
 * image with depth in it rather than a label above a sprite. It also fixes the
 * old screen's worst habit, which was leaving the middle of the frame empty and
 * putting the name somewhere else entirely.
 *
 * Two weights on two lines: the identity carries full white, "BALL" drops to a
 * ghost. Every ball in the catalog ends in that word, so after the first screen
 * it is rhythm rather than information, and it is set as rhythm.
 *
 * **Only the hero line animates, and it animates per LETTER.** Turning the
 * carousel used to slide the whole block in from the side — a page turn, which
 * says "different screen" when what actually happened is that one word was
 * rewritten. Now the letters the two names share keep their identity and glide
 * to their new position while the rest blur out and blur in (`MorphingText`),
 * so DUSK → DREAM reads as the same headline being edited rather than as two
 * headlines being swapped. The tail is deliberately excluded: "BALL" is on
 * every ball in the catalog, so morphing it would animate a change that never
 * happens.
 */
export function BallWordmark({
  hero,
  reducedMotion,
  size,
  tail,
  width,
}: {
  /** Everything before the last word — the part that actually names the ball. */
  hero: string;
  reducedMotion: boolean;
  /** Cap height of the display line, in points. */
  size: number;
  /** The last word, always "BALL". */
  tail: string;
  /** Canvas width for the morph. The block is full-bleed, so this is the screen. */
  width: number;
}): JSX.Element {
  return (
    <View pointerEvents="none" style={styles.host}>
      <MorphingText
        color="#FFFFFF"
        fitTexts={WORDMARK_HEROES}
        fontSize={size}
        // Enough box for the glyphs' own ascent plus the rise they enter from;
        // a canvas cut to the cap height clips the letters while they are still
        // arriving, which is the Skia version of the lineHeight bug below.
        height={size * 1.34}
        paddingLeft={LINE_INSET}
        reducedMotion={reducedMotion}
        text={hero}
        // The same optical tightening the tail carries, in points rather than
        // in the RN `letterSpacing` unit — a display face at this size needs it
        // or it looks like a headline that has been stretched.
        tracking={-size * 0.037}
        width={width}
      />
      <Text
        maxFontSizeMultiplier={MAX_TYPE_SCALE}
        numberOfLines={1}
        style={[
          styles.tail,
          // Pulled up rather than set with a short line height: a line box
          // shorter than the type clips the accent off É, which is how "POKÉ"
          // printed as "POKE". The block still reads tight; the space is taken
          // from the leading, not from the letters' own ascent.
          //
          // The pull was 0.3 and is 0.44 because of where the BALL sits. The
          // sphere fills most of the frame, so the tail cannot clear it — but
          // the sphere is ROUND, and the higher the word sits the further left
          // its shoulder falls away, so more of the word's opening letters stand
          // in clear air before the rest slides behind the object. That, plus
          // the ghost weight below, is the difference between type something is
          // standing in front of and type that has been cut in half.
          { fontSize: size, lineHeight: size * 1.02, marginTop: -size * 0.44 },
        ]}
      >
        {tail}
      </Text>
    </View>
  );
}

/** Optical left margin, shared by the morph canvas and the tail. */
const LINE_INSET = 14;

const styles = StyleSheet.create({
  host: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  tail: {
    // A ghost, and quieter than it was (0.24). The tail is rhythm rather than
    // information — every ball in the catalog ends in this word — and at a
    // quarter of full white it was loud enough that being overlapped by the
    // ball read as a defect. At this weight it is a watermark the object stands
    // in, which is what the overlap was always meant to be.
    color: "rgba(255,255,255,0.15)",
    fontWeight: "900",
    // Tight, because the two lines are read as one block.
    letterSpacing: -3,
    paddingLeft: LINE_INSET,
  },
});
