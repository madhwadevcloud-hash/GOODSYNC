import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { getSchoolInfo, SchoolInfo } from '@/src/services/student';

export default function SchoolScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSchoolInfo();
        setSchool(data);
      } catch (error) {
        console.error('Error loading school info:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatAddress = (addr: any) => {
    if (!addr) return '-';
    if (typeof addr === 'string') return addr;
    const parts = [
      addr.street,
      addr.area,
      addr.city,
      addr.district,
      addr.taluka,
      addr.state,
      addr.country,
      addr.zipCode || addr.pinCode
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const formatContact = (contact: any) => {
    if (!contact) return '-';
    if (typeof contact === 'string') return contact;
    const parts = [];
    if (contact.phone) parts.push(`Phone: ${contact.phone}`);
    if (contact.email) parts.push(`Email: ${contact.email}`);
    if (contact.mobile) parts.push(`Mobile: ${contact.mobile}`);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const infoRow = (label: string, value?: string | number) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ? String(value) : '-'}</Text>
    </View>
  );

  const infoSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!school) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.loadingText}>School information not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const address = school.address || {};
  const contact = school.contact || {};
  const bankDetails = school.bankDetails || {};
  const secondaryContact = school.secondaryContact || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My School</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.schoolHeader}>
            <Text style={styles.schoolName}>{school.name || school.schoolName || 'School'}</Text>
            <Text style={styles.addressText}>{formatAddress(address)}</Text>
          </View>

          <View style={styles.divider} />

          {infoSection('Basic Information', (
            <>
              {infoRow('School Code', school.code || school.schoolCode)}
              {infoRow('School Type', school.schoolType)}
              {infoRow('Established Year', school.establishedYear)}
              {infoRow('Affiliation Board', school.affiliationBoard || school.affiliation)}
              {infoRow('Status', school.isActive ? 'Active' : 'Inactive')}
            </>
          ))}

          {infoSection('Contact Information', (
            <>
              {infoRow('Primary Phone', school.mobile || contact.phone || contact.mobile)}
              {infoRow('Secondary Phone', secondaryContact.phone || secondaryContact.mobile)}
              {infoRow('Email', contact.email || school.email)}
              {infoRow('Website', school.website)}
            </>
          ))}

          {infoSection('Principal Information', (
            <>
              {infoRow('Principal Name', school.principalName)}
              {infoRow('Principal Email', school.principalEmail)}
            </>
          ))}

          {infoSection('Address Details', (
            <>
              {typeof address === 'object' && (
                <>
                  {infoRow('Street', address.street)}
                  {infoRow('Area', address.area)}
                  {infoRow('City', address.city)}
                  {infoRow('District', address.district)}
                  {infoRow('Taluka', address.taluka)}
                  {infoRow('State', address.state)}
                  {infoRow('Country', address.country)}
                  {infoRow('Pincode', address.zipCode || address.pinCode)}
                </>
              )}
            </>
          ))}

          {bankDetails && Object.keys(bankDetails).length > 0 && infoSection('Bank Details', (
            <>
              {infoRow('Bank Name', bankDetails.bankName)}
              {infoRow('Account Number', bankDetails.accountNumber || bankDetails.accountNo)}
              {infoRow('IFSC Code', bankDetails.ifscCode || bankDetails.ifsc)}
              {infoRow('Branch', bankDetails.branch)}
            </>
          ))}

          {infoSection('Other Information', (
            <>
              {infoRow('Created At', formatDate(school.createdAt))}
              {infoRow('Last Updated', formatDate(school.updatedAt))}
            </>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' },
    scrollView: { flex: 1 },
    header: { padding: 20, paddingTop: 10 },
    headerTitle: { fontSize: 24, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', textAlign: 'center' },
    card: { marginHorizontal: 20, backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: isDark ? '#1F2937' : '#93C5FD' },
    schoolHeader: { alignItems: 'center', marginBottom: 16 },
    schoolName: { fontSize: 20, fontWeight: '800', color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 4 },
    addressText: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center', marginTop: 2 },
    divider: { height: 1, backgroundColor: isDark ? '#1F2937' : '#E5E7EB', marginVertical: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#93C5FD' : '#1E3A8A', marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' },
    infoLabel: { fontSize: 14, color: isDark ? '#9CA3AF' : '#475569', flex: 1 },
    infoValue: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937', flex: 1, textAlign: 'right' },
    loadingText: { fontSize: 16, color: isDark ? '#93C5FD' : '#1E3A8A' },
  });
}
