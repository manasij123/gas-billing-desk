import { mergeCatalog } from '../lib/catalogMerge.js';

export const STORAGE_KEY = 'mig-gas-app-v1';

export function defaultSellerProfile() {
  return {
    name: 'MURSHIDABAD INDUSTRIAL GASES',
    tagline: 'Industrial & Medical Gases — Oxygen, Nitrogen, Argon',
    iso: 'Supply partner: Narayan Oxygen Co. (P) Ltd — refill & bulk source',
    headOffice: 'BAHERAMPUR PANCHANANTALA, MURSHIDABAD\nNEAR HOTEL SOMRAT, WEST BENGAL — 742101',
    factory: 'Cylinder storage & dispatch — Berhampore (update if needed)',
    phones: '9932714835',
    gstn: '19XXXXXXXXXXXXXX',
    stateCode: '19',
    licenses: 'Update DL / statutory licence numbers as per your records.',
  };
}

export function defaultSuppliers() {
  return [
    {
      id: 'sup-narayan',
      name: 'NARAYAN OXYGEN CO. (P) LTD',
      address: 'N.S.ROAD, CHINSURAH, HOOGHLY — 712101 (W.B.) | Factory: JAPA, MOGRA, HOOGHLY — 712148',
      gstn: '19AACCN5382M1ZW',
      phone: '9231655872 / 9231655873',
    },
  ];
}

export function defaultCustomers() {
  return [
    {
      id: 'cust-1',
      name: 'Sample Buyer — Hooghly Workshop',
      address: 'Industrial Area, Hooghly\nWEST BENGAL',
      state: 'WEST BENGAL',
      stateCode: '19',
      gstNo: '',
      pan: '',
      phone: '9800012345',
    },
    {
      id: 'cust-2',
      name: 'Sample Buyer — Krishnagar Unit',
      address: 'Nadia, WEST BENGAL',
      state: 'WEST BENGAL',
      stateCode: '19',
      gstNo: '',
      pan: '',
      phone: '9876500000',
    },
  ];
}

function initialStock(customCatalog = []) {
  const o = {};
  for (const p of mergeCatalog(customCatalog)) {
    o[p.id] = { filled: 28, empty: 55 };
  }
  return o;
}

export function defaultAppState() {
  const customCatalog = [];
  return {
    sellerProfile: defaultSellerProfile(),
    customers: defaultCustomers(),
    suppliers: defaultSuppliers(),
    customCatalog,
    lowFilledOverrides: {},
    rateOverrides: {}, // নির্দিষ্ট রেট সেভ করার জন্য
    stockByProductId: initialStock(customCatalog),
    invoices: [],
    purchases: [],
    customerHoldings: [], // [{ customerId, productId, qty }]
    invoiceSeq: 1,
    purchaseSeq: 1,
  };
}

export function hydrateState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppState();
    const parsed = JSON.parse(raw);
    const base = defaultAppState();
    const customCatalog = Array.isArray(parsed.customCatalog) ? parsed.customCatalog : base.customCatalog;
    const lowFilledOverrides =
      parsed.lowFilledOverrides && typeof parsed.lowFilledOverrides === 'object'
        ? parsed.lowFilledOverrides
        : base.lowFilledOverrides;
    const rateOverrides =
      parsed.rateOverrides && typeof parsed.rateOverrides === 'object'
        ? parsed.rateOverrides
        : base.rateOverrides;

    const mergedStock = { ...initialStock(customCatalog) };
    if (parsed.stockByProductId && typeof parsed.stockByProductId === 'object') {
      for (const k of Object.keys(parsed.stockByProductId)) {
        mergedStock[k] = parsed.stockByProductId[k];
      }
    }

    return {
      ...base,
      ...parsed,
      sellerProfile: { ...base.sellerProfile, ...(parsed.sellerProfile || {}) },
      customCatalog,
      lowFilledOverrides,
      rateOverrides,
      stockByProductId: mergedStock,
      customers: Array.isArray(parsed.customers) ? parsed.customers : base.customers,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : base.suppliers,
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      customerHoldings: Array.isArray(parsed.customerHoldings) ? parsed.customerHoldings : [],
      invoiceSeq: typeof parsed.invoiceSeq === 'number' ? parsed.invoiceSeq : base.invoiceSeq,
      purchaseSeq: typeof parsed.purchaseSeq === 'number' ? parsed.purchaseSeq : base.purchaseSeq,
    };
  } catch {
    return defaultAppState();
  }
}
