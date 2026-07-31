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
      return session;
    } catch (e) {
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