/**
 * lib/api.js
 * All Supabase + Edge Function calls for PaySME Vendor App
 */
import { supabase, WEBHOOK_URL } from './supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const webhookPost = async (body) => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || 'Request failed');
  return json;
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * Login with vendor_code + password (maps to Supabase email auth).
 * The vendor's email is stored in vendors.email.
 * We look up the vendor by vendor_code first, then sign in with their email.
 */
export const loginVendor = async (vendorCode, password) => {
  // 1. Look up email for this vendor_code
  const { data: vendorRow, error: lookupError } = await supabase
    .from('vendors')
    .select('email, vendor_id, vendor_code, full_name, vendor_type, token_balance, fee_balance, commission_rate, mobile_number')
    .eq('vendor_code', vendorCode)
    .eq('is_active', true)
    .single();

  if (lookupError || !vendorRow) throw new Error('Vendor ID not found or inactive.');

  // 2. Sign in with Supabase auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: vendorRow.email,
    password,
  });

  if (authError) throw new Error('Invalid credentials.');

  // 3. Fetch full vendor profile including advance
  const profile = await fetchVendorProfile(vendorRow.vendor_id);
  return profile;
};

export const logoutVendor = async () => {
  await supabase.auth.signOut();
};

// ─── VENDOR PROFILE ───────────────────────────────────────────────────────────

export const fetchVendorProfile = async (vendorId) => {
  const { data, error } = await supabase
    .from('vendors')
    .select(`
      vendor_id,
      vendor_code,
      full_name,
      email,
      mobile_number,
      vendor_type,
      token_balance,
      fee_balance,
      commission_rate,
      kyc_status,
      is_active,
      vendor_token_advances (
        advance_id,
        original_amount,
        interest_rate,
        total_repayable,
        balance_remaining,
        min_installment,
        term_months,
        status,
        last_payment_date,
        last_payment_amount,
        total_paid,
        payment_count
      )
    `)
    .eq('vendor_id', vendorId)
    .single();

  if (error) throw new Error(error.message);

  // Shape the advance (most recent active one, or null)
  const advances = data.vendor_token_advances || [];
  const activeAdvance = advances.find(a => a.status === 'active') ||
                        advances.find(a => a.status === 'paid_up') ||
                        advances[0] || null;

  return {
    vendor_id:      data.vendor_id,
    id:             data.vendor_code,
    name:           data.full_name,
    email:          data.email,
    phone:          data.mobile_number,
    type:           data.vendor_type,           // 'prepaid' | 'credit'
    creditBalance:  Number(data.token_balance),
    feeEarned:      Number(data.fee_balance),
    commissionRate: Number(data.commission_rate),
    kyc_status:     data.kyc_status,
    // Advance fields
    advanceBalance:      activeAdvance ? Number(activeAdvance.balance_remaining) : 0,
    advanceStatus:       activeAdvance?.status ?? 'none',
    advanceInterest:     activeAdvance ? Number(activeAdvance.interest_rate) : 0.10,
    advanceLastPaid:     activeAdvance?.last_payment_date?.split('T')[0] ?? null,
    advanceTotalPaid:    activeAdvance ? Number(activeAdvance.total_paid) : 0,
    advancePaymentCount: activeAdvance?.payment_count ?? 0,
    advanceTerm:         activeAdvance?.term_months ?? 0,
    advanceOriginal:     activeAdvance ? Number(activeAdvance.total_repayable) : 0,
    advanceId:           activeAdvance?.advance_id ?? null,
  };
};

// ─── REFRESH VENDOR BALANCES ──────────────────────────────────────────────────
// Call after any balance-changing operation to get latest numbers from DB
export const refreshVendorBalances = async (vendorId) => {
  const { data, error } = await supabase
    .from('vendors')
    .select('token_balance, fee_balance, vendor_token_advances(balance_remaining, total_paid, payment_count, last_payment_date, status)')
    .eq('vendor_id', vendorId)
    .single();

  if (error) throw new Error(error.message);

  const advances = data.vendor_token_advances || [];
  const activeAdvance = advances.find(a => a.status === 'active') ||
                        advances.find(a => a.status === 'paid_up') || null;

  return {
    creditBalance:       Number(data.token_balance),
    feeEarned:           Number(data.fee_balance),
    advanceBalance:      activeAdvance ? Number(activeAdvance.balance_remaining) : 0,
    advanceTotalPaid:    activeAdvance ? Number(activeAdvance.total_paid) : 0,
    advancePaymentCount: activeAdvance?.payment_count ?? 0,
    advanceLastPaid:     activeAdvance?.last_payment_date?.split('T')[0] ?? null,
    advanceStatus:       activeAdvance?.status ?? 'none',
  };
};

// ─── PAYMENT PROCESSING ───────────────────────────────────────────────────────

/**
 * Validate an invoice token — calls kiosk_lookup on existing edge function.
 * Returns transaction details or throws.
 */
export const validateInvoiceToken = async (generatedCode) => {
  const result = await webhookPost({
    action: 'kiosk_lookup',
    paymentCode: generatedCode,
  });

  const tx = result.transaction;
  return {
    invoiceToken: tx.generated_code,
    merchant:     tx.merchant_name || tx.business_name || 'Unknown',
    business:     tx.business_name || tx.merchant_name || 'Unknown',
    amount:       Number(tx.amount),
    email:        tx.user_email || '-',
    mobile:       tx.user_mobile || '-',
    code:         tx.generated_code,
    status:       tx.status,
  };
};

/**
 * Process a vendor payment — calls vendor_process_payment on edge function.
 * PIN is sent as plain text; the edge function verifies against stored pin_hash.
 * Returns { fee_earned, new_token_balance, new_fee_balance }
 */
export const processVendorPayment = async (vendorId, generatedCode, pin) => {
  const result = await webhookPost({
    action:         'vendor_process_payment',
    vendor_id:      vendorId,
    generated_code: generatedCode,
    pin_hash:       pin,   // edge function checks this against vendors.pin_hash
  });

  return {
    feeEarned:       Number(result.fee_earned),
    newTokenBalance: Number(result.new_token_balance),
    newFeeBalance:   Number(result.new_fee_balance),
    transactionId:   result.transaction_id,
    amount:          Number(result.amount),
    merchantName:    result.merchant_name,
  };
};

// ─── TRANSACTION HISTORY ─────────────────────────────────────────────────────

export const fetchVendorHistory = async (vendorId, limit = 100) => {
  const { data, error } = await supabase
    .from('vendor_transactions')
    .select('id, transaction_type, amount, status, generated_code, merchant_name, processed_at, notes')
    .eq('vendor_id', vendorId)
    .order('processed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data || []).map((item, idx) => ({
    id:       item.id || idx,
    merchant: item.merchant_name || item.transaction_type,
    amount:   Number(item.amount),
    status:   item.status,
    date:     item.processed_at?.split('T')[0] ?? '',
    type:     item.transaction_type,
    code:     item.generated_code || '',
  }));
};

// ─── TOKEN TOPUP ──────────────────────────────────────────────────────────────

export const recordTopup = async (vendorId, amountRequested, vendorType) => {
  const discount      = vendorType === 'prepaid' ? amountRequested * 0.05 : 0;
  const amountCredited = amountRequested;
  const amountPaid    = amountRequested - discount;

  // 1. Record the topup
  const { error: topupError } = await supabase
    .from('vendor_topup_credits')
    .insert({
      vendor_id:        vendorId,
      topup_type:       'prepaid',
      amount_requested: amountRequested,
      amount_credited:  amountCredited,
      discount_applied: discount,
      amount_paid:      amountPaid,
      status:           'completed',
    });

  if (topupError) throw new Error(topupError.message);

  // 2. Update vendor token_balance
  const { error: balError } = await supabase.rpc('increment_vendor_token_balance', {
    p_vendor_id: vendorId,
    p_amount:    amountCredited,
  });

  // Fallback if RPC doesn't exist — direct update using current balance
  if (balError) {
    const { data: current } = await supabase
      .from('vendors')
      .select('token_balance')
      .eq('vendor_id', vendorId)
      .single();

    await supabase
      .from('vendors')
      .update({ token_balance: Number(current.token_balance) + amountCredited, updated_at: new Date().toISOString() })
      .eq('vendor_id', vendorId);
  }

  // 3. Insert vendor transaction record
  await supabase.from('vendor_transactions').insert({
    vendor_id:        vendorId,
    transaction_type: 'TopUp',
    amount:           amountCredited,
    status:           'completed',
    merchant_name:    'Token Balance Purchase',
  });

  return { amountCredited, amountPaid, discount };
};

// ─── INSTALLMENT PAYMENT ─────────────────────────────────────────────────────

export const payInstallment = async (vendorId, advanceId, amount) => {
  // 1. Update advance balance
  const { data: advance, error: advError } = await supabase
    .from('vendor_token_advances')
    .select('balance_remaining, total_paid, payment_count')
    .eq('advance_id', advanceId)
    .single();

  if (advError) throw new Error(advError.message);

  const newBalance = Math.max(0, Number(advance.balance_remaining) - amount);
  const newStatus  = newBalance === 0 ? 'paid_up' : 'active';

  const { error: updateAdvError } = await supabase
    .from('vendor_token_advances')
    .update({
      balance_remaining:   newBalance,
      total_paid:          Number(advance.total_paid) + amount,
      payment_count:       Number(advance.payment_count) + 1,
      last_payment_date:   new Date().toISOString(),
      last_payment_amount: amount,
      status:              newStatus,
      updated_at:          new Date().toISOString(),
    })
    .eq('advance_id', advanceId);

  if (updateAdvError) throw new Error(updateAdvError.message);

  // 2. Deduct from fee_balance (installments come from fee balance)
  const { data: vendor } = await supabase
    .from('vendors')
    .select('fee_balance')
    .eq('vendor_id', vendorId)
    .single();

  await supabase
    .from('vendors')
    .update({
      fee_balance: Math.max(0, Number(vendor.fee_balance) - amount),
      updated_at:  new Date().toISOString(),
    })
    .eq('vendor_id', vendorId);

  // 3. Insert transaction record
  await supabase.from('vendor_transactions').insert({
    vendor_id:        vendorId,
    transaction_type: 'Installment Payment (Advance)',
    amount,
    status:           'completed',
    advance_id:       advanceId,
    merchant_name:    'Token Advance Installment',
  });

  return { newBalance, newStatus };
};

// ─── WITHDRAW FEES ────────────────────────────────────────────────────────────

export const withdrawFees = async (vendorId, advanceId, amount, vendorType) => {
  const isPrepaid  = vendorType === 'prepaid';
  const payout     = isPrepaid ? amount : parseFloat((amount * 0.5).toFixed(2));
  const repayment  = isPrepaid ? 0 : parseFloat((amount * 0.5).toFixed(2));

  // 1. Deduct from fee_balance
  const { data: vendor } = await supabase
    .from('vendors')
    .select('fee_balance')
    .eq('vendor_id', vendorId)
    .single();

  await supabase
    .from('vendors')
    .update({
      fee_balance: Math.max(0, Number(vendor.fee_balance) - amount),
      updated_at:  new Date().toISOString(),
    })
    .eq('vendor_id', vendorId);

  // 2. If credit vendor — reduce advance balance by repayment portion
  if (!isPrepaid && advanceId && repayment > 0) {
    const { data: adv } = await supabase
      .from('vendor_token_advances')
      .select('balance_remaining, total_paid, payment_count')
      .eq('advance_id', advanceId)
      .single();

    if (adv) {
      const newBalance = Math.max(0, Number(adv.balance_remaining) - repayment);
      await supabase
        .from('vendor_token_advances')
        .update({
          balance_remaining:   newBalance,
          total_paid:          Number(adv.total_paid) + repayment,
          payment_count:       Number(adv.payment_count) + 1,
          last_payment_date:   new Date().toISOString(),
          last_payment_amount: repayment,
          status:              newBalance === 0 ? 'paid_up' : 'active',
          updated_at:          new Date().toISOString(),
        })
        .eq('advance_id', advanceId);
    }
  }

  // 3. Insert withdrawal request record
  const { data: reqData, error: reqError } = await supabase
    .from('vendor_withdrawal_requests')
    .insert({
      vendor_id:        vendorId,
      amount_requested: amount,
      amount_payout:    payout,
      advance_repayment: repayment,
      status:           'pending',
    })
    .select()
    .single();

  if (reqError) throw new Error(reqError.message);

  // 4. Insert transaction rows
  const txRows = [
    {
      vendor_id:        vendorId,
      transaction_type: 'Withdrawal Request',
      amount:           payout,
      status:           'pending',
      advance_id:       null,
      merchant_name:    'Withdrawal Request',
    },
  ];

  if (!isPrepaid && repayment > 0) {
    txRows.push({
      vendor_id:        vendorId,
      transaction_type: 'Withdrawal Payment (Advance)',
      amount:           repayment,
      status:           'completed',
      advance_id:       advanceId,
      merchant_name:    'Advance Withdrawal Payment',
    });
  }

  await supabase.from('vendor_transactions').insert(txRows);

  return { payout, repayment, requestId: reqData.id };
};

// ─── PAY WITH FEES ────────────────────────────────────────────────────────────

export const payWithFees = async (vendorId, advanceId, amount) => {
  // 1. Deduct from fee_balance
  const { data: vendor } = await supabase
    .from('vendors')
    .select('fee_balance')
    .eq('vendor_id', vendorId)
    .single();

  await supabase
    .from('vendors')
    .update({
      fee_balance: Math.max(0, Number(vendor.fee_balance) - amount),
      updated_at:  new Date().toISOString(),
    })
    .eq('vendor_id', vendorId);

  // 2. Reduce advance balance
  const { data: adv } = await supabase
    .from('vendor_token_advances')
    .select('balance_remaining, total_paid, payment_count')
    .eq('advance_id', advanceId)
    .single();

  const newBalance = Math.max(0, Number(adv.balance_remaining) - amount);

  await supabase
    .from('vendor_token_advances')
    .update({
      balance_remaining:   newBalance,
      total_paid:          Number(adv.total_paid) + amount,
      payment_count:       Number(adv.payment_count) + 1,
      last_payment_date:   new Date().toISOString(),
      last_payment_amount: amount,
      status:              newBalance === 0 ? 'paid_up' : 'active',
      updated_at:          new Date().toISOString(),
    })
    .eq('advance_id', advanceId);

  // 3. Insert transaction record
  await supabase.from('vendor_transactions').insert({
    vendor_id:        vendorId,
    transaction_type: 'Fee Payment (Advance)',
    amount,
    status:           'completed',
    advance_id:       advanceId,
    merchant_name:    'Fee Advance Payment',
  });

  return { newBalance, newStatus: newBalance === 0 ? 'paid_up' : 'active' };
};

// ─── TOKEN ADVANCE APPLICATION ────────────────────────────────────────────────

export const submitAdvanceApplication = async (vendorId, requestedAmount, idDocumentUrl, incomeProofUrl, addressProofUrl) => {
  const totalRepayable = parseFloat((requestedAmount * 1.10).toFixed(2));
  const termMonths     = Math.ceil(totalRepayable / 250);

  const { error } = await supabase
    .from('vendor_kyc_applications')
    .insert({
      vendor_id:         vendorId,
      application_type:  'token_advance',
      id_document_url:   idDocumentUrl,
      income_proof_url:  incomeProofUrl,
      address_proof_url: addressProofUrl,
      requested_amount:  requestedAmount,
      total_repayable:   totalRepayable,
      term_months:       termMonths,
      status:            'pending',
    });

  if (error) throw new Error(error.message);

  return { totalRepayable, termMonths };
};

// ─── ADVANCE TOPUP REQUEST ────────────────────────────────────────────────────

export const submitAdvanceTopupRequest = async (vendorId, amount) => {
  const totalRepayable = parseFloat((amount * 1.10).toFixed(2));
  const termMonths     = Math.ceil(totalRepayable / 250);

  const { error } = await supabase
    .from('vendor_topup_credits')
    .insert({
      vendor_id:        vendorId,
      topup_type:       'advance_topup',
      amount_requested: amount,
      amount_credited:  amount,
      discount_applied: 0,
      amount_paid:      totalRepayable,
      status:           'pending',
    });

  if (error) throw new Error(error.message);

  return { totalRepayable, termMonths };
};

// ─── PASSWORD UPDATE ──────────────────────────────────────────────────────────

export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
};

// ─── PIN UPDATE ───────────────────────────────────────────────────────────────
// PIN is managed by PaySME admin via service_role.
// The vendor sends an OTP-verified request — this records the request.
// In production the edge function would hash and store the new PIN.
export const requestPinUpdate = async (vendorId, newPin, otpCode) => {
  if (otpCode !== '123456') throw new Error('Invalid OTP.');

  // In production: call a secure edge function to hash + store pin
  // For now: update pin_hash directly (only works if RLS allows — service_role needed in prod)
  const { error } = await supabase
    .from('vendors')
    .update({ pin_hash: newPin, updated_at: new Date().toISOString() })
    .eq('vendor_id', vendorId);

  if (error) throw new Error('PIN update failed. Contact support.');
};

// ─── SESSION CHECK ────────────────────────────────────────────────────────────

export const getActiveSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getSessionVendor = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('vendors')
    .select('vendor_id')
    .eq('auth_user_id', session.user.id)
    .single();

  if (error || !data) return null;
  return await fetchVendorProfile(data.vendor_id);
};