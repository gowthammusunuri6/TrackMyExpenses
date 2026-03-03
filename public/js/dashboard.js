// ==========================================
// DASHBOARD JAVASCRIPT
// ==========================================

let currentUser = null;
let dashboardData = null;

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

document.addEventListener('DOMContentLoaded', function () {
    // Require authentication
    currentUser = requireAuth();
    if (!currentUser) return;

    // Load branding
    loadBranding();

    // Display user name if element exists
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = currentUser.fullName;
    }

    // Show admin panel link if user is admin
    if (currentUser.role === 'admin') {
        const adminNavLink = document.getElementById('adminNavLink');
        if (adminNavLink) {
            adminNavLink.innerHTML = '<a href="/admin.html" class="nav-link"><i class="fas fa-cog"></i><span>Admin Panel</span></a>';
        }
    }

    // Load dashboard data
    loadDashboardData();

    // Setup event listeners
    setupEventListeners();
});

// ==========================================
// LOAD DASHBOARD DATA
// ==========================================

async function loadDashboardData() {
    try {
        const response = await fetch(`/api/dashboard/${currentUser.id}`);
        const data = await response.json();

        dashboardData = data;

        // Update UI
        updateStats(data.summary);
        updateBudgetProgress(data.summary);
        renderAlerts(data.summary.overspending);
        renderCategoryChart(data.categoryTotals);
        renderTrendChart(data.monthlyTrends);
        renderSuggestions(data.suggestions);
        renderRecentTransactions(data.recentExpenses);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard data');
    }
}

// ==========================================
// UPDATE STATS CARDS
// ==========================================

function updateStats(summary) {
    // Animate number counting
    animateNumber('totalSpent', 0, parseFloat(summary.totalSpent), '₹');
    animateNumber('totalSavings', 0, parseFloat(summary.savings), '₹');
    animateNumber('totalBudget', 0, parseFloat(summary.budget), '₹');
    animateNumber('expenseCount', 0, summary.expenseCount, '');
}

function animateNumber(elementId, start, end, prefix = '') {
    const element = document.getElementById(elementId);
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = start + (end - start) * progress;
        element.textContent = prefix + current.toFixed(2);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ==========================================
// UPDATE BUDGET PROGRESS
// ==========================================

function updateBudgetProgress(summary) {
    const spent = parseFloat(summary.totalSpent);
    const budget = parseFloat(summary.budget);
    const percentage = Math.min((spent / budget) * 100, 100);

    const progressBar = document.getElementById('budgetProgressBar');

    // Set color based on percentage
    let gradient = 'var(--success-gradient)';
    if (percentage > 90) {
        gradient = 'var(--danger-gradient)';
    } else if (percentage > 75) {
        gradient = 'var(--warning-gradient)';
    }

    progressBar.style.background = gradient;

    // Animate width
    setTimeout(() => {
        progressBar.style.width = percentage + '%';
    }, 100);

    document.getElementById('budgetSpentLabel').textContent = `Spent: ₹${spent.toFixed(2)}`;
    document.getElementById('budgetRemainingLabel').textContent = `Remaining: ₹${(budget - spent).toFixed(2)}`;
}

// ==========================================
// RENDER ALERTS
// ==========================================

function renderAlerts(overspending) {
    const container = document.getElementById('alertsContainer');
    container.innerHTML = '';

    if (overspending.isOverspending) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger animate-fade-in-up';
        alert.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>Overspending Alert!</strong> You've exceeded your budget by ₹${Math.abs(overspending.amount)}.
                Consider reviewing your expenses and cutting back on non-essential spending.
            </div>
        `;
        container.appendChild(alert);
    } else if (overspending.percentage > 90) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning animate-fade-in-up';
        alert.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div>
                <strong>Budget Warning!</strong> You've used ${overspending.percentage}% of your budget.
                Be mindful of your spending for the rest of the month.
            </div>
        `;
        container.appendChild(alert);
    }
}

// ==========================================
// RENDER CHARTS
// ==========================================

function renderCategoryChart(categoryTotals) {
    const categoryColors = {
        'Food': '#ff6b6b',
        'Travel': '#4facfe',
        'Shopping': '#f093fb',
        'Bills': '#764ba2',
        'Entertainment': '#fee140',
        'Health': '#00f2fe',
        'Education': '#667eea',
        'Other': '#a0aec0'
    };

    const columns = Object.entries(categoryTotals).map(([category, amount]) => [category, amount]);

    if (columns.length === 0) {
        document.getElementById('categoryChart').innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No expenses yet</p>';
        return;
    }

    c3.generate({
        bindto: '#categoryChart',
        data: {
            columns: columns,
            type: 'donut',
            colors: categoryColors
        },
        donut: {
            title: 'Expenses',
            label: {
                format: function (value, ratio, id) {
                    return '₹' + value.toFixed(0);
                }
            }
        },
        legend: {
            position: 'bottom'
        }
    });
}

function renderTrendChart(monthlyTrends) {
    const months = Object.keys(monthlyTrends).sort().reverse().slice(0, 6).reverse();
    const amounts = months.map(month => monthlyTrends[month]);

    if (months.length === 0) {
        document.getElementById('trendChart').innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No data yet</p>';
        return;
    }

    const data = ['Spending', ...amounts];
    const categories = months.map(m => {
        const date = new Date(m + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    c3.generate({
        bindto: '#trendChart',
        data: {
            columns: [data],
            type: 'area-spline',
            colors: {
                'Spending': '#667eea'
            }
        },
        axis: {
            x: {
                type: 'category',
                categories: categories
            },
            y: {
                tick: {
                    format: function (d) {
                        return '₹' + d.toFixed(0);
                    }
                }
            }
        },
        grid: {
            y: {
                show: true
            }
        },
        point: {
            r: 4
        }
    });
}

// ==========================================
// RENDER SUGGESTIONS
// ==========================================

function renderSuggestions(suggestions) {
    const container = document.getElementById('suggestionsContainer');
    container.innerHTML = '';

    if (!suggestions || suggestions.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No suggestions available</p>';
        return;
    }

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = `suggestion-item ${suggestion.type}`;
        item.innerHTML = `
            <i class="${suggestion.icon} suggestion-icon"></i>
            <p class="suggestion-text">${suggestion.message}</p>
        `;
        container.appendChild(item);
    });
}

// ==========================================
// RENDER RECENT TRANSACTIONS
// ==========================================

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    container.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No transactions yet</p>';
        return;
    }

    const categoryIcons = {
        'Food': 'fa-utensils',
        'Travel': 'fa-car',
        'Shopping': 'fa-shopping-bag',
        'Bills': 'fa-file-invoice',
        'Entertainment': 'fa-film',
        'Health': 'fa-heartbeat',
        'Education': 'fa-graduation-cap',
        'Other': 'fa-tag'
    };

    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';

        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        item.innerHTML = `
            <div class="transaction-left">
                <div class="transaction-icon category-${transaction.category.toLowerCase()}">
                    <i class="fas ${categoryIcons[transaction.category] || 'fa-tag'}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${transaction.category}</h4>
                    <p>${formattedDate} • ${transaction.paymentMode}</p>
                </div>
            </div>
            <div class="transaction-amount">-₹${parseFloat(transaction.amount).toFixed(2)}</div>
        `;

        container.appendChild(item);
    });
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function (e) {
        e.preventDefault();
        logout();
    });

    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
        });
    }
}
