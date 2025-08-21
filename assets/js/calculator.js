let chart = null;
let values = {
  age: null,
  monthly: 1000,
  initial: 0,
  returnRate: 7,
  years: 20
};

function adjustValue(type, change) {
  if (type === 'age') {
    if (values[type] === null) {
      values[type] = 25; // Default starting age
    }
    values[type] = Math.max(18, Math.min(80, values[type] + change));
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
  updateDisplays();
  
  // Update slider positions
  updateSliderPosition('returnSlider', 'returnValue');
  updateSliderPosition('yearsSlider', 'yearsValue');
  
  calculate();
}

function updateInputs() {
  document.getElementById('monthlyInput').value = values.monthly.toLocaleString();
  document.getElementById('initialInput').value = values.initial.toLocaleString();
  if (values.age !== null) {
    document.getElementById('ageInput').value = values.age.toString();
  }
}

function updateDisplays() {
  // Update slider positions
  updateSliderPosition('returnSlider', 'returnValue');
  updateSliderPosition('yearsSlider', 'yearsValue');
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
  }
}

function calculate() {
  // Hide blank state and show loading within chart container
  document.getElementById('blankState').style.display = 'none';
  document.getElementById('wealthChart').style.display = 'none';
  document.getElementById('loadingStateChart').style.display = 'flex';

  setTimeout(() => {
    const { age, monthly, initial, returnRate, years } = values;
    const monthlyRate = returnRate / 100 / 12;
    const totalMonths = years * 12;
    
    let balance = initial;
    let totalContributed = initial;
    const dataPoints = [];

    // Calculate compound growth
    for (let month = 1; month <= totalMonths; month++) {
      balance = balance * (1 + monthlyRate) + monthly;
      totalContributed += monthly;

      if (month % 12 === 0) {
        const currentYear = month / 12;
        const currentAge = age !== null ? age + currentYear : null;
        
        dataPoints.push({
          year: currentYear,
          age: currentAge,
          balance: balance,
          contributed: totalContributed
        });
      }
    }

    const totalInterest = balance - totalContributed;

    // Update equation layout - check if elements exist
    const eqTotalContributedEl = document.getElementById('eqTotalContributed');
    const eqTotalInterestEl = document.getElementById('eqTotalInterest');
    const eqFinalAmountEl = document.getElementById('eqFinalAmount');
    
    if (eqTotalContributedEl) eqTotalContributedEl.textContent = `RM ${Math.round(totalContributed).toLocaleString()}`;
    if (eqTotalInterestEl) eqTotalInterestEl.textContent = `RM ${Math.round(totalInterest).toLocaleString()}`;
    if (eqFinalAmountEl) eqFinalAmountEl.textContent = `RM ${Math.round(balance).toLocaleString()}`;

    // Update chart
    updateChart(dataPoints);

    // Update progress milestones
    updateProgressMilestones(dataPoints, age);

    // Hide loading and show chart
    document.getElementById('loadingStateChart').style.display = 'none';
    document.getElementById('wealthChart').style.display = 'block';
    document.getElementById('resultsContent').classList.add('fade-in');
  }, 500);
}

function updateChart(dataPoints) {
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

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Wealth',
          data: dataPoints.map(point => point.balance),
          borderColor: '#FF6B9D',
          backgroundColor: 'rgba(255, 107, 157, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Contributions',
          data: dataPoints.map(point => point.contributed),
          borderColor: '#4ECDC4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4
        }
      ]
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
    
    progressItem.innerHTML = `
      <div class="progress-info">
        <div class="progress-year">${yearText}</div>
        <span>${description}</span>
      </div>
      <div class="progress-amount">RM ${Math.round(milestone.balance).toLocaleString()}</div>
    `;
    
    progressContainer.appendChild(progressItem);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  updateInputs();
  updateDisplays();
  
  // Initialize slider positions
  setTimeout(() => {
    updateSliderPosition('returnSlider', 'returnValue');
    updateSliderPosition('yearsSlider', 'yearsValue');
  }, 100);
  
  // Don't calculate on load - let blank state show
});