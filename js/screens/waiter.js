// SmartTable — Waiter Screen (Task Queue with Real-time Escalation + Task Merging)
const WaiterScreen = {
  state: {
    name: null,
    restaurantId: null,
    shiftId: null,
    tasks: [],
    mergedTasks: [],
    settings: null,
    subscriptions: [],
    timer: null,
  },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('waiter');
    
    if (saved && saved.restaurantId === restaurantId) {
      this.state.name = saved.name;
      this.state.shiftId = saved.shiftId;
      this.start();
    } else {
      this.renderLogin();
    }
  },

  renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <div class="text-5xl mb-3">🤵</div>
            <h1 class="text-2xl font-playfair text-gray-800">${t('waiterLogin')}</h1>
            <p class="text-gray-500 text-sm mt-2">${t('enterName')}</p>
          </div>
          <form id="waiter-login-form" class="space-y-4">
            <input type="text" id="waiter-name" class="input-field text-center text-lg" 
              placeholder="${t('enterName')}" required maxlength="30" autofocus>
            <button type="submit" class="btn-primary w-full">${t('confirm')}</button>
          </form>
        </div>
      </div>
    `;
    
    document.getElementById('waiter-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('waiter-name').value.trim();
      if (!name) return;
      
      try {
        const shifts = await sbSelect('shifts', {
          restaurant_id: this.state.restaurantId,
          ended_at: null,
        }, { order: { column: 'started_at', ascending: false }, limit: 1 });
        
        let shiftId = null;
        if (shifts && shifts.length > 0) {
          shiftId = shifts[0].id;
          await sbInsert('shift_waiters', {
            shift_id: shiftId,
            waiter_name: name,
          });
        }
        
        await Auth.loginWaiter(name, this.state.restaurantId, shiftId);
        this.state.name = name;
        this.state.shiftId = shiftId;
        this.start();
      } catch(e) {
        Utils.toast('שגיאה: ' + e.message);
      }
    });
  },

  async start() {
    try {
      const settings = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId }, { single: true });
      this.state.settings = settings || {};
    } catch(e) { this.state.settings = {}; }
    
    await this.loadTasks();
    this.render();
    this.setupRealtime();
    this.startTimer();
  },

  async loadTasks() {
    try {
      this.state.tasks = await sbSelect('tasks', {
        restaurant_id: this.state.restaurantId,
        status: 'open',
      }, { order: { column: 'created_at', ascending: true } });
      
      // Merge tasks from the same table
      this.state.mergedTasks = this.mergeTasks(this.state.tasks);
    } catch(e) { console.error(e); this.state.tasks = []; this.state.mergedTasks = []; }
  },

  // Merge multiple open tasks from the same table into one card
  mergeTasks(tasks) {
    const tableMap = new Map();
    
    for (const task of tasks) {
      const key = task.table_id || task.table_number;
      if (tableMap.has(key)) {
        const existing = tableMap.get(key);
        existing.subTasks.push(task);
        // Use the oldest task's created_at for urgency
        if (new Date(task.created_at) < new Date(existing.earliestAt)) {
          existing.earliestAt = task.created_at;
        }
      } else {
        tableMap.set(key, {
          table_id: task.table_id,
          table_number: task.table_number,
          earliestAt: task.created_at,
          subTasks: [task],
          isClaimed: task.status === 'in_progress',
          assignedWaiter: task.assigned_waiter_name,
        });
      }
    }
    
    // Sort by earliest time (oldest first = most urgent)
    return Array.from(tableMap.values()).sort((a, b) => new Date(a.earliestAt) - new Date(b.earliestAt));
  },

  render() {
    const { name, mergedTasks, settings } = this.state;
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50 fullscreen-mode">
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-2xl mx-auto">
            <div>
              <h1 class="text-lg font-semibold">🤵 ${Utils.escape(name)}</h1>
              <p class="text-xs text-gray-400">${t('taskQueue')} · ${mergedTasks.length} ${mergedTasks.length === 1 ? 'משימה' : 'משימות'}</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="waiter-fullscreen" class="text-gray-400 hover:text-white text-sm px-2">⤢</button>
              <button id="waiter-logout" class="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg">${t('logout')}</button>
            </div>
          </div>
        </div>

        <div class="max-w-2xl mx-auto p-4 space-y-3" id="task-list">
          ${mergedTasks.length === 0 
            ? Utils.emptyState(t('noTasks'), '✅')
            : mergedTasks.map(merged => this.renderMergedTask(merged, settings)).join('')
          }
        </div>
      </div>
    `;
    
    this.attachEvents();
  },

  renderMergedTask(merged, settings) {
    const urgency = Utils.getUrgency(merged.earliestAt, settings);
    const elapsed = Math.floor(Utils.elapsedSeconds(merged.earliestAt));
    const subTasks = merged.subTasks;
    const isClaimed = merged.isClaimed;
    
    // Show all task types as icons
    const taskIcons = subTasks.map(st => CONFIG.taskTypes[st.type]?.icon || '📋').join(' ');
    const taskLabels = [...new Set(subTasks.map(st => CONFIG.taskTypes[st.type]?.label || st.type))].join(' + ');
    
    // If multiple tasks, show count badge
    const multiBadge = subTasks.length > 1 
      ? `<span class="px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">${subTasks.length}</span>` 
      : '';
    
    return `
      <div class="rounded-xl overflow-hidden shadow-md transition-all" data-merged-key="${merged.table_id || merged.table_number}">
        <div class="task-${urgency} px-4 py-3 flex items-center justify-between text-white">
          <div class="flex items-center gap-3 flex-1">
            <span class="text-2xl">${taskIcons}</span>
            <div class="flex-1">
              <div class="font-semibold flex items-center gap-2">
                ${t('tableNumber')} ${merged.table_number} ${multiBadge}
              </div>
              <div class="text-xs opacity-90">
                ${taskLabels}
              </div>
              <div class="text-xs opacity-75 mt-0.5">
                ${isClaimed ? `נלקח ע"י ${merged.assignedWaiter || ''}` : `⏱ ${Utils.formatDuration(elapsed)}`}
                ${subTasks[0]?.special_note ? ` · 📝 ${Utils.escape(subTasks[0].special_note)}` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${urgency === 'red' ? `<span class="px-2 py-1 bg-white/20 rounded text-xs font-bold animate-pulse-soft">⚠️ ${t('urgent')}</span>` : ''}
            ${isClaimed 
              ? `<button data-complete-all="${merged.table_id || merged.table_number}" class="px-4 py-2 bg-white text-gray-800 rounded-lg font-semibold text-sm active:scale-95">✓ ${t('completeTask')}</button>`
              : `<button data-claim-all="${merged.table_id || merged.table_number}" class="px-4 py-2 bg-white text-gray-800 rounded-lg font-semibold text-sm active:scale-95">${t('claimTask')}</button>`
            }
          </div>
        </div>
      </div>
    `;
  },

  attachEvents() {
    document.getElementById('waiter-logout').addEventListener('click', () => {
      Auth.clearSession('waiter');
      this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
      this.state.subscriptions = [];
      if (this.state.timer) clearInterval(this.state.timer);
      window.location.hash = '';
    });
    
    const fsBtn = document.getElementById('waiter-fullscreen');
    if (fsBtn) fsBtn.addEventListener('click', () => Utils.requestFullscreen());
    
    document.querySelectorAll('[data-claim-all]').forEach(btn => {
      btn.addEventListener('click', () => this.claimAllTasksForTable(btn.dataset.claimAll));
    });
    
    document.querySelectorAll('[data-complete-all]').forEach(btn => {
      btn.addEventListener('click', () => this.completeAllTasksForTable(btn.dataset.completeAll));
    });
  },

  async claimAllTasksForTable(tableKey) {
    const tasks = this.state.tasks.filter(t => 
      (t.table_id || t.table_number) == tableKey && t.status === 'open'
    );
    
    for (const task of tasks) {
      const responseSeconds = Math.floor(Utils.elapsedSeconds(task.created_at));
      try {
        await sbUpdate('tasks', { id: task.id }, {
          status: 'in_progress',
          assigned_waiter_name: this.state.name,
          claimed_at: new Date().toISOString(),
          response_seconds: responseSeconds,
        });
      } catch(e) { console.error(e); }
    }
    
    Utils.toast(t('taskClaimed'));
    Utils.vibrate(50);
    await this.loadTasks();
    this.render();
  },

  async completeAllTasksForTable(tableKey) {
    const tasks = this.state.tasks.filter(t => 
      (t.table_id || t.table_number) == tableKey && t.status === 'in_progress'
    );
    
    for (const task of tasks) {
      try {
        await sbUpdate('tasks', { id: task.id }, {
          status: 'done',
          completed_at: new Date().toISOString(),
        });
      } catch(e) { console.error(e); }
    }
    
    Utils.toast(t('taskCompleted'));
    Utils.vibrate([100, 50, 100]);
    await this.loadTasks();
    this.render();
  },

  setupRealtime() {
    this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
    this.state.subscriptions = [];
    
    const sub = sbSubscribeTasks(this.state.restaurantId, async () => {
      await this.loadTasks();
      this.render();
    });
    this.state.subscriptions.push(sub);
  },

  startTimer() {
    if (this.state.timer) clearInterval(this.state.timer);
    this.state.timer = setInterval(() => {
      if (this.state.mergedTasks.length === 0) return;
      // Re-render to update elapsed times and urgency colors
      const list = document.getElementById('task-list');
      if (list) this.render();
    }, 5000);
  },
};
