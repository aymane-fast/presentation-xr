'use strict';

const byId = id => document.getElementById(id);
const login = byId('admin-login');
const list = byId('admin-list');
const table = byId('admin-rows');
const status = byId('admin-status');
const password = byId('admin-password');
const selectPage = byId('select-page');
const selectedButton = byId('delete-selected');
const allButton = byId('delete-all');
const nextButton = byId('admin-next');
let credential = '';
let responses = [];
let nextBefore = null;
let busy = false;

const checkboxes = () => [...table.querySelectorAll('input[type="checkbox"]')];

function updateControls() {
  const boxes = checkboxes();
  const checked = boxes.filter(box => box.checked).length;
  selectPage.checked = checked > 0 && checked === boxes.length;
  selectPage.indeterminate = checked > 0 && checked < boxes.length;
  selectPage.disabled = busy || !boxes.length;
  boxes.forEach(box => { box.disabled = busy; });
  selectedButton.disabled = busy || !checked;
  allButton.disabled = busy || list.hidden;
  nextButton.hidden = nextBefore === null;
  nextButton.disabled = busy;
  byId('admin-refresh').disabled = busy;
  byId('admin-lock').disabled = busy;
  login.querySelector('button').disabled = busy;
}

function render() {
  table.replaceChildren();
  for (const response of responses) {
    const row = table.insertRow();
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = response.id;
    box.setAttribute('aria-label', `Sélectionner la réponse ${response.id}`);
    row.insertCell().append(box);
    const date = new Date(response.created_at).toLocaleString('fr-FR');
    for (const value of [response.id, date, response.visit_name, response.device, response.score]) {
      row.insertCell().textContent = value === '' || value == null ? '—' : value;
    }
  }
}

function lock() {
  credential = '';
  password.value = '';
  responses = [];
  nextBefore = null;
  table.replaceChildren();
  list.hidden = true;
  login.hidden = false;
}

async function request(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options, headers:{Authorization:`Bearer ${credential}`, 'Content-Type':'application/json'}
  });
  if (response.status === 401) lock();
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Opération impossible.');
  return data;
}

async function load(before = null) {
  const data = await request(before === null ? '' : `?before=${before}`);
  responses = data.responses;
  nextBefore = data.nextBefore;
  render();
  list.hidden = false;
  login.hidden = true;
  status.textContent = responses.length ? '' : 'Aucune réponse sur cette page.';
}

async function run(action) {
  if (busy) return;
  busy = true;
  status.textContent = 'Chargement…';
  updateControls();
  try { await action(); }
  catch (error) { status.textContent = error.message; }
  finally { busy = false; updateControls(); }
}

function remove(body) {
  return run(async () => {
    const {deleted} = await request('', {method:'DELETE', body:JSON.stringify(body)});
    responses = [];
    nextBefore = null;
    table.replaceChildren();
    const message = deleted === null ? 'Suppression terminée.' : `Réponses supprimées : ${deleted}.`;
    try { await load(); }
    catch { status.textContent = `${message} Actualisez pour recharger la liste.`; return; }
    status.textContent = message;
  });
}

login.addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  credential = password.value;
  password.value = '';
  run(() => load());
});
byId('admin-lock').addEventListener('click', () => { lock(); status.textContent = ''; });
byId('admin-refresh').addEventListener('click', () => run(() => load()));
nextButton.addEventListener('click', () => run(() => load(nextBefore)));
table.addEventListener('change', updateControls);
selectPage.addEventListener('change', () => {
  checkboxes().forEach(box => { box.checked = selectPage.checked; });
  updateControls();
});
selectedButton.addEventListener('click', () => {
  const ids = checkboxes().filter(box => box.checked).map(box => Number(box.value));
  if (ids.length && window.confirm(`Supprimer définitivement les réponses sélectionnées (${ids.length}) ?`)) remove({ids});
});
allButton.addEventListener('click', () => {
  const confirmation = window.prompt('Suppression définitive de toutes les réponses. Saisissez SUPPRIMER TOUT pour confirmer.');
  if (confirmation === 'SUPPRIMER TOUT') remove({confirmation});
});
