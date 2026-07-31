# SmartTable — פלטפורמת SaaS לניהול מסעדות

## מסכים
- **Customer** — `#/c/TABLE_TOKEN` (QR scan)
- **Waiter** — `#/w/RESTAURANT_ID`
- **Manager** — `#/m/RESTAURANT_ID`
- **Admin** — `#/a/RESTAURANT_ID`
- **Super Admin** — `#/sa`

## טכנולוגיות
- HTML/CSS/JS סטטי (ללא Node.js)
- Tailwind CSS (CDN)
- Supabase (Auth + DB + Realtime)
- תמיכה ב-5 שפות (HE, EN, AR, RU, FR)
- 3 ערכות נושא (Luxury, Premium, Classic)

## ארכיטקטורה
- Multi-tenant SaaS — כל שאילתה מסוננת לפי restaurant_id
- Realtime דרך Supabase subscriptions
- כל הלוגיקה בצד לקוח (Client-side)
- פריסה אוטומטית דרך GitHub → Hostinger

## דרישות
- Supabase project עם הסכמה (database/schema.sql)
- Hostinger Shared Hosting
- GitHub repo לפריסה אוטומטית
