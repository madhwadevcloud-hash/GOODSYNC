import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { TemplateSettings } from '../templates/types';
import api from '../../services/api';

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountHolderName?: string;
}

interface ChalanViewProps {
  chalan: {
    chalanNumber: string;
    createdAt: string | Date;
    academicYear?: string;
    studentName?: string;
    class?: string;
    section?: string;
    studentId?: string;
    userId?: string;
    installmentName?: string;
    amount?: number;
    dueDate?: string | Date;
    totalAmount?: number;
    [key: string]: any;
  };
  settings: TemplateSettings & {
    bankDetails?: BankDetails;
  };
  copyType?: 'student' | 'office' | 'admin' | 'all';
  className?: string;
  mode?: 'preview' | 'print';
}

const ChalanView: React.FC<ChalanViewProps> = ({
  chalan,
  settings,
  copyType = 'all',
  className = '',
  mode = 'preview'
}) => {
  // Determine the best student ID to display
  const getDisplayStudentId = () => {
    // First check if we have a userId in the chalan data
    if (chalan.userId) {
      return chalan.userId;
    }
    
    // If no userId but we have studentId, use it as fallback
    if (chalan.studentId) {
      // If studentId is in the expected format (like 'KVS-1234'), use it
      if (typeof chalan.studentId === 'string' && 
          (chalan.studentId.startsWith('KVS-') || 
           chalan.studentId.startsWith('SK-') ||
           chalan.studentId.startsWith('123-'))) {
        return chalan.studentId;
      }
      
      // Otherwise, just return the studentId
      return String(chalan.studentId);
    }
    
    // If we can't find any ID, return 'N/A'
    return 'N/A';
  };
  
  const displayStudentId = getDisplayStudentId();

  // Destructure settings without defaults
  const { 
    bankDetails,
    schoolName,
    schoolCode,
    logoUrl,
    address,
    phone,
    email
  } = settings;

  // Format date safely
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid Date';
    }
  };

  const renderChalanCopy = (type: 'student' | 'office' | 'admin') => {
    const copyLabel = type === 'student' ? 'STUDENT COPY' : 
                     type === 'office' ? 'OFFICE COPY' : 'ADMIN COPY';
    
    const borderColor = type === 'student' ? 'border-blue-500' : 
                       type === 'office' ? 'border-green-500' : 'border-purple-500';

    return (
      <div key={type} className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${borderColor} mb-6`}>
        {/* School Header with Logo and Details */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-4">
            {/* School Logo */}
            <div className="flex-shrink-0">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="School Logo" 
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
                  <span className="text-xs text-gray-400">No Logo</span>
                </div>
              )}
            </div>
            
            {/* School Details */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{schoolName || 'School Name'}</h1>
              {schoolCode && (
                <p className="text-sm text-gray-600">School Code: {schoolCode}</p>
              )}
              {address && (
                <p className="text-sm text-gray-600">{address}</p>
              )}
              {(phone || email) && (
                <div className="flex flex-wrap gap-x-4 mt-1">
                  {phone && <p className="text-sm text-gray-600">Phone: {phone}</p>}
                  {email && <p className="text-sm text-gray-600">Email: {email}</p>}
                </div>
              )}
            </div>
          </div>
          
          {/* Title and Copy Type - Centered below */}
          <div className="w-full text-center mt-6">
            <h2 className="text-2xl font-bold text-gray-800">FEE PAYMENT CHALAN</h2>
            <div className="mt-2">
              <span className="inline-block px-6 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded border border-gray-200">
                {copyLabel}
              </span>
            </div>
            {chalan.academicYear && (
              <p className="text-sm text-gray-600 mt-2">
                Academic Year: {chalan.academicYear}
              </p>
            )}
          </div>
        </div>


        {/* Chalan Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-medium">Chalan:</span> {chalan.chalanNumber || 'N/A'}</p>
              <p><span className="font-medium">Date:</span> {format(new Date(chalan.createdAt || new Date()), 'dd/MM/yyyy')}</p>
            </div>
          </div>
          
          {/* Bank Details */}
          {bankDetails && (
            <div className="mt-2">
              <h3 className="font-semibold">Bank Details:</h3>
              <div className="pl-4 space-y-1">
                <p><span className="font-medium">Bank Name:</span> {bankDetails.bankName}</p>
                <p><span className="font-medium">Account Holder:</span> {bankDetails.accountHolderName || schoolName}</p>
                <p><span className="font-medium">A/c No:</span> {bankDetails.accountNumber}</p>
                <p><span className="font-medium">IFSC Code:</span> {bankDetails.ifscCode}</p>
                <p><span className="font-medium">Branch:</span> {bankDetails.branch}</p>
              </div>
            </div>
          )}
          
          {/* Student Details */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p><span className="font-medium">Academic Year:</span> {chalan.academicYear || '2024-25'}</p>
              <p><span className="font-medium">Student Name:</span> {chalan.studentName || 'N/A'}</p>
              <p><span className="font-medium">Class & Section:</span> {chalan.class || 'N/A'} - {chalan.section || 'N/A'}</p>
              <p className="break-all">
                <span className="font-medium">Student ID:</span> {displayStudentId}
              </p>
            </div>
            
            {/* Payment Details */}
            <div className="p-3 bg-gray-50 rounded">
              <p><span className="font-medium">Installment:</span> {chalan.installmentName || 'N/A'}</p>
              <p><span className="font-medium">Amount:</span> ₹{chalan.amount?.toLocaleString('en-IN') || '0'}</p>
              <p><span className="font-medium">Due Date:</span> {chalan.dueDate ? format(new Date(chalan.dueDate), 'dd/MM/yyyy') : 'N/A'}</p>
              
              {/* Payment Status Box */}
              <div className="mt-3 p-2 border border-dashed border-gray-400 rounded">
                <p className="text-center font-medium text-gray-600">Payment Status</p>
                <div className={`mt-1 text-center py-2 rounded ${
                  (chalan.chalanStatus || '').toLowerCase() === 'paid' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {chalan.chalanStatus ? chalan.chalanStatus.charAt(0).toUpperCase() + chalan.chalanStatus.slice(1) : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer generated chalan and does not require a signature.</p>
        </div>
      </div>
    );
  };

  // If copyType is 'all', render all three copies
  if (copyType === 'all') {
    return (
      <div className={`space-y-6 ${className}`}>
        {renderChalanCopy('student')}
        {renderChalanCopy('office')}
        {renderChalanCopy('admin')}
      </div>
    );
  }

  // Otherwise, render just the specified copy type
  return (
    <div className={className}>
      {renderChalanCopy(copyType)}
    </div>
  );
};


export default ChalanView;
