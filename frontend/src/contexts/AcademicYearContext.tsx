import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface AcademicYearContextType {
  currentAcademicYear: string; // The active/current year set by admin
  viewingAcademicYear: string; // The year being viewed (can be current or historical)
  academicYearStart: string;
  academicYearEnd: string;
  loading: boolean;
  error: string | null;
  isViewingHistoricalYear: boolean; // True if viewing a past year
  refreshAcademicYear: () => Promise<void>;
  setViewingYear: (year: string) => void; // Function to switch viewing year
  availableYears: string[]; // List of all available academic years
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within AcademicYearProvider');
  }
  return context;
};

interface AcademicYearProviderProps {
  children: ReactNode;
  schoolCode?: string;
}

export const AcademicYearProvider: React.FC<AcademicYearProviderProps> = ({ children, schoolCode }) => {
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('2024-2025');
  const [viewingAcademicYear, setViewingAcademicYear] = useState<string>('2024-2025');
  const [academicYearStart, setAcademicYearStart] = useState<string>('2024-04-01');
  const [academicYearEnd, setAcademicYearEnd] = useState<string>('2025-03-31');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const fetchAcademicYear = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get school code from props or localStorage
      const authData = localStorage.getItem('erp.auth');
      const token = authData ? JSON.parse(authData).token : null;
      let code = schoolCode;

      if (!code && authData) {
        const parsedAuth = JSON.parse(authData);
        code = parsedAuth.user?.schoolCode || parsedAuth.schoolCode;
      }

      if (!code) {
        console.warn('No school code available for fetching academic year');
        setLoading(false);
        return;
      }

      console.log(`📅 Fetching academic year for school: ${code}`);

      const response = await api.get(`/admin/academic-year/${code}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.data.success) {
        const { currentYear, startDate, endDate } = response.data.data;
        setCurrentAcademicYear(currentYear || '2024-2025');
        setViewingAcademicYear(currentYear || '2024-2025'); // Default to current year
        setAcademicYearStart(startDate ? startDate.split('T')[0] : '2024-04-01');
        setAcademicYearEnd(endDate ? endDate.split('T')[0] : '2025-03-31');
        
        // Generate available years (current year + 2 previous years)
        const years = generateAvailableYears(currentYear || '2024-2025');
        setAvailableYears(years);
        
        console.log(`✅ Academic year loaded: ${currentYear}`);
      }
    } catch (err: any) {
      console.error('Error fetching academic year:', err);
      setError(err.message || 'Failed to fetch academic year');
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYear();
  }, [schoolCode]);

  const refreshAcademicYear = async () => {
    await fetchAcademicYear();
  };

  const setViewingYear = (year: string) => {
    setViewingAcademicYear(year);
    console.log(`📅 Switched to viewing academic year: ${year}`);
  };

  const isViewingHistoricalYear = viewingAcademicYear !== currentAcademicYear;

  // Helper function to generate available years
  const generateAvailableYears = (currentYear: string): string[] => {
    const years: string[] = [];
    
    // Parse the current year (e.g., "2024-25" or "2024-2025")
    const parts = currentYear.split('-');
    const startYear = parseInt(parts[0]);
    const isShortFormat = parts[1].length === 2; // "2024-25" vs "2024-2025"
    
    // Add next year (for promoted students)
    const nextStartYear = startYear + 1;
    const nextEndYear = nextStartYear + 1;
    years.push(isShortFormat 
      ? `${nextStartYear}-${String(nextEndYear).slice(-2)}` 
      : `${nextStartYear}-${nextEndYear}`
    );
    
    // Add current year
    years.push(currentYear);
    
    // Add previous 3 years
    for (let i = 1; i <= 3; i++) {
      const prevStartYear = startYear - i;
      const prevEndYear = prevStartYear + 1;
      years.push(isShortFormat 
        ? `${prevStartYear}-${String(prevEndYear).slice(-2)}` 
        : `${prevStartYear}-${prevEndYear}`
      );
    }
    
    return years;
  };

  return (
    <AcademicYearContext.Provider
      value={{
        currentAcademicYear,
        viewingAcademicYear,
        academicYearStart,
        academicYearEnd,
        loading,
        error,
        isViewingHistoricalYear,
        refreshAcademicYear,
        setViewingYear,
        availableYears
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};
