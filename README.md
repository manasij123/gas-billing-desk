# MIG Gas Desk — Murshidabad Industrial Gases

Professional **Deep Emerald (#064e3b) + Gold (#c9a84c)** on **white**. **Sidebar** collapses to an icon rail; each nav row has a **small animated icon** matched to the module name.

## Run

```bash
cd gas-billing-desk
npm install
npm run dev
```

## Data

Everything persists in **`localStorage`** (`mig-gas-app-v1`): invoices, purchases, stock, **custom catalog items**, low-stock thresholds, parties, seller profile. **Reset all local data** is on the Dashboard footer.

## Modules

| Nav | Purpose |
|-----|--------|
| **Dashboard** | Today’s sales, month revenue, cylinders, low-stock alerts (with threshold), recent invoices, business profile |
| **Sales / Billing** | Live A4 GST invoice, **Save invoice** (filled −, empty +), **Print** (full sheet; scroll clipping disabled in print CSS) |
| **Purchase** | Supplier receive → **filled +**, **empty −** (swap); stock updates on save |
| **Stock** | **Sub-tabs:** **All SKUs** · **Low & out** (alerts only) · **Adjust stock** (± filled/empty) · **New item** (custom SKU + HSN + default low threshold). Per-SKU **Low at ≤** editable; custom SKUs removable |
| **Parties** | Customers & suppliers |
| **Reports** | Monthly sales vs purchase cylinders, top customers, product performance |

## Print

`@media print` forces **`overflow: visible`** on `#root`, main layout, and the billing preview wrapper so the **full A4** prints (not clipped by the on-screen scroll panel). **Print A4** also scrolls the invoice into view before `window.print()`.

## Later: cloud

Backend / Lovable Cloud can replace `localStorage` in `GasAppContext` when you want sync and login.
