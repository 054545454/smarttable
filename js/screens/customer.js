// SmartTable — Customer Screen (QR scan entry)
const CustomerScreen = {
  state: {
    token: null,
    table: null,
    restaurant: null,
    settings: null,
    gifts: [],
    menuItems: [],
    scratchUsed: false,
    activeTasks: [],
    subscriptions: [],
  },

  async init(token) {
    this.state.token = token;
    this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
    this.state.subscriptions = [];

    const app = document.getElementById('app');
    app.innerHTML = Utils.spinner();

    try {
      const data = await Auth.getRestaurantByTableToken(token);
      this.state.table = data.table;
      this.state.restaurant = data.restaurant;
      this.state.settings = data.settings;
      this.state.gifts = data.gifts || [];
      this.state.menuItems = data.menuItems || [];
      
      if (!Auth.isRestaurantActive(data.restaurant)) {
        app.innerHTML = `
          <div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
            <div class="text-center max-w-md">
              <div class="text-6xl mb-4">🍽️</div>
              <h1 class="text-2xl font-playfair text-gold mb-3">SmartTable</h1>
              <p class="text-gray-400">המסעדה אינה זמינה כרגע</p>
              <p class="text-gray-500 text-sm mt-2">אנא פנה לצוות המסעדה</p>
            </div>
          </div>`;
        return;
      }

      if (data.settings?.default_language) setLang(data.settings.default_language);
      
      const deviceId = Utils.getDeviceId();
      this.state.scratchUsed = data.table.scratch_used || 
        sessionStorage.getItem(`scratch_${data.table.id}_${deviceId}`) === 'true';

      this.render();
      this.setupRealtime();
    } catch (err) {
      app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
          <div class="text-center max-w-md">
            <div class="text-6xl mb-4">⚠️</div>
            <h1 class="text-xl text-white mb-2">קוד QR לא תקין</h1>
            <p class="text-gray-400">${err.message}</p>
          </div>
        </div>`;
    }
  },

  render() {
    const { table, restaurant, settings } = this.state;
    const themeClass = `theme-${settings?.theme || 'luxury'}`;
    const viewMode = settings?.customer_view_mode || 'full_menu';
    
    // Define service buttons based on view mode
    let serviceButtons = '';
    if (viewMode === 'full_menu') {
      serviceButtons = `
        ${this.renderServiceButton('water', 'requestWater')}
        ${this.renderServiceButton('bill', 'requestBill')}
        ${this.renderServiceButton('waiter', 'callWaiter')}
        ${this.renderServiceButton('wine_menu', 'wineMenu')}
        ${this.renderServiceButton('dessert_menu', 'dessertMenu')}
        ${this.renderServiceButton('special', 'specialRequest')}
      `;
    } else if (viewMode === 'service_only') {
      serviceButtons = `
        ${this.renderServiceButton('water', 'requestWater')}
        ${this.renderServiceButton('bill', 'requestBill')}
        ${this.renderServiceButton('waiter', 'callWaiter')}
        ${this.renderServiceButton('special', 'specialRequest')}
      `;
    } else { // minimal
      serviceButtons = `
        ${this.renderServiceButton('waiter', 'callWaiter')}
        ${this.renderServiceButton('bill', 'requestBill')}
      `;
    }

    // Build menu section (only in full_menu mode)
    let menuSection = '';
    if (viewMode === 'full_menu' && this.state.menuItems.length > 0) {
      const categories = {};
      this.state.menuItems.forEach(item => {
        const cat = item.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
      });
      
      menuSection = `
        <div class="px-4 mb-6 max-w-md mx-auto">
          <h2 class="text-lg font-playfair mb-3 text-center" style="color:var(--accent)">📋 התפריט</h2>
          ${Object.entries(categories).map(([cat, items]) => `
            <div class="mb-4">
              <h3 class="text-sm font-bold mb-2" style="color:var(--text-muted)">${Utils.escape(cat)}</h3>
              ${items.sort((a,b) => (a.sort_order||0) - (b.sort_order||0)).map(item => `
                <div class="card mb-2 flex items-center gap-3" style="background:var(--card);border:1px solid var(--border)">
                  ${item.image_url ? `<img src="${item.image_url}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0">` : ''}
                  <div class="flex-1">
                    <div class="font-medium" style="color:var(--text)">${Utils.escape(item.name)}</div>
                    ${item.description ? `<div class="text-xs mt-0.5" style="color:var(--text-muted)">${Utils.escape(item.description)}</div>` : ''}
                  </div>
                  ${item.price ? `<div class="text-sm font-bold" style="color:var(--accent)">₪${item.price}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build gift section (only in full_menu mode)
    let giftSection = '';
    if (viewMode === 'full_menu') {
      giftSection = `<div id="gift-section" class="px-4 mb-6">${this.renderGiftSection()}</div>`;
    }

    document.getElementById('app').innerHTML = `
      <div id="customer-root" class="min-h-screen ${themeClass}" style="background:var(--bg);color:var(--text)">
        <!-- Header with logo -->
        <div class="text-center pt-8 pb-6 px-4">
          ${settings?.logo_url 
            ? `<img src="${settings.logo_url}" alt="logo" class="mx-auto h-20 mb-3 object-contain">`
            : `<h1 class="text-3xl font-playfair" style="color:var(--accent)">${Utils.escape(restaurant.name)}</h1>`
          }
          ${settings?.logo_url ? `<h2 class="text-lg font-playfair mb-1" style="color:var(--accent)">${Utils.escape(restaurant.name)}</h2>` : ''}
          <p class="text-sm mt-2" style="color:var(--text-muted)">
            ${t('tableNumber')} ${table.table_number} · ${t('welcome')}
          </p>
        </div>

        ${giftSection}

        ${menuSection}

        <!-- Service Buttons -->
        <div class="px-4 pb-4">
          <div class="grid grid-cols-2 gap-3 max-w-md mx-auto">
            ${serviceButtons}
          </div>
        </div>

        <!-- Active task status -->
        <div id="active-tasks" class="px-4 pb-8 max-w-md mx-auto">
          ${this.renderActiveTasks()}
        </div>

        <!-- Footer -->
        <div class="text-center pb-6 text-xs" style="color:var(--text-muted);opacity:0.5">
          Powered by SmartTable
        </div>
      </div>
    `;
    
    this.attachEvents();
  },

  renderGiftSection() {
    if (this.state.scratchUsed) return '';
    if (!this.state.gifts || this.state.gifts.length === 0) return '';
    
    const gift = this.state.gifts[Math.floor(Math.random() * this.state.gifts.length)];
    
    return `
      <div class="max-w-sm mx-auto">
        <div class="card text-center relative overflow-hidden" style="background:var(--card);border:1px solid var(--border)">
          <div id="scratch-prize" class="py-6">
            <div class="text-4xl mb-2">${gift.icon || '🎁'}</div>
            <h3 class="font-playfair text-lg mb-1" style="color:var(--accent)">${Utils.escape(gift.title)}</h3>
            <p class="text-sm" style="color:var(--text-muted)">${Utils.escape(gift.description || '')}</p>
          </div>
          <div id="scratch-overlay" class="absolute inset-0 scratch-overlay flex items-center justify-center"
            style="border-radius:1rem">
            <div class="text-center pointer-events-none">
              <div class="text-3xl mb-1">✨</div>
              <p class="font-bold text-gray-600">${t('scratchToReveal')}</p>
              <p class="text-xs text-gray-500 mt-1">גרוד עם האצבע</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderServiceButton(type, labelKey) {
    const icon = CONFIG.taskTypes[type]?.icon || '📋';
    return `
      <button data-task-type="${type}" class="service-btn card flex flex-col items-center justify-center py-5 transition-all active:scale-95"
        style="background:var(--card);border:1px solid var(--border)">
        <span class="text-2xl mb-1">${icon}</span>
        <span class="text-sm font-medium" style="color:var(--text)">${t(labelKey)}</span>
      </button>
    `;
  },

  renderActiveTasks() {
    if (!this.state.activeTasks || this.state.activeTasks.length === 0) return '';
    
    return `
      <div class="mt-4">
        <h3 class="text-sm font-medium mb-2" style="color:var(--text-muted)">${t('waitingForWaiter')}</h3>
        ${this.state.activeTasks.map(task => `
          <div class="card mb-2 flex items-center justify-between" style="background:var(--card);border:1px solid var(--border)">
            <div class="flex items-center gap-2">
              <span class="text-xl">${CONFIG.taskTypes[task.type]?.icon || '📋'}</span>
              <span class="text-sm" style="color:var(--text)">${CONFIG.taskTypes[task.type]?.label || task.type}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full animate-pulse-soft" style="background:var(--accent)"></div>
              <span class="text-xs" style="color:var(--text-muted)">${t('requestSent')}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  attachEvents() {
    const overlay = document.getElementById('scratch-overlay');
    if (overlay) this.setupScratch(overlay);
    
    document.querySelectorAll('.service-btn').forEach(btn => {
      btn.addEventListener('click', () => this.requestService(btn.dataset.taskType));
    });
  },

  setupScratch(overlay) {
    let isScratching = false;
    let scratchCount = 0;
    
    const handleMove = (e) => {
      if (!isScratching) return;
      e.preventDefault();
      scratchCount++;
      if (scratchCount > 12) {
        overlay.style.transition = 'opacity 0.5s';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          this.claimGift();
        }, 500);
      }
    };
    
    overlay.addEventListener('pointerdown', (e) => { isScratching = true; handleMove(e); });
    overlay.addEventListener('pointermove', handleMove);
    overlay.addEventListener('pointerup', () => { isScratching = false; });
    overlay.addEventListener('pointerleave', () => isScratching = false);
  },

  async claimGift() {
    if (this.state.scratchUsed) return;
    this.state.scratchUsed = true;
    sessionStorage.setItem(`scratch_${this.state.table.id}_${Utils.getDeviceId()}`, 'true');
    
    Utils.toast('🎉 ' + t('scratchGift'));
    
    try {
      await sbInsert('tasks', {
        restaurant_id: this.state.restaurant.id,
        table_id: this.state.table.id,
        table_number: this.state.table.table_number,
        type: 'gift',
        status: 'open',
      });
    } catch(e) { console.error(e); }
    
    try {
      await sbUpdate('restaurant_tables', { id: this.state.table.id }, { scratch_used: true });
    } catch(e) { console.error(e); }
  },

  async requestService(type) {
    const existing = this.state.activeTasks.find(t => t.type === type && t.status === 'open');
    if (existing) {
      Utils.toast(t('requestSent'));
      return;
    }
    
    Utils.toast(t('requestSent'));
    Utils.vibrate(50);
    
    try {
      const result = await sbInsert('tasks', {
        restaurant_id: this.state.restaurant.id,
        table_id: this.state.table.id,
        table_number: this.state.table.table_number,
        type: type,
        status: 'open',
      });
      
      this.state.activeTasks.push(Array.isArray(result) ? result[0] : result);
      const container = document.getElementById('active-tasks');
      if (container) container.innerHTML = this.renderActiveTasks();
    } catch(e) {
      Utils.toast('שגיאה בשליחת בקשה');
      console.error(e);
    }
  },

  setupRealtime() {
    const sub = sbSubscribeTasks(this.state.restaurant.id, () => {
      this.refreshActiveTasks();
    });
    this.state.subscriptions.push(sub);
    this.refreshActiveTasks();
  },

  async refreshActiveTasks() {
    try {
      const tasks = await sbSelect('tasks', {
        restaurant_id: this.state.restaurant.id,
        table_id: this.state.table.id,
      });
      
      this.state.activeTasks = (tasks || []).filter(t => t.status === 'open' || t.status === 'in_progress');
      
      const container = document.getElementById('active-tasks');
      if (container) container.innerHTML = this.renderActiveTasks();
    } catch(e) { console.error(e); }
  },
};
