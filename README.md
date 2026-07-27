# SmartTable 🍽️

מערכת ניהול שירות מסעדה — SaaS מולטי-טננט

## מסכים

| מסך | URL | גישה |
|-----|-----|------|
| Super Admin | /superadmin | user: superadmin / pass: SmartTable2024! |
| Admin מסעדה | /admin | user+pass שהוגדרו ב-Super Admin |
| מלצרים | /waiter | פתוח ללא סיסמה |
| אחמ"ש | /manager | PIN שהנפקת ב-Admin |
| לקוח | /customer/[token] | QR code מהשולחן |

## הגדרה ראשונה

### 1. מלא .env.local
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://yoqzlfztophwofjdtrhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
\`\`\`

### 2. הרץ SQL ב-Supabase SQL Editor
הרץ את קובץ database/schema.sql

### 3. בשרת Hostinger
\`\`\`bash
cd ~/domains/violet-dunlin-978279.hostingersite.com/public_html
# העתק את תוכן הפרויקט לכאן
npm install
npm run build
npm start
\`\`\`

### 4. הוסף לקוח ראשון
כנס ל-/superadmin והוסף את המסעדה הראשונה

## סטאק
- Next.js 14 App Router
- Supabase (Database + Realtime)
- Framer Motion (אנימציות)
- Tailwind CSS + 3 themes
- TypeScript
