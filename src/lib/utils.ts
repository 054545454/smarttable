import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`
}

export function getUrgencyLevel(createdAt: string, greenMins = 2, orangeMins = 4): 'green' | 'orange' | 'red' {
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000 / 60
  if (elapsed >= orangeMins) return 'red'
  if (elapsed >= greenMins) return 'orange'
  return 'green'
}

export function getUrgencyColor(level: 'green' | 'orange' | 'red') {
  const map = {
    green: 'border-green-500 bg-green-500/10',
    orange: 'border-orange-400 bg-orange-400/10',
    red: 'border-red-500 bg-red-500/10 animate-pulse-urgent',
  }
  return map[level]
}

export function generatePin(length = 4): string {
  return Math.random().toString().slice(2, 2 + length)
}

export function hebrewTaskType(type: string): string {
  const map: Record<string, string> = {
    water: '💧 מים',
    bill: '🧾 חשבון',
    waiter: '🙋 מלצר',
    wine_menu: '🍷 תפריט יינות',
    dessert_menu: '🍰 תפריט קינוחים',
    special: '✏️ בקשה מיוחדת',
    gift: '🎁 מתנה',
    adhoc: '📋 משימה',
  }
  return map[type] || type
}
