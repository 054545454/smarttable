export type ThemeType = 'luxury' | 'premium' | 'classic'
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'
export type TaskType = 'water' | 'bill' | 'waiter' | 'wine_menu' | 'dessert_menu' | 'special' | 'gift' | 'adhoc'
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'waiter'
export type RestaurantStatus = 'active' | 'inactive' | 'setup' | 'suspended'

export interface Restaurant {
  id: string
  name: string
  business_number?: string
  owner_name: string
  phone_primary: string
  phone_secondary?: string
  email: string
  address?: string
  contract_number?: string
  technical_contact?: string
  notes_internal?: string
  max_tables: number
  status: RestaurantStatus
  promo_active: boolean
  promo_expires_at?: string
  billing_day: number
  billing_amount: number
  billing_currency: string
  created_at: string
  first_login_at?: string
  last_login_at?: string
}

export interface RestaurantSettings {
  id: string
  restaurant_id: string
  theme: ThemeType
  primary_color: string
  secondary_color: string
  font_family: string
  logo_url?: string
  default_language: string
  escalation_green_minutes: number
  escalation_orange_minutes: number
  escalation_alert_minutes: number
  operating_hours: Record<string, unknown>
}

export interface RestaurantTable {
  id: string
  restaurant_id: string
  table_number: number
  qr_token: string
  is_open: boolean
  opened_at?: string
  guest_device_id?: string
  scratch_used: boolean
}

export interface Gift {
  id: string
  restaurant_id: string
  title: string
  description?: string
  icon?: string
  is_active: boolean
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category: string
  name: string
  description?: string
  price?: number
  image_url?: string
  pdf_url?: string
  is_active: boolean
  sort_order: number
}

export interface Task {
  id: string
  restaurant_id: string
  shift_id?: string
  table_id: string
  table_number: number
  type: TaskType
  special_note?: string
  gift_id?: string
  status: TaskStatus
  priority: string
  assigned_waiter_id?: string
  assigned_waiter_name?: string
  created_at: string
  claimed_at?: string
  completed_at?: string
  response_seconds?: number
}

export interface User {
  id: string
  restaurant_id?: string
  role: UserRole
  full_name: string
  username?: string
  pin?: string
  is_active: boolean
  created_at: string
}

export interface Shift {
  id: string
  restaurant_id: string
  manager_id?: string
  manager_name?: string
  started_at: string
  ended_at?: string
  is_busy_mode: boolean
}

export interface BillingRecord {
  id: string
  restaurant_id: string
  period_start: string
  period_end: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'waived' | 'promo'
  due_date: string
  paid_at?: string
  notes?: string
}
