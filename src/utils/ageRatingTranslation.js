// Mapeo de calificaciones por edad a español
export const AgeRatingInSpanish = {
  "7+": "7+",
  "12+": "12+",
  "16+": "16+",
  "18+": "Mayores de 18",
  "All Ages": "Todas las edades"
};

/**
 * Traduce la calificación por edad de inglés a español
 * @param {string} rating - Calificación en inglés
 * @returns {string} Calificación traducida al español
 */
export const translateAgeRating = (rating) => {
  if (!rating) return "";
  
  // Devolver la traducción o el valor original si no existe en el mapeo
  return AgeRatingInSpanish[rating] || rating;
};