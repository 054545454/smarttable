// SmartTable 2.0 — Landing Page
const LandingScreen = {
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
            <div class="flex items-center gap-2">
              <span class="text-2xl">🍽️</span>
              <span class="font-playfair text-xl font-semibold text-white">SmartTable</span>
            </div>
            <div class="hidden md:flex items-center gap-6">
              <a href="#features" class="text-sm text-gray-300 hover:text-white transition">תכונות</a>
              <a href="#pricing" class="text-sm text-gray-300 hover:text-white transition">תמחור</a>
              <a href="#demo" class="text-sm text-gray-300 hover:text-white transition">דמו חי</a>
              <a href="#register" class="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/30 transition-all">
                התחל עכשיו
              </a>
            </div>
            <button id="mobile-menu-btn" class="md:hidden text-white text-2xl">☰</button>
          </div>
          <div id="mobile-menu" class="hidden md:hidden bg-black/95 backdrop-blur-md px-6 py-4 space-y-3">
            <a href="#features" class="block text-gray-300 py-1">תכונות</a>
            <a href="#pricing" class="block text-gray-300 py-1">תמחור</a>
            <a href="#demo" class="block text-gray-300 py-1">דמו חי</a>
            <a href="#register" class="block py-2 text-amber-400 font-semibold">התחל עכשיו →</a>
          </div>
        </nav>

        <!-- Hero -->
        <section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div class="absolute inset-0 opacity-20" style="background:url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h60v60H0z\" fill=\"none\" stroke=\"%23C9A84C\" stroke-width=\"0.5\"/%3E%3C/svg%3E')"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"></div>
          
          <div class="relative max-w-4xl mx-auto px-6 text-center pt-20 pb-12">
            <div class="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6 animate-fade-in-down">
              ⚡ חדש — גרסה 2.0 עם אפליקציית אנדרואיד
            </div>
            <h1 class="font-playfair text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              המערכת החכמה<br><span class="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">לניהול מסעדות</span>
            </h1>
            <p class="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              תקשורת בזמן אמת בין אורחים לצוות, תפריט דיגיטלי, מתנות גרידה, 
              דוחות חכמים ועוד — הכל מקוד QR אחד. התחל בחינם.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#register" class="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold text-lg hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:scale-105">
                🚀 התחל בחינם
              </a>
              <a href="#demo" class="px-8 py-4 rounded-full border border-gray-600 text-white font-semibold text-lg hover:border-amber-500 hover:text-amber-400 transition-all">
                ▶ נסה דמו חי
              </a>
            </div>
            <div class="mt-12 flex flex-wrap justify-center gap-6 text-gray-500 text-sm">
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> ללא כרטיס אשראי</div>
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> הגדרה ב-5 דקות</div>
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> 5 שפות נתמכות</div>
              <div class="flex items-center gap-2"><span class="text-green-400">✓</span> אפליקציית אנדרואיד</div>
            </div>
          </div>
          
          <!-- Scroll indicator -->
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
            
            <!-- Calculator -->
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
              
              <a href="#register" class="block w-full py-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold text-center hover:shadow-lg transition-all">
                התחל עכשיו
              </a>
              <p class="text-center text-gray-400 text-xs mt-4">ללא כרטיס אשראי · ביטול בכל עת</p>
            </div>

            <!-- Tier comparison -->
            <div class="mt-12 grid md:grid-cols-4 gap-4">
              ${this.renderPricingTiers()}
            </div>
          </div>
        </section>

        <!-- Demo -->
        <section id="demo" class="py-20 bg-gray-900">
          <div class="max-w-4xl mx-auto px-6 text-center">
            <h2 class="font-playfair text-4xl font-bold text-white mb-4">נסה דמו חי</h2>
            <p class="text-gray-400 text-lg mb-10">ראה איך המערכת עובדת בזמן אמת — בלי הרשמה</p>
            <div class="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <a href="#c/qr_lQxodXWUTtXhCI1GWT8r" class="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 transition-all border border-gray-700 hover:border-amber-500 group">
                <div class="text-4xl mb-3">📱</div>
                <h3 class="text-white font-semibold mb-1 group-hover:text-amber-400 transition">מסך הלקוח</h3>
                <p class="text-gray-500 text-sm">סרוק כאורח וראה את התפריט, כפתורי השירות ומתנת הגרידה</p>
              </a>
              <a href="#w/6a8ca8ec905c8710caadb408" class="bg-gray-800 hover:bg-gray-700 rounded-2xl p-6 transition-all border border-gray-700 hover:border-amber-500 group">
                <div class="text-4xl mb-3">🤵</div>
                <h3 class="text-white font-semibold mb-1 group-hover:text-amber-400 transition">מסך המלצר</h3>
                <p class="text-gray-500 text-sm">ראה את לוח המשימות עם קידוד הצבעים והאסקלציה</p>
              </a>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <section id="cta" class="py-20 bg-gradient-to-br from-amber-500 to-yellow-600">
          <div class="max-w-3xl mx-auto px-6 text-center">
            <h2 class="font-playfair text-4xl font-bold text-white mb-4">מוכן להתחיל?</h2>
            <p class="text-amber-100 text-lg mb-8">הצטרף למסעדות שכבר עובדות חכם יותר עם SmartTable</p>
            <a href="#register" id="register-cta" class="inline-block px-10 py-4 rounded-full bg-white text-amber-600 font-bold text-lg hover:shadow-2xl transition-all hover:scale-105">
              צור חשבון חינם →
            </a>
            <div class="mt-8 flex flex-wrap justify-center gap-6 text-amber-100 text-sm">
              <div class="flex items-center gap-2"><span>✓</span> הגדרה ב-5 דקות</div>
              <div class="flex items-center gap-2"><span>✓</span> ניסיון חינם 90 יום</div>
              <div class="flex items-center gap-2"><span>✓</span> ביטול בכל עת</div>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="bg-black py-12">
          <div class="max-w-6xl mx-auto px-6">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🍽️</span>
                <span class="font-playfair text-lg font-semibold text-white">SmartTable</span>
                <span class="text-gray-600 text-sm mr-2">v2.0</span>
              </div>
              <div class="flex gap-6 text-gray-500 text-sm">
                <a href="#features" class="hover:text-white transition">תכונות</a>
                <a href="#pricing" class="hover:text-white transition">תמחור</a>
                <a href="#demo" class="hover:text-white transition">דמו</a>
                <a href="#register" class="hover:text-white transition">הרשמה</a>
              </div>
            </div>
            <div class="text-center text-gray-600 text-xs mt-8">© 2026 SmartTable. כל הזכויות שמורות.</div>
          </div>
        </footer>
      </div>
    `;
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
      { icon: '💳', title: 'תשלום אונליין', desc: 'חשבון דיגיטלי, העברה בנקאית או תשלום אונליין — ישירות ממסך הלקוח' },
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
      { name: 'Free', tables: '1-5', price: '$0', color: 'gray' },
      { name: 'Starter', tables: '6-15', price: '$99', color: 'amber' },
      { name: 'Professional', tables: '16-30', price: '$143', color: 'amber' },
      { name: 'Unlimited', tables: '31+', price: '$199', color: 'amber' },
    ];
    return tiers.map(t => `
      <div class="bg-white rounded-2xl p-6 text-center border ${t.price === '$143' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200'} relative">
        ${t.price === '$143' ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-xs font-semibold">פופולרי</div>' : ''}
        <h3 class="font-semibold text-gray-900 mb-1">${t.name}</h3>
        <p class="text-gray-400 text-xs mb-3">${t.tables} שולחנות</p>
        <div class="text-2xl font-bold text-gray-900">${t.price}<span class="text-sm font-normal text-gray-400">/mo</span></div>
      </div>
    `).join('');
  },

  attachEvents() {
    // Nav scroll effect
    const nav = document.getElementById('landing-nav');
    const handleScroll = () => {
      if (window.scrollY > 50) {
        nav.classList.add('bg-black/80', 'backdrop-blur-md', 'shadow-lg');
      } else {
        nav.classList.remove('bg-black/80', 'backdrop-blur-md', 'shadow-lg');
      }
    };
    window.addEventListener('scroll', handleScroll);

    // Mobile menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
      mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.add('hidden')));
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#features"], a[href^="#pricing"], a[href^="#demo"]').forEach(a => {
      a.addEventListener('click', (e) => {
        // Only prevent default for same-page section anchors
        const href = a.getAttribute('href');
        if (href && !href.startsWith('#/')) {
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
    if (count <= 5) return { name: 'חינם', price: '$0', range: `עד ${count} שולחנות`, features: 'כל התכונות הכלולות' };
    if (count <= 15) return { name: 'Starter', price: '$99', range: `${count} שולחנות`, features: 'כל התכונות + דוחות מתקדמים' };
    if (count <= 30) return { name: 'Professional', price: '$143', range: `${count} שולחנות`, features: 'כל התכונות + Kiosk Mode + תמיכה' };
    return { name: 'Unlimited', price: '$199', range: `${count}+ שולחנות`, features: 'כל התכונות + תמיכה VIP' };
  },

  getTierForCount(count) {
    if (count <= 5) return { plan: 'free', fee: 0, name: 'Free' };
    if (count <= 15) return { plan: 'tier_15', fee: 99, name: 'Starter' };
    if (count <= 30) return { plan: 'tier_30', fee: 143, name: 'Professional' };
    return { plan: 'tier_unlimited', fee: 199, name: 'Unlimited' };
  },
};
