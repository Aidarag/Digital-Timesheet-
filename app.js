/* -------------------------------------------------------------
 * Student Success Center Digital Timesheet - Redesigned SaaS Logic
 * ------------------------------------------------------------- */

// Redesigned Application State
let timesheetState = {
  employeeName: '',
  employeeEmail: '',
  tutorId: '',
  periodStart: '',
  periodEnd: '',
  weeks: [], // Array of weeks, each containing 6 days (Monday to Saturday, Sundays excluded)
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

// Persistent Tutor Profile Storage Keys (kept across all entries & browser sessions)
const TUTOR_STORAGE_KEYS = {
  EMAIL: 'ssc_tutor_email',
  NAME: 'ssc_tutor_name',
  ID: 'ssc_tutor_id'
};

function getSavedTutorProfile() {
  return {
    email: localStorage.getItem(TUTOR_STORAGE_KEYS.EMAIL) || '',
    name: localStorage.getItem(TUTOR_STORAGE_KEYS.NAME) || '',
    id: localStorage.getItem(TUTOR_STORAGE_KEYS.ID) || ''
  };
}

function saveTutorEmail(email) {
  if (!email) return;
  const trimmed = email.trim();
  if (trimmed) {
    localStorage.setItem(TUTOR_STORAGE_KEYS.EMAIL, trimmed);
    timesheetState.employeeEmail = trimmed;

    // Sync input fields if present
    const empEmailInput = document.getElementById('emp-email');
    if (empEmailInput && empEmailInput.value !== trimmed) {
      empEmailInput.value = trimmed;
    }
    const modalEmailInput = document.getElementById('modal-tutor-email');
    if (modalEmailInput && modalEmailInput.value !== trimmed) {
      modalEmailInput.value = trimmed;
    }
    const badge = document.getElementById('modal-email-status-badge');
    if (badge) {
      badge.style.display = 'inline-block';
    }
  }
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_OF_WEEK_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let currentWeekIndex = 0;

// Initialize 5 weeks with 6 days each (Mon-Sat, no Sundays)
function initDefaultWeeks() {
  timesheetState.weeks = [];
  for (let w = 0; w < 5; w++) {
    timesheetState.weeks.push(createEmptyWeek());
  }
}

function createEmptyWeek() {
  const days = [];
  for (let d = 0; d < DAYS_OF_WEEK.length; d++) {
    days.push({
      dayName: DAYS_OF_WEEK[d],
      dayNameFull: DAYS_OF_WEEK_FULL[d],
      date: '',
      in1: '',
      out1: '',
      in2: '',
      out2: '',
      hours: 0.00,
      studentName: '',
      studentId: '',
      assignment: '',
      notes: ''
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
    
    // Update summary tab badge
    const tabEl = document.getElementById(`tab-week-${wIdx}`);
    if (tabEl) {
      const badge = tabEl.querySelector('.tab-hours-badge');
      if (badge) badge.innerText = `${weekTotal.toFixed(1)}h`;
    }

    // Update week footer total if this is the active week
    if (currentWeekIndex === wIdx) {
      const weekFooterVal = document.getElementById('week-total-value');
      if (weekFooterVal) {
        weekFooterVal.innerText = `${weekTotal.toFixed(1)} Hours`;
      }
      const weeklyTotalCellDisplay = document.getElementById('weekly-total-display-value');
      if (weeklyTotalCellDisplay) {
        weeklyTotalCellDisplay.innerText = weekTotal.toFixed(1);
      }
    }
  });
  
  // Update final period hours
  const totalEl = document.getElementById('summary-total-hours');
  if (totalEl) {
    totalEl.innerHTML = `${periodTotal.toFixed(1)} <span style="font-size: 0.875rem; font-weight: 700; color: var(--text-medium);">Hours</span>`;
  }
}

function formatDateString(dateStr) {
  if (!dateStr) return 'MM/DD/YYYY';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(m) && !isNaN(d) && months[m]) {
      return `${months[m]} ${d}, ${y}`;
    }
  }
  return formatDateString(dateStr);
}

function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}

// Date helper: autofill date inputs based on Period Start Date
function autofillDates() {
  const startVal = document.getElementById('period-start').value;
  if (!startVal) return;
  
  // Parse date without timezone offsets
  const [startY, startM, startD] = startVal.split('-').map(Number);
  const baseDate = new Date(startY, startM - 1, startD);
  
  // Align to Monday of that week:
  // getDay(): 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const dayOfWeek = baseDate.getDay();
  let mondayOffset = 0;
  if (dayOfWeek === 0) {
    mondayOffset = 1; // Advance Sunday to Monday (Sundays are excluded)
  } else if (dayOfWeek > 1) {
    mondayOffset = -(dayOfWeek - 1); // Rewind to Monday of this week
  }
  
  const startingMonday = new Date(baseDate);
  startingMonday.setDate(baseDate.getDate() + mondayOffset);

  timesheetState.weeks.forEach((week, wIdx) => {
    week.forEach((day, dIdx) => {
      // 6 days per week: dIdx 0..5 (Mon..Sat).
      // Week wIdx starts wIdx * 7 days after startingMonday, skipping Sunday (day offset 6).
      const dayOffset = (wIdx * 7) + dIdx;
      const currentDayDate = new Date(startingMonday);
      currentDayDate.setDate(startingMonday.getDate() + dayOffset);
      
      const yyyy = currentDayDate.getFullYear();
      const mm = String(currentDayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDayDate.getDate()).padStart(2, '0');
      
      day.date = `${yyyy}-${mm}-${dd}`;
      
      // Update UI label if currently rendered
      const dateLabel = document.getElementById(`date-label-${wIdx}-${dIdx}`);
      if (dateLabel) {
        dateLabel.innerText = formatDateString(day.date);
      }
    });
  });

  // Update Week Date Range input field for active week
  updateWeekStartDateField();
  
  // Update Reporting Period display range
  updateReportingPeriodDisplay();
}

function updateWeekStartDateField() {
  const activeWeek = timesheetState.weeks[currentWeekIndex];
  const weekStartEl = document.getElementById('week-start-date-display');
  if (weekStartEl && activeWeek && activeWeek.length > 0) {
    const monDate = activeWeek[0].date ? formatDateString(activeWeek[0].date) : '';
    const satDate = activeWeek[activeWeek.length - 1].date ? formatDateString(activeWeek[activeWeek.length - 1].date) : '';
    if (monDate && satDate) {
      weekStartEl.innerText = `${monDate} – ${satDate}`;
    } else if (monDate) {
      weekStartEl.innerText = monDate;
    } else {
      weekStartEl.innerText = 'MM/DD/YYYY';
    }
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
    display.textContent = `${formatDate(start)} – ${formatDate(end)}`;
  } else {
    display.textContent = 'MM/DD/YYYY';
  }
}

// -------------------------------------------------------------
// Rendering rows and tabs
// -------------------------------------------------------------

function deleteWeek(wIdx) {
  if (timesheetState.weeks.length <= 1) return;
  
  const weekTotal = timesheetState.weeks[wIdx].reduce((sum, d) => sum + d.hours, 0);
  if (weekTotal > 0) {
    if (!confirm(`Week ${wIdx + 1} has ${weekTotal.toFixed(1)} recorded hours. Are you sure you want to delete this week?`)) {
      return;
    }
  }
  
  timesheetState.weeks.splice(wIdx, 1);
  if (currentWeekIndex >= timesheetState.weeks.length) {
    currentWeekIndex = Math.max(0, timesheetState.weeks.length - 1);
  }
  
  autofillDates();
  renderWeekTabs();
  renderDailyRows();
  recalculateTotals();
}

function renderWeekTabs() {
  const container = document.getElementById('week-tabs-container');
  container.innerHTML = '';
  const totalWeeks = timesheetState.weeks.length;
  
  timesheetState.weeks.forEach((week, wIdx) => {
    let weekTotal = 0;
    week.forEach(d => weekTotal += d.hours);
    
    const tabButton = document.createElement('div');
    tabButton.id = `tab-week-${wIdx}`;
    tabButton.className = `tab-week cursor-pointer flex items-center gap-1.5 ${currentWeekIndex === wIdx ? 'active' : ''}`;
    
    const labelSpan = document.createElement('span');
    labelSpan.innerText = `Week ${wIdx + 1}`;
    
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'tab-hours-badge';
    badgeSpan.innerText = `${weekTotal.toFixed(1)}h`;

    tabButton.appendChild(labelSpan);
    tabButton.appendChild(badgeSpan);
    
    if (totalWeeks > 1) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-delete-week';
      delBtn.title = 'Delete Week';
      delBtn.setAttribute('aria-label', `Delete Week ${wIdx + 1}`);
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteWeek(wIdx);
      });
      tabButton.appendChild(delBtn);
    }
    
    tabButton.addEventListener('click', () => {
      currentWeekIndex = wIdx;
      document.querySelectorAll('.tab-week').forEach(btn => btn.classList.remove('active'));
      tabButton.classList.add('active');
      
      const label = document.getElementById('week-total-label');
      if (label) label.innerText = `Week ${wIdx + 1} Total`;
      
      renderDailyRows();
      recalculateTotals();
      updateWeekStartDateField();
    });
    
    container.appendChild(tabButton);
  });

  // Update remove week button state
  const removeBtn = document.getElementById('btn-remove-week');
  if (removeBtn) {
    if (timesheetState.weeks.length <= 1) {
      removeBtn.disabled = true;
      removeBtn.style.opacity = '0.35';
      removeBtn.style.cursor = 'not-allowed';
    } else {
      removeBtn.disabled = false;
      removeBtn.style.opacity = '1';
      removeBtn.style.cursor = 'pointer';
    }
  }
}


function renderDailyRows() {
  const tbody = document.getElementById('table-rows-body');
  tbody.innerHTML = '';
  
  const activeWeekDays = timesheetState.weeks[currentWeekIndex];
  
  // Calculate total weekly hours first so we can show it in the rowspan cell
  let weeklyTotalSum = 0;
  activeWeekDays.forEach(day => weeklyTotalSum += day.hours);
  
  activeWeekDays.forEach((day, dIdx) => {
    const tr = document.createElement('tr');
    
    // 1. Date column
    let dateCol = `
      <td class="col-date" data-label="Date" style="padding: 10px 8px; text-align: center;">
        <div style="font-family: var(--font-display); font-weight: 700; font-size: 14px; color: #0f172a;">${day.dayName}</div>
        <div id="date-label-${currentWeekIndex}-${dIdx}" style="font-size: 12px; color: #475569; font-weight: 500; margin-top: 2px; font-feature-settings: 'tnum';">${formatDateString(day.date)}</div>
      </td>
    `;
    
    // 2-5. Time In / Out (1st shift)
    let shift1Cols = `
      <td class="col-shift" data-label="In" style="padding: 8px;"><input type="time" class="table-input" id="in1-${currentWeekIndex}-${dIdx}" value="${day.in1 || ''}"></td>
      <td class="col-shift" data-label="Out" style="padding: 8px;"><input type="time" class="table-input" id="out1-${currentWeekIndex}-${dIdx}" value="${day.out1 || ''}"></td>
    `;
    
    // 6-7. Time In / Out (2nd shift)
    let shift2Cols = `
      <td class="col-shift" data-label="In (2nd)" style="padding: 8px;"><input type="time" class="table-input" id="in2-${currentWeekIndex}-${dIdx}" value="${day.in2 || ''}"></td>
      <td class="col-shift" data-label="Out (2nd)" style="padding: 8px;"><input type="time" class="table-input" id="out2-${currentWeekIndex}-${dIdx}" value="${day.out2 || ''}"></td>
    `;
    
    // 8. Total Daily Hours
    let hoursCol = `
      <td class="col-hours" data-label="Daily Hours" style="padding: 8px; text-align: center;">
        <span style="font-family: var(--font-body); font-feature-settings: 'tnum'; font-size: 14px; font-weight: 700; color: #002060; background: rgba(79, 70, 229, 0.08); padding: 4px 10px; border-radius: 6px; display: inline-block;" id="hours-display-${currentWeekIndex}-${dIdx}">${day.hours.toFixed(1)}</span>
      </td>
    `;
    
    // 9. Weekly Total column (rowspan for all days of the week on first day only)
    let weeklyTotalCol = '';
    if (dIdx === 0) {
      weeklyTotalCol = `
        <td class="col-weekly" rowspan="${activeWeekDays.length}" id="weekly-total-cell" style="padding: 8px; text-align: center; vertical-align: middle; background: rgba(79, 70, 229, 0.03); border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1;">
          <span style="font-family: var(--font-body); font-feature-settings: 'tnum'; font-size: 16px; font-weight: 800; color: var(--color-blue-vibrant); background: rgba(79, 70, 229, 0.08); padding: 6px 12px; border-radius: 8px; display: inline-block;" id="weekly-total-display-value">${weeklyTotalSum.toFixed(1)}</span>
        </td>
      `;
    }
    
    // 10. Student Name / ID column
    let studentCol = `
      <td class="col-student" data-label="Student Name / ID" style="padding: 8px;">
        <input type="text" class="table-input" id="student-input-${currentWeekIndex}-${dIdx}" placeholder="Enter student name or ID..." value="${day.studentName || ''}">
      </td>
    `;
    
    // 11. Skills / Assignment(s) Worked On column
    let skillsCol = `
      <td class="col-skills" data-label="Skills / Assignments Worked On" style="padding: 8px;">
        <textarea class="table-input py-1.5 px-2.5 text-xs h-12 min-h-[40px] resize-y leading-snug" id="skills-input-${currentWeekIndex}-${dIdx}" placeholder="Enter skills or assignments...">${day.assignment || ''}</textarea>
      </td>
    `;
    
    // 12. Progress Notes column
    let notesCol = `
      <td class="col-notes" data-label="Progress Notes" style="padding: 8px;">
        <textarea class="table-input py-1.5 px-2.5 text-xs h-12 min-h-[40px] resize-y leading-snug" id="notes-input-${currentWeekIndex}-${dIdx}" placeholder="Enter progress notes...">${day.notes || ''}</textarea>
      </td>
    `;
    
    tr.innerHTML = dateCol + shift1Cols + shift2Cols + hoursCol + weeklyTotalCol + studentCol + skillsCol + notesCol;
    tbody.appendChild(tr);
    
    setupRowEvents(currentWeekIndex, dIdx);
  });
  
  lucide.createIcons();
}

function setupRowEvents(wIdx, dIdx) {
  const day = timesheetState.weeks[wIdx][dIdx];
  
  // Shifts Inputs Events (listen to both change and input)
  const ids = [`in1-${wIdx}-${dIdx}`, `out1-${wIdx}-${dIdx}`, `in2-${wIdx}-${dIdx}`, `out2-${wIdx}-${dIdx}`];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const handleShiftUpdate = () => {
        const field = id.split('-')[0];
        day[field] = el.value;
        
        // Compute hours
        updateDailyHours(wIdx, dIdx);
        
        // Update label
        const hoursDisp = document.getElementById(`hours-display-${wIdx}-${dIdx}`);
        if (hoursDisp) hoursDisp.innerText = day.hours.toFixed(1);
      };

      el.addEventListener('change', handleShiftUpdate);
      el.addEventListener('input', handleShiftUpdate);
    }
  });

  // Student Name / ID text input
  const studentInput = document.getElementById(`student-input-${wIdx}-${dIdx}`);
  if (studentInput) {
    studentInput.addEventListener('input', (e) => {
      day.studentName = e.target.value;
    });
  }

  // Skills / Assignment worked on text input
  const skillsInput = document.getElementById(`skills-input-${wIdx}-${dIdx}`);
  if (skillsInput) {
    skillsInput.addEventListener('input', (e) => {
      day.assignment = e.target.value;
    });
  }

  // Progress notes text input
  const notesInput = document.getElementById(`notes-input-${wIdx}-${dIdx}`);
  if (notesInput) {
    notesInput.addEventListener('input', (e) => {
      day.notes = e.target.value;
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
  timesheetState.employeeEmail = document.getElementById('emp-email')?.value || '';
  timesheetState.tutorId = document.getElementById('emp-id').value;
  timesheetState.periodStart = document.getElementById('period-start').value;
  timesheetState.periodEnd = document.getElementById('period-end').value;
  
  timesheetState.signatureDates.employee = document.getElementById('date-employee').value;
  timesheetState.signatureDates.supervisor = document.getElementById('date-supervisor').value;
  timesheetState.signatureDates.payroll = document.getElementById('date-payroll').value;

  if (timesheetState.employeeEmail) {
    saveTutorEmail(timesheetState.employeeEmail);
  }
  if (timesheetState.employeeName) {
    localStorage.setItem(TUTOR_STORAGE_KEYS.NAME, timesheetState.employeeName.trim());
  }
  if (timesheetState.tutorId) {
    localStorage.setItem(TUTOR_STORAGE_KEYS.ID, timesheetState.tutorId.trim());
  }

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
    
    // Migrate legacy session arrays to flat properties and ensure Sunday is omitted
    if (timesheetState.weeks) {
      timesheetState.weeks.forEach(week => {
        // Strip out Sunday if present
        const sunIdx = week.findIndex(d => d.dayName === 'Sun' || d.dayNameFull === 'Sunday');
        if (sunIdx !== -1) {
          week.splice(sunIdx, 1);
        }
        if (week.length > 6) {
          week.length = 6;
        }
        week.forEach(day => {
          if (day.sessions && day.sessions.length > 0) {
            if (!day.studentName) day.studentName = day.sessions[0].studentName || '';
            if (!day.assignment) day.assignment = day.sessions[0].assignment || '';
            if (!day.notes) day.notes = day.sessions[0].notes || '';
          }
        });
      });
    }
    
    // Fill metadata inputs
    document.getElementById('emp-name').value = timesheetState.employeeName || '';
    if (document.getElementById('emp-email')) {
      document.getElementById('emp-email').value = timesheetState.employeeEmail || localStorage.getItem(TUTOR_STORAGE_KEYS.EMAIL) || '';
    }
    document.getElementById('emp-id').value = timesheetState.tutorId || '';
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
      }, 500);
    }, 1800);
  }

  initDefaultWeeks();
  renderWeekTabs();
  renderDailyRows();
  recalculateTotals();
  initSignatures();

  // Restore saved tutor profile across all entries whenever the user uses the web app
  const savedProfile = getSavedTutorProfile();
  if (savedProfile.email) {
    const empEmail = document.getElementById('emp-email');
    if (empEmail) empEmail.value = savedProfile.email;
    const modalEmail = document.getElementById('modal-tutor-email');
    if (modalEmail) modalEmail.value = savedProfile.email;
    timesheetState.employeeEmail = savedProfile.email;
    const badge = document.getElementById('modal-email-status-badge');
    if (badge) badge.style.display = 'inline-block';
  }
  if (savedProfile.name) {
    const empName = document.getElementById('emp-name');
    if (empName && !empName.value) {
      empName.value = savedProfile.name;
      timesheetState.employeeName = savedProfile.name;
    }
  }
  if (savedProfile.id) {
    const empId = document.getElementById('emp-id');
    if (empId && !empId.value) {
      empId.value = savedProfile.id;
      timesheetState.tutorId = savedProfile.id;
    }
  }

  // Auto-save tutor details on input & change so they are kept for any other entry
  const empEmailInput = document.getElementById('emp-email');
  if (empEmailInput) {
    empEmailInput.addEventListener('input', (e) => {
      saveTutorEmail(e.target.value);
    });
    empEmailInput.addEventListener('change', (e) => {
      saveTutorEmail(e.target.value);
    });
  }

  const modalEmailInput = document.getElementById('modal-tutor-email');
  if (modalEmailInput) {
    modalEmailInput.addEventListener('input', (e) => {
      saveTutorEmail(e.target.value);
    });
    modalEmailInput.addEventListener('change', (e) => {
      saveTutorEmail(e.target.value);
    });
  }

  const empNameInput = document.getElementById('emp-name');
  if (empNameInput) {
    empNameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        localStorage.setItem(TUTOR_STORAGE_KEYS.NAME, val);
        timesheetState.employeeName = val;
      }
    });
  }

  const empIdInput = document.getElementById('emp-id');
  if (empIdInput) {
    empIdInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        localStorage.setItem(TUTOR_STORAGE_KEYS.ID, val);
        timesheetState.tutorId = val;
      }
    });
  }

  // Period Date Range Autofill Events
  document.getElementById('period-start').addEventListener('change', () => {
    autofillDates();
  });
  document.getElementById('period-end').addEventListener('change', () => {
    updateReportingPeriodDisplay();
  });

  // Add Week tab click
  document.getElementById('btn-add-week').addEventListener('click', () => {
    timesheetState.weeks.push(createEmptyWeek());
    currentWeekIndex = timesheetState.weeks.length - 1;
    autofillDates();
    renderWeekTabs();
    renderDailyRows();
    recalculateTotals();
    updateWeekStartDateField();
  });

  // Remove Week click
  const btnRemoveWeek = document.getElementById('btn-remove-week');
  if (btnRemoveWeek) {
    btnRemoveWeek.addEventListener('click', () => {
      if (timesheetState.weeks.length <= 1) {
        alert('You must keep at least one week on the timesheet.');
        return;
      }
      const confirmRemove = confirm(`Remove Week ${currentWeekIndex + 1}? Any hours entered for this week will be deleted.`);
      if (!confirmRemove) return;

      timesheetState.weeks.splice(currentWeekIndex, 1);
      if (currentWeekIndex >= timesheetState.weeks.length) {
        currentWeekIndex = timesheetState.weeks.length - 1;
      }
      autofillDates();
      renderWeekTabs();
      renderDailyRows();
      recalculateTotals();
      updateWeekStartDateField();
    });
  }

  // Footer Download PDF button
  const pdfFooterBtn = document.getElementById('btn-download-pdf-footer');
  if (pdfFooterBtn) {
    pdfFooterBtn.addEventListener('click', () => {
      generateTimesheetPDF();
    });
  }

  // Draft triggers
  document.getElementById('btn-save-draft').addEventListener('click', () => {
    saveDraft();
  });

  // Helper to format and open Outlook mailto compose draft
  function sendTimesheetEmail() {
    const employeeName = document.getElementById('emp-name').value.trim() || 'Tutor';
    let tutorEmail = (document.getElementById('modal-tutor-email')?.value || document.getElementById('emp-email')?.value || localStorage.getItem(TUTOR_STORAGE_KEYS.EMAIL) || '').trim();

    // Check & Ask for Tutor Email before sending to boss if missing
    if (!tutorEmail) {
      const prompted = prompt('Please enter your Tutor Email before sending this timesheet to your supervisor:');
      if (!prompted || !prompted.trim()) {
        alert('Tutor Email is required before sending the timesheet to your supervisor.');
        const modalInput = document.getElementById('modal-tutor-email');
        if (modalInput) {
          modalInput.focus();
          modalInput.style.borderColor = '#ef4444';
        }
        return;
      }
      tutorEmail = prompted.trim();
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorEmail)) {
      alert('Please provide a valid email address (e.g. tutor@livingstone.edu).');
      const modalInput = document.getElementById('modal-tutor-email');
      if (modalInput) {
        modalInput.focus();
        modalInput.style.borderColor = '#ef4444';
      }
      return;
    }

    // Save and sync tutor email so it's kept for this and all other future entries
    saveTutorEmail(tutorEmail);

    const tutorId = document.getElementById('emp-id').value.trim() || 'N/A';
    const position = document.getElementById('emp-position').value.trim() || 'Tutor';
    const department = document.getElementById('emp-dept').value.trim() || 'Academic Support Center';
    const startPeriod = document.getElementById('period-start').value || 'N/A';
    const endPeriod = document.getElementById('period-end').value || 'N/A';

    // Construct Subject
    const subject = `[Timesheet Submission] ${employeeName} (${tutorEmail}) - Tutor (${startPeriod} to ${endPeriod})`;

    // Calculate totals dynamically for all weeks
    let weekTotals = [];
    let grandTotal = 0;
    timesheetState.weeks.forEach((week) => {
      let weekSum = 0;
      week.forEach(day => {
        const p1 = getHoursDiff(day.in1, day.out1);
        const p2 = getHoursDiff(day.in2, day.out2);
        weekSum += (p1 + p2);
      });
      weekTotals.push(weekSum);
      grandTotal += weekSum;
    });

    // Construct Body Text
    let body = `LIVINGSTONE COLLEGE - TUTOR TIMESHEET\n`;
    body += `MONTHLY TIMESHEET SUBMISSION\n`;
    body += `==============================================\n\n`;
    body += `TUTOR DETAILS:\n`;
    body += `- Name: ${employeeName}\n`;
    body += `- Email: ${tutorEmail}\n`;
    body += `- Tutor ID: ${tutorId}\n`;
    body += `- Position: ${position}\n`;
    body += `- Department: ${department}\n`;
    body += `- Reporting Period: ${startPeriod} to ${endPeriod}\n\n`;
    
    body += `HOURS SUMMARY BY WEEK:\n`;
    weekTotals.forEach((total, idx) => {
      body += `- Week ${idx + 1}: ${total.toFixed(1)} Hours\n`;
    });
    body += `- GRAND TOTAL HOURS: ${grandTotal.toFixed(1)} Hours\n\n`;

    body += `DAILY LOG DETAILS & TUTORING SESSIONS (MON-SAT):\n`;
    body += `----------------------------------------------\n`;
    timesheetState.weeks.forEach((week, wIdx) => {
      body += `\n[WEEK ${wIdx + 1}]\n`;
      let weekHasLogs = false;
      week.forEach(day => {
        const p1 = getHoursDiff(day.in1, day.out1);
        const p2 = getHoursDiff(day.in2, day.out2);
        const totalDayHours = p1 + p2;
        
        // If there are hours worked or a student session, log it
        if (totalDayHours > 0 || day.studentName || day.assignment || day.notes) {
          weekHasLogs = true;
          const formattedDate = day.date ? formatDateString(day.date) : 'N/A';
          body += `- ${day.dayNameFull} (${formattedDate}):\n`;
          if (totalDayHours > 0) {
            body += `  * Hours Logged: ${totalDayHours.toFixed(1)} Hours (Shift 1: ${day.in1 || '--'} to ${day.out1 || '--'} | Shift 2: ${day.in2 || '--'} to ${day.out2 || '--'})\n`;
          }
          if (day.studentName || day.assignment || day.notes) {
            body += `  * Tutoring Session:\n`;
            body += `    + Student: ${day.studentName || 'N/A'}\n`;
            body += `      Skills Worked On: ${day.assignment || 'N/A'}\n`;
            body += `      Progress Notes: ${day.notes || 'N/A'}\n`;
          }
        }
      });
      if (!weekHasLogs) {
        body += `  (No hours or sessions logged for this week)\n`;
      }
    });

    body += `\n==============================================\n`;
    body += `SIGNATURE METADATA:\n`;
    body += `- Tutor Signature: SIGNED (Authorized Date: ${timesheetState.signatureDates.employee || 'N/A'})\n`;
    if (timesheetState.signatures.supervisor) {
      body += `- Supervisor Signature: SIGNED (Authorized Date: ${timesheetState.signatureDates.supervisor || 'N/A'})\n`;
    }
    if (timesheetState.signatures.payroll) {
      body += `- Payroll Signature: SIGNED (Authorized Date: ${timesheetState.signatureDates.payroll || 'N/A'})\n`;
    }
    body += `\nSubmitted on: ${new Date().toLocaleString()}\n`;

    // Encode Mailto Link: Sent to boss bdavis1@livingstone.edu with Tutor CC'd
    const mailtoUrl = `mailto:bdavis1@livingstone.edu?cc=${encodeURIComponent(tutorEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Trigger open default mail client
    window.location.href = mailtoUrl;
  }

  // Form Submit validation checks
  document.getElementById('timesheet-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Check Tutor signature
    if (!timesheetState.signatures.employee) {
      alert('Required Field Missing: Please sign the Tutor Signature canvas before submitting.');
      return;
    }

    // Check & Validate Tutor Email before submitting
    let tutorEmail = (document.getElementById('emp-email')?.value || '').trim();
    if (!tutorEmail) {
      tutorEmail = (localStorage.getItem(TUTOR_STORAGE_KEYS.EMAIL) || '').trim();
      if (tutorEmail && document.getElementById('emp-email')) {
        document.getElementById('emp-email').value = tutorEmail;
      }
    }

    if (!tutorEmail) {
      alert('Required Field Missing: Please enter the Tutor Email before submitting.');
      document.getElementById('emp-email')?.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tutorEmail)) {
      alert('Please enter a valid email address for the tutor (e.g. tutor@livingstone.edu).');
      document.getElementById('emp-email')?.focus();
      return;
    }

    // Persist tutor profile immediately across all visits & sessions
    saveTutorEmail(tutorEmail);
    const empNameVal = document.getElementById('emp-name')?.value.trim();
    if (empNameVal) localStorage.setItem(TUTOR_STORAGE_KEYS.NAME, empNameVal);
    const empIdVal = document.getElementById('emp-id')?.value.trim();
    if (empIdVal) localStorage.setItem(TUTOR_STORAGE_KEYS.ID, empIdVal);
    
    // Verify shifts hours validation checks
    let hasValidationError = false;
    timesheetState.weeks.forEach((week, wIdx) => {
      week.forEach((day) => {
        if ((day.in1 && !day.out1) || (!day.in1 && day.out1) || (day.in2 && !day.out2) || (!day.in2 && day.out2)) {
          alert(`Week ${wIdx+1} - ${day.dayNameFull}: Complete both In and Out timestamps for logged shifts.`);
          hasValidationError = true;
        }
      });
    });

    if (hasValidationError) return;

    // Lock inputs (exclude modal-tutor-email so it can still be verified/edited in the modal)
    timesheetState.isSubmitted = true;
    document.querySelectorAll('input:not(#modal-tutor-email), select, textarea, button:not(#btn-close-modal):not(#btn-send-email):not(#btn-download-pdf)').forEach(el => {
      el.disabled = true;
      el.classList.add('cursor-not-allowed');
    });

    // Make sure modal-tutor-email is populated and unlocked
    const modalEmailInput = document.getElementById('modal-tutor-email');
    if (modalEmailInput) {
      modalEmailInput.value = tutorEmail;
      modalEmailInput.disabled = false;
      modalEmailInput.classList.remove('cursor-not-allowed');
    }
    const badge = document.getElementById('modal-email-status-badge');
    if (badge) badge.style.display = 'inline-block';

    document.getElementById('modal-success').classList.remove('hidden');
  });

  // Success Modal Actions
  document.getElementById('btn-send-email').addEventListener('click', () => {
    // Generate the official PDF timesheet document first so tutor can save/attach it
    generateTimesheetPDF();
    setTimeout(() => {
      sendTimesheetEmail();
    }, 500);
  });

  document.getElementById('btn-download-pdf').addEventListener('click', () => {
    generateTimesheetPDF();
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('modal-success').classList.add('hidden');
  });

  // HTML escape helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isCanvasBlank(canvas) {
    if (!canvas) return true;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  }

  function syncSignatureData() {
    Object.keys(canvases).forEach(key => {
      const cfg = canvases[key];
      const canvasEl = document.getElementById(cfg.id);
      if (canvasEl && !isCanvasBlank(canvasEl)) {
        timesheetState.signatures[cfg.field] = canvasEl.toDataURL();
      }
    });
    timesheetState.signatureDates.employee = document.getElementById('date-employee').value || timesheetState.signatureDates.employee || '';
    timesheetState.signatureDates.supervisor = document.getElementById('date-supervisor').value || timesheetState.signatureDates.supervisor || '';
    timesheetState.signatureDates.payroll = document.getElementById('date-payroll').value || timesheetState.signatureDates.payroll || '';
  }

  // Multi-page PDF / Print Layout Generator — 1:1 Visual App Mirror with All Weeks Visible
  function buildPrintLayout() {
    syncSignatureData();
    const printLayout = document.getElementById('print-layout');
    if (!printLayout) return;

    const empName = document.getElementById('emp-name')?.value.trim() || 'Student Tutor';
    const empEmail = document.getElementById('emp-email')?.value.trim() || localStorage.getItem(TUTOR_STORAGE_KEYS.EMAIL) || '';
    const empId = document.getElementById('emp-id')?.value.trim() || 'N/A';
    const position = document.getElementById('emp-position')?.value.trim() || 'Tutor';
    const dept = document.getElementById('emp-dept')?.value.trim() || 'Success Center';
    const periodStart = document.getElementById('period-start')?.value || '';
    const periodEnd = document.getElementById('period-end')?.value || '';
    const periodDisplay = (periodStart && periodEnd) 
      ? `${formatDateString(periodStart)} – ${formatDateString(periodEnd)}`
      : 'Not Specified';

    // Calculate totals for all weeks
    let weekSums = [];
    let grandTotal = 0;
    timesheetState.weeks.forEach(week => {
      let wSum = 0;
      week.forEach(day => {
        wSum += (day.hours || 0);
      });
      weekSums.push(wSum);
      grandTotal += wSum;
    });

    const employeeSig = timesheetState.signatures.employee;
    const supervisorSig = timesheetState.signatures.supervisor;
    const payrollSig = timesheetState.signatures.payroll;
    const employeeSigDate = timesheetState.signatureDates.employee;
    const supervisorSigDate = timesheetState.signatureDates.supervisor;
    const payrollSigDate = timesheetState.signatureDates.payroll;

    const totalWeeks = timesheetState.weeks.length;
    let html = '<div class="pdf-document-root">';

    timesheetState.weeks.forEach((week, wIdx) => {
      const weekNum = wIdx + 1;
      const weekTotal = weekSums[wIdx] || 0;
      const firstDayDate = week[0].date ? formatDateString(week[0].date) : '';
      const lastDayDate = week[week.length - 1].date ? formatDateString(week[week.length - 1].date) : '';
      const weekDateRange = (firstDayDate && lastDayDate) ? `${firstDayDate} – ${lastDayDate}` : `Week ${weekNum}`;
      const isFirstPage = (wIdx === 0);
      const isLastPage = (wIdx === totalWeeks - 1);

      // Tab pills row showing all weeks
      let pillsHtml = '';
      timesheetState.weeks.forEach((_, pIdx) => {
        const pSum = weekSums[pIdx] || 0;
        const isActive = (pIdx === wIdx);
        pillsHtml += `
          <div class="pdf-tab-pill ${isActive ? 'active' : ''}">
            <span>Week ${pIdx + 1}</span>
            <span class="pdf-tab-pill-badge">${pSum.toFixed(1)}h</span>
          </div>
        `;
      });

      // Build table rows
      let rowsHtml = '';
      week.forEach((day, dIdx) => {
        const formattedDate = day.date ? formatDateString(day.date) : '';
        const in1Formatted = formatTime12Hour(day.in1);
        const out1Formatted = formatTime12Hour(day.out1);
        const in2Formatted = formatTime12Hour(day.in2);
        const out2Formatted = formatTime12Hour(day.out2);
        const hoursStr = (day.hours || 0).toFixed(1);
        const student = escapeHtml(day.studentName || '');
        const assignment = escapeHtml(day.assignment || '');
        const notes = escapeHtml(day.notes || '');

        let weeklyCell = '';
        if (dIdx === 0) {
          weeklyCell = `
            <td rowspan="${week.length}" class="pdf-weekly-total-cell">
              <div class="pdf-weekly-badge">
                ${weekTotal.toFixed(1)}
              </div>
            </td>
          `;
        }

        rowsHtml += `
          <tr>
            <td class="pdf-cell-date">
              <div class="pdf-date-day">${day.dayName}</div>
              <div class="pdf-date-val">${formattedDate}</div>
            </td>
            <td class="pdf-shift-cell">
              <div class="pdf-shift-box ${!in1Formatted ? 'empty' : ''}">${in1Formatted || '&nbsp;'}</div>
            </td>
            <td class="pdf-shift-cell">
              <div class="pdf-shift-box ${!out1Formatted ? 'empty' : ''}">${out1Formatted || '&nbsp;'}</div>
            </td>
            <td class="pdf-shift-cell">
              <div class="pdf-shift-box ${!in2Formatted ? 'empty' : ''}">${in2Formatted || '&nbsp;'}</div>
            </td>
            <td class="pdf-shift-cell">
              <div class="pdf-shift-box ${!out2Formatted ? 'empty' : ''}">${out2Formatted || '&nbsp;'}</div>
            </td>
            <td class="pdf-hours-cell">
              <div class="pdf-daily-pill">${hoursStr}</div>
            </td>
            ${weeklyCell}
            <td class="pdf-text-cell">
              <div class="pdf-text-box ${!student ? 'placeholder' : ''}">${student || 'Enter student name or ID...'}</div>
            </td>
            <td class="pdf-text-cell">
              <div class="pdf-text-box ${!assignment ? 'placeholder' : ''}">${assignment || 'Enter skills or assignments...'}</div>
            </td>
            <td class="pdf-text-cell">
              <div class="pdf-text-box ${!notes ? 'placeholder' : ''}">${notes || 'Enter progress notes...'}</div>
            </td>
          </tr>
        `;
      });

      html += `
        <div class="pdf-week-page" id="pdf-page-week-${weekNum}">
          <div>
            <!-- Top App Brand Navigation -->
            <div class="pdf-nav-bar">
              <div class="pdf-nav-brand">
                <img src="logo-192.png" alt="Logo" class="pdf-nav-logo">
                <div class="pdf-nav-text">
                  <h1>Success Center</h1>
                  <span>Digital Timesheet</span>
                </div>
              </div>
              <div class="pdf-page-indicator">
                WEEK ${weekNum} OF ${totalWeeks} &bull; ${escapeHtml(empName)}
              </div>
            </div>

            ${isFirstPage ? `
              <!-- Hero Section -->
              <div class="pdf-hero-section">
                <h2 class="pdf-hero-title">Monthly <span>Timesheet</span></h2>
                <p class="pdf-hero-subtitle">Track and record your working hours and sessions.</p>
              </div>

              <!-- Two Glass Cards: Tutor Info + Reporting Period -->
              <div class="pdf-cards-grid">
                <!-- Tutor Information Card -->
                <div class="pdf-glass-card">
                  <div class="pdf-section-label">
                    <i data-lucide="user"></i> Tutor Information
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <span class="pdf-label-mono">Tutor Name</span>
                      <div class="pdf-input-box">${escapeHtml(empName)}</div>
                    </div>
                    <div>
                      <span class="pdf-label-mono">Tutor Email</span>
                      <div class="pdf-input-box">${escapeHtml(empEmail || 'N/A')}</div>
                    </div>
                    <div>
                      <span class="pdf-label-mono">Tutor ID</span>
                      <div class="pdf-input-box">${escapeHtml(empId)}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                      <div>
                        <span class="pdf-label-mono">Position</span>
                        <div class="pdf-input-box readonly-box">${escapeHtml(position)}</div>
                      </div>
                      <div>
                        <span class="pdf-label-mono">Department</span>
                        <div class="pdf-input-box readonly-box">${escapeHtml(dept)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Reporting Period Card -->
                <div class="pdf-glass-card">
                  <div class="pdf-section-label">
                    <i data-lucide="calendar-range"></i> Reporting Period
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <span class="pdf-label-mono">Start Date</span>
                      <div class="pdf-input-box">${periodStart ? formatDisplayDate(periodStart) : 'Not specified'}</div>
                    </div>
                    <div>
                      <span class="pdf-label-mono">End Date</span>
                      <div class="pdf-input-box">${periodEnd ? formatDisplayDate(periodEnd) : 'Not specified'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Compact Meta Bar for Subsequent Pages -->
              <div class="pdf-subpage-header">
                <div>
                  <span style="font-weight: 600; color: #475569;">Tutor:</span>
                  <strong>${escapeHtml(empName)}</strong> <span style="color: #64748b;">(ID: ${escapeHtml(empId)})</span>
                </div>
                <div>
                  <span style="font-weight: 600; color: #475569;">Reporting Period:</span>
                  <strong>${periodDisplay}</strong>
                </div>
                <div>
                  <span style="font-weight: 600; color: #475569;">Department:</span>
                  <strong>${escapeHtml(dept)}</strong>
                </div>
              </div>
            `}

            <!-- Main Spreadsheet Card for This Week -->
            <div class="pdf-table-card">
              <!-- Week Tabs Header -->
              <div class="pdf-tab-header">
                <div class="pdf-tab-pills-row">
                  ${pillsHtml}
                </div>
                <div class="pdf-week-start-date">
                  <i data-lucide="calendar" style="width: 13px; height: 13px; color: #4f46e5;"></i>
                  <span>Week Start Date: <strong>${weekDateRange}</strong></span>
                </div>
              </div>

              <!-- Spreadsheet Table -->
              <table class="pdf-table">
                <thead>
                  <tr>
                    <th style="width: 7.5%;">Date</th>
                    <th style="width: 5%;">In</th>
                    <th style="width: 5%;">Out</th>
                    <th style="width: 5%;">In</th>
                    <th style="width: 5%;">Out</th>
                    <th style="width: 6.5%;">Daily Hours</th>
                    <th style="width: 6.8%;">Weekly Total</th>
                    <th style="width: 18%;">Student Name / ID</th>
                    <th style="width: 20.6%;">Skills / Assignments Worked On</th>
                    <th style="width: 20.6%;">Progress Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <!-- Weekly Total Footer -->
              <div class="pdf-week-footer">
                <span class="pdf-week-footer-label">Weekly Total</span>
                <span class="pdf-week-footer-value">${weekTotal.toFixed(1)} Hours</span>
              </div>
            </div>
          </div>

          ${isLastPage ? `
            <!-- Bottom Row on Final Page: Total Hours + 3 Signatures -->
            <div>
              <div class="pdf-bottom-row">
                <!-- Total Hours Card -->
                <div class="pdf-total-hours-card">
                  <div class="pdf-total-hours-icon">
                    <i data-lucide="trending-up" style="width: 1.25rem; height: 1.25rem;"></i>
                  </div>
                  <div>
                    <span class="pdf-label-mono" style="color: #4f46e5; margin-bottom: 2px;">Total Hours This Period</span>
                    <div style="font-family: var(--font-display), sans-serif; font-size: 1.45rem; font-weight: 800; color: #0f172a; line-height: 1.1;">
                      ${grandTotal.toFixed(1)} <span style="font-size: 0.85rem; font-weight: 600; color: #64748b;">Hours</span>
                    </div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Reporting: ${periodDisplay}</div>
                  </div>
                </div>

                <!-- Tutor Signature Card -->
                <div class="pdf-sig-card">
                  <div class="pdf-section-label" style="font-size: 11.5px; margin-bottom: 4px;">
                    <i data-lucide="edit-3"></i> Tutor Signature
                  </div>
                  <div class="pdf-sig-canvas-box">
                    ${employeeSig ? `<img src="${employeeSig}" class="pdf-sig-img" alt="Tutor Signature">` : '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Sign here</span>'}
                  </div>
                  <div class="pdf-sig-date-row">
                    <span class="pdf-label-mono" style="margin-bottom: 0;">Date Signed</span>
                    <strong style="color: #0f172a;">${employeeSigDate ? formatDateString(employeeSigDate) : '________________'}</strong>
                  </div>
                </div>

                <!-- Supervisor Signature Card -->
                <div class="pdf-sig-card">
                  <div class="pdf-section-label" style="font-size: 11.5px; margin-bottom: 4px;">
                    <i data-lucide="user-check"></i> Supervisor Signature
                  </div>
                  <div class="pdf-sig-canvas-box">
                    ${supervisorSig ? `<img src="${supervisorSig}" class="pdf-sig-img" alt="Supervisor Signature">` : '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Sign here</span>'}
                  </div>
                  <div class="pdf-sig-date-row">
                    <span class="pdf-label-mono" style="margin-bottom: 0;">Date Signed</span>
                    <strong style="color: #0f172a;">${supervisorSigDate ? formatDateString(supervisorSigDate) : '________________'}</strong>
                  </div>
                </div>

                <!-- Payroll Signature Card -->
                <div class="pdf-sig-card">
                  <div class="pdf-section-label" style="font-size: 11.5px; margin-bottom: 4px;">
                    <i data-lucide="shield-check"></i> Payroll Signature
                  </div>
                  <div class="pdf-sig-canvas-box">
                    ${payrollSig ? `<img src="${payrollSig}" class="pdf-sig-img" alt="Payroll Signature">` : '<span style="font-size: 11px; color: #94a3b8; font-style: italic;">Sign here</span>'}
                  </div>
                  <div class="pdf-sig-date-row">
                    <span class="pdf-label-mono" style="margin-bottom: 0;">Date Signed</span>
                    <strong style="color: #0f172a;">${payrollSigDate ? formatDateString(payrollSigDate) : '________________'}</strong>
                  </div>
                </div>
              </div>

              <!-- Footer Note -->
              <div class="pdf-doc-footer-note">
                <i data-lucide="lock" style="width: 11px; height: 11px;"></i>
                <span>Your timesheet will be reviewed before final approval &bull; Livingstone College Student Success Center</span>
              </div>
            </div>
          ` : `
            <!-- Page Number on Intermediate Pages -->
            <div style="font-size: 10px; color: #94a3b8; text-align: right; padding-top: 4px;">
              Page ${weekNum} of ${totalWeeks} &bull; Livingstone College Student Success Center
            </div>
          `}
        </div>
      `;
    });

    html += '</div>';

    printLayout.innerHTML = html;
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Print PDF Generator
  function generateTimesheetPDF() {
    buildPrintLayout();
    window.print();
  }

  // Hook beforeprint event as well
  window.addEventListener('beforeprint', () => {
    buildPrintLayout();
  });

  // Initial build of print layout so it is always pre-rendered in DOM
  buildPrintLayout();
});
