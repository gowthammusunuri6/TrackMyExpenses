// ==========================================
// ANALYTICS ROUTES
// Provides insights, trends, and reports
// ==========================================

const express = require('express');
const router = express.Router();
const excel = require('./excel');

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateCategoryTotals(expenses) {
    const totals = {};
    expenses.forEach(expense => {
        const category = expense.Category;
        if (!totals[category]) {
            totals[category] = 0;
        }
        totals[category] += parseFloat(expense.Amount);
    });
    return totals;
}

function getMonthlyTrends(expenses, months = 6) {
    const trends = {};
    const now = new Date();

    for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
        trends[monthKey] = 0;
    }

    expenses.forEach(expense => {
        const monthKey = expense.Date.slice(0, 7);
        if (trends.hasOwnProperty(monthKey)) {
            trends[monthKey] += parseFloat(expense.Amount);
        }
    });

    return trends;
}

function checkOverspending(totalSpent, budget) {
    const percentage = (totalSpent / budget) * 100;
    return {
        isOverspending: totalSpent > budget,
        percentage: percentage.toFixed(2),
        amount: (totalSpent - budget).toFixed(2)
    };
}

function generateSuggestions(expenses, budget, categoryTotals) {
    const suggestions = [];
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.Amount), 0);
    const spendingRate = (totalSpent / budget) * 100;

    // Budget-based suggestions
    if (spendingRate > 90) {
        suggestions.push({
            type: 'warning',
            icon: 'fa-exclamation-triangle',
            message: `You've used ${spendingRate.toFixed(1)}% of your budget! Consider reducing expenses.`
        });
    } else if (spendingRate > 75) {
        suggestions.push({
            type: 'info',
            icon: 'fa-info-circle',
            message: `You've used ${spendingRate.toFixed(1)}% of your budget. Monitor your spending carefully.`
        });
    } else {
        suggestions.push({
            type: 'success',
            icon: 'fa-check-circle',
            message: `Great job! You've only used ${spendingRate.toFixed(1)}% of your budget.`
        });
    }

    // Category-based suggestions
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
        const topCategory = sortedCategories[0];
        const categoryPercent = ((topCategory[1] / totalSpent) * 100).toFixed(1);
        suggestions.push({
            type: 'info',
            icon: 'fa-chart-pie',
            message: `${topCategory[0]} is your biggest expense at ${categoryPercent}% of total spending.`
        });
    }

    // Savings suggestion
    const potentialSavings = budget - totalSpent;
    if (potentialSavings > 0) {
        suggestions.push({
            type: 'success',
            icon: 'fa-piggy-bank',
            message: `You could save ₹${potentialSavings.toFixed(2)} this month if you maintain current spending.`
        });
    }

    return suggestions;
}

// ==========================================
// GET DASHBOARD SUMMARY
// ==========================================

router.get('/dashboard/:userId', (req, res) => {
    try {
        const user = excel.getUserById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const expenses = excel.getExpensesByUserId(req.params.userId);
        const budget = parseFloat(user.Budget) || 50000;

        // Calculate totals
        const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.Amount), 0);
        const categoryTotals = calculateCategoryTotals(expenses);
        const monthlyTrends = getMonthlyTrends(expenses);
        const overspending = checkOverspending(totalSpent, budget);
        const suggestions = generateSuggestions(expenses, budget, categoryTotals);

        // Calculate savings (budget - spent)
        const savings = budget - totalSpent;

        res.json({
            summary: {
                totalSpent: totalSpent.toFixed(2),
                budget: budget.toFixed(2),
                savings: savings.toFixed(2),
                expenseCount: expenses.length,
                overspending
            },
            categoryTotals,
            monthlyTrends,
            suggestions,
            recentExpenses: expenses.slice(-5).reverse().map(expense => ({
                id: expense.ID,
                amount: expense.Amount,
                category: expense.Category,
                date: expense.Date,
                paymentMode: expense['Payment Mode']
            }))
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// ==========================================
// GET DETAILED ANALYTICS
// ==========================================

router.get('/analytics/:userId', (req, res) => {
    try {
        const expenses = excel.getExpensesByUserId(req.params.userId);
        const user = excel.getUserById(req.params.userId);
        const budget = parseFloat(user.Budget) || 50000;

        const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.Amount), 0);
        const categoryTotals = calculateCategoryTotals(expenses);
        const monthlyTrends = getMonthlyTrends(expenses, 12);

        // Payment mode analysis
        const paymentModes = {};
        expenses.forEach(expense => {
            const mode = expense['Payment Mode'];
            if (!paymentModes[mode]) {
                paymentModes[mode] = 0;
            }
            paymentModes[mode] += parseFloat(expense.Amount);
        });

        // Daily average
        const daysInMonth = 30;
        const dailyAverage = totalSpent / daysInMonth;

        // Category trends (month over month)
        const currentMonth = new Date().toISOString().slice(0, 7);
        const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

        const currentMonthExpenses = expenses.filter(e => e.Date.startsWith(currentMonth));
        const lastMonthExpenses = expenses.filter(e => e.Date.startsWith(lastMonth));

        const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + parseFloat(e.Amount), 0);
        const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + parseFloat(e.Amount), 0);

        const trendPercentage = lastMonthTotal > 0
            ? (((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(2)
            : 0;

        res.json({
            totalSpent: totalSpent.toFixed(2),
            budget: budget.toFixed(2),
            categoryTotals,
            monthlyTrends,
            paymentModes,
            dailyAverage: dailyAverage.toFixed(2),
            monthOverMonth: {
                current: currentMonthTotal.toFixed(2),
                previous: lastMonthTotal.toFixed(2),
                change: trendPercentage,
                isIncrease: currentMonthTotal > lastMonthTotal
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});

// ==========================================
// ADMIN: GET ALL USERS ANALYTICS
// ==========================================

router.get('/admin/analytics', (req, res) => {
    try {
        const users = excel.readUsers();
        const allExpenses = excel.readExpenses();

        const userAnalytics = users.map(user => {
            const userExpenses = allExpenses.filter(e => e['User ID'] == user.ID);
            const totalSpent = userExpenses.reduce((sum, e) => sum + parseFloat(e.Amount), 0);
            const budget = parseFloat(user.Budget) || 50000;

            return {
                id: user.ID,
                name: user['Full Name'],
                email: user.Email,
                totalSpent: totalSpent.toFixed(2),
                budget: budget.toFixed(2),
                expenseCount: userExpenses.length,
                isOverspending: totalSpent > budget,
                overspendingAmount: Math.max(0, totalSpent - budget).toFixed(2)
            };
        });

        // Overall statistics
        const totalUsers = users.length;
        const totalExpenses = allExpenses.length;
        const totalAmount = allExpenses.reduce((sum, e) => sum + parseFloat(e.Amount), 0);
        const overspendingUsers = userAnalytics.filter(u => u.isOverspending).length;

        res.json({
            statistics: {
                totalUsers,
                totalExpenses,
                totalAmount: totalAmount.toFixed(2),
                overspendingUsers
            },
            userAnalytics
        });
    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
});

// ==========================================
// EXPORT EXPENSES TO EXCEL (Admin)
// ==========================================

router.get('/admin/export', (req, res) => {
    try {
        const { userId } = req.query;

        if (userId) {
            res.download(excel.EXPENSES_FILE, `user-${userId}-expenses.xlsx`);
        } else {
            res.download(excel.EXPENSES_FILE, 'all-expenses.xlsx');
        }
    } catch (error) {
        console.error('Error exporting expenses:', error);
        res.status(500).json({ message: 'Error exporting data' });
    }
});

module.exports = router;
