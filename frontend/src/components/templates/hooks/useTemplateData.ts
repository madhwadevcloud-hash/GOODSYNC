import { useState, useEffect } from 'react';
import { TemplateSettings } from '../types';
import { useAuth } from '../../../auth/AuthContext';
import api from '../../../api/axios';

export const useTemplateData = () => {
  const { user } = useAuth();
  
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
    schoolName: user?.schoolName || 'School Name',
    schoolCode: user?.schoolCode || 'SCH001',
    website: 'www.edulogix.com',
    logoUrl: '',
    headerColor: '#1f2937',
    accentColor: '#3b82f6',
    address: '123 School Street, City, State 12345',
    phone: '+91-XXXXXXXXXX',
    email: 'info@school.com'
  });

  const [loading, setLoading] = useState(false);

  // Fetch school data from API
  const fetchSchoolData = async () => {
    if (!user?.schoolCode) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('erp.authToken');
      const schoolCode = localStorage.getItem('erp.schoolCode') || user?.schoolCode;

      const response = await api.get('/schools/profile', {
        headers: {
          'X-School-Code': schoolCode
        }
      });

      const data = response.data;
      console.log('🏫 Fetched school data for templates:', data);
      
      if (data.success && data.data) {
        const schoolData = data.data;
        let logoUrl = '';
        
        if (schoolData.logo) {
          if (schoolData.logo.startsWith('/uploads')) {
            const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
            const baseUrl = envBase.replace(/\/api\/?$/, '');
            logoUrl = `${baseUrl}${schoolData.logo}`;
          } else {
            logoUrl = schoolData.logo;
          }
        }

        setTemplateSettings(prev => ({
          ...prev,
          schoolName: schoolData.name || schoolData.schoolName || prev.schoolName,
          schoolCode: schoolData.code || schoolData.schoolCode || prev.schoolCode,
          address: schoolData.address || prev.address,
          phone: schoolData.phone || schoolData.contact?.phone || prev.phone,
          email: schoolData.email || schoolData.contact?.email || prev.email,
          logoUrl: logoUrl || prev.logoUrl
        }));
      }
    } catch (error) {
      console.error('Error fetching school data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved template settings
  const loadSavedSettings = () => {
    try {
      const saved = localStorage.getItem('universalTemplate');
      if (saved) {
        const savedSettings = JSON.parse(saved);
        setTemplateSettings(prev => ({ ...prev, ...savedSettings }));
      }
    } catch (error) {
      console.error('Failed to load template settings:', error);
    }
  };

  // Save template settings
  const saveTemplateSettings = (settings: TemplateSettings) => {
    try {
      localStorage.setItem('universalTemplate', JSON.stringify(settings));
      setTemplateSettings(settings);
      return true;
    } catch (error) {
      console.error('Failed to save template settings:', error);
      return false;
    }
  };

  // Convert image to base64 for print compatibility
  const convertImageToBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  useEffect(() => {
    loadSavedSettings();
    fetchSchoolData();
  }, [user?.schoolCode]);

  return {
    templateSettings,
    setTemplateSettings,
    loading,
    fetchSchoolData,
    saveTemplateSettings,
    convertImageToBase64
  };
};
