# SmartTable Migration Instructions
# Source: uidesign68@gmail.com (solas-48957418)
# Target: Smartable1000@gmail.com
# Date: 2026-08-24

## סדר הפעולות:

### 1. יצירת 16 Entities (לא כולל User — זה מובנה)
עבור כל entity ב-entities/ — צור עם manage_entity_schemas (action: create):
- Restaurant
- AppUser
- RestaurantSetting
- RestaurantTable
- Gift
- MenuItem
- Shift
- ShiftWaiter
- Task
- TaskLog
- BillingRecord
- ActivityLog
- GuestProfile
- GuestFeedback
- GuestOrder
- DeviceSession

### 2. פריסת Backend Functions
- Deploy smarttableApi.ts (744 lines) — ה-API הראשי
- Deploy smarttableRegister.ts (234 lines) — הרשמה + Kiosk lock
- הקוד נמצא ב-functions/

### 3. חיבור Gmail Connector
- חבר Gmail דרך Smartable1000@gmail.com
- עדכן את כתובת השולח ב-smarttableRegister.ts (שורת From:)

### 4. ייבוא נתונים
- ייבא את הנתונים מ-data/ לכל entity עם create_entity_records
- סדר חשוב: Restaurant → AppUser → RestaurantSetting → RestaurantTable → Gift → Shift → ShiftWaiter → Task → GuestProfile

### 5. עדכון config.js
- שנה את כתובות ה-API לחשבון החדש
- דחוף ל-GitHub (054545454/smarttable)

### הערות חשובות:
- restaurant_id ישתנה בחשבון החדש (IDs חדשים)
- יש למפות restaurant_id ישן → חדש ולעדכן את כל הרשומות המקושרות
- AppUser.restaurant_id, RestaurantSetting.restaurant_id, RestaurantTable.restaurant_id, etc.
- Shift.manager_id ו-ShiftWaiter.shift_id גם צריכים מיפוי
- Task.table_id גם צריך מיפוי
