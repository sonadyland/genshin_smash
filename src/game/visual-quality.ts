/** Drawing-only preference: simulation, hitboxes and animation frames never depend on it. */
export type VisualQuality = 'standard' | 'low';

export function effectGlow(quality: VisualQuality, radius: number): number {
  return quality === 'low' ? 0 : radius;
}
