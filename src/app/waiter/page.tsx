'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getUrgencyLevel, getUrgencyColor, hebrewTaskType } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { Task, User } from '@/types'

interface GroupedTable {
  tableNumber: number
  tableId: string
  tasks: Task[]
  oldestTask: Task
  urgency: 'green' | 'orange' | 'red'
}

export default function WaiterScreen() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [waiters, setWaiters] = useState<User[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState<Record<string, string>>({})
  const [completing, setCompleting] = useState<Set<string>>(new Set())
  const [restaurantId, setRestaurantId] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // For demo, use first active restaurant — in production, set via URL param
  useEffect(() => {
    loadRestaurant()
  }, [])

  async function loadRestaurant() {
    const { data } = await supabase.from('restaurants').select('id').eq('status', 'active').limit(1).single()
    if (data) {
      setRestaurantId(data.id)
      loadWaiters(data.id)
      subscribeToTasks(data.id)
    }
  }

  async function loadWaiters(rid: string) {
    const { data } = await supabase.from('users').select('*').eq('restaurant_id', rid).eq('role', 'waiter').eq('is_active', true)
    setWaiters(data || [])
  }

  function subscribeToTasks(rid: string) {
    supabase.channel('waiter_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `restaurant_id=eq.${rid}` }, () => {
        loadTasks(rid)
      }).subscribe()
    loadTasks(rid)

    // Refresh urgency every 30 seconds
    setInterval(() => setTasks(prev => [...prev]), 30000)
  }

  async function loadTasks(rid: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('restaurant_id', rid)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: true })
    setTasks(data || [])
  }

  // Group tasks by table
  const groupedTables: GroupedTable[] = Object.values(
    tasks.reduce((acc: Record<string, GroupedTable>, task) => {
      const key = task.table_id
      if (!acc[key]) {
        acc[key] = { tableNumber: task.table_number, tableId: task.table_id, tasks: [], oldestTask: task, urgency: 'green' }
      }
      acc[key].tasks.push(task)
      if (new Date(task.created_at) < new Date(acc[key].oldestTask.created_at)) {
        acc[key].oldestTask = task
      }
      return acc
    }, {})
  ).map(group => ({
    ...group,
    urgency: getUrgencyLevel(group.oldestTask.created_at)
  })).sort((a, b) => {
    const priority = { red: 0, orange: 1, green: 2 }
    if (priority[a.urgency] !== priority[b.urgency]) return priority[a.urgency] - priority[b.urgency]
    return new Date(a.oldestTask.created_at).getTime() - new Date(b.oldestTask.created_at).getTime()
  })

  async function completeTask(groupKey: string, tasks: Task[]) {
    const waiterName = selectedWaiter[groupKey]
    if (!waiterName) { toast.error('בחר מלצר תחילה'); return }

    setCompleting(prev => new Set([...prev, groupKey]))

    for (const task of tasks) {
      const responseSeconds = Math.floor((Date.now() - new Date(task.created_at).getTime()) / 1000)
      await supabase.from('tasks').update({
        status: 'done',
        assigned_waiter_name: waiterName,
        completed_at: new Date().toISOString(),
        response_seconds: responseSeconds
      }).eq('id', task.id)

      await supabase.from('task_logs').insert({
        task_id: task.id,
        restaurant_id: task.restaurant_id,
        action: 'completed',
        actor_name: waiterName,
        actor_role: 'waiter'
      })
    }

    setTimeout(() => {
      setCompleting(prev => { const n = new Set(prev); n.delete(groupKey); return n })
    }, 1000)
  }

  function getElapsed(createdAt: string) {
    const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${s}s`
  }

  const urgencyBorder: Record<string, string> = {
    green: 'border-green-500',
    orange: 'border-orange-400',
    red: 'border-red-500',
  }
  const urgencyBg: Record<string, string> = {
    green: 'bg-green-500/10',
    orange: 'bg-orange-400/10',
    red: 'bg-red-500/10',
  }

  return (
    <div className="fullscreen-kiosk bg-zinc-950 text-white p-4 overflow-y-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-playfair text-gold-400 text-2xl">SmartTable — מסך מלצרים</h1>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm">{tasks.length} משימות פתוחות</span>
          <button onClick={() => { document.documentElement.requestFullscreen?.() }} className="px-3 py-1 rounded-lg bg-zinc-800 text-xs text-zinc-300">
            ⛶ מסך מלא
          </button>
        </div>
      </div>

      {/* Task Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {groupedTables.map(group => {
            const key = group.tableId
            const isMultiple = group.tasks.length > 1
            const isCompleting = completing.has(key)
            const borderColor = isMultiple ? 'border-yellow-400' : urgencyBorder[group.urgency]
            const bgColor = isMultiple ? 'bg-yellow-400/10' : urgencyBg[group.urgency]

            return (
              <AnimatePresence key={key}>
                {!isCompleting && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-2xl border-2 ${borderColor} ${bgColor} p-4 flex flex-col gap-3`}
                  >
                    {/* Table header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">שולחן {group.tableNumber}</span>
                        {isMultiple && <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">{group.tasks.length} בקשות</span>}
                      </div>
                      <span className={`text-sm font-mono ${group.urgency === 'red' ? 'text-red-400 animate-pulse' : group.urgency === 'orange' ? 'text-orange-400' : 'text-green-400'}`}>
                        ⏱ {getElapsed(group.oldestTask.created_at)}
                      </span>
                    </div>

                    {/* Tasks list */}
                    <div className="space-y-2">
                      {group.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm text-zinc-200">
                          <span>{hebrewTaskType(task.type)}</span>
                          {task.special_note && <span className="text-zinc-400 text-xs">({task.special_note})</span>}
                        </div>
                      ))}
                    </div>

                    {/* Waiter selector + complete */}
                    <div className="flex gap-2 mt-auto">
                      <select
                        value={selectedWaiter[key] || ''}
                        onChange={e => setSelectedWaiter(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white"
                      >
                        <option value="">בחר מלצר</option>
                        {waiters.map(w => <option key={w.id} value={w.full_name}>{w.full_name}</option>)}
                      </select>
                      <button
                        onClick={() => completeTask(key, group.tasks)}
                        disabled={!selectedWaiter[key]}
                        className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                      >
                        ✓ בוצע
                      </button>
                    </div>
                  </motion.div>
                )}
                {isCompleting && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-2xl border-2 border-green-500 bg-green-500/20 p-4 flex items-center justify-center min-h-[140px]"
                  >
                    <span className="text-green-400 text-xl font-bold">✓ בוצע!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            )
          })}
        </AnimatePresence>
      </div>

      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <div className="text-5xl mb-4">✨</div>
          <p className="text-xl font-playfair text-gold-400/50">אין משימות פתוחות</p>
        </div>
      )}
    </div>
  )
}
