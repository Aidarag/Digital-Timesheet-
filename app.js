/* -------------------------------------------------------------
 * Student Success Center Digital Timesheet - Redesigned SaaS Logic
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

// Redesigned Application State
let timesheetState = {
  employeeName: '',
  periodStart: '',
  periodEnd: '',
  weeks: [], // Array of weeks, each containing 7 days (Monday to Sunday)
  signatures: {
    employee: '',
    supervisor: '',
    payroll: ''
  },
  signatureDates: {
    employee: '',
    supervisor: '',
    payroll: ''
  },
  isSubmitted: false
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_OF_WEEK_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let currentWeekIndex = 0;

// Initialize 5 weeks with 7 days each
function initDefaultWeeks() {
  timesheetState.weeks = [];
  for (let w = 0; w < 5; w++) {
    timesheetState.weeks.push(createEmptyWeek());
  }
}

function createEmptyWeek() {
  const days = [];
  for (let d = 0; d < 7; d++) {
    days.push({
      dayName: DAYS_OF_WEEK[d],
      dayNameFull: DAYS_OF_WEEK_FULL[d],
      date: '',
      in1: '',
      out1: '',
      in2: '',
      out2: '',
      hours: 0.00,
      sessions: [
        { studentId: '', studentName: '', assignment: '', notes: '' } // start with 1 default session
      ]
    });
  }
  return days;
}

// -------------------------------------------------------------
// Auto-calculation Handlers
// -------------------------------------------------------------

function getHoursDiff(inTime, outTime, rowIdForWarning) {
  if (!inTime || !outTime) return 0;
  
  const [inHour, inMin] = inTime.split(':').map(Number);
  const [outHour, outMin] = outTime.split(':').map(Number);
  
  const inTotalMin = inHour * 60 + inMin;
  const outTotalMin = outHour * 60 + outMin;
  
  if (outTotalMin < inTotalMin) {
    if (rowIdForWarning) {
      alert(`Shift error in ${rowIdForWarning}: Out time cannot precede In time.`);
    }
    return 0;
  }
  
  return (outTotalMin - inTotalMin) / 60;
}

function updateDailyHours(weekIndex, dayIndex) {
  const day = timesheetState.weeks[weekIndex][dayIndex];
  const rowLabel = `Week ${weekIndex + 1} - ${day.dayNameFull}`;
  
  const period1 = getHoursDiff(day.in1, day.out1, rowLabel);
  const period2 = getHoursDiff(day.in2, day.out2, rowLabel);
  
  day.hours = parseFloat((period1 + period2).toFixed(2));
  
  // Recalculate and update UI labels
  recalculateTotals();
}

function recalculateTotals() {
  let periodTotal = 0;
  
  timesheetState.weeks.forEach((week, wIdx) => {
    let weekTotal = 0;
    week.forEach(day => {
      weekTotal += day.hours;
    });
    
    periodTotal += weekTotal;
    
    // Update summary tab value
    const tabEl = document.getElementById(`tab-week-${wIdx}`);
    if (tabEl) {
      tabEl.querySelector('.tab-hours-badge').innerText = `${weekTotal.toFixed(1)}h`;
    }
    
    // Update summary list cards
    const summaryVal = document.getElementById(`summary-val-${wIdx}`);
    if (summaryVal) {
      summaryVal.innerText = `${weekTotal.toFixed(1)} Hours`;
    }

    // Update table active week vertical rowspan display if rendering this week
    if (currentWeekIndex === wIdx) {
      const vertWeeklyTotalCell = document.getElementById('weekly-total-value-span');
      if (vertWeeklyTotalCell) {
        vertWeeklyTotalCell.innerText = weekTotal.toFixed(1);
      }
      // Also update week footer total card
      const weekFooterVal = document.getElementById('week-total-value');
      if (weekFooterVal) {
        weekFooterVal.innerText = weekTotal.toFixed(1);
      }
    }
  });
  
  // Update final period hours
  document.getElementById('summary-total-hours').innerText = `${periodTotal.toFixed(1)} Hours`;
}

// Date helper: autofill date inputs based on Period Start Date
function autofillDates() {
  const startVal = document.getElementById('period-start').value;
  if (!startVal) return;
  
  const baseDate = new Date(startVal + 'T00:00:00');
  
  timesheetState.weeks.forEach((week, wIdx) => {
    week.forEach((day, dIdx) => {
      const dayOffset = (wIdx * 7) + dIdx;
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

  // Update Week Start Date input field for active week
  updateWeekStartDateField();
  
  // Update Reporting Period display range
  updateReportingPeriodDisplay();
}

function updateWeekStartDateField() {
  const activeMon = timesheetState.weeks[currentWeekIndex][0];
  const weekStartInput = document.getElementById('week-start-date');
  if (weekStartInput && activeMon.date) {
    weekStartInput.value = activeMon.date;
  }
}

function updateReportingPeriodDisplay() {
  const start = document.getElementById('period-start').value;
  const end = document.getElementById('period-end').value;
  const display = document.getElementById('reporting-period-display');
  
  if (start && end) {
    const formatDate = (dateStr) => {
      const [y, m, d] = dateStr.split('-');
      return `${m}/${d}/${y}`;
    };
    display.value = `${formatDate(start)} - ${formatDate(end)}`;
  } else {
    display.value = 'MM/DD/YYYY - MM/DD/YYYY';
  }
}

// -------------------------------------------------------------
// Rendering rows and tabs
// -------------------------------------------------------------

function renderWeekTabs() {
  const container = document.getElementById('week-tabs-container');
  container.innerHTML = '';
  
  timesheetState.weeks.forEach((week, wIdx) => {
    let weekTotal = 0;
    week.forEach(d => weekTotal += d.hours);
    
    const tabButton = document.createElement('button');
    tabButton.type = 'button';
    tabButton.id = `tab-week-${wIdx}`;
    tabButton.className = `tab-week cursor-pointer ${currentWeekIndex === wIdx ? 'active' : ''}`;
    tabButton.innerHTML = `Week ${wIdx + 1} <span class="tab-hours-badge ml-1 text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-[#002060] border border-blue-500/20">${weekTotal.toFixed(1)}h</span>`;
    
    tabButton.addEventListener('click', () => {
      currentWeekIndex = wIdx;
      document.querySelectorAll('.tab-week').forEach(btn => btn.classList.remove('active'));
      tabButton.classList.add('active');
      
      const label = document.getElementById('week-total-label');
      if (label) label.innerText = `WEEK ${wIdx + 1} TOTAL`;
      
      renderDailyRows();
      updateWeekStartDateField();
    });
    
    container.appendChild(tabButton);
  });
}

function renderDailyRows() {
  const tbody = document.getElementById('table-rows-body');
  tbody.innerHTML = '';
  
  const activeWeekDays = timesheetState.weeks[currentWeekIndex];
  
  // Calculate current week total for rowspan cell
  let weekTotal = 0;
  activeWeekDays.forEach(d => weekTotal += d.hours);
  
  activeWeekDays.forEach((day, dIdx) => {
    const tr = document.createElement('tr');
    tr.className = 'text-center';
    
    // Date & Day column
    let dateCol = `
      <td class="py-3 px-3 border-r border-slate-200" data-label="Date">
        <div class="flex flex-col gap-1 items-start">
          <span class="font-display font-black text-xs text-slate-800">${day.dayName}</span>
          <input type="date" id="date-input-${currentWeekIndex}-${dIdx}" class="table-input py-1 text-[11px]" value="${day.date || ''}">
        </div>
      </td>
    `;
    
    // Shift Inputs columns
    let shiftsCols = `
      <td class="p-2 border-r border-slate-200" data-label="Shift 1 In"><input type="time" class="table-input" id="in1-${currentWeekIndex}-${dIdx}" value="${day.in1 || ''}"></td>
      <td class="p-2 border-r border-slate-200" data-label="Shift 1 Out"><input type="time" class="table-input" id="out1-${currentWeekIndex}-${dIdx}" value="${day.out1 || ''}"></td>
      <td class="p-2 border-r border-slate-200" data-label="Shift 2 In"><input type="time" class="table-input" id="in2-${currentWeekIndex}-${dIdx}" value="${day.in2 || ''}"></td>
      <td class="p-2 border-r border-slate-200" data-label="Shift 2 Out"><input type="time" class="table-input" id="out2-${currentWeekIndex}-${dIdx}" value="${day.out2 || ''}"></td>
    `;
    
    // Daily calculated hours column
    let dailyHrsCol = `
      <td class="p-2 border-r border-slate-200" data-label="Daily Hours">
        <span class="font-mono text-xs font-bold text-slate-800" id="hours-display-${currentWeekIndex}-${dIdx}">${day.hours.toFixed(1)}</span>
      </td>
    `;
    
    // Vertically merged Weekly Total column (only rendered on Monday dIdx === 0)
    let weeklyTotalCol = '';
    if (dIdx === 0) {
      weeklyTotalCol = `
        <td class="weekly-total-cell" rowspan="7" id="weekly-total-span-cell" data-label="Weekly Total">
          <span id="weekly-total-value-span">${weekTotal.toFixed(1)}</span>
        </td>
      `;
    }
    
    // Tutoring Cells
    let tutoringCols = `
      <!-- Student Name ID column -->
      <td class="py-3 px-3 border-r border-slate-200 text-left" data-label="Student Sessions">
        <div class="cell-sessions-container" id="cell-student-${currentWeekIndex}-${dIdx}"></div>
        <button type="button" class="btn-add-session-inline" id="btn-add-session-${currentWeekIndex}-${dIdx}">
          <i data-lucide="plus-circle" class="h-3 w-3"></i> Add Student Session
        </button>
      </td>
      <!-- Skills Worked On column -->
      <td class="py-3 px-3 border-r border-slate-200" data-label="Skills Cover">
        <div class="cell-sessions-container" id="cell-skills-${currentWeekIndex}-${dIdx}"></div>
      </td>
      <!-- Progress Notes column -->
      <td class="py-3 px-3" data-label="Notes Log">
        <div class="cell-sessions-container" id="cell-notes-${currentWeekIndex}-${dIdx}"></div>
      </td>
    `;
    
    tr.innerHTML = dateCol + shiftsCols + dailyHrsCol + weeklyTotalCol + tutoringCols;
    tbody.appendChild(tr);
    
    // Render tutoring session lists inside cell containers
    renderCellSessions(currentWeekIndex, dIdx);
    
    // Attach event listeners for row inputs
    setupRowEvents(currentWeekIndex, dIdx);
  });
  
  lucide.createIcons();
}

function setupRowEvents(wIdx, dIdx) {
  const day = timesheetState.weeks[wIdx][dIdx];
  
  // Date Input Event
  document.getElementById(`date-input-${wIdx}-${dIdx}`).addEventListener('change', (e) => {
    day.date = e.target.value;
  });
  
  // Shifts Inputs Events
  const ids = [`in1-${wIdx}-${dIdx}`, `out1-${wIdx}-${dIdx}`, `in2-${wIdx}-${dIdx}`, `out2-${wIdx}-${dIdx}`];
  ids.forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const field = id.split('-')[0];
      day[field] = e.target.value;
      
      // Compute hours
      updateDailyHours(wIdx, dIdx);
      
      // Update label
      document.getElementById(`hours-display-${wIdx}-${dIdx}`).innerText = day.hours.toFixed(1);
    });
  });

  // Add Session inline click
  document.getElementById(`btn-add-session-${wIdx}-${dIdx}`).addEventListener('click', () => {
    day.sessions.push({ studentId: '', studentName: '', assignment: '', notes: '' });
    renderCellSessions(wIdx, dIdx);
  });
}

// -------------------------------------------------------------
// Render nested tutoring session lists directly inside cells
// -------------------------------------------------------------

function renderCellSessions(wIdx, dIdx) {
  const studentCell = document.getElementById(`cell-student-${wIdx}-${dIdx}`);
  const skillsCell = document.getElementById(`cell-skills-${wIdx}-${dIdx}`);
  const notesCell = document.getElementById(`cell-notes-${wIdx}-${dIdx}`);
  
  if (!studentCell || !skillsCell || !notesCell) return;
  
  studentCell.innerHTML = '';
  skillsCell.innerHTML = '';
  notesCell.innerHTML = '';
  
  const day = timesheetState.weeks[wIdx][dIdx];
  
  day.sessions.forEach((session, sIdx) => {
    // 1. Render Student Dropdown slot
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'cell-session-row relative';
    dropdownDiv.innerHTML = `
      <div class="search-dropdown" id="dropdown-${wIdx}-${dIdx}-${sIdx}">
        <div class="dropdown-selected text-xs" id="dropdown-select-${wIdx}-${dIdx}-${sIdx}">
          <span class="dropdown-label truncate">
            ${session.studentName ? `${session.studentName} (${session.studentId})` : 'Select Student...'}
          </span>
          <i data-lucide="chevron-down" class="h-3 w-3 text-slate-400"></i>
        </div>
        <div class="dropdown-list" id="dropdown-list-${wIdx}-${dIdx}-${sIdx}">
          <input type="text" class="dropdown-search-input" placeholder="Search..." id="dropdown-search-${wIdx}-${dIdx}-${sIdx}">
          <div class="dropdown-options-container" id="dropdown-options-${wIdx}-${dIdx}-${sIdx}"></div>
        </div>
      </div>
    `;
    studentCell.appendChild(dropdownDiv);
    
    // Initialize searchable selection
    initSearchDropdown(wIdx, dIdx, sIdx, session);
    
    // 2. Render Skills Input slot
    const skillsDiv = document.createElement('div');
    skillsDiv.className = 'cell-session-row';
    skillsDiv.innerHTML = `
      <input type="text" class="table-input py-2 text-xs" placeholder="Enter skills..." value="${session.assignment || ''}" id="assignment-input-${wIdx}-${dIdx}-${sIdx}">
    `;
    skillsCell.appendChild(skillsDiv);
    
    document.getElementById(`assignment-input-${wIdx}-${dIdx}-${sIdx}`).addEventListener('input', (e) => {
      session.assignment = e.target.value;
    });
    
    // 3. Render Notes Textarea slot with Remove Button
    const notesDiv = document.createElement('div');
    notesDiv.className = 'cell-session-row pr-6'; // leave space for delete button
    notesDiv.innerHTML = `
      <textarea class="table-input py-1.5 px-2 text-xs h-9 min-h-[36px] resize-y leading-tight" placeholder="Enter progress notes..." id="notes-input-${wIdx}-${dIdx}-${sIdx}">${session.notes || ''}</textarea>
      <button type="button" class="btn-delete-session" id="btn-delete-${wIdx}-${dIdx}-${sIdx}" title="Delete Session">
        <i data-lucide="x" class="h-3 w-3"></i>
      </button>
    `;
    notesCell.appendChild(notesDiv);
    
    document.getElementById(`notes-input-${wIdx}-${dIdx}-${sIdx}`).addEventListener('input', (e) => {
      session.notes = e.target.value;
    });

    // Delete Session listener
    document.getElementById(`btn-delete-${wIdx}-${dIdx}-${sIdx}`).addEventListener('click', () => {
      day.sessions.splice(sIdx, 1);
      renderCellSessions(wIdx, dIdx);
    });
  });
  
  lucide.createIcons();
}

function initSearchDropdown(wIdx, dIdx, sIdx, session) {
  const selectBox = document.getElementById(`dropdown-select-${wIdx}-${dIdx}-${sIdx}`);
  const listEl = document.getElementById(`dropdown-list-${wIdx}-${dIdx}-${sIdx}`);
  const searchInput = document.getElementById(`dropdown-search-${wIdx}-${dIdx}-${sIdx}`);
  const optionsContainer = document.getElementById(`dropdown-options-${wIdx}-${dIdx}-${sIdx}`);
  
  selectBox.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = listEl.style.display !== 'block';
    document.querySelectorAll('.dropdown-list').forEach(el => el.style.display = 'none');
    
    if (isHidden) {
      listEl.style.display = 'block';
      searchInput.focus();
      searchInput.value = '';
      populateOptions(studentDatabase);
    }
  });

  document.addEventListener('click', () => {
    listEl.style.display = 'none';
  });

  listEl.addEventListener('click', (e) => e.stopPropagation());

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = studentDatabase.filter(s =>
      s.name.toLowerCase().includes(val) || s.id.toLowerCase().includes(val)
    );
    populateOptions(filtered);
  });

  function populateOptions(items) {
    optionsContainer.innerHTML = '';
    if (items.length === 0) {
      optionsContainer.innerHTML = `<div class="dropdown-option text-[11px] text-gray-400 italic text-center">No results</div>`;
      return;
    }
    
    items.forEach(student => {
      const opt = document.createElement('div');
      opt.className = 'dropdown-option text-left';
      opt.innerHTML = `<strong>${student.name}</strong> <span class="text-slate-400">(${student.id})</span>`;
      opt.addEventListener('click', () => {
        session.studentId = student.id;
        session.studentName = student.name;
        selectBox.querySelector('.dropdown-label').innerText = `${student.name} (${student.id})`;
        listEl.style.display = 'none';
      });
      optionsContainer.appendChild(opt);
    });
  }
}

// -------------------------------------------------------------
// Digital signature canvas handlers for all three boards
// -------------------------------------------------------------

const canvases = {
  employee: { id: 'canvas-employee', btn: 'btn-clear-employee', pl: 'placeholder-employee', field: 'employee', color: '#002060' },
  supervisor: { id: 'canvas-supervisor', btn: 'btn-clear-supervisor', pl: 'placeholder-supervisor', field: 'supervisor', color: '#002060' },
  payroll: { id: 'canvas-payroll', btn: 'btn-clear-payroll', pl: 'placeholder-payroll', field: 'payroll', color: '#002060' }
};

function initSignatures() {
  Object.keys(canvases).forEach(key => {
    const cfg = canvases[key];
    const canvasEl = document.getElementById(cfg.id);
    const ctx = canvasEl.getContext('2d');
    const plEl = document.getElementById(cfg.pl);
    
    let isDrawing = false;
    
    // Scale size
    canvasEl.width = canvasEl.parentElement.offsetWidth;
    canvasEl.height = canvasEl.parentElement.offsetHeight;
    
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    canvasEl.addEventListener('mousedown', (e) => {
      isDrawing = true;
      plEl.classList.add('hidden');
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });

    canvasEl.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });

    window.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        timesheetState.signatures[cfg.field] = canvasEl.toDataURL();
      }
    });

    // Touch
    canvasEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDrawing = true;
      plEl.classList.add('hidden');
      const touch = e.touches[0];
      const rect = canvasEl.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    canvasEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!isDrawing) return;
      const touch = e.touches[0];
      const rect = canvasEl.getBoundingClientRect();
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    }, { passive: false });

    canvasEl.addEventListener('touchend', () => {
      isDrawing = false;
      timesheetState.signatures[cfg.field] = canvasEl.toDataURL();
    });

    // Clear Button
    document.getElementById(cfg.btn).addEventListener('click', () => {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      plEl.classList.remove('hidden');
      timesheetState.signatures[cfg.field] = '';
    });
  });
}

// -------------------------------------------------------------
// Save / Load Draft State via localStorage
// -------------------------------------------------------------

function saveDraft() {
  timesheetState.employeeName = document.getElementById('emp-name').value;
  timesheetState.periodStart = document.getElementById('period-start').value;
  timesheetState.periodEnd = document.getElementById('period-end').value;
  
  timesheetState.signatureDates.employee = document.getElementById('date-employee').value;
  timesheetState.signatureDates.supervisor = document.getElementById('date-supervisor').value;
  timesheetState.signatureDates.payroll = document.getElementById('date-payroll').value;

  localStorage.setItem('ssc_timesheet_redesign_draft', JSON.stringify(timesheetState));
  alert('Timesheet draft saved successfully to localStorage!');
}

function loadDraft() {
  const data = localStorage.getItem('ssc_timesheet_redesign_draft');
  if (!data) {
    alert('No saved draft found.');
    return;
  }
  
  try {
    timesheetState = JSON.parse(data);
    
    // Fill metadata inputs
    document.getElementById('emp-name').value = timesheetState.employeeName || '';
    document.getElementById('period-start').value = timesheetState.periodStart || '';
    document.getElementById('period-end').value = timesheetState.periodEnd || '';
    
    document.getElementById('date-employee').value = timesheetState.signatureDates.employee || '';
    document.getElementById('date-supervisor').value = timesheetState.signatureDates.supervisor || '';
    document.getElementById('date-payroll').value = timesheetState.signatureDates.payroll || '';
    
    currentWeekIndex = 0;
    renderWeekTabs();
    renderDailyRows();
    recalculateTotals();
    
    // Redraw Signatures
    Object.keys(canvases).forEach(key => {
      const cfg = canvases[key];
      const canvasEl = document.getElementById(cfg.id);
      const ctx = canvasEl.getContext('2d');
      const sigData = timesheetState.signatures[cfg.field];
      
      if (sigData) {
        const img = new Image();
        img.src = sigData;
        img.onload = () => {
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
          ctx.drawImage(img, 0, 0);
          document.getElementById(cfg.pl).classList.add('hidden');
        };
      }
    });
    
    alert('Timesheet draft loaded successfully!');
  } catch (err) {
    alert('Error loading draft details.');
  }
}

// -------------------------------------------------------------
// App Initialization Setup
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Splash Screen Fade Out Trigger
  const splash = document.getElementById('splash-screen');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('fade-out-splash');
      setTimeout(() => {
        splash.remove();
      }, 500); // matches the transition-all duration-500 setting
    }, 1800); // 1.8 seconds loading screen delay
  }

  initDefaultWeeks();
  renderWeekTabs();
  renderDailyRows();
  recalculateTotals();
  initSignatures();

  // Period Date Range Autofill Events
  document.getElementById('period-start').addEventListener('change', () => {
    autofillDates();
  });
  document.getElementById('period-end').addEventListener('change', () => {
    updateReportingPeriodDisplay();
  });

  // Week Start Date input field changed
  const weekStartInput = document.getElementById('week-start-date');
  if (weekStartInput) {
    weekStartInput.addEventListener('change', (e) => {
      const startVal = e.target.value;
      if (!startVal) return;
      
      const baseDate = new Date(startVal + 'T00:00:00');
      const activeWeek = timesheetState.weeks[currentWeekIndex];
      
      activeWeek.forEach((day, dIdx) => {
        const currentDayDate = new Date(baseDate);
        currentDayDate.setDate(baseDate.getDate() + dIdx);
        
        const yyyy = currentDayDate.getFullYear();
        const mm = String(currentDayDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDayDate.getDate()).padStart(2, '0');
        
        day.date = `${yyyy}-${mm}-${dd}`;
        
        // Update input
        const dateInput = document.getElementById(`date-input-${currentWeekIndex}-${dIdx}`);
        if (dateInput) {
          dateInput.value = day.date;
        }
      });
    });
  }

  // Add Week tab click
  document.getElementById('btn-add-week').addEventListener('click', () => {
    timesheetState.weeks.push(createEmptyWeek());
    renderWeekTabs();
    recalculateTotals();
  });

  // Draft triggers
  document.getElementById('btn-save-draft').addEventListener('click', () => {
    saveDraft();
  });
  document.getElementById('btn-load-draft').addEventListener('click', () => {
    loadDraft();
  });

  // Helper to format and open Outlook mailto compose draft
  function sendTimesheetEmail() {
    const employeeName = document.getElementById('emp-name').value || 'Employee';
    const department = document.getElementById('emp-dept').value || 'Academic Support Center';
    const startPeriod = document.getElementById('period-start').value || 'N/A';
    const endPeriod = document.getElementById('period-end').value || 'N/A';

    // Construct Subject
    const subject = `[Timesheet Submission] ${employeeName} - Tutor (${startPeriod} to ${endPeriod})`;

    // Calculate totals
    let weekTotals = [0, 0, 0, 0, 0];
    let grandTotal = 0;
    timesheetState.weeks.forEach((week, wIdx) => {
      let weekSum = 0;
      week.forEach(day => {
        const p1 = getHoursDiff(day.in1, day.out1);
        const p2 = getHoursDiff(day.in2, day.out2);
        weekSum += (p1 + p2);
      });
      weekTotals[wIdx] = weekSum;
      grandTotal += weekSum;
    });

    // Construct Body Text
    let body = `LIVINGSTONE COLLEGE - TUTOR TIMESHEET\n`;
    body += `MONTHLY TIMESHEET SUBMISSION\n`;
    body += `==============================================\n\n`;
    body += `EMPLOYEE DETAILS:\n`;
    body += `- Name: ${employeeName}\n`;
    body += `- Department: ${department}\n`;
    body += `- Reporting Period: ${startPeriod} to ${endPeriod}\n\n`;
    
    body += `HOURS SUMMARY BY WEEK:\n`;
    weekTotals.forEach((total, idx) => {
      body += `- Week ${idx + 1}: ${total.toFixed(1)} Hours\n`;
    });
    body += `- GRAND TOTAL HOURS: ${grandTotal.toFixed(1)} Hours\n\n`;

    body += `DAILY LOG DETAILS & TUTORING SESSIONS:\n`;
    body += `----------------------------------------------\n`;
    timesheetState.weeks.forEach((week, wIdx) => {
      body += `\n[WEEK ${wIdx + 1}]\n`;
      let weekHasLogs = false;
      week.forEach(day => {
        const p1 = getHoursDiff(day.in1, day.out1);
        const p2 = getHoursDiff(day.in2, day.out2);
        const totalDayHours = p1 + p2;
        
        // If there are hours worked or a student session, log it
        if (totalDayHours > 0 || (day.sessions && day.sessions.length > 0)) {
          weekHasLogs = true;
          const formattedDate = day.dateVal || 'N/A';
          body += `- ${day.dayNameFull} (${formattedDate}):\n`;
          if (totalDayHours > 0) {
            body += `  * Hours Logged: ${totalDayHours.toFixed(1)} Hours (Shift 1: ${day.in1 || '--'} to ${day.out1 || '--'} | Shift 2: ${day.in2 || '--'} to ${day.out2 || '--'})\n`;
          }
          if (day.sessions && day.sessions.length > 0) {
            body += `  * Tutoring Sessions:\n`;
            day.sessions.forEach(sess => {
              body += `    + Student: ${sess.studentName} (${sess.studentId})\n`;
              body += `      Skills Worked On: ${sess.skills}\n`;
              body += `      Progress Notes: ${sess.progress}\n`;
            });
          }
        }
      });
      if (!weekHasLogs) {
        body += `  (No hours or sessions logged for this week)\n`;
      }
    });

    body += `\n==============================================\n`;
    body += `SIGNATURE METADATA:\n`;
    body += `- Employee Signature: SIGNED (Authorized Date: ${timesheetState.signatureDates.employee || 'N/A'})\n`;
    if (timesheetState.signatures.supervisor) {
      body += `- Supervisor Signature: SIGNED (Authorized Date: ${timesheetState.signatureDates.supervisor || 'N/A'})\n`;
    }
    if (timesheetState.signatures.payroll) {
      body += `- Payroll Signature: SIGNED (Authorized Date: ${timesheetState.signatureDates.payroll || 'N/A'})\n`;
    }
    body += `\nSubmitted on: ${new Date().toLocaleString()}\n`;

    // Encode Mailto Link
    const mailtoUrl = `mailto:bdavis1@livingstone.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Trigger open default mail client
    window.location.href = mailtoUrl;
  }

  // Form Submit validation checks
  document.getElementById('timesheet-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Check Employee signature
    if (!timesheetState.signatures.employee) {
      alert('Required Field Missing: Please sign the Employee Signature canvas before submitting.');
      return;
    }
    
    // Verify shifts hours validation checks
    let hasValidationError = false;
    timesheetState.weeks.forEach((week, wIdx) => {
      week.forEach((day, dIdx) => {
        if ((day.in1 && !day.out1) || (!day.in1 && day.out1) || (day.in2 && !day.out2) || (!day.in2 && day.out2)) {
          alert(`Week ${wIdx+1} - ${day.dayNameFull}: Complete both In and Out timestamps for logged shifts.`);
          hasValidationError = true;
        }
      });
    });

    if (hasValidationError) return;

    // Lock inputs
    timesheetState.isSubmitted = true;
    document.querySelectorAll('input, select, textarea, button:not(#btn-close-modal):not(#btn-send-email):not(#btn-download-pdf)').forEach(el => {
      el.disabled = true;
      el.classList.add('cursor-not-allowed');
    });

    document.getElementById('modal-success').classList.remove('hidden');
  });

  // Success Modal Actions
  document.getElementById('btn-send-email').addEventListener('click', () => {
    sendTimesheetEmail();
  });

  document.getElementById('btn-download-pdf').addEventListener('click', () => {
    generateTimesheetPDF();
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-success').classList.add('hidden');
  });

  // Print PDF Generator
  function generateTimesheetPDF() {
    const employeeName = document.getElementById('emp-name').value || 'Employee';
    const startPeriod = document.getElementById('period-start').value || 'N/A';
    const endPeriod = document.getElementById('period-end').value || 'N/A';

    // Populate meta
    document.getElementById('print-emp-name').textContent = employeeName;
    document.getElementById('print-period-start').textContent = startPeriod;
    document.getElementById('print-period-end').textContent = endPeriod;

    // Calculate weekly sums
    let weekTotals = [0, 0, 0, 0, 0];
    let grandTotal = 0;
    timesheetState.weeks.forEach((week, wIdx) => {
      let weekSum = 0;
      week.forEach(day => {
        const p1 = getHoursDiff(day.in1, day.out1);
        const p2 = getHoursDiff(day.in2, day.out2);
        weekSum += (p1 + p2);
      });
      weekTotals[wIdx] = weekSum;
      grandTotal += weekSum;
      document.getElementById(`print-w${wIdx + 1}`).textContent = weekSum.toFixed(1);
    });
    document.getElementById('print-total').textContent = grandTotal.toFixed(1);

    // Compile detailed list
    const tbody = document.getElementById('print-details-body');
    tbody.innerHTML = '';

    timesheetState.weeks.forEach((week, wIdx) => {
      week.forEach(day => {
        const p1 = getHoursDiff(day.in1, day.out1);
        const p2 = getHoursDiff(day.in2, day.out2);
        const totalHours = p1 + p2;
        const hasSessions = day.sessions && day.sessions.length > 0;

        // Only display days that have logged shifts or sessions
        if (totalHours > 0 || hasSessions) {
          const tr = document.createElement('tr');
          
          // Format sessions text
          let sessionsText = 'No sessions logged';
          if (hasSessions) {
            sessionsText = day.sessions.map(s => {
              return `• ${s.studentName} (${s.studentId})\n  Skills: ${s.skills}\n  Notes: ${s.progress}`;
            }).join('\n\n');
          }

          tr.innerHTML = `
            <td style="font-weight: bold; white-space: nowrap;">${day.dayNameFull}<br><span style="font-size: 8px; font-weight: normal; color: #475569;">${day.dateVal || 'N/A'}</span></td>
            <td>${day.in1 ? `${day.in1} - ${day.out1}` : '--'}</td>
            <td>${day.in2 ? `${day.in2} - ${day.out2}` : '--'}</td>
            <td style="font-weight: bold;">${totalHours.toFixed(1)}</td>
            <td style="white-space: pre-line; font-size: 9px; line-height: 1.3;">${sessionsText}</td>
          `;
          tbody.appendChild(tr);
        }
      });
    });

    if (tbody.children.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align: center; color: #94a3b8; font-style: italic;">No shifts or tutoring sessions logged during this period.</td>`;
      tbody.appendChild(tr);
    }

    // Transfer signatures
    transferSignatureToImg('canvas-employee', 'print-sig-img-employee');
    transferSignatureToImg('canvas-supervisor', 'print-sig-img-supervisor');
    transferSignatureToImg('canvas-payroll', 'print-sig-img-payroll');

    // Populate signature dates
    document.getElementById('print-sig-date-employee').textContent = timesheetState.signatureDates.employee || 'N/A';
    document.getElementById('print-sig-date-supervisor').textContent = timesheetState.signatureDates.supervisor || 'N/A';
    document.getElementById('print-sig-date-payroll').textContent = timesheetState.signatureDates.payroll || 'N/A';

    // Trigger print view
    window.print();
  }

  function transferSignatureToImg(canvasId, imgId) {
    const canvas = document.getElementById(canvasId);
    const img = document.getElementById(imgId);
    if (canvas && img) {
      // Check if canvas is drawn on (not completely blank/empty)
      const isBlank = isCanvasBlank(canvas);
      if (!isBlank) {
        img.src = canvas.toDataURL();
        img.style.display = 'block';
      } else {
        img.src = '';
        img.style.display = 'none';
      }
    }
  }

  function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  }
});
