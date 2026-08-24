import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import type { JSX } from "react";
import { useMemo } from "react";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import type { BallId } from "./ballCatalog";
import { getBall } from "./ballCatalog";
import { BAND_HEX } from "./ballSurface";

/** Height of the seam band, as a fraction of the ball's diameter. */
const BAND_RATIO = 0.115;
/**
 * How far the aura is allowed to bleed past the shell, in canvas points. Only
 * spent when a caller asks for a glow — the canvas grows by this much on every
 * side so the blur has room to fall off before it hits the edge, which is what
 * keeps it a soft round halo instead of the blur getting cropped into a hard
 * rectangle by the canvas bounds (the shape a native `shadow*` View prop was
 * producing around this same canvas: iOS traces its shadow from the LAYER'S
 * bounding rect when the content is a GPU-backed surface it cannot read the
 * alpha of, not from the circle actually drawn inside it).
 *
 * A Gaussian's visible extent is roughly 3× its sigma, and `glowBlur` peaks at
 * `MAX_GLOW_BLUR` — so this has to clear that by a comfortable margin, or the
 * blur falls off exactly the same way it did with a native shadow: cropped
 * into a hard, canvas-shaped rectangle right where the eye can still see it.
 */
export const MAX_GLOW_BLUR = 18;
const GLOW_PAD = MAX_GLOW_BLUR * 3;
/** Downward pull on the glow's centre — the "resting on a surface" contact light. */
const GLOW_OFFSET_Y = 5;

/**
 * Static ball face drawn in Skia. The upper shell follows the variant's `art`
 * recipe from ballCatalog, so a new ball is a data entry, not a new component.
 *
 * The one thing that is allowed to move is the specular sweep: `highlightAngle`
 * swings it a couple of degrees around the shell so a ball sitting in its clips
 * reads as a curved surface catching a fixed light, rather than as a decal. The
 * rest of the face stays a static picture — this is drawn 26 times on the belt.
 */
export function PokeBallGraphic({
  glowBlur,
  glowColor,
  glowOpacity,
  highlightAngle,
  showButton = true,
  size,
  variant = "poke",
}: {
  /** Softness of the aura's edge, in canvas points. Ignored without `glowColor`. */
  glowBlur?: SharedValue<number>;
  /**
   * The aura colour. Drawn as a blurred circle INSIDE this canvas rather than
   * as a native shadow around it — a shadow traced from a Skia surface is a
   * guess at the content's silhouette, and it guessed the canvas's own square
   * bounds often enough to read as a flaring rectangle. A blurred circle drawn
   * here is never anything but round, on every ball, every frame.
   */
  glowColor?: string;
  /** 0–1. Ignored without `glowColor`. */
  glowOpacity?: SharedValue<number>;
  /** Degrees the drawn reflection is swung by, about the ball's centre. */
  highlightAngle?: SharedValue<number>;
  showButton?: boolean;
  size: number;
  variant?: BallId;
}): JSX.Element {
  const ball = getBall(variant);
  const radius = size / 2;
  const bandHeight = size * BAND_RATIO;
  const center = size / 2;
  const outerButton = size * 0.31;
  const innerButton = size * 0.16;
  const pad = glowColor ? GLOW_PAD : 0;
  const canvasSize = size + pad * 2;

  const domePath = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    builder.moveTo(0, center);
    builder.arcToOval({ x: 0, y: 0, width: size, height: size }, 180, 180, false);
    builder.lineTo(size, center);
    builder.close();
    return builder.build();
  }, [center, size]);

  // A stand-in so the hook count does not depend on whether a caller wants the
  // reflection driven; a ball on the throw stage has no idle material at all.
  const restingAngle = useSharedValue(0);
  const swing = highlightAngle ?? restingAngle;
  const highlightTransform = useDerivedValue(() => [{ rotate: (swing.get() * Math.PI) / 180 }]);
  // Same stand-in trick for the glow, so this hook count never depends on
  // whether the caller wants one either.
  const restingGlow = useSharedValue(0);
  const glowOpacityValue = glowOpacity ?? restingGlow;
  const glowBlurValue = glowBlur ?? restingGlow;

  return (
    <Canvas style={{ height: canvasSize, width: canvasSize }}>
      {glowColor ? (
        <Circle
          c={vec(pad + center, pad + center + GLOW_OFFSET_Y)}
          color={glowColor}
          opacity={glowOpacityValue}
          r={radius}
        >
          <BlurMask blur={glowBlurValue} style="normal" />
        </Circle>
      ) : null}
      <Group transform={[{ translateX: pad }, { translateY: pad }]}>
        {/* Lower shell — always the pale housing. */}
        <Circle c={vec(center, center)} r={radius - 2}>
          <LinearGradient
            colors={["#FFFFFF", "#F7F7F7", "#C8CBD0"]}
            end={vec(size * 0.82, size)}
            start={vec(size * 0.25, size * 0.12)}
          />
        </Circle>

        {/* Upper shell + its variant markings, clipped to the dome. */}
        <Group clip={domePath}>
          <Path path={domePath}>
            <LinearGradient
              colors={[ball.shell[0], ball.shell[1]]}
              end={vec(size * 0.82, size * 0.58)}
              start={vec(size * 0.22, size * 0.08)}
            />
          </Path>
          <ShellMarkings size={size} variant={variant} />
        </Group>

        <Rect color={BAND_HEX} height={bandHeight} width={size} x={0} y={center - bandHeight / 2} />
        {showButton ? (
          <Circle c={vec(center, center)} color={BAND_HEX} r={outerButton / 2} />
        ) : null}
        {showButton ? (
          <Circle c={vec(center, center)} color={ball.button} r={innerButton / 2} />
        ) : null}
        <Circle
          c={vec(center, center)}
          color="rgba(255,255,255,0.72)"
          r={radius - 2}
          style="stroke"
          strokeWidth={2}
        />
        {/* Specular sweep across the top-left, swung by `highlightAngle`. */}
        <Group origin={vec(center, center)} transform={highlightTransform}>
          <Path
            color="rgba(255,255,255,0.30)"
            path={`M ${size * 0.22} ${size * 0.24} C ${size * 0.34} ${size * 0.09}, ${
              size * 0.53
            } ${size * 0.07}, ${size * 0.66} ${size * 0.13}`}
            strokeCap="round"
            strokeWidth={size * 0.028}
            style="stroke"
          />
        </Group>
      </Group>
    </Canvas>
  );
}

function ShellMarkings({ size, variant }: { size: number; variant: BallId }): JSX.Element | null {
  const ball = getBall(variant);
  const center = size / 2;

  if (ball.art === "stripes") {
    const stripeWidth = size * 0.11;
    return (
      <Group>
        <Rect color={ball.accent} height={size} width={stripeWidth} x={size * 0.2} y={0} />
        <Rect
          color={ball.accent}
          height={size}
          width={stripeWidth}
          x={size * 0.69 - stripeWidth / 2}
          y={0}
        />
      </Group>
    );
  }

  if (ball.art === "wedge") {
    return (
      <Group>
        <Path
          color={ball.accent}
          path={`M 0 ${size * 0.06} L ${size * 0.36} ${center} L 0 ${center} Z`}
        />
        <Path
          color={ball.accent}
          path={`M ${size} ${size * 0.06} L ${size * 0.64} ${center} L ${size} ${center} Z`}
        />
      </Group>
    );
  }

  if (ball.art === "band") {
    return (
      <Rect
        color={ball.accent}
        height={size * 0.085}
        width={size}
        x={0}
        y={size * 0.26 - size * 0.0425}
      />
    );
  }

  if (ball.art === "emblem") {
    // The Master Ball mark: an "M" with a dot on each side.
    const w = size * 0.24;
    const h = size * 0.13;
    const cy = size * 0.26;
    const m = `M ${center - w / 2} ${cy + h / 2} L ${center - w / 2} ${cy - h / 2} L ${center} ${
      cy + h * 0.22
    } L ${center + w / 2} ${cy - h / 2} L ${center + w / 2} ${cy + h / 2}`;
    return (
      <Group>
        <Path
          color={ball.accent}
          path={m}
          strokeCap="round"
          strokeJoin="round"
          strokeWidth={size * 0.045}
          style="stroke"
        />
        <Circle c={vec(center - size * 0.21, cy)} color={ball.accent} r={size * 0.034} />
        <Circle c={vec(center + size * 0.21, cy)} color={ball.accent} r={size * 0.034} />
      </Group>
    );
  }

  if (ball.art === "crest") {
    return (
      <Group>
        <Circle c={vec(center, size * 0.25)} r={size * 0.1}>
          <RadialGradient
            c={vec(center, size * 0.22)}
            colors={[ball.accent, `${ball.accent}00`]}
            r={size * 0.13}
          />
        </Circle>
        <Circle
          c={vec(center, size * 0.25)}
          color={ball.accent}
          r={size * 0.075}
          style="stroke"
          strokeWidth={size * 0.022}
        />
      </Group>
    );
  }

  return null;
}
