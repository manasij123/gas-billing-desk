import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEY, defaultAppState, hydrateState } from './defaultAppState.js';
import { mergeCatalog, isBuiltInProductId } from '../lib/catalogMerge.js';
import { uid } from '../utils/id.js';

const GasAppContext = createContext(null);

export function GasAppProvider({ children }) {
  const [state, setState] = useState(hydrateState);

  useEffect(() => {
    // Sync with localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, [state]);

  const fullCatalog = useMemo(() => {
    const base = mergeCatalog(state.customCatalog || []);
    return base.map(p => {
      const rateOverride = state.rateOverrides?.[p.id];
      return {
        ...p,
        defaultRate: (typeof rateOverride === 'number' && !Number.isNaN(rateOverride)) 
          ? rateOverride 
          : p.defaultRate
      };
    });
  }, [state.customCatalog, state.rateOverrides]);

  const getLowFilledFor = useCallback(
    (productId) => {
      const o = state.lowFilledOverrides || {};
      if (typeof o[productId] === 'number' && !Number.isNaN(o[productId])) return o[productId];
      const p = fullCatalog.find((x) => x.id === productId);
      return p?.lowFilled ?? 5;
    },
    [state.lowFilledOverrides, fullCatalog]
  );

  const updateSellerProfile = useCallback((patch) => {
    setState((s) => ({ ...s, sellerProfile: { ...s.sellerProfile, ...patch } }));
  }, []);

  const addCustomer = useCallback((row) => {
    const id = uid();
    setState((s) => ({ ...s, customers: [...s.customers, { id, ...row }] }));
    return id;
  }, []);

  const updateCustomer = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteCustomer = useCallback((id) => {
    setState((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }));
  }, []);

  const addSupplier = useCallback((row) => {
    const id = uid();
    setState((s) => ({ ...s, suppliers: [...s.suppliers, { id, ...row }] }));
    return id;
  }, []);

  const updateSupplier = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      suppliers: s.suppliers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteSupplier = useCallback((id) => {
    setState((s) => ({ ...s, suppliers: s.suppliers.filter((c) => c.id !== id) }));
  }, []);

  const addCatalogItem = useCallback(({ label, hsn, defaultRatePer = 'CUM', defaultRate = 0, lowFilled = 5 }) => {
    const id = `custom-${uid()}`;
    const row = {
      id,
      label: label.trim(),
      hsn: (hsn || '00000000').trim(),
      defaultRatePer,
      defaultRate: Number(defaultRate) || 0,
      lowFilled: Math.max(0, Math.floor(Number(lowFilled) || 5)),
    };
    setState((s) => ({
      ...s,
      customCatalog: [...(s.customCatalog || []), row],
      stockByProductId: {
        ...s.stockByProductId,
        [id]: s.stockByProductId[id] || { filled: 0, empty: 0 },
      },
    }));
    return id;
  }, []);

  const removeCatalogItem = useCallback((productId) => {
    if (isBuiltInProductId(productId)) return { ok: false, error: 'Cannot remove built-in product.' };
    setState((s) => {
      const nextCat = (s.customCatalog || []).filter((p) => p.id !== productId);
      const nextStock = { ...s.stockByProductId };
      delete nextStock[productId];
      const nextOv = { ...(s.lowFilledOverrides || {}) };
      delete nextOv[productId];
      return { ...s, customCatalog: nextCat, stockByProductId: nextStock, lowFilledOverrides: nextOv };
    });
    return { ok: true };
  }, []);

  const setLowFilledOverride = useCallback((productId, value) => {
    const n = Math.floor(Number(value));
    setState((s) => {
      const next = { ...(s.lowFilledOverrides || {}) };
      if (!Number.isFinite(n) || n < 0) delete next[productId];
      else next[productId] = n;
      return { ...s, lowFilledOverrides: next };
    });
  }, []);

  const setRateOverride = useCallback((productId, value) => {
    const n = Number(value);
    setState((s) => {
      const next = { ...(s.rateOverrides || {}) };
      if (!Number.isFinite(n) || n < 0) delete next[productId];
      else next[productId] = n;
      return { ...s, rateOverrides: next };
    });
  }, []);

  /** Manual stock correction (+/- filled / empty). */
  const adjustStock = useCallback((productId, filledDelta, emptyDelta) => {
    const df = Math.floor(Number(filledDelta) || 0);
    const de = Math.floor(Number(emptyDelta) || 0);
    let error = '';
    setState((prev) => {
      const cur = prev.stockByProductId[productId];
      if (!cur) {
        error = 'Unknown product.';
        return prev;
      }
      const nf = cur.filled + df;
      const ne = cur.empty + de;
      if (nf < 0 || ne < 0) {
        error = 'Counts cannot go negative.';
        return prev;
      }
      return {
        ...prev,
        stockByProductId: {
          ...prev.stockByProductId,
          [productId]: { filled: nf, empty: ne },
        },
      };
    });
    return error ? { ok: false, error } : { ok: true };
  }, []);

  /** @returns {{ ok: true, id: string } | { ok: false, error: string }} */
  const saveInvoice = useCallback((payload) => {
    const { stockMoves } = payload;

    // --- Pre-validation before setState ---
    const currentStock = state.stockByProductId; // Use current state for validation
    for (const m of stockMoves) {
      const cur = currentStock[m.productId];
      if (!cur) return { ok: false, error: `Unknown product stock: ${m.productId}` };
      if (cur.filled < m.qtyNo) {
        return {
          ok: false,
          error: `Not enough filled stock (${m.productId}). Have ${cur.filled}, need ${m.qtyNo} cylinders.`,
        };
      }
    }

    const invId = uid();

    // If all validations pass, proceed with state update
    setState((prev) => {
      const nextStock = { ...prev.stockByProductId };
      for (const m of stockMoves) {
        const cur = nextStock[m.productId];
        nextStock[m.productId] = {
          filled: cur.filled - m.qtyNo,
          empty: cur.empty + m.qtyNo,
        };
      }

      const record = {
        id: invId,
        savedAt: new Date().toISOString(),
        ...payload,
      };

      // Update Customer Holdings (Cylinders out with customer)
      let nextHoldings = [...prev.customerHoldings];
      for (const m of stockMoves) {
        const idx = nextHoldings.findIndex(h => h.customerId === payload.customerId && h.productId === m.productId);
        if (idx >= 0) {
          nextHoldings[idx] = { ...nextHoldings[idx], qty: nextHoldings[idx].qty + m.qtyNo };
        } else {
          nextHoldings.push({ customerId: payload.customerId, productId: m.productId, qty: m.qtyNo });
        }
      }

      return {
        ...prev,
        stockByProductId: nextStock,
        customerHoldings: nextHoldings,
        invoices: [record, ...prev.invoices],
        invoiceSeq: prev.invoiceSeq + 1,
      };
    });

    return { ok: true, id: invId }; 
  }, [state, fullCatalog]);

  /** Receive filled from supplier; return same qty of empties */
  const savePurchase = useCallback((payload) => { // Removed duplicate function
    const { lines } = payload;
    // --- Pre-validation before setState ---
    const currentStock = state.stockByProductId; // Use current state for validation
    for (const ln of lines) {
      const cur = currentStock[ln.productId];
      if (!cur) return { ok: false, error: `Unknown product: ${ln.productId}` };
      if (cur.empty < ln.qty) {
        return {
          ok: false,
          error: `Not enough empty cylinders (${ln.productId}). Have ${cur.empty}, need ${ln.qty}.`,
        };
      }
    }

    const purId = uid();

    // If all validations pass, proceed with state update
    setState((prev) => {
      const nextStock = { ...prev.stockByProductId };
      for (const ln of lines) {
        const cur = nextStock[ln.productId];
        nextStock[ln.productId] = {
          filled: cur.filled + ln.qty,
          empty: cur.empty - ln.qty,
        };
      }

      const record = {
        id: purId,
        savedAt: new Date().toISOString(),
        ...payload,
      };

      return {
        ...prev,
        stockByProductId: nextStock,
        purchases: [record, ...prev.purchases],
        purchaseSeq: prev.purchaseSeq + 1,
      };
    });

    return { ok: true, id: purId }; // Return success after setState
  }, [state, fullCatalog]);

  /** Mark empty cylinders returned by customer */
  const recordCylinderReturn = useCallback((customerId, productId, qty) => {
    const q = Math.max(0, Math.floor(Number(qty) || 0));
    if (q <= 0) return { ok: false, error: 'Invalid quantity' };

    setState((prev) => {
      const nextStock = { ...prev.stockByProductId };
      const cur = nextStock[productId];
      if (!cur) return prev;

      // Increase empty stock
      nextStock[productId] = { ...cur, empty: cur.empty + q };

      // Decrease customer holdings
      const nextHoldings = prev.customerHoldings.map(h => {
        if (h.customerId === customerId && h.productId === productId) {
          return { ...h, qty: Math.max(0, h.qty - q) };
        }
        return h;
      }).filter(h => h.qty > 0);

      return {
        ...prev,
        stockByProductId: nextStock,
        customerHoldings: nextHoldings
      };
    });
    return { ok: true };
  }, []);

  const resetAllData = useCallback(() => {
    setState(defaultAppState());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mig-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importData = useCallback((jsonObj) => {
    try {
      setState(jsonObj);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Invalid backup file' };
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      fullCatalog,
      getLowFilledFor,
      updateSellerProfile,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addCatalogItem,
      removeCatalogItem,
      setLowFilledOverride,
      setRateOverride,
      adjustStock,
      saveInvoice,
      savePurchase,
      recordCylinderReturn,
      resetAllData,
      exportData,
      importData,
    }),
    [
      state,
      fullCatalog,
      getLowFilledFor,
      updateSellerProfile,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addCatalogItem,
      removeCatalogItem,
      setLowFilledOverride,
      setRateOverride,
      adjustStock,
      saveInvoice,
      savePurchase,
      recordCylinderReturn,
      resetAllData,
      exportData,
      importData,
    ]
  );

  return <GasAppContext.Provider value={value}>{children}</GasAppContext.Provider>;
}

export function useGasApp() {
  const v = useContext(GasAppContext);
  if (!v) throw new Error('useGasApp must be used within GasAppProvider');
  return v;
}
