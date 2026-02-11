import React from 'react';
import { InvoiceTemplateProps } from './types';

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  settings,
  invoiceData,
  mode = 'preview',
  className = ''
}) => {
  const containerStyle = mode === 'print' ? {
    fontFamily: 'Arial, sans-serif',
    aspectRatio: '297/210', // Landscape orientation
    minHeight: '210mm',
    width: '297mm',
    padding: '10mm',
    boxSizing: 'border-box' as const,
    background: 'white',
    fontSize: '10px'
  } : {};

  // Single invoice copy component
  const InvoiceCopy = ({ copyType }: { copyType: string }) => (
    <div 
      className={mode === 'print' ? '' : 'flex-1 border border-gray-300 p-3'}
      style={mode === 'print' ? { 
        flex: '1', 
        border: '1px solid #d1d5db', 
        padding: '12px',
        marginBottom: '8px',
        fontSize: '10px'
      } : {}}
    >
      {/* Copy Type Header */}
      <div 
        className={mode === 'print' ? '' : 'text-center mb-2 pb-2 border-b border-gray-400'}
        style={mode === 'print' ? { textAlign: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #9ca3af' } : {}}
      >
        <h3 
          className={mode === 'print' ? '' : 'text-sm font-bold text-gray-800'}
          style={mode === 'print' ? { fontSize: '12px', fontWeight: 'bold', color: '#1f2937', margin: 0 } : {}}
        >
          {copyType}
        </h3>
      </div>

      {/* Header */}
      <div 
        className={mode === 'print' ? '' : 'flex justify-between items-center mb-3 pb-2 border-b border-gray-300'}
        style={mode === 'print' ? {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #d1d5db'
        } : {}}
      >
        <div 
          className={mode === 'print' ? '' : 'flex items-center space-x-2'}
          style={mode === 'print' ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}}
        >
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className={mode === 'print' ? '' : 'w-8 h-8 object-contain'}
              style={mode === 'print' ? { width: '32px', height: '32px', objectFit: 'contain' } : {}}
            />
          ) : (
            <div 
              className={mode === 'print' ? '' : 'w-8 h-8 bg-gray-800 rounded flex items-center justify-center'}
              style={mode === 'print' ? {
                width: '32px',
                height: '32px',
                background: '#1f2937',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              } : {}}
            >
              <div 
                className={mode === 'print' ? '' : 'w-4 h-4 border border-white rounded transform rotate-45'}
                style={mode === 'print' ? {
                  width: '16px',
                  height: '16px',
                  border: '1px solid white',
                  borderRadius: '2px',
                  transform: 'rotate(45deg)'
                } : {}}
              />
            </div>
          )}
          <div>
            <h1 
              className={mode === 'print' ? '' : 'text-sm font-bold text-gray-800'}
              style={mode === 'print' ? { fontSize: '12px', fontWeight: 'bold', color: '#1f2937', margin: 0 } : {}}
            >
              {settings.schoolName}
            </h1>
            <p 
              className={mode === 'print' ? '' : 'text-xs text-gray-600'}
              style={mode === 'print' ? { fontSize: '8px', color: '#4b5563', margin: '1px 0' } : {}}
            >
              {settings.address}
            </p>
          </div>
        </div>
        <div className={mode === 'print' ? '' : 'text-right'} style={mode === 'print' ? { textAlign: 'right' } : {}}>
        </div>
      </div>

      {/* Document Title */}
      <div 
        className={mode === 'print' ? '' : 'text-center mb-3'}
        style={mode === 'print' ? { textAlign: 'center', marginBottom: '12px' } : {}}
      >
        <h2 
          className={mode === 'print' ? '' : 'text-lg font-bold text-blue-600'}
          style={mode === 'print' ? { fontSize: '14px', fontWeight: 'bold', color: '#2563eb', margin: 0 } : {}}
        >
          INVOICE
        </h2>
        <p 
          className={mode === 'print' ? '' : 'text-xs text-gray-600'}
          style={mode === 'print' ? { fontSize: '10px', color: '#4b5563', marginTop: '2px' } : {}}
        >
          #{invoiceData.invoiceNumber}
        </p>
      </div>

      {/* Invoice Details */}
      <div 
        className={mode === 'print' ? '' : 'grid grid-cols-2 gap-8 mb-8'}
        style={mode === 'print' ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' } : {}}
      >
        <div>
          <h3 
            className={mode === 'print' ? '' : 'text-sm font-semibold text-gray-800 mb-2'}
            style={mode === 'print' ? { fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' } : {}}
          >
            INVOICE TO:
          </h3>
          <div className={mode === 'print' ? '' : 'text-sm text-gray-700'} style={mode === 'print' ? { fontSize: '12px', color: '#374151' } : {}}>
            <p style={mode === 'print' ? { margin: '4px 0', fontWeight: 'bold' } : {}}><strong>{invoiceData.clientName}</strong></p>
            <p style={mode === 'print' ? { margin: '4px 0' } : {}}>{invoiceData.clientAddress}</p>
          </div>
        </div>
        <div className={mode === 'print' ? '' : 'text-right'} style={mode === 'print' ? { textAlign: 'right' } : {}}>
          <div className={mode === 'print' ? '' : 'text-sm text-gray-700'} style={mode === 'print' ? { fontSize: '12px', color: '#374151' } : {}}>
            <p style={mode === 'print' ? { margin: '4px 0' } : {}}><strong>Invoice Date:</strong> {invoiceData.date}</p>
            <p style={mode === 'print' ? { margin: '4px 0' } : {}}><strong>Due Date:</strong> {invoiceData.dueDate}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table 
        className={mode === 'print' ? '' : 'w-full border-collapse border border-gray-300 mb-8'}
        style={mode === 'print' ? { width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db', marginBottom: '32px' } : {}}
      >
        <thead>
          <tr style={mode === 'print' ? { backgroundColor: '#f3f4f6' } : {}}>
            <th 
              className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300 text-left font-semibold'}
              style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db', textAlign: 'left', fontWeight: '600' } : {}}
            >
              Description
            </th>
            <th 
              className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300 text-center font-semibold'}
              style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: '600' } : {}}
            >
              Qty
            </th>
            <th 
              className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300 text-right font-semibold'}
              style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: '600' } : {}}
            >
              Rate
            </th>
            <th 
              className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300 text-right font-semibold'}
              style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db', textAlign: 'right', fontWeight: '600' } : {}}
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoiceData.items.map((item, index) => (
            <tr key={index}>
              <td 
                className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300'}
                style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db' } : {}}
              >
                {item.description}
              </td>
              <td 
                className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300 text-center'}
                style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db', textAlign: 'center' } : {}}
              >
                {item.quantity}
              </td>
              <td 
                className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300 text-right'}
                style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db', textAlign: 'right' } : {}}
              >
                ₹{item.rate.toFixed(2)}
              </td>
              <td 
                className={mode === 'print' ? '' : 'px-4 py-3 border border-gray-300 text-right'}
                style={mode === 'print' ? { padding: '12px 16px', border: '1px solid #d1d5db', textAlign: 'right' } : {}}
              >
                ₹{item.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className={mode === 'print' ? '' : 'flex justify-end mb-8'} style={mode === 'print' ? { display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' } : {}}>
        <div className={mode === 'print' ? '' : 'w-64'} style={mode === 'print' ? { width: '256px' } : {}}>
          <div 
            className={mode === 'print' ? '' : 'flex justify-between py-2 border-b border-gray-300'}
            style={mode === 'print' ? { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #d1d5db' } : {}}
          >
            <span>Subtotal:</span>
            <span>₹{invoiceData.subtotal.toFixed(2)}</span>
          </div>
          <div 
            className={mode === 'print' ? '' : 'flex justify-between py-2 border-b border-gray-300'}
            style={mode === 'print' ? { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #d1d5db' } : {}}
          >
            <span>Tax:</span>
            <span>₹{invoiceData.tax.toFixed(2)}</span>
          </div>
          <div 
            className={mode === 'print' ? '' : 'flex justify-between py-3 font-bold text-lg border-b-2 border-gray-800'}
            style={mode === 'print' ? { display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 'bold', fontSize: '18px', borderBottom: '2px solid #1f2937' } : {}}
          >
            <span>Total:</span>
            <span>₹{invoiceData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        className={mode === 'print' ? '' : 'mt-auto pt-8 border-t border-gray-300'}
        style={mode === 'print' ? { marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid #d1d5db' } : {}}
      >
        <div 
          className={mode === 'print' ? '' : 'text-center text-sm text-gray-600'}
          style={mode === 'print' ? { textAlign: 'center', fontSize: '12px', color: '#4b5563' } : {}}
        >
          <p style={mode === 'print' ? { margin: '4px 0' } : {}}>Thank you for your business!</p>
          <p style={mode === 'print' ? { margin: '4px 0' } : {}}>
            For any queries, contact us at {settings.phone} or {settings.email}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className={`invoice-template ${className} ${mode === 'print' ? '' : 'w-full max-w-6xl mx-auto bg-white shadow-lg'}`} 
      style={mode === 'print' ? containerStyle : {
        fontFamily: 'Arial, sans-serif',
        aspectRatio: '297/210', // Landscape for preview too
        minHeight: '210mm',
        width: '297mm',
        padding: '10mm',
        boxSizing: 'border-box',
        fontSize: '10px'
      }}
    >
      {/* Two Invoice Copies - Side by Side */}
      <div 
        className={mode === 'print' ? '' : 'flex flex-row gap-4'}
        style={mode === 'print' ? { display: 'flex', flexDirection: 'row', gap: '16px' } : {}}
      >
        <InvoiceCopy copyType="ADMIN COPY" />
        <InvoiceCopy copyType="STUDENT COPY" />
      </div>
    </div>
  );
};

export default InvoiceTemplate;
