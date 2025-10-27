const form = document.getElementById('expense-form');
const tableBody = document.querySelector('#expense-table tbody');
const chartModeSelect = document.getElementById('chart-mode');
const filterModeSelect = document.getElementById('filter-mode');
const filterDateInput = document.getElementById('filter-date');
const filterWeekInput = document.getElementById('filter-week');
const filterMonthInput = document.getElementById('filter-month');
const categoryFilter = document.getElementById('category-filter');
const totalAmountCard = document.getElementById('total-amount');
const totalCountCard = document.getElementById('total-count');
const dailyAvgCard = document.getElementById('daily-average');
const monthlyAvgCard = document.getElementById('monthly-average');
const yearlyAvgCard = document.getElementById('yearly-average');
const trendModeSelect = document.getElementById('trend-mode');

let expenseChartInstance = null;
let pieChartInstance = null;
let trendChartInstance = null;
let allExpenses = [];

const incomeForm = document.getElementById('income-form');
const incomeTableBody = document.querySelector('#income-table tbody');
let allIncome = [];
let editingIncomeId = null;

const budgetForm = document.getElementById('budget-form');
const budgetTracking = document.getElementById('budget-tracking');
let allBudgets = [];
let editingBudgetId = null;

// Feature 8: Sorting state
let expenseSortColumn = null;
let expenseSortDirection = 'asc';
let incomeSortColumn = null;
let incomeSortDirection = 'asc';

const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = '/';

// Feature 9: Load categories from database
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

// Load expenses and render everything
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

// Populate category dropdown
function populateCategoryFilter(data) {
  const categories = [...new Set(data.map(exp => exp.category))];
  categoryFilter.innerHTML = '<option value="all">All</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
}

// Apply category filter and update everything
function applyFilters() {
  const selectedCategory = categoryFilter.value;
  let filtered = [...allExpenses];

  if (selectedCategory !== 'all') {
    filtered = filtered.filter(exp => exp.category === selectedCategory);
  }

  renderTable(filtered);
  renderChart(filtered, chartModeSelect.value);
  renderPieChart(filtered);
  renderTrendChart(allExpenses, trendModeSelect.value);
  updateSummaryCards(filtered);
}

// Feature 8: Sort data
function sortData(data, column, direction) {
  return [...data].sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];
    
    // Handle numeric sorting for amount
    if (column === 'amount') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }
    
    // Handle date sorting
    if (column === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Render table with sorting
function renderTable(data) {
  // Apply sorting if active
  let displayData = data;
  if (expenseSortColumn) {
    displayData = sortData(data, expenseSortColumn, expenseSortDirection);
  }
  
  tableBody.innerHTML = '';
  displayData.forEach(exp => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${exp.date}</td>
      <td>₱${exp.amount}</td>
      <td>${exp.category}</td>
      <td>${exp.description}</td>
      <td>
        <button class="edit-btn" onclick="editExpense(${exp.id})">Edit</button>
        <button class="delete-btn" onclick="deleteExpense(${exp.id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Feature 8: Setup table sorting
function setupTableSorting() {
  // Expense table sorting
  document.querySelectorAll('#expense-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      
      if (expenseSortColumn === column) {
        expenseSortDirection = expenseSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        expenseSortColumn = column;
        expenseSortDirection = 'asc';
      }
      
      // Update UI
      document.querySelectorAll('#expense-table th.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(`sort-${expenseSortDirection}`);
      
      applyFilters();
    });
  });
  
  // Income table sorting
  document.querySelectorAll('#income-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      
      if (incomeSortColumn === column) {
        incomeSortDirection = incomeSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        incomeSortColumn = column;
        incomeSortDirection = 'asc';
      }
      
      // Update UI
      document.querySelectorAll('#income-table th.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(`sort-${incomeSortDirection}`);
      
      renderIncomeTable(allIncome);
    });
  });
}

// Submit new expense
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

// Delete expense
function deleteExpense(id) {
  fetch(`/api/expenses/${id}`, {
    method: 'DELETE'
  }).then(() => loadExpenses());
}

// Render bar chart with weekly support
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
    // Feature 7: Weekly grouping
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
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Expense Summary`
        }
      },
      scales: {
        x: { title: { display: true, text: mode === 'daily' ? 'Date' : mode === 'weekly' ? 'Week' : 'Month' } },
        y: { title: { display: true, text: 'Amount (₱)' } }
      }
    }
  });
}

// Feature 5: Render pie chart
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

// Feature 6: Render line chart (trend)
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

// Feature 7: Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Update summary cards
function updateSummaryCards(expenseData) {
  const totalExpenses = expenseData.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const expenseCount = expenseData.length;
  const totalIncome = allIncome.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
  const balance = totalIncome - totalExpenses;

  const dateGroups = {};
  const monthGroups = {};
  const yearGroups = {};

  expenseData.forEach(exp => {
    const date = exp.date;
    const month = exp.date.slice(0, 7);
    const year = exp.date.slice(0, 4);

    if (!dateGroups[date]) dateGroups[date] = 0;
    if (!monthGroups[month]) monthGroups[month] = 0;
    if (!yearGroups[year]) yearGroups[year] = 0;

    dateGroups[date] += parseFloat(exp.amount);
    monthGroups[month] += parseFloat(exp.amount);
    yearGroups[year] += parseFloat(exp.amount);
  });

  const dailyAvg = Object.keys(dateGroups).length > 0
    ? (totalExpenses / Object.keys(dateGroups).length).toFixed(2)
    : 0;

  const monthlyAvg = Object.keys(monthGroups).length > 0
    ? (totalExpenses / Object.keys(monthGroups).length).toFixed(2)
    : 0;

  const yearlyAvg = Object.keys(yearGroups).length > 0
    ? (totalExpenses / Object.keys(yearGroups).length).toFixed(2)
    : 0;

  // Update existing cards
  totalAmountCard.textContent = `Total Expenses: ₱${totalExpenses.toFixed(2)}`;
  totalCountCard.textContent = `Expense Entries: ${expenseCount}`;
  dailyAvgCard.textContent = `Daily Avg: ₱${dailyAvg}`;
  monthlyAvgCard.textContent = `Monthly Avg: ₱${monthlyAvg}`;
  yearlyAvgCard.textContent = `Yearly Avg: ₱${yearlyAvg}`;

  // Add or update balance card
  let balanceCard = document.getElementById('balance-card');
  if (!balanceCard) {
    balanceCard = document.createElement('div');
    balanceCard.id = 'balance-card';
    balanceCard.className = 'card balance-card';
    document.getElementById('summary-cards').prepend(balanceCard);
  }

  balanceCard.textContent = `Current Balance: ₱${balance.toFixed(2)}`;
  balanceCard.classList.remove('positive-balance', 'negative-balance');
  balanceCard.classList.add(balance >= 0 ? 'positive-balance' : 'negative-balance');

  // Add or update income summary card
  let incomeCard = document.getElementById('income-card');
  if (!incomeCard) {
    incomeCard = document.createElement('div');
    incomeCard.id = 'income-card';
    incomeCard.className = 'card';
    totalAmountCard.parentNode.insertBefore(incomeCard, totalAmountCard);
  }
  incomeCard.textContent = `Total Income: ₱${totalIncome.toFixed(2)}`;
}

// Toggle between date/week/month input
filterModeSelect.addEventListener('change', () => {
  filterDateInput.style.display = filterModeSelect.value === 'daily' ? 'inline' : 'none';
  filterWeekInput.style.display = filterModeSelect.value === 'weekly' ? 'inline' : 'none';
  filterMonthInput.style.display = filterModeSelect.value === 'monthly' ? 'inline' : 'none';
});

// Chart mode toggle
chartModeSelect.addEventListener('change', applyFilters);

// Trend mode toggle
trendModeSelect.addEventListener('change', () => {
  renderTrendChart(allExpenses, trendModeSelect.value);
});

// Category filter toggle
categoryFilter.addEventListener('change', applyFilters);

// Dark mode toggle
document.getElementById('dark-mode').addEventListener('change', function () {
  document.body.classList.toggle('dark-mode');
});

// Show welcome message
document.getElementById('welcome-user').textContent = `Welcome, ${user.name}!`;

// Logout button
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('user');
  window.location.href = '/';
});

// Track if we're editing
let editingExpenseId = null;

// Edit expense
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
    submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
  }

  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

// Cancel editing
function cancelEdit() {
  editingExpenseId = null;
  form.reset();
  form.querySelector('button[type="submit"]').textContent = 'Add';
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.remove();
}

// Load income
function loadIncome() {
  fetch(`/api/income?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allIncome = data;
      renderIncomeTable(data);
      updateSummaryCards(allExpenses);
    });
}

// Render income table
function renderIncomeTable(data) {
  // Apply sorting if active
  let displayData = data;
  if (incomeSortColumn) {
    displayData = sortData(data, incomeSortColumn, incomeSortDirection);
  }

  incomeTableBody.innerHTML = '';
  displayData.forEach(inc => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${inc.date}</td>
      <td>₱${inc.amount}</td>
      <td>${inc.category}</td>
      <td>${inc.description}</td>
      <td>
        <button class="edit-btn" onclick="editIncome(${inc.id})">Edit</button>
        <button class="delete-btn" onclick="deleteIncome(${inc.id})">Delete</button>
      </td>
    `;
    incomeTableBody.appendChild(row);
  });
}

// Submit income
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

// Edit income
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
    submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
  }
}

// Cancel income edit
function cancelIncomeEdit() {
  editingIncomeId = null;
  incomeForm.reset();
  incomeForm.querySelector('button[type="submit"]').textContent = 'Add Income';
  const cancelBtn = document.getElementById('cancel-income-edit-btn');
  if (cancelBtn) cancelBtn.remove();
}

// Delete income
function deleteIncome(id) {
  fetch(`/api/income/${id}`, {
    method: 'DELETE'
  }).then(() => loadIncome());
}

// Load budgets
function loadBudgets() {
  fetch(`/api/budgets?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allBudgets = data;
      renderBudgetTracking(data);
    });
}

// Calculate spending for a budget period
function calculateSpending(budget) {
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

// Render budget tracking
function renderBudgetTracking(budgets) {
  if (budgets.length === 0) {
    budgetTracking.innerHTML = '<p>No budgets set yet.</p>';
    return;
  }

  budgetTracking.innerHTML = '';
  budgets.forEach(budget => {
    const spent = calculateSpending(budget);
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;
    const isOverBudget = spent > budget.amount;

    const budgetCard = document.createElement('div');
    budgetCard.className = 'budget-card';
    budgetCard.innerHTML = `
      <div class="budget-header">
        <h3>${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget</h3>
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
        <button class="edit-btn" onclick="editBudget(${budget.id})">Edit</button>
        <button class="delete-btn" onclick="deleteBudget(${budget.id})">Delete</button>
      </div>
    `;
    budgetTracking.appendChild(budgetCard);
  });
}

// Submit budget
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

// Edit budget
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
    submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
  }
}

// Cancel budget edit
function cancelBudgetEdit() {
  editingBudgetId = null;
  budgetForm.reset();
  budgetForm.querySelector('button[type="submit"]').textContent = 'Set Budget';
  const cancelBtn = document.getElementById('cancel-budget-edit-btn');
  if (cancelBtn) cancelBtn.remove();
}

// Delete budget
function deleteBudget(id) {
  if (confirm('Are you sure you want to delete this budget?')) {
    fetch(`/api/budgets/${id}`, {
      method: 'DELETE'
    }).then(() => loadBudgets());
  }
}

// Auto-calculate end date based on period  <-- INSERT HERE
document.getElementById('budget-period').addEventListener('change', function() {
  const startDateInput = budgetForm.querySelector('input[name="start_date"]');
  const endDateInput = budgetForm.querySelector('input[name="end_date"]');
  
  startDateInput.addEventListener('change', function() {
    if (!this.value) return;
    
    const period = document.getElementById('budget-period').value;
    const startDate = new Date(this.value);
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
  });
});

// Initialize everything on page load
loadCategories();
loadIncome();
loadBudgets();
loadExpenses();
setupTableSorting();