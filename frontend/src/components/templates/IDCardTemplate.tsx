import React from 'react';
import { IDCardTemplateProps, TEMPLATE_COLORS } from './types';

const IDCardTemplate: React.FC<IDCardTemplateProps> = ({
  settings,
  student,
  templateId,
  mode = 'preview',
  className = ''
}) => {
  const colors = TEMPLATE_COLORS[templateId];

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

  const cardStyle = mode === 'print' ? {
    width: '3.375in',
    height: '2.125in',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    margin: '10px',
    pageBreakInside: 'avoid' as const,
    display: 'inline-block',
    verticalAlign: 'top' as const,
    position: 'relative' as const,
    overflow: 'hidden'
  } : {};

  return (
    <div 
      className={`id-card ${className}`}
      style={cardStyle}
    >
      {/* Header */}
      <div 
        className={mode === 'print' ? '' : 'p-2 text-center text-white'}
        style={mode === 'print' ? {
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          color: 'white',
          padding: '8px',
          textAlign: 'center',
          position: 'relative'
        } : {
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
        }}
      >
        <div className={mode === 'print' ? '' : 'flex items-center justify-center gap-2'} 
             style={mode === 'print' ? { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } : {}}>
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className={mode === 'print' ? '' : 'w-6 h-6 object-contain'}
              style={mode === 'print' ? { width: '24px', height: '24px', objectFit: 'contain' } : {}}
            />
          ) : (
            <div 
              className={mode === 'print' ? '' : 'w-6 h-6 bg-white rounded opacity-90'}
              style={mode === 'print' ? { width: '24px', height: '24px', background: 'white', borderRadius: '4px', opacity: 0.9 } : {}}
            />
          )}
          <div>
            <h3 
              className={mode === 'print' ? '' : 'text-xs font-bold m-0'}
              style={mode === 'print' ? { margin: 0, fontSize: '12px', fontWeight: 'bold' } : {}}
            >
              {settings.schoolName}
            </h3>
            <p 
              className={mode === 'print' ? '' : 'text-xs m-0 opacity-90'}
              style={mode === 'print' ? { margin: 0, fontSize: '8px', opacity: 0.9 } : {}}
            >
              STUDENT ID CARD
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div 
        className={mode === 'print' ? '' : 'p-3 flex gap-3'}
        style={mode === 'print' ? { padding: '12px', display: 'flex', gap: '12px' } : {}}
      >
        {/* Photo */}
        <div className={mode === 'print' ? '' : 'flex-shrink-0'} style={mode === 'print' ? { flexShrink: 0 } : {}}>
          {studentPhotoUrl ? (
            <img 
              src={studentPhotoUrl} 
              alt="Student Photo" 
              className={mode === 'print' ? '' : 'w-15 h-20 object-cover rounded border-2'}
              style={mode === 'print' ? {
                width: '60px',
                height: '80px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: `2px solid ${colors.accent}`
              } : { borderColor: colors.accent }}
            />
          ) : (
            <div 
              className={mode === 'print' ? '' : 'w-15 h-20 rounded flex items-center justify-center border-2 text-2xl'}
              style={mode === 'print' ? {
                width: '60px',
                height: '80px',
                background: colors.accent,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${colors.primary}`
              } : { 
                backgroundColor: colors.accent, 
                borderColor: colors.primary,
                color: colors.primary
              }}
            >
              📷
            </div>
          )}
        </div>

        {/* Details */}
        <div 
          className={mode === 'print' ? '' : 'flex-1 text-xs leading-tight'}
          style={mode === 'print' ? { flex: 1, fontSize: '9px', lineHeight: 1.3 } : {}}
        >
          <div className={mode === 'print' ? '' : 'mb-1'} style={mode === 'print' ? { marginBottom: '4px' } : {}}>
            <strong style={{ color: colors.primary }}>{student.name}</strong>
          </div>
          <div className={mode === 'print' ? '' : 'mb-0.5'} style={mode === 'print' ? { marginBottom: '2px' } : {}}>
            <span style={{ color: '#666' }}>Class:</span> <strong>{student.className}-{student.section}</strong>
          </div>
          <div className={mode === 'print' ? '' : 'mb-0.5'} style={mode === 'print' ? { marginBottom: '2px' } : {}}>
            <span style={{ color: '#666' }}>Roll No:</span> <strong>{student.rollNumber}</strong>
          </div>
          <div className={mode === 'print' ? '' : 'mb-0.5'} style={mode === 'print' ? { marginBottom: '2px' } : {}}>
            <span style={{ color: '#666' }}>ID:</span> <strong>{student.sequenceId}</strong>
          </div>
          <div className={mode === 'print' ? '' : 'mb-0.5'} style={mode === 'print' ? { marginBottom: '2px' } : {}}>
            <span style={{ color: '#666' }}>DOB:</span> {student.dateOfBirth || 'N/A'}
          </div>
          <div className={mode === 'print' ? '' : 'mb-0.5'} style={mode === 'print' ? { marginBottom: '2px' } : {}}>
            <span style={{ color: '#666' }}>Blood:</span> {student.bloodGroup || 'N/A'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        className={mode === 'print' ? '' : 'absolute bottom-0 left-0 right-0 text-center text-xs font-bold p-1'}
        style={mode === 'print' ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: colors.accent,
          padding: '4px 8px',
          textAlign: 'center',
          fontSize: '7px',
          color: colors.primary,
          fontWeight: 'bold'
        } : {
          backgroundColor: colors.accent,
          color: colors.primary
        }}
      >
        {settings.schoolCode} | {settings.phone}
      </div>
    </div>
  );
};

export default IDCardTemplate;
