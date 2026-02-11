import React from 'react';
import { AdmitCardTemplateProps } from './types';

const AdmitCardTemplate: React.FC<AdmitCardTemplateProps> = ({
  settings,
  student,
  subjects,
  testName,
  enableRoomNumbers = false,
  instructions = [],
  mode = 'preview',
  className = ''
}) => {
  // Function to format time from 12-hour components
  const formatTime12Hour = (hour: string, minute: string, ampm: string): string => {
    if (!hour || !minute || !ampm) return 'Time not set';
    
    try {
      // Convert "00" hour to "12" for display
      const displayHour = hour === '00' ? '12' : hour;
      return `${displayHour}:${minute} ${ampm}`;
    } catch (error) {
      console.error('Error formatting 12-hour time:', error);
      return 'Time error';
    }
  };

  const containerStyle = mode === 'print' ? {
    fontFamily: 'Arial, sans-serif',
    aspectRatio: '210/297',
    minHeight: '297mm',
    width: '210mm',
    padding: '20mm',
    boxSizing: 'border-box' as const,
    background: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
    pageBreakAfter: 'always' as const,
    marginBottom: '20px'
  } : {};


  return (
    <div 
      className={`hall-ticket ${className} ${mode === 'print' ? '' : 'w-full max-w-4xl mx-auto bg-white shadow-lg flex flex-col'}`}
      style={mode === 'print' ? containerStyle : {
        fontFamily: 'Arial, sans-serif',
        aspectRatio: '210/297',
        minHeight: '297mm',
        width: '210mm',
        padding: '20mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
        {/* School Header */}
        <div 
          className={mode === 'print' ? '' : 'flex justify-between items-start mb-4 pb-4 border-b-2 border-gray-300'}
          style={mode === 'print' ? {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '2px solid #d1d5db'
          } : {}}
        >
          <div 
            className={mode === 'print' ? '' : 'flex items-center space-x-4'}
            style={mode === 'print' ? { display: 'flex', alignItems: 'center', gap: '16px' } : {}}
          >
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className={mode === 'print' ? '' : 'w-16 h-16 object-contain'}
                style={mode === 'print' ? { width: '64px', height: '64px', objectFit: 'contain' } : {}}
              />
            ) : (
              <div 
                className={mode === 'print' ? '' : 'w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center'}
                style={mode === 'print' ? {
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#1f2937',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                } : {}}
              >
                <div 
                  className={mode === 'print' ? '' : 'w-10 h-10 border-2 border-white rounded transform rotate-45'}
                  style={mode === 'print' ? {
                    width: '40px',
                    height: '40px',
                    border: '2px solid white',
                    borderRadius: '4px',
                    transform: 'rotate(45deg)'
                  } : {}}
                />
              </div>
            )}
            <div>
              <h1 
                className={mode === 'print' ? '' : 'text-2xl font-bold text-gray-800'}
                style={mode === 'print' ? { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 } : {}}
              >
                {settings.schoolName}
              </h1>
              <p 
                className={mode === 'print' ? '' : 'text-sm text-gray-600'}
                style={mode === 'print' ? { fontSize: '14px', color: '#4b5563', margin: '4px 0' } : {}}
              >
                School Code: {settings.schoolCode}
              </p>
              <p 
                className={mode === 'print' ? '' : 'text-sm text-gray-600'}
                style={mode === 'print' ? { fontSize: '14px', color: '#4b5563', margin: '4px 0' } : {}}
              >
                {settings.address}
              </p>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div 
          className={mode === 'print' ? '' : 'text-center mb-4'}
          style={mode === 'print' ? { textAlign: 'center', marginBottom: '16px' } : {}}
        >
          <h2 
            className={mode === 'print' ? '' : 'text-3xl font-bold text-gray-800'}
            style={mode === 'print' ? { fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 } : {}}
          >
            ADMIT CARD
          </h2>
          <p 
            className={mode === 'print' ? '' : 'text-lg font-semibold text-gray-700 mt-2'}
            style={mode === 'print' ? { fontSize: '16px', fontWeight: '600', color: '#374151', marginTop: '8px', margin: '8px 0 0 0' } : {}}
          >
            {testName}
          </p>
        </div>

        {/* Student Details and Photo */}
        <div 
          className={mode === 'print' ? '' : 'grid grid-cols-2 gap-6 mb-4 p-3 bg-gray-50 rounded-lg border'}
          style={mode === 'print' ? { 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr', 
            gap: '24px', 
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          } : {}}
        >
          {/* Student Information */}
          <div>
            <h3 
              className={mode === 'print' ? '' : 'text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-300'}
              style={mode === 'print' ? { 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#1f2937', 
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid #d1d5db'
              } : {}}
            >
              Student Details
            </h3>
            <div className={mode === 'print' ? '' : 'space-y-2'} style={mode === 'print' ? { display: 'flex', flexDirection: 'column', gap: '8px' } : {}}>
              <div style={mode === 'print' ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}}>
                <span style={mode === 'print' ? { fontSize: '12px', fontWeight: '600', color: '#374151', minWidth: '80px' } : {}}>
                  Name:
                </span>
                <span style={mode === 'print' ? { fontSize: '12px', color: '#1f2937' } : {}}>
                  {student.name}
                </span>
              </div>
              <div style={mode === 'print' ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}}>
                <span style={mode === 'print' ? { fontSize: '12px', fontWeight: '600', color: '#374151', minWidth: '80px' } : {}}>
                  Class:
                </span>
                <span style={mode === 'print' ? { fontSize: '12px', color: '#1f2937' } : {}}>
                  {student.className} - Section {student.section}
                </span>
              </div>
              <div style={mode === 'print' ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}}>
                <span style={mode === 'print' ? { fontSize: '12px', fontWeight: '600', color: '#374151', minWidth: '80px' } : {}}>
                  Student ID:
                </span>
                <span style={mode === 'print' ? { fontSize: '12px', color: '#1f2937' } : {}}>
                  {student.sequenceId}
                </span>
              </div>
            </div>
          </div>
          
          {/* Student Photo */}
          <div 
            className={mode === 'print' ? '' : 'flex flex-col items-center'}
            style={mode === 'print' ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' } : {}}
          >
            <h3 
              className={mode === 'print' ? '' : 'text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-300'}
              style={mode === 'print' ? { 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#1f2937', 
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid #d1d5db',
                width: '100%',
                textAlign: 'center'
              } : {}}
            >
              Student Photo
            </h3>
            <div 
              className={mode === 'print' ? '' : 'w-28 h-32 border-2 border-gray-400 rounded-lg flex items-center justify-center bg-white shadow-sm'}
              style={mode === 'print' ? { 
                width: '112px', 
                height: '128px', 
                border: '2px solid #9ca3af', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: 'white',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              } : {}}
            >
              {student.profileImage ? (
                <img 
                  src={student.profileImage} 
                  alt="Student Photo" 
                  className={mode === 'print' ? '' : 'w-full h-full object-cover rounded-lg'}
                  style={mode === 'print' ? { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' } : {}}
                />
              ) : (
                <span 
                  className={mode === 'print' ? '' : 'text-xs text-gray-500 text-center px-2'}
                  style={mode === 'print' ? { fontSize: '10px', color: '#6b7280', textAlign: 'center', padding: '0 8px' } : {}}
                >
                  Student Photo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subject Schedule */}
        <div className={mode === 'print' ? '' : 'mb-4'} style={mode === 'print' ? { marginBottom: '16px' } : {}}>
          <h3 
            className={mode === 'print' ? '' : 'text-base font-semibold text-gray-800 mb-3 pb-2 border-b-2 border-blue-200'}
            style={mode === 'print' ? { 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '2px solid #bfdbfe'
            } : {}}
          >
            Examination Schedule
          </h3>
          <table 
            className={mode === 'print' ? '' : 'w-full border-collapse border border-gray-300'}
            style={mode === 'print' ? { width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db' } : {}}
          >
            <thead>
              <tr style={mode === 'print' ? { backgroundColor: '#f3f4f6' } : {}}>
                <th 
                  className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300 text-left font-semibold'}
                  style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: '600', fontSize: '11px' } : {}}
                >
                  Date
                </th>
                <th 
                  className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300 text-left font-semibold'}
                  style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: '600', fontSize: '11px' } : {}}
                >
                  Subject
                </th>
                <th 
                  className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300 text-left font-semibold'}
                  style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: '600', fontSize: '11px' } : {}}
                >
                  Time
                </th>
                {enableRoomNumbers && (
                  <th 
                    className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300 text-left font-semibold'}
                    style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: '600', fontSize: '11px' } : {}}
                  >
                    Room
                  </th>
                )}
                <th 
                  className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300 text-left font-semibold'}
                  style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: '600', fontSize: '11px' } : {}}
                >
                  Invigilator Sign
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => (
                <tr key={subject.id}>
                  <td 
                    className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300'}
                    style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', fontSize: '10px' } : {}}
                  >
                    {subject.examDate}
                  </td>
                  <td 
                    className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300'}
                    style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', fontSize: '10px' } : {}}
                  >
                    {subject.name}
                  </td>
                  <td 
                    className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300'}
                    style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', fontSize: '10px' } : {}}
                  >
                    {formatTime12Hour(subject.examHour, subject.examMinute, subject.examAmPm)}
                  </td>
                  {enableRoomNumbers && (
                    <td 
                      className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300'}
                      style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', fontSize: '10px' } : {}}
                    >
                      {subject.roomNumber || 'N/A'}
                    </td>
                  )}
                  <td 
                    className={mode === 'print' ? '' : 'px-2 py-1 border border-gray-300'}
                    style={mode === 'print' ? { padding: '4px 8px', border: '1px solid #d1d5db', height: '20px', minHeight: '20px' } : {}}
                  >
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Instructions */}
        <div 
          className={mode === 'print' ? '' : 'mb-4'}
          style={mode === 'print' ? { 
            marginBottom: '16px',
            pageBreakInside: 'avoid',
            display: 'block',
            visibility: 'visible'
          } : {}}
        >
          <h3 
            className={mode === 'print' ? '' : 'text-base font-semibold text-gray-800 mb-3'}
            style={mode === 'print' ? { 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#1f2937', 
              marginBottom: '12px'
            } : {}}
          >
            Instructions
          </h3>
          <div 
            className={mode === 'print' ? '' : 'grid grid-cols-2 gap-x-4 gap-y-1'}
            style={mode === 'print' ? { 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px 16px',
              fontSize: '11px', 
              color: '#374151', 
              lineHeight: '1.4'
            } : {}}
          >
            {instructions && instructions.length > 0 ? (
              instructions.map((instruction, index) => (
                <div key={index} 
                  className={mode === 'print' ? '' : 'flex items-start'}
                  style={mode === 'print' ? { 
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '2px',
                    visibility: 'visible',
                    color: '#374151'
                  } : {}}
                >
                  <span style={mode === 'print' ? { 
                    marginRight: '6px', 
                    fontSize: '11px',
                    color: '#374151',
                    flexShrink: 0
                  } : {}}>•</span>
                  <span style={mode === 'print' ? { 
                    fontSize: '11px',
                    color: '#374151',
                    lineHeight: '1.3'
                  } : {}}>{instruction}</span>
                </div>
              ))
            ) : (
              // Default instructions if none provided
              <>
                <div 
                  className={mode === 'print' ? '' : 'flex items-start'}
                  style={mode === 'print' ? { 
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '2px',
                    visibility: 'visible',
                    color: '#374151'
                  } : {}}
                >
                  <span style={mode === 'print' ? { 
                    marginRight: '6px', 
                    fontSize: '11px',
                    color: '#374151',
                    flexShrink: 0
                  } : {}}>•</span>
                  <span style={mode === 'print' ? { 
                    fontSize: '11px',
                    color: '#374151',
                    lineHeight: '1.3'
                  } : {}}> Bring this admit card to the examination hall</span>
                </div>
                <div 
                  className={mode === 'print' ? '' : 'flex items-start'}
                  style={mode === 'print' ? { 
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '2px',
                    visibility: 'visible',
                    color: '#374151'
                  } : {}}
                >
                  <span style={mode === 'print' ? { 
                    marginRight: '6px', 
                    fontSize: '11px',
                    color: '#374151',
                    flexShrink: 0
                  } : {}}>•</span>
                  <span style={mode === 'print' ? { 
                    fontSize: '11px',
                    color: '#374151',
                    lineHeight: '1.3'
                  } : {}}>Arrive at least 30 minutes before the exam starts</span>
                </div>
                <div 
                  className={mode === 'print' ? '' : 'flex items-start'}
                  style={mode === 'print' ? { 
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '2px',
                    visibility: 'visible',
                    color: '#374151'
                  } : {}}
                >
                  <span style={mode === 'print' ? { 
                    marginRight: '6px', 
                    fontSize: '11px',
                    color: '#374151',
                    flexShrink: 0
                  } : {}}>•</span>
                  <span style={mode === 'print' ? { 
                    fontSize: '11px',
                    color: '#374151',
                    lineHeight: '1.3'
                  } : {}}>Carry a valid ID proof along with this admit card</span>
                </div>
                <div 
                  className={mode === 'print' ? '' : 'flex items-start'}
                  style={mode === 'print' ? { 
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '2px',
                    visibility: 'visible',
                    color: '#374151'
                  } : {}}
                >
                  <span style={mode === 'print' ? { 
                    marginRight: '6px', 
                    fontSize: '11px',
                    color: '#374151',
                    flexShrink: 0
                  } : {}}>•</span>
                  <span style={mode === 'print' ? { 
                    fontSize: '11px',
                    color: '#374151',
                    lineHeight: '1.3'
                  } : {}}>Mobile phones and electronic devices are not allowed</span>
                </div>
                <div 
                  className={mode === 'print' ? '' : 'flex items-start'}
                  style={mode === 'print' ? { 
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '2px',
                    visibility: 'visible',
                    color: '#374151'
                  } : {}}
                >
                  <span style={mode === 'print' ? { 
                    marginRight: '6px', 
                    fontSize: '11px',
                    color: '#374151',
                    flexShrink: 0
                  } : {}}>•</span>
                  <span style={mode === 'print' ? { 
                    fontSize: '11px',
                    color: '#374151',
                    lineHeight: '1.3'
                  } : {}}>Follow all examination rules and regulations</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Principal Signature */}
        <div 
          className={mode === 'print' ? '' : 'flex justify-end mb-4 mt-4'}
          style={mode === 'print' ? { display: 'flex', justifyContent: 'flex-end', marginBottom: '80px', marginTop: '16px' } : {}}
        >
          <div 
            className={mode === 'print' ? '' : 'text-center'}
            style={mode === 'print' ? { textAlign: 'center', minWidth: '150px' } : {}}
          >
            <div 
              className={mode === 'print' ? '' : 'border-b border-gray-400 mb-1 pb-4'}
              style={mode === 'print' ? { borderBottom: '1px solid #9ca3af', marginBottom: '4px', paddingBottom: '20px', minHeight: '25px' } : {}}
            >
              {/* Signature space */}
            </div>
            <p 
              className={mode === 'print' ? '' : 'text-xs font-medium text-gray-700'}
              style={mode === 'print' ? { fontSize: '10px', fontWeight: '500', color: '#374151', margin: 0 } : {}}
            >
              Principal Signature
            </p>
          </div>
        </div>

        {/* Footer */}
        <div 
          className={mode === 'print' ? '' : 'mt-auto bg-gray-50 px-8 py-4 border-t'}
          style={mode === 'print' ? {
            position: 'absolute',
            bottom: '20mm',
            left: '20mm',
            right: '20mm',
            background: '#f9fafb',
            padding: '16px 32px',
            borderTop: '1px solid #e5e7eb'
          } : {
            marginTop: 'auto',
            background: '#f9fafb',
            padding: '16px 32px',
            borderTop: '1px solid #e5e7eb'
          }}
        >
          <div 
            className={mode === 'print' ? '' : 'flex justify-between items-center text-sm text-gray-600'}
            style={mode === 'print' ? {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#4b5563'
            } : {}}
          >
            <div 
              className={mode === 'print' ? '' : 'flex items-center space-x-4'}
              style={mode === 'print' ? { display: 'flex', alignItems: 'center', gap: '16px' } : {}}
            >
              <span>{settings.phone}</span>
              <span>{settings.email}</span>
              <span>{settings.website}</span>
            </div>
            <div 
              className={mode === 'print' ? '' : 'flex items-center text-xs text-gray-500'}
              style={mode === 'print' ? { display: 'flex', alignItems: 'center', fontSize: '10px', color: '#6b7280' } : {}}
            >
              <span>Powered by</span>
              <strong className={mode === 'print' ? '' : 'ml-1'} style={mode === 'print' ? { marginLeft: '4px' } : {}}>
                EduLogix
              </strong>
            </div>
          </div>
        </div>
    </div>
  );
};

export default AdmitCardTemplate;
