import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const getAuthConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// 客戶列表
export const listCustomers = async (token, { page = 1, limit = 20, search = '' } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}?${params}`, getAuthConfig(token));
  return response.data.data || response.data;
};

// 客戶詳情
export const getCustomer = async (token, id) => {
  const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${id}`, getAuthConfig(token));
  return response.data.data || response.data;
};

// 新增客戶
export const createCustomer = async (token, data) => {
  const response = await axios.post(API_ENDPOINTS.CUSTOMERS, data, getAuthConfig(token));
  return response.data.data || response.data;
};

// 編輯客戶
export const updateCustomer = async (token, id, data) => {
  const response = await axios.put(`${API_ENDPOINTS.CUSTOMERS}/${id}`, data, getAuthConfig(token));
  return response.data.data || response.data;
};

// 來訪記錄
export const getVisitHistory = async (token, id, { page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({ page, limit });
  const response = await axios.get(`${API_ENDPOINTS.CUSTOMERS}/${id}/visits?${params}`, getAuthConfig(token));
  return response.data.data || response.data;
};
