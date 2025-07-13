/**
 * Determina el idioma preferido del usuario basado en el encabezado Accept-Language
 * @param {Object} req - Objeto de solicitud Express
 * @returns {string} Código de idioma ('es' o 'en')
 */
export const getPreferredLanguage = (req) => {
  // Obtener el encabezado Accept-Language
  const acceptLanguage = req.headers['accept-language'] || '';
  
  // Log para depuración
  console.log('Accept-Language header:', acceptLanguage);
  
  // Verificar si el español está entre los idiomas preferidos
  // Busca 'es' o 'es-XX' (como es-ES, es-MX, etc.)
  if (acceptLanguage.match(/^es\b|\bes\b|^es-[A-Z]{2}\b|\bes-[A-Z]{2}\b/i)) {
    console.log('Detected Spanish language preference');
    return 'es';
  }
  
  // Por defecto, devolver inglés
  console.log('Using default language: English');
  return 'en';
};

/**
 * Determina si se debe traducir al español basado en el encabezado Accept-Language
 * @param {Object} req - Objeto de solicitud Express
 * @returns {boolean} True si se debe traducir al español
 */
export const shouldTranslateToSpanish = (req) => {
  return getPreferredLanguage(req) === 'es';
};