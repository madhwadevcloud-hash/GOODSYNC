import React from 'react';
import { IDCardTemplateProps } from './types';

const NewIDCardTemplate: React.FC<IDCardTemplateProps> = ({
  settings,
  student,
  templateId,
  side,
  mode = 'preview',
  theme = 'modern',
  className = ''
}) => {
  const isLandscape = templateId === 'landscape';
  const isFront = side === 'front';

  const headerColor = settings.headerColor || '#1e3a8a';
  const accentColor = settings.accentColor || '#3b82f6';

  const baseCardStyle = {
    width: isLandscape ? '85.6mm' : '54mm',
    height: isLandscape ? '54mm' : '85.6mm',
    backgroundColor: 'white',
    position: 'relative' as const,
    overflow: 'hidden',
    fontFamily: '"Inter", "Poppins", Arial, sans-serif',
    color: '#1f2937',
    borderRadius: mode === 'print' ? '0' : '8px',
    boxShadow: mode === 'print' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: mode === 'print' ? 'none' : '1px solid #e5e7eb',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  };

  // Helper for Logo
  const renderLogo = (size = '8mm') => (
    settings.logoUrl ? (
      <img src={settings.logoUrl} alt="Logo" style={{ width: size, height: size, objectFit: 'contain' }} />
    ) : (
      <div style={{ width: size, height: size, backgroundColor: accentColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `calc(${size} * 0.5)` }}>??</div>
    )
  );

  // Helper for Photo
  const renderPhoto = (width = '22mm', height = '28mm', borderStyle = `2px solid ${accentColor}`) => (
    <div style={{ width, height, border: borderStyle, borderRadius: '4px', overflow: 'hidden', backgroundColor: '#e5e7eb', flexShrink: 0 }}>
      {student.profileImage ? (
        <img src={student.profileImage} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '8mm' }}>??</div>
      )}
    </div>
  );

  // ==========================================
  // LANDSCAPE DESIGNS
  // ==========================================
  
  const renderModernLandscape = () => (
    <div style={{ ...baseCardStyle, background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)' }}>
      {/* Curved Background Accent */}
      <div style={{ position: 'absolute', top: '-10mm', right: '-10mm', width: '50mm', height: '50mm', backgroundColor: accentColor, borderRadius: '50%', opacity: 0.1, zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-15mm', left: '-15mm', width: '40mm', height: '40mm', backgroundColor: headerColor, borderRadius: '50%', opacity: 0.05, zIndex: 0 }}></div>

      {/* Glassmorphism Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '3mm 4mm', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.8)', zIndex: 1, position: 'relative' }}>
        <div style={{ marginRight: '3mm', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: '50%', padding: '1mm', backgroundColor: '#fff' }}>{renderLogo('7mm')}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '3.8mm', fontWeight: '800', color: headerColor, letterSpacing: '0.2px' }}>{settings.schoolName}</div>
          <div style={{ fontSize: '2.2mm', color: accentColor, fontWeight: '600' }}>{settings.schoolCode}</div>
        </div>
      </div>
      
      {/* Body Area */}
      <div style={{ display: 'flex', padding: '3mm 4mm', flex: 1, position: 'relative', zIndex: 1, alignItems: 'center' }}>
        <div style={{ marginRight: '5mm', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', border: `2px solid #fff`, flexShrink: 0 }}>
          {renderPhoto('22mm', '28mm', 'none')}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '4.5mm', fontWeight: '800', color: '#1e293b', marginBottom: '1mm' }}>
            {student.name}
          </div>
          <div style={{ width: '20mm', height: '3px', backgroundColor: accentColor, borderRadius: '2px', marginBottom: '1.5mm' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.8mm 2mm', fontSize: '2.1mm' }}>
            <span style={{ color: '#64748b', fontWeight: '600' }}>ID NO:</span> <span style={{ fontWeight: '700', color: '#334155' }}>{student.sequenceId || student.rollNumber}</span>
            <span style={{ color: '#64748b', fontWeight: '600' }}>CLASS:</span> <span style={{ fontWeight: '700', color: '#334155' }}>{student.className} - {student.section}</span>
            <span style={{ color: '#64748b', fontWeight: '600' }}>DOB:</span> <span style={{ fontWeight: '700', color: '#334155' }}>{student.dateOfBirth || 'N/A'}</span>
            <span style={{ color: '#64748b', fontWeight: '600' }}>BLOOD:</span> <span style={{ fontWeight: '700', color: '#334155' }}>{student.bloodGroup || 'N/A'}</span>
            <span style={{ color: '#64748b', fontWeight: '600' }}>PHONE:</span> <span style={{ fontWeight: '700', color: '#334155' }}>{student.phone || 'N/A'}</span>
            <span style={{ color: '#64748b', fontWeight: '600' }}>ADDRESS:</span> <span style={{ fontWeight: '700', color: '#334155', lineHeight: '1.1' }} title={student.address || 'N/A'}>{student.address || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClassicLandscape = () => (
    <div style={{ ...baseCardStyle, backgroundColor: '#ffffff', flexDirection: 'row' }}>
      {/* Left Sharp Solid Block */}
      <div style={{ width: '30mm', backgroundColor: headerColor, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2mm 3mm' }}>
        <div style={{ marginBottom: '2.5mm', padding: '1mm', backgroundColor: '#fff', flexShrink: 0 }}>{renderLogo('11mm')}</div>
        <div style={{ position: 'relative', zIndex: 1, backgroundColor: '#fff', padding: '1mm', flexShrink: 0 }}>
          {renderPhoto('21mm', '26mm', 'none')}
        </div>
        <div style={{ marginTop: 'auto', color: '#fff', fontSize: '2.5mm', fontWeight: 'bold', letterSpacing: '1px', flexShrink: 0 }}>{settings.schoolCode}</div>
      </div>
      
      {/* Right Details Area */}
      <div style={{ flex: 1, padding: '3mm', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Geometric Accent */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '0', height: '0', borderTop: `15mm solid ${accentColor}`, borderLeft: '15mm solid transparent' }}></div>
        
        <div style={{ fontSize: '4mm', fontWeight: 'bold', color: headerColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1mm', maxWidth: '45mm', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0, lineHeight: 1.2 }}>
          {settings.schoolName}
        </div>
        <div style={{ height: '2px', backgroundColor: headerColor, width: '100%', marginBottom: '2.5mm', flexShrink: 0 }}></div>
        
        <div style={{ fontSize: '4.5mm', fontWeight: 'bold', color: '#000', marginBottom: '1mm', flexShrink: 0 }}>
          {student.name}
        </div>
        
        <table style={{ width: '100%', fontSize: '2.1mm', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor, width: '18mm' }}>ID NO</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.sequenceId || student.rollNumber}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor }}>CLASS</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.className} - {student.section}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor }}>D.O.B</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.dateOfBirth || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor }}>BLOOD</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.bloodGroup || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor }}>PHONE</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor }}>ADDRESS</td>
              <td style={{ padding: '0.2mm 0', color: '#000', display: 'inline-block', lineHeight: '1.1' }} title={student.address || 'N/A'}>{student.address || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMinimalistLandscape = () => (
    <div style={{ ...baseCardStyle, backgroundColor: '#ffffff', padding: '2mm' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', height: '100%', display: 'flex', flexDirection: 'column', padding: '3mm', position: 'relative' }}>
        {/* Subtle accent border at the top */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', backgroundColor: accentColor, borderTopLeftRadius: '5px', borderTopRightRadius: '5px' }}></div>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3mm', marginTop: '1mm' }}>
          <div style={{ fontSize: '3.5mm', fontWeight: '700', color: '#1f2937', letterSpacing: '0.5px', textTransform: 'uppercase', maxWidth: '50mm', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{settings.schoolName}</div>
          <div>{renderLogo('7mm')}</div>
        </div>
        
        {/* Body */}
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '4mm' }}>
            <div style={{ fontSize: '4.2mm', fontWeight: '600', color: '#111827', marginBottom: '1.5mm', letterSpacing: '0.2px' }}>
              {student.name}
            </div>
            <div style={{ fontSize: '2.1mm', display: 'flex', flexDirection: 'column', gap: '0.5mm', color: '#4b5563' }}>
              <div style={{ borderBottom: '1px dotted #e5e7eb', paddingBottom: '0.2mm' }}><span style={{ display: 'inline-block', width: '12mm', color: '#9ca3af', fontWeight: '500' }}>ID NO:</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.sequenceId || student.rollNumber}</span></div>
              <div style={{ borderBottom: '1px dotted #e5e7eb', paddingBottom: '0.2mm' }}><span style={{ display: 'inline-block', width: '12mm', color: '#9ca3af', fontWeight: '500' }}>CLASS:</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.className} - {student.section}</span></div>
              <div style={{ paddingBottom: '0.2mm', borderBottom: '1px dotted #e5e7eb' }}><span style={{ display: 'inline-block', width: '12mm', color: '#9ca3af', fontWeight: '500' }}>DOB:</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.dateOfBirth || 'N/A'}</span></div>
              <div style={{ paddingBottom: '0.2mm', borderBottom: '1px dotted #e5e7eb' }}><span style={{ display: 'inline-block', width: '12mm', color: '#9ca3af', fontWeight: '500' }}>PHONE:</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.phone || 'N/A'}</span></div>
              <div style={{ paddingBottom: '0.2mm', display: 'flex' }}><span style={{ display: 'inline-block', width: '12mm', color: '#9ca3af', fontWeight: '500', flexShrink: 0 }}>ADDR:</span> <span style={{ color: '#1f2937', fontWeight: '500', display: 'inline-block', flex: 1, lineHeight: '1.1' }} title={student.address || 'N/A'}>{student.address || 'N/A'}</span></div>
            </div>
          </div>
          <div style={{ alignSelf: 'center' }}>
            <div style={{ padding: '1mm', border: '1px solid #f3f4f6', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
              {renderPhoto('20mm', '25mm', 'none')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // PORTRAIT DESIGNS
  // ==========================================

  const renderModernPortrait = () => (
    <div style={{ ...baseCardStyle, background: 'linear-gradient(to bottom, #ffffff 0%, #f1f5f9 100%)' }}>
      {/* Curved Header Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '35mm', backgroundColor: headerColor, borderBottomLeftRadius: '50% 20%', borderBottomRightRadius: '50% 20%', zIndex: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}></div>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '35mm', backgroundImage: `linear-gradient(45deg, transparent 40%, ${accentColor} 100%)`, opacity: 0.5, borderBottomLeftRadius: '50% 20%', borderBottomRightRadius: '50% 20%', zIndex: 0 }}></div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3mm', flex: 1 }}>
        {/* Header Text & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: '2mm' }}>
          <div style={{ backgroundColor: '#fff', padding: '1mm', borderRadius: '50%', marginRight: '2mm', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{renderLogo('8mm')}</div>
          <div style={{ fontSize: '3.5mm', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px' }}>{settings.schoolName}</div>
        </div>
        
        {/* Photo overlapping the curve */}
        <div style={{ marginTop: '1mm', marginBottom: '1.5mm', borderRadius: '50%', padding: '1mm', backgroundColor: '#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', flexShrink: 0 }}>
          <div style={{ borderRadius: '50%', overflow: 'hidden', width: '24mm', height: '24mm', border: `2px solid ${accentColor}` }}>
            {student.profileImage ? (
              <img src={student.profileImage} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '8mm', backgroundColor: '#e5e7eb' }}>??</div>
            )}
          </div>
        </div>
        
        <div style={{ fontSize: '4mm', fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: '0.2mm', flexShrink: 0 }}>{student.name}</div>
        <div style={{ fontSize: '2mm', color: accentColor, fontWeight: '700', marginBottom: '1mm', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>STUDENT</div>
        
        {/* Details Grid (Glassmorphism look) */}
        <div style={{ width: '90%', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', padding: '1.2mm', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.9)', fontSize: '2.0mm', display: 'grid', gridTemplateColumns: '1fr', gap: '0.3mm', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', flexShrink: 0, lineHeight: 1.1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.2mm' }}>
            <strong style={{ color: '#64748b' }}>ID NO:</strong> <span style={{ fontWeight: '700', color: '#334155' }}>{student.sequenceId || student.rollNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.2mm' }}>
            <strong style={{ color: '#64748b' }}>CLASS:</strong> <span style={{ fontWeight: '700', color: '#334155' }}>{student.className} - {student.section}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.2mm' }}>
            <strong style={{ color: '#64748b' }}>DOB:</strong> <span style={{ fontWeight: '700', color: '#334155' }}>{student.dateOfBirth || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.2mm' }}>
            <strong style={{ color: '#64748b' }}>BLOOD:</strong> <span style={{ fontWeight: '700', color: '#334155' }}>{student.bloodGroup || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.2mm' }}>
            <strong style={{ color: '#64748b' }}>PHONE:</strong> <span style={{ fontWeight: '700', color: '#334155' }}>{student.phone || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <strong style={{ color: '#64748b', marginRight: '2mm' }}>ADDR:</strong> <span style={{ fontWeight: '700', color: '#334155', textAlign: 'right', lineHeight: '1.1' }} title={student.address || 'N/A'}>{student.address || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClassicPortrait = () => (
    <div style={{ ...baseCardStyle, backgroundColor: '#ffffff' }}>
      {/* Sharp Diagonal Background Split */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '35mm', backgroundColor: headerColor, clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '0', height: '0', borderTop: `15mm solid ${accentColor}`, borderLeft: '15mm solid transparent', zIndex: 1 }}></div>
      
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3mm', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '2mm', flexShrink: 0 }}>
          <div style={{ padding: '1mm', backgroundColor: '#fff' }}>{renderLogo('8mm')}</div>
          <div style={{ fontSize: '3.2mm', fontWeight: 'bold', color: '#ffffff', marginLeft: '2mm', textTransform: 'uppercase' }}>{settings.schoolName}</div>
        </div>
        
        {/* Photo sharp border */}
        <div style={{ marginBottom: '1.5mm', backgroundColor: '#fff', padding: '1.5mm', border: `1px solid ${headerColor}`, flexShrink: 0 }}>
          {renderPhoto('22mm', '28mm', 'none')}
        </div>
        
        <div style={{ fontSize: '4.5mm', fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: '0.5mm', textTransform: 'uppercase', flexShrink: 0 }}>{student.name}</div>
        <div style={{ height: '1px', width: '40mm', backgroundColor: accentColor, marginBottom: '1.5mm', flexShrink: 0 }}></div>
        
        <table style={{ width: '90%', fontSize: '2.1mm', borderCollapse: 'collapse', textAlign: 'left', flexShrink: 0 }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor, borderBottom: '1px solid #e5e7eb', width: '20mm' }}>ID NO</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.sequenceId || student.rollNumber}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor, borderBottom: '1px solid #e5e7eb' }}>CLASS</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.className} - {student.section}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor, borderBottom: '1px solid #e5e7eb' }}>DOB</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.dateOfBirth || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor, borderBottom: '1px solid #e5e7eb' }}>BLOOD</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.bloodGroup || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor, borderBottom: '1px solid #e5e7eb' }}>PHONE</td>
              <td style={{ padding: '0.2mm 0', color: '#000', borderBottom: '1px solid #e5e7eb' }}>{student.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor }}>ADDR</td>
              <td style={{ padding: '0.2mm 0', color: '#000', display: 'inline-block', lineHeight: '1.1' }} title={student.address || 'N/A'}>{student.address || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Bottom accent line */}
      <div style={{ height: '3mm', width: '100%', backgroundColor: headerColor }}></div>
    </div>
  );

  const renderMinimalistPortrait = () => (
    <div style={{ ...baseCardStyle, backgroundColor: '#ffffff', padding: '2mm' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', height: '100%', display: 'flex', flexDirection: 'column', padding: '2mm', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', backgroundColor: accentColor, borderTopLeftRadius: '5px', borderTopRightRadius: '5px' }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2mm', marginTop: '1mm' }}>
          <div style={{ marginBottom: '1mm' }}>{renderLogo('8mm')}</div>
          <div style={{ fontSize: '3mm', fontWeight: '700', color: '#1f2937', textAlign: 'center', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: '1.2' }}>{settings.schoolName}</div>
        </div>
        
        <div style={{ alignSelf: 'center', marginBottom: '2mm' }}>
          <div style={{ padding: '1mm', border: '1px solid #f3f4f6', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
            {renderPhoto('20mm', '25mm', 'none')}
          </div>
        </div>
        
        <div style={{ fontSize: '4mm', fontWeight: '600', color: '#111827', marginBottom: '1mm', textAlign: 'center', letterSpacing: '0.2px' }}>
          {student.name}
        </div>
        
        <div style={{ width: '100%', height: '1px', backgroundColor: '#f3f4f6', marginBottom: '1mm' }}></div>
        
        <div style={{ fontSize: '2.1mm', display: 'flex', flexDirection: 'column', gap: '0.3mm', color: '#4b5563', flex: 1, justifyContent: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e5e7eb', paddingBottom: '0.2mm' }}>
            <span style={{ color: '#9ca3af', fontWeight: '500' }}>ID NO</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.sequenceId || student.rollNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e5e7eb', paddingBottom: '0.2mm' }}>
            <span style={{ color: '#9ca3af', fontWeight: '500' }}>CLASS</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.className} - {student.section}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e5e7eb', paddingBottom: '0.2mm' }}>
            <span style={{ color: '#9ca3af', fontWeight: '500' }}>DOB</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.dateOfBirth || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #e5e7eb', paddingBottom: '0.2mm' }}>
            <span style={{ color: '#9ca3af', fontWeight: '500' }}>PHONE</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.phone || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ color: '#9ca3af', fontWeight: '500', marginRight: '2mm' }}>ADDR</span> <span style={{ color: '#1f2937', fontWeight: '500', textAlign: 'right', lineHeight: '1.1' }} title={student.address || 'N/A'}>{student.address || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // BACK DESIGNS
  // ==========================================

  const renderLandscapeBack = () => (
    <div style={{ ...baseCardStyle, backgroundColor: theme === 'modern' ? '#f8fafc' : '#ffffff', border: theme === 'minimalist' ? `1px solid #d1d5db` : 'none' }}>
      {theme === 'modern' && <div style={{ position: 'absolute', bottom: '-20mm', right: '-20mm', width: '60mm', height: '60mm', backgroundColor: accentColor, borderRadius: '50%', opacity: 0.05, zIndex: 0 }}></div>}
      {theme === 'classic' && <div style={{ position: 'absolute', top: 0, left: 0, width: '4mm', height: '100%', backgroundColor: headerColor, zIndex: 0 }}></div>}
      
      <div style={{ padding: '4mm', flex: 1, display: 'flex', flexDirection: 'column', fontSize: '2.5mm', zIndex: 1, marginLeft: theme === 'classic' ? '4mm' : '0' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '3.2mm', marginBottom: '3mm', color: headerColor, borderBottom: theme !== 'minimalist' ? `2px solid ${accentColor}` : '1px solid #e5e7eb', paddingBottom: '1.5mm', letterSpacing: '0.5px' }}>TERMS & CONDITIONS</div>
        
        <ul style={{ paddingLeft: '4mm', margin: '0 0 3mm 0', color: '#4b5563', lineHeight: '1.6', flex: 1 }}>
          <li>This card is the property of <strong style={{ color: '#111827' }}>{settings.schoolName}</strong>.</li>
          <li>It must be carried at all times while in the school premises.</li>
          <li>If found, please return to the school address.</li>
          <li>This card is non-transferable.</li>
        </ul>
      </div>
    </div>
  );

  const renderPortraitBack = () => (
    <div style={{ ...baseCardStyle, backgroundColor: theme === 'modern' ? '#f8fafc' : '#ffffff', border: theme === 'minimalist' ? `1px solid #d1d5db` : 'none', padding: theme === 'minimalist' ? '4mm' : '0' }}>
      <div style={{ border: theme === 'minimalist' ? '1px solid #e5e7eb' : 'none', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {theme === 'modern' && <div style={{ position: 'absolute', top: '-20mm', left: '-20mm', width: '60mm', height: '60mm', backgroundColor: accentColor, borderRadius: '50%', opacity: 0.05, zIndex: 0 }}></div>}
        {theme === 'classic' && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4mm', backgroundColor: headerColor, zIndex: 0 }}></div>}
        
        <div style={{ padding: '3mm', flex: 1, display: 'flex', flexDirection: 'column', fontSize: '2.6mm', zIndex: 1, marginTop: theme === 'classic' ? '4mm' : '0' }}>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '3.5mm', marginBottom: '2mm', color: headerColor, borderBottom: theme !== 'minimalist' ? `2px solid ${accentColor}` : '1px solid #e5e7eb', paddingBottom: '1mm', letterSpacing: '0.5px', flexShrink: 0 }}>TERMS & CONDITIONS</div>
          
          <ul style={{ paddingLeft: '4mm', margin: '0 0 2mm 0', color: '#4b5563', lineHeight: '1.4', flex: 1 }}>
            <li style={{ marginBottom: '0.5mm' }}>This card is the property of <strong style={{ color: '#111827' }}>{settings.schoolName}</strong>.</li>
            <li style={{ marginBottom: '0.5mm' }}>It must be carried at all times while in the school premises.</li>
            <li style={{ marginBottom: '0.5mm' }}>If found, please return to the school address.</li>
            <li>This card is non-transferable.</li>
          </ul>
          
          <div style={{ marginTop: 'auto', textAlign: 'center', lineHeight: '1.4', backgroundColor: theme === 'modern' ? '#fff' : theme === 'classic' ? '#f3f4f6' : 'transparent', padding: theme === 'minimalist' ? '2mm 0 0 0' : '2mm', borderRadius: theme === 'modern' ? '8px' : '0', border: theme === 'modern' ? '1px solid #e5e7eb' : theme === 'classic' ? `1px solid ${headerColor}` : 'none', borderTop: theme === 'minimalist' ? '1px solid #e5e7eb' : undefined, boxShadow: theme === 'modern' ? '0 2px 4px rgba(0,0,0,0.02)' : 'none', flexShrink: 0 }}>
            <strong style={{ color: headerColor, fontSize: '2.8mm', display: 'block' }}>{settings.schoolName}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  // Router
  let content = null;
  if (isLandscape) {
    if (isFront) {
      if (theme === 'classic') content = renderClassicLandscape();
      else if (theme === 'minimalist') content = renderMinimalistLandscape();
      else content = renderModernLandscape();
    } else {
      content = renderLandscapeBack();
    }
  } else {
    if (isFront) {
      if (theme === 'classic') content = renderClassicPortrait();
      else if (theme === 'minimalist') content = renderMinimalistPortrait();
      else content = renderModernPortrait();
    } else {
      content = renderPortraitBack();
    }
  }

  return (
    <div className={`id-card-template ${className}`} style={{ width: 'fit-content', height: 'fit-content' }}>
      {content}
    </div>
  );
};

export default NewIDCardTemplate;
