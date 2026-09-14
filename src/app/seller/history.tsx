import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { ReceiptModal } from '../../components/ReceiptModal';
import { posApi } from '../../services/api';
import { theme } from '../../theme/colors';
import { Transaction } from '../../types';

export default function SellerHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadTransactions = async () => {
    try {
      const res = await posApi.getTransactions({ limit: 50 });
      if (res.data?.transactions) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleOpenReceipt = async (txn: Transaction) => {
    try {
      const res = await posApi.getTransactionDetails(txn.id);
      if (res.data) {
        setSelectedTxn(res.data);
      } else {
        setSelectedTxn(txn);
      }
    } catch {
      setSelectedTxn(txn);
    }
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Header title="Transaction Journal" subtitle="Completed Counter Sales" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTransactions(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>No sales transactions recorded yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => handleOpenReceipt(item)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.idBox}>
                  <Ionicons name="receipt" size={18} color={theme.primary} />
                  <Text style={styles.txnId}>{item.id}</Text>
                </View>
                <Text style={styles.amountText}>${Number(item.total_amount).toFixed(2)}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.sellerText}>Seller: {item.seller_name || 'Staff'}</Text>
                <Text style={styles.payBadge}>{item.payment_method?.toUpperCase()}</Text>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.dateText}>{new Date(item.transaction_date).toLocaleString()}</Text>
                <Text style={styles.itemsCount}>{item.item_count ? `${item.item_count} items` : 'View Receipt →'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <ReceiptModal 
        visible={modalVisible}
        transaction={selectedTxn}
        onClose={() => setModalVisible(false)}
      />
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
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 10
  },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  idBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  txnId: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  amountText: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '800'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sellerText: {
    color: theme.textSecondary,
    fontSize: 12
  },
  payBadge: {
    color: theme.secondary,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.surfaceLight,
    paddingTop: 8,
    marginTop: 4
  },
  dateText: {
    color: theme.textMuted,
    fontSize: 11
  },
  itemsCount: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '600'
  }
});
