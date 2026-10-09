import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525'),
    auth: {
        user: process.env.SMTP_USER || 'placeholder',
        pass: process.env.SMTP_PASS || 'placeholder'
    }
});

export const sendOTP = async (to, otp) => {
    if (process.env.NODE_ENV === 'test') {
        global.__TEST_OTP__ = otp;
        return;
    }
    
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@example.com',
            to,
            subject: 'Your Registration OTP',
            text: `Your OTP for registration is: ${otp}. It will expire in 5 minutes.`
        });
    } catch (err) {
        console.error(`[Email] Failed to send email to ${to}: ${err.message}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV OTP BACKUP] Use this OTP for ${to}: ${otp}`);
            return; // Don't throw error in dev mode so testing can continue
        }
        throw { statusCode: 500, message: 'Failed to send OTP email' };
    }
};
