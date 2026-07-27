'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import type { Restaurant, BillingRecord } from '@/types'

const SUPER_ADMIN_USER = 'superadmin'
const SUPER_ADMIN_PASS = 'SmartTable2024!'

export default function SuperAdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [billing, setBilling] = useState<BillingRecord[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'clients' | 'billing' | 'add'>('clients')
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const [newClient, setNewClient] = useState({
    name: '', owner_name: '', business_number: '', phone_primary: '', phone_secondary: '',
    email: '', address: '', contract_number: '', technical_contact: '', notes_internal: '',
    max_tables: 20, billing_amount: 0, billing_day: 1
  })
  const [newUser, setNewUser] = useState({ username: '', password: '' })

  function login() {
    if (u === SUPER_ADMIN_USER && p === SUPER_ADMIN_PASS) {
      setLoggedIn(true)
      loadData()
    } else toast.error('פרטים שגויים')
  }

  async function loadData() {
    const [r, b] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('billing_records').select('*').order('due_date', { ascending: false })
    ])
    setRestaurants(r.data || [])
    setBilling(b.data || [])
  }

  async function addClient() {
    const { data: rest } = await supabase.from('restaurants').insert(newClient).select().single()
    if (!rest) { toast.error('שגיאה'); return }

    // Create default settings
    await supabase.from('restaurant_settings').insert({ restaurant_id: rest.id })

    // Create admin user
    await supabase.from('users').insert({
      restaurant_id: rest.id, role: 'admin',
      full_name: newClient.owner_name, username: newUser.username,
      password_hash: newUser.password, is_active: true
    })

    toast.success(`${newClient.name} נוסף בהצלחה!`)
    setNewClient({ name: '', owner_name: '', business_number: '', phone_primary: '', phone_secondary: '', email: '', address: '', contract_number: '', technical_contact: '', notes_internal: '', max_tables: 20, billing_amount: 0, billing_day: 1 })
    loadData()
    setTab('clients')
  }

  async function activatePromo(rid: string) {
    const expires = new Date()
    expires.setMonth(expires.getMonth() + 3)
    await supabase.from('restaurants').update({ promo_active: true, promo_expires_at: expires.toISOString() }).eq('id', rid)
    toast.success('הטבה של 3 חודשים הופעלה')
    loadData()
  }

  async function toggleStatus(rid: string, current: string) {
    const next = current === 'active' ? 'suspended' : 'active'
    await supabase.from('restaurants').update({ status: next }).eq('id', rid)
    toast.success(next === 'active' ? 'חשבון הופעל' : 'חשבון הושהה')
    loadData()
  }

  const filtered = restaurants.filter(r =>
    r.name.includes(search) || r.email.includes(search) || (r.business_number || '').includes(search) || (r.phone_primary || '').includes(search)
  )

  // Billing summary
  const totalDue = billing.filter(b => b.status === 'pending' || b.status === 'overdue').reduce((s, b) => s + b.amount, 0)
  const totalPaid = billing.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0)
  const overdue = billing.filter(b => b.status === 'overdue')

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-gold-500/30 rounded-2xl p-8 w-80">
          <h1 className="font-playfair text-gold-400 text-2xl text-center mb-2">SmartTable</h1>
          <p className="text-zinc-500 text-sm text-center mb-6">Super Admin</p>
          <input value={u} onChange={e => setU(e.target.value)} placeholder="שם משתמש"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white mb-3 outline-none" />
          <input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="סיסמה"
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white mb-4 outline-none" />
          <button onClick={login} className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-xl font-playfair">
            כניסה
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white" dir="rtl">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-gold-500/20 px-4 py-3 flex items-center justify-between">
        <h1 className="font-playfair text-gold-400 text-xl">SmartTable — Super Admin</h1>
        <div className="flex gap-3 text-sm text-zinc-400">
          <span>🏨 {restaurants.filter(r => r.status === 'active').length} פעילים</span>
          <span>💰 ₪{totalDue.toLocaleString()} חסר</span>
          {overdue.length > 0 && <span className="text-red-400">⚠️ {overdue.length} באיחור</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {[{ key: 'clients', label: '🏨 לקוחות' }, { key: 'billing', label: '💰 תשלומים' }, { key: 'add', label: '➕ לקוח חדש' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${tab === t.key ? 'text-gold-400 border-b-2 border-gold-400' : 'text-zinc-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Clients */}
        {tab === 'clients' && (
          <div className="space-y-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="חפש לפי שם, ח.פ, טלפון, מייל..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none" />
            {filtered.map(rest => {
              const restBilling = billing.filter(b => b.restaurant_id === rest.id)
              const hasOverdue = restBilling.some(b => b.status === 'overdue')
              return (
                <div key={rest.id} className={`bg-zinc-900 border rounded-xl p-4 ${hasOverdue ? 'border-red-500/50' : rest.status === 'suspended' ? 'border-zinc-600' : 'border-zinc-700'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{rest.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${rest.status === 'active' ? 'bg-green-500/20 text-green-400' : rest.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700 text-zinc-400'}`}>
                          {rest.status === 'active' ? 'פעיל' : rest.status === 'suspended' ? 'מושהה' : 'הגדרה'}
                        </span>
                        {rest.promo_active && <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">🎁 הטבה</span>}
                      </div>
                      <p className="text-zinc-400 text-sm">{rest.owner_name} • {rest.phone_primary}</p>
                      <p className="text-zinc-500 text-xs">{rest.email}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => toggleStatus(rest.id, rest.status)}
                        className={`text-xs px-2 py-1 rounded-lg ${rest.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {rest.status === 'active' ? 'השהה' : 'הפעל'}
                      </button>
                      {!rest.promo_active && (
                        <button onClick={() => activatePromo(rest.id)} className="text-xs px-2 py-1 rounded-lg bg-gold-500/20 text-gold-400">
                          🎁 הטבה
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span>שולחנות: {rest.max_tables}</span>
                    <span>הצטרף: {new Date(rest.created_at).toLocaleDateString('he-IL')}</span>
                    {rest.last_login_at && <span>כניסה: {new Date(rest.last_login_at).toLocaleDateString('he-IL')}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Billing */}
        {tab === 'billing' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-center">
                <p className="text-xs text-zinc-500">נכנס החודש</p>
                <p className="text-xl font-bold text-green-400">₪{totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-center">
                <p className="text-xs text-zinc-500">חסר</p>
                <p className="text-xl font-bold text-gold-400">₪{totalDue.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-center">
                <p className="text-xs text-zinc-500">באיחור</p>
                <p className="text-xl font-bold text-red-400">{overdue.length}</p>
              </div>
            </div>
            {billing.map(b => {
              const rest = restaurants.find(r => r.id === b.restaurant_id)
              return (
                <div key={b.id} className={`bg-zinc-900 border rounded-xl p-3 flex items-center justify-between ${b.status === 'overdue' ? 'border-red-500/50' : 'border-zinc-700'}`}>
                  <div>
                    <p className="font-medium text-white">{rest?.name || b.restaurant_id}</p>
                    <p className="text-xs text-zinc-500">לתשלום: {new Date(b.due_date).toLocaleDateString('he-IL')}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gold-400">₪{b.amount}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'paid' ? 'bg-green-500/20 text-green-400' : b.status === 'overdue' ? 'bg-red-500/20 text-red-400' : b.status === 'promo' ? 'bg-gold-500/20 text-gold-400' : 'bg-zinc-700 text-zinc-400'}`}>
                      {b.status === 'paid' ? 'שולם' : b.status === 'overdue' ? 'באיחור' : b.status === 'promo' ? 'הטבה' : 'ממתין'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Client */}
        {tab === 'add' && (
          <div className="space-y-3">
            <h2 className="text-gold-400 font-playfair text-lg">הוספת לקוח חדש</h2>
            {[
              { key: 'name', label: 'שם מסעדה *', type: 'text' },
              { key: 'owner_name', label: 'שם בעל העסק *', type: 'text' },
              { key: 'business_number', label: 'ח.פ / ע.מ', type: 'text' },
              { key: 'phone_primary', label: 'טלפון ראשי *', type: 'tel' },
              { key: 'phone_secondary', label: 'טלפון נוסף', type: 'tel' },
              { key: 'email', label: 'מייל *', type: 'email' },
              { key: 'address', label: 'כתובת', type: 'text' },
              { key: 'contract_number', label: 'מספר חוזה', type: 'text' },
              { key: 'technical_contact', label: 'איש קשר טכני', type: 'text' },
              { key: 'max_tables', label: 'מקסימום שולחנות', type: 'number' },
              { key: 'billing_amount', label: 'סכום חיוב חודשי (₪)', type: 'number' },
              { key: 'billing_day', label: 'יום חיוב בחודש', type: 'number' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-xs text-zinc-400 block mb-1">{field.label}</label>
                <input type={field.type}
                  value={(newClient as any)[field.key]}
                  onChange={e => setNewClient(p => ({ ...p, [field.key]: field.type === 'number' ? parseInt(e.target.value) : e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none" />
              </div>
            ))}
            <textarea value={newClient.notes_internal} onChange={e => setNewClient(p => ({ ...p, notes_internal: e.target.value }))}
              placeholder="הערות פנימיות (גלוי רק לך)"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none h-20" />

            <div className="bg-zinc-900 border border-gold-500/20 rounded-xl p-4 space-y-3">
              <h3 className="text-gold-400 text-sm font-medium">פרטי כניסה לאדמין</h3>
              <input value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                placeholder="שם משתמש" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none" />
              <input value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                placeholder="סיסמה ראשונית" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white outline-none" />
            </div>

            <button onClick={addClient} className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-xl font-playfair">
              צור לקוח
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
