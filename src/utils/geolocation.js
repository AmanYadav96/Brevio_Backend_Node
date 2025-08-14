import geoip from 'geoip-lite';

/**
 * Get country from IP address
 * @param {string} ip - IP address
 * @returns {string|null} - Country code or null if not found
 */
export const getCountryFromIp = (ip) => {
  if (!ip) {
    console.log('No IP address provided');
    return process.env.NODE_ENV === 'development' ? 'ES' : null;
  }
  
  // Remove IPv6 prefix if present
  const cleanIp = ip.replace(/^::ffff:/, '');
  console.log('Cleaned IP for geolocation:', cleanIp);
  
  // Skip for localhost/development IPs
  if (cleanIp === '127.0.0.1' || cleanIp === 'localhost' || cleanIp === '::1' || 
      cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || 
      cleanIp.startsWith('172.16.') || cleanIp.startsWith('172.17.') || 
      cleanIp.startsWith('172.18.') || cleanIp.startsWith('172.19.') || 
      cleanIp.startsWith('172.2') || cleanIp.startsWith('172.30.') || 
      cleanIp.startsWith('172.31.')) {
    console.log('Development IP detected, skipping country check');
    return process.env.NODE_ENV === 'development' ? 'ES' : null;
  }
  
  const geo = geoip.lookup(cleanIp);
  console.log('Geolocation result:', geo);
  return geo ? geo.country : null;
};

/**
 * Check if IP is from Spain
 * @param {string} ip - IP address
 * @returns {boolean} - True if IP is from Spain
 */
export const isIpFromSpain = (ip) => {
  // In development mode, always return true to allow testing
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Allowing creator registration from any location');
    return true;
  }
  
  const country = getCountryFromIp(ip);
  return country === 'ES'; // ES is the country code for Spain
};