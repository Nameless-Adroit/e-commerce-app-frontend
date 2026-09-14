import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { analyticsApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { DailyReport } from '../../types';

export default function AdminAnalytics() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = async () => {
    try {
      const res = await analyticsApi.getDailyReport();
      if (res.data && !('global_summary' in res.data)) {
        setReport(res.data as DailyReport);
      }
    } catch (err) {
      console.error('Error fetching daily report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleTriggerDailyClose = async () => {
    setCompiling(true);
    try {
      await analyticsApi.triggerDailyClose();
      const reportRes = await analyticsApi.getDailyReport();
      Alert.alert('Daily Close Compiled', 'End-of-day transaction figures, revenue, profit, and shrinkage audit updated successfully.');
      if (reportRes.data && !('global_summary' in reportRes.data)) {
        setReport(reportRes.data as DailyReport);
      }
    } catch (err: any) {
      Alert.alert('Compilation Failed', err.message || 'Error compiling daily close');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Daily Close & Analytics" subtitle="Revenue, Profit & Shrinkage (SRS 3.4)" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReport(); }} tintColor={theme.primary} />}
        >
          {/* Daily Close Action Header Banner */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerTitle}>Close of Business Day</Text>
              <Text style={styles.bannerDesc}>
                Snapshot sales data, calculate net profit, and record inventory shrinkage for {report?.report_date || 'today'}.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.compileBtn, compiling && { opacity: 0.7 }]}
              onPress={handleTriggerDailyClose}
              disabled={compiling}
            >
              {compiling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="calculator-outline" size={18} color="#fff" />
                  <Text style={styles.compileBtnText}>Compile Close</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Core Analytics Cards */}
          <Text style={styles.sectionTitle}>Daily Financial Audit</Text>
          <View style={styles.grid}>
            <View style={[styles.statBox, { borderColor: theme.accent }]}>
              <Ionicons name="cash" size={24} color={theme.accent} />
              <Text style={styles.boxLabel}>Gross Revenue</Text>
              <Text style={[styles.boxValue, { color: theme.accent }]}>
                ${Number(report?.revenue_generated || 0).toFixed(2)}
              </Text>
              <Text style={styles.boxSub}>From customer checkouts</Text>
            </View>

            {(() => {
              const profit = Number(report?.net_profit || 0);
              const isNeg = profit < 0;
              const formattedProfit = `${isNeg ? '-' : ''}$${Math.abs(profit).toFixed(2)}`;
              return (
                <View style={[styles.statBox, { borderColor: isNeg ? theme.danger : theme.secondary }]}>
                  <Ionicons name={isNeg ? 'trending-down' : 'trending-up'} size={24} color={isNeg ? theme.danger : theme.secondary} />
                  <Text style={styles.boxLabel}>{isNeg ? 'Net Loss' : 'Net Profit'}</Text>
                  <Text style={[styles.boxValue, { color: isNeg ? theme.danger : theme.secondary }]}>
                    {formattedProfit}
                  </Text>
                  <Text style={styles.boxSub}>Cost: ${Number(report?.total_cost || 0).toFixed(2)}</Text>
                </View>
              );
            })()}

            <View style={[styles.statBox, { borderColor: theme.primary }]}>
              <Ionicons name="cart" size={24} color={theme.primary} />
              <Text style={styles.boxLabel}>Total Units Sold</Text>
              <Text style={styles.boxValue}>{report?.total_units_sold || 0}</Text>
              <Text style={styles.boxSub}>{report?.total_transactions || 0} Transactions</Text>
            </View>

            <View style={[styles.statBox, { borderColor: theme.danger }]}>
              <Ionicons name="alert-circle" size={24} color={theme.danger} />
              <Text style={styles.boxLabel}>Inventory Shrinkage</Text>
              <Text style={[styles.boxValue, { color: theme.danger }]}>
                {report?.shrinkage_count || 0} units
              </Text>
              <Text style={styles.boxSub}>Loss: ${Number(report?.shrinkage_cost || 0).toFixed(2)}</Text>
            </View>
          </View>

          {/* Details Breakdown */}
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Audit Summary Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Report Date</Text>
              <Text style={styles.detailVal}>{report?.report_date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed Transactions</Text>
              <Text style={styles.detailVal}>{report?.total_transactions} sales</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Wholesale Goods Cost</Text>
              <Text style={styles.detailVal}>${Number(report?.total_cost || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Damaged / Stolen Discrepancy Cost</Text>
              <Text style={[styles.detailVal, { color: theme.danger }]}>
                -${Number(report?.shrinkage_cost || 0).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.detailRow, styles.lastRow]}>
              <Text style={styles.finalLabel}>Net Operational Surplus</Text>
              {(() => {
                const surplus = Number(report?.net_profit || 0) - Number(report?.shrinkage_cost || 0);
                const isNeg = surplus < 0;
                return (
                  <Text style={[styles.finalVal, { color: isNeg ? theme.danger : theme.accent }]}>
                    {isNeg ? '-' : ''}${Math.abs(surplus).toFixed(2)}
                  </Text>
                );
              })()}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40
  },
  bannerCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  bannerTextCol: {
    marginBottom: 12
  },
  bannerTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700'
  },
  bannerDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16
  },
  compileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md
  },
  compileBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  boxLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 8
  },
  boxValue: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 4
  },
  boxSub: {
    color: theme.textMuted,
    fontSize: 11
  },
  detailCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  detailTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceLight
  },
  lastRow: {
    borderBottomWidth: 0,
    marginTop: 6,
    paddingTop: 12
  },
  detailLabel: {
    color: theme.textSecondary,
    fontSize: 13
  },
  detailVal: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600'
  },
  finalLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700'
  },
  finalVal: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '800'
  }
});
