let chart = null;
let values = {
  age: null,
  monthly: 1000,
  initial: 0,
  returnRate: 7,
  years: 20,
  salary: 5000,
  epfBalance: 50000,
  voluntaryEPF: 0,
  epfDividendRate: 5.5,
  includeEPF: true,
  useMix: false,
  mixAllocations: {
    etf: 40,
    unitTrust: 30,
    fd: 20,
    stocks: 10,
    asb: 0,
    reits: 0
  },
  mixReturns: {
    etf: 7.0,
    unitTrust: 6.0,
    fd: 3.5,
    stocks: 10.0,
    asb: 5.75,
    reits: 5.5
  },
  mixEnabled: {
    etf: true,
    unitTrust: true,
    fd: true,
    stocks: true,
    asb: false,
    reits: false
  }
};

// Investment types in the mix, in display order
const MIX_ASSETS = [
  ['etf', 'ETFs'],
  ['unitTrust', 'Unit Trusts'],
  ['fd', 'Fixed Deposit'],
  ['stocks', 'Individual Stocks'],
  ['asb', 'ASB'],
  ['reits', 'REITs']
];

function adjustValue(type, change) {
  if (type === 'age') {
    if (values[type] === null) {
      values[type] = 25; // Default starting age
    }
    values[type] = Math.max(1, Math.min(100, values[type] + change));
  } else if (type === 'salary') {
    values[type] = Math.max(1000, values[type] + change);
    updateEPFRateInfo(); // Update EPF rate when salary changes
  } else if (type === 'epfBalance' || type === 'voluntaryEPF') {
    values[type] = Math.max(0, values[type] + change);
    if (type === 'voluntaryEPF') {
      updateEPFRateInfo(); // Update EPF info when voluntary amount changes
    }
  } else {
    values[type] = Math.max(0, values[type] + change);
  }
  updateInputs();
  calculate();
}

function formatAndUpdate(type) {
  const input = document.getElementById(type + 'Input');
  
  if (type === 'age') {
    // Handle age field specially - allow empty for optional field, no minimum age limit
    let value = input.value.replace(/[^\d]/g, '');
    if (value === '') {
      values[type] = null;
      input.value = '';
      return; // Don't calculate if empty
    } else {
      const numValue = Math.max(1, Math.min(100, parseInt(value) || 1));
      values[type] = numValue;
      input.value = numValue.toString();
    }
  } else if (type === 'salary') {
    // Allow clearing and typing new values
    let value = input.value.replace(/[^\d]/g, '');
    if (value === '') {
      input.value = '';
      return; // Don't update values while typing
    }
    const numValue = parseInt(value);
    input.value = numValue.toLocaleString();
    if (numValue < 1000) return; // Below the minimum: wait until the field is left
    values[type] = numValue;
    updateEPFRateInfo(); // Update EPF rate when salary changes
  } else if (type === 'voluntaryEPF') {
    // Handle voluntary EPF contributions
    let value = input.value.replace(/[^\d]/g, '');
    if (value === '') {
      input.value = '';
      return;
    }
    const numValue = Math.max(0, parseInt(value) || 0);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
    updateEPFRateInfo(); // Update EPF info when voluntary amount changes
  } else {
    // Remove any non-digit characters
    let value = input.value.replace(/[^\d]/g, '');
    if (value === '') {
      input.value = '';
      return; // Don't update values while typing
    }
    const numValue = Math.max(0, parseInt(value) || 0);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
  }
  calculate();
}

function updateFromInput(type) {
  const input = document.getElementById(type + 'Input');
  
  if (type === 'age') {
    if (input.value === '' || input.value.trim() === '') {
      values[type] = null;
      // Don't calculate if age is empty (it's optional)
      return;
    } else {
      const cleanValue = input.value.replace(/[^\d]/g, '');
      const numValue = Math.max(1, Math.min(100, parseInt(cleanValue) || 1));
      values[type] = numValue;
      input.value = numValue.toString();
    }
  } else if (type === 'salary') {
    const cleanValue = input.value.replace(/,/g, '');
    if (cleanValue === '' || cleanValue.trim() === '') {
      // Don't update if empty, let user finish typing
      return;
    }
    const numValue = Math.max(1000, parseInt(cleanValue) || 1000);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
    updateEPFRateInfo(); // Update EPF rate when salary changes
  } else if (type === 'voluntaryEPF') {
    const cleanValue = input.value.replace(/,/g, '');
    if (cleanValue === '' || cleanValue.trim() === '') {
      return;
    }
    const numValue = Math.max(0, parseInt(cleanValue) || 0);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
    updateEPFRateInfo(); // Update EPF info when voluntary amount changes
  } else {
    const cleanValue = input.value.replace(/,/g, '');
    if (cleanValue === '' || cleanValue.trim() === '') {
      return; // Don't update if empty, let user finish typing
    }
    const numValue = Math.max(0, parseInt(cleanValue) || 0);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
  }
  calculate();
}

function updateSlider() {
  // Only update main return rate if not using mix
  if (!values.useMix) {
    values.returnRate = parseFloat(document.getElementById('returnSlider').value);
  }
  
  values.years = parseInt(document.getElementById('yearsSlider').value);
  
  // Update EPF dividend rate if EPF section exists
  const epfSlider = document.getElementById('epfDividendSlider');
  if (epfSlider) {
    values.epfDividendRate = parseFloat(epfSlider.value);
  }
  
  updateDisplays();
  updateSliderPosition('returnSlider', 'returnValue');
  updateSliderPosition('yearsSlider', 'yearsValue');
  updateSliderPosition('epfDividendSlider', 'epfDividendValue');
  
  calculate();
}

function updateInputs() {
  document.getElementById('monthlyInput').value = values.monthly.toLocaleString();
  document.getElementById('initialInput').value = values.initial.toLocaleString();
  document.getElementById('salaryInput').value = values.salary.toLocaleString();
  document.getElementById('epfBalanceInput').value = values.epfBalance.toLocaleString();
  const voluntaryInput = document.getElementById('voluntaryEPFInput');
  if (voluntaryInput) voluntaryInput.value = values.voluntaryEPF.toLocaleString();
  if (values.age !== null) {
    document.getElementById('ageInput').value = values.age.toString();
  }
  
  // Update EPF rate info
  updateEPFRateInfo();
}

const EPF_EMPLOYEE_RATE = 0.11;

// Employer share: 13% for a salary of RM 5,000 or less, 12% above
function epfEmployerRate(salary) {
  return salary <= 5000 ? 0.13 : 0.12;
}

function updateEPFRateInfo() {
  const epfRateInfo = document.getElementById('epfRateInfo');
  if (!epfRateInfo) return;

  const rm = n => `RM ${Math.round(n).toLocaleString()}`;
  const employerRate = epfEmployerRate(values.salary);
  const fromYou = values.salary * EPF_EMPLOYEE_RATE;
  const fromEmployer = values.salary * employerRate;
  const voluntary = values.voluntaryEPF;

  epfRateInfo.innerHTML = `
    You ${EPF_EMPLOYEE_RATE * 100}%: ${rm(fromYou)} + employer ${Math.round(employerRate * 100)}%: ${rm(fromEmployer)}<br>
    ${voluntary > 0 ? `Voluntary: ${rm(voluntary)}<br>` : ''}
    <strong>Into EPF each month: ${rm(fromYou + fromEmployer + voluntary)}</strong>
  `;
}

function updateDisplays() {
  updateSliderPosition('returnSlider', 'returnValue');
  updateSliderPosition('yearsSlider', 'yearsValue');
  updateSliderPosition('epfDividendSlider', 'epfDividendValue');
}

function updateSliderPosition(sliderId, valueId) {
  const slider = document.getElementById(sliderId);
  const valueDiv = document.getElementById(valueId);
  if (!slider || !valueDiv) return;
  
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const value = parseFloat(slider.value);
  
  const percent = (value - min) / (max - min);
  const thumbWidth = 24;
  const sliderWidth = slider.offsetWidth;
  const thumbCenterPosition = percent * (sliderWidth - thumbWidth) + thumbWidth / 2;
  const bubbleLeft = thumbCenterPosition - (valueDiv.offsetWidth / 2);
  
  valueDiv.style.left = `${bubbleLeft}px`;
  
  if (sliderId === 'returnSlider') {
    valueDiv.textContent = value.toFixed(1) + '%';
  } else if (sliderId === 'yearsSlider') {
    valueDiv.textContent = value + ' Years';
  } else if (sliderId === 'epfDividendSlider') {
    valueDiv.textContent = value.toFixed(1) + '%';
  }
}

function toggleEPF() {
  const epfToggle = document.getElementById('epfToggle');
  const epfSection = document.getElementById('epfSection');
  
  if (!epfToggle || !epfSection) {
    console.warn('EPF toggle elements not found');
    return;
  }
  
  values.includeEPF = epfToggle.checked;
  
  if (values.includeEPF) {
    epfSection.classList.remove('hidden');
  } else {
    epfSection.classList.add('hidden');
  }
  
  calculate();
}

function toggleMix() {
  const mixToggle = document.getElementById('mixToggle');
  const mixSection = document.getElementById('mixSection');
  const returnSlider = document.getElementById('returnSlider');
  
  if (!mixToggle || !mixSection || !returnSlider) {
    console.warn('Mix toggle elements not found');
    return;
  }
  
  values.useMix = mixToggle.checked;
  
  if (values.useMix) {
    mixSection.classList.remove('hidden');
    setReturnGroupHidden(true);
    updateMixDisplay();
    calculateBlendedReturn();
  } else {
    mixSection.classList.add('hidden');
    setReturnGroupHidden(false);
    values.returnRate = parseFloat(returnSlider.value);
  }
  
  calculate();
}

function setReturnGroupHidden(hidden) {
  const group = document.getElementById('returnGroup');
  if (group) group.hidden = hidden;
}

// Keeps the shares of the ticked investments at 100% in steps of 5.
// The share of `fixedKey` stays as set; the others are scaled to fill the rest.
function rebalanceMix(fixedKey) {
  const a = values.mixAllocations;
  MIX_ASSETS.forEach(([k]) => { if (!values.mixEnabled[k]) a[k] = 0; });
  const others = MIX_ASSETS.map(([k]) => k).filter(k => k !== fixedKey && values.mixEnabled[k]);
  if (fixedKey && !others.length) { a[fixedKey] = 100; return; }
  const target = 100 - (fixedKey ? a[fixedKey] : 0);
  const sum = others.reduce((t, k) => t + a[k], 0);
  others.forEach(k => {
    a[k] = sum > 0 ? Math.round((a[k] / sum) * target / 5) * 5 : Math.floor(target / others.length / 5) * 5;
  });
  const largest = () => others.reduce((m, k) => (a[k] > a[m] ? k : m), others[0]);
  let total = others.reduce((t, k) => t + a[k], 0);
  while (total < target) { a[largest()] += 5; total += 5; }
  while (total > target) { a[largest()] -= 5; total -= 5; }
}

function toggleInvestmentType(type) {
  const checkbox = document.getElementById(type + 'Enabled');
  const enabledCount = MIX_ASSETS.filter(([k]) => values.mixEnabled[k]).length;
  if (!checkbox.checked && enabledCount === 1) {
    checkbox.checked = true; // keep at least one investment in the mix
    return;
  }
  values.mixEnabled[type] = checkbox.checked;
  values.mixAllocations[type] = 0;
  rebalanceMix(null);
  updateMixDisplay();
  calculateBlendedReturn();
  calculate();
}

function updateMixReturn(type) {
  const slider = document.getElementById(type + 'ReturnSlider');
  if (!slider) return;
  values.mixReturns[type] = parseFloat(slider.value);
  updateMixDisplay();
  if (values.useMix) {
    calculateBlendedReturn();
    calculate();
  }
}

function updateMix(type) {
  const slider = document.getElementById(type + 'Slider');
  if (!slider) return;
  values.mixAllocations[type] = parseInt(slider.value, 10);
  rebalanceMix(type);
  updateMixDisplay();
  calculateBlendedReturn();
  calculate();
}

function updateMixDisplay() {
  MIX_ASSETS.forEach(([k]) => {
    const el = id => document.getElementById(k + id);
    if (el('Percentage')) el('Percentage').textContent = values.mixAllocations[k] + '%';
    if (el('Slider')) el('Slider').value = values.mixAllocations[k];
    if (el('ReturnRate')) el('ReturnRate').textContent = values.mixReturns[k].toFixed(2).replace(/0$/, '') + '%';
    if (el('ReturnSlider')) el('ReturnSlider').value = values.mixReturns[k];
    if (el('Enabled')) el('Enabled').checked = values.mixEnabled[k];
    if (el('Config')) el('Config').classList[values.mixEnabled[k] ? 'remove' : 'add']('disabled');
  });
}

function calculateBlendedReturn() {
  if (!values.useMix) return;
  values.returnRate = MIX_ASSETS.reduce((rate, [k]) =>
    rate + (values.mixEnabled[k] ? (values.mixAllocations[k] / 100) * values.mixReturns[k] : 0), 0);

  const blendedRate = document.getElementById('blendedRate');
  if (blendedRate) {
    blendedRate.textContent = values.returnRate.toFixed(1) + '%';
  }
}

// Typical yearly swing (standard deviation, in percentage points) of each investment type,
// from long-run market history. Used only for the likely range.
const MIX_SWING = { etf: 15, unitTrust: 12, fd: 0.5, stocks: 20, asb: 0.5, reits: 15 };
const MIX_CORRELATION = 0.6; // how closely different investment types move together
const EPF_SWING = 0.5;
const SIM_RUNS = 2000;

// Yearly swing of the investment part: from the mix, or, for a single rate,
// twice its margin over a 3% fixed deposit (7% swings about 8 points, 12% about 18)
function investmentSwing() {
  if (!values.useMix) return Math.max(0.5, (values.returnRate - 3) * 2);
  const keys = MIX_ASSETS.map(([k]) => k).filter(k => values.mixEnabled[k] && values.mixAllocations[k] > 0);
  let variance = 0;
  keys.forEach(i => keys.forEach(j => {
    const weight = (values.mixAllocations[i] / 100) * (values.mixAllocations[j] / 100);
    variance += weight * MIX_SWING[i] * MIX_SWING[j] * (i === j ? 1 : MIX_CORRELATION);
  }));
  return Math.sqrt(variance);
}

// Small seeded generator so the same inputs always give the same range
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomNormal(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

// Runs the plan many times, drawing a different return for every year, and
// returns per year the middle outcome of investments and EPF and the 10th and
// 90th percentile of the total.
function simulateRange({ years, initial, monthly, rate, swing, epf }) {
  const rand = seededRandom(20251);
  const inv = [], ep = [], tot = [];
  for (let y = 0; y < years; y++) {
    inv.push(new Float64Array(SIM_RUNS));
    ep.push(new Float64Array(SIM_RUNS));
    tot.push(new Float64Array(SIM_RUNS));
  }
  for (let run = 0; run < SIM_RUNS; run++) {
    let invBalance = initial;
    let epfBalance = epf ? epf.start : 0;
    for (let y = 0; y < years; y++) {
      const invRate = Math.max(-95, rate + swing * randomNormal(rand)) / 100 / 12;
      for (let m = 0; m < 12; m++) invBalance = invBalance * (1 + invRate) + monthly;
      if (epf) {
        const epfRate = Math.max(0, epf.rate + EPF_SWING * randomNormal(rand)) / 100 / 12;
        for (let m = 0; m < 12; m++) epfBalance = epfBalance * (1 + epfRate) + epf.monthly;
      }
      inv[y][run] = invBalance;
      ep[y][run] = epfBalance;
      tot[y][run] = invBalance + epfBalance;
    }
  }
  const pick = (arr, q) => arr.sort()[Math.floor(q * (SIM_RUNS - 1))];
  return inv.map((_, y) => ({
    investment: pick(inv[y], 0.5),
    epf: pick(ep[y], 0.5),
    low: pick(tot[y], 0.1),
    high: pick(tot[y], 0.9)
  }));
}

function calculateEPF(salary, currentBalance, voluntaryEPF, dividendRate, years) {
  // EPF contribution rates based on salary threshold
  const employerRate = epfEmployerRate(salary);
  const employmentRate = Math.round((EPF_EMPLOYEE_RATE + employerRate) * 100) / 100;
  const monthlyEmployeeContribution = salary * EPF_EMPLOYEE_RATE;
  const monthlyEmployerContribution = salary * employerRate;
  const monthlyEmploymentContribution = monthlyEmployeeContribution + monthlyEmployerContribution;
  const monthlyVoluntaryContribution = voluntaryEPF;
  const totalMonthlyContribution = monthlyEmploymentContribution + monthlyVoluntaryContribution;
  
  const monthlyRate = dividendRate / 100 / 12;
  const totalMonths = years * 12;
  
  let balance = currentBalance;
  const dataPoints = [];
  
  for (let month = 1; month <= totalMonths; month++) {
    balance = balance * (1 + monthlyRate) + totalMonthlyContribution;
    
    if (month % 12 === 0) {
      const currentYear = month / 12;
      dataPoints.push({
        year: currentYear,
        balance: balance,
        contributed: currentBalance + (totalMonthlyContribution * month)
      });
    }
  }
  
  return {
    finalBalance: balance,
    totalContributed: currentBalance + (totalMonthlyContribution * totalMonths),
    dataPoints: dataPoints,
    monthlyEmploymentContribution: monthlyEmploymentContribution,
    monthlyEmployeeContribution: monthlyEmployeeContribution,
    monthlyEmployerContribution: monthlyEmployerContribution,
    monthlyVoluntaryContribution: monthlyVoluntaryContribution,
    totalMonthlyContribution: totalMonthlyContribution,
    employmentRate: employmentRate
  };
}

function calculate() {
  // Check if required elements exist before proceeding
  const blankState = document.getElementById('blankState');
  const wealthChart = document.getElementById('wealthChart');
  const loadingStateChart = document.getElementById('loadingStateChart');
  
  if (!blankState || !wealthChart || !loadingStateChart) {
    console.warn('Required chart elements not found');
    return;
  }
  
  blankState.style.display = 'none';
  wealthChart.style.display = 'none';
  loadingStateChart.style.display = 'flex';

  const resultsArea = document.getElementById('resultsContent');
  if (resultsArea) resultsArea.classList.add('is-updating');

  setTimeout(() => {
    const { age, monthly, initial, returnRate, years, salary, epfBalance, epfDividendRate, includeEPF } = values;
    const monthlyRate = returnRate / 100 / 12;
    const totalMonths = years * 12;
    
    let investmentBalance = initial;
    let totalInvestmentContributed = initial;
    const investmentDataPoints = [];

    for (let month = 1; month <= totalMonths; month++) {
      investmentBalance = investmentBalance * (1 + monthlyRate) + monthly;
      totalInvestmentContributed += monthly;

      if (month % 12 === 0) {
        const currentYear = month / 12;
        const currentAge = age !== null ? age + currentYear : null;
        
        investmentDataPoints.push({
          year: currentYear,
          age: currentAge,
          balance: investmentBalance,
          contributed: totalInvestmentContributed
        });
      }
    }

    let epfData = null;
    let combinedDataPoints = [...investmentDataPoints];
    let finalBalance = investmentBalance;
    let totalContributed = totalInvestmentContributed;
    
    if (includeEPF) {
      epfData = calculateEPF(salary, epfBalance, values.voluntaryEPF, epfDividendRate, years);
      
      combinedDataPoints = investmentDataPoints.map((point, index) => {
        const epfPoint = epfData.dataPoints[index];
        return {
          ...point,
          balance: point.balance + epfPoint.balance,
          epfBalance: epfPoint.balance,
          investmentBalance: point.balance,
          totalContributed: point.contributed + epfPoint.contributed
        };
      });
      
      finalBalance = investmentBalance + epfData.finalBalance;
      totalContributed = totalInvestmentContributed + epfData.totalContributed;
    }

    const averageBalance = finalBalance;
    const range = simulateRange({
      years,
      initial,
      monthly,
      rate: returnRate,
      swing: investmentSwing(),
      epf: includeEPF ? { start: epfBalance, rate: epfDividendRate, monthly: epfData.totalMonthlyContribution } : null
    });

    // Chart, milestones and summary follow the middle outcome
    combinedDataPoints = combinedDataPoints.map((point, i) => ({
      ...point,
      average: point.balance,
      balance: range[i].investment + (includeEPF ? range[i].epf : 0),
      investmentBalance: range[i].investment,
      epfBalance: includeEPF ? range[i].epf : undefined,
      low: range[i].low,
      high: range[i].high
    }));
    const last = combinedDataPoints[combinedDataPoints.length - 1];
    finalBalance = last.balance;

    const totalInterest = finalBalance - totalContributed;

    updateSummary({
      years,
      age,
      invested: totalInvestmentContributed,
      epfContributed: includeEPF ? epfData.totalContributed : 0,
      epfStart: includeEPF ? epfBalance : 0,
      epfFromYou: includeEPF ? (epfData.monthlyEmployeeContribution + epfData.monthlyVoluntaryContribution) * years * 12 : 0,
      growth: totalInterest,
      finalBalance,
      averageBalance,
      low: last.low,
      high: last.high
    });

    updateChart(combinedDataPoints, includeEPF);
    updateProgressMilestones(combinedDataPoints, age);
    updateCalculationBreakdown();

    if (loadingStateChart) loadingStateChart.style.display = 'none';
    if (wealthChart) wealthChart.style.display = 'block';
    
    const resultsContent = document.getElementById('resultsContent');
    if (resultsContent) {
      resultsContent.classList.add('fade-in');
      resultsContent.classList.remove('is-updating');
      flashUpdated(resultsContent.querySelectorAll('.summary-total, .progress-amount'));
    }
  }, 500);
}

// Briefly highlights figures that were just recalculated
function flashUpdated(elements) {
  elements.forEach(el => {
    el.classList.remove('just-updated');
    void el.offsetWidth; // restart the animation
    el.classList.add('just-updated');
  });
}

function updateSummary({ years, age, invested, epfContributed, epfStart, epfFromYou, growth, finalBalance, averageBalance, low, high }) {
  const rm = n => `RM ${Math.round(n).toLocaleString()}`;
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const after = `after ${years} year${years === 1 ? '' : 's'}${age !== null ? ` (age ${age + years})` : ''}`;
  set('summaryLabel', `Likely final wealth ${after}`);
  set('eqFinalAmount', rm(finalBalance));
  set('summaryRange', `8 in 10 outcomes land between ${rm(low)} and ${rm(high)}. If every year paid exactly the average: ${rm(averageBalance)}.`);
  set('partInvest', rm(invested));
  set('partEpf', rm(epfContributed));
  set('partEpfNote', epfContributed
    ? `${rm(epfFromYou)} from your salary, ${rm(epfContributed - epfStart - epfFromYou)} from your employer, ${rm(epfStart)} you have now`
    : '');
  set('eqTotalInterest', rm(growth));

  const epfRow = document.getElementById('partEpfRow');
  if (epfRow) epfRow.hidden = !epfContributed;

  const bar = document.getElementById('summaryBar');
  if (bar) {
    const parts = [['bar-invest', invested], ['bar-epf', epfContributed], ['bar-growth', Math.max(0, growth)]];
    bar.innerHTML = parts.filter(([, v]) => v > 0)
      .map(([cls, v]) => `<span class="${cls}" style="flex-grow: ${v}"></span>`).join('');
    bar.setAttribute('aria-label', `Your investments ${rm(invested)}, EPF ${rm(epfContributed)}, growth ${rm(growth)}`);
  }
}

function updateChart(dataPoints, includeEPF) {
  const ctx = document.getElementById('wealthChart').getContext('2d');
  
  if (chart) {
    chart.destroy();
  }

  const labels = dataPoints.map(point => {
    if (point.age !== null) {
      return `Year ${point.year} (Age ${point.age})`;
    } else {
      return `Year ${point.year}`;
    }
  });

  const datasets = [
    {
      label: 'Total Wealth',
      data: dataPoints.map(point => point.balance),
      borderColor: '#E0457B',
      backgroundColor: 'rgba(224, 69, 123, 0.08)',
      borderWidth: 3,
      fill: false,
      tension: 0.4
    },
    {
      label: 'Likely range',
      data: dataPoints.map(point => point.high),
      borderColor: 'transparent',
      backgroundColor: 'rgba(224, 69, 123, 0.12)',
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: '+1',
      tension: 0.4
    },
    {
      label: 'range-low',
      data: dataPoints.map(point => point.low),
      borderColor: 'transparent',
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      tension: 0.4
    }
  ];

  if (includeEPF) {
    datasets.push({
      label: 'EPF Balance',
      data: dataPoints.map(point => point.epfBalance || 0),
      borderColor: '#3E6FC4',
      backgroundColor: 'rgba(62, 111, 196, 0.08)',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    });
    
    datasets.push({
      label: 'Investment Balance',
      data: dataPoints.map(point => point.investmentBalance || 0),
      borderColor: '#14998A',
      backgroundColor: 'rgba(20, 153, 138, 0.08)',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    });
  } else {
    datasets.push({
      label: 'Contributions',
      data: dataPoints.map(point => point.contributed),
      borderColor: '#14998A',
      backgroundColor: 'rgba(20, 153, 138, 0.08)',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    });
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 14,
              weight: 600
            },
            pointStyle: 'circle',
            boxWidth: 4,
            boxHeight: 4,
            filter: item => item.text !== 'range-low'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26, 26, 29, 0.95)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: '#00FFD1',
          borderWidth: 2,
          cornerRadius: 8,
          padding: 16,
          displayColors: true,
          titleFont: {
            size: 16,
            weight: 'bold'
          },
          bodyFont: {
            size: 14,
            weight: '600'
          },
          callbacks: {
            label: function(context) {
              if (context.dataset.label === 'range-low') return null;
              if (context.dataset.label === 'Likely range') {
                const point = dataPoints[context.dataIndex];
                return `Likely range: RM ${Math.round(point.low).toLocaleString()} to RM ${Math.round(point.high).toLocaleString()}`;
              }
              return context.dataset.label + ': RM ' + Math.round(context.parsed.y).toLocaleString();
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 12,
              weight: 600
            },
            callback: function(value) {
              return 'RM ' + value.toLocaleString();
            }
          }
        },
        x: {
          ticks: {
            font: {
              size: 12,
              weight: 600
            },
            maxRotation: 45
          }
        }
      }
    }
  });
}

function updateProgressMilestones(dataPoints, age) {
  const progressContainer = document.getElementById('progressContainer');
  progressContainer.innerHTML = '';
  
  const milestones = [];
  
  for (let i = 0; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    if (point.year % 5 === 0 || i === dataPoints.length - 1) {
      milestones.push(point);
    }
  }
  
  const selectedMilestones = [];
  if (milestones.length > 0) selectedMilestones.push(milestones[0]);
  if (milestones.length > 2) {
    const midIndex = Math.floor(milestones.length / 2);
    selectedMilestones.push(milestones[midIndex]);
  }
  if (milestones.length > 1) selectedMilestones.push(milestones[milestones.length - 1]);
  
  selectedMilestones.forEach((milestone, index) => {
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    progressItem.setAttribute('role', 'listitem');
    
    const yearText = age !== null ? 
      `Year ${milestone.year} (Age ${milestone.age})` : 
      `Year ${milestone.year}`;
    
    const putIn = milestone.totalContributed ?? milestone.contributed;
    const description = `<span class="amount">RM ${Math.round(putIn).toLocaleString()}</span> put in, <span class="amount">RM ${Math.round(milestone.balance - putIn).toLocaleString()}</span> growth`;

    const includeEPF = values.includeEPF && milestone.epfBalance;
    const useMix = values.useMix;
    
    let breakdownHtml = '';
    if (includeEPF && useMix) {
      const investmentAmount = milestone.investmentBalance || 0;
      const epfAmount = milestone.epfBalance || 0;
      
      breakdownHtml = `
        <div class="progress-breakdown">
          <div class="breakdown-item investment">
            <span class="breakdown-label">Your investments</span>
            <span class="breakdown-amount">RM ${Math.round(investmentAmount).toLocaleString()}</span>
          </div>
          <div class="breakdown-item epf">
            <span class="breakdown-label">EPF</span>
            <span class="breakdown-amount">RM ${Math.round(epfAmount).toLocaleString()}</span>
          </div>
        </div>
      `;
    } else if (includeEPF) {
      const investmentAmount = milestone.investmentBalance || 0;
      const epfAmount = milestone.epfBalance || 0;
      
      breakdownHtml = `
        <div class="progress-breakdown">
          <div class="breakdown-item investment">
            <span class="breakdown-label">Your investments</span>
            <span class="breakdown-amount">RM ${Math.round(investmentAmount).toLocaleString()}</span>
          </div>
          <div class="breakdown-item epf">
            <span class="breakdown-label">EPF</span>
            <span class="breakdown-amount">RM ${Math.round(epfAmount).toLocaleString()}</span>
          </div>
        </div>
      `;
    } else if (useMix) {
      const totalInvestment = milestone.balance;
      const mixBreakdown = MIX_ASSETS
        .filter(([k]) => values.mixEnabled[k] && values.mixAllocations[k] > 0)
        .map(([k, name]) => `
          <div class="breakdown-item mix-${k}">
            <span class="breakdown-label">${name} (${values.mixAllocations[k]}%)</span>
            <span class="breakdown-amount">RM ${Math.round(totalInvestment * values.mixAllocations[k] / 100).toLocaleString()}</span>
          </div>
        `).join('');

      if (mixBreakdown) {
        breakdownHtml = `<div class="progress-breakdown">${mixBreakdown}</div>`;
      }
    }
    
    progressItem.innerHTML = `
      <div class="progress-info">
        <div class="progress-year">${yearText}</div>
        <span class="progress-description">${description}</span>
        ${breakdownHtml}
      </div>
      <div class="progress-total">
        <div class="progress-amount">RM ${Math.round(milestone.balance).toLocaleString()}</div>
        ${includeEPF ? '<div class="progress-total-label">Total Wealth</div>' : ''}
      </div>
    `;
    
    progressContainer.appendChild(progressItem);
  });
}

function toggleInstructions() {
  const steps = document.getElementById('instructionSteps');
  const toggleIcon = document.querySelector('.toggle-icon');
  const header = document.querySelector('.instructions-header');
  
  steps.classList.toggle('collapsed');
  toggleIcon.classList.toggle('rotated');
  
  const isExpanded = !steps.classList.contains('collapsed');
  header.setAttribute('aria-expanded', isExpanded.toString());
  
  if (steps.classList.contains('collapsed')) {
    toggleIcon.textContent = '+';
  } else {
    toggleIcon.textContent = '−';
  }
}

function toggleWealthJourney() {
  const details = document.getElementById('wealthJourneyDetails');
  const toggleIcon = document.querySelector('.wealth-journey-toggle-icon');
  const header = document.querySelector('.wealth-journey-header');
  
  details.classList.toggle('collapsed');
  toggleIcon.classList.toggle('rotated');
  
  const isExpanded = !details.classList.contains('collapsed');
  header.setAttribute('aria-expanded', isExpanded.toString());
  
  if (details.classList.contains('collapsed')) {
    toggleIcon.textContent = '+';
  } else {
    toggleIcon.textContent = '−';
  }
}

function toggleCalculationBreakdown() {
  const details = document.getElementById('breakdownDetails');
  const toggleIcon = document.querySelector('.breakdown-toggle-icon');
  const header = document.querySelector('.breakdown-header');
  
  details.classList.toggle('collapsed');
  toggleIcon.classList.toggle('rotated');
  
  const isExpanded = !details.classList.contains('collapsed');
  header.setAttribute('aria-expanded', isExpanded.toString());
  
  if (details.classList.contains('collapsed')) {
    toggleIcon.textContent = '+';
  } else {
    toggleIcon.textContent = '−';
  }
}

function updateCalculationBreakdown() {
  const calculationBreakdown = document.getElementById('calculationBreakdown');
  if (calculationBreakdown) {
    calculationBreakdown.style.display = 'block';
  }
  
  // Safely update elements if they exist
  const breakdownMonthly = document.getElementById('breakdownMonthly');
  if (breakdownMonthly) breakdownMonthly.textContent = `RM ${values.monthly.toLocaleString()}`;
  
  const breakdownInitial = document.getElementById('breakdownInitial');
  if (breakdownInitial) breakdownInitial.textContent = `RM ${values.initial.toLocaleString()}`;
  
  const breakdownYears = document.getElementById('breakdownYears');
  if (breakdownYears) breakdownYears.textContent = `${values.years} years`;
  
  const breakdownReturn = document.getElementById('breakdownReturn');
  if (breakdownReturn) {
    if (values.useMix) {
      breakdownReturn.textContent = `${values.returnRate.toFixed(1)}% (blended)`;
    } else {
      breakdownReturn.textContent = `${values.returnRate.toFixed(1)}%`;
    }
  }
  
  const epfBreakdownSection = document.getElementById('epfBreakdownSection');
  if (values.includeEPF && epfBreakdownSection) {
    epfBreakdownSection.style.display = 'block';
    
    const employmentRate = values.salary <= 5000 ? 0.24 : 0.23;
    const employmentContrib = values.salary * employmentRate;
    const totalEPF = employmentContrib + values.voluntaryEPF;
    
    const breakdownSalary = document.getElementById('breakdownSalary');
    if (breakdownSalary) breakdownSalary.textContent = `RM ${values.salary.toLocaleString()}`;
    
    const breakdownEmploymentRate = document.getElementById('breakdownEmploymentRate');
    if (breakdownEmploymentRate) {
      if (values.salary <= 5000) {
        breakdownEmploymentRate.textContent = '24% (Employee 11% + Employer 13%)';
      } else {
        breakdownEmploymentRate.textContent = '23% (Employee 11% + Employer 12%)';
      }
    }
    
    const breakdownEmploymentContrib = document.getElementById('breakdownEmploymentContrib');
    if (breakdownEmploymentContrib) breakdownEmploymentContrib.textContent = `RM ${Math.round(employmentContrib).toLocaleString()}`;
    
    const breakdownVoluntaryEPF = document.getElementById('breakdownVoluntaryEPF');
    if (breakdownVoluntaryEPF) breakdownVoluntaryEPF.textContent = `RM ${values.voluntaryEPF.toLocaleString()}`;
    
    const breakdownTotalEPF = document.getElementById('breakdownTotalEPF');
    if (breakdownTotalEPF) breakdownTotalEPF.innerHTML = `<strong>RM ${Math.round(totalEPF).toLocaleString()}</strong>`;
    
    const breakdownEPFBalance = document.getElementById('breakdownEPFBalance');
    if (breakdownEPFBalance) breakdownEPFBalance.textContent = `RM ${values.epfBalance.toLocaleString()}`;
    
    const breakdownEPFRate = document.getElementById('breakdownEPFRate');
    if (breakdownEPFRate) breakdownEPFRate.textContent = `${values.epfDividendRate.toFixed(1)}% (average)`;
    
    const voluntaryLine = document.getElementById('voluntaryEPFLine');
    if (voluntaryLine) {
      if (values.voluntaryEPF > 0) {
        voluntaryLine.style.display = 'flex';
      } else {
        voluntaryLine.style.display = 'none';
      }
    }
  } else if (epfBreakdownSection) {
    epfBreakdownSection.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const instructionsHeader = document.querySelector('.instructions-header');
  if (instructionsHeader) {
    instructionsHeader.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleInstructions();
      }
    });
  }

  const breakdownHeader = document.querySelector('.breakdown-header');
  if (breakdownHeader) {
    breakdownHeader.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleCalculationBreakdown();
      }
    });
  }

  const wealthJourneyHeader = document.querySelector('.wealth-journey-header');
  if (wealthJourneyHeader) {
    wealthJourneyHeader.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleWealthJourney();
      }
    });
  }

  const steps = document.getElementById('instructionSteps');
  const toggleIcon = document.querySelector('.toggle-icon');
  steps.classList.add('collapsed');
  toggleIcon.textContent = '+';
  
  // Set initial state for breakdown section (collapsed)
  const breakdownDetails = document.getElementById('breakdownDetails');
  const breakdownToggleIcon = document.querySelector('.breakdown-toggle-icon');
  if (breakdownDetails && breakdownToggleIcon) {
    breakdownDetails.classList.add('collapsed');
    breakdownToggleIcon.textContent = '+';
  }
  
  // Set initial state for wealth journey (expanded by default)
  const wealthJourneyToggleIcon = document.querySelector('.wealth-journey-toggle-icon');
  if (wealthJourneyToggleIcon) {
    wealthJourneyToggleIcon.textContent = '−';
  }
  
  updateInputs();
  updateDisplays();
  
  setTimeout(() => {
    updateSliderPosition('returnSlider', 'returnValue');
    updateSliderPosition('yearsSlider', 'yearsValue');
    updateSliderPosition('epfDividendSlider', 'epfDividendValue');
  }, 100);
  
  const epfToggle = document.getElementById('epfToggle');
  const epfSection = document.getElementById('epfSection');
  if (epfToggle && epfToggle.checked) {
    epfSection.classList.remove('hidden');
  }
  
  const mixToggle = document.getElementById('mixToggle');
  const mixSection = document.getElementById('mixSection');
  if (mixToggle && !mixToggle.checked) {
    mixSection.classList.add('hidden');
  }
  
  if (document.getElementById('etfPercentage')) {
    updateMixDisplay();
  }
});
