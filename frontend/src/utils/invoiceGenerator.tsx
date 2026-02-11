import React from 'react';
import { createRoot } from 'react-dom/client';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  studentName: string;
  studentAddress: string;
  studentEmail: string;
  studentPhone: string;
  items: InvoiceItem[];
  subTotal: number;
  tax: number;
  total: number;
}

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface TemplateSettings {
  schoolName: string;
  schoolCode: string;
  website: string;
  logoUrl?: string;
  headerColor: string;
  accentColor: string;
}

const InvoicePrintComponent: React.FC<{ invoiceData: InvoiceData; templateSettings: TemplateSettings }> = ({
  invoiceData,
  templateSettings
}) => (
  <div className="max-w-2xl mx-auto bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
    {/* Header */}
    <div className="flex justify-between items-start p-8 border-b-2" style={{ borderColor: templateSettings.accentColor }}>
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white rounded transform rotate-45"></div>
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: templateSettings.headerColor }}>
            {templateSettings.schoolName}
          </h1>
          <p className="text-sm text-gray-600">School Code: {templateSettings.schoolCode}</p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-3xl font-bold" style={{ color: templateSettings.headerColor }}>INVOICE</h2>
      </div>
    </div>

    {/* Invoice Details */}
    <div className="p-8">
      <div className="flex justify-between mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">INVOICE TO:</h3>
          <div className="text-gray-800">
            <p className="font-semibold text-lg">{invoiceData.studentName}</p>
            <p className="text-sm text-gray-600">{invoiceData.studentAddress}</p>
            <p className="text-sm text-gray-600">{invoiceData.studentEmail}</p>
            <p className="text-sm text-gray-600">{invoiceData.studentPhone}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Invoice No: <span className="font-semibold">{invoiceData.invoiceNumber}</span></p>
            <p className="text-sm text-gray-600">Invoice Date: <span className="font-semibold">{invoiceData.invoiceDate}</span></p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2" style={{ borderColor: templateSettings.accentColor }}>
              <th className="text-left py-3 font-semibold text-gray-700">NAME</th>
              <th className="text-center py-3 font-semibold text-gray-700">QTY</th>
              <th className="text-right py-3 font-semibold text-gray-700">PRICE</th>
              <th className="text-right py-3 font-semibold text-gray-700">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-3 text-gray-800">{item.name}</td>
                <td className="py-3 text-center text-gray-800">{item.quantity}</td>
                <td className="py-3 text-right text-gray-800">₹{item.price}</td>
                <td className="py-3 text-right text-gray-800">₹{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Sub-total:</span>
            <span className="font-semibold">₹{invoiceData.subTotal}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Tax:</span>
            <span className="font-semibold">₹{invoiceData.tax}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-300">
            <span className="text-lg font-bold">Total:</span>
            <span className="text-lg font-bold">₹{invoiceData.total}</span>
          </div>
        </div>
      </div>

      {/* Signature and Thank You */}
      <div className="flex justify-between items-end">
        <div>
          <div className="mb-2">
            <div className="w-32 h-16 border-b border-gray-400"></div>
            <p className="text-sm text-gray-600 mt-2">Administrator</p>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-2xl font-bold" style={{ color: templateSettings.headerColor }}>THANK YOU!</h3>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="bg-gray-50 px-8 py-4 border-t">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>{invoiceData.studentPhone}</span>
        <span>{invoiceData.studentEmail}</span>
        <span>{templateSettings.website}</span>
      </div>
    </div>
  </div>
);

export const generateInvoice = (invoiceData: InvoiceData, templateSettings?: TemplateSettings) => {
  // Load template settings from localStorage if not provided
  const defaultSettings: TemplateSettings = {
    schoolName: 'School Name',
    schoolCode: 'SCH001',
    website: 'www.school.com',
    headerColor: '#1f2937',
    accentColor: '#3b82f6'
  };

  let settings = defaultSettings;
  if (templateSettings) {
    settings = templateSettings;
  } else {
    try {
      // Try universal template first, then fallback to old invoice template
      const universalTemplate = localStorage.getItem('universalTemplate');
      const invoiceTemplate = localStorage.getItem('invoiceTemplate');
      
      if (universalTemplate) {
        settings = { ...defaultSettings, ...JSON.parse(universalTemplate) };
      } else if (invoiceTemplate) {
        settings = { ...defaultSettings, ...JSON.parse(invoiceTemplate) };
      }
    } catch (error) {
      console.error('Failed to load template settings:', error);
    }
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Please allow popups to generate invoice');
    return;
  }

  // Create the HTML document
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${invoiceData.invoiceNumber}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div id="invoice-root"></div>
        <div class="no-print p-4 text-center">
          <button onclick="window.print()" class="bg-blue-600 text-white px-6 py-2 rounded-lg mr-4">Print Invoice</button>
          <button onclick="window.close()" class="bg-gray-600 text-white px-6 py-2 rounded-lg">Close</button>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for the document to load, then render React component
  printWindow.onload = () => {
    const container = printWindow.document.getElementById('invoice-root');
    if (container) {
      const root = createRoot(container);
      root.render(<InvoicePrintComponent invoiceData={invoiceData} templateSettings={settings} />);
    }
  };
};

export const generateFeeInvoice = (studentData: any, feeStructure: any, paymentData: any) => {
  const invoiceData: InvoiceData = {
    invoiceNumber: `#${paymentData.receiptNumber || Date.now()}`,
    invoiceDate: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    studentName: studentData.name || `${studentData.firstName} ${studentData.lastName}`,
    studentAddress: studentData.address || 'Student Address',
    studentEmail: studentData.email || 'student@school.com',
    studentPhone: studentData.phone || studentData.contactNumber || '+91-XXXXXXXXXX',
    items: feeStructure.map((fee: any) => ({
      name: fee.feeName || fee.name,
      quantity: 1,
      price: fee.amount,
      total: fee.amount
    })),
    subTotal: feeStructure.reduce((sum: number, fee: any) => sum + fee.amount, 0),
    tax: 0, // Can be calculated based on school policy
    total: feeStructure.reduce((sum: number, fee: any) => sum + fee.amount, 0)
  };

  generateInvoice(invoiceData);
};

export default {
  generateInvoice,
  generateFeeInvoice
};
