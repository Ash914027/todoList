// Simple Kanban Todo with drag & drop, localStorage cache and optional MySQL-backed API sync
const COLUMNS = ['backlog','not-started','in-progress','done'];

const API_BASE = (function(){
  // Attempt to read a configured API base from a meta tag if present
  const m = document.querySelector('meta[name="api-base"]');
  return m ? m.content : 'http://127.0.0.1:5500/index.html';
})();

function genId(){return Date.now().toString(36) + Math.random().toString(36).slice(2,8)}

let tasks = [];
let unsynced = new Set(); // ids that need syncing

function setSyncStatus(cls, text){
  const el = document.getElementById('syncStatus');
  if(!el) return;
  el.className = '';
  if(cls) el.classList.add(cls);
  el.textContent = text;
}

async function fetchTasksFromServer(){
  try{
    setSyncStatus('syncing','● Syncing...');
    const res = await fetch(API_BASE + '/api/tasks');
    if(!res.ok) throw new Error('network');
    const data = await res.json();
    tasks = data.map(d => ({id:d.id,title:d.title,desc:d.desc,column:d.column}));
    saveTasks();
    setSyncStatus('online','● Online');
    return true;
  }catch(err){
    console.warn('fetch failed, using local cache',err);
    setSyncStatus('', '● Offline');
    return false;
  }
}

function loadTasks(){
  try{
    const raw = localStorage.getItem('kanban_tasks');
    if(!raw) return [];
    return JSON.parse(raw);
  }catch(e){
    console.error('load error',e);
    return [];
  }
}

function saveTasks(){
  localStorage.setItem('kanban_tasks', JSON.stringify(tasks));
}

function render(){
  COLUMNS.forEach(col => {
    const container = document.getElementById(col);
    container.innerHTML = '';
    const colTasks = tasks.filter(t => t.column === col);
    colTasks.forEach(t => container.appendChild(makeCard(t)));
  });
}

function makeCard(task){
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.dataset.id = task.id;

  el.innerHTML = `
    <div class="meta">
      <div class="title"></div>
      ${task.desc ? `<div class="desc"></div>` : ''}
    </div>
    <div class="actions">
      <button class="edit">✏️</button>
      <button class="del">🗑️</button>
    </div>`;

  el.querySelector('.title').textContent = task.title || '(no title)';
  if(task.desc){ el.querySelector('.desc').textContent = task.desc }

  el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', task.id);
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));

  el.querySelector('.del').addEventListener('click', async () => {
    tasks = tasks.filter(x => x.id !== task.id);
    unsynced.delete(task.id);
    saveTasks(); render();
    // attempt server delete
    try{
      const res = await fetch(API_BASE + '/api/tasks/' + encodeURIComponent(task.id), {method:'DELETE'});
      if(!res.ok) throw new Error('delete failed');
    }catch(e){
      console.warn('delete failed, will retry on next sync');
      unsynced.add(task.id);
    }
  });

  el.querySelector('.edit').addEventListener('click', async () => {
    const newTitle = prompt('Edit task title', task.title);
    if(newTitle !== null){
      task.title = newTitle.trim();
      saveTasks(); render();
      try{
        const res = await fetch(API_BASE + '/api/tasks/' + encodeURIComponent(task.id), {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(task)});
        if(!res.ok) throw new Error('update failed');
      }catch(e){
        console.warn('update failed, will retry');
        unsynced.add(task.id);
      }
    }
  });

  // show unsynced marker
  if(unsynced.has(task.id)){
    const badge = document.createElement('div'); badge.textContent = 'unsynced'; badge.style.fontSize='11px'; badge.style.color='#ffd59e'; el.appendChild(badge);
  }

  return el;
}

// Setup drag/drop on lists
function initDragDrop(){
  COLUMNS.forEach(col => {
    const list = document.getElementById(col);
    list.addEventListener('dragover', e => {
      e.preventDefault();
      list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
    list.addEventListener('drop', async e => {
      e.preventDefault();
      list.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const task = tasks.find(t => t.id === id);
      if(task){
        task.column = col;
        saveTasks(); render();
        try{
          const res = await fetch(API_BASE + '/api/tasks/' + encodeURIComponent(task.id), {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(task)});
          if(!res.ok) throw new Error('update failed');
        }catch(err){
          console.warn('move failed, will retry later',err);
          unsynced.add(task.id);
          setSyncStatus('', '● Offline');
        }
      }
    });
  });
}

// Add form
function initForm(){
  const form = document.getElementById('addForm');
  const title = document.getElementById('title');
  const select = document.getElementById('columnSelect');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const t = title.value.trim();
    if(!t) return;
    const newTask = {id: genId(), title: t, column: select.value};
    tasks.push(newTask);
    saveTasks(); render();
    title.value = '';
    title.focus();

    // try to send to server
    try{
      const res = await fetch(API_BASE + '/api/tasks', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newTask)});
      if(!res.ok) throw new Error('create failed');
      unsynced.delete(newTask.id);
      setSyncStatus('online','● Online');
    }catch(err){
      console.warn('create failed, saved locally',err);
      unsynced.add(newTask.id);
      setSyncStatus('', '● Offline');
    }
  });
}

// Periodic sync attempt for unsynced items
async function syncPending(){
  if(unsynced.size === 0) return;
  setSyncStatus('syncing','● Syncing...');
  for(const id of Array.from(unsynced)){
    const t = tasks.find(x => x.id === id);
    if(!t){
      // was deleted locally, attempt delete remotely
      try{ await fetch(API_BASE + '/api/tasks/' + encodeURIComponent(id), {method:'DELETE'}); unsynced.delete(id); }catch(e){/*keep*/}
      continue;
    }
    try{
      const res = await fetch(API_BASE + '/api/tasks/' + encodeURIComponent(id), {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(t)});
      if(res.ok){ unsynced.delete(id); }
      else {
        // try create if not exists
        const c = await fetch(API_BASE + '/api/tasks', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(t)});
        if(c.ok) unsynced.delete(id);
      }
    }catch(e){ console.warn('sync pending failed for',id,e); }
  }
  setSyncStatus(unsynced.size? '': 'online', unsynced.size? `● Offline (${unsynced.size} unsynced)` : '● Online');
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  initForm();
  initDragDrop();
  // load from local cache first
  tasks = loadTasks();
  // try fetch from server, if successful it will overwrite local cache
  await fetchTasksFromServer();
  render();
  // periodically try to sync pending changes
  setInterval(syncPending, 5000);
});
