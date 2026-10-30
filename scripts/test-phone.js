const assert = require('assert');

// Simple test runner for phone normalization
const KHMER_TO_LATIN_DIGITS = {
  '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
  '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9',
};

function convertKhmerToLatinDigits(input) {
  return input.replace(/[០-៩]/g, (ch) => KHMER_TO_LATIN_DIGITS[ch] || ch);
}

function normalizePhoneNumber(raw) {
  if (!raw) return '';
  let cleaned = convertKhmerToLatinDigits(raw.trim());
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+855')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('855') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(3);
  }
  if (/^[1-9]\d{7,8}$/.test(cleaned)) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

console.log('Testing Cambodian Phone Normalization:');

// Test 1: Standard local phone
assert.strictEqual(normalizePhoneNumber('012 345 678'), '012345678');
console.log('✔ Standard local phone passed');

// Test 2: Country code +855
assert.strictEqual(normalizePhoneNumber('+855 12 345 678'), '012345678');
console.log('✔ +855 country code passed');

// Test 3: Khmer numerals ០១២ ៣៤៥ ៦៧៨
assert.strictEqual(normalizePhoneNumber('០១២ ៣៤៥ ៦៧៨'), '012345678');
console.log('✔ Khmer numerals passed');

// Test 4: Khmer numerals with +855 (+៨៥៥ ១២ ៣៤៥ ៦៧៨)
assert.strictEqual(normalizePhoneNumber('+៨៥៥ ១២ ៣៤៥ ៦៧៨'), '012345678');
console.log('✔ Khmer numerals with +855 passed');

// Test 5: Number without leading 0 (e.g., 12345678)
assert.strictEqual(normalizePhoneNumber('12345678'), '012345678');
console.log('✔ Missing leading zero normalized to local 0-prefix');

console.log('All phone normalization tests passed successfully!');

