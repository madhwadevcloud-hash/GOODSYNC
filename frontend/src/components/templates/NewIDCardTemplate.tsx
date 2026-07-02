import React from 'react';
import { IDCardTemplateProps } from './types';

const NewIDCardTemplate: React.FC<IDCardTemplateProps> = ({
  settings,
  student,
  templateId,
  side,
  mode = 'preview',
  theme = 'modern',
  principalSign,
  termsAndConditions,
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

  // Helper for Dynamic Font Size
  const getDynamicFontSize = (text: string, baseSize: number, minSize: number = 2.0, threshold: number = 20) => {
    if (!text || text.length <= threshold) return `${baseSize}mm`;
    const diff = text.length - threshold;
    const newSize = baseSize - (diff * 0.08);
    return `${Math.max(minSize, newSize)}mm`;
  };

  const renderPrincipalSignature = (color = '#1f2937', absolutePosition: React.CSSProperties = { bottom: '2mm', right: '4mm' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'absolute', ...absolutePosition, zIndex: 2, mixBlendMode: 'multiply' }}>
      {principalSign ? (
        <img src={principalSign} alt="Principal Signature" style={{ height: '6mm', objectFit: 'contain', marginBottom: '0.5mm' }} />
      ) : (
        <div style={{ height: '6mm', marginBottom: '0.5mm' }}></div>
      )}
      <div style={{ fontSize: '1.6mm', fontWeight: 'bold', color, textTransform: 'uppercase' }}>Principal</div>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: getDynamicFontSize(settings.schoolName, 3.8, 2.5, 20), fontWeight: '800', color: headerColor, letterSpacing: '0.2px', lineHeight: '1.2' }}>{settings.schoolName}</div>
          {settings.address ? (
            <div style={{ fontSize: '1.8mm', color: '#64748b', marginTop: '0.5mm', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{settings.address}</div>
          ) : (
            <div style={{ fontSize: '2.2mm', color: accentColor, fontWeight: '600' }}>{settings.schoolCode}</div>
          )}
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
          </div>
        </div>
      </div>
      {renderPrincipalSignature(headerColor, { bottom: '3mm', right: '5mm' })}
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

        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1mm', flexShrink: 0 }}>
          <div style={{ fontSize: getDynamicFontSize(settings.schoolName, 4.0, 2.5, 20), fontWeight: 'bold', color: headerColor, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.2' }}>
            {settings.schoolName}
          </div>
          {settings.address && (
            <div style={{ fontSize: '1.8mm', color: '#64748b', marginTop: '0.5mm', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {settings.address}
            </div>
          )}
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
              <td style={{ padding: '0.2mm 0', color: '#000' }}>{student.phone || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {renderPrincipalSignature('#1f2937', { bottom: '2mm', right: '4mm' })}
    </div>
  );

  const renderMinimalistLandscape = () => (
    <div style={{ ...baseCardStyle, backgroundColor: '#ffffff', padding: '2mm' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', height: '100%', display: 'flex', flexDirection: 'column', padding: '3mm', position: 'relative' }}>
        {/* Subtle accent border at the top */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', backgroundColor: accentColor, borderTopLeftRadius: '5px', borderTopRightRadius: '5px' }}></div>

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3mm', marginTop: '1mm' }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '55mm' }}>
            <div style={{ fontSize: getDynamicFontSize(settings.schoolName, 3.5, 2.2, 18), fontWeight: '700', color: '#1f2937', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: '1.2' }}>{settings.schoolName}</div>
            {settings.address && (
              <div style={{ fontSize: '1.8mm', color: '#6b7280', marginTop: '0.5mm', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {settings.address}
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, marginLeft: '2mm' }}>{renderLogo('7mm')}</div>
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
              <div style={{ paddingBottom: '0.2mm' }}><span style={{ display: 'inline-block', width: '12mm', color: '#9ca3af', fontWeight: '500' }}>PHONE:</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.phone || 'N/A'}</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: '1mm', border: '1px solid #f3f4f6', borderRadius: '4px', backgroundColor: '#f9fafb', marginBottom: '1mm' }}>
              {renderPhoto('20mm', '23mm', 'none')}
            </div>
            {renderPrincipalSignature('#1f2937', { position: 'relative', bottom: 'auto', right: 'auto' })}
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
          <div style={{ backgroundColor: '#fff', padding: '1mm', borderRadius: '50%', marginRight: '2mm', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0 }}>{renderLogo('8mm')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: getDynamicFontSize(settings.schoolName, 3.5, 2.5, 15), fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', lineHeight: '1.2' }}>{settings.schoolName}</div>
            {settings.address && (
              <div style={{ fontSize: '1.9mm', color: '#ffffff', marginTop: '0.3mm', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>{settings.address}</div>
            )}
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.2mm' }}>
            <strong style={{ color: '#64748b' }}>PHONE:</strong> <span style={{ fontWeight: '700', color: '#334155' }}>{student.phone || 'N/A'}</span>
          </div>
        </div>
        {renderPrincipalSignature('#1f2937', { bottom: '2mm', right: '4mm' })}
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
          <div style={{ padding: '1mm', backgroundColor: '#fff', flexShrink: 0 }}>{renderLogo('8mm')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: '2mm' }}>
            <div style={{ fontSize: getDynamicFontSize(settings.schoolName, 3.2, 2.5, 15), fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase', lineHeight: '1.2' }}>{settings.schoolName}</div>
            {settings.address && (
              <div style={{ fontSize: '1.9mm', color: '#ffffff', marginTop: '0.3mm', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>{settings.address}</div>
            )}
          </div>
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
              <td style={{ padding: '0.2mm 0', fontWeight: 'bold', color: headerColor }}>PHONE</td>
              <td style={{ padding: '0.2mm 0', color: '#000' }}>{student.phone || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 'auto', alignSelf: 'flex-end', marginRight: '2mm', marginBottom: '1mm' }}>
          {renderPrincipalSignature('#1f2937', { position: 'relative', bottom: 'auto', right: 'auto' })}
        </div>
      </div>

      {/* Bottom accent line */}
      <div style={{ height: '3mm', width: '100%', backgroundColor: headerColor, flexShrink: 0 }}></div>
    </div>
  );

  const renderMinimalistPortrait = () => (
    <div style={{ ...baseCardStyle, backgroundColor: '#ffffff', padding: '2mm' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', height: '100%', display: 'flex', flexDirection: 'column', padding: '2mm', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', backgroundColor: accentColor, borderTopLeftRadius: '5px', borderTopRightRadius: '5px' }}></div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2mm', marginTop: '1mm' }}>
          <div style={{ marginBottom: '1mm' }}>{renderLogo('8mm')}</div>
          <div style={{ fontSize: '3mm', fontWeight: '700', color: '#1f2937', textAlign: 'center', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: '1.2' }}>{settings.schoolName}</div>
          {settings.address && (
            <div style={{ fontSize: '1.9mm', color: '#4b5563', fontWeight: '500', marginTop: '0.5mm', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.2' }}>{settings.address}</div>
          )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.2mm' }}>
            <span style={{ color: '#9ca3af', fontWeight: '500' }}>PHONE</span> <span style={{ color: '#1f2937', fontWeight: '500' }}>{student.phone || 'N/A'}</span>
          </div>
        </div>
        <div style={{ marginTop: 'auto', alignSelf: 'flex-end', marginRight: '1mm', marginBottom: '1mm' }}>
          {renderPrincipalSignature('#1f2937', { position: 'relative', bottom: 'auto', right: 'auto' })}
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
        {/* T&C Box */}
        <div style={{ flex: 1, backgroundColor: theme === 'modern' ? '#ffffff' : '#f8fafc', border: theme === 'modern' ? '1px solid #e5e7eb' : 'none', borderRadius: '6px', padding: '2.5mm', marginBottom: '2mm', display: 'flex', flexDirection: 'column', boxShadow: theme === 'modern' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}>
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '3mm', marginBottom: '1.5mm', color: headerColor, borderBottom: `1px solid ${accentColor}40`, paddingBottom: '1mm', letterSpacing: '0.5px' }}>TERMS & CONDITIONS</div>
          <ul style={{ paddingLeft: '4mm', margin: '0', color: '#4b5563', lineHeight: '1.5', flex: 1 }}>
            {(termsAndConditions || [
              `This card is the property of ${settings.schoolName}.`,
              "It must be carried at all times while in the school premises.",
              "If found, please return to the school address.",
              "This card is non-transferable."
            ]).map((term, idx) => (
              <li key={idx} style={{ marginBottom: '0.5mm' }}>{term}</li>
            ))}
          </ul>
        </div>

        {/* Address & Powered By */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: '2mm', minHeight: '12mm' }}>
          {student.address && (
            <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1.5mm', textAlign: 'center', color: '#1f2937', fontSize: '2mm', lineHeight: '1.2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <strong style={{ color: headerColor, fontSize: '1.8mm', marginBottom: '0.3mm' }}>Student Address</strong>
              {student.address}
            </div>
          )}
          <div style={{ flex: student.address ? '0 0 35mm' : 1, backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1.5mm', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <strong style={{ color: headerColor, fontSize: '2.2mm', display: 'block', textAlign: 'center', marginBottom: '1mm', lineHeight: '1.1' }}>{settings.schoolName}</strong>
            <div style={{ fontSize: '1.9mm', color: '#64748b', letterSpacing: '0.3px', borderTop: '1px solid #cbd5e1', paddingTop: '0.8mm', width: '90%', textAlign: 'center' }}>
              Powered by <strong style={{ color: '#0f172a', fontWeight: '800' }}>GoodSync</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPortraitBack = () => (
    <div style={{ ...baseCardStyle, backgroundColor: theme === 'modern' ? '#f8fafc' : '#ffffff', border: theme === 'minimalist' ? `1px solid #d1d5db` : 'none', padding: theme === 'minimalist' ? '4mm' : '0' }}>
      <div style={{ border: theme === 'minimalist' ? '1px solid #e5e7eb' : 'none', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {theme === 'modern' && <div style={{ position: 'absolute', top: '-20mm', left: '-20mm', width: '60mm', height: '60mm', backgroundColor: accentColor, borderRadius: '50%', opacity: 0.05, zIndex: 0 }}></div>}
        {theme === 'classic' && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4mm', backgroundColor: headerColor, zIndex: 0 }}></div>}

        <div style={{ padding: '3mm', flex: 1, display: 'flex', flexDirection: 'column', fontSize: '2.6mm', zIndex: 1, marginTop: theme === 'classic' ? '4mm' : '0' }}>
          {/* T&C Box */}
          <div style={{ flex: 1, backgroundColor: theme === 'modern' ? '#ffffff' : '#f8fafc', border: theme === 'modern' ? '1px solid #e5e7eb' : 'none', borderRadius: '6px', padding: '2mm', marginBottom: '2mm', display: 'flex', flexDirection: 'column', boxShadow: theme === 'modern' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '3.2mm', marginBottom: '2mm', color: headerColor, borderBottom: `1px solid ${accentColor}40`, paddingBottom: '1mm', letterSpacing: '0.5px', flexShrink: 0 }}>TERMS & CONDITIONS</div>
            <ul style={{ paddingLeft: '3mm', margin: '0', color: '#4b5563', lineHeight: '1.4', flex: 1 }}>
              {(termsAndConditions || [
                `This card is the property of ${settings.schoolName}.`,
                "It must be carried at all times while in the school premises.",
                "If found, please return to the school address.",
                "This card is non-transferable."
              ]).map((term, idx) => (
                <li key={idx} style={{ marginBottom: '0.5mm' }}>{term}</li>
              ))}
            </ul>
          </div>

          {/* Address Box */}
          {student.address && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1.5mm', textAlign: 'center', color: '#1f2937', fontSize: '2mm', marginBottom: '2mm', lineHeight: '1.2', flexShrink: 0 }}>
              <strong style={{ color: headerColor, display: 'block', marginBottom: '0.3mm', fontSize: '1.8mm' }}>Address</strong>
              {student.address}
            </div>
          )}

          {/* School & Powered By Box */}
          <div style={{ marginTop: 'auto', textAlign: 'center', lineHeight: '1.4', backgroundColor: theme === 'modern' ? '#ffffff' : '#f1f5f9', padding: '2mm', borderRadius: '6px', border: theme === 'modern' ? '1px solid #e5e7eb' : `1px solid #e2e8f0`, boxShadow: theme === 'modern' ? '0 2px 4px rgba(0,0,0,0.02)' : 'none', flexShrink: 0 }}>
            <strong style={{ color: headerColor, fontSize: '2.6mm', display: 'block', marginBottom: '1mm' }}>{settings.schoolName}</strong>
            <div style={{ fontSize: '2mm', color: '#64748b', letterSpacing: '0.3px', borderTop: '1px solid #cbd5e1', paddingTop: '1mm' }}>
              Powered by <strong style={{ color: '#0f172a', fontWeight: '800' }}>GoodSync</strong>
            </div>
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
