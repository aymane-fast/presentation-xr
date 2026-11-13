'use strict';
const $=id=>document.getElementById(id);
let rows=[];
const scoreOf=a=>{
  if(!Array.isArray(a)||a.length!==10||!a.every(v=>Number.isInteger(v)&&v>=1&&v<=5))return null;
  const odd=a.filter((_,i)=>i%2===0).reduce((s,v)=>s+v,0);
  const even=a.filter((_,i)=>i%2!==0).reduce((s,v)=>s+v,0);
  return {odd,even,score:(odd-even+20)*2.5};
};
const fr=n=>Number.isInteger(n)?String(n):n.toFixed(1).replace('.',',');
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;}
function bar(percent){const track=node('div','bar-track'),fill=node('div','bar-fill');fill.style.width=`${Math.max(0,Math.min(100,percent))}%`;track.append(fill);return track;}
function observation(row,i){
  const item=node('article','obs-item');
  const title=node('div','obs-title');title.append(node('span','',`Participant ${String(i+1).padStart(2,'0')}`),node('span','obs-meta',row.device||'Appareil non précisé'));item.append(title);
  if(row.visit_name)item.append(node('p','obs-text',`Visite : ${row.visit_name}`));
  item.append(node('p','obs-text',`Inconfort : ${row.discomfort||'Non renseigné'}`));
  if(row.difficulties)item.append(node('p','obs-text',`Difficultés : ${row.difficulties}`));
  if(row.comment)item.append(node('p','obs-text',`Commentaire : ${row.comment}`));
  return item;
}
function render(){
  const valid=rows.filter(r=>scoreOf(r.answers));const scores=valid.map(r=>scoreOf(r.answers).score);
  const count=valid.length,avg=count?scores.reduce((a,b)=>a+b,0)/count:null;
  $('stat-count').textContent=String(count);
  $('stat-goal').textContent=count<5?'Objectif : 5 participants':'Objectif atteint';
  $('stat-average').textContent=avg===null?'—':fr(Math.round(avg*10)/10);
  $('stat-best').textContent=count?fr(Math.max(...scores)):'—';
  $('stat-discomfort').textContent=String(valid.filter(r=>r.discomfort==='Léger'||r.discomfort==='Important').length);
  const body=$('scores-body');body.replaceChildren();
  if(!count){const tr=node('tr');const td=node('td','empty');td.colSpan=5;td.textContent='Aucune réponse enregistrée.';tr.append(td);body.append(tr);}
  valid.forEach((r,i)=>{
    const score=scoreOf(r.answers);const tr=node('tr');
    tr.append(node('td','',`P${String(i+1).padStart(2,'0')}`),node('td','',score.odd),node('td','',score.even),node('td','score-chip',fr(score.score)));
    const cell=node('td');const wrapper=node('div','bar-container');wrapper.append(bar(score.score));cell.append(wrapper);tr.append(cell);body.append(tr);
  });
  const d=$('distribution');d.replaceChildren();
  [[0,50,'0–49'],[50,68,'50–67'],[68,81,'68–80'],[81,101,'81–100']].forEach(([min,max,label])=>{
    const n=scores.filter(v=>v>=min&&v<max).length;const row=node('div','dist-row');row.append(node('span','',label));row.append(bar(count?100*n/count:0));row.append(node('strong','',n));d.append(row);
  });
  const questions=$('question-bars');questions.replaceChildren();
  Array.from({length:10},(_,i)=>{
    const mean=count?valid.reduce((sum,r)=>sum+(i%2===0?r.answers[i]-1:5-r.answers[i]),0)/count:null;
    const row=node('div','dist-row');row.append(node('span','',`Question ${i+1}`));row.append(bar(mean===null?0:mean/4*100));row.append(node('strong','',mean===null?'—':fr(Math.round(mean*10)/10)));questions.append(row);
  });
  const obs=$('observations');obs.replaceChildren();
  const observed=valid.map((r,i)=>({r,i})).filter(x=>x.r.difficulties||x.r.comment||x.r.discomfort!=='Non renseigné'||x.r.visit_name);
  if(!observed.length)obs.append(node('div','empty','Aucune observation.'));
  observed.forEach(({r,i})=>obs.append(observation(r,i)));
  $('csv-btn').disabled=$('json-btn').disabled=count===0;
}
async function refresh(){
  $('refresh-btn').disabled=true;$('refresh-btn').textContent='Chargement…';
  $('error').textContent='';$('error').className='';
  try{
    const response=await fetch('/api/results',{cache:'no-store'});const data=await response.json();
    if(!response.ok||!Array.isArray(data.responses))throw new Error(data.error||'Erreur de chargement.');
    rows=data.responses;render();
    $('last-refresh').hidden=false;
    $('last-refresh').textContent=`Mis à jour à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
    if(rows.length>=data.limit){$('error').textContent=`Affichage limité aux ${data.limit} premières réponses.`;$('error').className='notice error';}
  }catch(err){$('error').textContent=err.message||'Connexion indisponible.';$('error').className='notice error';}
  finally{$('refresh-btn').disabled=false;$('refresh-btn').textContent='↻ Actualiser';}
}
function saveFile(name,content,mime){
  const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('csv-btn').addEventListener('click',()=>{
  const head=['Participant','Date','Visite','Appareil',...Array.from({length:10},(_,i)=>`Q${i+1}`),'Somme impaires','Somme paires','SUS','Inconfort','Difficultés','Commentaire'];
  const cleaned=rows.filter(r=>scoreOf(r.answers));
  const data=cleaned.map((r,i)=>[ `P${String(i+1).padStart(2,'0')}`,r.created_at||'',r.visit_name||'',r.device||'',...r.answers,scoreOf(r.answers).odd,scoreOf(r.answers).even,scoreOf(r.answers).score,r.discomfort||'',r.difficulties||'',r.comment||'' ]);
  const escape=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
  const csv='\uFEFF'+[head,...data].map(row=>row.map(escape).join(';')).join('\r\n');
  saveFile('resultats-sus.csv',csv,'text/csv;charset=utf-8');
});
$('json-btn').addEventListener('click',()=>saveFile('resultats-sus.json',JSON.stringify({exported_at:new Date().toISOString(),responses:rows},null,2),'application/json'));
$('refresh-btn').addEventListener('click',refresh);
refresh();
