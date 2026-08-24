import type { BallId } from "./ballCatalog";
import { BALL_CATALOG, FEATURED_BALLS } from "./ballCatalog";

export function chooseBallOrder(): BallId[] {
  const rest = (Object.keys(BALL_CATALOG) as BallId[]).filter(
    (ballId) => !FEATURED_BALLS.includes(ballId)
  );
  return [...FEATURED_BALLS, ...rest];
}
