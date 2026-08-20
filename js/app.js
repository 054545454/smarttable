// SmartTable 2.0 — Main App Router
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
        LandingScreen.init();
        break;
      case 'register':
        RegisterScreen.init();
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
        LandingScreen.init();
    }
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
