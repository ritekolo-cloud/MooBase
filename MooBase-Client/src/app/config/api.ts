// Centralized API configuration supporting local development and production deployments

const isProd = import.meta.env.PROD;
const rawApiUrl =
  (import.meta.env.VITE_API_URL as string) ||
  (isProd ? 'https://moobase-server-5jti.onrender.com/api' : 'http://localhost:5000/api');

// Normalize: remove trailing slash, ensure ending with /api
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? rawApiUrl.replace(/\/+$/, '')
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;
