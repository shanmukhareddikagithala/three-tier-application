export const normalizeEmail = (email) => {
    if (!email || typeof email !== 'string') return null;
    let [localPart, domain] = email.trim().toLowerCase().split('@');
    if (!localPart || !domain) return null;
    return `${localPart}@${domain}`;
};

export const isValidPassword = (password) => {
    return typeof password === 'string' && password.length >= 8;
};
