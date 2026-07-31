// SmartTable — Auth & Session Management
const Auth = {
  current: null,
  restaurant: null,
  shift: null,
  
  // Simple session storage
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
  
  // Waiter login (name only, no auth)
  async loginWaiter(name, restaurantId, shiftId) {
    const waiter = { name, restaurantId, shiftId, role: 'waiter', loginAt: new Date().toISOString() };
    this.setSession('waiter', waiter);
    this.current = waiter;
    return waiter;
  },
  
  // Manager login (PIN based)
  async loginManager(pin, restaurantId) {
    const users = await sbSelect('users', {
      restaurant_id: restaurantId,
      role: 'manager',
      pin: pin,
      is_active: true,
    }, { single: true });
    
    if (!users || (Array.isArray(users) && users.length === 0)) {
      throw new Error(t('wrongPin'));
    }
    
    const manager = users[0] || users;
    const session = { ...manager, role: 'manager' };
    this.setSession('manager', session);
    this.current = session;
    return session;
  },
  
  // Admin login (username + password)
  async loginAdmin(username, password, restaurantId) {
    const users = await sbSelect('users', {
      restaurant_id: restaurantId,
      role: 'admin',
      username: username,
      is_active: true,
    });
    
    if (!users || users.length === 0) {
      throw new Error('משתמש לא נמצא');
    }
    
    const user = users[0];
    // Simple password check (in production, use Supabase Auth)
    if (user.password_hash !== password && user.password_hash !== btoa(password)) {
      throw new Error('סיסמה שגויה');
    }
    
    const session = { ...user, role: 'admin' };
    this.setSession('admin', session);
    this.current = session;
    
    // Update last_login
    await sbUpdate('restaurants', { id: restaurantId }, { last_login_at: new Date().toISOString() });
    if (!user.first_login_at) {
      await sbUpdate('restaurants', { id: restaurantId }, { first_login_at: new Date().toISOString() });
    }
    
    return session;
  },
  
  // Super Admin login
  async loginSuperAdmin(username, password) {
    const users = await sbSelect('users', {
      role: 'super_admin',
      username: username,
      is_active: true,
    });
    
    if (!users || users.length === 0) {
      throw new Error('משתמש לא נמצא');
    }
    
    const user = users[0];
    if (user.password_hash !== password && user.password_hash !== btoa(password)) {
      throw new Error('סיסמה שגויה');
    }
    
    const session = { ...user, role: 'super_admin' };
    this.setSession('superadmin', session);
    this.current = session;
    return session;
  },
  
  // Get restaurant by QR token (public access)
  async getRestaurantByTableToken(token) {
    const table = await sbSelect('restaurant_tables', { qr_token: token }, { single: true });
    if (!table) throw new Error('שולחן לא נמצא');
    
    const restaurant = await sbSelect('restaurants', { id: table.restaurant_id }, { single: true });
    if (!restaurant) throw new Error('מסעדה לא נמצאה');
    
    const settings = await sbSelect('restaurant_settings', { restaurant_id: table.restaurant_id }, { single: true });
    const gifts = await sbSelect('gifts', { restaurant_id: table.restaurant_id, is_active: true });
    
    return { table, restaurant, settings: settings || {}, gifts };
  },
  
  // Check if restaurant is active
  isRestaurantActive(restaurant) {
    if (!restaurant) return false;
    if (restaurant.status === 'suspended') return false;
    if (restaurant.status === 'inactive') return false;
    if (restaurant.promo_active && restaurant.promo_expires_at) {
      if (new Date(restaurant.promo_expires_at) < new Date()) {
        // Promo expired, check billing status
        return false;
      }
    }
    return true;
  },
};
