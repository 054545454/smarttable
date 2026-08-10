// SmartTable — Customer Screen (VIP CRM, AI Sommelier, Bill Split, Smart Scratch, Feedback)
const CustomerScreen = {
  state: {
    token: null, table: null, restaurant: null, settings: null,
    gifts: [], menuItems: [], scratchUsed: false, activeTasks: [],
    subscriptions: [], guestProfile: null, deviceId: null,
    showProfile: false, showAI: false, showFeedback: false,
    showBillSplit: false, guestOrders: [],
  },

  async init(token) {
    this.state.token = token;
    this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
    this.state.subscriptions = [];
    this.state.deviceId = Utils.getDeviceId();
    document.getElementById('app').innerHTML = Utils.spinner();

    try {
      const data = await sbGetByQr(token, this.state.deviceId);
      this.state.table = data.table;
      this.state.restaurant = data.restaurant;
      this.state.settings = data.settings;
      this.state.gifts = data.gifts || [];
      this.state.menuItems = data.menuItems || [];
      this.state.guestProfile = data.guestProfile || null;

      // Auto-save guest visit
      if (!this.state.guestProfile) {
        await sbSaveGuestProfile({
          restaurant_id: this.state.restaurant.id,
          guest_device_id: this.state.deviceId,
        });
      } else {
        // Update visit count
        await sbSaveGuestProfile({
          restaurant_id: this.state.restaurant.id,
          guest_device_id: this.state.deviceId,
          nickname: this.state.guestProfile.nickname,
        });
      }

      if (!Auth.isRestaurantActive(data.restaurant)) {
        document.getElementById('app').innerHTML = `
          <div class="min-h-screen flex items-center justify-center" style="background:#0F0F0F;color:#E5D5A8">
            <div class="text-center max-w-md animate-fade-in">
              <div class="text-6xl mb-4">🍽️</div>
              <h1 class="text-2xl font-playfair" style="color:#C9A84C">SmartTable</h1>
              <p style="color:#7A7A7A">המסעדה אינה זמינה כרגע</p>
              <p style="color:#5A5A5A;font-size:0.875rem;margin-top:0.5rem">אנא פנה לצוות המסעדה</p>
            </div>
          </div>`;
        return;
      }

      if (data.settings?.default_language) setLang(data.settings.default_language);
      this.state.scratchUsed = data.table.scratch_used || sessionStorage.getItem(`scratch_${data.table.id}_${this.state.deviceId}`) === 'true';

      this.render();
      this.setupRealtime();
    } catch (err) {
      document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center" style="background:#0F0F0F;color:#E5D5A8">
          <div class="text-center max-w-md animate-fade-in">
            <div class="text-6xl mb-4">⚠️</div>
            <h1 class="text-xl" style="color:#E5D5A8">קוד QR לא תקין</h1>
            <p style="color:#7A7A7A">${Utils.escape(err.message)}</p>
          </div>
        </div>`;
    }
  },

  render() {
    const { table, restaurant, settings, guestProfile } = this.state;
    const themeClass = `theme-${settings?.theme || 'luxury'}`;
    const viewMode = settings?.customer_view_mode || 'full_menu';
    const isVIP = guestProfile?.is_vip || (guestProfile?.visit_count >= 3);
    const visitCount = guestProfile?.visit_count || 0;

    // Personalized welcome
    const welcomeText = guestProfile?.nickname
      ? `ברוך שוב${isVIP ? ', אורח VIP' : ''} ${Utils.escape(guestProfile.nickname)}!`
      : isVIP ? `ברוכים הבאים, אורח VIP!` : t('welcome');

    // Service buttons
    let serviceButtons = '';
    const btnMap = {
      full_menu: [['water','requestWater'],['bill','requestBill'],['waiter','callWaiter'],['wine_menu','wineMenu'],['dessert_menu','dessertMenu'],['special','specialRequest']],
      service_only: [['water','requestWater'],['bill','requestBill'],['waiter','callWaiter'],['special','specialRequest']],
      minimal: [['waiter','callWaiter'],['bill','requestBill']],
    };
    (btnMap[viewMode] || btnMap.minimal).forEach(([type,label]) => { serviceButtons += this.renderServiceButton(type, label); });

    // Menu section
    let menuSection = '';
    if (viewMode === 'full_menu' && this.state.menuItems.length > 0) {
      const cats = {};
      this.state.menuItems.forEach(item => { const c = item.category || 'other'; if (!cats[c]) cats[c] = []; cats[c].push(item); });
      menuSection = `
        <div class="px-4 mb-6 max-w-md mx-auto">
          <h2 class="text-lg font-playfair mb-3 text-center animate-fade-in" style="color:var(--accent)">📋 התפריט</h2>
          ${Object.entries(cats).map(([cat, items], i) => `
            <div class="mb-4 animate-fade-in stagger-${Math.min(i+1,6)}">
              <h3 class="text-sm font-bold mb-2" style="color:var(--text-muted)">${Utils.escape(cat)}</h3>
              ${items.sort((a,b) => (a.sort_order||0)-(b.sort_order||0)).map(item => `
                <div class="card mb-2 flex items-center gap-3 card-hover" style="background:var(--card);border:1px solid var(--border)">
                  ${item.image_url ? `<img src="${item.image_url}" class="w-14 h-14 rounded-lg object-cover flex-shrink-0">` : ''}
                  <div class="flex-1">
                    <div class="font-medium" style="color:var(--text)">${Utils.escape(item.name)}</div>
                    ${item.description ? `<div class="text-xs mt-0.5" style="color:var(--text-muted)">${Utils.escape(item.description)}</div>` : ''}
                  </div>
                  ${item.price ? `<div class="text-sm font-bold" style="color:var(--accent)">₪${item.price}</div>` : ''}
                </div>`).join('')}
            </div>`).join('')}
        </div>`;
    }

    document.getElementById('app').innerHTML = `
      <div id="customer-root" class="min-h-screen ${themeClass} screen-enter" style="background:var(--bg);color:var(--text)">
        <!-- Header -->
        <div class="text-center pt-8 pb-4 px-4 animate-fade-in">
          ${settings?.logo_url
            ? `<img src="${settings.logo_url}" alt="logo" class="mx-auto h-20 mb-2 object-contain animate-spring-in">`
            : `<h1 class="text-3xl font-playfair gold-shine animate-spring-in" style="color:var(--accent)">${Utils.escape(restaurant.name)}</h1>`
          }
          ${settings?.logo_url ? `<h2 class="text-lg font-playfair mb-1" style="color:var(--accent)">${Utils.escape(restaurant.name)}</h2>` : ''}
          <p class="text-sm mt-2" style="color:var(--text-muted)">
            ${t('tableNumber')} ${table.table_number}
          </p>
          <p class="text-sm mt-1 animate-fade-in stagger-2" style="color:var(--accent)">
            ${welcomeText}
          </p>
          ${isVIP ? `<span class="vip-badge mt-2 inline-block">⭐ VIP · ${visitCount} ביקורים</span>` : ''}
        </div>

        <!-- Guest Profile button -->
        <div class="text-center mb-4 animate-fade-in stagger-1">
          <button id="show-profile-btn" class="text-xs px-4 py-2 rounded-full spring-scale" style="color:var(--accent);border:1px solid var(--border);background:var(--card)">
            ${guestProfile?.nickname ? '👤 הפרופיל שלי' : '👤 עדכן את ההעדפות שלך'}
          </button>
        </div>

        ${viewMode === 'full_menu' ? `<div id="gift-section" class="px-4 mb-6">${this.renderGiftSection()}</div>` : ''}

        ${menuSection}

        <!-- AI Sommelier button (full_menu only) -->
        ${viewMode === 'full_menu' ? `
          <div class="px-4 mb-4 max-w-md mx-auto animate-fade-in stagger-3">
            <button id="ai-sommelier-btn" class="w-full card flex items-center justify-center gap-2 py-4 spring-scale card-hover" style="background:var(--card);border:1px solid var(--accent)">
              <span class="text-2xl">🍷</span>
              <span class="font-medium" style="color:var(--accent)">יינן AI — המלצות מותאמות</span>
            </button>
          </div>` : ''}

        <!-- Service Buttons -->
        <div class="px-4 pb-4">
          <div class="grid grid-cols-2 gap-3 max-w-md mx-auto">
            ${serviceButtons}
          </div>
        </div>

        <!-- Bill Split button -->
        <div class="px-4 pb-4 max-w-md mx-auto animate-fade-in stagger-4">
          <button id="bill-split-btn" class="w-full text-xs px-4 py-2 rounded-full spring-scale" style="color:var(--text-muted);border:1px solid var(--border);background:var(--card)">
            💸 חלוקת חשבון בין סועדים
          </button>
        </div>

        <!-- Active tasks -->
        <div id="active-tasks" class="px-4 pb-4 max-w-md mx-auto">${this.renderActiveTasks()}</div>

        <!-- Feedback button -->
        <div class="px-4 pb-8 max-w-md mx-auto text-center animate-fade-in stagger-5">
          <button id="feedback-btn" class="text-xs" style="color:var(--text-muted)">איך היה? שתפ/י אותנו ⭐</button>
        </div>

        <!-- Footer -->
        <div class="text-center pb-6 text-xs" style="color:var(--text-muted);opacity:0.5">Powered by SmartTable</div>

        <!-- Modals will be injected here -->
        <div id="customer-modals"></div>
      </div>
    `;
    this.attachEvents();
  },

  renderGiftSection() {
    if (this.state.scratchUsed) return '';
    if (!this.state.gifts || this.state.gifts.length === 0) return '';

    // Smart gift selection — prefer based on guest preferences
    let gift = this.state.gifts[Math.floor(Math.random() * this.state.gifts.length)];
    if (this.state.guestProfile?.favorite_dish) {
      const matched = this.state.gifts.find(g => g.title?.includes(this.state.guestProfile.favorite_dish));
      if (matched) gift = matched;
    }

    return `
      <div class="max-w-sm mx-auto animate-spring-bounce">
        <div class="card text-center relative overflow-hidden" style="background:var(--card);border:1px solid var(--border)">
          <div id="scratch-prize" class="py-6">
            ${gift.image_url
              ? `<img src="${gift.image_url}" class="mx-auto h-32 w-32 object-cover rounded-xl mb-3">`
              : `<div class="text-4xl mb-2">${gift.icon || '🎁'}</div>`
            }
            <h3 class="font-playfair text-lg mb-1" style="color:var(--accent)">${Utils.escape(gift.title)}</h3>
            <p class="text-sm" style="color:var(--text-muted)">${Utils.escape(gift.description || '')}</p>
          </div>
          <div id="scratch-overlay" class="absolute inset-0 scratch-overlay flex items-center justify-center" style="border-radius:1rem">
            <div class="text-center pointer-events-none">
              <div class="text-3xl mb-1">✨</div>
              <p class="font-bold text-gray-600">${t('scratchToReveal')}</p>
              <p class="text-xs text-gray-500 mt-1">גרוד עם האצבע</p>
            </div>
          </div>
        </div>
      </div>`;
  },

  renderServiceButton(type, labelKey) {
    const icon = CONFIG.taskTypes[type]?.icon || '📋';
    return `
      <button data-task-type="${type}" class="service-btn card flex flex-col items-center justify-center py-5 spring-scale animate-spring-in relative overflow-hidden"
        style="background:var(--card);border:1px solid var(--border);min-height:80px">
        <span class="text-2xl mb-1 svc-icon">${icon}</span>
        <span class="text-sm font-medium svc-label" style="color:var(--text)">${t(labelKey)}</span>
        <div class="svc-loader absolute inset-0 flex items-center justify-center hidden" style="background:var(--card)">
          <div class="spinner" style="width:24px;height:24px;border-color:var(--accent)"></div>
        </div>
      </button>`;
  },

  renderActiveTasks() {
    if (!this.state.activeTasks || this.state.activeTasks.length === 0) return '';
    return `
      <div class="mt-4 animate-fade-in">
        <h3 class="text-sm font-medium mb-2" style="color:var(--text-muted)">${t('waitingForWaiter')}</h3>
        ${this.state.activeTasks.map(task => `
          <div class="card mb-2 flex items-center justify-between animate-slide-in-right" style="background:var(--card);border:1px solid var(--border)">
            <div class="flex items-center gap-2">
              <span class="text-xl">${CONFIG.taskTypes[task.type]?.icon || '📋'}</span>
              <span class="text-sm" style="color:var(--text)">${CONFIG.taskTypes[task.type]?.label || task.type}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full animate-pulse-soft" style="background:var(--accent)"></div>
              <span class="text-xs" style="color:var(--text-muted)">${task.status === 'in_progress' ? '🤵 בטיפול' : t('requestSent')}</span>
            </div>
          </div>`).join('')}
      </div>`;
  },

  attachEvents() {
    const overlay = document.getElementById('scratch-overlay');
    if (overlay) this.setupScratch(overlay);

    document.querySelectorAll('.service-btn').forEach(btn => {
      btn.addEventListener('click', () => this.requestService(btn.dataset.taskType));
    });

    const profileBtn = document.getElementById('show-profile-btn');
    if (profileBtn) profileBtn.addEventListener('click', () => this.showProfileModal());

    const aiBtn = document.getElementById('ai-sommelier-btn');
    if (aiBtn) aiBtn.addEventListener('click', () => this.showAIModal());

    const feedbackBtn = document.getElementById('feedback-btn');
    if (feedbackBtn) feedbackBtn.addEventListener('click', () => this.showFeedbackModal());

    const billBtn = document.getElementById('bill-split-btn');
    if (billBtn) billBtn.addEventListener('click', () => this.showBillSplitModal());
  },

  setupScratch(overlay) {
    let isScratching = false, count = 0;
    const handleMove = (e) => {
      if (!isScratching) return;
      e.preventDefault(); count++;
      if (count > 12) {
        overlay.style.opacity = '0';
        Utils.vibrate([30, 20, 50]);
        setTimeout(() => { overlay.style.display = 'none'; this.claimGift(); }, 500);
      }
    };
    overlay.addEventListener('pointerdown', e => { isScratching = true; handleMove(e); });
    overlay.addEventListener('pointermove', handleMove);
    overlay.addEventListener('pointerup', () => isScratching = false);
    overlay.addEventListener('pointerleave', () => isScratching = false);
  },

  async claimGift() {
    if (this.state.scratchUsed) return;
    this.state.scratchUsed = true;
    sessionStorage.setItem(`scratch_${this.state.table.id}_${this.state.deviceId}`, 'true');
    Utils.toast('🎉 ' + t('scratchGift'));
    Utils.vibrate([50, 30, 100]);
    try {
      await sbInsert('tasks', { restaurant_id: this.state.restaurant.id, table_id: this.state.table.id, table_number: this.state.table.table_number, type: 'gift', status: 'open', created_at: new Date().toISOString() });
    } catch(e) {}
    try { await sbUpdate('restaurant_tables', { id: this.state.table.id }, { scratch_used: true }); } catch(e) {}
  },

  async requestService(type) {
    // Idempotency: check existing open/in_progress task of same type
    const existing = this.state.activeTasks.find(t => t.type === type && (t.status === 'open' || t.status === 'in_progress'));
    if (existing) { Utils.toast(t('requestSent')); return; }

    // Find and disable the button immediately
    const btn = document.querySelector('[data-task-type="' + type + '"]');
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      const loader = btn.querySelector('.svc-loader');
      const icon = btn.querySelector('.svc-icon');
      const label = btn.querySelector('.svc-label');
      if (loader) loader.classList.remove('hidden');
      if (icon) icon.style.visibility = 'hidden';
      if (label) label.style.visibility = 'hidden';
    }

    Utils.toast(t('requestSent'));
    Utils.vibrate(50);

    // Optimistic update
    const tempTask = { type, status: 'open', _optimistic: true };
    this.state.activeTasks.push(tempTask);
    document.getElementById('active-tasks').innerHTML = this.renderActiveTasks();

    try {
      const result = await sbInsert('tasks', { restaurant_id: this.state.restaurant.id, table_id: this.state.table.id, table_number: this.state.table.table_number, type, status: 'open', created_at: new Date().toISOString() });
      const realTask = Array.isArray(result) ? result[0] : result;
      const idx = this.state.activeTasks.indexOf(tempTask);
      if (idx >= 0) this.state.activeTasks[idx] = realTask;
    } catch(e) {
      Utils.toast('שגיאה בשליחת בקשה');
      // Re-enable button on error
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        const loader = btn.querySelector('.svc-loader');
        const icon = btn.querySelector('.svc-icon');
        const label = btn.querySelector('.svc-label');
        if (loader) loader.classList.add('hidden');
        if (icon) icon.style.visibility = 'visible';
        if (label) label.style.visibility = 'visible';
      }
      const ti = this.state.activeTasks.indexOf(tempTask);
      if (ti >= 0) this.state.activeTasks.splice(ti, 1);
      document.getElementById('active-tasks').innerHTML = this.renderActiveTasks();
    }
  },

  // ─── Profile Modal ──────────────────────────────────────────────
  showProfileModal() {
    const p = this.state.guestProfile || {};
    const modal = document.getElementById('customer-modals');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" id="profile-modal">
        <div class="card w-full max-w-md animate-spring-bounce" style="background:var(--card);max-height:85vh;overflow-y:auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-playfair text-lg" style="color:var(--accent)">👤 הפרופיל שלי</h2>
            <button id="close-profile" class="text-2xl" style="color:var(--text-muted)">✕</button>
          </div>
          <p class="text-xs mb-4" style="color:var(--text-muted)">ההעדפות שלך נשמרות ומועברות למלצר בביקור הבא. אפשר להישאר אנונימי.</p>
          <form id="profile-form" class="space-y-3">
            <div><label class="text-sm mb-1 block" style="color:var(--text)">כינוי (אופציונלי)</label>
              <input type="text" id="pf-nickname" class="input-field" value="${Utils.escape(p.nickname||'')}" placeholder="איך נקרא לך?"></div>
            <div><label class="text-sm mb-1 block" style="color:var(--text)">יין אהוב</label>
              <input type="text" id="pf-wine" class="input-field" value="${Utils.escape(p.favorite_wine||'')}" placeholder="לדוגמה: קברנה סוביניון"></div>
            <div><label class="text-sm mb-1 block" style="color:var(--text)">רגישויות / אלרגיות</label>
              <input type="text" id="pf-allergies" class="input-field" value="${Utils.escape(p.allergies||'')}" placeholder="לדוגמה: בוטנים, גלוטן"></div>
            <div><label class="text-sm mb-1 block" style="color:var(--text)">העדפות תזונה</label>
              <input type="text" id="pf-diet" class="input-field" value="${Utils.escape(p.dietary_prefs||'')}" placeholder="צמחוני, טבעוני..."></div>
            <div><label class="text-sm mb-1 block" style="color:var(--text)">מנה אהובה</label>
              <input type="text" id="pf-dish" class="input-field" value="${Utils.escape(p.favorite_dish||'')}" placeholder="מה המנה שאתה אוהב?"></div>
            <div><label class="text-sm mb-1 block" style="color:var(--text)">טלפון (אופציונלי)</label>
              <input type="tel" id="pf-phone" class="input-field" value="${Utils.escape(p.phone||'')}" placeholder="פרטיות מלאה"></div>
            <button type="submit" class="btn-primary w-full">שמור העדפות</button>
          </form>
        </div>
      </div>`;
    document.getElementById('close-profile').addEventListener('click', () => modal.innerHTML = '');
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        restaurant_id: this.state.restaurant.id, guest_device_id: this.state.deviceId,
        nickname: document.getElementById('pf-nickname').value.trim() || null,
        favorite_wine: document.getElementById('pf-wine').value.trim() || null,
        allergies: document.getElementById('pf-allergies').value.trim() || null,
        dietary_prefs: document.getElementById('pf-diet').value.trim() || null,
        favorite_dish: document.getElementById('pf-dish').value.trim() || null,
        phone: document.getElementById('pf-phone').value.trim() || null,
      };
      try {
        await sbSaveGuestProfile(data);
        this.state.guestProfile = { ...this.state.guestProfile, ...data };
        Utils.toast('✅ ההעדפות נשמרו');
        Utils.vibrate(50);
        modal.innerHTML = '';
        this.render();
      } catch(e) { Utils.toast('שגיאה בשמירה'); }
    });
  },

  // ─── AI Sommelier Modal ─────────────────────────────────────────
  showAIModal() {
    const modal = document.getElementById('customer-modals');
    const menuWines = this.state.menuItems.filter(m => m.category?.toLowerCase().includes('יין') || m.category?.toLowerCase().includes('wine'));
    const menuText = this.state.menuItems.map(m => `${m.name} - ${m.description||''} ₪${m.price||''}`).join('\n');
    const allergies = this.state.guestProfile?.allergies || 'אין';

    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" id="ai-modal">
        <div class="card w-full max-w-md animate-spring-bounce" style="background:var(--card);max-height:85vh;display:flex;flex-direction:column">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-playfair text-lg" style="color:var(--accent)">🍷 יינן AI</h2>
            <button id="close-ai" class="text-2xl" style="color:var(--text-muted)">✕</button>
          </div>
          <div id="ai-chat" class="flex-1 overflow-y-auto mb-3 space-y-2" style="max-height:50vh">
            <div class="chat-bubble chat-bubble-ai">🍷 שלום! אני היינן הדיגיטלי של המסעדה. אני כאן לעזור עם המלצות על יינות, התאמת מנות לרגישויות, וכל שאלה על התפריט. במה אוכל לעזור?</div>
          </div>
          <div class="flex gap-2 mb-2 flex-wrap">
            <button class="ai-quick text-xs px-3 py-1.5 rounded-full" data-q="איזה יין מתאים למנה העיקרית?" style="background:var(--card);border:1px solid var(--border);color:var(--accent)">🍷 יין למנה העיקרית</button>
            <button class="ai-quick text-xs px-3 py-1.5 rounded-full" data-q="יש לי רגישות ל${allergies}. מה מומלץ?" style="background:var(--card);border:1px solid var(--border);color:var(--accent)">🚫 מנות ללא ${allergies}</button>
            <button class="ai-quick text-xs px-3 py-1.5 rounded-full" data-q="מה המנה הכי פופולרית?" style="background:var(--card);border:1px solid var(--border);color:var(--accent)">⭐ המלצת השף</button>
          </div>
          <form id="ai-form" class="flex gap-2">
            <input type="text" id="ai-input" class="input-field flex-1" placeholder="שאל אותי על התפריט...">
            <button type="submit" class="btn-primary">שלח</button>
          </form>
        </div>
      </div>`;

    const chatEl = document.getElementById('ai-chat');
    const addMsg = (text, isUser) => {
      const div = document.createElement('div');
      div.className = `chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`;
      div.textContent = text;
      chatEl.appendChild(div);
      chatEl.scrollTop = chatEl.scrollHeight;
    };

    const askAI = async (question) => {
      addMsg(question, true);
      document.getElementById('ai-input').value = '';
      addMsg('🤔 מחשב...', false);
      // Simple AI response based on menu analysis (no external API needed)
      const responses = this.generateAIResponse(question, menuText, allergies);
      setTimeout(() => {
        chatEl.lastChild.remove();
        addMsg(responses, false);
        Utils.vibrate(30);
      }, 800);
    };

    document.getElementById('close-ai').addEventListener('click', () => modal.innerHTML = '');
    document.getElementById('ai-form').addEventListener('submit', (e) => { e.preventDefault(); const v = document.getElementById('ai-input').value.trim(); if (v) askAI(v); });
    document.querySelectorAll('.ai-quick').forEach(btn => btn.addEventListener('click', () => askAI(btn.dataset.q)));
  },

  generateAIResponse(question, menuText, allergies) {
    const items = this.state.menuItems;
    const q = question.toLowerCase();
    // Wine recommendation
    if (q.includes('יין') || q.includes('wine')) {
      const wines = items.filter(m => m.category?.toLowerCase().includes('יין') || m.category?.toLowerCase().includes('wine') || m.name?.toLowerCase().includes('יין'));
      if (wines.length > 0) return `🍷 מהתפריט שלנו, אני ממליץ על:\n${wines.slice(0,3).map(w => `• ${w.name} - ₪${w.price||''}`).join('\n')}\n\nלמנה עיקרית בשרית — יין אדום יתאים. לדגים — לבן קל.`;
      return `🍷 אשמח להמליץ! למנה עיקרית עם בשר — קברנה או מרלו. לדגים — סוביניון בלאן. לקינוח — מוסקט או פורט.`;
    }
    // Allergies
    if (q.includes('רגיש') || q.includes('allerg')) {
      return `🚫 לתשומת ליבך — הרגישויות שלך: ${allergies}\n\nאני אעביר את המידע למלצר. מומלץ להתייעץ איתו לגבי מנות ספציפיות.`;
    }
    // Popular/recommended
    if (q.includes('מומלץ') || q.includes('פופולרי') || q.includes('המלצ')) {
      const featured = items.filter(m => m.is_active).slice(0, 3);
      if (featured.length > 0) return `⭐ המנות המומלצות שלנו:\n${featured.map(m => `• ${m.name} — ₪${m.price||''}\n  ${m.description||''}`).join('\n\n')}`;
      return `⭐ אשמח להמליץ! המלצת השף משתנה לפי עונה. שאל את המלצר על המנה היומית.`;
    }
    // Default
    return `🍷 שאלה מצוינת! בוא נשאל את המלצר — הוא מכיר את התפריט לעומק. אני כאן להמלצות יין והתאמה לרגישויות. יש עוד שאלה?`;
  },

  // ─── Feedback Modal ─────────────────────────────────────────────
  showFeedbackModal() {
    const modal = document.getElementById('customer-modals');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" id="feedback-modal">
        <div class="card w-full max-w-sm animate-spring-bounce" style="background:var(--card)">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-playfair text-lg" style="color:var(--accent)">⭐ איך היה?</h2>
            <button id="close-feedback" class="text-2xl" style="color:var(--text-muted)">✕</button>
          </div>
          <form id="feedback-form" class="space-y-4">
            <div class="text-center">
              <div class="star-rating mb-3" id="star-rating">
                ${[1,2,3,4,5].map(n => `<span class="star" data-rating="${n}">⭐</span>`).join('')}
              </div>
              <input type="hidden" id="fb-rating" value="0">
              <p id="rating-label" class="text-sm" style="color:var(--text-muted)">בחר דירוג</p>
            </div>
            <div>
              <label class="text-sm mb-1 block" style="color:var(--text)">הערות (אופציונלי)</label>
              <textarea id="fb-comment" class="input-field" rows="3" placeholder="ספר/י לנו על החוויה..." style="min-height:auto"></textarea>
            </div>
            <button type="submit" class="btn-primary w-full">שלח משוב</button>
          </form>
        </div>
      </div>`;

    let selectedRating = 0;
    const labels = ['', '😞 לא טוב', '😕 גרוע', '😐 בסדר', '😊 טוב', '🤩 מעולה!'];

    document.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.rating);
        document.getElementById('fb-rating').value = selectedRating;
        document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < selectedRating));
        document.getElementById('rating-label').textContent = labels[selectedRating];
        Utils.vibrate(30);
      });
    });

    document.getElementById('close-feedback').addEventListener('click', () => modal.innerHTML = '');
    document.getElementById('feedback-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const rating = parseInt(document.getElementById('fb-rating').value);
      if (rating === 0) { Utils.toast('בחר דירוג'); return; }
      const comment = document.getElementById('fb-comment').value.trim();
      try {
        const result = await sbSaveFeedback({
          restaurant_id: this.state.restaurant.id,
          guest_device_id: this.state.deviceId,
          table_number: this.state.table.table_number,
          rating, comment,
        });
        Utils.toast(result.is_negative ? 'תודה. המנהל יקבל את המשוב מיד.' : 'תודה רבה! 🙏');
        Utils.vibrate(50);
        modal.innerHTML = '';
      } catch(e) { Utils.toast('שגיאה בשליחת משוב'); }
    });
  },

  // ─── Bill Split Modal ───────────────────────────────────────────
  async showBillSplitModal() {
    const modal = document.getElementById('customer-modals');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" id="billsplit-modal">
        <div class="card w-full max-w-md animate-spring-bounce" style="background:var(--card);max-height:85vh;overflow-y:auto">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-playfair text-lg" style="color:var(--accent)">💸 חלוקת חשבון</h2>
            <button id="close-billsplit" class="text-2xl" style="color:var(--text-muted)">✕</button>
          </div>
          <div id="billsplit-content">${Utils.spinner()}</div>
        </div>
      </div>`;

    document.getElementById('close-billsplit').addEventListener('click', () => modal.innerHTML = '');

    try {
      const orders = await sbGetGuestOrders(this.state.restaurant.id, this.state.table.id);
      this.state.guestOrders = orders || [];
      const content = document.getElementById('billsplit-content');
      if (!orders || orders.length === 0) {
        content.innerHTML = `<p class="text-center py-6" style="color:var(--text-muted)">אין הזמנות פתוחות לשולחן זה כרגע.</p>`;
        return;
      }
      content.innerHTML = `
        <div class="space-y-3">
          ${orders.map(order => {
            const items = JSON.parse(order.items_json || '[]');
            return `
              <div class="guest-order-card card animate-fade-in" style="background:var(--card)">
                <div class="flex items-center justify-between mb-2">
                  <div class="font-medium" style="color:var(--accent)">👤 ${Utils.escape(order.guest_name||'אורח')}</div>
                  <div class="font-bold" style="color:var(--text)">₪${order.total_amount||0}</div>
                </div>
                ${items.map((item, i) => `
                  <div class="flex items-center justify-between text-sm py-1" style="color:var(--text-muted)">
                    <span>${Utils.escape(item.name||'פריט')} ×${item.qty||1}</span>
                    <span>₪${(item.price||0)*(item.qty||1)}</span>
                  </div>`).join('')}
                <button class="btn-secondary w-full mt-2 text-xs" data-pay-order="${order.id}">שלם ₪${order.total_amount||0}</button>
              </div>`;
          }).join('')}
        </div>`;
      document.querySelectorAll('[data-pay-order]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try { await sbPayGuestOrder(btn.dataset.payOrder); Utils.toast('✅ שולם'); Utils.vibrate(50); this.showBillSplitModal(); }
          catch(e) { Utils.toast('שגיאה'); }
        });
      });
    } catch(e) { document.getElementById('billsplit-content').innerHTML = `<p style="color:var(--text-muted)">שגיאה בטעינת הזמנות</p>`; }
  },

  // ─── Realtime ───────────────────────────────────────────────────
  setupRealtime() {
    const sub = sbSubscribeTasks(this.state.restaurant.id, () => this.refreshActiveTasks());
    this.state.subscriptions.push(sub);
    this.refreshActiveTasks();
  },

  async refreshActiveTasks() {
    try {
      const tasks = await sbSelect('tasks', { restaurant_id: this.state.restaurant.id, table_id: this.state.table.id });
      this.state.activeTasks = (tasks || []).filter(t => t.status === 'open' || t.status === 'in_progress');
      const el = document.getElementById('active-tasks');
      if (el) el.innerHTML = this.renderActiveTasks();
    } catch(e) {}
  },
};
