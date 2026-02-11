import React from 'react';
import { IDCardTemplateProps } from './types';

const NewIDCardTemplate: React.FC<IDCardTemplateProps> = ({
  settings,
  student,
  templateId,
  side,
  mode = 'preview',
  className = ''
}) => {
  const isLandscape = templateId === 'landscape';
  const isFront = side === 'front';

  // Card dimensions - Landscape: 85.6mm × 54mm, Portrait: 54mm × 85.6mm
  const cardStyle = {
    width: isLandscape ? '85.6mm' : '54mm',
    height: isLandscape ? '54mm' : '85.6mm',
    backgroundColor: 'white',
    position: 'relative' as const,
    overflow: 'hidden',
    fontFamily: '"Poppins", Arial, sans-serif',
    fontSize: '12px',
    color: '#000',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    border: '0.2mm solid #ddd'
  };

  // Decorative elements styles
  const decorativeStyles = {
    topBar: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '15mm',
      background: 'linear-gradient(90deg, #D4A017 0%, #D4A017 70%, #4169E1 70%, #4169E1 100%)',
      zIndex: 1
    },
    bottomLeftCurve: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      width: isLandscape ? '25mm' : '20mm',
      height: isLandscape ? '20mm' : '25mm',
      background: 'linear-gradient(45deg, #4169E1 0%, #87CEEB 100%)',
      borderTopRightRadius: '100%',
      zIndex: 1
    },
    bottomRightCurve: {
      position: 'absolute' as const,
      bottom: 0,
      right: 0,
      width: isLandscape ? '30mm' : '25mm',
      height: isLandscape ? '15mm' : '20mm',
      background: 'linear-gradient(-45deg, #D4A017 0%, #87CEEB 50%)',
      borderTopLeftRadius: '100%',
      zIndex: 1
    },
    blueTab: {
      position: 'absolute' as const,
      top: '15mm',
      left: isLandscape ? '15mm' : '10mm',
      width: isLandscape ? '8mm' : '6mm',
      height: isLandscape ? '25mm' : '30mm',
      backgroundColor: '#4169E1',
      borderBottomLeftRadius: '50%',
      borderBottomRightRadius: '50%',
      zIndex: 2
    }
  };

  const renderLandscapeFront = () => (
    <div style={{
      ...cardStyle,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Gold Bar - Thicker */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '14mm',
        backgroundColor: '#d29c00',
        zIndex: 1
      }}></div>

      {/* Bottom Gradient Triangle */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '35%',
        background: 'linear-gradient(135deg, #476fb3 40%, #d29c00 80%)',
        clipPath: 'polygon(0 40%, 100% 100%, 0% 100%)',
        zIndex: 1
      }}></div>

      {/* School Logo and Info */}
      <div style={{
        position: 'absolute',
        top: '2mm',
        left: '4mm',
        right: '4mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 2
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3mm'
        }}>
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="School Logo"
              style={{ width: '10mm', height: '10mm', objectFit: 'contain' }}
            />
          ) : (
            <div style={{
              width: '10mm',
              height: '10mm',
              backgroundColor: '#2a4b8d',
              borderRadius: '2mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              📚
            </div>
          )}
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#000',
            maxWidth: '50mm'
          }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {settings.schoolName}
            </div>
            <div style={{ fontSize: '7px', opacity: 0.8 }}>
              {settings.schoolCode}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        zIndex: 2,
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        padding: '0 16px'
      }}>
        {/* Student Info */}
        <div style={{
          flex: 1,
          fontSize: '2.5mm',
          lineHeight: 1.3,
          marginTop: '0'
        }}>
          <div style={{ marginBottom: '1.2mm' }}>
            <strong>Name</strong> : {student.name}
          </div>
          <div style={{ marginBottom: '1.2mm' }}>
            <strong>ID Number</strong> : {student.sequenceId || student.rollNumber}
          </div>
          <div style={{ marginBottom: '1.2mm' }}>
            <strong>Class/Section</strong> : {student.className} - {student.section}
          </div>
          <div style={{ marginBottom: '1.2mm' }}>
            <strong>Date of Birth</strong> : {student.dateOfBirth || 'N/A'}
          </div>
          <div style={{ marginBottom: '1.2mm' }}>
            <strong>Blood Group</strong> : {student.bloodGroup || 'N/A'}
          </div>
        </div>

        {/* Photo Frame */}
        <div style={{
          width: '22mm',
          height: '28mm',
          border: '1mm solid #2a4b8d',
          borderRadius: '1mm',
          overflow: 'hidden',
          background: 'linear-gradient(to top, #a3d2ff, #ffffff)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '2.5mm',
          color: '#777',
          marginTop: '4mm'
        }}>
          {student.profileImage ? (
            <img
              src={student.profileImage}
              alt="Student Photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            'Photo'
          )}
        </div>
      </div>
    </div>
  );

  const renderLandscapeBack = () => (
    <div style={{
      ...cardStyle,
      padding: '10mm 8mm',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Gold Bar - Thicker */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '14mm',
        backgroundColor: '#d29c00',
        zIndex: 1
      }}></div>

      {/* Bottom Gradient Triangle */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '14mm',
        background: 'linear-gradient(145deg, #476fb3 40%, #d29c00 85%)',
        clipPath: 'polygon(0 40%, 100% 100%, 0% 100%)',
        zIndex: 1
      }}></div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2
      }}>

        {/* Back Info */}
        <div style={{
          fontSize: '2.2mm',
          marginTop: '8mm',
          lineHeight: 1.4,
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1.8mm', textAlign: 'left' }}>
            <strong>Student Address</strong> : {student.address || '___________________________'}
          </div>
          <div style={{ marginBottom: '1.8mm', textAlign: 'left' }}>
            <strong>Parent's Name</strong> : {student.fatherName || '____________________________'}
          </div>
          <div style={{ marginBottom: '1.8mm', textAlign: 'left' }}>
            <strong>Mobile No.</strong> : {student.phone || '____________________________'}
          </div>

          <div style={{ marginTop: '2.5mm', marginBottom: '1mm', textAlign: 'left' }}>
            <strong>School Address:</strong> {settings.schoolName}<br />
            <span style={{ marginLeft: '20mm' }}>{settings.address}</span>
          </div>

          <div style={{ fontSize: '2mm', fontWeight: 'bold', textAlign: 'center', marginTop: '1.5mm' }}>
            Return to above address if lost
          </div>
        </div>
      </div>

      {/* Logo */}
      <div style={{
        position: 'absolute',
        bottom: '4mm',
        right: '6mm',
        textAlign: 'right'
      }}>
        <img
          src="/logo.png"
          alt="EduLogix"
          style={{ width: '8mm', height: '6mm', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="fontSize: 4mm; color: #000;">📘</div>';
          }}
        />
      </div>
    </div>
  );

  const renderPortraitFront = () => (
    <div style={{
      ...cardStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8mm 6mm',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Gold Bar - Straight, no curves */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '16mm',
        backgroundColor: '#d29c00',
        zIndex: 1
      }}></div>

      {/* Bottom Gradient Triangle */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '20mm',
        background: 'linear-gradient(135deg, #476fb3 40%, #d29c00 85%)',
        clipPath: 'polygon(0 40%, 100% 100%, 0% 100%)',
        zIndex: 1
      }}></div>

      {/* School Logo and Info */}
      <div style={{
        position: 'absolute',
        top: '4mm',
        left: '4mm',
        display: 'flex',
        alignItems: 'center',
        gap: '2mm',
        zIndex: 2
      }}>
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt="School Logo"
            style={{ width: '8mm', height: '8mm', objectFit: 'contain' }}
          />
        ) : (
          <div style={{
            width: '8mm',
            height: '8mm',
            backgroundColor: '#2a4b8d',
            borderRadius: '1mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '6px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            📚
          </div>
        )}
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#000',
          textAlign: 'left',
          maxWidth: '40mm'
        }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {settings.schoolName}
          </div>
          <div style={{ fontSize: '7px', opacity: 0.8 }}>
            {settings.schoolCode}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: '17mm',
        padding: '0 4mm'
      }}>
        {/* Photo Frame */}
        <div style={{
          width: '24mm',
          height: '28mm',
          border: '1mm solid #2a4b8d',
          borderRadius: '2mm',
          overflow: 'hidden',
          background: 'linear-gradient(to top, #a3d2ff, #ffffff)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '3mm',
          color: '#777',
          marginBottom: '1.5mm'
        }}>
          {student.profileImage ? (
            <img
              src={student.profileImage}
              alt="Student Photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            'Photo'
          )}
        </div>

        {/* Student Info */}
        <div style={{
          width: '100%',
          fontSize: '2.6mm',
          lineHeight: 1.4,
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '1mm', fontWeight: 'bold', fontSize: '3mm' }}>
            <strong>Name :</strong> {student.name}
          </div>
          <div style={{ marginBottom: '0.8mm' }}>
            <strong>ID Number :</strong> {student.sequenceId || student.rollNumber}
          </div>
          <div style={{ marginBottom: '0.8mm' }}>
            <strong>Class/Section :</strong> {student.className} - {student.section}
          </div>
          <div style={{ marginBottom: '0.8mm' }}>
            <strong>Date of Birth :</strong> {student.dateOfBirth || '15/01/2008'}
          </div>
          <div style={{ marginBottom: '0.8mm' }}>
            <strong>Blood Group :</strong> {student.bloodGroup || 'O+'}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPortraitBack = () => (
    <div style={{
      ...cardStyle,
      padding: '4mm',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Gold Bar - Straight, no curves */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '16mm',
        backgroundColor: '#d29c00',
        zIndex: 1
      }}></div>

      {/* Bottom Gradient Triangle */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '18mm',
        background: 'linear-gradient(145deg, #476fb3 40%, #d29c00 85%)',
        clipPath: 'polygon(0 40%, 100% 100%, 0% 100%)',
        zIndex: 1
      }}></div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2
      }}>
        {/* Back Info */}
        <div style={{
          fontSize: '2.4mm',
          marginTop: '18mm',
          lineHeight: 1.4,
          textAlign: 'left',
          padding: '0 2mm'
        }}>
          <div style={{ marginBottom: '2mm' }}>
            <strong>Student Address</strong> : {student.address || '123 Student Street, City, State 12345'}
          </div>
          <div style={{ marginBottom: '2mm' }}>
            <strong>Parent's Name</strong> : {student.fatherName || 'Mr. Robert Doe'}
          </div>
          <div style={{ marginBottom: '2mm' }}>
            <strong>Mobile No.</strong> : {student.phone || '+91-9876543210'}
          </div>

          <div style={{ marginTop: '2.5mm', marginBottom: '1mm', textAlign: 'left' }}>
            <strong>School Address:</strong> {settings.schoolName}<br />
            <span style={{ marginLeft: '18mm' }}>{settings.address}</span>
          </div>

          <div style={{ fontSize: '2mm', fontWeight: 'bold', textAlign: 'center', marginTop: '1.5mm' }}>
            Return to above address if lost
          </div>
        </div>
      </div>

      {/* Logo */}
      <div style={{
        position: 'absolute',
        bottom: '5mm',
        right: '6mm',
        textAlign: 'right'
      }}>
        <img
          src="/logo.png"
          alt="EduLogix"
          style={{ width: '8mm', height: '6mm', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="fontSize: 4mm; color: #000; marginBottom: 1mm;">📘</div><div style="fontSize: 3mm;">EduLogiX</div>';
          }}
        />
      </div>
    </div>
  );

  const renderCard = () => {
    if (isLandscape) {
      return isFront ? renderLandscapeFront() : renderLandscapeBack();
    } else {
      return isFront ? renderPortraitFront() : renderPortraitBack();
    }
  };

  return (
    <div className={`id-card ${className}`} style={{
      display: 'inline-block',
      margin: mode === 'print' ? 0 : '10px',
      pageBreakInside: 'avoid'
    }}>
      {renderCard()}
    </div>
  );
};

export default NewIDCardTemplate;
