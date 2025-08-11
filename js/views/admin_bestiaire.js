// TTRPG/js/views/admin_bestiaire.js — Build 9
// Focus: branch catalogs to *actual* state.js shapes + robust inheritance.
// - Stats catalog: prefers S.settings.characteristics if exists; otherwise union of keys
//   found in Races/Tribes/Classes/Items/Effects (mods.stats + common aliases).
// - Categories catalog: prefers S.settings.categories; fallback: union of mods.cats seen.
// - Resources catalog: prefers S.resources (array/objs); fallback: union of mods.resources keys.
// - Inheritance: supports {stats,cats,resources} and {mods.{...}} plus *PerLevel variants.
// - UI unchanged (grouped editors, groups, split Création/Modèles).

/* ====================== Utils ====================== */
const el = (t, cls) => { const n=document.createElement(t); if(cls) n.className=cls; return n; };
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const N=v=>{ const n=Number(v); return Number.isFinite(n)?n:0; };
const deepClone = (o)=> JSON.parse(JSON.stringify(o||{}));
const save = (S)=> (window.State && typeof window.State.save==='function') ? window.State.save(S) : void 0;
const stanceFromDisposition=(d,thr)=> d>=thr.friendly?'amical':(d<=thr.hostile?'hostile':'neutre');

function ensureSchema(S){
  if(!Array.isArray(S.enemiesTemplates)) S.enemiesTemplates=[];
  if(!Array.isArray(S.enemies)) S.enemies=[];
  if(!Array.isArray(S.enemyGroups)) S.enemyGroups=[];
  if(!S.attitudeThresholds || typeof S.attitudeThresholds!=='object'){
    S.attitudeThresholds = { friendly:30, hostile:-30 };
  }
  if(!S.combat || typeof S.combat!=='object'){
    S.combat = { active:false, round:1, turnIndex:0, order:[] };
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
const uniq = a => Array.from(new Set(a));
const sort = a => a.slice().sort((x,y)=> String(x).localeCompare(String(y), 'fr'));

function unionStatKeysFromArray(arr){
  const out=[];
  (arr||[]).forEach(o=>{
    if(!o||typeof o!=='object') return;
    [o.stats, o.characteristics, o.baseStats, o.attrs, o?.mods?.stats, o?.bonus?.stats].forEach(s=>{
      if(s && typeof s==='object') out.push(...Object.keys(s));
    });
  });
  return out;
}
function unionCatKeysFromArray(arr){
  const out=[];
  (arr||[]).forEach(o=>{
    if(!o||typeof o!=='object') return;
    [o.cats, o.categories, o?.mods?.cats].forEach(s=>{ if(s && typeof s==='object') out.push(...Object.keys(s)); });
  });
  return out;
}
function unionResKeysFromArray(arr){
  const out=[];
  (arr||[]).forEach(o=>{
    if(!o||typeof o!=='object') return;
    [o.resources, o.res, o.pools, o?.mods?.resources].forEach(r=>{
      if(r && typeof r==='object') out.push(...Object.keys(r));
    });
  });
  return out;
}

function getStatsCatalog(S){
  // Prefer a dedicated list if present
  const direct = asKeyList(S?.settings?.characteristics);
  if(direct.length) return sort(uniq(direct));

  // Else derive from data actually defined in modules (races/tribes/classes/items/effects)
  const keys = [
    ...unionStatKeysFromArray(S.races),
    ...unionStatKeysFromArray(S.tribes),
    ...unionStatKeysFromArray(S.classes),
    ...unionStatKeysFromArray(S.items),
    ...(S.effects||[]).flatMap(e => Object.keys(e?.mods?.stats||{}))
  ];
  return sort(uniq(keys));
}
function getCatsCatalog(S){
  const direct = asKeyList(S?.settings?.categories);
  if(direct.length) return sort(uniq(direct));

  const keys = [
    ...unionCatKeysFromArray(S.races),
    ...unionCatKeysFromArray(S.tribes),
    ...unionCatKeysFromArray(S.classes),
    ...unionCatKeysFromArray(S.items),
    ...(S.effects||[]).flatMap(e => Object.keys(e?.mods?.cats||{}))
  ];
  return sort(uniq(keys));
}
function getResCatalog(S){
  const direct = asKeyList(S?.resources);
  if(direct.length) return sort(uniq(direct));

  const keys = [
    ...unionResKeysFromArray(S.races),
    ...unionResKeysFromArray(S.tribes),
    ...unionResKeysFromArray(S.classes),
    ...unionResKeysFromArray(S.items),
    ...(S.effects||[]).flatMap(e => Object.keys(e?.mods?.resources||{}))
  ];
  return sort(uniq(keys));
}

/* ====================== Inheritance helpers ====================== */
function findByIdOrName(arr,id){
  if(!arr) return null;
  const sid = String(id||'');
  return arr.find(x=> String(x?.id||'')===sid) || arr.find(x=> String(x?.name||'')===sid) || null;
}
function extractBaseAndPerLevel(src){
  const r = { stats:{}, statsPerLevel:{}, cats:{}, catsPerLevel:{}, res:{}, resPerLevel:{} };
  if(!src || typeof src!=='object') return r;

  // Accept a wide set of shapes
  const candStats   = [src.stats, src.characteristics, src.baseStats, src.attrs, src?.mods?.stats];
  const candStatsPL = [src.statsPerLevel, src.perLevelStats, src.statsLvl, src.levelStats, src.stats_per_level, src?.modsPerLevel?.stats, src?.mods?.statsPerLevel];
  const candCats    = [src.cats, src.categories, src?.mods?.cats];
  const candCatsPL  = [src.catsPerLevel, src.categoriesPerLevel, src?.modsPerLevel?.cats, src?.mods?.catsPerLevel];
  const candRes     = [src.resources, src.res, src.pools, src?.mods?.resources];
  const candResPL   = [src.resourcesPerLevel, src.resPerLevel, src?.modsPerLevel?.resources, src?.mods?.resourcesPerLevel];

  candStats.forEach(o=>{ if(o && typeof o==='object') Object.keys(o).forEach(k=> r.stats[k]=N(o[k])); });
  candStatsPL.forEach(o=>{ if(o && typeof o==='object') Object.keys(o).forEach(k=> r.statsPerLevel[k]=N(o[k])); });
  candCats.forEach(o=>{ if(o && typeof o==='object') Object.keys(o).forEach(k=> r.cats[k]=N(o[k])); });
  candCatsPL.forEach(o=>{ if(o && typeof o==='object') Object.keys(o).forEach(k=> r.catsPerLevel[k]=N(o[k])); });
  candRes.forEach(o=>{ if(o && typeof o==='object') Object.keys(o).forEach(k=>{ const v=o[k]; r.res[k] = v&&typeof v==='object' ? {max:N(v.max),start:N(v.start)} : {max:N(v),start:0}; }); });
  candResPL.forEach(o=>{ if(o && typeof o==='object') Object.keys(o).forEach(k=>{ const v=o[k]; r.resPerLevel[k] = v&&typeof v==='object' ? {max:N(v.max),start:N(v.start)} : {max:N(v),start:0}; }); });
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
  if(tpl.useRace){
    const race = findByIdOrName(S.races||[], tpl.raceId);
    if(race){ const ex=extractBaseAndPerLevel(race); applyExtract(stats,cats,res,ex,Lm1); }
  }
  if(tpl.useTribe){
    const tribe = findByIdOrName(S.tribes||[], tpl.tribeId);
    if(tribe){ const ex=extractBaseAndPerLevel(tribe); applyExtract(stats,cats,res,ex,Lm1); }
  }
  if(tpl.useClass){
    const klass = findByIdOrName(S.classes||[], tpl.classId);
    if(klass){ const ex=extractBaseAndPerLevel(klass); applyExtract(stats,cats,res,ex,Lm1); }
  }
  return { level:lvl, stats, cats, resources:res };
}

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
function accordion(title, open=true){
  const wrap = el('div','panel');
  const head = el('div','list-item'); head.innerHTML = `<div><b>${title}</b></div>`;
  const body = el('div'); body.style.display = open? 'block':'none';
  head.style.cursor='pointer';
  head.addEventListener('click',()=>{ body.style.display = (body.style.display==='none'?'block':'none'); });
  wrap.append(head, body);
  return {wrap, body, head};
}

function makeKeyChooser(catalog=[], placeholder='clé'){
  const wrap = el('div','row'); wrap.style.gap='6px'; wrap.style.flexWrap='wrap';
  const sel = el('select','input');
  (catalog||[]).slice().sort().forEach(k=>{ const o=el('option'); o.value=k; o.textContent=k; sel.append(o); });
  wrap.append(sel);
  return { wrap, get(){ return sel.value; }, set(v){ sel.value=v; } };
}

/* ===== Grouped editors (base + par niveau) ===== */
function statsGroupEditor(base, perLevel, onChange, statsCatalog){
  const box = el('div','panel');
  const acc = accordion('Stats', true);
  box.append(acc.wrap);

  const list = el('div','list'); acc.body.append(list);

  function render(){
    list.innerHTML='';
    const keys = Array.from(new Set([...Object.keys(base||{}), ...Object.keys(perLevel||{})])).sort();
    if(keys.length===0){
      const x=el('div','list-item small muted'); x.textContent='(vide)'; list.append(x);
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
        row.append(lbl, el('div','muted small'), bI, pI, saveB, del);
        row.children[1].textContent='base / +par niv';
        list.append(row);
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
  acc.body.append(form);
  form.append(chooser.wrap, baseI, perI, addB, clrB);

  render();
  return box;
}

function catsGroupEditor(base, perLevel, onChange, catsCatalog){
  const box = el('div','panel');
  const acc = accordion('Catégories', false);
  box.append(acc.wrap);
  const list = el('div','list'); acc.body.append(list);

  function render(){
    list.innerHTML='';
    const keys = Array.from(new Set([...Object.keys(base||{}), ...Object.keys(perLevel||{})])).sort();
    if(keys.length===0){ const x=el('div','list-item small muted'); x.textContent='(vide)'; list.append(x); }
    else keys.forEach(k=>{
      const row=el('div','list-item small row'); row.style.gap='8px'; row.style.flexWrap='wrap';
      const lbl=el('div'); lbl.innerHTML=`<b>${k}</b>`;
      const bI=el('input','input'); bI.type='number'; bI.value=Number(base?.[k]||0);
      const pI=el('input','input'); pI.type='number'; pI.value=Number(perLevel?.[k]||0);
      const saveB=el('button','btn small'); saveB.textContent='MAJ';
      const del=el('button','btn small danger'); del.textContent='Supprimer';
      saveB.onclick=()=>{ base[k]=N(bI.value); perLevel[k]=N(pI.value); onChange(); render(); };
      del.onclick=()=>{ delete base[k]; delete perLevel[k]; onChange(); render(); };
      row.append(lbl, el('div','muted small'), bI, pI, saveB, del);
      row.children[1].textContent='base / +par niv';
      list.append(row);
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
  acc.body.append(form);
  form.append(chooser.wrap, baseI, perI, addB, clrB);

  render();
  return box;
}

function resGroupEditor(base, perLevel, onChange, resCatalog){
  const box = el('div','panel');
  const acc = accordion('Ressources', false);
  box.append(acc.wrap);
  const list = el('div','list'); acc.body.append(list);

  function render(){
    list.innerHTML='';
    const keys = Array.from(new Set([...Object.keys(base||{}), ...Object.keys(perLevel||{})])).sort();
    if(keys.length===0){ const x=el('div','list-item small muted'); x.textContent='(vide)'; list.append(x); }
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
      row.append(lbl, hint, bStart, bMax, pStart, pMax, saveB, del);
      list.append(row);
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
  acc.body.append(form);
  form.append(chooser.wrap,bStart,bMax,pStart,pMax,addB,clrB);

  render();
  return box;
}

/* ====================== Catalogue ====================== */
function modelAccordion(S, t){
  const card = el('div','panel');
  const p = calcPreviewFromTemplate(t, t.level||1, S);
  const acc = accordion(`${t.name} · Lvl ${p.level} · ${t.group||'—'}`, false);
  card.append(acc.wrap);

  // HEADER quick edit inside body
  const head = el('div','list-item row'); head.style.gap='8px'; head.style.flexWrap='wrap';
  const nameI=el('input','input'); nameI.value=t.name||''; nameI.placeholder='Nom'; nameI.style.width='140px';
  nameI.onchange=()=>{ t.name=nameI.value||'Modèle'; save(S); refreshTitle(); };
  const lvlI=el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value=t.level||1; lvlI.style.width='64px';
  lvlI.onchange=()=>{ t.level=Math.max(1,Math.floor(+lvlI.value||1)); save(S); refreshTitle(); };
  const groupSel = makeKeyChooser([...new Set([...(S.enemyGroups||[]), ...(t.group?[t.group]:[])])], 'groupe');
  if(t.group) groupSel.set(t.group);
  const setGroupBtn=el('button','btn small'); setGroupBtn.textContent='Définir groupe';
  setGroupBtn.onclick=()=>{ const g=groupSel.get(); t.group=g||''; save(S); refreshTitle(); };
  head.append(nameI,lvlI,groupSel.wrap,setGroupBtn);
  acc.body.append(head);

  // INHERITANCE toggles + selects
  const inh = el('div','list-item row'); inh.style.gap='10px'; inh.style.flexWrap='wrap';
  const races = S.races||[]; const tribes=S.tribes||[]; const classes=S.classes||[];
  const uR = el('input'); uR.type='checkbox'; uR.checked=!!t.useRace;
  const sR = el('select','input'); races.forEach(r=>{ const o=el('option'); o.value=r.id||r.name; o.textContent=r.name||r.id; sR.appendChild(o); });
  if(uR.checked && !t.raceId && sR.options.length) t.raceId = sR.options[0].value;
  sR.value=t.raceId||sR.value||'';
  uR.onchange=()=>{ t.useRace=uR.checked; if(uR.checked && !t.raceId && sR.options.length) t.raceId=sR.options[0].value; save(S); refreshTitle(); };
  sR.onchange=()=>{ t.raceId=sR.value; save(S); refreshTitle(); };

  const uT = el('input'); uT.type='checkbox'; uT.checked=!!t.useTribe;
  const sT = el('select','input'); tribes.forEach(r=>{ const o=el('option'); o.value=r.id||r.name; o.textContent=r.name||r.id; sT.appendChild(o); });
  if(uT.checked && !t.tribeId && sT.options.length) t.tribeId = sT.options[0].value;
  sT.value=t.tribeId||sT.value||'';
  uT.onchange=()=>{ t.useTribe=uT.checked; if(uT.checked && !t.tribeId && sT.options.length) t.tribeId=sT.options[0].value; save(S); refreshTitle(); };
  sT.onchange=()=>{ t.tribeId=sT.value; save(S); refreshTitle(); };

  const uC = el('input'); uC.type='checkbox'; uC.checked=!!t.useClass;
  const sC = el('select','input'); classes.forEach(r=>{ const o=el('option'); o.value=r.id||r.name; o.textContent=r.name||r.id; sC.appendChild(o); });
  if(uC.checked && !t.classId && sC.options.length) t.classId = sC.options[0].value;
  sC.value=t.classId||sC.value||'';
  uC.onchange=()=>{ t.useClass=uC.checked; if(uC.checked && !t.classId && sC.options.length) t.classId=sC.options[0].value; save(S); refreshTitle(); };
  sC.onchange=()=>{ t.classId=sC.value; save(S); refreshTitle(); };

  const labR=el('label','small'); labR.append(uR, document.createTextNode(' Race '), sR);
  const labT=el('label','small'); labT.append(uT, document.createTextNode(' Tribu '), sT);
  const labC=el('label','small'); labC.append(uC, document.createTextNode(' Classe '), sC);
  inh.append(labR,labT,labC);
  acc.body.append(inh);

  // GROUPED EDITORS
  const editors = el('div'); editors.style.display='grid'; editors.style.gridTemplateColumns='repeat(auto-fit,minmax(320px,1fr))'; editors.style.gap='8px';
  const statsBox = statsGroupEditor(t.stats || (t.stats={}), t.statsPerLevel || (t.statsPerLevel={}), ()=>{ save(S); refreshTitle(); }, getStatsCatalog(S));
  const catsBox  = catsGroupEditor(t.cats || (t.cats={}), t.catsPerLevel || (t.catsPerLevel={}), ()=>{ save(S); refreshTitle(); }, getCatsCatalog(S));
  const resBox   = resGroupEditor(t.resources || (t.resources={}), t.resourcesPerLevel || (t.resourcesPerLevel={}), ()=>{ save(S); refreshTitle(); }, getResCatalog(S));
  editors.append(statsBox, catsBox, resBox);
  acc.body.append(editors);

  function refreshTitle(){
    const p2 = calcPreviewFromTemplate(t, t.level||1, S);
    acc.head.innerHTML = `<div><b>${t.name}</b> · Lvl ${p2.level} · <span class="muted">${t.group||'—'}</span></div>`;
  }
  refreshTitle();

  return card;
}

function renderGroupsManager(S){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Groupes</b></div></div>';
  const list = el('div','list'); box.append(list);
  const form = el('div','list-item row'); form.style.gap='8px'; form.style.flexWrap='wrap';
  const nameI=el('input','input'); nameI.placeholder='Nom du groupe';
  const addB=el('button','btn'); addB.textContent='Ajouter';
  form.append(nameI, addB);
  box.append(form);

  function render(){
    list.innerHTML='';
    (S.enemyGroups||[]).forEach((g,idx)=>{
      const row=el('div','list-item small row');
      const txt=el('div'); txt.textContent=g;
      const del=el('button','btn small danger'); del.textContent='Supprimer';
      del.onclick=()=>{ S.enemyGroups.splice(idx,1); save(S); render(); };
      row.append(txt, del);
      list.append(row);
    });
  }
  addB.onclick=()=>{
    const g=(nameI.value||'').trim(); if(!g) return;
    if(!(S.enemyGroups||[]).includes(g)) S.enemyGroups.push(g);
    nameI.value=''; save(S); render();
  };
  render();
  return box;
}

function panelCatalogue(S){
  const container = el('div');

  // Création (sans accordéon)
  const creation = el('div','panel');
  creation.innerHTML = '<div class="list-item"><div><b>Créer un modèle</b></div></div>';
  const cBar = el('div','list-item row'); cBar.style.gap='8px'; cBar.style.flexWrap='wrap';
  const nameI = el('input','input'); nameI.placeholder='Nom du modèle';
  const lvlI = el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value='1';
  const groupChooser = makeKeyChooser(S.enemyGroups||[], 'groupe');
  const addB = el('button','btn'); addB.textContent='Créer';
  cBar.append(nameI, lvlI, groupChooser.wrap, addB);
  creation.append(cBar);

  addB.onclick = ()=>{
    const nm=(nameI.value||'').trim()||'Modèle';
    const lvl=Math.max(1,Math.floor(+lvlI.value||1));
    const grp=groupChooser.get()||'';
    S.enemiesTemplates.push({
      id:'tpl_'+Math.random().toString(36).slice(2,9),
      name:nm, level:lvl, group:grp,
      stats:{}, cats:{}, resources:{},
      statsPerLevel:{}, catsPerLevel:{}, resourcesPerLevel:{},
      useRace:false, raceId:'', useTribe:false, tribeId:'', useClass:false, classId:'',
      loot:[], tags:[]
    });
    save(S); renderList();
  };

  // Recherche + Groupes + Liste
  const tools = el('div','panel');
  tools.innerHTML = '<div class="list-item"><div><b>Modèles existants</b></div></div>';
  const tBar = el('div','list-item row'); tBar.style.gap='8px'; tBar.style.flexWrap='wrap';
  const searchI = el('input','input'); searchI.placeholder='Rechercher (nom)…';
  const groupF = (function(){ const ch=makeKeyChooser(['(Tous)', ...(S.enemyGroups||[])],'groupe'); ch.set('(Tous)'); return ch; })();
  tBar.append(searchI, groupF.wrap);
  tools.append(tBar);

  const list = el('div'); tools.append(list);

  function renderList(){
    list.innerHTML='';
    const q=(searchI.value||'').toLowerCase();
    const g=groupF.get();
    (S.enemiesTemplates||[])
      .filter(t=> !q || (t.name||'').toLowerCase().includes(q))
      .filter(t=> !g || g==='(Tous)' || (t.group||'')===g)
      .forEach(t=> list.append(modelAccordion(S,t)));
  }

  searchI.addEventListener('input', renderList);
  const grid = el('div'); grid.style.display='grid'; grid.style.gridTemplateColumns='1fr minmax(260px, 360px)'; grid.style.gap='10px';
  const left = el('div'); left.append(tools);
  const right = el('div'); right.append(renderGroupsManager(S));
  grid.append(left, right);

  container.append(creation, grid);
  renderList();
  return container;
}

/* ====================== Déployés ====================== */
function instantiateFromTemplate(tpl, level, S){
  const p = calcPreviewFromTemplate(tpl, level, S);
  return {
    id:'act_'+Math.random().toString(36).slice(2,9),
    templateId: tpl.id,
    name: tpl.name,
    level: p.level,
    group: tpl.group||'',
    stance:'neutre',
    disposition:0,
    stats: p.stats, cats: p.cats, resources: p.resources,
    localMods:{ add:{}, mult:{}, override:{} },
    effects:[],
    notes:''
  };
}

function editorLocalMods(S, a){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Modifs locales</b> <span class="muted small">(add → mult → override)</span></div></div>';
  const list = el('div','list'); box.append(list);

  function render(){
    list.innerHTML='';
    ['add','mult','override'].forEach(kind=>{
      const src = (a.localMods && a.localMods[kind]) || {};
      const row = el('div','list-item small');
      const keys = Object.keys(src);
      row.innerHTML = `<div><b>${kind}</b> : ${keys.length? keys.map(k=>`${k}=${src[k]}`).join(', ') : '<span class="muted">(vide)</span>'}</div>`;
      list.append(row);
    });
  }
  const form = el('div','list-item row');
  const sel=el('select','input'); ['add','mult','override'].forEach(k=>{ const o=el('option'); o.value=k; o.textContent=k; sel.append(o);} );
  const kI=el('input','input'); kI.placeholder='stat (ex: STR)';
  const vI=el('input','input'); vI.placeholder='valeur (ex: 2 / 1.5 / 42)';
  const addB=el('button','btn small'); addB.textContent='Appliquer';
  const clrB=el('button','btn small secondary'); clrB.textContent='Réinitialiser';
  addB.onclick=()=>{ const k=(kI.value||'').trim(); if(!k) return; const v=Number(vI.value); a.localMods=a.localMods||{add:{},mult:{},override:{}}; a.localMods[sel.value][k]=v; save(S); render(); };
  clrB.onclick=()=>{ a.localMods={add:{}, mult:{}, override:{}}; save(S); render(); };
  form.append(sel,kI,vI,addB,clrB);
  box.append(form);
  render();
  return box;
}

function editorEffects(S, a){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Effets</b> <span class="muted small">(stackables, durées en tours)</span></div></div>';
  const list = el('div','list'); box.append(list);

  function render(){
    list.innerHTML='';
    (a.effects||[]).forEach((e,idx)=>{
      const r = el('div','list-item small row');
      const chk=el('input'); chk.type='checkbox'; chk.checked=(e.active!==false);
      chk.onchange=()=>{ e.active=chk.checked; save(S); };
      const name=el('input','input'); name.value=e.name||''; name.placeholder='Nom'; name.onchange=()=>{ e.name=name.value||''; save(S); };
      const dur=el('input','input'); dur.type='number'; dur.min='0'; dur.value=Number.isFinite(+e.duration)? e.duration : 0; dur.onchange=()=>{ e.duration=Math.max(0,Math.floor(+dur.value||0)); save(S); };
      const del=el('button','btn small danger'); del.textContent='Suppr'; del.onclick=()=>{ a.effects.splice(idx,1); save(S); render(); };
      const view=el('div','muted small'); view.textContent=summarizeEffect(e);
      r.append(chk,name,dur,del,view);
      list.append(r);
    });
  }
  const form = el('div','list-item row');
  const nameI=el('input','input'); nameI.placeholder='Nom';
  const kind=el('select','input'); ['add','mult','override'].forEach(k=>{ const o=el('option'); o.value=k; o.textContent=k; kind.append(o);} );
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
    a.effects=a.effects||[]; a.effects.push(e); save(S); render();
  };
  form.append(nameI,kind,kI,vI,durI,addB);
  box.append(form);
  render();
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
  head.append(disp, minus, plus, stance, lvlP, lvlM);
  wrap.append(head);

  function updDisp(d){ a.disposition = clamp((a.disposition||0)+d, -100, 100); a.stance = stanceFromDisposition(a.disposition, S.attitudeThresholds); disp.textContent=`Disposition: ${a.disposition}`; stance.textContent=`Attitude: ${a.stance}`; save(S); }
  minus.onclick=()=>updDisp(-5); plus.onclick=()=>updDisp(+5);
  lvlP.onclick=()=>{ a.level=(a.level||1)+1; save(S); renderAll(); };
  lvlM.onclick=()=>{ a.level=Math.max(1,(a.level||1)-1); save(S); renderAll(); };

  const statsBox = el('div','panel'); statsBox.innerHTML='<div class="list-item"><div><b>Caractéristiques</b></div></div>'; const statsList=el('div','list'); statsBox.append(statsList);
  const catsBox = el('div','panel'); catsBox.innerHTML='<div class="list-item"><div><b>Catégories</b></div></div>'; const catsList=el('div','list'); catsBox.append(catsList);
  const resBox = el('div','panel'); resBox.innerHTML='<div class="list-item"><div><b>Ressources</b></div></div>'; const resList=el('div','list'); resBox.append(resList);
  wrap.append(statsBox, catsBox, resBox, editorLocalMods(S,a), editorEffects(S,a));

  function renderAll(){
    const e2=getActorEffectiveSnapshot(a,S);
    statsList.innerHTML='';
    const sk=Object.keys(e2.stats||{}).sort();
    if(sk.length===0){ const x=el('div','list-item small muted'); x.textContent='(aucune)'; statsList.append(x); }
    else sk.forEach(k=>{ const r=el('div','list-item small'); r.innerHTML=`<div><b>${k}</b> : ${e2.stats[k]}</div>`; statsList.append(r); });

    catsList.innerHTML='';
    const ck=Object.keys(e2.cats||{}).sort();
    if(ck.length===0){ const x=el('div','list-item small muted'); x.textContent='(aucune)'; catsList.append(x); }
    else ck.forEach(k=>{ const r=el('div','list-item small'); r.innerHTML=`<div><b>${k}</b> : ${e2.cats[k]}</div>`; catsList.append(r); });

    resList.innerHTML='';
    const rk=Object.keys(e2.resources||{}).sort();
    if(rk.length===0){ const x=el('div','list-item small muted'); x.textContent='(aucune)'; resList.append(x); }
    else rk.forEach(k=>{ const v=e2.resources[k]||{max:0,start:0}; const r=el('div','list-item small'); r.innerHTML=`<div><b>${k}</b> : ${v.start||0} / ${v.max||0}</div>`; resList.append(r); });
  }
  renderAll();

  const it = setInterval(renderAll, 1000);
  const obs=new MutationObserver(()=>{ if(!document.body.contains(wrap)){ clearInterval(it); obs.disconnect(); } });
  obs.observe(document.body,{childList:true,subtree:true});

  return wrap;
}

const OPEN_DETAILS = new Set();

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
  btns.append(bDetails,bDup,bDel);
  top.append(left,btns);
  row.append(top);

  const details = actorDetails(S,a); details.style.display='none'; details.style.marginTop='6px'; row.append(details);

  function setOpen(v){
    if(v){ details.style.display='block'; OPEN_DETAILS.add(a.id); }
    else { details.style.display='none'; OPEN_DETAILS.delete(a.id); }
  }
  if(OPEN_DETAILS.has(a.id)) setOpen(true);

  bDetails.onclick=()=> setOpen(details.style.display==='none');
  bDup.onclick=()=>{ const c=deepClone(a); c.id='act_'+Math.random().toString(36).slice(2,9); (S.enemies||[]).push(c); save(S); };
  bDel.onclick=()=>{ const i=(S.enemies||[]).findIndex(x=>x.id===a.id); if(i>=0){ S.enemies.splice(i,1); save(S); row.remove(); OPEN_DETAILS.delete(a.id);} };

  return row;
}

function panelDeployed(S){
  const box = el('div');
  const controls = el('div','list-item row'); controls.style.gap='8px'; controls.style.flexWrap='wrap';
  const sel = el('select','input');
  (S.enemiesTemplates||[]).forEach(t=>{ const o=el('option'); o.value=t.id; o.textContent=t.name; sel.append(o); });
  const lvlI = el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value='1';
  const qtyI = el('input','input'); qtyI.type='number'; qtyI.min='1'; qtyI.value='1';
  const deployB = el('button','btn'); deployB.textContent='Déployer';
  controls.append(sel,lvlI,qtyI,deployB);

  const list = el('div');
  function renderList(){
    list.innerHTML=''; (S.enemies||[]).forEach(a=> list.append(actorRow(S,a)));
  }
  deployB.onclick=()=>{
    const tpl=(S.enemiesTemplates||[]).find(t=> t.id===sel.value);
    if(!tpl){ alert('Aucun modèle sélectionné.'); return; }
    const qty=Math.max(1,Math.floor(+qtyI.value||1));
    const lvl=Math.max(1,Math.floor(+lvlI.value||1));
    for(let i=0;i<qty;i++) S.enemies.push(instantiateFromTemplate(tpl,lvl,S));
    save(S); renderList();
  };

  const acc = accordion('Déployés (live, toggles préservés)', true);
  acc.body.append(controls, list);
  box.append(acc.wrap);

  const it = setInterval(renderList, 1000);
  const obs=new MutationObserver(()=>{ if(!document.body.contains(box)){ clearInterval(it); obs.disconnect(); } });
  obs.observe(document.body,{childList:true,subtree:true});

  renderList();
  return box;
}

/* ====================== Combat modal (hook) ====================== */
const d20=()=>Math.floor(Math.random()*20)+1;
function computeInit(S,a){ const eff=getActorEffectiveSnapshot(a,S); const b=Number(eff.stats?.INIT || eff.stats?.DEX || eff.stats?.Dex || 0)||0; return d20()+b; }
function rollAllInitiative(S, participants){
  const ids = participants && participants.length ? participants : (S.enemies||[]).map(x=>x.id);
  S.combat.order = ids.map(id=>{
    const a=(S.enemies||[]).find(x=>x.id===id);
    return { actorId:id, name:a?.name||id, init:computeInit(S,a), alive:true };
  }).sort((x,y)=> y.init-x.init);
  S.combat.round=1; S.combat.turnIndex=0; S.combat.active=true; save(S);
}
function nextTurn(S){
  const C=S.combat||{}; if(!C.active||!C.order?.length) return;
  C.turnIndex++;
  if(C.turnIndex>=C.order.length){
    C.turnIndex=0; C.round++;
    (S.enemies||[]).forEach(a=>{
      (a.effects||[]).forEach(e=>{
        if(e && e.active!==false && Number.isFinite(+e.duration) && +e.duration>0){
          e.duration = (+e.duration)-1;
          if(e.duration<=0) e.active=false;
        }
      });
    });
  }
  save(S);
}
function openCombatModal(S, opts={}){
  ensureSchema(S);
  const ov = el('div'); ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='rgba(0,0,0,0.4)'; ov.style.zIndex='9999';
  const modal = el('div','panel'); modal.style.position='fixed'; modal.style.top='10%'; modal.style.left='50%'; modal.style.transform='translateX(-50%)';
  modal.style.maxWidth='720px'; modal.style.width='90%'; modal.style.maxHeight='80%'; modal.style.overflow='auto'; modal.style.background='#111b';
  modal.innerHTML='<div class="list-item"><div><b>Console de combat</b></div></div>';
  const bar = el('div','list-item row');
  const bRoll = el('button','btn'); bRoll.textContent='Lancer l’initiative (tous)';
  const bNext = el('button','btn'); bNext.textContent='Tour suivant';
  const info = el('div','muted small');
  bar.append(bRoll,bNext,info);
  const list = el('div','list');
  modal.append(bar,list);
  ov.append(modal);
  document.body.append(ov);

  function render(){
    const C=S.combat||{};
    info.textContent = C.active? `Round ${C.round} — Tour ${C.turnIndex+1}/${Math.max(1,C.order?.length||0)}` : '(combat inactif)';
    list.innerHTML='';
    (C.order||[]).forEach((it,idx)=>{
      const a=(S.enemies||[]).find(x=>x.id===it.actorId);
      const row = el('div','list-item small');
      const marker = idx===C.turnIndex? '▶ ' : '';
      row.innerHTML = `<div>${marker}<b>${it.name||a?.name||'?'}</b> — Init: ${it.init}</div>`;
      const bar = el('div','row'); bar.style.gap='6px';
      const bR = el('button','btn small'); bR.textContent='Relancer';
      const bX = el('button','btn small danger'); bX.textContent='Retirer';
      bR.onclick=()=>{ it.init=computeInit(S,a); S.combat.order.sort((x,y)=> y.init-x.init); save(S); render(); };
      bX.onclick=()=>{ const i=S.combat.order.findIndex(o=>o.actorId===it.actorId); if(i>=0){ S.combat.order.splice(i,1); save(S); render(); } };
      bar.append(bR,bX);
      row.append(bar);
      list.append(row);
    });
  }
  bRoll.onclick=()=>{ rollAllInitiative(S, opts.participants); render(); };
  bNext.onclick=()=>{ nextTurn(S); render(); };

  const it = setInterval(render, 1000);
  ov.addEventListener('click',(e)=>{ if(e.target===ov){ clearInterval(it); ov.remove(); } });
  render();
}

/* ====================== Sub-tabs & Root ====================== */
function subTabs(container, defs, defaultId){
  const head = el('div','tabs');
  const body = el('div');
  defs.forEach(d=>{
    const b=el('button','tab'); b.textContent=d.label; b.dataset.id=d.id;
    b.addEventListener('click',()=> activate(d.id));
    head.append(b);
  });
  container.append(head, body);
  function activate(id){
    Array.from(head.children).forEach(b=> b.classList.toggle('active', b.dataset.id===id));
    body.innerHTML='';
    const d=defs.find(x=>x.id===id);
    try{ body.append(d.node()); }
    catch(e){ console.error('Bestiaire panel error', e); const x=el('div','panel'); x.innerHTML='<div class="list-item"><div><b>Erreur de rendu</b></div></div>'; body.append(x); }
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
  if(typeof window!=='undefined' && typeof window.__openCombatModal!=='function'){
    window.__openCombatModal = (Sarg, opts)=> openCombatModal(Sarg||S, opts||{});
  }
  return root;
}
export default renderAdminBestiaire;
if(typeof window!=='undefined') window.renderAdminBestiaire = (S)=>renderAdminBestiaire(S);
