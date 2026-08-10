// SmartTable — Main App Router
const App = {
  init() {
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
    Utils.initNetworkBanner();
  },

  handleRoute() {
    const hash = window.location.hash.slice(1);
    const [route, param] = hash.split('/');
    
    const app = document.getElementById('app');
    
    // Cleanup previous screen subscriptions
    this.cleanupPrevious();
    
    switch(route) {
      case '':
      case 'home':
        this.renderHome();
        break;
      case 'c':
        // Customer: #c/TABLE_TOKEN
        if (param) CustomerScreen.init(param);
        else app.innerHTML = '<div class="min-h-screen flex items-center justify-center text-gray-500">קוד QR חסר</div>';
        break;
      case 'w':
        // Waiter: #w/RESTAURANT_ID
        if (param) WaiterScreen.init(param);
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
      case 'select':
        this.renderScreenSelector();
        break;
      default:
        this.renderHome();
    }
  },

  renderHome() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
        <div class="text-center max-w-md">
          <div class="text-6xl mb-4">🍽️</div>
          <h1 class="text-4xl font-playfair text-gold mb-3">SmartTable</h1>
          <p class="text-gray-400 mb-8">פלטפורמת ניהול מסעדות חכמה</p>
          <div class="space-y-3">
            <a href="#select" class="block btn-primary">בחר מסך</a>
            <a href="#sa" class="block text-gray-500 text-sm hover:text-gold transition-colors">👑 Super Admin</a>
          </div>
          <p class="text-gray-500 text-xs mt-8">v${CONFIG.app.version}</p>
        </div>
      </div>
    `;
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
    // Clean up any running timers
    if (WaiterScreen.state?.timer) { clearInterval(WaiterScreen.state.timer); WaiterScreen.state.timer = null; }
    if (ManagerScreen.state?.timer) { clearInterval(ManagerScreen.state.timer); ManagerScreen.state.timer = null; }
    if (SuperAdminScreen.state?.timer) { clearInterval(SuperAdminScreen.state.timer); SuperAdminScreen.state.timer = null; }
  },
};

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => App.init());
