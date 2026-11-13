'use strict';
const QUESTIONS = [
  'Je voudrais utiliser ce système fréquemment.',
  'Ce système est inutilement complexe.',
  'Ce système est facile à utiliser.',
  'J’aurais besoin du soutien d’un technicien pour être capable d’utiliser ce système.',
  'Les différentes fonctionnalités de ce système sont bien intégrées.',
  'Il y a trop d’incohérences dans ce système.',
  'La plupart des gens apprendront à utiliser ce système très rapidement.',
  'Ce système est très lourd à utiliser.',
  'Je me suis senti·e très en confiance en utilisant ce système.',
  'J’ai eu besoin d’apprendre beaucoup de choses avant de pouvoir utiliser ce système.'
];
const $ = id => document.getElementById(id);
const container = $('questions');
QUESTIONS.forEach((question, i) => {
  const section = document.createElement('section');
  section.className = 'question';
  section.dataset.index = String(i);
  const content = document.createElement('div');
  const number = document.createElement('span'); number.className = 'question-num'; number.textContent = `QUESTION ${String(i+1).padStart(2,'0')}`;
  const title = document.createElement('p'); title.className = 'question-title'; title.textContent = question;
  content.append(number,title);
  const controls = document.createElement('div'); controls.className = 'choices'; controls.setAttribute('role','radiogroup'); controls.setAttribute('aria-label',`Question ${i+1} : ${question}`);
  [1,2,3,4,5].forEach(v => {
    const label = document.createElement('label');
    const input = document.createElement('input'); input.type='radio'; input.name=`q${i+1}`; input.value=String(v); input.required=true; input.setAttribute('aria-label', `${v} sur 5`);
    label.append(input,document.createTextNode(String(v))); controls.append(label);
  });
  section.append(content,controls); container.append(section);
});
function answers(){ return QUESTIONS.map((_,i)=>{const c=document.querySelector(`input[name="q${i+1}"]:checked`);return c?Number(c.value):null;}); }
function updateProgress(){
  const a=answers(), count=a.filter(Number.isInteger).length;
  $('progress-label').textContent=`${count} / 10`;
  $('progress-fill').style.width=`${count*10}%`;
  $('progress-track').setAttribute('aria-valuenow',String(count));
  $('submit-btn').disabled=count!==10;
  document.querySelectorAll('.question').forEach((el,i)=>el.classList.toggle('answered',a[i]!==null));
}
$('sus-form').addEventListener('change',updateProgress);
function showError(message){ const node=$('feedback');node.textContent=message;node.className='notice error'; }
$('sus-form').addEventListener('submit',async event=>{
  event.preventDefault(); const a=answers();
  if(a.some(x=>x===null)){showError('Veuillez répondre aux 10 affirmations.');return;}
  const button=$('submit-btn');button.disabled=true;button.textContent='Enregistrement…';
  $('feedback').textContent='';$('feedback').className='';
  const body={answers:a,visit_name:$('visit').value,device:$('device').value,
    discomfort:document.querySelector('input[name="discomfort"]:checked')?.value||'Non renseigné',
    difficulties:$('difficulties').value,comment:$('comment').value,website:$('website').value};
  try{
    const response=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok || !data.ok)throw new Error(data.error||'Enregistrement impossible.');
    $('sus-form').classList.add('hidden');$('success-card').classList.remove('hidden');$('success-card').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){showError(error.message||'Erreur réseau. Réessayez.');button.disabled=false;}
  finally{button.textContent='Envoyer';}
});
$('another-btn').addEventListener('click',()=>{
  $('sus-form').reset();$('sus-form').classList.remove('hidden');$('success-card').classList.add('hidden');updateProgress();$('main').scrollIntoView({behavior:'smooth'});
});
updateProgress();
