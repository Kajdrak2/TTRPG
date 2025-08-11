// js/views/admin_classes.js
// Patch 5.8.1 — Edition des points de catégorie (Classe)
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

function ensureCatMods(entity){
  if(!entity.catMods || typeof entity.catMods !== 'object') entity.catMods = {};
  return entity.catMods;
}

function catModRow(entity, catName){
  const row = el('div','list-item small');
  const left = document.createElement('div'); left.innerHTML = `<b>${catName}</b>`;
  const right = document.createElement('div');
  ensureCatMods(entity);
  const input = document.createElement('input'); input.type='number'; input.step='1'; input.className='input'; input.style.width='120px';
  input.value = String(+entity.catMods[catName] || 0);
  input.addEventListener('input', ()=>{
    ensureCatMods(entity);
    const v = Math.trunc(+input.value || 0);
    entity.catMods[catName] = v;
    State.save(State.get());
  });
  right.appendChild(input);
  row.append(left,right);
  return row;
}

function entityPanel(list, entity, label, onRefresh){
  const p = el('div','panel');

  const head = el('div','list-item');
  const title = document.createElement('div');
  title.innerHTML = `<b>${entity.name || '(sans nom)'}</b> <span class="muted small">— $Classe</span>`;
  const actions = document.createElement('div');
  const delBtn = document.createElement('button'); delBtn.className='btn danger small'; delBtn.textContent='Supprimer';
  delBtn.onclick = ()=>{ const i=list.indexOf(entity); if(i>=0){ list.splice(i,1); State.save(State.get()); onRefresh && onRefresh(); } };
  actions.appendChild(delBtn);
  head.append(title, actions);
  p.appendChild(head);

  const rowN = el('div','list-item small'); rowN.innerHTML = '<div>Nom</div>';
  const nameI = document.createElement('input'); nameI.className='input'; nameI.value = entity.name||'';
  nameI.oninput = (e)=>{ entity.name = e.target.value; State.save(State.get()); };
  rowN.appendChild(document.createElement('div')).appendChild(nameI);
  p.appendChild(rowN);

  const cats = (State.get().settings?.categories||[]).map(c=>c.name);
  const cHead = el('div','list-item'); cHead.innerHTML='<div><b>Points de catégorie</b></div><div class="muted small">Δ par catégorie</div>';
  p.appendChild(cHead);
  const listWrap = el('div','list');
  if(cats.length===0){
    const empty = el('div','muted small'); empty.style.padding='8px 12px'; empty.textContent='Aucune catégorie définie dans Système.';
    listWrap.appendChild(empty);
  }else{
    cats.forEach(cat => listWrap.appendChild(catModRow(entity, cat)));
  }
  p.appendChild(listWrap);

  return p;
}

function makeList(label, list){
  const root = el('div');

  const toolbar = el('div','row'); toolbar.style.justifyContent='space-between'; toolbar.style.alignItems='center';
  const tl = document.createElement('h3'); tl.textContent = label+'s';
  const tr = document.createElement('div');
  const add = document.createElement('button'); add.className='btn'; add.textContent='Ajouter '+label.toLowerCase();
  add.onclick = ()=>{ list.push({ name: label+' '+(list.length+1), catMods:{} }); State.save(State.get()); refresh(); };
  tr.appendChild(add);
  toolbar.append(tl,tr);
  root.appendChild(toolbar);

  const container = el('div'); root.appendChild(container);
  function refresh(){
    container.innerHTML='';
    if(list.length===0){
      const empty = el('div','muted small'); empty.style.padding='8px 12px'; empty.textContent='Aucune '+label.toLowerCase()+' encore.';
      container.appendChild(empty);
      return;
    }
    list.forEach(ent => container.appendChild(entityPanel(list, ent, label, refresh)));
  }
  refresh();
  return root;
}

// Main renderer (exported under multiple names for compatibility)
export function renderAdminClasses(){
  const S = State.get();
  const list = S.classes || (S.classes = []);
  console.log('[JDR] Classe view loaded, items:', list.length);
  return makeList('Classe', list);
}

// Extra aliases to maximize compatibility with existing imports
export const renderClasses = renderAdminClasses;
export const renderClassTab = renderAdminClasses;
export const renderAdminClass = renderAdminClasses;
export default renderAdminClasses;

// Optional global fallback (if some code expects globals)
if (typeof window !== 'undefined') {
  window.JDRViews = window.JDRViews || {};
  window.JDRViews['Classe'] = { render: renderAdminClasses };
  console.log('[JDR] Global view alias registered for Classe');
}
