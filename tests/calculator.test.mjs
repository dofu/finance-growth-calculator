// Unit tests for assets/js/calculator.js. Run with: node --test tests/*.test.mjs
// The script is loaded into a sandbox with a minimal fake DOM, so no browser
// or npm packages are needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SOURCE = readFileSync(new URL('../assets/js/calculator.js', import.meta.url), 'utf8');

function fakeElement(id) {
  const classes = new Set();
  return {
    id, value: '', textContent: '', innerHTML: '', checked: false, disabled: false,
    min: '0', max: '100', offsetWidth: 300, style: {}, attributes: {},
    classList: {
      add: c => classes.add(c), remove: c => classes.delete(c),
      toggle: c => (classes.has(c) ? classes.delete(c) : classes.add(c)),
      contains: c => classes.has(c),
    },
    setAttribute(k, v) { this.attributes[k] = v; },
    addEventListener() {},
    appendChild(child) { (this.children ||= []).push(child); },
    getContext: () => ({}),
    querySelectorAll: () => [],
  };
}

// Loads a fresh copy of the script. `missing` lists element ids that do not
// exist on the page.
function load({ missing = [] } = {}) {
  const els = new Map();
  const get = id => {
    if (missing.includes(id)) return null;
    if (!els.has(id)) els.set(id, fakeElement(id));
    return els.get(id);
  };
  const charts = [];
  const context = {
    console,
    document: {
      getElementById: get,
      querySelector: sel => get('qs:' + sel),
      createElement: tag => fakeElement('new:' + tag),
      addEventListener() {},
      head: { appendChild() {} },
    },
    setTimeout: fn => fn(), // run the delayed calculation at once
    Chart: class { constructor(ctx, config) { this.config = config; charts.push(this); } destroy() {} },
  };
  vm.createContext(context);
  vm.runInContext(SOURCE + `
    ;globalThis.__api = { get values() { return values; }, adjustValue, formatAndUpdate,
      updateFromInput, calculateEPF, calculateBlendedReturn, calculate, updateMix, toggleInvestmentType };`, context);
  return { api: context.__api, el: get, charts };
}

const rm = n => `RM ${Math.round(n).toLocaleString()}`;
const num = s => Number(String(s).replace(/[^\d-]/g, ''));
// The figure "If every year paid exactly the average" from the summary
const averageShown = el => el('summaryRange').textContent.match(/exactly the average: (RM [\d,]+)/)[1];
const rangeShown = el => el('summaryRange').textContent.match(/between (RM [\d,]+) and (RM [\d,]+)/).slice(1).map(num);

// Future value of a starting sum plus a fixed deposit at the end of each month.
function futureValue(start, monthly, annualRatePct, years) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return start + monthly * n;
  return start * (1 + r) ** n + monthly * (((1 + r) ** n - 1) / r);
}

// EPF contribution rates

test('EPF uses 24% for a salary of RM 5,000 or less', () => {
  const { api } = load();
  for (const salary of [1000, 3500, 5000]) {
    const r = api.calculateEPF(salary, 0, 0, 5.5, 1);
    assert.equal(r.employmentRate, 0.24, `salary ${salary}`);
    assert.equal(r.monthlyEmploymentContribution, salary * 0.24);
  }
});

test('EPF uses 23% for a salary above RM 5,000', () => {
  const { api } = load();
  for (const salary of [5001, 8000, 20000]) {
    assert.equal(api.calculateEPF(salary, 0, 0, 5.5, 1).employmentRate, 0.23, `salary ${salary}`);
  }
});

test('EPF adds voluntary contributions on top of the employment share', () => {
  const { api } = load();
  const r = api.calculateEPF(5000, 0, 300, 5.5, 1);
  assert.equal(r.totalMonthlyContribution, 1200 + 300);
});

test('EPF balance matches the compound growth formula', () => {
  const { api } = load();
  const r = api.calculateEPF(5000, 50000, 0, 5.5, 20);
  assert.ok(Math.abs(r.finalBalance - futureValue(50000, 1200, 5.5, 20)) < 0.01);
  assert.equal(r.totalContributed, 50000 + 1200 * 240);
  assert.equal(r.dataPoints.length, 20);
  assert.equal(r.dataPoints.at(-1).balance, r.finalBalance);
});

test('EPF at 0% dividend only adds contributions', () => {
  const { api } = load();
  const r = api.calculateEPF(4000, 10000, 0, 0, 2);
  assert.equal(r.finalBalance, 10000 + 960 * 24);
});

// Blended return for the investment mix

test('blended return weights each enabled asset by its allocation', () => {
  const { api } = load();
  api.values.useMix = true;
  api.calculateBlendedReturn();
  // 40% x 7 + 30% x 6 + 20% x 3.5 + 10% x 10
  assert.ok(Math.abs(api.values.returnRate - 6.3) < 1e-9);
});

const shares = api => Object.values(api.values.mixAllocations).reduce((a, b) => a + b, 0);

test('moving one share adjusts the others so the mix stays at 100%', () => {
  const { api, el } = load();
  api.values.useMix = true;
  el('etfSlider').value = '70';
  api.updateMix('etf');
  assert.equal(api.values.mixAllocations.etf, 70);
  assert.equal(shares(api), 100);
  // the others keep their order (30 : 20 : 10)
  const { unitTrust, fd, stocks } = api.values.mixAllocations;
  assert.ok(unitTrust >= fd && fd >= stocks, `${unitTrust} ${fd} ${stocks}`);
});

test('one investment at 100% leaves no share for the rest and no inflated return', () => {
  const { api, el } = load();
  api.values.useMix = true;
  el('etfSlider').value = '100';
  api.updateMix('etf');
  assert.equal(shares(api), 100);
  assert.equal(api.values.returnRate, 7);
});

test('unticking an investment hands its share to the others', () => {
  const { api, el } = load();
  api.values.useMix = true;
  el('stocksEnabled').checked = false;
  api.toggleInvestmentType('stocks');
  assert.equal(api.values.mixAllocations.stocks, 0);
  assert.equal(shares(api), 100);
});

test('the last ticked investment cannot be unticked', () => {
  const { api, el } = load();
  for (const k of ['unitTrust', 'fd', 'stocks']) { el(k + 'Enabled').checked = false; api.toggleInvestmentType(k); }
  el('etfEnabled').checked = false;
  api.toggleInvestmentType('etf');
  assert.equal(api.values.mixEnabled.etf, true);
  assert.equal(api.values.mixAllocations.etf, 100);
});

test('ASB and REITs start unticked with sourced default rates', () => {
  const { api } = load();
  assert.equal(api.values.mixEnabled.asb, false);
  assert.equal(api.values.mixEnabled.reits, false);
  assert.equal(api.values.mixReturns.asb, 5.75);
  assert.equal(api.values.mixReturns.reits, 5.5);
});

test('blended return is 0 when nothing is allocated', () => {
  const { api } = load();
  api.values.useMix = true;
  Object.keys(api.values.mixAllocations).forEach(k => { api.values.mixAllocations[k] = 0; });
  api.calculateBlendedReturn();
  assert.equal(api.values.returnRate, 0);
});

test('blended return does nothing when the mix is off', () => {
  const { api } = load();
  api.values.returnRate = 9;
  api.calculateBlendedReturn();
  assert.equal(api.values.returnRate, 9);
});

// Stepper buttons

test('age stepper starts at 25 and stays between 1 and 100', () => {
  const { api } = load();
  api.adjustValue('age', 1);
  assert.equal(api.values.age, 26);
  api.adjustValue('age', 500);
  assert.equal(api.values.age, 100);
  api.adjustValue('age', -500);
  assert.equal(api.values.age, 1);
});

test('salary stepper never goes below RM 1,000', () => {
  const { api } = load();
  api.adjustValue('salary', -100000);
  assert.equal(api.values.salary, 1000);
});

test('money steppers never go below 0', () => {
  const { api } = load();
  for (const type of ['monthly', 'initial', 'epfBalance', 'voluntaryEPF']) {
    api.adjustValue(type, -1e9);
    assert.equal(api.values[type], 0, type);
  }
});

// Typed input

test('typed amounts drop non-digits and show thousands separators', () => {
  const { api, el } = load();
  el('monthlyInput').value = 'RM 2,500';
  api.formatAndUpdate('monthly');
  assert.equal(api.values.monthly, 2500);
  assert.equal(el('monthlyInput').value, (2500).toLocaleString());
});

test('clearing the age field makes age empty again', () => {
  const { api, el } = load();
  el('ageInput').value = '';
  api.formatAndUpdate('age');
  assert.equal(api.values.age, null);
});

test('a salary can be typed one digit at a time', () => {
  const { api, el } = load();
  const input = el('salaryInput');
  input.value = '';
  for (const ch of '6500') {
    input.value += ch;
    api.formatAndUpdate('salary');
  }
  assert.equal(api.values.salary, 6500);
  assert.equal(input.value, (6500).toLocaleString());
});

test('a salary below RM 1,000 is raised to the minimum when the field is left', () => {
  const { api, el } = load();
  el('salaryInput').value = '800';
  api.formatAndUpdate('salary');
  assert.equal(api.values.salary, 5000); // unchanged while typing
  api.updateFromInput('salary');
  assert.equal(api.values.salary, 1000);
});

// Full calculation and what the page shows

test('the average line equals investments plus EPF at fixed rates (default inputs)', () => {
  const { api, el } = load();
  api.calculate();
  const invest = futureValue(0, 1000, 7, 20);
  const epf = futureValue(50000, 1200, 5.5, 20);
  assert.equal(averageShown(el), rm(invest + epf));
  assert.equal(averageShown(el), 'RM 1,193,511');
  assert.equal(el('partInvest').textContent, rm(1000 * 240));
  assert.equal(el('partEpf').textContent, rm(50000 + 1200 * 240));
});

test('without EPF only the investment is counted', () => {
  const { api, el } = load();
  api.values.includeEPF = false;
  api.calculate();
  assert.equal(averageShown(el), rm(futureValue(0, 1000, 7, 20)));
  assert.equal(el('partInvest').textContent, rm(240000));
  assert.equal(el('partEpfRow').hidden, true);
});

test('investments, EPF and growth add up to final wealth', () => {
  const { api, el } = load();
  Object.assign(api.values, { monthly: 750, initial: 20000, returnRate: 8.2, years: 33, salary: 7200, voluntaryEPF: 150 });
  api.calculate();
  const diff = num(el('partInvest').textContent) + num(el('partEpf').textContent) + num(el('eqTotalInterest').textContent) - num(el('eqFinalAmount').textContent);
  assert.ok(Math.abs(diff) <= 1, `rounding gap ${diff}`);
});

test('chart has one point per year and three lines with EPF on', () => {
  const { api, charts } = load();
  api.values.years = 12;
  api.calculate();
  const { data } = charts.at(-1).config;
  assert.equal(data.labels.length, 12);
  assert.deepEqual([...data.datasets.map(d => d.label)], ['Total Wealth', 'Likely range', 'range-low', 'EPF Balance', 'Investment Balance']);
});

test('chart labels show age when age is set', () => {
  const { api, charts } = load();
  api.values.age = 30;
  api.values.years = 5;
  api.calculate();
  assert.equal(charts.at(-1).config.data.labels.at(-1), 'Year 5 (Age 35)');
});

test('milestones show the first five-year mark, the middle one and the last year', () => {
  const { api, el } = load();
  api.calculate();
  const html = el('progressContainer').children.map(c => c.innerHTML).join('');
  const years = [...html.matchAll(/progress-year">Year (\d+)/g)].map(m => Number(m[1]));
  assert.deepEqual(years, [5, 15, 20]);
});

test('a period shorter than five years still gets a milestone', () => {
  const { api, el } = load();
  api.values.years = 3;
  api.calculate();
  assert.equal(el('progressContainer').children.length, 1);
});

test('the calculation still works when the voluntary EPF field and breakdown are absent', () => {
  const missing = ['voluntaryEPFInput', 'epfRateInfo', 'calculationBreakdown', 'breakdownDetails',
    'breakdownMonthly', 'breakdownInitial', 'breakdownYears', 'breakdownReturn', 'epfBreakdownSection'];
  const { api, el } = load({ missing });
  api.adjustValue('monthly', 100);
  assert.equal(averageShown(el), rm(futureValue(0, 1100, 7, 20) + futureValue(50000, 1200, 5.5, 20)));
});

test('mix breakdown amounts add up to the milestone total', () => {
  const { api, el } = load();
  Object.assign(api.values, { useMix: true, includeEPF: false });
  el('fdSlider').value = '35';
  api.updateMix('fd');
  api.calculate();
  const item = el('progressContainer').children.at(-1).innerHTML;
  const total = Number(item.match(/progress-amount">RM ([\d,]+)/)[1].replace(/,/g, ''));
  const parts = [...item.matchAll(/breakdown-amount">RM ([\d,]+)/g)].map(m => Number(m[1].replace(/,/g, '')));
  assert.ok(Math.abs(parts.reduce((a, b) => a + b, 0) - total) <= parts.length);
});

test('the summary names the period and splits EPF into your share, your employer\'s and today\'s balance', () => {
  const { api, el } = load();
  api.values.age = 30;
  api.calculate();
  assert.equal(el('summaryLabel').textContent, 'Likely final wealth after 20 years (age 50)');
  assert.equal(el('partEpfNote').textContent, 'RM 132,000 from your salary, RM 156,000 from your employer, RM 50,000 you have now');
  assert.equal((el('summaryBar').innerHTML.match(/<span/g) || []).length, 3);
});

test('milestone captions state what was put in and what it grew by', () => {
  const { api, el } = load();
  api.values.includeEPF = false;
  api.calculate();
  const last = el('progressContainer').children.at(-1).innerHTML.replace(/<[^>]+>/g, '');
  const growth = num(el('eqFinalAmount').textContent) - 240000;
  assert.match(last, new RegExp(`RM 240,000 put in, ${rm(growth)} growth`));
});

test('EPF is 11% from the employee plus 13% from the employer up to RM 5,000, 12% above', () => {
  const { api } = load();
  const low = api.calculateEPF(5000, 0, 0, 5.5, 1);
  assert.equal(low.monthlyEmployeeContribution, 550);
  assert.equal(low.monthlyEmployerContribution, 650);
  const high = api.calculateEPF(8000, 0, 0, 5.5, 1);
  assert.equal(high.monthlyEmployeeContribution, 880);
  assert.equal(high.monthlyEmployerContribution, 960);
});

test('the likely range brackets the middle outcome, which sits below the fixed-rate average', () => {
  const { api, el } = load();
  api.calculate();
  const [low, high] = rangeShown(el);
  const likely = num(el('eqFinalAmount').textContent);
  assert.ok(low < likely && likely < high, `${low} ${likely} ${high}`);
  assert.ok(likely < num(averageShown(el)));
});

test('with no swing the likely outcome equals the average', () => {
  const { api, el } = load();
  Object.assign(api.values, { useMix: true, includeEPF: false });
  for (const k of ['etf', 'unitTrust', 'stocks']) { el(k + 'Enabled').checked = false; api.toggleInvestmentType(k); }
  api.values.mixReturns.fd = 3.5; // fixed deposit swings 0.5 points a year
  api.calculate();
  const likely = num(el('eqFinalAmount').textContent);
  const average = num(averageShown(el));
  assert.ok(Math.abs(likely - average) / average < 0.005, `${likely} vs ${average}`);
});

test('the same inputs always give the same range', () => {
  const a = load(); a.api.calculate();
  const b = load(); b.api.calculate();
  assert.equal(a.el('summaryRange').textContent, b.el('summaryRange').textContent);
});
