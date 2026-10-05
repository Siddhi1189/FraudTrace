export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[Error Handler]', err);
  }

  res.status(statusCode).json({
    error: message,
  });
}
