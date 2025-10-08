// src/config/api.js
import Config from 'react-native-config';
import store from '../store/store';

// Server Configuration - Updated with your actual EC2 server IPs
const SERVER_CONFIGS = {
  // EC2 Server IPs - Your actual EC2 IPs
  EC2_PUBLIC_IP: '3.80.46.128', // Your EC2 Public IP
  EC2_PRIVATE_IP: '172.31.19.54', // Your EC2 Private IP (from hostname)

  // Local Development IPs
  LOCAL_IP: '192.168.31.143',
  LOCALHOST: 'localhost',
};

// Try multiple endpoints in order of preference
const FALLBACK_IPS = [
  `http://${SERVER_CONFIGS.LOCALHOST}:3000`, // Localhost (for local development)
  'http://127.0.0.1:3000', // Localhost alternative
  `http://${SERVER_CONFIGS.LOCAL_IP}:3000`, // Local network IP
  `http://${SERVER_CONFIGS.EC2_PUBLIC_IP}:3000`, // EC2 Public IP (external access)
  `http://${SERVER_CONFIGS.EC2_PRIVATE_IP}:3000`, // EC2 Private IP (internal access)
];

// Use EC2 server for production
const FALLBACK = `http://${SERVER_CONFIGS.EC2_PUBLIC_IP}:3000`; // Use EC2 server for production
export const API_BASE = Config && Config.API_BASE ? Config.API_BASE : FALLBACK;

// Export server configs for debugging
export const SERVER_CONFIG = SERVER_CONFIGS;

async function request(path, opts = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;

  // Get authentication token from Redux store
  const state = store.getState();
  const token = state.auth?.token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && {Authorization: `Bearer ${token}`}),
    ...(opts.headers || {}),
  };

  const cfg = {method: opts.method || 'GET', headers};
  if (opts.body !== undefined)
    cfg.body =
      typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);

  try {
    const res = await fetch(url, cfg);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }
    if (!res.ok) {
      throw {status: res.status, data};
    }
    return data;
  } catch (error) {
    console.log('[API] Network error:', error);
    throw {
      status: 0,
      data:
        'Network error - server not reachable. Check if server is running on ' +
        url,
    };
  }
}

export const API = {
  adminRegister: (u, p) =>
    request('/api/auth/admin/register', {
      method: 'POST',
      body: {username: u, password: p},
    }),
  adminLogin: (u, p) =>
    request('/api/auth/admin/login', {
      method: 'POST',
      body: {username: u, password: p},
    }),

  getBeneficiaries: (limit = 1000) =>
    request(`/api/beneficiaries?limit=${limit}`),
  getBeneficiariesWithData: (limit = 1000) =>
    request(`/api/beneficiaries/with-data?limit=${limit}`),
  createBeneficiary: payload =>
    request('/api/beneficiaries', {method: 'POST', body: payload}),
  getBeneficiary: id => request(`/api/beneficiaries/${id}`),
  getBeneficiaryByUniqueId: uniqueId =>
    request(`/api/beneficiaries/unique/${uniqueId}`),
  updateBeneficiary: (id, payload) =>
    request(`/api/beneficiaries/${id}`, {method: 'PUT', body: payload}),
  addScreening: (id, payload) =>
    request(`/api/beneficiaries/${id}/screenings`, {
      method: 'POST',
      body: payload,
    }),
  addIntervention: (id, payload) =>
    request(`/api/beneficiaries/${id}/interventions`, {
      method: 'POST',
      body: payload,
    }),
  addFollowup: (id, payload) =>
    request(`/api/beneficiaries/${id}/followups`, {
      method: 'POST',
      body: payload,
    }),

  getPatientsCount: () => request('/api/reports/patients'),
  registerToken: (token, platform, device_id, model, is_registered = true) =>
    request('/api/notifications/register-token', {
      method: 'POST',
      body: {token, platform, device_id, model, is_registered},
    }),
  listNotifications: device_id =>
    request(
      `/api/notifications/list${
        device_id ? `?device_id=${encodeURIComponent(device_id)}` : ''
      }`,
    ),

  // SMS Storage APIs
  storeBeneficiarySMS: smsData =>
    request('/api/sms/beneficiary', {method: 'POST', body: smsData}),
  storeScreeningSMS: smsData =>
    request('/api/sms/screening', {method: 'POST', body: smsData}),
  storeBulkSMS: smsData =>
    request('/api/sms/bulk', {method: 'POST', body: smsData}),
  getBeneficiarySMSHistory: beneficiaryId =>
    request(`/api/sms/beneficiary/${beneficiaryId}/history`),
  getScreeningSMSHistory: screeningId =>
    request(`/api/sms/screening/${screeningId}/history`),
  getSMSStatistics: () => request('/api/sms/statistics'),
  updateSMSStatus: (smsId, status, errorMessage) =>
    request(`/api/sms/${smsId}/status`, {
      method: 'PUT',
      body: {status, errorMessage},
    }),

  // Multi-Device SMS APIs
  getDevices: () => request('/api/devices'),
  sendSMSToDevice: (deviceId, smsData) =>
    request(`/api/devices/${deviceId}/sms`, {method: 'POST', body: smsData}),
  getDeviceSMSStatus: deviceId =>
    request(`/api/devices/${deviceId}/sms/status`),
  getDevicesSMSStatus: () => request('/api/devices/sms/status'),
};
