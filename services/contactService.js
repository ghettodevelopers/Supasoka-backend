import apiService from './api';

class ContactService {
  async getContactSettings() {
    try {
      const response = await apiService.get('/admin/contact-settings/public');
      console.log('📞 Contact settings response:', response);
      
      // Backend returns { contactSettings: {...} }
      const settings = response?.contactSettings || response;
      return this.formatContactSettings(settings);
    } catch (error) {
      console.error('❌ Error fetching contact settings:', error);
      return null;
    }
  }

  formatContactSettings(settings) {
    if (!settings) return null;

    return {
      whatsappNumber: this.formatPhoneNumber(settings.whatsappNumber),
      callNumber: this.formatPhoneNumber(settings.callNumber),
      whatsappUrl: this.generateWhatsAppUrl(settings.whatsappNumber),
      callUrl: this.generateCallUrl(settings.callNumber),
    };
  }

  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('255')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+255${cleaned.substring(1)}`;
    } else {
      return `+255${cleaned}`;
    }
  }

  generateWhatsAppUrl(phoneNumber) {
    if (!phoneNumber) return null;

    const formatted = this.formatPhoneNumber(phoneNumber);
    const number = formatted.replace('+', '');
    const message = encodeURIComponent('Habari, ninahitaji msaada kuhusu Supasoka');
    
    return `whatsapp://send?phone=${number}&text=${message}`;
  }

  generateCallUrl(phoneNumber) {
    if (!phoneNumber) return null;

    const formatted = this.formatPhoneNumber(phoneNumber);
    return `tel:${formatted}`;
  }
}

const contactService = new ContactService();
export default contactService;
