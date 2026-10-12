/** A short render-only bridge from a measured blade tip to the existing shot path. */
export interface CastVisual { offsetX: number; offsetY: number; age: number; duration: number }
export function castVisualFromTip(tip: { x: number; y: number } | undefined, x: number, y: number, vx: number): CastVisual | undefined {
  if (!tip) return undefined;
  const offsetX = tip.x - x, offsetY = tip.y - y;
  // Smoothstep's maximum slope is 1.5. A long sword must not pull its shot
  // backwards, and upgraded firebirds separate gradually into their lanes.
  const duration = Math.max(8, Math.ceil(Math.max(0, offsetX * Math.sign(vx)) * 1.6 / Math.max(1, Math.abs(vx))), Math.ceil(Math.abs(offsetY) / 12));
  return { offsetX, offsetY, age: 0, duration };
}
export function projectileVisualPosition(shot: { x: number; y: number; castVisual?: CastVisual }) {
  const t = Math.min(1, Math.max(0, shot.castVisual ? shot.castVisual.age / shot.castVisual.duration : 1));
  const weight = 1 - t * t * (3 - 2 * t);
  return { x: shot.x + (shot.castVisual?.offsetX ?? 0) * weight,
    y: shot.y + (shot.castVisual?.offsetY ?? 0) * weight };
}
