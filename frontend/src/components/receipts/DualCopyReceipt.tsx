import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export interface PaymentData {
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  amount: number;
  installmentName: string;
}

export interface StudentData {
  name: string;
  studentId: string;
  userId?: string;
  class: string;
  section: string;
  academicYear: string;
}

export interface SchoolData {
  schoolName: string;
  schoolCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  hasSchoolLogo?: boolean;
  schoolLogo?: string;
}

export interface InstallmentDetail {
  name: string;
  amount: number;
  paid: number;
  remaining: number;
  isCurrent?: boolean;
}

interface DualCopyReceiptProps {
  schoolData: SchoolData;
  studentData: StudentData;
  paymentData: PaymentData;
  installments: InstallmentDetail[];
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

const DualCopyReceipt: React.FC<DualCopyReceiptProps> = ({
  schoolData,
  studentData,
  paymentData,
  installments,
  totalAmount,
  totalPaid,
  totalRemaining,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';

      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const formattedTime = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return `${formattedDate} at ${formattedTime}`;
    } catch (error) {
      console.error('DateTime formatting error:', error);
      return '-';
    }
  };

  // Screenshots the actual rendered receipt (all colors/borders intact) and
  // saves it as a PDF directly — no browser print dialog, no "Save as PDF" step.
  const handleDownloadPdf = async () => {
  if (!receiptRef.current) return;

  setDownloading(true);

  try {
    await document.fonts.ready;

    const [{ default: html2canvas }, { default: jsPDF }] =
      await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

    const canvas = await html2canvas(receiptRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: receiptRef.current.scrollWidth,
      windowHeight: receiptRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 1);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(
      imgData,
      "JPEG",
      0,
      0,
      pageWidth,
      pageHeight
    );

    pdf.save(`Receipt-${paymentData.receiptNumber}.pdf`);
  } finally {
    setDownloading(false);
  }
};

  return (
    <div className="max-w-7xl mx-auto bg-white">
      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mb-6 print:hidden">
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloading ? 'Preparing PDF...' : 'Download Receipt'}
        </button>
      </div>

      {/* Dual Copy Receipt — this exact DOM node is what gets captured to PDF */}
      <div ref={receiptRef} className="receipt-container flex gap-4 print:gap-2" style={{ backgroundColor: '#ffffff' }}>
        {/* Admin Copy */}
        <div className="receipt-copy flex-1 border border-gray-300 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-2">
                {schoolData.hasSchoolLogo && schoolData.schoolLogo && (
                  <img
                    src={schoolData.schoolLogo}
                    alt={`${schoolData.schoolName} Logo`}
                    className="h-16 w-auto object-contain"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <h1 className="text-lg font-bold text-gray-800">{schoolData.schoolName}</h1>
                  <p className="text-sm text-gray-600">
                    School Code: {schoolData.schoolCode}
                  </p>
                  {schoolData.address && (
                    <p className="text-xs text-gray-500 mt-1">
                      {schoolData.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold">
                  ADMIN COPY
                </span>
              </div>
              <div className="mt-3">
                <div className="text-sm text-gray-600">
                  {formatDateTime(paymentData.paymentDate)}
                </div>
                <div className="mt-1">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold">
                    Receipt #{paymentData.receiptNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Student Name</span>
                  <span className="font-medium">{studentData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Student ID</span>
                  <span className="font-medium">{studentData.userId || studentData.studentId}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Class & Section</span>
                  <span className="font-medium">{studentData.class}-{studentData.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Academic Year</span>
                  <span className="font-medium">{studentData.academicYear}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Date</span>
                  <span className="font-medium">{formatDateTime(paymentData.paymentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-medium">{paymentData.paymentMethod}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference</span>
                  <span className="font-medium">{paymentData.paymentReference || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Installment</span>
                  <span className="font-medium">{paymentData.installmentName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Installment Details */}
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
              Installment Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Installment</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Paid</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((installment, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="px-3 py-2">
                        {installment.isCurrent ? (
                          <span className="font-medium">{installment.name} (Current)</span>
                        ) : (
                          installment.name
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(installment.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-green-600 font-medium">
                          {formatCurrency(installment.paid)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-red-600 font-medium">
                          {formatCurrency(installment.remaining)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totalAmount)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-green-600">{formatCurrency(totalPaid)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-red-600">{formatCurrency(totalRemaining)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Fee Summary Table */}
          <div className="px-4 py-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 bg-gray-100 px-3 py-2 rounded">
              Fee Summary
            </h4>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead>
                <tr className="bg-blue-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 border-b border-gray-200">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-medium">Total Annual Fee</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(totalAmount)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-medium text-green-700">Total Amount Paid</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(totalPaid)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-medium text-red-700">Total Remaining</td>
                  <td className="px-3 py-2 text-right font-semibold text-red-700">{formatCurrency(totalRemaining)}</td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-3 py-2">Balance Due</td>
                  <td className="px-3 py-2 text-right text-red-700">{formatCurrency(totalRemaining)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Current Payment */}
          <div className="px-4 py-3 bg-blue-50 border-t border-gray-200">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Current Payment</div>
              <div className="text-2xl font-bold text-blue-800">
                {formatCurrency(paymentData.amount)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 text-center text-xs text-gray-600 border-t border-gray-200">
            <div className="font-semibold">This is a computer generated copy.</div>
            <div className="mt-1">
              Powered by <span className="font-semibold text-blue-600">GOODSYNK ERP</span>
            </div>
            <div className="mt-1">
              Thank you for your payment! • {schoolData.website}
            </div>
            <div className="mt-1">
              {schoolData.phone} • {schoolData.email}
            </div>
          </div>
        </div>

        {/* Student Copy */}
        <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-2">
                {schoolData.hasSchoolLogo && schoolData.schoolLogo && (
                  <img
                    src={schoolData.schoolLogo}
                    alt={`${schoolData.schoolName} Logo`}
                    className="h-16 w-auto object-contain"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <h1 className="text-lg font-bold text-gray-800">{schoolData.schoolName}</h1>
                  <p className="text-sm text-gray-600">
                    School Code: {schoolData.schoolCode}
                  </p>
                  {schoolData.address && (
                    <p className="text-xs text-gray-500 mt-1">
                      {schoolData.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold">
                  STUDENT COPY
                </span>
              </div>
              <div className="mt-3">
                <div className="text-sm text-gray-600">
                  {formatDateTime(paymentData.paymentDate)}
                </div>
                <div className="mt-1">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold">
                    Receipt #{paymentData.receiptNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Student Name</span>
                  <span className="font-medium">{studentData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Student ID</span>
                  <span className="font-medium">{studentData.userId || studentData.studentId}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Class & Section</span>
                  <span className="font-medium">{studentData.class}-{studentData.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Academic Year</span>
                  <span className="font-medium">{studentData.academicYear}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Date</span>
                  <span className="font-medium">{formatDateTime(paymentData.paymentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-medium">{paymentData.paymentMethod}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference</span>
                  <span className="font-medium">{paymentData.paymentReference || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Installment</span>
                  <span className="font-medium">{paymentData.installmentName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Installment Details */}
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 bg-gray-100 px-3 py-2 rounded">
              Installment Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Installment</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Paid</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((installment, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="px-3 py-2">
                        {installment.isCurrent ? (
                          <span className="font-medium">{installment.name} (Current)</span>
                        ) : (
                          installment.name
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(installment.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-green-600 font-medium">
                          {formatCurrency(installment.paid)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-red-600 font-medium">
                          {formatCurrency(installment.remaining)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totalAmount)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-green-600">{formatCurrency(totalPaid)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-red-600">{formatCurrency(totalRemaining)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Fee Summary Table */}
          <div className="px-4 py-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 bg-gray-100 px-3 py-2 rounded">
              Fee Summary
            </h4>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead>
                <tr className="bg-blue-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 border-b border-gray-200">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-medium">Total Annual Fee</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(totalAmount)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-medium text-green-700">Total Amount Paid</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(totalPaid)}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-medium text-red-700">Total Remaining</td>
                  <td className="px-3 py-2 text-right font-semibold text-red-700">{formatCurrency(totalRemaining)}</td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td className="px-3 py-2">Balance Due</td>
                  <td className="px-3 py-2 text-right text-red-700">{formatCurrency(totalRemaining)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Current Payment */}
          <div className="px-4 py-3 bg-blue-50 border-t border-gray-200">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Current Payment</div>
              <div className="text-2xl font-bold text-blue-800">
                {formatCurrency(paymentData.amount)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 text-center text-xs text-gray-600 border-t border-gray-200">
            <div className="font-semibold">This is a computer generated copy.</div>
            <div className="mt-1">
              Powered by <span className="font-semibold text-blue-600">GOODSYNK ERP</span>
            </div>
            <div className="mt-1">
              Thank you for your payment! • {schoolData.website}
            </div>
            <div className="mt-1">
              {schoolData.phone} • {schoolData.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualCopyReceipt;