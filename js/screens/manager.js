// SmartTable — Manager Screen (Shift & Table Management, Task Control, Live Waiter Queue)
const ManagerScreen = {
  state: {
    restaurantId: null,
    manager: null,
    shift: null,
    tables: [],
    waiters: [],
    tasks: [],
    allShiftTasks: [],
    settings: null,
    subscriptions: [],
    timer: null,
    showAddTask: false,
  },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('manager');
    if (saved && saved.restaurant_id === restaurantId) {
      this.state.manager = saved;
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
            <div class="text-5xl mb-3">👨‍💼</div>
            <h1 class="text-2xl font-playfair text-gray-800">${t('managerLogin')}</h1>
            <p class="text-gray-500 text-sm mt-2">${t('enterPin')}</p>
          </div>
          <form id="manager-login-form" class="space-y-4">
            <div class="flex justify-center gap-2">
              <input type="password" id="pin-1" class="pin-input" maxlength="1" inputmode="numeric" autofocus>
              <input type="password" id="pin-2" class="pin-input" maxlength="1" inputmode="numeric">
              <input type="password" id="pin-3" class="pin-input" maxlength="1" inputmode="numeric">
              <input type="password" id="pin-4" class="pin-input" maxlength="1" inputmode="numeric">
            </div>
            <p id="pin-error" class="text-red-500 text-sm text-center hidden">${t('wrongPin')}</p>
            <button type="submit" class="btn-primary w-full">${t('confirm')}</button>
          </form>
          <a href="#" class="block text-center text-sm text-gray-400 mt-4">← חזור</a>
        </div>
      </div>
    `;
    ['pin-1','pin-2','pin-3','pin-4'].forEach((id,i,arr) => {
      const input = document.getElementById(id);
      input.addEventListener('input', () => { if (input.value && i < arr.length-1) document.getElementById(arr[i+1]).focus(); });
    });
    document.getElementById('manager-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = ['pin-1','pin-2','pin-3','pin-4'].map(id => document.getElementById(id).value).join('');
      if (pin.length !== 4) return;
      try {
        await Auth.loginManager(pin, this.state.restaurantId);
        this.state.manager = Auth.current;
        this.start();
      } catch(e) {
        document.getElementById('pin-error').classList.remove('hidden');
        ['pin-1','pin-2','pin-3','pin-4'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('pin-1').focus();
      }
    });
  },

  async start() {
    await this.loadSettings();
    await this.loadShift();
    await this.loadTables();
    await this.loadWaiters();
    await this.loadTasks();
    await this.loadShiftStats();
    this.render();
    this.setupRealtime();
    this.startTimer();
  },

  async loadSettings() {
    try {
      const s = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId }, { single: true });
      this.state.settings = s || {};
    } catch(e) { this.state.settings = {}; }
  },

  async loadShift() {
    try {
      const shifts = await sbSelect('shifts', { restaurant_id: this.state.restaurantId, ended_at: null }, { order: { column: 'started_at', ascending: false }, limit: 1 });
      this.state.shift = (shifts && shifts.length > 0) ? shifts[0] : null;
    } catch(e) { this.state.shift = null; }
  },

  async loadTables() {
    try {
      this.state.tables = await sbSelect('restaurant_tables', { restaurant_id: this.state.restaurantId }, { order: { column: 'table_number', ascending: true } });
    } catch(e) { this.state.tables = []; }
  },

  async loadWaiters() {
    if (!this.state.shift) { this.state.waiters = []; return; }
    try { this.state.waiters = await sbSelect('shift_waiters', { shift_id: this.state.shift.id }); }
    catch(e) { this.state.waiters = []; }
  },

  async loadTasks() {
    try {
      this.state.tasks = await sbSelect('tasks', { restaurant_id: this.state.restaurantId, status: 'open' }, { order: { column: 'created_at', ascending: true } });
    } catch(e) { this.state.tasks = []; }
  },

  async loadShiftStats() {
    if (!this.state.shift) { this.state.allShiftTasks = []; return; }
    try {
      const all = await sbSelect('tasks', { restaurant_id: this.state.restaurantId }, { order: { column: 'created_at', ascending: false } });
      const shiftStart = new Date(this.state.shift.started_at).getTime();
      this.state.allShiftTasks = all.filter(t => new Date(t.created_at).getTime() >= shiftStart);
    } catch(e) { this.state.allShiftTasks = []; }
  },

  render() {
    const { manager, shift, tables, waiters, tasks, allShiftTasks, settings } = this.state;
    const openTaskCount = tasks.length;
    const urgentCount = tasks.filter(t => Utils.getUrgency(t.created_at, settings) === 'red').length;
    const completedCount = allShiftTasks.filter(t => t.status === 'done').length;
    const cancelledCount = allShiftTasks.filter(t => t.status === 'cancelled').length;
    const totalShiftTasks = allShiftTasks.length;

    // Merge tasks by table
    const tableMap = new Map();
    for (const task of tasks) {
      const key = task.table_id || task.table_number;
      if (tableMap.has(key)) { tableMap.get(key).subTasks.push(task); }
      else {
        tableMap.set(key, {
          table_id: task.table_id, table_number: task.table_number,
          earliestAt: task.created_at, subTasks: [task],
          isClaimed: task.status === 'in_progress', assignedWaiter: task.assigned_waiter_name,
        });
      }
    }
    const mergedTasks = Array.from(tableMap.values()).sort((a,b) => new Date(a.earliestAt) - new Date(b.earliestAt));

    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50 fullscreen-mode">
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-3xl mx-auto">
            <div>
              <h1 class="text-lg font-semibold">👨‍💼 ${Utils.escape(manager?.full_name || t('managerLogin'))}</h1>
              <p class="text-xs text-gray-400">
                ${shift ? '🟢 משמרת פעילה · ' + Utils.formatTime(shift.started_at) : '⚪ אין משמרת'}
                ${openTaskCount > 0 ? ` · ${openTaskCount} פתוחות` : ''}
                ${urgentCount > 0 ? ` · ⚠️ ${urgentCount} דחופות` : ''}
              </p>
            </div>
            <button id="manager-logout" class="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg">${t('logout')}</button>
          </div>
        </div>

        <div class="max-w-3xl mx-auto p-4 space-y-4">
          <!-- Shift Control -->
          <div class="card flex items-center justify-between">
            <div>
              <h2 class="font-semibold text-gray-800">משמרת</h2>
              <p class="text-xs text-gray-400 mt-0.5">${shift ? `התחילה ${Utils.formatTime(shift.started_at)}` : 'אין משמרת פעילה'}</p>
            </div>
            ${shift
              ? `<button id="close-shift" class="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm active:scale-95">${t('closeShift')}</button>`
              : `<button id="open-shift" class="btn-primary text-sm">${t('openShift')}</button>`}
          </div>

          ${shift ? `
            <div class="card flex items-center justify-between">
              <div><h2 class="font-semibold text-gray-800">${t('busyMode')}</h2><p class="text-xs text-gray-400 mt-0.5">במצב עומס, כל המשימות מוצגות לכל המלצרים</p></div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="busy-toggle" class="sr-only peer" ${shift.is_busy_mode ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-gold after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          ` : ''}

          <!-- Shift Stats -->
          ${shift ? `
            <div class="grid grid-cols-4 gap-3">
              <div class="card text-center"><div class="text-2xl font-bold text-orange-500">${openTaskCount}</div><div class="text-xs text-gray-500 mt-1">פתוחות</div></div>
              <div class="card text-center"><div class="text-2xl font-bold text-red-500">${urgentCount}</div><div class="text-xs text-gray-500 mt-1">דחופות</div></div>
              <div class="card text-center"><div class="text-2xl font-bold text-green-500">${completedCount}</div><div class="text-xs text-gray-500 mt-1">הושלמו</div></div>
              <div class="card text-center"><div class="text-2xl font-bold text-blue-500">${waiters.length}</div><div class="text-xs text-gray-500 mt-1">מלצרים</div></div>
            </div>

            <!-- Add Task -->
            <button id="add-task-btn" class="btn-primary w-full">➕ הוסף משימה לשולחן</button>

            ${this.state.showAddTask ? `
              <div class="card">
                <h3 class="font-semibold text-gray-800 mb-3">➕ משימה חדשה</h3>
                <form id="add-task-form" class="space-y-3">
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-sm text-gray-600 mb-1 block">סוג משימה</label>
                      <select id="task-type" class="input-field">
                        <option value="call_waiter">🔔 קריאת מלצר</option>
                        <option value="water">💧 מים</option>
                        <option value="bill">🧾 חשבון</option>
                        <option value="wine_menu">🍷 תפריט יינות</option>
                        <option value="dessert_menu">🍰 תפריט קינוחים</option>
                        <option value="special">📝 בקשה מיוחדת</option>
                      </select>
                    </div>
                    <div>
                      <label class="text-sm text-gray-600 mb-1 block">שולחן</label>
                      <select id="task-table" class="input-field">
                        ${tables.map(tb => `<option value="${tb.id}" data-num="${tb.table_number}">שולחן ${tb.table_number}</option>`).join('')}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="text-sm text-gray-600 mb-1 block">הערה (אופציונלי)</label>
                    <input type="text" id="task-note" class="input-field" placeholder="הערה מיוחדת...">
                  </div>
                  <div class="flex gap-2">
                    <button type="submit" class="btn-primary flex-1">צור משימה</button>
                    <button type="button" id="cancel-add-task" class="btn-secondary">ביטול</button>
                  </div>
                </form>
              </div>
            ` : ''}

            <!-- Waiter Queue -->
            ${mergedTasks.length > 0 ? `
              <div class="card">
                <div class="flex items-center justify-between mb-3">
                  <h2 class="font-semibold text-gray-800">📋 תור משימות (כמו מסך מלצר)</h2>
                </div>
                <div class="space-y-2">
                  ${mergedTasks.map(merged => {
                    const urgency = Utils.getUrgency(merged.earliestAt, settings);
                    const elapsed = Math.floor(Utils.elapsedSeconds(merged.earliestAt));
                    const subTasks = merged.subTasks;
                    const taskIcons = subTasks.map(st => CONFIG.taskTypes[st.type]?.icon || '📋').join(' ');
                    const taskLabels = [...new Set(subTasks.map(st => CONFIG.taskTypes[st.type]?.label || st.type))].join(' + ');
                    const multiBadge = subTasks.length > 1 ? `<span class="px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">${subTasks.length}</span>` : '';
                    return `
                      <div class="task-${urgency} px-4 py-3 rounded-xl flex items-center justify-between text-white">
                        <div class="flex items-center gap-3 flex-1">
                          <span class="text-2xl">${taskIcons}</span>
                          <div class="flex-1">
                            <div class="font-semibold flex items-center gap-2">שולחן ${merged.table_number} ${multiBadge}</div>
                            <div class="text-xs opacity-90">${taskLabels}</div>
                            <div class="text-xs opacity-75 mt-0.5">
                              ${merged.isClaimed ? `נלקח ע"י ${merged.assignedWaiter || ''}` : `⏱ ${Utils.formatDuration(elapsed)}`}
                              ${subTasks[0]?.special_note ? ` · 📝 ${Utils.escape(subTasks[0].special_note)}` : ''}
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          ${urgency === 'red' ? `<span class="px-2 py-1 bg-white/20 rounded text-xs font-bold animate-pulse-soft">⚠️ דחוף</span>` : ''}
                          <button data-cancel-task="${merged.table_id || merged.table_number}" class="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm">✖ בטל</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : `
              <div class="card text-center py-6"><p class="text-gray-400">✅ אין משימות פתוחות כרגע</p></div>
            `}

            <!-- Shift Summary -->
            ${totalShiftTasks > 0 ? `
              <div class="card">
                <h3 class="font-semibold text-gray-700 mb-2">📊 סיכום משמרת</h3>
                <div class="flex justify-around text-center">
                  <div><div class="text-lg font-bold text-gray-700">${totalShiftTasks}</div><div class="text-xs text-gray-400">סה"כ</div></div>
                  <div><div class="text-lg font-bold text-green-500">${completedCount}</div><div class="text-xs text-gray-400">הושלמו</div></div>
                  <div><div class="text-lg font-bold text-red-500">${cancelledCount}</div><div class="text-xs text-gray-400">בוטלו</div></div>
                </div>
              </div>
            ` : ''}
          ` : `
            <div class="grid grid-cols-1 gap-3">
              <div class="card text-center"><div class="text-2xl font-bold text-blue-500">${waiters.length}</div><div class="text-xs text-gray-500 mt-1">מלצרים</div></div>
            </div>
          `}

          <!-- Tables -->
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-gray-800">${t('tables')} (${tables.length})</h2>
              <button id="open-all-tables" class="text-xs text-gold hover:underline">פתח הכל</button>
            </div>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              ${tables.map(table => this.renderTable(table)).join('')}
            </div>
          </div>

          <!-- Waiters -->
          ${shift ? `
            <div class="card">
              <h2 class="font-semibold text-gray-800 mb-3">${t('waiters')} (${waiters.length})</h2>
              ${waiters.length === 0
                ? '<p class="text-gray-400 text-sm">אין מלצרים במשמרת. המלצרים נכנסים דרך הלינק שלהם.</p>'
                : `<div class="space-y-2">${waiters.map(w => `
                  <div class="flex items-center gap-2 py-1">
                    <span class="w-2 h-2 rounded-full bg-green-500"></span>
                    <span class="text-sm text-gray-700">${Utils.escape(w.waiter_name)}</span>
                    <span class="text-xs text-gray-400 mr-auto">${Utils.formatTime(w.joined_at)}</span>
                  </div>
                `).join('')}</div>`}
            </div>
          ` : ''}
        </div>
      </div>
    `;
    this.attachEvents();
  },

  renderTable(table) {
    const isOpen = table.is_open;
    return `
      <div class="rounded-xl p-3 text-center transition-all cursor-pointer ${isOpen ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-200'}"
        data-table-id="${table.id}" data-table-open="${isOpen}">
        <div class="text-2xl mb-1">${isOpen ? '🍽️' : '🪑'}</div>
        <div class="text-sm font-semibold text-gray-700">${t('tableNumber')} ${table.table_number}</div>
        ${isOpen ? `<div class="mt-1 flex justify-center gap-1"><button data-reset-scratch="${table.id}" class="text-xs px-2 py-1 bg-gold text-white rounded">🎁 ${t('resetScratch')}</button></div>` : ''}
      </div>
    `;
  },

  attachEvents() {
    document.getElementById('manager-logout').addEventListener('click', () => { Auth.clearSession('manager'); this.cleanup(); window.location.hash = ''; });
    const openBtn = document.getElementById('open-shift'); if (openBtn) openBtn.addEventListener('click', () => this.openShift());
    const closeBtn = document.getElementById('close-shift'); if (closeBtn) closeBtn.addEventListener('click', () => this.closeShift());
    const busyToggle = document.getElementById('busy-toggle'); if (busyToggle) busyToggle.addEventListener('change', () => this.toggleBusy(busyToggle.checked));
    const openAll = document.getElementById('open-all-tables'); if (openAll) openAll.addEventListener('click', () => this.openAllTables());
    const addTaskBtn = document.getElementById('add-task-btn'); if (addTaskBtn) addTaskBtn.addEventListener('click', () => { this.state.showAddTask = true; this.render(); });
    const cancelAddTask = document.getElementById('cancel-add-task'); if (cancelAddTask) cancelAddTask.addEventListener('click', () => { this.state.showAddTask = false; this.render(); });
    const addTaskForm = document.getElementById('add-task-form'); if (addTaskForm) addTaskForm.addEventListener('submit', (e) => this.createTask(e));
    document.querySelectorAll('[data-cancel-task]').forEach(btn => btn.addEventListener('click', () => this.cancelTasksForTable(btn.dataset.cancelTask)));
    document.querySelectorAll('[data-table-id]').forEach(el => el.addEventListener('click', (e) => { if (e.target.hasAttribute('data-reset-scratch')) return; this.toggleTable(el.dataset.tableId, el.dataset.tableOpen === 'true'); }));
    document.querySelectorAll('[data-reset-scratch]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); this.resetScratch(btn.dataset.resetScratch); }));
  },

  async createTask(e) {
    e.preventDefault();
    const type = document.getElementById('task-type').value;
    const tableSelect = document.getElementById('task-table');
    const tableId = tableSelect.value;
    const tableNumber = tableSelect.options[tableSelect.selectedIndex].dataset.num;
    const note = document.getElementById('task-note').value.trim();
    try {
      await sbInsert('tasks', {
        restaurant_id: this.state.restaurantId, shift_id: this.state.shift?.id || null,
        type, table_id: tableId, table_number: parseInt(tableNumber),
        status: 'open', priority: 'normal', special_note: note || null,
        created_at: new Date().toISOString(),
      });
      Utils.toast('✅ משימה נוצרה');
      this.state.showAddTask = false;
      await this.loadTasks(); await this.loadShiftStats(); this.render();
    } catch(e) { Utils.toast('שגיאה: ' + e.message); }
  },

  async cancelTasksForTable(tableKey) {
    const tasksToCancel = this.state.tasks.filter(t => (t.table_id || t.table_number) == tableKey && t.status === 'open');
    for (const task of tasksToCancel) {
      try { await sbUpdate('tasks', { id: task.id }, { status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: this.state.manager?.full_name || 'manager' }); } catch(e) {}
    }
    Utils.toast('✖ משימות בוטלו');
    await this.loadTasks(); await this.loadShiftStats(); this.render();
  },

  async openShift() {
    try {
      const result = await sbInsert('shifts', { restaurant_id: this.state.restaurantId, manager_id: this.state.manager.id, manager_name: this.state.manager.full_name, is_busy_mode: false });
      this.state.shift = Array.isArray(result) ? result[0] : result;
      Utils.toast(t('openShift') + ' ✓');
      await this.loadWaiters(); await this.loadShiftStats(); this.render();
    } catch(e) { Utils.toast('שגיאה'); }
  },

  async closeShift() {
    try {
      await sbUpdate('shifts', { id: this.state.shift.id }, { ended_at: new Date().toISOString() });
      this.state.shift = null; this.state.waiters = []; this.state.allShiftTasks = [];
      Utils.toast(t('closeShift') + ' ✓'); this.render();
    } catch(e) { Utils.toast('שגיאה'); }
  },

  async toggleBusy(isBusy) {
    try { await sbUpdate('shifts', { id: this.state.shift.id }, { is_busy_mode: isBusy }); this.state.shift.is_busy_mode = isBusy; } catch(e) {}
  },

  async toggleTable(tableId, currentOpen) {
    try { await sbUpdate('restaurant_tables', { id: tableId }, { is_open: !currentOpen }); const t = this.state.tables.find(t => t.id === tableId); if (t) t.is_open = !currentOpen; this.render(); } catch(e) {}
  },

  async resetScratch(tableId) {
    try { await sbUpdate('restaurant_tables', { id: tableId }, { scratch_used: false }); Utils.toast('🎁 מתנה אופסה'); } catch(e) {}
  },

  async openAllTables() {
    for (const table of this.state.tables) { if (!table.is_open) { try { await sbUpdate('restaurant_tables', { id: table.id }, { is_open: true }); } catch(e) {} } }
    this.state.tables.forEach(t => t.is_open = true); this.render();
  },

  cleanup() {
    this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
    this.state.subscriptions = [];
    if (this.state.timer) clearInterval(this.state.timer);
  },

  setupRealtime() {
    this.cleanup();
    const sub = sbSubscribePoll(this.state.restaurantId, async () => {
      await this.loadTasks(); await this.loadWaiters(); await this.loadShiftStats(); this.render();
    });
    this.state.subscriptions.push(sub);
  },

  startTimer() {
    if (this.state.timer) clearInterval(this.state.timer);
    this.state.timer = setInterval(() => { if (this.state.tasks.length > 0 || this.state.shift) this.render(); }, 5000);
  },
};
