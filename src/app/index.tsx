import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Alert, 
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatPhoneNumber, getPhoneOperatorName } from '../utils/phone';

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'id' | 'secret' | null>(null);

  // Live detection of Tanzanian mobile operator
  const detectedOperator = getPhoneOperatorName(identifier);
  const isPhoneInput = Boolean(detectedOperator || /^(\+?255|0)[67]/.test(identifier.replace(/\s+/g, '')));

  const handleIdentifierChange = (val: string) => {
    if (/^\+?\d[\d\s-]*$/.test(val)) {
      setIdentifier(formatPhoneNumber(val));
    } else {
      setIdentifier(val);
    }
  };

  const handleLogin = async () => {
    const cleanId = identifier.trim();
    const cleanSecret = secret.trim();

    if (!cleanId || !cleanSecret) {
      Alert.alert('Missing Credentials', 'Please enter your phone number and PIN.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanId, cleanSecret);
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Invalid credentials or server unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Theme Colors for Input Surfaces
  const inputBg = theme.isDark ? '#0F172A' : '#F8FAFC';
  const defaultBorder = theme.isDark ? '#27354A' : '#CBD5E1';
  const activeBorder = theme.primary;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Web Autofill and CSS Input Reset */}
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              input:-webkit-autofill,
              input:-webkit-autofill:hover, 
              input:-webkit-autofill:focus,
              input:-webkit-autofill:active {
                -webkit-text-fill-color: ${theme.text} !important;
                -webkit-box-shadow: 0 0 0px 1000px ${inputBg} inset !important;
                transition: background-color 5000s ease-in-out 0s;
              }
              input {
                background-color: transparent !important;
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
                color: ${theme.text} !important;
              }
            `
          }}
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Branding */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <Ionicons name="storefront" size={38} color={theme.primary} />
          </View>
          <Text style={[styles.appTitle, { color: theme.text }]}>Apex POS & Retail</Text>
          <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>Enterprise Point of Sale & Inventory Platform</Text>
        </View>

        {/* Single Unified Login Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Sign In to Continue</Text>
          <Text style={[styles.formDesc, { color: theme.textSecondary }]}>
            Enter your credentials to access your store
          </Text>

          {/* Field 1: Phone Number */}
          <View style={styles.labelRow}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Phone Number
            </Text>
            {detectedOperator && (
              <Text style={[styles.operatorBadge, { color: theme.primary }]}>
                {detectedOperator}
              </Text>
            )}
          </View>
          <View 
            style={[
              styles.inputContainer, 
              { 
                backgroundColor: inputBg, 
                borderColor: focusedField === 'id' ? activeBorder : defaultBorder,
                borderWidth: focusedField === 'id' ? 1.5 : 1
              }
            ]}
          >
            {isPhoneInput ? (
              <Text style={styles.flagIcon}>🇹🇿</Text>
            ) : (
              <Ionicons name="call-outline" size={18} color={focusedField === 'id' ? theme.primary : theme.textMuted} style={styles.inputIcon} />
            )}
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="0712 345 678"
              placeholderTextColor={theme.textMuted}
              value={identifier}
              onChangeText={handleIdentifierChange}
              onFocus={() => setFocusedField('id')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={isPhoneInput ? 'phone-pad' : 'default'}
              returnKeyType="next"
            />
            {identifier.length > 0 && (
              <TouchableOpacity onPress={() => setIdentifier('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Field 2: PIN */}
          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
            PIN
          </Text>
          <View 
            style={[
              styles.inputContainer, 
              { 
                backgroundColor: inputBg, 
                borderColor: focusedField === 'secret' ? activeBorder : defaultBorder,
                borderWidth: focusedField === 'secret' ? 1.5 : 1
              }
            ]}
          >
            <Ionicons 
              name="keypad-outline" 
              size={18} 
              color={focusedField === 'secret' ? theme.primary : theme.textMuted} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="••••"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showSecret}
              value={secret}
              onChangeText={setSecret}
              onFocus={() => setFocusedField('secret')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              keyboardType={isPhoneInput ? 'number-pad' : 'default'}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={() => setShowSecret(!showSecret)} style={styles.eyeBtn}>
              <Ionicons name={showSecret ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.loginBtn, { backgroundColor: theme.primary }, loading && styles.btnDisabled]} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnInner}>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  appSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center'
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4
  },
  formDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  operatorBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    overflow: 'hidden'
  },
  flagIcon: {
    fontSize: 18,
    marginRight: 10
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 0
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4
  },
  clearBtn: {
    padding: 6,
    marginLeft: 4
  },
  loginBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  }
});
