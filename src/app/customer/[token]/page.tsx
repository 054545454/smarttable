'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTheme } from '@/lib/themes'
import { hebrewTaskType } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { RestaurantSettings, RestaurantTable, Gift, Task, TaskType } from '@/types'

const LANGUAGES: Record<string, Record<string, string>> = {
  he: { water: 'מים', bill: 'חשבון', waiter: 'מלצר', wine_menu: 'תפריט יינות', dessert_menu: 'תפריט קינוחים', special: 'בקשה מיוחדת', sent: 'הבקשה נשלחה!', waiting: 'ממתין...', scratch_title: 'מתנה בשבילך!', scratch_btn: 'גלה את המתנה', send_gift: 'שלח למלצר', lang_btn: 'EN', table: 'שולחן', locked: 'השולחן תפוס', request_sent: 'בקשה נשלחה ✓', type_here: 'כתוב בקשה עד 20 תווים...', send: 'שלח' },
  en: { water: 'Water', bill: 'Bill', waiter: 'Waiter', wine_menu: 'Wine Menu', dessert_menu: 'Desserts', special: 'Special Request', sent: 'Request sent!', waiting: 'Waiting...', scratch_title: 'A gift for you!', scratch_btn: 'Reveal your gift', send_gift: 'Send to waiter', lang_btn: 'עב', table: 'Table', locked: 'Table is occupied', request_sent: 'Request sent ✓', type_here: 'Type up to 20 characters...', send: 'Send' },
}

export default function CustomerPage({ params }: { params: { token: string } }) {
  const [lang, setLang] = useState('he')
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [tableData, setTableData] = useState<RestaurantTable | null>(null)
  const [gifts, setGifts] = useState<Gift[]>([])
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null)
  const [phase, setPhase] = useState<'loading' | 'locked' | 'scratch' | 'revealed' | 'main'>('loading')
  const [scratchDone, setScratchDone] = useState(false)
  const [activeTasks, setActiveTasks] = useState<Task[]>([])
  const [specialNote, setSpecialNote] = useState('')
  const [lockedButtons, setLockedButtons] = useState<Set<string>>(new Set())
  const [restaurantName, setRestaurantName] = useState('')
  const t = LANGUAGES[lang]

  useEffect(() => {
    loadTableData()
  }, [params.token])

  async function loadTableData() {
    const { data: table } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('qr_token', params.token)
      .single()

    if (!table) { setPhase('locked'); return }

    // If table is open and this is a different device
    if (table.is_open && table.guest_device_id && table.guest_device_id !== getDeviceId()) {
      setPhase('locked'); return
    }

    setTableData(table)

    // Load settings
    const { data: s } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('restaurant_id', table.restaurant_id)
      .single()
    setSettings(s)

    // Load restaurant name
    const { data: r } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', table.restaurant_id)
      .single()
    if (r) setRestaurantName(r.name)

    // Load gifts
    const { data: g } = await supabase
      .from('gifts')
      .select('*')
      .eq('restaurant_id', table.restaurant_id)
      .eq('is_active', true)
    setGifts(g || [])

    // Mark table as open
    if (!table.is_open) {
      await supabase.from('restaurant_tables').update({
        is_open: true,
        opened_at: new Date().toISOString(),
        guest_device_id: getDeviceId()
      }).eq('id', table.id)
    }

    // Determine phase
    if (!table.scratch_used && g && g.length > 0) {
      const randomGift = g[Math.floor(Math.random() * g.length)]
      setSelectedGift(randomGift)
      setPhase('scratch')
    } else {
      setPhase('main')
    }

    // Subscribe to tasks
    subscribeToTasks(table.id)
  }

  function getDeviceId() {
    let id = localStorage.getItem('st_device_id')
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('st_device_id', id) }
    return id
  }

  function subscribeToTasks(tableId: string) {
    supabase.channel('tasks_' + tableId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `table_id=eq.${tableId}` }, () => {
        loadActiveTasks(tableId)
      }).subscribe()
    loadActiveTasks(tableId)
  }

  async function loadActiveTasks(tableId: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('table_id', tableId)
      .in('status', ['open', 'in_progress'])
    const tasks = data || []
    setActiveTasks(tasks)
    const locked = new Set(tasks.map((t: Task) => t.type))
    setLockedButtons(locked)
  }

  async function sendGiftToWaiter() {
    if (!tableData || !selectedGift) return
    await supabase.from('tasks').insert({
      restaurant_id: tableData.restaurant_id,
      table_id: tableData.id,
      table_number: tableData.table_number,
      type: 'gift',
      gift_id: selectedGift.id,
      status: 'open'
    })
    await supabase.from('restaurant_tables').update({ scratch_used: true }).eq('id', tableData.id)
    setPhase('main')
    toast.success(t.sent)
  }

  async function sendRequest(type: TaskType, note?: string) {
    if (!tableData) return
    if (lockedButtons.has(type)) { toast.error(t.waiting); return }
    await supabase.from('tasks').insert({
      restaurant_id: tableData.restaurant_id,
      table_id: tableData.id,
      table_number: tableData.table_number,
      type,
      special_note: note || null,
      status: 'open'
    })
    toast.success(t.request_sent)
    if (type === 'special') setSpecialNote('')
  }

  const theme = settings ? getTheme(settings.theme) : getTheme('luxury')

  if (phase === 'loading') {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div className="text-gold-400 text-2xl font-playfair animate-pulse">SmartTable</div>
      </div>
    )
  }

  if (phase === 'locked') {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div className={`text-center p-8 ${theme.surface} rounded-2xl border ${theme.border}`}>
          <div className="text-5xl mb-4">🔒</div>
          <p className={`${theme.text} text-xl ${theme.font}`}>{t.locked}</p>
        </div>
      </div>
    )
  }

  if (phase === 'scratch' && selectedGift) {
    return (
      <div className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center p-6`}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm w-full">
          {settings?.logo_url && <img src={settings.logo_url} alt="logo" className="h-16 mx-auto mb-6 object-contain" />}
          <h2 className={`text-3xl ${theme.font} ${theme.text} mb-2`}>{restaurantName}</h2>
          <p className={`${theme.textMuted} mb-8`}>{t.scratch_title}</p>

          <motion.div
            className={`relative rounded-2xl overflow-hidden border-2 ${theme.border} p-8 mb-6 ${theme.surface}`}
            whileHover={{ scale: 1.02 }}
          >
            {!scratchDone ? (
              <button onClick={() => setScratchDone(true)} className={`w-full py-4 rounded-xl ${theme.btn} text-lg ${theme.font} font-semibold`}>
                🎁 {t.scratch_btn}
              </button>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="animate-scratch-reveal">
                <div className="text-6xl mb-3">{selectedGift.icon || '🎁'}</div>
                <h3 className={`text-2xl ${theme.font} ${theme.text} font-bold mb-2`}>{selectedGift.title}</h3>
                {selectedGift.description && <p className={theme.textMuted}>{selectedGift.description}</p>}
              </motion.div>
            )}
          </motion.div>

          {scratchDone && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={sendGiftToWaiter}
              className={`w-full py-4 rounded-xl ${theme.btn} text-lg ${theme.font} font-semibold`}
            >
              {t.send_gift} →
            </motion.button>
          )}
        </motion.div>
      </div>
    )
  }

  // Main service screen
  const serviceButtons: { type: TaskType; emoji: string; key: string }[] = [
    { type: 'water', emoji: '💧', key: 'water' },
    { type: 'bill', emoji: '🧾', key: 'bill' },
    { type: 'waiter', emoji: '🙋', key: 'waiter' },
    { type: 'wine_menu', emoji: '🍷', key: 'wine_menu' },
    { type: 'dessert_menu', emoji: '🍰', key: 'dessert_menu' },
  ]

  return (
    <div className={`min-h-screen ${theme.bg} flex flex-col`}>
      {/* Header */}
      <div className={`${theme.surface} border-b ${theme.border} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {settings?.logo_url && <img src={settings.logo_url} alt="logo" className="h-10 object-contain" />}
          <div>
            <h1 className={`${theme.font} ${theme.text} text-lg font-bold`}>{restaurantName}</h1>
            <p className={`text-xs ${theme.textMuted}`}>{t.table} {tableData?.table_number}</p>
          </div>
        </div>
        <button onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
          className={`px-3 py-1 rounded-full text-sm ${theme.btnSecondary}`}>
          {t.lang_btn}
        </button>
      </div>

      {/* Service Buttons */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {serviceButtons.map(btn => {
            const isLocked = lockedButtons.has(btn.type)
            return (
              <motion.button
                key={btn.type}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendRequest(btn.type)}
                disabled={isLocked}
                className={`p-5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                  isLocked
                    ? `${theme.card} ${theme.border} opacity-50 cursor-not-allowed`
                    : `${theme.surface} ${theme.border} hover:opacity-90 active:scale-95`
                }`}
              >
                <span className="text-3xl">{btn.emoji}</span>
                <span className={`${theme.font} ${theme.textBody} text-sm font-medium`}>{t[btn.key as keyof typeof t]}</span>
                {isLocked && <span className={`text-xs ${theme.textMuted}`}>{t.waiting}</span>}
              </motion.button>
            )
          })}
        </div>

        {/* Special Request */}
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-4`}>
          <p className={`${theme.font} ${theme.text} text-sm font-medium mb-2`}>✏️ {t.special}</p>
          <textarea
            value={specialNote}
            onChange={e => setSpecialNote(e.target.value.slice(0, 20))}
            placeholder={t.type_here}
            rows={2}
            className={`w-full bg-transparent ${theme.textBody} text-sm resize-none outline-none placeholder-opacity-50`}
            dir={lang === 'he' ? 'rtl' : 'ltr'}
          />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${theme.textMuted}`}>{specialNote.length}/20</span>
            <button
              onClick={() => specialNote.trim() && sendRequest('special', specialNote)}
              disabled={!specialNote.trim()}
              className={`px-4 py-1.5 rounded-xl text-sm ${theme.btn} disabled:opacity-40`}
            >
              {t.send}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
