import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

// Fallback exchange rates relative to LKR (Sri Lankan Rupee as base)
const DEFAULT_RATES: { [key: string]: number } = {
  LKR: 1,
  USD: 0.0030,    // 1 LKR = 0.0030 USD
  EUR: 0.0027,    // 1 LKR = 0.0027 EUR
  GBP: 0.0023,    // 1 LKR = 0.0023 GBP
  JPY: 0.46,      // 1 LKR = 0.46 JPY
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
  const [rates, setRates] = useState<{ [key: string]: number }>(DEFAULT_RATES);

  // Fetch live exchange rates relative to LKR on mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/LKR');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (data && data.rates) {
          setRates({
            LKR: 1,
            USD: data.rates.USD || DEFAULT_RATES.USD,
            EUR: data.rates.EUR || DEFAULT_RATES.EUR,
            GBP: data.rates.GBP || DEFAULT_RATES.GBP,
            JPY: data.rates.JPY || DEFAULT_RATES.JPY,
          });
        }
      } catch (error) {
        console.error('Failed to fetch live exchange rates, using fallback rates:', error);
      }
    };

    fetchRates();
  }, []);

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
    const rate = rates[currency] || 1;
    return amount * rate;
  }, [currency, rates]);

  const formatCurrency = useCallback((amount: number): string => {
    const rate = rates[currency] || 1;
    const convertedAmount = amount * rate;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    
    // Format with appropriate decimal places
    const decimals = currency === 'JPY' ? 0 : 2;
    const formatted = convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${symbol} ${formatted}`;
  }, [currency, rates]);

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
