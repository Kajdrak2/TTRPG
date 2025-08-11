// js/views/player_lore.js
import { el } from '../core/ui.js';

export function renderPlayerLore(S){
  const box = el('div','panel');
  const t = (S.lore?.text || S.lore?.markdown || S.lore || '').trim();
  box.innerHTML = '<div class="list-item"><div><b>Lore</b></div></div><div class="inner">'+(t? t.replace(/\n/g,'<br>') : '<span class="muted">Pas encore de lore…</span>')+'</div>';
  return box;
}
export default renderPlayerLore;
