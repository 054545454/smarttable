# SmartTable — מסמך אפיון מלא (PRD)
## גרסה 2.0 | עדכון אחרון: 19 באוגוסט 2026

---

## 1. סקירה כללית

SmartTable היא פלטפורמת SaaS רב-משתמשת (Multi-Tenant) לניהול מסעדות. המערכת מאפשרת למסעדות לנהל תקשורת בין אורחים לצוות באמצעות QR Codes, משימות בזמן אמת, מתנות גרידה, תפריטים דיגיטליים, ודאשבורד ניהולי מלא.

**מודל עסקי:** סופר-אדמין מנהל את כל המסעדות (לקוחות). כל מסעדה מקבלת ממשק ניהול עצמאי עם חיוב חודשי ותקופת ניסיון של 90 יום.

---

## 2. ארכיטקטורה טכנית

### 2.1 Frontend
- **סוג:** Static SPA (HTML + CSS + Vanilla JS) — ללא Node.js בייצור
- **פרוס:** violet-dunlin-978279.hostingersite.com (Hostinger Shared Hosting)
- **GitHub:** https://github.com/054545454/smarttable (main → auto-deploy ל-Hostinger)
- **PWA:** manifest.json + Service Worker (sw.js) — ניתן להתקנה במובייל, תמיכה אופליין בסיסית
- **Routing:** Hash-based (#/c/TOKEN, #/w/ID, #/m/ID, #/a/ID, #/sa)

### 2.2 Backend
- **פלטפורמה:** Base44 Backend Functions (Deno.serve)
- **פונקציה ראשית:** `smarttableApi` — כל הפעולות (auth, CRUD, poll, reports, heatmap, QR, feedback, guest orders)
- **פונקציית ניקוי:** `cleanupStaleTasks` — מבטל משימות open מעל 24 שעות
- **SDK:** @base44/sdk@0.8.31
- **מצב שירות:** `base44.asServiceRole` (service role — עוקף RLS)

### 2.3 מסד נתונים
- **פלטפורמה:** Base44 Entities (MongoDB-based)
- **בידוד:** כל טבלה מכילה `restaurant_id` לבידוד מוחלט בין tenants
- **RLS:** נתמך (Row-Level Security) — משתמשים רואים רק את הנתונים שלהם

### 2.4 אבטחה
- **סיסמאות:** SHA-256 עם salt (פורמט: `h:salt:hash`)
- **הצפנה:** `crypto.subtle.digest("SHA-256", ...)` בצד שרת
- **מדיניות סיסמה:** מינימום 8 תווים, אות גדולה, אות קטנה, מספר
- **חובת החלפת סיסמה:** `must_change_password: true` למשתמשים חדשים
- **סניטציה:** כל קלט עובר sanitize (הסרת script/iframe, בריחת HTML, הגבלת 2000 תווים)
- **Rate Limiting:** 80 בקשות לדקה לכל IP
- **CORS:** פתוח לכל (`*`) — מאפשר קריאה מהסטטיק SPA

---

## 3. מסד נתונים — ישויות (Entities)

### 3.1 Restaurant
שדות: name, owner_name, email, phone_primary, phone_secondary, address, business_number, contract_number, technical_contact, notes_internal, max_tables, status (active/inactive/cancelled), subscription_plan, monthly_fee, billing_day, billing_status, billing_currency, last_billing_date, credit_card_last4, promo_active, promo_expires_at, first_login_at, last_login_at

### 3.2 AppUser
שדות: username, full_name, role (super_admin/admin/manager/waiter), restaurant_id, password_hash, pin, is_active, must_change_password

### 3.3 RestaurantSetting
שדות: restaurant_id, theme (luxury/premium/classic), primary_color, secondary_color, font_family, logo_url (base64), default_language, customer_view_mode (full_menu/service_only/minimal), operating_hours, escalation_green_minutes, escalation_orange_minutes, escalation_alert_minutes

### 3.4 RestaurantTable
שדות: restaurant_id, table_number, qr_token, is_open, scratch_used, pos_x, pos_y, notes, opened_at, guest_device_id, created_at

### 3.5 MenuItem
שדות: restaurant_id, name, description, price, category, image_url, pdf_url, is_active, sort_order

### 3.6 Gift
שדות: restaurant_id, title, description, icon, image_url, is_active

### 3.7 Shift
שדות: restaurant_id, manager_id, manager_name, started_at, ended_at, is_busy_mode

### 3.8 ShiftWaiter
שדות: shift_id, waiter_id, waiter_name, joined_at

### 3.9 Task
שדות: restaurant_id, shift_id, table_id, table_number, type (water/bill/waiter/wine_menu/dessert_menu/special/gift/adhoc), status (open/in_progress/done/cancelled), priority, created_at, claimed_at, completed_at, cancelled_at, cancelled_by, assigned_waiter_id, assigned_waiter_name, response_seconds, special_note, gift_id

### 3.10 TaskLog
שדות: restaurant_id, task_id, action, actor_id, actor_name, actor_role, note

### 3.11 BillingRecord
שדות: restaurant_id, amount, currency, period_start, period_end, due_date, paid_at, status, notes

### 3.12 ActivityLog
שדות: restaurant_id, action, actor_id, actor_role, details

### 3.13 GuestProfile
שדות: restaurant_id, guest_device_id, nickname, phone, preferred_language, allergies, dietary_prefs, favorite_dish, favorite_wine, notes, visit_count, last_visit, total_spent, is_vip

### 3.14 GuestFeedback
שדות: restaurant_id, guest_device_id, table_number, rating (1-5), comment, tags, waiter_name, is_negative, handled, handled_at, sent_to_manager

### 3.15 GuestOrder
שדות: restaurant_id, table_id, table_number, guest_device_id, guest_name, items_json, total_amount, status (open/paid), paid, paid_at, shift_id, transfer_to_guest

---

## 4. מסכי המערכת (5 Screens)

### 4.1 מסך לקוח (Customer) — `#/c/{QR_TOKEN}`
**קובץ:** `js/screens/customer.js` (719 שורות)

**כניסה:** סריקת QR Code על השולחן → פתיחת URL עם טוקן ייחודי לשולחן

**תהליך:**
1. המערכת שולפת את פרטי השולחן, המסעדה, הגדרות, מתנות פעילות, פריטי תפריט ופרופיל אורח (לפי device_id)
2. יצירת/עדכון GuestProfile אוטומטי (device_id נשמר ב-sessionStorage)
3. בדיקת scratch_used — האם המתנה כבר נחשפה

**תצוגות (Customer View Modes):**
- **full_menu:** תפריט מלא עם קטגוריות + כפתורי שירות + מתנת גרידה
- **service_only:** כפתורי שירות בלבד (ללא תפריט)
- **minimal:** תצוגה מינימלית

**רכיבי המסך:**
- **לוגו/שם מסעדה:** אם יש לוגו (base64) מוצג תמונה, אחרת שם ב-Playfair Display עם אנימציית זהב
- **תג VIP:** אם לאורח 3+ ביקורים, מוצג תג VIP עם מספר ביקורים
- **כפתור פרופיל:** עריכת כינוי, מנה אוהבת, יין אהוב, אלרגיות, העדפות תזונה
- **סומלייר AI:** כפתור להמלצת יין (placeholder למודל AI)
- **חלוקת חשבון:** העברת פריטים בין אורחים באותו שולחן

**מתנת גרידה (Scratch Gift):**
- מוצגת רק בכניסה הראשונה (scratch_used = false)
- בחירת מתנה רנדומלית מתוך המתנות הפעילות (העדפה למתנה התואמת מנה אהובה של האורח)
- Canvas overlay עם אפקט גרידה פיזי (mouse + touch)
- אנימציית confetti זהובה עם חשיפת הפרס
- נעילה לאחר חשיפה (sessionStorage + שרת)
- מנהל יכול לאפס (resetScratch)

**כפתורי שירות (6):**
| סוג | אייקון | תווית |
|-----|--------|-------|
| water | 💧 | מים |
| bill | 🧾 | חשבון |
| waiter | 🔔 | מלצר |
| wine_menu | 🍷 | תפריט יינות |
| dessert_menu | 🍔 | תפריט קינוחים |
| special | ⭐ | בקשה מיוחדת |

**לוגיקת כפתורים:**
- לחיצה → יצירת Task מסוג מתאים (עם מניעת כפילות 5 שניות בשרת + 3 שניות בקליינט)
- כפתור נעל בזמן שהמשימה פתוחה (status: open/in_progress)
- הצגת "הבקשה נשלחה ✓" עם אנימציה
- שחרור אוטומטי כשהמלצר מסמן כהושלם
- תצוגת סטטוס חי (polling כל 5 שניות למשימות פתוחות של השולחן)

**משימות פעילות:**
- הצגת כל המשימות הפתוחות של השולחן עם סטטוס (נשלח/בטיפול)
- אנימציית spring-in לכל משימה חדשה

**משוב אורח:**
- כפתור משוב → דירוג 1-5 כוכבים + תגיות + טקסט חופשי
- דירוג 1-2 מסומן אוטומטית כשלילי ונשלח למנהל

---

### 4.2 מסך מלצר (Waiter) — `#/w/{RESTAURANT_ID}`
**קובץ:** `js/screens/waiter.js` (168 שורות)

**כניסה:** שם חופשי + מזהה מסעדה → מצטרף למשמרת הפעילה האחרונה

**תהליך:**
1. הזנת שם פרטי
2. חיפוש משמרת פתוחה (ended_at: null) — אם אין, הודעת שגיאה
3. יצירת ShiftWaiter (שיוך למשמרת)
4. שמירת session ב-sessionStorage

**תצוגה:**
- **Header:** שם המלצר + מונה משימות + כפתור Fullscreen
- **רשימת משימות ממוזגת:** משימות מאותו שולחן מתמזגות לכרטיס אחד
  - מיזוג לפי table_id/table_number
  - הצגת אייקונים + תוויות של כל סוגי הבקשות (מופרדים ב-+)
  - זמן מתחילת הבקשה הראשונה
- **צבעי דחיפות (Escalation):**
  - 🟢 ירוק: 0-2 דקות (escalation_green_minutes)
  - 🟠 כתום: 2-4 דקות (escalation_orange_minutes)
  - 🔴 אדום: 4+ דקות (escalation_alert_minutes)
  - אנימציית flash כשעובר את סף האדום
- **פעולות:**
  - **קח משימה (Claim):** סימון in_progress + שם המלצר + חישוב response_seconds
  - **השלם משימה (Complete):** סימון done על כל המשימות בכרטיס הממוזג
  - **ביטול משימה:** רק מנהל יכול לבטל
- **Wake Lock:** מונע כיבוי מסך (רלוונטי למסכי צוות תלויי-קבע)
- **Polling:** עדכון משימות כל 5 שניות
- **מצב עומס (Busy Mode):** כשמופעל ע"י מנהל, כל המשימות מוצגות לכל המלצרים (ללא הקצאה)

---

### 4.3 מסך מנהל משמרת (Manager) — `#/m/{RESTAURANT_ID}`
**קובץ:** `js/screens/manager.js` (459 שורות)

**כניסה:** PIN בן 4 ספרות → אימות מול AppUser (role: manager, pin matching, is_active)

**תצוגה — לפי מצב משמרת:**

**אין משמרת פעילה:**
- כפתור "פתח משמרת" → יצירת Shift עם manager_id, manager_name, started_at
- ללא גישה לפעולות ניהול

**משמרת פעילה:**
- **Header:** שם מנהל + סטטוס משמרת + כפתור יציאה
- **סטטיסטיקות מהירות:**
  - משימות פתוחות (מספר)
  - דחופות (אדומות)
  - מלצרים במשמרת (מספר)
- **סיכום משמרת:**
  - סה"כ משימות, הושלמו, בוטלו
- **מצב עומס (Busy Mode):** טוגל on/off
- **כפתור "סגור משמרת"** (אדום) → סגירת משמרת (ended_at = now)
- **ניהול שולחנות:**
  - רשימת שולחנות עם סטטוס (פתוח/סגור)
  - כפתור "פתח הכל" → פתיחת כל השולחנות
  - לחיצה על שולחן → toggle פתוח/סגור
  - כפתור reset scratch (איפוס מתנת גרידה לשולחן)
- **רשימת משימות (ממוזגת):**
  - כרטיסים ממוזגים לפי שולחן (כמו מסך מלצר)
  - אפשרות הקצאת מלצר (dropdown)
  - אפשרות ביטול משימה (✖)
- **כפתורי פעולה:**
  - 📊 משמרת — פרטי משמרת מלאים
  - 🔥 מפת חום (Heatmap) — מפה ויזואלית של שולחנות עם זמני המתנה
  - ➕ משימה — יצירת משימה ידנית (בחירת שולחן + סוג + הערה)
  - ⭐ משוב — צפייה במשוב אורחים (סינון שליליים)
- **מלצרים במשמרת:** רשימה עם סטטיסטיקות (הושלמו, פעילות, זמן תגובה)
- **Wake Lock:** פעיל

---

### 4.4 מסך מנהל מסעדה (Admin) — `#/a/{RESTAURANT_ID}`
**קובץ:** `js/screens/admin.js` (1232 שורות)

**כניסה:** שם משתמש + סיסמה → אימות מול AppUser (role: admin)
- חובת שינוי סיסמה בכניסה ראשונה (must_change_password)
- מדיניות סיסמה: 8+ תווים, אות גדולה, אות קטנה, מספר

**טאבים:**

#### טאב 1: דאשבורד 📊
- סטטיסטיקות: שולחנות, פריטי תפריט, מתנות פעילות, תמה נוכחית
- שם המסעדה, בעלים, סטטוס חיוב, תקופת ניסיון

#### טאב 2: שולחנות 🪑
- **Floor Plan ויזואלי:** גריד של שולחנות ניתן לגרירה (drag-and-drop)
- מיקום נשמר: pos_x, pos_y
- יצירת שולחן חדש עם QR Token אוטומטי
- כל שולחן: מספר, סטטוס (פתוח/סגור), הערות
- **QR Code:** יצירה + הורדה + הדפסה לכל שולחן
- מחיקת שולחן

#### טאב 3: הגדרות ⚙️
- **תמה פעילה:** Luxury / Premium / Classic
  - Luxury: שחור (#1A1A1A) + זהב (#C9A84C) + Playfair Display
  - Premium: לבן (#FFFFFF) + זהב (#C9A84C)
  - Classic: חם (#F5F0E8) + חום (#B8860B)
  - תצוגה מקדימה חיה בעת בחירה
- **לוגו:** העלאת תמונה → דחיסה client-side ל-300px base64 → שמירה ב-RestaurantSetting.logo_url
- **מצב תצוגת לקוח:** full_menu / service_only / minimal
- **הגדרות אסקלציה:** ירוק (דק'), כתום (דק'), אדום (דק')
- **שפת ברירת מחדל:** עברית / אנגלית / ערבית / רוסית / צרפתית
- **פונט:** Playfair Display / Sans Serif / Serif

#### טאב 4: תפריט 📋
- **CRUD מלא של פריטי תפריט:**
  - שם, תיאור, מחיר, קטגוריה, תמונה (URL), קובץ PDF (URL)
  - סטטוס פעיל/לא פעיל
  - סדר תצוגה (sort_order)
- חיפוש וסינון לפי קטגוריה
- תמיכה בהעלאת תפריט PDF/Word

#### טאב 5: מתנות 🎁
- **CRUD מלא של מתנות:**
  - כותרת, תיאור, אייקון (emoji), תמונה (URL)
  - סטטוס פעיל/לא פעיל
- הגדרת רשימת מתנות שיופיעו רנדומלית בגרידת הלקוח

#### טאב 6: דוחות 📈
- **נתונים מזמן אמת מה-backend (getReports):**
  - סה"כ משימות, הושלמו, בוטלו, פתוחות
  - אחוז השלמה (completion rate)
  - זמני תגובה: מינ', ממוצע, מקס'
  - **לפי סוג:** כמות, הושלמו, בוטלו, פתוחות, זמן תגובה ממוצע — עם גרף עמודות
  - **לפי שולחן:** מספר משימות לכל שולחן
  - **לפי שעה:** גרף עמודות של פעילות לפי שעה ביום
  - **היום:** משימות היום, הושלמו היום

#### Setup Wizard (רק אם אין הגדרות)
- אשף ראשוני: בחירת תמה, העלאת לוגו, מצב תצוגה, הגדרת אסקלציה

---

### 4.5 מסך סופר-אדמין (Super Admin) — `#/sa`
**קובץ:** `js/screens/superadmin.js` (748 שורות)

**כניסה:** שם משתמש + סיסמה → אימות מול AppUser (role: super_admin)

**טאבים:**

#### טאב 1: דאשבורד גלובלי 📊
- סה"כ מסעדות, פעילות, בניסיון, בחיוב, בוטלו
- רשימת 5 המסעדות האחרונות שנוספו
- סטטיסטיקות גלובליות

#### טאב 2: ניהול לקוחות 🏢
- **רשימת כל המסעדות** עם חיפוש
- כרטיס לכל מסעדה: שם, בעלים, סטטוס, תאריך יצירה
- **יצירת לקוח חדש** (טופס מלא):
  - פרטי מסעדה: שם, בעלים, אימייל, טלפון, כתובת, ע"ח, מספר חוזה
  - מספר שולחנות מקסימלי
  - יצירה אוטומטית: Restaurant + RestaurantSetting (Luxury) + AppUser (admin) + 10 שולחנות עם QR
  - שליחת אימייל ברוכים הבאים עם פרטי כניסה (Gmail connector)
  - סיסמה ראשונית רנדומלית (עומדת במדיניות)
- **צפייה בפרטי לקוח:** סטטיסטיקות, שולחנות, חיוב
- **מחיקת לקוח:** מחיקת כל הנתונים הקשורים (cascade delete של 14 טבלאות)

#### טאב 3: חיוב 💰
- **רשימת כל המסעדות** עם סטטוס חיוב
- חישוב סטטוס: active / trial / overdue / cancelled
- ימים מאז חיוב אחרון
- **פעולות:**
  - סימון תשלום (paid)
  - הפעלת ניסיון (promo_active + promo_expires_at = 90 יום)
  - השעיית חשבון (status: inactive)
- **BillingRecord:** יצירת רשומות חיוב חודשיות

#### טאב 4: זמן אמת ⚡
- תצוגת כל המסעדות עם משימות פתוחות בזמן אמת
- Heatmap גלובלי

---

## 5. Backend Functions — פעולות (Actions)

### 5.1 smarttableApi (ראשי)

| Action | תיאור |
|--------|-------|
| `auth` | אימות: super_admin (username+password), admin (username+password+restaurantId), manager (pin+restaurantId) |
| `changePassword` | שינוי סיסמה עם מדיניות אבטחה |
| `createClient` | יצירת מסעדה חדשה + הגדרות + admin + שולחנות + אימייל ברוכים הבאים |
| `select` | שליפת נתונים עם פילטרים וסורטינג |
| `insert` | הכנסת רשומה עם מניעת כפילות (5 שנ' למשימות) |
| `update` | עדכון רשומה |
| `deleteClient` | מחיקת מסעדה + כל הנתונים הקשורים (cascade) |
| `delete` | מחיקת רשומה בודדת |
| `getByQr` | שליפת נתוני לקוח לפי QR token (שולחן, מסעדה, הגדרות, מתנות, תפריט, פרופיל) |
| `poll` | עדכון זמן אמת: משימות פתוחות, שולחנות, משמרת, מלצרים + ניקוי אוטו' של משימות 24ש' |
| `getReports` | דוחות: סה"כ, הושלמו, בוטלו, זמני תגובה, לפי סוג/שולחן/שעה, אחוז השלמה |
| `generateTableQr` | יצירת שולחן חדש עם QR token |
| `updateTablePosition` | עדכון מיקום שולחן (pos_x, pos_y) |
| `saveGuestProfile` | יצירה/עדכון פרופיל אורח (device_id, העדפות, מונה ביקורים, VIP) |
| `saveFeedback` | שמירת משוב אורח (rating, comment, tags, is_negative) |
| `getFeedback` | שליפת משוב (עם סינון שליליים) |
| `handleFeedback` | סימון משוב כטופל |
| `saveGuestOrder` | יצירת הזמנת אורח (items, total, status) |
| `getGuestOrders` | שליפת הזמנות פתוחות לפי שולחן |
| `transferOrderItem` | העברת פריט בין אורחים באותו שולחן |
| `payGuestOrder` | סימון הזמנה כשולמה |
| `getHeatmap` | מפת חום: זמני המתנה לכל שולחן + רמת דחיפות |
| `getWaiterStats` | סטטיסטיקות מלצרים: משימות פעילות, שולחנות מוקצים |

### 5.2 cleanupStaleTasks
- מבטל משימות open מעל 24 שעות
- פעולה: קריאת כל ה-open, סינון לפי created_at, עדכון ל-cancelled
- רץ אוטומטית ב-workflow היומי

---

## 6. אוטומציות ו-Workflows

### 6.1 SmartTable Daily Review (v2.0)
- **טריגר:** כל יום ב-09:00 (Asia/Jerusalem)
- **שלב 1:** קריאה ל-`cleanupStaleTasks` (ניקוי משימות ישנות)
- **שלב 2:** הפעלת Agent (Solas) עם פרומפט:
  - בדיקת בריאות כל 5 המסכים (Browserbase)
  - ניקוי קוד מת (פונקציות שלא נקראות, קבצים מיותרים)
  - בדיקת backend (test_backend_function)
  - חיפוש סקילים רלוונטיים בחנות
  - דוח יומי קצר ל-Uriel ב-Telegram (מילים בלבד, בלי צילומי מסך)

---

## 7. ריבוי שפות (i18n)
**קובץ:** `js/i18n.js` (274 שורות)

שפות נתמכות: עברית (he), אנגלית (en), ערבית (ar), רוסית (ru), צרפתית (fr)
- שפת ברירת מחדל: עברית
- כל טקסט במערכת עובר דרך `t('key')` לתרגום
- כיוון RTL עבור עברית וערבית

---

## 8. עיצוב ותמות (Theme Engine)
**קובץ:** `css/styles.css` (453 שורות) + `js/config.js`

### 8.1 תמות
| תמה | רקע | כרטיס | צבע עיקרי | טקסט | פונט |
|------|------|-------|-----------|------|------|
| Luxury | #1A1A1A | #2A2A2A | #C9A84C (זהב) | #E5D5A8 | Playfair Display |
| Premium | #FFFFFF | #FAFAFA | #C9A84C (זהב) | #1A1A1A | Sans Serif |
| Classic | #F5F0E8 | #FFFFFF | #B8860B (חום) | #3A2A1A | Serif |

### 8.2 אנימציות
- `animate-spring-in` — כניסה עם spring
- `animate-spring-bounce` — קפיצה
- `spring-scale` — סקייל בלחיצה
- `escalation-flash` — מצמוץ אדום
- `gold-shine` — ברק זהב
- `screen-enter` — מעבר מסך
- `confetti` — קונפטי זהב (40 חלקיקים)

### 8.3 CSS Variables
התמה מוחלת דרך CSS Variables (--bg, --card, --accent, --text, --border) שמשתנים דינמית לפי התמה הפעילה.

---

## 9. PWA (Progressive Web App)
**קבצים:** `manifest.json` + `sw.js`

- **manifest.json:** שם, אייקונים, צבע נושא, תצוגת standalone
- **sw.js:** Service Worker ל-cache בסיסי (offline support)
- **התקנה:** ניתן להתקין במובייל כאפליקציה
- **Wake Lock:** מונע כיבוי מסך במסכי מלצר/מנהל

---

## 10. מניעת כפילויות
- **שרת (5 שניות):** ב-`insert` ל-tasks, בודק אם יש משימה open/in_progress עם אותו table_id + type ב-5 השניות האחרונות
- **קליינט (3 שניות):** נעילת כפתור בצד הלקוח ל-3 שניות לאחר לחיצה
- **קונפטי:** מופעל פעם אחת בלבד לכניסה

---

## 11. אינטגרציות
- **Gmail Connector:** שליחת אימייל ברוכים הבאים למסעדות חדשות (כולל פרטי כניסה + קישור)
- **Browserbase:** בדיקות אוטומטיות של מסכים בסקירה היומית
- **Telegram:** שליחת דוחות יומיים ל-Uriel

---

## 12. נתונים טכניים

### גדלי קבצים
| קובץ | שורות | תיאור |
|------|-------|-------|
| admin.js | 1,232 | מסך מנהל מסעדה (הגדול ביותר) |
| superadmin.js | 748 | מסך סופר-אדמין |
| customer.js | 719 | מסך לקוח |
| manager.js | 459 | מסך מנהל משמרת |
| waiter.js | 168 | מסך מלצר |
| styles.css | 453 | סטיילים |
| i18n.js | 274 | תרגומים |
| auth.js | 199 | אימות |
| utils.js | 212 | עזרים |
| supabase.js | 129 | תקשורת backend |
| app.js | 116 | ראוטר ראשי |
| config.js | 28 | הגדרות |
| smarttableApi.ts | ~580 | Backend ראשי |
| cleanupStaleTasks.ts | ~67 | ניקוי משימות |
| **סה"כ** | **~5,500** | |

### כתובות
- **אתר:** https://violet-dunlin-978279.hostingersite.com
- **GitHub:** https://github.com/054545454/smarttable
- **Backend API:** https://solas-48957418.base44.app/functions/smarttableApi
- **מסעדת ברירת מחדל:** 6a6c59439d192d6bfbf726e5

---

## 13. הצעות עתידיות (לא מומשו עדיין)
- הזמנת מנות מהתפריט (order to kitchen)
- תשלום אונליין (Stripe/Wix Payments)
- אינטגרציה עם POS
- אפליקציית Android (TWA)
- סומלייה AI (המלצת יין לפי מנה)
- ניתוח PDF/Word אוטומטי ליצירת תפריט
- דוחות מתקדמים (trends, heatmap היסטורי)
- התראות Push למלצרים
- תמיכה ב-multi-language menu (תפריט במספר שפות)
