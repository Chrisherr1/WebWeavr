export default function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return response.end();
  }
  const status = error.status || 500;
  let message;
  if (status === 500) {
    message = 'Internal Server Error';
  } else {
    message = error.message;
  }
  response.status(status).json({ error: message });
}
