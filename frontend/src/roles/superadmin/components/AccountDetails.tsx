import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Edit, CreditCard, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BankDetails } from '../types';

export function AccountDetails() {
  const { schools, selectedSchoolId, setCurrentView, updateBankDetails } = useApp();
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const school = schools.find(s => s.id === selectedSchoolId);

  useEffect(() => {
    if (school) {
      setBankDetails(school.bankDetails);
    }
  }, [school]);

  if (!school || !bankDetails) {
    return (
      <div className="p-6 animate-fadeIn">
        <p className="text-gray-600">School not found</p>
      </div>
    );
  }

  const handleSave = () => {
    if (bankDetails && selectedSchoolId) {
      updateBankDetails(selectedSchoolId, bankDetails);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (school) {
      setBankDetails(school.bankDetails);
      setIsEditing(false);
    }
  };

  const fields: { label: string; key: keyof BankDetails; mono?: boolean }[] = [
    { label: 'Bank Name', key: 'bankName' },
    { label: 'Account Number', key: 'accountNumber', mono: true },
    { label: 'IFSC Code', key: 'ifscCode', mono: true },
    { label: 'Branch', key: 'branch' },
  ];

  return (
    <div className="p-4 sm:p-6 animate-fadeIn">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {/* Header banner */}
        <div className="opacity-0 animate-slideUp bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Account Details</h1>
              <p className="text-indigo-100 mt-1 text-sm sm:text-base">{school.name}</p>
            </div>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center space-x-2 bg-white text-indigo-700 px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors duration-200 font-semibold shadow-sm w-full sm:w-auto"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Details</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 bg-white text-indigo-700 px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors duration-200 font-semibold shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 opacity-0 animate-slideUp"
          style={{ animationDelay: '100ms' }}
        >
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-50 p-2.5 rounded-xl">
                <CreditCard className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Fee Payment Account Information</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1 ml-[52px]">Bank account details for fee collection</p>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {fields.map((field, i) => (
                <div
                  key={field.key}
                  className="opacity-0 animate-slideUp"
                  style={{ animationDelay: `${150 + i * 50}ms` }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={bankDetails[field.key] as string}
                      onChange={(e) => setBankDetails({ ...bankDetails, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    />
                  ) : (
                    <p className={`px-3 py-2 bg-gray-50 rounded-lg text-gray-900 ${field.mono ? 'font-mono' : ''}`}>
                      {bankDetails[field.key]}
                    </p>
                  )}
                </div>
              ))}

              <div
                className="md:col-span-2 opacity-0 animate-slideUp"
                style={{ animationDelay: '350ms' }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={bankDetails.accountHolderName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{bankDetails.accountHolderName}</p>
                )}
              </div>
            </div>

            {!isEditing && (
              <div
                className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3 opacity-0 animate-slideUp"
                style={{ animationDelay: '400ms' }}
              >
                <CheckCircle2 className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                <span className="text-sm text-indigo-900 font-medium">Active for fee collection</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}