// js/views/admin_resources.js
// Patch 5.9.3 — Ressources avec ACCORDÉONS (par ressource) + portée globale/ciblée
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

function ensureApplies(r){ r.appliesTo = r.appliesTo || { races:[], tribes:[], classes:[] }; return r.appliesTo; }
function numberInput(val, on){ const n=document.createElement('input'); n.type='number'; n.step='1'; n.className='input'; n.style.width='100px'; n.value=String(+val||0); n.oninput=()=>on(Math.trunc(+n.value||0)); return n; }
function checkbox(label, checked, on){ const l=document.createElement('label'); l.style.marginRight='12px'; const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!checked; cb.onchange=()=>on(!!cb.checked); l.append(cb, document.createTextNode(' '+label)); return l; }

function accordionPanel(titleLeft, titleRight){
  const host = document.createElement('div'); host.className='panel';
  const head = el('div','list-item'); head.style.cursor='pointer';
  const left = document.createElement('div'); left.innerHTML = `<b>${titleLeft}</b>`;
  const right = document.createElement('div'); right.className='muted small'; right.textContent = titleRight || 'cliquer pour ouvrir/fermer';
  head.append(left, right);
  const body = document.createElement('div'); body.className='inner'; body.style.display='none';
  head.addEventListener('click', ()=>{ body.style.display = (body.style.display==='none') ? 'block' : 'none'; });
  host.append(head, body);
  return { host, head, body, left, right };
}

function multiSelectChips(title, items, selected, onToggle){
  const box = el('div','list-item small'); box.append(document.createElement('div'), document.createElement('div'));
  box.children[0].innerHTML = `<b>${title}</b>`;
  const wrap = document.createElement('div');
  (items||[]).forEach(name => {
    const isSel = selected.includes(name);
    wrap.appendChild(checkbox(name, isSel, (v)=> onToggle(name, v)));
  });
  box.children[1].appendChild(wrap);
  return box;
}

function resourcePanel(S, r, onRefresh){
  const ac = accordionPanel(r.name || '(sans nom)' , 'cliquer pour ouvrir/fermer');

  // Nom / Min / Max / Start
  const grid = el('div','grid3');

  const rName = el('div','list-item small'); rName.innerHTML='<div>Nom</div>';
  const nameI = document.createElement('input'); nameI.className='input'; nameI.value=r.name||'';
  nameI.oninput = (e)=>{ r.name=e.target.value; State.save(S); ac.left.innerHTML=`<b>${r.name||'(sans nom)'}</b>`; };
  rName.appendChild(document.createElement('div')).appendChild(nameI);
  grid.appendChild(rName);

  const rMin = el('div','list-item small'); rMin.innerHTML='<div>Min</div>';
  rMin.appendChild(document.createElement('div')).appendChild(numberInput(r.min, v=>{ r.min=v; State.save(S); }));
  grid.appendChild(rMin);

  const rMax = el('div','list-item small'); rMax.innerHTML='<div>Max</div>';
  rMax.appendChild(document.createElement('div')).appendChild(numberInput(r.max, v=>{ r.max=v; State.save(S); }));
  grid.appendChild(rMax);

  const rStart = el('div','list-item small'); rStart.innerHTML='<div>Start</div>';
  rStart.appendChild(document.createElement('div')).appendChild(numberInput(r.start, v=>{ r.start=v; State.save(S); }));
  grid.appendChild(rStart);

  ac.body.appendChild(grid);

  // Portée (globale / ciblée)
  const scopeRow = el('div','list-item small'); scopeRow.innerHTML='<div>Portée</div>';
  const scopeWrap = document.createElement('div');
  const sel = document.createElement('select'); sel.className='select';
  ['global','ciblée'].forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; if((r.scope||'global')===v) o.selected=true; sel.appendChild(o); });
  sel.onchange = ()=>{ r.scope = sel.value; State.save(S); refreshScope(); };
  scopeWrap.appendChild(sel);
  scopeRow.appendChild(scopeWrap);
  ac.body.appendChild(scopeRow);

  const scopeBox = document.createElement('div'); ac.body.appendChild(scopeBox);

  function refreshScope(){
    scopeBox.innerHTML='';
    if((r.scope||'global') === 'global'){
      const info = el('div','muted small'); info.style.padding='6px 12px'; info.textContent = 'Disponible pour toutes les entités.';
      scopeBox.appendChild(info);
    }else{
      ensureApplies(r);
      scopeBox.appendChild(multiSelectChips('Races',  (S.races||[]).map(x=>x.name), r.appliesTo.races, (name, v)=>{ const a=r.appliesTo.races; const i=a.indexOf(name); if(v&&i<0) a.push(name); if(!v&&i>=0) a.splice(i,1); State.save(S); }));
      scopeBox.appendChild(multiSelectChips('Tribus', (S.tribes||[]).map(x=>x.name), r.appliesTo.tribes, (name, v)=>{ const a=r.appliesTo.tribes; const i=a.indexOf(name); if(v&&i<0) a.push(name); if(!v&&i>=0) a.splice(i,1); State.save(S); }));
      scopeBox.appendChild(multiSelectChips('Classes',(S.classes||[]).map(x=>x.name), r.appliesTo.classes, (name, v)=>{ const a=r.appliesTo.classes; const i=a.indexOf(name); if(v&&i<0) a.push(name); if(!v&&i>=0) a.splice(i,1); State.save(S); }));
    }
  }
  refreshScope();

  // Supprimer
  const delRow = el('div','list-item small'); delRow.append(document.createElement('div'), document.createElement('div'));
  const delBtn = document.createElement('button'); delBtn.className='btn danger small'; delBtn.textContent='Supprimer';
  delBtn.onclick = ()=>{ const i=S.resources.indexOf(r); if(i>=0){ S.resources.splice(i,1); State.save(S); onRefresh && onRefresh(); } };
  delRow.children[1].appendChild(delBtn);
  ac.body.appendChild(delRow);

  return ac.host;
}

export function renderResourcesAdmin(S){
  S.resources = Array.isArray(S.resources) ? S.resources : [];
  const root = el('div');

  const toolbar = el('div','row'); toolbar.style.justifyContent='space-between'; toolbar.style.alignItems='center';
  const tl = document.createElement('h3'); tl.textContent = 'Ressources';
  const tr = document.createElement('div');
  const add = document.createElement('button'); add.className='btn'; add.textContent='Ajouter ressource';
  add.onclick = ()=>{ S.resources.push({ name:'Nouvelle', min:0, max:10, start:0, scope:'global', appliesTo:{ races:[], tribes:[], classes:[] } }); State.save(S); refresh(); };
  tr.appendChild(add);
  toolbar.append(tl,tr);
  root.appendChild(toolbar);

  const container = el('div'); root.appendChild(container);

  function refresh(){
    container.innerHTML='';
    if(S.resources.length===0){
      const empty = el('div','muted small'); empty.style.padding='8px 12px'; empty.textContent='Aucune ressource.';
      container.appendChild(empty);
      return;
    }
    S.resources.forEach(r => container.appendChild(resourcePanel(S, r, refresh)));
  }
  refresh();

  return root;
}
export default renderResourcesAdmin;
