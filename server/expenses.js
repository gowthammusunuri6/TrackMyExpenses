// ==========================================
// EXPENSE ROUTES
// Handles expense CRUD operations
// ==========================================

const express = require('express');
const router = express.Router();
const excel = require('./excel');

// ==========================================
// GET ALL EXPENSES FOR A USER
// ==========================================

router.get('/expenses/:userId', (req, res) => {
    try {
        const expenses = excel.getExpensesByUserId(req.params.userId);

        // Format expenses for frontend
        const formattedExpenses = expenses.map(expense => ({
            id: expense.ID,
            userId: expense['User ID'],
            amount: expense.Amount,
            category: expense.Category,
            date: expense.Date,
            paymentMode: expense['Payment Mode'],
            notes: expense.Notes,
            createdAt: expense['Created At']
        }));

        res.json({ expenses: formattedExpenses });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Error fetching expenses' });
    }
});

// ==========================================
// ADD NEW EXPENSE
// ==========================================

router.post('/expenses', (req, res) => {
    try {
        const { userId, amount, category, date, paymentMode, notes } = req.body;

        // Validation
        if (!userId || !amount || !category || !date || !paymentMode) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        const newExpense = excel.addExpense({
            userId,
            amount: parseFloat(amount),
            category,
            date,
            paymentMode,
            notes: notes || ''
        });

        res.status(201).json({
            message: 'Expense added successfully',
            expense: {
                id: newExpense.ID,
                userId: newExpense['User ID'],
                amount: newExpense.Amount,
                category: newExpense.Category,
                date: newExpense.Date,
                paymentMode: newExpense['Payment Mode'],
                notes: newExpense.Notes,
                createdAt: newExpense['Created At']
            }
        });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).json({ message: 'Error adding expense' });
    }
});

// ==========================================
// UPDATE EXPENSE
// ==========================================

router.put('/expenses/:expenseId', (req, res) => {
    try {
        const { amount, category, date, paymentMode, notes } = req.body;
        const updateData = {};

        if (amount) updateData.Amount = parseFloat(amount);
        if (category) updateData.Category = category;
        if (date) updateData.Date = date;
        if (paymentMode) updateData['Payment Mode'] = paymentMode;
        if (notes !== undefined) updateData.Notes = notes;

        const updatedExpense = excel.updateExpense(req.params.expenseId, updateData);

        if (updatedExpense) {
            res.json({
                message: 'Expense updated successfully',
                expense: {
                    id: updatedExpense.ID,
                    userId: updatedExpense['User ID'],
                    amount: updatedExpense.Amount,
                    category: updatedExpense.Category,
                    date: updatedExpense.Date,
                    paymentMode: updatedExpense['Payment Mode'],
                    notes: updatedExpense.Notes
                }
            });
        } else {
            res.status(404).json({ message: 'Expense not found' });
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ message: 'Error updating expense' });
    }
});

// ==========================================
// DELETE EXPENSE
// ==========================================

router.delete('/expenses/:expenseId', (req, res) => {
    try {
        const success = excel.deleteExpense(req.params.expenseId);

        if (success) {
            res.json({ message: 'Expense deleted successfully' });
        } else {
            res.status(404).json({ message: 'Expense not found' });
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Error deleting expense' });
    }
});

// ==========================================
// GET EXPENSES BY DATE RANGE
// ==========================================

router.get('/expenses/:userId/range', (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let expenses = excel.getExpensesByUserId(req.params.userId);

        if (startDate && endDate) {
            expenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.Date);
                return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
            });
        }

        const formattedExpenses = expenses.map(expense => ({
            id: expense.ID,
            userId: expense['User ID'],
            amount: expense.Amount,
            category: expense.Category,
            date: expense.Date,
            paymentMode: expense['Payment Mode'],
            notes: expense.Notes
        }));

        res.json({ expenses: formattedExpenses });
    } catch (error) {
        console.error('Error fetching expenses by range:', error);
        res.status(500).json({ message: 'Error fetching expenses' });
    }
});

module.exports = router;
