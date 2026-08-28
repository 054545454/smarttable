// SmartTable Configuration
const CONFIG = {
  api: {
    url: 'https://veda-0596d020.base44.app/functions/smarttableApi',
    registerUrl: 'https://veda-0596d020.base44.app/functions/smarttableRegister',
    pairingUrl: 'https://veda-0596d020.base44.app/functions/smarttablePairing',
  },
  app: {
    name: 'SmartTable',
    version: '2.0.0',
    defaultLanguage: 'he',
    supportedLanguages: ['he', 'en', 'ar', 'ru', 'fr'],
    siteUrl: 'https://violet-dunlin-978279.hostingersite.com',
  },
  themes: {
    luxury: { name: 'לוקסורי', bg: '#1A1A1A', card: '#2A2A2A', accent: '#C9A84C', text: '#E5D5A8' },
    premium: { name: 'פרימיום', bg: '#FFFFFF', card: '#FAFAFA', accent: '#C9A84C', text: '#1A1A1A' },
    classic: { name: 'קלאסי', bg: '#F5F0E8', card: '#FFFFFF', accent: '#B8860B', text: '#3A2A1A' },
  },
  taskTypes: {
    water: { icon: '💧', label: 'מים', label_en: 'Water' },
    bill: { icon: '🧾', label: 'חשבון', label_en: 'Bill' },
    waiter: { icon: '🔔', label: 'מלצר', label_en: 'Waiter' },
    wine_menu: { icon: '🍷', label: 'תפריט יינות', label_en: 'Wine Menu' },
    dessert_menu: { icon: '🍰', label: 'תפריט קינוחים', label_en: 'Dessert Menu' },
    special: { icon: '⭐', label: 'בקשה מיוחדת', label_en: 'Special Request' },
    gift: { icon: '🎁', label: 'מתנה', label_en: 'Gift' },
    adhoc: { icon: '📋', label: 'אחר', label_en: 'Other' },
  },
  pricing: {
    tiers: [
      { id: 'free', name: 'Free', minTables: 1, maxTables: 5, fee: 0 },
      { id: 'tier_15', name: 'Starter', minTables: 6, maxTables: 15, fee: 99 },
      { id: 'tier_30', name: 'Professional', minTables: 16, maxTables: 30, fee: 143 },
      { id: 'tier_unlimited', name: 'Unlimited', minTables: 31, maxTables: 999, fee: 199 },
    ],
  },
  escalationDefaults: { green: 2, orange: 4, red: 5 },
};
