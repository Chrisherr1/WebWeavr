// Global error handler — catches any unhandled errors thrown in route handlers.
// Must be registered after all routes to intercept errors correctly.
export default (error, request, response, next) => {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  response.status(status).json({ error: message });
};
