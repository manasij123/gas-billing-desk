const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n) {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ''}`;
}

function threeDigitsToWords(n) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(' ');
}

function integerToIndianWords(num) {
  if (num === 0) return 'Zero';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;
  const chunks = [];
  if (crore) chunks.push(`${threeDigitsToWords(crore)} Crore`.trim());
  if (lakh) chunks.push(`${twoDigitsToWords(lakh)} Lakh`.trim());
  if (thousand) chunks.push(`${twoDigitsToWords(thousand)} Thousand`.trim());
  if (remainder) chunks.push(threeDigitsToWords(remainder));
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

function paiseToWords(paise) {
  if (paise <= 0) return '';
  return ` and ${integerToIndianWords(paise)} Paise`;
}

/**
 * @param {number} amount
 * @returns {string} e.g. "Rupees Eight Thousand Twenty Four Only"
 */
export function rupeesToWords(amount) {
  if (!Number.isFinite(amount) || amount < 0) return 'Rupees Zero Only';
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const rupeePart = integerToIndianWords(rupees);
  const paisePart = paiseToWords(paise);
  return `Rupees ${rupeePart}${paisePart} Only`.replace(/\s+/g, ' ');
}
