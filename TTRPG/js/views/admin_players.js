// js/views/admin_players.js
// Patch 5.8.4 — Joueurs : accordéon par joueur, bonus/malus groupés par Catégorie -> Caractéristiques, accordéon Ressources
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

/* ---------- helpers ---------- */
function getCategoryMap(S){
  const map = {};
  (S.settings?.categories||[]).forEach(c => { map[c.name] = Array.isArray(c.stats)? [...c.stats] : []; });
  // rattrape stats orphelines si jamais
  (S.settings?.stats||[]).forEach(st => {
    const inAny = Object.values(map).some(list => list.includes(st));
    if(!inAny){ (map.Autres = map.Autres || []).push(st); }
  });
  return map;
}
function selectFrom(list, current, onChange){
  const s = document.createElement('select'); s.className='select';
  const optNone = document.createElement('option'); optNone.value=''; optNone.textContent='—'; s.appendChild(optNone);
  (list||[]).forEach(it=>{ const o=document.createElement('option'); o.value=it.name; o.textContent=it.name; if(it.name===(current||'')) o.selected=true; s.appendChild(o); });
  s.onchange = (e)=> onChange && onChange(e.target.value || '');
  return s;
}
function numberInput(value, onInput){
  const n = document.createElement('input');
  n.type='number'; n.step='1'; n.className='input'; n.style.width='120px'; n.value=String(+value||0);
  n.addEventListener('input', ()=> onInput(Math.trunc(+n.value||0)));
  return n;
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

/* ---------- resources utils ---------- */
function getResourceDefs(S){
  const out = [];
  const R = S.resources;
  if(Array.isArray(R)){
    R.forEach(it=>{
      if(typeof it === 'string') out.push({ name: it, min:0, max:0, start:0, scope:'global' });
      else if(it && typeof it === 'object' && it.name) out.push({ name: it.name, min:+it.min||0, max:+it.max||0, start:+it.start||0, scope:it.scope||'global', appliesTo: it.appliesTo||{ races:[], tribes:[], classes:[] } });
    });
  }else if(R && typeof R === 'object'){
    Object.entries(R).forEach(([name,val])=>{
      if(typeof val === 'object') out.push({ name, min:+val.min||0, max:+val.max||0, start:+val.start||0, scope:val.scope||'global', appliesTo: val.appliesTo||{ races:[], tribes:[], classes:[] } });
      else out.push({ name, min:0, max:+val||0, start:0, scope:'global' });
    });
  }
  return out;
}
function resourceAppliesToPlayer(r, p){
  const scope = r.scope || 'global';
  if(scope === 'global') return true;
  const tgt = r.appliesTo || { races:[], tribes:[], classes:[] };
  if(p.race && (tgt.races||[]).includes(p.race)) return true;
  if(p.tribe && (tgt.tribes||[]).includes(p.tribe)) return true;
  if(p.klass && (tgt.classes||[]).includes(p.klass)) return true;
  return false;
}

/* ---------- rows ---------- */
function catBonusRow(p, catName){
  const row = el('div','list-item small');
  row.append(document.createElement('div'), document.createElement('div'));
  row.children[0].innerHTML = `<b>${catName}</b>`;
  p.catBonusPoints = p.catBonusPoints || {};
  row.children[1].appendChild(numberInput(p.catBonusPoints[catName], v=>{ p.catBonusPoints[catName]=v; State.save(State.get()); }));
  return row;
}
function statBonusRow(p, statName){
  const row = el('div','list-item small');
  row.append(document.createElement('div'), document.createElement('div'));
  row.children[0].innerHTML = `<b>${statName}</b>`;
  p.statBonus = p.statBonus || {};
  row.children[1].appendChild(numberInput(p.statBonus[statName], v=>{ p.statBonus[statName]=v; State.save(State.get()); }));
  return row;
}
function resBonusRow(p, resName){
  const row = el('div','list-item small');
  row.append(document.createElement('div'), document.createElement('div'));
  row.children[0].innerHTML = `<b>${resName}</b>`;
  p.resourceMods = p.resourceMods || {};
  const wrap = document.createElement('div'); wrap.className='row'; wrap.style.gap='8px';
  const l1=document.createElement('span'); l1.className='muted small'; l1.textContent='ΔMax';
  const maxI = numberInput(p.resourceMods[resName]?.max, v=>{ p.resourceMods[resName]=p.resourceMods[resName]||{}; p.resourceMods[resName].max=v; State.save(State.get()); });
  const l2=document.createElement('span'); l2.className='muted small'; l2.textContent='ΔStart';
  const startI = numberInput(p.resourceMods[resName]?.start, v=>{ p.resourceMods[resName]=p.resourceMods[resName]||{}; p.resourceMods[resName].start=v; State.save(State.get()); });
  wrap.append(l1,maxI,l2,startI);
  row.children[1].appendChild(wrap);
  return row;
}

/* ---------- per-player panel ---------- */
function playerPanel(S, p, onRefresh){
  const catMap = getCategoryMap(S);
  const ac = accordionPanel(p.name || '(sans nom)', 'cliquer pour ouvrir/fermer');

  // Identité & points
  const g = el('div','grid3');
  const rName = el('div','list-item small'); rName.innerHTML='<div>Nom</div>';
  const nameI = document.createElement('input'); nameI.className='input'; nameI.value=p.name||'';
  nameI.oninput = (e)=>{ p.name=e.target.value; State.save(S); ac.left.innerHTML=`<b>${p.name||'(sans nom)'}</b>`; };
  rName.appendChild(document.createElement('div')).appendChild(nameI);
  g.appendChild(rName);

  const rLvl = el('div','list-item small'); rLvl.innerHTML='<div>Niveau</div>';
  const lvlI = document.createElement('input'); lvlI.type='number'; lvlI.className='input'; lvlI.value=String(p.level||1);
  lvlI.oninput = (e)=>{ p.level=Math.max(1, Math.trunc(+e.target.value||1)); State.save(S); };
  rLvl.appendChild(document.createElement('div')).appendChild(lvlI);
  g.appendChild(rLvl);

  const rPts = el('div','list-item small'); rPts.innerHTML='<div>Points libres</div>';
  const ptsI = document.createElement('input'); ptsI.type='number'; ptsI.className='input'; ptsI.value=String(+p.bonusPoints||0);
  ptsI.oninput = (e)=>{ p.bonusPoints=Math.max(0, Math.trunc(+e.target.value||0)); State.save(S); };
  rPts.appendChild(document.createElement('div')).appendChild(ptsI);
  g.appendChild(rPts);

  ac.body.appendChild(g);

  // Race/Classe/Tribu
  const g2 = el('div','grid3');
  const rRace = el('div','list-item small'); rRace.innerHTML='<div>Race</div>';
  rRace.appendChild(document.createElement('div')).appendChild(selectFrom(S.races, p.race||'', val=>{ p.race=val; State.save(S); }));
  g2.appendChild(rRace);
  const rClass = el('div','list-item small'); rClass.innerHTML='<div>Classe</div>';
  rClass.appendChild(document.createElement('div')).appendChild(selectFrom(S.classes, p.klass||'', val=>{ p.klass=val; State.save(S); }));
  g2.appendChild(rClass);
  const rTribe = el('div','list-item small'); rTribe.innerHTML='<div>Tribu</div>';
  rTribe.appendChild(document.createElement('div')).appendChild(selectFrom(S.tribes, p.tribe||'', val=>{ p.tribe=val; State.save(S); }));
  g2.appendChild(rTribe);
  ac.body.appendChild(g2);

  // Accordéon Bonus/malus (Catégories & caractéristiques)
  const acMods = accordionPanel('Bonus/malus (Catégories & caractéristiques)');
  ac.body.appendChild(acMods.host);

  Object.entries(catMap).forEach(([catName, stats])=>{
    const sub = accordionPanel(catName);
    acMods.body.appendChild(sub.host);
    // ligne catégorie
    const listCat = el('div','list'); listCat.appendChild(catBonusRow(p, catName)); sub.body.appendChild(listCat);
    // lignes caractéristiques
    const listStats = el('div','list');
    if(stats && stats.length){ stats.forEach(st => listStats.appendChild(statBonusRow(p, st))); }
    else{ const e=el('div','muted small'); e.style.padding='6px 12px'; e.textContent='Aucune caractéristique dans cette catégorie.'; listStats.appendChild(e); }
    sub.body.appendChild(listStats);
  });

  // Accordéon Bonus/malus (Ressources applicables)
  const defs = getResourceDefs(S);
  const applicable = defs.filter(r => resourceAppliesToPlayer(r, p)).map(r=>r.name);
  const acRes = accordionPanel('Bonus/malus (Ressources)');
  ac.body.appendChild(acRes.host);
  const listR = el('div','list');
  if(applicable.length===0){ const e=el('div','muted small'); e.style.padding='8px 12px'; e.textContent='Aucune ressource applicable.'; listR.appendChild(e); }
  else { applicable.forEach(n => listR.appendChild(resBonusRow(p, n))); }
  acRes.body.appendChild(listR);

  return ac.host;
}

/* ---------- main ---------- */
export function renderPlayers(S){
  const root = el('div');
  S.players = S.players || [];
  const toolbar = el('div','row'); toolbar.style.justifyContent='space-between'; toolbar.style.alignItems='center';
  const tl = document.createElement('h3'); tl.textContent = 'Joueurs';
  const tr = document.createElement('div');
  const add = document.createElement('button'); add.className='btn'; add.textContent='Ajouter joueur';
  add.onclick = ()=>{ S.players.push({ name:'Nouveau', level:1, bonusPoints:0, attrs:{}, spent:{}, tempSpent:{}, catBonusPoints:{}, statBonus:{}, resourceMods:{} }); State.save(S); refresh(); };
  tr.appendChild(add);
  toolbar.append(tl,tr);
  root.appendChild(toolbar);

  const container = el('div'); root.appendChild(container);
  function refresh(){
    container.innerHTML='';
    if(S.players.length===0){
      const empty = el('div','muted small'); empty.style.padding='8px 12px'; empty.textContent='Aucun joueur encore.';
      container.appendChild(empty);
      return;
    }
    S.players.forEach(p => container.appendChild(playerPanel(S, p, refresh)));
  }
  refresh();
  return root;
}
export default renderPlayers;
