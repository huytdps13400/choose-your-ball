import { BlurMask, Canvas, Group, matchFont, Text as SkiaText } from "@shopify/react-native-skia";
import type { SkFont } from "@shopify/react-native-skia";
import type { JSX } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * A character-diffing text morph rendered through Skia, so each glyph can carry
 * a real Gaussian blur.
 *
 * When `text` changes, characters the two strings SHARE keep their identity and
 * glide to their new position; removed characters leave (up, right, shrink,
 * blur, fade) and added ones arrive (rise, grow, sharpen, fade), each staggered.
 * The point is that a name is not replaced — it is rewritten, and the letters
 * that survive prove the two names belong to the same object.
 *
 * **Every glyph is a retargetable state machine, not a one-shot animation.**
 * That is what makes fast changes safe: a glyph caught mid-exit that reappears
 * is redirected back in rather than being stranded at opacity 0. On this screen
 * that is not a theoretical case — a fling crosses several balls in a few
 * hundred milliseconds, and the name is rewritten on every one of them.
 *
 * The font comes from `matchFont`, which resolves a SYSTEM face synchronously.
 * The alternative — bundling a font file for Skia to load — would have meant a
 * new dependency AND a different typeface from the rest of the screen, and the
 * wordmark's identity is the system black at tight tracking.
 */

/** Per-character delay through the string. */
const STAGGER_MS = 22;
/** Lead time so the outgoing letters have cleared before the new ones arrive. */
const ENTER_DELAY_MS = 110;
/** Points the incoming glyph rises from, and where the outgoing one goes. */
const ENTER_RISE = 14;
const EXIT_UP = 12;
const EXIT_RIGHT = 8;
/** Scale a glyph starts and ends at. Never 0 — see the motion rules. */
const SHRINK = 0.7;
const MOVE_MS = 260;
const EXIT_MS = 240;
/** Surviving glyphs wait, so the rewrite reads as sequential rather than as a slide. */
const GLIDE_DELAY_MS = 140;
const GLIDE_MS = 320;
/**
 * Fraction of the font size from the baseline to the visual centre of a line of
 * caps. Used to centre the string in the canvas and to scale each glyph about
 * its middle rather than about its baseline origin — scaling about the baseline
 * makes a shrinking letter sink, which reads as falling rather than as receding.
 */
const CENTER_RATIO = 0.34;

export type MorphingTextAlign = "left" | "center";

/**
 * Key each character by value plus its running occurrence, so the n-th "L" in
 * one string reconciles to the n-th "L" in the next. Without the occurrence
 * count, "BALL" → "BEAST" would rebuild both Ls instead of gliding one.
 */
function toKeyedChars(text: string): { char: string; key: string }[] {
  const counts: Record<string, number> = {};
  return [...text].map((char) => {
    const n = counts[char] ?? 0;
    counts[char] = n + 1;
    return { char, key: `${char}#${n}` };
  });
}

type Cell = {
  char: string;
  /** Position in the string, which drives the stagger. */
  index: number;
  key: string;
  phase: "exit" | "present";
  width: number;
  /** Absolute left edge within the canvas. */
  x: number;
};

/**
 * Props are primitives rather than a `cell` object, so `memo` can actually bail
 * out. A glyph whose position, order and phase are unchanged does no React work
 * when a DIFFERENT glyph in the string changes.
 */
const CharGlyph = memo(function CharGlyph({
  baselineY,
  cellKey,
  char,
  charIndex,
  color,
  font,
  fontSize,
  glyphWidth,
  isExiting,
  onExited,
  reducedMotion,
  x,
}: {
  baselineY: number;
  /** Identity of this glyph, reported back when its exit finishes. */
  cellKey: string;
  char: string;
  charIndex: number;
  color: string;
  font: SkFont;
  fontSize: number;
  glyphWidth: number;
  isExiting: boolean;
  onExited: (key: string) => void;
  reducedMotion: boolean;
  x: number;
}): JSX.Element {
  // Four shared values, of which only three are ever animated:
  //   gx     — layout position, animated on its own so a glide can run WHILE the
  //            glyph is entering or leaving
  //   motion — spring; drives translate and scale
  //   fade   — timing; drives opacity and blur
  //   dir    — +1 entering, -1 leaving. Set, never animated: it only flips the
  //            sign of the offsets, so stepping it costs nothing.
  const gx = useSharedValue(x);
  const motion = useSharedValue(0);
  const fade = useSharedValue(0);
  const dir = useSharedValue(1);

  const rise = reducedMotion ? 0 : ENTER_RISE;
  const up = reducedMotion ? 0 : EXIT_UP;
  const right = reducedMotion ? 0 : EXIT_RIGHT;
  const shrink = reducedMotion ? 1 : SHRINK;
  const blurMax = reducedMotion ? 0 : fontSize * 0.11;
  const stagger = reducedMotion ? 0 : STAGGER_MS;

  // The glide: slide to a new layout position after a short wait.
  const laidOut = useRef(false);
  useEffect(() => {
    if (!laidOut.current) {
      laidOut.current = true;
      return;
    }
    gx.set(withDelay(GLIDE_DELAY_MS, withTiming(x, { duration: GLIDE_MS })));
  }, [gx, x]);

  /**
   * The whole in/out state machine, driven only by an actual phase FLIP. It
   * retargets the same shared values instead of starting a parallel animation,
   * so an interrupted glyph always ends up consistent with its current phase.
   *
   * The guard is about cost as much as correctness: a surviving glyph's
   * `charIndex` changes on almost every swap, and without it every persisting
   * glyph would restart its enter animation to the value it already holds.
   * Those glyphs should only run their glide.
   */
  const appliedPhase = useRef<"exit" | "present" | null>(null);
  useEffect(() => {
    const phase = isExiting ? "exit" : "present";
    if (appliedPhase.current === phase) return;
    appliedPhase.current = phase;

    if (!isExiting) {
      dir.set(1);
      const delay = ENTER_DELAY_MS + charIndex * stagger;
      motion.set(withDelay(delay, withSpring(1)));
      fade.set(withDelay(delay, withTiming(1, { duration: MOVE_MS })));
      return;
    }

    dir.set(-1);
    const delay = charIndex * stagger;
    motion.set(withDelay(delay, withTiming(0, { duration: EXIT_MS })));
    fade.set(
      withDelay(
        delay,
        // Removal rides the animation's own completion rather than a timer. A
        // timer would keep firing after the glyph came back and would delete a
        // letter that is currently visible — and it would cost one timer per
        // glyph on a screen that rewrites its name on every flick.
        withTiming(0, { duration: EXIT_MS }, (finished) => {
          "worklet";
          if (finished) scheduleOnRN(onExited, cellKey);
        })
      )
    );
  }, [cellKey, charIndex, dir, fade, isExiting, motion, onExited, stagger]);

  const transform = useDerivedValue(() => {
    const settled = motion.get();
    const away = 1 - settled;
    const leaving = dir.get() < 0;
    return [
      { translateX: gx.get() + (leaving ? right * away : 0) },
      { translateY: baselineY + (leaving ? -up : rise) * away },
      { scale: shrink + (1 - shrink) * settled },
    ];
  });

  const blur = useDerivedValue(() => blurMax * (1 - fade.get()));

  const origin = useMemo(
    () => ({ x: glyphWidth / 2, y: -fontSize * CENTER_RATIO }),
    [fontSize, glyphWidth]
  );

  return (
    <Group opacity={fade} origin={origin} transform={transform}>
      <SkiaText color={color} font={font} text={char} x={0} y={0} />
      <BlurMask blur={blur} style="normal" />
    </Group>
  );
});

export function MorphingText({
  align = "left",
  color,
  fitTexts,
  fontSize,
  height,
  paddingLeft = 0,
  reducedMotion,
  text,
  tracking = 0,
  width,
}: {
  align?: MorphingTextAlign;
  color: string;
  /**
   * Every string this canvas will ever show. The size is fitted to the widest of
   * them ONCE, so the type does not resize as the text changes — a headline that
   * shrinks when the word gets longer reads as a layout bug, not as a feature.
   */
  fitTexts?: readonly string[];
  /** Treated as a maximum; see `fitTexts`. */
  fontSize: number;
  height: number;
  /** Left inset, so the canvas can match the surrounding block's optical margin. */
  paddingLeft?: number;
  reducedMotion: boolean;
  /** The string to display. Changing it triggers the morph. */
  text: string;
  /** Extra advance per glyph, in points. Negative tightens, as in CSS. */
  tracking?: number;
  width: number;
}): JSX.Element {
  /**
   * Measure at the requested size, then shrink to fit the widest string. Two
   * font instances is the price of an exact fit; a per-character heuristic would
   * either clip the widest string or leave the narrowest one undersized.
   */
  const probeFont = useMemo(
    () => matchFont({ fontFamily: "System", fontSize, fontWeight: "900" }),
    [fontSize]
  );

  const fittedSize = useMemo(() => {
    const candidates = fitTexts?.length ? fitTexts : [text];
    const usable = width - paddingLeft;
    const widest = candidates.reduce((max, candidate) => {
      const advances = probeFont.getGlyphWidths(probeFont.getGlyphIDs(candidate));
      const total = advances.reduce((sum, w) => sum + w, 0) + tracking * candidate.length;
      return Math.max(max, total);
    }, 0);
    if (widest <= usable || widest === 0) return fontSize;
    return Math.floor(fontSize * (usable / widest));
  }, [fitTexts, fontSize, paddingLeft, probeFont, text, tracking, width]);

  const font = useMemo(
    () => matchFont({ fontFamily: "System", fontSize: fittedSize, fontWeight: "900" }),
    [fittedSize]
  );
  // Tracking scales with the fitted size, or a shrunk headline keeps the spacing
  // of a larger one and comes apart.
  const fittedTracking = (tracking * fittedSize) / fontSize;
  const baselineY = height / 2 + fittedSize * CENTER_RATIO;

  /**
   * Lay the string out. Pure, so it can run during render — the positions of the
   * glyphs that are PRESENT are a function of the text and the font and nothing
   * else.
   */
  const layout = useCallback(
    (value: string): Cell[] => {
      // True glyph ADVANCES, not tight bounds: tight bounds drop side bearings
      // and trailing spaces, which is how a centred string ends up off-centre.
      const advances = font.getGlyphWidths(font.getGlyphIDs(value));
      const total = advances.reduce((sum, w) => sum + w, 0) + fittedTracking * value.length;
      let cursor = align === "center" ? (width - total) / 2 : paddingLeft;

      return toKeyedChars(value).map((k, index) => {
        const w = advances[index] ?? 0;
        const cell: Cell = {
          char: k.char,
          index,
          key: k.key,
          phase: "present",
          width: w,
          x: cursor,
        };
        cursor += w + fittedTracking;
        return cell;
      });
    },
    [align, fittedTracking, font, paddingLeft, width]
  );

  /**
   * The glyph set, and the text it was built for, in ONE piece of state.
   *
   * Reconciling against the previous set is a stateful transition — whether a
   * glyph enters, leaves or persists is decided by comparing the new string to
   * the old one — so it cannot be a plain `useMemo`. It is applied during
   * RENDER rather than from an effect: React's documented way to adjust state
   * when a prop changes, and the only shape the compiler's
   * `set-state-in-effect` rule accepts. An effect here would also render one
   * frame of the old name against the new layout.
   */
  const [snapshot, setSnapshot] = useState(() => ({ cells: layout(text), text }));

  if (snapshot.text !== text) {
    setSnapshot((previous) => {
      const next = layout(text);
      const nextKeys = new Set(next.map((cell) => cell.key));
      const merged = [...next];
      for (const old of previous.cells) {
        if (nextKeys.has(old.key)) continue;
        // Already leaving: keep the SAME object so `memo` bails out and the
        // exit is never restarted. Carrying these forward is what lets a glyph
        // finish leaving across several rapid changes.
        merged.push(old.phase === "exit" ? old : { ...old, phase: "exit" });
      }
      return { cells: merged, text };
    });
  }

  const cells = snapshot.cells;

  const removeCell = useCallback((key: string) => {
    setSnapshot((previous) => {
      const cell = previous.cells.find((c) => c.key === key);
      // It may have re-entered while its exit was finishing. Dropping it then
      // would delete a letter that is currently on screen.
      if (!cell || cell.phase !== "exit") return previous;
      return { ...previous, cells: previous.cells.filter((c) => c.key !== key) };
    });
  }, []);

  return (
    <Canvas pointerEvents="none" style={{ height, width }}>
      {cells.map((cell) => (
        <CharGlyph
          baselineY={baselineY}
          cellKey={cell.key}
          char={cell.char}
          charIndex={cell.index}
          color={color}
          font={font}
          fontSize={fittedSize}
          glyphWidth={cell.width}
          isExiting={cell.phase === "exit"}
          key={cell.key}
          onExited={removeCell}
          reducedMotion={reducedMotion}
          x={cell.x}
        />
      ))}
    </Canvas>
  );
}
