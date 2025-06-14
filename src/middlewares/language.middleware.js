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
    'ID token is required': 'ID token is required',
    'Access token is required': 'Access token is required',
    'Invalid Facebook token': 'Invalid Facebook token',
    'Facebook login failed': 'Facebook login failed',
    'Invalid Apple token': 'Invalid Apple token',
    'Username is required for creators': 'Username is required for creators',
    'Invalid email or password': 'Invalid email or password',
    'User already exists with this email': 'User already exists with this email',
    
    // Validation errors
    'Validation Error': 'Validation Error',
    'Invalid request data structure': 'Invalid request data structure',
    'Server implementation error': 'Server implementation error',
    'Internal server error': 'Internal server error',
    'No content data provided': 'No content data provided',
    'Comment text is required': 'Comment text is required',
    'Missing required fields': 'Missing required fields',
    'Invalid contract type': 'Invalid contract type',
    'Signature is required': 'Signature is required',
    'No file IDs provided': 'No file IDs provided',
    
    // Permission errors
    'Only creators and admins can upload content': 'Only creators and admins can upload content',
    'Only creators can upload videos': 'Only creators can upload videos',
    'You don\'t have permission to modify this content': 'You don\'t have permission to modify this content',
    'You are not authorized to publish this video': 'You are not authorized to publish this video',
    'You are not authorized to update this video': 'You are not authorized to update this video',
    'You are not authorized to delete this video': 'You are not authorized to delete this video',
    'Not authorized to update this comment': 'Not authorized to update this comment',
    'Not authorized to delete this comment': 'Not authorized to delete this comment',
    'Not authorized to view this contract': 'Not authorized to view this contract',
    'Not authorized to sign this contract': 'Not authorized to sign this contract',
    'Not authorized to reject this contract': 'Not authorized to reject this contract',
    'Unauthorized access': 'Unauthorized access',
    
    // Content errors
    'Content not found': 'Content not found',
    'This operation is only valid for series content': 'This operation is only valid for series content',
    'This operation is only valid for educational content': 'This operation is only valid for educational content',
    'Season not found': 'Season not found',
    'Invalid content type': 'Invalid content type',
    'Saved content not found': 'Saved content not found',
    'Comment not found': 'Comment not found',
    'Invalid parent comment': 'Invalid parent comment',
    'Cannot reply to a reply': 'Cannot reply to a reply',
    
    // Contract errors
    'Contract not found': 'Contract not found',
    'Only draft contracts can be updated': 'Only draft contracts can be updated',
    'Only draft contracts can be sent': 'Only draft contracts can be sent',
    'Contract cannot be signed in its current state': 'Contract cannot be signed in its current state',
    'Contract cannot be rejected in its current state': 'Contract cannot be rejected in its current state',
    
    // Channel errors
    'Channel not found': 'Channel not found',
    'Failed to create channel': 'Failed to create channel',
    'Failed to fetch dashboard data': 'Failed to fetch dashboard data',
    'Failed to fetch channels': 'Failed to fetch channels',
    'Failed to fetch channel': 'Failed to fetch channel',
    'Failed to update channel': 'Failed to update channel',
    'Failed to delete channel': 'Failed to delete channel',
    'Failed to fetch channel stats': 'Failed to fetch channel stats',
    
    // Subscription errors
    'Subscription plan not found': 'Subscription plan not found',
    'Plan not found': 'Plan not found',
    'Invalid plan ID': 'Invalid plan ID',
    'Failed to create plan': 'Failed to create plan',
    'Failed to fetch plans': 'Failed to fetch plans',
    'Failed to fetch plan': 'Failed to fetch plan',
    'Failed to update plan': 'Failed to update plan',
    'Failed to delete plan': 'Failed to delete plan',
    
    // Video errors
    'Video not found': 'Video not found',
    'Failed to upload video': 'Failed to upload video',
    'Failed to publish video': 'Failed to publish video',
    'Failed to get videos': 'Failed to get videos',
    'Failed to get video': 'Failed to get video',
    'Failed to update video': 'Failed to update video',
    'Failed to delete video': 'Failed to delete video',
    
    // User errors
    'Failed to fetch users': 'Failed to fetch users',
    'User not authenticated': 'User not authenticated',
    'Failed to update profile': 'Failed to update profile',
    'Failed to fetch profile': 'Failed to fetch profile',
    'Failed to fetch user': 'Failed to fetch user',
    'Failed to update user': 'Failed to update user',
    'Failed to delete user': 'Failed to delete user',
    'Failed to fetch user statistics': 'Failed to fetch user statistics',
    'Failed to become a creator': 'Failed to become a creator',
    'Invalid creator ID': 'Invalid creator ID',
    'Creator not found': 'Creator not found',
    
    // Advertisement errors
    'Advertisement not found': 'Advertisement not found',
    'Failed to create advertisement': 'Failed to create advertisement',
    'Failed to fetch advertisements': 'Failed to fetch advertisements',
    'Failed to fetch advertisement': 'Failed to fetch advertisement',
    'Failed to update advertisement': 'Failed to update advertisement',
    'Failed to delete advertisement': 'Failed to delete advertisement',
    
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
    'Error creating comment': 'Error creating comment',
    'Invalid action. Use "block" or "unblock"': 'Invalid action. Use "block" or "unblock"',
    
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
    'ID token is required': 'Se requiere token de ID',
    'Access token is required': 'Se requiere token de acceso',
    'Invalid Facebook token': 'Token de Facebook inválido',
    'Facebook login failed': 'Error en inicio de sesión con Facebook',
    'Invalid Apple token': 'Token de Apple inválido',
    'Username is required for creators': 'Se requiere nombre de usuario para creadores',
    'Invalid email or password': 'Correo o contraseña inválidos',
    'User already exists with this email': 'Ya existe un usuario con este correo electrónico',
    
    // Validation errors
    'Validation Error': 'Error de validación',
    'Invalid request data structure': 'Estructura de datos de solicitud inválida',
    'Server implementation error': 'Error de implementación del servidor',
    'Internal server error': 'Error interno del servidor',
    'No content data provided': 'No se proporcionaron datos de contenido',
    'Comment text is required': 'Se requiere texto para el comentario',
    'Missing required fields': 'Faltan campos requeridos',
    'Invalid contract type': 'Tipo de contrato inválido',
    'Signature is required': 'Se requiere firma',
    'No file IDs provided': 'No se proporcionaron IDs de archivo',
    
    // Permission errors
    'Only creators and admins can upload content': 'Solo creadores y administradores pueden subir contenido',
    'Only creators can upload videos': 'Solo los creadores pueden subir videos',
    'You don\'t have permission to modify this content': 'No tienes permiso para modificar este contenido',
    'You are not authorized to publish this video': 'No estás autorizado para publicar este video',
    'You are not authorized to update this video': 'No estás autorizado para actualizar este video',
    'You are not authorized to delete this video': 'No estás autorizado para eliminar este video',
    'Not authorized to update this comment': 'No autorizado para actualizar este comentario',
    'Not authorized to delete this comment': 'No autorizado para eliminar este comentario',
    'Not authorized to view this contract': 'No autorizado para ver este contrato',
    'Not authorized to sign this contract': 'No autorizado para firmar este contrato',
    'Not authorized to reject this contract': 'No autorizado para rechazar este contrato',
    'Unauthorized access': 'Acceso no autorizado',
    
    // Content errors
    'Content not found': 'Contenido no encontrado',
    'This operation is only valid for series content': 'Esta operación solo es válida para contenido de series',
    'This operation is only valid for educational content': 'Esta operación solo es válida para contenido educativo',
    'Season not found': 'Temporada no encontrada',
    'Invalid content type': 'Tipo de contenido inválido',
    'Saved content not found': 'Contenido guardado no encontrado',
    'Comment not found': 'Comentario no encontrado',
    'Invalid parent comment': 'Comentario padre inválido',
    'Cannot reply to a reply': 'No se puede responder a una respuesta',
    
    // Contract errors
    'Contract not found': 'Contrato no encontrado',
    'Only draft contracts can be updated': 'Solo los contratos en borrador pueden ser actualizados',
    'Only draft contracts can be sent': 'Solo los contratos en borrador pueden ser enviados',
    'Contract cannot be signed in its current state': 'El contrato no puede ser firmado en su estado actual',
    'Contract cannot be rejected in its current state': 'El contrato no puede ser rechazado en su estado actual',
    
    // Channel errors
    'Channel not found': 'Canal no encontrado',
    'Failed to create channel': 'Error al crear canal',
    'Failed to fetch dashboard data': 'Error al obtener datos del panel',
    'Failed to fetch channels': 'Error al obtener canales',
    'Failed to fetch channel': 'Error al obtener canal',
    'Failed to update channel': 'Error al actualizar canal',
    'Failed to delete channel': 'Error al eliminar canal',
    'Failed to fetch channel stats': 'Error al obtener estadísticas del canal',
    
    // Subscription errors
    'Subscription plan not found': 'Plan de suscripción no encontrado',
    'Plan not found': 'Plan no encontrado',
    'Invalid plan ID': 'ID de plan inválido',
    'Failed to create plan': 'Error al crear plan',
    'Failed to fetch plans': 'Error al obtener planes',
    'Failed to fetch plan': 'Error al obtener plan',
    'Failed to update plan': 'Error al actualizar plan',
    'Failed to delete plan': 'Error al eliminar plan',
    
    // Video errors
    'Video not found': 'Video no encontrado',
    'Failed to upload video': 'Error al subir video',
    'Failed to publish video': 'Error al publicar video',
    'Failed to get videos': 'Error al obtener videos',
    'Failed to get video': 'Error al obtener video',
    'Failed to update video': 'Error al actualizar video',
    'Failed to delete video': 'Error al eliminar video',
    
    // User errors
    'Failed to fetch users': 'Error al obtener usuarios',
    'User not authenticated': 'Usuario no autenticado',
    'Failed to update profile': 'Error al actualizar perfil',
    'Failed to fetch profile': 'Error al obtener perfil',
    'Failed to fetch user': 'Error al obtener usuario',
    'Failed to update user': 'Error al actualizar usuario',
    'Failed to delete user': 'Error al eliminar usuario',
    'Failed to fetch user statistics': 'Error al obtener estadísticas de usuario',
    'Failed to become a creator': 'Error al convertirse en creador',
    'Invalid creator ID': 'ID de creador inválido',
    'Creator not found': 'Creador no encontrado',
    
    // Advertisement errors
    'Advertisement not found': 'Anuncio no encontrado',
    'Failed to create advertisement': 'Error al crear anuncio',
    'Failed to fetch advertisements': 'Error al obtener anuncios',
    'Failed to fetch advertisement': 'Error al obtener anuncio',
    'Failed to update advertisement': 'Error al actualizar anuncio',
    'Failed to delete advertisement': 'Error al eliminar anuncio',
    
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
    'Error creating comment': 'Error al crear comentario',
    'Invalid action. Use "block" or "unblock"': 'Acción inválida. Use "block" o "unblock"',
    
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
  
  // Improved language detection - check if the language code contains 'es'
  // This will match 'es', 'es-ES', 'es-MX', etc.
  req.language = (lang && lang.toLowerCase().includes('es')) ? 'es' : 'en';
  
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