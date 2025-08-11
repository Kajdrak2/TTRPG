// js/views/admin_lore.js
import { el } from '../core/ui.js';
import { save } from '../core/state.js';

export function renderLore(S){
  const box = el('div');
  const p = el('div','panel');
  const title = el('div','list-item'); title.innerHTML = '<div><b>Lore</b></div>';
  const area = document.createElement('textarea');
  area.rows = 12; area.className = 'input'; area.style.width='100%'; area.placeholder='Écris le lore ici...';
  area.value = S.lore || '';
  area.addEventListener('input', ()=>{ S.lore = area.value; save(S); });
  p.appendChild(title);
  const wrap = el('div','inner'); wrap.appendChild(area); p.appendChild(wrap);
  box.appendChild(p);
  return box;
}
export default renderLore;
