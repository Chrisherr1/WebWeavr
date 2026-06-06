export default function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return response.end();
  }
  const status = error.status || 500;
  const message = status === 500 ? 'Internal Server Error' : error.message;
  response.status(status).json({ error: message });
}
