// SmartTable API — Enterprise Backend Function (Deno.serve + Base44 SDK)
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// ─── Rate Limiting ───────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 80;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + RATE_LIMIT_WINDOW; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) throw { status: 429, error: "יותר מדי בקשות. אנא המתן מעט." };
}

// ─── Input Sanitization ──────────────────────────────────────────
function sanitize(str) {
  if (typeof str !== "string") return str;
  return str.replace(/<script[^>]*>.*?<\/script>/gi, "").replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
    .replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "")
    .replace(/[<>]/g, (c) => ({ "<": "&lt;", ">": "&gt;" }[c]) || c).trim().slice(0, 2000);
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj;
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") clean[key] = sanitize(val);
    else if (val && typeof val === "object" && !Array.isArray(val)) clean[key] = sanitizeObject(val);
    else clean[key] = val;
  }
  return clean;
}

// ─── Password Hashing (SHA-256 + salt) ───────────────────────────
async function hashPassword(password, salt) {
  const s = salt || crypto.randomUUID().replace(/-/g, "");
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s + ":" + password));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hash, salt: s };
}

async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith("h:")) {
    const parts = stored.slice(2).split(":");
    const { hash: computed } = await hashPassword(password, parts[0]);
    return parts[1] === computed;
  }
  return stored === password;
}

function validatePasswordPolicy(pwd) {
  if (!pwd || pwd.length < 8) return { valid: false, error: "הסיסמה חייבת להיות לפחות 8 תווים" };
  if (!/[A-Z]/.test(pwd)) return { valid: false, error: "הסיסמה חייבת לכלול אות גדולה" };
  if (!/[a-z]/.test(pwd)) return { valid: false, error: "הסיסמה חייבת לכלול אות קטנה" };
  if (!/[0-9]/.test(pwd)) return { valid: false, error: "הסיסמה חייבת לכלול מספר" };
  return { valid: true };
}

// ─── Table name → Entity name mapping (singular PascalCase) ────
const TABLE_MAP = {
  "restaurants": "Restaurant",
  "app_users": "AppUser",
  "restaurant_settings": "RestaurantSetting",
  "restaurant_tables": "RestaurantTable",
  "gifts": "Gift",
  "menu_items": "MenuItem",
  "shifts": "Shift",
  "shift_waiters": "ShiftWaiter",
  "tasks": "Task",
  "task_logs": "TaskLog",
  "billing_records": "BillingRecord",
  "activity_logs": "ActivityLog",
  "guest_profiles": "GuestProfile",
  "guest_feedback": "GuestFeedback",
  "guest_orders": "GuestOrder",
};

function entityName(table) {
  return TABLE_MAP[table] || table.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// ─── Entity helpers (.filter() returns array directly) ─────────
async function sel(b44, table, filters, opts = {}) {
  const name = entityName(table);
  let results = await b44.asServiceRole.entities[name].filter(filters);
  if (opts.sort) {
    const isDesc = opts.sort.startsWith("-");
    const field = isDesc ? opts.sort.slice(1) : opts.sort;
    results = [...results].sort((a, b) => {
      let va = a[field], vb = b[field];
      if (va == null) va = ""; if (vb == null) vb = "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return isDesc ? 1 : -1;
      if (va > vb) return isDesc ? -1 : 1;
      return 0;
    });
  }
  if (opts.limit) results = results.slice(0, opts.limit);
  return results;
}

async function selOne(b44, table, filters) {
  const r = await sel(b44, table, filters, { limit: 1 });
  return r && r.length > 0 ? r[0] : null;
}
async function ins(b44, table, data) { return await b44.asServiceRole.entities[entityName(table)].create(data); }
async function upd(b44, table, id, data) { return await b44.asServiceRole.entities[entityName(table)].update(id, data); }
async function delR(b44, table, id) { return await b44.asServiceRole.entities[entityName(table)].delete(id); }
async function getById(b44, table, id) { return await b44.asServiceRole.entities[entityName(table)].get(id); }

function sortOpts(options) {
  const opts = {};
  if (options?.order) { const { column, ascending } = options.order; opts.sort = ascending ? column : `-${column}`; }
  if (options?.limit) opts.limit = options.limit;
  return opts;
}

// ─── Main Handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: {
      "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }});
  }
  const hdr = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip);
    const body = await req.json();
    const { action } = body;
    if (!action) return new Response(JSON.stringify({ error: "Missing action" }), { status: 400, headers: hdr });
    const base44 = createClientFromRequest(req);
    let result;

    switch (action) {
      case "auth": {
        const { auth } = body;
        if (!auth || !auth.role) throw { status: 400, error: "Missing auth params" };
        if (auth.role === "super_admin") {
          const user = await selOne(base44, "app_users", { username: auth.username, role: "super_admin" });
          if (!user) throw { status: 401, error: "משתמש לא נמצא" };
          if (!user.is_active) throw { status: 403, error: "חשבון מנוטרל" };
          if (!(await verifyPassword(auth.password, user.password_hash))) throw { status: 401, error: "סיסמה שגויה" };
          if (user.password_hash && !user.password_hash.startsWith("h:")) { const { hash, salt } = await hashPassword(auth.password); await upd(base44, "app_users", user.id, { password_hash: `h:${salt}:${hash}` }); }
          const { password_hash, ...safe } = user; result = safe;
        } else if (auth.role === "admin") {
          if (!auth.restaurantId) throw { status: 400, error: "Missing restaurantId" };
          const user = await selOne(base44, "app_users", { username: auth.username, role: "admin", restaurant_id: auth.restaurantId });
          if (!user) throw { status: 401, error: "משתמש לא נמצא" };
          if (!user.is_active) throw { status: 403, error: "חשבון מנוטרל" };
          if (!(await verifyPassword(auth.password, user.password_hash))) throw { status: 401, error: "סיסמה שגויה" };
          if (user.password_hash && !user.password_hash.startsWith("h:")) { const { hash, salt } = await hashPassword(auth.password); await upd(base44, "app_users", user.id, { password_hash: `h:${salt}:${hash}` }); }
          const now = new Date().toISOString();
          await upd(base44, "restaurants", auth.restaurantId, { last_login_at: now });
          const rest = await getById(base44, "restaurants", auth.restaurantId);
          if (rest && !rest.first_login_at) await upd(base44, "restaurants", auth.restaurantId, { first_login_at: now });
          const { password_hash, ...safe } = user; result = safe;
        } else if (auth.role === "manager") {
          if (!auth.restaurantId || !auth.pin) throw { status: 400, error: "Missing pin or restaurantId" };
          const manager = await selOne(base44, "app_users", { pin: auth.pin, role: "manager", restaurant_id: auth.restaurantId, is_active: true });
          if (!manager) throw { status: 401, error: "קוד שגוי" };
          const { password_hash, ...safe } = manager; result = safe;
        } else throw { status: 400, error: "Invalid auth role" };
        break;
      }

      case "changePassword": {
        const { user_id, new_password } = body.data;
        const v = validatePasswordPolicy(new_password);
        if (!v.valid) throw { status: 400, error: v.error };
        const { hash, salt } = await hashPassword(new_password);
        await upd(base44, "app_users", user_id, { password_hash: `h:${salt}:${hash}`, must_change_password: false });
        result = { success: true }; break;
      }

      case "createClient": {
        const d = sanitizeObject(body.data);
        const pwdCheck = validatePasswordPolicy(d.temp_password);
        if (!pwdCheck.valid) throw { status: 400, error: pwdCheck.error };
        const restaurant = await ins(base44, "restaurants", {
          name: d.restaurant_name, owner_name: d.owner_name, email: d.email,
          phone_primary: d.phone_primary || "", phone_secondary: d.phone_secondary || "",
          address: d.address || "", business_number: d.business_number || "",
          contract_number: d.contract_number || "", technical_contact: d.technical_contact || "",
          notes_internal: d.notes_internal || "", max_tables: parseInt(d.max_tables) || 20,
          status: "active", promo_active: true, promo_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        });
        await ins(base44, "restaurant_settings", {
          restaurant_id: restaurant.id, theme: "luxury", primary_color: "#C9A84C",
          secondary_color: "#1A1A1A", font_family: "Playfair Display", default_language: "he",
          customer_view_mode: "full_menu", escalation_green_minutes: 2, escalation_orange_minutes: 4, escalation_alert_minutes: 5,
        });
        const { hash, salt } = await hashPassword(d.temp_password);
        await ins(base44, "app_users", {
          username: d.username || d.email.split("@")[0], full_name: d.owner_name,
          role: "admin", restaurant_id: restaurant.id, password_hash: `h:${salt}:${hash}`, is_active: true, must_change_password: true,
        });
        const tc = Math.min(parseInt(d.max_tables) || 10, 10);
        for (let i = 1; i <= tc; i++) {
          await ins(base44, "restaurant_tables", { restaurant_id: restaurant.id, table_number: i, qr_token: `qr_${crypto.randomUUID().replace(/-/g, "")}`, is_open: false, scratch_used: false });
        }
        result = { success: true, restaurant_id: restaurant.id }; break;
      }

      case "select": {
        const { table, filters, options } = body;
        const cf = sanitizeObject(filters || {});
        if (options && options.single) result = await selOne(base44, table, cf);
        else result = await sel(base44, table, cf, sortOpts(options));
        break;
      }

      case "insert": { result = await ins(base44, body.table, sanitizeObject(body.data)); break; }

      case "update": {
        const { table, filters, data } = body;
        const cd = sanitizeObject(data);
        if (filters.id) result = await upd(base44, table, filters.id, cd);
        else { const ex = await selOne(base44, table, sanitizeObject(filters)); if (ex) result = await upd(base44, table, ex.id, cd); else result = { success: false }; }
        break;
      }

      case "delete": {
        const { table, filters } = body;
        if (filters.id) result = await delR(base44, table, filters.id);
        else { const ex = await selOne(base44, table, sanitizeObject(filters)); if (ex) result = await delR(base44, table, ex.id); }
        break;
      }

      case "getByQr": {
        const { qr_token, device_id } = body.filters;
        if (!qr_token) throw { status: 400, error: "Missing QR token" };
        const table = await selOne(base44, "restaurant_tables", { qr_token: sanitize(qr_token) });
        if (!table) throw { status: 404, error: "שולחן לא נמצא" };
        const restaurant = await getById(base44, "restaurants", table.restaurant_id);
        if (!restaurant) throw { status: 404, error: "מסעדה לא נמצאה" };
        const settings = await selOne(base44, "restaurant_settings", { restaurant_id: table.restaurant_id });
        const gifts = await sel(base44, "gifts", { restaurant_id: table.restaurant_id, is_active: true });
        const menuItems = await sel(base44, "menu_items", { restaurant_id: table.restaurant_id, is_active: true }, { sort: "sort_order" });
        let guestProfile = null;
        if (device_id) guestProfile = await selOne(base44, "guest_profiles", { restaurant_id: table.restaurant_id, guest_device_id: sanitize(device_id) });
        result = { table, restaurant, settings: settings || {}, gifts: gifts || [], menuItems: menuItems || [], guestProfile };
        break;
      }

      case "poll": {
        const rid = sanitize(body.filters.restaurant_id);
        if (!rid) throw { status: 400, error: "Missing restaurant_id" };
        const tasks = await sel(base44, "tasks", { restaurant_id: rid, status: "open" }, { sort: "created_at" });
        const tables = await sel(base44, "restaurant_tables", { restaurant_id: rid }, { sort: "table_number" });
        const shifts = await sel(base44, "shifts", { restaurant_id: rid, ended_at: null }, { sort: "-started_at", limit: 1 });
        let waiters = [];
        if (shifts?.length > 0) waiters = await sel(base44, "shift_waiters", { shift_id: shifts[0].id });
        result = { tasks, tables, waiters, shift: shifts?.[0] || null };
        break;
      }

      case "getReports": {
        const rid = sanitize(body.filters.restaurant_id);
        if (!rid) throw { status: 400, error: "Missing restaurant_id" };
        const tasks = await sel(base44, "tasks", { restaurant_id: rid }) || [];
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === "done").length;
        const cancelled = tasks.filter(t => t.status === "cancelled").length;
        const open = tasks.filter(t => t.status === "open").length;
        const rt = tasks.filter(t => t.response_seconds != null).map(t => t.response_seconds);
        const avgR = rt.length > 0 ? Math.round(rt.reduce((a, b) => a + b, 0) / rt.length) : 0;
        const byType = {}; tasks.forEach(t => { byType[t.type] = (byType[t.type] || 0) + 1; });
        const byTable = {}; tasks.forEach(t => { byTable[t.table_number] = (byTable[t.table_number] || 0) + 1; });
        const byHour = new Array(24).fill(0); tasks.forEach(t => { const h = new Date(t.created_at).getHours(); byHour[h] = (byHour[h] || 0) + 1; });
        const today = new Date().toISOString().split("T")[0];
        const tt = tasks.filter(t => t.created_at?.startsWith(today));
        result = { total, completed, cancelled, open, avgResponseTime: avgR, minResponseTime: rt.length > 0 ? Math.min(...rt) : 0, maxResponseTime: rt.length > 0 ? Math.max(...rt) : 0, byType, byTable, byHour, todayCount: tt.length, todayCompleted: tt.filter(t => t.status === "done").length, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
        break;
      }

      case "generateTableQr": {
        const { restaurant_id, table_number, notes } = body.data;
        const ex = await selOne(base44, "restaurant_tables", { restaurant_id: sanitize(restaurant_id), table_number: parseInt(table_number) });
        if (ex) throw { status: 400, error: "שולחן כבר קיים" };
        const token = `qr_${crypto.randomUUID().replace(/-/g, "")}`;
        const table = await ins(base44, "restaurant_tables", { restaurant_id: sanitize(restaurant_id), table_number: parseInt(table_number), qr_token: token, notes: notes ? sanitize(notes) : null, is_open: false, scratch_used: false });
        result = { ...table, qr_token: token }; break;
      }

      case "updateTablePosition": {
        const { table_id, pos_x, pos_y } = body.data;
        result = await upd(base44, "restaurant_tables", sanitize(table_id), { pos_x: parseFloat(pos_x) || null, pos_y: parseFloat(pos_y) || null }); break;
      }

      case "saveGuestProfile": {
        const d = sanitizeObject(body.data);
        const ex = await selOne(base44, "guest_profiles", { restaurant_id: d.restaurant_id, guest_device_id: d.guest_device_id });
        if (ex) {
          result = await upd(base44, "guest_profiles", ex.id, {
            nickname: d.nickname || ex.nickname, favorite_wine: d.favorite_wine || ex.favorite_wine, allergies: d.allergies || ex.allergies,
            dietary_prefs: d.dietary_prefs || ex.dietary_prefs, favorite_dish: d.favorite_dish || ex.favorite_dish, phone: d.phone || ex.phone,
            preferred_language: d.preferred_language || ex.preferred_language, notes: d.notes || ex.notes,
            last_visit: new Date().toISOString(), visit_count: (ex.visit_count || 0) + 1, is_vip: d.is_vip !== undefined ? d.is_vip : (ex.visit_count >= 3),
          });
        } else {
          result = await ins(base44, "guest_profiles", { restaurant_id: d.restaurant_id, guest_device_id: d.guest_device_id, nickname: d.nickname, favorite_wine: d.favorite_wine, allergies: d.allergies, dietary_prefs: d.dietary_prefs, favorite_dish: d.favorite_dish, phone: d.phone, preferred_language: d.preferred_language || "he", notes: d.notes, visit_count: 1, last_visit: new Date().toISOString(), total_spent: 0, is_vip: false });
        }
        break;
      }

      case "saveFeedback": {
        const d = sanitizeObject(body.data);
        const rating = parseInt(d.rating);
        const isNegative = rating <= 2;
        result = await ins(base44, "guest_feedback", { restaurant_id: d.restaurant_id, guest_device_id: d.guest_device_id || null, table_number: parseInt(d.table_number) || null, rating, comment: d.comment || null, tags: d.tags || null, waiter_name: d.waiter_name || null, is_negative: isNegative, handled: false, sent_to_manager: isNegative });
        result = { ...result, is_negative: isNegative }; break;
      }

      case "getFeedback": {
        const rid = sanitize(body.filters.restaurant_id);
        let fb = await sel(base44, "guest_feedback", { restaurant_id: rid }, { sort: "-created_date" });
        if (body.filters.negative_only) fb = fb.filter(f => f.is_negative);
        result = fb; break;
      }

      case "handleFeedback": { result = await upd(base44, "guest_feedback", sanitize(body.data.feedback_id), { handled: true, handled_at: new Date().toISOString() }); break; }

      case "saveGuestOrder": {
        const d = sanitizeObject(body.data);
        const items = typeof d.items_json === "string" ? JSON.parse(d.items_json) : (d.items_json || []);
        const total = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
        result = await ins(base44, "guest_orders", { restaurant_id: d.restaurant_id, table_id: d.table_id, table_number: parseInt(d.table_number) || null, guest_device_id: d.guest_device_id, guest_name: d.guest_name || "אורח", items_json: JSON.stringify(items), total_amount: total, status: "open", shift_id: d.shift_id || null, paid: false });
        break;
      }

      case "getGuestOrders": { result = await sel(base44, "guest_orders", { restaurant_id: sanitize(body.filters.restaurant_id), table_id: sanitize(body.filters.table_id), paid: false }, { sort: "created_date" }); break; }

      case "transferOrderItem": {
        const { order_id, item_index, to_guest_device } = body.data;
        const order = await getById(base44, "guest_orders", sanitize(order_id));
        if (!order) throw { status: 404, error: "הזמנה לא נמצאה" };
        const items = JSON.parse(order.items_json || "[]");
        const item = items[parseInt(item_index)];
        if (!item) throw { status: 400, error: "פריט לא נמצא" };
        items.splice(parseInt(item_index), 1);
        const nt = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
        await upd(base44, "guest_orders", order.id, { items_json: JSON.stringify(items), total_amount: nt });
        let target = await selOne(base44, "guest_orders", { restaurant_id: order.restaurant_id, table_id: order.table_id, guest_device_id: sanitize(to_guest_device), paid: false });
        if (target) { const ti = JSON.parse(target.items_json || "[]"); ti.push(item); const tt = ti.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0); await upd(base44, "guest_orders", target.id, { items_json: JSON.stringify(ti), total_amount: tt }); }
        else await ins(base44, "guest_orders", { restaurant_id: order.restaurant_id, table_id: order.table_id, table_number: order.table_number, guest_device_id: sanitize(to_guest_device), guest_name: "אורח חדש", items_json: JSON.stringify([item]), total_amount: (item.price || 0) * (item.qty || 1), status: "open", paid: false });
        result = { success: true }; break;
      }

      case "payGuestOrder": { result = await upd(base44, "guest_orders", sanitize(body.data.order_id), { paid: true, paid_at: new Date().toISOString(), status: "paid" }); break; }

      case "getHeatmap": {
        const rid = sanitize(body.filters.restaurant_id);
        const tasks = await sel(base44, "tasks", { restaurant_id: rid, status: "open" }, { sort: "created_at" }) || [];
        const tables = await sel(base44, "restaurant_tables", { restaurant_id: rid }, { sort: "table_number" }) || [];
        const heatmap = tables.map(table => {
          const tt = tasks.filter(t => t.table_id === table.id || t.table_number === table.table_number);
          const oldest = tt.length > 0 ? tt[0] : null;
          const ws = oldest ? (Date.now() - new Date(oldest.created_at).getTime()) / 1000 : 0;
          return { table_id: table.id, table_number: table.table_number, is_open: table.is_open, pos_x: table.pos_x, pos_y: table.pos_y, open_tasks: tt.length, wait_seconds: Math.round(ws), urgency: ws > 300 ? "red" : ws > 120 ? "orange" : ws > 0 ? "green" : "idle", task_types: [...new Set(tt.map(t => t.type))] };
        });
        const allTasks = await sel(base44, "tasks", { restaurant_id: rid }) || [];
        const rt = allTasks.filter(t => t.response_seconds != null).map(t => t.response_seconds);
        const avgR = rt.length > 0 ? Math.round(rt.reduce((a, b) => a + b, 0) / rt.length) : 0;
        result = { tables: heatmap, avgResponseTime: avgR, totalOpenTasks: tasks.length }; break;
      }

      case "getWaiterStats": {
        const rid = sanitize(body.filters.restaurant_id);
        const shifts = await sel(base44, "shifts", { restaurant_id: rid, ended_at: null }, { limit: 1 });
        if (!shifts?.length) { result = { waiters: [] }; break; }
        const waiters = await sel(base44, "shift_waiters", { shift_id: shifts[0].id });
        const tasks = await sel(base44, "tasks", { restaurant_id: rid, status: "in_progress" }, { sort: "created_at" });
        const ws = waiters.map(w => { const ct = tasks.filter(t => t.assigned_waiter_name === w.waiter_name); return { waiter_name: w.waiter_name, joined_at: w.joined_at, active_tasks: ct.length, assigned_tables: [...new Set(ct.map(t => t.table_number))] }; });
        result = { waiters: ws, shift_id: shifts[0].id }; break;
      }

      default: throw { status: 400, error: "Unknown action" };
    }

    return new Response(JSON.stringify(result), { status: 200, headers: hdr });
  } catch (err) {
    console.error("API Error:", err);
    const status = err.status || 500;
    const message = err.error || err.message || "Internal server error";
    return new Response(JSON.stringify({ error: message }), { status, headers: hdr });
  }
});
