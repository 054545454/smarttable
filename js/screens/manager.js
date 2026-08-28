// SmartTable — Manager Screen (Heatmap, Smart Dispatcher, Escalation, Task Control)
const ManagerScreen = {
  state: {
    restaurantId: null, manager: null, shift: null, tables: [], waiters: [],
    tasks: [], allShiftTasks: [], settings: null, subscriptions: [], timer: null,
    showAddTask: false, showHeatmap: false, showFeedback: false, showShiftDetails: false, heatmapData: null, waiterStats: null, feedback: [], wakeLock: null,
  },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('manager');
    if (saved && saved.restaurant_id === restaurantId) { this.state.manager = saved; this.start(); }
    else this.renderLogin();
  },

  renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center theme-luxury p-6 screen-enter" style="background:var(--bg)">
        <div class="w-full max-w-sm animate-spring-bounce">
          <div class="text-center mb-8">
            <div class="text-5xl mb-3 animate-spring-in">👨‍💼</div>
            <h1 class="text-2xl font-playfair gold-shine" style="color:var(--accent)">${t('managerLogin')}</h1>
            <p class="text-sm mt-2" style="color:var(--text-muted)">${t('enterPin')}</p>
          </div>
          <form id="manager-login-form" class="space-y-4">
            <div class="flex justify-center gap-2">
              ${['pin-1','pin-2','pin-3','pin-4'].map((id,i) => `<input type="password" id="${id}" class="pin-input animate-spring-in stagger-${i+1}" maxlength="1" inputmode="numeric" autofocus>`).join('')}
            </div>
            <p id="pin-error" class="text-red-500 text-sm text-center hidden animate-shake">${t('wrongPin')}</p>
            <button type="submit" class="btn-primary w-full">${t('confirm')}</button>
          </form>
        </div>
      </div>`;
    ['pin-1','pin-2','pin-3','pin-4'].forEach((id,i,arr) => {
      const input = document.getElementById(id);
      input.addEventListener('input', () => { if (input.value && i < arr.length-1) document.getElementById(arr[i+1]).focus(); });
    });
    document.getElementById('manager-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = ['pin-1','pin-2','pin-3','pin-4'].map(id => document.getElementById(id).value).join('');
      if (pin.length !== 4) return;
      try { await Auth.loginManager(pin, this.state.restaurantId); this.state.manager = Auth.current; this.start(); }
      catch(e) {
        document.getElementById('pin-error').classList.remove('hidden');
        ['pin-1','pin-2','pin-3','pin-4'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('pin-1').focus();
      }
    });
  },

  async start() {
    await this.loadSettings(); await this.loadShift(); await this.loadTables();
    await this.loadWaiters(); await this.loadTasks(); await this.loadShiftStats(); this.loadShiftOverview();
    KioskLock.init(this.state.restaurantId, "manager");
    this.render(); this.setupRealtime(); this.startTimer();
  },

  async loadSettings() { try { const s = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId }, { single: true }); this.state.settings = s || {}; } catch(e) { this.state.settings = {}; } },
  async loadShift() { try { const s = await sbSelect('shifts', { restaurant_id: this.state.restaurantId, ended_at: null }, { order: { column: 'started_at', ascending: false }, limit: 1 }); this.state.shift = (s && s.length > 0) ? s[0] : null; } catch(e) { this.state.shift = null; } },
  async loadTables() { try { this.state.tables = await sbSelect('restaurant_tables', { restaurant_id: this.state.restaurantId }, { order: { column: 'table_number', ascending: true } }); } catch(e) { this.state.tables = []; } },
  async loadWaiters() { if (!this.state.shift) { this.state.waiters = []; return; } try { this.state.waiters = await sbSelect('shift_waiters', { shift_id: this.state.shift.id }); } catch(e) { this.state.waiters = []; } },
  async loadTasks() { try { this.state.tasks = await sbSelect('tasks', { restaurant_id: this.state.restaurantId, status: 'open' }, { order: { column: 'created_at', ascending: true } }); } catch(e) { this.state.tasks = []; } },
  async loadShiftStats() {
    if (!this.state.shift) { this.state.allShiftTasks = []; return; }
    try { const all = await sbSelect('tasks', { restaurant_id: this.state.restaurantId }, { order: { column: 'created_at', ascending: false } }); const ss = new Date(this.state.shift.started_at).getTime(); this.state.allShiftTasks = all.filter(t => new Date(t.created_at).getTime() >= ss); } catch(e) { this.state.allShiftTasks = []; }
  },

  render() {
    const { manager, shift, tables, waiters, tasks, allShiftTasks, settings } = this.state;
    const openCount = tasks.length;
    const urgentCount = tasks.filter(t => Utils.getUrgency(t.created_at, settings) === 'red').length;
    const completedCount = allShiftTasks.filter(t => t.status === 'done').length;
    const cancelledCount = allShiftTasks.filter(t => t.status === 'cancelled').length;
    const totalShift = allShiftTasks.length;

    // Merged tasks
    const tableMap = new Map();
    for (const task of tasks) {
      const key = task.table_id || task.table_number;
      if (tableMap.has(key)) tableMap.get(key).subTasks.push(task);
      else tableMap.set(key, { table_id: task.table_id, table_number: task.table_number, earliestAt: task.created_at, subTasks: [task], isClaimed: task.status === 'in_progress', assignedWaiter: task.assigned_waiter_name });
    }
    const merged = Array.from(tableMap.values()).sort((a,b) => new Date(a.earliestAt) - new Date(b.earliestAt));

    document.getElementById('app').innerHTML = `
      <div class="min-h-screen theme-luxury fullscreen-mode screen-enter" style="background:var(--bg);color:var(--text)">
        <div class="px-4 py-3 sticky top-0 z-10 shadow-lg" style="background:var(--card);border-bottom:1px solid var(--border)">
          <div class="flex items-center justify-between max-w-3xl mx-auto">
            <div>
              <h1 class="text-lg font-semibold animate-fade-in" style="color:var(--text)">👨‍💼 ${Utils.escape(manager?.full_name || t('managerLogin'))}</h1>
              <p class="text-xs" style="color:var(--text-muted)">
                ${shift ? '🟢 משמרת פעילה · ' + Utils.formatTime(shift.started_at) : '⚪ אין משמרת'}
                ${openCount > 0 ? ` · ${openCount} פתוחות` : ''}
                ${urgentCount > 0 ? ` · ⚠️ ${urgentCount} דחופות` : ''}
              </p>
            </div>
            <button id="manager-logout" class="text-sm px-3 py-1 rounded-lg spring-scale" style="color:var(--text-muted)">${t('logout')}</button>
          </div>
        </div>

        <div class="max-w-3xl mx-auto p-4 space-y-4">
          ${shift ? `
            <!-- Quick Stats -->
            <div class="grid grid-cols-4 gap-3 animate-fade-in">
              <div class="card text-center"><div class="text-2xl font-bold" style="color:#f59e0b">${openCount}</div><div class="text-xs mt-1" style="color:var(--text-muted)">פתוחות</div></div>
              <div class="card text-center animate-spring-in stagger-1"><div class="text-2xl font-bold" style="color:#ef4444">${urgentCount}</div><div class="text-xs mt-1" style="color:var(--text-muted)">דחופות</div></div>
              <div class="card text-center animate-spring-in stagger-2"><div class="text-2xl font-bold" style="color:#22c55e">${completedCount}</div><div class="text-xs mt-1" style="color:var(--text-muted)">הושלמו</div></div>
              <div class="card text-center animate-spring-in stagger-3"><div class="text-2xl font-bold" style="color:#C9A84C">${waiters.length}</div><div class="text-xs mt-1" style="color:var(--text-muted)">מלצרים</div></div>
            </div>

            <!-- Action buttons -->
            <div class="grid grid-cols-4 gap-2 animate-fade-in stagger-1">
              <button id="shift-details-btn" class="btn-secondary text-sm">📊 משמרת</button>
              <button id="heatmap-btn" class="btn-secondary text-sm">🔥 מפת חום</button>
              <button id="add-task-btn" class="btn-primary text-sm">➕ משימה</button>
              <button id="feedback-btn" class="btn-secondary text-sm">⭐ משוב</button>
            </div>

            ${this.state.showAddTask ? this.renderAddTask(tables) : ''}

            ${this.state.showShiftDetails ? this.renderShiftDetails() : ''}

            <!-- Task Queue -->
            ${merged.length > 0 ? `
              <div class="card animate-fade-in">
                <h2 class="font-semibold mb-3" style="color:var(--text)">📋 תור משימות</h2>
                <div class="space-y-2">
                  ${merged.map(m => {
                    const urgency = Utils.getUrgency(m.earliestAt, settings);
                    const elapsed = Math.floor(Utils.elapsedSeconds(m.earliestAt));
                    const icons = m.subTasks.map(st => CONFIG.taskTypes[st.type]?.icon || '📋').join(' ');
                    const labels = [...new Set(m.subTasks.map(st => CONFIG.taskTypes[st.type]?.label || st.type))].join(' + ');
                    const badge = m.subTasks.length > 1 ? `<span class="px-2 py-0.5 bg-white/30 rounded-full text-xs font-bold">${m.subTasks.length}</span>` : '';
                    const isEscalated = urgency === 'red' && elapsed > 180;
                    return `
                      <div class="task-${urgency} ${isEscalated ? 'escalation-flash' : ''} px-4 py-3 rounded-xl flex items-center justify-between text-white animate-spring-in">
                        <div class="flex items-center gap-3 flex-1">
                          <span class="text-2xl">${icons}</span>
                          <div class="flex-1">
                            <div class="font-semibold flex items-center gap-2">שולחן ${m.table_number} ${badge}</div>
                            <div class="text-xs opacity-90">${labels}</div>
                            <div class="text-xs opacity-75 mt-0.5">
                              ${m.isClaimed ? `🤵 נלקח ע"י ${m.assignedWaiter||''}` : `<span data-task-time="${m.earliestAt}">⏱ ${Utils.formatDuration(elapsed)}</span>`}
                              ${m.subTasks[0]?.special_note ? ` · 📝 ${Utils.escape(m.subTasks[0].special_note)}` : ''}
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          ${!m.isClaimed && waiters.length > 0 ? `<select data-assign="${m.table_id || m.table_number}" class="px-2 py-1 bg-white/20 rounded-lg text-xs text-white border-0 outline-none spring-scale" style="max-width:100px"><option value="">🤵 הקצה...</option>${waiters.map(w => `<option value="${Utils.escape(w.waiter_name)}" data-wid="${w.waiter_id || ''}">${Utils.escape(w.waiter_name)}</option>`).join('')}</select>` : ''}
                          <button data-cancel="${m.table_id || m.table_number}" class="px-3 py-2 bg-white/20 rounded-lg text-sm spring-scale">✖ בטל</button>
                        </div>
                      </div>`;
                  }).join('')}
                </div>
              </div>` : `<div class="card text-center py-6 animate-fade-in"><p style="color:var(--text-muted)">✅ אין משימות פתוחות</p></div>`}

            <!-- Shift Summary -->
            ${totalShift > 0 ? `
              <div class="card animate-fade-in">
                <h3 class="font-semibold mb-2" style="color:var(--text)">📊 סיכום משמרת</h3>
                <div class="flex justify-around text-center">
                  <div><div class="text-lg font-bold" style="color:var(--text)">${totalShift}</div><div class="text-xs" style="color:var(--text-muted)">סה"כ</div></div>
                  <div><div class="text-lg font-bold" style="color:#22c55e">${completedCount}</div><div class="text-xs" style="color:var(--text-muted)">הושלמו</div></div>
                  <div><div class="text-lg font-bold" style="color:#ef4444">${cancelledCount}</div><div class="text-xs" style="color:var(--text-muted)">בוטלו</div></div>
                </div>
              </div>` : ''}

            <!-- Busy mode + shift -->
            <div class="card flex items-center justify-between animate-fade-in">
              <div><h2 class="font-semibold" style="color:var(--text)">${t('busyMode')}</h2><p class="text-xs mt-0.5" style="color:var(--text-muted)">בעומס — כל המשימות מוצגות לכולם</p></div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="busy-toggle" class="sr-only peer" ${shift.is_busy_mode ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-gold after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>

            <!-- Close shift -->
            <div class="card text-center animate-fade-in">
              <button id="close-shift" class="btn-primary" style="background:#ef4444;color:white">${t('closeShift')}</button>
            </div>
          ` : `
            <div class="card text-center animate-fade-in">
              <p style="color:var(--text-muted)" class="mb-4">אין משמרת פעילה</p>
              <button id="open-shift" class="btn-primary">${t('openShift')}</button>
            </div>
          `}

          <!-- Tables -->
          <div class="card animate-fade-in">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold" style="color:var(--text)">${t('tables')} (${tables.length})</h2>
              <button id="open-all-tables" class="text-xs spring-scale" style="color:var(--accent)">פתח הכל</button>
            </div>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              ${tables.map(tb => this.renderTable(tb)).join('')}
            </div>
          </div>

          <!-- Waiters with stats -->
          ${shift ? `
            <div class="card animate-fade-in">
              <h2 class="font-semibold mb-3" style="color:var(--text)">${t('waiters')} (${waiters.length})</h2>
              ${waiters.length === 0 ? '<p class="text-sm" style="color:var(--text-muted)">אין מלצרים במשמרת.</p>' : `<div class="space-y-2">${waiters.map(w => { const ws = this.state.shiftOverview?.waiters?.find(s => s.name === w.waiter_name); return `<div class="flex items-center gap-2 py-2 border-b last:border-0" style="border-color:var(--border)"><span class="w-2 h-2 rounded-full bg-green-500"></span><div class="flex-1"><span class="text-sm font-medium" style="color:var(--text)">${Utils.escape(w.waiter_name)}</span><div class="text-xs" style="color:var(--text-muted)">${Utils.formatTime(w.joined_at)}${ws ? ` · ✅ ${ws.completed} הושלמו · 🤵 ${ws.active} פעילות${ws.responseTimes.length > 0 ? ` · ⏱ ${Math.round(ws.responseTimes.reduce((a,b)=>a+b,0)/ws.responseTimes.length)}s` : ''}` : ''}</div></div></div>`; }).join('')}</div>`}
            </div>` : ''}
        </div>

        <div id="manager-modals"></div>
      </div>`;

    this.attachEvents();
  },

  renderTable(table) {
    const isOpen = table.is_open;
    return `
      <div class="rounded-xl p-3 text-center spring-scale animate-spring-in ${isOpen ? '' : ''}" 
        style="${isOpen ? 'background:rgba(34,197,94,0.15);border:2px solid #22c55e' : 'background:var(--card);border:2px solid var(--border)'}"
        data-table-id="${table.id}" data-table-open="${isOpen}">
        <div class="text-2xl mb-1">${isOpen ? '🍽️' : '🪑'}</div>
        <div class="text-sm font-semibold" style="color:var(--text)">${t('tableNumber')} ${table.table_number}</div>
        ${isOpen ? `<button data-reset-scratch="${table.id}" class="text-xs px-2 py-1 rounded mt-1 spring-scale" style="background:var(--accent);color:var(--button-text)">🎁 אפס מתנה</button>` : ''}
      </div>`;
  },

  renderAddTask(tables) {
    return `
      <div class="card animate-spring-bounce">
        <h3 class="font-semibold mb-3" style="color:var(--text)">➕ משימה חדשה</h3>
        <form id="add-task-form" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <select id="task-type" class="input-field">
              <option value="call_waiter">🔔 קריאת מלצר</option>
              <option value="water">💧 מים</option>
              <option value="bill">🧾 חשבון</option>
              <option value="wine_menu">🍷 תפריט יינות</option>
              <option value="dessert_menu">🍰 תפריט קינוחים</option>
              <option value="special">📝 בקשה מיוחדת</option>
            </select>
            <select id="task-table" class="input-field">
              ${tables.map(tb => `<option value="${tb.id}" data-num="${tb.table_number}">שולחן ${tb.table_number}</option>`).join('')}
            </select>
          </div>
          <input type="text" id="task-note" class="input-field" placeholder="הערה...">
          <div class="flex gap-2">
            <button type="submit" class="btn-primary flex-1">צור</button>
            <button type="button" id="cancel-add-task" class="btn-secondary">ביטול</button>
          </div>
        </form>
      </div>`;
  },

  renderShiftDetails() {
    const ov = this.state.shiftOverview;
    if (!ov) return '';
    return `
      <div class="card animate-spring-bounce">
        <h3 class="font-semibold mb-3" style="color:var(--text)">📊 נתוני משמרת</h3>
        <div class="grid grid-cols-4 gap-2 mb-4">
          <div class="text-center"><div class="text-xl font-bold" style="color:var(--text)">${ov.total}</div><div class="text-xs" style="color:var(--text-muted)">סה"כ</div></div>
          <div class="text-center"><div class="text-xl font-bold" style="color:#22c55e">${ov.completed}</div><div class="text-xs" style="color:var(--text-muted)">הושלמו</div></div>
          <div class="text-center"><div class="text-xl font-bold" style="color:#f59e0b">${ov.open}</div><div class="text-xs" style="color:var(--text-muted)">פתוחות</div></div>
          <div class="text-center"><div class="text-xl font-bold" style="color:#ef4444">${ov.cancelled}</div><div class="text-xs" style="color:var(--text-muted)">בוטלו</div></div>
        </div>
        ${ov.avgResponse > 0 ? `
          <div class="flex items-center justify-between py-2 border-y mb-3" style="border-color:var(--border)">
            <span class="text-sm" style="color:var(--text-muted)">⏱ זמן תגובה ממוצע</span>
            <span class="text-lg font-bold" style="color:${ov.avgResponse > 60 ? '#ef4444' : ov.avgResponse > 30 ? '#f59e0b' : '#22c55e'}">${ov.avgResponse}s</span>
          </div>` : ''}
        ${ov.typeBreakdown.length > 0 ? `
          <h4 class="text-xs font-semibold mb-2" style="color:var(--text-muted)">פילוג לפי סוג</h4>
          <div class="space-y-1 mb-4">
            ${ov.typeBreakdown.map(tt => {
              const info = CONFIG.taskTypes[tt.type] || { icon: '📋', label: tt.type };
              return `<div class="flex items-center justify-between py-1"><span class="text-sm" style="color:var(--text)">${info.icon} ${info.label}</span><div class="flex items-center gap-2">${tt.open > 0 ? `<span class="text-xs px-2 py-0.5 rounded-full" style="background:#f59e0b22;color:#f59e0b">${tt.open} פתוחות</span>` : ''}${tt.done > 0 ? `<span class="text-xs px-2 py-0.5 rounded-full" style="background:#22c55e22;color:#22c55e">${tt.done} ✓</span>` : ''}<span class="text-sm font-bold" style="color:var(--text)">${tt.count}</span></div></div>`;
            }).join('')}
          </div>` : ''}
        ${ov.waiters.length > 0 ? `
          <h4 class="text-xs font-semibold mb-2" style="color:var(--text-muted)">ביצועי מלצרים</h4>
          <div class="space-y-2">
            ${ov.waiters.map(w => `
              <div class="flex items-center justify-between py-2 border-b last:border-0" style="border-color:var(--border)">
                <div><span class="text-sm font-medium" style="color:var(--text)">🤵 ${Utils.escape(w.name)}</span></div>
                <div class="flex items-center gap-3 text-xs">${w.active > 0 ? `<span style="color:#f59e0b">${w.active} פעילות</span>` : ''}<span style="color:#22c55e">${w.completed} ✓</span>${w.responseTimes.length > 0 ? `<span style="color:var(--text-muted)">⏱ ${Math.round(w.responseTimes.reduce((a,b)=>a+b,0)/w.responseTimes.length)}s</span>` : ''}</div>
              </div>`).join('')}
          </div>` : '<p class="text-sm text-center" style="color:var(--text-muted)">אין נתוני מלצרים עדיין</p>'}
      </div>`;
  },

  attachEvents() {
    document.getElementById('manager-logout').addEventListener('click', () => { Auth.clearSession('manager'); this.cleanup(); window.location.hash = ''; });
    const kioskBtn = document.getElementById("manager-kiosk"); if (kioskBtn) kioskBtn.addEventListener("click", () => KioskLock.lock());
    const os = document.getElementById('open-shift'); if (os) os.addEventListener('click', () => this.openShift());
    const cs = document.getElementById('close-shift'); if (cs) cs.addEventListener('click', () => this.closeShift());
    const bt = document.getElementById('busy-toggle'); if (bt) bt.addEventListener('change', () => this.toggleBusy(bt.checked));
    const oa = document.getElementById('open-all-tables'); if (oa) oa.addEventListener('click', () => this.openAllTables());
    const at = document.getElementById('add-task-btn'); if (at) at.addEventListener('click', () => { this.state.showAddTask = true; this.render(); });
    const sd = document.getElementById('shift-details-btn'); if (sd) sd.addEventListener('click', () => { this.state.showShiftDetails = !this.state.showShiftDetails; this.render(); });
    const cat = document.getElementById('cancel-add-task'); if (cat) cat.addEventListener('click', () => { this.state.showAddTask = false; this.render(); });
    const atf = document.getElementById('add-task-form'); if (atf) atf.addEventListener('submit', (e) => this.createTask(e));
    const hm = document.getElementById('heatmap-btn'); if (hm) hm.addEventListener('click', () => this.showHeatmap());
    const fb = document.getElementById('feedback-btn'); if (fb) fb.addEventListener('click', () => this.showFeedback());
    document.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', () => this.cancelTasks(btn.dataset.cancel)));
    document.querySelectorAll('[data-assign]').forEach(sel => sel.addEventListener('change', () => this.assignTask(sel.dataset.assign, sel.value, sel.options[sel.selectedIndex].dataset.wid)));
    document.querySelectorAll('[data-table-id]').forEach(el => el.addEventListener('click', (e) => { if (e.target.hasAttribute('data-reset-scratch')) return; this.toggleTable(el.dataset.tableId, el.dataset.tableOpen === 'true'); }));
    document.querySelectorAll('[data-reset-scratch]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); this.resetScratch(btn.dataset.resetScratch); }));
  },

  async showHeatmap() {
    const modal = document.getElementById('manager-modals');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" id="heatmap-modal">
        <div class="card w-full max-w-2xl animate-spring-bounce" style="background:var(--card);max-height:85vh;overflow-y:auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-playfair text-lg" style="color:var(--accent)">🔥 מפת חום — אולם</h2>
            <button id="close-heatmap" class="text-2xl" style="color:var(--text-muted)">✕</button>
          </div>
          <div id="heatmap-content">${Utils.spinner()}</div>
        </div>
      </div>`;
    document.getElementById('close-heatmap').addEventListener('click', () => modal.innerHTML = '');

    try {
      const hm = await sbGetHeatmap(this.state.restaurantId);
      const ws = await sbGetWaiterStats(this.state.restaurantId);
      const content = document.getElementById('heatmap-content');
      const tables = hm.tables || [];

      content.innerHTML = `
        <div class="mb-4 grid grid-cols-3 gap-3">
          <div class="card text-center"><div class="text-xl font-bold" style="color:var(--accent)">${hm.totalOpenTasks}</div><div class="text-xs" style="color:var(--text-muted)">משימות פתוחות</div></div>
          <div class="card text-center"><div class="text-xl font-bold" style="color:var(--accent)">${hm.avgResponseTime}s</div><div class="text-xs" style="color:var(--text-muted)">זמן תגובה ממוצע</div></div>
          <div class="card text-center"><div class="text-xl font-bold" style="color:var(--accent)">${ws.waiters?.length || 0}</div><div class="text-xs" style="color:var(--text-muted)">מלצרים פעילים</div></div>
        </div>

        <div class="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
          ${tables.map(t => `
            <div class="heatmap-table rounded-xl p-3 text-center heatmap-${t.urgency}" style="min-height:80px">
              <div class="text-2xl mb-1">${t.is_open ? '🍽️' : '🪑'}</div>
              <div class="text-sm font-bold" style="color:var(--text)">${t.table_number}</div>
              ${t.open_tasks > 0 ? `<div class="text-xs mt-1" style="color:var(--text-muted)">${t.open_tasks} 📋 · ${Math.round(t.wait_seconds/60)}ד</div>` : ''}
            </div>`).join('')}
        </div>

        ${ws.waiters && ws.waiters.length > 0 ? `
          <div class="mb-4">
            <h3 class="font-semibold mb-2" style="color:var(--text)">🤵 נתב מלצרים (Smart Dispatcher)</h3>
            ${ws.waiters.map(w => `
              <div class="flex items-center justify-between py-2 border-b" style="border-color:var(--border)">
                <div>
                  <span class="font-medium" style="color:var(--text)">${Utils.escape(w.waiter_name)}</span>
                  ${w.assigned_tables?.length > 0 ? `<span class="text-xs ml-2" style="color:var(--text-muted)">שולחנות: ${w.assigned_tables.join(', ')}</span>` : ''}
                </div>
                <span class="text-sm" style="color:${w.active_tasks > 2 ? '#ef4444' : w.active_tasks > 0 ? 'var(--accent)' : '#22c55e'}">${w.active_tasks} משימות</span>
              </div>`).join('')}
          </div>` : '<p style="color:var(--text-muted)" class="text-center py-4">אין מלצרים פעילים כרגע</p>'}

        <div class="text-xs text-center" style="color:var(--text-muted)">
          🟢 ירוק = ממתין עד 2 דק · 🟠 כתום = 2-5 דק · 🔴 אדום = מעל 5 דק (הסלמה)
        </div>`;

      // Auto-refresh heatmap
      setTimeout(() => { if (document.getElementById('heatmap-modal')) this.showHeatmap(); }, 5000);
    } catch(e) { document.getElementById('heatmap-content').innerHTML = '<p style="color:var(--text-muted)">שגיאה בטעינת נתונים</p>'; }
  },

  async showFeedback() {
    const modal = document.getElementById('manager-modals');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" id="feedback-modal-m">
        <div class="card w-full max-w-md animate-spring-bounce" style="background:var(--card);max-height:85vh;overflow-y:auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-playfair text-lg" style="color:var(--accent)">⭐ משוב לקוחות</h2>
            <button id="close-fb-m" class="text-2xl" style="color:var(--text-muted)">✕</button>
          </div>
          <div id="feedback-content">${Utils.spinner()}</div>
        </div>
      </div>`;
    document.getElementById('close-fb-m').addEventListener('click', () => modal.innerHTML = '');

    try {
      const feedback = await sbGetFeedback(this.state.restaurantId, false);
      const content = document.getElementById('feedback-content');
      if (!feedback || feedback.length === 0) {
        content.innerHTML = '<p class="text-center py-6" style="color:var(--text-muted)">אין משוב עדיין</p>';
        return;
      }
      content.innerHTML = `
        <div class="space-y-3">
          ${feedback.map(f => `
            <div class="card animate-fade-in" style="background:var(--card)">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="feedback-badge ${f.is_negative ? 'feedback-negative' : 'feedback-positive'}">${f.is_negative ? '⚠️ שלילי' : '✓ חיובי'}</span>
                  <span class="text-sm" style="color:var(--text)">${'⭐'.repeat(f.rating)}</span>
                </div>
                <span class="text-xs" style="color:var(--text-muted)">שולחן ${f.table_number||''}</span>
              </div>
              ${f.comment ? `<p class="text-sm mt-1" style="color:var(--text)">${Utils.escape(f.comment)}</p>` : ''}
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs" style="color:var(--text-muted)">${Utils.formatDate(f.created_date)}</span>
                ${!f.handled ? `<button data-handle-fb="${f.id}" class="text-xs px-3 py-1 rounded-full spring-scale" style="background:var(--accent);color:var(--button-text)">סמן כטופל</button>` : '<span class="text-xs" style="color:#22c55e">✓ טופל</span>'}
              </div>
            </div>`).join('')}
        </div>`;
      document.querySelectorAll('[data-handle-fb]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try { await sbHandleFeedback(btn.dataset.handleFb); Utils.toast('✅ סומן כטופל'); this.showFeedback(); }
          catch(e) { Utils.toast('שגיאה'); }
        });
      });
    } catch(e) { document.getElementById('feedback-content').innerHTML = '<p style="color:var(--text-muted)">שגיאה</p>'; }
  },

  async createTask(e) {
    e.preventDefault();
    const type = document.getElementById('task-type').value;
    const ts = document.getElementById('task-table');
    const tableId = ts.value;
    const tableNum = ts.options[ts.selectedIndex].dataset.num;
    const note = document.getElementById('task-note').value.trim();
    try {
      await sbInsert('tasks', { restaurant_id: this.state.restaurantId, shift_id: this.state.shift?.id || null, type, table_id: tableId, table_number: parseInt(tableNum), status: 'open', priority: 'normal', special_note: note || null, created_at: new Date().toISOString() });
      Utils.toast('✅ משימה נוצרה');
      this.state.showAddTask = false;
      await this.loadTasks(); await this.loadShiftStats(); this.render();
    } catch(e) { Utils.toast('שגיאה'); }
  },

  async cancelTasks(tableKey) {
    const toCancel = this.state.tasks.filter(t => (t.table_id || t.table_number) == tableKey && t.status === 'open');
    for (const task of toCancel) { try { await sbUpdate('tasks', { id: task.id }, { status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: this.state.manager?.full_name || 'manager' }); } catch(e) {} }
    Utils.toast('✖ בוטלו'); await this.loadTasks(); await this.loadShiftStats(); this.loadShiftOverview(); this.render();
  },

  async assignTask(tableKey, waiterName, waiterId) {
    if (!waiterName) return;
    const toAssign = this.state.tasks.filter(t => (t.table_id || t.table_number) == tableKey && t.status === 'open');
    for (const task of toAssign) { try { await sbUpdate('tasks', { id: task.id }, { status: 'in_progress', assigned_waiter_name: waiterName, assigned_waiter_id: waiterId || null, claimed_at: new Date().toISOString() }); } catch(e) {} }
    Utils.toast('🤵 הוקצה ל' + waiterName);
    await this.loadTasks(); await this.loadShiftStats(); this.loadShiftOverview(); this.render();
  },

  async openShift() {
    try { const r = await sbInsert('shifts', { restaurant_id: this.state.restaurantId, manager_id: this.state.manager.id, manager_name: this.state.manager.full_name, is_busy_mode: false, started_at: new Date().toISOString() }); this.state.shift = Array.isArray(r) ? r[0] : r; Utils.toast(t('openShift') + ' ✓'); await this.loadWaiters(); await this.loadShiftStats(); this.render(); }
    catch(e) { Utils.toast('שגיאה'); }
  },

  async closeShift() {
    try { await sbUpdate('shifts', { id: this.state.shift.id }, { ended_at: new Date().toISOString() }); this.state.shift = null; this.state.waiters = []; this.state.allShiftTasks = []; Utils.toast(t('closeShift') + ' ✓'); this.render(); }
    catch(e) { Utils.toast('שגיאה'); }
  },

  async toggleBusy(isBusy) { try { await sbUpdate('shifts', { id: this.state.shift.id }, { is_busy_mode: isBusy }); this.state.shift.is_busy_mode = isBusy; } catch(e) {} },
  async toggleTable(tableId, currentOpen) { try { await sbUpdate('restaurant_tables', { id: tableId }, { is_open: !currentOpen }); const t = this.state.tables.find(t => t.id === tableId); if (t) t.is_open = !currentOpen; this.render(); } catch(e) {} },
  async resetScratch(tableId) { try { await sbUpdate('restaurant_tables', { id: tableId }, { scratch_used: false }); Utils.toast('🎁 מתנה אופסה'); } catch(e) {} },
  async openAllTables() { for (const t of this.state.tables) { if (!t.is_open) { try { await sbUpdate('restaurant_tables', { id: t.id }, { is_open: true }); } catch(e) {} } } this.state.tables.forEach(t => t.is_open = true); this.render(); },

  cleanup() { this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} }); this.state.subscriptions = []; if (this.state.timer) clearInterval(this.state.timer); },
  setupRealtime() { this.cleanup(); const sub = sbSubscribePoll(this.state.restaurantId, async () => { await this.loadTasks(); await this.loadWaiters(); await this.loadShiftStats(); this.loadShiftOverview(); this.render(); }); this.state.subscriptions.push(sub); },
  startTimer() { if (this.state.timer) clearInterval(this.state.timer); this.state.timer = setInterval(() => { if (this.state.tasks.length === 0 && !this.state.shift) return; document.querySelectorAll('[data-task-time]').forEach(el => { const created = el.dataset.taskTime; const elapsed = Math.floor((Date.now() - new Date(created).getTime()) / 1000); if (!isNaN(elapsed)) el.textContent = '⏱ ' + Utils.formatDuration(elapsed); }); }, 5000); },
};
