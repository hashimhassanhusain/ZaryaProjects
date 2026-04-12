import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useProject } from './ProjectContext';

interface CurrencyContextType {
  exchangeRate: number; // Global default market rate: 1 USD = X IQD
  setExchangeRate: (rate: number) => Promise<void>;
  currency: 'USD' | 'IQD'; // This is the Project's Base Currency
  formatAmount: (amount: number, fromCurrency?: 'USD' | 'IQD', itemRate?: number) => string;
  convertToBase: (amount: number, fromCurrency: 'USD' | 'IQD', itemRate?: number) => number;
  loading: boolean;
  refreshExchangeRate: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedProject } = useProject();
  const [exchangeRate, setExchangeRateState] = useState<number>(1500);
  const [loading, setLoading] = useState(true);

  // The project's base currency is the source of truth
  const currency = selectedProject?.baseCurrency || 'IQD';

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'currency'), (snapshot) => {
      if (snapshot.exists()) {
        setExchangeRateState(snapshot.data().exchangeRate || 1500);
      } else {
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

  const convertToBase = (amount: number, fromCurrency: 'USD' | 'IQD', itemRate?: number) => {
    const rate = itemRate || exchangeRate;
    
    // If input is same as base, return amount
    if (fromCurrency === currency) return amount;

    // Conversion logic
    if (currency === 'IQD') {
      // Base is IQD, Input is USD
      return amount * rate;
    } else {
      // Base is USD, Input is IQD
      return amount / rate;
    }
  };

  const formatAmount = (amount: number, fromCurrency: 'USD' | 'IQD' = 'USD', itemRate?: number) => {
    const baseAmount = convertToBase(amount, fromCurrency, itemRate);
    
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(baseAmount);
    } else {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'IQD',
        maximumFractionDigits: 0 
      }).format(baseAmount);
    }
  };

  const refreshExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      let rate = data.rates.IQD;
      
      if (rate < 1400) {
        rate = 1500; // Default to market rate if official rate is returned
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
      formatAmount,
      convertToBase,
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
