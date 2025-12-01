import React, { createContext, useState, useEffect, useContext } from 'react';
import contactService from '../services/contactService';

const ContactContext = createContext();

export const ContactProvider = ({ children }) => {
  const [contactSettings, setContactSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    loadContactSettings();
    
    // Set up global refresh function for socket events
    global.refreshContactSettings = refreshContactSettings;
    
    return () => {
      delete global.refreshContactSettings;
    };
  }, []);

  const loadContactSettings = async (force = false) => {
    // Use cache if available and not expired
    if (!force && contactSettings && lastFetch) {
      const timeSinceLastFetch = Date.now() - lastFetch;
      if (timeSinceLastFetch < CACHE_DURATION) {
        console.log('✅ Using cached contact settings');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const settings = await contactService.getContactSettings();
      setContactSettings(settings);
      setLastFetch(Date.now());
      console.log('✅ Contact settings loaded');
    } catch (err) {
      console.error('Error loading contact settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshContactSettings = () => {
    return loadContactSettings(true);
  };

  const hasWhatsApp = () => {
    return contactSettings?.whatsappNumber != null;
  };

  const hasCall = () => {
    return contactSettings?.callNumber != null;
  };

  const hasAnyContact = () => {
    return hasWhatsApp() || hasCall();
  };

  const value = {
    contactSettings,
    loading,
    error,
    loadContactSettings,
    refreshContactSettings,
    hasWhatsApp,
    hasCall,
    hasAnyContact,
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
};

export const useContact = () => {
  const context = useContext(ContactContext);
  if (!context) {
    throw new Error('useContact must be used within ContactProvider');
  }
  return context;
};

export default ContactContext;
