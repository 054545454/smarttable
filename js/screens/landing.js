// SmartTable 2.0 — Landing Page with Inline Signup Modal & Device Pairing
const LandingScreen = {
  state: { signupOpen: false, pairingOpen: false, signupLoading: false, pairingLoading: false },

  init() {
    this.render();
    this.attachEvents();
    window.scrollTo(0, 0);
  },

  render() {
    document.getElementById('app').innerHTML = `
      <div class="landing-page">
        <!-- Nav -->
        <nav class="fixed top-0 inset-x-0 z-50 transition-all duration-300" id="landing-nav">
          <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-2 cursor-pointer" onclick="window.location.hash=''">
              <span class="text-2xl">🍽️</span>
              <span class="font-playfair text-xl font-semibold text-white">SmartTable</span>
            </div>
            <div class="hidden md:flex items-center gap-6">
              <a href="#features" class="text-sm text-gray-300 hover:text-white transition">${I18n.t('nav.features')}</a>
              <a href="#pricing" class="text-sm text-gray-300 hover:text-white transition">${I18n.t('nav.pricing')}</a>
              <a href="#demo" class="text-sm text-gray-300 hover:text-white transition">${I18n.t('nav.demo')}</a>
              <div class="flex items-center gap-1" id="lang-bar-desktop"></div>
              <button onclick="LandingScreen.openSignup()" class="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/30 transition-all">
                ${I18n.t('nav.start')}
              </button>
            </div>
            <button id="mobile-menu-btn" class="md:hidden text-white text-2xl">☰</button>
          </div>
          <div id="mobile-menu" class="hidden md:hidden bg-black/95 backdrop-blur-md px-6 py-4 space-y-3">
            <a href="#features" class="block text-gray-300 py-1">${I18n.t('nav.features')}</a>
            <a href="#pricing" class="block text-gray-300 py-1">${I18n.t('nav.pricing')}</a>
            <a href="#demo" class="block text-gray-300 py-1">${I18n.t('nav.demo')}</a>
            <div class="flex items-center gap-1 py-1" id="lang-bar-mobile"></div>
            <button onclick="LandingScreen.openSignup()" class="block py-2 text-amber-400 font-semibold">${I18n.t('nav.start')} →</button>
          </div>
        </nav>

        <!-- Hero -->
        <section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div class="absolute inset-0 opacity-20" style="background:url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h60v60H0z\" fill=\"none\" stroke=\"%23C9A84C\" stroke-width=\"0.5\"/%3E%3C/svg%3E')"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"></div>
          
          <div class="relative max-w-4xl mx-auto px-6 text-center pt-20 pb-12">
            <div class="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6 animate-fade-in-down">
              ${I18n.t('hero.badge')}
            </div>
            <h1 class="font-playfair text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              ${I18n.t('hero.title1')}<br><span class="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">${I18n.t('hero.title2')}</span>
            </h1>
            <p class="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              ${I18n.t('hero.subtitle')} 
              דוחות חכמים ועוד — הכל מקוד QR אחד. התחל בחינם.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <button onclick="LandingScreen.openSignup()" class="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold text-lg hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:scale-105 cursor-pointer">
                🚀 התחל בחינם
              </button>
              <a href="#demo" class="px-8 py-4 rounded-full border border-gray-600 text-white font-semibold text-lg hover:border-amber-500 hover:text-amber-400 transition-all">
                ${I18n.t('hero.demo')}
              </a>
            </div>
            <div class="mt-8 flex justify-center">
              <button onclick="LandingScreen.openPairing()" class="text-gray-400 text-sm hover:text-amber-400 transition underline underline-offset-4">
                🔗 חיבור מכשיר (קוד שיווך)
              </button>
            </div>
            <div class="mt-12 flex flex-wrap justify-center gap-6 text-gray-500 text-sm">
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> ללא כרטיס אשראי</div>
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> הגדרה ב-5 דקות</div>
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> 5 שפות נתמכות</div>
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> אפליקציית אנדרואיד</div>
            </div>
          </div>
          
          <div class="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 animate-bounce">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
          </div>
        </section>

        <!-- Stats Bar -->
        <section class="bg-gradient-to-r from-amber-500 to-yellow-600 py-6">
          <div class="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><div class="text-3xl font-bold text-white">5</div><div class="text-sm text-amber-100">מסכים מלאים</div></div>
            <div><div class="text-3xl font-bold text-white">3</div><div class="text-sm text-amber-100">תמות עיצוב</div></div>
            <div><div class="text-3xl font-bold text-white">5</div><div class="text-sm text-amber-100">שפות נתמכות</div></div>
            <div><div class="text-3xl font-bold text-white">24/7</div><div class="text-sm text-amber-100">זמינות מערכת</div></div>
          </div>
        </section>

        <!-- Features -->
        <section id="features" class="py-20 bg-gray-50">
          <div class="max-w-6xl mx-auto px-6">
            <div class="text-center mb-16">
              <h2 class="font-playfair text-4xl font-bold text-gray-900 mb-4">הכל במקום אחד</h2>
              <p class="text-gray-500 text-lg max-w-2xl mx-auto">כל מה שהמסעדה שלך צריכה כדי לספק חווית אורח מהשורה הראשונה</p>
            </div>
            <div class="grid md:grid-cols-3 gap-8">
              ${this.renderFeatureCards()}
            </div>
          </div>
        </section>

        <!-- Pricing -->
        <section id="pricing" class="py-20 bg-white">
          <div class="max-w-5xl mx-auto px-6">
            <div class="text-center mb-12">
              <h2 class="font-playfair text-4xl font-bold text-gray-900 mb-4">תמחור דינמי</h2>
              <p class="text-gray-500 text-lg">משלמים רק לפי מספר השולחנות. מתחילים בחינם.</p>
            </div>
            
            <div class="max-w-2xl mx-auto bg-gray-50 rounded-3xl p-8 md:p-10 border border-gray-200">
              <div class="text-center mb-8">
                <p class="text-gray-500 mb-2">בחר את מספר השולחנות במסעדה שלך</p>
                <div class="flex items-center justify-center gap-4">
                  <button id="tables-minus" class="w-10 h-10 rounded-full bg-gray-200 text-gray-700 text-xl font-bold hover:bg-gray-300 transition">−</button>
                  <input type="number" id="tables-count" value="5" min="1" max="100" class="w-20 text-center text-3xl font-bold text-gray-900 bg-transparent border-0 outline-none">
                  <button id="tables-plus" class="w-10 h-10 rounded-full bg-gray-200 text-gray-700 text-xl font-bold hover:bg-gray-300 transition">+</button>
                </div>
              </div>
              
              <div id="pricing-result" class="text-center">
                <div class="inline-block px-6 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-4" id="pricing-tier-badge">חינם</div>
                <div class="text-5xl font-bold text-gray-900 mb-2">
                  <span id="pricing-amount">$0</span><span class="text-lg text-gray-400 font-normal">/חודש</span>
                </div>
                <div class="text-gray-500 text-sm mb-6" id="pricing-description">עד 5 שולחנות · כל התכונות הכלולות</div>
              </div>
              
              <button onclick="LandingScreen.openSignup()" class="block w-full py-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold text-center hover:shadow-lg transition-all cursor-pointer">
                ${I18n.t('hero.cta')}
              </button>
              <p class="text-center text-gray-400 text-xs mt-4">ללא כרטיס אשראי · ביטול בכל עת</p>
            </div>

            <div class="mt-12 grid md:grid-cols-4 gap-4">
              ${this.renderPricingTiers()}
            </div>
          </div>
        </section>

        <!-- Demo -->
        <section id="demo" class="py-20 bg-gray-900">
          <div class="max-w-4xl mx-auto px-6 text-center">
            <h2 class="font-playfair text-4xl font-bold text-white mb-4">${I18n.t('demo.title')}</h2>
            <p class="text-gray-400 text-lg mb-10">${I18n.t('demo.subtitle')}</p>
            <div class="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <a href="#c/qr_lQxodXWUTtXhCI1GWT8r" class="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 transition-all border border-gray-700 hover:border-amber-500 group">
                <div class="text-4xl mb-3">📱</div>
                <h3 class="text-white font-semibold mb-1 group-hover:text-amber-400 transition">${I18n.t('demo.customer')}</h3>
                <p class="text-gray-500 text-sm">${I18n.t('demo.customer.desc')}</p>
              </a>
              <a href="#w/6a8ca8ec905c8710caadb408" class="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 transition-all border border-gray-700 hover:border-amber-500 group">
                <div class="text-4xl mb-3">🤵</div>
                <h3 class="text-white font-semibold mb-1 group-hover:text-amber-400 transition">${I18n.t('demo.waiter')}</h3>
                <p class="text-gray-500 text-sm">${I18n.t('demo.waiter.desc')}</p>
              </a>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <section id="cta" class="py-20 bg-gradient-to-br from-amber-500 to-yellow-600">
          <div class="max-w-3xl mx-auto px-6 text-center">
            <h2 class="font-playfair text-4xl font-bold text-white mb-4">${I18n.t('cta.title')}</h2>
            <p class="text-amber-100 text-lg mb-8">${I18n.t('cta.subtitle')}</p>
            <button onclick="LandingScreen.openSignup()" class="inline-block px-10 py-4 rounded-full bg-white text-amber-600 font-bold text-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
              ${I18n.t('cta.button')}
            </button>
            <p class="text-amber-100 text-sm mt-4">${I18n.t('cta.note')}</p>
          </div>
        </section>

        <!-- Footer -->
        <footer class="bg-black py-12">
          <div class="max-w-6xl mx-auto px-6">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
              <div class="flex items-center gap-2 cursor-pointer" onclick="window.location.hash=''">
                <span class="text-2xl">🍽️</span>
                <span class="font-playfair text-lg font-semibold text-white">SmartTable</span>
                <span class="text-gray-600 text-sm mr-2">v2.0</span>
              </div>
              <div class="flex gap-6 text-gray-500 text-sm">
                <a href="#features" class="hover:text-white transition">תכונות</a>
                <a href="#pricing" class="hover:text-white transition">תמחור</a>
                <a href="#demo" class="hover:text-white transition">דמו</a>
                <button onclick="LandingScreen.openSignup()" class="hover:text-white transition">הרשמה</button>
              </div>
            </div>
            <div class="text-center text-gray-600 text-xs mt-8">© 2026 SmartTable. כל הזכויות שמורות.</div>
          </div>
        </footer>
      </div>

      <!-- Signup Modal Container -->
      <div id="signup-modal" class="hidden"></div>
      <!-- Pairing Modal Container -->
      <div id="pairing-modal" class="hidden"></div>
    `;
  },

  // ─── INLINE SIGNUP MODAL ──────────────────────────────────
  openSignup() {
    this.state.signupOpen = true;
    this.renderSignupModal();
  },

  closeSignup() {
    this.state.signupOpen = false;
    document.getElementById('signup-modal').classList.add('hidden');
    document.getElementById('signup-modal').innerHTML = '';
  },

  renderSignupModal() {
    const tier = this.getTierForCount(5);
    document.getElementById('signup-modal').classList.remove('hidden');
    document.getElementById('signup-modal').innerHTML = `
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="signup-overlay">
        <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl" onclick="event.stopPropagation()">
          <div class="sticky top-0 bg-gradient-to-r from-amber-500 to-yellow-600 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🍽️</span>
              <div>
                <h2 class="text-xl font-bold text-white">${I18n.t('cta.button')}</h2>
                <p class="text-amber-100 text-xs">5 שולחנות ראשונים חינם · ללא כרטיס אשראי</p>
              </div>
            </div>
            <button onclick="LandingScreen.closeSignup()" class="text-white/80 hover:text-white text-2xl">✕</button>
          </div>
          
          <div class="p-6 space-y-4" id="signup-form-body">
            <!-- Google signup stub -->
            <button id="google-signup-btn" class="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              המשך עם Google
            </button>
            
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-gray-200"></div>
              <span class="text-gray-400 text-xs">או</span>
              <div class="flex-1 h-px bg-gray-200"></div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-gray-600 mb-1 block">שם מלא *</label>
                <input type="text" id="su-owner" class="input-field" placeholder="יוסי כהן">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">שם המסעדה *</label>
                <input type="text" id="su-name" class="input-field" placeholder="מסעדת אלדין">
              </div>
            </div>
            
            <div>
              <label class="text-sm text-gray-600 mb-1 block">אימייל *</label>
              <input type="email" id="su-email" class="input-field" placeholder="restaurant@example.com">
              <p class="text-gray-400 text-xs mt-1">ישמש כשם משתמש לכניסה</p>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm text-gray-600 mb-1 block">טלפון *</label>
                <input type="tel" id="su-phone" class="input-field" placeholder="050-1234567">
              </div>
              <div>
                <label class="text-sm text-gray-600 mb-1 block">מספר שולחנות</label>
                <div class="flex items-center gap-2">
                  <button id="su-tables-minus" class="w-10 h-10 rounded-full bg-gray-100 text-gray-700 text-lg font-bold hover:bg-gray-200 transition">−</button>
                  <input type="number" id="su-tables" value="5" min="1" max="100" class="w-16 text-center text-lg font-bold text-gray-900 bg-transparent border-0 outline-none">
                  <button id="su-tables-plus" class="w-10 h-10 rounded-full bg-gray-100 text-gray-700 text-lg font-bold hover:bg-gray-200 transition">+</button>
                  <span class="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold" id="su-tier-badge">${tier.name}</span>
                </div>
              </div>
            </div>
            
            <div>
              <label class="text-sm text-gray-600 mb-1 block">סיסמה *</label>
              <input type="password" id="su-password" class="input-field" placeholder="לפחות 8 תווים">
              <div class="mt-1 space-y-1 text-xs" id="su-pwd-checks">
                <div class="flex items-center gap-1 text-gray-400" data-check="length"><span>○</span> לפחות 8 תווים</div>
                <div class="flex items-center gap-1 text-gray-400" data-check="upper"><span>○</span> אות גדולה</div>
                <div class="flex items-center gap-1 text-gray-400" data-check="lower"><span>○</span> אות קטנה</div>
                <div class="flex items-center gap-1 text-gray-400" data-check="number"><span>○</span> מספר</div>
              </div>
            </div>
            
            <div class="flex items-start gap-2 pt-1">
              <input type="checkbox" id="su-terms" class="mt-1" checked>
              <label class="text-xs text-gray-500">אני מסכים לתנאי השימוש ולמדיניות הפרטיות של SmartTable</label>
            </div>
            
            <p id="su-error" class="text-red-500 text-sm text-center hidden"></p>
            
            <button id="su-submit" class="btn-primary w-full ${this.state.signupLoading ? 'opacity-50 pointer-events-none' : ''}">
              ${this.state.signupLoading ? I18n.t('signup.submitting') : I18n.t('signup.submit')}
            </button>
            
            <p class="text-center text-gray-400 text-xs">ביטול בכל עת · חודש ראשון חינם</p>
          </div>
        </div>
      </div>
    `;
    this.attachSignupEvents();
  },

  attachSignupEvents() {
    const overlay = document.getElementById('signup-overlay');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeSignup(); });

    // Table count
    const tablesInput = document.getElementById('su-tables');
    const updateTier = () => {
      const count = parseInt(tablesInput.value) || 1;
      const tier = this.getTierForCount(count);
      document.getElementById('su-tier-badge').textContent = tier.name;
      document.getElementById('su-tier-badge').className = `text-xs px-2 py-1 rounded-full ${tier.fee === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} font-semibold`;
    };
    document.getElementById('su-tables-minus')?.addEventListener('click', () => { tablesInput.value = Math.max(1, parseInt(tablesInput.value) - 1); updateTier(); });
    document.getElementById('su-tables-plus')?.addEventListener('click', () => { tablesInput.value = Math.min(100, parseInt(tablesInput.value) + 1); updateTier(); });

    // Password checks
    const pwdInput = document.getElementById('su-password');
    pwdInput?.addEventListener('input', () => {
      const val = pwdInput.value;
      const checks = { length: val.length >= 8, upper: /[A-Z]/.test(val), lower: /[a-z]/.test(val), number: /[0-9]/.test(val) };
      Object.entries(checks).forEach(([key, ok]) => {
        const el = document.querySelector(`#su-pwd-checks [data-check="${key}"]`);
        if (el) { el.querySelector('span').textContent = ok ? '✓' : '○'; el.classList.toggle('text-green-500', ok); el.classList.toggle('text-gray-400', !ok); }
      });
    });

    // Google signup stub
    document.getElementById('google-signup-btn')?.addEventListener('click', () => {
      Utils.toast('כניסה עם Google תהיה זמינה בקרוב');
    });

    // Submit
    document.getElementById('su-submit')?.addEventListener('click', () => this.handleSignup());
  },

  async handleSignup() {
    const name = document.getElementById('su-name')?.value.trim();
    const owner = document.getElementById('su-owner')?.value.trim();
    const email = document.getElementById('su-email')?.value.trim();
    const phone = document.getElementById('su-phone')?.value.trim();
    const password = document.getElementById('su-password')?.value;
    const terms = document.getElementById('su-terms')?.checked;
    const tableCount = parseInt(document.getElementById('su-tables')?.value) || 5;
    const errEl = document.getElementById('su-error');
    errEl?.classList.add('hidden');

    if (!name || !owner || !email || !phone || !password) {
      errEl.textContent = 'נא למלא את כל השדות'; errEl.classList.remove('hidden'); return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      errEl.textContent = 'הסיסמה לא עומדת בדרישות'; errEl.classList.remove('hidden'); return;
    }
    if (!terms) { errEl.textContent = 'נא לאשר את תנאי השימוש'; errEl.classList.remove('hidden'); return; }

    this.state.signupLoading = true;
    const btn = document.getElementById('su-submit');
    if (btn) { btn.textContent = 'יוצר חשבון...'; btn.classList.add('opacity-50', 'pointer-events-none'); }

    try {
      const res = await fetch(CONFIG.api.registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          data: { name, owner_name: owner, email, phone, password, max_tables: tableCount }
        })
      });
      const result = await res.json();

      if (result.error) throw new Error(result.error);

      // Auto-redirect to admin dashboard
      Utils.toast('🎉 חשבון נוצר! מעביר למערכת...', 2000);
      setTimeout(() => {
        window.location.hash = `a/${result.restaurant_id}`;
        this.closeSignup();
      }, 1500);
    } catch (err) {
      errEl.textContent = err.message || 'שגיאה ביצירת החשבון';
      errEl.classList.remove('hidden');
      this.state.signupLoading = false;
      if (btn) { btn.textContent = I18n.t('signup.submit'); btn.classList.remove('opacity-50', 'pointer-events-none'); }
    }
  },

  // ─── DEVICE PAIRING MODAL ────────────────────────────────
  openPairing() {
    this.state.pairingOpen = true;
    this.renderPairingModal();
  },

  closePairing() {
    this.state.pairingOpen = false;
    document.getElementById('pairing-modal').classList.add('hidden');
    document.getElementById('pairing-modal').innerHTML = '';
  },

  renderPairingModal() {
    document.getElementById('pairing-modal').classList.remove('hidden');
    document.getElementById('pairing-modal').innerHTML = `
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="pairing-overlay">
        <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl" onclick="event.stopPropagation()">
          <div class="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex items-center justify-between rounded-t-3xl">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🔗</span>
              <div>
                <h2 class="text-xl font-bold text-white">חיבור מכשיר</h2>
                <p class="text-gray-400 text-xs">הזן קוד שיווך מהמנהל</p>
              </div>
            </div>
            <button onclick="LandingScreen.closePairing()" class="text-gray-400 hover:text-white text-2xl">✕</button>
          </div>
          
          <div class="p-6 space-y-4" id="pairing-body">
            <div class="text-center py-4">
              <div class="text-5xl mb-3">📱</div>
              <p class="text-gray-500 text-sm mb-4">הזן את קוד השיווך בן 6 הספרות שקיבלת ממנהל המסעדה</p>
            </div>
            
            <div>
              <input type="text" id="pair-code" maxlength="6" inputmode="numeric" placeholder="000000" 
                class="w-full text-center text-3xl font-bold tracking-[0.5rem] py-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-amber-500 transition" autofocus>
            </div>
            
            <div id="pairing-result" class="hidden"></div>
            
            <button id="pair-submit" class="btn-primary w-full">
              🔗 שייך מכשיר
            </button>
            
            <p class="text-center text-gray-400 text-xs">הקוד תקף ל-10 דקות. בקש קוד חדש מהמנהל במידת הצורך.</p>
          </div>
        </div>
      </div>
    `;
    this.attachPairingEvents();
  },

  attachPairingEvents() {
    const overlay = document.getElementById('pairing-overlay');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closePairing(); });

    const codeInput = document.getElementById('pair-code');
    codeInput?.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6); });
    codeInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('pair-submit')?.click(); });

    document.getElementById('pair-submit')?.addEventListener('click', () => this.handlePairing());
  },

  async handlePairing() {
    const code = document.getElementById('pair-code')?.value.trim();
    const resultEl = document.getElementById('pairing-result');
    const btn = document.getElementById('pair-submit');
    
    if (!code || code.length !== 6) {
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = '<p class="text-red-500 text-sm text-center">נא להזין קוד בן 6 ספרות</p>';
      return;
    }

    btn.textContent = 'מאמת...';
    btn.classList.add('opacity-50', 'pointer-events-none');

    try {
      const res = await fetch(CONFIG.api.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', table: 'DeviceSession', filters: { pairing_code: code, device_id: 'pairing_pending' } })
      });
      const sessions = await res.json();
      if (sessions.error) throw new Error(sessions.error);
      if (!Array.isArray(sessions) || sessions.length === 0) throw new Error('קוד שיווך לא נמצא או שפג תוקפו');
      const session = sessions[0];
      if (session.pairing_expires_at && new Date(session.pairing_expires_at) < new Date()) throw new Error('קוד השיווך פג תוקף. בקש קוד חדש מהמנהל.');

      // Get restaurant name
      const restRes = await fetch(CONFIG.api.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', table: 'restaurants', filters: { id: session.restaurant_id }, options: { single: true } })
      });
      const restaurant = await restRes.json();
      const result = { restaurant_id: session.restaurant_id, restaurant_name: restaurant?.name || 'מסעדה', screen_type: session.screen_type || '' };

      // Show screen type selector
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <div class="bg-green-50 rounded-2xl p-4 text-center">
          <div class="text-3xl mb-2">✅</div>
          <p class="text-green-700 font-semibold mb-1">נמצא: ${result.restaurant_name}</p>
          <p class="text-gray-500 text-sm mb-4">בחר את סוג המסך למכשיר זה:</p>
          <div class="grid grid-cols-2 gap-3">
            <button id="pair-waiter" class="p-4 rounded-xl border-2 border-gray-200 hover:border-amber-500 transition">
              <div class="text-3xl mb-1">🤵</div>
              <div class="font-semibold text-gray-700">מלצר</div>
            </button>
            <button id="pair-manager" class="p-4 rounded-xl border-2 border-gray-200 hover:border-amber-500 transition">
              <div class="text-3xl mb-1">👨‍💼</div>
              <div class="font-semibold text-gray-700">מנהל</div>
            </button>
          </div>
        </div>
      `;

      const deviceId = KioskLock.getDeviceId();
      const restaurantId = result.restaurant_id;

      document.getElementById('pair-waiter')?.addEventListener('click', async () => {
        await this.completePairing(code, restaurantId, deviceId, 'waiter');
      });
      document.getElementById('pair-manager')?.addEventListener('click', async () => {
        await this.completePairing(code, restaurantId, deviceId, 'manager');
      });

      btn.classList.add('hidden');
    } catch (err) {
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `<p class="text-red-500 text-sm text-center">${err.message}</p>`;
      btn.textContent = '🔗 שייך מכשיר';
      btn.classList.remove('opacity-50', 'pointer-events-none');
    }
  },

  async completePairing(code, restaurantId, deviceId, screenType) {
    const resultEl = document.getElementById('pairing-result');
    resultEl.innerHTML = '<div class="text-center"><div class="spinner mx-auto" style="width:32px;height:32px"></div><p class="text-gray-500 text-sm mt-2">משייך מכשיר...</p></div>';

    try {
      // Check if device already exists
      const checkRes = await fetch(CONFIG.api.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', table: 'DeviceSession', filters: { restaurant_id: restaurantId, device_id: deviceId } })
      });
      const existing = await checkRes.json();

      if (Array.isArray(existing) && existing.length > 0) {
        // Update existing device session
        await fetch(CONFIG.api.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', table: 'DeviceSession', filters: { id: existing[0].id }, data: { screen_type: screenType, paired_at: new Date().toISOString(), is_locked: true, locked_at: new Date().toISOString(), device_name: navigator.userAgent.substring(0, 50) } })
        });
      } else {
        // Create new device session
        await fetch(CONFIG.api.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', table: 'DeviceSession', data: { restaurant_id: restaurantId, device_id: deviceId, screen_type: screenType, device_name: navigator.userAgent.substring(0, 50), paired_at: new Date().toISOString(), is_locked: true, locked_at: new Date().toISOString() } })
        });
      }

      // Delete the pairing pending session
      await fetch(CONFIG.api.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', table: 'DeviceSession', filters: { pairing_code: code, device_id: 'pairing_pending' } })
      });

      // Save kiosk state in localStorage
      localStorage.setItem('st_kiosk_device', JSON.stringify({
        restaurant_id: restaurantId,
        device_id: deviceId,
        screen_type: screenType,
        paired_at: Date.now()
      }));

      resultEl.innerHTML = `
        <div class="bg-green-50 rounded-2xl p-6 text-center">
          <div class="text-5xl mb-3">🎉</div>
          <p class="text-green-700 font-bold mb-2">המכשיר שויך בהצלחה!</p>
          <p class="text-gray-500 text-sm">המסך נעול ב-${I18n.t('features.kiosk.title')}</p>
        </div>
      `;

      setTimeout(() => {
        const routeMap = { waiter: 'w', manager: 'm' };
        window.location.hash = `${routeMap[screenType]}/${restaurantId}`;
        this.closePairing();
        // Initialize kiosk lock after navigation
        setTimeout(() => KioskLock.init(restaurantId, screenType), 500);
      }, 1500);
    } catch (err) {
      resultEl.innerHTML = `<p class="text-red-500 text-sm text-center">${err.message}</p>`;
    }
  },

  renderFeatureCards() {
    const features = [
      { icon: '📲', title: 'קוד QR חכם', desc: 'האורח סורק ומקבל מיד תפריט, כפתורי שירות ומתנת גרידה — בלי הורדת אפליקציה' },
      { icon: '🔔', title: 'משימות בזמן אמת', desc: 'בקשות אורחים מגיעות מיד ללוח המלצרים עם קידוד צבעים לדחיפות ומיזוג לפי שולחן' },
      { icon: '🎨', title: '3 תמות עיצוב', desc: 'לוקסורי, פרימיום או קלאסי — התאם את המראה לאופי המסעדה עם העלאת לוגו מותאם אישית' },
      { icon: '🎁', title: 'מתנות גרידה', desc: 'מתנה רנדומלית בכניסה הראשונה — אנימציית גרידה אמיתית עם קונפטי ורכישת לקוחות חוזרים' },
      { icon: '📊', title: 'דוחות חכמים', desc: 'זמני תגובה, פילוח לפי סוג/שולחן/שעה, אחוז השלמה ומפת חום של המסעדה' },
      { icon: '🌍', title: '5 שפות', desc: 'עברית, אנגלית, ערבית, רוסית וצרפתית — המערכת מתרגמת הכל אוטומטית לאורח ולצוות' },
      { icon: '🔒', title: 'מצב Kiosk', desc: 'נעילת טאבלטים למסך מלצר/מנהל עם קוד PIN — מתמיד גם אחרי אתחול המכשיר' },
      { icon: '📱', title: 'אפליקציית אנדרואיד', desc: 'הורד APK והתקן בכל מכשיר אנדרואיד — עובד כאפליקציה מקורית עם PWA' },
      { icon: '💳', title: 'תשלום אונליין', desc: `חשבון דיגיטלי, העברה בנקאית או תשלום אונליין — ישירות מ${I18n.t('demo.customer')}` },
    ];
    return features.map(f => `
      <div class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100">
        <div class="text-4xl mb-4">${f.icon}</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">${f.title}</h3>
        <p class="text-gray-500 text-sm leading-relaxed">${f.desc}</p>
      </div>
    `).join('');
  },

  renderPricingTiers() {
    const tiers = [
      { name: 'Standard', tables: 'עד 20', monthly: '$143', annual: '$99' },
      { name: 'Premium', tables: '20+', monthly: '$214', annual: '$189' },
    ];
    return tiers.map(t => `
      <div class="bg-white rounded-2xl p-6 text-center border border-gray-200 relative">
        <h3 class="font-semibold text-gray-900 mb-1">${t.name}</h3>
        <p class="text-gray-400 text-xs mb-3">${t.tables} שולחנות</p>
        <div class="text-2xl font-bold text-gray-900">${t.monthly}<span class="text-sm font-normal text-gray-400">/mo</span></div>
        <div class="text-sm text-green-600 font-semibold mt-1">או ${t.annual}/mo בחיוב שנתי</div>
      </div>
    `).join('') + `
      <div class="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl p-6 text-center text-white md:col-span-2">
        <p class="font-bold text-lg">🎁 חודש ראשון חינם — ללא כרטיס אשראי</p>
        <p class="text-amber-100 text-sm mt-1">30 יום ניסיון מלא בכל התכונות · ביטול בכל עת</p>
      </div>
    `;
  },

  attachEvents() {
    // Render language bars
    const langBarDesktop = document.getElementById('lang-bar-desktop');
    const langBarMobile = document.getElementById('lang-bar-mobile');
    if (langBarDesktop) langBarDesktop.innerHTML = I18n.getLangBar();
    if (langBarMobile) langBarMobile.innerHTML = I18n.getLangBar();

    // PWA Install Prompt
    this.setupInstallPrompt();

    const nav = document.getElementById('landing-nav');
    const handleScroll = () => {
      if (window.scrollY > 50) { nav.classList.add('bg-black/80', 'backdrop-blur-md', 'shadow-lg'); }
      else { nav.classList.remove('bg-black/80', 'backdrop-blur-md', 'shadow-lg'); }
    };
    window.addEventListener('scroll', handleScroll);

    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
      mobileMenu.querySelectorAll('a, button').forEach(a => a.addEventListener('click', () => mobileMenu.classList.add('hidden')));
    }

    // Smooth scroll for anchor links (but not for onclick buttons)
    document.querySelectorAll('a[href^="#features"], a[href^="#pricing"], a[href^="#demo"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#/') && !href.startsWith('#c/') && !href.startsWith('#w/') && !href.startsWith('#m/') && !href.startsWith('#a/') && !href.startsWith('#sa')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Pricing calculator
    const input = document.getElementById('tables-count');
    const minus = document.getElementById('tables-minus');
    const plus = document.getElementById('tables-plus');
    
    const updatePricing = () => {
      const count = parseInt(input.value) || 1;
      const tier = this.getTier(count);
      document.getElementById('pricing-tier-badge').textContent = tier.name;
      document.getElementById('pricing-amount').textContent = tier.price;
      document.getElementById('pricing-description').textContent = `${tier.range} · ${tier.features}`;
    };
    
    if (minus) minus.addEventListener('click', () => { input.value = Math.max(1, (parseInt(input.value) || 1) - 1); updatePricing(); });
    if (plus) plus.addEventListener('click', () => { input.value = Math.min(100, (parseInt(input.value) || 1) + 1); updatePricing(); });
    if (input) input.addEventListener('input', updatePricing);
    updatePricing();
  },

  getTier(count) {
    if (count <= 20) return { name: 'Standard', price: '$143', annual: '$99', range: `${count} שולחנות`, features: 'כל התכונות + דוחות מתקדמים' };
    return { name: 'Premium', price: '$214', annual: '$189', range: `${count}+ שולחנות`, features: `כל התכונות + ${I18n.t('features.kiosk.title')} + תמיכה` };
  },

  getTierForCount(count) {
    if (count <= 20) return { plan: 'tier_20', fee: 143, annualFee: 99, name: 'Standard' };
    return { plan: 'tier_20plus', fee: 214, annualFee: 189, name: 'Premium' };
  },

  // PWA Install Prompt
  deferredPrompt: null,
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.remove();
    });
  },

  showInstallBanner() {
    if (document.getElementById('pwa-install-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9998;background:linear-gradient(135deg,#C9A84C,#B8860B);color:white;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 -4px 20px rgba(0,0,0,0.3);animation:slideUp 0.3s ease';
    const isHe = I18n.current === 'he';
    banner.innerHTML = 
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:1.5rem">📱</span>' +
        '<span style="font-weight:600;font-size:14px">' + (isHe ? 'התקן את SmartTable — גישה מהירה מהמסך הביתה' : 'Install SmartTable — quick access from home screen') + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button id="pwa-install-later" style="padding:6px 14px;border-radius:8px;background:rgba(255,255,255,0.2);color:white;border:0;font-weight:600;cursor:pointer;font-size:13px">' + (isHe ? 'אולי אחר כך' : 'Later') + '</button>' +
        '<button id="pwa-install-now" style="padding:6px 14px;border-radius:8px;background:white;color:#B8860B;border:0;font-weight:700;cursor:pointer;font-size:13px">' + (isHe ? 'התקן' : 'Install') + '</button>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('pwa-install-later')?.addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('st_pwa_dismissed', Date.now().toString());
    });
    document.getElementById('pwa-install-now')?.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          Utils.toast(isHe ? '🎉 SmartTable הותקן!' : '🎉 SmartTable installed!');
        }
        this.deferredPrompt = null;
        banner.remove();
      }
    });
  },
};
