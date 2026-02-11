// Create a new file: services/mockClassService.ts
export interface MockClassData {
  classId: string;
  className: string;
  sections: Array<{
    sectionId: string;
    sectionName: string;
  }>;
}

// Mock data for common classes
const MOCK_CLASSES: Record<string, MockClassData[]> = {
  'LPS': [
    {
      classId: '1',
      className: '1',
      sections: [
        { sectionId: '1A', sectionName: 'A' },
        { sectionId: '1B', sectionName: 'B' },
        { sectionId: '1C', sectionName: 'C' }
      ]
    },
    {
      classId: '2',
      className: '2',
      sections: [
        { sectionId: '2A', sectionName: 'A' },
        { sectionId: '2B', sectionName: 'B' }
      ]
    },
    {
      classId: '3',
      className: '3',
      sections: [
        { sectionId: '3A', sectionName: 'A' },
        { sectionId: '3B', sectionName: 'B' },
        { sectionId: '3C', sectionName: 'C' }
      ]
    },
    {
      classId: '4',
      className: '4',
      sections: [
        { sectionId: '4A', sectionName: 'A' },
        { sectionId: '4B', sectionName: 'B' }
      ]
    },
    {
      classId: '5',
      className: '5',
      sections: [
        { sectionId: '5A', sectionName: 'A' },
        { sectionId: '5B', sectionName: 'B' },
        { sectionId: '5C', sectionName: 'C' }
      ]
    }
  ],
  'default': [
    {
      classId: '1',
      className: '1',
      sections: [
        { sectionId: 'A', sectionName: 'A' },
        { sectionId: 'B', sectionName: 'B' }
      ]
    },
    {
      classId: '2',
      className: '2',
      sections: [
        { sectionId: 'A', sectionName: 'A' },
        { sectionId: 'B', sectionName: 'B' }
      ]
    }
  ]
};

export const mockClassService = {
  getClasses: async (schoolId: string): Promise<MockClassData[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return MOCK_CLASSES[schoolId] || MOCK_CLASSES.default;
  },

  // Check if we should use mock data (for development or when APIs fail)
  shouldUseMock: (): boolean => {
    return process.env.NODE_ENV === 'development' || localStorage.getItem('useMockData') === 'true';
  }
};