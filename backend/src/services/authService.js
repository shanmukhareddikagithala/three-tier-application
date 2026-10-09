import { redisClient } from '../config/redis.js';
import { getDb } from '../config/db.js';
import { generateOTP, hashData, verifyHash } from '../utils/crypto.js';
import { sendOTP } from './emailService.js';
import jwt from 'jsonwebtoken';

const OTP_TTL = 300; // 5 mins
const REGISTRATION_TTL = 600; // 10 mins
const RESEND_COOLDOWN = 60; // 60 seconds
const MAX_ATTEMPTS = 5;

export const initiateRegistration = async ({ name, email, password }) => {
    const db = getDb();
    
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
        throw { statusCode: 409, message: 'Email already registered' };
    }

    const hashedPassword = await hashData(password);
    const otp = generateOTP();
    const hashedOtp = await hashData(otp);

    const pipeline = redisClient.pipeline();
    pipeline.set(`pending:${email}`, JSON.stringify({ name, email, password: hashedPassword }), 'EX', REGISTRATION_TTL);
    pipeline.set(`otp:${email}`, hashedOtp, 'EX', OTP_TTL);
    pipeline.set(`otp_attempts:${email}`, 0, 'EX', OTP_TTL);
    pipeline.set(`cooldown:${email}`, '1', 'EX', RESEND_COOLDOWN);
    
    await pipeline.exec();
    await sendOTP(email, otp);
};

export const verifyRegistrationOTP = async ({ email, otp }) => {
    const hashedOtp = await redisClient.get(`otp:${email}`);
    if (!hashedOtp) {
        throw { statusCode: 400, message: 'OTP expired or not found' };
    }

    const attempts = await redisClient.incr(`otp_attempts:${email}`);
    // If incr created the key because it just expired, give it a short TTL to prevent leaks
    if (attempts === 1) {
        await redisClient.expire(`otp_attempts:${email}`, OTP_TTL);
    }
    
    if (attempts > MAX_ATTEMPTS) {
        await redisClient.del(`pending:${email}`, `otp:${email}`, `otp_attempts:${email}`, `cooldown:${email}`);
        throw { statusCode: 400, message: 'Too many failed attempts. Please register again.' };
    }

    const isValid = await verifyHash(otp, hashedOtp);
    if (!isValid) {
        throw { statusCode: 400, message: 'Invalid OTP' };
    }

    const pendingData = await redisClient.get(`pending:${email}`);
    if (!pendingData) {
        throw { statusCode: 400, message: 'Registration data expired' };
    }

    const { name, password } = JSON.parse(pendingData);
    const db = getDb();
    
    try {
        db.prepare('INSERT INTO users (name, email, password, is_verified) VALUES (?, ?, ?, 1)')
          .run(name, email, password);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw { statusCode: 409, message: 'Email already registered' };
        }
        throw err;
    }

    await redisClient.del(`pending:${email}`, `otp:${email}`, `otp_attempts:${email}`, `cooldown:${email}`);
};

export const resendRegistrationOTP = async ({ email }) => {
    const pendingData = await redisClient.get(`pending:${email}`);
    if (!pendingData) {
        throw { statusCode: 400, message: 'No pending registration found' };
    }

    const cooldown = await redisClient.get(`cooldown:${email}`);
    if (cooldown) {
        throw { statusCode: 429, message: 'Please wait before requesting a new OTP' };
    }

    const otp = generateOTP();
    const hashedOtp = await hashData(otp);

    const pipeline = redisClient.pipeline();
    // Refresh pending data TTL so it outlives the new OTP
    pipeline.expire(`pending:${email}`, REGISTRATION_TTL);
    pipeline.set(`otp:${email}`, hashedOtp, 'EX', OTP_TTL);
    pipeline.set(`otp_attempts:${email}`, 0, 'EX', OTP_TTL);
    pipeline.set(`cooldown:${email}`, '1', 'EX', RESEND_COOLDOWN);
    
    await pipeline.exec();
    await sendOTP(email, otp);
};

export const loginUser = async (email, password) => {
    const db = getDb();
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (user.is_verified !== 1) {
        throw { statusCode: 403, message: 'Please verify your email before logging in' };
    }

    const isValid = await verifyHash(password, user.password);
    if (!isValid) {
        throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'super_secret_jwt_key_do_not_hardcode',
        { expiresIn: '1h' }
    );

    return { 
        token, 
        user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            is_verified: user.is_verified 
        } 
    };
};

export const getUserById = (id) => {
    const db = getDb();
    return db.prepare('SELECT id, name, email, is_verified FROM users WHERE id = ?').get(id);
};
