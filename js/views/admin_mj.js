// js/views/admin_mj.js — Build AMJ5 (Conversations + destinataires multiples + suppression locale)
import { el } from '../core/ui.js';
import { get, save } from '../core/state.js';

function nowStr(){ var d=new Date(); return d.toLocaleString(); }
function uid(){ return 'msg_'+Math.random().toString(36).slice(2,9); }
function convId(){ return 'cv_'+Math.random().toString(36).slice(2,9); }
function ensureInbox(S){ if(!Array.isArray(S.mjInbox)) S.mjInbox=[]; return S.mjInbox; }
function ensureConvs(S){
  if(!Array.isArray(S.mjConversations)) S.mjConversations = [];
  // Migration simple depuis S.mjInbox si présent
  if(S.mjConversations.length===0 && Array.isArray(S.mjInbox) && S.mjInbox.length){
    var convMap = {}; // key -> conv
    function keyFor(parts){ var a=parts.slice().sort(); return a.join('|'); }
    function getOrMake(parts){
      var k=keyFor(parts);
      if(!convMap[k]){
        var c = { id:convId(), participants:parts.slice().sort(), messages:[], createdAt:Date.now(), updatedAt:Date.now() };
        convMap[k]=c; S.mjConversations.push(c);
      }
      return convMap[k];
    }
    function participantsForMessage(m, players){
      var from = m.from || 'MJ';
      var to = (m.to||'').trim();
      if(to==='*'){
        // dupliquer vers chaque joueur connu
        players.forEach(function(pn){
          var c = getOrMake(['MJ', pn]);
          c.messages.push({ id: m.id||uid(), from:m.from, to:pn, text:m.text, time:m.time||nowStr() });
          c.updatedAt = Date.now();
        });
        return null;
      }
      if(!to){
        // si joueur -> MJ, sinon MJ -> joueur inconnu, on essaye from/to
        if(from!=='MJ') return ['MJ', from];
        // tenter d'inférer depuis texte ? trop fragile. on met MJ seul (sera invisible aux joueurs)
        return ['MJ'];
      }
      return (from==='MJ') ? ['MJ', to] : [from, 'MJ'];
    }
    var players = (S.players||[]).map(function(p){ return p && p.name; }).filter(Boolean);
    ensureInbox(S).forEach(function(m){
      var parts = participantsForMessage(m, players);
      if(parts){
        var c = getOrMake(parts);
        c.messages.push({ id: m.id||uid(), from:m.from, to:m.to, text:m.text, time:m.time||nowStr() });
        c.updatedAt = Date.now();
      }
    });
    // Optionnel: vider l'inbox legacy
    // S.mjInbox = [];
    save(S);
  }
  return S.mjConversations;
}
function allPlayerNames(S){ return (S.players||[]).map(function(p){ return p && p.name; }).filter(Boolean); }

// -------- Local hide (suppression locale via localStorage) --------
function viewerId(){ return 'MJ'; } // côté admin
function loadHide(){
  try{ return JSON.parse(localStorage.getItem('chatHide:'+viewerId())||'{}') || {}; }catch(e){ return {}; }
}
function saveHide(h){ try{ localStorage.setItem('chatHide:'+viewerId(), JSON.stringify(h||{})); }catch(e){} }
function isConvHidden(cid){ var h=loadHide(); return h && h.conversations && h.conversations[cid]; }
function isMsgHidden(mid){ var h=loadHide(); return h && h.messages && h.messages[mid]; }
function hideConv(cid){ var h=loadHide(); (h.conversations||(h.conversations={}))[cid]=true; saveHide(h); }
function hideMsg(mid){ var h=loadHide(); (h.messages||(h.messages={}))[mid]=true; saveHide(h); }
function clearAllLocal(){ saveHide({}); }

// -------- UI --------
let _root=null, _curConv=null;

function convTitle(c){
  var parts = c.participants.filter(function(x){ return x!=='MJ'; });
  return parts.length ? parts.join(', ') : 'MJ (privé)';
}
function renderConvList(S, onOpen){
  var wrap = el('div','panel');
  var head = el('div','list-item'); head.innerHTML = '<div><b>Conversations</b></div>'; wrap.appendChild(head);

  // Nouvelle conversation
  var add = el('div','list-item small');
  var left = el('div'); left.textContent='Nouvelle conversation';
  var right = el('div');
  var all = allPlayerNames(S);
  var checks = [];
  all.forEach(function(name){
    var label = document.createElement('label'); label.style.marginRight='8px';
    var cb = document.createElement('input'); cb.type='checkbox'; cb.value=name; label.appendChild(cb);
    label.appendChild(document.createTextNode(' '+name));
    checks.push(cb); right.appendChild(label);
  });
  var btn = el('button','btn small'); btn.textContent='Créer';
  btn.onclick = function(){
    var parts = ['MJ'];
    checks.forEach(function(cb){ if(cb.checked) parts.push(cb.value); });
    var uniq = Array.from(new Set(parts));
    if(uniq.length<2) return;
    var c = { id: convId(), participants: uniq.sort(), messages:[], createdAt:Date.now(), updatedAt:Date.now() };
    S.mjConversations.push(c); save(S); onOpen(c);
  };
  right.appendChild(btn);
  add.appendChild(left); add.appendChild(right); wrap.appendChild(add);

  var list = el('div','list'); wrap.appendChild(list);

  ensureConvs(S).forEach(function(c){
    if(isConvHidden(c.id)) return; // masquée localement
    var row = el('div','list-item small'); row.style.cursor='pointer';
    var left = el('div'); left.innerHTML = '<b>'+convTitle(c)+'</b>';
    var right = el('div'); var delB = el('button','btn small secondary'); delB.textContent='Masquer (local)';
    delB.onclick = function(e){ e.stopPropagation(); hideConv(c.id); render(); };
    row.appendChild(left); row.appendChild(right); right.appendChild(delB);
    row.onclick = function(){ onOpen(c); };
    list.appendChild(row);
  });

  // Outils locaux
  var tools = el('div','list-item small');
  tools.appendChild(document.createElement('div'));
  var clearB = el('button','btn secondary'); clearB.textContent='RAZ local (toutes conversations)';
  clearB.onclick = function(){ clearAllLocal(); render(); };
  tools.appendChild(clearB);
  wrap.appendChild(tools);

  return wrap;
}

function messageRowLocal(m){
  var row = el('div','list-item small');
  var left = el('div');
  var who = document.createElement('b'); who.textContent = m.from||'?'; left.appendChild(who);
  var when = el('span','muted small'); when.style.marginLeft='8px'; when.textContent = m.time||''; left.appendChild(when);
  var right = el('div'); right.textContent = m.text||'';
  var del = el('button','btn small secondary'); del.textContent='Supprimer (local)'; del.style.marginLeft='8px';
  del.onclick = function(){ hideMsg(m.id); render(); };
  row.appendChild(left); row.appendChild(right); row.appendChild(del);
  return row;
}

function renderConvDetail(S, c){
  var wrap = el('div','panel');
  var head = el('div','list-item');
  head.innerHTML = '<div><b>Conversation : '+convTitle(c)+'</b></div>';
  var right = el('div');
  var hideB = el('button','btn secondary'); hideB.textContent='Masquer cette conversation (local)';
  hideB.onclick = function(){ hideConv(c.id); render(); };
  right.appendChild(hideB);
  head.appendChild(right);
  wrap.appendChild(head);

  var list = el('div','list'); wrap.appendChild(list);
  (c.messages||[]).forEach(function(m){
    if(isMsgHidden(m.id)) return;
    list.appendChild(messageRowLocal(m));
  });

  var bar = el('div','list-item row'); bar.style.gap='8px'; bar.style.flexWrap='wrap';
  var input = document.createElement('input'); input.className='input'; input.placeholder='Votre message';
  var send = el('button','btn'); send.textContent='Envoyer';
  bar.appendChild(input); bar.appendChild(send);
  wrap.appendChild(bar);

  send.onclick = function(){
    var t = (input.value||'').trim(); if(!t) return;
    c.messages.push({ id:uid(), from:'MJ', text:t, time:nowStr() });
    c.updatedAt = Date.now();
    save(S);
    input.value='';
    render();
  };

  return wrap;
}

function render(){
  var S = get();
  ensureConvs(S);
  if(!_root) return;
  _root.innerHTML='';

  var main = el('div'); main.className = 'grid2'; // assume CSS grid2: two columns
  var left = el('div'); var right = el('div');

  left.appendChild(renderConvList(S, function(open){ _curConv = open; render(); }));
  if(_curConv){
    right.appendChild(renderConvDetail(S, _curConv));
  }else{
    var p = el('div','panel'); p.innerHTML = '<div class="list-item"><div>Selectionnez une conversation</div></div>'; right.appendChild(p);
  }
  main.appendChild(left); main.appendChild(right);
  _root.appendChild(main);
}

export function renderAdminMJ(){
  var root = el('div');
  _root = root;
  render();
  return root;
}
export default renderAdminMJ;
