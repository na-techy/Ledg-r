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
const barCategoryFilter = document.getElementById('bar-category-filter');

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

// ============================================
// MOBILE MENU TOGGLE - ADD THIS ENTIRE SECTION
// ============================================
// Create hamburger menu button
const menuToggle = document.createElement('button');
menuToggle.className = 'menu-toggle';
menuToggle.innerHTML = '☰';
menuToggle.setAttribute('aria-label', 'Toggle menu');
document.body.insertBefore(menuToggle, document.body.firstChild);

// Create overlay for mobile menu
const sidebarOverlay = document.createElement('div');
sidebarOverlay.className = 'sidebar-overlay';
document.body.appendChild(sidebarOverlay);

const sidebar = document.querySelector('.sidebar');

// Toggle sidebar on mobile
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
  sidebarOverlay.classList.toggle('active');
  document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
});

// Close sidebar when clicking overlay
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
});

// Close sidebar when clicking a navigation button
document.querySelectorAll('.sidebar button').forEach(button => {
  button.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }, 250);
});
// ============================================
// END MOBILE MENU TOGGLE
// ============================================

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
      const barCategory = barCategoryFilter.value;
      let filteredBar = barCategory === 'all' ? allExpenses : allExpenses.filter(e => e.category === barCategory);
      renderChart(filteredBar, chartModeSelect.value);
      renderPieChart(allExpenses);
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

  // Bar chart category filter
  barCategoryFilter.innerHTML = '<option value="all">All</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    barCategoryFilter.appendChild(option);
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
// RENDER TRANSACTION TABLE (FIXED)
// ============================================
function renderTransactionTable() {
  // Get filtered expenses based on current filters
  const selectedCategory = categoryFilter.value;
  const startDate = dateFilterStart.value ? new Date(dateFilterStart.value) : null;
  const endDate = dateFilterEnd.value ? new Date(dateFilterEnd.value) : null;
  
  let filteredExpenses = [...allExpenses];
  
  // Apply category filter
  if (selectedCategory !== 'all') {
    filteredExpenses = filteredExpenses.filter(exp => exp.category === selectedCategory);
  }
  
  // Apply date filter
  if (startDate || endDate) {
    filteredExpenses = filteredExpenses.filter(exp => {
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
  
  // Combine filtered expenses and all income
  const transactions = [
    ...filteredExpenses.map(e => ({ ...e, type: 'Expense' })),
    ...allIncome.map(i => ({ ...i, type: 'Income' }))
  ];
  
  // Apply sorting
  let displayData = transactions;
  if (transactionSortColumn) {
    displayData = sortData(transactions, transactionSortColumn, transactionSortDirection);
  }
  
  transactionTableBody.innerHTML = '';
  
  // Track which budget periods we've shown
  const shownBudgets = new Set();
  const today = new Date();
  
  // Collect all budgets that should be displayed
  const budgetsToDisplay = [];
  
  allBudgets.forEach(budget => {
    const budgetKey = `${budget.id}-${budget.start_date}`;
    const budgetEnd = new Date(budget.end_date);
    const isActive = budget.is_active === 1;
    
    const shouldShow = !isActive || today > budgetEnd || 
                      displayData.some(t => new Date(t.date) >= budgetEnd);
    
    if (shouldShow && !shownBudgets.has(budgetKey)) {
      budgetsToDisplay.push({
        budget,
        displayDate: !isActive ? budget.end_date : 
                    today > budgetEnd ? budget.end_date : 
                    displayData.find(t => new Date(t.date) >= budgetEnd)?.date || budget.end_date,
        isActive
      });
      shownBudgets.add(budgetKey);
    }
  });
  
  budgetsToDisplay.sort((a, b) => new Date(b.displayDate) - new Date(a.displayDate));
  
  const allRows = [...displayData];
  
  budgetsToDisplay.forEach(({ budget, displayDate, isActive }) => {
    const spent = calculateSpending(budget);
    const percentage = (spent / budget.amount) * 100;
    const isOver = spent > budget.amount;
    
    let insertIndex = allRows.findIndex(t => new Date(t.date) < new Date(displayDate));
    if (insertIndex === -1) insertIndex = allRows.length;
    
    const budgetRow = {
      isBudgetRow: true,
      budget,
      spent,
      percentage,
      isOver,
      isActive,
      sortDate: displayDate
    };
    
    allRows.splice(insertIndex, 0, budgetRow);
  });
  
  // Render all rows
  allRows.forEach(row => {
    if (row.isBudgetRow) {
      const { budget, spent, percentage, isOver, isActive } = row;
      const isExpired = !isActive;
      const statusText = isExpired ? '(ENDED)' : '';
      const statusStyle = isExpired ? 'opacity: 0.7; font-style: italic;' : '';
      
      const budgetRow = document.createElement('tr');
      budgetRow.className = 'budget-row';
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
    } else {
      const transaction = row;
      const isExpense = transaction.type === 'Expense';
      const rowElement = document.createElement('tr');
      rowElement.innerHTML = `
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
      transactionTableBody.appendChild(rowElement);
    }
  });
}

// ============================================
// CALCULATE SPENDING (FIXED)
// ============================================
function calculateSpending(budget) {
  const startDate = new Date(budget.start_date);
  const endDate = new Date(budget.end_date);
  
  // Normalize dates to ignore time component
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  const filtered = allExpenses.filter(exp => {
    const expDate = new Date(exp.date);
    expDate.setHours(0, 0, 0, 0);
    
    // Check if date is within range
    const dateInRange = expDate >= startDate && expDate <= endDate;
    
    // Check category match
    const categoryMatch = budget.category === 'all' || exp.category === budget.category;
    
    return dateInRange && categoryMatch;
  });

  return filtered.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
}

// ============================================
// LOAD EXPENSES (ENSURE PROPER CHAIN)
// ============================================
function loadExpenses() {
  fetch(`/api/expenses?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allExpenses = data;
      populateCategoryFilter(data);
      renderTransactionTable(); // Changed from applyFilters()
      updateSummaryCards(data);
      loadBudgets();
    });
}

// ============================================
// LOAD INCOME (ENSURE PROPER CHAIN)
// ============================================
function loadIncome() {
  fetch(`/api/income?user_id=${user.id}`)
    .then(res => res.json())
    .then(data => {
      allIncome = data;
      renderTransactionTable(); // Changed from applyFilters()
      updateSummaryCards(allExpenses);
    });
}

// ============================================
// APPLY FILTERS (SIMPLIFIED)
// ============================================
function applyFilters() {
  const selectedCategory = categoryFilter.value;
  const startDate = dateFilterStart.value ? new Date(dateFilterStart.value) : null;
  const endDate = dateFilterEnd.value ? new Date(dateFilterEnd.value) : null;
  
  let filtered = [...allExpenses];

  if (selectedCategory !== 'all') {
    filtered = filtered.filter(exp => exp.category === selectedCategory);
  }
  
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

function renderChart(data, mode) {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  if (expenseChartInstance) expenseChartInstance.destroy();

  let labels = [];
  let totals = {};
  let yearLabel = '';

  if (mode === 'daily') {
    data.forEach(exp => {
      if (!totals[exp.date]) totals[exp.date] = 0;
      totals[exp.date] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as MM/DD
    const formattedLabels = labels.map(date => {
      const d = new Date(date);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    });
    
    // Get year from first date
    if (labels.length > 0) {
      yearLabel = new Date(labels[0]).getFullYear();
    }
    
    expenseChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Daily Expenses',
          data: labels.map(label => totals[label]),
          backgroundColor: '#8b4513'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Daily Expense Summary`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return labels[index]; // Show full date in tooltip
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: `Periods in ${yearLabel}` 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Amount (₱)' 
            }, 
            beginAtZero: true 
          }
        }
      }
    });
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
    
    // Format labels as MM/WW
    const formattedLabels = labels.map(weekLabel => {
      const [year, week] = weekLabel.split('-W');
      // Get first day of week to determine month
      const firstDay = getFirstDayOfWeek(parseInt(year), parseInt(week));
      const month = String(firstDay.getMonth() + 1).padStart(2, '0');
      return `${month}/W${week}`;
    });
    
    // Get year from first label
    if (labels.length > 0) {
      yearLabel = labels[0].split('-')[0];
    }
    
    expenseChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Weekly Expenses',
          data: labels.map(label => totals[label]),
          backgroundColor: '#8b4513'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Weekly Expense Summary`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return `Week ${labels[index].split('-W')[1]}, ${labels[index].split('-')[0]}`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: `Periods in ${yearLabel}` 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Amount (₱)' 
            }, 
            beginAtZero: true 
          }
        }
      }
    });
  } else {
    // Monthly
    data.forEach(exp => {
      const month = exp.date.slice(0, 7);
      if (!totals[month]) totals[month] = 0;
      totals[month] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as MM
    const formattedLabels = labels.map(month => {
      const [year, mon] = month.split('-');
      return mon;
    });
    
    // Get year from first label
    if (labels.length > 0) {
      yearLabel = labels[0].split('-')[0];
    }
    
    expenseChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Monthly Expenses',
          data: labels.map(label => totals[label]),
          backgroundColor: '#8b4513'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Monthly Expense Summary`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const [year, month] = labels[index].split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${monthNames[parseInt(month)-1]} ${year}`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: `Periods in ${yearLabel}` 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Amount (₱)' 
            }, 
            beginAtZero: true 
          }
        }
      }
    });
  }
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
    '#8b4513', '#a0522d', '#d2691e', '#cd853f', '#daa520', '#b8860b',
    '#f4a460', '#d2b48c', '#bc8f8f', '#cd5c5c'
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
          text: 'All Expenses by Category'
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
  let yearLabel = '';

  if (mode === 'daily') {
    data.forEach(exp => {
      if (!totals[exp.date]) totals[exp.date] = 0;
      totals[exp.date] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as MM/WW (month/week number)
    const formattedLabels = labels.map(date => {
      const d = new Date(date);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const week = getWeekNumber(d);
      return `${month}/W${week}`;
    });
    
    if (labels.length > 0) {
      yearLabel = new Date(labels[0]).getFullYear();
    }
    
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Expense Trend',
          data: labels.map(label => totals[label]),
          borderColor: '#8b4513',
          backgroundColor: 'rgba(139, 69, 19, 0.1)',
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
            text: `Daily Expense Trend`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return labels[index]; // Show actual date in tooltip
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: `Periods in ${yearLabel}` 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Amount (₱)' 
            }, 
            beginAtZero: true 
          }
        }
      }
    });
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
    
    // Format labels as MM (just month)
    const formattedLabels = labels.map(weekLabel => {
      const [year, week] = weekLabel.split('-W');
      const firstDay = getFirstDayOfWeek(parseInt(year), parseInt(week));
      const month = String(firstDay.getMonth() + 1).padStart(2, '0');
      return month;
    });
    
    if (labels.length > 0) {
      yearLabel = labels[0].split('-')[0];
    }
    
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Expense Trend',
          data: labels.map(label => totals[label]),
          borderColor: '#8b4513',
          backgroundColor: 'rgba(139, 69, 19, 0.1)',
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
            text: `Weekly Expense Trend`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return `Week ${labels[index].split('-W')[1]}, ${labels[index].split('-')[0]}`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: `Periods in ${yearLabel}` 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Amount (₱)' 
            }, 
            beginAtZero: true 
          }
        }
      }
    });
  } else {
    // Monthly
    data.forEach(exp => {
      const month = exp.date.slice(0, 7);
      if (!totals[month]) totals[month] = 0;
      totals[month] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as just the year
    const formattedLabels = labels.map(month => {
      const year = month.split('-')[0];
      return year;
    });
    
    if (labels.length > 0) {
      yearLabel = labels[0].split('-')[0];
    }
    
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Expense Trend',
          data: labels.map(label => totals[label]),
          borderColor: '#8b4513',
          backgroundColor: 'rgba(139, 69, 19, 0.1)',
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
            text: `Monthly Expense Trend`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const [year, month] = labels[index].split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${monthNames[parseInt(month)-1]} ${year}`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: `Periods in ${yearLabel}` 
            } 
          },
          y: { 
            title: { 
              display: true, 
              text: 'Amount (₱)' 
            }, 
            beginAtZero: true 
          }
        }
      }
    });
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getFirstDayOfWeek(year, week) {
  const date = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

// ============================================
// CHART CONTROLS
// ============================================
chartModeSelect.addEventListener('change', () => {
  const barCategory = barCategoryFilter.value;
  let filtered = barCategory === 'all' ? allExpenses : allExpenses.filter(e => e.category === barCategory);
  renderChart(filtered, chartModeSelect.value);
});

barCategoryFilter.addEventListener('change', () => {
  const barCategory = barCategoryFilter.value;
  let filtered = barCategory === 'all' ? allExpenses : allExpenses.filter(e => e.category === barCategory);
  renderChart(filtered, chartModeSelect.value);
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

const budgetPeriodSelect = document.getElementById('budget-period');

// Handle end date field visibility for daily budget
budgetPeriodSelect.addEventListener('change', function() {
  if (this.value === 'daily') {
    endDateInput.disabled = true;
    endDateInput.style.opacity = '0.5';
    endDateInput.style.cursor = 'not-allowed';
  } else {
    endDateInput.disabled = false;
    endDateInput.style.opacity = '1';
    endDateInput.style.cursor = 'default';
  }
});

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
















