// Mapeo de estados de contenido a español
export const ContentStatusInSpanish = {
  draft: "borrador",
  processing: "En revisión",
  published: "publicado",
  rejected: "rechazado",
  archived: "archivado",
  reviewed: "revisado"
};

/**
 * Traduce el estado del contenido de inglés a español
 * @param {string} status - Estado en inglés
 * @returns {string} Estado traducido al español
 */
export const translateContentStatus = (status) => {
  if (!status) return "";
  
  // Normalizar el estado a minúsculas para una comparación insensible a mayúsculas/minúsculas
  const normalizedStatus = status.toLowerCase();
  
  // Usar el mapeo en español o devolver el estado original si no existe en el mapeo
  return ContentStatusInSpanish[normalizedStatus] || 
         ContentStatusInSpanish[Object.keys(ContentStatusInSpanish).find(key => key.toLowerCase() === normalizedStatus)] ||
         status;
};