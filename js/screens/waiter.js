// SmartTable — Waiter Screen (Task Queue with Real-time Escalation)
const WaiterScreen = {
  state: {
    name: null,
    restaurantId: null,
    shiftId: null,
    tasks: [],
    settings: null,
    subscriptions: [],
    timer: null,
  },

  init(restaurantId) {
    this.state.restaurantId = restaurantId;
    const saved = Auth.getSession('waiter');
    
    if (saved && saved.restaurantId === restaurantId) {
      this.state.name = saved.name;
      this.state.shiftId = saved.shiftId;
      this.start();
    } else {
      this.renderLogin();
    }
  },

  renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <div class="text-5xl mb-3">🤵</div>
            <h1 class="text-2xl font-playfair text-gray-800">${t('waiterLogin')}</h1>
            <p class="text-gray-500 text-sm mt-2">${t('enterName')}</p>
          </div>
          <form id="waiter-login-form" class="space-y-4">
            <input type="text" id="waiter-name" class="input-field text-center text-lg" 
              placeholder="${t('enterName')}" required maxlength="30" autofocus>
            <button type="submit" class="btn-primary w-full">${t('confirm')}</button>
          </form>
        </div>
      </div>
    `;
    
    document.getElementById('waiter-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('waiter-name').value.trim();
      if (!name) return;
      
      try {
        // Find active shift
        const shifts = await sbSelect('shifts', {
          restaurant_id: this.state.restaurantId,
          ended_at: null,
        }, { order: { column: 'started_at', ascending: false }, limit: 1 });
        
        let shiftId = null;
        if (shifts && shifts.length > 0) {
          shiftId = shifts[0].id;
          // Add waiter to shift
          await sbInsert('shift_waiters', {
            shift_id: shiftId,
            waiter_name: name,
          });
        }
        
        await Auth.loginWaiter(name, this.state.restaurantId, shiftId);
        this.state.name = name;
        this.state.shiftId = shiftId;
        this.start();
      } catch(e) {
        Utils.toast('שגיאה: ' + e.message);
      }
    });
  },

  async start() {
    // Load restaurant settings
    try {
      const settings = await sbSelect('restaurant_settings', { restaurant_id: this.state.restaurantId }, { single: true });
      this.state.settings = settings || {};
    } catch(e) { this.state.settings = {}; }
    
    await this.loadTasks();
    this.render();
    this.setupRealtime();
    this.startTimer();
  },

  async loadTasks() {
    try {
      this.state.tasks = await sbSelect('tasks', {
        restaurant_id: this.state.restaurantId,
        status: { in: ['open', 'in_progress'] },
      }, { order: { column: 'created_at', ascending: true } });
    } catch(e) { console.error(e); this.state.tasks = []; }
  },

  render() {
    const { name, tasks, settings } = this.state;
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gray-50 fullscreen-mode">
        <!-- Header -->
        <div class="bg-gray-900 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div class="flex items-center justify-between max-w-2xl mx-auto">
            <div>
              <h1 class="text-lg font-semibold">🤵 ${Utils.escape(name)}</h1>
              <p class="text-xs text-gray-400">${t('taskQueue')} · ${tasks.length} ${tasks.length === 1 ? 'משימה' : 'משימות'}</p>
            </div>
            <button id="waiter-logout" class="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg">
              ${t('logout')}
            </button>
          </div>
        </div>

        <!-- Task list -->
        <div class="max-w-2xl mx-auto p-4 space-y-3" id="task-list">
          ${tasks.length === 0 
            ? Utils.emptyState(t('noTasks'), '✅')
            : tasks.map(task => this.renderTask(task, settings)).join('')
          }
        </div>
      </div>
    `;
    
    this.attachEvents();
  },

  renderTask(task, settings) {
    const urgency = Utils.getUrgency(task.created_at, settings);
    const urgencyLabel = urgency === 'red' ? t('urgent') : '';
    const elapsed = Math.floor(Utils.elapsedSeconds(task.created_at));
    const typeInfo = CONFIG.taskTypes[task.type] || { icon: '📋', label: task.type };
    const isClaimed = task.status === 'in_progress';
    
    return `
      <div class="rounded-xl overflow-hidden shadow-md transition-all" data-task-id="${task.id}">
        <div class="task-${urgency} px-4 py-3 flex items-center justify-between text-white">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${typeInfo.icon}</span>
            <div>
              <div class="font-semibold">${typeInfo.label} · ${t('tableNumber')} ${task.table_number}</div>
              <div class="text-xs opacity-90">
                ${isClaimed ? `נלקח ע"י ${task.assigned_waiter_name || ''}` : `${elapsed} ${t('seconds')}`}
                ${task.special_note ? ` · ${Utils.escape(task.special_note)}` : ''}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${urgency === 'red' ? `<span class="px-2 py-1 bg-white/20 rounded text-xs font-bold animate-pulse-soft">⚠️ ${urgencyLabel}</span>` : ''}
            ${isClaimed 
              ? `<button data-complete="${task.id}" class="px-4 py-2 bg-white text-gray-800 rounded-lg font-semibold text-sm active:scale-95">
                  ✓ ${t('completeTask')}
                </button>`
              : `<button data-claim="${task.id}" class="px-4 py-2 bg-white text-gray-800 rounded-lg font-semibold text-sm active:scale-95">
                  ${t('claimTask')}
                </button>`
            }
          </div>
        </div>
      </div>
    `;
  },

  attachEvents() {
    document.getElementById('waiter-logout').addEventListener('click', () => {
      Auth.clearSession('waiter');
      this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
      this.state.subscriptions = [];
      if (this.state.timer) clearInterval(this.state.timer);
      window.location.hash = '';
    });
    
    document.querySelectorAll('[data-claim]').forEach(btn => {
      btn.addEventListener('click', () => this.claimTask(btn.dataset.claim));
    });
    
    document.querySelectorAll('[data-complete]').forEach(btn => {
      btn.addEventListener('click', () => this.completeTask(btn.dataset.complete));
    });
  },

  async claimTask(taskId) {
    try {
      const responseSeconds = Math.floor(Utils.elapsedSeconds(
        this.state.tasks.find(t => t.id === taskId)?.created_at
      ));
      
      await sbUpdate('tasks', { id: taskId }, {
        status: 'in_progress',
        assigned_waiter_name: this.state.name,
        claimed_at: new Date().toISOString(),
        response_seconds: responseSeconds,
      });
      
      Utils.toast(t('taskClaimed'));
      Utils.vibrate(50);
      await this.loadTasks();
      this.render();
    } catch(e) { Utils.toast('שגיאה'); console.error(e); }
  },

  async completeTask(taskId) {
    try {
      await sbUpdate('tasks', { id: taskId }, {
        status: 'done',
        completed_at: new Date().toISOString(),
      });
      
      Utils.toast(t('taskCompleted'));
      Utils.vibrate([100, 50, 100]);
      await this.loadTasks();
      this.render();
    } catch(e) { Utils.toast('שגיאה'); console.error(e); }
  },

  setupRealtime() {
    this.state.subscriptions.forEach(s => { try { s.unsubscribe(); } catch(e){} });
    this.state.subscriptions = [];
    
    const sub = sbSubscribeTasks(this.state.restaurantId, async () => {
      await this.loadTasks();
      this.render();
    });
    this.state.subscriptions.push(sub);
  },

  startTimer() {
    if (this.state.timer) clearInterval(this.state.timer);
    this.state.timer = setInterval(() => {
      const list = document.getElementById('task-list');
      if (!list || this.state.tasks.length === 0) return;
      
      // Re-render to update elapsed times and urgency colors
      this.render();
    }, 5000);
  },
};
