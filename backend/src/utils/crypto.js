import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

export const hashData = async (data) => {
    return await bcrypt.hash(data, 10);
};

export const verifyHash = async (data, hash) => {
    return await bcrypt.compare(data, hash);
};
