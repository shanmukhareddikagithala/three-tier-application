export const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    const status = err.statusCode || 500;
    const response = {
        error: err.message || 'Internal Server Error'
    };

    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        response.stack = err.stack;
    }

    res.status(status).json(response);
};
