// SmartTable API Client — Base44 Backend
// Enterprise: Offline Queue + Optimistic UI + New API Actions

const API_URL = 'https://solas-48957418.base44.app/functions/smarttableApi';

// ─── Offline Queue ──────────────────────────────────────────────
const offlineQueue = {
  items: [],
  processing: false,
  init() {
    // Load from localStorage
    try { const s = localStorage.getItem('smarttable_offline_queue'); if (s) this.items = JSON.parse(s); } catch(e) {}
    // Process on reconnect
    window.addEventListener('online', () => { this.process(); });
    // Check periodically
    setInterval(() => { if (navigator.onLine && this.items.length > 0) this.process(); }, 5000);
  },
  add(action, data) {
    this.items.push({ action, data, timestamp: Date.now() });
    this.save();
    this.showIndicator(true);
  },
  save() { localStorage.setItem('smarttable_offline_queue', JSON.stringify(this.items)); },
  async process() {
    if (this.processing || this.items.length === 0) return;
    this.processing = true;
    while (this.items.length > 0) {
      const item = this.items[0];
      try {
        await apiCall({ action: item.action, ...item.data });
        this.items.shift();
        this.save();
      } catch(e) {
        break; // Stop on error, retry later
      }
    }
    this.processing = false;
    if (this.items.length === 0) this.showIndicator(false);
  },
  showIndicator(show) {
    let el = document.getElementById('offline-indicator');
    if (show && !el) {
      el = document.createElement('div');
      el.id = 'offline-indicator';
      el.className = 'offline-indicator';
      el.textContent = '📵 מצב לא מקוון — פעולות יסונכרנו כשתחזור הרשת';
      document.body.appendChild(el);
    } else if (!show && el) {
      el.remove();
    }
  }
};

// ─── Core API call with offline support ─────────────────────────
async function apiCall(body) {
  if (!navigator.onLine && body.action === 'insert') {
    offlineQueue.add(body.action, body);
    return [{ id: 'offline_' + Date.now(), ...body.data, _offline: true }];
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

// ─── Generic CRUD ────────────────────────────────────────────────
async function sbSelect(table, filters = {}, options = {}) { return apiCall({ action: 'select', table, filters, options }); }
async function sbInsert(table, data) { return apiCall({ action: 'insert', table, data }); }
async function sbUpdate(table, filters, updates) { return apiCall({ action: 'update', table, filters, data: updates }); }
async function sbDelete(table, filters) { return apiCall({ action: 'delete', table, filters }); }
async function sbAuth(role, credentials) { return apiCall({ action: 'auth', auth: { role, ...credentials } }); }
async function sbGetByQr(token, deviceId) { return apiCall({ action: 'getByQr', filters: { qr_token: token, device_id: deviceId } }); }
async function sbPoll(restaurantId) { return apiCall({ action: 'poll', filters: { restaurant_id: restaurantId } }); }

// ─── New: Guest CRM ──────────────────────────────────────────────
async function sbSaveGuestProfile(data) { return apiCall({ action: 'saveGuestProfile', data }); }

// ─── New: Feedback ───────────────────────────────────────────────
async function sbSaveFeedback(data) { return apiCall({ action: 'saveFeedback', data }); }
async function sbGetFeedback(restaurantId, negativeOnly) { return apiCall({ action: 'getFeedback', filters: { restaurant_id: restaurantId, negative_only: negativeOnly } }); }
async function sbHandleFeedback(feedbackId) { return apiCall({ action: 'handleFeedback', data: { feedback_id: feedbackId } }); }

// ─── New: Guest Orders (Bill Split) ──────────────────────────────
async function sbSaveGuestOrder(data) { return apiCall({ action: 'saveGuestOrder', data }); }
async function sbGetGuestOrders(restaurantId, tableId) { return apiCall({ action: 'getGuestOrders', filters: { restaurant_id: restaurantId, table_id: tableId } }); }
async function sbTransferOrderItem(orderId, itemIndex, toGuestDevice) { return apiCall({ action: 'transferOrderItem', data: { order_id: orderId, item_index: itemIndex, to_guest_device: toGuestDevice } }); }
async function sbPayGuestOrder(orderId) { return apiCall({ action: 'payGuestOrder', data: { order_id: orderId } }); }

// ─── New: Heatmap ────────────────────────────────────────────────
async function sbGetHeatmap(restaurantId) { return apiCall({ action: 'getHeatmap', filters: { restaurant_id: restaurantId } }); }

// ─── New: Waiter Stats (Smart Dispatcher) ────────────────────────
async function sbGetWaiterStats(restaurantId) { return apiCall({ action: 'getWaiterStats', filters: { restaurant_id: restaurantId } }); }

// ─── Polling subscription (replaces real-time) ───────────────────
function sbSubscribePoll(restaurantId, callback, intervalMs = 3000) {
  let active = true;
  let lastData = null;
  const poll = async () => {
    if (!active) return;
    try {
      const data = await sbPoll(restaurantId);
      if (active && JSON.stringify(data) !== JSON.stringify(lastData)) {
        lastData = data;
        callback(data);
      }
    } catch (e) { console.error('Poll error:', e); }
    if (active) setTimeout(poll, intervalMs);
  };
  poll();
  return { unsubscribe() { active = false; } };
}

function sbSubscribeTasks(restaurantId, callback) {
  return sbSubscribePoll(restaurantId, (data) => { if (data.tasks) callback({ eventType: 'tasks', data: data.tasks }); });
}
function sbSubscribeTables(restaurantId, callback) {
  return sbSubscribePoll(restaurantId, (data) => { if (data.tables) callback({ eventType: 'tables', data: data.tables }); });
}
function sbSubscribeShifts(restaurantId, callback) {
  return sbSubscribePoll(restaurantId, (data) => { if (data.shift) callback({ eventType: 'shifts', data: data.shift }); });
}

// ─── Init offline queue ──────────────────────────────────────────
offlineQueue.init();
