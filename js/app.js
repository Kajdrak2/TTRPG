import * as State from './core/state.js';
import { download } from './core/ui.js';
import { renderAdminApp } from './views/admin.js';
import { renderPlayerApp } from './views/player.js';

/* ---------- Safe DOM getters ---------- */
const qs = (id)=> document.getElementById(id);

/* Grabs (may be null; we guard everywhere) */
let app = qs('app');
let roleSel = qs('roleSel');
let viewSel = qs('viewSel');
let rolePill = qs('rolePill');
let viewPill = qs('viewPill');
let gameId = qs('gameId');
let exportBtn = qs('exportBtn');
let importFile = qs('importFile');
let viewToggle = qs('viewToggle');
let homeBtn = qs('homeBtn');

/* Create Home FAB if missing */
function ensureHomeFab(){
  let btn = qs('homeBtn');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'homeBtn';
    btn.className = 'fab';
    btn.style.right = '24px';
    btn.style.bottom = '84px';
    btn.style.background = 'linear-gradient(135deg,#a78bfa,#6366f1)';
    btn.textContent = '🏠 Accueil';
    document.body.appendChild(btn);
  }
  return btn;
}
homeBtn = ensureHomeFab();

/* Ensure app root exists */
if(!app){
  app = document.createElement('div');
  app.id = 'app';
  document.body.appendChild(app);
}

/* ---------- Load State ---------- */
let S = State.load();
if (gameId) gameId.textContent = S.id || '';

/* ---------- Storage keys ---------- */
/* ---------- First-visit / explicit #accueil handling ---------- */
(function(){
  try{
    var HASH_HOME = (location && location.hash === '#accueil');
    var firstVisit = (!localStorage.getItem(LS_ROLE) && !localStorage.getItem(LS_VIEW) && !(S && S.id));
    if (HASH_HOME || firstVisit){
      localStorage.setItem(LS_HOME, '1'); // force Home
    }
  }catch(e){}
})();

const LS_VIEW = 'jdr_ui_view';
const LS_ROLE = 'jdr_role';
const LS_HOME = 'jdr_home'; // '1' to show home

function currentView(){ return localStorage.getItem(LS_VIEW) || 'admin'; }
function saveView(v){ localStorage.setItem(LS_VIEW, v); }
function currentRole(){ return localStorage.getItem(LS_ROLE) || 'admin'; }
function saveRole(r){ localStorage.setItem(LS_ROLE, r); }

/* ---------- createNew fallback (if core/state.js doesn't provide it) ---------- */
function createNewLocal(name){
  const id = 'G' + Math.random().toString(36).slice(2,8).toUpperCase();
  const now = Date.now();
  return {
    id,
    name: name || 'Campagne',
    createdAt: now,
    settings: {
      adminSecret: Math.random().toString(36).slice(2,8).toUpperCase(),
      useRaces: false,
      useTribes: false,
      useClasses: false,
      useCategoryPoints: false,
      pointsPerLevel: '0',
      stats: [],           // pas de caracs par défaut
      categories: []
    },
    dice: { methods: [] },
    resourcesGlobal: [{name:'HP', max:10},{name:'MP', max:10}],
    races: [], tribes: [], classes: [], players: []
  };
}

/* ---------- Points par niveau ---------- */
function safeEvalFormula(formula, level){
  const text = String(formula||'0').trim();
  if(!/^[0-9+\-*/()\slevel]+$/.test(text)) return 0;
  try{
    const expr = text.replace(/level/g, String(level));
    // eslint-disable-next-line no-new-func
    const f = new Function('return ('+expr+');');
    const v = +f(); return Number.isFinite(v)? v : 0;
  }catch{ return 0; }
}
function totalPointsForLevel(S, level){
  const f = S.settings?.pointsPerLevel || '0';
  const L = Math.max(1, +level||1);
  let sum = 0;
  for(let i=1;i<=L;i++) sum += safeEvalFormula(f, i);
  return Math.max(0, Math.floor(sum));
}
function ensureLevelPointsGranted(S){
  (S.players||[]).forEach(p=>{
    const total = totalPointsForLevel(S, p.level||1);
    const prev = +((p.levelPointsGranted)||0);
    const delta = total - prev;
    if(delta!==0){
      p.bonusPoints = Math.max(0, (+p.bonusPoints||0) + delta);
      p.levelPointsGranted = total;
    }
  });
  State.save(S);
}

/* ---------- Views ---------- */
function applyView(v){
  if(viewSel) viewSel.value = v;
  saveView(v);
  render();
  updateToggle();
}
function updateToggle(){
  const v = viewSel ? viewSel.value : 'admin';
  const role = currentRole();
  if(viewToggle){
    if(role==='player'){
      viewToggle.style.display='none';
      if(exportBtn) exportBtn.style.display='none';
      if(rolePill) rolePill.style.display='none';
      if(viewPill) viewPill.style.display='none';
    }else{
      viewToggle.style.display='block';
      if(exportBtn) exportBtn.style.display='inline-block';
      if(rolePill) rolePill.style.display='none';
      if(viewPill) viewPill.style.display='none';
    }
    viewToggle.textContent = (v === 'admin') ? '👤 Passer Joueur' : '🛠️ Passer Admin';
    viewToggle.setAttribute('aria-label', viewToggle.textContent);
  }
}

/* ---------- Home (création / rejoindre) ---------- */
function renderHome(){
  app.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'panel';
  box.innerHTML = `<div class="list-item"><div><b>Bienvenue dans JDR Studio</b></div></div>
  <div class="grid2">
    <div class="panel">
      <div class="list-item"><div><b>Créer une partie</b></div></div>
      <div class="list">
        <div class="list-item small"><div>Nom de partie</div><div><input id="home-name" class="input" placeholder="Ma Campagne"></div></div>
        <div class="list-item small"><div></div><div><button id="home-create" class="btn">Créer (Admin)</button></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="list-item"><div><b>Rejoindre une partie</b></div></div>
      <div class="list">
        <div class="list-item small"><div>Code partie</div><div><input id="home-code" class="input" placeholder="Ex: GAB123"></div></div>
        <div class="list-item small"><div>Code admin</div><div><input id="home-admin" class="input" placeholder="Ex: 7F2KQZ"></div></div>
        <div class="list-item small"><div class="row gap"><button id="home-join-admin" class="btn">Rejoindre (MJ)</button><button id="home-join" class="btn">Rejoindre (Joueur)</button></div><div></div></div>
      </div>
      <div class="muted small">Sans serveur, le code charge seulement la partie <b>locale</b>. Pour multi-appareils, on ajoutera un backend.</div>
    </div>
  </div>`;
  app.appendChild(box);

  // Cacher les toggles pendant l'accueil
  try{
    const t = document.getElementById('viewToggle'); if(t) t.style.display='none';
    const ex = document.getElementById('exportBtn'); if(ex) ex.style.display='none';
  }catch{}

  const createBtn = qs('home-create');
  const joinBtn = qs('home-join');
  const joinAdminBtn = qs('home-join-admin');

  if(createBtn){
    createBtn.onclick = ()=>{
      const name = (qs('home-name')?.value||'').trim() || 'Campagne';
      try{
        S = (typeof State.createNew === 'function') ? State.createNew(name) : createNewLocal(name);
        if(!S || !S.id) throw new Error('createNew failed');
        if(!S.settings.adminSecret){ S.settings.adminSecret = Math.random().toString(36).slice(2,8).toUpperCase(); }
        State.save(S);
        saveRole('admin');
        localStorage.removeItem(LS_HOME);
        if(gameId) gameId.textContent = S.id;
        alert(`Partie créée !\nCode partie: ${S.id}\nCode admin: ${S.settings.adminSecret}\n\nGarde ces codes.`);
        applyView('admin');
      }catch(err){
        console.error(err);
        alert('Impossible de créer la partie. Réessaie après recharger la page.');
      }
    };
  }

  if(joinBtn){
    joinBtn.onclick = ()=>{
      const code = (qs('home-code')?.value||'').trim();
      if(!code){ alert('Code requis'); return; }
      // local only: on se contente d'enregistrer l'id
      S.id = code; State.save(S);
      saveRole('player');
      localStorage.removeItem(LS_HOME);
      if(gameId) gameId.textContent = S.id;
      applyView('player');
    };
  }

  if(joinAdminBtn){
    joinAdminBtn.onclick = ()=>{
      const code = (qs('home-code')?.value||'').trim();
      const admin = (qs('home-admin')?.value||'').trim();
      if(!admin){ alert('Code admin requis'); return; }
      if(code && code !== (S.id||'')){
        alert('Sans serveur, vous ne pouvez reprendre que la partie locale déjà chargée. Code courant: '+(S.id||'—'));
        return;
      }
      const secret = S?.settings?.adminSecret || '';
      if(!secret){
        alert('Cette partie n’a pas encore de code admin (ancien état). Passe par Admin → Système pour en définir un.');
        return;
      }
      if(admin !== secret){
        alert('Code admin invalide pour la partie courante.');
        return;
      }
      saveRole('admin');
      localStorage.removeItem(LS_HOME);
      if(gameId) gameId.textContent = S.id || '';
      applyView('admin');
    };
  }
}

/* ---------- Render ---------- */
function render(){
  const role = currentRole();
  const goHome = localStorage.getItem(LS_HOME)==='1';
  if(goHome){ renderHome(); return; }

  ensureLevelPointsGranted(S);

  app.innerHTML='';
  const v = (role==='player') ? 'player' : (viewSel ? viewSel.value : 'admin');
  if(viewSel) viewSel.value = v;
  if(v==='admin'){ app.appendChild(renderAdminApp(S)); }
  else{ app.appendChild(renderPlayerApp(S)); }
}

/* ---------- Hide old selectors ---------- */
if(rolePill) rolePill.style.display='none';
if(viewPill) viewPill.style.display='none';

/* ---------- Bindings (guarded) ---------- */
if(roleSel) roleSel.onchange = render;
if(viewSel) viewSel.onchange = render;
if(viewToggle){
  viewToggle.addEventListener('click', ()=>{
    const role = currentRole();
    if(role==='player') return; // no toggle for players
    const next = (viewSel && viewSel.value === 'admin') ? 'player' : 'admin';
    applyView(next);
  });
}
if(homeBtn){
  homeBtn.addEventListener('click', ()=>{
    localStorage.setItem(LS_HOME, '1');
    renderHome();
  });
}
if(exportBtn){
  exportBtn.onclick = () => { download(`jdr_${S.id}.json`, JSON.stringify(S, null, 2)); };
}
if(importFile){
  importFile.onchange = (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => { try{ S = JSON.parse(r.result); State.save(S); location.reload(); }catch{ alert('Import invalide'); } };
    r.readAsText(f);
  };
}

/* ---------- Init ---------- */
const initialView = currentView();
if(viewSel) viewSel.value = initialView;
if(!localStorage.getItem(LS_ROLE)) saveRole('admin'); // default
if(localStorage.getItem(LS_HOME)==='1'){ renderHome(); } else { render(); }
updateToggle();
