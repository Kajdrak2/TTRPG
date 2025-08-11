// js/core/enemies.js — Patch 6.1a+b (Bestiaire: schéma + générateur)
// ES Module
import * as State from './state.js';

/** Assure les conteneurs bestiaire dans le state */
export function ensureEnemySchema(S){
  const s = S || (State.get && State.get()) || {};
  if(!Array.isArray(s.enemiesTemplates)) s.enemiesTemplates = [];
  if(!Array.isArray(s.enemies)) s.enemies = [];
  return s;
}

/** Copie normalisée d'un template */
export function makeTemplate(data={}){
  const tpl = {
    id: data.id || ('tpl_'+Math.random().toString(36).slice(2,9)),
    name: data.name || 'Nouvel ennemi',
    level: Number.isFinite(+data.level) ? +data.level : 1,
    stats: {...(data.stats||{})},            // { FOR:2, DEX:1, ... }
    cats: {...(data.cats||{})},              // { Combat:1, ... }
    resources: JSON.parse(JSON.stringify(data.resources||{})), // { HP:{max:10,start:10}, ... }
    loot: Array.isArray(data.loot) ? data.loot.map(l=>({...l})) : [],   // [{itemId, qtyMin, qtyMax, chance}]
    tags: Array.isArray(data.tags) ? [...data.tags] : []                // ['mort-vivant','élite']
  };
  return tpl;
}

/** CRUD TEMPLATES */
export function listTemplates(S){ ensureEnemySchema(S); return S.enemiesTemplates; }
export function addTemplate(S, data){ ensureEnemySchema(S); const tpl = makeTemplate(data); S.enemiesTemplates.push(tpl); State.save(S); return tpl; }
export function updateTemplate(S, id, patch){
  ensureEnemySchema(S);
  const i = S.enemiesTemplates.findIndex(t=> t.id===id);
  if(i<0) return false;
  S.enemiesTemplates[i] = makeTemplate({...S.enemiesTemplates[i], ...patch, id});
  State.save(S);
  return true;
}
export function removeTemplate(S, id){
  ensureEnemySchema(S);
  const i = S.enemiesTemplates.findIndex(t=> t.id===id);
  if(i<0) return false;
  S.enemiesTemplates.splice(i,1);
  State.save(S);
  return true;
}

/** INSTANCES (ennemis actifs) */
export function listEnemies(S){ ensureEnemySchema(S); return S.enemies; }
export function makeEnemyFromTemplate(S, tplId, patch={}){
  ensureEnemySchema(S);
  const tpl = S.enemiesTemplates.find(t=> t.id===tplId);
  if(!tpl) return null;
  const inst = {
    id: 'mob_'+Math.random().toString(36).slice(2,9),
    templateId: tpl.id,
    name: patch.name || tpl.name,
    level: Number.isFinite(+patch.level) ? +patch.level : +tpl.level || 1,
    stats: {...tpl.stats},
    cats: {...tpl.cats},
    resources: JSON.parse(JSON.stringify(tpl.resources||{})),
    loot: JSON.parse(JSON.stringify(tpl.loot||[])),
    tags: Array.isArray(patch.tags) ? [...patch.tags] : (tpl.tags? [...tpl.tags] : [])
  };
  S.enemies.push(inst);
  State.save(S);
  return inst;
}
export function removeEnemy(S, id){
  ensureEnemySchema(S);
  const i = S.enemies.findIndex(e=> e.id===id);
  if(i<0) return false;
  S.enemies.splice(i,1);
  State.save(S);
  return true;
}

/** Générateur rapide (6.1b) */
function matchTags(tpl, anyTags){
  if(!anyTags || anyTags.length===0) return true;
  const set = new Set((tpl.tags||[]).map(x=> String(x).toLowerCase()));
  return anyTags.some(tag=> set.has(String(tag).toLowerCase()));
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function varyValue(v, variance){
  // variance = +/- pourcentage
  const base = +v || 0;
  const p = Math.abs(+variance||0)/100;
  if(p<=0) return base;
  const delta = Math.round(base * p);
  const sign = Math.random()<0.5? -1 : +1;
  return base + sign * Math.floor(Math.random()*(delta+1));
}

/**
 * Crée plusieurs ennemis depuis les templates existants
 * opts = { qty, levelMin, levelMax, tagsStr, variancePct }
 */
export function createEnemiesBulk(S, opts={}){
  ensureEnemySchema(S);
  const qty = clamp(Math.floor(+opts.qty||1), 1, 100);
  const lmin = clamp(Math.floor(+opts.levelMin||1), 1, 999);
  const lmax = clamp(Math.floor(+opts.levelMax||lmin), lmin, 999);
  const anyTags = String(opts.tagsStr||'').split(',').map(s=>s.trim()).filter(Boolean);
  const variance = +opts.variancePct || 0;

  const pool = S.enemiesTemplates.filter(t=> matchTags(t, anyTags));
  if(pool.length===0) return {created:0, ids:[]};

  const ids = [];
  for(let i=0;i<qty;i++){
    const tpl = pool[Math.floor(Math.random()*pool.length)];
    const lvl = lmin===lmax ? lmin : (lmin + Math.floor(Math.random()*(lmax-lmin+1)));
    const inst = makeEnemyFromTemplate(S, tpl.id, { level: lvl });
    // variation légère stats/cats si demandé
    if(inst){
      if(variance){
        for(const k in inst.stats){ inst.stats[k] = varyValue(inst.stats[k], variance); }
        for(const k in inst.cats){ inst.cats[k]  = varyValue(inst.cats[k], variance); }
        // resources: varie max/start à la marge
        for(const r in inst.resources){
          const rr = inst.resources[r]||{};
          rr.max   = clamp(varyValue(+rr.max||0, variance), 0, 10**9);
          rr.start = clamp(varyValue(+rr.start||0, variance), 0, rr.max);
          inst.resources[r] = rr;
        }
      }
      ids.push(inst.id);
    }
  }
  State.save(S);
  return {created: ids.length, ids};
}

export default {
  ensureEnemySchema,
  makeTemplate, listTemplates, addTemplate, updateTemplate, removeTemplate,
  listEnemies, makeEnemyFromTemplate, removeEnemy,
  createEnemiesBulk
};
