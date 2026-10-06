export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format: ${err.value}`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate key error: resource already exists';
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[Error Handler]', err);
  }

  res.status(statusCode).json({
    error: message,
  });
}
