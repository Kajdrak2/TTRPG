// js/views/admin_players.js — Build A1 (édition joueurs)
import { el } from '../core/ui.js';
import * as State from '../core/state.js';

function N(v){ return isFinite(+v)? Math.trunc(+v) : 0; }
function arr(a){ return Array.isArray(a)? a : []; }
function ensureMods(p){ p.mods = p.mods && typeof p.mods==='object' ? p.mods : {}; p.mods.stats=p.mods.stats||{}; p.mods.cats=p.mods.cats||{}; p.mods.resources=p.mods.resources||{}; return p.mods; }

function listStats(S){ return (S.settings?.stats||[]).slice(); }
function listCats(S){ return (S.settings?.categories||[]).map(c=>c.name); }
function listRes(S){ return (S.resources||[]).map(r=>r.name||r.id); }

function kvPanel(title, map, opts){
  const keyOptions = opts.keyOptions||null;
  const box = el('div','panel'); box.innerHTML='<div class="list-item"><div><b>'+title+'</b></div></div>';
  const list = el('div','list'); box.appendChild(list);
  function render(){
    list.innerHTML='';
    const keys = Object.keys(map||{});
    if(!keys.length){ const empty=el('div','list-item small muted'); empty.textContent='(vide)'; list.appendChild(empty); }
    keys.forEach(k=>{
      const row = el('div','list-item small');
      row.appendChild((()=>{ const d=document.createElement('div'); d.textContent=k; return d; })());
      const r = document.createElement('div');
      const inp = document.createElement('input'); inp.className='input'; inp.type='number'; inp.value=+map[k]||0;
      const del = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer';
      inp.oninput = ()=>{ map[k]=N(inp.value); State.save(State.get()); };
      del.onclick = ()=>{ delete map[k]; State.save(State.get()); render(); };
      r.append(inp, del); row.appendChild(r); list.appendChild(row);
    });
    const add = el('div','list-item small'); const l=document.createElement('div'); l.textContent='Ajouter'; add.appendChild(l);
    const r = document.createElement('div'); r.style.display='flex'; r.style.gap='8px';
    let keyI;
    if(keyOptions){ keyI=document.createElement('select'); keyI.className='select'; const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; keyI.appendChild(o0); keyOptions.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; keyI.appendChild(o); }); }
    else { keyI=document.createElement('input'); keyI.className='input'; keyI.placeholder='clé'; }
    const valI=document.createElement('input'); valI.className='input'; valI.type='number'; valI.placeholder='+/-';
    const btn=document.createElement('button'); btn.className='btn small'; btn.textContent='Ajouter';
    btn.onclick = ()=>{ const k=(keyI.value||'').trim(); if(!k) return; map[k]=(map[k]||0)+N(valI.value); State.save(State.get()); render(); };
    r.append(keyI, valI, btn); add.appendChild(r); list.appendChild(add);
  }
  render(); return box;
}
function resPanel(title, map, options){
  const box = el('div','panel'); box.innerHTML = '<div class="list-item"><div><b>'+title+'</b></div></div>';
  const list = el('div','list'); box.appendChild(list);
  function render(){
    list.innerHTML='';
    const keys = Object.keys(map||{});
    if(!keys.length){ const empty=el('div','list-item small muted'); empty.textContent='(vide)'; list.appendChild(empty); }
    keys.forEach(k=>{
      const row = el('div','list-item small');
      row.appendChild((()=>{ const d=document.createElement('div'); d.textContent=k; return d; })());
      const r=document.createElement('div');
      const maxI=document.createElement('input'); maxI.className='input'; maxI.type='number'; maxI.value=+(map[k]?.max)||0;
      const startI=document.createElement('input'); startI.className='input'; startI.type='number'; startI.value=+(map[k]?.start)||0;
      const del = document.createElement('button'); del.className='btn small danger'; del.textContent='Supprimer';
      maxI.oninput=()=>{ (map[k]||(map[k]={})).max=N(maxI.value); State.save(State.get()); };
      startI.oninput=()=>{ (map[k]||(map[k]={})).start=N(startI.value); State.save(State.get()); };
      del.onclick=()=>{ delete map[k]; State.save(State.get()); render(); };
      r.append(maxI,startI,del); row.appendChild(r); list.appendChild(row);
    });
    const add = el('div','list-item small'); const l=document.createElement('div'); l.textContent='Ajouter'; add.appendChild(l);
    const r=document.createElement('div'); r.style.display='flex'; r.style.gap='8px';
    const sel=document.createElement('select'); sel.className='select'; const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; sel.appendChild(o0);
    (State.get().resources||[]).forEach(res=>{ const nm=res?.name||res?.id; if(!nm) return; const o=document.createElement('option'); o.value=nm; o.textContent=nm; sel.appendChild(o); });
    const maxI=document.createElement('input'); maxI.className='input'; maxI.type='number'; maxI.placeholder='max +=';
    const startI=document.createElement('input'); startI.className='input'; startI.type='number'; startI.placeholder='start +=';
    const btn=document.createElement('button'); btn.className='btn small'; btn.textContent='Ajouter';
    btn.onclick=()=>{ const k=sel.value; if(!k) return; const o=map[k]||{max:0,start:0}; o.max+=N(maxI.value); o.start+=N(startI.value); map[k]=o; State.save(State.get()); render(); };
    r.append(sel,maxI,startI,btn); add.appendChild(r); list.appendChild(add);
  }
  render(); return box;
}

function rowPlayer(S, p, refresh){
  ensureMods(p);
  const wrap = el('div','panel');
  const head = el('div','list-item'); head.style.cursor='pointer';
  head.innerHTML = '<div><b>'+(p.name||'Joueur')+'</b></div>';
  wrap.appendChild(head);
  const body = el('div','list'); body.style.display='none'; wrap.appendChild(body);
  head.onclick = ()=>{ body.style.display = (body.style.display==='none')?'block':'none'; };

  // Identité
  (function(){
    const row = el('div','list-item small');
    const l = document.createElement('div'); l.textContent='Identité'; row.appendChild(l);
    const r = document.createElement('div'); r.style.display='grid'; r.style.gridTemplateColumns='1fr 1fr 1fr 1fr'; r.style.gap='8px';
    const nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; nameI.value=p.name||'';
    const lvlI=document.createElement('input'); lvlI.className='input'; lvlI.type='number'; lvlI.placeholder='Niveau'; lvlI.value=+p.level||1;
    const raceS=document.createElement('select'); raceS.className='select'; const r0=document.createElement('option'); r0.value=''; r0.textContent='— Race —'; raceS.appendChild(r0); (S.races||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.name; o.textContent=x.name; if(x.name===(p.race||'')) o.selected=true; raceS.appendChild(o); });
    const clsS=document.createElement('select'); clsS.className='select'; const c0=document.createElement('option'); c0.value=''; c0.textContent='— Classe —'; clsS.appendChild(c0); (S.classes||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.name; o.textContent=x.name; if(x.name===(p.klass||'')) o.selected=true; clsS.appendChild(o); });
    const triS=document.createElement('select'); triS.className='select'; const t0=document.createElement('option'); t0.value=''; t0.textContent='— Tribu —'; triS.appendChild(t0); (S.tribes||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.name; o.textContent=x.name; if(x.name===(p.tribe||'')) o.selected=true; triS.appendChild(o); });

    nameI.oninput = ()=>{ p.name=nameI.value||''; State.save(S); head.innerHTML='<div><b>'+(p.name||'Joueur')+'</b></div>'; };
    lvlI.oninput  = ()=>{ p.level=Math.max(1,N(lvlI.value)); State.save(S); };
    raceS.onchange= ()=>{ p.race=raceS.value||''; State.save(S); };
    clsS.onchange = ()=>{ p.klass=clsS.value||''; State.save(S); };
    triS.onchange = ()=>{ p.tribe=triS.value||''; State.save(S); };

    r.append(nameI, lvlI, raceS, clsS, triS);
    row.appendChild(r); body.appendChild(row);
  })();

  // Points libres
  (function(){
    const row = el('div','list-item small');
    row.appendChild((()=>{ const d=document.createElement('div'); d.innerHTML='<b>Points libres</b>'; return d; })());
    const r=document.createElement('div'); const pts=document.createElement('input'); pts.type='number'; pts.className='input'; pts.value=+(p.bonusPoints||0);
    pts.oninput=()=>{ p.bonusPoints=N(pts.value); State.save(S); };
    r.appendChild(pts); row.appendChild(r); body.appendChild(row);
  })();

  // Bonus/Malus
  body.appendChild(kvPanel('Stats (bonus/malus)', p.mods.stats, { keyOptions:listStats(S) }));
  body.appendChild(kvPanel('Catégories (bonus/malus)', p.mods.cats, { keyOptions:listCats(S) }));
  body.appendChild(resPanel('Ressources (ajustements)', p.mods.resources, {}));

  // Inventaire rapide (ajout d'item par id)
  (function(){
    const row = el('div','list-item small');
    const l = document.createElement('div'); l.textContent='Donner un objet'; row.appendChild(l);
    const r = document.createElement('div'); r.style.display='flex'; r.style.gap='8px';
    State.ensureItemIds(S);
    const idI=document.createElement('select'); idI.className='select';
    const o0=document.createElement('option'); o0.value=''; o0.textContent='— Objet —'; idI.appendChild(o0);
    (S.items||[]).forEach(it=>{ if(!it?.id) return; const o=document.createElement('option'); o.value=it.id; o.textContent=it.name||('Objet '+it.id); idI.appendChild(o); });
    const qtyI=document.createElement('input'); qtyI.className='input'; qtyI.type='number'; qtyI.placeholder='Qté'; qtyI.value=1; qtyI.min=1;
    const btn=document.createElement('button'); btn.className='btn small'; btn.textContent='Donner';
    btn.onclick=()=>{ const n=Math.max(1,N(qtyI.value)); for(let i=0;i<n;i++) State.addItemToPlayer(S,p, idI.value); };
    r.append(idI, qtyI, btn); row.appendChild(r); body.appendChild(row);
  })();

  return wrap;
}

export function renderAdminPlayers(S){
  const root = el('div');
  const pnl = el('div','panel'); pnl.innerHTML='<div class="list-item"><div><b>Joueurs</b></div></div>'; root.appendChild(pnl);
  const list = el('div','list'); pnl.appendChild(list);

  function refresh(){
    list.innerHTML='';
    (S.players||[]).forEach(p=> list.appendChild(rowPlayer(S,p,refresh)));

    // Ajouter un joueur
    const add=el('div','list-item small');
    const l=document.createElement('div'); l.textContent='Ajouter'; add.appendChild(l);
    const r=document.createElement('div'); r.style.display='flex'; r.style.gap='8px';
    const nameI=document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom';
    const addB=document.createElement('button'); addB.className='btn'; addB.textContent='Ajouter';
    addB.onclick=()=>{ const nm=(nameI.value||'').trim(); if(!nm) return; (S.players=S.players||[]).push({ id:'p_'+Math.random().toString(36).slice(2,9), name:nm, level:1, bonusPoints:0, tempSpent:{}, spent:{}, mods:{stats:{},cats:{},resources:{}}, inv:[] }); State.save(S); refresh(); };
    r.append(nameI, addB); add.appendChild(r); list.appendChild(add);
  }
  refresh();
  return root;
}
export default renderAdminPlayers;
