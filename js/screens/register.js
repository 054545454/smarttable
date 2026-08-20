// SmartTable 2.0 — Self-Service Registration
const RegisterScreen = {
  state: { step: 1, tableCount: 5, loading: false },

  init() {
    this.render();
    this.attachEvents();
    window.scrollTo(0, 0);
  },

  render() {
    const tier = LandingScreen.getTierForCount(this.state.tableCount);
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-6">
        <div class="w-full max-w-lg">
          <!-- Back -->
          <a href="#/" class="text-gray-400 hover:text-white text-sm mb-6 inline-block">← חזור לדף הבית</a>
          
          <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <!-- Header -->
            <div class="bg-gradient-to-r from-amber-500 to-yellow-600 px-8 py-6 text-center">
              <div class="text-4xl mb-2">🍽️</div>
              <h1 class="text-2xl font-bold text-white">צור חשבון SmartTable</h1>
              <p class="text-amber-100 text-sm mt-1">הגדרה ב-5 דקות · ניסיון חינם 90 יום</p>
            </div>

            <div class="p-8">
              <!-- Step indicator -->
              <div class="flex items-center justify-center gap-2 mb-8">
                <div class="w-8 h-8 rounded-full ${this.state.step >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'} flex items-center justify-center text-sm font-bold transition">1</div>
                <div class="w-12 h-0.5 ${this.state.step >= 2 ? 'bg-amber-500' : 'bg-gray-200'} transition"></div>
                <div class="w-8 h-8 rounded-full ${this.state.step >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'} flex items-center justify-center text-sm font-bold transition">2</div>
                <div class="w-12 h-0.5 ${this.state.step >= 3 ? 'bg-amber-500' : 'bg-gray-200'} transition"></div>
                <div class="w-8 h-8 rounded-full ${this.state.step >= 3 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'} flex items-center justify-center text-sm font-bold transition">3</div>
              </div>

              ${this.state.step === 1 ? this.renderStep1(tier) : ''}
              ${this.state.step === 2 ? this.renderStep2() : ''}
              ${this.state.step === 3 ? this.renderStep3() : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderStep1(tier) {
    return `
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">פרטי המסעדה</h2>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">שם המסעדה *</label>
          <input type="text" id="reg-name" class="input-field" placeholder="מסעדת אלדין" required>
        </div>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">שם הבעלים *</label>
          <input type="text" id="reg-owner" class="input-field" placeholder="יוסי כהן" required>
        </div>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">טלפון *</label>
          <input type="tel" id="reg-phone" class="input-field" placeholder="050-1234567" required>
        </div>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">כתובת</label>
          <input type="text" id="reg-address" class="input-field" placeholder="תל אביב, רוטשילד 25">
        </div>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">מספר עוסק / ח.פ.</label>
          <input type="text" id="reg-business" class="input-field" placeholder="123456789">
        </div>

        <!-- Table count selector -->
        <div>
          <label class="text-sm text-gray-600 mb-2 block">מספר שולחנות במסעדה</label>
          <div class="flex items-center gap-3">
            <button id="reg-tables-minus" class="w-10 h-10 rounded-full bg-gray-100 text-gray-700 text-xl font-bold hover:bg-gray-200 transition">−</button>
            <input type="number" id="reg-tables" value="${this.state.tableCount}" min="1" max="100" class="w-16 text-center text-xl font-bold text-gray-900 bg-transparent border-0 outline-none">
            <button id="reg-tables-plus" class="w-10 h-10 rounded-full bg-gray-100 text-gray-700 text-xl font-bold hover:bg-gray-200 transition">+</button>
            <div class="flex-1 text-left">
              <span class="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">${tier.name}</span>
              <span class="text-gray-400 text-sm mr-2">${tier.fee === 0 ? 'חינם' : '$' + tier.fee + '/mo'}</span>
            </div>
          </div>
          <p class="text-gray-400 text-xs mt-2">5 שולחנות ראשונים חינם לנצח. שדרוג בכל עת.</p>
        </div>

        <button id="reg-next-1" class="btn-primary w-full mt-6">המשך →</button>
      </div>
    `;
  },

  renderStep2() {
    return `
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-900 mb-2">פרטי כניסה</h2>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">אימייל *</label>
          <input type="email" id="reg-email" class="input-field" placeholder="restaurant@example.com" required>
          <p class="text-gray-400 text-xs mt-1">ישמש כשם משתמש לכניסה</p>
        </div>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">סיסמה *</label>
          <input type="password" id="reg-password" class="input-field" placeholder="לפחות 8 תווים" required>
          <div class="mt-2 space-y-1 text-xs" id="pwd-checks">
            <div class="flex items-center gap-1 text-gray-400" data-check="length"><span>○</span> לפחות 8 תווים</div>
            <div class="flex items-center gap-1 text-gray-400" data-check="upper"><span>○</span> אות גדולה</div>
            <div class="flex items-center gap-1 text-gray-400" data-check="lower"><span>○</span> אות קטנה</div>
            <div class="flex items-center gap-1 text-gray-400" data-check="number"><span>○</span> מספר</div>
          </div>
        </div>
        
        <div>
          <label class="text-sm text-gray-600 mb-1 block">אימות סיסמה *</label>
          <input type="password" id="reg-password2" class="input-field" placeholder="הקלד שוב" required>
        </div>

        <div class="flex items-start gap-2 pt-2">
          <input type="checkbox" id="reg-terms" class="mt-1" required>
          <label class="text-xs text-gray-500">אני מסכים לתנאי השימוש ולמדיניות הפרטיות של SmartTable</label>
        </div>

        <div class="flex gap-3 mt-6">
          <button id="reg-back-2" class="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition">← חזור</button>
          <button id="reg-submit" class="btn-primary flex-1 ${this.state.loading ? 'opacity-50 pointer-events-none' : ''}">
            ${this.state.loading ? 'יוצר חשבון...' : 'צור חשבון →'}
          </button>
        </div>
      </div>
    `;
  },

  renderStep3() {
    return `
      <div class="text-center py-8">
        <div class="text-6xl mb-4">🎉</div>
        <h2 class="text-2xl font-bold text-gray-900 mb-3">ברוכים הבאים!</h2>
        <p class="text-gray-500 mb-6">חשבון SmartTable שלך נוצר בהצלחה.<br>שלחנו אימייל עם פרטי הכניסה וההגדרות.</p>
        
        <div class="bg-gray-50 rounded-2xl p-6 mb-6 text-right">
          <div class="text-sm text-gray-500 mb-1">קישור לכניסה:</div>
          <a id="reg-login-link" href="#" class="text-amber-600 font-semibold break-all">מעתיק קישור...</a>
        </div>
        
        <button id="reg-go-login" class="btn-primary w-full">כניסה למערכת →</button>
        <a href="#/" class="block text-gray-400 text-sm mt-4">חזור לדף הבית</a>
      </div>
    `;
  },

  attachEvents() {
    const root = document.getElementById('app');
    
    // Step 1: table count + next
    const tablesInput = () => document.getElementById('reg-tables');
    const updateTierDisplay = () => {
      const input = tablesInput();
      if (!input) return;
      const count = parseInt(input.value) || 1;
      this.state.tableCount = count;
      const tier = LandingScreen.getTierForCount(count);
      const badge = input.parentElement.querySelector('span.px-3');
      const fee = input.parentElement.querySelector('span.text-gray-400');
      if (badge) badge.textContent = tier.name;
      if (fee) fee.textContent = tier.fee === 0 ? 'חינם' : '$' + tier.fee + '/mo';
    };
    
    root.addEventListener('click', (e) => {
      if (e.target.id === 'reg-tables-minus') {
        const input = tablesInput();
        input.value = Math.max(1, (parseInt(input.value) || 1) - 1);
        updateTierDisplay();
      }
      if (e.target.id === 'reg-tables-plus') {
        const input = tablesInput();
        input.value = Math.min(100, (parseInt(input.value) || 1) + 1);
        updateTierDisplay();
      }
      if (e.target.id === 'reg-next-1') {
        const name = document.getElementById('reg-name')?.value.trim();
        const owner = document.getElementById('reg-owner')?.value.trim();
        const phone = document.getElementById('reg-phone')?.value.trim();
        if (!name || !owner || !phone) { Utils.toast('נא למלא את כל השדות החובה'); return; }
        this.state.step = 2;
        this.render();
        this.attachEvents();
      }
      if (e.target.id === 'reg-back-2') {
        this.state.step = 1;
        this.render();
        this.attachEvents();
      }
      if (e.target.id === 'reg-submit') {
        this.handleSubmit();
      }
      if (e.target.id === 'reg-go-login') {
        const link = document.getElementById('reg-login-link');
        if (link && link.dataset.url) window.location.hash = link.dataset.url;
      }
    });

    // Password checks
    const pwdInput = document.getElementById('reg-password');
    if (pwdInput) {
      pwdInput.addEventListener('input', () => {
        const val = pwdInput.value;
        const checks = {
          length: val.length >= 8,
          upper: /[A-Z]/.test(val),
          lower: /[a-z]/.test(val),
          number: /[0-9]/.test(val),
        };
        Object.entries(checks).forEach(([key, ok]) => {
          const el = document.querySelector(`[data-check="${key}"]`);
          if (el) {
            el.querySelector('span').textContent = ok ? '✓' : '○';
            el.classList.toggle('text-green-500', ok);
            el.classList.toggle('text-gray-400', !ok);
          }
        });
      });
    }
  },

  async handleSubmit() {
    const name = document.getElementById('reg-name')?.value.trim();
    const owner = document.getElementById('reg-owner')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const address = document.getElementById('reg-address')?.value.trim();
    const business = document.getElementById('reg-business')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const password2 = document.getElementById('reg-password2')?.value;
    const terms = document.getElementById('reg-terms')?.checked;
    const tableCount = this.state.tableCount;

    if (!email || !password) { Utils.toast('אימייל וסיסמה נדרשים'); return; }
    if (password !== password2) { Utils.toast('הסיסמאות אינן תואמות'); return; }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      Utils.toast('הסיסמה לא עומדת בדרישות'); return;
    }
    if (!terms) { Utils.toast('נא לאשר את תנאי השימוש'); return; }

    this.state.loading = true;
    this.render();
    this.attachEvents();

    try {
      const res = await fetch(CONFIG.api.registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          data: { name, owner_name: owner, email, phone, address, business_number: business, password, max_tables: tableCount }
        })
      });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error);
      
      // Store restaurant ID for login link
      this.state.restaurantId = result.restaurant_id;
      this.state.step = 3;
      this.render();
      this.attachEvents();
      
      // Set login link
      const link = document.getElementById('reg-login-link');
      if (link) {
        const url = `#/a/${result.restaurant_id}`;
        link.href = url;
        link.dataset.url = url;
        link.textContent = `https://violet-dunlin-978279.hostingersite.com${url}`;
      }
    } catch (err) {
      Utils.toast(err.message || 'שגיאה ביצירת החשבון');
      this.state.loading = false;
      this.state.step = 2;
      this.render();
      this.attachEvents();
    }
  },
};
