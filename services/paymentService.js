import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';

const SUPPORTED_NETWORKS = [
  {
    id: 'vodacom_mpesa',
    name: 'Vodacom M-Pesa',
    displayName: 'M-Pesa',
    shortCode: '*150*00#',
    prefixes: ['074', '075', '076', '077'],
    businessNumber: '400200',
    primary: true,
    minAmount: 500,
    maxAmount: 1000000,
  },
  {
    id: 'tigopesa',
    name: 'TigoPesa',
    displayName: 'TigoPesa',
    shortCode: '*150*01#',
    prefixes: ['071', '065', '067'],
    businessNumber: '400200',
    primary: false,
    minAmount: 500,
    maxAmount: 1000000,
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    displayName: 'Airtel Money',
    shortCode: '*150*60#',
    prefixes: ['068', '069', '078'],
    businessNumber: '400200',
    primary: false,
    minAmount: 500,
    maxAmount: 1000000,
  },
  {
    id: 'halopesa',
    name: 'HaloPesa',
    displayName: 'HaloPesa',
    shortCode: '*150*88#',
    prefixes: ['062'],
    businessNumber: '400200',
    primary: false,
    minAmount: 500,
    maxAmount: 1000000,
  },
];

class PaymentService {
  constructor() {
    this.supportedNetworks = SUPPORTED_NETWORKS;
  }

  getSupportedNetworks() {
    return this.supportedNetworks;
  }

  getPrimaryNetwork() {
    return this.supportedNetworks.find(n => n.primary) || this.supportedNetworks[0];
  }

  getNetworkById(networkId) {
    return this.supportedNetworks.find(n => n.id === networkId);
  }

  detectNetworkFromPhone(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const prefix = cleaned.startsWith('255') ? cleaned.substring(3, 6) : cleaned.substring(1, 4);

    for (const network of this.supportedNetworks) {
      if (network.prefixes.some(p => prefix.startsWith(p))) {
        return network;
      }
    }

    return null;
  }

  validatePhoneNumber(phoneNumber, networkId = null) {
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check length
    if (cleaned.length !== 10 && cleaned.length !== 12) {
      return { valid: false, error: 'Namba ya simu lazima iwe na tarakimu 10' };
    }

    // Check format
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      return { valid: false, error: 'Namba ya simu lazima ianze na 0' };
    }

    if (cleaned.length === 12 && !cleaned.startsWith('255')) {
      return { valid: false, error: 'Namba ya simu lazima ianze na 255' };
    }

    // Check network if specified
    if (networkId) {
      const network = this.getNetworkById(networkId);
      if (!network) {
        return { valid: false, error: 'Mtandao haupatikani' };
      }

      const prefix = cleaned.startsWith('255') ? cleaned.substring(3, 6) : cleaned.substring(1, 4);
      const isValidPrefix = network.prefixes.some(p => prefix.startsWith(p));

      if (!isValidPrefix) {
        return { 
          valid: false, 
          error: `Namba hii si ya ${network.displayName}. Tumia namba inayoanza na ${network.prefixes.join(', ')}` 
        };
      }
    }

    return { valid: true, formatted: this.formatPhoneNumber(cleaned) };
  }

  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('255')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+255${cleaned.substring(1)}`;
    } else {
      return `+255${cleaned}`;
    }
  }

  validateAmount(amount, networkId) {
    const network = this.getNetworkById(networkId);
    if (!network) {
      return { valid: false, error: 'Mtandao haupatikani' };
    }

    if (amount < network.minAmount) {
      return { valid: false, error: `Kiasi cha chini ni TZS ${network.minAmount.toLocaleString()}` };
    }

    if (amount > network.maxAmount) {
      return { valid: false, error: `Kiasi cha juu ni TZS ${network.maxAmount.toLocaleString()}` };
    }

    return { valid: true };
  }

  getPaymentInstructions(networkId, amount, businessNumber = '400200') {
    const network = this.getNetworkById(networkId);
    if (!network) return null;

    const instructions = {
      vodacom_mpesa: {
        title: 'Maagizo ya M-Pesa',
        steps: [
          `1. Bonyeza ${network.shortCode} kwenye simu yako`,
          '2. Chagua "Lipa kwa M-Pesa"',
          '3. Chagua "Buy Goods and Services"',
          `4. Ingiza namba ya biashara: ${businessNumber}`,
          `5. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
          '6. Ingiza PIN yako ya M-Pesa',
          '7. Thibitisha malipo',
        ],
        alternative: `Au tumia: ${network.shortCode}*${businessNumber}*${amount}#`,
      },
      tigopesa: {
        title: 'Maagizo ya TigoPesa',
        steps: [
          `1. Bonyeza ${network.shortCode} kwenye simu yako`,
          '2. Chagua "Lipa Bili"',
          `3. Ingiza namba ya biashara: ${businessNumber}`,
          `4. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
          '5. Ingiza PIN yako ya TigoPesa',
          '6. Thibitisha malipo',
        ],
        alternative: `Au tumia: ${network.shortCode}*${businessNumber}*${amount}#`,
      },
      airtel_money: {
        title: 'Maagizo ya Airtel Money',
        steps: [
          `1. Bonyeza ${network.shortCode} kwenye simu yako`,
          '2. Chagua "Malipo ya Biashara"',
          `3. Ingiza namba ya biashara: ${businessNumber}`,
          `4. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
          '5. Ingiza PIN yako ya Airtel Money',
          '6. Thibitisha malipo',
        ],
        alternative: null,
      },
      halopesa: {
        title: 'Maagizo ya HaloPesa',
        steps: [
          `1. Bonyeza ${network.shortCode} kwenye simu yako`,
          '2. Chagua "Lipa kwa Namba ya Biashara"',
          `3. Ingiza namba ya biashara: ${businessNumber}`,
          `4. Ingiza kiasi: ${amount.toLocaleString()} TZS`,
          '5. Ingiza PIN yako ya HaloPesa',
          '6. Thibitisha malipo',
        ],
        alternative: null,
      },
    };

    return instructions[networkId] || null;
  }

  async initiatePayment({ networkId, phoneNumber, amount, subscriptionPlan, userId }) {
    try {
      // Validate inputs
      const phoneValidation = this.validatePhoneNumber(phoneNumber, networkId);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error);
      }

      const amountValidation = this.validateAmount(amount, networkId);
      if (!amountValidation.valid) {
        throw new Error(amountValidation.error);
      }

      const network = this.getNetworkById(networkId);
      if (!network) {
        throw new Error('Mtandao haupatikani');
      }

      // Call backend API
      const response = await apiService.post('/users/payment/initiate', {
        networkId,
        phoneNumber: phoneValidation.formatted,
        amount,
        subscriptionPlan,
        userId,
      });

      // Save transaction locally
      await this.saveTransaction({
        transactionId: response.transactionId,
        networkId,
        networkName: network.name,
        phoneNumber: phoneValidation.formatted,
        amount,
        subscriptionPlan,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        transactionId: response.transactionId,
        message: response.message,
        network: network.displayName,
        amount,
        instructions: this.getPaymentInstructions(networkId, amount),
      };

    } catch (error) {
      console.error('Payment initiation error:', error);
      throw error;
    }
  }

  async checkPaymentStatus(transactionId) {
    try {
      const response = await apiService.get(`/users/payment/status/${transactionId}`);
      
      // Update local transaction
      await this.updateTransaction(transactionId, {
        status: response.status,
        completedAt: response.completedAt,
      });

      return response;
    } catch (error) {
      console.error('Payment status check error:', error);
      throw error;
    }
  }

  async saveTransaction(transaction) {
    try {
      const transactions = await this.getTransactions();
      transactions.unshift(transaction);
      
      // Keep only last 10 transactions
      const limited = transactions.slice(0, 10);
      await AsyncStorage.setItem('payment_transactions', JSON.stringify(limited));
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }

  async updateTransaction(transactionId, updates) {
    try {
      const transactions = await this.getTransactions();
      const index = transactions.findIndex(t => t.transactionId === transactionId);
      
      if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updates };
        await AsyncStorage.setItem('payment_transactions', JSON.stringify(transactions));
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  }

  async getTransactions() {
    try {
      const data = await AsyncStorage.getItem('payment_transactions');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }
}

const paymentService = new PaymentService();
export default paymentService;
