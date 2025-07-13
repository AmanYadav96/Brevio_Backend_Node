// Mapeo de tipos de contenido a español
export const ContentTypeInSpanish = {
  "shortFilm": "Cortometraje",
  "series": "Serie",
  "educational": "Educativo"
};

/**
 * Traduce el tipo de contenido de inglés a español
 * @param {string} contentType - Tipo de contenido en inglés
 * @returns {string} Tipo de contenido traducido al español
 */
export const translateContentType = (contentType) => {
  if (!contentType) return "";
  
  // Devolver la traducción o el valor original si no existe en el mapeo
  return ContentTypeInSpanish[contentType] || contentType;
};