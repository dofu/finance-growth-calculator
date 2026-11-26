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
  };
}

// Loads a fresh copy of the script. `missing` lists element ids that do not
// exist on the page (V1 has no voluntary EPF field or calculation breakdown).
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
      updateFromInput, calculateEPF, calculateBlendedReturn, calculate };`, context);
  return { api: context.__api, el: get, charts };
}

const rm = n => `RM ${Math.round(n).toLocaleString()}`;

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

test('blended return skips disabled assets and leaves unallocated money at 0%', () => {
  const { api } = load();
  api.values.useMix = true;
  api.values.mixEnabled.stocks = false;
  api.calculateBlendedReturn();
  assert.ok(Math.abs(api.values.returnRate - 5.3) < 1e-9);
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

test('final wealth equals investments plus EPF (default inputs)', () => {
  const { api, el } = load();
  api.calculate();
  const invest = futureValue(0, 1000, 7, 20);
  const epf = futureValue(50000, 1200, 5.5, 20);
  assert.equal(el('eqFinalAmount').textContent, rm(invest + epf));
  assert.equal(el('eqTotalContributed').textContent, rm(1000 * 240 + 50000 + 1200 * 240));
  assert.equal(el('eqFinalAmount').textContent, 'RM 1,193,511');
});

test('without EPF only the investment is counted', () => {
  const { api, el } = load();
  api.values.includeEPF = false;
  api.calculate();
  assert.equal(el('eqFinalAmount').textContent, rm(futureValue(0, 1000, 7, 20)));
  assert.equal(el('eqTotalContributed').textContent, rm(240000));
});

test('total invested plus interest equals final wealth', () => {
  const { api, el } = load();
  Object.assign(api.values, { monthly: 750, initial: 20000, returnRate: 8.2, years: 33, salary: 7200, voluntaryEPF: 150 });
  api.calculate();
  const num = s => Number(s.replace(/[^\d-]/g, ''));
  const diff = num(el('eqTotalContributed').textContent) + num(el('eqTotalInterest').textContent) - num(el('eqFinalAmount').textContent);
  assert.ok(Math.abs(diff) <= 1, `rounding gap ${diff}`);
});

test('chart has one point per year and three lines with EPF on', () => {
  const { api, charts } = load();
  api.values.years = 12;
  api.calculate();
  const { data } = charts.at(-1).config;
  assert.equal(data.labels.length, 12);
  assert.deepEqual([...data.datasets.map(d => d.label)], ['Total Wealth', 'EPF Balance', 'Investment Balance']);
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

test('the calculation works on V1, which has no voluntary EPF field or breakdown', () => {
  const missing = ['voluntaryEPFInput', 'epfRateInfo', 'calculationBreakdown', 'breakdownDetails',
    'breakdownMonthly', 'breakdownInitial', 'breakdownYears', 'breakdownReturn', 'epfBreakdownSection'];
  const { api, el } = load({ missing });
  api.adjustValue('monthly', 100);
  assert.equal(el('eqFinalAmount').textContent, rm(futureValue(0, 1100, 7, 20) + futureValue(50000, 1200, 5.5, 20)));
});

test('mix breakdown amounts add up to the milestone total', () => {
  const { api, el } = load();
  Object.assign(api.values, { useMix: true, includeEPF: false });
  api.values.mixAllocations.fd = 0; // 90% allocated
  api.calculateBlendedReturn();
  api.calculate();
  const item = el('progressContainer').children.at(-1).innerHTML;
  const total = Number(item.match(/progress-amount">RM ([\d,]+)/)[1].replace(/,/g, ''));
  const parts = [...item.matchAll(/breakdown-amount">RM ([\d,]+)/g)].map(m => Number(m[1].replace(/,/g, '')));
  assert.ok(Math.abs(parts.reduce((a, b) => a + b, 0) - total) <= parts.length);
});

test('the total invested is split into investments, EPF contributions and the EPF starting balance', () => {
  const { api, el } = load();
  api.calculate();
  assert.equal(el('eqContributedSplit').textContent,
    'Total invested: RM 240,000 into your investments, RM 288,000 of EPF contributions and RM 50,000 already in EPF.');
});

test('milestone captions state what was put in and what it grew by', () => {
  const { api, el } = load();
  api.values.includeEPF = false;
  api.calculate();
  const last = el('progressContainer').children.at(-1).innerHTML;
  const growth = futureValue(0, 1000, 7, 20) - 240000;
  assert.match(last, new RegExp(`RM 240,000 put in, ${rm(growth)} growth`));
});
