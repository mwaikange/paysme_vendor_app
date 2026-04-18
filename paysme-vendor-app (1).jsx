import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogOut, Menu, X, Lock, User, Wallet, History, Settings, ArrowRight, Check, AlertCircle, Send } from 'lucide-react';

const PaySMEVendorApp = () => {
  const [authState, setAuthState] = useState('login'); // login, main
  const [currentPage, setCurrentPage] = useState('process'); // process, history, topup, profile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ vendorId: '', password: '' });

  // Mock vendor data
  const [vendor, setVendor] = useState({
    id: 'VND-2024-001',
    name: 'Tech Solutions Ltd',
    type: 'prepaid', // prepaid or loan
    creditBalance: 5000,
    feeEarned: 1250,
    loanBalance: 0,
    pin: '12345',
    email: 'vendor@techsolutions.com',
    phone: '+264 81 808 3704',
    password: 'password123'
  });

  const [processHistory, setProcessHistory] = useState([
    { id: 1, merchant: 'Merchant A', amount: 500, status: 'completed', date: '2024-01-15', type: 'payment' },
    { id: 2, merchant: 'Merchant B', amount: 1200, status: 'completed', date: '2024-01-14', type: 'payment' },
    { id: 3, merchant: 'Merchant C', amount: 750, status: 'pending', date: '2024-01-13', type: 'payment' }
  ]);

  const [currentProcess, setCurrentProcess] = useState({
    invoiceToken: '',
    // These will be populated from "database" when token is entered
    merchant: '',
    amount: '',
    email: '',
    mobile: '',
    code: '',
    status: 'pending'
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mock database of invoice tokens
  const invoiceDatabase = {
    '6511-3189-3736': {
      merchant: 'PaySME',
      business: 'PaySME Inc',
      amount: 500,
      code: '6511-3189-3736',
      email: 'aqua@mwaikange.com',
      mobile: '+264 81 808 3704',
      status: 'pending'
    },
    '1234-5678-9012': {
      merchant: 'Tech Solutions',
      business: 'TechSolutions Ltd',
      amount: 1200,
      code: '1234-5678-9012',
      email: 'vendor@techsolutions.com',
      mobile: '+264 81 234 5678',
      status: 'pending'
    },
    '9876-5432-1098': {
      merchant: 'Digital Store',
      business: 'Digital Retail Corp',
      amount: 750,
      code: '9876-5432-1098',
      email: 'store@digital.com',
      mobile: '+264 81 987 6543',
      status: 'pending'
    }
  };
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [topupAmount, setTopupAmount] = useState('');
  const [showTopupConfirm, setShowTopupConfirm] = useState(false);

  const [passwordSettings, setPasswordSettings] = useState({ old: '', new: '', confirm: '' });
  const [pinSettings, setPinSettings] = useState({ old: '', new: '', confirm: '' });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  const [showLoanApplication, setShowLoanApplication] = useState(false);
  const [loanAppData, setLoanAppData] = useState({ idFile: '', incomeFile: '' });

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.vendorId && loginData.password) {
      if (loginData.password === vendor.password) {
        setAuthState('main');
      } else {
        alert('Invalid credentials');
      }
    }
  };

  const handleLogout = () => {
    setAuthState('login');
    setLoginData({ vendorId: '', password: '' });
    setCurrentPage('process');
  };

  const handleInvoiceTokenLookup = (token) => {
    setCurrentProcess({ ...currentProcess, invoiceToken: token });
    
    if (token.length === 0) {
      setCurrentProcess({
        invoiceToken: '',
        merchant: '',
        amount: '',
        email: '',
        mobile: '',
        code: '',
        status: 'pending'
      });
      return;
    }

    // Look up in database
    const invoiceData = invoiceDatabase[token];
    if (invoiceData) {
      setCurrentProcess({
        invoiceToken: token,
        merchant: invoiceData.merchant,
        amount: invoiceData.amount,
        email: invoiceData.email,
        mobile: invoiceData.mobile,
        code: invoiceData.code,
        status: invoiceData.status
      });
    } else {
      setCurrentProcess({
        invoiceToken: token,
        merchant: 'Not found',
        amount: 0,
        email: '',
        mobile: '',
        code: token,
        status: 'error'
      });
    }
  };

  const handleShowConfirmation = () => {
    if (!currentProcess.invoiceToken) {
      alert('Please enter an invoice token');
      return;
    }
    
    const invoiceData = invoiceDatabase[currentProcess.invoiceToken];
    if (!invoiceData) {
      alert('Invoice token not found');
      return;
    }

    if (invoiceData.amount > vendor.creditBalance) {
      alert('Insufficient credit balance for this transaction');
      return;
    }

    setShowConfirmModal(true);
  };

  const [showPinModal, setShowPinModal] = useState(false);

  const validatePin = () => {
    if (enteredPin === vendor.pin) {
      const feeAmount = currentProcess.amount * (vendor.type === 'prepaid' ? 0.05 : 0.04);
      const newBalance = vendor.creditBalance - currentProcess.amount;
      
      setVendor({
        ...vendor,
        creditBalance: newBalance,
        feeEarned: vendor.feeEarned + feeAmount
      });

      setProcessHistory([
        {
          id: processHistory.length + 1,
          merchant: currentProcess.merchant,
          amount: currentProcess.amount,
          status: 'completed',
          date: new Date().toISOString().split('T')[0],
          type: 'payment',
          invoiceCode: currentProcess.code
        },
        ...processHistory
      ]);

      setCurrentProcess({
        invoiceToken: '',
        merchant: '',
        amount: '',
        email: '',
        mobile: '',
        code: '',
        status: 'pending'
      });
      setShowPinModal(false);
      setShowConfirmModal(false);
      setEnteredPin('');
      setPinError('');
      alert('Payment processed successfully!');
    } else {
      setPinError('Invalid PIN');
    }
  };

  const handleTopup = () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      alert('Enter valid amount');
      return;
    }
    setShowTopupConfirm(true);
  };

  const confirmTopup = () => {
    const amount = parseFloat(topupAmount);
    const fee = amount * 0.05;
    const payAmount = amount - fee;

    setVendor({
      ...vendor,
      creditBalance: vendor.creditBalance + amount
    });

    setProcessHistory([
      {
        id: processHistory.length + 1,
        merchant: 'PaySME - Credit Top Up',
        amount: -payAmount,
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        type: 'topup'
      },
      ...processHistory
    ]);

    setTopupAmount('');
    setShowTopupConfirm(false);
    alert(`Topup successful! You saved N$${fee.toFixed(2)}`);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Enter valid amount');
      return;
    }
    if (parseFloat(withdrawAmount) > vendor.feeEarned) {
      alert('Insufficient earned fees');
      return;
    }
    setShowWithdrawConfirm(true);
  };

  const confirmWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    const userPayout = amount * 0.5;
    const loanPayment = amount * 0.5;

    setVendor({
      ...vendor,
      feeEarned: vendor.feeEarned - amount,
      loanBalance: Math.max(0, vendor.loanBalance - loanPayment)
    });

    setProcessHistory([
      {
        id: processHistory.length + 1,
        merchant: 'Fee Withdrawal',
        amount: userPayout,
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        type: 'withdrawal'
      },
      ...processHistory
    ]);

    setWithdrawAmount('');
    setShowWithdrawConfirm(false);
    alert(`Withdrawal successful! You received N$${userPayout.toFixed(2)}`);
  };

  const updatePassword = () => {
    if (passwordSettings.new !== passwordSettings.confirm) {
      setSettingsMessage('Passwords do not match');
      return;
    }
    if (passwordSettings.old === vendor.password) {
      setVendor({ ...vendor, password: passwordSettings.new });
      setPasswordSettings({ old: '', new: '', confirm: '' });
      setSettingsMessage('Password updated successfully');
      setTimeout(() => setSettingsMessage(''), 3000);
    } else {
      setSettingsMessage('Current password is incorrect');
    }
  };

  const updatePin = () => {
    if (pinSettings.new !== pinSettings.confirm) {
      setSettingsMessage('PINs do not match');
      return;
    }
    setShowOtpModal(true);
  };

  const confirmPinUpdate = () => {
    if (otpCode === '123456') {
      setVendor({ ...vendor, pin: pinSettings.new });
      setPinSettings({ old: '', new: '', confirm: '' });
      setOtpCode('');
      setShowOtpModal(false);
      setSettingsMessage('PIN updated successfully');
      setTimeout(() => setSettingsMessage(''), 3000);
    } else {
      setSettingsMessage('Invalid OTP');
    }
  };

  const handleLoanApplication = () => {
    if (!loanAppData.idFile || !loanAppData.incomeFile) {
      alert('Please upload both documents');
      return;
    }
    setVendor({ ...vendor, type: 'loan', loanBalance: 5000 });
    setShowLoanApplication(false);
    setLoanAppData({ idFile: '', incomeFile: '' });
    alert('Loan application submitted!');
  };

  if (authState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0052CC] via-[#003366] to-[#001a4d] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {/* PaySME Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-[#0052CC] rounded-sm"></div>
              </div>
              <span className="text-3xl font-bold text-white tracking-wide">PaySME</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Vendor Portal</h2>
            <p className="text-blue-100">Manage your token credits & transactions</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 shadow-2xl space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vendor ID</label>
              <input
                type="text"
                placeholder="VND-2024-001"
                value={loginData.vendorId}
                onChange={(e) => setLoginData({ ...loginData, vendorId: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#0052CC] to-[#003366] text-white font-bold py-4 rounded-lg hover:shadow-lg transform hover:scale-105 transition duration-200 text-lg"
            >
              Login to Dashboard
            </button>

            <div className="pt-4 mt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials</p>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 space-y-1">
                <p><span className="font-semibold">ID:</span> VND-2024-001</p>
                <p><span className="font-semibold">Password:</span> password123</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-[#0052CC] to-[#003366] text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h2 className="text-lg font-bold">PaySME</h2>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-white/10 p-2 rounded">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6">
          <NavItem icon={<Send size={20} />} label="Process Payment" page="process" onClick={() => setCurrentPage('process')} sidebarOpen={sidebarOpen} active={currentPage === 'process'} />
          <NavItem icon={<History size={20} />} label="History" page="history" onClick={() => setCurrentPage('history')} sidebarOpen={sidebarOpen} active={currentPage === 'history'} />
          <NavItem icon={<Wallet size={20} />} label="Credits & Fees" page="topup" onClick={() => setCurrentPage('topup')} sidebarOpen={sidebarOpen} active={currentPage === 'topup'} />
          <NavItem icon={<Settings size={20} />} label="Settings" page="profile" onClick={() => setCurrentPage('profile')} sidebarOpen={sidebarOpen} active={currentPage === 'profile'} />
        </nav>

        <div className="p-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 hover:bg-white/10 p-2 rounded transition"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 px-8 py-6 flex justify-between items-center sticky top-0 z-20 shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {currentPage === 'process' && 'Process Payment'}
              {currentPage === 'history' && 'Transaction History'}
              {currentPage === 'topup' && 'Credits & Fees'}
              {currentPage === 'profile' && 'Settings'}
            </h1>
            <p className="text-blue-100 mt-1">Vendor ID: {vendor.id}</p>
          </div>

          {/* Credit Balance Card */}
          <div className="text-right">
            <p className="text-sm text-blue-100 mb-1">Available Credits</p>
            <p className="text-4xl font-bold text-white">N${vendor.creditBalance.toFixed(2)}</p>
            {vendor.type === 'loan' && vendor.loanBalance > 0 && (
              <p className="text-sm text-red-300 mt-1">Loan Balance: N${vendor.loanBalance.toFixed(2)}</p>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8 bg-blue-50">
          {/* Process Payment Page */}
          {currentPage === 'process' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Vendor Type:</span> {vendor.type === 'prepaid' ? 'Prepaid (5% fee discount)' : 'Loan Vendor (4% commission)'}
                  </p>
                </div>

                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Token</label>
                    <input
                      type="text"
                      placeholder="e.g., 6511-3189-3736"
                      value={currentProcess.invoiceToken}
                      onChange={(e) => handleInvoiceTokenLookup(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-lg tracking-wide"
                    />
                    <p className="text-xs text-gray-500 mt-2">Enter the invoice token to fetch payment details</p>
                  </div>

                  {currentProcess.invoiceToken && (
                    <div className="p-6 bg-blue-100 rounded-lg border-2 border-blue-400">
                      <h3 className="font-bold text-gray-900 mb-4">Payment Details</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Merchant:</span>
                          <span className="font-semibold text-gray-900">{currentProcess.merchant || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Business:</span>
                          <span className="font-semibold text-gray-900">{currentProcess.merchant || '-'}</span>
                        </div>
                        <div className="flex justify-between border-t pt-3">
                          <span className="text-gray-600 font-semibold">Amount:</span>
                          <span className={`text-2xl font-bold ${currentProcess.status === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                            {currentProcess.status === 'error' ? '❌ Not Found' : `N$${currentProcess.amount}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Invoice Code:</span>
                          <span className="font-mono text-gray-900">{currentProcess.code || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client Email:</span>
                          <span className="font-semibold text-gray-900 text-sm">{currentProcess.email || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client Mobile:</span>
                          <span className="font-semibold text-gray-900">{currentProcess.mobile || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${currentProcess.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {currentProcess.status}
                          </span>
                        </div>
                      </div>

                      {currentProcess.status !== 'error' && (
                        <div className="mt-6 pt-6 border-t-2 border-gray-300">
                          <div className="flex justify-between mb-4">
                            <span className="font-semibold text-gray-700">Fee You'll Earn:</span>
                            <span className="text-xl font-bold text-green-600">
                              N${(currentProcess.amount * (vendor.type === 'prepaid' ? 0.05 : 0.04)).toFixed(2)}
                            </span>
                          </div>

                          {currentProcess.amount > vendor.creditBalance && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm flex items-center gap-2">
                              <AlertCircle size={16} />
                              Insufficient credit balance
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleShowConfirmation}
                            disabled={currentProcess.status === 'error' || currentProcess.amount > vendor.creditBalance}
                            className="w-full bg-gradient-to-r from-[#0052CC] to-[#003366] text-white font-bold py-4 rounded-lg hover:shadow-lg transform hover:scale-105 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check size={20} /> Confirm Payment
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* History Page */}
          {currentPage === 'history' && (
            <div className="max-w-4xl">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-blue-600 text-white border-b-2 border-blue-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Merchant</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-white">Type</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-white">Amount</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-white">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processHistory.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-blue-50 transition">
                          <td className="px-6 py-4 text-sm text-gray-700">{item.date}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.merchant}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 capitalize">{item.type}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-right">
                            <span className={item.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                              {item.amount < 0 ? '-' : '+'}N${Math.abs(item.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Credits & Fees Page */}
          {currentPage === 'topup' && (
            <div className="max-w-4xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Credit Top Up */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Top Up Credits</h3>
                  <p className="text-sm text-gray-600 mb-4">Get 5% instant discount on all top-ups</p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (N$)</label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {topupAmount && (
                    <div className="mb-4 p-3 bg-blue-100 rounded text-sm border border-blue-300">
                      <div className="flex justify-between mb-1">
                        <span>Amount:</span>
                        <span className="font-semibold">N${parseFloat(topupAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Discount (5%):</span>
                        <span className="font-semibold text-green-600">-N${(parseFloat(topupAmount) * 0.05).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-100 pt-1 mt-1">
                        <span className="font-semibold">You Pay:</span>
                        <span className="font-bold text-blue-600">N${(parseFloat(topupAmount) * 0.95).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleTopup}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"
                  >
                    Top Up Credits
                  </button>
                </div>

                {/* Fees Earned */}
                <div className={`rounded-xl shadow-lg p-8 ${vendor.type === 'prepaid' ? 'bg-white border-2 border-blue-300' : 'bg-white'}`}>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Fees Earned</h3>
                  <div className="mb-6 p-4 bg-blue-100 rounded-lg border border-blue-300">
                    <p className="text-sm text-gray-600 mb-2">Total Fees</p>
                    <p className="text-4xl font-bold text-green-600">N${vendor.feeEarned.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-2">Commission: {vendor.type === 'prepaid' ? '5%' : '4%'}</p>
                  </div>

                  {vendor.type === 'prepaid' ? (
                    <div className="p-3 bg-blue-200 border border-blue-400 rounded text-sm text-blue-900 font-semibold">
                      <p className="font-semibold mb-1">Prepaid Vendor</p>
                      <p>Fees are automatically added to your credit balance</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Withdraw Amount (N$)</label>
                        <input
                          type="number"
                          placeholder="Enter amount"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {withdrawAmount && (
                        <div className="mb-4 p-3 bg-blue-100 rounded text-sm border border-blue-300">
                          <div className="flex justify-between mb-1">
                            <span>Withdraw:</span>
                            <span className="font-semibold">N${parseFloat(withdrawAmount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span>You receive (50%):</span>
                            <span className="font-semibold text-green-600">N${(parseFloat(withdrawAmount) * 0.5).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                            <span>Loan payment (50%):</span>
                            <span className="font-semibold text-red-600">N${(parseFloat(withdrawAmount) * 0.5).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleWithdraw}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"
                      >
                        Withdraw Fees
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Loan Info for Loan Vendors */}
              {vendor.type === 'loan' && vendor.loanBalance > 0 && (
                <div className="bg-white border-2 border-blue-500 rounded-xl p-8 shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Active Loan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Loan Balance</p>
                      <p className="text-3xl font-bold text-blue-600">N${vendor.loanBalance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Interest Rate</p>
                      <p className="text-3xl font-bold text-gray-900">4%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Settings Page */}
          {currentPage === 'profile' && (
            <div className="max-w-2xl space-y-6">
              {/* Vendor Info */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Vendor Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Business Name</p>
                    <p className="text-lg font-semibold text-gray-900">{vendor.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vendor ID</p>
                    <p className="text-lg font-semibold text-gray-900">{vendor.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vendor Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{vendor.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-lg font-semibold text-gray-900">{vendor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-lg font-semibold text-gray-900">{vendor.phone}</p>
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Lock size={20} /> Change Password
                </h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordSettings.old}
                      onChange={(e) => setPasswordSettings({ ...passwordSettings, old: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordSettings.new}
                      onChange={(e) => setPasswordSettings({ ...passwordSettings, new: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={passwordSettings.confirm}
                      onChange={(e) => setPasswordSettings({ ...passwordSettings, confirm: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={updatePassword}
                  className="w-full bg-gradient-to-r from-[#0052CC] to-[#003366] text-white font-bold py-3 rounded-lg hover:shadow-lg transition"
                >
                  Update Password
                </button>
              </div>

              {/* Update PIN */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Lock size={20} /> Update 5-Digit PIN
                </h3>
                <p className="text-sm text-gray-600 mb-4">Your PIN is required to process payments</p>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current PIN</label>
                    <input
                      type="password"
                      maxLength="5"
                      value={pinSettings.old}
                      onChange={(e) => setPinSettings({ ...pinSettings, old: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 tracking-widest text-center text-2xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">New PIN</label>
                    <input
                      type="password"
                      maxLength="5"
                      value={pinSettings.new}
                      onChange={(e) => setPinSettings({ ...pinSettings, new: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 tracking-widest text-center text-2xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm PIN</label>
                    <input
                      type="password"
                      maxLength="5"
                      value={pinSettings.confirm}
                      onChange={(e) => setPinSettings({ ...pinSettings, confirm: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 tracking-widest text-center text-2xl"
                    />
                  </div>
                </div>
                <button
                  onClick={updatePin}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"
                >
                  Update PIN
                </button>
              </div>

              {/* Loan Application */}
              {vendor.type === 'prepaid' && (
                <div className="bg-blue-500 border-2 border-blue-600 rounded-xl p-8 shadow-lg text-white">
                  <h3 className="text-xl font-bold text-white mb-4">Apply for Loan Vendor Status</h3>
                  <p className="text-sm text-blue-100 mb-6">Get credit loans starting from N$5000. Earn 4% commission on each transaction.</p>
                  <button
                    onClick={() => setShowLoanApplication(true)}
                    className="w-full bg-white text-blue-600 font-bold py-3 rounded-lg hover:shadow-lg transition"
                  >
                    Apply Now
                  </button>
                </div>
              )}

              {settingsMessage && (
                <div className={`p-4 rounded-lg text-sm font-semibold ${settingsMessage.includes('successfully') ? 'bg-blue-200 text-blue-900 border border-blue-400' : 'bg-blue-200 text-blue-900 border border-blue-400'}`}>
                  {settingsMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal - Shows payment details */}
      {showConfirmModal && (
        <Modal onClose={() => setShowConfirmModal(false)}>
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 rounded-xl p-8 max-w-md w-full border border-blue-300">
            <div className="text-center mb-6">
              <div className="inline-block bg-green-100 rounded-full p-4 mb-4">
                <Check size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Confirm Payment</h2>
              <p className="text-gray-600 mt-2">Please review the payment details</p>
            </div>

            <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Merchant:</span>
                <span className="font-semibold text-gray-900">{currentProcess.merchant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Business:</span>
                <span className="font-semibold text-gray-900">{currentProcess.merchant}</span>
              </div>
              <div className="border-t border-gray-300 pt-4 flex justify-between">
                <span className="text-gray-600 font-semibold">Amount:</span>
                <span className="text-xl font-bold text-blue-600">N${currentProcess.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Code:</span>
                <span className="font-mono text-sm text-gray-900">{currentProcess.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client Email:</span>
                <span className="font-semibold text-gray-900 text-sm">{currentProcess.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client Mobile:</span>
                <span className="font-semibold text-gray-900">{currentProcess.mobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Pending</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowConfirmModal(false);
                setShowPinModal(true);
              }}
              className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition mb-3"
            >
              Confirm Payment
            </button>

            <button
              onClick={() => setShowConfirmModal(false)}
              className="w-full border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* PIN Validation Modal */}
      {showPinModal && (
        <Modal onClose={() => { setShowPinModal(false); setEnteredPin(''); setPinError(''); }}>
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Personal PIN</h2>
            <p className="text-gray-600 mb-6">Enter your 5-digit PIN to authorize this transaction</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600 mb-1">Transaction Amount</div>
              <div className="text-3xl font-bold text-blue-600">N${currentProcess.amount}</div>
              <div className="text-xs text-gray-500 mt-2">{currentProcess.merchant}</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Personal PIN (5 digits)</label>
              <input
                type="password"
                maxLength="5"
                placeholder="•••••"
                value={enteredPin}
                onChange={(e) => { setEnteredPin(e.target.value); setPinError(''); }}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-center text-4xl tracking-widest font-bold mb-2"
              />
              {pinError && <p className="text-red-600 text-sm mb-4 text-center font-semibold">{pinError}</p>}
            </div>

            <p className="text-xs text-gray-500 text-center mb-6">Demo PIN: 12345</p>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPinModal(false); setEnteredPin(''); setPinError(''); }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={validatePin}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Authorize
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Topup Confirmation Modal */}
      {showTopupConfirm && (
        <Modal onClose={() => setShowTopupConfirm(false)}>
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Credit Top Up</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Credit Amount:</span>
                <span className="font-semibold">N${parseFloat(topupAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount (5%):</span>
                <span className="font-semibold">-N${(parseFloat(topupAmount) * 0.05).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>You Pay:</span>
                <span className="text-blue-600">N${(parseFloat(topupAmount) * 0.95).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTopupConfirm(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmTopup}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawConfirm && (
        <Modal onClose={() => setShowWithdrawConfirm(false)}>
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Withdrawal</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Withdraw Amount:</span>
                <span className="font-semibold">N${parseFloat(withdrawAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>You Receive (50%):</span>
                <span className="font-semibold">N${(parseFloat(withdrawAmount) * 0.5).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Loan Payment (50%):</span>
                <span className="font-semibold">N${(parseFloat(withdrawAmount) * 0.5).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawConfirm(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmWithdraw}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* OTP Modal for PIN Update */}
      {showOtpModal && (
        <Modal onClose={() => setShowOtpModal(false)}>
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify with SMS OTP</h2>
            <p className="text-gray-600 mb-6">Enter the OTP sent to {vendor.phone}</p>
            
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-center text-2xl tracking-widest mb-6"
            />
            <p className="text-xs text-gray-500 text-center mb-6">Demo OTP: 123456</p>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowOtpModal(false); setOtpCode(''); }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPinUpdate}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Verify
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Loan Application Modal */}
      {showLoanApplication && (
        <Modal onClose={() => setShowLoanApplication(false)}>
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Apply for Loan Vendor</h2>
            <p className="text-gray-600 mb-6">Upload required documents to get started</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ID Document</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="file"
                    onChange={(e) => setLoanAppData({ ...loanAppData, idFile: e.target.files?.[0]?.name || '' })}
                    className="hidden"
                    id="idFile"
                  />
                  <label htmlFor="idFile" className="cursor-pointer">
                    <p className="text-sm text-gray-600">{loanAppData.idFile || 'Click to upload'}</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Proof of Income</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="file"
                    onChange={(e) => setLoanAppData({ ...loanAppData, incomeFile: e.target.files?.[0]?.name || '' })}
                    className="hidden"
                    id="incomeFile"
                  />
                  <label htmlFor="incomeFile" className="cursor-pointer">
                    <p className="text-sm text-gray-600">{loanAppData.incomeFile || 'Click to upload'}</p>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLoanApplication(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLoanApplication}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Apply
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Helper Components
const NavItem = ({ icon, label, page, onClick, sidebarOpen, active }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      active
        ? 'bg-white/20 text-white'
        : 'hover:bg-white/10 text-white/80 hover:text-white'
    }`}
  >
    {icon}
    {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
  </button>
);

const Modal = ({ onClose, children }) => (
  <div
    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export default PaySMEVendorApp;