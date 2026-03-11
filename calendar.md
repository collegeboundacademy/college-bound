---
layout: page
permalink: /calendar
---

<div class="space-y-6 py-8">
  <div class="max-w-4xl mx-auto">
    <div class="bg-slate-900 text-slate-100 p-6 rounded">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-semibold">Planner Calendar</h1>
      <div>
    <button id="todayBtn" class="px-3 py-1 bg-slate-700 text-white rounded mr-2">Today</button>
    <a href="{{ '/statspage' | relative_url }}" class="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200">Back to Stats</a>
      </div>
    </div>

    <div class="bg-slate-800 p-4 rounded shadow ring-1 ring-black/20">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
      <button id="prevMonth" class="px-3 py-1 bg-slate-700 text-slate-100 rounded">&larr;</button>
      <div id="monthLabel" class="text-lg font-medium text-slate-100"></div>
      <button id="nextMonth" class="px-3 py-1 bg-slate-700 text-slate-100 rounded">&rarr;</button>
        </div>
        <div>
      <button id="clearAll" class="px-3 py-1 bg-red-700 text-white rounded">Clear all events</button>
        </div>
      </div>

      <div id="calendar" class="grid grid-cols-7 gap-1">
        <!-- Weekday headers and day cells will be injected here -->
      </div>
    </div>

    <div id="note" class="mt-4 text-sm text-slate-300">Click any date to add an event. Events are stored in your browser localStorage only.</div>
    </div>
  </div>
</div>

<!-- Modal -->
<div id="modal" class="fixed inset-0 bg-black/40 hidden items-center justify-center p-4">
  <div class="bg-slate-800 w-full max-w-lg rounded shadow-lg p-4 text-slate-100 ring-1 ring-black/40">
    <div class="flex justify-between items-center mb-2">
      <h2 id="modalDate" class="text-lg font-semibold">Date</h2>
      <button id="closeModal" class="text-slate-300">Close</button>
    </div>
    <div id="eventsList" class="mb-4 space-y-2">
      <!-- existing events will render here -->
    </div>
    <form id="eventForm" class="space-y-3">
      <input id="eventTitle" placeholder="Event title" class="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded px-2 py-1 placeholder-slate-400" required />
      <input id="eventTime" type="time" class="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded px-2 py-1" />
      <input id="eventPrereq" placeholder="Prerequisite knowledge (e.g. SQL, Spring)" class="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded px-2 py-1" />
      <input id="eventTopics" placeholder="Topics (comma-separated, e.g. docker,ci)" class="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded px-2 py-1" />
      <input id="eventPrize" type="number" min="0" placeholder="Prize pool (USD)" class="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded px-2 py-1" />
      <textarea id="eventDesc" placeholder="Notes (optional)" class="w-full border border-slate-600 bg-slate-700 text-slate-100 rounded px-2 py-1" rows="3"></textarea>
      <div class="flex justify-end gap-2">
        <button type="button" id="addEventBtn" class="px-3 py-1 bg-slate-700 text-white rounded">Add Event</button>
      </div>
    </form>
  </div>
</div>

<script>
  // Calendar with localStorage persistence
  const KEY = 'calendar_events'; // stored as { 'YYYY-MM-DD': [ {id,title,time,desc} ] }

  // Utilities
  const pad = n => n.toString().padStart(2,'0');
  const iso = (y,m,d) => `${y}-${pad(m)}-${pad(d)}`;
  function loadEvents(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } }
  function saveEvents(obj){ localStorage.setItem(KEY, JSON.stringify(obj)); }

  // State
  let viewDate = new Date(); // current month view
  let events = loadEvents();

  // DOM
  const calendarEl = document.getElementById('calendar');
  const monthLabel = document.getElementById('monthLabel');
  const modal = document.getElementById('modal');
  const modalDateEl = document.getElementById('modalDate');
  const eventsList = document.getElementById('eventsList');
  const eventForm = document.getElementById('eventForm');
  const eventTitle = document.getElementById('eventTitle');
  const eventTime = document.getElementById('eventTime');
  const eventPrereq = document.getElementById('eventPrereq');
  const eventTopics = document.getElementById('eventTopics');
  const eventPrize = document.getElementById('eventPrize');
  const eventDesc = document.getElementById('eventDesc');
  const addEventBtn = document.getElementById('addEventBtn');

  function renderCalendar(){
    calendarEl.innerHTML = '';
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay(); // 0 Sun..6 Sat

    monthLabel.textContent = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    // weekday headers
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for(const d of days){
      const h = document.createElement('div');
      h.className = 'text-center font-medium text-sm text-slate-300 py-2';
      h.textContent = d;
      calendarEl.appendChild(h);
    }

    // blanks before first day
    for(let i=0;i<startDay;i++){
      const blank = document.createElement('div');
      blank.className = 'h-20 border p-1 bg-slate-900 border-slate-700';
      calendarEl.appendChild(blank);
    }

    for(let day = 1; day <= last.getDate(); day++){
      const date = iso(year, month+1, day);
  const cell = document.createElement('div');
  cell.className = 'h-28 border border-slate-700 p-2 bg-slate-800 flex flex-col justify-between cursor-pointer hover:bg-slate-700';
      cell.dataset.date = date;

      const top = document.createElement('div');
      top.className = 'flex justify-between items-start';
  const dnum = document.createElement('div'); dnum.className='text-sm font-medium text-slate-100'; dnum.textContent = day;
  const badge = document.createElement('div'); badge.className='text-xs text-white bg-indigo-400 rounded-full px-2 py-0.5 hidden';
      top.appendChild(dnum); top.appendChild(badge);
      cell.appendChild(top);

  const evContainer = document.createElement('div'); evContainer.className='text-xs text-slate-200';
      const todays = events[date] || [];
      if(todays.length){
        badge.textContent = String(todays.length);
        badge.classList.remove('hidden');
        todays.slice(0,2).forEach(e=>{
          const el = document.createElement('div'); el.className='truncate'; el.textContent = (e.time?e.time+' ':'') + e.title; evContainer.appendChild(el);
        });
          if(todays.length>2){ const more = document.createElement('div'); more.className='text-xs text-slate-400'; more.textContent = '…+'+(todays.length-2)+' more'; evContainer.appendChild(more); }
      }
      cell.appendChild(evContainer);

      cell.addEventListener('click', ()=> openModal(date));
      calendarEl.appendChild(cell);
    }

    // Fill trailing blanks to keep grid shape
    const totalCells = calendarEl.children.length;
    const needed = (7 - (totalCells % 7)) % 7;
  for(let i=0;i<needed;i++){ const b=document.createElement('div'); b.className='h-20 border border-slate-700 bg-slate-900'; calendarEl.appendChild(b); }
  }

  function openModal(date){
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modalDateEl.textContent = new Date(date).toLocaleDateString();
    modal.dataset.date = date;
    renderEventsList(date);
  }
  function closeModal(){ modal.classList.add('hidden'); modal.classList.remove('flex'); clearForm(); }

  function renderEventsList(date){
    eventsList.innerHTML = '';
    const list = events[date] || [];
    if(list.length===0){ eventsList.innerHTML = '<div class="text-sm text-slate-400">No events for this date yet.</div>'; return; }
    list.forEach((ev, idx)=>{
      const row = document.createElement('div'); row.className='flex items-start justify-between gap-2 p-2 border border-slate-700 rounded bg-slate-900';
      const left = document.createElement('div');
      left.innerHTML = `<div class="font-medium text-slate-100">${ev.title}</div>`;
      const meta = document.createElement('div'); meta.className='text-xs text-slate-400';
      if(ev.time) meta.innerHTML += `${ev.time} `;
      if(ev.prereq) meta.innerHTML += `• Prereq: <strong class="text-slate-200">${ev.prereq}</strong> `;
      if(ev.topics && ev.topics.length) meta.innerHTML += `• Topics: ${ev.topics.map(t=>`<span class="inline-block bg-slate-700 text-slate-200 px-2 py-0.5 rounded mr-1 text-xs">${t}</span>`).join(' ')}`;
      if(ev.prize && ev.prize>0) meta.innerHTML += ` • 🏆 $${ev.prize}`;
      const desc = document.createElement('div'); desc.className='text-xs text-slate-300 mt-1'; desc.textContent = ev.desc || '';
      left.appendChild(meta); left.appendChild(desc);
      const right = document.createElement('div');
      const del = document.createElement('button'); del.className='text-sm text-red-400'; del.textContent='Delete';
      del.addEventListener('click', ()=>{ deleteEvent(date, idx); });
      right.appendChild(del);
      row.appendChild(left); row.appendChild(right);
      eventsList.appendChild(row);
    });
  }

  function clearForm(){ eventTitle.value=''; eventTime.value=''; eventDesc.value=''; eventPrereq.value=''; eventTopics.value=''; eventPrize.value=''; }

  function addEvent(){
    const date = modal.dataset.date;
    const title = eventTitle.value.trim();
    if(!title){ alert('Please enter a title for the event.'); return; }
  const topicsRaw = eventTopics.value || '';
  const topics = topicsRaw.split(',').map(s=>s.trim()).filter(Boolean);
  const prize = parseFloat(eventPrize.value) || 0;
  const ev = { id: Date.now(), title, time: eventTime.value || '', desc: eventDesc.value || '', prereq: (eventPrereq.value||''), topics, prize };
    events[date] = events[date] || [];
    events[date].push(ev);
    saveEvents(events);
    renderEventsList(date);
    renderCalendar();
    clearForm();
  }

  function deleteEvent(date, idx){
    if(!events[date]) return;
    events[date].splice(idx,1);
    if(events[date].length===0) delete events[date];
    saveEvents(events);
    renderEventsList(date);
    renderCalendar();
  }

  // Clear all events after confirmation
  document.getElementById('clearAll').addEventListener('click', ()=>{
    if(confirm('Remove all saved events? This cannot be undone.')){ events = {}; saveEvents(events); renderCalendar(); }
  });

  document.getElementById('prevMonth').addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderCalendar(); });
  document.getElementById('nextMonth').addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderCalendar(); });
  document.getElementById('todayBtn').addEventListener('click', ()=>{ viewDate = new Date(); renderCalendar(); });
  document.getElementById('closeModal').addEventListener('click', closeModal);
  addEventBtn.addEventListener('click', addEvent);

  // Close modal on backdrop
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  // Initial render
  renderCalendar();
</script>
