import React, { useState, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { FileText, Download, Eye, Settings, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../auth/AuthContext';
import api from '../../../services/api';
import {
  InvoiceTemplate,
  CertificateTemplate,
  AdmitCardTemplate,
  TemplateSettings
} from '../../../components/templates';

const UniversalTemplate: React.FC = () => {
  const { user } = useAuth();

  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
    schoolName: user?.schoolName || 'School Name',
    schoolCode: user?.schoolCode || 'SCH001',
    website: 'www.edulogix.com',
    logoUrl: '',
    headerColor: '#1f2937',
    accentColor: '#3b82f6',
    address: '123 School Street, City, State 12345',
    phone: '+91-XXXXXXXXXX',
    email: 'info@school.com'
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [templateType, setTemplateType] = useState<'invoice' | 'admit_card' | 'certificate' | 'id_card_landscape_front' | 'id_card_landscape_back' | 'id_card_portrait_front' | 'id_card_portrait_back' | 'custom'>('invoice');
  const [loading, setLoading] = useState(false);

  // Generate sample data for different template types
  const getSampleData = () => {
    switch (templateType) {
      case 'invoice':
        return {
          invoiceNumber: 'INV-2024-001',
          date: new Date().toLocaleDateString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          clientName: 'John Doe',
          clientAddress: '123 Student Street, City, State 12345',
          items: [
            { description: 'Tuition Fee', quantity: 1, rate: 5000, amount: 5000 },
            { description: 'Library Fee', quantity: 1, rate: 500, amount: 500 },
            { description: 'Lab Fee', quantity: 1, rate: 1000, amount: 1000 }
          ],
          subtotal: 6500,
          tax: 650,
          total: 7150
        };
      case 'admit_card':
        return {
          student: {
            id: '1',
            name: 'John Doe',
            rollNumber: 'R001',
            sequenceId: 'SEQ001',
            className: '10',
            section: 'A',
            profileImage: ''
          },
          subjects: [
            { id: '1', name: 'Mathematics', examDate: '2024-03-15', examTime: '09:00 AM', examHour: '09', examMinute: '00', examAmPm: 'AM' },
            { id: '2', name: 'Science', examDate: '2024-03-16', examTime: '09:00 AM', examHour: '09', examMinute: '00', examAmPm: 'AM' },
            { id: '3', name: 'English', examDate: '2024-03-17', examTime: '09:00 AM', examHour: '09', examMinute: '00', examAmPm: 'AM' }
          ],
          testName: 'Final Examination 2024',
          enableRoomNumbers: true
        };
      case 'certificate':
        return {
          recipientName: 'John Doe',
          courseName: 'Academic Excellence',
          completionDate: new Date().toLocaleDateString(),
          certificateNumber: 'CERT-2024-001',
          signatory: 'Principal Name',
          signatoryTitle: 'Principal'
        };
      case 'id_card_landscape_front':
      case 'id_card_landscape_back':
      case 'id_card_portrait_front':
      case 'id_card_portrait_back':
        return {
          student: {
            id: '1',
            name: 'John Doe',
            rollNumber: 'R001',
            sequenceId: 'STU001',
            className: '10',
            section: 'A',
            profileImage: '',
            dateOfBirth: '15/01/2008',
            bloodGroup: 'O+',
            fatherName: 'Mr. Robert Doe',
            address: '123 Student Street, City, State 12345',
            phone: '+91-9876543210'
          }
        };
      default:
        return {};
    }
  };

  const handleSaveTemplate = async () => {
    try {
      localStorage.setItem('universalTemplate', JSON.stringify(templateSettings));
      toast.success('Template settings saved successfully!');
    } catch {
      toast.error('Failed to save template settings');
    }
  };

  const handlePrintPreview = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print template');
      return;
    }

    // Generate component HTML using renderToString
    let componentHTML = '';

    try {
      switch (templateType) {
        case 'invoice': {
          const invoiceData = getSampleData() as any;
          componentHTML = renderToString(
            React.createElement(InvoiceTemplate, {
              settings: templateSettings,
              invoiceData: invoiceData,
              mode: 'print'
            })
          );
          break;
        }
        case 'certificate': {
          const certificateData = getSampleData() as any;
          componentHTML = renderToString(
            React.createElement(CertificateTemplate, {
              settings: templateSettings,
              certificateData: certificateData,
              mode: 'print'
            })
          );
          break;
        }
        case 'admit_card': {
          const admitCardData = getSampleData() as any;
          componentHTML = renderToString(
            React.createElement(AdmitCardTemplate, {
              settings: templateSettings,
              student: admitCardData.student,
              subjects: admitCardData.subjects,
              testName: admitCardData.testName,
              enableRoomNumbers: admitCardData.enableRoomNumbers,
              instructions: [
                'Bring this admit card to the examination hall',
                'Arrive at least 30 minutes before the exam starts',
                'Carry a valid ID proof along with this admit card',
                'Mobile phones and electronic devices are not allowed',
                'Follow all examination rules and regulations'
              ],
              mode: 'print'
            })
          );
          break;
        }
        case 'id_card_landscape_front':
          componentHTML = `
            <div style="text-align: center; padding: 20px;">
              <h2>ID Card Template - Landscape Front</h2>
              <img src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/landscape-front_m59zcq.png" 
                   alt="Landscape Front Template" 
                   style="max-width: 100%; height: auto;" />
            </div>
          `;
          break;
        case 'id_card_landscape_back':
          componentHTML = `
            <div style="text-align: center; padding: 20px;">
              <h2>ID Card Template - Landscape Back</h2>
              <img src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/landscape-back_fqroxh.png" 
                   alt="Landscape Back Template" 
                   style="max-width: 100%; height: auto;" />
            </div>
          `;
          break;
        case 'id_card_portrait_front':
          componentHTML = `
            <div style="text-align: center; padding: 20px;">
              <h2>ID Card Template - Portrait Front</h2>
              <img src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/portrait-front_iqllye.png" 
                   alt="Portrait Front Template" 
                   style="max-width: 100%; height: auto;" />
            </div>
          `;
          break;
        case 'id_card_portrait_back':
          componentHTML = `
            <div style="text-align: center; padding: 20px;">
              <h2>ID Card Template - Portrait Back</h2>
              <img src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/portrait-back_m5wxzh.png" 
                   alt="Portrait Back Template" 
                   style="max-width: 100%; height: auto;" />
            </div>
          `;
          break;
        default:
          componentHTML = `
            <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
              <h1>Custom Template</h1>
              <p>Your content will appear here</p>
            </div>
          `;
      }
    } catch (error) {
      console.error('Error rendering component:', error);
      componentHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1>Template Preview Error</h1>
          <p>There was an error rendering the template preview.</p>
        </div>
      `;
    }

    // Create complete HTML document
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Template Preview - ${templateType.replace('_', ' ').toUpperCase()}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          ${componentHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const loadTemplateSettings = () => {
    try {
      const saved = localStorage.getItem('universalTemplate');
      if (saved) {
        setTemplateSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load template settings:', error);
    }
  };

  // Fetch school data from database (simplified version)
  const fetchSchoolData = async () => {
    if (!user?.schoolCode && !user?.schoolId) return;

    try {
      setLoading(true);
      const schoolIdentifier = user?.schoolId || user?.schoolCode;
      if (schoolIdentifier) {
        const response = await api.get(`/schools/${schoolIdentifier}/info`);
        const data = response?.data?.data || response?.data;

        if (data && (data.name || data.schoolName)) {
          let logoUrl = '';
          if (data.logoUrl || data.logo) {
            const rawLogoUrl = data.logoUrl || data.logo;
            if (rawLogoUrl.startsWith('/uploads')) {
              const envBase = (import.meta.env.VITE_API_BASE_URL as string);
              const baseUrl = envBase.replace(/\/api\/?$/, '');
              logoUrl = `${baseUrl}${rawLogoUrl}`;
            } else {
              logoUrl = rawLogoUrl;
            }
            console.log('Logo URL from API:', {
              rawLogoUrl,
              finalLogoUrl: logoUrl,
              apiBase: import.meta.env.VITE_API_BASE_URL,
              schoolData: data
            });
          } else {
            console.warn('No logo URL found in school data. Using empty string.');
          }

          // Format address from object to string
          let formattedAddress = '123 School Street, City, State 12345';
          if (data.address) {
            if (typeof data.address === 'string') {
              formattedAddress = data.address;
            } else if (typeof data.address === 'object') {
              const addr = data.address;
              const addressParts = [
                addr.street || addr.area,
                addr.city,
                addr.district || addr.taluka,
                addr.state,
                addr.pinCode || addr.zipCode
              ].filter(Boolean);
              
              if (addressParts.length > 0) {
                formattedAddress = addressParts.join(', ');
              }
            }
          }

          setTemplateSettings(prev => ({
            ...prev,
            schoolName: data.name || data.schoolName || prev.schoolName,
            schoolCode: data.code || data.schoolCode || prev.schoolCode,
            address: formattedAddress || prev.address,
            phone: data.phone || data.contact?.phone || prev.phone,
            email: data.email || data.contact?.email || prev.email,
            website: data.website || data.contact?.website || prev.website,
            logoUrl: logoUrl || prev.logoUrl
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch school data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplateSettings();
    fetchSchoolData();
  }, [user?.schoolCode]);

  const TemplatePreview = () => {
    const sampleData = getSampleData() as any;

    switch (templateType) {
      case 'invoice':
        return (
          <div className="transform scale-75 origin-top-left">
            <InvoiceTemplate
              settings={templateSettings}
              invoiceData={sampleData}
              mode="preview"
            />
          </div>
        );
      case 'certificate':
        return (
          <div className="transform scale-75 origin-top-left">
            <CertificateTemplate
              settings={templateSettings}
              certificateData={sampleData}
              mode="preview"
            />
          </div>
        );
      case 'admit_card':
        return (
          <div className="transform scale-75 origin-top-left">
            <AdmitCardTemplate
              settings={templateSettings}
              student={sampleData.student}
              subjects={sampleData.subjects}
              testName={sampleData.testName}
              enableRoomNumbers={sampleData.enableRoomNumbers}
              instructions={[
                'Bring this admit card to the examination hall',
                'Arrive at least 30 minutes before the exam starts',
                'Carry a valid ID proof along with this admit card',
                'Mobile phones and electronic devices are not allowed',
                'Follow all examination rules and regulations'
              ]}
              mode="preview"
            />
          </div>
        );
      case 'id_card_landscape_front':
        return (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">ID Card Template - Landscape Front</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center" style={{ minHeight: '400px' }}>
              <img
                src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/landscape-front_m59zcq.png"
                alt="Landscape Front Template"
                className="max-w-full h-auto"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
                onLoad={() => console.log('✅ Landscape Front template loaded successfully')}
                onError={(e) => {
                  console.error('❌ Failed to load Landscape Front template image');
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UZW1wbGF0ZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Template: <code className="bg-gray-100 px-2 py-1 rounded">Landscape Front (Horizontal)</code>
            </p>
            <p className="text-xs text-blue-600 mt-2">
              💡 Tip: Click "Preview" button above and select this template from the dropdown to view it
            </p>
          </div>
        );
      case 'id_card_landscape_back':
        return (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">ID Card Template - Landscape Back</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center" style={{ minHeight: '400px' }}>
              <img
                src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/landscape-back_fqroxh.png"
                alt="Landscape Back Template"
                className="max-w-full h-auto"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UZW1wbGF0ZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-3">Template: <code className="bg-gray-100 px-2 py-1 rounded">Landscape Back (Horizontal)</code></p>
          </div>
        );
      case 'id_card_portrait_front':
        return (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">ID Card Template - Portrait Front</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center" style={{ minHeight: '400px' }}>
              <img
                src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/portrait-front_iqllye.png"
                alt="Portrait Front Template"
                className="max-w-full h-auto"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UZW1wbGF0ZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-3">Template: <code className="bg-gray-100 px-2 py-1 rounded">Portrait Front (Vertical)</code></p>
          </div>
        );
      case 'id_card_portrait_back':
        return (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">ID Card Template - Portrait Back</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center" style={{ minHeight: '400px' }}>
              <img
                src="https://res.cloudinary.com/dbcutmb0z/image/upload/v1762088066/portrait-back_m5wxzh.png"
                alt="Portrait Back Template"
                className="max-w-full h-auto"
                style={{ maxHeight: '500px', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UZW1wbGF0ZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-3">Template: <code className="bg-gray-100 px-2 py-1 rounded">Portrait Back (Vertical)</code></p>
          </div>
        );
      default:
        return (
          <div className="transform scale-75 origin-top-left">
            <div className="w-full max-w-4xl mx-auto bg-white shadow-lg flex flex-col" style={{
              fontFamily: 'Arial, sans-serif',
              aspectRatio: '210/297',
              minHeight: '297mm',
              width: '210mm',
              padding: '20mm',
              boxSizing: 'border-box'
            }}>
              <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-300">
                <div className="flex items-center space-x-4">
                  {templateSettings.logoUrl ? (
                    <img src={templateSettings.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                      <div className="w-10 h-10 border-2 border-white rounded transform rotate-45"></div>
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">{templateSettings.schoolName}</h1>
                    <p className="text-sm text-gray-600">School Code: {templateSettings.schoolCode}</p>
                    <p className="text-sm text-gray-600">{templateSettings.address}</p>
                  </div>
                </div>
              </div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">CUSTOM DOCUMENT</h2>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-lg font-medium">Template Preview</p>
                  <p className="text-sm">Content will appear here when documents are generated</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Template Preview - {templateType.replace('_', ' ').toUpperCase()}</h3>
          <div className="flex space-x-3">
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="invoice">Invoice</option>
              <option value="admit_card">Admit Card</option>
              <option value="certificate">Certificate</option>
              <option value="id_card_landscape_front">ID Card - Landscape Front</option>
              <option value="id_card_landscape_back">ID Card - Landscape Back</option>
              <option value="id_card_portrait_front">ID Card - Portrait Front</option>
              <option value="id_card_portrait_back">ID Card - Portrait Back</option>
              <option value="custom">Custom Document</option>
            </select>
            <button
              onClick={() => setPreviewMode(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Template
            </button>
            <button
              onClick={handlePrintPreview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Print Template
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-8 rounded-lg overflow-auto">
          <TemplatePreview />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">Universal Template Settings</h3>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setPreviewMode(true)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </button>
          <button
            onClick={handleSaveTemplate}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Universal Template System</h4>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              Configure your school&apos;s universal template for all documents including invoices, admit cards, certificates, and more. This template will be used across the entire system.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
        <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
          School Information
          {loading && (
            <span className="ml-2 text-xs sm:text-sm text-blue-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Loading...
            </span>
          )}
        </h4>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
          <p className="text-xs sm:text-sm text-blue-800">
            <strong>Note:</strong> School information is automatically fetched from your database. Contact your administrator to update school details.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
            <input
              type="text"
              value={templateSettings.schoolName}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Code</label>
            <input
              type="text"
              value={templateSettings.schoolCode}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">School Address</label>
            <input
              type="text"
              value={templateSettings.address}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="text"
              value={templateSettings.phone}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={templateSettings.email}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            <input
              type="text"
              value={templateSettings.website}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Template Usage</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• This universal template will be used for all PDF documents</li>
          <li>• Supports invoices, admit cards, certificates, and custom documents</li>
          <li>• Maintains consistent branding across all school documents</li>
          <li>• Preview different document types before finalizing</li>
          <li>• Template is automatically applied to new documents</li>
        </ul>
      </div>
    </div>
  );
};

export default UniversalTemplate;
