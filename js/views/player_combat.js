// js/views/player_combat.js
import { el } from '../core/ui.js';

export function renderPlayerCombat(S){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Combat</b></div></div><div class="inner"><span class="muted">Module combat à venir (initiative, cibles, altérations…).</span></div>';
  return box;
}
export default renderPlayerCombat;
