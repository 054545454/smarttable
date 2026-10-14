// SmartTable — Utilities

const Utils = {
  // Toast notification
  toast(msg, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // Time formatting
  formatTime(dateStr) {
    if (!dateStr) return '—';
    const clean = typeof dateStr === 'string' ? dateStr.replace(/(\.\d{3})\d+/, '') : dateStr;
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  },
  
  formatDate(dateStr) {
    if (!dateStr) return '—';
    // Truncate microseconds (Base44 returns 6 digits, JS supports 3)
    const clean = typeof dateStr === 'string' ? dateStr.replace(/(\.\d{3})\d+/, '$1') : dateStr;
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  
  
  // Seconds to readable format
  formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)} ${t('seconds')}`;
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return sec > 0 ? `${min} ${t('minutes')} ${sec} ${t('seconds')}` : `${min} ${t('minutes')}`;
  },
  
  // Get elapsed seconds since a timestamp
  elapsedSeconds(timestamp) {
    return (Date.now() - new Date(timestamp).getTime()) / 1000;
  },
  
  // Get urgency level based on elapsed time and escalation settings
  getUrgency(createdAt, escalationSettings) {
    const seconds = this.elapsedSeconds(createdAt);
    const greenMin = escalationSettings?.escalation_green_minutes || CONFIG.escalationDefaults.green;
    const orangeMin = escalationSettings?.escalation_orange_minutes || CONFIG.escalationDefaults.orange;
    
    if (seconds >= orangeMin * 60) return 'red';
    if (seconds >= greenMin * 60) return 'orange';
    return 'green';
  },
  
  
  // Generate UUID
  uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : 
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  },
  
  // Device ID (stored in localStorage)
  getDeviceId() {
    let id = localStorage.getItem('smarttable_device_id');
    if (!id) {
      id = this.uuid();
      localStorage.setItem('smarttable_device_id', id);
    }
    return id;
  },
  
  
  
  // Escape HTML
  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  // Loading spinner
  spinner(size = 40) {
    return `<div class="flex justify-center items-center py-8"><div class="spinner" style="width:${size}px;height:${size}px"></div></div>`;
  },
  
  // Empty state
  emptyState(message, icon = '📭') {
    return `<div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="text-5xl mb-3">${icon}</div>
      <p class="text-gray-400">${message}</p>
    </div>`;
  },
  
  // Enter fullscreen
  requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  },
  
  // Vibrate
  vibrate(pattern = [100]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  },
  };
