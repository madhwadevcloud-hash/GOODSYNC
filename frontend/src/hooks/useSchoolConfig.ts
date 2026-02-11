import { useState, useEffect } from 'react';
import * as configAPI from '../api/config';

interface SchoolConfig {
  school: {
    name: string;
    code: string;
    academicYear: string;
  };
  subjects: string[];
  classes: Array<{ name: string; sections: string[] }>;
  sections: string[];
  academicYears: string[];
  terms: string[];
}

export const useSchoolConfig = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await configAPI.getSchoolConfig();
        setConfig(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch school configuration');
        // Set fallback data
        setConfig({
          school: {
            name: 'School Name',
            code: 'SCH',
            academicYear: '2024-25'
          },
          subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography'],
          classes: [
            { name: 'Grade 1', sections: ['A', 'B'] },
            { name: 'Grade 2', sections: ['A', 'B'] },
            { name: 'Grade 3', sections: ['A', 'B', 'C'] },
            { name: 'Grade 4', sections: ['A', 'B', 'C'] },
            { name: 'Grade 5', sections: ['A', 'B', 'C'] }
          ],
          sections: ['A', 'B', 'C', 'D', 'E'],
          academicYears: ['2024-25', '2025-26', '2026-27'],
          terms: ['Term 1', 'Term 2', 'Term 3']
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error, refetch: () => window.location.reload() };
};
