// SmartTable — Supabase Client
const sb = supabase.createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.anonKey,
  {
    realtime: { params: { eventsPerSecond: 10 } }
  }
);

// Generic query helper with restaurant_id filtering
async function sbSelect(table, filters = {}, options = {}) {
  let query = sb.from(table).select(options.select || '*');
  
  if (filters.restaurant_id) {
    query = query.eq('restaurant_id', filters.restaurant_id);
  }
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'restaurant_id') continue;
    if (typeof value === 'object' && value !== null) {
      if (value.eq) query = query.eq(key, value.eq);
      if (value.neq) query = query.neq(key, value.neq);
      if (value.in) query = query.in(key, value.in);
      if (value.gt) query = query.gt(key, value.gt);
      if (value.lt) query = query.lt(key, value.lt);
      if (value.gte) query = query.gte(key, value.gte);
      if (value.lte) query = query.lte(key, value.lte);
      if (value.like) query = query.like(key, value.like);
    } else {
      query = query.eq(key, value);
    }
  }
  
  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
  }
  if (options.limit) query = query.limit(options.limit);
  if (options.single) query = query.single();
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function sbInsert(table, data) {
  const { data: result, error } = await sb.from(table).insert(data).select();
  if (error) throw error;
  return result;
}

async function sbUpdate(table, filters, updates) {
  let query = sb.from(table).update(updates);
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.select();
  if (error) throw error;
  return data;
}

async function sbDelete(table, filters) {
  let query = sb.from(table).delete();
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { error } = await query;
  if (error) throw error;
}

// Realtime subscription helper
function sbSubscribe(table, filters, callback) {
  let channel = sb.channel(`${table}_changes`);
  
  if (filters.restaurant_id) {
    channel = channel.filter('restaurant_id', 'eq', filters.restaurant_id);
  }
  
  channel = channel.on('postgres_changes',
    { event: '*', schema: 'public', table: table },
    (payload) => callback(payload)
  );
  
  return channel.subscribe();
}

// Channel for tasks with restaurant filter
function sbSubscribeTasks(restaurantId, callback) {
  return sb.channel('tasks_realtime')
    .filter('restaurant_id', 'eq', restaurantId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
    .subscribe();
}

// Channel for tables
function sbSubscribeTables(restaurantId, callback) {
  return sb.channel('tables_realtime')
    .filter('restaurant_id', 'eq', restaurantId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, callback)
    .subscribe();
}

// Channel for shifts
function sbSubscribeShifts(restaurantId, callback) {
  return sb.channel('shifts_realtime')
    .filter('restaurant_id', 'eq', restaurantId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, callback)
    .subscribe();
}
