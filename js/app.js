// SmartTable 2.0 — Main App Router
const App = {
  init() {
    // Check for kiosk auto-restore before routing
    this.checkKioskRestore();
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
    Utils.initNetworkBanner();

    // PWA Install Prompt (global)
    this.deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });
  },

  // ─── Kiosk Auto-Restore ──────────────────────────────────
  checkKioskRestore() {
    const stored = localStorage.getItem('st_kiosk_device');
    if (stored) {
      try {
        const kiosk = JSON.parse(stored);
        const currentHash = window.location.hash.slice(1);
        // If no specific route, auto-restore kiosk
        if (!currentHash || currentHash === '') {
          const routeMap = { waiter: 'w', manager: 'm' };
          const route = routeMap[kiosk.screen_type];
          if (route && kiosk.restaurant_id) {
            window.location.hash = `${route}/${kiosk.restaurant_id}`;
            // Initialize kiosk lock after a short delay
            setTimeout(() => KioskLock.init(kiosk.restaurant_id, kiosk.screen_type), 500);
          }
        }
      } catch (e) {}
    }
  },

  handleRoute() {
    const hash = window.location.hash.slice(1);
    const [route, param] = hash.split('/');
    document.title = "DEBUG: hash=" + hash + " route=" + route + " param=" + param;
    
    const app = document.getElementById('app');
    
    // Cleanup previous screen subscriptions
    this.cleanupPrevious();
    
    switch(route) {
      case '':
        LandingScreen.init(); document.title = "DEBUG: LANDING INIT CALLED";
        break;
      case 'register':
        // Legacy: redirect to landing with modal
        LandingScreen.init();
        setTimeout(() => LandingScreen.openSignup(), 300);
        break;
      case 'c':
        // Customer: #c/TABLE_TOKEN
        if (param) CustomerScreen.init(param);
        else app.innerHTML = '<div class="min-h-screen flex items-center justify-center text-gray-500">קוד QR חסר</div>';
        break;
      case 'w':
        // Waiter: #w/RESTAURANT_ID
        if (param) WaiterScreen.init(param); document.title = "DEBUG: WAITER INIT CALLED";
        else this.renderScreenSelector('waiter');
        break;
      case 'm':
        // Manager: #m/RESTAURANT_ID
        if (param) ManagerScreen.init(param);
        else this.renderScreenSelector('manager');
        break;
      case 'a':
        // Admin: #a/RESTAURANT_ID
        if (param) AdminScreen.init(param);
        else this.renderScreenSelector('admin');
        break;
      case 'sa':
        // Super Admin: #sa (completely separate entry point)
        SuperAdminScreen.init();
        break;
      case 'pair':
        // Device pairing: #pair/CODE
        if (param) this.handlePairing(param);
        else this.handlePairingEntry();
        break;
      case 'select':
        this.renderScreenSelector();
        break;
      default:
        LandingScreen.init();
    }
  },

  // ─── Device Pairing via URL ──────────────────────────────
  async handlePairing(code) {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-6">
        <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div class="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
            <h2 class="text-xl font-bold text-white">🔗 חיבור מכשיר</h2>
            <p class="text-gray-400 text-sm">קוד: <span class="font-mono text-amber-400">${code}</span></p>
          </div>
          <div class="p-6">
            <div class="text-center">
              <div class="spinner mx-auto mb-4" style="width:40px;height:40px"></div>
              <p class="text-gray-500">מאמת קוד שיווך...</p>
            </div>
          </div>
        </div>
      </div>
    `;

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
      if (session.pairing_expires_at && new Date(session.pairing_expires_at) < new Date()) throw new Error('קוד השיווך פג תוקף');

      const restRes = await fetch(CONFIG.api.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', table: 'restaurants', filters: { id: session.restaurant_id }, options: { single: true } })
      });
      const restaurant = await restRes.json();
      const result = { restaurant_id: session.restaurant_id, restaurant_name: restaurant?.name || 'מסעדה' };

      // Show screen type selector
      document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-6">
          <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div class="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h2 class="text-xl font-bold text-white">✅ ${result.restaurant_name}</h2>
              <p class="text-green-100 text-sm">בחר את סוג המסך</p>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 gap-4">
                <button id="pair-waiter" class="p-8 rounded-2xl border-2 border-gray-200 hover:border-amber-500 transition cursor-pointer">
                  <div class="text-5xl mb-2">🤵</div>
                  <div class="font-bold text-gray-700">מלצר</div>
                </button>
                <button id="pair-manager" class="p-8 rounded-2xl border-2 border-gray-200 hover:border-amber-500 transition cursor-pointer">
                  <div class="text-5xl mb-2">👨‍💼</div>
                  <div class="font-bold text-gray-700">מנהל</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const deviceId = KioskLock.getDeviceId();
      const restaurantId = result.restaurant_id;

      const completePair = async (screenType) => {
        try {
          // Check if device already exists
          const checkRes = await fetch(CONFIG.api.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'select', table: 'DeviceSession', filters: { restaurant_id: restaurantId, device_id: deviceId } })
          });
          const existing = await checkRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            await fetch(CONFIG.api.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'update', table: 'DeviceSession', filters: { id: existing[0].id }, data: { screen_type: screenType, paired_at: new Date().toISOString(), is_locked: true, locked_at: new Date().toISOString(), device_name: navigator.userAgent.substring(0, 50) } })
            });
          } else {
            await fetch(CONFIG.api.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'insert', table: 'DeviceSession', data: { restaurant_id: restaurantId, device_id: deviceId, screen_type: screenType, device_name: navigator.userAgent.substring(0, 50), paired_at: new Date().toISOString(), is_locked: true, locked_at: new Date().toISOString() } })
            });
          }
          // Delete pairing pending session
          await fetch(CONFIG.api.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', table: 'DeviceSession', filters: { pairing_code: code, device_id: 'pairing_pending' } })
          });

          localStorage.setItem('st_kiosk_device', JSON.stringify({
            restaurant_id: restaurantId, device_id: deviceId, screen_type: screenType, paired_at: Date.now()
          }));

          Utils.toast('🎉 מכשיר שויך! נעילת Kiosk מופעלת...');
          const routeMap = { waiter: 'w', manager: 'm' };
          setTimeout(() => {
            window.location.hash = `${routeMap[screenType]}/${restaurantId}`;
            setTimeout(() => KioskLock.init(restaurantId, screenType), 500);
          }, 1500);
        } catch (e) {
          Utils.toast('שגיאה בשיווך המכשיר');
        }
      };

      document.getElementById('pair-waiter')?.addEventListener('click', () => completePair('waiter'));
      document.getElementById('pair-manager')?.addEventListener('click', () => completePair('manager'));

    } catch (err) {
      document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-6">
          <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div class="text-5xl mb-4">❌</div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">שגיאה</h2>
            <p class="text-gray-500 mb-6">${err.message}</p>
            <button onclick="window.location.hash=''" class="btn-primary">חזור לדף הבית</button>
          </div>
        </div>
      `;
    }
  },

  handlePairingEntry() {
    LandingScreen.init();
    setTimeout(() => LandingScreen.openPairing(), 300);
  },

  renderScreenSelector(defaultType) {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div class="w-full max-w-md">
          <h2 class="text-xl font-semibold text-gray-800 text-center mb-6">בחר מסך</h2>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600 mb-1 block">סוג מסך</label>
              <select id="screen-type" class="input-field">
                <option value="admin" ${defaultType === 'admin' ? 'selected' : ''}>🏢 מנהל / בעלים</option>
                <option value="manager" ${defaultType === 'manager' ? 'selected' : ''}>👨‍💼 מנהל משמרת</option>
                <option value="waiter" ${defaultType === 'waiter' ? 'selected' : ''}>🤵 מלצר</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-gray-600 mb-1 block">מזהה מסעדה</label>
              <input type="text" id="restaurant-id-input" class="input-field" placeholder="UUID של המסעדה">
            </div>
            <button id="go-to-screen" class="btn-primary w-full">המשך</button>
          </div>
          <a href="#" class="block text-center text-sm text-gray-400 mt-4">← חזור</a>
        </div>
      </div>
    `;
    
    document.getElementById('go-to-screen').addEventListener('click', () => {
      const type = document.getElementById('screen-type').value;
      const rid = document.getElementById('restaurant-id-input').value.trim();
      if (!rid) { Utils.toast('הזן מזהה מסעדה'); return; }
      
      const routeMap = { admin: 'a', manager: 'm', waiter: 'w' };
      window.location.hash = `${routeMap[type]}/${rid}`;
    });
  },

  cleanupPrevious() {
    if (WaiterScreen.state?.timer) { clearInterval(WaiterScreen.state.timer); WaiterScreen.state.timer = null; }
    if (ManagerScreen.state?.timer) { clearInterval(ManagerScreen.state.timer); ManagerScreen.state.timer = null; }
    if (SuperAdminScreen.state?.timer) { clearInterval(SuperAdminScreen.state.timer); SuperAdminScreen.state.timer = null; }
    if (CustomerScreen.state?.subscriptions) { CustomerScreen.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} }); }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
