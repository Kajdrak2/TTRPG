// js/views/admin_systems.js
import { el } from '../core/ui.js';
import { save } from '../core/state.js';

export function renderSystems(S){
  const box = el('div');
  box.innerHTML = `<h3>Système</h3>
  <div class="grid3">
    <label class="list-item small"><div>Activer Races</div><input type="checkbox" id="useR"></label>
    <label class="list-item small"><div>Activer Tribus</div><input type="checkbox" id="useT"></label>
    <label class="list-item small"><div>Activer Classes</div><input type="checkbox" id="useC"></label>
  </div>
  <div class="list mt8">
    <label class="list-item small"><div>Points de Catégorie (activer)</div><input type="checkbox" id="useCatPts"></label>
  </div>
  <div class="panel">
    <div class="list-item small"><div>Points par niveau (formule)</div><input id="ppl" class="input" placeholder="ex: 2 ou level+1" style="max-width:200px"></div>
    <div class="muted small">Les points par niveau concernent les <b>caractéristiques</b>. Les points de <b>catégorie</b> sont gérés séparément (bonus par entité et par joueur si activé).</div>
  </div>
  <div class="panel">
    <div class="list-item"><div><b>Méthodes de jets</b></div></div>
    <div id="m-list" class="list"></div>
    <div class="grid3 mt8">
      <input class="input" id="m-label" placeholder="Nom de la méthode (ex. Test FOR)">
      <input class="input" id="m-form" placeholder="Formule (ex. 1d20 + {FOR} + {Combat})">
      <button class="btn" id="m-add">Ajouter</button>
    </div>
    <div class="muted small mt8">Variables possibles : toutes les <b>caractéristiques</b>, toutes les <b>catégories</b> (si activées), et <b>{level}</b>.</div>
  </div>`;

  setTimeout(()=>{
    // toggles
    const useR=box.querySelector('#useR'); const useT=box.querySelector('#useT'); const useC=box.querySelector('#useC');
    useR.checked=!!S.settings.useRaces; useT.checked=!!S.settings.useTribes; useC.checked=!!S.settings.useClasses;
    useR.onchange=()=>{S.settings.useRaces=useR.checked; save(S);} ;
    useT.onchange=()=>{S.settings.useTribes=useT.checked; save(S);} ;
    useC.onchange=()=>{S.settings.useClasses=useC.checked; save(S);} ;

    const useCat=box.querySelector('#useCatPts'); useCat.checked=!!S.settings.useCategoryPoints;
    useCat.onchange=()=>{ S.settings.useCategoryPoints=useCat.checked; save(S); };

    // points per level
    const ppl=box.querySelector('#ppl'); ppl.value=S.settings.pointsPerLevel||'2'; ppl.oninput=()=>{S.settings.pointsPerLevel=ppl.value; save(S);};

    // dice methods
    const list = box.querySelector('#m-list');
    function renderMethods(){
      list.innerHTML='';
      (S.dice?.methods||[]).forEach((m,idx)=>{
        const row = el('div','list-item small');
        const l = el('input','input'); l.value=m.label||''; l.oninput=()=>{ m.label=l.value; save(S); };
        const f = el('input','input'); f.value=m.formula||''; f.oninput=()=>{ m.formula=f.value; save(S); };
        const del = el('button','btn danger small'); del.textContent='Supprimer'; del.onclick=()=>{ S.dice.methods.splice(idx,1); save(S); renderMethods(); };
        row.append(el('div').appendChild(l)||l, el('div').appendChild(f)||f, del);
        list.appendChild(row);
      });
    }
    renderMethods();

    box.querySelector('#m-add').onclick=()=>{
      const l=(box.querySelector('#m-label').value||'').trim(); const f=(box.querySelector('#m-form').value||'').trim();
      if(!l||!f) return;
      (S.dice.methods=S.dice.methods||[]).push({label:l, formula:f});
      save(S); renderMethods();
      box.querySelector('#m-label').value=''; box.querySelector('#m-form').value='';
    };
  });

  return box;
}
export default renderSystems;
