// SmartTable — Admin/Owner Screen (Dashboard, Settings, Reports, AI Chat)
const AdminScreen = {
  state: {
    restaurantId: null,
    admin: null,
    restaurant: null,
    settings: null,
    tab: 'dashboard',
    stats: {},
    subscriptions: [],
  },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('admin');
    
    if (saved && saved.restaurant_id === restaurantId) {
      this.state.admin = saved;
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
    
    // Check if setup wizard needed
    if (!this.state.settings || !this.state.settings.theme) {
      this.state.tab = 'setup';
    }
    
    this.render();
  },

  async loadRestaurant() {
    try {
      this.state.restaurant = await sbSelect('restaurants', { id: this.state.restaurantId }, { single: true });
    } catch(e) { console.error(e); }
  },

  async loadSettings() {
    try {
      this.state.settings = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId }, { single: true });
    } catch(e) { this.state.settings = null; }
  },

  async loadStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tasks = await sbSelect('tasks', { restaurant_id: this.state.restaurantId }, {
        order: { column: 'created_at', ascending: false },
        limit: 100,
      });
      
      const todayTasks = tasks.filter(t => t.created_at?.startsWith(today));
      const completedToday = todayTasks.filter(t => t.status === 'done');
      const responseTimes = completedToday
        .filter(t => t.response_seconds)
        .map(t => t.response_seconds);
      
      this.state.stats = {
        totalToday: todayTasks.length,
        completedToday: completedToday.length,
        avgResponseTime: responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0,
        openTasks: tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      };
    } catch(e) { console.error(e); this.state.stats = {}; }
  },

  render() {
    const { restaurant, tab } = this.state;
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
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

        <!-- Tabs -->
        <div class="bg-white border-b sticky top-[57px] z-10">
          <div class="max-w-4xl mx-auto flex overflow-x-auto no-scrollbar">
            ${this.renderTab('dashboard', '📊')}
            ${this.renderTab('settings', '⚙️')}
            ${this.renderTab('menu', '📋')}
            ${this.renderTab('gifts', '🎁')}
            ${this.renderTab('reports', '📈')}
            ${this.renderTab('ai', '🤖')}
          </div>
        </div>

        <!-- Content -->
        <div class="max-w-4xl mx-auto p-4" id="admin-content">
          ${this.renderContent()}
        </div>
      </div>
    `;
    
    this.attachEvents();
  },

  renderTab(tabId, icon) {
    const labels = {
      dashboard: t('dashboard'),
      settings: t('settings'),
      menu: t('menu'),
      gifts: t('gifts'),
      reports: t('reports'),
      ai: t('aiChat'),
      setup: t('setupWizard'),
    };
    
    const isActive = this.state.tab === tabId;
    return `
      <button data-tab="${tabId}" class="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
        ${isActive ? 'border-gold text-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}">
        ${icon} ${labels[tabId] || tabId}
      </button>
    `;
  },

  renderContent() {
    switch(this.state.tab) {
      case 'dashboard': return this.renderDashboard();
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
        <div class="card text-center">
          <div class="text-3xl font-bold text-gold">${s.totalToday || 0}</div>
          <div class="text-xs text-gray-500 mt-1">בקשות היום</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-green-500">${s.completedToday || 0}</div>
          <div class="text-xs text-gray-500 mt-1">הושלמו</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-blue-500">${s.avgResponseTime || 0}<span class="text-sm">s</span></div>
          <div class="text-xs text-gray-500 mt-1">ממוצע תגובה</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-orange-500">${s.openTasks || 0}</div>
          <div class="text-xs text-gray-500 mt-1">פתוחות כעת</div>
        </div>
      </div>
      <div class="card">
        <h3 class="font-semibold text-gray-700 mb-2">פעילות אחרונה</h3>
        <p class="text-gray-400 text-sm">טען נתונים נוספים מכאן...</p>
      </div>
    `;
  },

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
            <div>
              <label class="text-sm text-gray-600">${t('greenMinutes')}</label>
              <input type="number" id="esc-green" class="input-field mt-1" value="${s.escalation_green_minutes || CONFIG.escalationDefaults.green}" min="1" max="30">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('orangeMinutes')}</label>
              <input type="number" id="esc-orange" class="input-field mt-1" value="${s.escalation_orange_minutes || CONFIG.escalationDefaults.orange}" min="2" max="60">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('redMinutes')}</label>
              <input type="number" id="esc-red" class="input-field mt-1" value="${s.escalation_alert_minutes || CONFIG.escalationDefaults.red}" min="3" max="120">
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">${t('operatingHours')}</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600">שעת פתיחה</label>
              <input type="time" id="open-hour" class="input-field mt-1" value="${s.operating_hours?.open || '10:00'}">
            </div>
            <div>
              <label class="text-sm text-gray-600">שעת סגירה</label>
              <input type="time" id="close-hour" class="input-field mt-1" value="${s.operating_hours?.close || '23:00'}">
            </div>
          </div>
        </div>

        <button id="save-settings" class="btn-primary w-full">${t('save')}</button>
      </div>
    `;
  },

  renderMenu() {
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">${t('menu')}</h3>
          <button id="add-menu-item" class="btn-primary text-sm">${t('add')}</button>
        </div>
        <div id="menu-items-list" class="space-y-2">
          <p class="text-gray-400 text-sm">${t('loading')}</p>
        </div>
      </div>
    `;
  },

  renderGifts() {
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">${t('gifts')}</h3>
          <button id="add-gift" class="btn-primary text-sm">${t('add')}</button>
        </div>
        <div id="gifts-list" class="space-y-2">
          <p class="text-gray-400 text-sm">${t('loading')}</p>
        </div>
      </div>
    `;
  },

  renderReports() {
    return `
      <div class="space-y-4">
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">${t('reports')}</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600">תאריך התחלה</label>
              <input type="date" id="report-from" class="input-field mt-1">
            </div>
            <div>
              <label class="text-sm text-gray-600">תאריך סיום</label>
              <input type="date" id="report-to" class="input-field mt-1">
            </div>
          </div>
          <button id="generate-report" class="btn-primary w-full mt-3">צור דוח</button>
        </div>
        <div id="report-results"></div>
      </div>
    `;
  },

  renderAI() {
    return `
      <div class="card">
        <h3 class="font-semibold text-gray-700 mb-3">🤖 ${t('aiChat')}</h3>
        <div id="ai-chat-box" class="h-64 overflow-y-auto bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
          <div class="text-sm text-gray-500 text-center">שאל אותי שאלות על ניהול המסעדה...</div>
        </div>
        <form id="ai-chat-form" class="flex gap-2">
          <input type="text" id="ai-input" class="input-field flex-1" placeholder="כתוב שאלה...">
          <button type="submit" class="btn-primary">שלח</button>
        </form>
      </div>
    `;
  },

  renderSetupWizard() {
    return `
      <div class="card max-w-lg mx-auto">
        <div class="text-center mb-6">
          <div class="text-5xl mb-3">🚀</div>
          <h3 class="font-semibold text-gray-700">${t('setupWizard')}</h3>
          <p class="text-gray-500 text-sm mt-1">בוא נגדיר את המסעדה שלך</p>
        </div>
        <div class="space-y-4">
          <div>
            <label class="text-sm text-gray-600">${t('restaurantName')}</label>
            <input type="text" id="setup-name" class="input-field mt-1" value="${Utils.escape(this.state.restaurant?.name || '')}" readonly>
          </div>
          <div>
            <label class="text-sm text-gray-600">${t('theme')}</label>
            <div class="grid grid-cols-3 gap-2 mt-1">
              ${Object.entries(CONFIG.themes).map(([key, theme]) => `
                <button data-setup-theme="${key}" class="p-2 rounded-lg border-2 border-gray-200 hover:border-gold text-sm">${theme.name}</button>
              `).join('')}
            </div>
          </div>
          <button id="complete-setup" class="btn-primary w-full">${t('completeSetup')}</button>
        </div>
      </div>
    `;
  },

  attachEvents() {
    document.getElementById('admin-logout').addEventListener('click', () => {
      Auth.clearSession('admin');
      window.location.hash = '';
    });
    
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.tab = btn.dataset.tab;
        this.render();
      });
    });
    
    if (this.state.tab === 'settings') this.attachSettingsEvents();
    if (this.state.tab === 'menu') this.loadMenuItems();
    if (this.state.tab === 'gifts') this.loadGifts();
    if (this.state.tab === 'reports') this.attachReportEvents();
    if (this.state.tab === 'ai') this.attachAIEvents();
    if (this.state.tab === 'setup') this.attachSetupEvents();
  },

  attachSettingsEvents() {
    document.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('border-gold'));
        btn.classList.add('border-gold');
        this.state.pendingTheme = btn.dataset.theme;
      });
    });
    
    document.getElementById('save-settings')?.addEventListener('click', async () => {
      try {
        const updates = {
          restaurant_id: this.state.restaurantId,
          theme: this.state.pendingTheme || this.state.settings?.theme || 'luxury',
          escalation_green_minutes: parseInt(document.getElementById('esc-green').value),
          escalation_orange_minutes: parseInt(document.getElementById('esc-orange').value),
          escalation_alert_minutes: parseInt(document.getElementById('esc-red').value),
          operating_hours: {
            open: document.getElementById('open-hour').value,
            close: document.getElementById('close-hour').value,
          },
          updated_at: new Date().toISOString(),
        };
        
        if (this.state.settings?.id) {
          await sbUpdate('restaurant_settings', { id: this.state.settings.id }, updates);
        } else {
          await sbInsert('restaurant_settings', updates);
        }
        
        Utils.toast(t('save') + ' ✓');
      } catch(e) { Utils.toast('שגיאה'); console.error(e); }
    });
  },

  async loadMenuItems() {
    try {
      const items = await sbSelect('menu_items', { restaurant_id: this.state.restaurantId, is_active: true },
        { order: { column: 'sort_order', ascending: true } });
      const list = document.getElementById('menu-items-list');
      
      if (items.length === 0) {
        list.innerHTML = Utils.emptyState('אין פריטים בתפריט');
        return;
      }
      
      list.innerHTML = items.map(item => `
        <div class="flex items-center justify-between py-2 border-b">
          <div>
            <span class="text-lg mr-2">${CONFIG.taskTypes[item.category]?.icon || '🍽️'}</span>
            <span class="text-sm font-medium">${Utils.escape(item.name)}</span>
            ${item.price ? `<span class="text-xs text-gray-400 mr-2">₪${item.price}</span>` : ''}
          </div>
          <span class="text-xs text-gray-400">${item.category}</span>
        </div>
      `).join('');
    } catch(e) { console.error(e); }
  },

  async loadGifts() {
    try {
      const gifts = await sbSelect('gifts', { restaurant_id: this.state.restaurantId });
      const list = document.getElementById('gifts-list');
      
      if (gifts.length === 0) {
        list.innerHTML = Utils.emptyState('אין מתנות מוגדרות');
        return;
      }
      
      list.innerHTML = gifts.map(gift => `
        <div class="flex items-center justify-between py-2 border-b">
          <div>
            <span class="text-lg mr-2">${gift.icon || '🎁'}</span>
            <span class="text-sm font-medium">${Utils.escape(gift.title)}</span>
          </div>
          <span class="text-xs ${gift.is_active ? 'text-green-500' : 'text-gray-400'}">${gift.is_active ? '✅ פעיל' : '❌ לא פעיל'}</span>
        </div>
      `).join('');
    } catch(e) { console.error(e); }
  },

  attachReportEvents() {
    document.getElementById('generate-report')?.addEventListener('click', async () => {
      const from = document.getElementById('report-from').value;
      const to = document.getElementById('report-to').value;
      if (!from || !to) { Utils.toast('בחר תאריכים'); return; }
      
      try {
        const tasks = await sbSelect('tasks', { restaurant_id: this.state.restaurantId },
          { order: { column: 'created_at', ascending: true } });
        
        const filtered = tasks.filter(t => {
          const d = t.created_at?.split('T')[0];
          return d >= from && d <= to;
        });
        
        const byType = {};
        filtered.forEach(t => { byType[t.type] = (byType[t.type] || 0) + 1; });
        
        const completed = filtered.filter(t => t.status === 'done');
        const avgTime = completed.filter(t => t.response_seconds)
          .map(t => t.response_seconds);
        const avg = avgTime.length > 0 ? Math.round(avgTime.reduce((a, b) => a + b, 0) / avgTime.length) : 0;
        
        document.getElementById('report-results').innerHTML = `
          <div class="card">
            <h4 class="font-semibold mb-3">דוח: ${from} עד ${to}</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>סה"כ בקשות: <b>${filtered.length}</b></div>
              <div>הושלמו: <b>${completed.length}</b></div>
              <div>ממוצע תגובה: <b>${avg}s</b></div>
              <div>שיעור השלמה: <b>${filtered.length > 0 ? Math.round(completed.length/filtered.length*100) : 0}%</b></div>
            </div>
            <div class="mt-3">
              <h5 class="text-sm font-medium mb-2">לפי סוג:</h5>
              ${Object.entries(byType).map(([type, count]) => `
                <div class="flex justify-between text-sm py-1">
                  <span>${CONFIG.taskTypes[type]?.icon || '📋'} ${CONFIG.taskTypes[type]?.label || type}</span>
                  <span class="font-medium">${count}</span>
                </div>
              `).join('')}
            </div>
            <button id="export-report" class="btn-secondary w-full mt-3 text-sm">ייצוא ל-Excel</button>
          </div>
        `;
        
        document.getElementById('export-report')?.addEventListener('click', () => {
          Utils.exportCSV(filtered, `report_${from}_${to}.csv`);
        });
      } catch(e) { Utils.toast('שגיאה'); console.error(e); }
    });
  },

  attachAIEvents() {
    const form = document.getElementById('ai-chat-form');
    const box = document.getElementById('ai-chat-box');
    const input = document.getElementById('ai-input');
    
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;
      
      box.innerHTML += `<div class="text-sm bg-gold/20 rounded-lg px-3 py-2 ml-8">${Utils.escape(msg)}</div>`;
      input.value = '';
      box.scrollTop = box.scrollHeight;
      
      // Simple AI responses (placeholder)
      const responses = [
        'אני כאן לעזור! נתחיל בבדיקת הנתונים שלך...',
        'נראה שהמסעדה פעילה. מה תרצה לדעת?',
        'ממוצע זמן התגובה שלך טוב, אך יש מקום לשיפור בשעות העומס.',
      ];
      
      setTimeout(() => {
        box.innerHTML += `<div class="text-sm bg-gray-200 rounded-lg px-3 py-2 mr-8">${responses[Math.floor(Math.random() * responses.length)]}</div>`;
        box.scrollTop = box.scrollHeight;
      }, 1000);
    });
  },

  attachSetupEvents() {
    document.querySelectorAll('[data-setup-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-setup-theme]').forEach(b => b.classList.remove('border-gold', 'border-2'));
        btn.classList.add('border-gold', 'border-2');
        this.state.pendingTheme = btn.dataset.setupTheme;
      });
    });
    
    document.getElementById('complete-setup')?.addEventListener('click', async () => {
      try {
        const updates = {
          restaurant_id: this.state.restaurantId,
          theme: this.state.pendingTheme || 'luxury',
        };
        
        if (this.state.settings?.id) {
          await sbUpdate('restaurant_settings', { id: this.state.settings.id }, updates);
        } else {
          await sbInsert('restaurant_settings', updates);
        }
        
        await sbUpdate('restaurants', { id: this.state.restaurantId }, { status: 'active' });
        
        Utils.toast(t('completeSetup') + ' ✓');
        this.state.tab = 'dashboard';
        this.start();
      } catch(e) { Utils.toast('שגיאה'); console.error(e); }
    });
  },
};
