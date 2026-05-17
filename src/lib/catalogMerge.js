import { GAS_CATALOG } from '../data/gasCatalog.js';

/** @param {Array<{id:string,label:string,hsn:string,defaultRatePer?:string,defaultRate?:number,lowFilled?:number}>} custom */
export function mergeCatalog(custom = []) {
  return [...GAS_CATALOG, ...custom];
}

export function isBuiltInProductId(id) {
  return GAS_CATALOG.some((p) => p.id === id);
}
