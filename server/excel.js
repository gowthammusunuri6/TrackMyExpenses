// ==========================================
// EXCEL OPERATIONS MODULE
// Handles reading and writing to Excel files
// ==========================================

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const USERS_FILE = path.join(DATA_DIR, 'users.xlsx');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.xlsx');

// ==========================================
// INITIALIZE FILES IF THEY DON'T EXIST
// ==========================================

function initializeFiles() {
    // Initialize users file
    if (!fs.existsSync(USERS_FILE)) {
        const usersWorkbook = XLSX.utils.book_new();
        const usersData = [
            ['ID', 'Full Name', 'Email', 'Password', 'Role', 'Created At', 'Budget', 'Custom Logo', 'Custom Title'],
            ['1', 'Demo User', 'user@demo.com', '$2b$10$rQZ5Y9qZGvIzQJJ8vJ0YZek.OqZkqZkqZkqZkqZkqZkqZkqZkqZkq', 'user', new Date().toISOString(), '50000', '', ''],
            ['2', 'Admin User', 'admin@demo.com', '$2b$10$rQZ5Y9qZGvIzQJJ8vJ0YZek.OqZkqZkqZkqZkqZkqZkqZkqZkqZkq', 'admin', new Date().toISOString(), '100000', '', '']
        ];
        const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
        XLSX.utils.book_append_sheet(usersWorkbook, usersSheet, 'Users');
        XLSX.writeFile(usersWorkbook, USERS_FILE);
    }

    // Initialize expenses file
    if (!fs.existsSync(EXPENSES_FILE)) {
        const expensesWorkbook = XLSX.utils.book_new();
        const expensesData = [
            ['ID', 'User ID', 'Amount', 'Category', 'Date', 'Payment Mode', 'Notes', 'Created At']
        ];
        const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(expensesWorkbook, expensesSheet, 'Expenses');
        XLSX.writeFile(expensesWorkbook, EXPENSES_FILE);
    }
}

// Initialize files on module load
initializeFiles();

// ==========================================
// READ OPERATIONS
// ==========================================

function readUsers() {
    try {
        const workbook = XLSX.readFile(USERS_FILE);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        return data;
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

function readExpenses() {
    try {
        const workbook = XLSX.readFile(EXPENSES_FILE);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        return data;
    } catch (error) {
        console.error('Error reading expenses:', error);
        return [];
    }
}

function getUserByEmail(email) {
    const users = readUsers();
    return users.find(user => user.Email === email);
}

function getUserById(id) {
    const users = readUsers();
    return users.find(user => user.ID == id);
}

function getExpensesByUserId(userId) {
    const expenses = readExpenses();
    return expenses.filter(expense => expense['User ID'] == userId);
}

// ==========================================
// WRITE OPERATIONS
// ==========================================

function writeUsers(users) {
    try {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(users);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
        XLSX.writeFile(workbook, USERS_FILE);
        return true;
    } catch (error) {
        console.error('Error writing users:', error);
        return false;
    }
}

function writeExpenses(expenses) {
    try {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(expenses);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
        XLSX.writeFile(workbook, EXPENSES_FILE);
        return true;
    } catch (error) {
        console.error('Error writing expenses:', error);
        return false;
    }
}

function addUser(user) {
    const users = readUsers();
    const newId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.ID) || 0)) + 1 : 1;

    const newUser = {
        'ID': newId,
        'Full Name': user.fullName,
        'Email': user.email,
        'Password': user.password,
        'Role': user.role || 'user',
        'Created At': new Date().toISOString(),
        'Budget': user.budget || 50000,
        'Custom Logo': user.customLogo || '',
        'Custom Title': user.customTitle || ''
    };

    users.push(newUser);
    writeUsers(users);
    return newUser;
}

function addExpense(expense) {
    const expenses = readExpenses();
    const newId = expenses.length > 0 ? Math.max(...expenses.map(e => parseInt(e.ID) || 0)) + 1 : 1;

    const newExpense = {
        'ID': newId,
        'User ID': expense.userId,
        'Amount': expense.amount,
        'Category': expense.category,
        'Date': expense.date,
        'Payment Mode': expense.paymentMode,
        'Notes': expense.notes || '',
        'Created At': new Date().toISOString()
    };

    expenses.push(newExpense);
    writeExpenses(expenses);
    return newExpense;
}

function updateExpense(expenseId, updatedData) {
    const expenses = readExpenses();
    const index = expenses.findIndex(e => e.ID == expenseId);

    if (index !== -1) {
        expenses[index] = { ...expenses[index], ...updatedData };
        writeExpenses(expenses);
        return expenses[index];
    }
    return null;
}

function deleteExpense(expenseId) {
    const expenses = readExpenses();
    const filtered = expenses.filter(e => e.ID != expenseId);

    if (filtered.length < expenses.length) {
        writeExpenses(filtered);
        return true;
    }
    return false;
}

function updateUser(userId, updatedData) {
    const users = readUsers();
    const index = users.findIndex(u => u.ID == userId);

    if (index !== -1) {
        users[index] = { ...users[index], ...updatedData };
        writeUsers(users);
        return users[index];
    }
    return null;
}

// ==========================================
// EXPORT OPERATIONS
// ==========================================

function exportExpensesToExcel(userId = null) {
    let expenses = readExpenses();

    if (userId) {
        expenses = expenses.filter(e => e['User ID'] == userId);
    }

    return expenses;
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    readUsers,
    readExpenses,
    getUserByEmail,
    getUserById,
    getExpensesByUserId,
    writeUsers,
    writeExpenses,
    addUser,
    addExpense,
    updateExpense,
    deleteExpense,
    updateUser,
    exportExpensesToExcel,
    USERS_FILE,
    EXPENSES_FILE
};
