// System Constants
const SCALE_FACTOR = 8; // 1 mm = 8 SVG units
const ORIGIN_X = 120;   // Physical zero anvil alignment coordinate in SVG space
const MAX_MM = 150.0;   // 150 mm caliper range

// State Variables
let currentReading = 0.0;
let currentLC = 0.05;
let currentZeroError = 0.0;
let currentActiveTab = 'free';
let isLabelsVisible = false;
let isRayGuideVisible = true;
let isSoundMuted = false;

// Specimen Catalog
const SPECIMENS = {
  steelSphere: { name: "Steel Sphere", type: "external", size: 22.45, shape: "sphere" },
  brassCylinder: { name: "Brass Cylinder", type: "external", size: 34.60, shape: "cylinder" },
  hexNut: { name: "Steel Hex Nut", type: "external", size: 18.20, shape: "hex" },
  bearingRing: { name: "Bearing Ring", type: "external", size: 26.80, shape: "ring" },
  glassTube: { name: "Glass Beaker/Tube", type: "internal", size: 15.35, shape: "tube" },
  stepWell: { name: "Stepped Well", type: "depth", size: 28.50, shape: "step" },
  mysterySample: { name: "Mystery Sample", type: "external", size: 19.35, shape: "mystery" },
  custom: { name: "Custom Specimen", type: "external", size: 25.00, shape: "custom" }
};
let activeSpecimenKey = 'brassCylinder';

// Quiz State
let quizTargetValue = 0;
let quizScore = 0;
let quizTotal = 0;
let quizStreak = 0;

// Synthesized Sound Effect
let webAudioCtx = null;
function triggerAudioClick(pitch = 650, duration = 0.02) {
  if (isSoundMuted) return;
  try {
    if (!webAudioCtx) {
      webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (webAudioCtx.state === 'suspended') {
      webAudioCtx.resume();
    }
    const osc = webAudioCtx.createOscillator();
    const gain = webAudioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, webAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, webAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, webAudioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(webAudioCtx.destination);
    osc.start();
    osc.stop(webAudioCtx.currentTime + duration);
  } catch (e) {}
}

function toggleAudioSound() {
  isSoundMuted = !isSoundMuted;
  const icon = document.getElementById('soundSvgIcon');
  if (!isSoundMuted) {
    icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`;
  } else {
    icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
  }
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  buildMainScaleTicks();
  buildVernierScaleTicks();
  selectSpecimen('brassCylinder');
  updateCaliperState(34.60, false);
  setupDragEvents();
  setupKeyboardEvents();
  switchLabTab('free');
});

// 1. GENERATE MAIN SCALE GRADUATIONS (0 to 155 mm)
// Marks start at y = 100 and point UPWARDS so they meet the Vernier ticks tip-to-tip!
function buildMainScaleTicks() {
  const container = document.getElementById('mainScaleTicksGroup');
  container.innerHTML = '';

  for (let mm = 0; mm <= 155; mm++) {
    const x = ORIGIN_X + (mm * SCALE_FACTOR);
    let tickLength = 8;
    let strokeW = 0.85;
    let strokeColor = "#334155";

    if (mm % 10 === 0) {
      tickLength = 18;
      strokeW = 1.4;
      strokeColor = "#0f172a";

      // Labeled numbers in cm inside the window above the ticks (at y = 74)
      const cmNum = document.createElementNS("http://www.w3.org/2000/svg", "text");
      cmNum.setAttribute("x", x);
      cmNum.setAttribute("y", 74);
      cmNum.setAttribute("font-family", "'JetBrains Mono', monospace");
      cmNum.setAttribute("font-size", "10");
      cmNum.setAttribute("font-weight", "700");
      cmNum.setAttribute("fill", "#0f172a");
      cmNum.setAttribute("text-anchor", "middle");
      cmNum.textContent = (mm / 10).toString();
      container.appendChild(cmNum);
    } else if (mm % 5 === 0) {
      tickLength = 12;
      strokeW = 1.0;
    }

    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("y1", 100);
    tick.setAttribute("x2", x);
    tick.setAttribute("y2", 100 - tickLength);
    tick.setAttribute("stroke", strokeColor);
    tick.setAttribute("stroke-width", strokeW);
    container.appendChild(tick);
  }
}

// 2. GENERATE VERNIER SCALE GRADUATIONS
// Marks start at y = 100 and point DOWNWARDS
function buildVernierScaleTicks() {
  const container = document.getElementById('vernierScaleTicksGroup');
  container.innerHTML = '';

  let divisions = 20;
  let vernierDivMM = 0.95;

  if (Math.abs(currentLC - 0.1) < 0.001) {
    divisions = 10;
    vernierDivMM = 0.9;
  } else if (Math.abs(currentLC - 0.05) < 0.001) {
    divisions = 20;
    vernierDivMM = 0.95;
  } else if (Math.abs(currentLC - 0.02) < 0.001) {
    divisions = 50;
    vernierDivMM = 0.98;
  }

  const title = document.getElementById('vernierTitleText');
  if (title) {
    title.textContent = `VERNIER (${divisions} DIV = ${(divisions * vernierDivMM).toFixed(0)} mm | LC ${currentLC} mm)`;
  }

  for (let i = 0; i <= divisions; i++) {
    const x = ORIGIN_X + (i * vernierDivMM * SCALE_FACTOR);
    let tickLength = 8;
    let strokeW = 0.85;
    let isMajor = false;

    if (divisions === 10) {
      isMajor = true;
      tickLength = 16;
      strokeW = 1.3;
    } else if (divisions === 20) {
      if (i % 2 === 0) {
        isMajor = true;
        tickLength = 16;
        strokeW = 1.3;
      } else {
        tickLength = 9;
      }
    } else if (divisions === 50) {
      if (i % 5 === 0) {
        isMajor = true;
        tickLength = 16;
        strokeW = 1.3;
      } else {
        tickLength = 7;
        strokeW = 0.65;
      }
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", 100);
    line.setAttribute("x2", x);
    line.setAttribute("y2", 100 + tickLength);
    line.setAttribute("stroke", "#1e293b");
    line.setAttribute("stroke-width", strokeW);
    container.appendChild(line);

    if (isMajor) {
      const num = document.createElementNS("http://www.w3.org/2000/svg", "text");
      num.setAttribute("x", x);
      num.setAttribute("y", 128);
      num.setAttribute("font-family", "'JetBrains Mono', monospace");
      num.setAttribute("font-size", divisions === 50 ? "7.5" : "8.5");
      num.setAttribute("font-weight", "700");
      num.setAttribute("fill", "#0f172a");
      num.setAttribute("text-anchor", "middle");

      let label = i;
      if (divisions === 20) label = i / 2;
      if (divisions === 50) label = i / 5;
      num.textContent = label.toString();
      container.appendChild(num);
    }
  }
}

// --- POSITION & METROLOGY ENGINE ---
function updateCaliperState(targetMM, sound = false) {
  let clamped = Math.max(0, Math.min(MAX_MM, targetMM));

  if (activeSpecimenKey && SPECIMENS[activeSpecimenKey]) {
    const spec = SPECIMENS[activeSpecimenKey];
    if (spec.type === 'external' && clamped < spec.size) {
      clamped = spec.size;
    }
  }

  currentReading = clamped;

  // Update Movable Carriage Transform in SVG
  const sliderGroup = document.getElementById('sliderGroup');
  const translateX = currentReading * SCALE_FACTOR;
  sliderGroup.setAttribute('transform', `translate(${translateX}, 0)`);

  // Update Depth Rod
  const depthRod = document.getElementById('depthRodElement');
  if (depthRod) {
    depthRod.setAttribute('width', 880 + translateX);
  }

  // Calculations & DOM updates
  computeMetrologyReadouts();
  refreshLoupeMagnifier();

  // Synchronize controller inputs
  document.getElementById('jawRangeSlider').value = currentReading.toFixed(2);
  document.getElementById('directReadingInput').value = currentReading.toFixed(2);

  if (sound) {
    triggerAudioClick(550 + (currentReading % 1) * 300, 0.015);
  }
}

function computeMetrologyReadouts() {
  const observed = currentReading + currentZeroError;
  const msr = Math.floor(observed);
  const fraction = observed - msr;

  const totalDivisions = Math.round(1 / currentLC);
  let vsrIndex = Math.round(fraction / currentLC);
  if (vsrIndex >= totalDivisions) vsrIndex = 0;

  const fracMM = vsrIndex * currentLC;
  const totalObserved = msr + fracMM;
  const correctedVal = totalObserved - currentZeroError;

  if (currentActiveTab === 'quiz') {
    document.getElementById('msrDisplay').innerHTML = `? <span>mm</span>`;
    document.getElementById('vsrDisplay').innerHTML = `? <span>div</span>`;
    document.getElementById('fracDisplay').innerHTML = `? <span>mm</span>`;
    document.getElementById('totalDisplay').innerHTML = `? ? ? <span>mm</span>`;
    document.getElementById('calcMsr').textContent = `Hidden (Quiz Mode)`;
    document.getElementById('calcVsr').textContent = `Hidden (Quiz Mode)`;
    document.getElementById('calcObserved').textContent = `Hidden (Quiz Mode)`;
  } else {
    document.getElementById('msrDisplay').innerHTML = `${msr}<span>mm</span>`;
    document.getElementById('vsrDisplay').innerHTML = `${vsrIndex}<span>div</span>`;
    document.getElementById('fracDisplay').innerHTML = `${fracMM.toFixed(currentLC === 0.05 || currentLC === 0.02 ? 2 : 1)}<span>mm</span>`;
    document.getElementById('totalDisplay').innerHTML = `${totalObserved.toFixed(2)} <span>mm</span>`;

    document.getElementById('calcMsr').textContent = `${msr}.00 mm`;
    document.getElementById('calcVsr').textContent = `${vsrIndex} × ${currentLC} mm = ${fracMM.toFixed(2)} mm`;
    document.getElementById('calcObserved').textContent = `${totalObserved.toFixed(2)} mm`;

    const zeRow = document.getElementById('zeroErrorRow');
    if (Math.abs(currentZeroError) > 0.001) {
      zeRow.style.display = 'flex';
      const sign = currentZeroError > 0 ? `+${currentZeroError.toFixed(2)}` : `${currentZeroError.toFixed(2)}`;
      document.getElementById('zeroErrorDesc').textContent = `Zero Error (${sign} mm) Correction:`;
      document.getElementById('calcCorrected').textContent = `${correctedVal.toFixed(2)} mm`;
    } else {
      zeRow.style.display = 'none';
    }
  }

  positionCoincidenceGuide(vsrIndex);
}

function positionCoincidenceGuide(vsrIndex) {
  let vernierDivMM = 0.95;
  if (Math.abs(currentLC - 0.1) < 0.001) vernierDivMM = 0.9;
  if (Math.abs(currentLC - 0.02) < 0.001) vernierDivMM = 0.98;

  const coincideX = ORIGIN_X + (vsrIndex * vernierDivMM * SCALE_FACTOR);
  const line = document.getElementById('coincidenceLine');
  const pTop = document.getElementById('coincidenceTopPin');
  const pBtm = document.getElementById('coincidenceBottomPin');

  if (line && pTop && pBtm) {
    line.setAttribute('x1', coincideX);
    line.setAttribute('x2', coincideX);
    pTop.setAttribute('points', `${coincideX},46 ${coincideX-4},40 ${coincideX+4},40`);
    pBtm.setAttribute('points', `${coincideX},146 ${coincideX-4},152 ${coincideX+4},152`);
  }
}

// --- OPTICAL LOUPE MAGNIFIER ---
function refreshLoupeMagnifier() {
  const mainGroup = document.getElementById('loupeMainScaleGroup');
  const vernierGroup = document.getElementById('loupeVernierScaleGroup');
  if (!mainGroup || !vernierGroup) return;

  mainGroup.innerHTML = '';
  vernierGroup.innerHTML = '';

  const LOUPE_SCALE = 44; // 1 mm = 44 pixels in Loupe view
  const centerX = 300;

  const observed = currentReading + currentZeroError;
  const msr = Math.floor(observed);
  const totalDivisions = Math.round(1 / currentLC);
  let vsrIndex = Math.round((observed - msr) / currentLC);
  if (vsrIndex >= totalDivisions) vsrIndex = 0;

  let vernierDivMM = 0.95;
  if (Math.abs(currentLC - 0.1) < 0.001) vernierDivMM = 0.9;
  if (Math.abs(currentLC - 0.02) < 0.001) vernierDivMM = 0.98;

  const coincidenceMM = observed + (vsrIndex * vernierDivMM);

  // 1. Main Scale Ticks in Loupe
  const minMM = Math.floor(coincidenceMM - 8);
  const maxMM = Math.ceil(coincidenceMM + 8);

  for (let m = minMM; m <= maxMM; m++) {
    if (m < 0) continue;
    const tickX = centerX + (m - coincidenceMM) * LOUPE_SCALE;
    if (tickX < -10 || tickX > 610) continue;

    let h = 28;
    let isMajor = (m % 10 === 0);
    let isMid = (m % 5 === 0);
    let strokeW = 1.6;
    let col = "#94a3b8";

    if (isMajor) {
      h = 50;
      strokeW = 2.4;
      col = "#f8fafc";
    } else if (isMid) {
      h = 38;
      strokeW = 1.9;
      col = "#cbd5e1";
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", tickX);
    line.setAttribute("y1", 90 - h);
    line.setAttribute("x2", tickX);
    line.setAttribute("y2", 90);
    line.setAttribute("stroke", col);
    line.setAttribute("stroke-width", strokeW);
    mainGroup.appendChild(line);

    if (isMajor || isMid) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", tickX);
      text.setAttribute("y", 90 - h - 5);
      text.setAttribute("font-family", "'JetBrains Mono', monospace");
      text.setAttribute("font-size", isMajor ? "12" : "10");
      text.setAttribute("font-weight", "700");
      text.setAttribute("fill", isMajor ? "#38bdf8" : "#94a3b8");
      text.setAttribute("text-anchor", "middle");
      text.textContent = `${m}`;
      mainGroup.appendChild(text);
    }
  }

  // 2. Vernier Scale Ticks in Loupe
  for (let v = 0; v <= totalDivisions; v++) {
    const vPosMM = observed + (v * vernierDivMM);
    const tickX = centerX + (vPosMM - coincidenceMM) * LOUPE_SCALE;
    if (tickX < -10 || tickX > 610) continue;

    let h = 30;
    let isMajor = false;
    let strokeW = 1.6;
    let col = "#93c5fd";

    if (totalDivisions === 10) {
      isMajor = true;
      h = 48;
      strokeW = 2.2;
      col = "#bfdbfe";
    } else if (totalDivisions === 20) {
      if (v % 2 === 0) {
        isMajor = true;
        h = 48;
        strokeW = 2.2;
        col = "#bfdbfe";
      }
    } else if (totalDivisions === 50) {
      if (v % 5 === 0) {
        isMajor = true;
        h = 48;
        strokeW = 2.2;
        col = "#bfdbfe";
      }
    }

    if (v === vsrIndex && isRayGuideVisible) {
      strokeW = 3.0;
      col = "#10b981";
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", tickX);
    line.setAttribute("y1", 90);
    line.setAttribute("x2", tickX);
    line.setAttribute("y2", 90 + h);
    line.setAttribute("stroke", col);
    line.setAttribute("stroke-width", strokeW);
    vernierGroup.appendChild(line);

    if (isMajor) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", tickX);
      text.setAttribute("y", 90 + h + 15);
      text.setAttribute("font-family", "'JetBrains Mono', monospace");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-weight", "700");
      text.setAttribute("fill", v === vsrIndex ? "#10b981" : "#bfdbfe");
      text.setAttribute("text-anchor", "middle");

      let label = v;
      if (totalDivisions === 20) label = v / 2;
      if (totalDivisions === 50) label = v / 5;
      text.textContent = label.toString();
      vernierGroup.appendChild(text);
    }
  }

  const label = document.getElementById('loupeAlignedLabel');
  if (label) {
    if (currentActiveTab === 'quiz') {
      label.innerHTML = `Aligned Division: <strong>?</strong>`;
    } else {
      label.innerHTML = `Aligned Division: <strong>${vsrIndex}</strong> (matches ${(msr + vsrIndex)} mm)`;
    }
  }
}

// --- INTERACTIVE DRAGGING ---
function setupDragEvents() {
  const svg = document.getElementById('caliperSvg');
  let isDragging = false;
  let startX = 0;
  let startReading = 0;

  function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function onStart(e) {
    isDragging = true;
    startX = getClientX(e);
    startReading = currentReading;
    document.body.style.cursor = 'grabbing';
  }

  function onMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const currentX = getClientX(e);
    const svgRect = svg.getBoundingClientRect();
    const pixelsPerMM = (svgRect.width / 1480) * SCALE_FACTOR;
    const deltaMM = (currentX - startX) / pixelsPerMM;
    updateCaliperState(startReading + deltaMM, true);
  }

  function onEnd() {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = 'default';
    }
  }

  svg.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);

  svg.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);
}

function setupKeyboardEvents() {
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nudgeJaw(e.shiftKey ? 1.0 : currentLC);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nudgeJaw(e.shiftKey ? -1.0 : -currentLC);
    } else if (e.key === 'Home') {
      e.preventDefault();
      updateCaliperState(0, true);
    }
  });
}

function nudgeJaw(deltaMM) {
  updateCaliperState(currentReading + deltaMM, true);
}

function onRangeSliderInput(val) {
  updateCaliperState(parseFloat(val), false);
}

function onDirectInputChange(val) {
  const num = parseFloat(val);
  if (!isNaN(num)) updateCaliperState(num, true);
}

function resetJawToZero() {
  updateCaliperState(0, true);
}

// --- CONTROLS & SETTINGS ---
function setLeastCount(lc) {
  currentLC = lc;
  document.querySelectorAll('#lcButtonGroup .segmented-switch-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.lc) === lc);
  });
  document.getElementById('badgeLC').textContent = `LC = ${lc} mm`;
  document.getElementById('btnNudgeMinusLC').textContent = `-${lc} mm`;
  document.getElementById('btnNudgePlusLC').textContent = `+${lc} mm`;

  buildVernierScaleTicks();
  updateCaliperState(currentReading, false);
}

function setZeroError(ze) {
  currentZeroError = ze;
  document.querySelectorAll('#zeButtonGroup .segmented-switch-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.ze) === ze);
  });
  updateCaliperState(currentReading, false);
}

function toggleCoincidenceRay() {
  isRayGuideVisible = !isRayGuideVisible;
  const group = document.getElementById('alignmentGuideGroup');
  const label = document.getElementById('rayGuideLabel');
  const btn = document.getElementById('btnToggleRay');

  if (group) group.style.display = isRayGuideVisible ? 'block' : 'none';
  if (label) label.textContent = isRayGuideVisible ? 'ON' : 'OFF';
  btn.classList.toggle('active', isRayGuideVisible);
  refreshLoupeMagnifier();
}

function togglePartLabels() {
  isLabelsVisible = !isLabelsVisible;
  const group = document.getElementById('partLabelsGroup');
  const btn = document.getElementById('btnToggleLabels');
  if (group) group.style.display = isLabelsVisible ? 'block' : 'none';
  btn.classList.toggle('active', isLabelsVisible);
}

// --- MODE SWITCHING ---
function switchLabTab(mode) {
  currentActiveTab = mode;
  document.getElementById('tabBtnFree').classList.toggle('active', mode === 'free');
  document.getElementById('tabBtnMeasure').classList.toggle('active', mode === 'measure');
  document.getElementById('tabBtnQuiz').classList.toggle('active', mode === 'quiz');

  const specimenPanel = document.getElementById('specimenCatalogPanel');
  const quizPanel = document.getElementById('quizSectionPanel');

  specimenPanel.classList.toggle('active', mode === 'measure');
  quizPanel.classList.toggle('active', mode === 'quiz');

  if (mode === 'free') {
    // Keep current specimen if chosen in dropdown
  } else if (mode === 'measure') {
    if (!activeSpecimenKey) {
      selectSpecimen('steelSphere');
    }
  } else if (mode === 'quiz') {
    removeSpecimen();
    generateRandomQuiz();
  }

  updateCaliperState(currentReading, false);
}

// --- SPECIMEN HANDLING & RENDERING ---
function onQuickSpecimenChange(key) {
  if (key === 'none') {
    removeSpecimen();
  } else if (key === 'custom') {
    selectSpecimen('custom');
    const lenInput = document.getElementById('specimenLengthInput');
    if (lenInput) {
      lenInput.focus();
      lenInput.select();
    }
  } else {
    selectSpecimen(key);
  }
}

function onSpecimenLengthChange(val) {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0 || num > 145) return;

  if (!activeSpecimenKey || activeSpecimenKey === 'none') {
    activeSpecimenKey = 'custom';
    const sel = document.getElementById('quickSpecimenSelect');
    if (sel) sel.value = 'custom';
  }

  if (SPECIMENS[activeSpecimenKey]) {
    SPECIMENS[activeSpecimenKey].size = num;

    // Update catalog card description if present
    const descEl = document.getElementById(`desc_${activeSpecimenKey}`);
    if (descEl) {
      if (SPECIMENS[activeSpecimenKey].type === 'internal') {
        descEl.textContent = `Inner Size: ${num.toFixed(2)} mm (Inner Jaws)`;
      } else if (SPECIMENS[activeSpecimenKey].type === 'depth') {
        descEl.textContent = `Depth: ${num.toFixed(2)} mm (Depth Rod)`;
      } else {
        descEl.textContent = `Size: ${num.toFixed(2)} mm (Outer Jaws)`;
      }
    }

    // Synchronize custom input if active specimen is custom
    const customInput = document.getElementById('customDiameterInput');
    if (customInput && activeSpecimenKey === 'custom') {
      customInput.value = num.toFixed(2);
    }

    // Synchronize toolbar length input
    const lenInput = document.getElementById('specimenLengthInput');
    if (lenInput) lenInput.value = num.toFixed(2);

    renderSpecimenSVG(activeSpecimenKey);
    autoClampToSpecimen();
  }
}

function selectSpecimen(key) {
  activeSpecimenKey = key;
  const sel = document.getElementById('quickSpecimenSelect');
  if (sel) sel.value = key;
  
  const clampBtn = document.getElementById('btnQuickClamp');
  if (clampBtn) clampBtn.style.display = 'inline-flex';

  const lengthEditor = document.getElementById('specimenLengthEditor');
  const lengthInput = document.getElementById('specimenLengthInput');
  if (lengthEditor && lengthInput && SPECIMENS[key]) {
    lengthEditor.style.display = 'inline-flex';
    lengthInput.value = SPECIMENS[key].size.toFixed(2);
  }

  document.querySelectorAll('.specimen-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`card_${key}`);
  if (card) card.classList.add('selected');

  renderSpecimenSVG(key);

  const spec = SPECIMENS[key];
  if (spec) {
    autoClampToSpecimen();
  }
}

function applyCustomSpecimenSize(val) {
  const num = parseFloat(val);
  if (!isNaN(num) && num > 0) {
    SPECIMENS.custom.size = num;
    selectSpecimen('custom');
  }
}

function renderSpecimenSVG(key) {
  const container = document.getElementById('virtualSpecimenGroup');
  if (!container) return;
  container.innerHTML = '';
  if (!key || !SPECIMENS[key]) return;

  const spec = SPECIMENS[key];
  const widthUnits = spec.size * SCALE_FACTOR;

  if (spec.type === 'external') {
    if (spec.shape === 'sphere') {
      const r = widthUnits / 2;
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", ORIGIN_X + r);
      circle.setAttribute("cy", 155);
      circle.setAttribute("r", r);
      circle.setAttribute("fill", "url(#satinSteelJaws)");
      circle.setAttribute("stroke", "#334155");
      circle.setAttribute("stroke-width", "1.8");
      circle.setAttribute("filter", "url(#caliperDropShadow)");
      container.appendChild(circle);

      renderDimensionAnnotation(container, ORIGIN_X, ORIGIN_X + widthUnits, 215, `${spec.size.toFixed(2)} mm`);
    } else if (spec.shape === 'cylinder' || spec.shape === 'mystery' || spec.shape === 'custom') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", ORIGIN_X);
      rect.setAttribute("y", 105);
      rect.setAttribute("width", widthUnits);
      rect.setAttribute("height", 100);
      rect.setAttribute("fill", spec.shape === 'cylinder' ? "url(#knurledBrassGrad)" : (spec.shape === 'mystery' ? "#f1f5f9" : "#e0e7ff"));
      rect.setAttribute("stroke", "#475569");
      rect.setAttribute("stroke-width", "1.5");
      rect.setAttribute("rx", "3");
      container.appendChild(rect);

      if (spec.shape === 'mystery') {
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", ORIGIN_X + widthUnits/2);
        txt.setAttribute("y", 165);
        txt.setAttribute("font-family", "'Plus Jakarta Sans', sans-serif");
        txt.setAttribute("font-size", "28");
        txt.setAttribute("font-weight", "800");
        txt.setAttribute("fill", "#7c3aed");
        txt.setAttribute("text-anchor", "middle");
        txt.textContent = "?";
        container.appendChild(txt);
      }

      renderDimensionAnnotation(container, ORIGIN_X, ORIGIN_X + widthUnits, 225, spec.shape === 'mystery' ? "Mystery Specimen" : `${spec.size.toFixed(2)} mm`);
    } else if (spec.shape === 'hex') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", ORIGIN_X);
      rect.setAttribute("y", 115);
      rect.setAttribute("width", widthUnits);
      rect.setAttribute("height", 80);
      rect.setAttribute("fill", "#94a3b8");
      rect.setAttribute("stroke", "#334155");
      rect.setAttribute("stroke-width", "1.8");
      rect.setAttribute("rx", "3");
      container.appendChild(rect);

      const hole = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hole.setAttribute("cx", ORIGIN_X + widthUnits/2);
      hole.setAttribute("cy", 155);
      hole.setAttribute("r", widthUnits/4);
      hole.setAttribute("fill", "#f8fafc");
      hole.setAttribute("stroke", "#334155");
      hole.setAttribute("stroke-width", "1.5");
      container.appendChild(hole);

      renderDimensionAnnotation(container, ORIGIN_X, ORIGIN_X + widthUnits, 215, `${spec.size.toFixed(2)} mm`);
    } else if (spec.shape === 'ring') {
      const outer = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      outer.setAttribute("x", ORIGIN_X);
      outer.setAttribute("y", 115);
      outer.setAttribute("width", widthUnits);
      outer.setAttribute("height", 80);
      outer.setAttribute("fill", "#cbd5e1");
      outer.setAttribute("stroke", "#334155");
      outer.setAttribute("stroke-width", "1.8");
      outer.setAttribute("rx", "4");
      container.appendChild(outer);

      const inner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      inner.setAttribute("x", ORIGIN_X + widthUnits*0.2);
      inner.setAttribute("y", 125);
      inner.setAttribute("width", widthUnits*0.6);
      inner.setAttribute("height", 60);
      inner.setAttribute("fill", "#f8fafc");
      inner.setAttribute("stroke", "#334155");
      inner.setAttribute("stroke-width", "1.2");
      container.appendChild(inner);

      renderDimensionAnnotation(container, ORIGIN_X, ORIGIN_X + widthUnits, 215, `${spec.size.toFixed(2)} mm`);
    }
  } else if (spec.type === 'internal') {
    const tube = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    tube.setAttribute("x", ORIGIN_X - 12);
    tube.setAttribute("y", -45);
    tube.setAttribute("width", widthUnits + 24);
    tube.setAttribute("height", 40);
    tube.setAttribute("fill", "rgba(56, 189, 248, 0.25)");
    tube.setAttribute("stroke", "#0284c7");
    tube.setAttribute("stroke-width", "1.8");
    tube.setAttribute("rx", "3");
    container.appendChild(tube);

    renderDimensionAnnotation(container, ORIGIN_X, ORIGIN_X + widthUnits, -10, `${spec.size.toFixed(2)} mm (Inner)`);
  } else if (spec.type === 'depth') {
    const block = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    block.setAttribute("x", 1380);
    block.setAttribute("y", 80);
    block.setAttribute("width", 75);
    block.setAttribute("height", 110);
    block.setAttribute("fill", "#cbd5e1");
    block.setAttribute("stroke", "#475569");
    block.setAttribute("stroke-width", "1.2");
    container.appendChild(block);

    const well = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    well.setAttribute("x", 1380);
    well.setAttribute("y", 65);
    well.setAttribute("width", widthUnits);
    well.setAttribute("height", 8);
    well.setAttribute("fill", "#0f172a");
    container.appendChild(well);
  }
}

function renderDimensionAnnotation(container, x1, x2, y, text) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y);
  line.setAttribute("stroke", "#0284c7");
  line.setAttribute("stroke-width", "1.2");
  line.setAttribute("stroke-dasharray", "3,2");

  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", (x1 + x2) / 2);
  t.setAttribute("y", y + 13);
  t.setAttribute("font-family", "'JetBrains Mono', monospace");
  t.setAttribute("font-size", "9.5");
  t.setAttribute("font-weight", "700");
  t.setAttribute("fill", "#0284c7");
  t.setAttribute("text-anchor", "middle");
  t.textContent = text;

  g.appendChild(line);
  g.appendChild(t);
  container.appendChild(g);
}

function autoClampToSpecimen() {
  if (!activeSpecimenKey || !SPECIMENS[activeSpecimenKey]) return;
  const targetSize = SPECIMENS[activeSpecimenKey].size;

  let start = currentReading;
  let duration = 280;
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = start + (targetSize - start) * ease;
    updateCaliperState(val, false);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      triggerAudioClick(850, 0.04);
    }
  }
  requestAnimationFrame(step);
}

function removeSpecimen() {
  activeSpecimenKey = null;
  const sel = document.getElementById('quickSpecimenSelect');
  if (sel) sel.value = 'none';
  const clampBtn = document.getElementById('btnQuickClamp');
  if (clampBtn) clampBtn.style.display = 'none';
  const lengthEditor = document.getElementById('specimenLengthEditor');
  if (lengthEditor) lengthEditor.style.display = 'none';
  document.querySelectorAll('.specimen-card').forEach(c => c.classList.remove('selected'));
  const container = document.getElementById('virtualSpecimenGroup');
  if (container) container.innerHTML = '';
}

// --- QUIZ LOGIC ---
function generateRandomQuiz() {
  const randMSR = Math.floor(Math.random() * 55) + 6;
  const totalDivisions = Math.round(1 / currentLC);
  const randVSR = Math.floor(Math.random() * totalDivisions);

  quizTargetValue = randMSR + (randVSR * currentLC);
  updateCaliperState(quizTargetValue, true);

  document.getElementById('quizInputMSR').value = '';
  document.getElementById('quizInputVSR').value = '';
  document.getElementById('quizInputTotal').value = '';
  const evalBox = document.getElementById('quizFeedbackBanner');
  evalBox.style.display = 'none';
  evalBox.className = 'quiz-feedback-banner';
}

function verifyQuizAnswer() {
  const userMSR = parseInt(document.getElementById('quizInputMSR').value);
  const userVSR = parseInt(document.getElementById('quizInputVSR').value);
  const userTotal = parseFloat(document.getElementById('quizInputTotal').value);

  const evalBox = document.getElementById('quizFeedbackBanner');
  if (isNaN(userMSR) || isNaN(userVSR) || isNaN(userTotal)) {
    evalBox.className = 'quiz-feedback-banner failure';
    evalBox.innerHTML = `<strong>Incomplete Entry:</strong> Please provide values for MSR, VSR division, and the Total Calculated reading.`;
    return;
  }

  quizTotal++;
  const correctMSR = Math.floor(quizTargetValue);
  const totalDivisions = Math.round(1 / currentLC);
  let correctVSR = Math.round((quizTargetValue - correctMSR) / currentLC);
  if (correctVSR >= totalDivisions) correctVSR = 0;
  const correctTotal = correctMSR + (correctVSR * currentLC);

  const msrMatch = (userMSR === correctMSR);
  const vsrMatch = (userVSR === correctVSR);
  const totalMatch = Math.abs(userTotal - correctTotal) < (currentLC / 2);

  if (msrMatch && vsrMatch && totalMatch) {
    quizScore++;
    quizStreak++;
    evalBox.className = 'quiz-feedback-banner success';
    evalBox.innerHTML = `
      <strong>🎉 Correct! Precise Metrology Calculation:</strong><br>
      &bull; MSR: <strong>${correctMSR} mm</strong> | VSR: Division <strong>${correctVSR}</strong><br>
      &bull; Total: ${correctMSR} + (${correctVSR} &times; ${currentLC}) = <strong>${correctTotal.toFixed(2)} mm</strong>
    `;
    triggerAudioClick(950, 0.08);
  } else {
    quizStreak = 0;
    evalBox.className = 'quiz-feedback-banner failure';
    let notes = [];
    if (!msrMatch) notes.push(`MSR: The Vernier 0 index has passed mark <strong>${correctMSR} mm</strong> (you entered ${userMSR}).`);
    if (!vsrMatch) notes.push(`VSR: The accurately aligned mark is division <strong>${correctVSR}</strong> (you entered ${userVSR}).`);
    if (!totalMatch) notes.push(`Total should equal ${correctMSR} + (${correctVSR} &times; ${currentLC}) = <strong>${correctTotal.toFixed(2)} mm</strong>.`);

    evalBox.innerHTML = `
      <strong>Incorrect. Review the derivation:</strong><br>
      ${notes.join('<br>')}
    `;
    triggerAudioClick(280, 0.1);
  }

  document.getElementById('quizScoreVal').textContent = quizScore;
  document.getElementById('quizTotalVal').textContent = quizTotal;
  document.getElementById('quizStreakVal').textContent = quizStreak;
}

// --- MODAL CONTROLS ---
function openTheoryModal() {
  document.getElementById('theoryModal').classList.add('open');
}

function closeTheoryModal(e) {
  if (e && e.target !== document.getElementById('theoryModal')) return;
  document.getElementById('theoryModal').classList.remove('open');
}
