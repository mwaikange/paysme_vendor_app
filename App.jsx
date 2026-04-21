import React, { useState, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';

// ─── Brand Tokens ────────────────────────────────────────────────────────────
const BRAND_BLUE       = '#2563EB';
const BRAND_BLUE_DARK  = '#1D4ED8';
const BRAND_DARK       = '#3C4043';
const BRAND_YELLOW     = '#F2B649';
const PAGE_BG          = '#F3F4F6';
const CARD_BG          = '#FFFFFF';
const TEXT_PRIMARY     = '#0F172A';
const TEXT_SECONDARY   = '#5B6B88';

// ─── Mock Data ───────────────────────────────────────────────────────────────
const invoiceDatabase = {
  '6511-3189-3736': { merchant: 'PaySME',        business: 'PaySME Inc',         amount: 500,  code: '6511-3189-3736', email: 'aqua@mwaikange.com',        mobile: '+264 81 808 3704', status: 'pending' },
  '1234-5678-9012': { merchant: 'Tech Solutions', business: 'TechSolutions Ltd',  amount: 1200, code: '1234-5678-9012', email: 'vendor@techsolutions.com',   mobile: '+264 81 234 5678', status: 'pending' },
  '9876-5432-1098': { merchant: 'Digital Store',  business: 'Digital Retail Corp', amount: 750, code: '9876-5432-1098', email: 'store@digital.com',          mobile: '+264 81 987 6543', status: 'pending' },
  '1111-2222-3333': { merchant: 'PaySME',        business: 'PaySME',             amount: 650,  code: '1111-2222-3333', email: 'client@paysme.com',          mobile: '+264 81 222 3333', status: 'pending' },
};

const vendorAccounts = {
  prepaid: {
    id: 'VND-2024-001', name: 'Maris Today',       type: 'prepaid',
    creditBalance: 5000, feeEarned: 0,   loanBalance: 0,    loanLastPaid: null, loanTotalPaid: 0, loanPaymentCount: 0,
    pin: '12345', email: 'vendor@techsolutions.com', phone: '+264 81 808 3704', password: 'password123',
  },
  loan: {
    id: 'LND-2024-002', name: 'Mwaikange Motinga',  type: 'loan',
    creditBalance: 4200, feeEarned: 980, loanBalance: 2750, loanLastPaid: '2024-01-10', loanTotalPaid: 2250, loanPaymentCount: 9,
    pin: '54321', email: 'loanvendor@paysme.com',    phone: '+264 81 555 2024',  password: 'loan123',
  },
};

const LOAN_MIN_INSTALLMENT = 250;

const initialHistory = [
  { id: 3, merchant: 'Merchant C', amount: 750,  status: 'completed', date: '2024-01-15', type: 'Fee Earned'    },
  { id: 2, merchant: 'Merchant B', amount: 1200, status: 'completed', date: '2024-01-14', type: 'Fee Earned'    },
  { id: 1, merchant: 'Merchant A', amount: 500,  status: 'completed', date: '2024-01-13', type: 'Top Up'        },
];

const HISTORY_TYPES = [
  'All',
  'Fee Payment (Loan)',
  'Withdrawal Payment (Loan)',
  'Installment Payment (Loan)',
  'Withdrawal Request',
  'Top Up',
  'Fee Earned',
  'Loan Credits',
];

const pageMeta = {
  process: { title: 'Process payment',    subtitle: 'Enter a PaySME code and complete the payment.',      icon: 'card-outline'          },
  history: { title: 'Transaction history',subtitle: 'Track vendor activity and recently processed payments.', icon: 'time-outline'       },
  topup:   { title: 'Credits and loan',   subtitle: 'Top up balance, manage fees, and monitor loan activity.', icon: 'wallet-outline'    },
  profile: { title: 'Profile settings',   subtitle: 'Update account details, password, and PIN.',          icon: 'person-circle-outline' },
};

const navItems = [
  { key: 'process', label: 'Process', icon: 'card-outline'          },
  { key: 'history', label: 'History', icon: 'time-outline'          },
  { key: 'topup',   label: 'Credits', icon: 'wallet-outline'        },
  { key: 'profile', label: 'Profile', icon: 'person-circle-outline' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt    = (n) => `N$${Number(n).toFixed(2)}`;
const today  = () => new Date().toISOString().split('T')[0];
const fmtToken = (v) => { const d = v.replace(/\D/g, '').slice(0, 12); const g = d.match(/.{1,4}/g); return g ? g.join('-') : ''; };

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [authState, setAuthState]           = useState('login');
  const [page, setPage]                     = useState('process');
  const [loginData, setLoginData]           = useState({ vendorId: '', password: '' });
  const [showLoginPw, setShowLoginPw]       = useState(false);
  const [vendor, setVendor]                 = useState(vendorAccounts.prepaid);
  const [history, setHistory]               = useState(initialHistory);
  const [historyFilter, setHistoryFilter]   = useState('All');
  const [showFilterDrop, setShowFilterDrop] = useState(false);

  // Header collapse
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const headerAnim = useRef(new Animated.Value(1)).current;

  const collapseHeader = useCallback(() => {
    setHeaderCollapsed(true);
    Animated.timing(headerAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  }, [headerAnim]);

  const expandHeader = useCallback(() => {
    setHeaderCollapsed(false);
    Animated.timing(headerAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  }, [headerAnim]);

  const headerHeight = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Process page
  const [invoiceToken,    setInvoiceToken]    = useState('');
  const [currentProcess,  setCurrentProcess]  = useState({ invoiceToken: '', merchant: '', business: '', amount: 0, email: '', mobile: '', code: '', status: 'idle' });
  const [showPayDetails,  setShowPayDetails]  = useState(false);
  const [showConfirmPay,  setShowConfirmPay]  = useState(false);
  const [showPinModal,    setShowPinModal]    = useState(false);
  const [pinInput,        setPinInput]        = useState('');
  const [pinError,        setPinError]        = useState('');

  // Credits page
  const [topupAmt,        setTopupAmt]        = useState('');
  const [showTopupConf,   setShowTopupConf]   = useState(false);
  const [withdrawAmt,     setWithdrawAmt]     = useState('');
  const [showWithdrawConf,setShowWithdrawConf]= useState(false);
  const [feePayAmt,       setFeePayAmt]       = useState('');
  const [installmentAmt,  setInstallmentAmt]  = useState('');
  const [showInstallConf, setShowInstallConf] = useState(false);

  // Profile page
  const [pwSettings,      setPwSettings]      = useState({ old: '', new: '', confirm: '' });
  const [pinSettings,     setPinSettings]     = useState({ old: '', new: '', confirm: '' });
  const [showOtp,         setShowOtp]         = useState(false);
  const [otpCode,         setOtpCode]         = useState('');
  const [profileMsg,      setProfileMsg]      = useState('');
  const [loanAppVisible,  setLoanAppVisible]  = useState(false);
  const [loanAppData,     setLoanAppData]     = useState({ idDocument: '', incomeProof: '' });

  const feeRate            = vendor.type === 'prepaid' ? 0.05 : 0.04;
  const isLoan             = vendor.type === 'loan';
  const hasActiveLoan      = isLoan && vendor.loanBalance > 0;
  const canApplyLoan       = vendor.type === 'prepaid' && vendor.creditBalance === 0;

  // ── history helpers ──────────────────────────────────────────────────────
  const addHistory = (entries) => {
    setHistory((prev) => [
      ...entries.map((e, i) => ({ id: prev.length + entries.length - i, date: today(), status: 'completed', ...e })),
      ...prev,
    ]);
  };

  // ── auth ─────────────────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!loginData.vendorId || !loginData.password) { Alert.alert('Login failed', 'Vendor ID and password are required.'); return; }
    const match = Object.values(vendorAccounts).find((a) => a.id === loginData.vendorId && a.password === loginData.password);
    if (match) {
      setVendor({ ...match });
      setAuthState('main');
      setPage('process');
      setLoginData({ vendorId: '', password: '' });
      resetProcess();
      return;
    }
    Alert.alert('Login failed', 'Invalid vendor credentials.');
  };

  const handleLogout = () => { setAuthState('login'); setPage('process'); resetProcess(); };
  const resetProcess = () => { setInvoiceToken(''); setCurrentProcess({ invoiceToken: '', merchant: '', business: '', amount: 0, email: '', mobile: '', code: '', status: 'idle' }); setShowPayDetails(false); };

  // ── process ──────────────────────────────────────────────────────────────
  const handleTokenLookup = (raw) => {
    const token = fmtToken(raw);
    setInvoiceToken(token);
    if (!token) { setCurrentProcess({ ...currentProcess, status: 'idle' }); setShowPayDetails(false); return; }
    const data = invoiceDatabase[token];
    if (data) {
      setCurrentProcess({ invoiceToken: token, merchant: data.merchant, business: data.business, amount: data.amount, email: data.email, mobile: data.mobile, code: data.code, status: 'pending' });
      setShowPayDetails(true);
    } else if (token.length === 14) {
      setCurrentProcess({ invoiceToken: token, merchant: 'Not found', business: '-', amount: 0, email: '-', mobile: '-', code: token, status: 'error' });
      setShowPayDetails(true);
    }
  };

  const openConfirm = () => {
    if (!currentProcess.invoiceToken || currentProcess.status !== 'pending') { Alert.alert('Invalid token', 'Enter a valid invoice token first.'); return; }
    if (currentProcess.amount > vendor.creditBalance) { Alert.alert('Insufficient credit', 'Not enough credit tokens.'); return; }
    setShowConfirmPay(true);
  };

  const finalizePayment = () => {
    if (pinInput !== vendor.pin) { setPinError('Invalid PIN. Try again.'); return; }
    const fee = currentProcess.amount * feeRate;
    setVendor((p) => ({ ...p, creditBalance: p.creditBalance - currentProcess.amount, feeEarned: p.feeEarned + fee }));
    addHistory([
      { merchant: currentProcess.merchant, amount: currentProcess.amount, type: 'Fee Earned',    code: currentProcess.code },
    ]);
    resetProcess();
    setShowConfirmPay(false);
    setShowPinModal(false);
    setPinInput(''); setPinError('');
    Alert.alert('Success', 'Payment processed successfully.');
  };

  // ── topup ────────────────────────────────────────────────────────────────
  const handleTopup = () => {
    const amt = Number(topupAmt);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount', 'Enter an amount greater than zero.'); return; }
    setShowTopupConf(true);
  };

  const confirmTopup = () => {
    const amt      = Number(topupAmt);
    const discount = vendor.type === 'prepaid' ? amt * 0.05 : 0;
    setVendor((p) => ({ ...p, creditBalance: p.creditBalance + amt }));
    addHistory([{ merchant: 'PaySME Top Up', amount: amt, type: 'Top Up' }]);
    setTopupAmt(''); setShowTopupConf(false);
    Alert.alert('Top-up completed', `Credited ${fmt(amt)} tokens${discount > 0 ? ` — saved ${fmt(discount)}` : ''}.`);
  };

  // ── installment ──────────────────────────────────────────────────────────
  const handleInstallment = () => {
    const amt = Number(installmentAmt);
    if (!amt || amt < LOAN_MIN_INSTALLMENT) { Alert.alert('Invalid amount', `Minimum installment is ${fmt(LOAN_MIN_INSTALLMENT)}.`); return; }
    if (amt > vendor.feeEarned && amt > vendor.creditBalance) { Alert.alert('Insufficient funds', 'Not enough balance.'); return; }
    setShowInstallConf(true);
  };

  const confirmInstallment = () => {
    const amt = Number(installmentAmt);
    setVendor((p) => ({
      ...p,
      loanBalance:      Math.max(0, p.loanBalance - amt),
      feeEarned:        Math.max(0, p.feeEarned - amt),
      loanLastPaid:     today(),
      loanTotalPaid:    p.loanTotalPaid + amt,
      loanPaymentCount: p.loanPaymentCount + 1,
    }));
    addHistory([{ merchant: 'Loan Installment', amount: amt, type: 'Installment Payment (Loan)' }]);
    setInstallmentAmt(''); setShowInstallConf(false);
    Alert.alert('Installment paid', `${fmt(amt)} applied to your loan.`);
  };

  // ── withdraw ─────────────────────────────────────────────────────────────
  const handleWithdraw = () => {
    const amt = Number(withdrawAmt);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount', 'Enter an amount.'); return; }
    if (amt > vendor.feeEarned) { Alert.alert('Insufficient fees', 'Cannot exceed earned fees.'); return; }
    setShowWithdrawConf(true);
  };

  const confirmWithdraw = () => {
    const amt    = Number(withdrawAmt);
    const payout = amt * 0.5;
    const repay  = amt * 0.5;
    setVendor((p) => ({
      ...p,
      feeEarned:    p.feeEarned - amt,
      loanBalance:  Math.max(0, p.loanBalance - repay),
      loanLastPaid: today(),
      loanTotalPaid:    p.loanTotalPaid + repay,
      loanPaymentCount: p.loanPaymentCount + 1,
    }));
    addHistory([
      { merchant: 'Withdrawal Request',      amount: payout, type: 'Withdrawal Request',          status: 'pending'   },
      { merchant: 'Withdrawal Loan Payment', amount: repay,  type: 'Withdrawal Payment (Loan)',   status: 'completed' },
    ]);
    setWithdrawAmt(''); setShowWithdrawConf(false);
    Alert.alert('Withdrawal submitted', `${fmt(payout)} payout pending. ${fmt(repay)} applied to loan.`);
  };

  // ── fee pay (pay with fees) ───────────────────────────────────────────────
  const handleFeePay = () => {
    const amt = Number(feePayAmt);
    if (!amt || amt <= 0) { Alert.alert('Invalid amount', 'Enter an amount.'); return; }
    if (amt > vendor.feeEarned) { Alert.alert('Insufficient fees', 'Cannot exceed earned fees.'); return; }
    if (vendor.loanBalance <= 0) { Alert.alert('No loan', 'No active loan balance.'); return; }
    setVendor((p) => ({
      ...p,
      feeEarned:    p.feeEarned - amt,
      loanBalance:  Math.max(0, p.loanBalance - amt),
      loanLastPaid: today(),
      loanTotalPaid:    p.loanTotalPaid + amt,
      loanPaymentCount: p.loanPaymentCount + 1,
    }));
    addHistory([{ merchant: 'Fee Loan Payment', amount: amt, type: 'Fee Payment (Loan)' }]);
    setFeePayAmt('');
    Alert.alert('Payment applied', `${fmt(amt)} deducted from fees and applied to loan.`);
  };

  // ── profile ──────────────────────────────────────────────────────────────
  const updatePassword = () => {
    if (pwSettings.old !== vendor.password) { setProfileMsg('Current password is incorrect.'); return; }
    if (pwSettings.new !== pwSettings.confirm) { setProfileMsg('New passwords do not match.'); return; }
    setVendor((p) => ({ ...p, password: pwSettings.new }));
    setPwSettings({ old: '', new: '', confirm: '' });
    setProfileMsg('Password updated successfully.');
    setTimeout(() => setProfileMsg(''), 3000);
  };

  const requestPinUpdate = () => {
    if (pinSettings.old !== vendor.pin) { setProfileMsg('Current PIN is incorrect.'); return; }
    if (pinSettings.new !== pinSettings.confirm) { setProfileMsg('New PINs do not match.'); return; }
    setShowOtp(true);
  };

  const confirmPinUpdate = () => {
    if (otpCode !== '123456') { setProfileMsg('Invalid OTP.'); return; }
    setVendor((p) => ({ ...p, pin: pinSettings.new }));
    setPinSettings({ old: '', new: '', confirm: '' });
    setOtpCode(''); setShowOtp(false);
    setProfileMsg('PIN updated successfully.');
    setTimeout(() => setProfileMsg(''), 3000);
  };

  const applyLoanVendor = () => {
    if (!loanAppData.idDocument || !loanAppData.incomeProof) { Alert.alert('Incomplete', 'Provide both documents.'); return; }
    const loanAmt = 5000;
    setVendor((p) => ({ ...p, type: 'loan', loanBalance: loanAmt, creditBalance: p.creditBalance + loanAmt, loanTotalPaid: 0, loanPaymentCount: 0, loanLastPaid: null }));
    addHistory([{ merchant: 'Loan Credit Approved', amount: loanAmt, type: 'Loan Credits' }]);
    setLoanAppVisible(false);
    setLoanAppData({ idDocument: '', incomeProof: '' });
    Alert.alert('Approved!', 'You are now a Loan Vendor with N$5000 credit tokens added.');
  };

  // ─── Input focus → collapse header ───────────────────────────────────────
  const onFocusInput = () => { if (!headerCollapsed) collapseHeader(); };
  const dismissKeyboard = () => { Keyboard.dismiss(); if (headerCollapsed) expandHeader(); };

  // ─── Filtered history ─────────────────────────────────────────────────────
  const filteredHistory = historyFilter === 'All' ? history : history.filter((h) => h.type === historyFilter);

  // ─── Page renderers ───────────────────────────────────────────────────────

  const renderProcess = () => (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View>
        <SectionCard>
          <View style={styles.cardHeaderRowInside}>
            <View style={styles.iconCircle}><MaterialIcons name="payment" size={20} color={BRAND_BLUE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Enter PaySME code</Text>
              <Text style={styles.sectionCopy}>Enter the invoice token to look up payment details.</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Invoice token</Text>
          <TextInput
            value={invoiceToken}
            onChangeText={handleTokenLookup}
            placeholder="6511-3189-3736"
            style={styles.input}
            autoCapitalize="characters"
            onFocus={onFocusInput}
          />

          <View style={styles.inlineStatsRow}>
            <InfoChip label="Vendor fee" value={`${Math.round(feeRate * 100)}%`} />
            <InfoChip label="Balance" value={fmt(vendor.creditBalance)} dark />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => {
            if (!currentProcess.invoiceToken || currentProcess.status !== 'pending') {
              Alert.alert('Invalid token', 'Enter a valid invoice token first.');
              return;
            }
            setShowPayDetails(true);
          }}>
            <Text style={styles.primaryButtonText}>Validate payment</Text>
          </TouchableOpacity>
        </SectionCard>

        {showPayDetails && currentProcess.invoiceToken ? (
          <SectionCard>
            <Text style={styles.sectionTitle}>Payment details</Text>
            <Text style={styles.sectionCopy}>
              {currentProcess.status === 'error' ? 'Invoice token not found.' : 'Review before confirming.'}
            </Text>
            <View style={[styles.detailPanel, currentProcess.status === 'error' && styles.detailPanelError]}>
              <View style={styles.detailPanelTopRow}>
                <View style={styles.iconChip}>
                  <Ionicons name="receipt-outline" size={16} color={BRAND_BLUE} />
                  <Text style={styles.iconChipText}>Invoice</Text>
                </View>
                <View style={[styles.statusBadge, currentProcess.status === 'error' ? styles.statusError : styles.statusPendingBadge]}>
                  <Text style={[styles.statusBadgeText, currentProcess.status === 'error' ? styles.statusErrorText : styles.statusPendingText]}>
                    {currentProcess.status === 'error' ? 'Not found' : 'Pending'}
                  </Text>
                </View>
              </View>
              <DetailRow label="Merchant"      value={currentProcess.merchant}  />
              <DetailRow label="Business"      value={currentProcess.business}  />
              <DetailRow label="Code"          value={currentProcess.code}      monospace />
              <DetailRow label="Amount"        value={currentProcess.status === 'error' ? 'N/A' : fmt(currentProcess.amount)} valueStyle={currentProcess.status !== 'error' ? styles.amountValue : undefined} />
              <DetailRow label="Client email"  value={currentProcess.email}     numberOfLines={1} />
              <DetailRow label="Client mobile" value={currentProcess.mobile}    />
            </View>

            {currentProcess.status !== 'error' && (
              <>
                <View style={styles.summaryStrip}>
                  <View style={styles.summaryStripItem}>
                    <Text style={styles.summaryStripLabel}>Fee earned</Text>
                    <Text style={styles.summaryStripValue}>{fmt(currentProcess.amount * feeRate)}</Text>
                  </View>
                  <View style={styles.summaryStripDivider} />
                  <View style={styles.summaryStripItem}>
                    <Text style={styles.summaryStripLabel}>Balance after</Text>
                    <Text style={styles.summaryStripValue}>{fmt(vendor.creditBalance - currentProcess.amount)}</Text>
                  </View>
                </View>
                {currentProcess.amount > vendor.creditBalance && (
                  <View style={styles.warningBox}>
                    <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                    <Text style={styles.warningText}>Insufficient credit balance.</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.darkButton, currentProcess.amount > vendor.creditBalance && styles.disabledButton]}
                  onPress={openConfirm}
                  disabled={currentProcess.amount > vendor.creditBalance}
                >
                  <Text style={styles.darkButtonText}>Confirm payment</Text>
                </TouchableOpacity>
              </>
            )}
          </SectionCard>
        ) : null}
      </View>
    </TouchableWithoutFeedback>
  );

  const renderHistory = () => {
    const totalFees      = history.filter((h) => h.type === 'Fee Earned').reduce((s, h) => s + h.amount, 0);
    const totalTx        = history.filter((h) => h.status === 'completed').length;

    return (
      <>
        {/* Metrics row – removed "Completed", Fees card is now wider */}
        <View style={styles.overviewRow}>
          <MiniMetric title="Transactions" value={`${history.length}`} style={{ marginRight: 10 }} />
          <MiniMetric title="Total Fees" value={fmt(totalFees)} flex={1.6} />
        </View>

        <SectionCard>
          {/* Title + filter dropdown */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <TouchableOpacity
              style={styles.filterDropBtn}
              onPress={() => setShowFilterDrop((p) => !p)}
            >
              <Text style={styles.filterDropBtnText} numberOfLines={1}>{historyFilter === 'All' ? 'All types' : historyFilter}</Text>
              <Ionicons name={showFilterDrop ? 'chevron-up' : 'chevron-down'} size={14} color={BRAND_BLUE} />
            </TouchableOpacity>
          </View>

          {showFilterDrop && (
            <View style={styles.filterDropMenu}>
              {HISTORY_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterDropItem, historyFilter === t && styles.filterDropItemActive]}
                  onPress={() => { setHistoryFilter(t); setShowFilterDrop(false); }}
                >
                  <Text style={[styles.filterDropItemText, historyFilter === t && styles.filterDropItemTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionCopy}>Your latest vendor transactions and current status.</Text>

          {filteredHistory.length === 0 && (
            <Text style={[styles.sectionCopy, { marginTop: 12 }]}>No transactions match this filter.</Text>
          )}

          {filteredHistory.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyMerchant}>{item.merchant}</Text>
                <Text style={styles.historyMeta}>{item.date}  ·  {item.type}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={[styles.historyAmount, item.amount >= 0 ? styles.positive : styles.negative]}>
                  {item.amount >= 0 ? '+' : ''}{fmt(Math.abs(item.amount))}
                </Text>
                <View style={[styles.historyStatusPill,
                  item.status === 'completed' || item.status === 'paid' ? styles.historyCompleted :
                  item.status === 'pending' ? styles.historyPending : styles.historyCompleted]}>
                  <Text style={[styles.historyStatusText,
                    item.status === 'completed' || item.status === 'paid' ? styles.historyCompletedText : styles.historyPendingText]}>
                    {item.status === 'pending' ? 'Pending' : item.status === 'paid' ? 'Paid Out' : 'Completed'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </SectionCard>
      </>
    );
  };

  const renderCredits = () => (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View>
        {/* ── Loan Statement + Installment (Loan vendors only) ── */}
        {isLoan && (
          <SectionCard>
            {/* Loan Statement */}
            <Text style={styles.sectionTitle}>Loan statement</Text>
            <View style={styles.loanStatPanel}>
              <View style={styles.loanStatRow}>
                <Text style={styles.loanStatLabel}>Current loan balance</Text>
                <Text style={[styles.loanStatValue, { color: '#B91C1C', fontSize: 22 }]}>{fmt(vendor.loanBalance)}</Text>
              </View>
              <View style={styles.loanStatRow}>
                <Text style={styles.loanStatLabel}>Last paid</Text>
                <Text style={styles.loanStatValue}>{vendor.loanLastPaid ? `${vendor.loanLastPaid}` : 'No payments yet'}</Text>
              </View>
              <View style={styles.loanStatRow}>
                <Text style={styles.loanStatLabel}>Total paid</Text>
                <Text style={styles.loanStatValue}>{fmt(vendor.loanTotalPaid)}</Text>
              </View>
              <View style={styles.loanStatRow}>
                <Text style={styles.loanStatLabel}>Total payments</Text>
                <Text style={styles.loanStatValue}>{vendor.loanPaymentCount}</Text>
              </View>
              <View style={[styles.loanStatRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 8, paddingTop: 12 }]}>
                <Text style={[styles.loanStatLabel, { fontWeight: '800', color: TEXT_PRIMARY }]}>Min. monthly installment</Text>
                <Text style={[styles.loanStatValue, { color: BRAND_BLUE, fontWeight: '900' }]}>{fmt(LOAN_MIN_INSTALLMENT)}</Text>
              </View>
            </View>

            {/* Pay Loan Installment */}
            <View style={styles.divider} />
            <Text style={styles.sectionSubTitle}>Pay loan installment</Text>
            <Text style={styles.sectionCopy}>Enter an amount (min {fmt(LOAN_MIN_INSTALLMENT)}) to pay directly off your loan.</Text>
            <TextInput
              value={installmentAmt}
              onChangeText={setInstallmentAmt}
              placeholder={`Minimum ${fmt(LOAN_MIN_INSTALLMENT)}`}
              style={styles.input}
              keyboardType="numeric"
              onFocus={onFocusInput}
            />
            {installmentAmt ? (
              <View style={styles.softPanel}>
                <DetailRow label="Installment amount" value={fmt(Number(installmentAmt) || 0)} />
                <DetailRow label="Loan balance after"  value={fmt(Math.max(0, vendor.loanBalance - (Number(installmentAmt) || 0)))} />
              </View>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleInstallment}>
              <Text style={styles.primaryButtonText}>Pay installment</Text>
            </TouchableOpacity>
          </SectionCard>
        )}

        {/* ── Earnings Snapshot ── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Earnings snapshot</Text>
          <View style={styles.earningsHero}>
            <Text style={styles.earningsLabel}>Total fees earned</Text>
            <Text style={styles.earningsValue}>{fmt(vendor.feeEarned)}</Text>
            <Text style={styles.earningsHint}>Commission rate: {Math.round(feeRate * 100)}%</Text>
          </View>

          {isLoan ? (
            <>
              {/* Withdraw fees */}
              <Text style={styles.sectionSubTitle}>Withdraw fees</Text>
              <TextInput
                value={withdrawAmt}
                onChangeText={setWithdrawAmt}
                placeholder="Withdrawal amount"
                style={styles.input}
                keyboardType="numeric"
                onFocus={onFocusInput}
              />
              {withdrawAmt ? (
                <View style={styles.softPanel}>
                  <DetailRow label="Cash payout (50%)"    value={fmt((Number(withdrawAmt) || 0) * 0.5)} />
                  <DetailRow label="Loan repayment (50%)" value={fmt((Number(withdrawAmt) || 0) * 0.5)} />
                </View>
              ) : null}
              <TouchableOpacity style={styles.secondaryButton} onPress={handleWithdraw}>
                <Text style={styles.secondaryButtonText}>Withdraw fees</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Pay with fees */}
              <Text style={styles.sectionSubTitle}>Pay with fees</Text>
              <Text style={styles.sectionCopy}>Full amount entered is deducted from your fee balance and applied to the loan.</Text>
              <TextInput
                value={feePayAmt}
                onChangeText={setFeePayAmt}
                placeholder="Amount to pay"
                style={styles.input}
                keyboardType="numeric"
                onFocus={onFocusInput}
              />
              <TouchableOpacity style={styles.darkButton} onPress={handleFeePay}>
                <Text style={styles.darkButtonText}>Pay with fees</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.prepaidFeeNote}>
              <Ionicons name="checkmark-circle" size={18} color="#14804A" />
              <Text style={styles.prepaidFeeNoteText}>Fees are built into your 5% prepaid discount on every top-up.</Text>
            </View>
          )}
        </SectionCard>

        {/* ── Top Up Credits (both vendor types) ── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Top up credits</Text>
          <Text style={styles.sectionCopy}>
            {vendor.type === 'prepaid'
              ? 'Prepaid vendors get a 5% discount — buy N$5000, pay N$4750.'
              : 'Add credit tokens to process more PaySME invoices.'}
          </Text>
          <TextInput
            value={topupAmt}
            onChangeText={setTopupAmt}
            placeholder="Enter top-up amount"
            style={styles.input}
            keyboardType="numeric"
            onFocus={onFocusInput}
          />
          {topupAmt ? (
            <View style={styles.softPanel}>
              <DetailRow label="Credits added"  value={fmt(Number(topupAmt) || 0)} />
              {vendor.type === 'prepaid' && (
                <>
                  <DetailRow label="Discount (5%)"  value={fmt((Number(topupAmt) || 0) * 0.05)} />
                  <DetailRow label="You pay"        value={fmt((Number(topupAmt) || 0) * 0.95)} />
                </>
              )}
            </View>
          ) : null}
          <TouchableOpacity style={styles.primaryButton} onPress={handleTopup}>
            <Text style={styles.primaryButtonText}>Top up credits</Text>
          </TouchableOpacity>
        </SectionCard>
      </View>
    </TouchableWithoutFeedback>
  );

  const renderProfile = () => (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View>
        <SectionCard>
          <Text style={styles.sectionTitle}>Vendor profile</Text>
          <View style={styles.detailPanel}>
            <DetailRow label="Vendor name"  value={vendor.name}                              numberOfLines={1} />
            <DetailRow label="Vendor ID"    value={vendor.id}                                />
            <DetailRow label="Email"        value={vendor.email}                             numberOfLines={1} />
            <DetailRow label="Phone"        value={vendor.phone}                             />
            <DetailRow label="Vendor type"  value={vendor.type === 'prepaid' ? 'Prepaid' : 'Loan'} />
            <DetailRow label="Credit balance" value={fmt(vendor.creditBalance)}              />
            {isLoan && <DetailRow label="Loan balance" value={fmt(vendor.loanBalance)} valueStyle={{ color: '#B91C1C' }} />}
            <DetailRow label="Fee balance"  value={fmt(vendor.feeEarned)}                   />
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Change password</Text>
          {['old','new','confirm'].map((k, i) => (
            <TextInput key={k} value={pwSettings[k]}
              onChangeText={(v) => setPwSettings((p) => ({ ...p, [k]: v }))}
              placeholder={['Current password','New password','Confirm new password'][i]}
              style={styles.input} secureTextEntry onFocus={onFocusInput} />
          ))}
          <TouchableOpacity style={styles.primaryButton} onPress={updatePassword}>
            <Text style={styles.primaryButtonText}>Update password</Text>
          </TouchableOpacity>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Update 5-digit PIN</Text>
          {['old','new','confirm'].map((k, i) => (
            <TextInput key={k} value={pinSettings[k]}
              onChangeText={(v) => setPinSettings((p) => ({ ...p, [k]: v }))}
              placeholder={['Current PIN','New PIN','Confirm new PIN'][i]}
              style={styles.input} secureTextEntry keyboardType="number-pad" maxLength={5} onFocus={onFocusInput} />
          ))}
          <TouchableOpacity style={styles.secondaryButton} onPress={requestPinUpdate}>
            <Text style={styles.secondaryButtonText}>Request OTP & update PIN</Text>
          </TouchableOpacity>
          {profileMsg ? <Text style={styles.profileMessage}>{profileMsg}</Text> : null}
        </SectionCard>

        {vendor.type === 'prepaid' && (
          <SectionCard>
            <Text style={styles.sectionTitle}>Apply for loan vendor</Text>
            <Text style={styles.sectionCopy}>
              {canApplyLoan
                ? 'Your prepaid credits are fully used. You can now apply for a loan.'
                : 'Spend all available prepaid credits before applying for a loan vendor account.'}
            </Text>
            <TouchableOpacity
              style={[styles.darkButton, !canApplyLoan && styles.disabledButton]}
              onPress={() => setLoanAppVisible(true)}
              disabled={!canApplyLoan}
            >
              <Text style={styles.darkButtonText}>Apply for loan vendor</Text>
            </TouchableOpacity>
          </SectionCard>
        )}

        <TouchableOpacity style={styles.logoutWideButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutWideText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  if (authState === 'login') {
    return (
      <SafeAreaView style={styles.loginSafeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.loginScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                {/* Decorative glow blobs */}
                <View style={styles.loginGlow1} />
                <View style={styles.loginGlow2} />

                <Image source={require('./assets/paysme-logo.png')} style={styles.brandLogo} resizeMode="contain" />
                <Text style={[styles.brandSubtitle, { textAlign: 'center' }]}>
                  Vendor portal for processing payments, managing credits, and tracking fees.
                </Text>

                {/* ── Login Card ── */}
                <View style={styles.loginCard}>
                  {/* Accent top bar */}
                  <View style={styles.loginCardAccent} />

                  <Text style={styles.loginTitle}>Vendor sign in</Text>
                  <Text style={styles.loginCopy}>Use your PaySME Vendor ID and password to continue.</Text>

                  {/* Vendor ID */}
                  <View style={styles.loginFieldWrap}>
                    <View style={styles.loginFieldIcon}>
                      <Ionicons name="person-outline" size={18} color={BRAND_BLUE} />
                    </View>
                    <TextInput
                      value={loginData.vendorId}
                      onChangeText={(v) => setLoginData((p) => ({ ...p, vendorId: v }))}
                      placeholder="VND-2024-001"
                      placeholderTextColor="#9CA3AF"
                      style={styles.loginInput}
                      autoCapitalize="characters"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Password */}
                  <View style={styles.loginFieldWrap}>
                    <View style={styles.loginFieldIcon}>
                      <Ionicons name="lock-closed-outline" size={18} color={BRAND_BLUE} />
                    </View>
                    <TextInput
                      value={loginData.password}
                      onChangeText={(v) => setLoginData((p) => ({ ...p, password: v }))}
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showLoginPw}
                      style={[styles.loginInput, { flex: 1 }]}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity onPress={() => setShowLoginPw((p) => !p)} style={{ paddingHorizontal: 12 }}>
                      <Ionicons name={showLoginPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={TEXT_SECONDARY} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                    <Text style={styles.loginBtnText}>Login</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>

                  {/* Demo credentials */}
                  <View style={styles.demoBox}>
                    <Text style={styles.demoLabel}>Demo accounts</Text>
                    <Text style={styles.demoText}>Prepaid → ID: VND-2024-001 · Pass: password123</Text>
                    <Text style={styles.demoText}>Loan    → ID: LND-2024-002 · Pass: loan123</Text>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── MAIN APP ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* ── Header (collapsible) ── */}
      <Animated.View style={[styles.headerShell, { opacity: headerAnim, maxHeight: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerIdentity}>
            <Text style={styles.vendorName} numberOfLines={1}>{vendor.name}</Text>
            <Text style={styles.vendorIdText}>{vendor.id}</Text>
          </View>
        </View>
        <View style={styles.headerBottomRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={pageMeta[page].icon} size={18} color="#FFFFFF" />
              <Text style={styles.pageTitle}>{pageMeta[page].title}</Text>
            </View>
            <Text style={styles.pageSubtitle} numberOfLines={2}>{pageMeta[page].subtitle}</Text>
          </View>
          <View style={styles.vendorTypePill}>
            <Text style={styles.vendorTypePillText}>{vendor.type === 'prepaid' ? 'Prepaid' : 'Loan vendor'}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Collapse / Expand toggle bar ── */}
      <TouchableOpacity
        style={styles.collapseBar}
        onPress={headerCollapsed ? expandHeader : collapseHeader}
      >
        <View style={styles.collapseCircle}>
          <Ionicons name={headerCollapsed ? 'chevron-forward' : 'chevron-back'} size={16} color={BRAND_BLUE} />
        </View>
        <Text style={styles.collapseBarText}>{headerCollapsed ? 'Show header' : 'Hide header'}</Text>
      </TouchableOpacity>

      {/* ── Page content ── */}
      <ScrollView
        contentContainerStyle={styles.pageScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {page === 'process' && renderProcess()}
        {page === 'history' && renderHistory()}
        {page === 'topup'   && renderCredits()}
        {page === 'profile' && renderProfile()}
      </ScrollView>

      {/* ── Bottom nav ── */}
      <View style={styles.bottomNav}>
        {navItems.map((item) => (
          <BottomTab key={item.key} icon={item.icon} label={item.label}
            selected={page === item.key} onPress={() => { setPage(item.key); if (headerCollapsed) expandHeader(); }} />
        ))}
      </View>

      {/* ── Confirm payment modal ── */}
      <Modal visible={showConfirmPay} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm payment</Text>
            <Text style={styles.modalCopy}>Review the details before continuing.</Text>
            <View style={styles.detailPanel}>
              <DetailRow label="Merchant"      value={currentProcess.merchant}  />
              <DetailRow label="Business"      value={currentProcess.business}  />
              <DetailRow label="Amount"        value={fmt(currentProcess.amount)} valueStyle={styles.amountValue} />
              <DetailRow label="Code"          value={currentProcess.code}      monospace />
              <DetailRow label="Client email"  value={currentProcess.email}     numberOfLines={1} />
              <DetailRow label="Client mobile" value={currentProcess.mobile}    />
              <DetailRow label="Status"        value="Pending"                  />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowConfirmPay(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, { marginLeft: 10 }]}
                onPress={() => { setShowConfirmPay(false); setShowPinModal(true); }}>
                <Text style={styles.darkButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── PIN modal ── */}
      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter your PIN</Text>
            <Text style={styles.modalCopy}>Authorize this transaction with your 5-digit PIN.</Text>
            <View style={styles.pinAmountBadge}>
              <Text style={styles.pinAmountLabel}>Authorizing payment</Text>
              <Text style={styles.pinAmountValue}>{fmt(currentProcess.amount)}</Text>
            </View>
            <TextInput value={pinInput} onChangeText={(v) => { setPinInput(v); setPinError(''); }}
              placeholder="• • • • •" secureTextEntry keyboardType="number-pad" maxLength={5}
              style={[styles.input, { textAlign: 'center', fontSize: 22, letterSpacing: 8 }]} />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
            <Text style={styles.modalHint}>Demo PIN: 12345</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]}
                onPress={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, { marginLeft: 10 }]} onPress={finalizePayment}>
                <Text style={styles.darkButtonText}>Authorize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Top-up confirm modal ── */}
      <Modal visible={showTopupConf} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm top-up</Text>
            <Text style={styles.modalCopy}>
              You will receive {fmt(Number(topupAmt) || 0)} credit tokens.
              {vendor.type === 'prepaid' ? ` You pay ${fmt((Number(topupAmt) || 0) * 0.95)} after 5% discount.` : ''}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowTopupConf(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, { marginLeft: 10 }]} onPress={confirmTopup}>
                <Text style={styles.darkButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Installment confirm modal ── */}
      <Modal visible={showInstallConf} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm installment</Text>
            <Text style={styles.modalCopy}>
              {fmt(Number(installmentAmt) || 0)} will be applied to your loan. New balance: {fmt(Math.max(0, vendor.loanBalance - (Number(installmentAmt) || 0)))}.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowInstallConf(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, { marginLeft: 10 }]} onPress={confirmInstallment}>
                <Text style={styles.darkButtonText}>Pay installment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Withdraw confirm modal ── */}
      <Modal visible={showWithdrawConf} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm withdrawal</Text>
            <Text style={styles.modalCopy}>
              {fmt((Number(withdrawAmt) || 0) * 0.5)} payout will be requested (Pending).{'\n'}
              {fmt((Number(withdrawAmt) || 0) * 0.5)} will immediately reduce your loan balance.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowWithdrawConf(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, { marginLeft: 10 }]} onPress={confirmWithdraw}>
                <Text style={styles.darkButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── OTP modal ── */}
      <Modal visible={showOtp} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>SMS OTP verification</Text>
            <Text style={styles.modalCopy}>Enter the OTP sent to {vendor.phone}.</Text>
            <TextInput value={otpCode} onChangeText={setOtpCode} placeholder="123456"
              style={styles.input} keyboardType="number-pad" maxLength={6} />
            <Text style={styles.modalHint}>Demo OTP: 123456</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowOtp(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, { marginLeft: 10 }]} onPress={confirmPinUpdate}>
                <Text style={styles.darkButtonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Loan application modal ── */}
      <Modal visible={loanAppVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Loan vendor application</Text>
            <Text style={styles.modalCopy}>Upload ID and proof of income to request loan vendor status. N$5000 will be credited on approval.</Text>
            <TextInput value={loanAppData.idDocument} onChangeText={(v) => setLoanAppData((p) => ({ ...p, idDocument: v }))}
              placeholder="ID document reference" style={styles.input} />
            <TextInput value={loanAppData.incomeProof} onChangeText={(v) => setLoanAppData((p) => ({ ...p, incomeProof: v }))}
              placeholder="Proof of income reference" style={styles.input} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setLoanAppVisible(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, { marginLeft: 10 }]} onPress={applyLoanVendor}>
                <Text style={styles.darkButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionCard  = ({ children }) => <View style={styles.sectionCard}>{children}</View>;
const InfoChip     = ({ label, value, dark }) => (
  <View style={[styles.infoChip, dark && styles.infoChipDark]}>
    <Text style={[styles.infoChipLabel, dark && styles.infoChipLabelDark]}>{label}</Text>
    <Text style={[styles.infoChipValue, dark && styles.infoChipValueDark]}>{value}</Text>
  </View>
);
const MiniMetric   = ({ title, value, flex }) => (
  <View style={[styles.metricCard, flex && { flex }]}><Text style={styles.metricLabel}>{title}</Text><Text style={styles.metricValue} numberOfLines={1}>{value}</Text></View>
);
const BottomTab    = ({ icon, label, selected, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.bottomTab}>
    <View style={[styles.bottomTabIcon, selected && styles.bottomTabIconSelected]}>
      <Ionicons name={icon} size={20} color={selected ? '#FFFFFF' : BRAND_BLUE} />
    </View>
    <Text style={[styles.bottomTabLabel, selected && styles.bottomTabLabelSelected]}>{label}</Text>
  </TouchableOpacity>
);
const DetailRow    = ({ label, value, monospace, valueStyle, numberOfLines }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text numberOfLines={numberOfLines} ellipsizeMode="tail"
      style={[styles.detailValue, monospace && styles.monoText, valueStyle, numberOfLines === 1 && styles.detailValueSingleLine]}>
      {value}
    </Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: BRAND_BLUE },
  loginSafeArea: { flex: 1, backgroundColor: BRAND_DARK },

  // Login
  loginScroll:   { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 32 },
  loginGlow1:    { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(242,182,73,0.14)' },
  loginGlow2:    { position: 'absolute', bottom: 60, left: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(37,99,235,0.18)' },
  brandLogo:     { width: '100%', height: 96, marginBottom: 10 },
  brandSubtitle: { color: '#D1D5DB', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24, paddingHorizontal: 8 },

  loginCard:       { backgroundColor: CARD_BG, borderRadius: 28, overflow: 'hidden', shadowColor: '#031D42', shadowOpacity: 0.22, shadowRadius: 28, elevation: 12 },
  loginCardAccent: { height: 5, backgroundColor: BRAND_BLUE, width: '100%' },
  loginTitle:      { color: TEXT_PRIMARY, fontSize: 24, fontWeight: '900', marginBottom: 4, paddingHorizontal: 22, paddingTop: 20 },
  loginCopy:       { color: TEXT_SECONDARY, fontSize: 13, lineHeight: 20, marginBottom: 20, paddingHorizontal: 22 },

  loginFieldWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  loginFieldIcon: { paddingHorizontal: 14, paddingVertical: 14 },
  loginInput:     { flex: 1, color: TEXT_PRIMARY, fontSize: 15, paddingVertical: 14, paddingRight: 14 },

  loginBtn:      { backgroundColor: BRAND_BLUE, borderRadius: 16, marginHorizontal: 16, marginTop: 4, marginBottom: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginBtnText:  { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  demoBox:   { backgroundColor: '#F8FAFC', marginHorizontal: 16, marginBottom: 20, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  demoLabel: { color: BRAND_BLUE_DARK, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  demoText:  { color: TEXT_SECONDARY, fontSize: 12, lineHeight: 20 },

  // Header
  headerShell:     { backgroundColor: BRAND_DARK, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14, overflow: 'hidden' },
  headerTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerIdentity:  { flex: 1 },
  vendorName:      { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginBottom: 2 },
  vendorIdText:    { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  headerBottomRow: { backgroundColor: BRAND_BLUE, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center' },
  headerTitleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pageTitle:       { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginLeft: 8 },
  pageSubtitle:    { color: '#DBEAFE', fontSize: 12, lineHeight: 18 },
  vendorTypePill:  { backgroundColor: 'rgba(242,182,73,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 10 },
  vendorTypePillText: { color: BRAND_YELLOW, fontSize: 11, fontWeight: '800' },

  // Collapse bar
  collapseBar:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  collapseCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  collapseBarText:{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: '700' },

  // Page
  pageScroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 110, backgroundColor: PAGE_BG },

  // Cards
  sectionCard:         { backgroundColor: CARD_BG, borderRadius: 24, padding: 18, marginBottom: 14, shadowColor: '#111827', shadowOpacity: 0.07, shadowRadius: 16, elevation: 6 },
  cardHeaderRowInside: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12 },
  iconCircle:          { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F0FF', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  sectionTitle:        { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '900', marginBottom: 4 },
  sectionSubTitle:     { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  sectionCopy:         { color: TEXT_SECONDARY, fontSize: 13, lineHeight: 19, marginBottom: 12 },

  // Inputs
  fieldLabel: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input:      { borderWidth: 1, borderColor: '#D7E1F2', borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 11, marginBottom: 12, backgroundColor: '#FFFFFF', color: TEXT_PRIMARY, fontSize: 15 },

  // Buttons
  primaryButton:      { backgroundColor: BRAND_BLUE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
  primaryButtonText:  { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton:    { backgroundColor: '#EEF4FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText:{ color: BRAND_BLUE_DARK, fontSize: 14, fontWeight: '800' },
  darkButton:         { backgroundColor: '#171717', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  darkButtonText:     { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabledButton:     { opacity: 0.4 },

  // Info chips
  inlineStatsRow:   { flexDirection: 'row', marginBottom: 14 },
  infoChip:         { flex: 1, backgroundColor: '#EEF4FF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  infoChipDark:     { backgroundColor: '#0F172A', marginLeft: 10 },
  infoChipLabel:    { color: BRAND_BLUE_DARK, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  infoChipLabelDark:{ color: '#BFD6FF' },
  infoChipValue:    { color: BRAND_BLUE_DARK, fontSize: 16, fontWeight: '900' },
  infoChipValueDark:{ color: '#FFFFFF' },

  // Detail panel
  detailPanel:        { backgroundColor: '#F8FBFF', borderRadius: 18, padding: 14 },
  detailPanelTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailPanelError:   { borderWidth: 1, borderColor: '#F7B5B5' },
  iconChip:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF1FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  iconChipText:       { color: BRAND_BLUE_DARK, fontSize: 11, fontWeight: '800', marginLeft: 5 },
  detailRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 },
  detailLabel:        { color: TEXT_SECONDARY, fontSize: 13, fontWeight: '600', flex: 0.85, paddingRight: 8 },
  detailValue:        { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '800', flex: 1.15, textAlign: 'right', flexShrink: 1, minWidth: 0 },
  detailValueSingleLine:{ fontSize: 12 },
  monoText:           { fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier' },
  amountValue:        { color: BRAND_BLUE, fontSize: 17 },
  errorText:          { color: '#B91C1C', marginBottom: 8, fontWeight: '700', fontSize: 13 },

  // Summary strip
  summaryStrip:        { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 12, padding: 12, borderRadius: 16, backgroundColor: '#F3F4F6' },
  summaryStripItem:    { flex: 1 },
  summaryStripLabel:   { color: TEXT_SECONDARY, fontSize: 11, marginBottom: 3 },
  summaryStripValue:   { color: BRAND_BLUE_DARK, fontSize: 15, fontWeight: '900' },
  summaryStripDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#D2DDF3', marginHorizontal: 12 },

  // Warnings
  warningBox:       { flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: '#FEEBEC', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  warningText:      { flex: 1, color: '#B91C1C', fontWeight: '700', marginLeft: 8, fontSize: 13 },
  warningTextSmall: { color: '#B91C1C', marginTop: 8, fontSize: 12, lineHeight: 18 },

  // Status badges
  statusBadge:      { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusPendingBadge:{ backgroundColor: '#FFF4D7' },
  statusError:      { backgroundColor: '#FEEBEC' },
  statusBadgeText:  { fontSize: 11, fontWeight: '800' },
  statusPendingText:{ color: '#9A6400' },
  statusErrorText:  { color: '#B91C1C' },

  // History
  overviewRow:      { flexDirection: 'row', marginBottom: 14 },
  metricCard:       { flex: 1, backgroundColor: '#E5E7EB', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 12, marginRight: 10 },
  metricLabel:      { color: BRAND_DARK, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  metricValue:      { color: BRAND_DARK, fontSize: 16, fontWeight: '900' },
  historyCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FBFF', borderRadius: 18, padding: 13, marginTop: 12 },
  historyLeft:      { flex: 1, paddingRight: 10 },
  historyMerchant:  { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  historyMeta:      { color: TEXT_SECONDARY, fontSize: 11 },
  historyRight:     { alignItems: 'flex-end' },
  historyAmount:    { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  positive:         { color: '#14804A' },
  negative:         { color: '#B91C1C' },
  historyStatusPill:{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  historyCompleted: { backgroundColor: '#DCFCE7' },
  historyPending:   { backgroundColor: '#FFF4D7' },
  historyStatusText:{ fontSize: 11, fontWeight: '800' },
  historyCompletedText:{ color: '#166534' },
  historyPendingText:  { color: '#9A6400' },

  // Filter dropdown
  filterDropBtn:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF4FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 160 },
  filterDropBtnText:   { color: BRAND_BLUE, fontSize: 11, fontWeight: '800', marginRight: 4, flex: 1 },
  filterDropMenu:      { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 6 },
  filterDropItem:      { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterDropItemActive:{ backgroundColor: '#EEF4FF' },
  filterDropItemText:  { color: TEXT_SECONDARY, fontSize: 13, fontWeight: '600' },
  filterDropItemTextActive:{ color: BRAND_BLUE, fontWeight: '800' },

  // Credits page
  loanStatPanel:   { backgroundColor: '#F8FBFF', borderRadius: 18, padding: 14, marginBottom: 14 },
  loanStatRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  loanStatLabel:   { color: TEXT_SECONDARY, fontSize: 13, fontWeight: '600' },
  loanStatValue:   { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '800' },
  softPanel:       { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, marginBottom: 12 },
  earningsHero:    { backgroundColor: '#FFF7E8', borderRadius: 20, padding: 16, marginBottom: 14 },
  earningsLabel:   { color: TEXT_SECONDARY, fontSize: 12, marginBottom: 6 },
  earningsValue:   { color: '#05603A', fontSize: 34, fontWeight: '900', marginBottom: 4 },
  earningsHint:    { color: '#8A6500', fontSize: 13, fontWeight: '700' },
  prepaidFeeNote:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 14, padding: 12 },
  prepaidFeeNoteText:{ color: '#14532D', fontSize: 13, fontWeight: '700', marginLeft: 8, flex: 1 },
  divider:         { height: 1, backgroundColor: '#DCE4F3', marginVertical: 16 },

  // Profile
  profileMessage:  { color: BRAND_BLUE_DARK, fontWeight: '800', marginTop: 10, fontSize: 13 },
  logoutWideButton:{ backgroundColor: BRAND_DARK, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, marginTop: 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoutWideText:  { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginLeft: 8 },

  // Bottom nav
  bottomNav:            { position: 'absolute', left: 14, right: 14, bottom: 14, backgroundColor: '#FFFFFF', borderRadius: 26, paddingVertical: 10, paddingHorizontal: 6, flexDirection: 'row', justifyContent: 'space-between', shadowColor: '#111827', shadowOpacity: 0.16, shadowRadius: 18, elevation: 12 },
  bottomTab:            { flex: 1, alignItems: 'center' },
  bottomTabIcon:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7', marginBottom: 4 },
  bottomTabIconSelected:{ backgroundColor: BRAND_BLUE },
  bottomTabLabel:       { color: TEXT_SECONDARY, fontSize: 10, fontWeight: '700' },
  bottomTabLabelSelected:{ color: BRAND_BLUE },

  // Modals
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(17,24,39,0.56)', justifyContent: 'center', paddingHorizontal: 18 },
  modalCard:     { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20 },
  modalTitle:    { color: TEXT_PRIMARY, fontSize: 20, fontWeight: '900', marginBottom: 6 },
  modalCopy:     { color: TEXT_SECONDARY, lineHeight: 20, marginBottom: 14, fontSize: 13 },
  modalHint:     { color: '#8A6500', fontWeight: '700', marginBottom: 14, fontSize: 12 },
  modalActions:  { flexDirection: 'row', marginTop: 14 },
  modalButton:   { flex: 1 },
  pinAmountBadge:{ backgroundColor: '#EEF4FF', borderRadius: 16, padding: 14, marginBottom: 14, alignItems: 'center' },
  pinAmountLabel:{ color: TEXT_SECONDARY, fontSize: 12, marginBottom: 4 },
  pinAmountValue:{ color: BRAND_BLUE, fontSize: 26, fontWeight: '900' },
});