// SmartTable — Auth & Session Management
const Auth = {
  current: null,
  restaurant: null,
  shift: null,
  
  setSession(key, data) {
    sessionStorage.setItem(`smarttable_${key}`, JSON.stringify(data));
  },
  getSession(key) {
    const data = sessionStorage.getItem(`smarttable_${key}`);
    return data ? JSON.parse(data) : null;
  },
  clearSession(key) {
    sessionStorage.removeItem(`smarttable_${key}`);
  },
  clearAll() {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('smarttable_'))
      .forEach(k => sessionStorage.removeItem(k));
    this.current = null;
    this.restaurant = null;
    this.shift = null;
  },
  
  async loginWaiter(name, restaurantId, shiftId) {
    const waiter = { name, restaurantId, shiftId, role: 'waiter', loginAt: new Date().toISOString() };
    this.setSession('waiter', waiter);
    this.current = waiter;
    return waiter;
  },
  
  async loginManager(pin, restaurantId) {
    try {
      const manager = await sbAuth('manager', { pin, restaurantId });
      const session = { ...manager, role: 'manager' };
      this.setSession('manager', session);
      this.current = session;
      return session;
    } catch (e) {
      throw new Error(t('wrongPin'));
    }
  },
  
  async loginAdmin(username, password, restaurantId) {
    try {
      const user = await sbAuth('admin', { username, password, restaurantId });
      const session = { ...user, role: 'admin' };
      this.setSession('admin', session);
      this.current = session;
      
      // Check if must change password
      if (user.must_change_password) {
        this.showChangePasswordScreen(session, true);
        throw new Error('MUST_CHANGE_PASSWORD');
      }
      
      return session;
    } catch (e) {
      if (e.message === 'MUST_CHANGE_PASSWORD') throw e;
      throw new Error(e.message || 'שגיאת התחברות');
    }
  },
  
  async loginSuperAdmin(username, password) {
    try {
      const user = await sbAuth('super_admin', { username, password });
      const session = { ...user, role: 'super_admin' };
      this.setSession('superadmin', session);
      this.current = session;
      return session;
    } catch (e) {
      throw new Error(e.message || 'שגיאת התחברות');
    }
  },
  
  async changePassword(userId, newPassword, currentPassword) {
    try {
      const res = await apiCall({
        action: 'changePassword',
        data: {
          user_id: userId,
          new_password: newPassword,
          current_password: currentPassword,
        },
      });
      // Update session
      const sessionKey = this.current?.role === 'admin' ? 'admin' : 'superadmin';
      const session = this.getSession(sessionKey);
      if (session) {
        session.must_change_password = false;
        session.password_hash = newPassword;
        this.setSession(sessionKey, session);
        this.current = session;
      }
      return res;
    } catch (e) {
      throw new Error(e.error || e.message || 'שגיאה בשינוי סיסמה');
    }
  },
  
  showChangePasswordScreen(session, isFirstLogin = false) {
    const isAdmin = session.role === 'admin';
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div class="w-full max-w-md">
          <div class="text-center mb-6">
            <div class="text-5xl mb-3">${isAdmin ? '🏢' : '👑'}</div>
            <h1 class="text-2xl font-playfair text-gray-800">שינוי סיסמה</h1>
            <p class="text-gray-500 text-sm mt-2">${isFirstLogin ? 'זוהי הכניסה הראשונה שלך. עליך לשנות את הסיסמה הזמנית.' : 'אנא הזן סיסמה חדשה'}</p>
          </div>
          <form id="change-pwd-form" class="space-y-4">
            <div>
              <label class="text-sm text-gray-600 mb-1 block">סיסמה חדשה</label>
              <input type="password" id="new-pwd" class="input-field" required minlength="8" placeholder="לפחות 8 תווים">
              <p class="text-xs text-gray-400 mt-1">חובה: 8+ תווים, אות גדולה, אות קטנה ומספר</p>
            </div>
            <div>
              <label class="text-sm text-gray-600 mb-1 block">אימות סיסמה</label>
              <input type="password" id="new-pwd-confirm" class="input-field" required minlength="8">
            </div>
            <p id="pwd-error" class="text-red-500 text-sm text-center hidden"></p>
            <div id="pwd-strength" class="text-sm text-center"></div>
            <button type="submit" class="btn-primary w-full">אישור והמשך</button>
          </form>
        </div>
      </div>
    `;
    
    // Live password validation
    const newPwdInput = document.getElementById('new-pwd');
    const strengthEl = document.getElementById('pwd-strength');
    newPwdInput.addEventListener('input', () => {
      const pwd = newPwdInput.value;
      let strength = 0;
      let checks = [];
      if (pwd.length >= 8) { strength++; checks.push('✓ 8 תווים'); }
      if (/[A-Z]/.test(pwd)) { strength++; checks.push('✓ אות גדולה'); }
      if (/[a-z]/.test(pwd)) { strength++; checks.push('✓ אות קטנה'); }
      if (/[0-9]/.test(pwd)) { strength++; checks.push('✓ מספר'); }
      const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-green-600'];
      const labels = ['חלשה מאוד', 'חלשה', 'בינונית', 'חזקה', 'חזקה מאוד'];
      if (pwd.length === 0) { strengthEl.innerHTML = ''; return; }
      strengthEl.className = `text-sm text-center ${colors[Math.min(strength, 4)]}`;
      strengthEl.innerHTML = `${labels[Math.min(strength, 4)]} <span class="text-xs text-gray-400">(${checks.join(' · ')})</span>`;
    });
    
    document.getElementById('change-pwd-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPwd = document.getElementById('new-pwd').value;
      const confirmPwd = document.getElementById('new-pwd-confirm').value;
      const errEl = document.getElementById('pwd-error');
      
      if (newPwd !== confirmPwd) {
        errEl.textContent = 'הסיסמאות אינן תואמות';
        errEl.classList.remove('hidden');
        return;
      }
      
      try {
        await this.changePassword(session.id, newPwd);
        Utils.toast('הסיסמה שונתה בהצלחה!', 'success');
        // Reload the screen
        if (isAdmin) {
          AdminScreen.start();
        } else {
          SuperAdminScreen.start();
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  },
  
  async getRestaurantByTableToken(token) {
    const data = await sbGetByQr(token);
    return {
      table: data.table,
      restaurant: data.restaurant,
      settings: data.settings || {},
      gifts: data.gifts || [],
    };
  },
  
  isRestaurantActive(restaurant) {
    if (!restaurant) return false;
    if (restaurant.status === 'suspended') return false;
    if (restaurant.status === 'inactive') return false;
    if (restaurant.promo_active && restaurant.promo_expires_at) {
      if (new Date(restaurant.promo_expires_at) < new Date()) {
        return false;
      }
    }
    return true;
  },
};
