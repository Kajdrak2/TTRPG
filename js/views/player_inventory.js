// js/views/player_inventory.js — 6.2.11
// Badge 'Objets' calé SUR LE DOM: s'allume uniquement s'il existe des lignes de loot visibles.
// Pas d'impact sur le state ni les autres fonctionnalités.
import * as State from '../core/state.js';
import { el } from '../core/ui.js';

// ---------- Helpers UI ----------
function fmt(secs){
  secs = Math.max(0, Math.floor(+secs||0));
  const d = Math.floor(secs/86400); secs%=86400;
  const h = Math.floor(secs/3600); secs%=3600;
  const m = Math.floor(secs/60); const s = secs%60;
  const pad = n=> String(n).padStart(2,'0');
  if(d>0) return `${d}j ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  return `${h}h ${pad(m)}m ${pad(s)}s`;
}
const unequippedCount = (p,id)=> (p.inv||[]).filter(s=> s.itemId===id && !s.equipped).length;

function modsSummary(mods){
  if(!mods) return '';
  const s = mods.stats||{}, c = mods.cats||{}, r = mods.resources||{};
  const S = Object.keys(s).filter(k=> (+s[k]||0)!==0).map(k=> `${k} ${(s[k]>0?'+':'')}${s[k]}`);
  const C = Object.keys(c).filter(k=> (+c[k]||0)!==0).map(k=> `${k} ${(c[k]>0?'+':'')}${c[k]}`);
  const R = Object.keys(r).filter(k=> r[k] && (+(r[k].max||0)!==0 || +(r[k].start||0)!==0))
              .map(k=>{ const t=r[k]; const a=`max ${(t.max>0?'+':'')}${+t.max||0}`; const b=(+(t.start||0)!==0?` / start ${(t.start>0?'+':'')}${+t.start||0}`:''); return `${k} ${a}${b}`; });
  return [S.length?`Caracs: ${S.join(', ')}`:'', C.length?`Catég.: ${C.join(', ')}`:'', R.length?`Ress.: ${R.join(', ')}`:''].filter(Boolean).join(' · ');
}

// ---------- Badge DOM pur ----------
function getObjectsTabButton(){
  return document.getElementById('tab-objets')
      || document.querySelector('.tab[data-id="p-inv"]')
      || Array.from(document.querySelectorAll('.tab')).find(b=> (b.textContent||'').trim().toLowerCase()==='objets');
}
function setObjectsBadgeDOM(show){
  const btn = getObjectsTabButton(); if(!btn) return;
  let ind = btn.querySelector('.tab-ind');
  if(!ind){
    ind = document.createElement('span');
    ind.className = 'tab-ind';
    ind.textContent = '!';
    Object.assign(ind.style, {
      position:'absolute', top:'-6px', right:'-6px', width:'16px', height:'16px',
      display:'none', borderRadius:'999px', alignItems:'center', justifyContent:'center',
      fontSize:'11px', fontWeight:'700', background:'#f59e0b', color:'#0b1220',
      boxShadow:'0 0 0 2px rgba(255,255,255,0.08)', lineHeight:'16px'
    });
    btn.style.position = 'relative';
    btn.appendChild(ind);
  }
  ind.style.display = show ? 'flex' : 'none';
  ind.dataset.visible = show ? '1' : '0';
}

// ---------- Slots ----------
function slotView(S,p,rerender){
  const wrap = el('div','panel');
  wrap.innerHTML = '<div class="list-item"><div><b>Équipé</b></div></div>';
  const list = el('div','list'); wrap.appendChild(list);
  const slots = S.settings?.slots || [];
  if(slots.length===0){
    const row = el('div','list-item small'); row.append(document.createElement('div'), document.createElement('div'));
    row.children[0].innerHTML = '<b>(aucun slot défini)</b>';
    row.children[1].textContent = '—';
    list.appendChild(row);
  }else{
    slots.forEach(sl=>{
      const row = el('div','list-item small'); row.append(document.createElement('div'), document.createElement('div'));
      row.children[0].innerHTML = `<b>${sl}</b>`;
      const right = row.children[1];
      const equipped = (p.inv||[]).filter(s=> s.equipped).map(s=> State.getItemById(S,s.itemId)).filter(Boolean).filter(it=> (it.slot||(S.settings.slots[0]||'slot'))===sl);
      if(equipped.length){
        equipped.forEach(it=>{
          const line = document.createElement('div'); line.style.display='grid'; line.style.gridTemplateColumns='1fr auto'; line.style.gap='8px'; line.style.alignItems='center';
          const left = document.createElement('div');
          const name = document.createElement('div'); name.innerHTML = `<b>${it.name}</b>`;
          const mods = document.createElement('div'); mods.className='muted small'; mods.textContent = modsSummary(it.mods||{});
          left.append(name,mods);
          const btn = document.createElement('button'); btn.className='btn small'; btn.textContent='Retirer';
          btn.onclick = ()=>{ State.unequipSlot(S,p,(it.slot||(S.settings.slots[0]||'slot'))); State.save(S); rerender&&rerender(); };
          line.append(left, btn);
          right.appendChild(line);
        });
      }else{
        right.textContent = '—';
      }
      list.appendChild(row);
    });
  }
  return wrap;
}

// ---------- Carte item ----------
function itemCard(S, p, it, onChange){
  const qty = unequippedCount(p, it.id);
  const card = el('div','panel');
  const head = el('div','list-item');
  const left = document.createElement('div'); left.innerHTML = `<b>${it.name}</b>`;
  const slot = (it && it.type==='equipment') ? (it.slot||(S.settings.slots[0]||'slot')) : null;
  const meta = it.type==='consumable' ? 'Consommable' : ('Équipement'+(slot?` — ${slot}`:''));
  const right = document.createElement('div'); right.className='muted small'; right.textContent = meta + (it.type==='equipment' ? (qty>0?` · x${qty}`:' · x0') : (qty>1?` · x${qty}`:''));
  head.append(left,right); card.appendChild(head);

  const row = el('div','list-item small');
  const desc = el('div'); desc.className='muted small'; desc.textContent = it.desc || '—';
  const actions = el('div'); actions.style.display='flex'; actions.style.gap='8px'; actions.style.flexWrap='wrap';

  const modsLine = document.createElement('div'); modsLine.className='muted small'; modsLine.textContent = modsSummary(it.mods||{});

  if(it.type==='equipment'){
    const eqBtn = document.createElement('button'); eqBtn.className='btn small'; eqBtn.textContent = 'Équiper 1';
    eqBtn.disabled = qty<=0;
    eqBtn.onclick = ()=>{ 
      const ok = State.equipOne(S,p,it.id);
      if(!ok) alert('Aucune copie non équipée.');
      State.save(S);
      onChange && onChange();
    };
    const rmBtn = document.createElement('button'); rmBtn.className='btn danger small'; rmBtn.textContent='Retirer 1';
    rmBtn.onclick = ()=>{ const idx = (p.inv||[]).findIndex(s=> s.itemId===it.id && !s.equipped); if(idx>=0){ p.inv.splice(idx,1); State.save(S); onChange && onChange(); } };
    actions.append(eqBtn, rmBtn);
  }else{
    const tid = (p.cooldowns||{})[it.id];
    const rem = tid ? State.timerRemaining(S, tid) : 0;
    const cdTxt = document.createElement('span'); cdTxt.className='muted small jdr-cd'; cdTxt.dataset.tid = tid || ''; cdTxt.textContent = tid?(`Cooldown: ${fmt(rem)}`):'';
    const useBtn = document.createElement('button'); useBtn.className='btn small'; useBtn.textContent = 'Utiliser';
    useBtn.disabled = (rem>0) || (unequippedCount(p,it.id)<=0);
    useBtn.onclick = ()=>{
      const idx = (p.inv||[]).findIndex(s=> s.itemId===it.id && !s.equipped);
      if(idx>=0){ p.inv.splice(idx,1); }
      State.createEffectFromItem(S, (S.players||[]).indexOf(p), it);
      State.startCooldown(S, p, it);
      State.save(S);
      onChange && onChange();
    };
    actions.append(useBtn, cdTxt);
  }

  const leftCol = document.createElement('div');
  leftCol.append(desc, modsLine);
  row.append(leftCol,actions); card.appendChild(row);
  return card;
}

// ---------- Rendu principal ----------
export function renderPlayerInventory(S){
  const box = el('div');
  const p = (S.players||[])[0];
  if(!p){ const warn = el('div','panel'); warn.innerHTML='<div class="list-item"><div>Pas de joueur. Va dans Admin → Joueurs.</div></div>'; return warn; }

  const tl = document.createElement('h3'); tl.textContent = 'Objets'; box.appendChild(tl);

  const slotsPanel = el('div'); box.appendChild(slotsPanel);
  const lootPanel  = el('div'); box.appendChild(lootPanel);
  const effPanel   = el('div'); box.appendChild(effPanel);
  const invPanel   = el('div'); box.appendChild(invPanel);

  function refreshBadgeFromDOM(){
    // Si au moins une ligne de loot existe dans le DOM, badge ON.
    const hasLootRow = !!lootPanel.querySelector('.jdr-loot-row');
    setObjectsBadgeDOM(hasLootRow);
  }

  function render(){
    // Slots
    slotsPanel.innerHTML=''; slotsPanel.appendChild(slotView(S,p, render));

    // Lootbox
    State.ensureLootbox && State.ensureLootbox(S);
    lootPanel.innerHTML='';
    const lootWrap = el('div','panel');
    lootWrap.innerHTML = '<div class="list-item"><div><b>Butin disponible</b></div></div>';
    const list = el('div','list'); lootWrap.appendChild(list);

    const stacks = (S.lootbox||[]).filter(st=> (+st?.qty||0)>0);
    if(stacks.length===0){
      const e=el('div','muted small'); e.style.padding='8px 12px'; e.textContent='Aucun item à récupérer.'; list.appendChild(e);
    }else{
      stacks.forEach(st=>{
        const it = State.getItemById(S, st.itemId); if(!it) return;
        const row = el('div','list-item small jdr-loot-row'); // <-- marqueur DOM
        row.append(document.createElement('div'), document.createElement('div'));
        row.children[0].innerHTML = `<b>${it.name}</b> <span class="muted small">x${st.qty}</span>`;
        const qtyI = document.createElement('input'); qtyI.type='number'; qtyI.className='input'; qtyI.style.width='80px'; qtyI.value='1';
        qtyI.min='1'; qtyI.max=String(+st.qty||1);
        qtyI.addEventListener('input', ()=>{
          let v = Math.floor(+qtyI.value||0), max = Math.max(1, +st.qty||1);
          if(v<1) v=1; if(v>max) v=max; qtyI.value = String(v);
        });
        const takeB = document.createElement('button'); takeB.className='btn small'; takeB.textContent='Prendre';
        takeB.onclick = ()=>{
          const max = Math.max(0, +st.qty||0);
          let n = Math.max(0, Math.floor(+qtyI.value||0)); if(n>max) n=max;
          const got = State.lootboxTake(S, st.itemId, n);
          for(let i=0;i<got;i++){ State.addItemToPlayer(S, p, st.itemId); }
          State.save(S);
          render(); // re-render -> mettra à jour le DOM + badge
        };
        row.children[1].append(qtyI, takeB);
        list.appendChild(row);
      });
    }
    lootPanel.appendChild(lootWrap);

    // Effets actifs
    effPanel.innerHTML='';
    (function(){
      const wrap = el('div','panel');
      wrap.innerHTML = '<div class="list-item"><div><b>Effets actifs (consommables)</b></div></div>';
      const list = el('div','list'); wrap.appendChild(list);
      const pIndex = (S.players||[]).indexOf(p);
      const effs = State.effectListForPlayer ? State.effectListForPlayer(S, pIndex) : [];
      if(!effs || effs.length===0){
        const e=el('div','muted small'); e.style.padding='8px 12px'; e.textContent='Aucun effet actif.'; list.appendChild(e);
      }else{
        effs.forEach(eff=>{
          const it = State.getItemById(S, eff.itemId);
          const row = el('div','list-item small'); row.append(document.createElement('div'), document.createElement('div'));
          const name = it ? it.name : eff.name || 'Effet';
          const rem  = State.timerRemaining(S, eff.timerId);
          const left = row.children[0];
          const title = document.createElement('div'); title.innerHTML = `<b>${name}</b> <span class="muted small jdr-eff" data-tid="${eff.timerId}">— reste ${fmt(rem)}</span>`;
          const mods  = document.createElement('div'); mods.className='muted small'; mods.textContent = modsSummary((eff.mods)||{});
          left.append(title, mods);
          const stopB = document.createElement('button'); stopB.className='btn danger small'; stopB.textContent='Annuler';
          stopB.onclick = ()=>{ State.cancelEffect(S, eff.id); State.save(S); render(); };
          row.children[1].appendChild(stopB);
          list.appendChild(row);
        });
      }
      effPanel.appendChild(wrap);
    })();

    // Inventaire (copies non équipées)
    invPanel.innerHTML='';
    const wrapInv = el('div','panel');
    wrapInv.innerHTML = '<div class="list-item"><div><b>Inventaire</b></div></div>';
    const listInv = el('div','list'); wrapInv.appendChild(listInv);
    const ownedUneq = (p.inv||[]).filter(s=> !s.equipped).map(s=> s.itemId);
    const uniq = Array.from(new Set(ownedUneq));
    if(uniq.length===0){
      const e=el('div','muted small'); e.style.padding='8px 12px'; e.textContent='Inventaire vide.'; listInv.appendChild(e);
    }else{
      uniq.forEach(id=>{ const it = State.getItemById(S,id); if(!it) return; listInv.appendChild(itemCard(S,p,it, render)); });
    }
    invPanel.appendChild(wrapInv);

    // met le badge selon le DOM actuel
    refreshBadgeFromDOM();
  }
  render();

  // tick visuel pour timers + badge dom (au cas où du loot arrive par un autre onglet)
  if(typeof window!=='undefined'){
    if(window.__JDR_INV_TICK__) clearInterval(window.__JDR_INV_TICK__);
    window.__JDR_INV_TICK__ = setInterval(()=>{
      document.querySelectorAll('.jdr-eff').forEach(span=>{
        const tid = span.dataset.tid; if(!tid) return;
        const rem = State.timerRemaining(S, tid);
        span.textContent = '— reste '+fmt(rem);
      });
      // badge DOM recalculé
      const btn = getObjectsTabButton();
      if(btn){ // seulement si les tabs existent
        const hasLootRow = !!document.querySelector('.panel .jdr-loot-row');
        setObjectsBadgeDOM(hasLootRow);
      }
    }, 1000);
  }

  return box;
}
export default renderPlayerInventory;
