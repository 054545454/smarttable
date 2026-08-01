// SmartTable — Manager Screen (Shift & Table Management, Full Control)
const ManagerScreen = {
  state: {
    restaurantId: null,
    manager: null,
    shift: null,
    tables: [],
    waiters: [],
    tasks: [],
    settings: null,
    subscriptions: [],
    timer: null,
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
    
    ['pin-1', 'pin-2', 'pin-3', 'pin-4'].forEach((id, i, arr) => {
      const input = document.getElementById(id);
      input.addEventListener('input', () => {
        if (input.value && i < arr.length - 1) document.getElementById(arr[i + 1]).focus();
      });
    });
    
    document.getElementById('manager-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = ['pin-1', 'pin-2', 'pin-3', 'pin-4'].map(id => document.getElementById(id).value).join('');
      if (pin.length !== 4) return;
      
      try {
        await Auth.loginManager(pin, this.state.restaurantId);
        this.state.manager = Auth.current;
        this.start();
      } catch(e) {
        document.getElementById('pin-error').classList.remove('hidden');
        ['pin-1', 'pin-2', 'pin-3', 'pin-4'].forEach(id => document.getElementById(id).value = '');
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
      const shifts = await sbSelect('shifts', {
        restaurant_id: this.state.restaurantId,
        ended_at: null,
      }, { order: { column: 'started_at', ascending: false }, limit: 1 });
      this.state.shift = (shifts && shifts.length > 0) ? shifts[0] : null;
    } catch(e) { this.state.shift = null; }
  },

  async loadTables() {
    try {
      this.state.tables = await sbSelect('restaurant_tables', {
        restaurant_id: this.state.restaurantId,
      }, { order: { column: 'table_number', ascending: true } });
    } catch(e) { this.state.tables = []; }
  },

  async loadWaiters() {
    if (!this.state.shift) { this.state.waiters = []; return; }
    try {
      this.state.waiters = await sbSelect('shift_waiters', { shift_id: this.state.shift.id });
    } catch(e) { this.state.waiters = []; }
  },

  async loadTasks() {
    try {
      this.state.tasks = await sbSelect('tasks', {
        restaurant_id: this.state.restaurantId,
        status: 'open',
      }, { order: { column: 'created_at', ascending: true } });
    } catch(e) { this.state.tasks = []; }
  },

  render() {
    const { manager, shift, tables, waiters, tasks, settings } = this.state;
    const openTaskCount = tasks.length;
    const urgentCount = tasks.filter(t => Utils.getUrgency(t.created_at, settings) === 'red').length;
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50 fullscreen-mode">
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-3xl mx-auto">
            <div>
              <h1 class="text-lg font-semibold">👨‍💼 ${Utils.escape(manager?.full_name || t('managerLogin'))}</h1>
              <p class="text-xs text-gray-400">
                ${shift ? '🟢 ' + t('shiftActive') + ' · ' + Utils.formatTime(shift.started_at) : '⚪ אין משמרת'}
                ${openTaskCount > 0 ? ` · ${openTaskCount} משימות פתוחות` : ''}
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
              : `<button id="open-shift" class="btn-primary text-sm">${t('openShift')}</button>`
            }
          </div>

          <!-- Busy Mode -->
          ${shift ? `
            <div class="card flex items-center justify-between">
              <div><h2 class="font-semibold text-gray-800">${t('busyMode')}</h2><p class="text-xs text-gray-400 mt-0.5">במצב עומס, כל המשימות מוצגות לכל המלצרים</p></div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="busy-toggle" class="sr-only peer" ${shift.is_busy_mode ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-gold after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          ` : ''}

          <!-- Quick Stats -->
          <div class="grid grid-cols-3 gap-3">
            <div class="card text-center"><div class="text-2xl font-bold ${openTaskCount > 0 ? 'text-orange-500' : 'text-green-500'}">${openTaskCount}</div><div class="text-xs text-gray-500 mt-1">פתוחות</div></div>
            <div class="card text-center"><div class="text-2xl font-bold ${urgentCount > 0 ? 'text-red-500' : 'text-gray-400'}">${urgentCount}</div><div class="text-xs text-gray-500 mt-1">דחופות</div></div>
            <div class="card text-center"><div class="text-2xl font-bold text-blue-500">${waiters.length}</div><div class="text-xs text-gray-500 mt-1">מלצרים</div></div>
          </div>

          <!-- Live Task Feed -->
          ${shift && openTaskCount > 0 ? `
            <div class="card">
              <h2 class="font-semibold text-gray-800 mb-3">📋 משימות פתוחות</h2>
              <div class="space-y-2">
                ${tasks.slice(0, 10).map(task => {
                  const urgency = Utils.getUrgency(task.created_at, settings);
                  const typeInfo = CONFIG.taskTypes[task.type] || { icon: '📋', label: task.type };
                  return `
                    <div class="flex items-center gap-3 py-2 border-b last:border-0">
                      <div class="w-2 h-2 rounded-full ${urgency === 'red' ? 'bg-red-500' : urgency === 'orange' ? 'bg-orange-500' : 'bg-green-500'} ${urgency === 'red' ? 'animate-pulse' : ''}"></div>
                      <span class="text-lg">${typeInfo.icon}</span>
                      <div class="flex-1">
                        <span class="text-sm font-medium text-gray-700">${typeInfo.label} · ${t('tableNumber')} ${task.table_number}</span>
                        ${task.special_note ? `<div class="text-xs text-gray-400">📝 ${Utils.escape(task.special_note)}</div>` : ''}
                      </div>
                      <span class="text-xs text-gray-400">${Utils.formatDuration(Utils.elapsedSeconds(task.created_at))}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

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
                `).join('')}</div>`
              }
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
        ${isOpen ? `
          <div class="mt-1 flex justify-center gap-1">
            <button data-reset-scratch="${table.id}" class="text-xs px-2 py-1 bg-gold text-white rounded">🎁 ${t('resetScratch')}</button>
          </div>
        ` : ''}
      </div>
    `;
  },

  attachEvents() {
    document.getElementById('manager-logout').addEventListener('click', () => {
      Auth.clearSession('manager');
      this.cleanup();
      window.location.hash = '';
    });
    
    const openBtn = document.getElementById('open-shift');
    if (openBtn) openBtn.addEventListener('click', () => this.openShift());
    const closeBtn = document.getElementById('close-shift');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeShift());
    const busyToggle = document.getElementById('busy-toggle');
    if (busyToggle) busyToggle.addEventListener('change', () => this.toggleBusy(busyToggle.checked));
    const openAll = document.getElementById('open-all-tables');
    if (openAll) openAll.addEventListener('click', () => this.openAllTables());
    
    document.querySelectorAll('[data-table-id]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-reset-scratch')) return;
        this.toggleTable(el.dataset.tableId, el.dataset.tableOpen === 'true');
      });
    });
    
    document.querySelectorAll('[data-reset-scratch]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.resetScratch(btn.dataset.resetScratch); });
    });
  },

  async openShift() {
    try {
      const result = await sbInsert('shifts', {
        restaurant_id: this.state.restaurantId,
        manager_id: this.state.manager.id,
        manager_name: this.state.manager.full_name,
        is_busy_mode: false,
      });
      this.state.shift = Array.isArray(result) ? result[0] : result;
      Utils.toast(t('openShift') + ' ✓');
      await this.loadWaiters();
      this.render();
    } catch(e) { Utils.toast('שגיאה'); console.error(e); }
  },

  async closeShift() {
    try {
      await sbUpdate('shifts', { id: this.state.shift.id }, { ended_at: new Date().toISOString() });
      this.state.shift = null;
      this.state.waiters = [];
      Utils.toast(t('closeShift') + ' ✓');
      this.render();
    } catch(e) { Utils.toast('שגיאה'); console.error(e); }
  },

  async toggleBusy(isBusy) {
    try {
      await sbUpdate('shifts', { id: this.state.shift.id }, { is_busy_mode: isBusy });
      this.state.shift.is_busy_mode = isBusy;
    } catch(e) { Utils.toast('שגיאה'); }
  },

  async toggleTable(tableId, currentOpen) {
    try {
      await sbUpdate('restaurant_tables', { id: tableId }, { is_open: !currentOpen });
      const t = this.state.tables.find(t => t.id === tableId);
      if (t) t.is_open = !currentOpen;
      this.render();
    } catch(e) { Utils.toast('שגיאה'); }
  },

  async resetScratch(tableId) {
    try {
      await sbUpdate('restaurant_tables', { id: tableId }, { scratch_used: false });
      Utils.toast('🎁 מתנה אופסה');
    } catch(e) { Utils.toast('שגיאה'); }
  },

  async openAllTables() {
    for (const table of this.state.tables) {
      if (!table.is_open) {
        try { await sbUpdate('restaurant_tables', { id: table.id }, { is_open: true }); } catch(e) {}
      }
    }
    this.state.tables.forEach(t => t.is_open = true);
    this.render();
  },

  cleanup() {
    this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
    this.state.subscriptions = [];
    if (this.state.timer) clearInterval(this.state.timer);
  },

  setupRealtime() {
    this.cleanup();
    const sub = sbSubscribePoll(this.state.restaurantId, async () => {
      await this.loadTasks();
      await this.loadWaiters();
      // Only re-render if task count changed
      const list = document.getElementById('task-list');
      if (list) this.render();
    });
    this.state.subscriptions.push(sub);
  },

  startTimer() {
    if (this.state.timer) clearInterval(this.state.timer);
    this.state.timer = setInterval(() => {
      if (this.state.tasks.length > 0) this.render();
    }, 5000);
  },
};
