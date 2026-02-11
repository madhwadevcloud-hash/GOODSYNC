import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, CheckCircle, RefreshCw, ChevronDown } from 'lucide-react';

const IDCardTemplatePreview: React.FC = () => {
  const [templates, setTemplates] = useState<any>({
    'landscape-front': null,
    'landscape-back': null,
    'portrait-front': null,
    'portrait-back': null
  });
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('landscape-front');
  const [showFullPreview, setShowFullPreview] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';

  const checkTemplates = async () => {
    setLoading(true);
    const newTemplates: any = {};

    for (const key of Object.keys(templates)) {
      try {
        const imagePath = `/idcard-templates/${key}.png`;
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}${imagePath}`);
        
        if (response.ok) {
          newTemplates[key] = imagePath;
        } else {
          newTemplates[key] = null;
        }
      } catch (error) {
        newTemplates[key] = null;
      }
    }

    setTemplates(newTemplates);
    setLoading(false);
  };

  useEffect(() => {
    checkTemplates();
  }, []);

  const templateInfo = [
    {
      key: 'landscape-front',
      name: 'Landscape Front',
      description: 'Front side of landscape ID card (85.6mm × 54mm)',
      size: '1020 × 648 pixels'
    },
    {
      key: 'landscape-back',
      name: 'Landscape Back',
      description: 'Back side of landscape ID card (85.6mm × 54mm)',
      size: '1020 × 648 pixels'
    },
    {
      key: 'portrait-front',
      name: 'Portrait Front',
      description: 'Front side of portrait ID card (54mm × 85.6mm)',
      size: '648 × 1020 pixels'
    },
    {
      key: 'portrait-back',
      name: 'Portrait Back',
      description: 'Back side of portrait ID card (54mm × 85.6mm)',
      size: '648 × 1020 pixels'
    }
  ];

  const selectedInfo = templateInfo.find(t => t.key === selectedTemplate);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Refresh */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
        <button
          onClick={checkTemplates}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Dropdown Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Template to Preview
        </label>
        <div className="relative">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="landscape-front">Landscape - Front Side</option>
            <option value="landscape-back">Landscape - Back Side</option>
            <option value="portrait-front">Portrait - Front Side</option>
            <option value="portrait-back">Portrait - Back Side</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Selected Template Preview */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        {selectedInfo && (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedInfo.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedInfo.description}</p>
                <p className="text-xs text-gray-500 mt-1">Recommended size: {selectedInfo.size}</p>
              </div>
              {templates[selectedInfo.key] ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
            </div>

            {templates[selectedInfo.key] ? (
              <>
                {/* Preview Image */}
                <div className="mb-4 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center" style={{ minHeight: '400px' }}>
                  <img
                    src={`${API_BASE_URL.replace('/api', '')}${templates[selectedInfo.key]}`}
                    alt={selectedInfo.name}
                    className="max-w-full h-auto"
                    style={{ maxHeight: '500px', objectFit: 'contain' }}
                  />
                </div>

                {/* View Full Size Button */}
                <button
                  onClick={() => setShowFullPreview(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4" />
                  View Full Size
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 font-medium mb-2">Template Not Found</p>
                <p className="text-sm text-gray-600 mb-3">
                  Please add <code className="bg-red-100 px-2 py-1 rounded font-mono text-xs">{selectedInfo.key}.png</code> to:
                </p>
                <code className="block bg-gray-100 px-3 py-2 rounded text-xs font-mono text-gray-700">
                  backend/idcard-templates/
                </code>
              </div>
            )}
          </>
        )}
      </div>

      {/* Full Size Preview Modal */}
      {showFullPreview && templates[selectedTemplate] && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
              <button
                onClick={() => setShowFullPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex justify-center bg-gray-100">
              <img
                src={`${API_BASE_URL.replace('/api', '')}${templates[selectedTemplate]}`}
                alt="Template Preview"
                className="max-w-full h-auto shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Checking templates...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDCardTemplatePreview;
