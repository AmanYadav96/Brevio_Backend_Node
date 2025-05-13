/**
 * Creates a standardized error response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Optional additional error details
 * @returns {Object} Formatted error object
 */
export const createError = (statusCode, message, details = null) => {
  return {
    success: false,
    statusCode,
    message,
    ...(details && { details })
  }
}

/**
 * Creates a validation error response
 * @param {Object} errors - Validation errors object
 * @returns {Object} Formatted validation error
 */
export const createValidationError = (errors) => {
  return createError(400, 'Validation error', { errors })
}

/**
 * Creates an authentication error response
 * @param {string} message - Error message
 * @returns {Object} Formatted authentication error
 */
export const createAuthError = (message = 'Authentication required') => {
  return createError(401, message)
}

/**
 * Creates a forbidden error response
 * @param {string} message - Error message
 * @returns {Object} Formatted forbidden error
 */
export const createForbiddenError = (message = 'Access denied') => {
  return createError(403, message)
}

/**
 * Creates a not found error response
 * @param {string} resource - The resource that wasn't found
 * @returns {Object} Formatted not found error
 */
export const createNotFoundError = (resource = 'Resource') => {
  return createError(404, `${resource} not found`)
}