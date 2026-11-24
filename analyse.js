'use strict';
const $=id=>document.getElementById(id);
const isImmersive = /^\/immersive\/?$/.test(window.location.pathname);
const resultsUrl = isImmersive ? '/immersive-results.json' : '/api/results';
const exportName = isImmersive ? 'resultats-sus-immersive' : 'resultats-sus';
const immersiveStorageKey = 'immersive-deleted-response-ids';
const immersiveDeletedIds = isImmersive ? readImmersiveDeletedIds() : null;
let rows=[];
let resultsLoaded = false;
const eraseAll = $('delete-all-responses');
const printButton = $('print-btn');

if (isImmersive) {
  const studyName = 'Meta ArtQuest VR';
  document.title = `Analyse SUS — ${studyName}`;
  document.querySelectorAll('[data-study-name]').forEach(label => { label.textContent = studyName; });
  $('results-link').removeAttribute('aria-current');
  $('immersive-link').setAttribute('aria-current', 'page');
}

function readImmersiveDeletedIds() {
  try {
    const ids = JSON.parse(sessionStorage.getItem(immersiveStorageKey));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function deleteImmersiveResponses(selection) {
  const removedIds = selection.ids ?? rows.map(row => row.id);
  for (const id of removedIds) immersiveDeletedIds.add(id);
  try {
    sessionStorage.setItem(immersiveStorageKey, JSON.stringify([...immersiveDeletedIds]));
  } catch {
    // The current page still retains the selection if browser storage is unavailable.
  }
}

function setBusy(busy) {
  $('refresh-btn').disabled = busy;
  printButton.disabled = busy || !resultsLoaded;
  eraseAll.disabled = busy || rows.length === 0;
  document.querySelectorAll('#scores-body button').forEach(button => { button.disabled = busy; });
}
const scoreOf=a=>{
  if(!Array.isArray(a)||a.length!==10||!a.every(v=>Number.isInteger(v)&&v>=1&&v<=5))return null;
  const odd=a.filter((_,i)=>i%2===0).reduce((s,v)=>s+v,0);
  const even=a.filter((_,i)=>i%2!==0).reduce((s,v)=>s+v,0);
  return {odd,even,score:(odd-even+20)*2.5};
};

function immersiveResponses(responses) {
  const visible = [];
  for (const response of responses) {
    const result = scoreOf(response.answers);
    if (result && !immersiveDeletedIds.has(response.id)) {
      visible.push({...response, odd_sum: result.odd, even_sum: result.even, score: result.score});
    }
  }
  return visible;
}

const fr=n=>Number.isInteger(n)?String(n):n.toFixed(1).replace('.',',');
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el;}
function bar(percent){const track=node('div','bar-track'),fill=node('div','bar-fill');fill.style.width=`${Math.max(0,Math.min(100,percent))}%`;track.append(fill);return track;}

function feedbackPoints(text, heading) {
  const feedback = (text || '').trim();
  if (!feedback) return [];

  // Recent responses append a bulleted block. Earlier responses store the feedback as plain text.
  const block = feedback.split(/\r?\n\r?\n/).at(-1);
  const [title, ...lines] = block.split(/\r?\n/);
  if (title !== heading) return [feedback];
  const points = lines.filter(line => line.startsWith('• ')).map(line => line.slice(2));
  return points.length ? points : [feedback];
}

function observation(row,i){
  const item=node('article','obs-item');
  const title=node('div','obs-title');title.append(node('span','',`Participant ${String(i+1).padStart(2,'0')}`),node('span','obs-meta',row.device||'Appareil non précisé'));item.append(title);
  if(row.visit_name)item.append(node('p','obs-text',`Visite : ${row.visit_name}`));
  item.append(node('p','obs-text',`Inconfort : ${row.discomfort||'Non renseigné'}`));
  if(row.difficulties)item.append(node('p','obs-text',`Inconfort et difficultés :\n${row.difficulties}`));
  if(row.comment)item.append(node('p','obs-text',`Commentaire et confort :\n${row.comment}`));
  return item;
}
function render(){
  const valid=rows.filter(r=>scoreOf(r.answers));const scores=valid.map(r=>scoreOf(r.answers).score);
  const count=valid.length,avg=count?scores.reduce((a,b)=>a+b,0)/count:null;
  const avgLabel = avg === null ? '—' : fr(Math.round(avg * 10) / 10);
  const discomfortCount = valid.filter(row => {
    const level = (row.discomfort || '').trim().toLowerCase();
    return level === 'leger' || level === 'léger' || level === 'important';
  }).length;
  $('stat-count').textContent=String(count);
  $('stat-goal').textContent=count<5?'Objectif : 5 participants':'Objectif atteint';
  $('stat-average').textContent = avgLabel;
  $('stat-best').textContent=count?fr(Math.max(...scores)):'—';
  $('stat-discomfort').textContent = String(discomfortCount);
  $('print-average').textContent = avgLabel;
  $('print-score-fill').style.width = `${avg ?? 0}%`;
  $('print-count').textContent = String(count);
  $('print-discomfort-count').textContent = String(discomfortCount);
  const body=$('scores-body');body.replaceChildren();
  if(!count){const tr=node('tr');const td=node('td','empty');td.colSpan=6;td.textContent='Aucune réponse enregistrée.';tr.append(td);body.append(tr);}
  valid.forEach((r,i)=>{
    const score=scoreOf(r.answers);const tr=node('tr');
    const participant = `P${String(i+1).padStart(2,'0')}`;
    tr.append(node('td','',participant),node('td','',score.odd),node('td','',score.even),node('td','score-chip',fr(score.score)));
    const cell=node('td');const wrapper=node('div','bar-container');wrapper.append(bar(score.score));cell.append(wrapper);
    const action = node('td', 'response-action');
    const remove = node('button', 'ghost-btn delete-response', 'Supprimer');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Supprimer ${participant}`);
    remove.addEventListener('click', () => {
      const action = isImmersive ? 'Supprimer' : 'Supprimer définitivement';
      if (window.confirm(`${action} la réponse de ${participant} ?`)) {
        deleteResponses({ids:[r.id]});
      }
    });
    action.append(remove);
    tr.append(cell,action);
    body.append(tr);
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
  setBusy(true);$('refresh-btn').textContent='Chargement…';
  $('error').textContent='';$('error').className='';
  try{
    const response=await fetch(resultsUrl,{cache:'no-store'});const data=await response.json();
    if(!response.ok||!Array.isArray(data.responses))throw new Error(data.error||'Erreur de chargement.');
    rows = isImmersive ? immersiveResponses(data.responses) : data.responses;
    render();
    resultsLoaded = true;
    $('last-refresh').hidden=false;
    $('last-refresh').textContent=`Mis à jour à ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`;
    if(rows.length>=data.limit){$('error').textContent=`Affichage limité aux ${data.limit} premières réponses.`;$('error').className='notice error';}
  }catch(err){$('error').textContent=err.message||'Connexion indisponible.';$('error').className='notice error';}
  finally{setBusy(false);$('refresh-btn').textContent='↻ Actualiser';}
}
async function deleteResponses(selection) {
  if ($('refresh-btn').disabled) return;
  setBusy(true);
  $('error').className = '';
  $('error').textContent = 'Suppression…';
  try {
    if (isImmersive) {
      deleteImmersiveResponses(selection);
    } else {
      const response = await fetch('/api/admin', {
        method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify(selection)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Suppression impossible.');
    }
    rows = selection.ids ? rows.filter(row => !selection.ids.includes(row.id)) : [];
    render();
    await refresh();
  } catch (error) {
    $('error').className = 'notice error';
    $('error').textContent = error.message || 'Suppression impossible.';
  } finally {
    setBusy(false);
  }
}

eraseAll.addEventListener('click', () => {
  const action = isImmersive ? 'Suppression' : 'Suppression définitive';
  const confirmation = window.prompt(`${action} de toutes les réponses. Saisissez SUPPRIMER TOUT pour confirmer.`);
  if (confirmation === 'SUPPRIMER TOUT') deleteResponses({confirmation});
});

function saveFile(name,content,mime){
  const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('csv-btn').addEventListener('click',()=>{
  const head=['Participant','Date','Visite','Appareil',...Array.from({length:10},(_,i)=>`Q${i+1}`),'Somme impaires','Somme paires','SUS','Inconfort','Inconfort et difficultés','Commentaire et confort'];
  const cleaned=rows.filter(r=>scoreOf(r.answers));
  const data=cleaned.map((r,i)=>[ `P${String(i+1).padStart(2,'0')}`,r.created_at||'',r.visit_name||'',r.device||'',...r.answers,scoreOf(r.answers).odd,scoreOf(r.answers).even,scoreOf(r.answers).score,r.discomfort||'',r.difficulties||'',r.comment||'' ]);
  const escape=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
  const csv='\uFEFF'+[head,...data].map(row=>row.map(escape).join(';')).join('\r\n');
  saveFile(`${exportName}.csv`,csv,'text/csv;charset=utf-8');
});
$('json-btn').addEventListener('click',()=>saveFile(`${exportName}.json`,JSON.stringify({exported_at:new Date().toISOString(),responses:rows},null,2),'application/json'));
$('refresh-btn').addEventListener('click',refresh);
printButton.addEventListener('click', () => window.print());
window.addEventListener('beforeprint', () => {
  const date = $('print-date');
  const now = new Date();
  date.dateTime = now.toISOString();
  date.textContent = `Édité le ${now.toLocaleString('fr-FR', {dateStyle:'long', timeStyle:'short'})}`;

  const valid = rows.filter(row => scoreOf(row.answers));
  const comfort = valid.flatMap(row => feedbackPoints(row.comment, 'Points de confort'));
  const discomfort = valid.flatMap(row => feedbackPoints(row.difficulties, 'Points d’inconfort'));
  $('print-comfort').replaceChildren(...comfort.map(point => node('li', '', point)));
  $('print-discomfort').replaceChildren(...discomfort.map(point => node('li', '', point)));
  $('print-status').textContent = $('error').textContent || (resultsLoaded ? '' : 'Chargement des résultats…');
});
refresh();
