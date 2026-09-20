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
  ScrollView,
  Image,
  TouchableWithoutFeedback,
  Keyboard
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

  const handleIdentifierChange = (val: string) => {
    // Only allow digits, +, spaces, and hyphens for phone number
    const sanitized = val.replace(/[^\d+\s-]/g, '');
    setIdentifier(formatPhoneNumber(sanitized));
  };

  const handleSecretChange = (val: string) => {
    // Strictly numeric PIN, max 6 digits
    const numeric = val.replace(/\D/g, '').slice(0, 6);
    setSecret(numeric);
  };

  const handleLogin = async () => {
    const cleanPhone = identifier.trim();
    const cleanPin = secret.trim();

    if (!cleanPhone) {
      Alert.alert('Missing Phone Number', 'Please enter your registered phone number.');
      return;
    }

    if (!cleanPin || cleanPin.length !== 6) {
      Alert.alert('Invalid PIN', 'Please enter your 6-digit numeric PIN.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanPhone, cleanPin);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message || 'Invalid credentials or server unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Theme Colors for Input Surfaces
  const inputBg = theme.isDark ? '#0F172A' : '#F8FAFC';
  const defaultBorder = theme.isDark ? '#334155' : '#CBD5E1';
  const activeBorder = theme.primary;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Top Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Image 
              source={require('../../assets/images/jmsolutions.png')} 
              style={styles.logoImage} 
              resizeMode="cover" 
            />
          </View>
          <Text style={[styles.appTitle, { color: theme.text }]}>JM Solution POS</Text>
          <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>Retail and POS</Text>
        </View>

        {/* Single Unified Login Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Sign In to Continue</Text>
          <Text style={[styles.formDesc, { color: theme.textSecondary }]}>
            Enter your phone number and 6-digit PIN to access your store
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
            <Text style={styles.flagIcon}>🇹🇿</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="0712 100 001"
              placeholderTextColor={theme.textMuted}
              value={identifier}
              onChangeText={handleIdentifierChange}
              onFocus={() => setFocusedField('id')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="phone-pad"
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
              placeholder="••••••"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showSecret}
              value={secret}
              onChangeText={handleSecretChange}
              onFocus={() => setFocusedField('secret')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              keyboardType="number-pad"
              maxLength={6}
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
      </TouchableWithoutFeedback>
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
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    transform: [{ scale: 1.05 }]
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.3
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
