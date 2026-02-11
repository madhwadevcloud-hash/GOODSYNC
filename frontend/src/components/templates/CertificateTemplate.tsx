import React from 'react';
import { CertificateTemplateProps } from './types';

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  settings,
  certificateData,
  mode = 'preview',
  className = ''
}) => {
  const containerStyle = mode === 'print' ? {
    fontFamily: 'Arial, sans-serif',
    aspectRatio: '297/210', // Landscape orientation for certificates
    minHeight: '210mm',
    width: '297mm',
    padding: '20mm',
    boxSizing: 'border-box' as const,
    background: 'white'
  } : {};

  return (
    <div className={`certificate-template ${className}`} style={containerStyle}>
      {/* Decorative Border */}
      <div 
        className={mode === 'print' ? '' : 'border-4 border-double border-gray-800 p-8 h-full'}
        style={mode === 'print' ? { border: '4px double #1f2937', padding: '32px', height: '100%' } : {}}
      >
        {/* Header */}
        <div 
          className={mode === 'print' ? '' : 'text-center mb-8'}
          style={mode === 'print' ? { textAlign: 'center', marginBottom: '32px' } : {}}
        >
          {settings.logoUrl && (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className={mode === 'print' ? '' : 'w-20 h-20 mx-auto mb-4 object-contain'}
              style={mode === 'print' ? { width: '80px', height: '80px', margin: '0 auto 16px', objectFit: 'contain' } : {}}
            />
          )}
          <h1 
            className={mode === 'print' ? '' : 'text-3xl font-bold text-gray-800 mb-2'}
            style={mode === 'print' ? { fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' } : {}}
          >
            {settings.schoolName}
          </h1>
          <p 
            className={mode === 'print' ? '' : 'text-lg text-gray-600'}
            style={mode === 'print' ? { fontSize: '16px', color: '#4b5563', margin: 0 } : {}}
          >
            {settings.address}
          </p>
        </div>

        {/* Certificate Title */}
        <div 
          className={mode === 'print' ? '' : 'text-center mb-12'}
          style={mode === 'print' ? { textAlign: 'center', marginBottom: '48px' } : {}}
        >
          <h2 
            className={mode === 'print' ? '' : 'text-5xl font-bold text-blue-600 mb-4'}
            style={mode === 'print' ? { fontSize: '48px', fontWeight: 'bold', color: '#2563eb', marginBottom: '16px' } : {}}
          >
            CERTIFICATE
          </h2>
          <h3 
            className={mode === 'print' ? '' : 'text-2xl font-semibold text-gray-700'}
            style={mode === 'print' ? { fontSize: '24px', fontWeight: '600', color: '#374151', margin: 0 } : {}}
          >
            OF COMPLETION
          </h3>
        </div>

        {/* Certificate Content */}
        <div 
          className={mode === 'print' ? '' : 'text-center mb-12 space-y-6'}
          style={mode === 'print' ? { textAlign: 'center', marginBottom: '48px' } : {}}
        >
          <p 
            className={mode === 'print' ? '' : 'text-lg text-gray-700'}
            style={mode === 'print' ? { fontSize: '18px', color: '#374151', marginBottom: '24px' } : {}}
          >
            This is to certify that
          </p>
          
          <div 
            className={mode === 'print' ? '' : 'border-b-2 border-gray-300 pb-2 mb-6'}
            style={mode === 'print' ? { borderBottom: '2px solid #d1d5db', paddingBottom: '8px', marginBottom: '24px' } : {}}
          >
            <h4 
              className={mode === 'print' ? '' : 'text-3xl font-bold text-gray-800'}
              style={mode === 'print' ? { fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: 0 } : {}}
            >
              {certificateData.recipientName}
            </h4>
          </div>

          <p 
            className={mode === 'print' ? '' : 'text-lg text-gray-700 mb-4'}
            style={mode === 'print' ? { fontSize: '18px', color: '#374151', marginBottom: '16px' } : {}}
          >
            has successfully completed the course
          </p>

          <div 
            className={mode === 'print' ? '' : 'border-b-2 border-gray-300 pb-2 mb-6'}
            style={mode === 'print' ? { borderBottom: '2px solid #d1d5db', paddingBottom: '8px', marginBottom: '24px' } : {}}
          >
            <h5 
              className={mode === 'print' ? '' : 'text-2xl font-semibold text-blue-600'}
              style={mode === 'print' ? { fontSize: '24px', fontWeight: '600', color: '#2563eb', margin: 0 } : {}}
            >
              {certificateData.courseName}
            </h5>
          </div>

          <p 
            className={mode === 'print' ? '' : 'text-lg text-gray-700'}
            style={mode === 'print' ? { fontSize: '18px', color: '#374151', margin: 0 } : {}}
          >
            on {certificateData.completionDate}
          </p>
        </div>

        {/* Footer */}
        <div 
          className={mode === 'print' ? '' : 'flex justify-between items-end mt-16'}
          style={mode === 'print' ? { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '64px' } : {}}
        >
          <div className={mode === 'print' ? '' : 'text-left'} style={mode === 'print' ? { textAlign: 'left' } : {}}>
            <p 
              className={mode === 'print' ? '' : 'text-sm text-gray-600 mb-1'}
              style={mode === 'print' ? { fontSize: '12px', color: '#4b5563', marginBottom: '4px' } : {}}
            >
              Certificate No: {certificateData.certificateNumber}
            </p>
            <p 
              className={mode === 'print' ? '' : 'text-sm text-gray-600'}
              style={mode === 'print' ? { fontSize: '12px', color: '#4b5563', margin: 0 } : {}}
            >
              Date of Issue: {certificateData.completionDate}
            </p>
          </div>

          <div className={mode === 'print' ? '' : 'text-center'} style={mode === 'print' ? { textAlign: 'center' } : {}}>
            <div 
              className={mode === 'print' ? '' : 'border-t-2 border-gray-800 pt-2'}
              style={mode === 'print' ? { borderTop: '2px solid #1f2937', paddingTop: '8px', minWidth: '200px' } : {}}
            >
              <p 
                className={mode === 'print' ? '' : 'font-semibold text-gray-800'}
                style={mode === 'print' ? { fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' } : {}}
              >
                {certificateData.signatory}
              </p>
              <p 
                className={mode === 'print' ? '' : 'text-sm text-gray-600'}
                style={mode === 'print' ? { fontSize: '12px', color: '#4b5563', margin: 0 } : {}}
              >
                {certificateData.signatoryTitle}
              </p>
            </div>
          </div>

          <div className={mode === 'print' ? '' : 'text-right'} style={mode === 'print' ? { textAlign: 'right' } : {}}>
            <p 
              className={mode === 'print' ? '' : 'text-sm text-gray-600'}
              style={mode === 'print' ? { fontSize: '12px', color: '#4b5563', margin: 0 } : {}}
            >
              {settings.phone}
            </p>
            <p 
              className={mode === 'print' ? '' : 'text-sm text-gray-600'}
              style={mode === 'print' ? { fontSize: '12px', color: '#4b5563', margin: 0 } : {}}
            >
              {settings.email}
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div 
          className={mode === 'print' ? '' : 'absolute top-4 left-4 w-16 h-16 border-4 border-blue-200 rounded-full opacity-20'}
          style={mode === 'print' ? {
            position: 'absolute',
            top: '16px',
            left: '16px',
            width: '64px',
            height: '64px',
            border: '4px solid #dbeafe',
            borderRadius: '50%',
            opacity: 0.2
          } : {}}
        />
        <div 
          className={mode === 'print' ? '' : 'absolute top-4 right-4 w-16 h-16 border-4 border-blue-200 rounded-full opacity-20'}
          style={mode === 'print' ? {
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '64px',
            height: '64px',
            border: '4px solid #dbeafe',
            borderRadius: '50%',
            opacity: 0.2
          } : {}}
        />
        <div 
          className={mode === 'print' ? '' : 'absolute bottom-4 left-4 w-16 h-16 border-4 border-blue-200 rounded-full opacity-20'}
          style={mode === 'print' ? {
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            width: '64px',
            height: '64px',
            border: '4px solid #dbeafe',
            borderRadius: '50%',
            opacity: 0.2
          } : {}}
        />
        <div 
          className={mode === 'print' ? '' : 'absolute bottom-4 right-4 w-16 h-16 border-4 border-blue-200 rounded-full opacity-20'}
          style={mode === 'print' ? {
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: '64px',
            height: '64px',
            border: '4px solid #dbeafe',
            borderRadius: '50%',
            opacity: 0.2
          } : {}}
        />
      </div>
    </div>
  );
};

export default CertificateTemplate;
