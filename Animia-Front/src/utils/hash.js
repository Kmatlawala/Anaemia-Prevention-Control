// src/utils/hash.js
// Simple hash function to avoid crypto-js crashes in React Native

function simpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function hashAadhaar(aadhaar) {
  try {
    const clean = String(aadhaar || '').replace(/\s+/g, '');
    return simpleHash(clean);
  } catch (_) { 
    return String(aadhaar || ''); 
  }
}

export function maskAadhaar(aadhaar) {
  const s = String(aadhaar || '').replace(/\s+/g, '');
  if (s.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}
