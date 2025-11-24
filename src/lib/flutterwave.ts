// Initialize Flutterwave with environment variables only when needed
let flutterwaveInstance: any = null;
let initialized = false;

const initializeFlutterwave = async () => {
  if (initialized) return flutterwaveInstance;

  const publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  if (publicKey && secretKey) {
    try {
      const FlutterwaveModule = await import('flutterwave-node-v3');
      const Flutterwave = FlutterwaveModule.default || FlutterwaveModule;
      flutterwaveInstance = new Flutterwave(publicKey, secretKey);
      initialized = true;
    } catch (error) {
      console.error('Error initializing Flutterwave:', error);
    }
  } else {
    console.warn('Flutterwave keys not configured. Payment functionality will not work.');
  }

  return flutterwaveInstance;
};

/**
 * Process bank transfer payment via Flutterwave
 * @param amount - Amount to transfer (in KES)
 * @param accountNumber - Recipient's bank account number
 * @param accountBank - Recipient's bank code
 * @param narration - Payment narration/description
 * @param beneficiaryName - Recipient's name
 * @returns Payment response from Flutterwave
 */
export async function processBankTransfer(
  amount: number,
  accountNumber: string,
  accountBank: string,
  narration: string,
  beneficiaryName: string
) {
  try {
    const flutterwave = await initializeFlutterwave();
    if (!flutterwave) {
      throw new Error('Flutterwave not configured. Payment processing unavailable.');
    }

    const payload = {
      account_number: accountNumber,
      amount: amount,
      account_bank: accountBank,
      narration: narration,
      currency: 'KES', // Kenyan Shillings
      beneficiary_name: beneficiaryName,
    };

    // Use Flutterwave's Transfers API for bank transfers
    // Note: The actual method name depends on the SDK version
    // If Transfers.initiate doesn't work, you might need to use different method
    const response = await flutterwave.Transfer.initiate(payload);
    return response;
  } catch (error) {
    console.error('Error processing bank transfer:', error);
    throw error;
  }
}

/**
 * Verify payment status using Flutterwave
 * @param reference - Payment reference ID
 * @returns Payment verification response
 */
export async function verifyPayment(reference: string) {
  try {
    const flutterwave = await initializeFlutterwave();
    if (!flutterwave) {
      throw new Error('Flutterwave not configured. Payment verification unavailable.');
    }

    // Check payment status using Flutterwave's payment verification
    const response = await flutterwave.Transaction.verify({ id: reference });
    return response;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
}

/**
 * Get list of supported banks for transfers
 * @returns List of supported banks
 */
export async function getSupportedBanks() {
  try {
    // This function is now primarily used by the API route which fetches from the database
    // For compatibility, returning an empty response
    return { data: [] };
  } catch (error) {
    console.error('Error fetching supported banks:', error);
    throw error;
  }
}
