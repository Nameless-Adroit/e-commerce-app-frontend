import React, { useState, useEffect } from 'react';
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
  Keyboard,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatPhoneNumber, getPhoneOperatorName } from '../utils/phone';
import { platformApi, authApi } from '../services/api';
import { PlatformConfig, SubscriptionPlan, PaymentMethodConfig } from '../types';

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();

  // Role Decision Gate: 'seller' | 'owner'
  const [roleTab, setRoleTab] = useState<'seller' | 'owner'>('seller');

  // Business Owner sub-mode: 'signin' | 'register'
  const [ownerMode, setOwnerMode] = useState<'signin' | 'register'>('signin');

  // Sign In credentials state
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'id' | 'pin' | null>(null);

  // Platform Config (Plans, Payment Methods, Terms, Instructions)
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Registration Multi-Step Wizard State
  const [regStep, setRegStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [ownerPinConfirm, setOwnerPinConfirm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regSuccessModalVisible, setRegSuccessModalVisible] = useState(false);
  const [regSuccessInfo, setRegSuccessInfo] = useState<{ businessName: string; instructions?: string } | null>(null);

  // Live detection of Tanzanian mobile operator for login & registration
  const detectedOperator = getPhoneOperatorName(identifier);
  const regPhoneOperator = getPhoneOperatorName(ownerPhone);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoadingConfig(true);
        const res = await platformApi.getConfig();
        if (res.data) {
          setConfig(res.data);
          const methods = res.data.payment_methods || (res.data as any).paymentMethods || [];
          if (methods.length > 0) {
            setSelectedPaymentMethod(methods[0].provider_name || methods[0].name || '');
          }
        }
      } catch (err) {
        console.warn('Could not pre-load platform config:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  const handleIdentifierChange = (val: string) => {
    const sanitized = val.replace(/[^\d+\s-]/g, '');
    setIdentifier(formatPhoneNumber(sanitized));
  };

  const handlePinChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 6);
    setPin(numeric);
  };

  const handleLogin = async () => {
    const cleanPhone = identifier.trim();
    const cleanPin = pin.trim();

    if (!cleanPhone || !cleanPin || cleanPin.length !== 6) {
      Alert.alert('Authentication Failed', 'INVALID CREDENTIALS');
      return;
    }

    setLoading(true);
    try {
      await login(cleanPhone, cleanPin);
    } catch (err: any) {
      console.error('[MOBILE_AUTH_LOG]', {
        message: err.message,
        status: err.status,
        code: err.code
      });

      const isNetworkOrServer =
        err.status >= 500 ||
        err.status === 408 ||
        err.status === 429 ||
        (err.message && (
          err.message.toLowerCase().includes('network') ||
          err.message.toLowerCase().includes('server') ||
          err.message.toLowerCase().includes('timed out') ||
          err.message.toLowerCase().includes('cannot execute') ||
          err.message.toLowerCase().includes('failed to fetch')
        ));

      Alert.alert(
        'Authentication Notice',
        isNetworkOrServer ? 'CANNOT EXECUTE NOW TRY LATER' : 'INVALID CREDENTIALS'
      );
    } finally {
      setLoading(false);
    }
  };

  // Multi-Step Registration Wizard Handlers (4 Steps, Zero Payment Required)
  const handleNextStep = () => {
    if (regStep === 1) {
      if (!businessName.trim()) {
        Alert.alert('Missing Business Name', 'Please enter your business or company name.');
        return;
      }
      setRegStep(2);
    } else if (regStep === 2) {
      if (!ownerFullName.trim() || !ownerPhone.trim() || !ownerPin.trim()) {
        Alert.alert('Missing Fields', 'Please fill in your full name, phone number, and 6-digit PIN.');
        return;
      }
      if (!/^\d{6}$/.test(ownerPin.trim())) {
        Alert.alert('Invalid PIN', 'Your PIN must be exactly 6 numeric digits.');
        return;
      }
      if (ownerPin !== ownerPinConfirm) {
        Alert.alert('PIN Mismatch', 'The 6-digit PIN and confirmation PIN do not match.');
        return;
      }
      setRegStep(3);
    } else if (regStep === 3) {
      handleRegisterSubmit();
    }
  };

  const handlePrevStep = () => {
    if (regStep > 1) {
      setRegStep(regStep - 1);
    } else {
      setOwnerMode('signin');
    }
  };

  const handleRegisterSubmit = async () => {
    if (!termsAccepted) {
      Alert.alert('Terms & Conditions', 'You must review and accept the Platform Terms and Conditions to proceed.');
      return;
    }

    setRegistering(true);
    try {
      const res = await authApi.registerBusiness({
        business_name: businessName.trim(),
        currency_code: 'TZS',
        currency_symbol: 'TSh',
        currency_name: 'Tanzanian Shilling',
        admin_name: ownerFullName.trim(),
        phone_number: ownerPhone.trim(),
        email: ownerEmail.trim() || undefined,
        pin: ownerPin.trim(),
        terms_accepted: true
      });

      setRegSuccessInfo({
        businessName: businessName.trim(),
        instructions: res.message || 'Your account has been activated with a 90-day Free Starter Trial!'
      });
      // Pre-fill phone number and PIN so the user can immediately sign in!
      setIdentifier(ownerPhone.trim());
      setPin(ownerPin.trim());
      setRegSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not register business.');
    } finally {
      setRegistering(false);
    }
  };

  const resetRegistration = () => {
    setRegSuccessModalVisible(false);
    setOwnerMode('signin');
    setRoleTab('owner');
    setRegStep(1);
    setBusinessName('');
    setOwnerFullName('');
    setOwnerEmail('');
    setOwnerPinConfirm('');
    setTermsAccepted(false);
  };

  const inputBg = theme.isDark ? '#0F172A' : '#F8FAFC';
  const defaultBorder = theme.isDark ? '#334155' : '#CBD5E1';
  const activeBorder = theme.primary;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Web Autofill CSS Reset */}
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
            <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>Retail & Counter Management</Text>
          </View>

          {/* Role Decision Gate Tabs */}
          <View style={[styles.roleTabContainer, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <TouchableOpacity
              style={[
                styles.roleTabBtn,
                roleTab === 'seller' && [styles.roleTabBtnActive, { backgroundColor: theme.primary }]
              ]}
              onPress={() => {
                setRoleTab('seller');
                setOwnerMode('signin');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cart-outline"
                size={17}
                color={roleTab === 'seller' ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.roleTabText,
                  { color: roleTab === 'seller' ? '#ffffff' : theme.textSecondary }
                ]}
              >
                Seller / Cashier
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleTabBtn,
                roleTab === 'owner' && [styles.roleTabBtnActive, { backgroundColor: theme.primary }]
              ]}
              onPress={() => setRoleTab('owner')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="business-outline"
                size={17}
                color={roleTab === 'owner' ? '#ffffff' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.roleTabText,
                  { color: roleTab === 'owner' ? '#ffffff' : theme.textSecondary }
                ]}
              >
                Business Owner
              </Text>
            </TouchableOpacity>
          </View>

          {/* PATH A: SELLER / CASHIER */}
          {roleTab === 'seller' && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              {/* Explanatory Callout */}
              <View style={[styles.roleNotice, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: '#3b82f6' }]}>
                <Ionicons name="information-circle-outline" size={20} color="#2563eb" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={[styles.roleNoticeText, { color: theme.textSecondary }]}>
                  Seller / Cashier accounts are provisioned and managed directly by your Business Owner. Please obtain your login credentials from your store manager.
                </Text>
              </View>

              <Text style={[styles.formTitle, { color: theme.text, marginTop: 12 }]}>Cashier Counter Sign In</Text>
              <Text style={[styles.formDesc, { color: theme.textSecondary }]}>
                Enter your registered phone number and 6-digit PIN
              </Text>

              {/* Phone Number */}
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                {detectedOperator && (
                  <Text style={[styles.operatorBadge, { color: theme.primary }]}>{detectedOperator}</Text>
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
                  keyboardType="phone-pad"
                />
              </View>

              {/* 6-Digit PIN (Masked with bullets, no eye button) */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                6-Digit Security PIN
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: inputBg,
                    borderColor: focusedField === 'pin' ? activeBorder : defaultBorder,
                    borderWidth: focusedField === 'pin' ? 1.5 : 1
                  }
                ]}
              >
                <Ionicons
                  name="keypad-outline"
                  size={18}
                  color={focusedField === 'pin' ? theme.primary : theme.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="••••••"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={true}
                  value={pin}
                  onChangeText={handlePinChange}
                  onFocus={() => setFocusedField('pin')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="number-pad"
                  maxLength={6}
                  onSubmitEditing={handleLogin}
                />
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
                    <Text style={styles.loginBtnText}>Sign In as Cashier</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* PATH B: BUSINESS OWNER (Sign In OR Multi-Step Register) */}
          {roleTab === 'owner' && ownerMode === 'signin' && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <Text style={[styles.formTitle, { color: theme.text }]}>Business Owner Sign In</Text>
              <Text style={[styles.formDesc, { color: theme.textSecondary }]}>
                Access administrative reports, inventory, branches, and billing
              </Text>

              {/* Phone Number */}
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                {detectedOperator && (
                  <Text style={[styles.operatorBadge, { color: theme.primary }]}>{detectedOperator}</Text>
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
                  keyboardType="phone-pad"
                />
              </View>

              {/* 6-Digit PIN (Masked with bullets, no eye button) */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                6-Digit Security PIN
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: inputBg,
                    borderColor: focusedField === 'pin' ? activeBorder : defaultBorder,
                    borderWidth: focusedField === 'pin' ? 1.5 : 1
                  }
                ]}
              >
                <Ionicons
                  name="keypad-outline"
                  size={18}
                  color={focusedField === 'pin' ? theme.primary : theme.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="••••••"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={true}
                  value={pin}
                  onChangeText={handlePinChange}
                  onFocus={() => setFocusedField('pin')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="number-pad"
                  maxLength={6}
                  onSubmitEditing={handleLogin}
                />
              </View>

              {/* Sign In Button */}
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
                    <Text style={styles.loginBtnText}>Sign In as Owner</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Register New Business Option */}
              <View style={[styles.registerDivider, { borderTopColor: theme.surfaceBorder }]}>
                <Text style={[styles.newBizPrompt, { color: theme.textSecondary }]}>
                  New store or retail business?
                </Text>
                <TouchableOpacity
                  style={[styles.registerBtn, { borderColor: theme.primary }]}
                  onPress={() => {
                    setOwnerMode('register');
                    setRegStep(1);
                  }}
                >
                  <Ionicons name="business-outline" size={17} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.registerBtnText, { color: theme.primary }]}>Register New Business</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PATH B: BUSINESS OWNER -> MULTI-STEP ONBOARDING WIZARD */}
          {roleTab === 'owner' && ownerMode === 'register' && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              {/* Wizard Header & Steps Progress */}
              <View style={styles.wizardHeader}>
                <TouchableOpacity onPress={handlePrevStep} style={styles.wizardBackBtn}>
                  <Ionicons name="arrow-back" size={20} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.wizardTitleCol}>
                  <Text style={[styles.wizardStepBadge, { color: theme.primary }]}>STEP {regStep} OF 3</Text>
                  <Text style={[styles.wizardStepName, { color: theme.text }]}>
                    {regStep === 1 && 'Business Profile'}
                    {regStep === 2 && 'Owner Account'}
                    {regStep === 3 && 'Trial & Terms Activation'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.wizardProgressTrack}>
                <View
                  style={[
                    styles.wizardProgressFill,
                    { width: `${(regStep / 3) * 100}%`, backgroundColor: theme.primary }
                  ]}
                />
              </View>

              {/* STEP 1: Business Details */}
              {regStep === 1 && (
                <View style={styles.stepContainer}>
                  <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                    Enter your commercial enterprise or shop brand name
                  </Text>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Business Name *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: inputBg, borderColor: defaultBorder, color: theme.text }]}
                    placeholder="e.g. Safari Supermarket"
                    placeholderTextColor={theme.textMuted}
                    value={businessName}
                    onChangeText={setBusinessName}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                    Operating Currency
                  </Text>
                  <View style={[styles.currencyBox, { backgroundColor: inputBg, borderColor: defaultBorder }]}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>🇹🇿</Text>
                    <Text style={[styles.currencyBoxText, { color: theme.text }]}>
                      TZS — Tanzanian Shilling (TSh)
                    </Text>
                  </View>
                </View>
              )}

              {/* STEP 2: Owner Account */}
              {regStep === 2 && (
                <View style={styles.stepContainer}>
                  <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                    Create the primary administrator account for this business
                  </Text>

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Your Full Name *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: inputBg, borderColor: defaultBorder, color: theme.text }]}
                    placeholder="e.g. Kassim Majaliwa"
                    placeholderTextColor={theme.textMuted}
                    value={ownerFullName}
                    onChangeText={setOwnerFullName}
                  />

                  <View style={[styles.labelRow, { marginTop: 14 }]}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Phone Number (Login ID) *</Text>
                    {regPhoneOperator && (
                      <Text style={[styles.operatorBadge, { color: theme.primary }]}>{regPhoneOperator}</Text>
                    )}
                  </View>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: inputBg, borderColor: defaultBorder, color: theme.text }]}
                    placeholder="0712 123 456"
                    placeholderTextColor={theme.textMuted}
                    value={ownerPhone}
                    onChangeText={(val) => setOwnerPhone(formatPhoneNumber(val.replace(/[^\d+\s-]/g, '')))}
                    keyboardType="phone-pad"
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                    Email Address (Optional)
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: inputBg, borderColor: defaultBorder, color: theme.text }]}
                    placeholder="owner@example.com"
                    placeholderTextColor={theme.textMuted}
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                    6-Digit Security PIN *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: inputBg, borderColor: defaultBorder, color: theme.text }]}
                    placeholder="••••••"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={true}
                    value={ownerPin}
                    onChangeText={(val) => setOwnerPin(val.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                    Confirm 6-Digit PIN *
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: inputBg, borderColor: defaultBorder, color: theme.text }]}
                    placeholder="••••••"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={true}
                    value={ownerPinConfirm}
                    onChangeText={(val) => setOwnerPinConfirm(val.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              )}

              {/* STEP 3: 90 Days Free Starter Trial & Platform Terms */}
              {regStep === 3 && (
                <View style={styles.stepContainer}>
                  {/* 90-Day Free Trial Promotional Card */}
                  <View style={[styles.trialNoticeBox, { backgroundColor: 'rgba(22, 163, 74, 0.08)', borderColor: '#16a34a' }]}>
                    <View style={styles.trialNoticeHeader}>
                      <Ionicons name="gift-outline" size={24} color="#16a34a" style={{ marginRight: 8 }} />
                      <Text style={[styles.trialNoticeTitle, { color: '#16a34a' }]}>
                        90 Days Free Starter Plan Included
                      </Text>
                    </View>
                    <Text style={[styles.trialNoticeDesc, { color: theme.textSecondary }]}>
                      Every new business gets 90 full days of the Starter Plan completely free! Zero payment required today.
                    </Text>
                    <View style={styles.trialBadgeRow}>
                      <View style={styles.trialPill}>
                        <Ionicons name="storefront-outline" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                        <Text style={styles.trialPillText}>1 Shop Branch</Text>
                      </View>
                      <View style={styles.trialPill}>
                        <Ionicons name="person-outline" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                        <Text style={styles.trialPillText}>1 Cashier / Seller</Text>
                      </View>
                      <View style={styles.trialPill}>
                        <Ionicons name="calendar-outline" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                        <Text style={styles.trialPillText}>90 Days Free</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.stepDesc, { color: theme.textSecondary, marginTop: 14 }]}>
                    Please review and accept our platform service terms to activate your 90-day free trial:
                  </Text>

                  <ScrollView
                    style={[styles.termsScrollBox, { backgroundColor: inputBg, borderColor: defaultBorder }]}
                    nestedScrollEnabled
                  >
                    <Text style={[styles.termsContent, { color: theme.textSecondary }]}>
                      {config?.settings.terms_and_conditions ||
                        'By using JM Solution POS platform, you are granted a 90-day free trial on the Starter Plan (1 shop, 1 seller). You are responsible for preserving user credentials and recording genuine transactions.'}
                    </Text>
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setTermsAccepted(!termsAccepted)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={termsAccepted ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={termsAccepted ? theme.primary : theme.textMuted}
                    />
                    <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                      I have read and agree to the Terms & Conditions and Privacy Policy
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Wizard Navigation Buttons */}
              <View style={styles.wizardNavRow}>
                {regStep < 3 ? (
                  <TouchableOpacity
                    style={[styles.wizardNextBtn, { backgroundColor: theme.primary }]}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.wizardNextBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={17} color="#fff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.wizardNextBtn, { backgroundColor: '#16a34a' }]}
                    onPress={handleRegisterSubmit}
                    disabled={registering}
                  >
                    {registering ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.wizardNextBtnText}>Activate 90-Day Trial & Register</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Registration Submitted Confirmation Modal */}
      <Modal visible={regSuccessModalVisible} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={36} color="#16a34a" />
            </View>
            <Text style={[styles.successTitle, { color: theme.text }]}>90-Day Free Trial Active!</Text>
            <Text style={[styles.successDesc, { color: theme.textSecondary }]}>
              Your business '{regSuccessInfo?.businessName}' has been created with 90 days of the Starter Plan (1 Shop, 1 Cashier).
            </Text>
            <Text style={[styles.successDesc, { color: theme.textMuted, marginTop: 8 }]}>
              Your account is active immediately. You can now sign in using your registered phone number and 6-digit PIN.
            </Text>

            <TouchableOpacity style={[styles.successDoneBtn, { backgroundColor: theme.primary }]} onPress={resetRegistration}>
              <Text style={styles.successDoneBtnText}>Sign In Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 20
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  logoImage: {
    width: 76,
    height: 76
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  appSubtitle: {
    fontSize: 13,
    marginTop: 2
  },
  roleTabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16
  },
  roleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9
  },
  roleTabBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '700'
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2
  },
  roleNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10
  },
  roleNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  formDesc: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  operatorBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 12
  },
  flagIcon: {
    fontSize: 18,
    marginRight: 8
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%'
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 6
  },
  loginBtn: {
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22
  },
  btnDisabled: {
    opacity: 0.65
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8
  },
  registerDivider: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    alignItems: 'center'
  },
  newBizPrompt: {
    fontSize: 13,
    marginBottom: 10
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  registerBtnText: {
    fontSize: 13,
    fontWeight: '700'
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  wizardBackBtn: {
    padding: 6,
    marginRight: 8
  },
  wizardTitleCol: {
    flex: 1
  },
  wizardStepBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  wizardStepName: {
    fontSize: 17,
    fontWeight: '700'
  },
  wizardProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 18,
    overflow: 'hidden'
  },
  wizardProgressFill: {
    height: '100%',
    borderRadius: 2
  },
  stepContainer: {
    marginBottom: 14
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  currencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 6
  },
  currencyBoxText: {
    fontSize: 14,
    fontWeight: '600'
  },
  planCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  planCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8
  },
  planCardPrice: {
    fontSize: 14,
    fontWeight: '800'
  },
  planCardMeta: {
    fontSize: 12,
    marginTop: 6
  },
  planCardDesc: {
    fontSize: 11,
    marginTop: 2
  },
  termsScrollBox: {
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14
  },
  termsContent: {
    fontSize: 12.5,
    lineHeight: 18
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  checkboxLabel: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18
  },
  channelOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 6
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  channelAccount: {
    fontSize: 12,
    marginTop: 2
  },
  channelNotes: {
    fontSize: 11,
    marginTop: 2
  },
  trialNoticeBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10
  },
  trialNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  trialNoticeTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  trialNoticeDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10
  },
  trialBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  trialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  trialPillText: {
    color: '#15803d',
    fontSize: 11.5,
    fontWeight: '700'
  },
  wizardNavRow: {
    marginTop: 10
  },
  wizardNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10
  },
  wizardNextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  successModalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center'
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8
  },
  successDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  successDoneBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10
  },
  successDoneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});
