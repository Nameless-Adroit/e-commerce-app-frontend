import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { analyticsApi } from '../../services/api';
import { useTheme, useStyles } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppTheme } from '../../theme/colors';
import { ProductSoldReportItem, ProductsSoldReportResponse } from '../../types';
import { formatCurrency } from '../../utils/currency';

type TimeFilter = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

export default function AdminAnalytics() {
  const { theme } = useTheme();
  const { activeShop, currencySymbol } = useAuth();
  const styles = useStyles(createStyles);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('THIS_MONTH');
  const [reportData, setReportData] = useState<ProductsSoldReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const computeDateRange = (filter: TimeFilter): { startDate?: string; endDate?: string } => {
    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const endDate = formatDate(today);

    if (filter === 'TODAY') {
      return { startDate: endDate, endDate };
    }

    if (filter === 'THIS_WEEK') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { startDate: formatDate(start), endDate };
    }

    if (filter === 'THIS_MONTH') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatDate(start), endDate };
    }

    // ALL_TIME
    return {};
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = computeDateRange(timeFilter);
      const res = await analyticsApi.getProductsSoldReport({
        startDate,
        endDate,
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined
      });

      if (res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Error loading products sold report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [timeFilter, selectedCategory, activeShop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  const products = reportData?.products || [];
  const summary = reportData?.summary || {
    distinct_products_sold: 0,
    total_units_sold: 0,
    total_revenue: 0
  };

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category || 'General')))];

  const filteredProducts = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.product_id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Products Sold Report"
        subtitle="Tabular summary of product volume, turnover & movement"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Time Period Filter Tabs */}
        <View style={styles.timeTabsRow}>
          {(
            [
              { key: 'TODAY', label: 'Today' },
              { key: 'THIS_WEEK', label: 'This Week' },
              { key: 'THIS_MONTH', label: 'This Month' },
              { key: 'ALL_TIME', label: 'All Time' }
            ] as const
          ).map((tab) => {
            const isActive = timeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.timeTab, isActive && styles.timeTabActive]}
                onPress={() => setTimeFilter(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeTabText, isActive && styles.timeTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* High Level KPI Metrics Banner */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconBox}>
              <Ionicons name="cube-outline" size={18} color={theme.primary} />
            </View>
            <Text style={styles.kpiVal}>{summary.total_units_sold.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Total Units Sold</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
              <Ionicons name="wallet-outline" size={18} color="#059669" />
            </View>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>
              {formatCurrency(summary.total_revenue, currencySymbol)}
            </Text>
            <Text style={styles.kpiLabel}>Total Revenue</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(217, 119, 6, 0.1)' }]}>
              <Ionicons name="pricetags-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.kpiVal}>{summary.distinct_products_sold}</Text>
            <Text style={styles.kpiLabel}>Distinct Items</Text>
          </View>
        </View>

        {/* Search and Filters Bar */}
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search product name or ID..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={loadReport}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter Chips */}
        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Tabular Sales Report Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <View style={styles.tableHeaderTitleRow}>
              <Ionicons name="grid-outline" size={18} color={theme.primary} />
              <Text style={styles.tableTitle}>Sales Movement Ledger</Text>
            </View>
            <Text style={styles.tableCountBadge}>
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Compiling tabular report...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyTableBox}>
              <Ionicons name="bar-chart-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyTableTitle}>No Product Sales Recorded</Text>
              <Text style={styles.emptyTableSub}>
                No completed transactions match the selected period and filters.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.tableContainer}>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, styles.colProduct]}>Product & Code</Text>
                  <Text style={[styles.thText, styles.colCategory]}>Category</Text>
                  <Text style={[styles.thText, styles.colStock]}>Stock</Text>
                  <Text style={[styles.thText, styles.colQty]}>Units Sold</Text>
                  <Text style={[styles.thText, styles.colRevenue]}>Total Revenue</Text>
                  <Text style={[styles.thText, styles.colAvgPrice]}>Avg Selling Price</Text>
                </View>

                {/* Table Data Rows */}
                {filteredProducts.map((item, idx) => {
                  const isEven = idx % 2 === 0;
                  const itemSymbol = item.currency_symbol || currencySymbol;

                  return (
                    <View key={item.product_id} style={[styles.tableRow, isEven && styles.tableRowEven]}>
                      {/* Product Name & ID */}
                      <View style={styles.colProduct}>
                        <Text style={styles.productNameText} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.productIdText}>{item.product_id}</Text>
                      </View>

                      {/* Category */}
                      <View style={styles.colCategory}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText} numberOfLines={1}>
                            {item.category || 'General'}
                          </Text>
                        </View>
                      </View>

                      {/* Current Stock */}
                      <View style={styles.colStock}>
                        <Text
                          style={[
                            styles.stockText,
                            item.current_stock <= 5 && { color: theme.danger, fontWeight: '700' }
                          ]}
                        >
                          {item.current_stock}
                        </Text>
                      </View>

                      {/* Quantity Sold */}
                      <View style={styles.colQty}>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyBadgeText}>{item.total_quantity_sold}</Text>
                        </View>
                      </View>

                      {/* Total Sales Volume / Revenue */}
                      <View style={styles.colRevenue}>
                        <Text style={styles.revenueText}>
                          {formatCurrency(item.total_revenue, itemSymbol)}
                        </Text>
                      </View>

                      {/* Average Selling Price */}
                      <View style={styles.colAvgPrice}>
                        <Text style={styles.avgPriceText}>
                          {formatCurrency(item.average_selling_price, itemSymbol)}
                        </Text>
                        {item.catalog_price !== item.average_selling_price && (
                          <Text style={styles.catalogRefText}>
                            (Cat: {formatCurrency(item.catalog_price, itemSymbol)})
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Table Footer Summary Row */}
                <View style={styles.tableFooterRow}>
                  <Text style={[styles.tfText, styles.colProduct]}>Total Summary</Text>
                  <Text style={[styles.tfText, styles.colCategory]}>—</Text>
                  <Text style={[styles.tfText, styles.colStock]}>—</Text>
                  <Text style={[styles.tfText, styles.colQty]}>{summary.total_units_sold}</Text>
                  <Text style={[styles.tfText, styles.colRevenue, { color: '#059669' }]}>
                    {formatCurrency(summary.total_revenue, currencySymbol)}
                  </Text>
                  <Text style={[styles.tfText, styles.colAvgPrice]}>—</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  timeTabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    marginBottom: 14,
    ...theme.shadow
  },
  timeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  timeTabActive: {
    backgroundColor: theme.primary,
    ...theme.shadow
  },
  timeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  timeTabTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    alignItems: 'center',
    ...theme.shadow
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  kpiVal: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center'
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textSecondary,
    marginTop: 2,
    textAlign: 'center'
  },
  filterBar: {
    marginBottom: 10
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    paddingHorizontal: 12,
    height: 42,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.text
  },
  categoryScroll: {
    gap: 8,
    marginBottom: 14
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder
  },
  categoryChipActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderColor: theme.primary
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  categoryChipTextActive: {
    color: theme.primary,
    fontWeight: '700'
  },
  tableCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    overflow: 'hidden',
    ...theme.shadow
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder
  },
  tableHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text
  },
  tableCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.textSecondary
  },
  emptyTableBox: {
    padding: 40,
    alignItems: 'center'
  },
  emptyTableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginTop: 12
  },
  emptyTableSub: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280
  },
  tableContainer: {
    minWidth: 700
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceBorder
  },
  tableRowEven: {
    backgroundColor: 'rgba(248, 250, 252, 0.5)'
  },
  tableFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 2,
    borderTopColor: theme.surfaceBorder
  },
  tfText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.text
  },
  // Column Widths
  colProduct: {
    width: 200,
    paddingRight: 10
  },
  colCategory: {
    width: 110,
    paddingRight: 10
  },
  colStock: {
    width: 70,
    alignItems: 'center'
  },
  colQty: {
    width: 90,
    alignItems: 'center'
  },
  colRevenue: {
    width: 120,
    alignItems: 'flex-end',
    paddingRight: 10
  },
  colAvgPrice: {
    width: 120,
    alignItems: 'flex-end'
  },
  productNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  productIdText: {
    fontSize: 10,
    color: theme.textMuted,
    fontFamily: 'monospace',
    marginTop: 2
  },
  categoryPill: {
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary
  },
  stockText: {
    fontSize: 13,
    color: theme.textSecondary
  },
  qtyBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  qtyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.primary
  },
  revenueText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  avgPriceText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary
  },
  catalogRefText: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 2
  }
});
