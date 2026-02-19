import Config from 'react-native-config';
import store from '../store/store';

const SERVER_IP = '3.80.46.128';

const HTTPS_BASE = `https://${SERVER_IP}`;

const HTTP_BASE = `http://${SERVER_IP}:3000`;

export const API_BASE =
  (Config && Config.API_BASE) || process.env.API_BASE || HTTPS_BASE;

export async function requestWithFallback(path, opts = {}, retries = 0) {
  const endpoints = [
    `${HTTPS_BASE}${path.startsWith('/') ? path : '/' + path}`,
    `${HTTP_BASE}${path.startsWith('/') ? path : '/' + path}`,
  ];

  for (let i = retries; i < endpoints.length; i++) {
    const url = endpoints[i];
    try {
      const state = store.getState ? store.getState() : {};
      const token = state?.auth?.token;

      const headers = {
        'Content-Type': 'application/json',
        ...(token && {Authorization: `Bearer ${token}`}),
        ...(opts.headers || {}),
      };

      const cfg = {method: opts.method || 'GET', headers};
      if (opts.body !== undefined) {
        cfg.body =
          typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      }

      const res = await fetch(url, cfg);
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!res.ok) {
        throw {status: res.status, data};
      }
      return data;
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error) {
        if (typeof error === 'string') {
          errorMsg = error;
        } else if (error.message) {
          errorMsg = error.message;
        } else if (error.toString && error.toString() !== '[object Object]') {
          errorMsg = error.toString();
        } else {
          errorMsg =
            error.code ||
            error.name ||
            JSON.stringify(error).substring(0, 100) ||
            'Network error';
        }
      }

      if (i === endpoints.length - 1) {
        throw {
          status: 0,
          data: `Network error - server not reachable. Check if server is running on ${url}. Error: ${errorMsg}`,
          originalError: errorMsg,
        };
      }

      continue;
    }
  }
}

async function request(path, opts = {}) {
  return requestWithFallback(path, opts, 0);
}

export async function testNetworkConnectivity() {
  const testUrls = [
    `https://${SERVER_IP}`,
    `http://${SERVER_IP}`,
    `https://${SERVER_IP}/api/sync  `,
    `http://${SERVER_IP}/api/sync`,
    `https://${SERVER_IP}/api/beneficiaries`,
    `http://${SERVER_IP}/api/beneficiaries`,
    `https://${SERVER_IP}/api/beneficiaries/with-data`,
    `http://${SERVER_IP}/api/beneficiaries/with-data`,
    `https://${SERVER_IP}/api/beneficiaries/unique/${uniqueId}`,
    `http://${SERVER_IP}/api/beneficiaries/unique/${uniqueId}`,
  ];

  const results = [];

  for (const url of testUrls) {
    try {
      const startTime = Date.now();
      const res = await fetch(url, {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
      });
      const endTime = Date.now();
      results.push({
        url,
        success: true,
        status: res.status,
        time: endTime - startTime,
      });
    } catch (error) {
      results.push({
        url,
        success: false,
        error: error.message || error.toString(),
      });
    }
  }

  return results;
}

export const API = {
  adminRegister: (u, p) =>
    request('/api/admin-auth/register', {
      method: 'POST',
      body: {email: u, password: p},
    }),
  adminLogin: (u, p) =>
    request('/api/admin-auth/login', {
      method: 'POST',
      body: {email: u, password: p},
    }),

  checkAdminStatus: () => request('/api/admin-auth/check'),
  createFirstAdmin: payload =>
    request('/api/admin-auth/first-admin', {method: 'POST', body: payload}),
  adminLogin: payload =>
    request('/api/admin-auth/login', {method: 'POST', body: payload}),
  adminRegister: payload =>
    request('/api/admin-auth/register', {method: 'POST', body: payload}),
  getAdminProfile: () => request('/api/admin-auth/profile'),
  updateAdminProfile: payload =>
    request('/api/admin-auth/profile', {method: 'PUT', body: payload}),
  changeAdminPassword: payload =>
    request('/api/admin-auth/change-password', {method: 'PUT', body: payload}),
  deleteAdminAccount: payload =>
    request('/api/admin-auth/delete-account', {
      method: 'DELETE',
      body: payload,
    }),
  deletePatientAccount: () =>
    request('/api/patient-auth/delete-account', {method: 'DELETE'}),

  patientLogin: role =>
    request('/api/patient-auth/login', {method: 'POST', body: {role}}),
  patientLoginWithGoogle: googleData =>
    request('/api/patient-auth/google-login', {
      method: 'POST',
      body: googleData,
    }),
  loginWithUniqueId: payload =>
    request('/api/patient-auth/unique-id-login', {
      method: 'POST',
      body: payload,
    }),
  loginWithGoogle: payload =>
    request('/api/patient-auth/google-login', {method: 'POST', body: payload}),
  mobileLogin: (phoneNumber, otp) =>
    request('/api/patient-auth/mobile-login', {
      method: 'POST',
      body: {phoneNumber, otp},
    }),
  emailLogin: (email, otp) =>
    request('/api/patient-auth/email-login', {
      method: 'POST',
      body: {email, otp},
    }),
  selectBeneficiary: (phoneNumber, beneficiaryId) =>
    request('/api/patient-auth/select-beneficiary', {
      method: 'POST',
      body: {phoneNumber, beneficiaryId},
    }),
  getBeneficiaryByPhone: phoneNumber =>
    request(
      `/api/patient-auth/beneficiary/phone/${encodeURIComponent(phoneNumber)}`,
    ),
  getBeneficiariesByPhone: phoneNumber =>
    request(
      `/api/patient-auth/beneficiaries/phone/${encodeURIComponent(
        phoneNumber,
      )}?t=${Date.now()}`,
    ),
  getBeneficiaryByEmail: email =>
    request(`/api/patient-auth/beneficiary/email/${encodeURIComponent(email)}`),
  getBeneficiariesByEmail: email =>
    request(
      `/api/patient-auth/beneficiaries/email/${encodeURIComponent(email)}`,
    ),
  getBeneficiariesByUniqueId: uniqueId =>
    request(
      `/api/patient-auth/beneficiaries/unique/${encodeURIComponent(uniqueId)}`,
    ),

  sendOTP: payload => request('/api/otp/send', {method: 'POST', body: payload}),
  verifyOTP: payload =>
    request('/api/otp/verify', {method: 'POST', body: payload}),
  resendOTP: payload =>
    request('/api/otp/resend', {method: 'POST', body: payload}),
  sendEmailOTP: payload =>
    request('/api/otp/send-email', {method: 'POST', body: payload}),
  verifyEmailOTP: payload =>
    request('/api/otp/verify-email', {method: 'POST', body: payload}),
  resendEmailOTP: payload =>
    request('/api/otp/resend-email', {method: 'POST', body: payload}),

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
  getBeneficiaryHistory: id => request(`/api/beneficiaries/${id}/history`),

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

  getDevices: () => request('/api/devices'),
  sendSMSToDevice: (deviceId, smsData) =>
    request(`/api/devices/${deviceId}/sms`, {method: 'POST', body: smsData}),
  getDeviceSMSStatus: deviceId =>
    request(`/api/devices/${deviceId}/sms/status`),
  getDevicesSMSStatus: () => request('/api/devices/sms/status'),

  getTodayAdherence: beneficiaryId =>
    request(`/api/dot/today-adherence/${beneficiaryId}`),
  getAdherenceData: beneficiaryId =>
    request(`/api/dot/adherence-data/${beneficiaryId}`),
  markIFATaken: beneficiaryId =>
    request('/api/dot/mark-ifa-taken', {method: 'POST', body: {beneficiaryId}}),
  getAdherenceReport: () => request('/api/dot/adherence-report'),
};

export default API;
