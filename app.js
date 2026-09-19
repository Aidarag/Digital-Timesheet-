/* -------------------------------------------------------------
 * Student Success Center Digital Timesheet - Redesigned SaaS Logic
 * ------------------------------------------------------------- */

// Redesigned Application State
let timesheetState = {
  employeeName: '',
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
  timesheetState.tutorId = document.getElementById('emp-id').value;
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
    const employeeName = document.getElementById('emp-name').value || 'Tutor';
    const tutorId = document.getElementById('emp-id').value || 'N/A';
    const position = document.getElementById('emp-position').value || 'Tutor';
    const department = document.getElementById('emp-dept').value || 'Academic Support Center';
    const startPeriod = document.getElementById('period-start').value || 'N/A';
    const endPeriod = document.getElementById('period-end').value || 'N/A';

    // Construct Subject
    const subject = `[Timesheet Submission] ${employeeName} - Tutor (${startPeriod} to ${endPeriod})`;

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

    // Encode Mailto Link
    const mailtoUrl = `mailto:bdavis1@livingstone.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
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

  // Multi-page PDF / Print Layout Generator
  function buildPrintLayout() {
    syncSignatureData();
    const printLayout = document.getElementById('print-layout');
    if (!printLayout) return;

    const empName = document.getElementById('emp-name').value || 'Student Tutor';
    const empId = document.getElementById('emp-id').value || 'N/A';
    const position = document.getElementById('emp-position').value || 'Tutor';
    const dept = document.getElementById('emp-dept').value || 'Success Center';
    const periodStart = document.getElementById('period-start').value;
    const periodEnd = document.getElementById('period-end').value;
    const periodDisplay = (periodStart && periodEnd) 
      ? `${formatDateString(periodStart)} – ${formatDateString(periodEnd)}`
      : 'Not Specified';

    // Calculate totals for all weeks
    let weekSums = [];
    let grandTotal = 0;
    timesheetState.weeks.forEach(week => {
      let wSum = 0;
      week.forEach(day => {
        wSum += day.hours;
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

    let html = '';

    timesheetState.weeks.forEach((week, wIdx) => {
      const weekNum = wIdx + 1;
      const weekTotal = weekSums[wIdx] || 0;
      const firstDayDate = week[0].date ? formatDateString(week[0].date) : '';
      const lastDayDate = week[week.length - 1].date ? formatDateString(week[week.length - 1].date) : '';
      const weekDateRange = (firstDayDate && lastDayDate) ? `${firstDayDate} – ${lastDayDate}` : `Week ${weekNum}`;

      // Build table rows
      let rowsHtml = '';
      week.forEach((day, dIdx) => {
        const formattedDate = day.date ? formatDateString(day.date) : '';
        const in1 = day.in1 || '--';
        const out1 = day.out1 || '--';
        const in2 = day.in2 || '--';
        const out2 = day.out2 || '--';
        const hoursStr = day.hours > 0 ? day.hours.toFixed(1) : '0.0';
        const student = escapeHtml(day.studentName || '');
        const assignment = escapeHtml(day.assignment || '');
        const notes = escapeHtml(day.notes || '');

        let weeklyCell = '';
        if (dIdx === 0) {
          weeklyCell = `
            <td rowspan="${week.length}" class="p-cell-weekly">
              <div class="p-weekly-num">${weekTotal.toFixed(1)}</div>
              <div class="p-weekly-unit">Hours</div>
            </td>
          `;
        }

        rowsHtml += `
          <tr>
            <td class="p-cell-date">
              <div class="p-day-name">${day.dayName}</div>
              <div class="p-day-date">${formattedDate}</div>
            </td>
            <td class="p-cell-shift">${in1}</td>
            <td class="p-cell-shift">${out1}</td>
            <td class="p-cell-shift">${in2}</td>
            <td class="p-cell-shift">${out2}</td>
            <td class="p-cell-hours">${hoursStr}</td>
            ${weeklyCell}
            <td class="p-cell-student">${student || '<span class="p-empty-text">--</span>'}</td>
            <td class="p-cell-skills">${assignment || '<span class="p-empty-text">--</span>'}</td>
            <td class="p-cell-notes">${notes || '<span class="p-empty-text">--</span>'}</td>
          </tr>
        `;
      });

      // Overview pill list
      const pillsHtml = timesheetState.weeks.map((_, i) => {
        const sum = weekSums[i] || 0;
        const isCur = i === wIdx;
        return `<span class="p-sum-pill ${isCur ? 'active-pill' : ''}">Wk ${i + 1}: <strong>${sum.toFixed(1)}h</strong></span>`;
      }).join(' ');

      html += `
        <div class="print-page week-page" id="print-page-week-${weekNum}">
          <!-- Top Institutional Header -->
          <div class="print-header">
            <div class="print-header-brand">
              <img src="livingstone_seal.png" alt="Livingstone College Seal" class="print-seal-img">
              <div>
                <h1 class="print-institution-title">LIVINGSTONE COLLEGE</h1>
                <h2 class="print-program-title">Student Success Center &bull; Digital Timesheet</h2>
              </div>
            </div>
            <div class="print-week-badge-box">
              <div class="print-week-title">WEEK ${weekNum} OF ${timesheetState.weeks.length}</div>
              <div class="print-week-dates">${weekDateRange}</div>
            </div>
          </div>

          <!-- Tutor & Period Meta Bar -->
          <div class="print-meta-grid">
            <div class="print-meta-item">
              <span class="print-meta-label">Tutor Name</span>
              <span class="print-meta-value">${escapeHtml(empName)}</span>
            </div>
            <div class="print-meta-item">
              <span class="print-meta-label">Tutor ID</span>
              <span class="print-meta-value">${escapeHtml(empId)}</span>
            </div>
            <div class="print-meta-item">
              <span class="print-meta-label">Position</span>
              <span class="print-meta-value">${escapeHtml(position)}</span>
            </div>
            <div class="print-meta-item">
              <span class="print-meta-label">Department</span>
              <span class="print-meta-value">${escapeHtml(dept)}</span>
            </div>
            <div class="print-meta-item print-meta-period">
              <span class="print-meta-label">Reporting Period</span>
              <span class="print-meta-value">${escapeHtml(periodDisplay)}</span>
            </div>
          </div>

          <!-- Official Timesheet Table -->
          <table class="print-table">
            <thead>
              <tr>
                <th rowspan="2" class="p-col-date">Date</th>
                <th colspan="2" class="p-col-shift-group">Shift 1</th>
                <th colspan="2" class="p-col-shift-group">Shift 2</th>
                <th rowspan="2" class="p-col-hours">Daily<br>Hours</th>
                <th rowspan="2" class="p-col-weekly">Weekly<br>Total</th>
                <th rowspan="2" class="p-col-student">Student Name / ID</th>
                <th rowspan="2" class="p-col-skills">Skills / Assignment(s) Worked On</th>
                <th rowspan="2" class="p-col-notes">Progress Notes</th>
              </tr>
              <tr>
                <th class="p-col-shift">In</th>
                <th class="p-col-shift">Out</th>
                <th class="p-col-shift">In</th>
                <th class="p-col-shift">Out</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Week Summary & Period Grand Total Bar -->
          <div class="print-summary-bar">
            <div class="print-summary-weeks">
              <span class="p-sum-label">Period Overview:</span>
              ${pillsHtml}
            </div>
            <div class="print-summary-totals">
              <div class="p-total-box">
                <span class="p-total-label">Week ${weekNum} Total:</span>
                <span class="p-total-val">${weekTotal.toFixed(1)} hrs</span>
              </div>
              <div class="p-total-box grand-total">
                <span class="p-total-label">Total Hours This Period:</span>
                <span class="p-total-val">${grandTotal.toFixed(1)} hrs</span>
              </div>
            </div>
          </div>

          <!-- 3 Signatures Row -->
          <div class="print-signatures-grid">
            <!-- Tutor Signature -->
            <div class="print-sig-box">
              <div class="print-sig-title">Tutor Signature</div>
              <div class="print-sig-canvas-area">
                ${employeeSig ? `<img src="${employeeSig}" class="print-sig-img" alt="Tutor Signature">` : '<div class="print-sig-line"></div>'}
              </div>
              <div class="print-sig-footer">
                <span>Date Signed:</span>
                <strong>${employeeSigDate ? formatDateString(employeeSigDate) : '________________'}</strong>
              </div>
            </div>

            <!-- Supervisor Signature -->
            <div class="print-sig-box">
              <div class="print-sig-title">Supervisor Signature</div>
              <div class="print-sig-canvas-area">
                ${supervisorSig ? `<img src="${supervisorSig}" class="print-sig-img" alt="Supervisor Signature">` : '<div class="print-sig-line"></div>'}
              </div>
              <div class="print-sig-footer">
                <span>Date Signed:</span>
                <strong>${supervisorSigDate ? formatDateString(supervisorSigDate) : '________________'}</strong>
              </div>
            </div>

            <!-- Payroll Signature -->
            <div class="print-sig-box">
              <div class="print-sig-title">Payroll Signature</div>
              <div class="print-sig-canvas-area">
                ${payrollSig ? `<img src="${payrollSig}" class="print-sig-img" alt="Payroll Signature">` : '<div class="print-sig-line"></div>'}
              </div>
              <div class="print-sig-footer">
                <span>Date Signed:</span>
                <strong>${payrollSigDate ? formatDateString(payrollSigDate) : '________________'}</strong>
              </div>
            </div>
          </div>

          <!-- Print Footer Notice -->
          <div class="print-doc-footer">
            <span>Livingstone College Student Success Center &bull; Official Digital Timesheet</span>
            <span>Page ${weekNum} of ${timesheetState.weeks.length}</span>
          </div>
        </div>
      `;
    });

    printLayout.innerHTML = html;
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
});
