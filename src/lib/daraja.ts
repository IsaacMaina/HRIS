
import axios from 'axios';
import { Buffer } from 'buffer';

const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY || '';
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET || '';
const DARAJA_BUSINESS_SHORTCODE = process.env.DARAJA_BUSINESS_SHORTCODE || '';
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY || '';

const DARAJA_API_BASE_URL = 'https://sandbox.safaricom.co.ke'; // Use sandbox for testing

/**
 * Get Daraja API access token
 * @returns Access token
 */
export async function getDarajaToken() {
  try {
    const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(`${DARAJA_API_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Daraja token:', error);
    throw error;
  }
}

/**
 * Initiate M-Pesa B2C payment
 * @param amount - Amount to transfer
 * @param phone - Recipient's phone number
 * @param remarks - Payment remarks
 * @returns Payment response
 */
export async function initiateMpesaPayment(amount: number, phone: string, remarks: string) {
  try {
    // Validate required environment variables
    const timeoutUrl = process.env.MPESA_B2C_TIMEOUT;
    const resultUrl = process.env.MPESA_B2C_RESULT;

    if (!timeoutUrl || !resultUrl) {
      throw new Error('MPESA_B2C_TIMEOUT and MPESA_B2C_RESULT environment variables are required');
    }

    const token = await getDarajaToken();
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, -3); // More accurate timestamp cleaning

    // Format phone number to ensure proper format
    const formattedPhone = phone
      .replace(/\s+/g, '')           // Remove spaces
      .replace(/\D/g, '')            // Remove non-digits
      .replace(/^(\+?254)/, '254');  // Ensure correct format

    // Validate phone number format
    if (!/^254\d{9}$/.test(formattedPhone)) {
      throw new Error(`Invalid phone number format: ${phone}. Expected format: 254XXXXXXXXX`);
    }

    // Validate amount
    const roundedAmount = Math.round(amount);
    if (roundedAmount <= 0) {
      throw new Error(`Amount must be greater than 0. Provided amount: ${amount}`);
    }

    const payload = {
      InitiatorName: process.env.DARAJA_INITIATOR_NAME || "testapi",
      SecurityCredential: process.env.DARAJA_SECURITY_CREDENTIAL || "Safaricom123!", // Sandbox default
      CommandID: 'BusinessPayment', // Could also be 'SalaryPayment' for salary disbursements
      Amount: roundedAmount, // M-Pesa API expects integer values
      PartyA: DARAJA_BUSINESS_SHORTCODE,
      PartyB: formattedPhone, // Format: 2547XXXXXXXX
      Remarks: remarks.substring(0, 100), // Limit to 100 characters
      QueueTimeOutURL: timeoutUrl, // Use the validated environment variable
      ResultURL: resultUrl,        // Use the validated environment variable
      Occasion: remarks.substring(0, 100).trim() || 'Payroll', // Limit to 100 characters and provide fallback
    };

    console.log('M-Pesa payment payload:', JSON.stringify(payload, null, 2)); // Debug log

    const response = await axios.post(`${DARAJA_API_BASE_URL}/mpesa/b2c/v1/paymentrequest`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('M-Pesa payment response:', response.data); // Debug log

    return response.data;
  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error?.response?.data || error.message);
    throw error;
  }
}

/**
 * Verify M-Pesa payment status
 * @param transactionId - The transaction ID to verify
 * @returns Verification response
 */
export async function verifyMpesaPayment(transactionId: string) {
  try {
    const token = await getDarajaToken();
    const timestamp = new Date().toISOString().replace(/[^0-g]/g, '').slice(0, -3);
    const password = Buffer.from(`${DARAJA_BUSINESS_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`).toString('base64');

    const payload = {
      Initiator: process.env.DARAJA_INITIATOR_NAME || "testapi",
      SecurityCredential: process.env.DARAJA_SECURITY_CREDENTIAL || "Safaricom123!", // Sandbox default
      CommandID: 'TransactionStatusQuery',
      TransactionID: transactionId,
      PartyA: DARAJA_BUSINESS_SHORTCODE,
      IdentifierType: '4', // 1=MSISDN, 2=Till Number, 4=Organization Short Code
      ResultURL: process.env.MPESA_TRANSACTION_STATUS_RESULT!,
      QueueTimeOutURL: process.env.MPESA_TRANSACTION_STATUS_TIMEOUT!,
      Remarks: 'Check transaction status'.substring(0, 100), // Limit to 100 characters
      Occasion: 'Check transaction status'.substring(0, 100), // Limit to 100 characters
    };

    const response = await axios.post(`${DARAJA_API_BASE_URL}/mpesa/transactionstatus/v1/query`, payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    return response.data;
  } catch (error) {
    console.error('Error verifying M-Pesa payment:', error);
    throw error;
  }
}
