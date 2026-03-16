
//It captures errors that occur during request processing and sends a standardized JSON response with the error message and appropriate HTTP status code. 

//This middleware should be added after all other routes and middleware to ensure it catches any unhandled errors.

//Prevents the application from crashing due to unhandled errors and provides a consistent error response format for clients.

export default (error, request,response,next) => {
    const status = error.status || 500; // Default to 500 Internal Server Error if no status is provided
    const message = error.message || 'Internal Server Error'; // Default message for 500 errors
    
    // Log the error for debugging purposes (optional)
    console.error(error);
};
