// TTRPG/js/views/admin_bestiaire.js
// ES module — Bestiaire complet (Catalogue + Déployés) avec :
// - Catalogue : création, édition (nom, niveau, groupe, R/T/C, stats, cats, ressources, per-level)
// - Déployés : déploiement, détails toggle (préservé), +/– niveau, dupliquer, supprimer
// - Live calc en continu (héritage Race/Tribu/Classe + per-level + localMods + effects)
// - UI modifs locales (add/mult/override) + UI effets (durée, on/off)
// - Fix "tick" : préservation des panneaux ouverts et MAJ in-place sans refermer
// - Hook modal combat dispo via window.__openCombatModal(S, {participants?})
// Exports: renderAdminBestiaire(S) + default, et compat globale window.renderAdminBestiaire

/* ====================== Utils ====================== */

/* ---- Helpers for option lists ---- */
function allStats(S){ return (S.settings && Array.isArray(S.settings.stats)) ? S.settings.stats.slice() : []; }
function allCats(S){ return (S.settings && Array.isArray(S.settings.categories)) ? S.settings.settings.categories.map(c=>c.name) : ((S.settings&&S.settings.categories)||[]).map(c=>c.name||c); }
function allowedResourcesForTemplate(S,t){
  const out=new Set();
  (S.resources||[]).forEach(r=>{
    const nm = r && (r.name||r.id); if(!nm) return;
    const scope = r.scope||'globale';
    if(scope==='globale'){ out.add(nm); return; }
    const linked = Array.isArray(r.linked)? r.linked : [];
    if(scope==='races' && t && t.useRace){ const obj=(S.races||[]).find(x=>String(x.id)===String(t.raceId)); if(obj && linked.indexOf(obj.name)>=0) out.add(nm); }
    if(scope==='tribus' && t && t.useTribe){ const obj=(S.tribes||[]).find(x=>String(x.id)===String(t.tribeId)); if(obj && linked.indexOf(obj.name)>=0) out.add(nm); }
    if(scope==='classes' && t && t.useClass){ const obj=(S.classes||[]).find(x=>String(x.id)===String(t.classId)); if(obj && linked.indexOf(obj.name)>=0) out.add(nm); }
  });
  return Array.from(out);
}
function resLabel(S,k){ const r=(S.resources||[]).find(x=>x && (x.id===k || x.name===k)); return r ? (r.name||k) : k; }
const el = (t, cls) => { const n=document.createElement(t); if(cls) n.className=cls; return n; };
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const N=v=>{ const n=Number(v); return Number.isFinite(n)?n:0; };
const deepClone = (o)=> JSON.parse(JSON.stringify(o||{}));
const save = (S)=> (window.State && typeof window.State.save==='function') ? window.State.save(S) : void 0;
const stanceFromDisposition=(d,S)=>{
  try{
    const A=(S&&S.settings&&Array.isArray(S.settings.attitudes))?S.settings.attitudes:[];
    if(A.length){
      let pick='neutre', best=-1/0;
      for(let i=0;i<A.length;i++){
        const a=A[i]||{}; const min=(a.min===''||a.min==null)?-1/0:+a.min; const max=(a.max===''||a.max==null)?+1/0:+a.max;
        if(d>=min && d<=max && min>=best){ pick=a.name||pick; best=min; }
      }
      return pick;
    }
  }catch(e){}
  const thr=(S&&S.attitudeThresholds)||{friendly:10,hostile:-10};
  return d>=thr.friendly?'amical':(d<=thr.hostile?'hostile':'neutre');
};

function ensureSchema(S){
  if(!Array.isArray(S.enemiesTemplates)) S.enemiesTemplates=[];
  if(!Array.isArray(S.enemies)) S.enemies=[];
  if(!S.attitudeThresholds || typeof S.attitudeThresholds!=='object'){
    S.attitudeThresholds = { friendly:30, hostile:-30 };
  }
  if(!S.combat || typeof S.combat!=='object'){
    S.combat = { active:false, round:1, turnIndex:0, order:[] };
  }
  return S;
}

/* ====================== Inheritance & calc ====================== */
function mergeNum(dst, src){
  if(!src) return;
  if(Array.isArray(src)){
    src.forEach(e=>{
      if(Array.isArray(e) && e.length>=2){ const k=String(e[0]); dst[k]=(dst[k]||0)+N(e[1]); }
      else if(e && typeof e==='object'){ const k=e.name||e.key||e.id; if(!k) return; const v=N(e.value ?? e.delta ?? e.v ?? e.amount); dst[k]=(dst[k]||0)+v; }
    });
  }else if(typeof src==='object'){
    Object.keys(src).forEach(k=>{
      const v=src[k];
      if(v && typeof v==='object' && 'value' in v) dst[k]=(dst[k]||0)+N(v.value);
      else dst[k]=(dst[k]||0)+N(v);
    });
  }
}
function mergeRes(dst, src){
  if(!src) return;
  if(Array.isArray(src)){
    src.forEach(e=>{
      if(Array.isArray(e) && e.length>=2){
        const k=String(e[0]); const v=e[1]; const d = dst[k]||(dst[k]={max:0,start:0});
        if(v && typeof v==='object'){ d.max+=N(v.max); d.start+=N(v.start); } else { d.max+=N(v); }
        if(d.start>d.max) d.start=d.max;
      }else if(e && typeof e==='object'){
        const k=e.name||e.key||e.id; if(!k) return;
        const d = dst[k]||(dst[k]={max:0,start:0});
        if('max' in e || 'start' in e){ d.max+=N(e.max); d.start+=N(e.start); }
        else if('value' in e || 'delta' in e || 'v' in e || 'amount' in e){ d.max+=N(e.value ?? e.delta ?? e.v ?? e.amount); }
        if(d.start>d.max) d.start=d.max;
      }
    });
  }else if(typeof src==='object'){
    Object.keys(src).forEach(k=>{
      const v=src[k]; const d = dst[k]||(dst[k]={max:0,start:0});
      if(v && typeof v==='object'){ d.max+=N(v.max); d.start+=N(v.start); } else { d.max+=N(v); }
      if(d.start>d.max) d.start=d.max;
    });
  }
}
function applyFlatAdd(stats, cats, res, src){
  const m = src?.mods;
  mergeNum(stats, src?.statsMods || src?.stats || m?.stats || m?.statsMods);
  mergeNum(cats , src?.catsMods  || src?.categories || m?.cats  || m?.categories);
  mergeRes(res   , src?.resourcesMods || src?.resources || m?.resources || m?.resourcesMods);
}

function calcPreviewFromTemplate(tpl, level, S){
  const lvl = Math.max(1, Math.floor(+level||tpl.level||1));
  const stats = {...(tpl.stats||{})};
  const cats  = {...(tpl.cats||{})};
  const res   = deepClone(tpl.resources||{});
  const spl = tpl.statsPerLevel||{};
  const cpl = tpl.catsPerLevel||{};
  const rpl = tpl.resourcesPerLevel||{};
  const Lm1 = (lvl-1);
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
    const race = (S.races||[]).find(r=> String(r.id||'')===String(tpl.raceId||''));
    if(race) applyFlatAdd(stats,cats,res,race);
  }
  if(tpl.useTribe){
    const tribe = (S.tribes||[]).find(r=> String(r.id||'')===String(tpl.tribeId||''));
    if(tribe) applyFlatAdd(stats,cats,res,tribe);
  }
  if(tpl.useClass){
    const klass = (S.classes||[]).find(r=> String(r.id||'')===String(tpl.classId||''));
    if(klass) applyFlatAdd(stats,cats,res,klass);
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

    // accumulate locals
    Object.keys(LM.add||{}).forEach(k=> add[k]=(add[k]||0)+N(LM.add[k]));
    Object.keys(LM.mult||{}).forEach(k=> mult[k]=(mult[k]||1)*(Number(LM.mult[k])||1));
    Object.assign(ov, LM.override||{});

    // accumulate effects
    effs.forEach(e=>{
      if(e.add)  Object.keys(e.add).forEach(k=> add[k]=(add[k]||0)+N(e.add[k]));
      if(e.mult) Object.keys(e.mult).forEach(k=> mult[k]=(mult[k]||1)*(Number(e.mult[k])||1));
      if(e.override) Object.assign(ov, e.override);
    });

    // apply order: add -> mult -> override
    Object.keys(add).forEach(k=> stats[k]=(stats[k]||0)+add[k]);
    Object.keys(mult).forEach(k=> stats[k]=(stats[k]||0)*(Number(mult[k])||1));
    Object.assign(stats, ov);

    return { stats, cats: base.cats||{}, resources: base.resources||{} };
  }catch(e){
    console.warn('snapshot error', e);
    return { stats: actor.stats||{}, cats: actor.cats||{}, resources: actor.resources||{} };
  }
}

/* ====================== Small UI helpers ====================== */
function accordion(title, open=true){
  const wrap = el('div','panel');
  const head = el('div','list-item'); head.innerHTML = `<div><b>${title}</b></div>`;
  const body = el('div'); body.style.display = open? 'block':'none';
  head.style.cursor='pointer';
  head.addEventListener('click',()=>{ body.style.display = (body.style.display==='none'?'block':'none'); });
  wrap.append(head, body);
  return {wrap, body};
}

function kvEditor(obj, onChange, opts={}){ const title=opts.title||'Éditeur'; const keyPh=opts.keyPh||'clé'; const valPh=opts.valPh||'valeur'; const numeric = (opts.numeric!==false); const keyOptions = Array.isArray(opts.keyOptions)? opts.keyOptions : null; const bare=!!opts.bare;
  const box = bare ? el('div') : el('div','panel');
  let list = el('div','list');
  if(bare){ const sub=el('div','list-item small muted'); sub.textContent=title; box.append(sub); box.append(list); }
  else { box.innerHTML = `<div class="list-item"><div><b>${title}</b></div></div>`; box.append(list); }
  const form = el('div','list-item row'); form.style.display='flex'; form.style.flexWrap='wrap'; form.style.gap='8px';
  let kI;
  if(keyOptions && keyOptions.length){
    kI = el('select','input'); const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; kI.appendChild(o0);
    keyOptions.forEach(nm=>{ const o=document.createElement('option'); o.value=nm; o.textContent=nm; kI.appendChild(o); });
  }else{
    kI = el('input','input'); kI.placeholder=keyPh;
  }
  const vI=el('input','input'); vI.placeholder=valPh;
  const addB=el('button','btn small'); addB.textContent='Ajouter';
  const clrB=el('button','btn small secondary'); clrB.textContent='Vider';
  form.append(kI,vI,addB,clrB);
  box.append(form);

  function render(){
    list.innerHTML='';
    const keys = Object.keys(obj||{}).sort();
    if(keys.length===0){ const x=el('div','list-item small muted'); x.textContent='(vide)'; list.append(x); }
    else keys.forEach(k=>{
      const row=el('div','list-item small row');
      const label=el('div'); label.innerHTML=`<b>${k}</b> : ${obj[k]}`;
      const del=el('button','btn small danger'); del.textContent='Supprimer';
      del.onclick=()=>{ delete obj[k]; onChange(); render(); };
      row.append(label, del);
      list.append(row);
    });
  }
  addB.onclick=()=>{
    const k=(kI.value||'').trim(); if(!k) return;
    const v = numeric ? Number(vI.value) : vI.value;
    obj[k] = numeric ? (Number.isFinite(v)? v: 0) : v;
    onChange(); render();
  };
  clrB.onclick=()=>{ Object.keys(obj||{}).forEach(k=> delete obj[k]); onChange(); render(); };
  render();
  return box;
}

function resEditor(S, tpl, obj, onChange, opts={}){
  const bare = !!opts.bare; const title = opts.title || 'Ressources';
  const box = bare ? el('div') : el('div','panel');
  const list = el('div','list');
  if(bare){ const sub=el('div','list-item small muted'); sub.textContent=title; box.append(sub); box.append(list); }
  else { box.innerHTML='<div class="list-item"><div><b>'+title+'</b></div></div>'; box.append(list); }
  const form = el('div','list-item row'); form.style.display='flex'; form.style.flexWrap='wrap'; form.style.gap='8px';
  const kI=el('select','input'); { const o0=document.createElement('option'); o0.value=''; o0.textContent='—'; kI.appendChild(o0); allowedResourcesForTemplate(S, tpl).forEach(nm=>{ const o=document.createElement('option'); o.value=nm; o.textContent=nm; kI.appendChild(o); }); }
  const maxI=el('input','input'); maxI.placeholder='max'; const startI=el('input','input'); startI.placeholder='start';
  const addB=el('button','btn small'); addB.textContent='Ajouter';
  const clrB=el('button','btn small secondary'); clrB.textContent='Vider';
  form.append(kI,maxI,startI,addB,clrB); box.append(form);

  function render(){
    list.innerHTML='';
    const keys = Object.keys(obj||{}).sort();
    if(keys.length===0){ const x=el('div','list-item small muted'); x.textContent='(vide)'; list.append(x); }
    else keys.forEach(k=>{
      const v=obj[k]||{max:0,start:0};
      // migrate id->name if possible
      (function(){ const r=(S.resources||[]).find(x=>x && x.id===k); if(r && r.name && r.name!==k){ obj[r.name]=v; delete obj[k]; k=r.name; } })();
      const row=el('div','list-item small row');
      const label=el('div'); label.innerHTML=`<b>${resLabel(S,k)}</b> : ${v.start||0} / ${v.max||0}`;
      const del=el('button','btn small danger'); del.textContent='Supprimer';
      del.onclick=()=>{ delete obj[k]; onChange(); render(); };
      row.append(label, del);
      list.append(row);
    });
  }
  addB.onclick=()=>{
    const k=(kI.value||'').trim(); if(!k) return;
    const v = obj[k] || (obj[k]={max:0,start:0});
    v.max = N(maxI.value); v.start = N(startI.value); if(v.start>v.max) v.start=v.max;
    onChange(); render();
  };
  clrB.onclick=()=>{ Object.keys(obj||{}).forEach(k=> delete obj[k]); onChange(); render(); };
  render();
  return box;
}

/* ====================== Catalogue ====================== */
function ensureGroups(S){ S.bestiaireGroups = Array.isArray(S.bestiaireGroups)? S.bestiaireGroups : []; return S.bestiaireGroups; }
function rowTemplate(S, t){
  const row = el('div','panel');

  // HEADER + quick edit
  const head = el('div','list-item row'); head.style.gap='8px'; head.style.flexWrap='wrap';
  const p = calcPreviewFromTemplate(t, t.level||1, S);
  const title = el('div'); title.innerHTML = `<b>${t.name}</b> · Lvl ${p.level} · <span class="muted">${t.group||'—'}</span>
    <span class="muted"> | ${Object.keys(p.stats||{}).slice(0,3).join(', ')}</span>`;
  const nameI=el('input','input'); nameI.value=t.name||''; nameI.placeholder='Nom'; nameI.style.width='140px';
  nameI.onchange=()=>{ t.name=nameI.value||'Modèle'; save(S); refreshPreview(); };
  const lvlI=el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value=t.level||1; lvlI.style.width='64px';
  lvlI.onchange=()=>{ t.level=Math.max(1,Math.floor(+lvlI.value||1)); save(S); refreshPreview(); };
  const groupI=el('select','input'); groupI.style.width='140px'; { const o0=document.createElement('option'); o0.value=''; o0.textContent='— Groupe —'; groupI.appendChild(o0); ensureGroups(S).forEach(g=>{ const o=document.createElement('option'); o.value=g; o.textContent=g; if(g===(t.group||'')) o.selected=true; groupI.appendChild(o); }); }
  groupI.onchange=()=>{ t.group=groupI.value||''; save(S); refreshPreview(); };

  const caret = document.createElement('span'); caret.textContent='▾'; caret.style.marginLeft='8px'; caret.style.opacity='0.7'; title.append(caret);
  head.append(title, nameI, lvlI, groupI); head.title='Cliquer pour replier/déplier'; head.style.cursor='pointer';
  row.append(head);
  const content = el('div'); row.append(content);
  let opened=true; const toggle=()=>{ opened=!opened; content.style.display = opened?'block':'none'; caret.style.transform = opened?'rotate(0deg)':'rotate(-90deg)';}; head.onclick=toggle;

  // INHERITANCE toggles
  const inh = el('div','list-item row'); inh.style.gap='10px'; inh.style.flexWrap='wrap';
  const uR = el('input'); uR.type='checkbox'; uR.checked=!!t.useRace;
  const sR = el('select','input'); (S.races||[]).forEach(r=>{ const o=el('option'); o.value=r.id; o.textContent=r.name||r.id; sR.appendChild(o); });
  sR.value=t.raceId||''; uR.onchange=()=>{ t.useRace=uR.checked; save(S); refreshPreview(); }; sR.onchange=()=>{ t.raceId=sR.value; save(S); refreshPreview(); };
  const uT = el('input'); uT.type='checkbox'; uT.checked=!!t.useTribe;
  const sT = el('select','input'); (S.tribes||[]).forEach(r=>{ const o=el('option'); o.value=r.id; o.textContent=r.name||r.id; sT.appendChild(o); });
  sT.value=t.tribeId||''; uT.onchange=()=>{ t.useTribe=uT.checked; save(S); refreshPreview(); }; sT.onchange=()=>{ t.tribeId=sT.value; save(S); refreshPreview(); };
  const uC = el('input'); uC.type='checkbox'; uC.checked=!!t.useClass;
  const sC = el('select','input'); (S.classes||[]).forEach(r=>{ const o=el('option'); o.value=r.id; o.textContent=r.name||r.id; sC.appendChild(o); });
  sC.value=t.classId||''; uC.onchange=()=>{ t.useClass=uC.checked; save(S); refreshPreview(); }; sC.onchange=()=>{ t.classId=sC.value; save(S); refreshPreview(); };
  const labR=el('label','small'); labR.append(uR, document.createTextNode(' Race '), sR);
  const labT=el('label','small'); labT.append(uT, document.createTextNode(' Tribu '), sT);
  const labC=el('label','small'); labC.append(uC, document.createTextNode(' Classe '), sC);
  inh.append(labR,labT,labC);
  content.append(inh);

  // EDITORS (stats, cats, resources, per-level)
  const editors = el('div'); editors.style.display='grid'; editors.style.gap='12px'; head.onclick=()=>{ content.style.display = (content.style.display==='none')?'block':'none'; }; editors.style.gridTemplateColumns='repeat(auto-fit,minmax(260px,1fr))'; editors.style.gap='8px';

  const statsBox = kvEditor(t.stats || (t.stats={}), ()=>{ save(S); refreshPreview(); }, {title:'Stats (base)', keyPh:'stat', valPh:'+val', numeric:true, keyOptions: (S.settings&&S.settings.stats)||[], bare:true});
  const catsBox  = kvEditor(t.cats || (t.cats={}), ()=>{ save(S); refreshPreview(); }, {title:'Catégories (base)', keyPh:'cat', valPh:'+val', numeric:true, keyOptions: ((S.settings&&S.settings.categories)||[]).map(c=>c.name), bare:true});
  const resBox   = resEditor(S, t, t.resources || (t.resources={}), ()=>{ save(S); refreshPreview(); }, { bare:true, title:'Ressources (base)' });

  const statsPL = kvEditor(t.statsPerLevel || (t.statsPerLevel={}), ()=>{ save(S); refreshPreview(); }, {title:'Stats / Niveau', keyPh:'stat', valPh:'+par niveau', numeric:true, keyOptions: (S.settings&&S.settings.stats)||[], bare:true});
  const catsPL  = kvEditor(t.catsPerLevel || (t.catsPerLevel={}), ()=>{ save(S); refreshPreview(); }, {title:'Catégories / Niveau', keyPh:'cat', valPh:'+par niveau', numeric:true, keyOptions: ((S.settings&&S.settings.categories)||[]).map(c=>c.name), bare:true});
  const resPL   = resEditor(S, t, t.resourcesPerLevel || (t.resourcesPerLevel={}), ()=>{ save(S); refreshPreview(); }, { bare:true, title:'Ressources / Niveau' });

  const statsWrap = el('div','panel'); statsWrap.innerHTML='<div class="list-item"><div><b>Stats</b></div></div>'; const sBody=el('div','list'); statsWrap.append(sBody); sBody.append(statsBox, statsPL);
  const catsWrap = el('div','panel'); catsWrap.innerHTML='<div class="list-item"><div><b>Catégories</b></div></div>'; const cBody=el('div','list'); catsWrap.append(cBody); cBody.append(catsBox, catsPL);
  const resWrap = el('div','panel'); resWrap.innerHTML='<div class="list-item"><div><b>Ressources</b></div></div>'; const rBody=el('div','list'); resWrap.append(rBody); rBody.append(resBox, resPL);
  editors.append(statsWrap, catsWrap, resWrap);
  content.append(editors);

  function refreshPreview(){
    const p2 = calcPreviewFromTemplate(t, t.level||1, S);
    title.innerHTML = `<b>${t.name}</b> · Lvl ${p2.level} · <span class="muted">${t.group||'—'}</span>
      <span class="muted"> | ${Object.keys(p2.stats||{}).slice(0,3).join(', ')}</span>`;
  }

  return row;
}

function panelCatalogue(S){
  const box = el('div');
  const controls = el('div','list-item row'); controls.style.gap='8px'; controls.style.flexWrap='wrap';
  const nameI = el('input','input'); nameI.placeholder='Nom du modèle';
  const lvlI = el('input','input'); lvlI.type='number'; lvlI.min='1'; lvlI.value='1';
  const addB = el('button','btn'); addB.textContent='Créer un modèle';
  controls.append(nameI, lvlI, addB);

  const list = el('div'); // container stable (pour éviter le "tick")
  function renderList(){
    list.innerHTML='';
    (S.enemiesTemplates||[]).forEach(t=> list.append(rowTemplate(S,t)));
  }
  addB.onclick = ()=>{
    const nm=(nameI.value||'').trim()||'Modèle';
    const lvl=Math.max(1,Math.floor(+lvlI.value||1));
    S.enemiesTemplates.push({
      id:'tpl_'+Math.random().toString(36).slice(2,9),
      name:nm, level:lvl, group:'',
      stats:{}, cats:{}, resources:{},
      statsPerLevel:{}, catsPerLevel:{}, resourcesPerLevel:{},
      useRace:false, raceId:'', useTribe:false, tribeId:'', useClass:false, classId:'',
      loot:[], tags:[]
    });
    save(S); renderList();
  };

  const acc = accordion('Catalogue (édition complète + héritage live)', true);
  acc.body.append(controls, list);
  box.append(acc.wrap);

  // Groupes (gestion)
  const grpPanel = accordion('Groupes', false);
  const grpList = el('div','list');
  function renderGroups(){
    grpList.innerHTML='';
    ensureGroups(S).forEach((g,idx)=>{
      const row=el('div','list-item small');
      const left=el('div'); const inp=document.createElement('input'); inp.className='input'; inp.value=g;
      inp.oninput=()=>{ S.bestiaireGroups[idx]=inp.value||''; save(S); renderGroups(); };
      left.appendChild(inp);
      const right=el('div'); const del=el('button','btn small danger'); del.textContent='Supprimer';
      del.onclick=()=>{ S.bestiaireGroups.splice(idx,1); save(S); renderGroups(); };
      row.append(left,right.appendChild?right:document.createElement('div')); if(!right.firstChild) right.appendChild(del); grpList.appendChild(row); right.innerHTML=''; right.appendChild(del);
    });
    const add=el('div','list-item small'); const l=el('div'); l.textContent='Ajouter'; const r=el('div'); r.style.gap='8px'; r.style.display='flex'; r.style.flexWrap='wrap'; const nameI=el('input','input'); nameI.placeholder='Nom du groupe'; const addB=el('button','btn'); addB.textContent='Ajouter'; addB.onclick=()=>{ const nm=(nameI.value||'').trim(); if(!nm) return; ensureGroups(S).push(nm); save(S); renderGroups(); }; r.append(nameI, addB); add.append(l,r); grpList.appendChild(add);
  }
  renderGroups();
  grpPanel.body.append(grpList);
  box.append(grpPanel.wrap);


  // live preview refresh without rebuilding entire DOM (avoid tick)
  const it = setInterval(()=>{
    // update headers inline
    Array.from(list.children).forEach((panel,i)=>{
      const t = (S.enemiesTemplates||[])[i]; if(!t) return;
      const head = panel.querySelector('.list-item.row');
      if(!head) return;
      const titleDiv = head.firstChild; // first child is the title <div>
      const p = calcPreviewFromTemplate(t, t.level||1, S);
      titleDiv.innerHTML = `<b>${t.name}</b> · Lvl ${p.level} · <span class="muted">${t.group||'—'}</span>
        <span class="muted"> | ${Object.keys(p.stats||{}).slice(0,3).join(', ')}</span>`;
    });
  }, 1000);
  const obs=new MutationObserver(()=>{ if(!document.body.contains(box)){ clearInterval(it); obs.disconnect(); } });
  obs.observe(document.body,{childList:true,subtree:true});

  renderList();
  return box;
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
  const form = el('div','list-item row'); form.style.display='flex'; form.style.flexWrap='wrap'; form.style.gap='8px';
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
  const form = el('div','list-item row'); form.style.display='flex'; form.style.flexWrap='wrap'; form.style.gap='8px';
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

  // header: disposition/stance + level
  const head = el('div','list-item row'); head.style.gap='8px';
  const disp = el('div'); disp.textContent = `Disposition: ${a.disposition??0}`;
  const minus = el('button','btn small'); minus.textContent='-5';
  const plus  = el('button','btn small'); plus.textContent='+5';
  const stance = el('div','muted small'); stance.textContent=`Attitude: ${a.stance||'neutre'}`;
  const lvlP = el('button','btn small'); lvlP.textContent='+Lvl';
  const lvlM = el('button','btn small'); lvlM.textContent='-Lvl';
  head.append(disp, minus, plus, stance, lvlP, lvlM);
  wrap.append(head);

  function updDisp(d){ a.disposition = clamp((a.disposition||0)+d, -100, 100); a.stance = stanceFromDisposition(a.disposition, S.settings||S); disp.textContent=`Disposition: ${a.disposition}`; stance.textContent=`Attitude: ${a.stance}`; save(S); }
  minus.onclick=()=>updDisp(-5); plus.onclick=()=>updDisp(+5);
  lvlP.onclick=()=>{ a.level=(a.level||1)+1; save(S); renderAll(); };
  lvlM.onclick=()=>{ a.level=Math.max(1,(a.level||1)-1); save(S); renderAll(); };

  // blocks
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

  // live only updates inner lists (no rebuild) → avoids closing toggles
  const it = setInterval(renderAll, 1000);
  const obs=new MutationObserver(()=>{ if(!document.body.contains(wrap)){ clearInterval(it); obs.disconnect(); } });
  obs.observe(document.body,{childList:true,subtree:true});

  return wrap;
}

// Track open detail panels across refresh renders
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
  // Restore previous state
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

  const list = el('div'); // stable container
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

  // Groupes (gestion)
  const grpPanel = accordion('Groupes', false);
  const grpList = el('div','list');
  function renderGroups(){
    grpList.innerHTML='';
    ensureGroups(S).forEach((g,idx)=>{
      const row=el('div','list-item small');
      const left=el('div'); const inp=document.createElement('input'); inp.className='input'; inp.value=g;
      inp.oninput=()=>{ S.bestiaireGroups[idx]=inp.value||''; save(S); renderGroups(); };
      left.appendChild(inp);
      const right=el('div'); const del=el('button','btn small danger'); del.textContent='Supprimer';
      del.onclick=()=>{ S.bestiaireGroups.splice(idx,1); save(S); renderGroups(); };
      row.append(left,right.appendChild?right:document.createElement('div')); if(!right.firstChild) right.appendChild(del); grpList.appendChild(row); right.innerHTML=''; right.appendChild(del);
    });
    const add=el('div','list-item small'); const l=el('div'); l.textContent='Ajouter'; const r=el('div'); r.style.gap='8px'; r.style.display='flex'; r.style.flexWrap='wrap'; const nameI=el('input','input'); nameI.placeholder='Nom du groupe'; const addB=el('button','btn'); addB.textContent='Ajouter'; addB.onclick=()=>{ const nm=(nameI.value||'').trim(); if(!nm) return; ensureGroups(S).push(nm); save(S); renderGroups(); }; r.append(nameI, addB); add.append(l,r); grpList.appendChild(add);
  }
  renderGroups();
  grpPanel.body.append(grpList);
  box.append(grpPanel.wrap);


  // live refresh — rebuild rows but restore open state
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
    // decrement durations
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
    body.innerHTML=''; const d=defs.find(x=>x.id===id); body.append(d.node());
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
