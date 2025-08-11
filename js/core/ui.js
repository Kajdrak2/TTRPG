export function el(tag, cls){
  const n = document.createElement(tag);
  if(cls) n.className = cls;
  return n;
}

export function download(filename, text){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:'application/json'}));
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

export function normKey(s){
  return String(s||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,'')
    .trim();
}
