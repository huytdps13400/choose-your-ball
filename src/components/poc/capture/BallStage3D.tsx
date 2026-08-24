import type { JSX } from "react";
import { useMemo } from "react";
import { View } from "react-native";
import {
  EntitySelector,
  EnvironmentalLight,
  FilamentScene,
  FilamentView,
  Model,
  RenderCallbackContext,
  useDerivedValue as useFilamentDerivedValue,
  useEntityInScene,
  useFilamentContext,
  useLightEntity,
  useWorkletEffect,
} from "react-native-filament";
import type { MaterialParameterValue, RNFCamera } from "react-native-filament";
import type { SharedValue } from "react-native-reanimated";
import { useSharedValue as useFilamentSharedValue } from "react-native-worklets-core";

import type { BallId } from "./ballCatalog";
import {
  BALL_GLTF_MATERIALS,
  cameraOrbitPosition,
  cameraProjectionArguments,
  FILAMENT_CAMERA,
  FILAMENT_COLOR_GRADING,
  FILAMENT_ENVIRONMENT_INTENSITY,
  filamentDirectLights,
  hexToLinearRgba,
} from "./BallStage3D.contract";
import type { FilamentDirectLightContract } from "./BallStage3D.contract";
import {
  BALL_FILAMENT_MESH_PAINT,
  filamentMarkScale,
  filamentSurface,
} from "./ballFilamentSurface";
import type { BallMeshMark } from "./ballFilamentSurface";
import { useBallFilamentTextures } from "./ballFilamentTextures.generated";
import { TURN_PER_SLOT } from "./ballStageMotion";
import { useFilamentSharedValueBridge } from "./useFilamentSharedValueBridge";

// Metro and RNF require a statically analyzable asset module for bundled GLBs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BALL_MODEL_SOURCE = require("../../../../assets/models/ball-filament.glb");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FILAMENT_ENVIRONMENT_SOURCE = require("../../../../assets/env/warehouse-ibl.ktx");

type CameraWithFovDirection = RNFCamera & {
  setProjection(
    fov: number,
    aspect: number,
    near: number,
    far: number,
    direction: "horizontal" | "vertical"
  ): void;
};

function markMaterial(mark: BallMeshMark): MaterialParameterValue {
  return {
    baseColorFactor: hexToLinearRgba(BALL_FILAMENT_MESH_PAINT[mark]),
    metallicFactor: mark === "mark-master-emblem" ? 0 : 0.07,
    roughnessFactor: 0.1,
  };
}

const MARK_MATERIALS: Record<BallMeshMark, MaterialParameterValue> = {
  "mark-great": markMaterial("mark-great"),
  "mark-master-emblem": markMaterial("mark-master-emblem"),
  "mark-master-patch": markMaterial("mark-master-patch"),
  "mark-ultra": markMaterial("mark-ultra"),
};

const HIDDEN_MARK_SCALE: [number, number, number] = [0, 0, 0];

export type BallStage3DProps = {
  offset: SharedValue<number>;
  reducedMotion: boolean;
  size: number;
  tilt: SharedValue<number>;
  variant: BallId;
};

function BallCamera({
  reducedMotion,
  tilt,
}: Pick<BallStage3DProps, "reducedMotion" | "tilt">): null {
  const { camera } = useFilamentContext();
  const filamentTilt = useFilamentSharedValueBridge(tilt, 0);
  const projectionConfigured = useFilamentSharedValue(false);

  RenderCallbackContext.useRenderCallback(() => {
    "worklet";
    if (!projectionConfigured.value) {
      const projection = cameraProjectionArguments();
      (camera as CameraWithFovDirection).setProjection(
        projection[0],
        projection[1],
        projection[2],
        projection[3],
        projection[4]
      );
      // Worklets Core exposes a thread-safe mutable cell; React's immutability
      // lint cannot distinguish that host object from ordinary hook state.
      // eslint-disable-next-line react-hooks/immutability
      projectionConfigured.value = true;
    }
    const position = cameraOrbitPosition(reducedMotion ? 0 : filamentTilt.value);
    camera.lookAt(position, FILAMENT_CAMERA.target, FILAMENT_CAMERA.up);
  }, [camera, filamentTilt, projectionConfigured, reducedMotion]);

  return null;
}

function SceneLight({ light }: { light: FilamentDirectLightContract }): null {
  const { lightManager, scene } = useFilamentContext();
  const config =
    light.type === "point"
      ? {
          falloffRadius: light.falloffRadius,
          intensity: light.filamentIntensity,
          position: light.position,
          type: light.type,
        }
      : {
          direction: light.direction,
          intensity: light.filamentIntensity,
          position: light.sourcePosition,
          type: light.type,
        };
  const entity = useLightEntity(lightManager, config);
  useEntityInScene(scene, entity);

  useWorkletEffect(() => {
    "worklet";
    lightManager.setColor(entity, light.linearColor);
  });

  return null;
}

function SceneColorGrading(): null {
  const { engine } = useFilamentContext();

  useWorkletEffect(() => {
    "worklet";
    engine.setACESLegacyColorGrading(FILAMENT_COLOR_GRADING.exposureStops);
  });

  return null;
}

function BallMarkings({ variant }: Pick<BallStage3DProps, "variant">): JSX.Element {
  const visibleMarks = filamentSurface(variant).meshMarks;
  const scaleForMark = (mark: BallMeshMark) =>
    visibleMarks.includes(mark) ? filamentMarkScale(variant, mark) : HIDDEN_MARK_SCALE;

  return (
    <>
      <EntitySelector
        byName="mark-ultra"
        materialParameters={{ index: 0, parameters: MARK_MATERIALS["mark-ultra"] }}
        multiplyWithCurrentTransform={false}
        scale={scaleForMark("mark-ultra")}
      />
      <EntitySelector
        byName="mark-great"
        materialParameters={{ index: 0, parameters: MARK_MATERIALS["mark-great"] }}
        multiplyWithCurrentTransform={false}
        scale={scaleForMark("mark-great")}
      />
      <EntitySelector
        byName="mark-master-patch"
        materialParameters={{ index: 0, parameters: MARK_MATERIALS["mark-master-patch"] }}
        multiplyWithCurrentTransform={false}
        scale={scaleForMark("mark-master-patch")}
      />
      <EntitySelector
        byName="mark-master-emblem"
        materialParameters={{ index: 0, parameters: MARK_MATERIALS["mark-master-emblem"] }}
        multiplyWithCurrentTransform={false}
        scale={scaleForMark("mark-master-emblem")}
      />
    </>
  );
}

function BallModel({ offset, variant }: Pick<BallStage3DProps, "offset" | "variant">): JSX.Element {
  const upperTexture = useBallFilamentTextures()[variant];
  const filamentOffset = useFilamentSharedValueBridge(offset, 0);
  const rotation = useFilamentDerivedValue(() => {
    "worklet";
    return [0, -filamentOffset.value * TURN_PER_SLOT, 0] as [number, number, number];
  }, [filamentOffset]);

  return (
    <Model multiplyWithCurrentTransform={false} rotate={rotation} source={BALL_MODEL_SOURCE}>
      <EntitySelector
        byName="shell-upper"
        materialParameters={{ index: 0, parameters: BALL_GLTF_MATERIALS.upper }}
        textureMap={
          upperTexture
            ? { materialName: "shell-upper", textureSource: upperTexture, textureFlags: "sRGB" }
            : undefined
        }
      />
      <EntitySelector
        byName="shell-lower"
        materialParameters={{ index: 0, parameters: BALL_GLTF_MATERIALS.lower }}
      />
      <EntitySelector
        byName="band"
        materialParameters={{ index: 0, parameters: BALL_GLTF_MATERIALS.band }}
      />
      <EntitySelector
        byName="button"
        materialParameters={{ index: 0, parameters: BALL_GLTF_MATERIALS.button }}
      />
      <BallMarkings variant={variant} />
    </Model>
  );
}

function BallScene({ offset, reducedMotion, size, tilt, variant }: BallStage3DProps): JSX.Element {
  const viewportStyle = useMemo(() => ({ height: size, width: size }), [size]);
  const lights = useMemo(() => filamentDirectLights(variant), [variant]);

  return (
    <FilamentView enableTransparentRendering pointerEvents="none" style={viewportStyle}>
      <BallCamera reducedMotion={reducedMotion} tilt={tilt} />
      <SceneLight light={lights.key} />
      <SceneLight light={lights.fill} />
      <SceneLight light={lights.rim} />
      <SceneLight light={lights.rimBack} />
      <SceneColorGrading />
      <EnvironmentalLight
        intensity={FILAMENT_ENVIRONMENT_INTENSITY}
        source={FILAMENT_ENVIRONMENT_SOURCE}
      />
      <BallModel offset={offset} variant={variant} />
    </FilamentView>
  );
}

/** Native Filament renderer for the standalone 26-ball Choose Ball showcase. */
export function BallStage3D(props: BallStage3DProps): JSX.Element {
  const { size } = props;
  const viewportStyle = useMemo(() => ({ height: size, width: size }), [size]);

  return (
    <View pointerEvents="none" style={viewportStyle}>
      <FilamentScene>
        <BallScene {...props} />
      </FilamentScene>
    </View>
  );
}
