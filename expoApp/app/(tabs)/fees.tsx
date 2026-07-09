import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { getStudentFeesOverview, getInstallmentChallan, FeesData, PaymentRecord, Installment } from '@/src/services/student';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

type ChallanCopyType = 'student' | 'office' | 'admin';
type ReceiptCopyType = 'student' | 'admin';

export default function FeesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  // Data states
  const [data, setData] = useState<FeesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);
  const [isChalanModalOpen, setIsChalanModalOpen] = useState(false);
  const [challanCopy, setChallanCopy] = useState<ChallanCopyType>('student');
  const [loadingChallanFor, setLoadingChallanFor] = useState<string | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptCopy, setReceiptCopy] = useState<ReceiptCopyType>('student');
  const [pdfActionState, setPdfActionState] = useState<'share' | 'download' | null>(null);

  const loadFeesData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getStudentFeesOverview();
      if (res) {
        setData(res);
      } else {
        setError('No active fee records found.');
      }
    } catch (err: any) {
      console.error('[FEES SCREEN] Error loading fees:', err);
      setError('Failed to load fees data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeesData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === 'PAID' || s === 'COMPLETED') return '#10B981'; // Green
    if (s === 'PARTIAL' || s === 'PENDING') return '#F59E0B'; // Yellow
    if (s === 'OVERDUE') return '#EF4444'; // Red
    return '#6B7280'; // Gray
  };

  const getStatusBg = (status: string, dark: boolean) => {
    const s = String(status).toUpperCase();
    if (s === 'PAID' || s === 'COMPLETED') return dark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5';
    if (s === 'PARTIAL' || s === 'PENDING') return dark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7';
    if (s === 'OVERDUE') return dark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2';
    return dark ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6';
  };

  const getCurrentPayableInstallmentName = (installments: Installment[]): string | null => {
    const current = installments.find((inst) => String(inst.status).toUpperCase() !== 'PAID');
    return current ? current.name : null;
  };

  const handleViewChallan = async (inst: Installment) => {
    try {
      setLoadingChallanFor(inst.name);
      const chalanData = await getInstallmentChallan(inst.name);
      if (!chalanData) {
        Alert.alert('Error', 'Could not load challan details.');
        return;
      }
      
      const userDataStr = await AsyncStorage.getItem('userData');
      const user = userDataStr ? JSON.parse(userDataStr) : null;

      const chalanDetails = {
        chalanNumber: chalanData.chalanNumber,
        chalanDate: chalanData.issueDate || new Date().toISOString(),
        installmentName: chalanData.installmentName,
        amount: chalanData.amount,
        dueDate: chalanData.dueDate || new Date().toISOString(),
        studentName: chalanData.studentName || data?.feeRecord?.studentName,
        studentId: chalanData.studentId || user?.id || '',
        className: chalanData.className || data?.feeRecord?.studentClass,
        section: chalanData.section || data?.feeRecord?.studentSection,
        academicYear: chalanData.academicYear || data?.feeRecord?.academicYear,
        schoolName: chalanData.schoolName || data?.schoolName,
        bankDetails: chalanData.bankDetails || data?.bankDetails || undefined,
        status: chalanData.status,
      };

      setSelectedChallan(chalanDetails);
      setChallanCopy('student');
      setIsChalanModalOpen(true);
    } catch (err) {
      console.error('Error fetching challan:', err);
      Alert.alert('Error', 'Failed to load challan.');
    } finally {
      setLoadingChallanFor(null);
    }
  };

  const handleViewReceipt = (payment: PaymentRecord) => {
    if (!data?.feeRecord) return;
    
    const receiptData = {
      ...payment,
      schoolName: data.schoolName,
      studentName: data.feeRecord.studentName,
      className: data.feeRecord.studentClass,
      section: data.feeRecord.studentSection,
      academicYear: data.feeRecord.academicYear,
    };
    
    setSelectedReceipt(receiptData);
    setReceiptCopy('student');
    setIsReceiptModalOpen(true);
  };

  const generatePDF = async (html: string, filename: string, action: 'share' | 'download' = 'share') => {
    try {
      setPdfActionState(action);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (action === 'share') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: filename });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      } else {
        if (Platform.OS === 'android') {
          if (FileSystem.StorageAccessFramework) {
            try {
              const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (permissions.granted) {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(
                  permissions.directoryUri,
                  filename + '.pdf',
                  'application/pdf'
                );
                await FileSystem.writeAsStringAsync(savedUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                Alert.alert('Success', 'PDF successfully saved to your device.');
              } else {
                Alert.alert('Permission Denied', 'Unable to save the PDF without directory access.');
              }
            } catch (safErr: any) {
              console.error('SAF Error:', safErr);
              if (!safErr?.message?.toLowerCase().includes('cancel')) {
                Alert.alert('Download Error', safErr?.message || 'Failed to save the file.');
              }
            }
          } else {
            // Fallback for environments where SAF is undefined
            if (await Sharing.isAvailableAsync()) {
              Alert.alert('Notice', 'Direct download not supported on this version. Please select "Save" from the share menu.');
              await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: filename });
            } else {
              Alert.alert('Error', 'Downloading is not available on this device');
            }
          }
        } else {
          // iOS sharing dialog automatically has a 'Save to Files' option
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: filename });
          } else {
            Alert.alert('Error', 'Downloading is not available on this device');
          }
        }
      }
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      Alert.alert('Error', err?.message || 'Failed to generate PDF');
    } finally {
      setPdfActionState(null);
    }
  };

  const processChallanPDF = (action: 'share' | 'download' = 'share') => {
    if (!selectedChallan) return;
    // For sharing, we generate all 3 copies stacked
    const copies = ['Student Copy', 'Office Copy', 'Admin Copy'];
    let fullHtml = `<html><head><style>body{font-family:sans-serif;padding:20px;font-size:12px;color:#333;}.copy-container{border:1px solid #ddd;padding:15px;margin-bottom:20px;border-radius:8px;}.header{text-align:center;margin-bottom:15px;border-bottom:2px solid #333;padding-bottom:10px;}.title{font-size:18px;font-weight:bold;margin:0;}.subtitle{font-size:12px;color:#666;margin:5px 0;}.row{display:flex;justify-content:space-between;margin-bottom:8px;}.label{font-weight:bold;color:#555;}.value{font-weight:bold;}.cut-line{border-top:1px dashed #999;margin:30px 0;text-align:center;color:#999;font-size:10px;}</style></head><body>`;
    
    copies.forEach((copyName, index) => {
      fullHtml += `
        <div class="copy-container">
          <div class="header">
            <h1 class="title">${selectedChallan.schoolName}</h1>
            <p class="subtitle">Fee Challan - ${copyName}</p>
          </div>
          <div class="row"><span class="label">Challan No:</span> <span class="value">${selectedChallan.chalanNumber}</span></div>
          <div class="row"><span class="label">Date:</span> <span class="value">${new Date(selectedChallan.chalanDate).toLocaleDateString()}</span></div>
          <div class="row"><span class="label">Student Name:</span> <span class="value">${selectedChallan.studentName}</span></div>
          <div class="row"><span class="label">Class/Section:</span> <span class="value">${selectedChallan.className} - ${selectedChallan.section}</span></div>
          <div class="row"><span class="label">Installment:</span> <span class="value">${selectedChallan.installmentName}</span></div>
          <div class="row"><span class="label">Due Date:</span> <span class="value">${new Date(selectedChallan.dueDate).toLocaleDateString()}</span></div>
          <div style="margin-top:15px;padding-top:15px;border-top:1px solid #eee;">
            <div class="row"><span class="label" style="font-size:16px;">Total Amount:</span> <span class="value" style="font-size:16px;">Rs. ${selectedChallan.amount}</span></div>
          </div>
          ${selectedChallan.bankDetails ? `
          <div style="margin-top:15px;padding:10px;background:#f9f9f9;border-radius:4px;">
            <p style="margin:0;font-weight:bold;font-size:11px;">Bank Details</p>
            <p style="margin:2px 0 0;font-size:11px;">${selectedChallan.bankDetails.bankName} - A/C: ${selectedChallan.bankDetails.accountNumber}</p>
            <p style="margin:2px 0 0;font-size:11px;">IFSC: ${selectedChallan.bankDetails.ifscCode}</p>
          </div>
          ` : ''}
          <div style="margin-top:40px;display:flex;justify-content:space-between;">
            <span style="border-top:1px solid #333;padding-top:5px;">Depositor Signature</span>
            <span style="border-top:1px solid #333;padding-top:5px;">Bank/Cashier Signature</span>
          </div>
        </div>
      `;
      if (index < copies.length - 1) fullHtml += `<div class="cut-line">✂️ Cut Here ✂️</div>`;
    });
    
    fullHtml += `</body></html>`;
    generatePDF(fullHtml, `Challan_${selectedChallan.chalanNumber}`, action);
  };

  const processReceiptPDF = (action: 'share' | 'download' = 'share') => {
    if (!selectedReceipt) return;
    const copies = ['Student Copy', 'Admin Copy'];
    let fullHtml = `<html><head><style>body{font-family:sans-serif;padding:20px;font-size:12px;color:#333;}.copy-container{border:1px solid #ddd;padding:15px;margin-bottom:20px;border-radius:8px;}.header{text-align:center;margin-bottom:15px;border-bottom:2px solid #333;padding-bottom:10px;}.title{font-size:18px;font-weight:bold;margin:0;}.subtitle{font-size:12px;color:#666;margin:5px 0;}.row{display:flex;justify-content:space-between;margin-bottom:8px;}.label{font-weight:bold;color:#555;}.value{font-weight:bold;}.cut-line{border-top:1px dashed #999;margin:30px 0;text-align:center;color:#999;font-size:10px;}</style></head><body>`;
    
    copies.forEach((copyName, index) => {
      fullHtml += `
        <div class="copy-container">
          <div class="header">
            <h1 class="title">${selectedReceipt.schoolName}</h1>
            <p class="subtitle">Payment Receipt - ${copyName}</p>
          </div>
          <div class="row"><span class="label">Receipt No:</span> <span class="value">${selectedReceipt.receiptNumber}</span></div>
          <div class="row"><span class="label">Date:</span> <span class="value">${new Date(selectedReceipt.paymentDate).toLocaleDateString()}</span></div>
          <div class="row"><span class="label">Student Name:</span> <span class="value">${selectedReceipt.studentName}</span></div>
          <div class="row"><span class="label">Class/Section:</span> <span class="value">${selectedReceipt.className} - ${selectedReceipt.section}</span></div>
          <div class="row"><span class="label">Installment:</span> <span class="value">${selectedReceipt.installmentName}</span></div>
          <div class="row"><span class="label">Mode:</span> <span class="value">${selectedReceipt.paymentMethod} ${selectedReceipt.paymentReference ? `(${selectedReceipt.paymentReference})` : ''}</span></div>
          <div style="margin-top:15px;padding-top:15px;border-top:1px solid #eee;">
            <div class="row"><span class="label" style="font-size:16px;">Paid Amount:</span> <span class="value" style="font-size:16px;color:#10B981;">Rs. ${selectedReceipt.amount}</span></div>
          </div>
          <div style="margin-top:40px;text-align:right;">
            <span style="border-top:1px solid #333;padding-top:5px;">Authorized Signature</span>
          </div>
        </div>
      `;
      if (index < copies.length - 1) fullHtml += `<div class="cut-line">✂️ Cut Here ✂️</div>`;
    });
    
    fullHtml += `</body></html>`;
    generatePDF(fullHtml, `Receipt_${selectedReceipt.receiptNumber}`, action);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading Fees & Receipts...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data || !data.feeRecord) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#93C5FD' : '#1E3A8A'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fees & Receipts</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="document-text-outline" size={64} color={isDark ? '#374151' : '#D1D5DB'} />
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600', color: isDark ? '#E5E7EB' : '#374151' }}>No Active Fee Record</Text>
          <Text style={{ marginTop: 8, textAlign: 'center', color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {error || "You don't have any fee structures assigned for the current academic year."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFeesData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { feeRecord, payments, bankDetails } = data;
  const currentPayableInstallmentName = getCurrentPayableInstallmentName(feeRecord.installments);
  const clearedPercentage = feeRecord.totalAmount > 0
    ? Math.min(100, Math.round((feeRecord.totalPaid / feeRecord.totalAmount) * 100))
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fees & Receipts</Text>
      </View>


      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* OVERVIEW */}
        <View style={styles.tabContent}>
            <View style={styles.overviewHeader}>
              <View>
                <Text style={styles.academicYearText}>AY: {feeRecord.academicYear}</Text>
                <Text style={styles.structureNameText}>{feeRecord.feeStructureName}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(feeRecord.status, isDark) }]}>
                <Text style={[styles.statusBadgeText, { color: getStatusColor(feeRecord.status) }]}>
                  {feeRecord.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>
                {formatCurrency(feeRecord.totalPaid)} of {formatCurrency(feeRecord.totalAmount)} cleared
              </Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${clearedPercentage}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{clearedPercentage}%</Text>
            </View>

            {/* Metric Cards */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIconBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF' }]}>
                  <Ionicons name="card-outline" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.metricLabel}>Total Fees</Text>
                <Text style={styles.metricValue}>{formatCurrency(feeRecord.totalAmount)}</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.metricLabel}>Total Paid</Text>
                <Text style={[styles.metricValue, { color: '#10B981' }]}>{formatCurrency(feeRecord.totalPaid)}</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIconBox, { backgroundColor: feeRecord.totalPending > 0 ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFFBEB') : (isDark ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6') }]}>
                  <Ionicons name="warning-outline" size={24} color={feeRecord.totalPending > 0 ? '#F59E0B' : '#6B7280'} />
                </View>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text style={[styles.metricValue, { color: feeRecord.totalPending > 0 ? '#F59E0B' : (isDark ? '#9CA3AF' : '#6B7280') }]}>
                  {formatCurrency(feeRecord.totalPending)}
                </Text>
              </View>
            </View>

            {/* Bank Details */}
            {bankDetails && (
              <View style={styles.bankCard}>
                <View style={styles.bankHeader}>
                  <Ionicons name="business" size={20} color="#4F46E5" style={styles.bankIcon} />
                  <Text style={styles.bankTitle}>Offline Bank Deposit</Text>
                </View>
                <Text style={styles.bankInstruction}>
                  Fee payments are collected by the school office. Refer to the challan for account details.
                </Text>
                <View style={styles.bankDetailsGrid}>
                  <View style={styles.bankDetailItem}>
                    <Text style={styles.bankDetailLabel}>Bank Name:</Text>
                    <Text style={styles.bankDetailValue}>{bankDetails.bankName}</Text>
                  </View>
                  <View style={styles.bankDetailItem}>
                    <Text style={styles.bankDetailLabel}>Account No:</Text>
                    <Text style={styles.bankDetailValue}>{bankDetails.accountNumber}</Text>
                  </View>
                  <View style={styles.bankDetailItem}>
                    <Text style={styles.bankDetailLabel}>IFSC Code:</Text>
                    <Text style={styles.bankDetailValue}>{bankDetails.ifscCode}</Text>
                  </View>
                  <View style={styles.bankDetailItem}>
                    <Text style={styles.bankDetailLabel}>Account Holder:</Text>
                    <Text style={styles.bankDetailValue}>{bankDetails.accountHolderName}</Text>
                  </View>
                </View>
              </View>
            )}
        </View>

        {/* INSTALLMENTS */}
        <View style={styles.tabContent}>
          <Text style={styles.sectionHeader}>Installments</Text>
            {feeRecord.installments.map((inst, index) => {
              const isPaid = String(inst.status).toUpperCase() === 'PAID';
              const isCurrent = inst.name === currentPayableInstallmentName;
              const isLocked = !isPaid && !isCurrent;

              return (
                <View key={index} style={styles.installmentCard}>
                  <View style={styles.installmentHeaderRow}>
                    <View style={styles.installmentTitleRow}>
                      <View style={styles.calendarIconBox}>
                        <Ionicons name="calendar-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      </View>
                      <View>
                        <Text style={styles.installmentName}>{inst.name}</Text>
                        <Text style={styles.installmentDate}>
                          Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-GB') : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadgeSm, { backgroundColor: getStatusBg(inst.status, isDark) }]}>
                      <Text style={[styles.statusBadgeTextSm, { color: getStatusColor(inst.status) }]}>
                        {inst.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.installmentAmountsRow}>
                    <View>
                      <Text style={styles.amountLabel}>Amount</Text>
                      <Text style={styles.amountValue}>{formatCurrency(inst.amount)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.amountLabel}>Paid</Text>
                      <Text style={[styles.amountValue, { color: '#10B981' }]}>{formatCurrency(inst.paidAmount)}</Text>
                    </View>
                  </View>

                  {isCurrent && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleViewChallan(inst)}
                      disabled={loadingChallanFor === inst.name}
                    >
                      {loadingChallanFor === inst.name ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <>
                          <Ionicons name="eye-outline" size={16} color="#3B82F6" />
                          <Text style={styles.actionButtonText}>View / Download Challan</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {isLocked && (
                    <View style={styles.lockedRow}>
                      <Ionicons name="lock-closed-outline" size={14} color={isDark ? '#6B7280' : '#9CA3AF'} />
                      <Text style={styles.lockedText}>Complete earlier installment first</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

        {/* RECEIPTS */}
        <View style={styles.tabContent}>
          <Text style={styles.sectionHeader}>Receipts</Text>
            {payments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={isDark ? '#374151' : '#D1D5DB'} />
                <Text style={styles.emptyStateText}>No receipts generated yet.</Text>
              </View>
            ) : (
              payments.map((p, index) => (
                <View key={index} style={styles.receiptCard}>
                  <View style={styles.receiptHeaderRow}>
                    <View>
                      <Text style={styles.receiptNumber}>{p.receiptNumber}</Text>
                      <Text style={styles.receiptInstallment}>{p.installmentName}</Text>
                    </View>
                    <View style={[styles.statusBadgeSm, { backgroundColor: getStatusBg('PAID', isDark) }]}>
                      <Text style={[styles.statusBadgeTextSm, { color: getStatusColor('PAID') }]}>PAID</Text>
                    </View>
                  </View>

                  <View style={styles.receiptDetailsRow}>
                    <View>
                      <Text style={styles.receiptLabel}>Date</Text>
                      <Text style={styles.receiptValue}>
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB') : 'N/A'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.receiptLabel}>Amount</Text>
                      <Text style={styles.receiptAmount}>{formatCurrency(p.amount)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleViewReceipt(p)}
                  >
                    <Ionicons name="eye-outline" size={16} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Download Invoice</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

      </ScrollView>

      {/* CHALLAN MODAL */}
      <Modal visible={isChalanModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Challan Details</Text>
              <TouchableOpacity onPress={() => setIsChalanModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {selectedChallan && (
              <View style={{ flex: 1 }}>
                <View style={styles.modalTabContainer}>
                  {(['student', 'office', 'admin'] as ChallanCopyType[]).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.modalTab, challanCopy === c && styles.activeModalTab]}
                      onPress={() => setChallanCopy(c)}
                    >
                      <Text style={[styles.modalTabText, challanCopy === c && styles.activeModalTabText]}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.slipContainer}>
                    <Text style={styles.slipSchoolName}>{selectedChallan.schoolName}</Text>
                    <Text style={styles.slipCopyTitle}>Fee Challan - {challanCopy.charAt(0).toUpperCase() + challanCopy.slice(1)} Copy</Text>
                    
                    <View style={styles.slipDivider} />
                    
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Challan No:</Text><Text style={styles.slipValue}>{selectedChallan.chalanNumber}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Date:</Text><Text style={styles.slipValue}>{new Date(selectedChallan.chalanDate).toLocaleDateString('en-GB')}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Student:</Text><Text style={styles.slipValue}>{selectedChallan.studentName}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Class/Sec:</Text><Text style={styles.slipValue}>{selectedChallan.className} - {selectedChallan.section}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Installment:</Text><Text style={styles.slipValue}>{selectedChallan.installmentName}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Due Date:</Text><Text style={styles.slipValue}>{new Date(selectedChallan.dueDate).toLocaleDateString('en-GB')}</Text></View>
                    
                    <View style={[styles.slipDivider, { marginTop: 16 }]} />
                    
                    <View style={styles.slipRow}>
                      <Text style={[styles.slipLabel, { fontSize: 16, color: isDark ? '#E5E7EB' : '#111827' }]}>Total Amount:</Text>
                      <Text style={[styles.slipValue, { fontSize: 16, color: isDark ? '#E5E7EB' : '#111827' }]}>Rs. {selectedChallan.amount}</Text>
                    </View>

                    {selectedChallan.bankDetails && (
                      <View style={styles.slipBankBox}>
                        <Text style={styles.slipBankTitle}>Bank Details</Text>
                        <Text style={styles.slipBankText}>{selectedChallan.bankDetails.bankName} - A/C: {selectedChallan.bankDetails.accountNumber}</Text>
                        <Text style={styles.slipBankText}>IFSC: {selectedChallan.bankDetails.ifscCode}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.shareButton} onPress={() => processChallanPDF('share')} disabled={pdfActionState !== null}>
                    {pdfActionState === 'share' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={20} color="#FFF" />
                        <Text style={styles.shareButtonText}>Share / Download PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* RECEIPT MODAL */}
      <Modal visible={isReceiptModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receipt Details</Text>
              <TouchableOpacity onPress={() => setIsReceiptModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#4B5563'} />
              </TouchableOpacity>
            </View>

            {selectedReceipt && (
              <View style={{ flex: 1 }}>
                <View style={styles.modalTabContainer}>
                  {(['student', 'admin'] as ReceiptCopyType[]).map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.modalTab, receiptCopy === c && styles.activeModalTab]}
                      onPress={() => setReceiptCopy(c)}
                    >
                      <Text style={[styles.modalTabText, receiptCopy === c && styles.activeModalTabText]}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.slipContainer}>
                    <Text style={styles.slipSchoolName}>{selectedReceipt.schoolName}</Text>
                    <Text style={styles.slipCopyTitle}>Payment Receipt - {receiptCopy.charAt(0).toUpperCase() + receiptCopy.slice(1)} Copy</Text>
                    
                    <View style={styles.slipDivider} />
                    
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Receipt No:</Text><Text style={styles.slipValue}>{selectedReceipt.receiptNumber}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Date:</Text><Text style={styles.slipValue}>{new Date(selectedReceipt.paymentDate).toLocaleDateString('en-GB')}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Student:</Text><Text style={styles.slipValue}>{selectedReceipt.studentName}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Class/Sec:</Text><Text style={styles.slipValue}>{selectedReceipt.className} - {selectedReceipt.section}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Installment:</Text><Text style={styles.slipValue}>{selectedReceipt.installmentName}</Text></View>
                    <View style={styles.slipRow}><Text style={styles.slipLabel}>Mode:</Text><Text style={styles.slipValue}>{selectedReceipt.paymentMethod} {selectedReceipt.paymentReference ? `(${selectedReceipt.paymentReference})` : ''}</Text></View>
                    
                    <View style={[styles.slipDivider, { marginTop: 16 }]} />
                    
                    <View style={styles.slipRow}>
                      <Text style={[styles.slipLabel, { fontSize: 16, color: isDark ? '#E5E7EB' : '#111827' }]}>Paid Amount:</Text>
                      <Text style={[styles.slipValue, { fontSize: 16, color: '#10B981' }]}>Rs. {selectedReceipt.amount}</Text>
                    </View>
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.shareButton} onPress={() => processReceiptPDF('share')} disabled={pdfActionState !== null}>
                    {pdfActionState === 'share' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={20} color="#FFF" />
                        <Text style={styles.shareButtonText}>Share / Download PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#F9FAFB' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' },
    tabContainer: { flexDirection: 'row', backgroundColor: isDark ? '#111827' : '#FFFFFF', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#3B82F6' },
    tabText: { fontSize: 14, fontWeight: '600', color: isDark ? '#6B7280' : '#9CA3AF' },
    activeTabText: { color: '#3B82F6' },
    scrollView: { flex: 1 },
    tabContent: { padding: 16, gap: 16 },
    
    // Overview Styles
    overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: isDark ? '#1F2937' : '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB' },
    academicYearText: { fontSize: 12, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 2 },
    structureNameText: { fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusBadgeText: { fontSize: 12, fontWeight: '700' },
    
    progressCard: { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressLabel: { fontSize: 12, fontWeight: '600', color: isDark ? '#D1D5DB' : '#374151' },
    progressBarTrack: { flex: 1, height: 8, backgroundColor: isDark ? '#374151' : '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 4 },
    progressPercent: { fontSize: 12, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280', width: 36, textAlign: 'right' },
    
    metricsContainer: { flexDirection: 'row', gap: 12 },
    metricCard: { flex: 1, backgroundColor: isDark ? '#1F2937' : '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', alignItems: 'center' },
    metricIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    metricLabel: { fontSize: 12, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 4 },
    metricValue: { fontSize: 16, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' },
    
    bankCard: { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1E40AF' : '#DBEAFE' },
    bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    bankIcon: { backgroundColor: isDark ? '#1E40AF' : '#FFFFFF', padding: 6, borderRadius: 8 },
    bankTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#BFDBFE' : '#1E3A8A' },
    bankInstruction: { fontSize: 12, color: isDark ? '#93C5FD' : '#3B82F6', marginBottom: 12, lineHeight: 18 },
    bankDetailsGrid: { gap: 6 },
    bankDetailItem: { flexDirection: 'row' },
    bankDetailLabel: { fontSize: 12, fontWeight: '600', color: isDark ? '#93C5FD' : '#1E40AF', width: 90 },
    bankDetailValue: { fontSize: 12, color: isDark ? '#BFDBFE' : '#1E3A8A', flex: 1 },

    // Installment Styles
    sectionHeader: { fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginVertical: 16, paddingHorizontal: 4 },
    installmentCard: { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', padding: 16, marginBottom: 12 },
    installmentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    installmentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    calendarIconBox: { backgroundColor: isDark ? '#374151' : '#F3F4F6', padding: 8, borderRadius: 10 },
    installmentName: { fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' },
    installmentDate: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 },
    statusBadgeSm: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    statusBadgeTextSm: { fontSize: 10, fontWeight: '700' },
    installmentAmountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: isDark ? '#111827' : '#F9FAFB', padding: 12, borderRadius: 12 },
    amountLabel: { fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 2 },
    amountValue: { fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: isDark ? '#374151' : '#DBEAFE', backgroundColor: isDark ? '#1F2937' : '#EFF6FF', paddingVertical: 10, borderRadius: 12 },
    actionButtonText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
    lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
    lockedText: { fontSize: 12, fontWeight: '500', color: isDark ? '#6B7280' : '#9CA3AF' },

    // Receipt Styles
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    emptyStateText: { marginTop: 12, fontSize: 14, color: isDark ? '#6B7280' : '#9CA3AF' },
    receiptCard: { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', padding: 16, marginBottom: 12 },
    receiptHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    receiptNumber: { fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' },
    receiptInstallment: { fontSize: 12, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 },
    receiptDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    receiptLabel: { fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 2 },
    receiptValue: { fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#374151' },
    receiptAmount: { fontSize: 16, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' },
    closeButton: { padding: 4, backgroundColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 20 },
    modalTabContainer: { flexDirection: 'row', padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#E5E7EB' },
    modalTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: isDark ? '#111827' : '#F3F4F6' },
    activeModalTab: { backgroundColor: isDark ? '#3B82F6' : '#DBEAFE' },
    modalTabText: { fontSize: 13, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' },
    activeModalTabText: { color: isDark ? '#FFFFFF' : '#1E40AF' },
    modalScroll: { flex: 1, padding: 20 },
    modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB' },
    shareButton: { flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
    shareButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    
    // Slip inner styles
    slipContainer: { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20 },
    slipSchoolName: { fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', textAlign: 'center' },
    slipCopyTitle: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', marginTop: 4 },
    slipDivider: { height: 1, backgroundColor: isDark ? '#374151' : '#E5E7EB', marginVertical: 16 },
    slipRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    slipLabel: { fontSize: 13, fontWeight: '600', color: isDark ? '#9CA3AF' : '#4B5563', flex: 1 },
    slipValue: { fontSize: 13, fontWeight: '700', color: isDark ? '#D1D5DB' : '#1F2937', flex: 1, textAlign: 'right' },
    slipBankBox: { marginTop: 16, backgroundColor: isDark ? '#1F2937' : '#F3F4F6', padding: 12, borderRadius: 8 },
    slipBankTitle: { fontSize: 12, fontWeight: '700', color: isDark ? '#9CA3AF' : '#4B5563', marginBottom: 4 },
    slipBankText: { fontSize: 12, color: isDark ? '#D1D5DB' : '#374151', marginBottom: 2 },
    retryButton: { marginTop: 24, backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
  });
}
