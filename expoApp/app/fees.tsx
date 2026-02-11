import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStudentFees, FeeRecord } from '@/src/services/student';

export default function FeesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [fees, setFees] = useState<FeeRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await getStudentFees();
      setFees(data);
    };
    load();
  }, []);

  const statTile = (label: string, value?: string | number, color = '#3B82F6') => (
    <View style={[styles.statTile, { borderColor: color }] }>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value !== undefined && value !== null ? String(value) : '-'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Fees</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statsRow}>
            {statTile('Total', fees?.totalFees, '#1E40AF')}
            {statTile('Paid', fees?.paidAmount, '#047857')}
            {statTile('Pending', fees?.pendingAmount, '#B91C1C')}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{fees?.status || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{fees?.dueDate ? new Date(fees.dueDate).toDateString() : '-'}</Text>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 16 }] }>
          <Text style={styles.sectionTitle}>Payments</Text>
          {fees?.payments && fees.payments.length > 0 ? (
            fees.payments.map((p, idx) => (
              <View key={idx} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentAmount}>₹ {p.amount}</Text>
                  <Text style={styles.paymentMeta}>{new Date(p.paymentDate).toDateString()} • {p.paymentMode}</Text>
                </View>
                <Text style={styles.receipt}>#{p.receiptNumber}</Text>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 12 }}>
              <Text style={styles.infoLabel}>No payments yet</Text>
            </View>
          )}
        </View>
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
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statTile: { flex: 1, borderWidth: 2, borderRadius: 12, padding: 12, alignItems: 'center' },
    statLabel: { fontSize: 12, fontWeight: '600' },
    statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    infoLabel: { fontSize: 14, color: isDark ? '#9CA3AF' : '#475569' },
    infoValue: { fontSize: 14, fontWeight: '600', color: isDark ? '#E5E7EB' : '#1F2937' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937', marginBottom: 8 },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#93C5FD' },
    paymentAmount: { fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937' },
    paymentMeta: { fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 },
    receipt: { fontSize: 12, color: isDark ? '#93C5FD' : '#1E3A8A' },
  });
}


