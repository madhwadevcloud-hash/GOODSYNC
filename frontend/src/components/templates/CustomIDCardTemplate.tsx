import React from 'react';
import { IDCardTemplateProps } from './types';

interface CustomIDCardTemplateProps extends IDCardTemplateProps {
  templateImage: string;
  dataFields: any;
  photoPlacement: any;
  schoolLogoPlacement?: any;
}

const CustomIDCardTemplate: React.FC<CustomIDCardTemplateProps> = ({
  settings,
  student,
  templateId,
  side,
  mode = 'preview',
  className = '',
  templateImage,
  dataFields,
  photoPlacement,
  schoolLogoPlacement
}) => {
  // Card dimensions based on orientation
  const isLandscape = templateId === 'landscape';
  const cardStyle = {
    width: isLandscape ? '85.6mm' : '54mm',
    height: isLandscape ? '54mm' : '85.6mm',
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    border: '0.2mm solid #ddd'
  };

  // Construct student photo URL
  let studentPhotoUrl = '';
  if (student.profileImage) {
    if (student.profileImage.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      studentPhotoUrl = `${baseUrl}${student.profileImage}`;
    } else {
      studentPhotoUrl = student.profileImage;
    }
  }

  // Construct template image URL
  let templateImageUrl = '';
  if (templateImage) {
    if (templateImage.startsWith('/uploads')) {
      const envBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5050/api';
      const baseUrl = envBase.replace(/\/api\/?$/, '');
      templateImageUrl = `${baseUrl}${templateImage}`;
    } else {
      templateImageUrl = templateImage;
    }
  }

  // Render text field
  const renderTextField = (fieldName: string, value: string, fieldConfig: any) => {
    if (!fieldConfig || !fieldConfig.enabled) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${fieldConfig.x}px`,
          top: `${fieldConfig.y}px`,
          fontSize: `${fieldConfig.fontSize}px`,
          color: fieldConfig.fontColor,
          fontFamily: fieldConfig.fontFamily,
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          zIndex: 10
        }}
      >
        {value}
      </div>
    );
  };

  // Render student photo
  const renderStudentPhoto = () => {
    if (!photoPlacement || !photoPlacement.enabled) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${photoPlacement.x}px`,
          top: `${photoPlacement.y}px`,
          width: `${photoPlacement.width}px`,
          height: `${photoPlacement.height}px`,
          border: '2px solid #333',
          borderRadius: '4px',
          overflow: 'hidden',
          zIndex: 10
        }}
      >
        {studentPhotoUrl ? (
          <img
            src={studentPhotoUrl}
            alt="Student Photo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '12px'
            }}
          >
            Photo
          </div>
        )}
      </div>
    );
  };

  // Render school logo
  const renderSchoolLogo = () => {
    if (!schoolLogoPlacement || !schoolLogoPlacement.enabled || !settings.logoUrl) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${schoolLogoPlacement.x}px`,
          top: `${schoolLogoPlacement.y}px`,
          width: `${schoolLogoPlacement.width}px`,
          height: `${schoolLogoPlacement.height}px`,
          zIndex: 10
        }}
      >
        <img
          src={settings.logoUrl}
          alt="School Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`custom-id-card ${className}`}
      style={mode === 'print' ? cardStyle : { ...cardStyle, margin: '10px' }}
    >
      {/* Template Background */}
      {templateImageUrl && (
        <img
          src={templateImageUrl}
          alt="ID Card Template"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
      )}

      {/* Student Photo */}
      {renderStudentPhoto()}

      {/* School Logo */}
      {renderSchoolLogo()}

      {/* Data Fields */}
      {dataFields && (
        <>
          {renderTextField('studentName', student.name, dataFields.studentName)}
          {renderTextField('studentId', student.sequenceId || student.rollNumber, dataFields.studentId)}
          {renderTextField('className', student.className, dataFields.className)}
          {renderTextField('section', student.section, dataFields.section)}
          {renderTextField('dateOfBirth', student.dateOfBirth || 'N/A', dataFields.dateOfBirth)}
          {renderTextField('bloodGroup', student.bloodGroup || 'N/A', dataFields.bloodGroup)}
          {renderTextField('fatherName', student.fatherName || 'N/A', dataFields.fatherName)}
          {renderTextField('motherName', student.motherName || 'N/A', dataFields.motherName)}
          {renderTextField('address', student.address || 'N/A', dataFields.address)}
          {renderTextField('phone', student.phone || 'N/A', dataFields.phone)}
        </>
      )}
    </div>
  );
};

export default CustomIDCardTemplate;
