import * as authService from '../services/authService.js';
import { normalizeEmail, isValidPassword } from '../utils/validation.js';

export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Valid name is required' });
        
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) return res.status(400).json({ error: 'Valid email is required' });
        
        if (!isValidPassword(password)) return res.status(400).json({ error: 'Password must be at least 8 characters' });

        await authService.initiateRegistration({ name, email: normalizedEmail, password });
        
        res.status(202).json({ message: 'OTP sent to email. Please verify to complete registration.' });
    } catch (err) {
        next(err);
    }
};

export const verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail || !otp || typeof otp !== 'string') {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        await authService.verifyRegistrationOTP({ email: normalizedEmail, otp });
        
        res.status(201).json({ message: 'Registration verified and successful' });
    } catch (err) {
        next(err);
    }
};

export const resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) return res.status(400).json({ error: 'Valid email is required' });

        await authService.resendRegistrationOTP({ email: normalizedEmail });
        
        res.status(202).json({ message: 'A new OTP has been sent' });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const { token, user } = await authService.loginUser(normalizedEmail, password);
        
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'strict' : 'lax',
            maxAge: 3600000 // 1 hour
        });
        
        res.json({ message: 'Login successful', user });
    } catch (err) {
        next(err);
    }
};

export const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
};

export const me = (req, res) => {
    const user = authService.getUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
};
