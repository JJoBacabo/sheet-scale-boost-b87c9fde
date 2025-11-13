import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  countries: string[];
}

export const currencies: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro', countries: ['Portugal', 'Espanha', 'França', 'Alemanha', 'Itália', 'Holanda', 'Bélgica', 'Austria', 'Grécia', 'Irlanda', 'Finland', 'Luxembourg', 'Spain', 'France', 'Germany', 'Italy', 'Netherlands', 'Belgium', 'Austria', 'Greece', 'Ireland', 'Finland'] },
  { code: 'USD', symbol: '$', name: 'US Dollar', countries: ['Estados Unidos', 'United States', 'USA', 'America'] },
  { code: 'GBP', symbol: '£', name: 'British Pound', countries: ['Reino Unido', 'Inglaterra', 'United Kingdom', 'UK', 'England', 'Britain'] },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', countries: ['Canadá', 'Canada'] },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', countries: ['Austrália', 'Australia'] },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', countries: ['Brasil', 'Brazil'] },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', countries: ['Suíça', 'Switzerland'] },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', countries: ['Suécia', 'Sweden'] },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', countries: ['Noruega', 'Norway'] },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', countries: ['Dinamarca', 'Denmark'] },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', countries: ['Polónia', 'Poland'] },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', countries: ['República Checa', 'Czech Republic'] },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', countries: ['Hungria', 'Hungary'] },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', countries: ['Roménia', 'Romania'] },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', countries: ['Bulgária', 'Bulgaria'] },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', countries: ['Croácia', 'Croatia'] },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', countries: ['Rússia', 'Russia'] },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', countries: ['Turquia', 'Turkey'] },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', countries: ['Índia', 'India'] },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', countries: ['China'] },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', countries: ['Japão', 'Japan'] },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', countries: ['Coreia do Sul', 'South Korea'] },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', countries: ['México', 'Mexico'] },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', countries: ['Argentina'] },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', countries: ['Chile'] },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', countries: ['Colômbia', 'Colombia'] },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', countries: ['Peru'] },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', countries: ['África do Sul', 'South Africa'] },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound', countries: ['Egito', 'Egypt'] },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', countries: ['Nigéria', 'Nigeria'] },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', countries: ['Quénia', 'Kenya'] },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', countries: ['Marrocos', 'Morocco'] },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', countries: ['Singapura', 'Singapore'] },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', countries: ['Hong Kong'] },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', countries: ['Malásia', 'Malaysia'] },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', countries: ['Tailândia', 'Thailand'] },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', countries: ['Indonésia', 'Indonesia'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', countries: ['Filipinas', 'Philippines'] },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', countries: ['Vietname', 'Vietnam'] },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', countries: ['Nova Zelândia', 'New Zealand'] },
];

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  convertFromEUR: (amountInEUR: number) => number;
  convertBetween: (amount: number, fromCurrency: string, toCurrency?: string) => number;
  formatAmount: (amount: number, sourceCurrency?: string) => string;
  exchangeRates: Record<string, number>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(currencies[0]); // EUR default
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  useEffect(() => {
    // Load saved currency from localStorage
    const saved = localStorage.getItem('selectedCurrency');
    if (saved) {
      const currency = currencies.find(c => c.code === saved);
      if (currency) setSelectedCurrencyState(currency);
    }

    // Fetch exchange rates
    fetchExchangeRates();
  }, []);

  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/EUR');
      const data = await response.json();
      if (data.result === 'success' && data.rates) {
        setExchangeRates(data.rates);
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      // Fallback rates
      setExchangeRates({
        'EUR': 1,
        'USD': 1.09,
        'GBP': 0.85,
        'CAD': 1.49,
        'AUD': 1.64,
        'BRL': 5.5,
        'CHF': 0.93,
        'SEK': 11.36,
        'NOK': 11.36,
        'DKK': 7.46,
        'PLN': 4.35,
        'CZK': 25.0,
        'HUF': 400,
        'RON': 5.0,
        'BGN': 1.96,
        'HRK': 7.5,
        'RUB': 100,
        'TRY': 34.5,
        'INR': 91,
        'CNY': 7.7,
        'JPY': 161,
        'KRW': 1450,
        'MXN': 18.8,
        'ARS': 1000,
        'CLP': 1000,
        'COP': 4166,
        'PEN': 4.0,
        'ZAR': 19.6,
        'EGP': 52.6,
        'NGN': 769,
        'KES': 141,
        'MAD': 10.87,
        'SGD': 1.45,
        'HKD': 8.33,
        'MYR': 4.76,
        'THB': 37,
        'IDR': 17241,
        'PHP': 62.5,
        'VND': 27027,
        'NZD': 1.82,
      });
    }
  };

  const setSelectedCurrency = (currency: Currency) => {
    setSelectedCurrencyState(currency);
    localStorage.setItem('selectedCurrency', currency.code);
  };

  const convertFromEUR = (amountInEUR: number): number => {
    const rate = exchangeRates[selectedCurrency.code] || 1;
    return amountInEUR * rate;
  };

  const convertBetween = (amount: number, fromCurrency: string, toCurrency?: string): number => {
    const targetCurrency = toCurrency || selectedCurrency.code;
    
    // If currencies are the same, no conversion needed
    if (fromCurrency === targetCurrency) {
      return amount;
    }

    // Convert from source currency to EUR first
    const rateFrom = exchangeRates[fromCurrency] || 1;
    const amountInEUR = amount / rateFrom;

    // Then convert from EUR to target currency
    const rateTo = exchangeRates[targetCurrency] || 1;
    return amountInEUR * rateTo;
  };

  const formatAmount = (amount: number, sourceCurrency?: string): string => {
    // If source currency is provided, convert from that currency
    // Otherwise assume it's in EUR and convert from EUR
    const convertedAmount = sourceCurrency 
      ? convertBetween(amount, sourceCurrency, selectedCurrency.code)
      : convertFromEUR(amount);
      
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedAmount);
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        convertFromEUR,
        convertBetween,
        formatAmount,
        exchangeRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
