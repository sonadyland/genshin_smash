import type { getCorrinHud } from '../game/corrin';
import './CorrinStatus.css';

export type CorrinHud = ReturnType<typeof getCorrinHud>;

/** Uses the simulation snapshot so the labels change at the actual transformation commit. */
export default function CorrinStatus({ hud }: { hud?: CorrinHud }) {
  if (!hud) return null;
  return <div className={`corrin-status is-${hud.form}`} aria-label="神威形态与招式">
    <strong aria-live="polite">{hud.transforming ? '变形中' : hud.formName}<small>{hud.form === 'human' ? '近战' : '远程'}</small></strong>
    <span><kbd>J</kbd>{hud.jabName}</span><span><kbd>K</kbd>{hud.smashName}</span><span><kbd>I</kbd>{hud.secondaryName}</span>
    <span className="corrin-switch"><kbd>L</kbd>{hud.specialName}</span>
  </div>;
}
