// DOM Elements
const form = document.getElementById('expense-form');
const transactionTableBody = document.querySelector('#transaction-table tbody');
const chartModeSelect = document.getElementById('chart-mode');
const categoryFilter = document.getElementById('category-filter');
const chartCategoryFilter = document.getElementById('chart-category-filter');
const totalAmountCard = document.getElementById('total-amount');
const totalCountCard = document.getElementById('total-count');
const monthlyAvgCard = document.getElementById('monthly-average');
const yearlyAvgCard = document.getElementById('yearly-average');
const trendModeSelect = document.getElementById('trend-mode');

// Date filters
const dateFilterStart = document.getElementById('date-filter-start');
const dateFilterEnd = document.getElementById('date-filter-end');
const applyDateFilterBtn = document.getElementById('apply-date-filter');
const clearDateFilterBtn = document.getElementById('clear-date-filter');

let expenseChartInstance = null;
let pieChartInstance = null;
let trendChartInstance = null;
let allExpenses = [];

const incomeForm = document.getElementById('income-form');
let allIncome = [];
let editingIncomeId = null;

const budgetForm = document.getElementById('budget-form');
const budgetTracking = document.getElementById('budget-tracking');
let allBudgets = [];
let editingBudgetId = null;

// Sorting state
let transactionSortColumn = null;
let transactionSortDirection = 'asc';

const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = '/';

// Show welcome message
document.getElementById('welcome-user').textContent = `Welcome, ${user.name}!`;

// ============================================
// TAB NAVIGATION
// ============================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${targetTab}-tab`).classList.add('active');
    
    // Render charts if switching to charts tab
    if (targetTab === 'charts') {
      const chartCategory = chartCategoryFilter.value;
      let filtered = chartCategory === 'all' ? allExpenses : allExpenses.filter(e => e.category === chartCategory);
      renderChart(filtered, chartModeSelect.value);
      renderPieChart(filtered);
      renderTrendChart(allExpenses, trendModeSelect.value);
    }
  });
});

// ============================================
// COLLAPSIBLE FORMS
// ============================================
document.querySelectorAll('.form-section h2').forEach(header => {
  header.addEventListener('click', () => {
    header.parentElement.classList.toggle('collapsed');
  });
});

// ============================================
// BUDGET PANEL TOGGLE
// ============================================
const budgetPanel = document.getElementById('budget-panel');
const toggleBudgetBtn = document.getElementById('toggle-budget-btn');
const closeBudgetBtn = document.getElementById('close-budget-btn');
const budgetPeriodFilter = document.getElementById('budget-period-filter');

toggleBudgetBtn.addEventListener('click', () => {
  budgetPanel.classList.toggle('hidden');
  toggleBudgetBtn.textContent = budgetPanel.classList.contains('hidden') ? 'Show Budget' : 'Hide Budget';
});

closeBudgetBtn.addEventListener('click', () => {
  budgetPanel.classList.add('hidden');
  toggleBudgetBtn.textContent = 'Show Budget';
});

budgetPeriodFilter.addEventListener('change', () => {
  renderBudgetTracking(allBudgets);
});

// ============================================
// LOAD CATEGORIES
// ============================================
function loadCategories() {
  // Load expense categories
  fetch(`/api/categories?type=expense&user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      const expenseCategorySelect = document.getElementById('expense-category');
      const budgetCategorySelect = document.getElementById('budget-category');
      
      expenseCategorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
      budgetCategorySelect.innerHTML = '<option value="all">All Categories</option>';
      
      data.forEach(cat => {
        const option1 = document.createElement('option');
        option1.value = cat.name;
        option1.textContent = cat.name;
        expenseCategorySelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = cat.name;
        option2.textContent = cat.name;
        budgetCategorySelect.appendChild(option2);
      });
    });

  // Load income categories
  fetch(`/api/categories?type=income&user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      const incomeCategorySelect = document.getElementById('income-category');
      incomeCategorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
      
      data.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        incomeCategorySelect.appendChild(option);
      });
    });
}

// ============================================
// LOAD DATA
// ============================================
function loadExpenses() {
  fetch(`/api/expenses?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allExpenses = data;
      populateCategoryFilter(data);
      applyFilters();
      loadBudgets();
    });
}

function loadIncome() {
  fetch(`/api/income?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allIncome = data;
      applyFilters();
    });
}

function loadBudgets() {
  fetch(`/api/budgets?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allBudgets = data;
      renderBudgetTracking(data);
    });
}

// ============================================
// POPULATE FILTERS
// ============================================
function populateCategoryFilter(data) {
  const categories = [...new Set(data.map(exp => exp.category))];
  
  // Main category filter
  categoryFilter.innerHTML = '<option value="all">All</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
  
  // Chart category filter
  chartCategoryFilter.innerHTML = '<option value="all">All</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    chartCategoryFilter.appendChild(option);
  });
}

// ============================================
// DATE FILTER
// ============================================
applyDateFilterBtn.addEventListener('click', applyFilters);
clearDateFilterBtn.addEventListener('click', () => {
  dateFilterStart.value = '';
  dateFilterEnd.value = '';
  applyFilters();
});

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
  const selectedCategory = categoryFilter.value;
  const startDate = dateFilterStart.value ? new Date(dateFilterStart.value) : null;
  const endDate = dateFilterEnd.value ? new Date(dateFilterEnd.value) : null;
  
  let filtered = [...allExpenses];

  // Category filter
  if (selectedCategory !== 'all') {
    filtered = filtered.filter(exp => exp.category === selectedCategory);
  }
  
  // Date filter
  if (startDate || endDate) {
    filtered = filtered.filter(exp => {
      const expDate = new Date(exp.date);
      if (startDate && endDate) {
        return expDate >= startDate && expDate <= endDate;
      } else if (startDate) {
        return expDate >= startDate;
      } else if (endDate) {
        return expDate <= endDate;
      }
      return true;
    });
  }

  renderTransactionTable();
  updateSummaryCards(filtered);
}

// ============================================
// SORT DATA
// ============================================
function sortData(data, column, direction) {
  return [...data].sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];
    
    if (column === 'amount') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }
    
    if (column === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============================================
// RENDER TRANSACTION TABLE (COMBINED)
// ============================================
function renderTransactionTable() {
  // Combine expenses and income
  const transactions = [
    ...allExpenses.map(e => ({ ...e, type: 'Expense' })),
    ...allIncome.map(i => ({ ...i, type: 'Income' }))
  ];
  
  // Apply sorting
  let displayData = transactions;
  if (transactionSortColumn) {
    displayData = sortData(transactions, transactionSortColumn, transactionSortDirection);
  }
  
  transactionTableBody.innerHTML = '';
  
  // Group by date for budget rows
  const dateGroups = {};
  displayData.forEach(t => {
    if (!dateGroups[t.date]) dateGroups[t.date] = [];
    dateGroups[t.date].push(t);
  });
  
  // Track which budget periods we've shown
  const shownBudgets = new Set();
  
  displayData.forEach((transaction, index) => {
    // Check if we need to insert a budget row
    const transactionDate = new Date(transaction.date);
    allBudgets.forEach(budget => {
      const budgetStart = new Date(budget.start_date);
      const budgetEnd = new Date(budget.end_date);
      const budgetKey = `${budget.id}-${budget.start_date}`;
      
      // If transaction is at the end of budget period and we haven't shown this budget yet
      if (transactionDate.getTime() === budgetEnd.getTime() && !shownBudgets.has(budgetKey)) {
        shownBudgets.add(budgetKey);
        const spent = calculateSpending(budget);
        const percentage = (spent / budget.amount) * 100;
        const isOver = spent > budget.amount;
        
        const budgetRow = document.createElement('tr');
        budgetRow.className = 'budget-row';
        const isExpired = budget.is_active === 0;
        const statusText = isExpired ? '(ENDED)' : '';
        const statusStyle = isExpired ? 'opacity: 0.7; font-style: italic;' : '';

        budgetRow.innerHTML = `
          <td colspan="6" style="${statusStyle}">
            <strong>Budget Period ${isExpired ? 'ENDED' : 'End'}:</strong> ${budget.period} (${budget.start_date} to ${budget.end_date}) ${statusText} - 
            ${budget.category} | 
            Budget: ₱${budget.amount.toFixed(2)} | 
            Spent: ₱${spent.toFixed(2)} | 
            <span class="${isOver ? 'over-budget' : 'under-budget'}">
              ${percentage.toFixed(1)}% used
            </span>
            <div class="progress-bar" style="display:inline-block; width: 200px; margin-left: 10px;">
              <div class="progress-fill ${isOver ? 'over' : ''}" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
          </td>
        `;
        transactionTableBody.appendChild(budgetRow);
      }
    });
    
    // Regular transaction row
    const row = document.createElement('tr');
    const isExpense = transaction.type === 'Expense';
    row.innerHTML = `
      <td>${transaction.date}</td>
      <td><span style="color: ${isExpense ? '#e53935' : '#4caf50'}; font-weight: bold;">${transaction.type}</span></td>
      <td>₱${transaction.amount}</td>
      <td>${transaction.category}</td>
      <td>${transaction.description || '-'}</td>
      <td>
        <button class="edit-btn" onclick="${isExpense ? 'editExpense' : 'editIncome'}(${transaction.id})">Edit</button>
        <button class="delete-btn" onclick="${isExpense ? 'deleteExpense' : 'deleteIncome'}(${transaction.id})">Delete</button>
      </td>
    `;
    transactionTableBody.appendChild(row);
  });
}

// ============================================
// TABLE SORTING
// ============================================
function setupTableSorting() {
  document.querySelectorAll('#transaction-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      
      if (transactionSortColumn === column) {
        transactionSortDirection = transactionSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        transactionSortColumn = column;
        transactionSortDirection = 'asc';
      }
      
      document.querySelectorAll('#transaction-table th.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(`sort-${transactionSortDirection}`);
      
      renderTransactionTable();
    });
  });
}

// ============================================
// EXPENSE FORM SUBMISSION
// ============================================
let editingExpenseId = null;

form.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.user_id = user.id;

  if (editingExpenseId) {
    fetch(`/api/expenses/${editingExpenseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      cancelEdit();
      loadExpenses();
    });
  } else {
    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      form.reset();
      loadExpenses();
    });
  }
});

function editExpense(id) {
  const expense = allExpenses.find(exp => exp.id === id);
  if (!expense) return;

  document.querySelector('#expense-form input[name="date"]').value = expense.date;
  document.querySelector('#expense-form input[name="amount"]').value = expense.amount;
  document.querySelector('#expense-form select[name="category"]').value = expense.category;
  document.querySelector('#expense-form input[name="description"]').value = expense.description;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Update';
  editingExpenseId = id;

  if (!document.getElementById('cancel-edit-btn')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancel-edit-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = cancelEdit;
    submitBtn.parentNode.appendChild(cancelBtn);
  }

  const section = form.closest('.form-section');
  section.classList.remove('collapsed');
  section.scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingExpenseId = null;
  form.reset();
  form.querySelector('button[type="submit"]').textContent = 'Add';
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.remove();
}

function deleteExpense(id) {
  if (confirm('Delete this expense?')) {
    fetch(`/api/expenses/${id}`, {
      method: 'DELETE'
    }).then(() => loadExpenses());
  }
}

// ============================================
// INCOME FORM SUBMISSION
// ============================================
incomeForm.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(incomeForm);
  const data = Object.fromEntries(formData.entries());
  data.user_id = user.id;

  if (editingIncomeId) {
    fetch(`/api/income/${editingIncomeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      cancelIncomeEdit();
      loadIncome();
    });
  } else {
    fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      incomeForm.reset();
      loadIncome();
    });
  }
});

function editIncome(id) {
  const income = allIncome.find(inc => inc.id === id);
  if (!income) return;

  incomeForm.querySelector('input[name="date"]').value = income.date;
  incomeForm.querySelector('input[name="amount"]').value = income.amount;
  incomeForm.querySelector('select[name="category"]').value = income.category;
  incomeForm.querySelector('input[name="description"]').value = income.description;

  const submitBtn = incomeForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Update Income';
  editingIncomeId = id;

  if (!document.getElementById('cancel-income-edit-btn')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancel-income-edit-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = cancelIncomeEdit;
    submitBtn.parentNode.appendChild(cancelBtn);
  }

  const section = incomeForm.closest('.form-section');
  section.classList.remove('collapsed');
  section.scrollIntoView({ behavior: 'smooth' });
}

function cancelIncomeEdit() {
  editingIncomeId = null;
  incomeForm.reset();
  incomeForm.querySelector('button[type="submit"]').textContent = 'Add Income';
  const cancelBtn = document.getElementById('cancel-income-edit-btn');
  if (cancelBtn) cancelBtn.remove();
}

function deleteIncome(id) {
  if (confirm('Delete this income?')) {
    fetch(`/api/income/${id}`, {
      method: 'DELETE'
    }).then(() => loadIncome());
  }
}

// ============================================
// BUDGET FORM SUBMISSION
// ============================================
budgetForm.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(budgetForm);
  const data = Object.fromEntries(formData.entries());
  data.user_id = user.id;

  if (editingBudgetId) {
    fetch(`/api/budgets/${editingBudgetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      cancelBudgetEdit();
      loadBudgets();
    });
  } else {
    fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => {
      budgetForm.reset();
      loadBudgets();
    });
  }
});

function editBudget(id) {
  const budget = allBudgets.find(b => b.id === id);
  if (!budget) return;

  budgetForm.querySelector('select[name="period"]').value = budget.period;
  budgetForm.querySelector('input[name="start_date"]').value = budget.start_date;
  budgetForm.querySelector('input[name="end_date"]').value = budget.end_date;
  budgetForm.querySelector('input[name="amount"]').value = budget.amount;
  budgetForm.querySelector('select[name="category"]').value = budget.category;

  const submitBtn = budgetForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Update Budget';
  editingBudgetId = id;

  if (!document.getElementById('cancel-budget-edit-btn')) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancel-budget-edit-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = cancelBudgetEdit;
    submitBtn.parentNode.appendChild(cancelBtn);
  }

  const section = budgetForm.closest('.form-section');
  section.classList.remove('collapsed');
  section.scrollIntoView({ behavior: 'smooth' });
}

function cancelBudgetEdit() {
  editingBudgetId = null;
  budgetForm.reset();
  budgetForm.querySelector('button[type="submit"]').textContent = 'Set Budget';
  const cancelBtn = document.getElementById('cancel-budget-edit-btn');
  if (cancelBtn) cancelBtn.remove();
}

function deleteBudget(id) {
  if (confirm('Delete this budget?')) {
    fetch(`/api/budgets/${id}`, {
      method: 'DELETE'
    }).then(() => loadBudgets());
  }
}

function endBudget(id) {
  if (confirm('End this budget period?')) {
    fetch(`/api/budgets/${id}/end`, {
      method: 'PUT'
    }).then(() => loadBudgets());
  }
}

// ============================================
// BUDGET TRACKING DISPLAY
// ============================================
function calculateSpending(budget) {
  // For daily budgets, only count expenses on the exact end date
  if (budget.period === 'daily') {
    const filtered = allExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      const endDate = new Date(budget.end_date);
      
      const dateMatch = expDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0];
      const categoryMatch = budget.category === 'all' || exp.category === budget.category;
      
      return dateMatch && categoryMatch;
    });
    
    return filtered.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  }
  
  // For weekly/monthly budgets, count all expenses in range
  const filtered = allExpenses.filter(exp => {
    const expDate = new Date(exp.date);
    const startDate = new Date(budget.start_date);
    const endDate = new Date(budget.end_date);
    
    const dateInRange = expDate >= startDate && expDate <= endDate;
    const categoryMatch = budget.category === 'all' || exp.category === budget.category;
    
    return dateInRange && categoryMatch;
  });

  return filtered.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
}

function renderBudgetTracking(budgets) {
  const filterPeriod = budgetPeriodFilter.value;
  
  let filtered = budgets;
  if (filterPeriod !== 'all') {
    filtered = budgets.filter(b => b.period === filterPeriod);
  }
  
  // Check and auto-end expired budgets
  const today = new Date();
  filtered.forEach(budget => {
    const endDate = new Date(budget.end_date);
    if (budget.is_active && today > endDate) {
      fetch(`/api/budgets/${budget.id}/end`, { method: 'PUT' })
        .then(() => loadBudgets());
    }
  });
  
  if (filtered.length === 0) {
    budgetTracking.innerHTML = '<p style="padding: 1rem; text-align: center;">No budgets found.</p>';
    return;
  }

  budgetTracking.innerHTML = '';
  filtered.forEach(budget => {
    const spent = calculateSpending(budget);
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;
    const isOverBudget = spent > budget.amount;
    const isActive = budget.is_active === 1;

    const budgetCard = document.createElement('div');
    budgetCard.className = 'budget-card';
    budgetCard.style.opacity = isActive ? '1' : '0.6';
    budgetCard.innerHTML = `
      <div class="budget-header">
        <h3>${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget ${!isActive ? '(Ended)' : ''}</h3>
        <span>${budget.category}</span>
      </div>
      <div class="budget-dates">
        ${budget.start_date} to ${budget.end_date}
      </div>
      <div class="budget-amounts">
        <div>Budget: ₱${budget.amount.toFixed(2)}</div>
        <div>Spent: ₱${spent.toFixed(2)}</div>
        <div class="${isOverBudget ? 'over-budget' : 'under-budget'}">
          Remaining: ₱${remaining.toFixed(2)}
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${isOverBudget ? 'over' : ''}" style="width: ${Math.min(percentage, 100)}%"></div>
      </div>
      <div class="budget-percentage">${percentage.toFixed(1)}% used</div>
      <div class="budget-actions">
        ${isActive ? `<button class="end-budget-btn" onclick="endBudget(${budget.id})">End</button>` : ''}
        <button class="edit-btn" onclick="editBudget(${budget.id})">Edit</button>
        <button class="delete-btn" onclick="deleteBudget(${budget.id})">Delete</button>
      </div>
    `;
    budgetTracking.appendChild(budgetCard);
  });
}

// ============================================
// UPDATE SUMMARY CARDS
// ============================================
function updateSummaryCards(expenseData) {
  const totalExpenses = expenseData.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const expenseCount = expenseData.length;
  const totalIncome = allIncome.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
  const incomeCount = allIncome.length;
  const balance = totalIncome - totalExpenses;

  const monthGroups = {};
  const yearGroups = {};

  expenseData.forEach(exp => {
    const month = exp.date.slice(0, 7);
    const year = exp.date.slice(0, 4);

    if (!monthGroups[month]) monthGroups[month] = 0;
    if (!yearGroups[year]) yearGroups[year] = 0;

    monthGroups[month] += parseFloat(exp.amount);
    yearGroups[year] += parseFloat(exp.amount);
  });

  const monthlyAvg = Object.keys(monthGroups).length > 0
    ? (totalExpenses / Object.keys(monthGroups).length).toFixed(2)
    : 0;

  const yearlyAvg = Object.keys(yearGroups).length > 0
    ? (totalExpenses / Object.keys(yearGroups).length).toFixed(2)
    : 0;
    // Calculate daily average
  const dayGroups = {};
  expenseData.forEach(exp => {
    const day = exp.date;
    if (!dayGroups[day]) dayGroups[day] = 0;
    dayGroups[day] += parseFloat(exp.amount);
  });

  const dailyAvg = Object.keys(dayGroups).length > 0
    ? (totalExpenses / Object.keys(dayGroups).length).toFixed(2)
    : 0;

  const summaryCards = document.getElementById('summary-cards');
  summaryCards.innerHTML = `
    <div class="card balance-card ${balance >= 0 ? 'positive-balance' : 'negative-balance'}">
      Current Balance: ₱${balance.toFixed(2)}
    </div>
    <div class="card" id="income-card">
      Total Income: ₱${totalIncome.toFixed(2)}
    </div>
    <div class="card">
      Total Expenses: ₱${totalExpenses.toFixed(2)}
    </div>
    <div class="card">
      Income Entries: ${incomeCount}
    </div>
    <div class="card">
      Expense Entries: ${expenseCount}
    </div>
    <div class="card">
      Daily Avg: ₱${dailyAvg}
    </div>
    <div class="card">
      Monthly Avg: ₱${monthlyAvg}
    </div>
    <div class="card">
      Yearly Avg: ₱${yearlyAvg}
    </div>
  `;
}

// ============================================
// CHARTS
// ============================================
function renderChart(data, mode) {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  if (expenseChartInstance) expenseChartInstance.destroy();

  let labels = [];
  let totals = {};

  if (mode === 'daily') {
    data.forEach(exp => {
      if (!totals[exp.date]) totals[exp.date] = 0;
      totals[exp.date] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  } else if (mode === 'weekly') {
    data.forEach(exp => {
      const date = new Date(exp.date);
      const weekNum = getWeekNumber(date);
      const year = date.getFullYear();
      const weekLabel = `${year}-W${weekNum}`;
      
      if (!totals[weekLabel]) totals[weekLabel] = 0;
      totals[weekLabel] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  } else {
    data.forEach(exp => {
      const month = exp.date.slice(0, 7);
      if (!totals[month]) totals[month] = 0;
      totals[month] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  }

  expenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: mode === 'daily' ? 'Daily Expenses' : mode === 'weekly' ? 'Weekly Expenses' : 'Monthly Expenses',
        data: labels.map(label => totals[label]),
        backgroundColor: '#00796b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Expense Summary`
        }
      },
      scales: {
        x: { title: { display: true, text: mode === 'daily' ? 'Date' : mode === 'weekly' ? 'Week' : 'Month' } },
        y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
      }
    }
  });
}

function renderPieChart(data) {
  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChartInstance) pieChartInstance.destroy();

  const categoryTotals = {};
  data.forEach(exp => {
    if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
    categoryTotals[exp.category] += parseFloat(exp.amount);
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);
  
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];

  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Expenses by Category'
        }
      }
    }
  });
}

function renderTrendChart(data, mode) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChartInstance) trendChartInstance.destroy();

  let labels = [];
  let totals = {};

  if (mode === 'daily') {
    data.forEach(exp => {
      if (!totals[exp.date]) totals[exp.date] = 0;
      totals[exp.date] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  } else if (mode === 'weekly') {
    data.forEach(exp => {
      const date = new Date(exp.date);
      const weekNum = getWeekNumber(date);
      const year = date.getFullYear();
      const weekLabel = `${year}-W${weekNum}`;
      
      if (!totals[weekLabel]) totals[weekLabel] = 0;
      totals[weekLabel] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  } else {
    data.forEach(exp => {
      const month = exp.date.slice(0, 7);
      if (!totals[month]) totals[month] = 0;
      totals[month] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
  }

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Expense Trend',
        data: labels.map(label => totals[label]),
        borderColor: '#00796b',
        backgroundColor: 'rgba(0, 121, 107, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Expense Trend`
        }
      },
      scales: {
        x: { title: { display: true, text: 'Period' } },
        y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
      }
    }
  });
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// CHART CONTROLS
// ============================================
chartModeSelect.addEventListener('change', () => {
  const chartCategory = chartCategoryFilter.value;
  let filtered = chartCategory === 'all' ? allExpenses : allExpenses.filter(e => e.category === chartCategory);
  renderChart(filtered, chartModeSelect.value);
});

chartCategoryFilter.addEventListener('change', () => {
  const chartCategory = chartCategoryFilter.value;
  let filtered = chartCategory === 'all' ? allExpenses : allExpenses.filter(e => e.category === chartCategory);
  renderChart(filtered, chartModeSelect.value);
  renderPieChart(filtered);
});

trendModeSelect.addEventListener('change', () => {
  renderTrendChart(allExpenses, trendModeSelect.value);
});

categoryFilter.addEventListener('change', applyFilters);

// ============================================
// BUDGET AUTO-CALCULATION
// ============================================
const startDateInput = budgetForm.querySelector('input[name="start_date"]');
const endDateInput = budgetForm.querySelector('input[name="end_date"]');

// Set placeholder text
startDateInput.placeholder = 'Start Date';
endDateInput.placeholder = 'End Date';

const updateEndDate = () => {
  if (!startDateInput.value) return;
  
  const period = document.getElementById('budget-period').value;
  const startDate = new Date(startDateInput.value);
  let endDate = new Date(startDate);
  
  if (period === 'daily') {
    endDate = new Date(startDate);
  } else if (period === 'weekly') {
    endDate.setDate(endDate.getDate() + 6);
  } else if (period === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
  }
  
  endDateInput.value = endDate.toISOString().split('T')[0];
};

document.getElementById('budget-period').addEventListener('change', updateEndDate);
startDateInput.addEventListener('change', updateEndDate);

// ============================================
// DARK MODE
// ============================================
document.getElementById('dark-mode').addEventListener('change', function () {
  document.body.classList.toggle('dark-mode');
});

// ============================================
// LOGOUT
// ============================================
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('user');
  window.location.href = '/';
});

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
loadCategories();
loadIncome();
loadExpenses();
setupTableSorting();