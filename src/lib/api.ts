/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, GarageItem, PageResponse } from '../types';
import { 
  MOCK_GARAGE, 
  MOCK_MAKES, 
  MOCK_YEARS, 
  MOCK_VEHICLES, 
  MOCK_TOC, 
  MOCK_PAGES 
} from './mockData';

const STORAGE_KEY = 'car_manual_api_base';
const DEFAULT_API_BASE = 'http://localhost:4000';

const SIMULATED_GARAGE_KEY = 'ragnarok_simulated_garage_v1';

function getSimulatedGarage(): GarageItem[] {
  const saved = localStorage.getItem(SIMULATED_GARAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return [...MOCK_GARAGE];
}

function saveSimulatedGarage(list: GarageItem[]) {
  localStorage.setItem(SIMULATED_GARAGE_KEY, JSON.stringify(list));
}

export function getApiBase(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? saved.trim() : DEFAULT_API_BASE;
}

export function setApiBase(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.trim());
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 6000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export class ApiError extends Error {
  constructor(message: string, public isOffline: boolean = false) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const url = `${base}${path}`;

  try {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      throw new ApiError(`Server responded with status ${response.status}: ${response.statusText}`, false);
    }
    return await response.json() as T;
  } catch (error: any) {
    console.error('API request failed:', error);
    if (error.name === 'AbortError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new ApiError("Can't reach the manual server — make sure it's running on Roscoe or your LAN IP.", true);
    }
    throw new ApiError(error.message || 'An unknown network error occurred.', false);
  }
}

export const api = {
  // GET /api/makes
  async getMakes(): Promise<string[]> {
    try {
      return await request<string[]>('/api/makes');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving offline makes list.');
        return MOCK_MAKES;
      }
      throw err;
    }
  },

  // GET /api/years?make=Ford
  async getYears(make: string): Promise<string[]> {
    try {
      return await request<string[]>(`/api/years?make=${encodeURIComponent(make)}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving offline years list for make:', make);
        return MOCK_YEARS[make] || [];
      }
      throw err;
    }
  },

  // GET /api/vehicles?make=Ford&year=2008&q=Fusion&limit=50
  async getVehicles(make?: string, year?: string, query?: string, limit = 50): Promise<Vehicle[]> {
    try {
      const params = new URLSearchParams();
      if (make) params.append('make', make);
      if (year) params.append('year', year);
      if (query) params.append('q', query);
      params.append('limit', limit.toString());

      return await request<Vehicle[]>(`/api/vehicles?${params.toString()}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — searching offline vehicles catalogs.');
        let results = [...MOCK_VEHICLES];
        if (make) {
          results = results.filter((v) => v.make.toLowerCase() === make.toLowerCase());
        }
        if (year) {
          results = results.filter((v) => v.year === year);
        }
        if (query) {
          const q = query.toLowerCase();
          results = results.filter((v) => 
            v.make.toLowerCase().includes(q) || 
            v.model.toLowerCase().includes(q) || 
            v.year.includes(q) ||
            v.engine.toLowerCase().includes(q)
          );
        }
        return results.slice(0, limit);
      }
      throw err;
    }
  },

  // GET /api/garage
  async getGarage(): Promise<GarageItem[]> {
    try {
      return await request<GarageItem[]>('/api/garage');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving offline simulated garage cache.');
        return getSimulatedGarage();
      }
      throw err;
    }
  },

  // POST /api/garage
  async addToGarage(vehicleId: number, nickname?: string): Promise<GarageItem> {
    try {
      return await request<GarageItem>('/api/garage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, nickname }),
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — performing simulated bookmark addition.');
        const vehicle = MOCK_VEHICLES.find((v) => v.id === vehicleId);
        if (!vehicle) {
          throw new ApiError('Requested vehicle profile not found in simulation indexes.', false);
        }
        const currentList = getSimulatedGarage();
        const maxId = currentList.reduce((max, item) => Math.max(max, item.garageId), 0);
        const newItem: GarageItem = {
          ...vehicle,
          garageId: maxId + 1,
          nickname: nickname || undefined,
        };
        saveSimulatedGarage([...currentList, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  // DELETE /api/garage/:garageId
  async removeFromGarage(garageId: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/garage/${garageId}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — performing simulated bookmark removal.');
        const currentList = getSimulatedGarage();
        const updatedList = currentList.filter((item) => item.garageId !== garageId);
        saveSimulatedGarage(updatedList);
        return { success: true };
      }
      throw err;
    }
  },

  // GET /api/page?uri=<uriPath>
  async getPage(uri: string): Promise<PageResponse> {
    try {
      return await request<PageResponse>(`/api/page?uri=${encodeURIComponent(uri)}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving cached simulated page contents for URI:', uri);
        
        // Clean matching uri string (remove trailing backslash)
        const cleanUri = uri.trim().replace(/\/$/, '');
        if (MOCK_PAGES[cleanUri]) {
          return MOCK_PAGES[cleanUri];
        }
        
        // Return Table of Contents as fallback category
        return MOCK_TOC;
      }
      throw err;
    }
  },

  // Helper to format image Proxy URL
  getImageUrl(src: string): string {
    const base = getApiBase();
    return `${base}/api/image?src=${encodeURIComponent(src)}`;
  }
};

