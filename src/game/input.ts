/** Logical controls shared by keyboard and touch; action edges are consumed once per simulation tick. */
export type BattleAction = 'left' | 'right' | 'jump' | 'down' | 'jab' | 'smash' | 'special' | 'secondary' | 'dodge';

const KEY_BINDINGS: Record<BattleAction, string[]>[] = [
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'], down: ['KeyS'], jab: ['KeyJ'], smash: ['KeyK'], special: ['KeyL'], secondary: ['KeyI'], dodge: ['KeyH'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], down: ['ArrowDown'], jab: ['Numpad1', 'Comma'], smash: ['Numpad2', 'Period'], special: ['Numpad3', 'Slash'], secondary: ['Numpad5', 'Quote'], dodge: ['Numpad0', 'ShiftRight'] },
];

export class BattleInput {
  readonly keys = new Set<string>();
  readonly pressed = new Set<string>();
  private touches = new Map<string, Set<BattleAction>>();
  private touchPressed = new Set<BattleAction>();
  private blockedTouches = new Set<string>();

  setKey(code: string, down: boolean, enabled = true) {
    if (!down) { this.keys.delete(code); return; }
    // Engine event handlers reject KeyboardEvent.repeat. A fresh non-repeat edge
    // must work after blur even if the physical keyup happened in another app.
    if (!enabled || this.keys.has(code)) return;
    this.keys.add(code); this.pressed.add(code);
  }

  setTouchAction(action: BattleAction, source: string, down: boolean, enabled = true) {
    if (!down) {
      const actions = this.touches.get(source);
      actions?.delete(action);
      if (!actions?.size) this.touches.delete(source);
      this.blockedTouches.delete(source);
      return;
    }
    if (!enabled) { this.blockedTouches.add(source); return; }
    if (this.blockedTouches.has(source)) return;
    let actions = this.touches.get(source);
    if (!actions) { actions = new Set(); this.touches.set(source, actions); }
    if (actions.has(action)) return;
    actions.add(action);
    // A second jump button can produce the second jump even while the first is held.
    // A Set still coalesces simultaneous sources into one action on the same tick.
    this.touchPressed.add(action);
  }

  held(action: BattleAction, player = 0): boolean {
    if (KEY_BINDINGS[player]?.[action].some(key => this.keys.has(key))) return true;
    if (player === 0) for (const actions of this.touches.values()) if (actions.has(action)) return true;
    return false;
  }

  justPressed(action: BattleAction, player = 0): boolean {
    return KEY_BINDINGS[player]?.[action].some(key => this.pressed.has(key)) === true ||
      (player === 0 && this.touchPressed.has(action));
  }

  horizontal(player = 0): -1 | 0 | 1 {
    return (Number(this.held('right', player)) - Number(this.held('left', player))) as -1 | 0 | 1;
  }

  endTick() { this.pressed.clear(); this.touchPressed.clear(); }

  clearTouch() {
    for (const source of this.touches.keys()) this.blockedTouches.add(source);
    this.touches.clear(); this.touchPressed.clear();
  }

  clear() {
    this.keys.clear(); this.pressed.clear(); this.clearTouch();
  }
}
