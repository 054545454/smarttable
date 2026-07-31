// SmartTable — Admin/Owner Screen (Dashboard, Settings, Menu, Gifts, Reports, AI Chat, Tables)
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
  },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('admin');
    
    if (saved && saved.restaurant_id === restaurantId) {
      this.state.admin = saved;
      // Check if must change password
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
        if (e.message === 'MUST_CHANGE_PASSWORD') {
          // Already handled by Auth
          return;
        }
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
    if (!this.state.settings || !this.state.settings.theme) {
      this.state.tab = 'setup';
    }
    this.render();
  },

  async loadRestaurant() {
    try {
      const allRestaurants = await sbSelect('restaurants', { id: this.state.restaurantId });
      this.state.restaurant = allRestaurants[0] || null;
    } catch(e) { console.error(e); }
  },

  async loadSettings() {
    try {
      const allSettings = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId });
      this.state.settings = allSettings[0] || null;
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
            ${this.renderTab('ai', '🤖')}
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
    const labels = {
      dashboard: t('dashboard'), settings: t('settings'), menu: t('menu'),
      gifts: t('gifts'), reports: t('reports'), ai: t('aiChat'), setup: t('setupWizard'),
      tables: 'שולחנות',
    };
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
      case 'ai': return this.renderAI();
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
      <div class="card"><h3 class="font-semibold text-gray-700 mb-2">פעילות אחרונה</h3><p class="text-gray-400 text-sm">טען נתונים נוספים מכאן...</p></div>
    `;
  },

  // --- TABLES: Floor plan with drag-and-drop + QR generation ---
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
    this.renderTablesOnly();
    this.initDragAndDrop();
  },

  renderTablesOnly() {
    const floorPlan = document.getElementById('floor-plan');
    if (floorPlan) {
      floorPlan.innerHTML = this.state.tables.map(t => this.renderTableOnFloor(t)).join('');
      // Add click handlers
      floorPlan.querySelectorAll('[data-table-id]').forEach(el => {
        el.addEventListener('click', (e) => {
          if (!this.state.draggedTable) {
            const tableId = el.dataset.tableId;
            const table = this.state.tables.find(t => t.id === tableId);
            if (table) this.showTableDetails(table);
          }
        });
      });
    }
  },

  initDragAndDrop() {
    const floorPlan = document.getElementById('floor-plan');
    if (!floorPlan) return;
    
    let dragEl = null;
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;
    let hasMoved = false;
    
    floorPlan.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.table-floor-item');
      if (!item) return;
      e.preventDefault();
      dragEl = item;
      hasMoved = false;
      const rect = item.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origX = parseInt(item.style.left) || 0;
      origY = parseInt(item.style.top) || 0;
      item.style.opacity = '0.7';
      item.style.zIndex = '100';
      this.state.draggedTable = null;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!dragEl) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
      const newX = Math.max(0, Math.min(floorPlan.offsetWidth - 80, origX + dx));
      const newY = Math.max(0, Math.min(floorPlan.offsetHeight - 80, origY + dy));
      dragEl.style.left = newX + 'px';
      dragEl.style.top = newY + 'px';
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!dragEl) return;
      dragEl.style.opacity = '1';
      dragEl.style.zIndex = '1';
      if (hasMoved) {
        const tableId = dragEl.dataset.tableId;
        const newX = Math.round(parseInt(dragEl.style.left));
        const newY = Math.round(parseInt(dragEl.style.top));
        // Update position via API
        apiCall({ action: 'updateTablePosition', data: { table_id: tableId, pos_x: newX, pos_y: newY } })
          .catch(err => console.error('Position update failed:', err));
        // Update local state
        const table = this.state.tables.find(t => t.id === tableId);
        if (table) { table.pos_x = newX; table.pos_y = newY; }
        this.state.draggedTable = true;
        setTimeout(() => { this.state.draggedTable = null; }, 100);
      }
      dragEl = null;
    });
    
    // Touch support
    floorPlan.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.table-floor-item');
      if (!item) return;
      const touch = e.touches[0];
      dragEl = item;
      hasMoved = false;
      startX = touch.clientX;
      startY = touch.clientY;
      origX = parseInt(item.style.left) || 0;
      origY = parseInt(item.style.top) || 0;
      item.style.opacity = '0.7';
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (!dragEl) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
      const newX = Math.max(0, Math.min(floorPlan.offsetWidth - 80, origX + dx));
      const newY = Math.max(0, Math.min(floorPlan.offsetHeight - 80, origY + dy));
      dragEl.style.left = newX + 'px';
      dragEl.style.top = newY + 'px';
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
      if (!dragEl) return;
      dragEl.style.opacity = '1';
      if (hasMoved) {
        const tableId = dragEl.dataset.tableId;
        const newX = Math.round(parseInt(dragEl.style.left));
        const newY = Math.round(parseInt(dragEl.style.top));
        apiCall({ action: 'updateTablePosition', data: { table_id: tableId, pos_x: newX, pos_y: newY } })
          .catch(err => console.error('Position update failed:', err));
        const table = this.state.tables.find(t => t.id === tableId);
        if (table) { table.pos_x = newX; table.pos_y = newY; }
        this.state.draggedTable = true;
        setTimeout(() => { this.state.draggedTable = null; }, 100);
      }
      dragEl = null;
    });
  },

  showTableDetails(table) {
    const qrUrl = `https://violet-dunlin-978279.hostingersite.com/#c/${table.qr_token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-4xl mx-auto">
            <div class="flex items-center gap-2">
              <span class="text-xl">🪑</span>
              <div><h1 class="text-lg font-semibold">שולחן מספר ${table.table_number}</h1></div>
            </div>
            <button id="back-to-tables" class="text-gray-400 hover:text-white text-sm">← חזרה</button>
          </div>
        </div>
        <div class="max-w-2xl mx-auto p-4 space-y-4">
          <!-- QR Code -->
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
          
          <!-- Table Details -->
          <div class="card space-y-3">
            <h3 class="font-semibold text-gray-700 mb-2">פרטי השולחן</h3>
            <form id="edit-table-form" class="space-y-3">
              <div>
                <label class="text-sm text-gray-600 mb-1 block">מספר שולחן</label>
                <input type="number" id="edit-table-number" class="input-field" value="${table.table_number}" min="1">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">הערות</label>
                <textarea id="edit-table-notes" class="input-field" rows="3">${Utils.escape(table.notes || '')}</textarea>
              </div>
              <button type="submit" class="btn-primary w-full">שמור שינויים</button>
            </form>
          </div>
          
          <!-- Status -->
          <div class="card flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-500">סטטוס</div>
              <div class="font-semibold ${table.is_open ? 'text-green-500' : 'text-gray-600'}">${table.is_open ? '🟢 פתוח' : '⚫ סגור'}</div>
            </div>
            <button id="toggle-table-status" class="btn-secondary text-sm">${table.is_open ? 'סגור שולחן' : 'פתח שולחן'}</button>
          </div>
          
          <p id="table-edit-msg" class="text-center text-sm hidden"></p>
        </div>
      </div>
    `;
    
    // Back button
    document.getElementById('back-to-tables').addEventListener('click', () => {
      this.state.tab = 'tables';
      this.render();
      this.initTablesView();
    });
    
    // Edit form
    document.getElementById('edit-table-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('table-edit-msg');
      try {
        await sbUpdate('restaurant_tables', { id: table.id }, {
          table_number: parseInt(document.getElementById('edit-table-number').value),
          notes: document.getElementById('edit-table-notes').value.trim(),
        });
        msg.textContent = '✅ נשמר בהצלחה';
        msg.className = 'text-center text-sm text-green-500';
        await this.loadTables();
      } catch (err) {
        msg.textContent = '❌ שגיאה: ' + err.message;
        msg.className = 'text-center text-sm text-red-500';
      }
      msg.classList.remove('hidden');
    });
    
    // Toggle status
    document.getElementById('toggle-table-status').addEventListener('click', async () => {
      try {
        await sbUpdate('restaurant_tables', { id: table.id }, { is_open: !table.is_open });
        await this.loadTables();
        this.showTableDetails(this.state.tables.find(t => t.id === table.id) || table);
      } catch (err) { console.error(err); }
    });
    
    // Print QR
    document.getElementById('print-qr-btn').addEventListener('click', () => {
      const w = window.open(qrImageUrl, '_blank');
      w.onload = () => w.print();
    });
  },

  // --- Add table form ---
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
            <div>
              <label class="text-sm text-gray-600 mb-1 block">מספר שולחן</label>
              <input type="number" id="new-table-number" class="input-field" value="${nextNum}" min="1" required>
            </div>
            <div>
              <label class="text-sm text-gray-600 mb-1 block">הערות</label>
              <textarea id="new-table-notes" class="input-field" rows="3" placeholder="הערות אופציונליות"></textarea>
            </div>
            <p class="text-sm text-gray-400">סטטוס השולחן יתחיל כסגור. ניתן לפתוח אותו לאחר ההוספה.</p>
            <p id="add-table-msg" class="text-center text-sm hidden"></p>
            <button type="submit" class="btn-primary w-full">צור שולחן + ברקוד</button>
          </form>
        </div>
      </div>
    `;
    
    document.getElementById('back-to-tables').addEventListener('click', () => {
      this.state.tab = 'tables';
      this.render();
      this.initTablesView();
    });
    
    document.getElementById('add-table-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('add-table-msg');
      try {
        await apiCall({
          action: 'generateTableQr',
          data: {
            restaurant_id: this.state.restaurantId,
            table_number: parseInt(document.getElementById('new-table-number').value),
            notes: document.getElementById('new-table-notes').value.trim(),
          },
        });
        msg.textContent = '✅ שולחן נוצר בהצלחה!';
        msg.className = 'text-center text-sm text-green-500';
        msg.classList.remove('hidden');
        await this.loadTables();
        setTimeout(() => { this.state.tab = 'tables'; this.render(); this.initTablesView(); }, 1500);
      } catch (err) {
        msg.textContent = '❌ שגיאה: ' + err.message;
        msg.className = 'text-center text-sm text-red-500';
        msg.classList.remove('hidden');
      }
    });
  },

  // --- Settings (kept from original) ---
  renderSettings() {
    const s = this.state.settings || {};
    return `
      <div class="space-y-4">
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">${t('theme')}</h3>
          <div class="grid grid-cols-3 gap-3">
            ${Object.entries(CONFIG.themes).map(([key, theme]) => `
              <button data-theme="${key}" class="p-3 rounded-xl border-2 transition-all ${s.theme === key ? 'border-gold' : 'border-gray-200'}">
                <div class="w-full h-12 rounded-lg mb-2" style="background:${theme.bg};border:1px solid ${theme.accent}"></div>
                <div class="text-sm font-medium text-gray-700">${theme.name}</div>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">${t('escalation')}</h3>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="text-sm text-gray-600">${t('greenMinutes')}</label><input type="number" id="esc-green" class="input-field mt-1" value="${s.escalation_green_minutes || CONFIG.escalationDefaults.green}" min="1" max="30"></div>
            <div><label class="text-sm text-gray-600">${t('orangeMinutes')}</label><input type="number" id="esc-orange" class="input-field mt-1" value="${s.escalation_orange_minutes || CONFIG.escalationDefaults.orange}" min="2" max="60"></div>
            <div><label class="text-sm text-gray-600">${t('redMinutes')}</label><input type="number" id="esc-red" class="input-field mt-1" value="${s.escalation_alert_minutes || CONFIG.escalationDefaults.red}" min="3" max="120"></div>
          </div>
          <button id="save-settings" class="btn-primary mt-4 w-full">שמור הגדרות</button>
        </div>
      </div>
    `;
  },

  renderMenu() { return `<div class="card"><h3 class="font-semibold text-gray-700 mb-2">📋 תפריט</h3><p class="text-gray-400 text-sm">ניהול תפריט — בקרוב</p></div>`; },
  renderGifts() { return `<div class="card"><h3 class="font-semibold text-gray-700 mb-2">🎁 מתנות</h3><p class="text-gray-400 text-sm">ניהול מתנות — בקרוב</p></div>`; },
  renderReports() { return `<div class="card"><h3 class="font-semibold text-gray-700 mb-2">📈 דוחות</h3><p class="text-gray-400 text-sm">דוחות — בקרוב</p></div>`; },
  renderAI() { return `<div class="card"><h3 class="font-semibold text-gray-700 mb-2">🤖 עוזר AI</h3><p class="text-gray-400 text-sm">עוזר AI — בקרוב</p></div>`; },
  renderSetupWizard() { return `<div class="card text-center py-8"><p class="text-gray-400">הגדרות ראשוניות — בקרוב</p></div>`; },

  attachEvents() {
    // Logout
    const logout = document.getElementById('admin-logout');
    if (logout) logout.addEventListener('click', () => {
      Auth.clearAll();
      this.state.admin = null;
      this.state.tab = 'dashboard';
      this.renderLogin();
    });
    
    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.tab = btn.dataset.tab;
        this.render();
      });
    });
    
    // Add table button
    const addTableBtn = document.getElementById('add-table-btn');
    if (addTableBtn) addTableBtn.addEventListener('click', () => this.showAddTableForm());
    
    // Save settings
    const saveSettings = document.getElementById('save-settings');
    if (saveSettings) saveSettings.addEventListener('click', async () => {
      try {
        if (this.state.settings?.id) {
          await sbUpdate('restaurant_settings', { id: this.state.settings.id }, {
            escalation_green_minutes: parseInt(document.getElementById('esc-green').value),
            escalation_orange_minutes: parseInt(document.getElementById('esc-orange').value),
            escalation_alert_minutes: parseInt(document.getElementById('esc-red').value),
          });
        }
        Utils.toast('הגדרות נשמרו', 'success');
        await this.loadSettings();
      } catch (e) { Utils.toast('שגיאה בשמירה'); }
    });
    
    // Theme selection
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const theme = btn.dataset.theme;
        document.querySelectorAll('[data-theme]').forEach(b => b.className = b.className.replace('border-gold', 'border-gray-200'));
        btn.className = btn.className.replace('border-gray-200', 'border-gold');
        if (this.state.settings?.id) {
          await sbUpdate('restaurant_settings', { id: this.state.settings.id }, { theme });
        }
      });
    });
  },
};
