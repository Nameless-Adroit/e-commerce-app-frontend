/**
 * Frontend Phone Normalization, Validation & Formatting Utility
 * Tanzanian Mobile Network Operator (MNO) Aware
 */

const TZ_MOBILE_REGEX = /^\+255[67]\d{8}$/;

/**
 * Normalizes user input into canonical E.164 format (+255XXXXXXXXX).
 */
export function normalizePhoneNumber(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    if (cleaned[1] !== '6' && cleaned[1] !== '7') return null;
    cleaned = '+255' + cleaned.slice(1);
  } else if (cleaned.startsWith('255') && cleaned.length === 12) {
    if (cleaned[3] !== '6' && cleaned[3] !== '7') return null;
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
    cleaned = '+255' + cleaned;
  }

  // Enforce E.164 pattern match
  if (cleaned.startsWith('+255')) {
    if (!TZ_MOBILE_REGEX.test(cleaned)) return null;
  } else if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Validates whether the phone number is a valid Tanzanian or international mobile number.
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;

  if (TZ_MOBILE_REGEX.test(normalized)) {
    return true;
  }

  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

/**
 * Formats a raw or normalized phone number into standard display format:
 * Example: "+255712345678" -> "+255 712 345 678"
 * Example: "0712345678" -> "0712 345 678"
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+255') && cleaned.length === 13) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10, 13)}`;
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
  }

  return phone;
}

/**
 * Detects the Tanzanian mobile network operator based on standard prefixes
 */
export function getPhoneOperatorName(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized || !normalized.startsWith('+255') || normalized.length < 6) {
    return null;
  }

  const prefix = normalized.slice(4, 6);
  switch (prefix) {
    case '74':
    case '75':
    case '76':
      return 'Vodacom (M-Pesa)';
    case '78':
    case '68':
    case '69':
      return 'Airtel (Airtel Money)';
    case '71':
    case '65':
    case '67':
    case '77':
      return 'Tigo / Yas (Tigo Pesa)';
    case '62':
    case '61':
      return 'Halotel (HaloPesa)';
    case '73':
      return 'TTCL (T-Pesa)';
    default:
      return null;
  }
}

export default {
  normalizePhoneNumber,
  isValidPhoneNumber,
  formatPhoneNumber,
  getPhoneOperatorName
};
