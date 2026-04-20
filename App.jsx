import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';

const BRAND_BLUE = '#2563EB';
const BRAND_BLUE_DARK = '#1D4ED8';
const BRAND_DARK = '#3C4043';
const BRAND_DARK_ALT = '#2F3336';
const BRAND_YELLOW = '#F2B649';
const PAGE_BACKGROUND = '#F3F4F6';
const CARD_BACKGROUND = '#FFFFFF';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#5B6B88';

const invoiceDatabase = {
  '6511-3189-3736': {
    merchant: 'PaySME',
    business: 'PaySME Inc',
    amount: 500,
    code: '6511-3189-3736',
    email: 'aqua@mwaikange.com',
    mobile: '+264 81 808 3704',
    status: 'pending',
  },
  '1234-5678-9012': {
    merchant: 'Tech Solutions',
    business: 'TechSolutions Ltd',
    amount: 1200,
    code: '1234-5678-9012',
    email: 'vendor@techsolutions.com',
    mobile: '+264 81 234 5678',
    status: 'pending',
  },
  '9876-5432-1098': {
    merchant: 'Digital Store',
    business: 'Digital Retail Corp',
    amount: 750,
    code: '9876-5432-1098',
    email: 'store@digital.com',
    mobile: '+264 81 987 6543',
    status: 'pending',
  },
  '1111-2222-3333': {
    merchant: 'PaySME',
    business: 'PaySME',
    amount: 650,
    code: '1111-2222-3333',
    email: 'client@paysme.com',
    mobile: '+264 81 222 3333',
    status: 'pending',
  },
};

const vendorAccounts = {
  prepaid: {
    id: 'VND-2024-001',
    name: 'Maris Today',
    type: 'prepaid',
    creditBalance: 5000,
    feeEarned: 0,
    loanBalance: 0,
    pin: '12345',
    email: 'vendor@techsolutions.com',
    phone: '+264 81 808 3704',
    password: 'password123',
  },
  loan: {
    id: 'LND-2024-002',
    name: 'Mwaikange Motinga',
    type: 'loan',
    creditBalance: 4200,
    feeEarned: 980,
    loanBalance: 2750,
    pin: '54321',
    email: 'loanvendor@paysme.com',
    phone: '+264 81 555 2024',
    password: 'loan123',
  },
};

const initialHistory = [
  {
    id: 1,
    merchant: 'Merchant A',
    amount: 500,
    status: 'completed',
    date: '2024-01-15',
    type: 'payment',
  },
  {
    id: 2,
    merchant: 'Merchant B',
    amount: 1200,
    status: 'completed',
    date: '2024-01-14',
    type: 'payment',
  },
  {
    id: 3,
    merchant: 'Merchant C',
    amount: 750,
    status: 'pending',
    date: '2024-01-13',
    type: 'payment',
  },
];

const pageMeta = {
  process: {
    title: 'Process payment',
    subtitle: 'Enter a PaySME code and complete the payment in a few taps.',
    icon: 'card-outline',
  },
  history: {
    title: 'Transaction history',
    subtitle: 'Keep track of vendor activity and recently processed payments.',
    icon: 'time-outline',
  },
  topup: {
    title: 'Credits and loan',
    subtitle: 'Top up your balance, manage fees, and monitor loan activity.',
    icon: 'wallet-outline',
  },
  profile: {
    title: 'Profile settings',
    subtitle: 'Update your account details, password, and PaySME PIN.',
    icon: 'person-circle-outline',
  },
};

const navItems = [
  { key: 'process', label: 'Process', icon: 'card-outline' },
  { key: 'history', label: 'History', icon: 'time-outline' },
  { key: 'topup', label: 'Credits', icon: 'wallet-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-circle-outline' },
];

const formatCurrency = (amount) => `N$${Number(amount).toFixed(2)}`;
const today = () => new Date().toISOString().split('T')[0];
const formatInvoiceTokenInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join('-') : '';
};

export default function App() {
  const [authState, setAuthState] = useState('login');
  const [page, setPage] = useState('process');
  const [loginData, setLoginData] = useState({ vendorId: '', password: '' });
  const [vendor, setVendor] = useState(vendorAccounts.prepaid);
  const [processHistory, setProcessHistory] = useState(initialHistory);
  const [invoiceToken, setInvoiceToken] = useState('');
  const [currentProcess, setCurrentProcess] = useState({
    invoiceToken: '',
    merchant: '',
    business: '',
    amount: 0,
    email: '',
    mobile: '',
    code: '',
    status: 'idle',
  });
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [showTopupConfirm, setShowTopupConfirm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [loanPaymentAmount, setLoanPaymentAmount] = useState('');
  const [passwordSettings, setPasswordSettings] = useState({ old: '', new: '', confirm: '' });
  const [pinSettings, setPinSettings] = useState({ old: '', new: '', confirm: '' });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [loanAppVisible, setLoanAppVisible] = useState(false);
  const [loanAppData, setLoanAppData] = useState({ idDocument: '', incomeProof: '' });

  const canApplyLoanVendor = vendor.type === 'prepaid' && vendor.creditBalance === 0;
  const feeRate = vendor.type === 'prepaid' ? 0.05 : 0.04;
  const headerMeta = pageMeta[page];
  const loanInstallmentMode = vendor.type === 'loan' && vendor.loanBalance > 0;

  const addHistoryItems = (entries) => {
    setProcessHistory((prev) => [
      ...entries.map((entry, index) => ({
        id: prev.length + entries.length - index,
        date: today(),
        ...entry,
      })),
      ...prev,
    ]);
  };

  const handleLogin = () => {
    if (!loginData.vendorId || !loginData.password) {
      Alert.alert('Login failed', 'Vendor ID and password are required.');
      return;
    }

    const matchedVendor = Object.values(vendorAccounts).find(
      (account) => account.id === loginData.vendorId && account.password === loginData.password
    );

    if (matchedVendor) {
      setVendor({ ...matchedVendor });
      setAuthState('main');
      setPage('process');
      setLoginData({ vendorId: '', password: '' });
      setInvoiceToken('');
      setCurrentProcess({ invoiceToken: '', merchant: '', business: '', amount: 0, email: '', mobile: '', code: '', status: 'idle' });
      return;
    }

    Alert.alert('Login failed', 'Invalid vendor credentials.');
  };

  const handleLogout = () => {
    setAuthState('login');
    setPage('process');
    setInvoiceToken('');
    setCurrentProcess({ invoiceToken: '', merchant: '', business: '', amount: 0, email: '', mobile: '', code: '', status: 'idle' });
  };

  const handleInvoiceTokenLookup = (token) => {
    const formattedToken = formatInvoiceTokenInput(token);
    setInvoiceToken(formattedToken);
    if (!formattedToken) {
      setCurrentProcess({ invoiceToken: '', merchant: '', business: '', amount: 0, email: '', mobile: '', code: '', status: 'idle' });
      return;
    }
    const invoiceData = invoiceDatabase[formattedToken];
    if (invoiceData) {
      setCurrentProcess({
        invoiceToken: formattedToken,
        merchant: invoiceData.merchant,
        business: invoiceData.business,
        amount: invoiceData.amount,
        email: invoiceData.email,
        mobile: invoiceData.mobile,
        code: invoiceData.code,
        status: invoiceData.status,
      });
      return;
    }
    setCurrentProcess({
      invoiceToken: formattedToken,
      merchant: 'Not found',
      business: '-',
      amount: 0,
      email: '-',
      mobile: '-',
      code: formattedToken,
      status: 'error',
    });
  };

  const openConfirmPayment = () => {
    if (!currentProcess.invoiceToken || currentProcess.status !== 'pending') {
      Alert.alert('Invalid token', 'Please enter a valid invoice token.');
      return;
    }
    if (currentProcess.amount > vendor.creditBalance) {
      Alert.alert('Insufficient credit', 'You do not have enough credit tokens for this payment.');
      return;
    }
    setShowConfirmPayment(true);
  };

  const finalizePayment = () => {
    if (pinInput !== vendor.pin) {
      setPinError('Invalid PIN');
      return;
    }

    const feeValue = currentProcess.amount * feeRate;
    const newCreditBalance = vendor.creditBalance - currentProcess.amount;

    setVendor((prev) => ({
      ...prev,
      creditBalance: newCreditBalance,
      feeEarned: prev.feeEarned + feeValue,
    }));

    addHistoryItems([
      {
        merchant: currentProcess.merchant,
        amount: currentProcess.amount,
        status: 'completed',
        type: 'payment',
        code: currentProcess.code,
      },
      {
        merchant: 'Fee Earned',
        amount: feeValue,
        status: 'completed',
        type: 'feeEarned',
        code: currentProcess.code,
      },
    ]);

    setCurrentProcess({ invoiceToken: '', merchant: '', business: '', amount: 0, email: '', mobile: '', code: '', status: 'idle' });
    setInvoiceToken('');
    setShowConfirmPayment(false);
    setShowPinModal(false);
    setPinInput('');
    setPinError('');
    Alert.alert('Success', 'Payment processed successfully.');
  };

  const handleTopup = () => {
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a top-up amount greater than zero.');
      return;
    }
    setShowTopupConfirm(true);
  };

  const confirmTopup = () => {
    const amount = Number(topupAmount);
    if (loanInstallmentMode) {
      setVendor((prev) => ({
        ...prev,
        loanBalance: Math.max(0, prev.loanBalance - amount),
      }));
      addHistoryItems([
        {
          merchant: 'Loan Installment',
          amount: amount,
          status: 'paid',
          type: 'loanInstallment',
        },
      ]);
      setTopupAmount('');
      setShowTopupConfirm(false);
      Alert.alert('Loan installment paid', `${formatCurrency(amount)} was applied directly to your loan balance.`);
      return;
    }

    const discount = vendor.type === 'prepaid' ? amount * 0.05 : 0;
    const creditAdded = amount;
    const payAmount = amount - discount;

    setVendor((prev) => ({ ...prev, creditBalance: prev.creditBalance + creditAdded }));
    addHistoryItems([
      {
        merchant: 'PaySME Top Up',
        amount: creditAdded,
        status: 'completed',
        type: 'topup',
      },
    ]);

    setTopupAmount('');
    setShowTopupConfirm(false);
    Alert.alert('Top-up completed', `You purchased ${formatCurrency(creditAdded)} credit tokens for ${formatCurrency(payAmount)}.`);
  };

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a withdrawal amount greater than zero.');
      return;
    }
    if (amount > vendor.feeEarned) {
      Alert.alert('Insufficient fees', 'You can only withdraw up to your earned fees.');
      return;
    }
    setShowWithdrawConfirm(true);
  };

  const confirmWithdraw = () => {
    const amount = Number(withdrawAmount);
    const payout = amount * 0.5;
    const repay = amount * 0.5;

    setVendor((prev) => ({
      ...prev,
      feeEarned: prev.feeEarned - amount,
      loanBalance: Math.max(0, prev.loanBalance - repay),
    }));

    addHistoryItems([
      {
        merchant: 'Withdrawal Request',
        amount: payout,
        status: 'pending',
        type: 'withdrawRequest',
      },
      {
        merchant: 'Loan Payment',
        amount: repay,
        status: 'paid',
        type: 'loanPayment',
      },
    ]);

    setWithdrawAmount('');
    setShowWithdrawConfirm(false);
    Alert.alert('Withdrawal completed', `You received ${formatCurrency(payout)} and ${formatCurrency(repay)} was used to reduce your loan.`);
  };

  const applyLoanVendor = () => {
    if (!loanAppData.idDocument || !loanAppData.incomeProof) {
      Alert.alert('Application incomplete', 'Please provide both ID and proof of income.');
      return;
    }
    setVendor((prev) => ({ ...prev, type: 'loan', loanBalance: 5000, creditBalance: 5000 }));
    setLoanAppVisible(false);
    setLoanAppData({ idDocument: '', incomeProof: '' });
    Alert.alert('Loan approved', 'You are now a loan vendor with N$5000 credit tokens.');
  };

  const handleLoanPayment = () => {
    const amount = Number(loanPaymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount to pay toward the loan.');
      return;
    }
    if (amount > vendor.creditBalance) {
      Alert.alert('Insufficient credit', 'Your available credit is not enough to pay this amount.');
      return;
    }
    if (vendor.loanBalance <= 0) {
      Alert.alert('No loan balance', 'You have no active loan to pay off.');
      return;
    }

    setVendor((prev) => ({
      ...prev,
      creditBalance: prev.creditBalance - amount,
      loanBalance: Math.max(0, prev.loanBalance - amount),
    }));

    addHistoryItems([
      {
        merchant: 'Loan Payment',
        amount: amount,
        status: 'paid',
        type: 'loanPayment',
      },
    ]);

    setLoanPaymentAmount('');
    Alert.alert('Payment applied', `${formatCurrency(amount)} reduced your loan balance.`);
  };

  const updatePassword = () => {
    if (passwordSettings.new !== passwordSettings.confirm) {
      setProfileMessage('New passwords do not match');
      return;
    }
    if (passwordSettings.old !== vendor.password) {
      setProfileMessage('Current password is incorrect');
      return;
    }

    setVendor((prev) => ({ ...prev, password: passwordSettings.new }));
    setPasswordSettings({ old: '', new: '', confirm: '' });
    setProfileMessage('Password updated successfully');
    setTimeout(() => setProfileMessage(''), 3000);
  };

  const requestPinUpdate = () => {
    if (pinSettings.new !== pinSettings.confirm) {
      setProfileMessage('PIN values do not match');
      return;
    }
    if (pinSettings.old !== vendor.pin) {
      setProfileMessage('Current PIN is incorrect');
      return;
    }
    setShowOtpModal(true);
  };

  const confirmPinUpdate = () => {
    if (otpCode !== '123456') {
      setProfileMessage('Invalid OTP code');
      return;
    }
    setVendor((prev) => ({ ...prev, pin: pinSettings.new }));
    setPinSettings({ old: '', new: '', confirm: '' });
    setOtpCode('');
    setShowOtpModal(false);
    setProfileMessage('PIN updated successfully');
    setTimeout(() => setProfileMessage(''), 3000);
  };

  const renderProcessPage = () => (
    <>
      <SectionCard>
        <View style={styles.cardHeaderRowInside}>
          <View style={styles.cardHeaderTitleWrap}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="payment" size={20} color={BRAND_BLUE} />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={styles.sectionTitle}>Enter PaySME code</Text>
              <Text style={styles.sectionCopy}>Use the invoice token from the customer to validate the payment.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Payment code</Text>
        <TextInput
          value={invoiceToken}
          onChangeText={handleInvoiceTokenLookup}
          placeholder="6511-3189-3736"
          style={styles.input}
          autoCapitalize="characters"
        />

        <View style={styles.inlineStatsRow}>
          <InfoChip label="Vendor fee" value={`${Math.round(feeRate * 100)}%`} />
          <InfoChip label="Balance" value={formatCurrency(vendor.creditBalance)} dark />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={openConfirmPayment}>
          <Text style={styles.primaryButtonText}>Validate payment</Text>
        </TouchableOpacity>
      </SectionCard>

      {currentProcess.invoiceToken ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Payment details</Text>
          <Text style={styles.sectionCopy}>
            {currentProcess.status === 'error'
              ? 'We could not find that invoice token.'
              : 'Review the payment information before you confirm it.'}
          </Text>

          <View style={[styles.detailPanel, currentProcess.status === 'error' && styles.detailPanelError]}>
            <View style={styles.detailPanelTopRow}>
              <View style={styles.iconChip}>
                <Ionicons name="receipt-outline" size={18} color={BRAND_BLUE} />
                <Text style={styles.iconChipText}>Invoice</Text>
              </View>
              <View style={[styles.statusBadge, currentProcess.status === 'error' ? styles.statusError : styles.statusPendingBadge]}>
                <Text style={[styles.statusBadgeText, currentProcess.status === 'error' ? styles.statusErrorText : styles.statusPendingText]}>
                  {currentProcess.status === 'error' ? 'Not found' : 'Pending'}
                </Text>
              </View>
            </View>
            <DetailRow label="Merchant" value={currentProcess.merchant} />
            <DetailRow label="Business" value={currentProcess.business} />
            <DetailRow label="Code" value={currentProcess.code} monospace />
            <DetailRow
              label="Amount"
              value={currentProcess.status === 'error' ? 'Not found' : formatCurrency(currentProcess.amount)}
              valueStyle={currentProcess.status === 'error' ? styles.errorText : styles.amountValue}
            />
            <DetailRow label="Client email" value={currentProcess.email} numberOfLines={1} />
            <DetailRow label="Client mobile" value={currentProcess.mobile} />
          </View>

          {currentProcess.status !== 'error' ? (
            <>
              <View style={styles.summaryStrip}>
                <View style={styles.summaryStripItem}>
                  <Text style={styles.summaryStripLabel}>Fee earned</Text>
                  <Text style={styles.summaryStripValue}>{formatCurrency(currentProcess.amount * feeRate)}</Text>
                </View>
                <View style={styles.summaryStripDivider} />
                <View style={styles.summaryStripItem}>
                  <Text style={styles.summaryStripLabel}>Balance after</Text>
                  <Text style={styles.summaryStripValue}>{formatCurrency(vendor.creditBalance - currentProcess.amount)}</Text>
                </View>
              </View>

              {currentProcess.amount > vendor.creditBalance ? (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                  <Text style={styles.warningText}>Insufficient credit balance for this payment.</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.darkButton, currentProcess.amount > vendor.creditBalance && styles.disabledButton]}
                onPress={openConfirmPayment}
                disabled={currentProcess.amount > vendor.creditBalance}
              >
                <Text style={styles.darkButtonText}>Confirm payment</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </SectionCard>
      ) : null}
    </>
  );

  const renderHistoryPage = () => (
    <>
      <View style={styles.overviewRow}>
        <MiniMetric title="Transactions" value={`${processHistory.length}`} />
        <MiniMetric title="Completed" value={`${processHistory.filter((item) => item.status === 'completed').length}`} />
        <MiniMetric title="Fees" value={formatCurrency(vendor.feeEarned)} />
      </View>

      <SectionCard>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <Text style={styles.sectionCopy}>Your latest vendor transactions and their current status.</Text>

        {processHistory.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyMerchant}>{item.merchant}</Text>
              <Text style={styles.historyMeta}>
                {item.date} | {item.type}
                {item.code ? ` | ${item.code}` : ''}
              </Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={[styles.historyAmount, styles.positive]}>
                +{formatCurrency(item.amount)}
              </Text>
              <View style={[styles.historyStatusPill, item.status === 'completed' || item.status === 'paid' ? styles.historyCompleted : styles.historyPending]}>
                <Text style={[styles.historyStatusText, item.status === 'completed' || item.status === 'paid' ? styles.historyCompletedText : styles.historyPendingText]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  );

  const renderCreditsPage = () => (
    <>
      <SectionCard>
        <Text style={styles.sectionTitle}>{loanInstallmentMode ? 'Pay loan installment' : 'Top up credits'}</Text>
        <Text style={styles.sectionCopy}>
          {vendor.type === 'prepaid'
            ? 'Prepaid vendors get a 5% discount when buying credit tokens.'
            : loanInstallmentMode
              ? 'This amount will automatically debit your loan amount as an installment payment.'
              : 'Loan balance is cleared. You can buy additional credits again.'}
        </Text>

        <TextInput
          value={topupAmount}
          onChangeText={setTopupAmount}
          placeholder="Top-up amount"
          style={styles.input}
          keyboardType="numeric"
        />

        {topupAmount ? (
          <View style={styles.softPanel}>
            {loanInstallmentMode ? (
              <>
                <DetailRow label="Installment payment" value={formatCurrency(Number(topupAmount) || 0)} />
                <DetailRow label="Loan balance after" value={formatCurrency(Math.max(0, vendor.loanBalance - (Number(topupAmount) || 0)))} />
              </>
            ) : (
              <>
                <DetailRow label="Credit purchased" value={formatCurrency(Number(topupAmount) || 0)} />
                <DetailRow
                  label="You pay"
                  value={vendor.type === 'prepaid' ? formatCurrency((Number(topupAmount) || 0) * 0.95) : formatCurrency(Number(topupAmount) || 0)}
                />
              </>
            )}
          </View>
        ) : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleTopup}>
          <Text style={styles.primaryButtonText}>{loanInstallmentMode ? 'Pay Loan Installment' : 'Top up credits'}</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Earnings snapshot</Text>
        <View style={styles.earningsHero}>
          <Text style={styles.earningsLabel}>Total fees earned</Text>
          <Text style={styles.earningsValue}>{formatCurrency(vendor.feeEarned)}</Text>
          <Text style={styles.earningsHint}>Commission rate: {Math.round(feeRate * 100)}%</Text>
        </View>

        {vendor.type === 'loan' ? (
          <>
            <Text style={styles.sectionSubTitle}>Withdraw fees</Text>
            <TextInput
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="Withdrawal amount"
              style={styles.input}
              keyboardType="numeric"
            />
            <View style={styles.softPanel}>
              <DetailRow label="Cash payout" value={formatCurrency((Number(withdrawAmount) || 0) * 0.5)} />
              <DetailRow label="Loan repayment" value={formatCurrency((Number(withdrawAmount) || 0) * 0.5)} />
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleWithdraw}>
              <Text style={styles.secondaryButtonText}>Withdraw fees</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.sectionSubTitle}>Pay loan with fee tokens</Text>
            <TextInput
              value={loanPaymentAmount}
              onChangeText={setLoanPaymentAmount}
              placeholder="Amount to pay"
              style={styles.input}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.darkButton} onPress={handleLoanPayment}>
              <Text style={styles.darkButtonText}>Pay loan</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </SectionCard>
    </>
  );

  const renderProfilePage = () => (
    <>
      <SectionCard>
        <Text style={styles.sectionTitle}>Vendor profile</Text>
        <View style={styles.detailPanel}>
          <DetailRow label="Vendor name" value={vendor.name} numberOfLines={1} />
          <DetailRow label="Vendor ID" value={vendor.id} />
          <DetailRow label="Email" value={vendor.email} numberOfLines={1} />
          <DetailRow label="Phone" value={vendor.phone} />
          <DetailRow label="Vendor type" value={vendor.type === 'prepaid' ? 'Prepaid' : 'Loan'} />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Change password</Text>
        <TextInput
          value={passwordSettings.old}
          onChangeText={(value) => setPasswordSettings((prev) => ({ ...prev, old: value }))}
          placeholder="Current password"
          style={styles.input}
          secureTextEntry
        />
        <TextInput
          value={passwordSettings.new}
          onChangeText={(value) => setPasswordSettings((prev) => ({ ...prev, new: value }))}
          placeholder="New password"
          style={styles.input}
          secureTextEntry
        />
        <TextInput
          value={passwordSettings.confirm}
          onChangeText={(value) => setPasswordSettings((prev) => ({ ...prev, confirm: value }))}
          placeholder="Confirm password"
          style={styles.input}
          secureTextEntry
        />
        <TouchableOpacity style={styles.primaryButton} onPress={updatePassword}>
          <Text style={styles.primaryButtonText}>Update password</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Update 5-digit PIN</Text>
        <TextInput
          value={pinSettings.old}
          onChangeText={(value) => setPinSettings((prev) => ({ ...prev, old: value }))}
          placeholder="Current PIN"
          style={styles.input}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={5}
        />
        <TextInput
          value={pinSettings.new}
          onChangeText={(value) => setPinSettings((prev) => ({ ...prev, new: value }))}
          placeholder="New PIN"
          style={styles.input}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={5}
        />
        <TextInput
          value={pinSettings.confirm}
          onChangeText={(value) => setPinSettings((prev) => ({ ...prev, confirm: value }))}
          placeholder="Confirm PIN"
          style={styles.input}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={5}
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={requestPinUpdate}>
          <Text style={styles.secondaryButtonText}>Request OTP</Text>
        </TouchableOpacity>
        {profileMessage ? <Text style={styles.profileMessage}>{profileMessage}</Text> : null}
      </SectionCard>

      {vendor.type === 'prepaid' ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Loan vendor application</Text>
          <Text style={styles.sectionCopy}>
            Apply when your prepaid credits have been fully used. Approved vendors receive an instant loan balance.
          </Text>
          <TouchableOpacity
            style={[styles.darkButton, !canApplyLoanVendor && styles.disabledButton]}
            onPress={() => setLoanAppVisible(true)}
            disabled={!canApplyLoanVendor}
          >
            <Text style={styles.darkButtonText}>Apply for loan vendor</Text>
          </TouchableOpacity>
          {!canApplyLoanVendor ? <Text style={styles.warningTextSmall}>Spend all available credits before applying.</Text> : null}
        </SectionCard>
      ) : null}

      <TouchableOpacity style={styles.logoutWideButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        <Text style={styles.logoutWideText}>Logout</Text>
      </TouchableOpacity>
    </>
  );

  const renderPage = () => {
    if (page === 'process') {
      return renderProcessPage();
    }
    if (page === 'history') {
      return renderHistoryPage();
    }
    if (page === 'topup') {
      return renderCreditsPage();
    }
    return renderProfilePage();
  };

  if (authState === 'login') {
    return (
      <SafeAreaView style={styles.loginSafeArea}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.loginTopGlow} />
          <Image source={require('./assets/paysme-logo.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.brandSubtitle}>Vendor portal for processing payments, managing credits, and tracking fees.</Text>

          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Vendor sign in</Text>
            <Text style={styles.loginCopy}>Use your PaySME Vendor ID and password to continue.</Text>

            <Text style={styles.fieldLabel}>Vendor ID</Text>
            <TextInput
              value={loginData.vendorId}
              onChangeText={(value) => setLoginData((prev) => ({ ...prev, vendorId: value }))}
              placeholder="VND-2024-001"
              style={styles.input}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              value={loginData.password}
              onChangeText={(value) => setLoginData((prev) => ({ ...prev, password: value }))}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Login</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.headerShell}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerIdentity}>
            <Text style={styles.vendorName}>{vendor.name}</Text>
            <Text style={styles.vendorIdText}>{vendor.id}</Text>
          </View>
        </View>

        <View style={styles.headerBottomRow}>
          <View style={styles.headerTextWrap}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={headerMeta.icon} size={20} color="#FFFFFF" />
              <Text style={styles.pageTitle}>{headerMeta.title}</Text>
            </View>
            <Text style={styles.pageSubtitle}>{headerMeta.subtitle}</Text>
          </View>
          <View style={styles.vendorTypePill}>
            <Text style={styles.vendorTypePillText}>{vendor.type === 'prepaid' ? 'Prepaid vendor' : 'Loan vendor'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
        {renderPage()}
      </ScrollView>

      <View style={styles.bottomNav}>
        {navItems.map((item) => (
          <BottomTab
            key={item.key}
            icon={item.icon}
            label={item.label}
            selected={page === item.key}
            onPress={() => setPage(item.key)}
          />
        ))}
      </View>

      <Modal visible={showConfirmPayment} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm payment</Text>
            <Text style={styles.modalCopy}>Please review the payment details before you continue.</Text>
            <View style={styles.detailPanel}>
              <DetailRow label="Merchant" value={currentProcess.merchant} />
              <DetailRow label="Business" value={currentProcess.business} />
              <DetailRow label="Amount" value={formatCurrency(currentProcess.amount)} valueStyle={styles.amountValue} />
              <DetailRow label="Code" value={currentProcess.code} monospace />
              <DetailRow label="Client email" value={currentProcess.email} numberOfLines={1} />
              <DetailRow label="Client mobile" value={currentProcess.mobile} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowConfirmPayment(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.darkButton, styles.modalButton, styles.modalButtonSpacing]}
                onPress={() => {
                  setShowConfirmPayment(false);
                  setShowPinModal(true);
                }}
              >
                <Text style={styles.darkButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter PIN</Text>
            <Text style={styles.modalCopy}>Use your 5-digit PIN to authorize this payment.</Text>
            <TextInput
              value={pinInput}
              onChangeText={(value) => {
                setPinInput(value);
                setPinError('');
              }}
              placeholder="Enter PIN"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={5}
              style={styles.input}
            />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.modalButton]}
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPinError('');
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, styles.modalButtonSpacing]} onPress={finalizePayment}>
                <Text style={styles.darkButtonText}>Authorize</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showTopupConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{loanInstallmentMode ? 'Confirm installment payment' : 'Confirm top-up'}</Text>
            {loanInstallmentMode ? (
              <Text style={styles.modalCopy}>
                This amount will automatically debit your loan amount as a form of payment. New loan balance after payment:
                {' '}
                {formatCurrency(Math.max(0, vendor.loanBalance - (Number(topupAmount) || 0)))}.
              </Text>
            ) : (
              <Text style={styles.modalCopy}>You will receive {formatCurrency(Number(topupAmount) || 0)} credit tokens.</Text>
            )}
            {vendor.type === 'prepaid' ? (
              <Text style={styles.modalCopy}>You pay {formatCurrency((Number(topupAmount) || 0) * 0.95)} after discount.</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowTopupConfirm(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, styles.modalButtonSpacing]} onPress={confirmTopup}>
                <Text style={styles.darkButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showWithdrawConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm withdrawal</Text>
            <Text style={styles.modalCopy}>
              A withdrawal request for {formatCurrency((Number(withdrawAmount) || 0) * 0.5)} will be created with pending status, and
              {' '}
              {formatCurrency((Number(withdrawAmount) || 0) * 0.5)}
              {' '}
              will immediately be posted as a paid loan reduction.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowWithdrawConfirm(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, styles.modalButtonSpacing]} onPress={confirmWithdraw}>
                <Text style={styles.darkButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>SMS OTP verification</Text>
            <Text style={styles.modalCopy}>Enter the OTP sent to {vendor.phone}.</Text>
            <TextInput
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="123456"
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text style={styles.modalHint}>Demo OTP: 123456</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setShowOtpModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, styles.modalButtonSpacing]} onPress={confirmPinUpdate}>
                <Text style={styles.darkButtonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={loanAppVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Loan vendor application</Text>
            <Text style={styles.modalCopy}>Upload ID and proof of income to request loan vendor status.</Text>
            <TextInput
              value={loanAppData.idDocument}
              onChangeText={(value) => setLoanAppData((prev) => ({ ...prev, idDocument: value }))}
              placeholder="ID document description"
              style={styles.input}
            />
            <TextInput
              value={loanAppData.incomeProof}
              onChangeText={(value) => setLoanAppData((prev) => ({ ...prev, incomeProof: value }))}
              placeholder="Proof of income description"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.secondaryButton, styles.modalButton]} onPress={() => setLoanAppVisible(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.darkButton, styles.modalButton, styles.modalButtonSpacing]} onPress={applyLoanVendor}>
                <Text style={styles.darkButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SectionCard = ({ children }) => <View style={styles.sectionCard}>{children}</View>;

const InfoChip = ({ label, value, dark }) => (
  <View style={[styles.infoChip, dark && styles.infoChipDark]}>
    <Text style={[styles.infoChipLabel, dark && styles.infoChipLabelDark]}>{label}</Text>
    <Text style={[styles.infoChipValue, dark && styles.infoChipValueDark]}>{value}</Text>
  </View>
);

const MiniMetric = ({ title, value }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{title}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const BottomTab = ({ icon, label, selected, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.bottomTab}>
    <View style={[styles.bottomTabIcon, selected && styles.bottomTabIconSelected]}>
      <Ionicons name={icon} size={20} color={selected ? '#FFFFFF' : BRAND_BLUE} />
    </View>
    <Text style={[styles.bottomTabLabel, selected && styles.bottomTabLabelSelected]}>{label}</Text>
  </TouchableOpacity>
);

const DetailRow = ({ label, value, monospace, valueStyle, numberOfLines }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text
      numberOfLines={numberOfLines}
      ellipsizeMode="tail"
      style={[styles.detailValue, monospace && styles.monoText, valueStyle, numberOfLines === 1 && styles.detailValueSingleLine]}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
  },
  loginSafeArea: {
    flex: 1,
    backgroundColor: BRAND_DARK,
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  loginTopGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(242,182,73,0.16)',
  },
  brandLogo: {
    width: '100%',
    height: 104,
    marginBottom: 12,
  },
  brandSubtitle: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 28,
    padding: 22,
    shadowColor: '#031D42',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  loginTitle: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  loginCopy: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  fieldLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D7E1F2',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    color: TEXT_PRIMARY,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#EEF4FF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: BRAND_BLUE_DARK,
    fontSize: 15,
    fontWeight: '800',
  },
  darkButton: {
    backgroundColor: '#171717',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  darkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  demoBox: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    padding: 16,
  },
  demoLabel: {
    color: BRAND_BLUE_DARK,
    fontWeight: '800',
    marginBottom: 6,
  },
  demoText: {
    color: TEXT_SECONDARY,
    lineHeight: 21,
  },
  demoHint: {
    color: '#856404',
    lineHeight: 20,
    marginTop: 8,
    fontWeight: '700',
  },
  headerShell: {
    backgroundColor: BRAND_DARK,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerIdentity: {
    flex: 1,
    paddingRight: 12,
  },
  vendorName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 4,
  },
  vendorIdText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  headerBottomRow: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 24,
    padding: 16,
  },
  headerTextWrap: {
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginLeft: 8,
  },
  pageSubtitle: {
    color: '#DBEAFE',
    fontSize: 14,
    lineHeight: 21,
  },
  vendorTypePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(242,182,73,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  vendorTypePillText: {
    color: BRAND_YELLOW,
    fontSize: 12,
    fontWeight: '800',
  },
  pageScroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 116,
    backgroundColor: PAGE_BACKGROUND,
  },
  sectionCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  cardHeaderRowInside: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
  },
  cardHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    marginRight: 12,
    flexShrink: 0,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionSubTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionCopy: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 21,
  },
  inlineStatsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoChip: {
    flex: 1,
    backgroundColor: '#EEF4FF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoChipDark: {
    backgroundColor: '#0F172A',
    marginLeft: 10,
  },
  infoChipLabel: {
    color: BRAND_BLUE_DARK,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoChipLabelDark: {
    color: '#BFD6FF',
  },
  infoChipValue: {
    color: BRAND_BLUE_DARK,
    fontSize: 17,
    fontWeight: '900',
  },
  infoChipValueDark: {
    color: '#FFFFFF',
  },
  detailPanel: {
    backgroundColor: '#F8FBFF',
    borderRadius: 20,
    padding: 16,
  },
  detailPanelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF1FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  iconChipText: {
    color: BRAND_BLUE_DARK,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  detailPanelError: {
    borderWidth: 1,
    borderColor: '#F7B5B5',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 11,
  },
  detailLabel: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
    flex: 0.8,
    paddingRight: 10,
  },
  detailValue: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
    flex: 1.2,
    textAlign: 'right',
    flexShrink: 1,
    minWidth: 0,
  },
  detailValueSingleLine: {
    fontSize: 13,
  },
  monoText: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  amountValue: {
    color: BRAND_BLUE,
    fontSize: 18,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  summaryStripItem: {
    flex: 1,
  },
  summaryStripLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginBottom: 4,
  },
  summaryStripValue: {
    color: BRAND_BLUE_DARK,
    fontSize: 16,
    fontWeight: '900',
  },
  summaryStripDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#D2DDF3',
    marginHorizontal: 14,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FEEBEC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    color: '#B91C1C',
    fontWeight: '700',
    marginLeft: 8,
  },
  warningTextSmall: {
    color: '#B91C1C',
    marginTop: 10,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusPendingBadge: {
    backgroundColor: '#FFF4D7',
  },
  statusError: {
    backgroundColor: '#FEEBEC',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusPendingText: {
    color: '#9A6400',
  },
  statusErrorText: {
    color: '#B91C1C',
  },
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  metricLabel: {
    color: BRAND_DARK,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  metricValue: {
    color: BRAND_DARK,
    fontSize: 18,
    fontWeight: '900',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 20,
    padding: 15,
    marginTop: 14,
  },
  historyLeft: {
    flex: 1,
    paddingRight: 10,
  },
  historyMerchant: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  historyMeta: {
    color: TEXT_SECONDARY,
    fontSize: 13,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  positive: {
    color: '#14804A',
  },
  negative: {
    color: '#B91C1C',
  },
  historyStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyCompleted: {
    backgroundColor: '#DCFCE7',
  },
  historyPending: {
    backgroundColor: '#FFF4D7',
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  historyCompletedText: {
    color: '#166534',
  },
  softPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  earningsHero: {
    backgroundColor: '#FFF7E8',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  earningsLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginBottom: 8,
  },
  earningsValue: {
    color: '#05603A',
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 6,
  },
  earningsHint: {
    color: '#8A6500',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#DCE4F3',
    marginVertical: 18,
  },
  profileMessage: {
    color: BRAND_BLUE_DARK,
    fontWeight: '800',
    marginTop: 10,
  },
  logoutWideButton: {
    backgroundColor: BRAND_DARK,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 2,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutWideText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#111827',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
  },
  bottomTabIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F7',
    marginBottom: 6,
  },
  bottomTabIconSelected: {
    backgroundColor: BRAND_BLUE,
  },
  bottomTabLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomTabLabelSelected: {
    color: BRAND_BLUE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.58)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  modalCopy: {
    color: TEXT_SECONDARY,
    lineHeight: 21,
    marginBottom: 16,
  },
  modalHint: {
    color: '#8A6500',
    fontWeight: '700',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
  },
  modalButtonSpacing: {
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.45,
  },
  errorText: {
    color: '#B91C1C',
    marginBottom: 10,
    fontWeight: '700',
  },
});
