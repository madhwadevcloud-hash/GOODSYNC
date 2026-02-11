import api from '../api/axios';
import { Chalan, GenerateChalanData } from '../types/chalan';

const API_URL = '/chalans';

export const chalanAPI = {
  generateChalans: async (data: GenerateChalanData) => {
    const response = await api.post(API_URL + '/generate', data);
    return response.data;
  },

  getChalans: async (params?: {
    status?: string;
    class?: string;
    section?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get(API_URL, { params });
    return response.data;
  },

  getChalanById: async (id: string) => {
    const response = await api.get(`${API_URL}/${id}`);
    return response.data;
  },

  getChalanByStudent: async (studentId: string) => {
    const response = await api.get(`${API_URL}/student/${studentId}`);
    return response.data;
  },

  markAsPaid: async (id: string, paymentData: any) => {
    const response = await api.post(`${API_URL}/${id}/mark-paid`, paymentData);
    return response.data;
  }
};
