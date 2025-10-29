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
let currentFilteredExpenses = []; // Track filtered expenses for charts

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
// TAB NAVIGATION (UPDATED FOR FILTERED CHARTS)
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
    
    // Render charts with filtered data if switching to charts tab
    if (targetTab === 'charts') {
      updateChartsWithFilteredData();
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
// LOAD CATEGORIES (WITH ERROR HANDLING)
// ============================================
function loadCategories() {
  // Load expense categories
  fetch(`/api/categories?type=expense&user_id=${user.id}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load expense categories');
      return res.json();
    })
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
    })
    .catch(err => {
      console.error('Error loading expense categories:', err);
      alert('Failed to load expense categories. Please refresh the page.');
    });

  // Load income categories
  fetch(`/api/categories?type=income&user_id=${user.id}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load income categories');
      return res.json();
    })
    .then(data => {
      const incomeCategorySelect = document.getElementById('income-category');
      incomeCategorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
      
      data.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        incomeCategorySelect.appendChild(option);
      });
    })
    .catch(err => {
      console.error('Error loading income categories:', err);
      alert('Failed to load income categories. Please refresh the page.');
    });
}

// ============================================
// LOAD EXPENSES (WITH CHART UPDATE)
// ============================================
function loadExpenses() {
  fetch(`/api/expenses?user_id=${user.id}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load expenses');
      return res.json();
    })
    .then(data => {
      allExpenses = data;
      populateCategoryFilter(data);
      renderTransactionTable();
      updateSummaryCards(data);
      loadBudgets();
      
      // Update charts if on charts tab
      const chartsTab = document.getElementById('charts-tab');
      if (chartsTab && chartsTab.classList.contains('active')) {
        // Reapply filters to update currentFilteredExpenses
        applyFilters();
      }
    })
    .catch(err => {
      console.error('Error loading expenses:', err);
      alert('Failed to load expenses. Please refresh the page.');
    });
}

// ============================================
// LOAD INCOME (WITH ERROR HANDLING)
// ============================================
function loadIncome() {
  fetch(`/api/income?user_id=${user.id}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load income');
      return res.json();
    })
    .then(data => {
      allIncome = data;
      renderTransactionTable();
      updateSummaryCards(allExpenses);
    })
    .catch(err => {
      console.error('Error loading income:', err);
      alert('Failed to load income. Please refresh the page.');
    });
}

// ============================================
// LOAD BUDGETS (WITH ERROR HANDLING)
// ============================================
function loadBudgets() {
  fetch(`/api/budgets?user_id=${user.id}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load budgets');
      return res.json();
    })
    .then(data => {
      allBudgets = data;
      renderBudgetTracking(data);
    })
    .catch(err => {
      console.error('Error loading budgets:', err);
      alert('Failed to load budgets. Please refresh the page.');
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
// APPLY FILTERS (UPDATED TO SAVE FILTERED DATA)
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

  // Save filtered data for charts
  currentFilteredExpenses = filtered;

  renderTransactionTable();
  updateSummaryCards(filtered);
  
  // Update charts if on charts tab
  const chartsTab = document.getElementById('charts-tab');
  if (chartsTab && chartsTab.classList.contains('active')) {
    updateChartsWithFilteredData();
  }
}

// ============================================
// UPDATE CHARTS WITH FILTERED DATA
// ============================================
function updateChartsWithFilteredData() {
  const barCategory = barCategoryFilter.value;
  let barFiltered = barCategory === 'all' ? currentFilteredExpenses : currentFilteredExpenses.filter(e => e.category === barCategory);
  
  renderChart(barFiltered, chartModeSelect.value);
  renderPieChart(currentFilteredExpenses);
  renderTrendChart(currentFilteredExpenses, trendModeSelect.value);
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
// CALCULATE SPENDING (FIXED - STRING COMPARISON)
// ============================================
function calculateSpending(budget) {
  // Use string comparison to avoid timezone issues
  const startDate = budget.start_date; // Format: YYYY-MM-DD
  const endDate = budget.end_date;     // Format: YYYY-MM-DD
  
  const filtered = allExpenses.filter(exp => {
    // String comparison works because dates are in YYYY-MM-DD format
    const dateInRange = exp.date >= startDate && exp.date <= endDate;
    
    // Check category match
    const categoryMatch = budget.category === 'all' || exp.category === budget.category;
    
    return dateInRange && categoryMatch;
  });

  return filtered.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
}



// ============================================
// EXPENSE FORM SUBMISSION
// ============================================
let editingExpenseId = null;

// ============================================
// EXPENSE FORM SUBMISSION (WITH LOADING STATE)
// ============================================
form.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.user_id = user.id;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = editingExpenseId ? 'Updating...' : 'Adding...';

  if (editingExpenseId) {
    fetch(`/api/expenses/${editingExpenseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to update expense');
      return res.json();
    })
    .then(() => {
      cancelEdit();
      loadExpenses();
    })
    .catch(err => {
      console.error('Error updating expense:', err);
      alert('Failed to update expense. Please try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    });
  } else {
    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to add expense');
      return res.json();
    })
    .then(() => {
      form.reset();
      loadExpenses();
    })
    .catch(err => {
      console.error('Error adding expense:', err);
      alert('Failed to add expense. Please try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
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
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to delete expense');
      return res.json();
    })
    .then(() => loadExpenses())
    .catch(err => {
      console.error('Error deleting expense:', err);
      alert('Failed to delete expense. Please try again.');
    });
  }
}

// ============================================
// INCOME FORM SUBMISSION (WITH LOADING STATE)
// ============================================
incomeForm.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(incomeForm);
  const data = Object.fromEntries(formData.entries());
  data.user_id = user.id;

  const submitBtn = incomeForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = editingIncomeId ? 'Updating...' : 'Adding...';

  if (editingIncomeId) {
    fetch(`/api/income/${editingIncomeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to update income');
      return res.json();
    })
    .then(() => {
      cancelIncomeEdit();
      loadIncome();
    })
    .catch(err => {
      console.error('Error updating income:', err);
      alert('Failed to update income. Please try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    });
  } else {
    fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to add income');
      return res.json();
    })
    .then(() => {
      incomeForm.reset();
      loadIncome();
    })
    .catch(err => {
      console.error('Error adding income:', err);
      alert('Failed to add income. Please try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
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
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to delete income');
      return res.json();
    })
    .then(() => loadIncome())
    .catch(err => {
      console.error('Error deleting income:', err);
      alert('Failed to delete income. Please try again.');
    });
  }
}

// ============================================
// VALIDATE BUDGET DATES
// ============================================
function validateBudgetDates(startDate, endDate) {
  if (!startDate || !endDate) {
    alert('Please select both start and end dates.');
    return false;
  }
  
  if (endDate < startDate) {
    alert('End date cannot be before start date.');
    return false;
  }
  
  return true;
}

// ============================================
// BUDGET FORM SUBMISSION (WITH LOADING STATE)
// ============================================
budgetForm.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(budgetForm);
  const data = Object.fromEntries(formData.entries());
  data.user_id = user.id;

   // ADD THIS VALIDATION CHECK
  if (!validateBudgetDates(data.start_date, data.end_date)) {
    return; // Stop submission if validation fails
  }

  const submitBtn = budgetForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = editingBudgetId ? 'Updating...' : 'Setting...';

  if (editingBudgetId) {
    fetch(`/api/budgets/${editingBudgetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to update budget');
      return res.json();
    })
    .then(() => {
      cancelBudgetEdit();
      loadBudgets();
    })
    .catch(err => {
      console.error('Error updating budget:', err);
      alert('Failed to update budget. Please try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    });
  } else {
    fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to create budget');
      return res.json();
    })
    .then(() => {
      budgetForm.reset();
      loadBudgets();
    })
    .catch(err => {
      console.error('Error creating budget. Please try again.');
      alert('Failed to create budget. Please try again.');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
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
  
  // Reset end date field state
  const endDateField = budgetForm.querySelector('input[name="end_date"]');
  endDateField.disabled = false;
  endDateField.style.opacity = '1';
  endDateField.style.cursor = 'default';
}

function deleteBudget(id) {
  if (confirm('Delete this budget?')) {
    fetch(`/api/budgets/${id}`, {
      method: 'DELETE'
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to delete budget');
      return res.json();
    })
    .then(() => loadBudgets())
    .catch(err => {
      console.error('Error deleting budget:', err);
      alert('Failed to delete budget. Please try again.');
    });
  }
}

function endBudget(id) {
  if (confirm('End this budget period?')) {
    fetch(`/api/budgets/${id}/end`, {
      method: 'PUT'
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to end budget');
      return res.json();
    })
    .then(() => loadBudgets())
    .catch(err => {
      console.error('Error ending budget:', err);
      alert('Failed to end budget. Please try again.');
    });
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

// ============================================
// BUDGET TRACKING DISPLAY (FIXED - NO RACE CONDITION)
// ============================================
function renderBudgetTracking(budgets) {
  const filterPeriod = budgetPeriodFilter.value;
  
  let filtered = budgets;
  if (filterPeriod !== 'all') {
    filtered = budgets.filter(b => b.period === filterPeriod);
  }
  
  // Check and auto-end expired budgets (improved logic)
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const budgetsToEnd = [];
  
  filtered.forEach(budget => {
    if (budget.is_active && today > budget.end_date) {
      budgetsToEnd.push(budget.id);
    }
  });
  
  // End all expired budgets in one batch, then reload once
  if (budgetsToEnd.length > 0) {
    Promise.all(
      budgetsToEnd.map(id => 
        fetch(`/api/budgets/${id}/end`, { method: 'PUT' })
      )
    ).then(() => {
      // Only reload once after all budgets are ended
      loadBudgets();
    }).catch(err => {
      console.error('Error auto-ending budgets:', err);
      // Still render the current state even if auto-end fails
      renderBudgetCards(filtered);
    });
    return; // Exit early, loadBudgets() will call this function again
  }
  
  // Render the budget cards
  renderBudgetCards(filtered);
}

// Helper function to render budget cards (extracted from renderBudgetTracking)
function renderBudgetCards(filtered) {
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
// RENDER CHART (FIXED LABEL FORMATTING)
// ============================================
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
    
    // Format labels as MM/DD for daily view
    const formattedLabels = labels.map(date => {
      const d = new Date(date + 'T00:00:00'); // Ensure local timezone
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    });
    
    if (labels.length > 0) {
      const firstDate = new Date(labels[0] + 'T00:00:00');
      yearLabel = firstDate.getFullYear();
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
            text: `Daily Expense Summary (${yearLabel})`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return labels[index]; // Show full date YYYY-MM-DD
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: 'Date (MM/DD)' 
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
      const date = new Date(exp.date + 'T00:00:00');
      const weekNum = getWeekNumber(date);
      const year = date.getFullYear();
      const weekLabel = `${year}-W${weekNum}`;
      
      if (!totals[weekLabel]) totals[weekLabel] = 0;
      totals[weekLabel] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as "Week N" for weekly view
    const formattedLabels = labels.map(weekLabel => {
      const weekNum = weekLabel.split('-W')[1];
      return `W${weekNum}`;
    });
    
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
            text: `Weekly Expense Summary (${yearLabel})`
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
              text: 'Week Number' 
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
    // Monthly mode
    data.forEach(exp => {
      const month = exp.date.slice(0, 7); // YYYY-MM
      if (!totals[month]) totals[month] = 0;
      totals[month] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as "MMM" (Jan, Feb, etc) for monthly view
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedLabels = labels.map(month => {
      const monthNum = parseInt(month.split('-')[1]) - 1;
      return monthNames[monthNum];
    });
    
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
            text: `Monthly Expense Summary (${yearLabel})`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const [year, month] = labels[index].split('-');
                return `${monthNames[parseInt(month)-1]} ${year}`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: 'Month' 
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

// ============================================
// RENDER TREND CHART (FIXED LABEL FORMATTING)
// ============================================
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
    
    // Format labels as MM/DD for daily trend
    const formattedLabels = labels.map(date => {
      const d = new Date(date + 'T00:00:00');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    });
    
    if (labels.length > 0) {
      yearLabel = new Date(labels[0] + 'T00:00:00').getFullYear();
    }
    
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Daily Expense Trend',
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
            text: `Daily Expense Trend (${yearLabel})`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return labels[index]; // Show full date
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: 'Date (MM/DD)' 
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
      const date = new Date(exp.date + 'T00:00:00');
      const weekNum = getWeekNumber(date);
      const year = date.getFullYear();
      const weekLabel = `${year}-W${weekNum}`;
      
      if (!totals[weekLabel]) totals[weekLabel] = 0;
      totals[weekLabel] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as "Week N" for weekly trend
    const formattedLabels = labels.map(weekLabel => {
      const weekNum = weekLabel.split('-W')[1];
      return `W${weekNum}`;
    });
    
    if (labels.length > 0) {
      yearLabel = labels[0].split('-')[0];
    }
    
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Weekly Expense Trend',
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
            text: `Weekly Expense Trend (${yearLabel})`
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
              text: 'Week Number' 
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
    // Monthly mode
    data.forEach(exp => {
      const month = exp.date.slice(0, 7);
      if (!totals[month]) totals[month] = 0;
      totals[month] += parseFloat(exp.amount);
    });
    labels = Object.keys(totals).sort();
    
    // Format labels as "MMM" for monthly trend
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedLabels = labels.map(month => {
      const monthNum = parseInt(month.split('-')[1]) - 1;
      return monthNames[monthNum];
    });
    
    if (labels.length > 0) {
      yearLabel = labels[0].split('-')[0];
    }
    
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: formattedLabels,
        datasets: [{
          label: 'Monthly Expense Trend',
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
            text: `Monthly Expense Trend (${yearLabel})`
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const [year, month] = labels[index].split('-');
                return `${monthNames[parseInt(month)-1]} ${year}`;
              }
            }
          }
        },
        scales: {
          x: { 
            title: { 
              display: true, 
              text: 'Month' 
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
// CHART CONTROLS (UPDATED FOR FILTERED DATA)
// ============================================
chartModeSelect.addEventListener('change', () => {
  updateChartsWithFilteredData();
});

barCategoryFilter.addEventListener('change', () => {
  updateChartsWithFilteredData();
});

trendModeSelect.addEventListener('change', () => {
  updateChartsWithFilteredData();
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
// TABLE SORTING FUNCTIONALITY
// ============================================
function setupTableSorting() {
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort');
      
      // Toggle sort direction if same column, otherwise default to ascending
      if (transactionSortColumn === column) {
        transactionSortDirection = transactionSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        transactionSortColumn = column;
        transactionSortDirection = 'asc';
      }
      
      // Update UI - remove all sort classes from headers
      document.querySelectorAll('.sortable').forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      
      // Add appropriate sort class to clicked header
      header.classList.add(`sort-${transactionSortDirection}`);
      
      // Re-render table with sorted data
      renderTransactionTable();
    });
  });
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================
loadCategories();
loadIncome();
loadExpenses();
setupTableSorting();
















