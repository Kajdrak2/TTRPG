// js/views/player_sheet.js — Build PS9 (inheritance + self-creation)
// - Inheritance from Race/Tribu/Classe applied to stats & categories (base + per level)
// - Dice/stat breakdown compatible via shared helpers (State.statBreakdown still supported if present)
// - Player can CREATE their own character if none exists (name + optional R/T/C)
// - Resources ensured via State.ensurePlayerResources if available
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

/* -------- Helpers (fallbacks) -------- */
const N = v => (Number.isFinite(+v) ? +v : 0);
function safeNum(v){ return Number.isFinite(+v) ? +v : 0; }
function findByIdOrName(list, id){
  const sid = String(id||'');
  return (list||[]).find(e => String(e?.id||'')===sid || String(e?.name||'')===sid) || null;
}
function getEquipMods(S,p){
  try{
    if(typeof State.getEquipAndEffectMods==='function') return State.getEquipAndEffectMods(S,p);
  }catch(_e){/*noop*/}
  return {stats:{}, cats:{}, resources:{}};
}
/* ---- Inheritance extract (aligned with admin_bestiaire) ---- */
const CAND = {
  statsBase: ['stats','characteristics','baseStats','attrs','statMods','statsBase','stats_base','mods.stats','mod.stats','modifiers.stats'],
  statsPerL: ['statsPerLevel','perLevelStats','statsLvl','levelStats','stats_per_level','modsPerLevel.stats','modifiersPerLevel.stats'],
  catsBase:  ['cats','categories','catMods','mods.cats','categoryMods','categoriesDelta'],
  catsPerL:  ['catsPerLevel','categoriesPerLevel','modsPerLevel.cats'],
};
function readPath(obj, path){
  if(!obj) return undefined;
  return path.split('.').reduce((a,k)=> (a && a[k]!=null) ? a[k] : undefined, obj);
}
function extractInheritance(ent){
  const r = { stats:{}, statsPerLevel:{}, cats:{}, catsPerLevel:{} };
  if(!ent || typeof ent!=='object') return r;
  CAND.statsBase.forEach(p=>{ const o=readPath(ent,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.stats[k]=N(o[k])); });
  CAND.statsPerL.forEach(p=>{ const o=readPath(ent,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.statsPerLevel[k]=N(o[k])); });
  CAND.catsBase.forEach(p=>{ const o=readPath(ent,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.cats[k]=N(o[k])); });
  CAND.catsPerL.forEach(p=>{ const o=readPath(ent,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.catsPerLevel[k]=N(o[k])); });
  return r;
}
function inheritedForStat(S,p,stat){
  const lvl = Math.max(1, Math.floor(+p?.level||1));
  const Lm1 = (lvl-1);
  let add = 0;
  const r = p?.race ? findByIdOrName(S.races, p.race) : null;
  const t = p?.tribe ? findByIdOrName(S.tribes, p.tribe) : null;
  const c = p?.klass ? findByIdOrName(S.classes, p.klass) : null;
  [r,t,c].forEach(ent=>{
    if(!ent) return;
    const ex = extractInheritance(ent);
    if(ex.stats[stat]!=null) add += N(ex.stats[stat]);
    if(ex.statsPerLevel[stat]!=null) add += N(ex.statsPerLevel[stat])*Lm1;
  });
  return add;
}
function inheritedForCategory(S,p,cat){
  const lvl = Math.max(1, Math.floor(+p?.level||1));
  const Lm1 = (lvl-1);
  let add = 0;
  const r = p?.race ? findByIdOrName(S.races, p.race) : null;
  const t = p?.tribe ? findByIdOrName(S.tribes, p.tribe) : null;
  const c = p?.klass ? findByIdOrName(S.classes, p.klass) : null;
  [r,t,c].forEach(ent=>{
    if(!ent) return;
    const ex = extractInheritance(ent);
    if(ex.cats[cat]!=null) add += N(ex.cats[cat]);
    if(ex.catsPerLevel[cat]!=null) add += N(ex.catsPerLevel[cat])*Lm1;
  });
  return add;
}

function statBreakdownLocal(S, p, stat){
  const base = safeNum(p?.attrs?.[stat]);
  const invested = safeNum(p?.spent?.[stat]);
  const draft = safeNum(p?.tempSpent?.[stat]);
  const inherit = inheritedForStat(S,p,stat);
  const mods = safeNum(getEquipMods(S,p).stats?.[stat]);
  const effective = base + invested + draft + inherit + mods;
  return { base, invested, draft, inherit, mods, effective };
}
function categoryValueLocal(S, p, catName){
  const use = !!S?.settings?.useCategoryPoints;
  let base = 0, inherit=0;
  if(use){
    inherit = inheritedForCategory(S,p,catName);
    const cbp = p?.catBonusPoints?.[catName]; if(Number.isFinite(+cbp)) base += +cbp;
  }
  const mods = safeNum(getEquipMods(S,p).cats?.[catName]);
  const effective = base + inherit + mods;
  return { base, inherit, mods, effective };
}
// Prefer State helpers if present, but ensure inherit is included
const getBreakdown = (S,p,st) => {
  if(typeof State.statBreakdown === 'function'){
    const bd = State.statBreakdown(S,p,st) || {};
    const inherit = inheritedForStat(S,p,st);
    const effective = N(bd.effective ?? (bd.base+bd.invested+bd.draft+(bd.mods||0))) + inherit;
    return { ...bd, inherit, effective };
  }
  return statBreakdownLocal(S,p,st);
};
const getCatValue  = (S,p,cat) => {
  if(typeof State.categoryValueFor === 'function'){
    const base0 = safeNum(State.categoryValueFor(S,p,cat));
    const inherit = inheritedForCategory(S,p,cat);
    const mods = safeNum(getEquipMods(S,p).cats?.[cat]);
    return { base: base0, inherit, mods, effective: base0+inherit+mods };
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
    opt.value = o.id || o.name;
    opt.textContent = o.name || o.id;
    if(opt.value === String(current||'')) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

function listAllStats(S){
  const direct = Array.isArray(S.settings?.stats) ? S.settings.stats.slice() : [];
  if(direct.length) return direct;
  const viaCats = (S.settings?.categories||[]).flatMap(c => c.stats||[]);
  if(viaCats.length) return Array.from(new Set(viaCats));
  const fromChars = Array.isArray(S.characteristics) ? S.characteristics.slice() : [];
  return fromChars;
}

function ensurePlayerObject(S){
  S.players = Array.isArray(S.players) ? S.players : [];
  return S.players;
}

function creationPanel(S){
  const wrap = el('div','panel');
  wrap.innerHTML = '<div class="list-item"><div><b>Créer mon personnage</b></div></div>';
  const form = el('div','list');
  const r1 = el('div','list-item small'); r1.innerHTML='<div>Nom</div>'; const nameI = document.createElement('input'); nameI.className='input'; nameI.placeholder='Nom'; r1.appendChild(nameI);
  const r2 = el('div','list-item small'); r2.innerHTML='<div>Race</div>'; const raceS = makeSelect(S.races, ''); r2.appendChild(raceS);
  const r3 = el('div','list-item small'); r3.innerHTML='<div>Classe</div>'; const clsS  = makeSelect(S.classes, ''); r3.appendChild(clsS);
  const r4 = el('div','list-item small'); r4.innerHTML='<div>Tribu</div>'; const triS  = makeSelect(S.tribes, ''); r4.appendChild(triS);
  const r5 = el('div','list-item small'); r5.innerHTML='<div></div>'; const createB = document.createElement('button'); createB.className='btn'; createB.textContent='Créer'; r5.appendChild(createB);
  form.append(r1,r2,r3,r4,r5); wrap.appendChild(form);

  createB.onclick = ()=>{
    const name = (nameI.value||'').trim() || 'Héros';
    const statsList = listAllStats(S);
    const attrs = {}; statsList.forEach(k=> attrs[k]=0);
    const p = {
      id: 'pc_'+Math.random().toString(36).slice(2,9),
      name,
      level: 1,
      race: String(raceS.value||''),
      klass: String(clsS.value||''),
      tribe: String(triS.value||''),
      attrs, spent:{}, tempSpent:{},
      bonusPoints: +S.settings?.initialPoints || 0,
      resources: {}
    };
    ensurePlayerObject(S).push(p);
    State.save(S);
    if(typeof State.ensurePlayerResources==='function'){ State.ensurePlayerResources(S,p); State.save(S); }
    // Re-render by replacing this panel content
    const root = wrap.parentElement; if(root){ root.innerHTML=''; root.appendChild(renderPlayerSheet(S)); }
  };

  return wrap;
}

export function renderPlayerSheet(S){
  const players = ensurePlayerObject(S);
  const p = players[0];
  const box = el('div');

  if(!p){
    box.appendChild(creationPanel(S));
    return box;
  }

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
  const raceS = makeSelect(S.races, p?.race||''); raceS.id='p-race'; if(p.identityLocked) raceS.disabled=true;
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
  raceS.onchange = e=>{ if(p.identityLocked) return; p.race=e.target.value; State.save(S); renderStats(); };
  clsS.onchange  = e=>{ if(p.identityLocked) return; p.klass=e.target.value; State.save(S); renderStats(); };
  triS.onchange  = e=>{ if(p.identityLocked) return; p.tribe=e.target.value; State.save(S); renderStats(); };

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
        const info = document.createElement('div'); info.className='muted small'; 
        const parts = [`points : ${catV.effective}`];
        const expl = [];
        if(catV.base) expl.push(`${catV.base}`);
        if(catV.inherit) expl.push(`${catV.inherit>=0?'+':''}${catV.inherit}`);
        if(catV.mods) expl.push(`${catV.mods>=0?'+':''}${catV.mods}`);
        if(expl.length) parts.push(`= ${expl.join(' ')}`);
        info.textContent = parts.join(' ');
        head.appendChild(info);
      }
      wrap.appendChild(head);

      const row = el('div','row-wrap');
      (groups[catName]||[]).forEach(st=>{
        const card = el('div','stat-card');
        const name = el('div'); name.className='name'; name.textContent = st;
        const bd = getBreakdown(S,p,st);
        const sub = el('div'); sub.className='muted small'; 
        const parts = [`Base: ${bd.base}`, `Investis: ${bd.invested}`, `Brouillon: ${bd.draft}`];
        if(bd.inherit) parts.push(`Héritage: ${bd.inherit>=0?'+':''}${bd.inherit}`);
        if(bd.mods) parts.push(`Mods: ${bd.mods>=0?'+':''}${bd.mods}`);
        parts.push(`Effectif: ${bd.effective}`);
        sub.textContent = parts.join(' · ');
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
