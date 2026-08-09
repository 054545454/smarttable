// SmartTable — Waiter Screen (Smart Dispatcher, Optimistic UI, Escalation)
const WaiterScreen = {
  state: { name: null, restaurantId: null, shiftId: null, tasks: [], mergedTasks: [], settings: null, subscriptions: [], timer: null },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('waiter');
    if (saved && saved.restaurantId === restaurantId) { this.state.name = saved.name; this.state.shiftId = saved.shiftId; this.start(); }
    else this.renderLogin();
  },

  renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center theme-luxury p-6 screen-enter" style="background:var(--bg)">
        <div class="w-full max-w-sm animate-spring-bounce">
          <div class="text-center mb-8">
            <div class="text-5xl mb-3 animate-spring-in">🤵</div>
            <h1 class="text-2xl font-playfair gold-shine" style="color:var(--accent)">${t('waiterLogin')}</h1>
            <p class="text-sm mt-2" style="color:var(--text-muted)">${t('enterName')}</p>
          </div>
          <form id="waiter-login-form" class="space-y-4">
            <input type="text" id="waiter-name" class="input-field text-center text-lg" placeholder="${t('enterName')}" required maxlength="30" autofocus>
            <button type="submit" class="btn-primary w-full">${t('confirm')}</button>
          </form>
        </div>
      </div>`;
    document.getElementById('waiter-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('waiter-name').value.trim();
      if (!name) return;
      try {
        const shifts = await sbSelect('shifts', { restaurant_id: this.state.restaurantId, ended_at: null }, { order: { column: 'started_at', ascending: false }, limit: 1 });
        let shiftId = null;
        if (shifts && shifts.length > 0) { shiftId = shifts[0].id; await sbInsert('shift_waiters', { shift_id: shiftId, waiter_name: name, joined_at: new Date().toISOString() }); }
        await Auth.loginWaiter(name, this.state.restaurantId, shiftId);
        this.state.name = name; this.state.shiftId = shiftId; this.start();
      } catch(e) { Utils.toast('שגיאה: ' + e.message); }
    });
  },

  async start() {
    try { const s = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId }, { single: true }); this.state.settings = s || {}; } catch(e) { this.state.settings = {}; }
    await this.loadTasks(); this.render(); this.setupRealtime(); this.startTimer();
  },

  async loadTasks() {
    try {
      this.state.tasks = await sbSelect('tasks', { restaurant_id: this.state.restaurantId, status: 'open' }, { order: { column: 'created_at', ascending: true } });
      this.state.mergedTasks = this.mergeTasks(this.state.tasks);
    } catch(e) { this.state.tasks = []; this.state.mergedTasks = []; }
  },

  mergeTasks(tasks) {
    const map = new Map();
    for (const task of tasks) {
      const key = task.table_id || task.table_number;
      if (map.has(key)) { const ex = map.get(key); ex.subTasks.push(task); if (new Date(task.created_at) < new Date(ex.earliestAt)) ex.earliestAt = task.created_at; }
      else map.set(key, { table_id: task.table_id, table_number: task.table_number, earliestAt: task.created_at, subTasks: [task], isClaimed: task.status === 'in_progress', assignedWaiter: task.assigned_waiter_name });
    }
    return Array.from(map.values()).sort((a, b) => new Date(a.earliestAt) - new Date(b.earliestAt));
  },

  render() {
    const { name, mergedTasks, settings } = this.state;
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen theme-luxury fullscreen-mode screen-enter" style="background:var(--bg);color:var(--text)">
        <div class="px-4 py-3 sticky top-0 z-10 shadow-lg" style="background:var(--card);border-bottom:1px solid var(--border)">
          <div class="flex items-center justify-between max-w-2xl mx-auto">
            <div>
              <h1 class="text-lg font-semibold animate-fade-in" style="color:var(--text)">🤵 ${Utils.escape(name)}</h1>
              <p class="text-xs" style="color:var(--text-muted)">${t('taskQueue')} · ${mergedTasks.length} ${mergedTasks.length === 1 ? 'משימה' : 'משימות'}</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="waiter-fullscreen" class="text-sm px-2 spring-scale" style="color:var(--text-muted)">⤢</button>
              <button id="waiter-logout" class="text-sm px-3 py-1 rounded-lg spring-scale" style="color:var(--text-muted)">${t('logout')}</button>
            </div>
          </div>
        </div>
        <div class="max-w-2xl mx-auto p-4 space-y-3" id="task-list">
          ${mergedTasks.length === 0 ? Utils.emptyState(t('noTasks'), '✅') : mergedTasks.map(m => this.renderMergedTask(m, settings)).join('')}
        </div>
      </div>`;
    this.attachEvents();
  },

  renderMergedTask(merged, settings) {
    const urgency = Utils.getUrgency(merged.earliestAt, settings);
    const elapsed = Math.floor(Utils.elapsedSeconds(merged.earliestAt));
    const subTasks = merged.subTasks;
    const isClaimed = merged.isClaimed;
    const icons = subTasks.map(st => CONFIG.taskTypes[st.type]?.icon || '📋').join(' ');
    const labels = [...new Set(subTasks.map(st => CONFIG.taskTypes[st.type]?.label || st.type))].join(' + ');
    const badge = subTasks.length > 1 ? `<span class="px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">${subTasks.length}</span>` : '';
    const isEscalated = urgency === 'red' && elapsed > 180;

    return `
      <div class="rounded-xl overflow-hidden shadow-md spring-transition animate-spring-in" data-merged-key="${merged.table_id || merged.table_number}">
        <div class="task-${urgency} ${isEscalated ? 'escalation-flash' : ''} px-4 py-3 flex items-center justify-between text-white">
          <div class="flex items-center gap-3 flex-1">
            <span class="text-2xl">${icons}</span>
            <div class="flex-1">
              <div class="font-semibold flex items-center gap-2">${t('tableNumber')} ${merged.table_number} ${badge}</div>
              <div class="text-xs opacity-90">${labels}</div>
              <div class="text-xs opacity-75 mt-0.5">
                ${isClaimed ? `🤵 נלקח ע"י ${merged.assignedWaiter||''}` : `<span data-task-time="${merged.earliestAt}">⏱ ${Utils.formatDuration(elapsed)}</span>`}
                ${subTasks[0]?.special_note ? ` · 📝 ${Utils.escape(subTasks[0].special_note)}` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${urgency === 'red' ? `<span class="px-2 py-1 bg-white/20 rounded text-xs font-bold animate-pulse-soft">⚠️ ${t('urgent')}</span>` : ''}
            ${isClaimed
              ? `<button data-complete-all="${merged.table_id || merged.table_number}" class="px-4 py-2 bg-white rounded-lg font-semibold text-sm spring-scale" style="color:#1A1A1A">✓ ${t('completeTask')}</button>`
              : `<button data-claim-all="${merged.table_id || merged.table_number}" class="px-4 py-2 bg-white rounded-lg font-semibold text-sm spring-scale" style="color:#1A1A1A">${t('claimTask')}</button>`}
          </div>
        </div>
      </div>`;
  },

  attachEvents() {
    document.getElementById('waiter-logout').addEventListener('click', () => { Auth.clearSession('waiter'); this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} }); this.state.subscriptions = []; if (this.state.timer) clearInterval(this.state.timer); window.location.hash = ''; });
    const fs = document.getElementById('waiter-fullscreen'); if (fs) fs.addEventListener('click', () => Utils.requestFullscreen());
    document.querySelectorAll('[data-claim-all]').forEach(btn => btn.addEventListener('click', () => this.claimAllTasks(btn.dataset.claimAll)));
    document.querySelectorAll('[data-complete-all]').forEach(btn => btn.addEventListener('click', () => this.completeAllTasks(btn.dataset.completeAll)));
  },

  async claimAllTasks(tableKey) {
    const tasks = this.state.tasks.filter(t => (t.table_id || t.table_number) == tableKey && t.status === 'open');
    for (const task of tasks) {
      const rs = Math.floor(Utils.elapsedSeconds(task.created_at));
      try { await sbUpdate('tasks', { id: task.id }, { status: 'in_progress', assigned_waiter_name: this.state.name, claimed_at: new Date().toISOString(), response_seconds: rs }); } catch(e) {}
    }
    Utils.toast(t('taskClaimed')); Utils.vibrate(50);
    await this.loadTasks(); this.render();
  },

  async completeAllTasks(tableKey) {
    const tasks = this.state.tasks.filter(t => (t.table_id || t.table_number) == tableKey && t.status === 'in_progress');
    for (const task of tasks) { try { await sbUpdate('tasks', { id: task.id }, { status: 'done', completed_at: new Date().toISOString() }); } catch(e) {} }
    Utils.toast(t('taskCompleted')); Utils.vibrate([100, 50, 100]);
    await this.loadTasks(); this.render();
  },

  setupRealtime() {
    this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} }); this.state.subscriptions = [];
    let lastTaskSignature = '';
    const sub = sbSubscribeTasks(this.state.restaurantId, async () => {
      await this.loadTasks();
      const sig = JSON.stringify(this.state.mergedTasks.map(m => m.table_id + ':' + m.subTasks.length + ':' + m.isClaimed + ':' + m.earliestAt));
      if (sig !== lastTaskSignature) { lastTaskSignature = sig; this.render(); }
    });
    this.state.subscriptions.push(sub);
  },

  startTimer() {
    if (this.state.timer) clearInterval(this.state.timer);
    this.state.timer = setInterval(() => {
      if (this.state.mergedTasks.length === 0) return;
      // Only update elapsed time text — no full re-render
      document.querySelectorAll('[data-task-time]').forEach(el => {
        const created = el.dataset.taskTime;
        const elapsed = Math.floor((Date.now() - new Date(created).getTime()) / 1000);
        if (!isNaN(elapsed)) el.textContent = '⏱ ' + Utils.formatDuration(elapsed);
      });
    }, 5000);
  },
};
