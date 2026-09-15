/**
 * Utility functions for flexible currency handling and formatting.
 * Default deployment currency: Tanzanian Shillings (TZS / TSh).
 */

export interface CurrencyFormatOptions {
  currency?: string;
  symbol?: string;
  showDecimals?: boolean;
}

/**
 * Format a numeric or string amount into a localized currency string.
 * Example: formatCurrency(380000, 'TSh') => 'TSh 380,000'
 * Example: formatCurrency(1250.50, '$') => '$1,250.50'
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  symbolOrOptions?: string | CurrencyFormatOptions
): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'TSh 0';
  }

  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) {
    return 'TSh 0';
  }

  let symbol = 'TSh';
  let currencyCode = 'TZS';
  let showDecimals = false;

  if (typeof symbolOrOptions === 'string') {
    symbol = symbolOrOptions || 'TSh';
  } else if (symbolOrOptions && typeof symbolOrOptions === 'object') {
    if (symbolOrOptions.symbol) symbol = symbolOrOptions.symbol;
    if (symbolOrOptions.currency) currencyCode = symbolOrOptions.currency;
    if (typeof symbolOrOptions.showDecimals === 'boolean') {
      showDecimals = symbolOrOptions.showDecimals;
    }
  }

  // Determine if decimals should be displayed
  // For TZS / TSh, fractional cents are rare in retail; only show decimals if non-zero or explicitly requested
  const hasCents = num % 1 !== 0;
  const shouldShowDecimals = showDecimals || (hasCents && symbol !== 'TSh' && currencyCode !== 'TZS');

  const formattedNumber = num.toLocaleString('en-US', {
    minimumFractionDigits: shouldShowDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });

  // Attach symbol with clean spacing
  if (symbol === '$' || symbol === '€' || symbol === '£') {
    return `${symbol}${formattedNumber}`;
  }

  return `${symbol} ${formattedNumber}`;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling (TZS)', country: 'Tanzania' },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', country: 'International' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling (KES)', country: 'Kenya' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling (UGX)', country: 'Uganda' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', country: 'European Union' }
];

export default formatCurrency;
