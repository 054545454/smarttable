// SmartTable Register & Kiosk — Public Backend Function (Deno.serve)
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// ─── Password Hashing (SHA-256 + salt) ───────────────────────────
async function hashPassword(password, salt) {
  const s = salt || crypto.randomUUID().replace(/-/g, "");
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s + ":" + password));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hash, salt: s };
}

function validatePasswordPolicy(pwd) {
  if (!pwd || pwd.length < 8) return { valid: false, error: "הסיסמה חייבת להיות לפחות 8 תווים" };
  if (!/[A-Z]/.test(pwd)) return { valid: false, error: "הסיסמה חייבת לכלול אות גדולה" };
  if (!/[a-z]/.test(pwd)) return { valid: false, error: "הסיסמה חייבת לכלול אות קטנה" };
  if (!/[0-9]/.test(pwd)) return { valid: false, error: "הסיסמה חייבת לכלול מספר" };
  return { valid: true };
}

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

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function generatePairingCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }});
  }

  const hdr = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const body = await req.json();
    const { action } = body;
    if (!action) return new Response(JSON.stringify({ error: "Missing action" }), { status: 400, headers: hdr });
    const base44 = createClientFromRequest(req);
    let result;

    switch (action) {
      // ─── REGISTRATION ─────────────────────────────────────
      case "register": {
        const d = sanitizeObject(body.data);
        const email = (d.email || "").toLowerCase().trim();
        const name = d.name || "";
        const ownerName = d.owner_name || "";
        const phone = d.phone || "";
        const password = d.password || "";
        const tableCount = Math.min(Math.max(parseInt(d.max_tables) || 5, 1), 100);

        if (!name || !email || !password || !ownerName) throw { status: 400, error: "Missing required fields" };

        const pv = validatePasswordPolicy(password);
        if (!pv.valid) throw { status: 400, error: pv.error };

        // Check if email already exists
        const existingUsers = await base44.asServiceRole.entities.AppUser.filter({ username: email, role: "admin" });
        if (existingUsers && existingUsers.length > 0) throw { status: 409, error: "כתובת האימייל כבר רשומה במערכת" };

        // Determine pricing tier
        let plan = "free", fee = 0, planName = "Free";
        if (tableCount <= 5) { plan = "free"; fee = 0; planName = "Free"; }
        else if (tableCount <= 15) { plan = "tier_15"; fee = 99; planName = "Starter"; }
        else if (tableCount <= 30) { plan = "tier_30"; fee = 143; planName = "Professional"; }
        else { plan = "tier_unlimited"; fee = 199; planName = "Unlimited"; }

        // Create restaurant
        const restaurant = await base44.asServiceRole.entities.Restaurant.create({
          name, owner_name: ownerName, email,
          phone_primary: phone, phone_secondary: "",
          address: d.address || "", business_number: d.business_number || "",
          contract_number: "", technical_contact: "", notes_internal: "",
          max_tables: tableCount, status: "active",
          subscription_plan: plan, monthly_fee: fee, billing_currency: "USD",
          billing_status: "trial", billing_day: new Date().getDate(),
          promo_active: true, promo_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // Create default settings
        await base44.asServiceRole.entities.RestaurantSetting.create({
          restaurant_id: restaurant.id, theme: "luxury",
          primary_color: "#C9A84C", secondary_color: "#1A1A1A",
          font_family: "Playfair Display", default_language: "he",
          customer_view_mode: "full_menu",
          enabled_buttons: JSON.stringify(["water","bill","waiter","wine_menu","dessert_menu","special"]),
          kiosk_pin: String(Math.floor(1000 + Math.random() * 9000)),
          escalation_green_minutes: 2, escalation_orange_minutes: 4, escalation_alert_minutes: 5,
        });

        // Create admin user
        const { hash, salt } = await hashPassword(password);
        await base44.asServiceRole.entities.AppUser.create({
          username: email, full_name: ownerName,
          role: "admin", restaurant_id: restaurant.id,
          password_hash: `h:${salt}:${hash}`,
          is_active: true, must_change_password: false,
        });

        // Create initial tables
        const tablesToCreate = Math.min(tableCount, 10);
        for (let i = 1; i <= tablesToCreate; i++) {
          await base44.asServiceRole.entities.RestaurantTable.create({
            restaurant_id: restaurant.id, table_number: i,
            qr_token: `qr_${crypto.randomUUID().replace(/-/g, "")}`,
            is_open: false, scratch_used: false,
          });
        }

        // Send welcome email
        let emailSent = false;
        try {
          const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");
          const loginUrl = `https://violet-dunlin-978279.hostingersite.com#a/${restaurant.id}`;
          const subject = `=?utf-8?B?${utf8ToBase64("ברוכים הבאים ל-SmartTable! פרטי הכניסה שלך")}?=`;
          const htmlBody = [
            '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">',
            '<h2 style="color:#C9A84C">ברוכים הבאים ל-SmartTable! 🎉</h2>',
            '<p>שלום ' + ownerName + ',</p>',
            '<p>חשבון המסעדה שלך נוצר בהצלחה.</p>',
            '<div style="background:#f5f5f5;padding:20px;border-radius:8px;margin:20px 0">',
            '<p style="margin:5px 0"><b>מסעדה:</b> ' + name + '</p>',
            '<p style="margin:5px 0"><b>תוכנית:</b> ' + planName + (fee > 0 ? ' ($' + fee + '/mo)' : ' (חינם)') + '</p>',
            '<p style="margin:5px 0"><b>שם משתמש:</b> ' + email + '</p>',
            '<p style="margin:5px 0"><b>ניסיון חינם:</b> 90 יום</p>',
            '</div>',
            '<p><b>קישור לכניסה:</b><br><a href="' + loginUrl + '" style="color:#C9A84C;font-size:16px">' + loginUrl + '</a></p>',
            '<p style="color:#888;margin-top:30px;font-size:12px">SmartTable — מערכת ניהול חכמה למסעדות</p>',
            '</div>'
          ].join("\n");
          const textBody = `ברוכים הבאים ל-SmartTable!\n\nשלום ${ownerName},\nחשבון המסעדה שלך נוצר.\n\nמסעדה: ${name}\nתוכנית: ${planName}\nשם משתמש: ${email}\n\nקישור: ${loginUrl}`;
          const boundary = "boundary_" + crypto.randomUUID().replace(/-/g, "");
          const rawMessage = [
            "From: SmartTable <uidesign68@gmail.com>", "To: " + email, "Subject: " + subject,
            "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
            `--${boundary}`, "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", utf8ToBase64(textBody), "",
            `--${boundary}`, "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: base64", "", utf8ToBase64(htmlBody), "",
            `--${boundary}--`, ""
          ].join("\n");
          const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST", headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
            body: JSON.stringify({ raw: utf8ToBase64(rawMessage) })
          });
          if (sendRes.ok) emailSent = true;
        } catch (emailErr) { /* Non-blocking */ }

        result = { success: true, restaurant_id: restaurant.id, plan: planName, fee, email_sent: emailSent, tables_created: tablesToCreate };
        break;
      }

      // ─── DEVICE PAIRING ────────────────────────────────────
      case "generatePairingCode": {
        const d = sanitizeObject(body.data);
        if (!d.restaurant_id) throw { status: 400, error: "Missing restaurant_id" };
        const code = generatePairingCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

        // Store code in a DeviceSession with pairing_code
        const existing = await base44.asServiceRole.entities.DeviceSession.filter({
          restaurant_id: d.restaurant_id, device_id: "pairing_pending"
        });
        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.DeviceSession.update(existing[0].id, {
            pairing_code: code, pairing_expires_at: expiresAt, screen_type: d.screen_type || ""
          });
        } else {
          await base44.asServiceRole.entities.DeviceSession.create({
            restaurant_id: d.restaurant_id, device_id: "pairing_pending",
            pairing_code: code, pairing_expires_at: expiresAt,
            screen_type: d.screen_type || "", is_locked: false
          });
        }

        result = { success: true, pairing_code: code, expires_at: expiresAt };
        break;
      }

      case "validatePairingCode": {
        const d = sanitizeObject(body.data);
        const code = d.pairing_code || "";
        if (!code || code.length !== 6) throw { status: 400, error: "קוד לא תקין" };

        const allSessions = await base44.asServiceRole.entities.DeviceSession.filter({
          pairing_code: code, device_id: "pairing_pending"
        });
        if (!allSessions || allSessions.length === 0) throw { status: 404, error: "קוד שיווך לא נמצא או שפג תוקפו" };

        const session = allSessions[0];
        if (session.pairing_expires_at && new Date(session.pairing_expires_at) < new Date()) {
          throw { status: 410, error: "קוד השיווך פג תוקף. בקש קוד חדש מהמנהל." };
        }

        // Get restaurant info
        const restaurants = await base44.asServiceRole.entities.Restaurant.filter({ id: session.restaurant_id });
        if (!restaurants || restaurants.length === 0) throw { status: 404, error: "מסעדה לא נמצאה" };
        const restaurant = restaurants[0];

        result = {
          success: true,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          screen_type: session.screen_type || ""
        };
        break;
      }

      case "pairDevice": {
        const d = sanitizeObject(body.data);
        if (!d.restaurant_id || !d.device_id || !d.screen_type) throw { status: 400, error: "Missing required fields" };
        const code = d.pairing_code || "";

        // If code provided, validate and consume it
        if (code) {
          const codeSessions = await base44.asServiceRole.entities.DeviceSession.filter({
            pairing_code: code, device_id: "pairing_pending", restaurant_id: d.restaurant_id
          });
          if (codeSessions && codeSessions.length > 0) {
            if (codeSessions[0].pairing_expires_at && new Date(codeSessions[0].pairing_expires_at) < new Date()) {
              throw { status: 410, error: "קוד השיווך פג תוקף" };
            }
            // Delete the pairing session (consumed)
            await base44.asServiceRole.entities.DeviceSession.delete(codeSessions[0].id);
          }
        }

        // Create or update device session
        const existing = await base44.asServiceRole.entities.DeviceSession.filter({
          restaurant_id: d.restaurant_id, device_id: d.device_id
        });
        if (existing && existing.length > 0) {
          result = await base44.asServiceRole.entities.DeviceSession.update(existing[0].id, {
            screen_type: d.screen_type, paired_at: new Date().toISOString(),
            is_locked: true, locked_at: new Date().toISOString(),
            device_name: d.device_name || ""
          });
        } else {
          result = await base44.asServiceRole.entities.DeviceSession.create({
            restaurant_id: d.restaurant_id, device_id: d.device_id,
            screen_type: d.screen_type, device_name: d.device_name || "",
            paired_at: new Date().toISOString(), is_locked: true, locked_at: new Date().toISOString()
          });
        }
        break;
      }

      // ─── KIOSK LOCK/UNLOCK ─────────────────────────────────
      case "lockDevice": {
        const d = sanitizeObject(body.data);
        if (!d.restaurant_id || !d.device_id || !d.screen_type) throw { status: 400, error: "Missing required fields" };
        const existing = await base44.asServiceRole.entities.DeviceSession.filter({
          restaurant_id: d.restaurant_id, device_id: d.device_id
        });
        if (existing && existing.length > 0) {
          result = await base44.asServiceRole.entities.DeviceSession.update(existing[0].id, {
            is_locked: true, locked_at: new Date().toISOString(), screen_type: d.screen_type
          });
        } else {
          result = await base44.asServiceRole.entities.DeviceSession.create({
            restaurant_id: d.restaurant_id, device_id: d.device_id,
            screen_type: d.screen_type, is_locked: true, locked_at: new Date().toISOString()
          });
        }
        break;
      }

      case "unlockDevice": {
        const d = sanitizeObject(body.data);
        if (!d.restaurant_id || !d.device_id) throw { status: 400, error: "Missing required fields" };
        const settings = await base44.asServiceRole.entities.RestaurantSetting.filter({ restaurant_id: d.restaurant_id });
        const s = settings && settings.length > 0 ? settings[0] : null;
        if (d.pin !== (s?.kiosk_pin || "")) throw { status: 401, error: "קוד שגוי" };
        const sessions = await base44.asServiceRole.entities.DeviceSession.filter({
          restaurant_id: d.restaurant_id, device_id: d.device_id
        });
        if (sessions && sessions.length > 0) {
          await base44.asServiceRole.entities.DeviceSession.update(sessions[0].id, { is_locked: false });
        }
        result = { success: true };
        break;
      }

      case "getKioskStatus": {
        const d = sanitizeObject(body.filters || {});
        const sessions = await base44.asServiceRole.entities.DeviceSession.filter({
          restaurant_id: d.restaurant_id, device_id: d.device_id
        });
        const session = sessions && sessions.length > 0 ? sessions[0] : null;
        result = { is_locked: session?.is_locked || false, screen_type: session?.screen_type || null };
        break;
      }

      case "getDeviceSessions": {
        const d = sanitizeObject(body.filters || {});
        const sessions = await base44.asServiceRole.entities.DeviceSession.filter({
          restaurant_id: d.restaurant_id
        });
        result = sessions.filter(s => s.device_id !== "pairing_pending" && s.is_locked);
        break;
      }

      // ─── PAYMENT GATEWAY STUB ──────────────────────────────
      case "initPayment": {
        const d = sanitizeObject(body.data);
        // Payment stub for future Stripe/Tranzila integration
        // Returns mock checkout URL — real integration will replace this
        const restaurantId = d.restaurant_id;
        const plan = d.plan || "tier_15";
        const fee = d.fee || 99;

        result = {
          success: true,
          payment_id: `pay_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
          checkout_url: null, // Will be populated with Stripe/Tranzila URL
          plan, fee,
          message: "Payment gateway adapter ready. Stripe/Tranzila integration pending.",
          // Future: return real checkout URL from Stripe/Tranzila
          // checkout_url: `https://checkout.stripe.com/...`
        };
        break;
      }

      case "upgradePlan": {
        const d = sanitizeObject(body.data);
        if (!d.restaurant_id || !d.plan) throw { status: 400, error: "Missing required fields" };

        const planFees = { free: 0, tier_15: 99, tier_30: 143, tier_unlimited: 199 };
        const fee = planFees[d.plan] || 0;

        await base44.asServiceRole.entities.Restaurant.update(d.restaurant_id, {
          subscription_plan: d.plan,
          monthly_fee: fee,
          billing_status: fee > 0 ? "active" : "trial",
          payment_gateway_id: d.payment_gateway_id || null,
        });

        result = { success: true, plan: d.plan, fee };
        break;
      }

      default: throw { status: 400, error: "Unknown action" };
    }

    return new Response(JSON.stringify(result), { status: 200, headers: hdr });
  } catch (err) {
    console.error("Register API Error:", err);
    const status = err.status || 500;
    const message = err.error || err.message || "Internal server error";
    return new Response(JSON.stringify({ error: message }), { status, headers: hdr });
  }
});
