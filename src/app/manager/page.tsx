'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { RestaurantTable, Task, User, Shift } from '@/types'

export default function ManagerPage() {
  const [pin, setPin] = useState('')
  const [manager, setManager] = useState<User | null>(null)
  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [waiters, setWaiters] = useState<User[]>([])
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [shiftWaiters, setShiftWaiters] = useState<string[]>([])
  const [busyMode, setBusyMode] = useState(false)
  const [tab, setTab] = useState<'tables' | 'tasks' | 'shift'>('tables')
  const [lockInput, setLockInput] = useState('')
  const [exitPrompt, setExitPrompt] = useState(false)

  // Prevent exit without owner password
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  async function loginWithPin() {
    const { data } = await supabase
      .from('users')
      .select('*, restaurants(id, name)')
      .eq('pin', pin)
      .eq('role', 'manager')
      .eq('is_active', true)
      .single()

    if (!data) { toast.error('PIN שגוי'); return }
    setManager(data)
    const rest = (data as any).restaurants
    setRestaurant(rest)
    loadData(rest.id, data.id)
  }

  async function loadData(rid: string, mid: string) {
    const [tablesRes, waitersRes, shiftRes] = await Promise.all([
      supabase.from('restaurant_tables').select('*').eq('restaurant_id', rid).order('table_number'),
      supabase.from('users').select('*').eq('restaurant_id', rid).eq('role', 'waiter').eq('is_active', true),
      supabase.from('shifts').select('*').eq('restaurant_id', rid).is('ended_at', null).single()
    ])
    setTables(tablesRes.data || [])
    setWaiters(waitersRes.data || [])
    if (shiftRes.data) setActiveShift(shiftRes.data)

    supabase.channel('manager_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `restaurant_id=eq.${rid}` }, () => loadTasks(rid))
      .subscribe()
    loadTasks(rid)
  }

  async function loadTasks(rid: string) {
    const { data } = await supabase.from('tasks').select('*').eq('restaurant_id', rid).in('status', ['open', 'in_progress']).order('created_at')
    setTasks(data || [])

    // Check 5-minute alert
    const now = Date.now()
    data?.forEach((t: Task) => {
      const elapsed = (now - new Date(t.created_at).getTime()) / 1000 / 60
      if (elapsed >= 5 && t.status === 'open') {
        toast.error(`⚠️ שולחן ${t.table_number} ממתין מעל 5 דקות!`, { id: t.id })
      }
    })
  }

  async function toggleTable(table: RestaurantTable) {
    if (table.is_open) {
      await supabase.from('restaurant_tables').update({ is_open: false, scratch_used: false, guest_device_id: null, opened_at: null }).eq('id', table.id)
      toast.success(`שולחן ${table.table_number} נסגר`)
    } else {
      await supabase.from('restaurant_tables').update({ is_open: true, opened_at: new Date().toISOString() }).eq('id', table.id)
      toast.success(`שולחן ${table.table_number} נפתח`)
    }
    if (restaurant) { const { data } = await supabase.from('restaurant_tables').select('*').eq('restaurant_id', restaurant.id).order('table_number'); setTables(data || []) }
  }

  async function resetScratch(table: RestaurantTable) {
    await supabase.from('restaurant_tables').update({ scratch_used: false, guest_device_id: null }).eq('id', table.id)
    toast.success(`גירוד שולחן ${table.table_number} אופס`)
  }

  async function startShift() {
    if (!restaurant || !manager) return
    const { data } = await supabase.from('shifts').insert({
      restaurant_id: restaurant.id, manager_id: manager.id, manager_name: manager.full_name
    }).select().single()
    if (data) {
      setActiveShift(data)
      // Add selected waiters to shift
      if (shiftWaiters.length > 0) {
        await supabase.from('shift_waiters').insert(
          shiftWaiters.map(name => ({ shift_id: data.id, waiter_name: name }))
        )
      }
      toast.success('משמרת נפתחה')
    }
  }

  async function endShift() {
    if (!activeShift) return
    await supabase.from('shifts').update({ ended_at: new Date().toISOString() }).eq('id', activeShift.id)
    setActiveShift(null)
    toast.success('משמרת נסגרה')
  }

  async function cancelTask(taskId: string) {
    await supabase.from('tasks').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', taskId)
    await supabase.from('task_logs').insert({ task_id: taskId, restaurant_id: restaurant?.id, action: 'cancelled_by_manager', actor_name: manager?.full_name, actor_role: 'manager' })
    toast.success('משימה בוטלה')
  }

  async function escalateTask(taskId: string) {
    await supabase.from('tasks').update({ priority: 'manual_urgent' }).eq('id', taskId)
    toast.success('משימה הועלתה לדחיפות מקסימלית')
  }

  if (!manager) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-gold-500/30 rounded-2xl p-8 w-80">
          <h1 className="font-playfair text-gold-400 text-2xl text-center mb-2">SmartTable</h1>
          <p className="text-zinc-400 text-center text-sm mb-6">מסך אחמ"ש — הכנס PIN</p>
          <input
            type="password" value={pin} onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loginWithPin()}
            placeholder="PIN"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest mb-4 outline-none"
            maxLength={6}
          />
          <button onClick={loginWithPin} className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-xl font-playfair transition-all">
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
        <div>
          <h1 className="font-playfair text-gold-400 text-lg">{restaurant?.name}</h1>
          <p className="text-zinc-400 text-xs">אחמ"ש: {manager.full_name} {activeShift && '• משמרת פעילה'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBusyMode(!busyMode)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${busyMode ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
            {busyMode ? '🔥 עמוס' : 'רגיל'}
          </button>
          <button onClick={() => setExitPrompt(true)} className="px-3 py-1 rounded-full text-xs bg-zinc-800 text-zinc-400">יציאה</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(['tables', 'tasks', 'shift'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${tab === t ? 'text-gold-400 border-b-2 border-gold-400' : 'text-zinc-500'}`}>
            {t === 'tables' ? '🪑 שולחנות' : t === 'tasks' ? '📋 משימות' : '👥 משמרת'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Tables tab */}
        {tab === 'tables' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tables.map(table => {
              const tableTasks = tasks.filter(t => t.table_id === table.id)
              return (
                <div key={table.id} className={`rounded-xl border p-3 flex flex-col gap-2 ${table.is_open ? 'border-green-500/50 bg-green-500/5' : 'border-zinc-700 bg-zinc-900'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">{table.table_number}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${table.is_open ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-500'}`}>
                      {table.is_open ? 'פתוח' : 'סגור'}
                    </span>
                  </div>
                  {tableTasks.length > 0 && <span className="text-xs text-orange-400">{tableTasks.length} משימות</span>}
                  <div className="flex gap-1">
                    <button onClick={() => toggleTable(table)} className={`flex-1 text-xs py-1 rounded-lg ${table.is_open ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {table.is_open ? 'סגור' : 'פתח'}
                    </button>
                    {table.is_open && <button onClick={() => resetScratch(table)} className="text-xs py-1 px-2 rounded-lg bg-zinc-700 text-zinc-300">🔄</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tasks tab */}
        {tab === 'tasks' && (
          <div className="space-y-3">
            {tasks.length === 0 && <p className="text-zinc-500 text-center py-8">אין משימות פתוחות</p>}
            {tasks.map(task => {
              const elapsed = Math.floor((Date.now() - new Date(task.created_at).getTime()) / 1000 / 60)
              return (
                <div key={task.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-white font-medium">שולחן {task.table_number}</span>
                    <span className="text-zinc-400 text-sm mr-2">{task.type}</span>
                    {task.special_note && <span className="text-zinc-500 text-xs">({task.special_note})</span>}
                    <div className="text-xs text-zinc-500 mt-1">{elapsed} דקות</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => escalateTask(task.id)} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg">🚨 דחוף</button>
                    <button onClick={() => cancelTask(task.id)} className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg">ביטול</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Shift tab */}
        {tab === 'shift' && (
          <div className="space-y-4">
            {!activeShift ? (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <h3 className="text-gold-400 font-playfair mb-3">פתח משמרת חדשה</h3>
                <p className="text-zinc-400 text-sm mb-3">בחר מלצרים פעילים:</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {waiters.map(w => (
                    <button key={w.id}
                      onClick={() => setShiftWaiters(prev => prev.includes(w.full_name) ? prev.filter(n => n !== w.full_name) : [...prev, w.full_name])}
                      className={`py-2 px-3 rounded-lg text-sm transition-all ${shiftWaiters.includes(w.full_name) ? 'bg-gold-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
                      {w.full_name}
                    </button>
                  ))}
                </div>
                <button onClick={startShift} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold">
                  פתח משמרת
                </button>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-green-500/30 rounded-xl p-4">
                <h3 className="text-green-400 font-playfair mb-2">משמרת פעילה</h3>
                <p className="text-zinc-400 text-sm">התחילה: {new Date(activeShift.started_at).toLocaleTimeString('he-IL')}</p>
                <button onClick={endShift} className="w-full mt-4 bg-red-500/20 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold">
                  סגור משמרת
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exit prompt */}
      <AnimatePresence>
        {exitPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" dir="rtl">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-80">
              <h3 className="text-white font-playfair mb-4">יציאה מהמסך</h3>
              <p className="text-zinc-400 text-sm mb-4">הכנס סיסמת בעלים ליציאה:</p>
              <input type="password" value={lockInput} onChange={e => setLockInput(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white mb-4 outline-none"
                placeholder="סיסמת בעלים" />
              <div className="flex gap-3">
                <button onClick={() => setExitPrompt(false)} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl">ביטול</button>
                <button onClick={() => { /* verify owner pass */ toast.error('סיסמה שגויה') }} className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl">יציאה</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
