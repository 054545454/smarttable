'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getTheme } from '@/lib/themes'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import type { Restaurant, RestaurantSettings, RestaurantTable, Gift, MenuItem, User, Task } from '@/types'

export default function AdminPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [admin, setAdmin] = useState<User | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [gifts, setGifts] = useState<Gift[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [waiters, setWaiters] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tab, setTab] = useState<'dashboard' | 'settings' | 'tables' | 'gifts' | 'menu' | 'staff' | 'reports'>('dashboard')
  const [isSetupWizard, setIsSetupWizard] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [newGift, setNewGift] = useState({ title: '', description: '', icon: '🎁' })
  const [newWaiter, setNewWaiter] = useState('')
  const [newPin, setNewPin] = useState('')

  async function login() {
    const { data } = await supabase.from('users').select('*, restaurants(*)').eq('username', username).eq('role', 'admin').eq('is_active', true).single()
    if (!data) { toast.error('שם משתמש או סיסמה שגויים'); return }
    setAdmin(data)
    const rest = (data as any).restaurants
    setRestaurant(rest)
    if (rest) {
      loadRestaurantData(rest.id)
      await supabase.from('restaurants').update({ last_login_at: new Date().toISOString(), first_login_at: rest.first_login_at || new Date().toISOString() }).eq('id', rest.id)
      if (!rest.first_login_at) setIsSetupWizard(true)
    }
  }

  async function loadRestaurantData(rid: string) {
    const [s, t, g, m, w, tasks] = await Promise.all([
      supabase.from('restaurant_settings').select('*').eq('restaurant_id', rid).single(),
      supabase.from('restaurant_tables').select('*').eq('restaurant_id', rid).order('table_number'),
      supabase.from('gifts').select('*').eq('restaurant_id', rid),
      supabase.from('menu_items').select('*').eq('restaurant_id', rid).order('sort_order'),
      supabase.from('users').select('*').eq('restaurant_id', rid).eq('role', 'waiter'),
      supabase.from('tasks').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(100)
    ])
    setSettings(s.data)
    setTables(t.data || [])
    setGifts(g.data || [])
    setMenuItems(m.data || [])
    setWaiters(w.data || [])
    setTasks(tasks.data || [])
  }

  async function saveSettings(updates: Partial<RestaurantSettings>) {
    if (!settings) return
    await supabase.from('restaurant_settings').update(updates).eq('id', settings.id)
    setSettings({ ...settings, ...updates })
    toast.success('הגדרות נשמרו')
  }

  async function createTables(count: number) {
    if (!restaurant) return
    const existing = tables.map(t => t.table_number)
    const newTables = []
    for (let i = 1; i <= count; i++) {
      if (!existing.includes(i)) newTables.push({ restaurant_id: restaurant.id, table_number: i })
    }
    if (newTables.length > 0) {
      await supabase.from('restaurant_tables').insert(newTables)
      loadRestaurantData(restaurant.id)
    }
    toast.success(`${newTables.length} שולחנות נוצרו`)
  }

  async function downloadQR(table: RestaurantTable) {
    const url = `${window.location.origin}/customer/${table.qr_token}`
    const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `table-${table.table_number}.png`
    a.click()
    toast.success(`QR לשולחן ${table.table_number} הורד`)
  }

  async function addGift() {
    if (!restaurant || !newGift.title) return
    await supabase.from('gifts').insert({ restaurant_id: restaurant.id, ...newGift })
    setNewGift({ title: '', description: '', icon: '🎁' })
    loadRestaurantData(restaurant.id)
    toast.success('מתנה נוספה')
  }

  async function deleteGift(id: string) {
    await supabase.from('gifts').delete().eq('id', id)
    loadRestaurantData(restaurant!.id)
  }

  async function addWaiter() {
    if (!restaurant || !newWaiter) return
    await supabase.from('users').insert({ restaurant_id: restaurant.id, role: 'waiter', full_name: newWaiter, is_active: true })
    setNewWaiter('')
    loadRestaurantData(restaurant.id)
    toast.success('מלצר נוסף')
  }

  async function generateManagerPin() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    setNewPin(pin)
  }

  async function askAI() {
    if (!aiQuestion || !restaurant) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion, restaurantId: restaurant.id })
      })
      const data = await res.json()
      setAiAnswer(data.answer)
    } catch {
      setAiAnswer('שגיאה בתקשורת עם ה-AI')
    }
    setAiLoading(false)
  }

  // Stats
  const doneTasks = tasks.filter(t => t.status === 'done')
  const avgResponse = doneTasks.length > 0
    ? Math.round(doneTasks.filter(t => t.response_seconds).reduce((s, t) => s + (t.response_seconds || 0), 0) / doneTasks.filter(t => t.response_seconds).length)
    : 0

  const theme = settings ? getTheme(settings.theme) : getTheme('luxury')

  if (!admin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-gold-500/30 rounded-2xl p-8 w-80">
          <h1 className="font-playfair text-gold-400 text-2xl text-center mb-6">כניסת אדמין</h1>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="שם משתמש"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white mb-3 outline-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="סיסמה"
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white mb-4 outline-none" />
          <button onClick={login} className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-xl font-playfair">
            כניסה
          </button>
        </motion.div>
      </div>
    )
  }

  const tabs = [
    { key: 'dashboard', label: '📊 דשבורד' },
    { key: 'settings', label: '🎨 עיצוב' },
    { key: 'tables', label: '🪑 שולחנות' },
    { key: 'gifts', label: '🎁 מתנות' },
    { key: 'menu', label: '🍷 תפריט' },
    { key: 'staff', label: '👥 צוות' },
    { key: 'reports', label: '📈 דוחות' },
  ]

  return (
    <div className={`min-h-screen ${theme.bg}`} dir="rtl">
      {/* Header */}
      <div className={`${theme.surface} border-b ${theme.border} px-4 py-3 flex items-center justify-between`}>
        <div>
          <h1 className={`font-playfair ${theme.text} text-lg`}>{restaurant?.name}</h1>
          <p className={`text-xs ${theme.textMuted}`}>פאנל ניהול</p>
        </div>
        <button onClick={() => { setAdmin(null); setRestaurant(null) }}
          className={`text-xs px-3 py-1 rounded-full ${theme.btnSecondary}`}>יציאה</button>
      </div>

      {/* Tabs */}
      <div className={`flex overflow-x-auto border-b ${theme.border} ${theme.surface}`}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? `${theme.text} border-b-2 border-current` : theme.textMuted}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'שולחנות פעילים', value: tables.filter(t => t.is_open).length },
                { label: 'משימות היום', value: tasks.length },
                { label: 'זמן תגובה ממוצע', value: avgResponse > 0 ? `${Math.floor(avgResponse/60)}:${(avgResponse%60).toString().padStart(2,'0')}` : 'N/A' },
                { label: 'מלצרים', value: waiters.length },
              ].map(stat => (
                <div key={stat.label} className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
                  <p className={`text-xs ${theme.textMuted}`}>{stat.label}</p>
                  <p className={`text-2xl font-bold ${theme.text}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* AI Chat */}
            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} font-semibold mb-3`}>🤖 שאל את ה-AI</h3>
              <div className="flex gap-2">
                <input value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askAI()}
                  placeholder="לדוגמה: מתי כדאי להוסיף מלצר?"
                  className={`flex-1 bg-transparent border ${theme.border} rounded-lg px-3 py-2 text-sm ${theme.textBody} outline-none`} />
                <button onClick={askAI} disabled={aiLoading}
                  className={`px-4 py-2 rounded-lg text-sm ${theme.btn} disabled:opacity-50`}>
                  {aiLoading ? '...' : 'שאל'}
                </button>
              </div>
              {aiAnswer && (
                <div className={`mt-3 p-3 ${theme.card} rounded-lg text-sm ${theme.textBody}`}>
                  {aiAnswer}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && settings && (
          <div className="space-y-4">
            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} mb-4`}>ערכת עיצוב</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['luxury', 'premium', 'classic'] as const).map(t => (
                  <button key={t} onClick={() => saveSettings({ theme: t })}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${settings.theme === t ? 'border-gold-400 bg-gold-400/10' : 'border-zinc-700'}`}>
                    {t === 'luxury' ? '👑 יוקרה' : t === 'premium' ? '✨ פרימיום' : '🍽 קלאסי'}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} mb-4`}>פונט</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['Playfair Display', 'Cormorant Garamond', 'Lato'] as const).map(f => (
                  <button key={f} onClick={() => saveSettings({ font_family: f })}
                    className={`py-3 rounded-xl border-2 text-sm transition-all ${settings.font_family === f ? 'border-gold-400' : 'border-zinc-700'}`}>
                    {f.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} mb-4`}>זמני Escalation (דקות)</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'escalation_green_minutes', label: '🟢 ירוק→כתום' },
                  { key: 'escalation_orange_minutes', label: '🟠 כתום→אדום' },
                  { key: 'escalation_alert_minutes', label: '🚨 התראה' },
                ].map(field => (
                  <div key={field.key}>
                    <label className={`text-xs ${theme.textMuted} block mb-1`}>{field.label}</label>
                    <input type="number"
                      value={(settings as any)[field.key]}
                      onChange={e => saveSettings({ [field.key]: parseInt(e.target.value) } as any)}
                      className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tables */}
        {tab === 'tables' && (
          <div className="space-y-4">
            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} mb-3`}>צור שולחנות</h3>
              <div className="flex gap-2">
                <input type="number" id="tableCount" placeholder="כמות שולחנות"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" />
                <button onClick={() => createTables(parseInt((document.getElementById('tableCount') as HTMLInputElement).value))}
                  className={`px-4 py-2 rounded-lg ${theme.btn}`}>צור</button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {tables.map(table => (
                <div key={table.id} className={`${theme.surface} border ${theme.border} rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${theme.text}`}>{table.table_number}</p>
                  <button onClick={() => downloadQR(table)}
                    className={`mt-2 w-full text-xs py-1.5 rounded-lg ${theme.btn}`}>
                    ⬇ QR
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gifts */}
        {tab === 'gifts' && (
          <div className="space-y-4">
            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} mb-3`}>הוסף מתנה</h3>
              <div className="space-y-2">
                <input value={newGift.icon} onChange={e => setNewGift(p => ({ ...p, icon: e.target.value }))}
                  placeholder="אייקון (emoji)" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center text-2xl" />
                <input value={newGift.title} onChange={e => setNewGift(p => ({ ...p, title: e.target.value }))}
                  placeholder="שם המתנה" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" />
                <input value={newGift.description} onChange={e => setNewGift(p => ({ ...p, description: e.target.value }))}
                  placeholder="תיאור (אופציונלי)" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" />
                <button onClick={addGift} className={`w-full py-2 rounded-lg ${theme.btn}`}>הוסף מתנה</button>
              </div>
            </div>
            <div className="space-y-2">
              {gifts.map(gift => (
                <div key={gift.id} className={`${theme.surface} border ${theme.border} rounded-xl p-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{gift.icon}</span>
                    <div>
                      <p className={`font-medium ${theme.textBody}`}>{gift.title}</p>
                      {gift.description && <p className={`text-xs ${theme.textMuted}`}>{gift.description}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteGift(gift.id)} className="text-red-400 text-sm px-2 py-1 rounded-lg bg-red-500/10">מחק</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff */}
        {tab === 'staff' && (
          <div className="space-y-4">
            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} mb-3`}>הוסף מלצר</h3>
              <div className="flex gap-2">
                <input value={newWaiter} onChange={e => setNewWaiter(e.target.value)}
                  placeholder="שם מלא" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" />
                <button onClick={addWaiter} className={`px-4 py-2 rounded-lg ${theme.btn}`}>הוסף</button>
              </div>
            </div>
            <div className="space-y-2">
              {waiters.map(w => (
                <div key={w.id} className={`${theme.surface} border ${theme.border} rounded-xl p-3 flex items-center justify-between`}>
                  <span className={theme.textBody}>{w.full_name}</span>
                  <button onClick={async () => { await supabase.from('users').update({ is_active: false }).eq('id', w.id); loadRestaurantData(restaurant!.id) }}
                    className="text-red-400 text-sm px-2 py-1 rounded-lg bg-red-500/10">הסר</button>
                </div>
              ))}
            </div>
            <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
              <h3 className={`${theme.font} ${theme.text} mb-3`}>הנפק PIN לאחמ"ש</h3>
              <button onClick={generateManagerPin} className={`w-full py-2 rounded-lg ${theme.btn} mb-3`}>הנפק PIN</button>
              {newPin && <p className={`text-center text-3xl font-mono font-bold ${theme.text}`}>{newPin}</p>}
            </div>
          </div>
        )}

        {/* Reports */}
        {tab === 'reports' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
                <p className={`text-xs ${theme.textMuted}`}>סה"כ משימות</p>
                <p className={`text-3xl font-bold ${theme.text}`}>{tasks.length}</p>
              </div>
              <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
                <p className={`text-xs ${theme.textMuted}`}>הושלמו</p>
                <p className={`text-3xl font-bold ${theme.text}`}>{doneTasks.length}</p>
              </div>
              <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
                <p className={`text-xs ${theme.textMuted}`}>זמן ממוצע</p>
                <p className={`text-3xl font-bold ${theme.text}`}>
                  {avgResponse > 0 ? `${Math.floor(avgResponse/60)}:${(avgResponse%60).toString().padStart(2,'0')}` : '-'}
                </p>
              </div>
              <div className={`${theme.surface} border ${theme.border} rounded-xl p-4`}>
                <p className={`text-xs ${theme.textMuted}`}>שולחנות</p>
                <p className={`text-3xl font-bold ${theme.text}`}>{tables.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
