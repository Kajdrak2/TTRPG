// js/views/player_sheet.js — Reset from user base + fixes + effective values (mods)
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

/* -------- Helpers (fallbacks) -------- */
function safeNum(v){ return Number.isFinite(+v) ? +v : 0; }
function findByName(list, name){
  return (list||[]).find(e => (e?.name||'') === (name||'')) || null;
}
function getEquipMods(S,p){
  try{
    if(typeof State.getEquipAndEffectMods==='function') return State.getEquipAndEffectMods(S,p);
  }catch(_e){/*noop*/}
  return {stats:{}, cats:{}, resources:{}};
}
function statBreakdownLocal(S, p, stat){
  const base = safeNum(p?.attrs?.[stat]);
  const invested = safeNum(p?.spent?.[stat]);
  const draft = safeNum(p?.tempSpent?.[stat]);
  const mods = safeNum(getEquipMods(S,p).stats?.[stat]);
  const effective = base + invested + draft + mods;
  return { base, invested, draft, mods, effective };
}
function categoryValueLocal(S, p, catName){
  const use = !!S?.settings?.useCategoryPoints;
  if(!use) return 0;
  let base = 0;
  const r = p?.race ? findByName(S.races, p.race) : null;
  const t = p?.tribe ? findByName(S.tribes, p.tribe) : null;
  const c = p?.klass ? findByName(S.classes, p.klass) : null;
  const add = v => { const n = +v || 0; if(Number.isFinite(n)) base += n; };
  if(r?.catMods) add(r.catMods[catName]);
  if(t?.catMods) add(t.catMods[catName]);
  if(c?.catMods) add(c.catMods[catName]);
  if(p?.catBonusPoints) add(p.catBonusPoints[catName]);
  const mods = safeNum(getEquipMods(S,p).cats?.[catName]);
  return { base, mods, effective: base + mods };
}
const getBreakdown = (S,p,st) => (typeof State.statBreakdown === 'function' ? State.statBreakdown(S,p,st) : statBreakdownLocal(S,p,st));
const getCatValue  = (S,p,cat) => {
  if(typeof State.categoryValueFor === 'function'){
    const v = State.categoryValueFor(S,p,cat);
    const mods = safeNum(getEquipMods(S,p).cats?.[cat]);
    return { base: safeNum(v), mods, effective: safeNum(v)+mods };
  }
  return categoryValueLocal(S,p,cat);
};
/* ------------------------------------- */

function pointsLeft(p){
  const draft = Object.values(p?.tempSpent||{}).reduce((a,b)=>a+(+b||0),0);
  return Math.max(0, (+p?.bonusPoints||0) - draft);
}

function makeSelect(options, current){
  const sel = document.createElement('select');
  sel.className = 'select';
  const optEmpty = document.createElement('option');
  optEmpty.value = '';
  optEmpty.textContent = '—';
  sel.appendChild(optEmpty);
  (options||[]).forEach(o=>{
    const opt = document.createElement('option');
    opt.value = o.name;
    opt.textContent = o.name;
    if(o.name === (current||'')) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

export function renderPlayerSheet(S){
  const p = (S.players||[])[0];
  // If no player exists yet, allow self-creation (first visit / private browsing)
  
  if(!p){
    const box = el('div');
    // Panel header
    const pnl = el('div','panel');
    const head = el('div','list-item');
    const left = document.createElement('div'); left.innerHTML = '<b>Créer mon personnage</b>';
    head.appendChild(left); pnl.appendChild(head); box.appendChild(pnl);
    const list = el('div','list'); pnl.appendChild(list);

    // Nom
    const rowName = el('div','list-item small'); rowName.innerHTML = '<div>Nom</div>';
    const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom du personnage';
    rowName.appendChild(el('div')).appendChild(nameI); list.appendChild(rowName);

    // R/T/C si activés
    const st = S.settings||{};
    let raceS=null, tribeS=null, classS=null;
    if(st.useRaces){
      const r = el('div','list-item small'); r.innerHTML='<div>Race</div>';
      raceS = document.createElement('select'); raceS.className='select';
      const ro0=document.createElement('option'); ro0.value=''; ro0.textContent='—'; raceS.appendChild(ro0);
      (S.races||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.name; o.textContent=x.name; raceS.appendChild(o); });
      r.appendChild(el('div')).appendChild(raceS); list.appendChild(r);
    }
    if(st.useTribes){
      const r = el('div','list-item small'); r.innerHTML='<div>Tribu</div>';
      tribeS = document.createElement('select'); tribeS.className='select';
      const to0=document.createElement('option'); to0.value=''; to0.textContent='—'; tribeS.appendChild(to0);
      (S.tribes||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.name; o.textContent=x.name; tribeS.appendChild(o); });
      r.appendChild(el('div')).appendChild(tribeS); list.appendChild(r);
    }
    if(st.useClasses){
      const r = el('div','list-item small'); r.innerHTML='<div>Classe</div>';
      classS = document.createElement('select'); classS.className='select';
      const co0=document.createElement('option'); co0.value=''; co0.textContent='—'; classS.appendChild(co0);
      (S.classes||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.name; o.textContent=x.name; classS.appendChild(o); });
      r.appendChild(el('div')).appendChild(classS); list.appendChild(r);
    }

    // Actions
    const actions = el('div','list-item small'); actions.appendChild(document.createElement('div'));
    const createB = document.createElement('button'); createB.className='btn'; createB.textContent='Créer';
    actions.lastChild.appendChild(createB); list.appendChild(actions);

    createB.onclick = ()=>{
      const name=(nameI.value||'').trim()||'Sans-nom';
      const np = { id:'p_'+Math.random().toString(36).slice(2,9), name, level:1, bonusPoints:0,
        tempSpent:{}, spent:{}, mods:{stats:{},cats:{},resources:{}}, inv:[], identityLocked:false };
      if(raceS) np.race = raceS.value||'';
      if(tribeS) np.tribe = tribeS.value||'';
      if(classS) np.klass = classS.value||'';
      (S.players=S.players||[]).push(np);
      State.save(S);
      const node = renderPlayerSheet(S);
      box.replaceWith(node);
    };

    return box;
  }


  const box = el('div');

  /* removed legacy no-player warn (creation form now handles this) */

  // ----- Identité (lecture seule après validation) -----
  const idCard = el('div','panel');
  const head = el('div'); head.className='list-item'; head.innerHTML='<div><b>Fiche Personnage</b></div>';
  idCard.appendChild(head);

  const g1 = el('div','grid3');
  // Nom
  const rName = el('div','list-item small'); rName.innerHTML = '<div>Nom</div>';
  const nameI = document.createElement('input'); nameI.className='input'; nameI.id='p-name'; nameI.value = p?.name||''; if(p.identityLocked) nameI.disabled=true;
  rName.appendChild(el('div')).appendChild(nameI);
  g1.appendChild(rName);

  // Niveau (readonly)
  const rLvl = el('div','list-item small'); rLvl.innerHTML = '<div>Niveau</div>';
  const lvlI = document.createElement('input'); lvlI.className='input'; lvlI.id='p-level'; lvlI.type='number'; lvlI.value = p?.level||1; lvlI.disabled = true; lvlI.title='Réglé par le MJ';
  rLvl.appendChild(el('div')).appendChild(lvlI);
  g1.appendChild(rLvl);

  // Race
  const rRace = el('div','list-item small'); rRace.innerHTML = '<div>Race</div>';
  const raceS = makeSelect(S.races, p?.race||''); raceS.id='p-race'; if(p.identityLocked && (p?.race||'')!=='') raceS.disabled=true;
  rRace.appendChild(el('div')).appendChild(raceS);
  g1.appendChild(rRace);
  idCard.appendChild(g1);

  const g2 = el('div','grid3');
  // Classe
  const rClass = el('div','list-item small'); rClass.innerHTML = '<div>Classe</div>';
  const clsS  = makeSelect(S.classes, p?.klass||''); clsS.id='p-class'; if(p.identityLocked) clsS.disabled=true;
  rClass.appendChild(el('div')).appendChild(clsS);
  g2.appendChild(rClass);

  // Tribu
  const rTribe = el('div','list-item small'); rTribe.innerHTML = '<div>Tribu</div>';
  const triS  = makeSelect(S.tribes, p?.tribe||''); triS.id='p-tribe'; if(p.identityLocked) triS.disabled=true;
  rTribe.appendChild(el('div')).appendChild(triS);
  g2.appendChild(rTribe);

  // Bouton valider identité
  const rAct = el('div','list-item small'); rAct.appendChild(document.createElement('div'));
  const actWrap = el('div');
  if(p.identityLocked){
    const ok = document.createElement('span'); ok.className='muted small'; ok.textContent='Identité validée';
    actWrap.appendChild(ok);
  }else{
    const lockB = document.createElement('button'); lockB.className='btn'; lockB.id='lockId'; lockB.textContent="Valider l'identité";
    lockB.onclick = ()=>{ p.identityLocked=true; State.save(S); renderStats(); nameI.disabled=true; raceS.disabled=true; clsS.disabled=true; triS.disabled=true; rAct.querySelector('button')?.remove(); actWrap.textContent='Identité validée'; };
    actWrap.appendChild(lockB);
  }
  rAct.appendChild(actWrap);
  g2.appendChild(rAct);

  idCard.appendChild(g2);
  box.appendChild(idCard);

  // handlers
  nameI.oninput = e=>{ if(p.identityLocked) return; p.name=e.target.value; State.save(S); };
  raceS.onchange = e=>{ if(p.identityLocked && (p?.race||'')!=='') return; p.race=e.target.value; State.save(S); renderStats(); };
  clsS.onchange  = e=>{ if(p.identityLocked && (p?.klass||'')!=='') return; p.klass=e.target.value; State.save(S); renderStats(); };
  triS.onchange  = e=>{ if(p.identityLocked && (p?.tribe||'')!=='') return; p.tribe=e.target.value; State.save(S); renderStats(); };

  // ----- Ressources (jauges) -----
  const resRoot = el('div'); resRoot.id='resources'; box.appendChild(resRoot);
  function renderResources(){
    if(!p) return;
    if(typeof State.ensurePlayerResources === 'function'){ State.ensurePlayerResources(S,p); }
    resRoot.innerHTML = '<div class="panel"><div class="list-item"><div><b>Ressources</b></div></div><div id="res-list" class="list"></div></div>';
    const list = resRoot.querySelector('#res-list');
    Object.entries(p.resources||{}).forEach(([name,obj])=>{
      const row=el('div','list-item small'); const left=el('div'); left.innerHTML=`<b>${name}</b>`; const right=el('div');
      const wrap=document.createElement('div'); wrap.style.width='220px'; wrap.style.background='rgba(255,255,255,.08)'; wrap.style.borderRadius='999px'; wrap.style.overflow='hidden'; wrap.style.height='10px'; wrap.style.display='inline-block'; wrap.style.verticalAlign='middle'; wrap.style.margin='0 8px';
      const fill=document.createElement('div'); fill.style.height='10px';
      const pct=Math.max(0,Math.min(100,Math.round((+(obj.current||0)/Math.max(1,+(obj.max||1)))*100))); fill.style.width=pct+'%'; fill.style.background='linear-gradient(90deg,#2dd4bf,#22c55e)';
      wrap.appendChild(fill);
      const minus=el('button','btn secondary small'); minus.textContent='-';
      const plus=el('button','btn secondary small'); plus.textContent='+';
      const label=document.createElement('span'); label.className='pill'; label.style.marginLeft='8px'; label.textContent=`${obj.current||0} / ${obj.max||0}`;
      function setVal(v){ obj.current=Math.max(0,Math.min(+(obj.max||0),+v)); const pp=Math.max(0, Math.min(100, Math.round((obj.current/Math.max(1,obj.max))*100))); fill.style.width=pp+'%'; label.textContent=`${obj.current} / ${obj.max}`; State.save(S); }
      minus.onclick=()=> setVal((obj.current||0)-1); plus.onclick=()=> setVal((obj.current||0)+1);
      right.append(minus, wrap, plus, label);
      row.append(left,right); list.appendChild(row);
    });
  }
  renderResources();

  // ----- Stats groupées par catégories -----
  const groupedRoot = el('div'); groupedRoot.className='stats-grouped'; box.appendChild(groupedRoot);

  function renderStats(){
    groupedRoot.innerHTML='';

    // Actions points en haut
    const act = el('div','panel');
    const line = el('div'); line.className='list-item small';
    const lbl = el('div'); lbl.innerHTML = '<b>Points à dépenser</b>';
    const val = el('div'); const badge=document.createElement('span'); badge.className='pill badge'; badge.textContent = String(pointsLeft(p)); val.appendChild(badge);
    const actionsRight = el('div'); actionsRight.style.display='flex'; actionsRight.style.gap='8px'; actionsRight.style.justifyContent='flex-end'; actionsRight.style.flex='1';
    const spentDraft = Object.values(p?.tempSpent||{}).reduce((a,b)=>a+(+b||0),0);
    const btnValidate = el('button','btn small'); btnValidate.textContent='Valider les points'; btnValidate.style.display = spentDraft>0?'inline-block':'none';
    const btnReset = el('button','btn secondary small'); btnReset.textContent='Réinitialiser';
    actionsRight.append(btnValidate, btnReset);
    line.append(lbl, val, actionsRight);
    act.appendChild(line);
    groupedRoot.appendChild(act);

    btnValidate.onclick = ()=>{
      const delta = Object.values(p.tempSpent||{}).reduce((a,b)=>a+(+b||0),0);
      p.spent = p.spent||{};
      Object.entries(p.tempSpent||{}).forEach(([k,v])=>{ p.spent[k]=(+p.spent[k]||0)+(+v||0); });
      p.tempSpent = {};
      p.bonusPoints = Math.max(0, (+p.bonusPoints||0) - delta);
      State.save(S); renderStats();
    };
    btnReset.onclick = ()=>{ p.tempSpent={}; State.save(S); renderStats(); };

    // Groupes
    const groups = {}; (S.settings?.categories||[]).forEach(c=> groups[c.name]=c.stats||[]);
    Object.keys(groups).forEach(catName=>{
      const wrap = el('div','panel');
      const head = el('div'); head.className='row'; head.style.justifyContent='space-between'; head.style.alignItems='center';
      const title = document.createElement('h4'); title.style.margin='0'; title.textContent = catName;
      head.appendChild(title);
      if(S.settings?.useCategoryPoints){
        const catV = getCatValue(S,p,catName);
        const info = document.createElement('div'); info.className='muted small'; info.textContent = `points : ${catV.effective}${catV.mods?` = ${catV.base} ${(catV.mods>0?'+':'')}${catV.mods}`:''}`;
        head.appendChild(info);
      }
      wrap.appendChild(head);

      const row = el('div','row-wrap');
      (groups[catName]||[]).forEach(st=>{
        const card = el('div','stat-card');
        const name = el('div'); name.className='name'; name.textContent = st;
        const bd = getBreakdown(S,p,st);
        const sub = el('div'); sub.className='muted small'; 
        const eff = (bd.effective!=null)? bd.effective : (bd.base + bd.invested + bd.draft + (bd.mods||0));
        const modsTxt = bd.mods ? ` · Mods: ${(bd.mods>0?'+':'')}${bd.mods}` : '';
        sub.textContent = `Base: ${bd.base} · Investis: ${bd.invested} · Brouillon: ${bd.draft}${modsTxt} · Effectif: ${eff}`;
        card.append(name, sub);

        const canShowControls = pointsLeft(p)>0 || (+bd.draft||0)>0;
        if(canShowControls){
          const ctr = el('div'); ctr.className='row'; ctr.style.gap='6px'; ctr.style.marginTop='8px';
          const minus = el('button','btn small'); minus.textContent='−';
          const plus  = el('button','btn small'); plus.textContent='+';
          minus.onclick = ()=>{
            p.tempSpent = p.tempSpent||{};
            const cur = +p.tempSpent[st]||0;
            if(cur>0){ p.tempSpent[st]=cur-1; if(p.tempSpent[st]<=0) delete p.tempSpent[st]; State.save(S); renderStats(); }
          };
          plus.onclick = ()=>{
            const avail = pointsLeft(p);
            if(avail>0){ p.tempSpent = p.tempSpent||{}; p.tempSpent[st]=(+p.tempSpent[st]||0)+1; State.save(S); renderStats(); }
          };
          ctr.append(minus, plus);
          card.appendChild(ctr);
        }

        row.appendChild(card);
      });
      wrap.appendChild(row);
      groupedRoot.appendChild(wrap);
    });
  }
  renderStats();

  return box;
}

export default renderPlayerSheet;
