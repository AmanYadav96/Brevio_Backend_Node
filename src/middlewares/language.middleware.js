const errorMessages = {
  en: {
    // Authentication errors
    'Not authorized, no token': 'Not authorized, no token',
    'Not authorized': 'Not authorized',
    'User not found': 'User not found',
    'Not authorized, no user found': 'Not authorized, no user found',
    'Not authorized, insufficient permissions': 'Not authorized, insufficient permissions',
    'Invalid token. Please log in again.': 'Invalid token. Please log in again.',
    'Your token has expired. Please log in again.': 'Your token has expired. Please log in again.',
    
    // Validation errors
    'Validation Error': 'Validation Error',
    'Invalid request data structure': 'Invalid request data structure',
    'Server implementation error': 'Server implementation error',
    'Internal server error': 'Internal server error',
    
    // Generic messages
    'Success': 'Success',
    'Failed': 'Failed',
    'Not found': 'Not found',
    'Username is required to become a creator': 'Username is required to become a creator',
    'Username is already taken': 'Username is already taken',
    'Successfully upgraded to creator account': 'Successfully upgraded to creator account',
    'Failed to become a creator': 'Failed to become a creator',
    'Location verification failed': 'Location verification failed',
    'Only users from Spain can become creators': 'Only users from Spain can become creators',
    
    // Genre-related messages
    'Genre not found': 'Genre not found',
    'Invalid genre ID': 'Invalid genre ID',
    'Failed to fetch genres': 'Failed to fetch genres',
    'Failed to fetch genre': 'Failed to fetch genre',
    'Failed to create genre': 'Failed to create genre',
    'Failed to update genre': 'Failed to update genre',
    'Failed to delete genre': 'Failed to delete genre',
    'Genre deleted successfully': 'Genre deleted successfully'
  },
  es: {
    // Authentication errors
    'Not authorized, no token': 'No autorizado, no hay token',
    'Not authorized': 'No autorizado',
    'User not found': 'Usuario no encontrado',
    'Not authorized, no user found': 'No autorizado, no se encontró usuario',
    'Not authorized, insufficient permissions': 'No autorizado, permisos insuficientes',
    'Invalid token. Please log in again.': 'Token inválido. Por favor inicie sesión nuevamente.',
    'Your token has expired. Please log in again.': 'Su token ha expirado. Por favor inicie sesión nuevamente.',
    
    // Validation errors
    'Validation Error': 'Error de validación',
    'Invalid request data structure': 'Estructura de datos de solicitud inválida',
    'Server implementation error': 'Error de implementación del servidor',
    'Internal server error': 'Error interno del servidor',
    
    // Generic messages
    'Success': 'Éxito',
    'Failed': 'Fallido',
    'Not found': 'No encontrado',
    'Username is required to become a creator': 'Se requiere un nombre de usuario para convertirse en creador',
    'Username is already taken': 'El nombre de usuario ya está en uso',
    'Successfully upgraded to creator account': 'Actualizado con éxito a cuenta de creador',
    'Failed to become a creator': 'No se pudo convertir en creador',
    'Location verification failed': 'La verificación de ubicación falló',
    'Only users from Spain can become creators': 'Solo los usuarios de España pueden convertirse en creadores',
    
    // Genre-related messages
    'Genre not found': 'Género no encontrado',
    'Invalid genre ID': 'ID de género inválido',
    'Failed to fetch genres': 'Error al obtener géneros',
    'Failed to fetch genre': 'Error al obtener género',
    'Failed to create genre': 'Error al crear género',
    'Failed to update genre': 'Error al actualizar género',
    'Failed to delete genre': 'Error al eliminar género',
    'Genre deleted successfully': 'Género eliminado con éxito'
  }
};

/**
 * Middleware to check language parameter and set language for the request
 * Supports query parameter, request body, or Accept-Language header
 */
export const languageMiddleware = (req, res, next) => {
  // Check for language in query parameters, body, or Accept-Language header
  const lang = req.query.lang || req.body.lang || req.headers['accept-language'];
  
  // Default to English if no language specified or if language is not supported
  req.language = (lang === 'es') ? 'es' : 'en';
  
  // Add a translate helper function to the request object
  req.translate = (message) => {
    // If the message exists in our dictionary, return the translated version
    if (errorMessages[req.language] && errorMessages[req.language][message]) {
      return errorMessages[req.language][message];
    }
    // Otherwise return the original message
    return message;
  };
  
  // Continue to the next middleware
  next();
};