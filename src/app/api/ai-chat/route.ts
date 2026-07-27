import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { question, restaurantId } = await req.json()

  // Load restaurant stats for context
  const [tasksRes, waitersRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500),
    supabase.from('users').select('*').eq('restaurant_id', restaurantId).eq('role', 'waiter')
  ])

  const tasks = tasksRes.data || []
  const waiters = waitersRes.data || []

  const doneTasks = tasks.filter(t => t.status === 'done')
  const avgResponse = doneTasks.length > 0
    ? Math.round(doneTasks.filter(t => t.response_seconds).reduce((s: number, t: any) => s + (t.response_seconds || 0), 0) / doneTasks.filter(t => t.response_seconds).length)
    : 0

  const context = `
נתונים על המסעדה:
- מלצרים: ${waiters.length}
- סה"כ משימות: ${tasks.length}
- הושלמו: ${doneTasks.length}
- זמן תגובה ממוצע: ${Math.floor(avgResponse/60)} דקות ו-${avgResponse%60} שניות
- שאלה: ${question}
  `

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'אתה עוזר AI למנהל מסעדה. ענה בעברית בצורה תמציתית ומקצועית.' },
        { role: 'user', content: context }
      ],
      max_tokens: 300
    })
  })

  if (!openaiRes.ok) {
    return NextResponse.json({ answer: 'שירות ה-AI אינו זמין כרגע. נא לבדוק את מפתח ה-API.' })
  }

  const data = await openaiRes.json()
  return NextResponse.json({ answer: data.choices[0]?.message?.content || 'לא הצלחתי לענות' })
}
