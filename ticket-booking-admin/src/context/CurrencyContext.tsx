import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

// Exchange rates relative to LKR (Sri Lankan Rupee as base)
const EXCHANGE_RATES: { [key: string]: number } = {
  LKR: 1,
  USD: 0.0031,    // 1 LKR = 0.0031 USD
  EUR: 0.0029,    // 1 LKR = 0.0029 EUR
  GBP: 0.0025,    // 1 LKR = 0.0025 GBP
  JPY: 0.48,      // 1 LKR = 0.48 JPY
};

const CURRENCY_SYMBOLS: { [key: string]: string } = {
  LKR: 'Rs',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  convertAmount: (amount: number) => number;
  formatCurrency: (amount: number) => string;
  getCurrencySymbol: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>('LKR');

  // Load currency from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.defaultCurrency) {
          setCurrencyState(settings.defaultCurrency);
        }
      } catch (error) {
        console.error('Error loading currency:', error);
      }
    }
  }, []);

  // Listen for storage changes (when currency is changed in Settings)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('systemSettings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          if (settings.defaultCurrency) {
            setCurrencyState(settings.defaultCurrency);
          }
        } catch (error) {
          console.error('Error loading currency:', error);
        }
      }
    };

    // Listen for custom event
    window.addEventListener('currencyChanged', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('currencyChanged', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('currencyChanged'));
  }, []);

  const convertAmount = useCallback((amount: number): number => {
    const rate = EXCHANGE_RATES[currency] || 1;
    return amount * rate;
  }, [currency]);

  const formatCurrency = useCallback((amount: number): string => {
    const rate = EXCHANGE_RATES[currency] || 1;
    const convertedAmount = amount * rate;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    
    // Format with appropriate decimal places
    const decimals = currency === 'JPY' ? 0 : 2;
    const formatted = convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${symbol} ${formatted}`;
  }, [currency]);

  const getCurrencySymbol = useCallback((): string => {
    return CURRENCY_SYMBOLS[currency] || currency;
  }, [currency]);

  const contextValue = useMemo(() => ({
    currency,
    setCurrency,
    convertAmount,
    formatCurrency,
    getCurrencySymbol,
  }), [currency, setCurrency, convertAmount, formatCurrency, getCurrencySymbol]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
