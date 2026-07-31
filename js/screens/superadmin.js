// SmartTable — Super Admin Screen (Global Management)
const SuperAdminScreen = {
  state: {
    admin: null,
    tab: 'dashboard',
    clients: [],
    selectedClient: null,
    clientView: 'overview',
    stats: {},
    realtimeData: {},
    subscriptions: [],
    timer: null,
    realtimeClient: null,
    realtimeScreen: null,
    showAddClientForm: false,
  },

  init() {
    const saved = Auth.getSession('superadmin');
    if (saved) {
      this.state.admin = saved;
      this.start();
    } else {
      this.renderLogin();
    }
  },

  renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <div class="text-5xl mb-3">👑</div>
            <h1 class="text-2xl font-playfair text-gold">${t('superAdminLogin')}</h1>
            <p class="text-gray-500 text-sm mt-2">גישה למנהל המערכת בלבד</p>
          </div>
          <form id="superadmin-login-form" class="space-y-4">
            <div>
              <label class="text-sm text-gray-400 mb-1 block">${t('username')}</label>
              <input type="text" id="sa-username" class="input-field bg-gray-800 border-gray-700 text-white" required autofocus>
            </div>
            <div>
              <label class="text-sm text-gray-400 mb-1 block">${t('password')}</label>
              <input type="password" id="sa-password" class="input-field bg-gray-800 border-gray-700 text-white" required>
            </div>
            <p id="sa-error" class="text-red-500 text-sm text-center hidden"></p>
            <button type="submit" class="btn-primary w-full">${t('confirm')}</button>
          </form>
          <a href="#" class="block text-center text-sm text-gray-600 mt-4 hover:text-gray-400">← חזור</a>
        </div>
      </div>
    `;
    
    document.getElementById('superadmin-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('sa-username').value.trim();
      const password = document.getElementById('sa-password').value;
      
      try {
        await Auth.loginSuperAdmin(username, password);
        this.state.admin = Auth.current;
        this.start();
      } catch(e) {
        const errEl = document.getElementById('sa-error');
        errEl.textContent = e.message;
        errEl.classList.remove('hidden');
      }
    });
  },

  async start() {
    await this.loadClients();
    await this.loadGlobalStats();
    this.render();
  },

  async loadClients() {
    try {
      const allRestaurants = await sbSelect('restaurants', {}, { order: 'created_date', ascending: false });
      this.state.clients = allRestaurants || [];
    } catch(e) { console.error(e); this.state.clients = []; }
  },

  async loadGlobalStats() {
    try {
      const active = this.state.clients.filter(c => c.status === 'active');
      const promo = this.state.clients.filter(c => c.promo_active);
      const overdue = this.state.clients.filter(c => {
        if (c.promo_active && c.promo_expires_at) {
          return new Date(c.promo_expires_at) < new Date();
        }
        return false;
      });
      this.state.stats = {
        total: this.state.clients.length,
        active: active.length,
        promo: promo.length,
        overdue: overdue.length,
      };
    } catch(e) { console.error(e); }
  },

  render() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-5xl mx-auto">
            <div class="flex items-center gap-2">
              <span class="text-xl">👑</span>
              <div>
                <h1 class="text-lg font-semibold text-gold">Super Admin</h1>
                <p class="text-xs text-gray-400">${t('globalDashboard')}</p>
              </div>
            </div>
            <button id="sa-logout" class="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg">${t('logout')}</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white border-b sticky top-[57px] z-10">
          <div class="max-w-5xl mx-auto flex overflow-x-auto no-scrollbar">
            ${this.renderTab('dashboard', '📊', t('globalDashboard'))}
            ${this.renderTab('clients', '🏢', t('clients'))}
            ${this.renderTab('billing', '💰', t('billing'))}
            ${this.renderTab('realtime', '⚡', 'זמן אמת')}
          </div>
        </div>

        <div class="max-w-5xl mx-auto p-4" id="sa-content">
          ${this.renderContent()}
        </div>
      </div>
    `;
    this.attachEvents();
    if (this.state.tab === 'realtime') this.loadRealtimeView();
  },

  renderTab(tabId, icon, label) {
    const isActive = this.state.tab === tabId;
    return `
      <button data-tab="${tabId}" class="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
        ${isActive ? 'border-gold text-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}">
        ${icon} ${label}
      </button>
    `;
  },

  renderContent() {
    switch(this.state.tab) {
      case 'dashboard': return this.renderDashboard();
      case 'clients': return this.renderClients();
      case 'billing': return this.renderBilling();
      case 'realtime': return this.renderRealtimeView();
      default: return this.renderDashboard();
    }
  },

  renderDashboard() {
    const s = this.state.stats;
    return `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="card text-center">
          <div class="text-3xl font-bold text-blue-500">${s.total || 0}</div>
          <div class="text-xs text-gray-500 mt-1">סה"כ לקוחות</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-green-500">${s.active || 0}</div>
          <div class="text-xs text-gray-500 mt-1">פעילים</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-gold">${s.promo || 0}</div>
          <div class="text-xs text-gray-500 mt-1">פרומו פעיל</div>
        </div>
        <div class="card text-center">
          <div class="text-3xl font-bold text-red-500">${s.overdue || 0}</div>
          <div class="text-xs text-gray-500 mt-1">פג תוקף</div>
        </div>
      </div>
      <div class="card">
        <h3 class="font-semibold text-gray-700 mb-3">רשימת לקוחות אחרונה</h3>
        <div class="space-y-2">
          ${this.state.clients.slice(0, 5).map(c => `
            <div class="flex items-center justify-between py-2 border-b last:border-0">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-green-500' : c.status === 'suspended' ? 'bg-red-500' : 'bg-yellow-500'}"></span>
                <span class="text-sm font-medium">${Utils.escape(c.name)}</span>
              </div>
              <span class="text-xs text-gray-400">${Utils.formatDate(c.created_date)}</span>
            </div>
          `).join('') || Utils.emptyState('אין לקוחות', '🏢')}
        </div>
      </div>
    `;
  },

  renderClients() {
    if (this.state.showAddClientForm) return this.renderAddClientForm();
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">${t('clients')} (${this.state.clients.length})</h2>
          <div class="flex gap-2">
            <input type="text" id="client-search" class="input-field max-w-xs" placeholder="${t('search')}">
            <button id="add-client-btn" class="btn-primary text-sm">+ ${t('addClient')}</button>
          </div>
        </div>
        <div id="clients-list" class="space-y-2">
          ${this.renderClientsList()}
        </div>
      </div>
    `;
  },

  renderAddClientForm() {
    return `
      <div class="space-y-4">
        <button id="back-to-clients" class="text-sm text-gray-500 hover:text-gray-700">← ${t('back')}</button>
        <div class="card max-w-2xl mx-auto">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">+ הוספת לקוח חדש</h2>
          <form id="add-client-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-gray-600 mb-1 block">שם מסעדה *</label>
                <input type="text" id="client-name" class="input-field" required>
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">שם בעלים</label>
                <input type="text" id="client-owner" class="input-field">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">מייל (שם משתמש + לשליחת פרטים) *</label>
                <input type="email" id="client-email" class="input-field" required>
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">טלפון ראשי</label>
                <input type="tel" id="client-phone" class="input-field">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">כתובת</label>
                <input type="text" id="client-address" class="input-field">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">ח.פ. / ע.מ.</label>
                <input type="text" id="client-business-num" class="input-field">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">מספר חוזה</label>
                <input type="text" id="client-contract-num" class="input-field">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">מספר שולחנות מקסימלי</label>
                <input type="number" id="client-max-tables" class="input-field" value="30" min="1">
              </div>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              ℹ️ סיסמה ראשונית תיווצר אוטומטית ותישלח למייל של הלקוח יחד עם קישור הכניסה. הלקוח יידרש לשנות את הסיסמה בכניסה הראשונה.
            </div>
            <p id="add-client-error" class="text-red-500 text-sm text-center hidden"></p>
            <p id="add-client-success" class="text-green-500 text-sm text-center hidden"></p>
            <button type="submit" class="btn-primary w-full" id="add-client-submit">
              צור לקוח ושלח מייל
            </button>
          </form>
        </div>
      </div>
    `;
  },

  renderClientsList(filter = '') {
    const filtered = filter 
      ? this.state.clients.filter(c => 
          c.name?.toLowerCase().includes(filter.toLowerCase()) ||
          c.business_number?.includes(filter) ||
          c.phone_primary?.includes(filter))
      : this.state.clients;
    
    if (filtered.length === 0) return Utils.emptyState('אין לקוחות', '🏢');
    
    return filtered.map(c => `
      <div class="card flex items-center justify-between cursor-pointer hover:shadow-md transition-all" data-client-id="${c.id}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
            ${c.status === 'active' ? '✅' : c.status === 'suspended' ? '🚫' : '⏳'}
          </div>
          <div>
            <div class="font-medium text-gray-800">${Utils.escape(c.name)}</div>
            <div class="text-xs text-gray-400">
              ${c.business_number || '—'} · ${c.phone_primary || '—'} · ${c.email || '—'}
            </div>
          </div>
        </div>
        <div class="text-left">
          <div class="text-xs ${c.status === 'active' ? 'text-green-500' : 'text-gray-400'}">${t(c.status) || c.status}</div>
          <div class="text-xs text-gray-400">${t('lastLogin')}: ${c.last_login_at ? Utils.formatDate(c.last_login_at) : '—'}</div>
        </div>
      </div>
    `).join('');
  },

  renderBilling() {
    return `
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-800">${t('billing')}</h2>
        ${this.state.clients.map(c => `
          <div class="card flex items-center justify-between">
            <div>
              <div class="font-medium text-gray-800">${Utils.escape(c.name)}</div>
              <div class="text-xs text-gray-400">חיוב חודשי · יום ${c.billing_day || 1} · ${c.billing_currency || 'ILS'}</div>
            </div>
            <div class="text-left">
              <div class="text-sm font-semibold ${c.promo_active ? 'text-green-500' : 'text-gray-600'}">
                ${c.promo_active ? 'פרומו פעיל' : 'חיוב רגיל'}
              </div>
              ${c.promo_expires_at ? `<div class="text-xs text-gray-400">עד ${Utils.formatDate(c.promo_expires_at)}</div>` : ''}
            </div>
          </div>
        `).join('') || Utils.emptyState('אין לקוחות', '💰')}
      </div>
    `;
  },

  // --- REALTIME VIEW: click client → choose screen ---
  renderRealtimeView() {
    if (this.state.realtimeClient) return this.renderRealtimeClientView();
    return `
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-800">⚡ זמן אמת — בחר לקוח</h2>
        <div class="space-y-2">
          ${this.state.clients.map(c => `
            <div class="card flex items-center justify-between cursor-pointer hover:shadow-md transition-all" data-realtime-client="${c.id}">
              <div class="flex items-center gap-3">
                <span class="w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}"></span>
                <span class="font-medium text-gray-800">${Utils.escape(c.name)}</span>
              </div>
              <span class="text-gray-400 text-sm">צפה →</span>
            </div>
          `).join('') || Utils.emptyState('אין לקוחות', '⚡')}
        </div>
      </div>
    `;
  },

  renderRealtimeClientView() {
    const c = this.state.realtimeClient;
    const screen = this.state.realtimeScreen;
    
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <button id="back-to-realtime-list" class="text-sm text-gray-500 hover:text-gray-700">← חזרה לרשימה</button>
          <h2 class="text-lg font-semibold text-gray-800">${Utils.escape(c.name)}</h2>
        </div>
        
        <div class="flex gap-2 flex-wrap">
          <button data-screen="admin" class="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${!screen || screen === 'admin' ? 'border-gold text-gold bg-gold/10' : 'border-gray-200 text-gray-600 hover:border-gray-300'}">
            🏢 בעלים
          </button>
          <button data-screen="manager" class="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${screen === 'manager' ? 'border-gold text-gold bg-gold/10' : 'border-gray-200 text-gray-600 hover:border-gray-300'}">
            👨‍💼 מנהל משמרת
          </button>
          <button data-screen="waiter" class="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${screen === 'waiter' ? 'border-gold text-gold bg-gold/10' : 'border-gray-200 text-gray-600 hover:border-gray-300'}">
            🤵 מלצר
          </button>
          <button data-screen="customer" class="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${screen === 'customer' ? 'border-gold text-gold bg-gold/10' : 'border-gray-200 text-gray-600 hover:border-gray-300'}">
            🍽️ לקוח
          </button>
        </div>
        
        <div class="bg-gray-100 rounded-xl overflow-hidden border" style="height: 70vh;">
          <iframe id="realtime-iframe" src="" class="w-full h-full border-0" style="display:none;"></iframe>
          <div id="realtime-placeholder" class="flex items-center justify-center h-full text-gray-400 text-sm">
            בחר מסך לצפייה
          </div>
        </div>
      </div>
    `;
  },

  loadRealtimeView() {},

  setRealtimeScreen(screenType) {
    this.state.realtimeScreen = screenType;
    const c = this.state.realtimeClient;
    if (!c) return;
    
    const iframe = document.getElementById('realtime-iframe');
    const placeholder = document.getElementById('realtime-placeholder');
    
    let url = '';
    switch(screenType) {
      case 'admin': url = `https://violet-dunlin-978279.hostingersite.com/#a/${c.id}`; break;
      case 'manager': url = `https://violet-dunlin-978279.hostingersite.com/#m/${c.id}`; break;
      case 'waiter': url = `https://violet-dunlin-978279.hostingersite.com/#w/${c.id}`; break;
      case 'customer': url = `https://violet-dunlin-978279.hostingersite.com/#c/demo`; break;
    }
    
    if (url) {
      iframe.src = url;
      iframe.style.display = 'block';
      placeholder.style.display = 'none';
    }
    
    // Update button states
    document.querySelectorAll('[data-screen]').forEach(btn => {
      const isActive = btn.dataset.screen === screenType;
      btn.className = `px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${isActive ? 'border-gold text-gold bg-gold/10' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`;
    });
  },

  attachEvents() {
    // Logout
    const logout = document.getElementById('sa-logout');
    if (logout) logout.addEventListener('click', () => {
      Auth.clearAll();
      this.state.admin = null;
      this.state.tab = 'dashboard';
      this.state.selectedClient = null;
      this.state.realtimeClient = null;
      this.state.realtimeScreen = null;
      this.renderLogin();
    });

    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.tab = btn.dataset.tab;
        this.state.showAddClientForm = false;
        this.state.realtimeClient = null;
        this.state.realtimeScreen = null;
        this.render();
      });
    });

    // Client search
    const search = document.getElementById('client-search');
    if (search) search.addEventListener('input', (e) => {
      const list = document.getElementById('clients-list');
      if (list) list.innerHTML = this.renderClientsList(e.target.value);
      this.attachClientClickEvents();
    });

    // Add client button
    const addBtn = document.getElementById('add-client-btn');
    if (addBtn) addBtn.addEventListener('click', () => {
      this.state.showAddClientForm = true;
      this.render();
    });

    // Back to clients
    const backBtn = document.getElementById('back-to-clients');
    if (backBtn) backBtn.addEventListener('click', () => {
      this.state.showAddClientForm = false;
      this.render();
    });

    // Add client form submit
    const addForm = document.getElementById('add-client-form');
    if (addForm) addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('add-client-submit');
      const errEl = document.getElementById('add-client-error');
      const successEl = document.getElementById('add-client-success');
      errEl.classList.add('hidden');
      successEl.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.textContent = 'יוצר לקוח ושולח מייל...';
      
      try {
        const res = await apiCall({
          action: 'createClient',
          data: {
            restaurant: {
              name: document.getElementById('client-name').value.trim(),
              owner_name: document.getElementById('client-owner').value.trim(),
              email: document.getElementById('client-email').value.trim(),
              phone_primary: document.getElementById('client-phone').value.trim(),
              address: document.getElementById('client-address').value.trim(),
              business_number: document.getElementById('client-business-num').value.trim(),
              contract_number: document.getElementById('client-contract-num').value.trim(),
              max_tables: parseInt(document.getElementById('client-max-tables').value) || 30,
            },
            admin: {
              username: document.getElementById('client-email').value.trim(),
              full_name: document.getElementById('client-owner').value.trim(),
            },
          },
        });
        
        let msg = '✅ לקוח נוצר בהצלחה!';
        if (res.email_sent) {
          msg += ' מייל נשלח ללקוח.';
        } else {
          msg += ` ⚠️ שליחת מייל נכשלה: ${res.email_error || 'שגיאה לא ידועה'}. סיסמה זמנית: ${res.initial_password}`;
        }
        successEl.textContent = msg;
        successEl.classList.remove('hidden');
        
        // Reload clients
        await this.loadClients();
        await this.loadGlobalStats();
        
        setTimeout(() => {
          this.state.showAddClientForm = false;
          this.render();
        }, 3000);
      } catch (err) {
        errEl.textContent = err.message || 'שגיאה ביצירת לקוח';
        errEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'צור לקוח ושלח מייל';
      }
    });

    // Realtime client selection
    document.querySelectorAll('[data-realtime-client]').forEach(el => {
      el.addEventListener('click', () => {
        const clientId = el.dataset.realtimeClient;
        const client = this.state.clients.find(c => c.id === clientId);
        if (client) {
          this.state.realtimeClient = client;
          this.state.realtimeScreen = null;
          this.render();
        }
      });
    });

    // Realtime screen selection
    document.querySelectorAll('[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setRealtimeScreen(btn.dataset.screen);
      });
    });

    // Back to realtime list
    const backToRealtime = document.getElementById('back-to-realtime-list');
    if (backToRealtime) backToRealtime.addEventListener('click', () => {
      this.state.realtimeClient = null;
      this.state.realtimeScreen = null;
      this.render();
    });

    // Client list clicks
    this.attachClientClickEvents();
  },

  attachClientClickEvents() {
    document.querySelectorAll('[data-client-id]').forEach(el => {
      el.addEventListener('click', () => {
        const clientId = el.dataset.clientId;
        const client = this.state.clients.find(c => c.id === clientId);
        if (client) {
          this.state.selectedClient = client;
          this.state.tab = 'clients';
          this.render();
        }
      });
    });
  },
};
