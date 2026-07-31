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
      const allRestaurants = await sb.from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Get settings for each restaurant
      this.state.clients = allRestaurants.data || [];
    } catch(e) { console.error(e); this.state.clients = []; }
  },

  async loadGlobalStats() {
    try {
      const active = this.state.clients.filter(c => c.status === 'active');
      const suspended = this.state.clients.filter(c => c.status === 'suspended');
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
        suspended: suspended.length,
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
    
    if (this.state.tab === 'realtime') this.loadRealtime();
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
      case 'realtime': return this.renderRealtime();
      case 'clientDetail': return this.renderClientDetail();
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
              <span class="text-xs text-gray-400">${Utils.formatDate(c.created_at)}</span>
            </div>
          `).join('') || Utils.emptyState('אין לקוחות', '🏢')}
        </div>
      </div>
    `;
  },

  renderClients() {
    const { selectedClient } = this.state;
    
    if (selectedClient) return this.renderClientDetail();
    
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">${t('clients')} (${this.state.clients.length})</h2>
          <div class="flex gap-2">
            <input type="text" id="client-search" class="input-field max-w-xs" placeholder="${t('search')}">
            <button id="export-clients" class="btn-secondary text-sm">📥 ${t('exportClients')}</button>
            <button id="add-client-btn" class="btn-primary text-sm">+ ${t('addClient')}</button>
          </div>
        </div>

        <div id="clients-list" class="space-y-2">
          ${this.renderClientsList()}
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

  renderClientDetail() {
    const c = this.state.selectedClient;
    if (!c) return '';
    
    return `
      <div class="space-y-4">
        <button id="back-to-clients" class="text-sm text-gray-500 hover:text-gray-700">← ${t('back')}</button>
        
        <!-- Client Info (Super Admin only - not editable by client) -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">פרטי לקוח ${t('viewOnly')} 🔒</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-500">${t('clientName')}:</span> <b>${Utils.escape(c.name)}</b></div>
            <div><span class="text-gray-500">${t('businessNumber')}:</span> <b>${c.business_number || '—'}</b></div>
            <div><span class="text-gray-500">${t('ownerName')}:</span> <b>${Utils.escape(c.owner_name)}</b></div>
            <div><span class="text-gray-500">${t('phonePrimary')}:</span> <b>${c.phone_primary || '—'}</b></div>
            <div><span class="text-gray-500">${t('phoneSecondary')}:</span> <b>${c.phone_secondary || '—'}</b></div>
            <div><span class="text-gray-500">${t('email')}:</span> <b>${c.email || '—'}</b></div>
            <div><span class="text-gray-500">${t('address')}:</span> <b>${c.address || '—'}</b></div>
            <div><span class="text-gray-500">${t('maxTables')}:</span> <b>${c.max_tables || 20}</b></div>
            <div><span class="text-gray-500">${t('contractNumber')}:</span> <b>${c.contract_number || '—'}</b></div>
            <div><span class="text-gray-500">${t('technicalContact')}:</span> <b>${c.technical_contact || '—'}</b></div>
          </div>
          ${c.notes_internal ? `<div class="mt-3 p-3 bg-yellow-50 rounded-lg text-sm"><b>${t('notesInternal')}:</b> ${Utils.escape(c.notes_internal)}</div>` : ''}
        </div>

        <!-- Realtime View -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">⚡ ${t('viewOnly')} — נתוני זמן אמת</h3>
          <div id="client-realtime" class="space-y-2">
            ${Utils.spinner()}
          </div>
        </div>

        <!-- Billing Info -->
        <div class="card">
          <h3 class="font-semibold text-gray-700 mb-3">💰 ${t('billing')}</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-500">${t('billingDay')}:</span> <b>${c.billing_day || 1}</b></div>
            <div><span class="text-gray-500">${t('billingAmount')}:</span> <b>₪${c.billing_amount || 0}</b></div>
            <div><span class="text-gray-500">${t('promo')}:</span> <b>${c.promo_active ? '✅ ' + t('promoActive') : '❌'}</b></div>
            <div><span class="text-gray-500">${t('promoExpires')}:</span> <b>${c.promo_expires_at ? Utils.formatDate(c.promo_expires_at) : '—'}</b></div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          ${!c.promo_active ? `<button id="activate-promo" data-client="${c.id}" class="btn-primary text-sm">${t('activatePromo')}</button>` : ''}
          <button id="edit-client" data-client="${c.id}" class="btn-secondary text-sm">${t('edit')}</button>
        </div>
      </div>
    `;
  },

  renderBilling() {
    return `
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-800">${t('billing')}</h2>
        <div class="card overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left">
                <th class="py-2">לקוח</th>
                <th class="py-2">${t('billingDay')}</th>
                <th class="py-2">${t('billingAmount')}</th>
                <th class="py-2">${t('promo')}</th>
                <th class="py-2">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              ${this.state.clients.map(c => `
                <tr class="border-b last:border-0">
                  <td class="py-2 font-medium">${Utils.escape(c.name)}</td>
                  <td class="py-2">${c.billing_day || 1}</td>
                  <td class="py-2">₪${c.billing_amount || 0}</td>
                  <td class="py-2">${c.promo_active ? '✅' : '—'}</td>
                  <td class="py-2">
                    <span class="px-2 py-1 rounded text-xs ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                      ${t(c.status) || c.status}
                    </span>
                  </td>
                </tr>
              `).join('') || `<tr><td colspan="5" class="py-4 text-center text-gray-400">אין נתונים</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRealtime() {
    return `
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-800">⚡ נתוני זמן אמת — כל המסעדות</h2>
        <div id="realtime-grid" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${Utils.spinner()}
        </div>
      </div>
    `;
  },

  async loadRealtime() {
    const container = this.state.tab === 'realtime' 
      ? document.getElementById('realtime-grid')
      : document.getElementById('client-realtime');
    
    if (!container) return;
    
    if (this.state.tab === 'realtime') {
      // Load tasks for all active restaurants
      try {
        const activeIds = this.state.clients.filter(c => c.status === 'active').map(c => c.id);
        
        if (activeIds.length === 0) {
          container.innerHTML = Utils.emptyState('אין מסעדות פעילות');
          return;
        }
        
        // Load open tasks for all restaurants
        const { data: tasks } = await sb.from('tasks')
          .select('*')
          .in('restaurant_id', activeIds)
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        
        // Group by restaurant
        const byRestaurant = {};
        (tasks || []).forEach(task => {
          if (!byRestaurant[task.restaurant_id]) byRestaurant[task.restaurant_id] = [];
          byRestaurant[task.restaurant_id].push(task);
        });
        
        container.innerHTML = this.state.clients
          .filter(c => c.status === 'active')
          .map(c => {
            const tasks = byRestaurant[c.id] || [];
            return `
              <div class="card">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-medium text-gray-800">${Utils.escape(c.name)}</h4>
                  <span class="text-sm font-bold ${tasks.length > 0 ? 'text-orange-500' : 'text-green-500'}">
                    ${tasks.length} משימות פתוחות
                  </span>
                </div>
                ${tasks.length === 0 
                  ? '<p class="text-sm text-gray-400">✅ הכל רגוע</p>'
                  : tasks.slice(0, 5).map(t => {
                      const urgency = Utils.getUrgency(t.created_at, {});
                      const typeInfo = CONFIG.taskTypes[t.type] || { icon: '📋', label: t.type };
                      return `<div class="flex items-center gap-2 py-1 text-sm">
                        <span class="w-2 h-2 rounded-full task-${urgency}"></span>
                        <span>${typeInfo.icon} ${typeInfo.label} · ${t('tableNumber')} ${t.table_number}</span>
                      </div>`;
                    }).join('')
                }
              </div>
            `;
          }).join('');
      } catch(e) {
        container.innerHTML = `<p class="text-red-500 text-sm">שגיאה בטעינת נתונים</p>`;
        console.error(e);
      }
    } else if (this.state.selectedClient) {
      // Load realtime for single client
      try {
        const { data: tasks } = await sb.from('tasks')
          .select('*')
          .eq('restaurant_id', this.state.selectedClient.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        
        const { data: tables } = await sb.from('restaurant_tables')
          .select('*')
          .eq('restaurant_id', this.state.selectedClient.id)
          .order('table_number', { ascending: true });
        
        const openTables = (tables || []).filter(t => t.is_open);
        
        container.innerHTML = `
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="bg-gray-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-blue-500">${openTables.length}</div>
              <div class="text-xs text-gray-500">שולחנות פתוחים</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-orange-500">${(tasks || []).length}</div>
              <div class="text-xs text-gray-500">משימות פתוחות</div>
            </div>
          </div>
          ${(tasks || []).length === 0 
            ? '<p class="text-sm text-gray-400 text-center py-4">✅ אין משימות פתוחות כעת</p>'
            : (tasks || []).map(t => {
                const urgency = Utils.getUrgency(t.created_at, {});
                const typeInfo = CONFIG.taskTypes[t.type] || { icon: '📋', label: t.type };
                return `<div class="task-${urgency} rounded-lg px-3 py-2 text-white text-sm flex items-center justify-between">
                  <span>${typeInfo.icon} ${typeInfo.label} · ${t('tableNumber')} ${t.table_number}</span>
                  <span class="text-xs">${Math.floor(Utils.elapsedSeconds(t.created_at))}s</span>
                </div>`;
              }).join('')
          }
        `;
      } catch(e) {
        container.innerHTML = `<p class="text-red-500 text-sm">שגיאה</p>`;
        console.error(e);
      }
    }
  },

  attachEvents() {
    document.getElementById('sa-logout')?.addEventListener('click', () => {
      Auth.clearSession('superadmin');
      this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
      window.location.hash = '';
    });
    
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.tab = btn.dataset.tab;
        this.state.selectedClient = null;
        this.render();
      });
    });
    
    // Client search
    document.getElementById('client-search')?.addEventListener('input', Utils.debounce((e) => {
      const list = document.getElementById('clients-list');
      if (list) list.innerHTML = this.renderClientsList(e.target.value);
      this.attachClientClicks();
    }, 300));
    
    // Export
    document.getElementById('export-clients')?.addEventListener('click', () => {
      Utils.exportCSV(this.state.clients, 'clients.csv');
    });
    
    // Add client
    document.getElementById('add-client-btn')?.addEventListener('click', () => this.showAddClientModal());
    
    // Back to clients
    document.getElementById('back-to-clients')?.addEventListener('click', () => {
      this.state.selectedClient = null;
      this.state.tab = 'clients';
      this.render();
    });
    
    // Activate promo
    document.getElementById('activate-promo')?.addEventListener('click', async (e) => {
      const clientId = e.target.dataset.client;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      
      try {
        await sbUpdate('restaurants', { id: clientId }, {
          promo_active: true,
          promo_expires_at: expiresAt.toISOString(),
          status: 'active',
        });
        Utils.toast(t('activatePromo') + ' ✓');
        await this.loadClients();
        this.state.selectedClient = this.state.clients.find(c => c.id === clientId);
        this.render();
      } catch(e) { Utils.toast('שגיאה'); }
    });
    
    // Edit client
    document.getElementById('edit-client')?.addEventListener('click', (e) => {
      this.showEditClientModal(e.target.dataset.client);
    });
    
    this.attachClientClicks();
    
    // Realtime auto-refresh
    if (this.state.tab === 'realtime' || this.state.selectedClient) {
      if (this.state.timer) clearInterval(this.state.timer);
      this.state.timer = setInterval(() => this.loadRealtime(), 5000);
    }
  },

  attachClientClicks() {
    document.querySelectorAll('[data-client-id]').forEach(el => {
      el.addEventListener('click', () => {
        this.state.selectedClient = this.state.clients.find(c => c.id === el.dataset.clientId);
        this.state.tab = 'clients';
        this.render();
        this.loadRealtime();
      });
    });
  },

  showAddClientModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.id = 'add-client-modal';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">${t('addClient')}</h3>
          <button id="close-modal" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form id="add-client-form" class="space-y-3">
          <div>
            <label class="text-sm text-gray-600">${t('clientName')} *</label>
            <input type="text" id="nc-name" class="input-field mt-1" required>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600">${t('businessNumber')}</label>
              <input type="text" id="nc-business" class="input-field mt-1">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('ownerName')} *</label>
              <input type="text" id="nc-owner" class="input-field mt-1" required>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600">${t('phonePrimary')} *</label>
              <input type="tel" id="nc-phone1" class="input-field mt-1" required>
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('phoneSecondary')}</label>
              <input type="tel" id="nc-phone2" class="input-field mt-1">
            </div>
          </div>
          <div>
            <label class="text-sm text-gray-600">${t('email')} *</label>
            <input type="email" id="nc-email" class="input-field mt-1" required>
          </div>
          <div>
            <label class="text-sm text-gray-600">${t('address')}</label>
            <input type="text" id="nc-address" class="input-field mt-1">
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-sm text-gray-600">${t('contractNumber')}</label>
              <input type="text" id="nc-contract" class="input-field mt-1">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('technicalContact')}</label>
              <input type="text" id="nc-tech" class="input-field mt-1">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('maxTables')}</label>
              <input type="number" id="nc-tables" class="input-field mt-1" value="20" min="1" max="200">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600">${t('billingDay')}</label>
              <input type="number" id="nc-billing-day" class="input-field mt-1" value="1" min="1" max="28">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('billingAmount')}</label>
              <input type="number" id="nc-billing-amount" class="input-field mt-1" value="0" min="0" step="0.01">
            </div>
          </div>
          <div>
            <label class="text-sm text-gray-600">${t('notesInternal')}</label>
            <textarea id="nc-notes" class="input-field mt-1" rows="2"></textarea>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="nc-promo" checked>
            <label class="text-sm text-gray-600">${t('promo')} (3 חודשים)</label>
          </div>
          <button type="submit" class="btn-primary w-full">${t('addClient')}</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    modal.querySelector('#add-client-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const promoActive = document.getElementById('nc-promo').checked;
      const promoExpires = new Date();
      promoExpires.setMonth(promoExpires.getMonth() + 3);
      
      try {
        const result = await sbInsert('restaurants', {
          name: document.getElementById('nc-name').value,
          business_number: document.getElementById('nc-business').value,
          owner_name: document.getElementById('nc-owner').value,
          phone_primary: document.getElementById('nc-phone1').value,
          phone_secondary: document.getElementById('nc-phone2').value,
          email: document.getElementById('nc-email').value,
          address: document.getElementById('nc-address').value,
          contract_number: document.getElementById('nc-contract').value,
          technical_contact: document.getElementById('nc-tech').value,
          notes_internal: document.getElementById('nc-notes').value,
          max_tables: parseInt(document.getElementById('nc-tables').value),
          billing_day: parseInt(document.getElementById('nc-billing-day').value),
          billing_amount: parseFloat(document.getElementById('nc-billing-amount').value),
          status: 'setup',
          promo_active: promoActive,
          promo_expires_at: promoActive ? promoExpires.toISOString() : null,
        });
        
        const restaurantId = result[0].id;
        
        // Create default settings
        await sbInsert('restaurant_settings', {
          restaurant_id: restaurantId,
          theme: 'luxury',
        });
        
        // Create admin user
        await sbInsert('users', {
          restaurant_id: restaurantId,
          role: 'admin',
          full_name: document.getElementById('nc-owner').value,
          username: document.getElementById('nc-email').value,
          password_hash: btoa('changeme123'),
          is_active: true,
        });
        
        // Create default tables
        const tableCount = parseInt(document.getElementById('nc-tables').value);
        for (let i = 1; i <= tableCount; i++) {
          await sbInsert('restaurant_tables', {
            restaurant_id: restaurantId,
            table_number: i,
            is_open: false,
            scratch_used: false,
          });
        }
        
        Utils.toast(t('addClient') + ' ✓');
        modal.remove();
        await this.loadClients();
        this.render();
      } catch(e) { Utils.toast('שגיאה: ' + e.message); console.error(e); }
    });
  },

  showEditClientModal(clientId) {
    const c = this.state.clients.find(cl => cl.id === clientId);
    if (!c) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.id = 'edit-client-modal';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">${t('edit')} — ${Utils.escape(c.name)}</h3>
          <button id="close-modal" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form id="edit-client-form" class="space-y-3">
          <div>
            <label class="text-sm text-gray-600">${t('clientName')}</label>
            <input type="text" id="ec-name" class="input-field mt-1" value="${Utils.escape(c.name)}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600">${t('businessNumber')}</label>
              <input type="text" id="ec-business" class="input-field mt-1" value="${c.business_number || ''}">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('phonePrimary')}</label>
              <input type="tel" id="ec-phone1" class="input-field mt-1" value="${c.phone_primary || ''}">
            </div>
          </div>
          <div>
            <label class="text-sm text-gray-600">${t('phoneSecondary')}</label>
            <input type="tel" id="ec-phone2" class="input-field mt-1" value="${c.phone_secondary || ''}">
            </div>
          <div>
            <label class="text-sm text-gray-600">${t('email')}</label>
            <input type="email" id="ec-email" class="input-field mt-1" value="${c.email || ''}">
          </div>
          <div>
            <label class="text-sm text-gray-600">${t('notesInternal')}</label>
            <textarea id="ec-notes" class="input-field mt-1" rows="2">${c.notes_internal || ''}</textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-gray-600">${t('billingDay')}</label>
              <input type="number" id="ec-billing-day" class="input-field mt-1" value="${c.billing_day || 1}" min="1" max="28">
            </div>
            <div>
              <label class="text-sm text-gray-600">${t('billingAmount')}</label>
              <input type="number" id="ec-billing-amount" class="input-field mt-1" value="${c.billing_amount || 0}" min="0" step="0.01">
            </div>
          </div>
          <div>
            <label class="text-sm text-gray-600">סטטוס</label>
            <select id="ec-status" class="input-field mt-1">
              <option value="setup" ${c.status === 'setup' ? 'selected' : ''}>${t('setup')}</option>
              <option value="active" ${c.status === 'active' ? 'selected' : ''}>${t('active')}</option>
              <option value="inactive" ${c.status === 'inactive' ? 'selected' : ''}>${t('inactive')}</option>
              <option value="suspended" ${c.status === 'suspended' ? 'selected' : ''}>${t('suspended')}</option>
            </select>
          </div>
          <button type="submit" class="btn-primary w-full">${t('save')}</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    modal.querySelector('#edit-client-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await sbUpdate('restaurants', { id: clientId }, {
          name: document.getElementById('ec-name').value,
          business_number: document.getElementById('ec-business').value,
          phone_primary: document.getElementById('ec-phone1').value,
          phone_secondary: document.getElementById('ec-phone2').value,
          email: document.getElementById('ec-email').value,
          notes_internal: document.getElementById('ec-notes').value,
          billing_day: parseInt(document.getElementById('ec-billing-day').value),
          billing_amount: parseFloat(document.getElementById('ec-billing-amount').value),
          status: document.getElementById('ec-status').value,
        });
        
        Utils.toast(t('save') + ' ✓');
        modal.remove();
        await this.loadClients();
        this.state.selectedClient = this.state.clients.find(cl => cl.id === clientId);
        this.render();
      } catch(e) { Utils.toast('שגיאה'); console.error(e); }
    });
  },
};
