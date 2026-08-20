// SmartTable — Kiosk Lock Mode Utility
const KioskLock = {
  state: { tapCount: 0, tapTimer: null, locked: false, restaurantId: null, screenType: null, deviceId: null },

  init(restaurantId, screenType) {
    this.state.restaurantId = restaurantId;
    this.state.screenType = screenType;
    this.state.deviceId = this.getDeviceId();
    
    const stored = localStorage.getItem('kiosk_lock_' + restaurantId + '_' + screenType);
    if (stored === 'true') {
      this.state.locked = true;
      this.activate();
    }
    
    document.addEventListener('click', (e) => {
      if (!this.state.locked) return;
      if (e.clientX < 50 && e.clientY < 50) {
        this.state.tapCount++;
        clearTimeout(this.state.tapTimer);
        this.state.tapTimer = setTimeout(() => { this.state.tapCount = 0; }, 1000);
        if (this.state.tapCount >= 5) {
          this.state.tapCount = 0;
          this.showUnlockDialog();
        }
      }
    });
  },

  getDeviceId() {
    let id = localStorage.getItem('st_device_id');
    if (!id) { id = 'dev_' + Math.random().toString(36).substr(2, 12); localStorage.setItem('st_device_id', id); }
    return id;
  },

  async lock() {
    try {
      await fetch(CONFIG.api.registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lockDevice',
          data: { restaurant_id: this.state.restaurantId, device_id: this.state.deviceId, screen_type: this.state.screenType }
        })
      });
    } catch(e) {}
    localStorage.setItem('kiosk_lock_' + this.state.restaurantId + '_' + this.state.screenType, 'true');
    this.state.locked = true;
    this.activate();
    Utils.toast('🔒 מסך נעול — Kiosk Mode');
  },

  activate() {
    window.addEventListener('hashchange', this.preventNavigation, true);
    this.requestFullscreen();
    this.showLockIndicator();
  },

  preventNavigation(e) {
    if (KioskLock.state.locked) {
      e.preventDefault();
      e.stopPropagation();
      Utils.toast('🔒 מסך נעול — הקש 5 פעמים בפינה השמאלית-עליונה לביטול נעילה');
    }
  },

  showLockIndicator() {
    let indicator = document.getElementById('kiosk-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'kiosk-indicator';
      indicator.style.cssText = 'position:fixed;top:4px;right:4px;z-index:9999;background:rgba(0,0,0,0.7);color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;pointer-events:none';
      indicator.textContent = '🔒 Kiosk';
      document.body.appendChild(indicator);
    }
  },

  showUnlockDialog() {
    const existing = document.getElementById('kiosk-unlock-dialog');
    if (existing) existing.remove();
    
    const dialog = document.createElement('div');
    dialog.id = 'kiosk-unlock-dialog';
    dialog.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center';
    
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:320px;width:90%;text-align:center';
    box.innerHTML = '<div style="font-size:2rem;margin-bottom:8px">🔒</div>' +
      '<h3 style="font-weight:600;margin-bottom:16px;color:#1a1a1a">ביטול נעילת Kiosk</h3>' +
      '<input type="password" id="kiosk-pin-input" placeholder="הזן קוד PIN" maxlength="4" ' +
      'style="width:100%;text-align:center;font-size:1.5rem;letter-spacing:0.5rem;padding:12px;border:2px solid #e5e7eb;border-radius:12px;outline:none;margin-bottom:16px" autofocus>' +
      '<div style="display:flex;gap:8px">' +
      '<button id="kiosk-cancel" style="flex:1;padding:10px;border-radius:8px;background:#f3f4f6;color:#6b7280;font-weight:600;border:0;cursor:pointer">ביטול</button>' +
      '<button id="kiosk-unlock" style="flex:1;padding:10px;border-radius:8px;background:#C9A84C;color:#fff;font-weight:600;border:0;cursor:pointer">פתח</button>' +
      '</div>';
    
    dialog.appendChild(box);
    document.body.appendChild(dialog);
    
    const pinInput = document.getElementById('kiosk-pin-input');
    pinInput.focus();
    
    document.getElementById('kiosk-cancel').addEventListener('click', () => dialog.remove());
    document.getElementById('kiosk-unlock').addEventListener('click', async () => {
      const pin = pinInput.value.trim();
      if (!pin) return;
      try {
        const res = await fetch(CONFIG.api.registerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'unlockDevice',
            data: { restaurant_id: KioskLock.state.restaurantId, device_id: KioskLock.state.deviceId, pin }
          })
        });
        const result = await res.json();
        if (result.success) {
          KioskLock.unlock();
        } else {
          pinInput.value = '';
          pinInput.placeholder = 'קוד שגוי';
          pinInput.style.borderColor = '#ef4444';
          setTimeout(() => { pinInput.placeholder = 'הזן קוד PIN'; pinInput.style.borderColor = '#e5e7eb'; }, 2000);
        }
      } catch(e) {
        Utils.toast('שגיאה בביטול הנעילה');
      }
    });
    
    pinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('kiosk-unlock').click(); });
  },

  unlock() {
    localStorage.removeItem('kiosk_lock_' + this.state.restaurantId + '_' + this.state.screenType);
    this.state.locked = false;
    window.removeEventListener('hashchange', this.preventNavigation, true);
    const indicator = document.getElementById('kiosk-indicator');
    if (indicator) indicator.remove();
    const dialog = document.getElementById('kiosk-unlock-dialog');
    if (dialog) dialog.remove();
    Utils.toast('🔓 המסך שוחרר');
  },

  requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  },

  isLocked() {
    return this.state.locked;
  },
};
