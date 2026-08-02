// SmartTable — Admin/Owner Screen (Dashboard, Tables, Settings, Menu, Gifts, Reports, AI)
const AdminScreen = {
  state: {
    restaurantId: null,
    admin: null,
    restaurant: null,
    settings: null,
    tab: 'dashboard',
    stats: {},
    subscriptions: [],
    tables: [],
    selectedTable: null,
    draggedTable: null,
    menuItems: [],
    gifts: [],
    editingMenuItem: null,
    editingGift: null,
    reports: null,
  },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('admin');
    
    if (saved && saved.restaurant_id === restaurantId) {
      this.state.admin = saved;
      if (saved.must_change_password) {
        Auth.showChangePasswordScreen(saved, true);
        return;
      }
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
            <div class="text-5xl mb-3">🏢</div>
            <h1 class="text-2xl font-playfair text-gray-800">${t('adminLogin')}</h1>
          </div>
          <form id="admin-login-form" class="space-y-4">
            <div>
              <label class="text-sm text-gray-600 mb-1 block">${t('username')}</label>
              <input type="text" id="admin-username" class="input-field" required autofocus>
            </div>
            <div>
              <label class="text-sm text-gray-600 mb-1 block">${t('password')}</label>
              <input type="password" id="admin-password" class="input-field" required>
            </div>
            <p id="admin-error" class="text-red-500 text-sm text-center hidden"></p>
            <button type="submit" class="btn-primary w-full">${t('confirm')}</button>
          </form>
          <a href="#" class="block text-center text-sm text-gray-400 mt-4">← חזור</a>
        </div>
      </div>
    `;
    
    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value;
      
      try {
        await Auth.loginAdmin(username, password, this.state.restaurantId);
        this.state.admin = Auth.current;
        this.start();
      } catch(e) {
        if (e.message === 'MUST_CHANGE_PASSWORD') return;
        const errEl = document.getElementById('admin-error');
        errEl.textContent = e.message;
        errEl.classList.remove('hidden');
      }
    });
  },

  async start() {
    await this.loadRestaurant();
    await this.loadSettings();
    await this.loadStats();
    await this.loadMenuItems();
    await this.loadGifts();
    if (!this.state.settings || !this.state.settings.theme) {
      this.state.tab = 'setup';
    }
    this.render();
  },

  async loadRestaurant() {
    try {
      const all = await sbSelect('restaurants', { id: this.state.restaurantId });
      this.state.restaurant = all[0] || null;
    } catch(e) { console.error(e); }
  },

  async loadSettings() {
    try {
      const all = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId });
      this.state.settings = all[0] || null;
    } catch(e) { this.state.settings = null; }
  },

  async loadStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tasks = await sbSelect('tasks', { restaurant_id: this.state.restaurantId }, {
        order: 'created_date', ascending: false, limit: 100,
      });
      const todayTasks = tasks.filter(t => t.created_at?.startsWith(today));
      const completedToday = todayTasks.filter(t => t.status === 'done');
      const responseTimes = completedToday.filter(t => t.response_seconds).map(t => t.response_seconds);
      this.state.stats = {
        totalToday: todayTasks.length,
        completedToday: completedToday.length,
        avgResponseTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
        openTasks: tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      };
    } catch(e) { console.error(e); this.state.stats = {}; }
  },

  async loadTables() {
    try {
      this.state.tables = await sbSelect('restaurant_tables', { restaurant_id: this.state.restaurantId });
    } catch(e) { console.error(e); this.state.tables = []; }
  },

  async loadMenuItems() {
    try {
      this.state.menuItems = await sbSelect('menu_items', { restaurant_id: this.state.restaurantId }, {
        order: 'sort_order', ascending: true,
      });
    } catch(e) { console.error(e); this.state.menuItems = []; }
  },

  async loadGifts() {
    try {
      this.state.gifts = await sbSelect('gifts', { restaurant_id: this.state.restaurantId });
    } catch(e) { console.error(e); this.state.gifts = []; }
  },

  render() {
    const { restaurant, tab } = this.state;
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-4xl mx-auto">
            <div class="flex items-center gap-2">
              <span class="text-xl">🏢</span>
              <div>
                <h1 class="text-lg font-semibold">${Utils.escape(restaurant?.name || 'SmartTable')}</h1>
                <p class="text-xs text-gray-400">${t('dashboard')}</p>
              </div>
            </div>
            <button id="admin-logout" class="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg">${t('logout')}</button>
          </div>
        </div>
        <div class="bg-white border-b sticky top-[57px] z-10">
          <div class="max-w-4xl mx-auto flex overflow-x-auto no-scrollbar">
            ${this.renderTab('dashboard', '📊')}
            ${this.renderTab('tables', '🪑')}
            ${this.renderTab('settings', '⚙️')}
            ${this.renderTab('menu', '📋')}
            ${this.renderTab('gifts', '🎁')}
            ${this.renderTab('reports', '📈')}
          </div>
        </div>
        <div class="max-w-4xl mx-auto p-4" id="admin-content">
          ${this.renderContent()}
        </div>
      </div>
    `;
    this.attachEvents();
    if (this.state.tab === 'tables') this.initTablesView();
  },

  renderTab(tabId, icon) {
    const labels = { dashboard: t('dashboard'), settings: t('settings'), menu: t('menu'), gifts: t('gifts'), reports: t('reports'), setup: t('setupWizard'), tables: 'שולחנות' };
    const isActive = this.state.tab === tabId;
    return `<button data-tab="${tabId}" class="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${isActive ? 'border-gold text-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}">${icon} ${labels[tabId] || tabId}</button>`;
  },

  renderContent() {
    switch(this.state.tab) {
      case 'dashboard': return this.renderDashboard();
      case 'tables': return this.renderTables();
      case 'settings': return this.renderSettings();
      case 'menu': return this.renderMenu();
      case 'gifts': return this.renderGifts();
      case 'reports': return this.renderReports();
      case 'setup': return this.renderSetupWizard();
      default: return this.renderDashboard();
    }
  },

  renderDashboard() {
    const s = this.state.stats;
    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="card text-center"><div class="text-3xl font-bold text-gold">${s.totalToday || 0}</div><div class="text-xs text-gray-500 mt-1">בקשות היום</div></div>
        <div class="card text-center"><div class="text-3xl font-bold text-green-500">${s.completedToday || 0}</div><div class="text-xs text-gray-500 mt-1">הושלמו</div></div>
        <div class="card text-center"><div class="text-3xl font-bold text-blue-500">${s.avgResponseTime || 0}<span class="text-sm">s</span></div><div class="text-xs text-gray-500 mt-1">ממוצע תגובה</div></div>
        <div class="card text-center"><div class="text-3xl font-bold text-orange-500">${s.openTasks || 0}</div><div class="text-xs text-gray-500 mt-1">פתוחות כעת</div></div>
      </div>
      <div class="card">
        <h3 class="font-semibold text-gray-700 mb-3">תקציר מהיר</h3>
        <div class="space-y-2 text-sm text-gray-600">
          <div class="flex justify-between py-1"><span>🪑 שולחנות:</span><span class="font-medium">${this.state.tables.length || '—'}</span></div>
          <div class="flex justify-between py-1"><span>📋 פריטי תפריט:</span><span class="font-medium">${this.state.menuItems.length}</span></div>
          <div class="flex justify-between py-1"><span>🎁 מתנות פעילות:</span><span class="font-medium">${this.state.gifts.filter(g => g.is_active).length}</span></div>
          <div class="flex justify-between py-1"><span>🎨 ערכת נושא:</span><span class="font-medium">${CONFIG.themes[this.state.settings?.theme]?.name || 'לוקסורי'}</span></div>
        </div>
      </div>
    `;
  },

  // --- TABLES ---
  renderTables() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">🪑 ניהול שולחנות</h2>
          <button id="add-table-btn" class="btn-primary text-sm">+ הוסף שולחן</button>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500 mb-3">גרור שולחנות למיקום הרצוי. לחץ על שולחן להצגת הברקוד ועריכת פרטים.</p>
          <div id="floor-plan" class="relative bg-gray-100 rounded-xl overflow-hidden" style="min-height: 500px; background-image: linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px); background-size: 40px 40px;">
            ${this.state.tables.map(table => this.renderTableOnFloor(table)).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderTableOnFloor(table) {
    const x = table.pos_x || 100;
    const y = table.pos_y || 100;
    const isOpen = table.is_open;
    return `
      <div class="table-floor-item absolute cursor-move select-none transition-shadow hover:shadow-lg" 
           data-table-id="${table.id}" 
           style="left: ${x}px; top: ${y}px; width: 80px; height: 80px;">
        <div class="w-full h-full rounded-xl flex flex-col items-center justify-center ${isOpen ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-300 text-gray-700'} shadow-md">
          <span class="text-lg font-bold">${table.table_number}</span>
          <span class="text-xs ${isOpen ? 'text-white' : 'text-gray-400'}">שולחן</span>
        </div>
      </div>
    `;
  },

  async initTablesView() {
    await this.loadTables();
    const floorPlan = document.getElementById('floor-plan');
    if (floorPlan) {
      floorPlan.innerHTML = this.state.tables.map(t => this.renderTableOnFloor(t)).join('');
      floorPlan.querySelectorAll('[data-table-id]').forEach(el => {
        el.addEventListener('click', () => {
          if (!this.state.draggedTable) {
            const table = this.state.tables.find(t => t.id === el.dataset.tableId);
            if (table) this.showTableDetails(table);
          }
        });
      });
      this.initDragAndDrop(floorPlan);
    }
  },

  initDragAndDrop(floorPlan) {
    let dragEl = null, startX = 0, startY = 0, origX = 0, origY = 0, hasMoved = false;
    
    const start = (clientX, clientY, el) => {
      dragEl = el; hasMoved = false;
      startX = clientX; startY = clientY;
      origX = parseInt(el.style.left) || 0;
      origY = parseInt(el.style.top) || 0;
      el.style.opacity = '0.7'; el.style.zIndex = '100';
    };
    
    const move = (clientX, clientY) => {
      if (!dragEl) return;
      const dx = clientX - startX, dy = clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
      const newX = Math.max(0, Math.min(floorPlan.offsetWidth - 80, origX + dx));
      const newY = Math.max(0, Math.min(floorPlan.offsetHeight - 80, origY + dy));
      dragEl.style.left = newX + 'px'; dragEl.style.top = newY + 'px';
    };
    
    const end = () => {
      if (!dragEl) return;
      dragEl.style.opacity = '1'; dragEl.style.zIndex = '1';
      if (hasMoved) {
        const tid = dragEl.dataset.tableId;
        const nx = Math.round(parseInt(dragEl.style.left)), ny = Math.round(parseInt(dragEl.style.top));
        apiCall({ action: 'updateTablePosition', data: { table_id: tid, pos_x: nx, pos_y: ny } }).catch(console.error);
        const t = this.state.tables.find(t => t.id === tid);
        if (t) { t.pos_x = nx; t.pos_y = ny; }
        this.state.draggedTable = true;
        setTimeout(() => { this.state.draggedTable = null; }, 100);
      }
      dragEl = null;
    };
    
    floorPlan.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.table-floor-item'); if (!item) return;
      e.preventDefault(); start(e.clientX, e.clientY, item);
    });
    document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    document.addEventListener('mouseup', end);
    
    floorPlan.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.table-floor-item'); if (!item) return;
      const t = e.touches[0]; start(t.clientX, t.clientY, item);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => { if (dragEl) { const t = e.touches[0]; move(t.clientX, t.clientY); } }, { passive: true });
    document.addEventListener('touchend', end);
  },

  showTableDetails(table) {
    const qrUrl = `https://violet-dunlin-978279.hostingersite.com/#c/${table.qr_token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-4xl mx-auto">
            <div class="flex items-center gap-2"><span class="text-xl">🪑</span><h1 class="text-lg font-semibold">שולחן מספר ${table.table_number}</h1></div>
            <button id="back-to-tables" class="text-gray-400 hover:text-white text-sm">← חזרה</button>
          </div>
        </div>
        <div class="max-w-2xl mx-auto p-4 space-y-4">
          <div class="card text-center">
            <h3 class="font-semibold text-gray-700 mb-3">ברקוד QR</h3>
            <div class="inline-block p-4 bg-white rounded-xl border-2 border-gray-200">
              <img src="${qrImageUrl}" alt="QR Code" width="250" height="250" class="rounded-lg">
            </div>
            <div class="mt-3 flex gap-2 justify-center">
              <a href="${qrImageUrl}" download="table-${table.table_number}-qr.png" class="btn-secondary text-sm">📥 הורד QR</a>
              <button id="print-qr-btn" class="btn-secondary text-sm">🖨️ הדפס</button>
            </div>
            <p class="text-xs text-gray-400 mt-2 break-all">${qrUrl}</p>
          </div>
          <div class="card space-y-3">
            <h3 class="font-semibold text-gray-700 mb-2">פרטי השולחן</h3>
            <form id="edit-table-form" class="space-y-3">
              <div><label class="text-sm text-gray-600 mb-1 block">מספר שולחן</label><input type="number" id="edit-table-number" class="input-field" value="${table.table_number}" min="1"></div>
              <div><label class="text-sm text-gray-600 mb-1 block">הערות</label><textarea id="edit-table-notes" class="input-field" rows="3">${Utils.escape(table.notes || '')}</textarea></div>
              <button type="submit" class="btn-primary w-full">שמור שינויים</button>
            </form>
          </div>
          <div class="card flex items-center justify-between">
            <div><div class="text-sm text-gray-500">סטטוס</div><div class="font-semibold ${table.is_open ? 'text-green-500' : 'text-gray-600'}">${table.is_open ? '🟢 פתוח' : '⚫ סגור'}</div></div>
            <button id="toggle-table-status" class="btn-secondary text-sm">${table.is_open ? 'סגור שולחן' : 'פתח שולחן'}</button>
          </div>
          <p id="table-edit-msg" class="text-center text-sm hidden"></p>
        </div>
      </div>
    `;
    
    document.getElementById('back-to-tables').addEventListener('click', () => { this.state.tab = 'tables'; this.render(); this.initTablesView(); });
    document.getElementById('edit-table-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('table-edit-msg');
      try {
        await sbUpdate('restaurant_tables', { id: table.id }, { table_number: parseInt(document.getElementById('edit-table-number').value), notes: document.getElementById('edit-table-notes').value.trim() });
        msg.textContent = '✅ נשמר'; msg.className = 'text-center text-sm text-green-500';
        await this.loadTables();
      } catch (err) { msg.textContent = '❌ ' + err.message; msg.className = 'text-center text-sm text-red-500'; }
      msg.classList.remove('hidden');
    });
    document.getElementById('toggle-table-status').addEventListener('click', async () => {
      try { await sbUpdate('restaurant_tables', { id: table.id }, { is_open: !table.is_open }); await this.loadTables(); this.showTableDetails(this.state.tables.find(t => t.id === table.id) || table); } catch(e) {}
    });
    document.getElementById('print-qr-btn').addEventListener('click', () => { const w = window.open(qrImageUrl, '_blank'); w.onload = () => w.print(); });
  },

  showAddTableForm() {
    const nextNum = Math.max(0, ...this.state.tables.map(t => t.table_number || 0)) + 1;
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-4xl mx-auto">
            <div class="flex items-center gap-2"><span class="text-xl">🪑</span><h1 class="text-lg font-semibold">+ שולחן חדש</h1></div>
            <button id="back-to-tables" class="text-gray-400 hover:text-white text-sm">← חזרה</button>
          </div>
        </div>
        <div class="max-w-md mx-auto p-4">
          <form id="add-table-form" class="card space-y-4">
            <div><label class="text-sm text-gray-600 mb-1 block">מספר שולחן</label><input type="number" id="new-table-number" class="input-field" value="${nextNum}" min="1" required></div>
            <div><label class="text-sm text-gray-600 mb-1 block">הערות</label><textarea id="new-table-notes" class="input-field" rows="3" placeholder="הערות אופציונליות"></textarea></div>
            <p id="add-table-msg" class="text-center text-sm hidden"></p>
            <button type="submit" class="btn-primary w-full">צור שולחן + ברקוד</button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('back-to-tables').addEventListener('click', () => { this.state.tab = 'tables'; this.render(); this.initTablesView(); });
    document.getElementById('add-table-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('add-table-msg');
      try {
        await apiCall({ action: 'generateTableQr', data: { restaurant_id: this.state.restaurantId, table_number: parseInt(document.getElementById('new-table-number').value), notes: document.getElementById('new-table-notes').value.trim() } });
        msg.textContent = '✅ נוצר!'; msg.className = 'text-center text-sm text-green-500'; msg.classList.remove('hidden');
        await this.loadTables();
        setTimeout(() => { this.state.tab = 'tables'; this.render(); this.initTablesView(); }, 1500);
      } catch (err) { msg.textContent = '❌ ' + err.message; msg.className = 'text-center text-sm text-red-500'; msg.classList.remove('hidden'); }
    });
  },

  // --- SETTINGS with logo, view mode, themes ---
  renderSettings() {
    const s = this.state.settings || {};
    const theme = s.theme || 'luxury';
    const viewMode = s.customer_view_mode || 'full_menu';
    
    return `
      <div class="space-y-4">
        <!-- Logo Upload -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">🖼️ לוגו המסעדה</h3>
          <div class="flex items-center gap-4">
            ${s.logo_url ? `<img src="${s.logo_url}" class="w-20 h-20 rounded-lg object-contain border border-gray-200 bg-white p-1" id="logo-preview">` : '<div class="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-3xl text-gray-300">🖼️</div>'}
            <div class="flex-1">
              <input type="file" id="logo-upload" accept="image/*" class="hidden">
              <button id="logo-upload-btn" class="btn-secondary text-sm">העלה לוגו</button>
              ${s.logo_url ? `<button id="logo-remove-btn" class="btn-secondary text-sm text-red-500 mr-2">הסר</button>` : ''}
              <p class="text-xs text-gray-400 mt-2">מומלץ: תמונה מרובעת, עד 200KB. פורמט: PNG/JPG.</p>
            </div>
          </div>
        </div>

        <!-- Theme Selection with Live Preview -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">🎨 ערכת נושא</h3>
          <div class="grid grid-cols-3 gap-3">
            ${Object.entries(CONFIG.themes).map(([key, t]) => `
              <button data-theme="${key}" class="p-3 rounded-xl border-2 transition-all ${theme === key ? 'border-gold' : 'border-gray-200'}">
                <div class="w-full h-12 rounded-lg mb-2" style="background:${t.bg};border:1px solid ${t.accent}"></div>
                <div class="text-sm font-medium text-gray-700">${t.name}</div>
              </button>
            `).join('')}
          </div>
          <!-- Live Preview -->
          <div class="mt-4 p-4 rounded-xl theme-${theme}" style="background:var(--bg);border:1px solid var(--border)">
            <div class="text-center mb-3">
              ${s.logo_url ? `<img src="${s.logo_url}" class="mx-auto h-12 object-contain">` : `<h4 class="font-playfair" style="color:var(--accent)">${Utils.escape(this.state.restaurant?.name || 'מסעדה')}</h4>`}
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg p-3 text-center" style="background:var(--card);border:1px solid var(--border)"><span style="color:var(--text)">💧 מים</span></div>
              <div class="rounded-lg p-3 text-center" style="background:var(--card);border:1px solid var(--border)"><span style="color:var(--text)">🧾 חשבון</span></div>
            </div>
          </div>
        </div>

        <!-- Customer View Mode -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">📱 תצוגת לקוח</h3>
          <p class="text-sm text-gray-500 mb-3">בחר מה הלקוח רואה כשהוא סורק את הברקוד:</p>
          <div class="space-y-2">
            <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${viewMode === 'full_menu' ? 'border-gold bg-gold/5' : 'border-gray-200'}">
              <input type="radio" name="view-mode" value="full_menu" ${viewMode === 'full_menu' ? 'checked' : ''} class="text-gold">
              <div><div class="font-medium text-gray-700">תפריט מלא</div><div class="text-xs text-gray-400">לוגו + מתנה + תפריט + כל כפתורי השירות</div></div>
            </label>
            <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${viewMode === 'service_only' ? 'border-gold bg-gold/5' : 'border-gray-200'}">
              <input type="radio" name="view-mode" value="service_only" ${viewMode === 'service_only' ? 'checked' : ''} class="text-gold">
              <div><div class="font-medium text-gray-700">שירותים בלבד</div><div class="text-xs text-gray-400">לוגו + כפתורי שירות (מים, חשבון, מלצר, בקשה מיוחדת)</div></div>
            </label>
            <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${viewMode === 'minimal' ? 'border-gold bg-gold/5' : 'border-gray-200'}">
              <input type="radio" name="view-mode" value="minimal" ${viewMode === 'minimal' ? 'checked' : ''} class="text-gold">
              <div><div class="font-medium text-gray-700">מינימלי</div><div class="text-xs text-gray-400">לוגו + כפתור מלצר + כפתור חשבון בלבד</div></div>
            </label>
          </div>
        </div>

        <!-- Escalation Settings -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">⏱️ דחיפות וזמני תגובה</h3>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="text-sm text-gray-600">🟢 ירוק (דקות)</label><input type="number" id="esc-green" class="input-field mt-1" value="${s.escalation_green_minutes || CONFIG.escalationDefaults.green}" min="1" max="30"></div>
            <div><label class="text-sm text-gray-600">🟠 כתום (דקות)</label><input type="number" id="esc-orange" class="input-field mt-1" value="${s.escalation_orange_minutes || CONFIG.escalationDefaults.orange}" min="2" max="60"></div>
            <div><label class="text-sm text-gray-600">🔴 אדום (דקות)</label><input type="number" id="esc-red" class="input-field mt-1" value="${s.escalation_alert_minutes || CONFIG.escalationDefaults.red}" min="3" max="120"></div>
          </div>
        </div>

        <!-- Operating Hours -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">🕐 שעות פעילות</h3>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-sm text-gray-600">פתיחה</label><input type="time" id="open-hour" class="input-field mt-1" value="${s.operating_hours?.open || '10:00'}"></div>
            <div><label class="text-sm text-gray-600">סגירה</label><input type="time" id="close-hour" class="input-field mt-1" value="${s.operating_hours?.close || '23:00'}"></div>
          </div>
        </div>

        <button id="save-settings" class="btn-primary w-full">שמור הגדרות</button>
        <p id="settings-msg" class="text-center text-sm hidden"></p>
      </div>
    `;
  },

  // --- MENU MANAGEMENT ---
  renderMenu() {
    if (this.state.editingMenuItem !== null) return this.renderMenuItemForm();
    
    const items = this.state.menuItems;
    const categories = {};
    items.forEach(item => {
      const cat = item.category || 'כללי';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
    });
    
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">📋 ניהול תפריט (${items.length})</h2>
          <div class="flex gap-2">
            <button id="upload-menu-file-btn" class="btn-secondary text-sm">📤 העלה קובץ</button>
            <button id="add-menu-item-btn" class="btn-primary text-sm">+ הוסף פריט</button>
          </div>
        </div>
        ${items.length === 0 ? Utils.emptyState('אין פריטים בתפריט', '📋') : ''}
        ${Object.entries(categories).map(([cat, catItems]) => `
          <div class="card">
            <h3 class="font-semibold text-gray-700 mb-3">${Utils.escape(cat)} (${catItems.length})</h3>
            <div class="space-y-2">
              ${catItems.map(item => `
                <div class="flex items-center gap-3 py-2 border-b last:border-0">
                  ${item.image_url ? `<img src="${item.image_url}" class="w-12 h-12 rounded-lg object-cover">` : '<div class="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">🍽️</div>'}
                  <div class="flex-1">
                    <div class="font-medium text-gray-800">${Utils.escape(item.name)}</div>
                    <div class="text-xs text-gray-400">${Utils.escape(item.description || '')}</div>
                  </div>
                  <div class="text-sm font-bold text-gold">₪${item.price || 0}</div>
                  <span class="text-xs px-2 py-1 rounded ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">${item.is_active ? 'פעיל' : 'מוסתר'}</span>
                  <button data-edit-menu="${item.id}" class="text-blue-500 text-sm px-2">✏️</button>
                  <button data-delete-menu="${item.id}" class="text-red-500 text-sm px-2">🗑️</button>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderMenuItemForm() {
    const item = this.state.editingMenuItem || {};
    const isEdit = !!item.id;
    
    return `
      <div class="space-y-4">
        <button id="back-to-menu" class="text-sm text-gray-500 hover:text-gray-700">← חזרה לתפריט</button>
        <div class="card max-w-lg mx-auto">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">${isEdit ? 'עריכת פריט' : 'פריט חדש'}</h2>
          
          <!-- File Upload Section -->
          ${!isEdit ? `
          <div class="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p class="text-sm text-blue-700 mb-2 font-medium">📤 העלה תפריט מקובץ</p>
            <p class="text-xs text-blue-500 mb-3">בחר קובץ PDF או Word מהטלפון, והמערכת תקרא את התוכן ותסדר אותו באופן אוטומטי</p>
            <input type="file" id="menu-file-upload" accept=".pdf,.doc,.docx" class="hidden">
            <button type="button" id="menu-file-btn" class="btn-secondary text-sm w-full">📄 בחר קובץ PDF/Word</button>
            <div id="file-upload-progress" class="mt-2 hidden">
              <div class="flex items-center gap-2 text-sm text-blue-600">
                <div class="spinner" style="width:16px;height:16px;border-width:2px"></div>
                <span id="file-upload-status">קורא קובץ...</span>
              </div>
            </div>
          </div>
          ` : ''}
          
          <form id="menu-item-form" class="space-y-4">
            <div><label class="text-sm text-gray-600 mb-1 block">שם מנה *</label><input type="text" id="menu-name" class="input-field" required value="${Utils.escape(item.name || '')}"></div>
            <div><label class="text-sm text-gray-600 mb-1 block">תיאור</label><textarea id="menu-desc" class="input-field" rows="2">${Utils.escape(item.description || '')}</textarea></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-gray-600 mb-1 block">מחיר (₪)</label><input type="number" id="menu-price" class="input-field" value="${item.price || ''}" step="0.01"></div>
              <div><label class="text-sm text-gray-600 mb-1 block">קטגוריה</label><input type="text" id="menu-category" class="input-field" value="${Utils.escape(item.category || '')}" placeholder="מנות ראשונות, עיקריות..."></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-sm text-gray-600 mb-1 block">סדר תצוגה</label><input type="number" id="menu-sort" class="input-field" value="${item.sort_order || 0}" min="0"></div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">תמונת מנה</label>
                <div class="flex items-center gap-2">
                  ${item.image_url ? `<img src="${item.image_url}" class="w-10 h-10 rounded object-cover">` : ''}
                  <input type="file" id="menu-image-upload" accept="image/*" class="hidden">
                  <button type="button" id="menu-image-btn" class="btn-secondary text-sm flex-shrink-0">📷 בחר</button>
                </div>
              </div>
            </div>
            <label class="flex items-center gap-2"><input type="checkbox" id="menu-active" ${item.is_active !== false ? 'checked' : ''}><span class="text-sm text-gray-600">פעיל (מוצג ללקוחות)</span></label>
            <p id="menu-form-msg" class="text-center text-sm hidden"></p>
            <button type="submit" class="btn-primary w-full">${isEdit ? 'עדכן' : 'הוסף'} פריט</button>
          </form>
        </div>
      </div>
    `;
  },

  // --- GIFTS MANAGEMENT ---
  renderGifts() {
    if (this.state.editingGift !== null) return this.renderGiftForm();
    
    const gifts = this.state.gifts;
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">🎁 ניהול מתנות (${gifts.length})</h2>
          <button id="add-gift-btn" class="btn-primary text-sm">+ הוסף מתנה</button>
        </div>
        ${gifts.length === 0 ? Utils.emptyState('אין מתנות', '🎁') : ''}
        <div class="space-y-2">
          ${gifts.map(gift => `
            <div class="card flex items-center gap-3">
              <div class="text-3xl">${gift.icon || '🎁'}</div>
              <div class="flex-1">
                <div class="font-medium text-gray-800">${Utils.escape(gift.title)}</div>
                <div class="text-xs text-gray-400">${Utils.escape(gift.description || '')}</div>
              </div>
              <span class="text-xs px-2 py-1 rounded ${gift.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">${gift.is_active ? 'פעיל' : 'מוסתר'}</span>
              <button data-edit-gift="${gift.id}" class="text-blue-500 text-sm px-2">✏️</button>
              <button data-delete-gift="${gift.id}" class="text-red-500 text-sm px-2">🗑️</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderGiftForm() {
    const gift = this.state.editingGift || {};
    const isEdit = !!gift.id;
    
    return `
      <div class="space-y-4">
        <button id="back-to-gifts" class="text-sm text-gray-500 hover:text-gray-700">← חזרה למתנות</button>
        <div class="card max-w-lg mx-auto">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">${isEdit ? 'עריכת מתנה' : 'מתנה חדשה'}</h2>
          <form id="gift-form" class="space-y-4">
            <div class="grid grid-cols-4 gap-3">
              <div class="col-span-1"><label class="text-sm text-gray-600 mb-1 block">אייקון</label><input type="text" id="gift-icon" class="input-field text-center text-2xl" value="${Utils.escape(gift.icon || '🎁')}" maxlength="4"></div>
              <div class="col-span-3"><label class="text-sm text-gray-600 mb-1 block">כותרת *</label><input type="text" id="gift-title" class="input-field" required value="${Utils.escape(gift.title || '')}" placeholder="קיבלת פחית קולה!"></div>
            </div>
            <div><label class="text-sm text-gray-600 mb-1 block">תיאור</label><textarea id="gift-desc" class="input-field" rows="2" placeholder="הלקוח קיבל פחית קולה עלינו 🎉">${Utils.escape(gift.description || '')}</textarea></div>
            
            <!-- Image Upload -->
            <div>
              <label class="text-sm text-gray-600 mb-2 block">תמונה (אופציונלי)</label>
              <div class="flex items-center gap-3">
                ${gift.image_url 
                  ? `<img src="${gift.image_url}" class="w-20 h-20 rounded-lg object-cover border border-gray-200" id="gift-image-preview">`
                  : '<div class="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-3xl text-gray-300">📷</div>'}
                <div class="flex-1">
                  <input type="file" id="gift-image-upload" accept="image/*" class="hidden">
                  <button type="button" id="gift-image-btn" class="btn-secondary text-sm">📷 בחר תמונה</button>
                  ${gift.image_url ? '<button type="button" id="gift-image-remove" class="btn-secondary text-sm text-red-500 mr-2">הסר</button>' : ''}
                  <p class="text-xs text-gray-400 mt-2">מתוך הגלריה, דרייב, או כל מאגר בטלפון</p>
                </div>
              </div>
            </div>
            
            <label class="flex items-center gap-2"><input type="checkbox" id="gift-active" ${gift.is_active !== false ? 'checked' : ''}><span class="text-sm text-gray-600">פעיל</span></label>
            <p id="gift-form-msg" class="text-center text-sm hidden"></p>
            <button type="submit" class="btn-primary w-full">${isEdit ? 'עדכן' : 'הוסף'} מתנה</button>
          </form>
        </div>
      </div>
    `;
  },

  // --- REPORTS ---
  async loadReports() {
    try {
      this.state.reports = await apiCall({
        action: 'getReports',
        filters: { restaurant_id: this.state.restaurantId },
      });
    } catch(e) { console.error(e); this.state.reports = null; }
    this.render();
  },

  renderReports() {
    const r = this.state.reports;
    if (!r) {
      // Trigger load
      if (!this.state._reportsLoading) {
        this.state._reportsLoading = true;
        this.loadReports();
      }
      return '<div class="space-y-4"><h2 class="text-lg font-semibold text-gray-800">📈 דוחות</h2>' + Utils.spinner() + '</div>';
    }
    this.state._reportsLoading = false;
    
    // Task type labels
    const typeLabels = Object.entries(CONFIG.taskTypes).map(([k, v]) => ({ key: k, icon: v.icon, label: v.label }));
    
    // Build by-type breakdown
    const byTypeHTML = typeLabels.map(({ key, icon, label }) => {
      const data = r.byType?.[key];
      if (!data || data.count === 0) return '';
      const pct = r.total > 0 ? Math.round((data.count / r.total) * 100) : 0;
      return `
        <div class="py-2 border-b last:border-0">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm">${icon} ${label}</span>
            <span class="text-sm font-bold text-gray-700">${data.count} (${pct}%)</span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div class="bg-gold rounded-full h-2 transition-all" style="width:${pct}%"></div>
          </div>
          ${data.avgResponse > 0 ? `<div class="text-xs text-gray-400 mt-1">⏱ ממוצע תגובה: ${data.avgResponse}s · ${data.completed} הושלמו</div>` : ''}
        </div>
      `;
    }).join('');

    // Build by-hour mini chart (bars)
    const maxHour = Math.max(...r.byHour, 1);
    const hourBars = r.byHour.map((count, hour) => {
      if (count === 0) return '';
      const height = Math.round((count / maxHour) * 100);
      return `<div class="flex flex-col items-center flex-1" title="${hour}:00 - ${count} בקשות"><div class="text-xs text-gray-400 mb-0.5">${count}</div><div class="w-full bg-gold rounded-t" style="height:${height}px;min-height:2px"></div><div class="text-xs text-gray-400 mt-0.5">${hour}</div></div>`;
    }).join('');
    
    return `
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-800">📈 דוחות וניתוח</h2>
        
        <!-- Overview Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="card text-center"><div class="text-2xl font-bold text-gold">${r.total}</div><div class="text-xs text-gray-500 mt-1">סה"כ בקשות</div></div>
          <div class="card text-center"><div class="text-2xl font-bold text-green-500">${r.completed}</div><div class="text-xs text-gray-500 mt-1">הושלמו</div></div>
          <div class="card text-center"><div class="text-2xl font-bold text-blue-500">${r.avgResponseTime}s</div><div class="text-xs text-gray-500 mt-1">ממוצע תגובה</div></div>
          <div class="card text-center"><div class="text-2xl font-bold text-purple-500">${r.completionRate}%</div><div class="text-xs text-gray-500 mt-1">אחוז השלמה</div></div>
        </div>

        <!-- Today -->
        <div class="grid grid-cols-2 gap-3">
          <div class="card text-center"><div class="text-xl font-bold text-orange-500">${r.todayCount}</div><div class="text-xs text-gray-500 mt-1">בקשות היום</div></div>
          <div class="card text-center"><div class="text-xl font-bold text-green-500">${r.todayCompleted}</div><div class="text-xs text-gray-500 mt-1">הושלמו היום</div></div>
        </div>

        <!-- Response time breakdown -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">⏱ זמני תגובה</h3>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div><div class="text-lg font-bold text-green-500">${r.minResponseTime}s</div><div class="text-xs text-gray-400">מינימום</div></div>
            <div><div class="text-lg font-bold text-blue-500">${r.avgResponseTime}s</div><div class="text-xs text-gray-400">ממוצע</div></div>
            <div><div class="text-lg font-bold text-red-500">${r.maxResponseTime}s</div><div class="text-xs text-gray-400">מקסימום</div></div>
          </div>
        </div>

        <!-- By Type -->
        ${byTypeHTML ? `
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">📊 פילוח לפי סוג בקשה</h3>
          ${byTypeHTML}
        </div>` : ''}

        <!-- By Hour -->
        ${hourBars ? `
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">🕐 פילוח לפי שעה</h3>
          <div class="flex items-end gap-1 h-32">
            ${hourBars}
          </div>
        </div>` : ''}
        
        ${r.total === 0 ? Utils.emptyState('אין נתונים עדיין', '📊') : ''}
      </div>
    `;
  },

  renderSetupWizard() {
    return `<div class="card text-center py-8"><p class="text-gray-400">הגדרות ראשוניות — עבור להגדרות כדי להגדיר את המסעדה</p></div>`;
  },

  // --- EVENTS ---
  attachEvents() {
    const logout = document.getElementById('admin-logout');
    if (logout) logout.addEventListener('click', () => { Auth.clearAll(); this.state.admin = null; this.state.tab = 'dashboard'; this.renderLogin(); });
    
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { this.state.tab = btn.dataset.tab; this.state.editingMenuItem = null; this.state.editingGift = null; this.state.reports = null; this.state._reportsLoading = false; this.render(); });
    });
    
    const addTableBtn = document.getElementById('add-table-btn');
    if (addTableBtn) addTableBtn.addEventListener('click', () => this.showAddTableForm());
    
    // Settings
    const saveSettings = document.getElementById('save-settings');
    if (saveSettings) saveSettings.addEventListener('click', () => this.saveSettings());
    
    // Logo upload
    const logoBtn = document.getElementById('logo-upload-btn');
    if (logoBtn) logoBtn.addEventListener('click', () => document.getElementById('logo-upload').click());
    const logoInput = document.getElementById('logo-upload');
    if (logoInput) logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
    const logoRemove = document.getElementById('logo-remove-btn');
    if (logoRemove) logoRemove.addEventListener('click', () => this.removeLogo());
    
    // Theme selection
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.querySelectorAll('[data-theme]').forEach(b => { b.className = b.className.replace('border-gold', 'border-gray-200'); });
        btn.className = btn.className.replace('border-gray-200', 'border-gold');
        // Update live preview
        const preview = btn.closest('.card').querySelector('.theme-luxury, .theme-premium, .theme-classic');
        if (preview) { preview.className = `mt-4 p-4 rounded-xl theme-${theme}`; preview.style.background = 'var(--bg)'; }
        // Save theme immediately
        if (this.state.settings?.id) {
          sbUpdate('restaurant_settings', { id: this.state.settings.id }, { theme }).then(() => {
            this.state.settings.theme = theme;
          });
        }
      });
    });
    
    // View mode radio
    document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('input[name="view-mode"]').forEach(r => {
          r.closest('label').className = r.closest('label').className.replace('border-gold bg-gold/5', 'border-gray-200');
        });
        radio.closest('label').className = radio.closest('label').className.replace('border-gray-200', 'border-gold bg-gold/5');
      });
    });
    
    // Menu management
    const addMenuBtn = document.getElementById('add-menu-item-btn');
    if (addMenuBtn) addMenuBtn.addEventListener('click', () => { this.state.editingMenuItem = {}; this.render(); });
    
    const uploadMenuFileBtn = document.getElementById('upload-menu-file-btn');
    if (uploadMenuFileBtn) uploadMenuFileBtn.addEventListener('click', () => { this.state.editingMenuItem = {}; this.state._showFileUpload = true; this.render(); });
    
    const menuFileBtn = document.getElementById('menu-file-btn');
    if (menuFileBtn) menuFileBtn.addEventListener('click', () => document.getElementById('menu-file-upload').click());
    const menuFileInput = document.getElementById('menu-file-upload');
    if (menuFileInput) menuFileInput.addEventListener('change', (e) => this.handleMenuFileUpload(e));
    
    const menuImgBtn = document.getElementById('menu-image-btn');
    if (menuImgBtn) menuImgBtn.addEventListener('click', () => document.getElementById('menu-image-upload').click());
    const menuImgInput = document.getElementById('menu-image-upload');
    if (menuImgInput) menuImgInput.addEventListener('change', (e) => this.handleMenuImageUpload(e));
    const backToMenu = document.getElementById('back-to-menu');
    if (backToMenu) backToMenu.addEventListener('click', () => { this.state.editingMenuItem = null; this.render(); });
    const menuItemForm = document.getElementById('menu-item-form');
    if (menuItemForm) menuItemForm.addEventListener('submit', (e) => this.saveMenuItem(e));
    document.querySelectorAll('[data-edit-menu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = this.state.menuItems.find(m => m.id === btn.dataset.editMenu);
        if (item) { this.state.editingMenuItem = { ...item }; this.render(); }
      });
    });
    document.querySelectorAll('[data-delete-menu]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('מחיקת פריט?')) return;
        try { await sbDelete('menu_items', { id: btn.dataset.deleteMenu }); await this.loadMenuItems(); this.render(); } catch(e) {}
      });
    });
    
    // Gifts management
    const addGiftBtn = document.getElementById('add-gift-btn');
    if (addGiftBtn) addGiftBtn.addEventListener('click', () => { this.state.editingGift = {}; this.render(); });
    const backToGifts = document.getElementById('back-to-gifts');
    if (backToGifts) backToGifts.addEventListener('click', () => { this.state.editingGift = null; this.render(); });
    const giftForm = document.getElementById('gift-form');
    if (giftForm) giftForm.addEventListener('submit', (e) => this.saveGift(e));
    
    // Gift image upload
    const giftImgBtn = document.getElementById('gift-image-btn');
    if (giftImgBtn) giftImgBtn.addEventListener('click', () => document.getElementById('gift-image-upload').click());
    const giftImgInput = document.getElementById('gift-image-upload');
    if (giftImgInput) giftImgInput.addEventListener('change', (e) => this.handleGiftImageUpload(e));
    const giftImgRemove = document.getElementById('gift-image-remove');
    if (giftImgRemove) giftImgRemove.addEventListener('click', () => { this.state._giftImage = ''; this.state.editingGift.image_url = ''; this.render(); });
    document.querySelectorAll('[data-edit-gift]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gift = this.state.gifts.find(g => g.id === btn.dataset.editGift);
        if (gift) { this.state.editingGift = { ...gift }; this.render(); }
      });
    });
    document.querySelectorAll('[data-delete-gift]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('מחיקת מתנה?')) return;
        try { await sbDelete('gifts', { id: btn.dataset.deleteGift }); await this.loadGifts(); this.render(); } catch(e) {}
      });
    });
  },

  async saveSettings() {
    const msg = document.getElementById('settings-msg');
    try {
      const viewMode = document.querySelector('input[name="view-mode"]:checked')?.value || 'full_menu';
      const data = {
        theme: this.state.settings?.theme || 'luxury',
        customer_view_mode: viewMode,
        escalation_green_minutes: parseInt(document.getElementById('esc-green')?.value || 2),
        escalation_orange_minutes: parseInt(document.getElementById('esc-orange')?.value || 4),
        escalation_alert_minutes: parseInt(document.getElementById('esc-red')?.value || 5),
        operating_hours: {
          open: document.getElementById('open-hour')?.value || '10:00',
          close: document.getElementById('close-hour')?.value || '23:00',
        },
      };
      
      if (this.state.settings?.id) {
        await sbUpdate('restaurant_settings', { id: this.state.settings.id }, data);
        Object.assign(this.state.settings, data);
      }
      
      msg.textContent = '✅ הגדרות נשמרו בהצלחה';
      msg.className = 'text-center text-sm text-green-500';
    } catch (e) {
      msg.textContent = '❌ שגיאה: ' + e.message;
      msg.className = 'text-center text-sm text-red-500';
    }
    msg.classList.remove('hidden');
  },

  async handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { Utils.toast('התמונה גדולה מדי (מקסימום 500KB)'); return; }
    
    // Compress image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = async () => {
      const maxDim = 300;
      let { width, height } = img;
      if (width > height && width > maxDim) { height = height * maxDim / width; width = maxDim; }
      else if (height > maxDim) { width = width * maxDim / height; height = maxDim; }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/png', 0.85);
      
      // Save to settings
      try {
        if (this.state.settings?.id) {
          await sbUpdate('restaurant_settings', { id: this.state.settings.id }, { logo_url: dataUrl });
          this.state.settings.logo_url = dataUrl;
          Utils.toast('לוגו נשמר!', 'success');
          this.render();
        }
      } catch (err) { Utils.toast('שגיאה בשמירת לוגו'); }
    };
    img.src = URL.createObjectURL(file);
  },

  async removeLogo() {
    try {
      if (this.state.settings?.id) {
        await sbUpdate('restaurant_settings', { id: this.state.settings.id }, { logo_url: '' });
        this.state.settings.logo_url = '';
        Utils.toast('לוגו הוסר', 'success');
        this.render();
      }
    } catch(e) { Utils.toast('שגיאה'); }
  },

  async handleMenuFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const progressEl = document.getElementById('file-upload-progress');
    const statusEl = document.getElementById('file-upload-status');
    if (progressEl) progressEl.classList.remove('hidden');
    if (statusEl) statusEl.textContent = 'קורא קובץ...';
    
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let text = '';
      
      if (ext === 'pdf') {
        // Use pdf.js to read PDF
        if (!window.pdfjsLib) {
          // Load pdf.js dynamically
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (statusEl) statusEl.textContent = 'מנתח תוכן...';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          text += pageText + '\n';
        }
      } else if (ext === 'doc' || ext === 'docx') {
        // Use mammoth.js to read Word
        if (!window.mammoth) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        Utils.toast('פורמט לא נתמך. אנא השתמש ב-PDF או Word.');
        if (progressEl) progressEl.classList.add('hidden');
        return;
      }
      
      if (statusEl) statusEl.textContent = 'מסדר פריטים...';
      
      // Parse text into menu items
      const items = this.parseMenuText(text);
      
      if (items.length === 0) {
        Utils.toast('לא נמצאו פריטים בקובץ');
        if (progressEl) progressEl.classList.add('hidden');
        return;
      }
      
      // If multiple items found, bulk import them
      if (items.length > 1) {
        if (!confirm('נמצאו ' + items.length + ' פריטים בקובץ. להוסיף את כול�ם?')) {
          if (progressEl) progressEl.classList.add('hidden');
          return;
        }
        let added = 0;
        for (const item of items) {
          try {
            await sbInsert('menu_items', { ...item, restaurant_id: this.state.restaurantId, is_active: true });
            added++;
          } catch(e) { console.error(e); }
        }
        Utils.toast('✅ ' + added + ' פריטים נוספו בהצלחה!');
        await this.loadMenuItems();
        this.state.editingMenuItem = null;
        if (progressEl) progressEl.classList.add('hidden');
        this.render();
        return;
      }
      
      // Single item — fill the form
      const item = items[0];
      const nameEl = document.getElementById('menu-name');
      const descEl = document.getElementById('menu-desc');
      const priceEl = document.getElementById('menu-price');
      const catEl = document.getElementById('menu-category');
      if (nameEl) nameEl.value = item.name || '';
      if (descEl) descEl.value = item.description || '';
      if (priceEl) priceEl.value = item.price || '';
      if (catEl) catEl.value = item.category || '';
      if (statusEl) statusEl.textContent = '✅ נקרא בהצלחה! בדוק את הפרטים';
      Utils.toast('קובץ נקרא בהצלחה ✓');
      setTimeout(() => { if (progressEl) progressEl.classList.add('hidden'); }, 2000);
    } catch (err) {
      console.error('File read error:', err);
      Utils.toast('שגיאה בקריאת הקובץ: ' + err.message);
      if (progressEl) progressEl.classList.add('hidden');
    }
  },

  // Parse text from PDF/Word into menu items
  parseMenuText(text) {
    const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    const items = [];
    let currentCategory = 'כללי';
    
    for (const line of lines) {
      // Skip very short lines or headers
      if (line.length < 2) continue;
      
      // Try to extract price (number at end, possibly with ₪ or "שח")
      const priceMatch = line.match(/(\d+(?:\.\d+)?)\s*(₪|ש\"ח|shekel|nis)?\s*$/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      
      // Try to extract name and description
      let name = line;
      let description = '';
      
      // If there's a dash or bullet separating name and description
      const dashMatch = line.match(/^(.+?)\s*[\-–—]\s*(.+)$/);
      if (dashMatch) {
        name = dashMatch[1].trim();
        description = dashMatch[2].trim();
        // Check if description ends with price
        if (price) {
          description = description.replace(/(\d+(?:\.\d+)?)\s*(₪|ש\"ח|shekel|nis)?\s*$/i, '').trim();
        }
      } else if (price) {
        name = line.replace(/(\d+(?:\.\d+)?)\s*(₪|ש\"ח|shekel|nis)?\s*$/i, '').trim();
      }
      
      // Clean up name
      name = name.replace(/^\d+[.)\s]+/, '').replace(/^[•·▪◆●]\s*/, '').trim();
      if (!name || name.length < 2) continue;
      
      // If the line looks like a category header (no price, short, no description separator)
      if (!price && !dashMatch && line.length < 30 && !line.includes('.')) {
        currentCategory = name;
        continue;
      }
      
      items.push({
        name,
        description: description || '',
        price: price || 0,
        category: currentCategory,
        sort_order: items.length + 1,
      });
    }
    
    return items;
  },

  async handleMenuImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { Utils.toast('התמונה גדולה מדי (מקסימום 2MB)'); return; }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const maxDim = 400;
      let { width, height } = img;
      if (width > height && width > maxDim) { height = height * maxDim / width; width = maxDim; }
      else if (height > maxDim) { width = width * maxDim / height; height = maxDim; }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      this.state._menuImage = dataUrl;
      if (this.state.editingMenuItem) this.state.editingMenuItem.image_url = dataUrl;
      Utils.toast('תמונה נבחרה ✓');
      this.render();
    };
    img.src = URL.createObjectURL(file);
  },

  async saveMenuItem(e) {
    e.preventDefault();
    const msg = document.getElementById('menu-form-msg');
    const item = this.state.editingMenuItem || {};
    const data = {
      restaurant_id: this.state.restaurantId,
      name: document.getElementById('menu-name').value.trim(),
      description: document.getElementById('menu-desc').value.trim(),
      price: parseFloat(document.getElementById('menu-price').value) || 0,
      category: document.getElementById('menu-category').value.trim() || 'כללי',
      sort_order: parseInt(document.getElementById('menu-sort').value) || 0,
      image_url: this.state._menuImage || this.state.editingMenuItem?.image_url || '',
      is_active: document.getElementById('menu-active').checked,
    };
    
    try {
      if (item.id) {
        await sbUpdate('menu_items', { id: item.id }, data);
      } else {
        await sbInsert('menu_items', data);
      }
      msg.textContent = '✅ נשמר!'; msg.className = 'text-center text-sm text-green-500';
      await this.loadMenuItems();
      setTimeout(() => { this.state.editingMenuItem = null; this.render(); }, 1000);
    } catch (err) {
      msg.textContent = '❌ ' + err.message; msg.className = 'text-center text-sm text-red-500';
    }
    msg.classList.remove('hidden');
  },

  async handleGiftImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { Utils.toast('התמונה גדולה מדי (מקסימום 2MB)'); return; }
    
    // Compress image like logo
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const maxDim = 400;
      let { width, height } = img;
      if (width > height && width > maxDim) { height = height * maxDim / width; width = maxDim; }
      else if (height > maxDim) { width = width * maxDim / height; height = maxDim; }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      this.state._giftImage = canvas.toDataURL('image/jpeg', 0.85);
      Utils.toast('תמונה נבחרה ✓');
      // Update preview
      const preview = document.getElementById('gift-image-preview');
      if (preview) preview.src = this.state._giftImage;
    };
    img.src = URL.createObjectURL(file);
  },

  async saveGift(e) {
    e.preventDefault();
    const msg = document.getElementById('gift-form-msg');
    const gift = this.state.editingGift || {};
    const data = {
      restaurant_id: this.state.restaurantId,
      title: document.getElementById('gift-title').value.trim(),
      description: document.getElementById('gift-desc').value.trim(),
      icon: document.getElementById('gift-icon').value.trim() || '🎁',
      image_url: this.state._giftImage || gift.image_url || '',
      is_active: document.getElementById('gift-active').checked,
    };
    
    try {
      if (gift.id) {
        await sbUpdate('gifts', { id: gift.id }, data);
      } else {
        await sbInsert('gifts', data);
      }
      msg.textContent = '✅ נשמר!'; msg.className = 'text-center text-sm text-green-500';
      await this.loadGifts();
      setTimeout(() => { this.state.editingGift = null; this.render(); }, 1000);
    } catch (err) {
      msg.textContent = '❌ ' + err.message; msg.className = 'text-center text-sm text-red-500';
    }
    msg.classList.remove('hidden');
  },
};
