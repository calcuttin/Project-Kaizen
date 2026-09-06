/** Shared primitives used by every module. Keep this file dependency-free. */

export type ID = string;

/** Every entity in Kaizen can belong to one of these life domains. */
export type Domain = 'personal' | 'business';

/** A "lens" is a domain filter that can also be "all". Used as a global UI filter. */
export type Lens = Domain | 'all';

export const DOMAINS: Domain[] = ['personal', 'business'];

export interface BaseEntity {
  id: ID;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  deletedAt?: string;
  revision?: number;
  source?: string;
  sourceRef?: string;
}

/** ISO date string YYYY-MM-DD (local). */
export type DateKey = string;

export function inLens(domain: Domain | undefined, lens: Lens): boolean {
  if (lens === 'all') return true;
  return domain === lens;
}
