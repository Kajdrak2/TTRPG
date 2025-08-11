// js/core/state.js — 6.2.2: global ticker + consommables + cooldowns
const LS_KEY = 'JDR_STUDIO_STATE_V1';

/* ---------------- Utilities ---------------- */
function newId(prefix='id'){ return prefix+'_'+Math.random().toString(36).slice(2,8); }

/* ---------------- Persistence ---------------- */
function defaultState(){
  return {
    settings: { useCategoryPoints:false, categories:[], slots:[] },
    players: [], races: [], tribes: [], classes: [],
    resources: [], items: [], lootbox: [],
    lore: "", methods: [],
    timers: [],                     // [{id,name,remaining,running,createdAt}]
    masterClock: { running:false, resumeIds:[], lastTick:0 },
    effects: []                     // [{id, pIndex, itemId, mods, timerId, name}]
  };
}
function ensureShape(S){
  const D = defaultState();
  S = S && typeof S==='object' ? S : {};
  for(const k of Object.keys(D)){ if(!(k in S)) S[k]=D[k]; }
  ['players','races','tribes','classes','resources','items','methods','lootbox','timers','effects'].forEach(k=>{
    if(!Array.isArray(S[k])) S[k]=[];
  });
  if(!S.settings) S.settings={useCategoryPoints:false, categories:[], slots:[]};
  if(!Array.isArray(S.settings.slots)) S.settings.slots=[];
  return S;
}
export function load(){
  let S=null;
  try{ const raw=(typeof localStorage!=='undefined')?localStorage.getItem(LS_KEY):null; if(raw) S=JSON.parse(raw);}catch(e){}
  if(typeof window!=='undefined' && window.__JDR_STATE__ && !S){ S=window.__JDR_STATE__; }
  S=ensureShape(S||defaultState());
  if(typeof window!=='undefined') window.__JDR_STATE__=S;
  return S;
}
export function get(){ if(typeof window!=='undefined' && window.__JDR_STATE__) return window.__JDR_STATE__; return load(); }
export function save(S){ S=ensureShape(S); if(typeof window!=='undefined') window.__JDR_STATE__=S; try{ if(typeof localStorage!=='undefined') localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){} return S; }

/* ---------------- Items & Inventory ---------------- */
export function ensureItemIds(S){
  S.items = Array.isArray(S.items) ? S.items : [];
  const used = new Set(S.items.map(it=>String(it.id||'')));
  S.items.forEach((it,i)=>{ if(!it.id){ let id; do{ id='itm_'+(i+1)+'_'+Math.random().toString(36).slice(2,6); }while(used.has(id)); it.id=id; used.add(id); } });
  return S.items;
}
export function getItemById(S, id){ if(!id) return null; return (S.items||[]).find(it => String(it.id||'')===String(id)) || null; }
export function ensurePlayerInv(S, p){ p.inv = Array.isArray(p.inv) ? p.inv : []; return p.inv; }
export function ensurePlayerCooldowns(S, p){ if(!p.cooldowns || typeof p.cooldowns!=='object') p.cooldowns={}; return p.cooldowns; }
export function addItemToPlayer(S, p, itemId){ ensurePlayerInv(S,p); p.inv.push({ itemId, equipped:false }); save(S); }
export function equipOne(S, p, itemId){
  ensurePlayerInv(S,p);
  const it = getItemById(S, itemId);
  if(!it || it.type!=='equipment') return false;
  const slot = it.slot || (S.settings.slots[0]||'slot');
  p.inv.forEach(s=>{
    const i = getItemById(S, s.itemId);
    if(i && i.type==='equipment' && (i.slot||(S.settings.slots[0]||'slot'))===slot){ s.equipped=false; }
  });
  const copy = p.inv.find(s=> s.itemId===itemId && !s.equipped);
  if(copy){ copy.equipped=true; save(S); return true; }
  return false;
}
export function unequipSlot(S,p,slotName){
  ensurePlayerInv(S,p);
  p.inv.forEach(s=>{ const i=getItemById(S,s.itemId); if(i && i.type==='equipment' && (i.slot||(S.settings.slots[0]||'slot'))===slotName){ s.equipped=false; } });
  save(S); return true;
}

/* ---------------- Lootbox (shared stacks) ---------------- */
export function ensureLootbox(S){ S.lootbox = Array.isArray(S.lootbox) ? S.lootbox : []; return S.lootbox; }
export function lootboxAdd(S, itemId, qty){
  ensureLootbox(S); qty = Math.max(0, Math.floor(+qty||0)); if(qty<=0) return 0;
  const st = S.lootbox.find(s=> String(s.itemId)===String(itemId));
  if(st) st.qty += qty; else S.lootbox.push({ itemId, qty });
  save(S); return qty;
}
export function lootboxTake(S, itemId, qty){
  ensureLootbox(S); qty = Math.max(0, Math.floor(+qty||0)); if(qty<=0) return 0;
  const st = S.lootbox.find(s=> String(s.itemId)===String(itemId)); if(!st) return 0;
  const take = Math.min(qty, st.qty);
  st.qty -= take; if(st.qty<=0){ const i=S.lootbox.indexOf(st); if(i>=0) S.lootbox.splice(i,1); }
  save(S); return take;
}

/* ---------------- Timers ---------------- */
export function timerCreate(S, name, seconds){
  seconds = Math.max(0, Math.floor(+seconds||0));
  const t = { id:newId('t'), name:name||'Timer', remaining:seconds, running:false, createdAt: Date.now() };
  S.timers.push(t); save(S); return t.id;
}
export function timerRemove(S, id){ const i=(S.timers||[]).findIndex(t=> t.id===id); if(i>=0){ S.timers.splice(i,1); save(S); return true; } return false; }
export function timerAdd(S, id, seconds){ const t=(S.timers||[]).find(x=>x.id===id); if(t){ const next = Math.max(0, Math.floor(+t.remaining||0) + Math.floor(+seconds||0)); t.remaining = next; if(next===0) t.running=false; save(S);} }
export function timerStart(S, id){ const t=(S.timers||[]).find(x=>x.id===id); if(t && t.remaining>0){ t.running=true; save(S);} }
export function timerPause(S, id){ const t=(S.timers||[]).find(x=>x.id===id); if(t){ t.running=false; save(S);} }
export function masterPlay(S){ S.masterClock.running = true; save(S); }
export function masterPause(S){
  const running = (S.timers||[]).filter(t=> t.running).map(t=> t.id);
  S.masterClock.resumeIds = running;
  (S.timers||[]).forEach(t=> t.running=false);
  S.masterClock.running = false;
  save(S);
}
export function masterResume(S){
  const set = new Set(S.masterClock.resumeIds||[]);
  (S.timers||[]).forEach(t=>{ t.running = set.has(t.id) && t.remaining>0; });
  S.masterClock.running = true;
  save(S);
}
export function masterStopAll(S){ (S.timers||[]).forEach(t=> t.running=false); S.masterClock.running=false; S.masterClock.resumeIds=[]; save(S); }
export function tick(S, dtSec){
  dtSec = Math.max(0, Math.floor(+dtSec||0));
  if(dtSec<=0) return;
  if(!S.masterClock.running) return;
  let changed=false;
  (S.timers||[]).forEach(t=>{
    if(t.running && t.remaining>0){
      const r = Math.max(0, Math.floor(t.remaining - dtSec));
      if(r !== t.remaining){ t.remaining = r; changed=true; if(r===0) t.running=false; }
    }
  });
  if(changed) save(S);
}
export function timerRemaining(S, id){
  const t=(S.timers||[]).find(x=>x.id===id); return t ? Math.max(0, Math.floor(+t.remaining||0)) : 0;
}

/* Global ticker so timers move even hors onglet Timer */
(function ensureGlobalTicker(){
  if (typeof window==='undefined') return;
  if (window.__JDR_GLOBAL_TICK__) return;
  window.__JDR_GLOBAL_TICK__ = setInterval(function(){
    try{ const S = get(); tick(S,1); }catch(e){}
  }, 1000);
})();

/* ---------------- Consommables: effets & cooldowns ---------------- */
export function isEffectActive(S, eff){ if(!eff) return false; const rem = timerRemaining(S, eff.timerId); return rem > 0; }
export function effectListForPlayer(S, pIndex){ return (S.effects||[]).filter(e => e.pIndex===pIndex && isEffectActive(S, e)); }
export function createEffectFromItem(S, pIndex, item){
  const dur = Math.max(0, Math.floor(+item.durationSec||0));
  if(dur<=0) return null;
  const name = item.name ? ('Effet: '+item.name) : 'Effet consommable';
  const tId = timerCreate(S, name, dur);
  timerStart(S, tId); masterPlay(S);
  const eff = { id:newId('ef'), pIndex, itemId:item.id, timerId:tId, name, mods: (item.mods||{}) };
  if(!Array.isArray(S.effects)) S.effects=[]; S.effects.push(eff);
  save(S);
  return eff;
}
export function cancelEffect(S, effId){
  const e = (S.effects||[]).find(x=> x.id===effId);
  if(!e) return false;
  timerPause(S, e.timerId);
  const t = (S.timers||[]).find(x=>x.id===e.timerId);
  if(t){ t.remaining=0; t.running=false; }
  save(S); return true;
}
export function ensurePlayerEffects(S, p){ if(!p.effects) p.effects=[]; return p.effects; }

export function isCooldownActive(S, p, itemId){
  ensurePlayerCooldowns(S,p);
  const tid = p.cooldowns[itemId];
  if(!tid) return false;
  return timerRemaining(S, tid) > 0;
}
export function startCooldown(S, p, item){
  ensurePlayerCooldowns(S,p);
  const cd = Math.max(0, Math.floor(+item.cooldownSec||0));
  if(cd<=0) return null;
  const name = (item.name||'Item')+' — Cooldown';
  let timerId = p.cooldowns[item.id];
  if(!timerId){ timerId = timerCreate(S, name, cd); p.cooldowns[item.id] = timerId; }
  else { const t = (S.timers||[]).find(x=>x.id===timerId); if(t){ t.remaining = cd; } }
  timerStart(S, timerId); masterPlay(S); save(S);
  return timerId;
}

/* ---------------- Mods aggregation ---------------- */
export function computeEquipMods(S, p){
  const mods = { stats:{}, cats:{}, resources:{} };
  if(!p) return mods;
  ensurePlayerInv(S,p);

  // Equip
  const eq = p.inv.filter(x=>x.equipped);
  eq.forEach(slot=>{
    const item = getItemById(S, slot.itemId);
    if(!item || !item.mods) return;
    const m = item.mods || {};
    Object.entries(m.stats || {}).forEach(([k,v])=>{ mods.stats[k] = (mods.stats[k]||0) + (+v||0); });
    Object.entries(m.cats || {}).forEach(([k,v])=>{ mods.cats[k]  = (mods.cats[k] ||0) + (+v||0); });
    Object.entries(m.resources || {}).forEach(([name,rv])=>{
      const dst = (mods.resources[name] = mods.resources[name] || {max:0,start:0});
      if(rv && typeof rv === 'object'){ dst.max += +rv.max||0; dst.start += +rv.start||0; }
    });
  });

  // Effets (consommables)
  const pIndex = (S.players||[]).indexOf(p);
  (S.effects||[]).forEach(eff=>{
    if(eff.pIndex!==pIndex) return;
    if(!isEffectActive(S, eff)) return;
    const m = eff.mods || {};
    Object.entries(m.stats || {}).forEach(([k,v])=>{ mods.stats[k] = (mods.stats[k]||0) + (+v||0); });
    Object.entries(m.cats || {}).forEach(([k,v])=>{ mods.cats[k]  = (mods.cats[k] ||0) + (+v||0); });
    Object.entries(m.resources || {}).forEach(([name,rv])=>{
      const dst = (mods.resources[name] = mods.resources[name] || {max:0,start:0});
      if(rv && typeof rv === 'object'){ dst.max += +rv.max||0; dst.start += +rv.start||0; }
    });
  });

  return mods;
}



/* -------- Convenience helpers for UI & Dice -------- */
export function getEquipAndEffectMods(S, p){
  return computeEquipMods(S, p);
}
export function effectiveStatWithMods(S, p, statName, baseValue){
  baseValue = +baseValue||0;
  const m = computeEquipMods(S,p);
  return baseValue + (+m.stats[statName]||0);
}
export function effectiveCategoryWithMods(S, p, catName, baseValue){
  baseValue = +baseValue||0;
  const m = computeEquipMods(S,p);
  return baseValue + (+m.cats[catName]||0);
}

export default {
  load, get, save,
  ensureItemIds, getItemById, ensurePlayerInv, ensurePlayerCooldowns, addItemToPlayer,
  equipOne, unequipSlot,
  ensureLootbox, lootboxAdd, lootboxTake,
  // timers
  timerCreate, timerRemove, timerAdd, timerStart, timerPause, timerRemaining,
  masterPlay, masterPause, masterResume, masterStopAll, tick,
  // consumables
  createEffectFromItem, cancelEffect, isCooldownActive, startCooldown,
  // mods
  computeEquipMods
};
