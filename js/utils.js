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
    const d = new Date(dateStr);
    return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  },
  
  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  
  formatDateHebrew(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
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
  
  // Urgency color class
  urgencyClass(createdAt, escalationSettings) {
    const level = this.getUrgency(createdAt, escalationSettings);
    return `task-${level}`;
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
  
  // Apply theme to element
  applyTheme(element, themeName) {
    element.classList.remove('theme-luxury', 'theme-premium', 'theme-classic');
    element.classList.add(`theme-${themeName || 'luxury'}`);
  },
  
  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
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
  
  // Detect mobile
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  // Vibrate
  vibrate(pattern = [100]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  },
  
  // Download as file
  downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Export array to CSV
  exportCSV(data, filename) {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    this.downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
  },
};
