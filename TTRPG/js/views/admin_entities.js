// js/views/admin_entities.js
// Bonus/malus unifiés + accordéons + ressources globales/ciblées + accordéon par entité
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

/* Helpers */
function ensure(obj, key, init){ if(!obj[key] || typeof obj[key] !== 'object') obj[key] = init || {}; return obj[key]; }
function ensureCatMods(ent){ return ensure(ent, 'catMods', {}); }
function ensureStatMods(ent){ return ensure(ent, 'statMods', {}); }
function ensureResMods(ent){ return ensure(ent, 'resourceMods', {}); }
function numberInput(val, on){ const n=document.createElement('input'); n.type='number'; n.step='1'; n.className='input'; n.style.width='100px'; n.value=String(+val||0); n.oninput=()=>on(Math.trunc(+n.value||0)); return n; }

function getCategoryMap(S){
  const map = {};
  (S.settings?.categories||[]).forEach(c => { map[c.name] = Array.isArray(c.stats)? [...c.stats] : []; });
  (S.settings?.stats||[]).forEach(st => {
    const inAny = Object.values(map).some(list => list.includes(st));
    if(!inAny){ (map.Autres = map.Autres || []).push(st); }
  });
  return map;
}
function getResourceDefs(S){
  const out = [];
  const R = S.resources;
  if(Array.isArray(R)){
    R.forEach(it=>{
      if(typeof it === 'string') out.push({ name: it, scope:'global', appliesTo:{ races:[], tribes:[], classes:[] } });
      else if(it && typeof it === 'object' && it.name) out.push({ name: it.name, scope: it.scope||'global', appliesTo: it.appliesTo||{ races:[], tribes:[], classes:[] } });
    });
  }else if(R && typeof R === 'object'){
    Object.entries(R).forEach(([name,val])=>{
      if(typeof val === 'object') out.push({ name, scope: val.scope||'global', appliesTo: val.appliesTo||{ races:[], tribes:[], classes:[] } });
      else out.push({ name, scope:'global', appliesTo:{ races:[], tribes:[], classes:[] } });
    });
  }
  return out;
}
function getResourcesForEntity(S, kind, entityName){
  const defs = getResourceDefs(S);
  return defs.filter(r=> (r.scope||'global')==='global' || ((r.appliesTo?.[kind]||[]).includes(entityName))).map(r=>r.name);
}

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

/* Rows */
function catRow(ent, catName){
  ensureCatMods(ent);
  const row = el('div','list-item small');
  row.append(document.createElement('div'), document.createElement('div'));
  row.children[0].innerHTML = `<b>${catName}</b>`;
  row.children[1].appendChild(numberInput(ent.catMods[catName], v=>{ ent.catMods[catName]=v; State.save(State.get()); }));
  return row;
}
function statRow(ent, statName){
  ensureStatMods(ent);
  const row = el('div','list-item small');
  row.append(document.createElement('div'), document.createElement('div'));
  row.children[0].textContent = statName;
  row.children[1].appendChild(numberInput(ent.statMods[statName], v=>{ ent.statMods[statName]=v; State.save(State.get()); }));
  return row;
}
function resRow(ent, resName){
  ensureResMods(ent);
  const row = el('div','list-item small');
  row.append(document.createElement('div'), document.createElement('div'));
  row.children[0].innerHTML = `<b>${resName}</b>`;
  const wrap = document.createElement('div'); wrap.className='row'; wrap.style.gap='8px';
  const l1=document.createElement('span'); l1.className='muted small'; l1.textContent='ΔMax';
  const maxI = numberInput(ent.resourceMods?.[resName]?.max, v=>{ ensureResMods(ent); ent.resourceMods[resName]=ent.resourceMods[resName]||{}; ent.resourceMods[resName].max=v; State.save(State.get()); });
  const l2=document.createElement('span'); l2.className='muted small'; l2.textContent='ΔStart';
  const startI = numberInput(ent.resourceMods?.[resName]?.start, v=>{ ensureResMods(ent); ent.resourceMods[resName]=ent.resourceMods[resName]||{}; ent.resourceMods[resName].start=v; State.save(State.get()); });
  wrap.append(l1,maxI,l2,startI);
  row.children[1].appendChild(wrap);
  return row;
}

/* Entity panel with inner accordions */
function entityPanel(S, kind, list, ent, label, onRefresh, catMap){
  const ac = accordionPanel(ent.name || '(sans nom)', 'cliquer pour ouvrir/fermer');

  // Renommer + supprimer
  const rowN = el('div','list-item small'); rowN.innerHTML = '<div>Nom</div>';
  const nameI = document.createElement('input'); nameI.className='input'; nameI.value = ent.name||'';
  nameI.oninput = (e)=>{ ent.name = e.target.value; State.save(S); ac.left.innerHTML = `<b>${ent.name||'(sans nom)'}</b>`; };
  rowN.appendChild(document.createElement('div')).appendChild(nameI);
  ac.body.appendChild(rowN);

  const delRow = el('div','list-item small'); delRow.append(document.createElement('div'), document.createElement('div'));
  const delBtn = document.createElement('button'); delBtn.className='btn danger small'; delBtn.textContent='Supprimer';
  delBtn.onclick = ()=>{ const i=list.indexOf(ent); if(i>=0){ list.splice(i,1); State.save(S); onRefresh && onRefresh(); } };
  delRow.children[1].appendChild(delBtn);
  ac.body.appendChild(delRow);

  // Section Bonus/malus (Catégories & caractéristiques)
  const sec1 = accordionPanel('Bonus/malus (Catégories & caractéristiques)');
  ac.body.appendChild(sec1.host);
  Object.entries(catMap).forEach(([catName, stats])=>{
    const sub = accordionPanel(catName, '');
    sec1.body.appendChild(sub.host);
    const list1 = document.createElement('div'); list1.className='list'; list1.appendChild(catRow(ent, catName));
    sub.body.appendChild(list1);
    const list2 = document.createElement('div'); list2.className='list';
    if(stats && stats.length){ stats.forEach(st => list2.appendChild(statRow(ent, st))); }
    else { const empty = el('div','muted small'); empty.style.padding='6px 12px'; empty.textContent='Aucune caractéristique dans cette catégorie.'; list2.appendChild(empty); }
    sub.body.appendChild(list2);
  });

  // Section Ressources
  const sec2 = accordionPanel('Bonus/malus (Ressources)');
  ac.body.appendChild(sec2.host);
  const names = getResourcesForEntity(S, kind, ent.name||'');
  if(names.length===0){
    const empty = el('div','muted small'); empty.style.padding='6px 12px'; empty.textContent='Aucune ressource définie.';
    sec2.body.appendChild(empty);
  }else{
    const listR = document.createElement('div'); listR.className='list';
    names.forEach(n => listR.appendChild(resRow(ent,n)));
    sec2.body.appendChild(listR);
  }

  return ac.host;
}

function makeList(S, kind, label, list){
  const root = el('div');
  const catMap = getCategoryMap(S);

  const toolbar = el('div','row'); toolbar.style.justifyContent='space-between'; toolbar.style.alignItems='center';
  const tl = document.createElement('h3'); tl.textContent = label+'s';
  const tr = document.createElement('div');
  const add = document.createElement('button'); add.className='btn'; add.textContent='Ajouter '+label.toLowerCase();
  add.onclick = ()=>{ list.push({ name: label+' '+(list.length+1), catMods:{}, statMods:{}, resourceMods:{} }); State.save(S); refresh(); };
  tr.appendChild(add);
  toolbar.append(tl,tr);
  root.appendChild(toolbar);

  const container = el('div'); root.appendChild(container);
  function refresh(){
    container.innerHTML='';
    if(list.length===0){
      const empty = el('div','muted small'); empty.style.padding='8px 12px'; empty.textContent = 'Aucune '+label.toLowerCase()+' encore.';
      container.appendChild(empty);
      return;
    }
    list.forEach(ent => container.appendChild(entityPanel(S, kind, list, ent, label, refresh, catMap)));
  }
  refresh();
  return root;
}

export function renderEntities(S, kind='races'){
  const labelMap = { races:'Race', tribes:'Tribu', classes:'Classe' };
  const label = labelMap[kind] || 'Race';
  const list = S[kind] || (S[kind]=[]);
  return makeList(S, kind, label, list);
}
export default renderEntities;
