import logger from '../config/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
    body: req.body,
    userId: req.user?._id
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`
  });
}

export default { errorHandler, notFound };
