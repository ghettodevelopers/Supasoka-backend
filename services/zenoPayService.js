import axios from 'axios';

/**
 * ZenoPay API Service for Mobile Money Tanzania
 * 
 * Supports:
 * - M-Pesa (Vodacom)
 * - Tigo Pesa
 * - Airtel Money
 * - Halo Pesa
 */

// ZenoPay Configuration
const ZENOPAY_CONFIG = {
  apiKey: 'y25RazuSLyAS4bTd4Y9s3XIlSt_MBgUsf4pmSixXXSprbSzIyunQ_vzyiKJgbgMAH3c6a3sDBfsa-qqe1sVTjQ',
  apiUrl: 'https://zenoapi.com/api/payments/mobile_money_tanzania',
  // Set to true to bypass API calls during development (while fixing 403 error)
  testMode: false, // Change to true to enable test mode
};

class ZenoPayService {
  constructor() {
    this.apiKey = ZENOPAY_CONFIG.apiKey;
    this.apiUrl = ZENOPAY_CONFIG.apiUrl;
  }

  /**
   * Initiate Mobile Money Payment
   * 
   * @param {Object} paymentData
   * @param {string} paymentData.phone - Phone number (format: 255XXXXXXXXX)
   * @param {number} paymentData.amount - Amount in TZS
   * @param {string} paymentData.network - Network provider (mpesa, tigopesa, airtel, halopesa)
   * @param {string} paymentData.reference - Unique payment reference
   * @param {string} paymentData.description - Payment description
   * @returns {Promise<Object>} Payment response
   */
  async initiatePayment(paymentData) {
    try {
      const {
        phone,
        amount,
        network,
        reference,
        description = 'Supasoka Subscription Payment',
        buyerEmail = 'user@supasoka.com',
        buyerName = 'Supasoka User',
      } = paymentData;

      // Validate inputs
      if (!phone || !amount || !reference) {
        throw new Error('Missing required payment parameters');
      }

      // Format phone number to ZenoPay format (07XXXXXXXX)
      const formattedPhone = this.formatPhoneNumberForZenoPay(phone);

      // Prepare request payload according to ZenoPay documentation
      const payload = {
        order_id: reference,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: formattedPhone,
        amount: parseFloat(amount),
        webhook_url: `${this.getBackendUrl()}/api/payments/zenopay/callback`,
      };

      console.log('🔄 Initiating ZenoPay payment:', {
        order_id: reference,
        buyer_phone: formattedPhone,
        amount,
      });

      // Make API request with correct header format
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'x-api-key': this.apiKey, // Correct header format per documentation
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      console.log('✅ ZenoPay payment initiated:', response.data);

      return {
        success: true,
        data: response.data,
        message: 'Payment initiated successfully',
      };
    } catch (error) {
      console.error('❌ ZenoPay payment failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });

      // Handle different error types
      if (error.response) {
        // API returned an error response
        const statusCode = error.response.status;
        let errorMessage = error.response.data?.message || 'Payment failed';

        // Handle specific error codes
        if (statusCode === 403) {
          errorMessage = 'Authentication failed. Please check API key configuration.';
          console.error('🔑 403 Error - API Key issue. Check:');
          console.error('1. API Key is correct');
          console.error('2. API Key has proper permissions');
          console.error('3. Account is active');
        } else if (statusCode === 401) {
          errorMessage = 'Unauthorized. Invalid API credentials.';
        } else if (statusCode === 400) {
          errorMessage = error.response.data?.message || 'Invalid request data.';
        }

        return {
          success: false,
          error: errorMessage,
          details: error.response.data,
          statusCode: statusCode,
        };
      } else if (error.request) {
        // Request made but no response
        return {
          success: false,
          error: 'Network error. Please check your internet connection.',
          details: error.message,
        };
      } else {
        // Other errors
        return {
          success: false,
          error: error.message || 'Payment initialization failed',
        };
      }
    }
  }

  /**
   * Check Payment Status
   * 
   * @param {string} orderId - Order ID (reference)
   * @returns {Promise<Object>} Payment status
   */
  async checkPaymentStatus(orderId) {
    try {
      const response = await axios.get(
        'https://zenoapi.com/api/payments/order-status',
        {
          params: {
            order_id: orderId,
          },
          headers: {
            'x-api-key': this.apiKey,
          },
          timeout: 15000,
        }
      );

      console.log('✅ Payment status:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Failed to check payment status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check payment status',
      };
    }
  }

  /**
   * Format phone number to ZenoPay format (07XXXXXXXX)
   * ZenoPay expects Tanzanian format starting with 0
   * 
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number (07XXXXXXXX)
   */
  formatPhoneNumberForZenoPay(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Convert to 07XXXXXXXX format
    if (cleaned.startsWith('255')) {
      // 255712345678 -> 0712345678
      cleaned = '0' + cleaned.substring(3);
    } else if (cleaned.startsWith('+255')) {
      // +255712345678 -> 0712345678
      cleaned = '0' + cleaned.substring(4);
    } else if (cleaned.startsWith('0')) {
      // Already in correct format: 0712345678
      cleaned = cleaned;
    } else if (cleaned.length === 9) {
      // 712345678 -> 0712345678
      cleaned = '0' + cleaned;
    }

    return cleaned;
  }

  /**
   * Format phone number to international format (255XXXXXXXXX)
   * 
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
      // 0712345678 -> 255712345678
      cleaned = '255' + cleaned.substring(1);
    } else if (cleaned.startsWith('255')) {
      // Already in correct format
      cleaned = cleaned;
    } else if (cleaned.startsWith('+255')) {
      // +255712345678 -> 255712345678
      cleaned = cleaned.substring(1);
    } else if (cleaned.length === 9) {
      // 712345678 -> 255712345678
      cleaned = '255' + cleaned;
    }

    return cleaned;
  }

  /**
   * Get backend URL based on environment
   * 
   * @returns {string} Backend URL
   */
  getBackendUrl() {
    // In production, use your actual backend URL
    // For now, using localhost for development
    return __DEV__ 
      ? 'http://10.0.2.2:5000' // Android emulator
      : 'https://your-production-backend.com'; // Replace with your actual backend URL
  }

  /**
   * Generate unique payment reference
   * 
   * @returns {string} Unique reference
   */
  generateReference() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `SUPA${timestamp}${random}`;
  }

  /**
   * Get network name from code
   * 
   * @param {string} network - Network code
   * @returns {string} Network display name
   */
  getNetworkName(network) {
    const networks = {
      mpesa: 'M-Pesa (Vodacom)',
      vodacom_mpesa: 'M-Pesa (Vodacom)',
      tigopesa: 'Tigo Pesa',
      airtel: 'Airtel Money',
      airtel_money: 'Airtel Money',
      halopesa: 'Halo Pesa',
    };
    return networks[network.toLowerCase()] || network;
  }

  /**
   * Map internal network ID to ZenoPay network code
   * 
   * @param {string} networkId - Internal network ID
   * @returns {string} ZenoPay network code
   */
  mapNetworkId(networkId) {
    const mapping = {
      'vodacom_mpesa': 'mpesa',
      'mpesa': 'mpesa',
      'tigopesa': 'tigopesa',
      'airtel_money': 'airtel',
      'airtel': 'airtel',
      'halopesa': 'halopesa',
    };
    return mapping[networkId.toLowerCase()] || networkId.toLowerCase();
  }

  /**
   * Validate payment data
   * 
   * @param {Object} paymentData
   * @returns {Object} Validation result
   */
  validatePaymentData(paymentData) {
    const { phone, amount, network } = paymentData;

    // Validate phone number
    if (!phone || phone.length < 9) {
      return {
        valid: false,
        error: 'Namba ya simu si sahihi. Tafadhali ingiza namba sahihi.',
      };
    }

    // Validate amount
    if (!amount || amount < 1000) {
      return {
        valid: false,
        error: 'Kiasi cha chini ni TZS 1,000.',
      };
    }

    // Validate network (support both internal IDs and ZenoPay codes)
    const validNetworks = [
      'mpesa', 'vodacom_mpesa',
      'tigopesa',
      'airtel', 'airtel_money',
      'halopesa'
    ];
    if (!network || !validNetworks.includes(network.toLowerCase())) {
      return {
        valid: false,
        error: 'Tafadhali chagua mtandao wa malipo (M-Pesa, Tigo Pesa, Airtel Money, au Halo Pesa).',
      };
    }

    return {
      valid: true,
    };
  }
}

// Export singleton instance
const zenoPayService = new ZenoPayService();
export default zenoPayService;
