let chart = null;
let values = {
  age: null,
  monthly: 1000,
  initial: 0,
  returnRate: 7,
  years: 20,
  salary: 5000,
  epfBalance: 50000,
  epfDividendRate: 5.5,
  includeEPF: true
};

function adjustValue(type, change) {
  if (type === 'age') {
    if (values[type] === null) {
      values[type] = 25; // Default starting age
    }
    values[type] = Math.max(18, Math.min(80, values[type] + change));
  } else if (type === 'salary') {
    values[type] = Math.max(1000, values[type] + change);
  } else if (type === 'epfBalance') {
    values[type] = Math.max(0, values[type] + change);
  } else {
    values[type] = Math.max(0, values[type] + change);
  }
  updateInputs();
  calculate();
}

function formatAndUpdate(type) {
  const input = document.getElementById(type + 'Input');
  
  if (type === 'age') {
    // Handle age field specially
    let value = input.value.replace(/[^\d]/g, '');
    if (value === '') {
      values[type] = null;
      input.value = '';
    } else {
      const numValue = Math.max(18, Math.min(80, parseInt(value) || 18));
      values[type] = numValue;
      input.value = numValue.toString();
    }
  } else if (type === 'salary') {
    // Remove any non-digit characters
    let value = input.value.replace(/[^\d]/g, '');
    const numValue = Math.max(1000, parseInt(value) || 1000);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
  } else {
    // Remove any non-digit characters except comma and period
    let value = input.value.replace(/[^\d]/g, '');
    
    // Convert to number
    const numValue = Math.max(0, parseInt(value) || 0);
    values[type] = numValue;
    
    // Format with commas and update display
    input.value = numValue.toLocaleString();
  }
  calculate();
}

function updateFromInput(type) {
  const input = document.getElementById(type + 'Input');
  
  if (type === 'age') {
    if (input.value === '') {
      values[type] = null;
    } else {
      const numValue = Math.max(18, Math.min(80, parseInt(input.value) || 18));
      values[type] = numValue;
      input.value = numValue.toString();
    }
  } else if (type === 'salary') {
    // Remove commas and parse
    const cleanValue = input.value.replace(/,/g, '');
    const numValue = Math.max(1000, parseInt(cleanValue) || 1000);
    values[type] = numValue;
    input.value = numValue.toLocaleString();
  } else {
    // Remove commas and parse
    const cleanValue = input.value.replace(/,/g, '');
    const numValue = Math.max(0, parseInt(cleanValue) || 0);
    values[type] = numValue;
    
    // Format with commas
    input.value = numValue.toLocaleString();
  }
  calculate();
}

function updateSlider() {
  values.returnRate = parseFloat(document.getElementById('returnSlider').value);
  values.years = parseInt(document.getElementById('yearsSlider').value);
  
  // Update EPF dividend rate if EPF section exists
  const epfSlider = document.getElementById('epfDividendSlider');
  if (epfSlider) {
    values.epfDividendRate = parseFloat(epfSlider.value);
  }
  
  updateDisplays();
  
  // Update slider positions
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
  if (values.age !== null) {
    document.getElementById('ageInput').value = values.age.toString();
  }
}

function updateDisplays() {
  // Update slider positions
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
  
  // Calculate percentage position (0 to 1)
  const percent = (value - min) / (max - min);
  
  // Use the same calculation as the working example
  const thumbWidth = 24; // Match CSS thumb size
  const sliderWidth = slider.offsetWidth;
  const thumbCenterPosition = percent * (sliderWidth - thumbWidth) + thumbWidth / 2;
  
  // Center the bubble above the thumb
  const bubbleLeft = thumbCenterPosition - (valueDiv.offsetWidth / 2);
  
  // Position the bubble
  valueDiv.style.left = `${bubbleLeft}px`;
  
  // Update display text
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
  
  values.includeEPF = epfToggle.checked;
  
  if (values.includeEPF) {
    epfSection.classList.remove('hidden');
  } else {
    epfSection.classList.add('hidden');
  }
  
  calculate();
}

function calculateEPF(salary, currentBalance, dividendRate, years) {
  // EPF contribution rates: Employee 11% + Employer 11% = 22% of salary
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
  // Hide blank state and show loading within chart container
  document.getElementById('blankState').style.display = 'none';
  document.getElementById('wealthChart').style.display = 'none';
  document.getElementById('loadingStateChart').style.display = 'flex';

  setTimeout(() => {
    const { age, monthly, initial, returnRate, years, salary, epfBalance, epfDividendRate, includeEPF } = values;
    const monthlyRate = returnRate / 100 / 12;
    const totalMonths = years * 12;
    
    // Calculate voluntary investments
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

    // Calculate EPF if included
    let epfData = null;
    let combinedDataPoints = [...investmentDataPoints];
    let finalBalance = investmentBalance;
    let totalContributed = totalInvestmentContributed;
    
    if (includeEPF) {
      epfData = calculateEPF(salary, epfBalance, epfDividendRate, years);
      
      // Combine investment and EPF data
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

    // Update equation layout - check if elements exist
    const eqTotalContributedEl = document.getElementById('eqTotalContributed');
    const eqTotalInterestEl = document.getElementById('eqTotalInterest');
    const eqFinalAmountEl = document.getElementById('eqFinalAmount');
    
    if (eqTotalContributedEl) eqTotalContributedEl.textContent = `RM ${Math.round(totalContributed).toLocaleString()}`;
    if (eqTotalInterestEl) eqTotalInterestEl.textContent = `RM ${Math.round(totalInterest).toLocaleString()}`;
    if (eqFinalAmountEl) eqFinalAmountEl.textContent = `RM ${Math.round(finalBalance).toLocaleString()}`;

    // Update chart
    updateChart(combinedDataPoints, includeEPF);

    // Update progress milestones
    updateProgressMilestones(combinedDataPoints, age);

    // Hide loading and show chart
    document.getElementById('loadingStateChart').style.display = 'none';
    document.getElementById('wealthChart').style.display = 'block';
    document.getElementById('resultsContent').classList.add('fade-in');
  }, 500);
}

function updateChart(dataPoints, includeEPF) {
  const ctx = document.getElementById('wealthChart').getContext('2d');
  
  if (chart) {
    chart.destroy();
  }

  // Create labels based on whether age is provided
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

  // Add EPF breakdown if EPF is included
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
    // Show contributions for comparison when EPF is disabled
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

function updateProgressMilestones(dataPoints, age) {
  const progressContainer = document.getElementById('progressContainer');
  
  // Clear existing progress items
  progressContainer.innerHTML = '';
  
  // Create new progress items based on data
  const milestones = [];
  
  // Add milestone for every 5 years, plus the final year
  for (let i = 0; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    if (point.year % 5 === 0 || i === dataPoints.length - 1) {
      milestones.push(point);
    }
  }
  
  // Limit to 3-4 most significant milestones
  const selectedMilestones = [];
  if (milestones.length > 0) selectedMilestones.push(milestones[0]); // First milestone
  if (milestones.length > 2) {
    const midIndex = Math.floor(milestones.length / 2);
    selectedMilestones.push(milestones[midIndex]); // Middle milestone
  }
  if (milestones.length > 1) selectedMilestones.push(milestones[milestones.length - 1]); // Final milestone
  
  selectedMilestones.forEach((milestone, index) => {
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    
    const yearText = age !== null ? 
      `Year ${milestone.year} (Age ${milestone.age})` : 
      `Year ${milestone.year}`;
    
    let description;
    if (index === 0) {
      description = 'First milestone reached';
    } else if (index === selectedMilestones.length - 1) {
      description = milestone.balance >= 500000 ? 'Retirement ready' : 'Investment goal achieved';
    } else {
      description = milestone.balance >= 100000 ? 'Six figures achieved!' : 'Building wealth steadily';
    }
    
    // Check if EPF is included to show breakdown
    const includeEPF = values.includeEPF && milestone.epfBalance;
    
    let breakdownHtml = '';
    if (includeEPF) {
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

// Toggle Instructions Function
function toggleInstructions() {
  const steps = document.getElementById('instructionSteps');
  const toggleIcon = document.querySelector('.toggle-icon');
  
  steps.classList.toggle('collapsed');
  toggleIcon.classList.toggle('rotated');
  
  // Update toggle icon
  if (steps.classList.contains('collapsed')) {
    toggleIcon.textContent = '+';
  } else {
    toggleIcon.textContent = '−';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Set instructions closed by default
  const steps = document.getElementById('instructionSteps');
  const toggleIcon = document.querySelector('.toggle-icon');
  steps.classList.add('collapsed');
  toggleIcon.textContent = '+';
  
  updateInputs();
  updateDisplays();
  
  // Initialize slider positions
  setTimeout(() => {
    updateSliderPosition('returnSlider', 'returnValue');
    updateSliderPosition('yearsSlider', 'yearsValue');
    updateSliderPosition('epfDividendSlider', 'epfDividendValue');
  }, 100);
  
  // Initialize EPF toggle state
  const epfToggle = document.getElementById('epfToggle');
  const epfSection = document.getElementById('epfSection');
  if (epfToggle && epfToggle.checked) {
    epfSection.classList.remove('hidden');
  }
  
  // Don't calculate on load - let blank state show
});