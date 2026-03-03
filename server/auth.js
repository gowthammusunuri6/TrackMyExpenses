// ==========================================
// AUTHENTICATION ROUTES
// Handles login, signup, and session management
// ==========================================

const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const excel = require('./excel');

// ==========================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ==========================================

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|svg/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// ==========================================
// SIGNUP ROUTE
// ==========================================

router.post('/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = excel.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = excel.addUser({
            fullName,
            email,
            password: hashedPassword,
            role: 'user'
        });

        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: newUser.ID,
                fullName: newUser['Full Name'],
                email: newUser.Email,
                role: newUser.Role
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating account' });
    }
});

// ==========================================
// LOGIN ROUTE
// ==========================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Find user
        const user = excel.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // For demo accounts, allow simple password or bcrypt
        let isValidPassword = false;

        // Check if it's a demo account with simple password
        if ((email === 'user@demo.com' && password === 'user123') ||
            (email === 'admin@demo.com' && password === 'admin123')) {
            isValidPassword = true;
        } else {
            // Compare hashed password
            isValidPassword = await bcrypt.compare(password, user.Password);
        }

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Set session
        req.session.userId = user.ID;
        req.session.userRole = user.Role;

        res.json({
            message: 'Login successful',
            user: {
                id: user.ID,
                fullName: user['Full Name'],
                email: user.Email,
                role: user.Role,
                budget: user.Budget
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// ==========================================
// LOGOUT ROUTE
// ==========================================

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// ==========================================
// BRANDING ROUTE
// ==========================================

router.get('/branding', (req, res) => {
    try {
        // In a real app, this would get user-specific branding
        // For now, return default or first user's branding
        const users = excel.readUsers();
        const user = users.find(u => u['Custom Logo'] || u['Custom Title']);

        res.json({
            logo: user ? user['Custom Logo'] : '/images/logo.png',
            title: user ? user['Custom Title'] : 'TrackMyExpenses'
        });
    } catch (error) {
        res.json({
            logo: '/images/logo.png',
            title: 'TrackMyExpenses'
        });
    }
});

// ==========================================
// UPDATE BRANDING (ADMIN ONLY)
// ==========================================

router.post('/branding', upload.single('logo'), (req, res) => {
    try {
        // Check if user is admin
        if (req.session.userRole !== 'admin') {
            return res.status(403).json({ message: 'Only administrators can update branding' });
        }

        const { userId, title } = req.body;
        const updateData = {};

        if (req.file) {
            updateData['Custom Logo'] = '/uploads/' + req.file.filename;
        }

        if (title) {
            updateData['Custom Title'] = title;
        }

        const updatedUser = excel.updateUser(userId, updateData);

        if (updatedUser) {
            res.json({
                message: 'Branding updated successfully',
                logo: updatedUser['Custom Logo'],
                title: updatedUser['Custom Title']
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Branding update error:', error);
        res.status(500).json({ message: 'Error updating branding' });
    }
});

// ==========================================
// GET USER PROFILE
// ==========================================

router.get('/profile/:userId', (req, res) => {
    try {
        const user = excel.getUserById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.ID,
            fullName: user['Full Name'],
            email: user.Email,
            role: user.Role,
            budget: user.Budget,
            customLogo: user['Custom Logo'],
            customTitle: user['Custom Title'],
            createdAt: user['Created At']
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// ==========================================
// UPDATE USER PROFILE
// ==========================================

router.put('/profile/:userId', (req, res) => {
    try {
        // Users can only update their own profile, admins can update any profile
        // convert both sides to string in case one is number and the other is string
        const sessionId = String(req.session.userId);
        const targetId = String(req.params.userId);
        if (sessionId !== targetId && req.session.userRole !== 'admin') {
            return res.status(403).json({ message: 'You can only update your own profile' });
        }

        // accept both fullName and budget even if they are falsy values (Budget = 0)
        const { fullName, budget } = req.body;
        const updateData = {};

        if (typeof fullName !== 'undefined' && fullName !== null && fullName !== '') {
            updateData['Full Name'] = fullName;
        }
        if (typeof budget !== 'undefined' && budget !== null && budget !== '') {
            // store as number or string, excel module will keep it as provided
            updateData['Budget'] = budget;
        }

        const updatedUser = excel.updateUser(req.params.userId, updateData);

        if (updatedUser) {
            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.ID,
                    fullName: updatedUser['Full Name'],
                    email: updatedUser.Email,
                    budget: updatedUser.Budget
                }
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

module.exports = router;
