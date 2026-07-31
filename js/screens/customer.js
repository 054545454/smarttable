// SmartTable — Customer Screen (QR scan entry)
const CustomerScreen = {
  state: {
    token: null,
    table: null,
    restaurant: null,
    settings: null,
    gifts: [],
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
      
      // Check restaurant is active
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

      // Set language
      if (data.settings.default_language) setLang(data.settings.default_language);
      
      // Check scratch gift
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
    const themeClass = `theme-${settings.theme || 'luxury'}`;
    
    document.getElementById('app').innerHTML = `
      <div id="customer-root" class="min-h-screen ${themeClass}" style="background:var(--bg);color:var(--text)">
        <!-- Header -->
        <div class="text-center pt-8 pb-6 px-4">
          ${settings.logo_url 
            ? `<img src="${settings.logo_url}" alt="logo" class="mx-auto h-16 mb-2 object-contain">`
            : `<h1 class="text-3xl font-playfair" style="color:var(--accent)">${Utils.escape(restaurant.name)}</h1>`
          }
          <p class="text-sm mt-2" style="color:var(--text-muted)">
            ${t('tableNumber')} ${table.table_number} · ${t('welcome')}
          </p>
        </div>

        <!-- Scratch Gift Section -->
        <div id="gift-section" class="px-4 mb-6">
          ${this.renderGiftSection()}
        </div>

        <!-- Service Buttons -->
        <div class="px-4 pb-8">
          <div class="grid grid-cols-2 gap-3 max-w-md mx-auto">
            ${this.renderServiceButton('water', 'requestWater')}
            ${this.renderServiceButton('bill', 'requestBill')}
            ${this.renderServiceButton('waiter', 'callWaiter')}
            ${this.renderServiceButton('wine_menu', 'wineMenu')}
            ${this.renderServiceButton('dessert_menu', 'dessertMenu')}
            ${this.renderServiceButton('special', 'specialRequest')}
          </div>
        </div>

        <!-- Active task status -->
        <div id="active-tasks" class="px-4 pb-8 max-w-md mx-auto">
          ${this.renderActiveTasks()}
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
    // Scratch overlay
    const overlay = document.getElementById('scratch-overlay');
    if (overlay) this.setupScratch(overlay);
    
    // Service buttons
    document.querySelectorAll('.service-btn').forEach(btn => {
      btn.addEventListener('click', () => this.requestService(btn.dataset.taskType));
    });
  },

  setupScratch(overlay) {
    const prize = document.getElementById('scratch-prize');
    let isScratching = false;
    const ctx = document.createElement('canvas').getContext('2d');
    
    // Use pointer events for mobile
    const handleMove = (e) => {
      if (!isScratching) return;
      e.preventDefault();
      const rect = overlay.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
      
      // Create "scratch" effect by making overlay transparent in circles
      const ctx2 = overlay.getContext ? overlay.getContext('2d') : null;
      if (ctx2) {
        ctx2.globalCompositeOperation = 'destination-out';
        ctx2.beginPath();
        ctx2.arc(x, y, 25, 0, Math.PI * 2);
        ctx2.fill();
      } else {
        // Fallback: fade out on touch
        overlay.style.opacity = String(Math.max(0, parseFloat(overlay.style.opacity || '1') - 0.1));
      }
      
      // Check if enough scratched
      checkScratchProgress();
    };
    
    const checkScratchProgress = () => {
      const opacity = parseFloat(overlay.style.opacity || '1');
      if (opacity < 0.3) {
        overlay.style.display = 'none';
        this.claimGift();
      }
    };
    
    overlay.addEventListener('pointerdown', (e) => { isScratching = true; handleMove(e); });
    overlay.addEventListener('pointermove', handleMove);
    overlay.addEventListener('pointerup', () => { 
      isScratching = false;
      checkScratchProgress();
    });
    overlay.addEventListener('pointerleave', () => isScratching = false);
    
    // Simple approach: just remove overlay after sufficient interaction
    let scratchCount = 0;
    overlay.addEventListener('pointermove', () => {
      scratchCount++;
      if (scratchCount > 15) {
        overlay.style.transition = 'opacity 0.5s';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          this.claimGift();
        }, 500);
      }
    });
  },

  async claimGift() {
    if (this.state.scratchUsed) return;
    this.state.scratchUsed = true;
    sessionStorage.setItem(`scratch_${this.state.table.id}_${Utils.getDeviceId()}`, 'true');
    
    Utils.toast('🎉 ' + t('scratchGift'));
    
    // Create gift task
    try {
      await sbInsert('tasks', {
        restaurant_id: this.state.restaurant.id,
        table_id: this.state.table.id,
        table_number: this.state.table.table_number,
        type: 'gift',
        status: 'open',
      });
    } catch(e) { console.error(e); }
    
    // Update table scratch_used
    try {
      await sbUpdate('restaurant_tables', { id: this.state.table.id }, { scratch_used: true });
    } catch(e) { console.error(e); }
  },

  async requestService(type) {
    // Check for existing open task of same type for this table
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
      
      this.state.activeTasks.push(result[0]);
      this.render();
    } catch(e) {
      Utils.toast('שגיאה בשליחת בקשה');
      console.error(e);
    }
  },

  setupRealtime() {
    const sub = sbSubscribeTasks(this.state.restaurant.id, (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        // Refresh active tasks for this table
        this.refreshActiveTasks();
      }
    });
    this.state.subscriptions.push(sub);
    
    this.refreshActiveTasks();
  },

  async refreshActiveTasks() {
    try {
      const tasks = await sbSelect('tasks', {
        restaurant_id: this.state.restaurant.id,
        table_id: this.state.table.id,
        status: { in: ['open', 'in_progress'] },
      }, { order: { column: 'created_at', ascending: true } });
      
      this.state.activeTasks = tasks || [];
      
      const container = document.getElementById('active-tasks');
      if (container) container.innerHTML = this.renderActiveTasks();
    } catch(e) { console.error(e); }
  },
};
