/* -------------------------------------------------------------
 * Student Success Center Digital Timesheet - Application Logic
 * ------------------------------------------------------------- */

// Mock Student Database for Searchable Select Dropdown
const studentDatabase = [
  { id: "LC-1082", name: "Marcus Vance" },
  { id: "LC-2194", name: "Aaliyah Jones" },
  { id: "LC-3094", name: "Tariq Simmons" },
  { id: "LC-4581", name: "Maya Lin" },
  { id: "LC-5920", name: "Darnell Washington" },
  { id: "LC-6721", name: "Chloe Tremblay" },
  { id: "LC-7182", name: "Sarah Chen" },
  { id: "LC-8291", name: "Brian O'Connor" },
  { id: "LC-9012", name: "Daniel Kim" },
  { id: "LC-9943", name: "Elena Rostova" }
];

// Application State
let timesheetState = {
  employeeName: '',
  periodStart: '',
  periodEnd: '',
  weeks: [], // Array of weeks, each containing 5 days (Mon-Fri)
  signature: '', // dataURL
  signatureDate: '',
  isSubmitted: false
};

// Initial setup parameters
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
let currentWeekIndex = 0;

// Initialize the default 5 weeks
function initDefaultWeeks() {
  timesheetState.weeks = [];
  for (let w = 0; w < 5; w++) {
    timesheetState.weeks.push(createEmptyWeek());
  }
}

function createEmptyWeek() {
  const days = [];
  for (let d = 0; d < 5; d++) {
    days.push({
      dayName: DAYS_OF_WEEK[d],
      date: '',
      in1: '',
      out1: '',
      in2: '',
      out2: '',
      hours: 0.00,
      sessions: []
    });
  }
  return days;
}

// -------------------------------------------------------------
// Auto-calculation Handlers
// -------------------------------------------------------------

// Calculate work hours between two times
function getHoursDiff(inTime, outTime, rowIdForWarning) {
  if (!inTime || !outTime) return 0;
  
  const [inHour, inMin] = inTime.split(':').map(Number);
  const [outHour, outMin] = outTime.split(':').map(Number);
  
  const inTotalMin = inHour * 60 + inMin;
  const outTotalMin = outHour * 60 + outMin;
  
  if (outTotalMin < inTotalMin) {
    if (rowIdForWarning) {
      showValidationError(rowIdForWarning, "Out time cannot be before In time.");
    }
    return 0;
  }
  
  return (outTotalMin - inTotalMin) / 60;
}

// Parse daily inputs and calculate total daily hours
function updateDailyHours(weekIndex, dayIndex) {
  const day = timesheetState.weeks[weekIndex][dayIndex];
  const rowId = `day-${weekIndex}-${dayIndex}`;
  
  clearValidationError(rowId);
  
  const period1 = getHoursDiff(day.in1, day.out1, rowId);
  const period2 = getHoursDiff(day.in2, day.out2, rowId);
  
  day.hours = parseFloat((period1 + period2).toFixed(2));
  
  // Refresh UI calculations
  recalculateTotals();
}

// Recalculate and update the UI summaries
function recalculateTotals() {
  let periodTotal = 0;
  const weeksStack = document.getElementById('summary-weeks-stack');
  weeksStack.innerHTML = '';
  
  timesheetState.weeks.forEach((week, wIdx) => {
    let weekTotal = 0;
    week.forEach(day => {
      weekTotal += day.hours;
    });
    
    periodTotal += weekTotal;
    
    // Add row to Weekly Summary UI card
    const weekRow = document.createElement('div');
    weekRow.className = 'flex justify-between items-center py-1 border-b border-white/5';
    weekRow.innerHTML = `
      <span class="text-gray-400 font-bold">Week ${wIdx + 1} Total</span>
      <span class="text-white font-extrabold">${weekTotal.toFixed(2)} hrs</span>
    `;
    weeksStack.appendChild(weekRow);
    
    // Also update current active tab total labels if available
    const tabEl = document.getElementById(`tab-week-${wIdx}`);
    if (tabEl) {
      tabEl.innerHTML = `Week ${wIdx + 1} <span class="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-200 border border-purple-500/20">${weekTotal.toFixed(2)}h</span>`;
    }
  });
  
  // Update final period hours
  document.getElementById('summary-total-hours').innerText = periodTotal.toFixed(2);
}

// Date helper: autofill date inputs based on Period Start Date
function autofillDates() {
  const startVal = document.getElementById('period-start').value;
  if (!startVal) return;
  
  const baseDate = new Date(startVal + 'T00:00:00'); // avoid timezone shifts
  
  timesheetState.weeks.forEach((week, wIdx) => {
    week.forEach((day, dIdx) => {
      const dayOffset = (wIdx * 7) + dIdx; // 7 calendar days per week
      const currentDayDate = new Date(baseDate);
      currentDayDate.setDate(baseDate.getDate() + dayOffset);
      
      const yyyy = currentDayDate.getFullYear();
      const mm = String(currentDayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDayDate.getDate()).padStart(2, '0');
      
      day.date = `${yyyy}-${mm}-${dd}`;
      
      // Update UI input if currently rendered
      const dateInput = document.getElementById(`date-input-${wIdx}-${dIdx}`);
      if (dateInput) {
        dateInput.value = day.date;
      }
    });
  });
}

// -------------------------------------------------------------
// Validation Warnings UI
// -------------------------------------------------------------
function showValidationError(rowId, message) {
  const warningContainer = document.getElementById(`warning-${rowId}`);
  if (warningContainer) {
    warningContainer.innerHTML = `<i data-lucide="alert-circle" class="h-3.5 w-3.5 text-red-500 shrink-0"></i> ${message}`;
    warningContainer.classList.remove('hidden');
    lucide.createIcons();
  }
}

function clearValidationError(rowId) {
  const warningContainer = document.getElementById(`warning-${rowId}`);
  if (warningContainer) {
    warningContainer.innerHTML = '';
    warningContainer.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// Rendering timesheet rows and tabs
// -------------------------------------------------------------

function renderWeekTabs() {
  const container = document.getElementById('week-tabs-container');
  container.innerHTML = '';
  
  timesheetState.weeks.forEach((week, wIdx) => {
    // calculate current week total
    let weekTotal = 0;
    week.forEach(d => weekTotal += d.hours);
    
    const tabButton = document.createElement('button');
    tabButton.type = 'button';
    tabButton.id = `tab-week-${wIdx}`;
    tabButton.className = `tab-week cursor-pointer ${currentWeekIndex === wIdx ? 'active' : ''}`;
    tabButton.innerHTML = `Week ${wIdx + 1} <span class="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-purple-600/30 text-purple-200 border border-purple-500/20">${weekTotal.toFixed(2)}h</span>`;
    
    tabButton.addEventListener('click', () => {
      currentWeekIndex = wIdx;
      // update active classes
      document.querySelectorAll('.tab-week').forEach(btn => btn.classList.remove('active'));
      tabButton.classList.add('active');
      renderDailyRows();
    });
    
    container.appendChild(tabButton);
  });
}

function renderDailyRows() {
  const container = document.getElementById('timesheet-rows-container');
  container.innerHTML = '';
  
  const activeWeekDays = timesheetState.weeks[currentWeekIndex];
  
  activeWeekDays.forEach((day, dIdx) => {
    const rowId = `day-${currentWeekIndex}-${dIdx}`;
    
    const dayCard = document.createElement('div');
    dayCard.className = `day-card animate-fade-in ${day.hours > 0 ? 'has-data' : ''}`;
    dayCard.id = `card-${rowId}`;
    
    dayCard.innerHTML = `
      <!-- Row Header/Hours log -->
      <div class="day-card-header p-5">
        <div class="timesheet-grid">
          <!-- Day & Date -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <span class="font-display font-black text-lg text-white w-24 shrink-0">${day.dayName}</span>
            <input type="date" id="date-input-${currentWeekIndex}-${dIdx}" class="input-dark py-2 text-xs" value="${day.date || ''}">
          </div>

          <!-- Shift 1 / Shift 2 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Period 1 -->
            <div class="flex items-center gap-2">
              <span class="font-mono text-[9px] text-gray-500 uppercase font-bold shrink-0">Shift 1</span>
              <div class="time-pair-grid w-full">
                <input type="time" class="input-dark py-2 px-2 text-xs text-center" id="in1-${currentWeekIndex}-${dIdx}" value="${day.in1 || ''}">
                <input type="time" class="input-dark py-2 px-2 text-xs text-center" id="out1-${currentWeekIndex}-${dIdx}" value="${day.out1 || ''}">
              </div>
            </div>
            <!-- Period 2 -->
            <div class="flex items-center gap-2">
              <span class="font-mono text-[9px] text-gray-500 uppercase font-bold shrink-0">Shift 2</span>
              <div class="time-pair-grid w-full">
                <input type="time" class="input-dark py-2 px-2 text-xs text-center" id="in2-${currentWeekIndex}-${dIdx}" value="${day.in2 || ''}">
                <input type="time" class="input-dark py-2 px-2 text-xs text-center" id="out2-${currentWeekIndex}-${dIdx}" value="${day.out2 || ''}">
              </div>
            </div>
          </div>

          <!-- Total Daily Calculated Hours -->
          <div class="flex items-center justify-between lg:justify-center border-t lg:border-t-0 border-white/5 pt-3 lg:pt-0">
            <span class="lg:hidden label-mono">Daily Total</span>
            <div class="font-mono text-sm font-bold text-white bg-white/5 border border-white/10 rounded-xl px-4 py-2 min-w-[70px] text-center">
              <span id="hours-display-${currentWeekIndex}-${dIdx}">${day.hours.toFixed(2)}</span>h
            </div>
          </div>

          <!-- Add Session Button -->
          <div class="flex justify-end pt-3 lg:pt-0">
            <button type="button" class="btn-secondary py-2.5 px-4 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20" id="btn-add-session-${currentWeekIndex}-${dIdx}">
              <i data-lucide="plus-circle" class="h-3.5 w-3.5 text-purple-400"></i> Session
            </button>
          </div>
        </div>

        <!-- Validation alert banner -->
        <div id="warning-${rowId}" class="mt-3 p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 hidden"></div>
      </div>

      <!-- Nested Tutoring Sessions Panel -->
      <div id="sessions-panel-${currentWeekIndex}-${dIdx}" class="sessions-panel ${day.sessions.length === 0 ? 'hidden' : ''}">
        <div class="border-b border-white/5 pb-2 mb-4">
          <span class="font-mono text-[10px] uppercase text-purple-300 tracking-wider font-extrabold flex items-center gap-1.5">
            <i data-lucide="users" class="h-4 w-4"></i> Tutoring &amp; Student Sessions (${day.sessions.length})
          </span>
        </div>
        <div id="sessions-list-${currentWeekIndex}-${dIdx}" class="space-y-4">
          <!-- Dynamically populated student session forms -->
        </div>
      </div>
    `;
    
    container.appendChild(dayCard);
    
    // Render tutoring sessions for this day
    renderSessions(currentWeekIndex, dIdx);
    
    // Wire up events
    setupRowEvents(currentWeekIndex, dIdx);
  });
  
  lucide.createIcons();
}

function setupRowEvents(wIdx, dIdx) {
  const day = timesheetState.weeks[wIdx][dIdx];
  const rowId = `day-${wIdx}-${dIdx}`;
  
  // Date Event
  const dateInput = document.getElementById(`date-input-${wIdx}-${dIdx}`);
  dateInput.addEventListener('change', (e) => {
    day.date = e.target.value;
  });
  
  // Shifts events
  const shiftsInputs = [`in1-${wIdx}-${dIdx}`, `out1-${wIdx}-${dIdx}`, `in2-${wIdx}-${dIdx}`, `out2-${wIdx}-${dIdx}`];
  shiftsInputs.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('change', (e) => {
      const field = id.split('-')[0];
      day[field] = e.target.value;
      
      // Calculate
      updateDailyHours(wIdx, dIdx);
      
      // Refresh display label
      document.getElementById(`hours-display-${wIdx}-${dIdx}`).innerText = day.hours.toFixed(2);
      
      // Highlight card if hours logged
      const card = document.getElementById(`card-${rowId}`);
      if (day.hours > 0) {
        card.classList.add('has-data');
      } else {
        card.classList.remove('has-data');
      }
    });
  });

  // Add Session click handler
  document.getElementById(`btn-add-session-${wIdx}-${dIdx}`).addEventListener('click', () => {
    // Add empty session record
    day.sessions.push({
      studentId: '',
      studentName: '',
      assignment: '',
      notes: ''
    });
    
    // Show panel
    document.getElementById(`sessions-panel-${wIdx}-${dIdx}`).classList.remove('hidden');
    
    // Rerender list
    renderSessions(wIdx, dIdx);
  });
}

// -------------------------------------------------------------
// Tutoring Sessions Render & Search Dropdown Component
// -------------------------------------------------------------

function renderSessions(wIdx, dIdx) {
  const listContainer = document.getElementById(`sessions-list-${wIdx}-${dIdx}`);
  if (!listContainer) return;
  
  listContainer.innerHTML = '';
  const day = timesheetState.weeks[wIdx][dIdx];
  
  day.sessions.forEach((session, sIdx) => {
    const sessionCard = document.createElement('div');
    sessionCard.className = 'session-row flex flex-col md:flex-row gap-5 items-start justify-between relative';
    
    sessionCard.innerHTML = `
      <!-- Search Dropdown Widget -->
      <div class="w-full md:w-5/12 space-y-2">
        <label class="label-mono">Select Student / ID</label>
        <div class="search-dropdown" id="dropdown-${wIdx}-${dIdx}-${sIdx}">
          <div class="input-dark dropdown-selected flex items-center justify-between" id="dropdown-select-${wIdx}-${dIdx}-${sIdx}">
            <span class="dropdown-label text-xs sm:text-sm text-gray-300">
              ${session.studentName ? `${session.studentName} (${session.studentId})` : 'Search & Select Student...'}
            </span>
            <i data-lucide="chevron-down" class="h-4 w-4 text-gray-400"></i>
          </div>
          <!-- Dropdown Options List -->
          <div class="dropdown-list" id="dropdown-list-${wIdx}-${dIdx}-${sIdx}">
            <input type="text" class="dropdown-search-input" placeholder="Search by name or student ID..." id="dropdown-search-${wIdx}-${dIdx}-${sIdx}">
            <div class="dropdown-options-container" id="dropdown-options-${wIdx}-${dIdx}-${sIdx}">
              <!-- Dynamic options -->
            </div>
          </div>
        </div>
      </div>

      <!-- Skills / Assignments -->
      <div class="w-full md:w-3/12 space-y-2">
        <label class="label-mono">Skills / Assignments</label>
        <input type="text" class="input-dark text-xs py-3" placeholder="e.g. Algebra review, Python lab" value="${session.assignment || ''}" id="assignment-input-${wIdx}-${dIdx}-${sIdx}">
      </div>

      <!-- Progress Notes -->
      <div class="w-full md:w-3/12 space-y-2">
        <label class="label-mono">Progress Notes</label>
        <textarea class="input-dark text-xs py-2 px-3 h-11 min-h-[44px] resize-y" placeholder="Student made progress on..." id="notes-input-${wIdx}-${dIdx}-${sIdx}">${session.notes || ''}</textarea>
      </div>

      <!-- Remove button -->
      <div class="pt-6 shrink-0">
        <button type="button" class="btn-remove-session" id="btn-remove-${wIdx}-${dIdx}-${sIdx}" title="Remove Session">
          <i data-lucide="trash-2" class="h-4 w-4"></i>
        </button>
      </div>
    `;
    
    listContainer.appendChild(sessionCard);
    
    // Attach custom dropdown widget controller
    initSearchDropdown(wIdx, dIdx, sIdx, session);
    
    // Input update events
    document.getElementById(`assignment-input-${wIdx}-${dIdx}-${sIdx}`).addEventListener('input', (e) => {
      session.assignment = e.target.value;
    });
    
    document.getElementById(`notes-input-${wIdx}-${dIdx}-${sIdx}`).addEventListener('input', (e) => {
      session.notes = e.target.value;
    });

    // Remove Session handler
    document.getElementById(`btn-remove-${wIdx}-${dIdx}-${sIdx}`).addEventListener('click', () => {
      day.sessions.splice(sIdx, 1);
      
      // Hide container if no sessions remaining
      if (day.sessions.length === 0) {
        document.getElementById(`sessions-panel-${wIdx}-${dIdx}`).classList.add('hidden');
      }
      
      // Rerender sessions
      renderSessions(wIdx, dIdx);
    });
  });
  
  lucide.createIcons();
}

// Search Dropdown controller implementation
function initSearchDropdown(wIdx, dIdx, sIdx, session) {
  const selectBox = document.getElementById(`dropdown-select-${wIdx}-${dIdx}-${sIdx}`);
  const listEl = document.getElementById(`dropdown-list-${wIdx}-${dIdx}-${sIdx}`);
  const searchInput = document.getElementById(`dropdown-search-${wIdx}-${dIdx}-${sIdx}`);
  const optionsContainer = document.getElementById(`dropdown-options-${wIdx}-${dIdx}-${sIdx}`);
  
  // Toggle show/hide options list
  selectBox.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = listEl.style.display !== 'block';
    
    // Close other open dropdowns
    document.querySelectorAll('.dropdown-list').forEach(el => el.style.display = 'none');
    
    if (isHidden) {
      listEl.style.display = 'block';
      searchInput.focus();
      searchInput.value = '';
      populateOptions(studentDatabase);
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', () => {
    listEl.style.display = 'none';
  });

  listEl.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent closing when interacting inside
  });

  // Search filter handler
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = studentDatabase.filter(s =>
      s.name.toLowerCase().includes(val) || s.id.toLowerCase().includes(val)
    );
    populateOptions(filtered);
  });

  // Populate options helper
  function populateOptions(items) {
    optionsContainer.innerHTML = '';
    
    if (items.length === 0) {
      optionsContainer.innerHTML = `<div class="dropdown-option no-results text-xs text-gray-500">No matching student found</div>`;
      return;
    }
    
    items.forEach(student => {
      const opt = document.createElement('div');
      opt.className = 'dropdown-option text-xs text-gray-300';
      opt.innerHTML = `<strong>${student.name}</strong> <span class="text-gray-500 ml-1">(${student.id})</span>`;
      
      opt.addEventListener('click', () => {
        // Update model state
        session.studentId = student.id;
        session.studentName = student.name;
        
        // Update select label
        selectBox.querySelector('.dropdown-label').innerText = `${student.name} (${student.id})`;
        
        // Close dropdown
        listEl.style.display = 'none';
      });
      optionsContainer.appendChild(opt);
    });
  }
}

// -------------------------------------------------------------
// HTML5 Digital Signature Pad Handler
// -------------------------------------------------------------
let isDrawing = false;
let canvas, ctx;

function initSignatureCanvas() {
  canvas = document.getElementById('signature-canvas');
  ctx = canvas.getContext('2d');
  const placeholder = document.getElementById('canvas-placeholder');

  // Set logical coordinate scale to fit physical resolution bounds
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function resizeCanvas() {
    // Preserve drawn paths by copying layout data during resize
    const tempCopy = canvas.toDataURL();
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    
    // Clear and restore paths
    ctx.strokeStyle = '#e3fc51'; // draw in electric lime!
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const img = new Image();
    img.src = tempCopy;
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
  }

  // Draw events for Mouse
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    placeholder.classList.add('hidden');
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  });

  window.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      timesheetState.signature = canvas.toDataURL();
    }
  });

  // Touch support for Mobile
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    placeholder.classList.add('hidden');
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDrawing = false;
    timesheetState.signature = canvas.toDataURL();
  });

  // Clear Signature click
  document.getElementById('btn-clear-sig').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    placeholder.classList.remove('hidden');
    timesheetState.signature = '';
  });
}

// -------------------------------------------------------------
// Save / Load Draft State via localStorage
// -------------------------------------------------------------

function saveDraft() {
  // Sync employee info metadata values
  timesheetState.employeeName = document.getElementById('emp-name').value;
  timesheetState.periodStart = document.getElementById('period-start').value;
  timesheetState.periodEnd = document.getElementById('period-end').value;
  timesheetState.signatureDate = document.getElementById('signature-date').value;

  localStorage.setItem('success_center_timesheet_draft', JSON.stringify(timesheetState));
  alert('Draft saved successfully to localStorage!');
}

function loadDraft() {
  const data = localStorage.getItem('success_center_timesheet_draft');
  if (!data) {
    alert('No saved draft found in this browser.');
    return;
  }
  
  try {
    const parsed = JSON.parse(data);
    timesheetState = parsed;
    
    // Fill metadata inputs
    document.getElementById('emp-name').value = timesheetState.employeeName || '';
    document.getElementById('period-start').value = timesheetState.periodStart || '';
    document.getElementById('period-end').value = timesheetState.periodEnd || '';
    document.getElementById('signature-date').value = timesheetState.signatureDate || '';
    
    // Redraw lists
    currentWeekIndex = 0;
    renderWeekTabs();
    renderDailyRows();
    recalculateTotals();
    
    // Redraw Signature if present
    if (timesheetState.signature) {
      const img = new Image();
      img.src = timesheetState.signature;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        document.getElementById('canvas-placeholder').classList.add('hidden');
      };
    }
    
    alert('Timesheet draft loaded successfully!');
  } catch (err) {
    alert('Error loading draft details: corrupted JSON.');
  }
}

// -------------------------------------------------------------
// Initialize App Hooks
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Setup Initial State
  initDefaultWeeks();
  renderWeekTabs();
  renderDailyRows();
  recalculateTotals();
  initSignatureCanvas();

  // Period start input changed -> autofill dates
  document.getElementById('period-start').addEventListener('change', () => {
    autofillDates();
  });

  // Buttons Event Listeners
  document.getElementById('btn-add-week').addEventListener('click', () => {
    timesheetState.weeks.push(createEmptyWeek());
    renderWeekTabs();
    recalculateTotals();
  });

  document.getElementById('btn-save-draft').addEventListener('click', () => {
    saveDraft();
  });

  document.getElementById('btn-load-draft').addEventListener('click', () => {
    loadDraft();
  });

  // Form submit handler
  document.getElementById('timesheet-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validations
    if (!timesheetState.signature) {
      alert('Required Field Missing: Please sign the digital canvas before submitting.');
      return;
    }
    
    // Verify times validations (Out time preceding In time)
    let hasValidationError = false;
    timesheetState.weeks.forEach((week, wIdx) => {
      week.forEach((day, dIdx) => {
        const rowId = `day-${wIdx}-${dIdx}`;
        const p1 = getHoursDiff(day.in1, day.out1);
        const p2 = getHoursDiff(day.in2, day.out2);
        
        if ((day.in1 && !day.out1) || (!day.in1 && day.out1) || (day.in2 && !day.out2) || (!day.in2 && day.out2)) {
          alert(`Week ${wIdx+1} ${day.dayName}: Complete both In and Out timestamps for logged shifts.`);
          hasValidationError = true;
        }
      });
    });

    if (hasValidationError) return;

    // Trigger lock state
    timesheetState.isSubmitted = true;
    
    // Disable inputs
    document.querySelectorAll('input, select, textarea, button:not(#btn-close-modal)').forEach(el => {
      el.disabled = true;
      el.classList.add('cursor-not-allowed');
    });
    
    // Show Success Modal
    document.getElementById('modal-success').classList.remove('hidden');
  });

  // Close modal click
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-success').classList.add('hidden');
  });
});
