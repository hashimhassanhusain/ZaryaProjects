import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

interface CurrencyContextType {
  exchangeRate: number; // 1 USD = X IQD
  setExchangeRate: (rate: number) => Promise<void>;
  currency: 'USD' | 'IQD';
  setCurrency: (currency: 'USD' | 'IQD') => void;
  formatAmount: (amount: number, fromCurrency?: 'USD' | 'IQD') => string;
  convertToUSD: (amount: number, fromCurrency: 'USD' | 'IQD') => number;
  convertToIQD: (amount: number, fromCurrency: 'USD' | 'IQD') => number;
  loading: boolean;
  refreshExchangeRate: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exchangeRate, setExchangeRateState] = useState<number>(1500);
  const [currency, setCurrencyState] = useState<'USD' | 'IQD'>(() => {
    return (localStorage.getItem('preferredCurrency') as 'USD' | 'IQD') || 'USD';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'currency'), (snapshot) => {
      if (snapshot.exists()) {
        setExchangeRateState(snapshot.data().exchangeRate || 1500);
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'settings', 'currency'), { exchangeRate: 1500 });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching currency settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setExchangeRate = async (rate: number) => {
    try {
      await setDoc(doc(db, 'settings', 'currency'), { 
        exchangeRate: rate,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating exchange rate:", error);
    }
  };

  const setCurrency = (curr: 'USD' | 'IQD') => {
    setCurrencyState(curr);
    localStorage.setItem('preferredCurrency', curr);
  };

  const convertToUSD = (amount: number, fromCurrency: 'USD' | 'IQD') => {
    if (fromCurrency === 'USD') return amount;
    return amount / exchangeRate;
  };

  const convertToIQD = (amount: number, fromCurrency: 'USD' | 'IQD') => {
    if (fromCurrency === 'IQD') return amount;
    return amount * exchangeRate;
  };

  const formatAmount = (amount: number, fromCurrency: 'USD' | 'IQD' = 'USD') => {
    if (currency === 'USD') {
      const usdAmount = convertToUSD(amount, fromCurrency);
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdAmount);
    } else {
      const iqdAmount = convertToIQD(amount, fromCurrency);
      return new Intl.NumberFormat('ar-IQ', { 
        style: 'currency', 
        currency: 'IQD',
        maximumFractionDigits: 0 
      }).format(iqdAmount);
    }
  };

  const refreshExchangeRate = async () => {
    try {
      // Try to fetch from a public API
      // Note: Most free APIs return official rates. 
      // For market rates in Iraq, we might need a specific source.
      // For now, we'll use a fallback or a known market rate API if available.
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      let rate = data.rates.IQD;
      
      // If the rate is the official one (~1300-1320), we might want to adjust it to market rate (~1500)
      // as requested by the user.
      if (rate < 1400) {
        console.log("Official rate detected, defaulting to market estimate (1500)");
        rate = 1500;
      }
      
      await setExchangeRate(rate);
    } catch (error) {
      console.error("Error refreshing exchange rate:", error);
    }
  };

  return (
    <CurrencyContext.Provider value={{ 
      exchangeRate, 
      setExchangeRate, 
      currency, 
      setCurrency, 
      formatAmount,
      convertToUSD,
      convertToIQD,
      loading,
      refreshExchangeRate
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
