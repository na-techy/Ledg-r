// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app...');
  
  // Check user authentication first
  const user = JSON.parse(localStorage.getItem('user'));
  console.log('User from localStorage:', user);

  if (!user || !user.id) {
    console.error('No valid user found in localStorage');
    alert('Session expired. Please log in again.');
    window.location.href = '/';
    return;
  }

  // Initialize the app
  initializeApp(user);
});

// Main initialization function
function initializeApp(user) {
  // Make user globally accessible
  window.currentUser = user;
  
  // DOM Elements
  const form = document.getElementById('expense-form');
  const transactionTableBody = document.querySelector('#transaction-table tbody');
  const chartModeSelect = document.getElementById('chart-mode');
  const categoryFilter = document.getElementById('category-filter');
  const chartCategoryFilter = document.getElementById('chart-category-filter');
  const trendModeSelect = document.getElementById('trend-mode');
  const barCategoryFilter = document.getElementById('bar-category-filter');
  const dateFilterStart = document.getElementById('date-filter-start');
  const dateFilterEnd = document.getElementById('date-filter-end');
  const applyDateFilterBtn = document.getElementById('apply-date-filter');
  const clearDateFilterBtn = document.getElementById('clear-date-filter');
  const incomeForm = document.getElementById('income-form');
  const budgetForm = document.getElementById('budget-form');
  const budgetTracking = document.getElementById('budget-tracking');

  // Check if we're on the dashboard page
  if (!form || !transactionTableBody) {
    console.error('Dashboard elements not found.');
    return;
  }

  // Global state variables
  let expenseChartInstance = null;
  let pieChartInstance = null;
  let trendChartInstance = null;
  let allExpenses = [];
  let allIncome = [];
  let allBudgets = [];
  let editingIncomeId = null;
  let editingBudgetId = null;
  let editingExpenseId = null;
  let currentFilteredExpenses = [];
  let transactionSortColumn = null;
  let transactionSortDirection = 'asc';

  // Make functions globally accessible
  window.editExpense = editExpense;
  window.deleteExpense = deleteExpense;
  window.editIncome = editIncome;
  window.deleteIncome = deleteIncome;
  window.editBudget = editBudget;
  window.deleteBudget = deleteBudget;
  window.endBudget = endBudget;

  // Show welcome message
  const welcomeUser = document.getElementById('welcome-user');
  if (welcomeUser) {
    welcomeUser.textContent = `Welcome, ${user.name}!`;
  }

  // Load categories
  function loadCategories() {
    fetch(`/api/categories?type=expense&user_id=${user.id}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load expense categories'))
      .then(data => {
        const expenseCategorySelect = document.getElementById('expense-category');
        const budgetCategorySelect = document.getElementById('budget-category');
        expenseCategorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
        budgetCategorySelect.innerHTML = '<option value="all">All Categories</option>';
        data.forEach(cat => {
          expenseCategorySelect.add(new Option(cat.name, cat.name));
          budgetCategorySelect.add(new Option(cat.name, cat.name));
        });
      })
      .catch(err => console.error('Error loading expense categories:', err));

    fetch(`/api/categories?type=income&user_id=${user.id}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load income categories'))
      .then(data => {
        const incomeCategorySelect = document.getElementById('income-category');
        incomeCategorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
        data.forEach(cat => incomeCategorySelect.add(new Option(cat.name, cat.name)));
      })
      .catch(err => console.error('Error loading income categories:', err));
  }

  // Load expenses
  function loadExpenses() {
    console.log('Loading expenses for user:', user.id);
    fetch(`/api/expenses?user_id=${user.id}`)
      .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Loaded expenses:', data);
        allExpenses = data;
        populateCategoryFilter(data);
        renderTransactionTable();
        updateSummaryCards(data);
        loadBudgets();
        const chartsTab = document.getElementById('charts-tab');
        if (chartsTab && chartsTab.classList.contains('active')) applyFilters();
      })
      .catch(err => {
        console.error('Error loading expenses:', err);
        if (err.message.includes('Failed to fetch')) {
          alert('Cannot connect to server. Please make sure the server is running.');
        } else {
          alert(`Failed to load expenses: ${err.message}`);
        }
      });
  }

  // Load income
  function loadIncome() {
    fetch(`/api/income?user_id=${user.id}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed'))
      .then(data => {
        allIncome = data;
        renderTransactionTable();
        updateSummaryCards(allExpenses);
      })
      .catch(err => console.error('Error loading income:', err));
  }

  // Load budgets
  function loadBudgets() {
    fetch(`/api/budgets?user_id=${user.id}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed'))
      .then(data => {
        allBudgets = data;
        renderBudgetTracking(data);
      })
      .catch(err => console.error('Error loading budgets:', err));
  }

  // Populate category filter
  function populateCategoryFilter(data) {
    const categories = [...new Set(data.map(exp => exp.category))];
    [categoryFilter, chartCategoryFilter, barCategoryFilter].forEach(filter => {
      filter.innerHTML = '<option value="all">All</option>';
      categories.forEach(cat => filter.add(new Option(cat, cat)));
    });
  }

  // Apply filters
  function applyFilters() {
    const selectedCategory = categoryFilter.value;
    const startDate = dateFilterStart.value ? new Date(dateFilterStart.value) : null;
    const endDate = dateFilterEnd.value ? new Date(dateFilterEnd.value) : null;
    
    let filtered = [...allExpenses];
    if (selectedCategory !== 'all') filtered = filtered.filter(exp => exp.category === selectedCategory);
    if (startDate || endDate) {
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        if (startDate && endDate) return expDate >= startDate && expDate <= endDate;
        if (startDate) return expDate >= startDate;
        if (endDate) return expDate <= endDate;
        return true;
      });
    }

    currentFilteredExpenses = filtered;
    renderTransactionTable();
    updateSummaryCards(filtered);
    const chartsTab = document.getElementById('charts-tab');
    if (chartsTab && chartsTab.classList.contains('active')) updateChartsWithFilteredData();
  }

  // Update charts with filtered data
  function updateChartsWithFilteredData() {
    const barCategory = barCategoryFilter.value;
    let barFiltered = barCategory === 'all' ? currentFilteredExpenses : currentFilteredExpenses.filter(e => e.category === barCategory);
    renderChart(barFiltered, chartModeSelect.value);
    renderPieChart(currentFilteredExpenses);
    renderTrendChart(currentFilteredExpenses, trendModeSelect.value);
  }

  // Sort data
  function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
      let aVal = a[column], bVal = b[column];
      if (column === 'amount') { aVal = parseFloat(aVal); bVal = parseFloat(bVal); }
      if (column === 'date') { aVal = new Date(aVal); bVal = new Date(bVal); }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Render transaction table
  function renderTransactionTable() {
    const selectedCategory = categoryFilter.value;
    const startDate = dateFilterStart.value ? new Date(dateFilterStart.value) : null;
    const endDate = dateFilterEnd.value ? new Date(dateFilterEnd.value) : null;
    
    let filteredExpenses = [...allExpenses];
    if (selectedCategory !== 'all') filteredExpenses = filteredExpenses.filter(exp => exp.category === selectedCategory);
    if (startDate || endDate) {
      filteredExpenses = filteredExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        if (startDate && endDate) return expDate >= startDate && expDate <= endDate;
        if (startDate) return expDate >= startDate;
        if (endDate) return expDate <= endDate;
        return true;
      });
    }
    
    const transactions = [
      ...filteredExpenses.map(e => ({ ...e, type: 'Expense' })),
      ...allIncome.map(i => ({ ...i, type: 'Income' }))
    ];
    
    let displayData = transactionSortColumn ? sortData(transactions, transactionSortColumn, transactionSortDirection) : transactions;
    transactionTableBody.innerHTML = '';
    
    const shownBudgets = new Set();
    const today = new Date();
    const budgetsToDisplay = [];
    
    allBudgets.forEach(budget => {
      const budgetKey = `${budget.id}-${budget.start_date}`;
      const budgetEnd = new Date(budget.end_date);
      const isActive = budget.is_active === 1;
      const shouldShow = !isActive || today > budgetEnd || displayData.some(t => new Date(t.date) >= budgetEnd);
      
      if (shouldShow && !shownBudgets.has(budgetKey)) {
        budgetsToDisplay.push({
          budget,
          displayDate: !isActive ? budget.end_date : today > budgetEnd ? budget.end_date : displayData.find(t => new Date(t.date) >= budgetEnd)?.date || budget.end_date,
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
      let insertIndex = allRows.findIndex(t => new Date(t.date) < new Date(displayDate));
      if (insertIndex === -1) insertIndex = allRows.length;
      allRows.splice(insertIndex, 0, {
        isBudgetRow: true, budget, spent, percentage,
        isOver: spent > budget.amount, isActive, sortDate: displayDate
      });
    });
    
    allRows.forEach(row => {
      if (row.isBudgetRow) {
        const { budget, spent, percentage, isOver, isActive } = row;
        const tr = document.createElement('tr');
        tr.className = 'budget-row';
        tr.innerHTML = `<td colspan="6" style="${!isActive ? 'opacity: 0.7; font-style: italic;' : ''}">
            <strong>Budget Period ${!isActive ? 'ENDED' : 'End'}:</strong> ${budget.period} (${budget.start_date} to ${budget.end_date}) ${!isActive ? '(ENDED)' : ''} - ${budget.category} | 
            Budget: ₱${budget.amount.toFixed(2)} | Spent: ₱${spent.toFixed(2)} | 
            <span class="${isOver ? 'over-budget' : 'under-budget'}">${percentage.toFixed(1)}% used</span>
            <div class="progress-bar" style="display:inline-block; width: 200px; margin-left: 10px;">
              <div class="progress-fill ${isOver ? 'over' : ''}" style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
          </td>`;
        transactionTableBody.appendChild(tr);
      } else {
        const tr = document.createElement('tr');
        const isExpense = row.type === 'Expense';
        tr.innerHTML = `
          <td>${row.date}</td>
          <td><span style="color: ${isExpense ? '#e53935' : '#4caf50'}; font-weight: bold;">${row.type}</span></td>
          <td>₱${row.amount}</td>
          <td>${row.category}</td>
          <td>${row.description || '-'}</td>
          <td>
            <button class="edit-btn" onclick="${isExpense ? 'editExpense' : 'editIncome'}(${row.id})">Edit</button>
            <button class="delete-btn" onclick="${isExpense ? 'deleteExpense' : 'deleteIncome'}(${row.id})">Delete</button>
          </td>
        `;
        transactionTableBody.appendChild(tr);
      }
    });
  }

  // Calculate spending
  function calculateSpending(budget) {
    return allExpenses
      .filter(exp => exp.date >= budget.start_date && exp.date <= budget.end_date && 
                    (budget.category === 'all' || exp.category === budget.category))
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  }

  // Expense form submission
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.user_id = user.id;
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = editingExpenseId ? 'Updating...' : 'Adding...';

      const url = editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses';
      const method = editingExpenseId ? 'PUT' : 'POST';

      fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(res => res.ok ? res.json() : Promise.reject('Failed'))
        .then(() => {
          if (editingExpenseId) cancelEdit();
          else form.reset();
          loadExpenses();
        })
        .catch(err => alert('Failed to save expense.'))
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        });
    });
  }

  function editExpense(id) {
    const expense = allExpenses.find(exp => exp.id === id);
    if (!expense) return;
    form.querySelector('[name="date"]').value = expense.date;
    form.querySelector('[name="amount"]').value = expense.amount;
    form.querySelector('[name="category"]').value = expense.category;
    form.querySelector('[name="description"]').value = expense.description;
    form.querySelector('button[type="submit"]').textContent = 'Update';
    editingExpenseId = id;
    if (!document.getElementById('cancel-edit-btn')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.id = 'cancel-edit-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = cancelEdit;
      form.querySelector('button[type="submit"]').parentNode.appendChild(cancelBtn);
    }
    form.closest('.form-section').classList.remove('collapsed');
    form.closest('.form-section').scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEdit() {
    editingExpenseId = null;
    form.reset();
    form.querySelector('button[type="submit"]').textContent = 'Add';
    document.getElementById('cancel-edit-btn')?.remove();
  }

  function deleteExpense(id) {
    if (confirm('Delete this expense?')) {
      fetch(`/api/expenses/${id}`, { method: 'DELETE' })
        .then(res => res.ok ? loadExpenses() : Promise.reject('Failed'))
        .catch(err => alert('Failed to delete expense.'));
    }
  }

  // Income form submission
  if (incomeForm) {
    incomeForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(incomeForm).entries());
      data.user_id = user.id;
      const submitBtn = incomeForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = editingIncomeId ? 'Updating...' : 'Adding...';

      const url = editingIncomeId ? `/api/income/${editingIncomeId}` : '/api/income';
      const method = editingIncomeId ? 'PUT' : 'POST';

      fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(res => res.ok ? res.json() : Promise.reject('Failed'))
        .then(() => {
          if (editingIncomeId) cancelIncomeEdit();
          else incomeForm.reset();
          loadIncome();
        })
        .catch(err => alert('Failed to save income.'))
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        });
    });
  }

  function editIncome(id) {
    const income = allIncome.find(inc => inc.id === id);
    if (!income) return;
    incomeForm.querySelector('[name="date"]').value = income.date;
    incomeForm.querySelector('[name="amount"]').value = income.amount;
    incomeForm.querySelector('[name="category"]').value = income.category;
    incomeForm.querySelector('[name="description"]').value = income.description;
    incomeForm.querySelector('button[type="submit"]').textContent = 'Update Income';
    editingIncomeId = id;
    if (!document.getElementById('cancel-income-edit-btn')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.id = 'cancel-income-edit-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = cancelIncomeEdit;
      incomeForm.querySelector('button[type="submit"]').parentNode.appendChild(cancelBtn);
    }
    incomeForm.closest('.form-section').classList.remove('collapsed');
    incomeForm.closest('.form-section').scrollIntoView({ behavior: 'smooth' });
  }

  function cancelIncomeEdit() {
    editingIncomeId = null;
    incomeForm.reset();
    incomeForm.querySelector('button[type="submit"]').textContent = 'Add Income';
    document.getElementById('cancel-income-edit-btn')?.remove();
  }

  function deleteIncome(id) {
    if (confirm('Delete this income?')) {
      fetch(`/api/income/${id}`, { method: 'DELETE' })
        .then(res => res.ok ? loadIncome() : Promise.reject('Failed'))
        .catch(err => alert('Failed to delete income.'));
    }
  }

  // Budget form submission
  if (budgetForm) {
    budgetForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(budgetForm).entries());
      data.user_id = user.id;
      if (!data.start_date || !data.end_date) return alert('Please select dates.');
      if (data.end_date < data.start_date) return alert('End date cannot be before start date.');
      
      const submitBtn = budgetForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = editingBudgetId ? 'Updating...' : 'Setting...';

      const url = editingBudgetId ? `/api/budgets/${editingBudgetId}` : '/api/budgets';
      const method = editingBudgetId ? 'PUT' : 'POST';

      fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(res => res.ok ? res.json() : Promise.reject('Failed'))
        .then(() => {
          if (editingBudgetId) cancelBudgetEdit();
          else budgetForm.reset();
          loadBudgets();
        })
        .catch(err => alert('Failed to save budget.'))
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        });
    });
  }

  function editBudget(id) {
    const budget = allBudgets.find(b => b.id === id);
    if (!budget) return;
    budgetForm.querySelector('[name="period"]').value = budget.period;
    budgetForm.querySelector('[name="start_date"]').value = budget.start_date;
    budgetForm.querySelector('[name="end_date"]').value = budget.end_date;
    budgetForm.querySelector('[name="amount"]').value = budget.amount;
    budgetForm.querySelector('[name="category"]').value = budget.category;
    budgetForm.querySelector('button[type="submit"]').textContent = 'Update Budget';
    editingBudgetId = id;
    if (!document.getElementById('cancel-budget-edit-btn')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.id = 'cancel-budget-edit-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = cancelBudgetEdit;
      budgetForm.querySelector('button[type="submit"]').parentNode.appendChild(cancelBtn);
    }
    budgetForm.closest('.form-section').classList.remove('collapsed');
    budgetForm.closest('.form-section').scrollIntoView({ behavior: 'smooth' });
  }

  function cancelBudgetEdit() {
    editingBudgetId = null;
    budgetForm.reset();
    budgetForm.querySelector('button[type="submit"]').textContent = 'Set Budget';
    document.getElementById('cancel-budget-edit-btn')?.remove();
    const endDateField = budgetForm.querySelector('[name="end_date"]');
    endDateField.disabled = false;
    endDateField.style.opacity = '1';
    endDateField.style.cursor = 'default';
  }

  function deleteBudget(id) {
    if (confirm('Delete this budget?')) {
      fetch(`/api/budgets/${id}`, { method: 'DELETE' })
        .then(res => res.ok ? loadBudgets() : Promise.reject('Failed'))
        .catch(err => alert('Failed to delete budget.'));
    }
  }

  function endBudget(id) {
    if (confirm('End this budget period?')) {
      fetch(`/api/budgets/${id}/end`, { method: 'PUT' })
        .then(res => res.ok ? loadBudgets() : Promise.reject('Failed'))
        .catch(err => alert('Failed to end budget.'));
    }
  }

  // Render budget tracking
  function renderBudgetTracking(budgets) {
    const filterPeriod = document.getElementById('budget-period-filter').value;
    let filtered = filterPeriod !== 'all' ? budgets.filter(b => b.period === filterPeriod) : budgets;
    const today = new Date().toISOString().split('T')[0];
    const budgetsToEnd = filtered.filter(b => b.is_active && today > b.end_date).map(b => b.id);
    
    if (budgetsToEnd.length > 0) {
      Promise.all(budgetsToEnd.map(id => fetch(`/api/budgets/${id}/end`, { method: 'PUT' })))
        .then(() => loadBudgets())
        .catch(() => renderBudgetCards(filtered));
      return;
    }
    renderBudgetCards(filtered);
  }

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
      const div = document.createElement('div');
      div.className = 'budget-card';
      div.style.opacity = isActive ? '1' : '0.6';
      div.innerHTML = `
        <div class="budget-header">
          <h3>${budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget ${!isActive ? '(Ended)' : ''}</h3>
          <span>${budget.category}</span>
        </div>
        <div class="budget-dates">${budget.start_date} to ${budget.end_date}</div>
        <div class="budget-amounts">
          <div>Budget: ₱${budget.amount.toFixed(2)}</div>
          <div>Spent: ₱${spent.toFixed(2)}</div>
          <div class="${isOverBudget ? 'over-budget' : 'under-budget'}">Remaining: ₱${remaining.toFixed(2)}</div>
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
      budgetTracking.appendChild(div);
    });
  }

  // Update summary cards
  function updateSummaryCards(expenseData) {
    const totalExpenses = expenseData.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const totalIncome = allIncome.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const balance = totalIncome - totalExpenses;
    const monthGroups = {}, yearGroups = {}, dayGroups = {};
    expenseData.forEach(exp => {
      const month = exp.date.slice(0, 7), year = exp.date.slice(0, 4), day = exp.date;
      monthGroups[month] = (monthGroups[month] || 0) + parseFloat(exp.amount);
      yearGroups[year] = (yearGroups[year] || 0) + parseFloat(exp.amount);
      dayGroups[day] = (dayGroups[day] || 0) + parseFloat(exp.amount);
    });
    const monthlyAvg = Object.keys(monthGroups).length ? (totalExpenses / Object.keys(monthGroups).length).toFixed(2) : 0;
    const yearlyAvg = Object.keys(yearGroups).length ? (totalExpenses / Object.keys(yearGroups).length).toFixed(2) : 0;
    const dailyAvg = Object.keys(dayGroups).length ? (totalExpenses / Object.keys(dayGroups).length).toFixed(2) : 0;

    document.getElementById('summary-cards').innerHTML = `
      <div class="card balance-card ${balance >= 0 ? 'positive-balance' : 'negative-balance'}">Current Balance: ₱${balance.toFixed(2)}</div>
      <div class="card" id="income-card">Total Income: ₱${totalIncome.toFixed(2)}</div>
      <div class="card">Total Expenses: ₱${totalExpenses.toFixed(2)}</div>
      <div class="card">Income Entries: ${allIncome.length}</div>
      <div class="card">Expense Entries: ${expenseData.length}</div>
      <div class="card">Daily Avg: ₱${dailyAvg}</div>
      <div class="card">Monthly Avg: ₱${monthlyAvg}</div>
      <div class="card">Yearly Avg: ₱${yearlyAvg}</div>
    `;
  }

  // Chart rendering functions
  function renderChart(data, mode) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChartInstance) expenseChartInstance.destroy();
    let labels = [], totals = {}, yearLabel = '';

    if (mode === 'daily') {
      data.forEach(exp => totals[exp.date] = (totals[exp.date] || 0) + parseFloat(exp.amount));
      labels = Object.keys(totals).sort();
      const formattedLabels = labels.map(date => {
        const d = new Date(date + 'T00:00:00');
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      });
      if (labels.length) yearLabel = new Date(labels[0] + 'T00:00:00').getFullYear();
      expenseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: formattedLabels,
          datasets: [{ label: 'Daily Expenses', data: labels.map(l => totals[l]), backgroundColor: '#8b4513' }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Daily Expense Summary (${yearLabel})` },
            tooltip: { callbacks: { title: ctx => labels[ctx[0].dataIndex] } }
          },
          scales: {
            x: { title: { display: true, text: 'Date (MM/DD)' } },
            y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
          }
        }
      });
    } else if (mode === 'weekly') {
      data.forEach(exp => {
        const date = new Date(exp.date + 'T00:00:00');
        const weekNum = getWeekNumber(date);
        const weekLabel = `${date.getFullYear()}-W${weekNum}`;
        totals[weekLabel] = (totals[weekLabel] || 0) + parseFloat(exp.amount);
      });
      labels = Object.keys(totals).sort();
      const formattedLabels = labels.map(l => `W${l.split('-W')[1]}`);
      if (labels.length) yearLabel = labels[0].split('-')[0];
      expenseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: formattedLabels,
          datasets: [{ label: 'Weekly Expenses', data: labels.map(l => totals[l]), backgroundColor: '#8b4513' }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Weekly Expense Summary (${yearLabel})` },
            tooltip: { callbacks: { title: ctx => `Week ${labels[ctx[0].dataIndex].split('-W')[1]}, ${labels[ctx[0].dataIndex].split('-')[0]}` } }
          },
          scales: {
            x: { title: { display: true, text: 'Week Number' } },
            y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
          }
        }
      });
    } else {
      data.forEach(exp => {
        const month = exp.date.slice(0, 7);
        totals[month] = (totals[month] || 0) + parseFloat(exp.amount);
      });
      labels = Object.keys(totals).sort();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedLabels = labels.map(m => monthNames[parseInt(m.split('-')[1]) - 1]);
      if (labels.length) yearLabel = labels[0].split('-')[0];
      expenseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: formattedLabels,
          datasets: [{ label: 'Monthly Expenses', data: labels.map(l => totals[l]), backgroundColor: '#8b4513' }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Monthly Expense Summary (${yearLabel})` },
            tooltip: { callbacks: { title: ctx => {
              const [year, month] = labels[ctx[0].dataIndex].split('-');
              return `${monthNames[parseInt(month)-1]} ${year}`;
            }}}
          },
          scales: {
            x: { title: { display: true, text: 'Month' } },
            y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
          }
        }
      });
    }
  }

  function renderPieChart(data) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy();
    const categoryTotals = {};
    data.forEach(exp => categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount));
    const colors = ['#8b4513', '#a0522d', '#d2691e', '#cd853f', '#daa520', '#b8860b', '#f4a460', '#d2b48c', '#bc8f8f', '#cd5c5c'];
    pieChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(categoryTotals),
        datasets: [{ data: Object.values(categoryTotals), backgroundColor: colors }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'All Expenses by Category' } }
      }
    });
  }

  function renderTrendChart(data, mode) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();
    let labels = [], totals = {}, yearLabel = '';

    if (mode === 'daily') {
      data.forEach(exp => totals[exp.date] = (totals[exp.date] || 0) + parseFloat(exp.amount));
      labels = Object.keys(totals).sort();
      const formattedLabels = labels.map(date => {
        const d = new Date(date + 'T00:00:00');
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      });
      if (labels.length) yearLabel = new Date(labels[0] + 'T00:00:00').getFullYear();
      trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: formattedLabels,
          datasets: [{ label: 'Daily Expense Trend', data: labels.map(l => totals[l]), borderColor: '#8b4513', backgroundColor: 'rgba(139, 69, 19, 0.1)', tension: 0.4, fill: true }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Daily Expense Trend (${yearLabel})` },
            tooltip: { callbacks: { title: ctx => labels[ctx[0].dataIndex] } }
          },
          scales: {
            x: { title: { display: true, text: 'Date (MM/DD)' } },
            y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
          }
        }
      });
    } else if (mode === 'weekly') {
      data.forEach(exp => {
        const date = new Date(exp.date + 'T00:00:00');
        const weekNum = getWeekNumber(date);
        const weekLabel = `${date.getFullYear()}-W${weekNum}`;
        totals[weekLabel] = (totals[weekLabel] || 0) + parseFloat(exp.amount);
      });
      labels = Object.keys(totals).sort();
      const formattedLabels = labels.map(l => `W${l.split('-W')[1]}`);
      if (labels.length) yearLabel = labels[0].split('-')[0];
      trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: formattedLabels,
          datasets: [{ label: 'Weekly Expense Trend', data: labels.map(l => totals[l]), borderColor: '#8b4513', backgroundColor: 'rgba(139, 69, 19, 0.1)', tension: 0.4, fill: true }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Weekly Expense Trend (${yearLabel})` },
            tooltip: { callbacks: { title: ctx => `Week ${labels[ctx[0].dataIndex].split('-W')[1]}, ${labels[ctx[0].dataIndex].split('-')[0]}` } }
          },
          scales: {
            x: { title: { display: true, text: 'Week Number' } },
            y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
          }
        }
      });
    } else {
      data.forEach(exp => {
        const month = exp.date.slice(0, 7);
        totals[month] = (totals[month] || 0) + parseFloat(exp.amount);
      });
      labels = Object.keys(totals).sort();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedLabels = labels.map(m => monthNames[parseInt(m.split('-')[1]) - 1]);
      if (labels.length) yearLabel = labels[0].split('-')[0];
      trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: formattedLabels,
          datasets: [{ label: 'Monthly Expense Trend', data: labels.map(l => totals[l]), borderColor: '#8b4513', backgroundColor: 'rgba(139, 69, 19, 0.1)', tension: 0.4, fill: true }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Monthly Expense Trend (${yearLabel})` },
            tooltip: { callbacks: { title: ctx => {
              const [year, month] = labels[ctx[0].dataIndex].split('-');
              return `${monthNames[parseInt(month)-1]} ${year}`;
            }}}
          },
          scales: {
            x: { title: { display: true, text: 'Month' } },
            y: { title: { display: true, text: 'Amount (₱)' }, beginAtZero: true }
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

  // Setup functions
  function setupTableSorting() {
    document.querySelectorAll('.sortable').forEach(header => {
      header.addEventListener('click', () => {
        const column = header.getAttribute('data-sort');
        if (transactionSortColumn === column) {
          transactionSortDirection = transactionSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          transactionSortColumn = column;
          transactionSortDirection = 'asc';
        }
        document.querySelectorAll('.sortable').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        header.classList.add(`sort-${transactionSortDirection}`);
        renderTransactionTable();
      });
    });
  }

  function setupMobileMenu() {
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '☰';
    menuToggle.setAttribute('aria-label', 'Toggle menu');
    document.body.insertBefore(menuToggle, document.body.firstChild);

    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay';
    document.body.appendChild(sidebarOverlay);

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      sidebarOverlay.classList.toggle('active');
      document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });

    document.querySelectorAll('.sidebar button').forEach(button => {
      button.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('active');
          sidebarOverlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

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
  }

  function setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        if (targetTab === 'charts') updateChartsWithFilteredData();
      });
    });
  }

  function setupCollapsibleForms() {
    document.querySelectorAll('.form-section h2').forEach(header => {
      header.addEventListener('click', () => header.parentElement.classList.toggle('collapsed'));
    });
  }

  function setupBudgetPanel() {
    const budgetPanel = document.getElementById('budget-panel');
    const toggleBudgetBtn = document.getElementById('toggle-budget-btn');
    const closeBudgetBtn = document.getElementById('close-budget-btn');
    const budgetPeriodFilter = document.getElementById('budget-period-filter');

    if (toggleBudgetBtn) {
      toggleBudgetBtn.addEventListener('click', () => {
        budgetPanel.classList.toggle('hidden');
        toggleBudgetBtn.textContent = budgetPanel.classList.contains('hidden') ? 'Show Budget' : 'Hide Budget';
      });
    }

    if (closeBudgetBtn) {
      closeBudgetBtn.addEventListener('click', () => {
        budgetPanel.classList.add('hidden');
        toggleBudgetBtn.textContent = 'Show Budget';
      });
    }

    if (budgetPeriodFilter) {
      budgetPeriodFilter.addEventListener('change', () => renderBudgetTracking(allBudgets));
    }
  }

  function setupDateFilters() {
    if (applyDateFilterBtn) applyDateFilterBtn.addEventListener('click', applyFilters);
    if (clearDateFilterBtn) {
      clearDateFilterBtn.addEventListener('click', () => {
        dateFilterStart.value = '';
        dateFilterEnd.value = '';
        applyFilters();
      });
    }
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
  }

  function setupChartControls() {
    if (chartModeSelect) chartModeSelect.addEventListener('change', () => updateChartsWithFilteredData());
    if (barCategoryFilter) barCategoryFilter.addEventListener('change', () => updateChartsWithFilteredData());
    if (trendModeSelect) trendModeSelect.addEventListener('change', () => updateChartsWithFilteredData());
  }

  function setupBudgetAutoCalculation() {
    const startDateInput = budgetForm.querySelector('input[name="start_date"]');
    const endDateInput = budgetForm.querySelector('input[name="end_date"]');
    const budgetPeriodSelect = document.getElementById('budget-period');

    if (!startDateInput || !endDateInput || !budgetPeriodSelect) return;

    startDateInput.placeholder = 'Start Date';
    endDateInput.placeholder = 'End Date';

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
      updateEndDate();
    });

    const updateEndDate = () => {
      if (!startDateInput.value) return;
      const period = budgetPeriodSelect.value;
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

    startDateInput.addEventListener('change', updateEndDate);
  }

  function setupDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', function () {
        document.body.classList.toggle('dark-mode');
      });
    }
  }

  function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '/';
      });
    }
  }

  // Initialize everything
  loadCategories();
  loadIncome();
  loadExpenses();
  setupTableSorting();
  setupMobileMenu();
  setupTabNavigation();
  setupCollapsibleForms();
  setupBudgetPanel();
  setupDateFilters();
  setupChartControls();
  setupBudgetAutoCalculation();
  setupDarkMode();
  setupLogout();
  
  console.log('App initialized successfully!');
}