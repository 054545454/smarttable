// SmartTable API Client — Base44 Backend
// Replaces Supabase with fetch-based API calls to Base44 backend function
// Designed for easy migration: same interface as supabase.js

const API_URL = 'https://solas-48957418.base44.app/functions/smarttableApi';

async function apiCall(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'API Error');
  }
  return data;
}

// Generic query helper with restaurant_id filtering (same interface as sbSelect)
async function sbSelect(table, filters = {}, options = {}) {
  return apiCall({
    action: 'select',
    table,
    filters,
    options,
  });
}

async function sbInsert(table, data) {
  return apiCall({
    action: 'insert',
    table,
    data,
  });
}

async function sbUpdate(table, filters, updates) {
  return apiCall({
    action: 'update',
    table,
    filters,
    data: updates,
  });
}

async function sbDelete(table, filters) {
  return apiCall({
    action: 'delete',
    table,
    filters,
  });
}

// Auth helper
async function sbAuth(role, credentials) {
  return apiCall({
    action: 'auth',
    auth: { role, ...credentials },
  });
}

// QR lookup helper
async function sbGetByQr(token) {
  return apiCall({
    action: 'getByQr',
    filters: { qr_token: token },
  });
}

// Polling helper (replaces Supabase real-time subscriptions)
async function sbPoll(restaurantId) {
  return apiCall({
    action: 'poll',
    filters: { restaurant_id: restaurantId },
  });
}

// Polling-based "subscription" that calls callback on changes
// Returns an object with unsubscribe() method (same interface as Supabase channels)
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
    } catch (e) {
      console.error('Poll error:', e);
    }
    if (active) {
      setTimeout(poll, intervalMs);
    }
  };
  
  poll();
  
  return {
    unsubscribe() { active = false; }
  };
}

// Compatibility wrappers for existing code that uses sbSubscribe*
function sbSubscribeTasks(restaurantId, callback) {
  return sbSubscribePoll(restaurantId, (data) => {
    if (data.tasks) {
      callback({ eventType: 'tasks', data: data.tasks });
    }
  });
}

function sbSubscribeTables(restaurantId, callback) {
  return sbSubscribePoll(restaurantId, (data) => {
    if (data.tables) {
      callback({ eventType: 'tables', data: data.tables });
    }
  });
}

function sbSubscribeShifts(restaurantId, callback) {
  return sbSubscribePoll(restaurantId, (data) => {
    if (data.shift) {
      callback({ eventType: 'shifts', data: data.shift });
    }
  });
}
