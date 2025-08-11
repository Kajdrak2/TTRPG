// js/views/player_mj.js
import { el } from '../core/ui.js';
import { save } from '../core/state.js';

export function renderPlayerMJ(S){
  const box = el('div','panel');
  box.innerHTML = '<div class="list-item"><div><b>Interaction MJ</b></div></div><div class="inner" id="chat"></div><div class="list-item small"><div><input id="msg" class="input" placeholder="Poser une question, décrire une action…"></div><div><button id="send" class="btn">Envoyer</button></div></div>';
  const chat = box.querySelector('#chat');
  S.mjInbox = S.mjInbox||[];

  function renderChat(){
    chat.innerHTML='';
    (S.mjInbox||[]).slice().reverse().forEach(m=>{
      const row = el('div','list-item small');
      row.innerHTML = '<div><b>'+m.from+':</b> '+m.text+'</div><div class="muted small">'+new Date(m.time||Date.now()).toLocaleString()+'</div>';
      chat.appendChild(row);
    });
  }
  renderChat();

  box.querySelector('#send').onclick = ()=>{
    const v = (box.querySelector('#msg').value||'').trim(); if(!v) return;
    S.mjInbox.push({from:'Joueur', text:v, time: Date.now()});
    save(S); box.querySelector('#msg').value=''; renderChat();
    alert('Message envoyé au MJ (local).');
  };

  return box;
}
export default renderPlayerMJ;
