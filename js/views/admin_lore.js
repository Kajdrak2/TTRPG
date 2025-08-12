// js/views/admin_lore.js — Build AL1 (édition simple du Lore)
import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

export function renderAdminLore(){
  const S = get();
  const box = el('div');

  const panel = el('div','panel');
  panel.innerHTML = `<div class="list-item"><div><b>Lore</b></div></div>`;

  const list = el('div','list');
  const row = el('div','list-item small');
  const left = el('div'); left.textContent = 'Contenu';
  const right = el('div');
  const ta = document.createElement('textarea'); ta.className = 'input'; ta.rows = 16; ta.placeholder = 'Votre lore ici…';
  ta.value = S.lore || '';
  right.appendChild(ta);
  row.append(left,right);
  list.appendChild(row);

  const act = el('div','list-item small');
  act.append(el('div'));
  const saveB = el('button','btn'); saveB.textContent = 'Enregistrer';
  saveB.onclick = ()=>{ S.lore = ta.value||''; save(S); };
  act.append(saveB);
  list.appendChild(act);

  panel.appendChild(list);
  box.appendChild(panel);
  return box;
}
export default renderAdminLore;
