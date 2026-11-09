'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getFinanceProfile, updateFinanceProfile } from '@/lib/api';

export interface CurrencyItem {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCY_LIST: CurrencyItem[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka (৳)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (د.إ)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal (﷼)' },
];

const STORAGE_KEY = 'fastchat_currency_code';

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  formatMoney: (amount: number | string | null | undefined, showPositiveSign?: boolean) => string;
  changeCurrency: (code: string) => Promise<void>;
  currencies: CurrencyItem[];
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbolState] = useState<string>('$');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = CURRENCY_LIST.find((c) => c.code === saved);
      if (found) {
        setCurrencyState(found.code);
        setCurrencySymbolState(found.symbol);
        return;
      }
    }

    // Try fetching from server
    getFinanceProfile()
      .then((res) => {
        if (res.data?.profile?.currency) {
          const found = CURRENCY_LIST.find((c) => c.code === res.data.profile.currency);
          if (found) {
            setCurrencyState(found.code);
            setCurrencySymbolState(found.symbol);
            localStorage.setItem(STORAGE_KEY, found.code);
          }
        }
      })
      .catch(() => {});
  }, []);

  const changeCurrency = async (code: string) => {
    const item = CURRENCY_LIST.find((c) => c.code === code) || CURRENCY_LIST[0];
    setCurrencyState(item.code);
    setCurrencySymbolState(item.symbol);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, item.code);
    }
    try {
      await updateFinanceProfile({
        currency: item.code,
        currencySymbol: item.symbol,
      });
    } catch {
      // Ignored
    }
  };

  const formatMoney = (amount: number | string | null | undefined, showPositiveSign = false): string => {
    const num = Number(amount || 0);
    const absVal = Math.abs(num).toLocaleString();
    if (num < 0) {
      return `-${currencySymbol}${absVal}`;
    }
    if (showPositiveSign && num > 0) {
      return `+${currencySymbol}${absVal}`;
    }
    return `${currencySymbol}${absVal}`;
  };

  const value = useMemo(
    () => ({
      currency,
      currencySymbol,
      formatMoney,
      changeCurrency,
      currencies: CURRENCY_LIST,
    }),
    [currency, currencySymbol]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): CurrencyContextType => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    return {
      currency: 'USD',
      currencySymbol: '$',
      formatMoney: (amount: any, showSign = false) => {
        const num = Number(amount || 0);
        const absVal = Math.abs(num).toLocaleString();
        if (num < 0) return `-$${absVal}`;
        if (showSign && num > 0) return `+$${absVal}`;
        return `$${absVal}`;
      },
      changeCurrency: async () => {},
      currencies: CURRENCY_LIST,
    };
  }
  return ctx;
};
