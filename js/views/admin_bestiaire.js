// TTRPG/js/views/admin_bestiaire.js — Build 18
// Changes from B17:
// - No cap on dispositions (no clamp to [-100,100]).
// - Attitude computation treats empty 'min' as -Infinity (min === null).
// - Auto-propagation remains: template defaultDisposition change updates deployed; S.attitudes change re-evaluates deployed.

/* ====================== Utils ====================== */
const el = (t, cls) => { const n=document.createElement(t); if(cls) n.className=cls; return n; };
const N=v=>{ const n=Number(v); return Number.isFinite(n)?n:0; };
const deepClone = (o)=> JSON.parse(JSON.stringify(o||{}));

/* ---- Attitudes ---- */
function _stanceFromConfig(d, S){
  const list = Array.isArray(S.attitudes)? S.attitudes.slice() : null;
  if(list && list.length){
    const getMin = a => (a.min==null ? -Infinity : N(a.min));
    const getMax = a => (a.max==null ? +Infinity : N(a.max));
    list.sort((a,b)=> getMin(a)-getMin(b));
    for(const att of list){
      const min=getMin(att), max=getMax(att);
      if(d>=min && d<=max){
        return att.name || att.label || att.id || 'neutre';
      }
    }
    // fallback: pick the highest min <= d or the first
    let best=null;
    for(const att of list){ if(d>=getMin(att)) best=att; }
    if(best) return best.name || best.label || best.id || 'neutre';
    return list[0].name || list[0].label || list[0].id || 'neutre';
  }
  const thr = (S.attitudeThresholds||{friendly:30, hostile:-30});
  return d>=thr.friendly?'amical':(d<=thr.hostile?'hostile':'neutre');
}
function stanceFromDisposition(d,S){ return _stanceFromConfig(Number(d), S||window.State||{}); }
if(typeof window!=='undefined'){ window.computeStanceFromDisposition = stanceFromDisposition; }

/* ---- State save + event bus ---- */
function emitState(){ try{ window.dispatchEvent(new CustomEvent('ttrpg:state')); }catch(_){} }
function save(S){
  if (window.State && typeof window.State.save==='function') {
    if (!window.State.__emitterPatched) {
      const _orig = window.State.save.bind(window.State);
      window.State.save = (...args)=>{ const r=_orig(...args); emitState(); return r; };
      window.State.__emitterPatched = true;
    }
    window.State.save(S);
  } else { emitState(); }
}

function ensureSchema(S){
  if(!Array.isArray(S.enemiesTemplates)) S.enemiesTemplates=[];
  if(!Array.isArray(S.enemies)) S.enemies=[];
  if(!Array.isArray(S.enemyGroups)) S.enemyGroups=[];
  if(!S.attitudeThresholds || typeof S.attitudeThresholds!=='object'){
    S.attitudeThresholds = { friendly:30, hostile:-30 };
  }
  return S;
}

/* ====================== Catalogs (STRICT from state) ====================== */
const asKeyList = (arr)=>{
  if(!arr) return [];
  if(Array.isArray(arr)) return arr.map(x=> typeof x==='string' ? x : (x?.key||x?.id||x?.name||x?.label) ).filter(Boolean);
  if(typeof arr==='object') return Object.keys(arr);
  return [];
};
const pickFirstNonEmpty = (S, keys)=>{
  for(const k of keys){
    const v = k.split('.').reduce((a,kk)=> (a&&a[kk]!=null)?a[kk]:undefined, S);
    const list = asKeyList(v);
    if(list.length) return list;
  }
  return [];
};

function getStatsCatalog(S){
  const primary = pickFirstNonEmpty(S, ['settings.characteristics','characteristics','caracs','stats','statsList']);
  if(primary.length) return primary;
  const pool = new Set();
  ['races','tribes','classes'].forEach(col=>{
    (S[col]||[]).forEach(e=>{
      [e?.mods?.stats, e?.stats, e?.characteristics, e?.statMods].forEach(obj=>{
        if(obj && typeof obj==='object') Object.keys(obj).forEach(k=> pool.add(k));
      });
    });
  });
  return Array.from(pool).sort();
}
function getCatsCatalog(S){
  const primary = pickFirstNonEmpty(S, ['settings.categories','bestiaireCategories']);
  if(primary.length) return primary;
  const pool = new Set();
  ['races','tribes','classes'].forEach(col=>{
    (S[col]||[]).forEach(e=>{
      [e?.catMods, e?.mods?.cats, e?.categoryMods].forEach(obj=>{
        if(obj && typeof obj==='object') Object.keys(obj).forEach(k=> pool.add(k));
      });
    });
  });
  return Array.from(pool).sort();
}
function getResCatalog(S){
  const primary = pickFirstNonEmpty(S, ['resources','bestiaireResources']);
  if(primary.length) return primary;
  const pool = new Set();
  ['races','tribes','classes'].forEach(col=>{
    (S[col]||[]).forEach(e=>{
      [e?.mods?.resources, e?.resourceMods, e?.resources].forEach(obj=>{
        if(obj && typeof obj==='object') Object.keys(obj).forEach(k=> pool.add(k));
      });
    });
  });
  return Array.from(pool).sort();
}

/* ====================== Inheritance helpers ====================== */
function findByIdOrName(arr,id){
  if(!arr) return null;
  const sid = String(id||'');
  return arr.find(x=> String(x?.id||'')===sid) || arr.find(x=> String(x?.name||'')===sid) || null;
}
const CAND = {
  statsBase: ['stats','characteristics','baseStats','attrs','statMods','statsBase','stats_base','mods.stats','mod.stats','modifiers.stats'],
  statsPerL: ['statsPerLevel','perLevelStats','statsLvl','levelStats','stats_per_level','modsPerLevel.stats','modifiersPerLevel.stats'],
  catsBase:  ['cats','categories','catMods','mods.cats','categoryMods','categoriesDelta'],
  catsPerL:  ['catsPerLevel','categoriesPerLevel','modsPerLevel.cats'],
  resBase:   ['resources','res','pools','mods.resources','resourceMods'],
  resPerL:   ['resourcesPerLevel','resPerLevel','modsPerLevel.resources'],
};
function readPath(obj, path){
  if(!obj) return undefined;
  return path.split('.').reduce((a,k)=> (a && a[k]!=null) ? a[k] : undefined, obj);
}
function extractBaseAndPerLevel(src){
  const r = { stats:{}, statsPerLevel:{}, cats:{}, catsPerLevel:{}, res:{}, resPerLevel:{} };
  if(!src || typeof src!=='object') return r;
  CAND.statsBase.forEach(p=>{ const o=readPath(src,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.stats[k]=N(o[k])); });
  CAND.statsPerL.forEach(p=>{ const o=readPath(src,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.statsPerLevel[k]=N(o[k])); });
  CAND.catsBase.forEach(p=>{ const o=readPath(src,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.cats[k]=N(o[k])); });
  CAND.catsPerL.forEach(p=>{ const o=readPath(src,p); if(o && typeof o==='object') Object.keys(o).forEach(k=> r.catsPerLevel[k]=N(o[k])); });
  CAND.resBase.forEach(p=>{
    const o=readPath(src,p);
    if(o && typeof o==='object') Object.keys(o).forEach(k=>{
      const v=o[k];
      r.res[k] = v&&typeof v==='object' ? {max:N(v.max),start:N(v.start)} : {max:N(v),start:0};
    });
  });
  CAND.resPerL.forEach(p=>{
    const o=readPath(src,p);
    if(o && typeof o==='object') Object.keys(o).forEach(k=>{
      const v=o[k];
      r.resPerLevel[k] = v&&typeof v==='object' ? {max:N(v.max),start:N(v.start)} : {max:N(v),start:0};
    });
  });
  return r;
}
function applyExtract(dstStats, dstCats, dstRes, extract, Lm1){
  Object.keys(extract.stats).forEach(k=> dstStats[k]=(dstStats[k]||0)+extract.stats[k]);
  Object.keys(extract.statsPerLevel).forEach(k=> dstStats[k]=(dstStats[k]||0)+extract.statsPerLevel[k]*Lm1);
  Object.keys(extract.cats).forEach(k=> dstCats[k]=(dstCats[k]||0)+extract.cats[k]);
  Object.keys(extract.catsPerLevel).forEach(k=> dstCats[k]=(dstCats[k]||0)+extract.catsPerLevel[k]*Lm1);
  Object.keys(extract.res).forEach(k=>{
    const b = dstRes[k]||(dstRes[k]={max:0,start:0}); const v = extract.res[k];
    b.max+=N(v.max); b.start+=N(v.start); if(b.start>b.max) b.start=b.max;
  });
  Object.keys(extract.resPerLevel).forEach(k=>{
    const b = dstRes[k]||(dstRes[k]={max:0,start:0}); const v = extract.resPerLevel[k];
    b.max+=N(v.max)*Lm1; b.start+=N(v.start)*Lm1; if(b.start>b.max) b.start=b.max;
  });
}

/* ====================== Calc: template -> preview ====================== */
function calcPreviewFromTemplate(tpl, level, S){
  const lvl = Math.max(1, Math.floor(+level||tpl.level||1));
  const Lm1 = (lvl-1);
  const stats = {...(tpl.stats||{})};
  const cats  = {...(tpl.cats||{})};
  const res   = JSON.parse(JSON.stringify(tpl.resources||{}));
  const spl = tpl.statsPerLevel||{};
  const cpl = tpl.catsPerLevel||{};
  const rpl = tpl.resourcesPerLevel||{};
  for(const k in spl) stats[k]=(stats[k]||0)+N(spl[k])*Lm1;
  for(const k in cpl) cats[k]=(cats[k]||0)+N(cpl[k])*Lm1;
  for(const r in rpl){
    const base=res[r]||{max:0,start:0}; const inc=rpl[r]||{};
    base.max=(base.max||0)+N(inc.max)*Lm1;
    base.start=(base.start||0)+N(inc.start)*Lm1;
    if(base.start>base.max) base.start=base.max;
    res[r]=base;
  }
  // Héritage Race/Tribu/Classe
  const useRace = (tpl.useRace===undefined ? !!tpl.raceId : !!tpl.useRace);
  const useTribe = (tpl.useTribe===undefined ? !!tpl.tribeId : !!tpl.useTribe);
  const useClass = (tpl.useClass===undefined ? !!tpl.classId : !!tpl.useClass);
  if(useRace){
    const race = findByIdOrName(S.races||[], tpl.raceId);
    if(race){ const ex=extractBaseAndPerLevel(race); applyExtract(stats,cats,res,ex,Lm1); }
  }
  if(useTribe){
    const tribe = findByIdOrName(S.tribes||[], tpl.tribeId);
    if(tribe){ const ex=extractBaseAndPerLevel(tribe); applyExtract(stats,cats,res,ex,Lm1); }
  }
  if(useClass){
    const klass = findByIdOrName(S.classes||[], tpl.classId);
    if(klass){ const ex=extractBaseAndPerLevel(klass); applyExtract(stats,cats,res,ex,Lm1); }
  }
  return { level:lvl, stats, cats, resources:res };
}

/* ====================== Déployés: snapshot ====================== */
function getActorEffectiveSnapshot(actor, S){
  try{
    const tpl = (S.enemiesTemplates||[]).find(t=> t && t.id===actor.templateId);
    const base = tpl ? calcPreviewFromTemplate(tpl, actor.level, S) : {stats:actor.stats||{}, cats:actor.cats||{}, resources:actor.resources||{}};
    const stats = {...(base.stats||{})};
    const LM = actor.localMods || {add:{}, mult:{}, override:{}};
    const effs = Array.isArray(actor.effects) ? actor.effects.filter(e=> e && e.active!==false) : [];
    const add={}, mult={}, ov={};
    Object.keys(LM.add||{}).forEach(k=> add[k]=(add[k]||0)+N(LM.add[k]));
    Object.keys(LM.mult||{}).forEach(k=> mult[k]=(mult[k]||1)*(Number(LM.mult[k])||1));
    Object.assign(ov, LM.override||{});
    effs.forEach(e=>{
      if(e.add)  Object.keys(e.add).forEach(k=> add[k]=(add[k]||0)+N(e.add[k]));
      if(e.mult) Object.keys(e.mult).forEach(k=> mult[k]=(mult[k]||1)*(Number(e.mult[k])||1));
      if(e.override) Object.assign(ov, e.override);
    });
    Object.keys(add).forEach(k=> stats[k]=(stats[k]||0)+add[k]);
    Object.keys(mult).forEach(k=> stats[k]=(stats[k]||0)*(Number(mult[k])||1));
    Object.assign(stats, ov);
    return { stats, cats: base.cats||{}, resources: base.resources||{} };
  }catch(e){
    console.warn('snapshot error', e);
    return { stats: actor.stats||{}, cats: actor.cats||{}, resources: actor.resources||{} };
  }
}

/* ====================== UI helpers ====================== */
const OPEN_MODELS = new Set();
function pAccordion(key, title, openByDefault){
  const openInit = OPEN_MODELS.has(key) || !!openByDefault;
  const wrap = el('div','panel');
  const head = el('div','list-item'); head.innerHTML = `<div><b>${title}</b></div>`;
  const body = el('div'); body.style.display = openInit? 'block':'none';
  head.style.cursor='pointer';
  head.addEventListener('click',()=>{
    const isOpen = (body.style.display!=='none');
    if(isOpen){ body.style.display='none'; OPEN_MODELS.delete(key); }
    else { body.style.display='block'; OPEN_MODELS.add(key); }
  });
  wrap.appendChild(head); wrap.appendChild(body);
  return {wrap, body, head};
}
function accordion(title, open=true){
  const wrap = el('div','panel');
  const head = el('div','list-item'); head.innerHTML = `<div><b>${title}</b></div>`;
  const body = el('div'); body.style.display = open? 'block':'none';
  head.style.cursor='pointer';
  head.addEventListener('click',()=>{ body.style.display = (body.style.display==='none'?'block':'none'); });
  wrap.appendChild(head); wrap.appendChild(body);
  return {wrap, body, head};
}
function makeKeyChooser(catalog=[], placeholder='clé'){
  const wrap = el('div','row'); wrap.style.gap='6px'; wrap.style.flexWrap='wrap';
  const sel = el('select','input');
  (catalog||[]).slice().sort().forEach(k=>{ const o=el('option'); o.value=k; o.textContent=k; sel.appendChild(o); });
  wrap.appendChild(sel);
  return { wrap, get(){ return sel.value; }, set(v){ sel.value=v; } };
}

/* ===== Grouped editors ===== */
function statsGroupEditor(base, perLevel, onChange, statsCatalog){
  const box = el('div','panel');
  const acc = accordion('Stats', true);
  box.appendChild(acc.wrap);
  const list = el('div','list'); acc.body.appendChild(list);
  function render(){
    list.innerHTML='';
    const keys = Array.from(new Set([...Object.keys(base||{}), ...Object.keys(perLevel||{})])).sort();
    if(keys.length===0){
      const x=el('div','list-item small muted'); x.textContent='(vide)'; list.appendChild(x);
    }else{
      keys.forEach(k=>{
        const row=el('div','list-item small row'); row.style.gap='8px'; row.style.flexWrap='wrap';
        const lbl=el('div'); lbl.innerHTML=`<b>${k}</b>`;
        const bI=el('input','input'); bI.type='number'; bI.value=Number(base?.[k]||0);
        const pI=el('input','input'); pI.type='number'; pI.value=Number(perLevel?.[k]||0);
        const saveB=el('button','btn small'); saveB.textContent='MAJ';
        const del=el('button','btn small danger'); del.textContent='Supprimer';
        saveB.onclick=()=>{ base[k]=N(bI.value); perLevel[k]=N(pI.value); onChange(); render(); };
        del.onclick=()=>{ delete base[k]; delete perLevel[k]; onChange(); render(); };
        const hint = el('div','muted small'); hint.textContent='base / +par niv';
        row.appendChild(lbl); row.appendChild(hint); row.appendChild(bI); row.appendChild(pI); row.appendChild(saveB); row.appendChild(del);
        list.appendChild(row);
      });
    }
  }
  const form = el('div','list-item row'); form.style.flexWrap='wrap'; form.style.gap='6px';
  const chooser = makeKeyChooser(statsCatalog, 'stat');
  const baseI=el('input','input'); baseI.type='number'; baseI.placeholder='base';
  const perI=el('input','input'); perI.type='number'; perI.placeholder='+/niveau';
  const addB=el('button','btn small'); addB.textContent='Ajouter/Mettre à jour';
  const clrB=el('button','btn small secondary'); clrB.textContent='Vider';
  addB.onclick=()=>{ const k=chooser.get(); if(!k) return; base[k]=N(baseI.value); perLevel[k]=N(perI.value); onChange(); render(); };
  clrB.onclick=()=>{ Object.keys(base).forEach(k=> delete base[k]); Object.keys(perLevel).forEach(k=> delete perLevel[k]); onChange(); render(); };
  acc.body.appendChild(form);
  form.appendChild(chooser.wrap); form.appendChild(baseI); form.appendChild(perI); form.appendChild(addB); form.appendChild(clrB);
  render();
  return box;
}
function catsGroupEditor(base, perLevel, onChange, catsCatalog){
  const box = el('div','panel');
  const acc = accordion('Catégories', false);
  box.appendChild(acc.wrap);
  const list = el('div','list'); acc.body.appendChild(list);
  function render(){
    list.innerHTML='';
    const keys = Array.from(new Set([...Object.keys(base||{}), ...Object.keys(perLevel||{})])).sort();
    if(keys.length===0){ const x=el('div','list-item small muted'); x.textContent='(vide)'; list.appendChild(x); }
    else keys.forEach(k=>{
      const row=el('div','list-item small row'); row.style.gap='8px'; row.style.flexWrap='wrap';
      const lbl=el('div'); lbl.innerHTML=`<b>${k}</b>`;
      const bI=el('input','input'); bI.type='number'; bI.value=Number(base?.[k]||0);
      const pI=el('input','input'); pI.type='number'; pI.value=Number(perLevel?.[k]||0);
      const saveB=el('button','btn small'); saveB.textContent='MAJ';
      const del=el('button','btn small danger'); del.textContent='Supprimer';
      saveB.onclick=()=>{ base[k]=N(bI.value); perLevel[k]=N(pI.value); onChange(); render(); };
      del.onclick=()=>{ delete base[k]; delete perLevel[k]; onChange(); render(); };
      const hint=el('div','muted small'); hint.textContent='base / +par niv';
      row.appendChild(lbl); row.appendChild(hint); row.appendChild(bI); row.appendChild(pI); row.appendChild(saveB); row.appendChild(del);
      list.appendChild(row);
    });
  }
  const form = el('div','list-item row'); form.style.flexWrap='wrap'; form.style.gap='6px';
  const chooser = makeKeyChooser(catsCatalog, 'cat');
  const baseI=el('input','input'); baseI.type='number'; baseI.placeholder='base';
  const perI=el('input','input'); perI.type='number'; perI.placeholder='+/niveau';
  const addB=el('button','btn small'); addB.textContent='Ajouter/Mettre à jour';
  const clrB=el('button','btn small secondary'); clrB.textContent='Vider';
  addB.onclick=()=>{ const k=chooser.get(); if(!k) return; base[k]=N(baseI.value); perLevel[k]=N(perI.value); onChange(); render(); };
  clrB.onclick=()=>{ Object.keys(base).forEach(k=> delete base[k]); Object.keys(perLevel).forEach(k=> delete perLevel[k]); onChange(); render(); };
  acc.body.appendChild(form);
  form.appendChild(chooser.wrap); form.appendChild(baseI); form.appendChild(perI); form.appendChild(addB); form.appendChild(clrB);
  render();
  return box;
}
function resGroupEditor(base, perLevel, onChange, resCatalog){
  const box = el('div','panel');
  const acc = accordion('Ressources', false);
  box.appendChild(acc.wrap);
  const list = el('div','list'); acc.body.appendChild(list);
  function render(){
    list.innerHTML='';
    const keys = Array.from(new Set([...Object.keys(base||{}), ...Object.keys(perLevel||{})])).sort();
    if(keys.length===0){ const x=el('div','list-item small muted'); x.textContent='(vide)'; list.appendChild(x); }
    else keys.forEach(k=>{
      const b=base[k]||{max:0,start:0}; const p=perLevel[k]||{max:0,start:0};
      const row=el('div','list-item small row'); row.style.gap='8px'; row.style.flexWrap='wrap';
      const lbl=el('div'); lbl.innerHTML=`<b>${k}</b>`;
      const bStart=el('input','input'); bStart.type='number'; bStart.value=Number(b.start||0);
      const bMax=el('input','input'); bMax.type='number'; bMax.value=Number(b.max||0);
      const pStart=el('input','input'); pStart.type='number'; pStart.value=Number(p.start||0);
      const pMax=el('input','input'); pMax.type='number'; pMax.value=Number(p.max||0);
      const saveB=el('button','btn small'); saveB.textContent='MAJ';
      const del=el('button','btn small danger'); del.textContent='Supprimer';
      saveB.onclick=()=>{
        base[k]={ start:N(bStart.value), max:N(bMax.value) };
        perLevel[k]={ start:N(pStart.value), max:N(pMax.value) };
        if(base[k].start>base[k].max) base[k].start=base[k].max;
        onChange(); render();
      };
      del.onclick=()=>{ delete base[k]; delete perLevel[k]; onChange(); render(); };
      const hint=el('div','muted small'); hint.textContent='start/max · +start/+max par niv';
      row.appendChild(lbl); row.appendChild(hint); row.appendChild(bStart); row.appendChild(bMax); row.appendChild(pStart); row.appendChild(pMax); row.appendChild(saveB); row.appendChild(del);
      list.appendChild(row);
    });
  }
  const form = el('div','list-item row'); form.style.flexWrap='wrap'; form.style.gap='6px';
  const chooser = makeKeyChooser(resCatalog, 'ressource');
  const bStart=el('input','input'); bStart.type='number'; bStart.placeholder='start';
  const bMax=el('input','input'); bMax.type='number'; bMax.placeholder='max';
  const pStart=el('input','input'); pStart.type='number'; pStart.placeholder='+start/niv';
  const pMax=el('input','input'); pMax.type='number'; pMax.placeholder='+max/niv';
  const addB=el('button','btn small'); addB.textContent='Ajouter/Mettre à jour';
  const clrB=el('button','btn small secondary'); clrB.textContent='Vider';
  addB.onclick=()=>{
    const k=chooser.get(); if(!k) return;
    base[k]={ start:N(bStart.value), max:N(bMax.value) };
    perLevel[k]={ start:N(pStart.value), max:N(pMax.value) };
    if(base[k].start>base[k].max) base[k].start=base[k].max;
    onChange(); render();
  };
  clrB.onclick=()=>{ Object.keys(base).forEach(k=> delete base[k]); Object.keys(perLevel).forEach(k=> delete perLevel[k]); onChange(); render(); };
  acc.body.appendChild(form);
  form.appendChild(chooser.wrap); form.appendChild(bStart); form.appendChild(bMax); form.appendChild(pStart); form.appendChild(pMax); form.appendChild(addB); form.appendChild(clrB);
  render();
  return box;
}

/* ====================== Catalogue ====================== */
function modelAccordion(S, t){
  const card = el('div','panel');
  const p = calcPreviewFromTemplate(t, t.level||1, S);
  const acc = pAccordion(t.id||t.name||Math.random(), `${t.name} · Lvl ${p.level} · ${t.group||'—'}`, false);
  card.appendChild(acc.wrap);

  const head = el('div','list-item row'); head.style.gap='8px'; head.style.flexWrap='wrap';
  const nameI=el('input','input'); nameI.value=t.name||''; nameI.placeholder='Nom'; nameI.style.width='140px';
  nameI.onchange=()=>{ t.name=nameI.value||'Modèle'; save(S); refreshTitle(); };
  const lvlI=el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value=t.level||1; lvlI.style.width='64px';
  lvlI.onchange=()=>{ t.level=Math.max(1,Math.floor(+lvlI.value||1)); save(S); refreshTitle(); };
  const groupSel = makeKeyChooser([...new Set([...(S.enemyGroups||[]), ...(t.group?[t.group]:[])])], 'groupe');
  if(t.group) groupSel.set(t.group);
  const setGroupBtn=el('button','btn small'); setGroupBtn.textContent='Définir groupe';
  setGroupBtn.onclick=()=>{ const g=groupSel.get(); t.group=g||''; save(S); refreshTitle(); };
  head.appendChild(nameI); head.appendChild(lvlI); head.appendChild(groupSel.wrap); head.appendChild(setGroupBtn);
  acc.body.appendChild(head);

  const inh = el('div','list-item row'); inh.style.gap='10px'; inh.style.flexWrap='wrap';
  const races = S.races||[]; const tribes=S.tribes||[]; const classes=S.classes||[];
  const uR = el('input'); uR.type='checkbox'; uR.checked=(t.useRace===undefined ? !!t.raceId : !!t.useRace);
  const sR = el('select','input'); races.forEach(r=>{ const o=el('option'); o.value=r.id||r.name; o.textContent=r.name||r.id; sR.appendChild(o); });
  if(uR.checked && !t.raceId && sR.options.length) t.raceId = sR.options[0].value;
  sR.value=t.raceId||sR.value||'';
  uR.onchange=()=>{ t.useRace=uR.checked; if(uR.checked && !t.raceId && sR.options.length) t.raceId=sR.options[0].value; save(S); refreshTitle(); };
  sR.onchange=()=>{ t.raceId=sR.value; t.useRace=true; save(S); refreshTitle(); };

  const uT = el('input'); uT.type='checkbox'; uT.checked=(t.useTribe===undefined ? !!t.tribeId : !!t.useTribe);
  const sT = el('select','input'); tribes.forEach(r=>{ const o=el('option'); o.value=r.id||r.name; o.textContent=r.name||r.id; sT.appendChild(o); });
  if(uT.checked && !t.tribeId && sT.options.length) t.tribeId = sT.options[0].value;
  sT.value=t.tribeId||sT.value||'';
  uT.onchange=()=>{ t.useTribe=uT.checked; if(uT.checked && !t.tribeId && sT.options.length) t.tribeId=sT.options[0].value; save(S); refreshTitle(); };
  sT.onchange=()=>{ t.tribeId=sT.value; t.useTribe=true; save(S); refreshTitle(); };

  const uC = el('input'); uC.type='checkbox'; uC.checked=(t.useClass===undefined ? !!t.classId : !!t.useClass);
  const sC = el('select','input'); classes.forEach(r=>{ const o=el('option'); o.value=r.id||r.name; o.textContent=r.name||r.id; sC.appendChild(o); });
  if(uC.checked && !t.classId && sC.options.length) t.classId=sC.options[0].value;
  sC.value=t.classId||sC.value||'';
  uC.onchange=()=>{ t.useClass=uC.checked; if(uC.checked && !t.classId && sC.options.length) t.classId=sC.options[0].value; save(S); refreshTitle(); };
  sC.onchange=()=>{ t.classId=sC.value; t.useClass=true; save(S); refreshTitle(); };

  const labR=el('label','small'); labR.appendChild(uR); labR.appendChild(document.createTextNode(' Race ')); labR.appendChild(sR);
  const labT=el('label','small'); labT.appendChild(uT); labT.appendChild(document.createTextNode(' Tribu ')); labT.appendChild(sT);
  const labC=el('label','small'); labC.appendChild(uC); labC.appendChild(document.createTextNode(' Classe ')); labC.appendChild(sC);
  inh.appendChild(labR); inh.appendChild(labT); inh.appendChild(labC);
  acc.body.appendChild(inh);

  // DEFAULT: Disposition + computed Attitude (no manual select)
  const def = el('div','list-item row'); def.style.gap='10px'; def.style.flexWrap='wrap';
  const lbl1 = el('label','small'); lbl1.textContent='Disposition par défaut';
  const dispI = el('input','input'); dispI.type='number'; dispI.value = Number.isFinite(+t.defaultDisposition) ? t.defaultDisposition : 0;
  dispI.placeholder='Disposition par défaut';
  const stanceView = el('div','muted small'); // read-only computed attitude
  function updateStanceView(){ stanceView.textContent = `Attitude: ${stanceFromDisposition(dispI.value, S)}`; }
  updateStanceView();
  dispI.oninput=()=>{ updateStanceView(); };
  dispI.onchange=()=>{
    const v = Number.isFinite(+dispI.value) ? +dispI.value : 0;
    t.defaultDisposition = v;
    // Auto-propagate to already deployed of this template
    let touched=false;
    (S.enemies||[]).forEach(a=>{
      if(a.templateId===t.id){
        a.disposition = v;
        a.stance = stanceFromDisposition(v, S);
        touched=true;
      }
    });
    save(S);
    if(touched) emitState();
    refreshTitle();
  };
  def.appendChild(lbl1); def.appendChild(dispI); def.appendChild(stanceView);
  acc.body.appendChild(def);

  const editors = el('div'); editors.style.display='grid'; editors.style.gridTemplateColumns='repeat(auto-fit,minmax(320px,1fr))'; editors.style.gap='8px';
  const statsBox = statsGroupEditor(t.stats || (t.stats={}), t.statsPerLevel || (t.statsPerLevel={}), ()=>{ save(S); refreshTitle(); }, getStatsCatalog(S));
  const catsBox  = catsGroupEditor(t.cats || (t.cats={}), t.catsPerLevel || (t.catsPerLevel={}), ()=>{ save(S); refreshTitle(); }, getCatsCatalog(S));
  const resBox   = resGroupEditor(t.resources || (t.resources={}), t.resourcesPerLevel || (t.resourcesPerLevel={}), ()=>{ save(S); refreshTitle(); }, getResCatalog(S));
  editors.appendChild(statsBox); editors.appendChild(catsBox); editors.appendChild(resBox);
  acc.body.appendChild(editors);

  const dbg = el('div','list-item small muted');
  function renderDbg(){
    const lvl = t.level||1;
    const Lm1=(lvl-1);
    const lines=[];
    const push=(label, ent)=>{
      if(!ent) return;
      const ex=extractBaseAndPerLevel(ent);
      const stats={}, cats={}, res={};
      applyExtract(stats,cats,res,ex,Lm1);
      const sK=Object.entries(stats).map(([k,v])=>`${k}:${v}`).slice(0,5).join(', ');
      const cK=Object.entries(cats).map(([k,v])=>`${k}:${v}`).slice(0,5).join(', ');
      const rK=Object.entries(res).map(([k,v])=>`${k}:${v.max}${v.start?'/'+v.start:''}`).slice(0,3).join(', ');
      lines.push(`${label} → ${sK||'—'} | ${cK||'—'} | ${rK||'—'}`);
    };
    push('Race',   findByIdOrName(S.races||[], t.raceId));
    push('Tribu',  findByIdOrName(S.tribes||[], t.tribeId));
    push('Classe', findByIdOrName(S.classes||[], t.classId));
    dbg.textContent = lines.join('  ·  ') || '(héritage: aucun)';
  }
  acc.body.appendChild(dbg);
  function refreshTitle(){
    const p2 = calcPreviewFromTemplate(t, t.level||1, S);
    acc.head.innerHTML = `<div><b>${t.name}</b> · Lvl ${p2.level} · <span class="muted">${t.group||'—'}</span></div>`;
    renderDbg();
    updateStanceView();
  }
  // Update stance view when system attitudes change
  const onState = ()=> updateStanceView();
  window.addEventListener('ttrpg:state', onState);

  refreshTitle();
  return card;
}

function renderGroupsManager(S){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Groupes</b></div></div>';
  const list = el('div','list'); box.appendChild(list);
  const form = el('div','list-item row'); form.style.gap='8px'; form.style.flexWrap='wrap';
  const nameI=el('input','input'); nameI.placeholder='Nom du groupe';
  const addB=el('button','btn'); addB.textContent='Ajouter';
  form.appendChild(nameI); form.appendChild(addB);
  box.appendChild(form);
  function render(){
    list.innerHTML='';
    (S.enemyGroups||[]).forEach((g,idx)=>{
      const row=el('div','list-item small row');
      const txt=el('div'); txt.textContent=g;
      const del=el('button','btn small danger'); del.textContent='Supprimer';
      del.onclick=()=>{ S.enemyGroups.splice(idx,1); save(S); };
      row.appendChild(txt); row.appendChild(del);
      list.appendChild(row);
    });
  }
  addB.onclick=()=>{
    const g=(nameI.value||'').trim(); if(!g) return;
    if(!(S.enemyGroups||[]).includes(g)) S.enemyGroups.push(g);
    nameI.value=''; save(S);
  };
  render();
  window.addEventListener('ttrpg:state', render);
  return box;
}

function panelCatalogue(S){
  const container = el('div');
  const creation = el('div','panel');
  creation.innerHTML = '<div class="list-item"><div><b>Créer un modèle</b></div></div>';
  const cBar = el('div','list-item row'); cBar.style.gap='8px'; cBar.style.flexWrap='wrap';
  const nameI = el('input','input'); nameI.placeholder='Nom du modèle';
  const lvlI = el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value='1';
  const groupChooser = makeKeyChooser(S.enemyGroups||[], 'groupe');
  const addB = el('button','btn'); addB.textContent='Créer';
  cBar.appendChild(nameI); cBar.appendChild(lvlI); cBar.appendChild(groupChooser.wrap); cBar.appendChild(addB);
  creation.appendChild(cBar);
  addB.onclick = ()=>{
    const nm=(nameI.value||'').trim()||'Modèle';
    const lvl=Math.max(1,Math.floor(+lvlI.value||1));
    const grp=groupChooser.get()||'';
    S.enemiesTemplates.push({
      id:'tpl_'+Math.random().toString(36).slice(2,9),
      name:nm, level:lvl, group:grp,
      defaultDisposition:0,
      stats:{}, cats:{}, resources:{},
      statsPerLevel:{}, catsPerLevel:{}, resourcesPerLevel:{},
      useRace:undefined, raceId:'', useTribe:undefined, tribeId:'', useClass:undefined, classId:'',
      loot:[], tags:[]
    });
    save(S);
  };
  const tools = el('div','panel');
  tools.innerHTML = '<div class="list-item"><div><b>Modèles existants</b></div></div>';
  const tBar = el('div','list-item row'); tBar.style.gap='8px'; tBar.style.flexWrap='wrap';
  const searchI = el('input','input'); searchI.placeholder='Rechercher (nom)…';
  const groupF = (function(){ const ch=makeKeyChooser(['(Tous)', ...(S.enemyGroups||[])],'groupe'); ch.set('(Tous)'); return ch; })();
  tBar.appendChild(searchI); tBar.appendChild(groupF.wrap);
  tools.appendChild(tBar);
  const list = el('div'); tools.appendChild(list);
  function renderList(){
    list.innerHTML='';
    const q=(searchI.value||'').toLowerCase();
    const g=groupF.get();
    (S.enemiesTemplates||[])
      .filter(t=> !q || (t.name||'').toLowerCase().includes(q))
      .filter(t=> !g || g==='(Tous)' || (t.group||'')===g)
      .forEach(t=> list.appendChild(modelAccordion(S,t)));
  }
  searchI.addEventListener('input', renderList);
  const grid = el('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='1fr minmax(260px, 360px)'; grid.style.gap='10px';
  const left = el('div'); left.appendChild(tools);
  const right = el('div'); right.appendChild(renderGroupsManager(S));
  grid.appendChild(left); grid.appendChild(right);
  container.appendChild(creation); container.appendChild(grid);
  renderList();
  window.addEventListener('ttrpg:state', renderList);
  return container;
}

/* ====================== Déployés ====================== */
function instantiateFromTemplate(tpl, level, S){
  const p = calcPreviewFromTemplate(tpl, level, S);
  const disp = Number.isFinite(+tpl.defaultDisposition) ? +tpl.defaultDisposition : 0;
  const stance = stanceFromDisposition(disp, S);
  return {
    id:'act_'+Math.random().toString(36).slice(2,9),
    templateId: tpl.id,
    name: tpl.name,
    level: p.level,
    group: tpl.group||'',
    stance, disposition:disp,
    stats: p.stats, cats: p.cats, resources: p.resources,
    localMods:{ add:{}, mult:{}, override:{} },
    effects:[],
    notes:''
  };
}

const OPEN_DETAILS = new Set();
function editorLocalMods(S, a){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Modifs locales</b> <span class="muted small">(add → mult → override)</span></div></div>';
  const list = el('div','list'); box.appendChild(list);
  function render(){
    list.innerHTML='';
    ['add','mult','override'].forEach(kind=>{
      const src = (a.localMods && a.localMods[kind]) || {};
      const row = el('div','list-item small');
      const keys = Object.keys(src);
      row.innerHTML = `<div><b>${kind}</b> : ${keys.length? keys.map(k=>`${k}=${src[k]}`).join(', ') : '<span class="muted">(vide)</span>'}</div>`;
      list.appendChild(row);
    });
  }
  const form = el('div','list-item row');
  const sel=el('select','input'); ['add','mult','override'].forEach(k=>{ const o=el('option'); o.value=k; o.textContent=k; sel.appendChild(o);} );
  const kI=el('input','input'); kI.placeholder='stat (ex: STR)';
  const vI=el('input','input'); vI.placeholder='valeur (ex: 2 / 1.5 / 42)';
  const addB=el('button','btn small'); addB.textContent='Appliquer';
  const clrB=el('button','btn small secondary'); clrB.textContent='Réinitialiser';
  addB.onclick=()=>{ const k=(kI.value||'').trim(); if(!k) return; const v=Number(vI.value); a.localMods=a.localMods||{add:{},mult:{},override:{}}; a.localMods[sel.value][k]=v; save(S); };
  clrB.onclick=()=>{ a.localMods={add:{}, mult:{}, override:{}}; save(S); };
  form.appendChild(sel); form.appendChild(kI); form.appendChild(vI); form.appendChild(addB); form.appendChild(clrB);
  box.appendChild(form);
  render();
  window.addEventListener('ttrpg:state', render);
  return box;
}

function editorEffects(S, a){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Effets</b> <span class="muted small">(stackables, durées en tours)</span></div></div>';
  const list = el('div','list'); box.appendChild(list);
  function render(){
    list.innerHTML='';
    (a.effects||[]).forEach((e,idx)=>{
      const r = el('div','list-item small row');
      const chk=el('input'); chk.type='checkbox'; chk.checked=(e.active!==false);
      chk.onchange=()=>{ e.active=chk.checked; save(S); };
      const name=el('input','input'); name.value=e.name||''; name.placeholder='Nom'; name.onchange=()=>{ e.name=name.value||''; save(S); };
      const dur=el('input','input'); dur.type='number'; dur.min='0'; dur.value=Number.isFinite(+e.duration)? e.duration : 0; dur.onchange=()=>{ e.duration=Math.max(0,Math.floor(+dur.value||0)); save(S); };
      const del=el('button','btn small danger'); del.textContent='Suppr'; del.onclick=()=>{ a.effects.splice(idx,1); save(S); };
      const view=el('div','muted small'); view.textContent=summarizeEffect(e);
      r.appendChild(chk); r.appendChild(name); r.appendChild(dur); r.appendChild(del); r.appendChild(view);
      list.appendChild(r);
    });
  }
  const form = el('div','list-item row');
  const nameI=el('input','input'); nameI.placeholder='Nom';
  const kind=el('select','input'); ['add','mult','override'].forEach(k=>{ const o=el('option'); o.value=k; o.textContent=k; kind.appendChild(o);} );
  const kI=el('input','input'); kI.placeholder='stat';
  const vI=el('input','input'); vI.placeholder='valeur';
  const durI=el('input','input'); durI.type='number'; durI.min='0'; durI.value='0';
  const addB=el('button','btn small'); addB.textContent='Ajouter';
  addB.onclick=()=>{
    const e = { name:nameI.value||'', active:true };
    if(kind.value==='add') e.add={ [kI.value.trim()]: N(vI.value) };
    else if(kind.value==='mult') e.mult={ [kI.value.trim()]: Number(vI.value)||1 };
    else e.override={ [kI.value.trim()]: Number(vI.value) };
    e.duration = Math.max(0, Math.floor(+durI.value||0));
    a.effects=a.effects||[]; a.effects.push(e); save(S);
  };
  form.appendChild(nameI); form.appendChild(kind); form.appendChild(kI); form.appendChild(vI); form.appendChild(durI); form.appendChild(addB);
  box.appendChild(form);
  render();
  window.addEventListener('ttrpg:state', render);
  return box;
  function summarizeEffect(e){
    const parts=[];
    if(e.add) parts.push('add:'+Object.keys(e.add).map(k=>`${k}+${e.add[k]}`).join(','));
    if(e.mult) parts.push('mult:'+Object.keys(e.mult).map(k=>`${k}×${e.mult[k]}`).join(','));
    if(e.override) parts.push('override:'+Object.keys(e.override).map(k=>`${k}=${e.override[k]}`).join(','));
    if(Number.isFinite(+e.duration)) parts.push(`${e.duration}t`);
    return parts.length? parts.join(' | ') : '(vide)';
  }
}

function actorDetails(S, a){
  const wrap = el('div','panel');
  const head = el('div','list-item row'); head.style.gap='8px';
  const disp = el('div'); disp.textContent = `Disposition: ${a.disposition??0}`;
  const minus = el('button','btn small'); minus.textContent='-5';
  const plus  = el('button','btn small'); plus.textContent='+5';
  const stance = el('div','muted small'); stance.textContent=`Attitude: ${a.stance||'neutre'}`;
  const lvlP = el('button','btn small'); lvlP.textContent='+Lvl';
  const lvlM = el('button','btn small'); lvlM.textContent='-Lvl';
  head.appendChild(disp); head.appendChild(minus); head.appendChild(plus); head.appendChild(stance); head.appendChild(lvlP); head.appendChild(lvlM);
  wrap.appendChild(head);
  function updDisp(d){ a.disposition = Number(a.disposition||0)+d; a.stance = stanceFromDisposition(a.disposition, S); save(S); }
  minus.onclick=()=>updDisp(-5); plus.onclick=()=>updDisp(+5);
  lvlP.onclick=()=>{ a.level=(a.level||1)+1; save(S); };
  lvlM.onclick=()=>{ a.level=Math.max(1,(a.level||1)-1); save(S); };
  const statsBox = el('div','panel'); statsBox.innerHTML='<div class="list-item"><div><b>Caractéristiques</b></div></div>'; const statsList=el('div','list'); statsBox.appendChild(statsList);
  const catsBox = el('div','panel'); catsBox.innerHTML='<div class="list-item"><div><b>Catégories</b></div></div>'; const catsList=el('div','list'); catsBox.appendChild(catsList);
  const resBox = el('div','panel'); resBox.innerHTML='<div class="list-item"><div><b>Ressources</b></div></div>'; const resList=el('div','list'); resBox.appendChild(resList);
  wrap.appendChild(statsBox); wrap.appendChild(catsBox); wrap.appendChild(resBox); wrap.appendChild(editorLocalMods(S,a)); wrap.appendChild(editorEffects(S,a));
  function renderAll(){
    disp.textContent = `Disposition: ${a.disposition??0}`;
    stance.textContent=`Attitude: ${a.stance||'neutre'}`;
    const e2=getActorEffectiveSnapshot(a,S);
    statsList.innerHTML='';
    const sk=Object.keys(e2.stats||{}).sort();
    if(sk.length===0){ const x=el('div','list-item small muted'); x.textContent='(aucune)'; statsList.appendChild(x); }
    else sk.forEach(k=>{ const r=el('div','list-item small'); r.innerHTML=`<div><b>${k}</b> : ${e2.stats[k]}</div>`; statsList.appendChild(r); });
    catsList.innerHTML='';
    const ck=Object.keys(e2.cats||{}).sort();
    if(ck.length===0){ const x=el('div','list-item small muted'); x.textContent='(aucune)'; catsList.appendChild(x); }
    else ck.forEach(k=>{ const r=el('div','list-item small'); r.innerHTML=`<div><b>${k}</b> : ${e2.cats[k]}</div>`; catsList.appendChild(r); });
    resList.innerHTML='';
    const rk=Object.keys(e2.resources||{}).sort();
    if(rk.length===0){ const x=el('div','list-item small muted'); x.textContent='(aucune)'; resList.appendChild(x); }
    else rk.forEach(k=>{ const v=e2.resources[k]||{max:0,start:0}; const r=el('div','list-item small'); r.innerHTML=`<div><b>${k}</b> : ${v.start||0} / ${v.max||0}</div>`; resList.appendChild(r); });
  }
  renderAll();
  window.addEventListener('ttrpg:state', renderAll);
  return wrap;
}

function actorRow(S, a){
  const row = el('div','list-item small'); row.style.flexDirection='column';
  const top = el('div'); top.style.display='flex'; top.style.justifyContent='space-between'; top.style.gap='8px'; top.style.alignItems='center';
  const left = el('div');
  const eff = getActorEffectiveSnapshot(a,S);
  left.innerHTML = `<b>${a.name}</b> · Lvl ${a.level||1} · <span class="muted">${a.group||'—'}</span>
  <span class="muted"> | ${Object.keys(eff.stats||{}).slice(0,3).map(k=>`${k}:${eff.stats[k]}`).join(' · ')}</span>`;
  const btns = el('div');
  const bDetails = el('button','btn small'); bDetails.textContent='Détails';
  const bDup = el('button','btn small'); bDup.textContent='Dupliquer';
  const bDel = el('button','btn small danger'); bDel.textContent='Supprimer';
  btns.appendChild(bDetails); btns.appendChild(bDup); btns.appendChild(bDel);
  top.appendChild(left); top.appendChild(btns);
  row.appendChild(top);
  const details = actorDetails(S,a); details.style.display='none'; details.style.marginTop='6px'; row.appendChild(details);
  function setOpen(v){
    if(v){ details.style.display='block'; OPEN_DETAILS.add(a.id); }
    else { details.style.display='none'; OPEN_DETAILS.delete(a.id); }
  }
  if(OPEN_DETAILS.has(a.id)) setOpen(true);
  bDetails.onclick=()=> setOpen(details.style.display==='none');
  bDup.onclick=()=>{ const c=deepClone(a); c.id='act_'+Math.random().toString(36).slice(2,9); (S.enemies||[]).push(c); save(S); };
  bDel.onclick=()=>{ const i=(S.enemies||[]).findIndex(x=>x.id===a.id); if(i>=0){ S.enemies.splice(i,1); save(S); OPEN_DETAILS.delete(a.id);} };
  return row;
}

function panelDeployed(S){
  const box = el('div');
  const controls = el('div','list-item row'); controls.style.gap='8px'; controls.style.flexWrap='wrap';
  const sel = el('select','input');
  (S.enemiesTemplates||[]).forEach(t=>{ const o=el('option'); o.value=t.id; o.textContent=t.name; sel.appendChild(o); });
  const lvlI = el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value='1';
  const qtyI = el('input','input'); qtyI.type='number'; qtyI.min='1'; qtyI.value='1';
  const deployB = el('button','btn'); deployB.textContent='Déployer';
  controls.appendChild(sel); controls.appendChild(lvlI); controls.appendChild(qtyI); controls.appendChild(deployB);

  const list = el('div');
  function renderList(){
    list.innerHTML=''; (S.enemies||[]).forEach(a=> list.appendChild(actorRow(S,a)));
  }
  deployB.onclick=()=>{
    const tpl=(S.enemiesTemplates||[]).find(t=> t.id===sel.value);
    if(!tpl){ alert('Aucun modèle sélectionné.'); return; }
    const qty=Math.max(1,Math.floor(+qtyI.value||1));
    const lvl=Math.max(1,Math.floor(+lvlI.value||1));
    for(let i=0;i<qty;i++) S.enemies.push(instantiateFromTemplate(tpl,lvl,S));
    save(S);
  };

  const acc = accordion('Déployés (live, toggles préservés)', true);
  acc.body.appendChild(controls); acc.body.appendChild(list);
  box.appendChild(acc.wrap);
  renderList();
  window.addEventListener('ttrpg:state', renderList);
  return box;
}

/* ====================== Auto propagation ====================== */
let __ATT_SIG = null;
function attitudesSignature(S){
  const list = Array.isArray(S.attitudes)? S.attitudes.map(a=>({n:(a.name||a.label||a.id||''), min:(a.min==null? null:N(a.min)), max:(a.max==null? null:N(a.max))})) : [];
  list.sort((x,y)=> (x.min==null?-Infinity:x.min) - (y.min==null?-Infinity:y.min) || (x.n>y.n?1:-1));
  return JSON.stringify(list);
}
function maybeAutoPropagateAttitudes(S){
  const sig = attitudesSignature(S);
  if(sig === __ATT_SIG) return;
  __ATT_SIG = sig;
  let changed = false;
  (S.enemies||[]).forEach(a=>{
    const wanted = stanceFromDisposition(a.disposition||0, S);
    if(a.stance !== wanted){ a.stance = wanted; changed = true; }
  });
  if(changed) save(S);
}

/* ====================== Sub-tabs & Root ====================== */
function subTabs(container, defs, defaultId){
  const head = el('div','tabs');
  const body = el('div');
  defs.forEach(d=>{
    const b=el('button','tab'); b.textContent=d.label; b.dataset.id=d.id;
    b.addEventListener('click',()=> activate(d.id));
    head.appendChild(b);
  });
  container.appendChild(head); container.appendChild(body);
  function activate(id){
    Array.from(head.children).forEach(b=> b.classList.toggle('active', b.dataset.id===id));
    body.innerHTML='';
    const d=defs.find(x=>x.id===id);
    try{ body.appendChild(d.node()); }
    catch(e){ console.error('Bestiaire panel error', e); const x=el('div','panel'); x.innerHTML='<div class="list-item"><div><b>Erreur de rendu</b></div></div>'; body.appendChild(x); }
  }
  activate(defaultId);
}

export function renderAdminBestiaire(S){
  ensureSchema(S);
  const root = el('div');
  subTabs(root, [
    { id:'catalogue', label:'Catalogue', node: ()=> panelCatalogue(S) },
    { id:'deployed',  label:'Déployés',  node: ()=> panelDeployed(S) }
  ], 'catalogue');
  __ATT_SIG = attitudesSignature(S);
  const onState = ()=> maybeAutoPropagateAttitudes(S);
  window.addEventListener('ttrpg:state', onState);
  // Run once now
  maybeAutoPropagateAttitudes(S);
  return root;
}
export default renderAdminBestiaire;
if(typeof window!=='undefined') window.renderAdminBestiaire = (S)=>renderAdminBestiaire(S);
