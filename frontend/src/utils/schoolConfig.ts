import * as configAPI from '../api/config';

// Cache for school config to avoid repeated API calls
let cachedConfig: any = null;
let configPromise: Promise<any> | null = null;

export const getSchoolConfig = async () => {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (configPromise) {
    return configPromise;
  }

  configPromise = configAPI.getSchoolConfig().then(config => {
    cachedConfig = config;
    return config;
  }).catch(error => {
    console.error('Failed to fetch school config:', error);
    // Return fallback data
    const fallback = {
      school: {
        name: 'School Name',
        code: 'SCH',
        academicYear: '2024-25'
      },
      subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science', 'Economics', 'Art'],
      classes: [
        { name: 'LKG', sections: ['A', 'B'] },
        { name: 'UKG', sections: ['A', 'B'] },
        { name: '1', sections: ['A', 'B', 'C'] },
        { name: '2', sections: ['A', 'B', 'C'] },
        { name: '3', sections: ['A', 'B', 'C'] },
        { name: '4', sections: ['A', 'B', 'C'] },
        { name: '5', sections: ['A', 'B', 'C'] },
        { name: '6', sections: ['A', 'B', 'C'] },
        { name: '7', sections: ['A', 'B', 'C'] },
        { name: '8', sections: ['A', 'B', 'C'] },
        { name: '9', sections: ['A', 'B'] },
        { name: '10', sections: ['A', 'B'] },
        { name: '11', sections: ['A', 'B'] },
        { name: '12', sections: ['A', 'B'] }
      ],
      sections: ['A', 'B', 'C', 'D', 'E'],
      academicYears: ['2024-25', '2025-26', '2026-27'],
      terms: ['Term 1', 'Term 2', 'Term 3']
    };
    cachedConfig = fallback;
    return fallback;
  });

  return configPromise;
};

export const clearConfigCache = () => {
  cachedConfig = null;
  configPromise = null;
};

// Helper functions
export const getClassDisplayName = (className: string) => {
  if (className === 'LKG' || className === 'UKG') return className;
  return `Grade ${className}`;
};

export const getClassOptions = async () => {
  const config = await getSchoolConfig();
  return config.classes.map((cls: any) => ({
    value: cls.name,
    label: getClassDisplayName(cls.name),
    sections: cls.sections
  }));
};

export const getSectionOptions = async (className?: string) => {
  const config = await getSchoolConfig();
  if (className) {
    const classData = config.classes.find((cls: any) => cls.name === className);
    return classData ? classData.sections : config.sections;
  }
  return config.sections;
};

export const getSubjectOptions = async () => {
  const config = await getSchoolConfig();
  return config.subjects;
};

// ============================================================================
// IMAGE COMPRESSION UTILITY (Extract to imageCompression.ts)
// ============================================================================

export interface CompressionOptions {
  maxSizeKB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeKB: 30,
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.7
};

export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        try {
          let { width, height } = img;
          
          if (width > opts.maxWidth! || height > opts.maxHeight!) {
            const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          let quality = opts.quality!;
          let attempts = 0;
          const maxAttempts = 10;

          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }

                const sizeKB = blob.size / 1024;
                
                if (sizeKB <= opts.maxSizeKB! || attempts >= maxAttempts) {
                  console.log(`✅ Compressed image: ${sizeKB.toFixed(2)}KB (quality: ${quality.toFixed(2)})`);
                  resolve(blob);
                  return;
                }

                attempts++;
                quality = Math.max(0.1, quality - 0.1);
                tryCompress();
              },
              'image/jpeg',
              quality
            );
          };

          tryCompress();
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.'
    };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Maximum size is 10MB.'
    };
  }

  return { valid: true };
};
