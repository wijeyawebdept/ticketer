/**
 * Sri Lankan National Identity Card (NIC) & International Passport Validator
 */

export interface IdValidationResult {
  isValid: boolean;
  type: 'nic_old' | 'nic_new' | 'passport' | null;
  message: string;
  formattedValue: string;
}

/**
 * Validates Sri Lankan NIC (old 10-char & new 12-digit) or Passport Number
 */
export const validateNicPassport = (rawInput: string): IdValidationResult => {
  if (!rawInput) {
    return {
      isValid: false,
      type: null,
      message: 'NIC or Passport number is required',
      formattedValue: '',
    };
  }

  // Remove spaces and special characters, convert to uppercase
  const clean = rawInput.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (!clean) {
    return {
      isValid: false,
      type: null,
      message: 'NIC or Passport number is required',
      formattedValue: '',
    };
  }

  // 1. Sri Lankan Old NIC: 9 digits followed by 'V' or 'X' (e.g. 982341234V)
  const oldNicRegex = /^([0-9]{9})([VX])$/;
  if (oldNicRegex.test(clean)) {
    const dayDigits = parseInt(clean.substring(2, 5), 10);
    const isMaleDay = dayDigits >= 1 && dayDigits <= 366;
    const isFemaleDay = dayDigits >= 501 && dayDigits <= 866;

    if (!isMaleDay && !isFemaleDay) {
      return {
        isValid: false,
        type: 'nic_old',
        message: 'Invalid day of year in NIC (digits 3-5)',
        formattedValue: clean,
      };
    }

    return {
      isValid: true,
      type: 'nic_old',
      message: 'Valid Sri Lankan NIC (Old Format)',
      formattedValue: clean,
    };
  }

  // 2. Sri Lankan New NIC: 12 numeric digits (e.g. 199823401234)
  const newNicRegex = /^([0-9]{12})$/;
  if (newNicRegex.test(clean)) {
    const year = parseInt(clean.substring(0, 4), 10);
    const dayDigits = parseInt(clean.substring(4, 7), 10);
    const currentYear = new Date().getFullYear();

    if (year < 1900 || year > currentYear) {
      return {
        isValid: false,
        type: 'nic_new',
        message: `Birth year in NIC must be between 1900 and ${currentYear}`,
        formattedValue: clean,
      };
    }

    const isMaleDay = dayDigits >= 1 && dayDigits <= 366;
    const isFemaleDay = dayDigits >= 501 && dayDigits <= 866;

    if (!isMaleDay && !isFemaleDay) {
      return {
        isValid: false,
        type: 'nic_new',
        message: 'Invalid day of year in NIC (digits 5-7)',
        formattedValue: clean,
      };
    }

    return {
      isValid: true,
      type: 'nic_new',
      message: 'Valid Sri Lankan NIC (New Format)',
      formattedValue: clean,
    };
  }

  // 3. Passport Number: 1-2 letters followed by 6-9 digits/alphanumeric, total length 6-12 (e.g. N1234567)
  const passportRegex = /^[A-Z][0-9A-Z]{5,11}$/;
  if (passportRegex.test(clean)) {
    // If it is 10 chars with letter at end (e.g. 9 digits + letter), it should match Old NIC rule
    if (/^[0-9]{9}[A-Z]$/.test(clean)) {
      return {
        isValid: false,
        type: null,
        message: 'Old NIC format must end with "V" or "X"',
        formattedValue: clean,
      };
    }

    return {
      isValid: true,
      type: 'passport',
      message: 'Valid Passport Number',
      formattedValue: clean,
    };
  }

  // Informative in-progress typing guidance
  if (/^[0-9]{1,9}$/.test(clean)) {
    return {
      isValid: false,
      type: null,
      message: 'NIC format: Type 9 digits + V/X or 12 digits',
      formattedValue: clean,
    };
  }

  if (/^[0-9]{10,11}$/.test(clean)) {
    return {
      isValid: false,
      type: null,
      message: `New NIC requires 12 digits (${clean.length}/12 entered)`,
      formattedValue: clean,
    };
  }

  return {
    isValid: false,
    type: null,
    message: 'Invalid format. Enter NIC (981234567V / 199812345678) or Passport (N1234567)',
    formattedValue: clean,
  };
};
