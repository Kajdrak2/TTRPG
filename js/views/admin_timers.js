// TTRPG/js/views/admin_timers.js — Build 4
// Fixes: ESM-safe but *no* in-file imports. Uses global window.State to avoid dev-server MIME hiccups.
// Make sure js/core/state.js is included before this file in your HTML/app loader.

const State = (typeof window!=='undefined' && window.State) ? window.State : null;
const el = (t, cls)=>{ const n=document.createElement(t); if(cls) n.className=cls; return n; };

function needState(){
  if(!State) throw new Error('State module non disponible (window.State manquant). Assure-toi que js/core/state.js est chargé avant ce panneau.');
  return State;
}

function fmt(sec){
  sec = Math.max(0, Math.floor(+sec||0));
  const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
  const pad=n=> String(n).padStart(2,'0');
  return (h>0? h+':':'')+pad(m)+':'+pad(s);
}

function rowTimer(S, t){
  const row = el('div','list-item small row'); row.style.gap='8px'; row.style.flexWrap='wrap';
  const name = el('input','input'); name.value=t.name||''; name.placeholder='Nom';
  name.onchange=()=>{ t.name=name.value||'Timer'; needState().save(S); };

  const time = el('div','muted'); time.textContent=fmt(t.remaining);
  const add10 = el('button','btn small'); add10.textContent='+10s';
  const sub10 = el('button','btn small'); sub10.textContent='-10s';
  const start = el('button','btn small'); start.textContent='Start';
  const pause = el('button','btn small'); pause.textContent='Pause';
  const del   = el('button','btn small danger'); del.textContent='Suppr';

  add10.onclick=()=> needState().timerAdd(S, t.id, 10);
  sub10.onclick=()=> needState().timerAdd(S, t.id, -10);
  start.onclick =()=> needState().timerStart(S, t.id);
  pause.onclick =()=> needState().timerPause(S, t.id);
  del.onclick   =()=> needState().timerRemove(S, t.id);

  row.append(name, time, add10, sub10, start, pause, del);

  const it = setInterval(()=>{
    if(!document.body.contains(row)){ clearInterval(it); return; }
    const tt = (S.timers||[]).find(x=>x.id===t.id);
    if(!tt){ row.remove(); clearInterval(it); return; }
    time.textContent = fmt(tt.remaining);
  }, 1000);

  return row;
}

export default function renderAdminTimers(S){
  const root = el('div');
  const head = el('div','panel');
  head.innerHTML = '<div class="list-item"><div><b>Timers</b></div></div>';
  const bar = el('div','list-item row'); bar.style.gap='8px'; bar.style.flexWrap='wrap';

  const nm = el('input','input'); nm.placeholder='Nom du timer';
  const sec = el('input','input'); sec.type='number'; sec.min='0'; sec.placeholder='Secondes';
  const mk = el('button','btn'); mk.textContent='Créer';
  const play = el('button','btn'); play.textContent='Master ▶';
  const pause = el('button','btn'); pause.textContent='Master ⏸';
  const resume = el('button','btn'); resume.textContent='Master ⏵';
  const stop = el('button','btn danger'); stop.textContent='Tout stop';

  mk.onclick     =()=>{ const id=needState().timerCreate(S, nm.value||'Timer', +sec.value||0); needState().timerStart(S,id); needState().masterPlay(S); nm.value=''; sec.value=''; };
  play.onclick   =()=> needState().masterPlay(S);
  pause.onclick  =()=> needState().masterPause(S);
  resume.onclick =()=> needState().masterResume(S);
  stop.onclick   =()=> needState().masterStopAll(S);

  bar.append(nm, sec, mk, play, pause, resume, stop);
  head.append(bar);

  const listPanel = el('div','panel');
  const list = el('div','list');
  listPanel.append(list);

  function render(){
    list.innerHTML='';
    (S.timers||[]).forEach(t=> list.append(rowTimer(S,t)));
  }
  render();

  const it = setInterval(()=>{
    if(!document.body.contains(root)){ clearInterval(it); return; }
    render();
  }, 1500);

  root.append(head, listPanel);
  return root;
}
if(typeof window!=='undefined') window.renderAdminTimers = (S)=>renderAdminTimers(S);
