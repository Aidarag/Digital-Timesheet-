/* -------------------------------------------------------------
 * Student Success Center Digital Timesheet - Redesigned SaaS Logic
 * ------------------------------------------------------------- */

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
      
      // Update UI label if currently rendered
      const dateLabel = document.getElementById(`date-label-${wIdx}-${dIdx}`);
      if (dateLabel) {
        dateLabel.innerText = formatDateString(day.date);
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
  const weekStartEl = document.getElementById('week-start-date-display');
  if (weekStartEl) {
    weekStartEl.innerText = activeMon.date ? formatDateString(activeMon.date) : 'MM/DD/YYYY';
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
    tabButton.innerHTML = `Week ${wIdx + 1} <span class="tab-hours-badge">${weekTotal.toFixed(1)}h</span>`;
    
    tabButton.addEventListener('click', () => {
      currentWeekIndex = wIdx;
      document.querySelectorAll('.tab-week').forEach(btn => btn.classList.remove('active'));
      tabButton.classList.add('active');
      
      const label = document.getElementById('week-total-label');
      if (label) label.innerText = `Week ${wIdx + 1} Total`;
      
      renderDailyRows();
      recalculateTotals();
    });
    
    container.appendChild(tabButton);
  });
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
      <td class="col-date" data-label="Date" style="padding: 8px; text-align: center;">
        <div style="font-family: var(--font-display); font-weight: 800; font-size: 11px; color: var(--text-dark);">${day.dayName}</div>
        <div id="date-label-${currentWeekIndex}-${dIdx}" style="font-size: 9px; color: var(--text-light); margin-top: 2px;">${formatDateString(day.date)}</div>
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
      <td class="col-hours" data-label="Total Daily Hours" style="padding: 8px; text-align: center;">
        <span style="font-family: var(--font-mono); font-size: 13px; font-weight: 800; color: var(--text-dark);" id="hours-display-${currentWeekIndex}-${dIdx}">${day.hours.toFixed(1)}</span>
      </td>
    `;
    
    // 9. Weekly Total column (rowspan="7" on first day only)
    let weeklyTotalCol = '';
    if (dIdx === 0) {
      weeklyTotalCol = `
        <td class="col-weekly" rowspan="7" id="weekly-total-cell" style="padding: 8px; text-align: center; vertical-align: middle; background: rgba(79, 70, 229, 0.02); border-left: 1px solid var(--color-border); border-right: 1px solid var(--color-border);">
          <span style="font-family: var(--font-mono); font-size: 14px; font-weight: 800; color: var(--color-blue-vibrant);" id="weekly-total-display-value">${weeklyTotalSum.toFixed(1)}</span>
        </td>
      `;
    }
    
    // 10. Student Name / ID column
    let studentCol = `
      <td class="col-student" data-label="Student Name / ID" style="padding: 8px;">
        <input type="text" class="table-input" id="student-input-${currentWeekIndex}-${dIdx}" placeholder="Enter student name / ID..." value="${day.studentName || ''}">
      </td>
    `;
    
    // 11. Skills / Assignment(s) Worked On column
    let skillsCol = `
      <td class="col-skills" data-label="Skills / Assignment(s) Worked On" style="padding: 8px;">
        <textarea class="table-input py-1.5 px-2 text-xs h-12 min-h-[40px] resize-y leading-tight" id="skills-input-${currentWeekIndex}-${dIdx}" placeholder="Enter skills / assignment...">${day.assignment || ''}</textarea>
      </td>
    `;
    
    // 12. Progress Notes column
    let notesCol = `
      <td class="col-notes" data-label="Progress Notes" style="padding: 8px;">
        <textarea class="table-input py-1.5 px-2 text-xs h-12 min-h-[40px] resize-y leading-tight" id="notes-input-${currentWeekIndex}-${dIdx}" placeholder="Enter progress notes...">${day.notes || ''}</textarea>
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
  
  // Shifts Inputs Events
  const ids = [`in1-${wIdx}-${dIdx}`, `out1-${wIdx}-${dIdx}`, `in2-${wIdx}-${dIdx}`, `out2-${wIdx}-${dIdx}`];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        const field = id.split('-')[0];
        day[field] = e.target.value;
        
        // Compute hours
        updateDailyHours(wIdx, dIdx);
        
        // Update label
        const hoursDisp = document.getElementById(`hours-display-${wIdx}-${dIdx}`);
        if (hoursDisp) hoursDisp.innerText = day.hours.toFixed(1);
      });
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
    
    // Migrate legacy session arrays to flat properties for backward-compatibility
    if (timesheetState.weeks) {
      timesheetState.weeks.forEach(week => {
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
    renderWeekTabs();
    recalculateTotals();
  });


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
    window.print();
  }
});
