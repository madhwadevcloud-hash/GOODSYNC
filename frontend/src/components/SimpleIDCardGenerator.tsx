import React, { useState } from 'react';
import { useTemplateData } from './templates/hooks/useTemplateData';
import NewIDCardTemplate from './templates/NewIDCardTemplate';
import axios from 'axios';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import { Download, Eye, Loader2, CheckCircle, AlertCircle, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  _id?: string;
  name: string;
  sequenceId?: string;
  rollNumber?: string;
  className: string;
  section: string;
  profileImage?: string;
  address?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
}

interface SimpleIDCardGeneratorProps {
  selectedStudents: Student[];
  onClose: () => void;
  initialOrientation?: 'landscape' | 'portrait';
  lockOrientation?: boolean;
  theme?: 'modern' | 'classic' | 'minimalist';
}

const SimpleIDCardGenerator: React.FC<SimpleIDCardGeneratorProps> = ({
  selectedStudents,
  onClose,
  initialOrientation = 'landscape',
  lockOrientation = false,
  theme = 'modern'
}) => {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(initialOrientation);
  const [includeBack, setIncludeBack] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<any>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const { templateSettings } = useTemplateData();
  const [orientationLocked, setOrientationLocked] = useState(lockOrientation);
  const [principalSign, setPrincipalSign] = useState<string | null>(null);

  const DEFAULT_TERMS = [
    "This card is the property of the school.",
    "It must be carried at all times while in the school premises.",
    "If found, please return to the school address.",
    "This card is non-transferable."
  ];
  const [termsAndConditions, setTermsAndConditions] = useState<string>(DEFAULT_TERMS.join(' '));

  const handleTermsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length <= 40) {
      setTermsAndConditions(text);
    }
  };

  const termsArray = termsAndConditions.split('\n').filter(t => t.trim().length > 0);

  const [customColor, setCustomColor] = React.useState<string | null>(null);

  React.useEffect(() => {
    const schoolId = templateSettings?.schoolCode || templateSettings?.schoolName || 'default';
    setCustomColor(localStorage.getItem(`idCardColor_${schoolId}`));
  }, [templateSettings?.schoolCode, templateSettings?.schoolName]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let color = e.target.value;
    if (!color.startsWith('#') && color.length > 0) {
      color = '#' + color;
    }
    if (color.startsWith('##')) {
      color = color.substring(1);
    }
    setCustomColor(color);
    const schoolId = templateSettings?.schoolCode || templateSettings?.schoolName || 'default';
    localStorage.setItem(`idCardColor_${schoolId}`, color);
  };

  const handleResetColor = () => {
    setCustomColor(null);
    const schoolId = templateSettings?.schoolCode || templateSettings?.schoolName || 'default';
    localStorage.removeItem(`idCardColor_${schoolId}`);
  };

  const colorPalette = [
    { header: '#1e3a8a', accent: '#3b82f6' }, // Blue
    { header: '#064e3b', accent: '#10b981' }, // Emerald
    { header: '#701a75', accent: '#d946ef' }, // Fuchsia
    { header: '#7c2d12', accent: '#f97316' }, // Orange
    { header: '#4c1d95', accent: '#8b5cf6' }, // Violet
    { header: '#831843', accent: '#f43f5e' }, // Rose
    { header: '#14532d', accent: '#22c55e' }, // Green
    { header: '#1e1b4b', accent: '#6366f1' }, // Indigo
    { header: '#0f766e', accent: '#14b8a6' }, // Teal
    { header: '#991b1b', accent: '#ef4444' }  // Red
  ];

  const getDefaultSchoolColor = () => {
    const schoolIdentifier = templateSettings?.schoolCode || templateSettings?.schoolName || 'default';
    let hash = 0;
    for (let i = 0; i < schoolIdentifier.length; i++) {
      hash = schoolIdentifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    const safeIndex = Math.abs(hash) % colorPalette.length;
    return colorPalette[safeIndex];
  };

  const getStudentColorSettings = (student: any) => {
    if (customColor) {
      return {
        ...templateSettings,
        headerColor: customColor,
        accentColor: customColor
      };
    }

    const colors = getDefaultSchoolColor();
    return {
      ...templateSettings,
      headerColor: colors.header,
      accentColor: colors.accent
    };
  };

  const handleSignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrincipalSign(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';

  const handleGenerate = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setGenerating(true);
    setTimeout(() => {
      const generated = selectedStudents.map(student => ({
        studentId: student._id || student.id,
        studentName: student.name,
        status: 'success'
      }));
      setGeneratedCards(generated);
      setShowResults(true);
      setOrientationLocked(true);
      setGenerating(false);
      toast.success('ID Cards ready for preview/download');
    }, 500);
  };

  const handleDownloadBulk = async () => {
    try {
      setDownloading(true);
      toast.loading('Generating ZIP file... This may take a moment.', { id: 'zip-download' });

      const zip = new JSZip();
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const root = createRoot(container);

      for (let i = 0; i < selectedStudents.length; i++) {
        const student = selectedStudents[i];
        const folderName = student.sequenceId || student.rollNumber || `student_${i + 1}`;
        const studentFolder = zip.folder(folderName);
        if (!studentFolder) continue;

        await new Promise<void>(resolve => {
          root.render(<NewIDCardTemplate settings={getStudentColorSettings(student)} student={student as any} templateId={orientation} side="front" theme={theme} principalSign={principalSign} termsAndConditions={termsArray} />);
          setTimeout(resolve, 800);
        });
        const frontCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
        studentFolder.file(`${folderName}_front.png`, frontCanvas.toDataURL('image/png').split(',')[1], { base64: true });

        if (includeBack) {
          await new Promise<void>(resolve => {
            root.render(<NewIDCardTemplate settings={getStudentColorSettings(student)} student={student as any} templateId={orientation} side="back" theme={theme} principalSign={principalSign} termsAndConditions={termsArray} />);
            setTimeout(resolve, 800);
          });
          const backCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
          studentFolder.file(`${folderName}_back.png`, backCanvas.toDataURL('image/png').split(',')[1], { base64: true });
        }
      }

      root.unmount();
      document.body.removeChild(container);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IDCards_Bulk_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss('zip-download');
      toast.success(`ID cards downloaded successfully`);
    } catch (error) {
      console.error('Error downloading ID cards:', error);
      toast.dismiss('zip-download');
      toast.error('Failed to download ID cards');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadIndividual = async (student: any) => {
    try {
      toast.loading(`Generating ID card for ${student.name}...`, { id: 'ind-download' });

      const zip = new JSZip();
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const root = createRoot(container);

      const folderName = student.sequenceId || student.rollNumber || `student`;

      await new Promise<void>(resolve => {
        root.render(<NewIDCardTemplate settings={getStudentColorSettings(student)} student={student as any} templateId={orientation} side="front" theme={theme} principalSign={principalSign} termsAndConditions={termsArray} />);
        setTimeout(resolve, 800);
      });
      const frontCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
      zip.file(`${folderName}_front.png`, frontCanvas.toDataURL('image/png').split(',')[1], { base64: true });

      if (includeBack) {
        await new Promise<void>(resolve => {
          root.render(<NewIDCardTemplate settings={getStudentColorSettings(student)} student={student as any} templateId={orientation} side="back" theme={theme} principalSign={principalSign} termsAndConditions={termsArray} />);
          setTimeout(resolve, 800);
        });
        const backCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
        zip.file(`${folderName}_back.png`, backCanvas.toDataURL('image/png').split(',')[1], { base64: true });
      }

      root.unmount();
      document.body.removeChild(container);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `IDCard_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss('ind-download');
      toast.success(`ID card downloaded for ${student.name}`);
    } catch (error) {
      console.error('Error downloading individual ID card:', error);
      toast.dismiss('ind-download');
      toast.error('Failed to download individual ID card');
    }
  };

  const handlePreview = async (studentId: string, side: 'front' | 'back' = 'front') => {
    const student = selectedStudents.find(s => (s._id || s.id) === studentId);
    if (student) {
      setPreviewStudent(student);
      setPreviewSide(side);
      setShowPreview(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Generate ID Cards ({selectedStudents.length} students)
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!showResults ? (
              <>
                {/* Info Alert */}
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Template Setup Required</p>
                    <p>Make sure you have placed your ID card template PNG files in:</p>
                    <code className="block mt-1 bg-blue-100 px-2 py-1 rounded text-xs">
                      backend/idcard-templates/
                    </code>
                    <p className="mt-2">Required files: {orientation}-front.png{includeBack && ', ' + orientation + '-back.png'}</p>
                  </div>
                </div>

                {/* Configuration */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose ID Card Orientation
                    </label>
                    <div className="flex flex-col gap-3">
                      <label className={`flex items-center p-4 border-2 rounded-lg transition-all ${orientation === 'landscape'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        } ${orientationLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          value="landscape"
                          checked={orientation === 'landscape'}
                          onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                          disabled={orientationLocked}
                          className="mr-3"
                        />
                        <RectangleHorizontal className="w-8 h-8 mr-3 text-blue-600" />
                        <div>
                          <div className="font-medium">Landscape</div>
                          <div className="text-sm text-gray-500">Horizontal ID card (85.6mm × 54mm) - Credit card style layout</div>
                        </div>
                      </label>
                      <label className={`flex items-center p-4 border-2 rounded-lg transition-all ${orientation === 'portrait'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        } ${orientationLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          value="portrait"
                          checked={orientation === 'portrait'}
                          onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                          disabled={orientationLocked}
                          className="mr-3"
                        />
                        <RectangleVertical className="w-8 h-8 mr-3 text-blue-600" />
                        <div>
                          <div className="font-medium">Portrait</div>
                          <div className="text-sm text-gray-500">Vertical ID card (54mm × 85.6mm) - Vertical layout with larger photo</div>
                        </div>
                      </label>
                    </div>
                    {orientationLocked && (
                      <p className="text-xs text-blue-600 mt-2">
                        ℹ️ Orientation is locked as selected from the previous page
                      </p>
                    )}
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Principal Sign (Front side only)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {principalSign && (
                      <div className="mt-2">
                        <img src={principalSign} alt="Principal Sign" className="h-16 object-contain border rounded p-1" />
                        <button
                          onClick={() => setPrincipalSign(null)}
                          className="text-xs text-red-500 hover:text-red-700 mt-1 block"
                        >
                          Remove sign
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme Color
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded overflow-hidden border border-gray-300 flex-shrink-0 relative cursor-pointer hover:border-blue-500 transition-colors shadow-sm">
                        <input
                          type="color"
                          value={customColor || getDefaultSchoolColor().header}
                          onChange={handleColorChange}
                          className="absolute inset-[-10px] w-20 h-20 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-500 bg-gray-100 border border-r-0 border-gray-300 px-3 py-1.5 rounded-l text-sm font-medium">HEX</span>
                        <input
                          type="text"
                          value={customColor || getDefaultSchoolColor().header}
                          onChange={handleColorChange}
                          className="border border-gray-300 px-3 py-1.5 w-24 text-sm rounded-r focus:outline-none focus:border-blue-500 uppercase"
                          maxLength={7}
                        />
                      </div>
                      <div className="text-sm text-gray-600 flex-1 ml-2">
                        Select or enter a primary color code. This will be saved for future use.
                      </div>
                      {customColor && (
                        <button
                          onClick={handleResetColor}
                          className="text-xs text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 border border-red-200 rounded transition-colors"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeBack}
                        onChange={(e) => setIncludeBack(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Include back side
                      </span>
                    </label>
                  </div>

                  {includeBack && (
                    <div className="mt-6 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Terms and Conditions (Back Side)
                        </label>
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                          {termsAndConditions.split(/\s+/).filter(w => w.length > 0).length}/40 words
                        </span>
                      </div>
                      <input
                        type="text"
                        value={termsAndConditions}
                        onChange={(e) => handleTermsChange(e as any)}
                        className="block w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                        placeholder="Enter terms and conditions (max 40 words)"
                      />
                    </div>
                  )}

                  </div>

                {/* Selected Students */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Students:</h4>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {selectedStudents.map((student) => (
                      <div key={student._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-900">{student.name}</span>
                        <span className="text-xs text-gray-500">
                          {student.className} - {student.section}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="w-5 h-5" />
                        Generate & Preview
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadBulk}
                    disabled={downloading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Download ZIP
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Results */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h4 className="text-lg font-semibold text-gray-900">
                      ID Cards Generated Successfully!
                    </h4>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-800">
                      Generated {generatedCards.length} ID cards in <strong>{orientation}</strong> orientation. You can preview them below or download all as ZIP.
                    </p>
                  </div>

                  {/* Generated Cards List */}
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    {generatedCards.map((card, index) => {
                      const student = selectedStudents.find(s => (s._id || s.id) === card.studentId);
                      return (
                        <div key={index} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="font-medium text-gray-900">{card.studentName}</p>
                            <p className="text-sm text-gray-500">ID: {card.studentId}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePreview(card.studentId, 'front')}
                              className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              View Front
                            </button>
                            {includeBack && (
                              <button
                                onClick={() => handlePreview(card.studentId, 'back')}
                                className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                              >
                                View Back
                              </button>
                            )}
                            {student && (
                              <button
                                onClick={() => handleDownloadIndividual(student)}
                                className="text-xs px-3 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setGeneratedCards([]);
                      setOrientationLocked(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Generate Again
                  </button>
                  <button
                    onClick={handleDownloadBulk}
                    disabled={downloading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Download All (Bulk ZIP with Folders)
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className={`bg-white rounded-lg w-full overflow-hidden flex flex-col ${orientation === 'portrait' ? 'max-w-4xl max-h-[95vh]' : 'max-w-6xl max-h-[90vh]'}`}>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview ({orientation === 'portrait' ? 'Portrait' : 'Landscape'}) - {previewSide === 'front' ? 'Front' : 'Back'}
              </h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewStudent(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-gray-50">
              {/* Sidebar Settings */}
              <div className="w-full md:w-72 bg-white border-r border-gray-200 p-6 shrink-0 overflow-y-auto">
                <h4 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Live Editor</h4>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Color
                  </label>
                  <div className="text-xs text-gray-500 mb-3">
                    Change this color to instantly update the ID card. The chosen color will be saved permanently for this school.
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded overflow-hidden border border-gray-300 relative cursor-pointer shadow-sm shrink-0">
                        <input
                          type="color"
                          value={customColor || getDefaultSchoolColor().header}
                          onChange={handleColorChange}
                          className="absolute inset-[-10px] w-20 h-20 cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center">
                          <span className="text-gray-500 bg-gray-100 border border-r-0 border-gray-300 px-2 py-1.5 rounded-l text-xs font-medium">HEX</span>
                          <input
                            type="text"
                            value={customColor || getDefaultSchoolColor().header}
                            onChange={handleColorChange}
                            className="border border-gray-300 px-2 py-1.5 w-20 text-sm rounded-r focus:outline-none focus:border-blue-500 uppercase"
                            maxLength={7}
                          />
                        </div>
                        {customColor && (
                          <button
                            onClick={handleResetColor}
                            className="text-xs text-red-600 hover:text-red-800 font-medium text-left"
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Card Canvas Area */}
              <div className="flex-1 p-6 overflow-auto flex items-center justify-center min-h-[400px]">
                <div style={{ transform: 'scale(1)', transformOrigin: 'center center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                  <NewIDCardTemplate
                    settings={getStudentColorSettings(previewStudent)}
                    student={previewStudent as any}
                    templateId={orientation}
                    side={previewSide}
                    theme={theme}
                    principalSign={principalSign} termsAndConditions={termsArray}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleIDCardGenerator;