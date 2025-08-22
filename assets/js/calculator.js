let chart = null;
let detailedChart = null;
let values = {
  age: null,
  monthly: 1000,
  initial: 0,
  returnRate: 7,
  years: 20,
  salary: 5000,
  epfBalance: 50000,
  epfDividendRate: 5.5,
  includeEPF: true,
  useMix: false,
  mixAllocations: {
    etf: 40,
    unitTrust: 30,
    fd: 20,
    stocks: 10
  },
  mixReturns: {
    etf: 7.0,
    unitTrust: 6.0,
    fd: 3.5,
    stocks: 10.0
  },
  mixEnabled: {
    etf: true,
    unitTrust: true,
    fd: true,
    stocks: true
  },
  showDetailed: false
};

// Dashboard Functions
function formatQuickInput(type) {
  const input = document.getElementById('quick' + type.charAt(0).toUpperCase() + type.slice(1) + 'Input');
  
  if (type === 'monthly' || type === 'salary') {
    let value = input.value.replace(/[^\d]/g, '');
    const numValue = Math.max(type === 'salary' ? 1000 : 0, parseInt(value) || 0);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
  }
  
  calculateQuick();
}

function updateFromQuickInput(type) {
  const input = document.getElementById('quick' + type.charAt(0).toUpperCase() + type.slice(1) + 'Input');
  
  if (type === 'age') {
    if (input.value === '') {
      values[type] = null;
    } else {
      const numValue = Math.max(18, Math.min(80, parseInt(input.value) || 18));
      values[type] = numValue;
      input.value = numValue.toString();
    }
  } else if (type === 'monthly' || type === 'salary') {
    const cleanValue = input.value.replace(/,/g, '');
    const numValue = Math.max(type === 'salary' ? 1000 : 0, parseInt(cleanValue) || 0);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
  }
  
  calculateQuick();
}

function updateQuickSlider() {
  const returnSlider = document.getElementById('quickReturnSlider');
  const yearsSlider = document.getElementById('quickYearsSlider');
  
  if (!values.useMix && returnSlider) {
    values.returnRate = parseFloat(returnSlider.value);
  }
  
  if (yearsSlider) {
    values.years = parseInt(yearsSlider.value);
  }
  
  updateQuickSliderPositions();
  calculateQuick();
}

function updateQuickSliderPositions() {
  updateQuickSliderPosition('quickReturnSlider', 'quickReturnValue');
  updateQuickSliderPosition('quickYearsSlider', 'quickYearsValue');
}

function updateQuickSliderPosition(sliderId, valueId) {
  const slider = document.getElementById(sliderId);
  const valueDiv = document.getElementById(valueId);
  if (!slider || !valueDiv) return;
  
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const value = parseFloat(slider.value);
  
  const percent = (value - min) / (max - min);
  const sliderWidth = slider.offsetWidth;
  const thumbWidth = 20;
  const thumbCenterPosition = percent * (sliderWidth - thumbWidth) + thumbWidth / 2;
  const bubbleLeft = thumbCenterPosition - (valueDiv.offsetWidth / 2);
  
  valueDiv.style.left = `${bubbleLeft}px`;
  
  if (sliderId === 'quickReturnSlider') {
    valueDiv.textContent = value.toFixed(1) + '%';
  } else if (sliderId === 'quickYearsSlider') {
    valueDiv.textContent = value + ' Years';
  }
}

function toggleAdvancedMix() {
  const checkbox = document.getElementById('advancedMixToggle');
  const mixSection = document.getElementById('dashboardMixSection');
  const returnSlider = document.getElementById('quickReturnSlider');
  
  values.useMix = checkbox.checked;
  
  if (values.useMix) {
    mixSection.classList.remove('hidden');
    returnSlider.disabled = true;
    returnSlider.style.opacity = '0.5';
    updateDashboardMixDisplay();
    calculateDashboardBlendedReturn();
  } else {
    mixSection.classList.add('hidden');
    returnSlider.disabled = false;
    returnSlider.style.opacity = '1';
    values.returnRate = parseFloat(returnSlider.value);
  }
  
  calculateQuick();
}

function toggleAdvancedEpf() {
  const checkbox = document.getElementById('advancedEpfToggle');
  const epfSetup = document.getElementById('quickEpfSetup');
  const controls = document.getElementById('advancedControls');
  
  values.includeEPF = checkbox.checked;
  
  if (values.includeEPF) {
    epfSetup.style.display = 'block';
    controls.classList.remove('hidden');
  } else {
    epfSetup.style.display = 'none';
    if (!document.getElementById('advancedAgeToggle').checked) {
      controls.classList.add('hidden');
    }
  }
  
  calculateQuick();
}

function toggleAdvancedAge() {
  const checkbox = document.getElementById('advancedAgeToggle');
  const ageSetup = document.getElementById('quickAgeSetup');
  const controls = document.getElementById('advancedControls');
  
  if (checkbox.checked) {
    ageSetup.classList.remove('hidden');
    controls.classList.remove('hidden');
  } else {
    ageSetup.classList.add('hidden');
    values.age = null;
    document.getElementById('quickAgeInput').value = '';
    if (!document.getElementById('advancedEpfToggle').checked) {
      controls.classList.add('hidden');
    }
  }
  
  calculateQuick();
}

function toggleDetailedView() {
  const detailedResults = document.getElementById('detailedResults');
  const btnText = document.getElementById('detailsBtnText');
  
  values.showDetailed = !values.showDetailed;
  
  if (values.showDetailed) {
    detailedResults.classList.remove('hidden');
    btnText.textContent = 'Hide Detailed Breakdown';
    calculate();
  } else {
    detailedResults.classList.add('hidden');
    btnText.textContent = 'View Detailed Breakdown';
  }
}

function calculateQuick() {
  const { monthly, returnRate, years, includeEPF, salary, epfBalance, epfDividendRate } = values;
  
  const monthlyRate = returnRate / 100 / 12;
  const totalMonths = years * 12;
  
  let investmentBalance = 0;
  let totalInvestmentContributed = 0;
  
  for (let month = 1; month <= totalMonths; month++) {
    investmentBalance = investmentBalance * (1 + monthlyRate) + monthly;
    totalInvestmentContributed += monthly;
  }
  
  let epfFinalBalance = 0;
  let epfTotalContributed = 0;
  
  if (includeEPF) {
    const monthlyEpfContribution = salary * 0.22;
    const epfMonthlyRate = epfDividendRate / 100 / 12;
    
    let epfBalance_calc = epfBalance;
    for (let month = 1; month <= totalMonths; month++) {
      epfBalance_calc = epfBalance_calc * (1 + epfMonthlyRate) + monthlyEpfContribution;
    }
    
    epfFinalBalance = epfBalance_calc;
    epfTotalContributed = epfBalance + (monthlyEpfContribution * totalMonths);
  }
  
  const finalBalance = investmentBalance + epfFinalBalance;
  const totalContributed = totalInvestmentContributed + epfTotalContributed;
  const totalInterest = finalBalance - totalContributed;
  
  updatePreviewDisplay(finalBalance, totalContributed, totalInterest, years);
}

function updatePreviewDisplay(finalBalance, totalContributed, totalInterest, years) {
  const previewBlank = document.getElementById('previewBlankState');
  const previewResults = document.getElementById('previewResults');
  
  previewBlank.style.display = 'none';
  previewResults.classList.remove('hidden');
  
  document.getElementById('previewFinalAmount').textContent = `RM ${Math.round(finalBalance).toLocaleString()}`;
  document.getElementById('previewPeriodText').textContent = `after ${years} years`;
  document.getElementById('previewInvested').textContent = `RM ${Math.round(totalContributed).toLocaleString()}`;
  document.getElementById('previewInterest').textContent = `RM ${Math.round(totalInterest).toLocaleString()}`;
}

function toggleDashboardInvestmentType(type) {
  const checkbox = document.getElementById('dashboard' + type.charAt(0).toUpperCase() + type.slice(1) + 'Enabled');
  const config = document.getElementById('dashboard' + type.charAt(0).toUpperCase() + type.slice(1) + 'Config');
  
  values.mixEnabled[type] = checkbox.checked;
  
  if (checkbox.checked) {
    config.classList.remove('disabled');
  } else {
    config.classList.add('disabled');
    values.mixAllocations[type] = 0;
    document.getElementById('dashboard' + type.charAt(0).toUpperCase() + type.slice(1) + 'Slider').value = 0;
  }
  
  updateDashboardMixDisplay();
  calculateDashboardBlendedReturn();
  calculateQuick();
}

function updateDashboardMixReturn(type) {
  const sliderId = 'dashboard' + type.charAt(0).toUpperCase() + type.slice(1) + 'ReturnSlider';
  const rateId = 'dashboard' + type.charAt(0).toUpperCase() + type.slice(1) + 'ReturnRate';
  
  const slider = document.getElementById(sliderId);
  const rateDisplay = document.getElementById(rateId);
  
  if (slider && rateDisplay) {
    const newRate = parseFloat(slider.value);
    values.mixReturns[type] = newRate;
    rateDisplay.textContent = newRate.toFixed(1) + '%';
    
    if (values.useMix) {
      calculateDashboardBlendedReturn();
      calculateQuick();
    }
  }
}

function updateDashboardMix() {
  values.mixAllocations.etf = parseInt(document.getElementById('dashboardEtfSlider').value);
  values.mixAllocations.unitTrust = parseInt(document.getElementById('dashboardUnitTrustSlider').value);
  values.mixAllocations.fd = parseInt(document.getElementById('dashboardFdSlider').value);
  values.mixAllocations.stocks = parseInt(document.getElementById('dashboardStocksSlider').value);
  
  updateDashboardMixDisplay();
  calculateDashboardBlendedReturn();
  calculateQuick();
}

function updateDashboardMixDisplay() {
  document.getElementById('dashboardEtfPercentage').textContent = values.mixAllocations.etf + '%';
  document.getElementById('dashboardUnitTrustPercentage').textContent = values.mixAllocations.unitTrust + '%';
  document.getElementById('dashboardFdPercentage').textContent = values.mixAllocations.fd + '%';
  document.getElementById('dashboardStocksPercentage').textContent = values.mixAllocations.stocks + '%';
  
  document.getElementById('dashboardEtfReturnRate').textContent = values.mixReturns.etf.toFixed(1) + '%';
  document.getElementById('dashboardUnitTrustReturnRate').textContent = values.mixReturns.unitTrust.toFixed(1) + '%';
  document.getElementById('dashboardFdReturnRate').textContent = values.mixReturns.fd.toFixed(1) + '%';
  document.getElementById('dashboardStocksReturnRate').textContent = values.mixReturns.stocks.toFixed(1) + '%';
  
  document.getElementById('dashboardEtfReturnSlider').value = values.mixReturns.etf;
  document.getElementById('dashboardUnitTrustReturnSlider').value = values.mixReturns.unitTrust;
  document.getElementById('dashboardFdReturnSlider').value = values.mixReturns.fd;
  document.getElementById('dashboardStocksReturnSlider').value = values.mixReturns.stocks;
  
  const total = values.mixAllocations.etf + values.mixAllocations.unitTrust + 
                values.mixAllocations.fd + values.mixAllocations.stocks;
  
  document.getElementById('dashboardTotalPercentage').textContent = total + '%';
  
  const statusEl = document.getElementById('dashboardAllocationStatus');
  if (total === 100) {
    statusEl.textContent = '✓ Balanced';
    statusEl.className = 'allocation-status balanced';
  } else if (total < 100) {
    statusEl.textContent = `⚠ ${100 - total}% unallocated`;
    statusEl.className = 'allocation-status warning';
  } else {
    statusEl.textContent = `⚠ ${total - 100}% over-allocated`;
    statusEl.className = 'allocation-status warning';
  }
}

function calculateDashboardBlendedReturn() {
  if (!values.useMix) return;
  
  const { etf, unitTrust, fd, stocks } = values.mixAllocations;
  const returns = values.mixReturns;
  const enabled = values.mixEnabled;
  
  let totalAllocation = 0;
  let weightedReturn = 0;
  
  if (enabled.etf && etf > 0) {
    totalAllocation += etf;
    weightedReturn += (etf / 100) * returns.etf;
  }
  if (enabled.unitTrust && unitTrust > 0) {
    totalAllocation += unitTrust;
    weightedReturn += (unitTrust / 100) * returns.unitTrust;
  }
  if (enabled.fd && fd > 0) {
    totalAllocation += fd;
    weightedReturn += (fd / 100) * returns.fd;
  }
  if (enabled.stocks && stocks > 0) {
    totalAllocation += stocks;
    weightedReturn += (stocks / 100) * returns.stocks;
  }
  
  if (totalAllocation === 0) {
    values.returnRate = 0;
  } else {
    values.returnRate = weightedReturn;
  }
  
  document.getElementById('dashboardBlendedRate').textContent = values.returnRate.toFixed(1) + '%';
}

function calculateEPF(salary, currentBalance, dividendRate, years) {
  const monthlyContribution = salary * 0.22;
  const monthlyRate = dividendRate / 100 / 12;
  const totalMonths = years * 12;
  
  let balance = currentBalance;
  const dataPoints = [];
  
  for (let month = 1; month <= totalMonths; month++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    
    if (month % 12 === 0) {
      const currentYear = month / 12;
      dataPoints.push({
        year: currentYear,
        balance: balance,
        contributed: currentBalance + (monthlyContribution * month)
      });
    }
  }
  
  return {
    finalBalance: balance,
    totalContributed: currentBalance + (monthlyContribution * totalMonths),
    dataPoints: dataPoints
  };
}

function calculate() {
  if (values.showDetailed) {
    document.getElementById('detailedLoadingStateChart').style.display = 'flex';
    document.getElementById('detailedWealthChart').style.display = 'none';
  }

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
      epfData = calculateEPF(salary, epfBalance, epfDividendRate, years);
      
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

    const totalInterest = finalBalance - totalContributed;

    if (values.showDetailed) {
      const eqTotalContributedEl = document.getElementById('detailedTotalContributed');
      const eqTotalInterestEl = document.getElementById('detailedTotalInterest');
      const eqFinalAmountEl = document.getElementById('detailedFinalAmount');
      
      if (eqTotalContributedEl) eqTotalContributedEl.textContent = `RM ${Math.round(totalContributed).toLocaleString()}`;
      if (eqTotalInterestEl) eqTotalInterestEl.textContent = `RM ${Math.round(totalInterest).toLocaleString()}`;
      if (eqFinalAmountEl) eqFinalAmountEl.textContent = `RM ${Math.round(finalBalance).toLocaleString()}`;

      updateChart(combinedDataPoints, includeEPF);
      updateProgressMilestones(combinedDataPoints, age, 'detailedProgressContainer');

      document.getElementById('detailedLoadingStateChart').style.display = 'none';
      document.getElementById('detailedWealthChart').style.display = 'block';
    }

    updatePreviewDisplay(finalBalance, totalContributed, totalInterest, years);
  }, 500);
}

function updateChart(dataPoints, includeEPF) {
  const ctx = document.getElementById('detailedWealthChart').getContext('2d');
  
  if (detailedChart) {
    detailedChart.destroy();
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
      borderColor: '#FF6B9D',
      backgroundColor: 'rgba(255, 107, 157, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4
    }
  ];

  if (includeEPF) {
    datasets.push({
      label: 'EPF Balance',
      data: dataPoints.map(point => point.epfBalance || 0),
      borderColor: '#4ECDC4',
      backgroundColor: 'rgba(78, 205, 196, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    });
    
    datasets.push({
      label: 'Investment Balance',
      data: dataPoints.map(point => point.investmentBalance || 0),
      borderColor: '#00FFD1',
      backgroundColor: 'rgba(0, 255, 209, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    });
  } else {
    datasets.push({
      label: 'Contributions',
      data: dataPoints.map(point => point.contributed),
      borderColor: '#4ECDC4',
      backgroundColor: 'rgba(78, 205, 196, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    });
  }

  detailedChart = new Chart(ctx, {
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
            }
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

function updateProgressMilestones(dataPoints, age, containerId = 'progressContainer') {
  const progressContainer = document.getElementById(containerId);
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
    
    const yearText = age !== null ? 
      `Year ${milestone.year} (Age ${milestone.age})` : 
      `Year ${milestone.year}`;
    
    let description;
    if (index === 0) {
      description = values.useMix ? 'Portfolio milestone reached' : 'First milestone reached';
    } else if (index === selectedMilestones.length - 1) {
      if (milestone.balance >= 1000000) {
        description = 'Millionaire status achieved! 🎉';
      } else if (milestone.balance >= 500000) {
        description = values.includeEPF ? 'Retirement ready with EPF' : 'Retirement ready';
      } else {
        description = values.useMix ? 'Portfolio goal achieved' : 'Investment goal achieved';
      }
    } else {
      if (milestone.balance >= 100000) {
        description = values.useMix ? 'Six figures with diversified portfolio' : 'Six figures achieved!';
      } else {
        description = values.useMix ? 'Building diversified wealth' : 'Building wealth steadily';
      }
    }
    
    const includeEPF = values.includeEPF && milestone.epfBalance;
    const useMix = values.useMix;
    
    let breakdownHtml = '';
    if (includeEPF && useMix) {
      const investmentAmount = milestone.investmentBalance || 0;
      const epfAmount = milestone.epfBalance || 0;
      
      breakdownHtml = `
        <div class="progress-breakdown">
          <div class="breakdown-item investment">
            <span class="breakdown-label">Investment Mix:</span>
            <span class="breakdown-amount">RM ${Math.round(investmentAmount).toLocaleString()}</span>
          </div>
          <div class="breakdown-item epf">
            <span class="breakdown-label">EPF Balance:</span>
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
            <span class="breakdown-label">Personal Investment:</span>
            <span class="breakdown-amount">RM ${Math.round(investmentAmount).toLocaleString()}</span>
          </div>
          <div class="breakdown-item epf">
            <span class="breakdown-label">EPF Balance:</span>
            <span class="breakdown-amount">RM ${Math.round(epfAmount).toLocaleString()}</span>
          </div>
        </div>
      `;
    } else if (useMix) {
      const totalInvestment = milestone.balance;
      let mixBreakdown = '';
      
      if (values.mixEnabled.etf && values.mixAllocations.etf > 0) {
        const etfAmount = totalInvestment * (values.mixAllocations.etf / 100);
        mixBreakdown += `
          <div class="breakdown-item mix-etf">
            <span class="breakdown-label">ETFs (${values.mixAllocations.etf}%):</span>
            <span class="breakdown-amount">RM ${Math.round(etfAmount).toLocaleString()}</span>
          </div>
        `;
      }
      
      if (values.mixEnabled.unitTrust && values.mixAllocations.unitTrust > 0) {
        const utAmount = totalInvestment * (values.mixAllocations.unitTrust / 100);
        mixBreakdown += `
          <div class="breakdown-item mix-ut">
            <span class="breakdown-label">Unit Trusts (${values.mixAllocations.unitTrust}%):</span>
            <span class="breakdown-amount">RM ${Math.round(utAmount).toLocaleString()}</span>
          </div>
        `;
      }
      
      if (values.mixEnabled.fd && values.mixAllocations.fd > 0) {
        const fdAmount = totalInvestment * (values.mixAllocations.fd / 100);
        mixBreakdown += `
          <div class="breakdown-item mix-fd">
            <span class="breakdown-label">Fixed Deposit (${values.mixAllocations.fd}%):</span>
            <span class="breakdown-amount">RM ${Math.round(fdAmount).toLocaleString()}</span>
          </div>
        `;
      }
      
      if (values.mixEnabled.stocks && values.mixAllocations.stocks > 0) {
        const stocksAmount = totalInvestment * (values.mixAllocations.stocks / 100);
        mixBreakdown += `
          <div class="breakdown-item mix-stocks">
            <span class="breakdown-label">Individual Stocks (${values.mixAllocations.stocks}%):</span>
            <span class="breakdown-amount">RM ${Math.round(stocksAmount).toLocaleString()}</span>
          </div>
        `;
      }
      
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
  
  steps.classList.toggle('collapsed');
  toggleIcon.classList.toggle('rotated');
  
  if (steps.classList.contains('collapsed')) {
    toggleIcon.textContent = '+';
  } else {
    toggleIcon.textContent = '−';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const steps = document.getElementById('instructionSteps');
  const toggleIcon = document.querySelector('.toggle-icon');
  if (steps && toggleIcon) {
    steps.classList.add('collapsed');
    toggleIcon.textContent = '+';
  }
  
  setTimeout(() => {
    updateQuickSliderPositions();
  }, 100);
  
  setTimeout(() => {
    if (document.getElementById('dashboardEtfPercentage')) {
      updateDashboardMixDisplay();
    }
  }, 100);
  
  calculateQuick();
});