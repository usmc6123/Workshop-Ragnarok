/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, GarageItem, PageResponse, GarageVehicle, ServiceHistory, Job, JobPart, DatabaseStats } from '../types';
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
const SIMULATED_GARAGE_VEHICLES_KEY = 'ragnarok_simulated_garage_vehicles_v1';
const SIMULATED_SERVICE_HISTORY_KEY = 'ragnarok_simulated_service_history_v1';
const SIMULATED_JOBS_KEY = 'ragnarok_simulated_jobs_v1';
const SIMULATED_JOB_PARTS_KEY = 'ragnarok_simulated_job_parts_v1';

function getSimulatedGarageVehicles(): GarageVehicle[] {
  const saved = localStorage.getItem(SIMULATED_GARAGE_VEHICLES_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  const initial = [
    {
      id: 1,
      year: '2015',
      make: 'Ford',
      model: 'F-150',
      engine: '3.5L V6 EcoBoost',
      vin: '1FTFW1EF5FFA12345',
      color: 'Shadow Black',
      purchase_date: '2019-04-12',
      purchase_mileage: 45000,
      current_mileage: 98500,
      notes: 'Shop utility and parts runner. Regularly serviced.'
    },
    {
      id: 2,
      year: '2018',
      make: 'Honda',
      model: 'Civic',
      engine: '1.5L Turbo I4',
      vin: '1HGFC2F70JA098765',
      color: 'Rallye Red',
      purchase_date: '2021-08-30',
      purchase_mileage: 24000,
      current_mileage: 52000,
      notes: 'Lead technician\'s daily commuter.'
    }
  ];
  localStorage.setItem(SIMULATED_GARAGE_VEHICLES_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedGarageVehicles(list: GarageVehicle[]) {
  localStorage.setItem(SIMULATED_GARAGE_VEHICLES_KEY, JSON.stringify(list));
}

function getSimulatedServiceHistory(): ServiceHistory[] {
  const saved = localStorage.getItem(SIMULATED_SERVICE_HISTORY_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  const initial = [
    {
      id: 1,
      vehicle_id: 1,
      date: '2025-11-15',
      mileage: 95000,
      description: 'Routine Oil Change & Spark Plug Replacement',
      parts_used: '6x Motorcraft Spark Plugs, 6qt 5W-30 Full Synthetic, Oil Filter',
      cost: 145.50,
      technician: 'David Miller',
      notes: 'Plugs showed normal wear. Gapped to 0.030".'
    },
    {
      id: 2,
      vehicle_id: 1,
      date: '2026-03-10',
      mileage: 98000,
      description: 'Front Brake Pads & Rotors Replacement',
      parts_used: 'Heavy Duty Ceramic Front Brake Pads, 2x Premium Brake Rotors',
      cost: 280.00,
      technician: 'Marcus Vance',
      notes: 'Rotors were below minimum thickness spec. Brakes bedded in properly.'
    }
  ];
  localStorage.setItem(SIMULATED_SERVICE_HISTORY_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedServiceHistory(list: ServiceHistory[]) {
  localStorage.setItem(SIMULATED_SERVICE_HISTORY_KEY, JSON.stringify(list));
}

function getSimulatedJobs(): Job[] {
  const saved = localStorage.getItem(SIMULATED_JOBS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  const initial: Job[] = [
    {
      id: 1,
      customer_name: 'Sarah Connor',
      customer_phone: '555-0199',
      customer_email: 'sconnor@cyberdyne.net',
      vehicle_year: '1991',
      vehicle_make: 'Chevrolet',
      vehicle_model: 'Caprice',
      vehicle_vin: '1G1BL51E6MR123456',
      vehicle_mileage_in: 142000,
      description: 'Suspension clunk over bumps. Check front end.',
      notes: 'Inspect ball joints, control arm bushings, and tie rods. Customer requests phone call with estimate.',
      status: 'In Progress',
      estimated_completion: '2026-06-27'
    },
    {
      id: 2,
      customer_name: 'John Doe',
      customer_phone: '555-4321',
      customer_email: 'johndoe@example.com',
      vehicle_year: '2019',
      vehicle_make: 'Toyota',
      vehicle_model: 'Tacoma',
      vehicle_vin: '5TFDZ5AN4KX987654',
      vehicle_mileage_in: 68500,
      description: 'Transmission fluid flush & tire rotation.',
      notes: 'Regular maintenance service. Tires currently at 5/32" tread depth.',
      status: 'Pending',
      estimated_completion: '2026-06-26'
    }
  ];
  localStorage.setItem(SIMULATED_JOBS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedJobs(list: Job[]) {
  localStorage.setItem(SIMULATED_JOBS_KEY, JSON.stringify(list));
}

function getSimulatedJobParts(): JobPart[] {
  const saved = localStorage.getItem(SIMULATED_JOB_PARTS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  const initial = [
    {
      id: 1,
      job_id: 1,
      part_name: 'Front Upper Ball Joint',
      part_number: 'K772',
      quantity: 2,
      unit_cost: 34.99,
      notes: 'Moog Problem Solver'
    },
    {
      id: 2,
      job_id: 1,
      part_name: 'Sway Bar Link Kit',
      part_number: 'K8268',
      quantity: 2,
      unit_cost: 18.50,
      notes: 'Front driver & passenger'
    }
  ];
  localStorage.setItem(SIMULATED_JOB_PARTS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedJobParts(list: JobPart[]) {
  localStorage.setItem(SIMULATED_JOB_PARTS_KEY, JSON.stringify(list));
}

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
    if (error instanceof ApiError) {
      throw error;
    }
    // Any other error thrown by fetch represents helper/host/server being unreachable, treat as isOffline: true
    throw new ApiError(
      error.message || "Can't reach the manual server — make sure it's running on Roscoe or your LAN IP.",
      true
    );
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
  },

  // --- DATABASE STATS ---
  async getStats(): Promise<DatabaseStats> {
    try {
      return await request<DatabaseStats>('/api/stats');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving offline simulated stats.');
        const manuals = MOCK_VEHICLES.length;
        const vehicles = getSimulatedGarageVehicles().length;
        const jobs = getSimulatedJobs().length;
        return {
          totalManuals: manuals,
          totalGarageVehicles: vehicles,
          totalJobs: jobs
        };
      }
      throw err;
    }
  },

  // --- GARAGE VEHICLES ---
  async getGarageVehicles(): Promise<GarageVehicle[]> {
    try {
      return await request<GarageVehicle[]>('/api/garage-vehicles');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving offline garage vehicles.');
        return getSimulatedGarageVehicles();
      }
      throw err;
    }
  },

  async addGarageVehicle(vehicle: Omit<GarageVehicle, 'id'>): Promise<GarageVehicle> {
    try {
      return await request<GarageVehicle>('/api/garage-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating add garage vehicle.');
        const list = getSimulatedGarageVehicles();
        const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const newItem: GarageVehicle = { ...vehicle, id: nextId };
        saveSimulatedGarageVehicles([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async updateGarageVehicle(id: number, vehicle: GarageVehicle): Promise<GarageVehicle> {
    try {
      return await request<GarageVehicle>(`/api/garage-vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating update garage vehicle.');
        const list = getSimulatedGarageVehicles();
        const index = list.findIndex(item => item.id === id);
        if (index === -1) throw new ApiError('Vehicle not found', false);
        const updatedList = [...list];
        updatedList[index] = vehicle;
        saveSimulatedGarageVehicles(updatedList);
        return vehicle;
      }
      throw err;
    }
  },

  async deleteGarageVehicle(id: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/garage-vehicles/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating delete garage vehicle.');
        const list = getSimulatedGarageVehicles();
        const updatedList = list.filter(item => item.id !== id);
        saveSimulatedGarageVehicles(updatedList);
        // Clean service history for this vehicle
        const historyList = getSimulatedServiceHistory();
        saveSimulatedServiceHistory(historyList.filter(item => item.vehicle_id !== id));
        return { success: true };
      }
      throw err;
    }
  },

  // --- SERVICE HISTORY ---
  async getServiceHistory(vehicleId: number): Promise<ServiceHistory[]> {
    try {
      return await request<ServiceHistory[]>(`/api/service-history/${vehicleId}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving simulated service history.');
        return getSimulatedServiceHistory().filter(item => item.vehicle_id === vehicleId);
      }
      throw err;
    }
  },

  async addServiceEntry(entry: Omit<ServiceHistory, 'id'>): Promise<ServiceHistory> {
    try {
      return await request<ServiceHistory>('/api/service-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating add service entry.');
        const list = getSimulatedServiceHistory();
        const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const newItem: ServiceHistory = { ...entry, id: nextId };
        saveSimulatedServiceHistory([...list, newItem]);

        // Max mileage synchronization
        const vehicles = getSimulatedGarageVehicles();
        const vIndex = vehicles.findIndex(v => v.id === entry.vehicle_id);
        if (vIndex !== -1) {
          const updatedVehicles = [...vehicles];
          updatedVehicles[vIndex].current_mileage = Math.max(updatedVehicles[vIndex].current_mileage, entry.mileage);
          saveSimulatedGarageVehicles(updatedVehicles);
        }

        return newItem;
      }
      throw err;
    }
  },

  async updateServiceEntry(id: number, entry: ServiceHistory): Promise<ServiceHistory> {
    try {
      return await request<ServiceHistory>(`/api/service-history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating update service entry.');
        const list = getSimulatedServiceHistory();
        const index = list.findIndex(item => item.id === id);
        if (index === -1) throw new ApiError('Service entry not found', false);
        const updatedList = [...list];
        updatedList[index] = entry;
        saveSimulatedServiceHistory(updatedList);

        // Max mileage synchronization
        const vehicles = getSimulatedGarageVehicles();
        const vIndex = vehicles.findIndex(v => v.id === entry.vehicle_id);
        if (vIndex !== -1) {
          const updatedVehicles = [...vehicles];
          updatedVehicles[vIndex].current_mileage = Math.max(updatedVehicles[vIndex].current_mileage, entry.mileage);
          saveSimulatedGarageVehicles(updatedVehicles);
        }

        return entry;
      }
      throw err;
    }
  },

  async deleteServiceEntry(id: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/service-history/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating delete service entry.');
        const list = getSimulatedServiceHistory();
        const updatedList = list.filter(item => item.id !== id);
        saveSimulatedServiceHistory(updatedList);
        return { success: true };
      }
      throw err;
    }
  },

  // --- SHOP JOBS ---
  async getJobs(): Promise<Job[]> {
    try {
      return await request<Job[]>('/api/jobs');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving simulated shop jobs.');
        return getSimulatedJobs();
      }
      throw err;
    }
  },

  async addJob(job: Omit<Job, 'id'>): Promise<Job> {
    try {
      return await request<Job>('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating add job.');
        const list = getSimulatedJobs();
        const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const newItem: Job = { ...job, id: nextId, status: job.status || 'Pending' };
        saveSimulatedJobs([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async updateJob(id: number, job: Job): Promise<Job> {
    try {
      return await request<Job>(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating update job.');
        const list = getSimulatedJobs();
        const index = list.findIndex(item => item.id === id);
        if (index === -1) throw new ApiError('Job not found', false);
        const updatedList = [...list];
        updatedList[index] = job;
        saveSimulatedJobs(updatedList);
        return job;
      }
      throw err;
    }
  },

  async deleteJob(id: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/jobs/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating delete job.');
        const list = getSimulatedJobs();
        const updatedList = list.filter(item => item.id !== id);
        saveSimulatedJobs(updatedList);
        // Clean parts for this job
        const partsList = getSimulatedJobParts();
        saveSimulatedJobParts(partsList.filter(item => item.job_id !== id));
        return { success: true };
      }
      throw err;
    }
  },

  // --- JOB PARTS ---
  async getJobParts(jobId: number): Promise<JobPart[]> {
    try {
      return await request<JobPart[]>(`/api/jobs/${jobId}/parts`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving simulated job parts.');
        return getSimulatedJobParts().filter(item => item.job_id === jobId);
      }
      throw err;
    }
  },

  async addJobPart(jobId: number, part: Omit<JobPart, 'id' | 'job_id'>): Promise<JobPart> {
    try {
      return await request<JobPart>(`/api/jobs/${jobId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(part)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating add job part.');
        const list = getSimulatedJobParts();
        const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const newItem: JobPart = { ...part, id: nextId, job_id: jobId };
        saveSimulatedJobParts([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async deleteJobPart(jobId: number, partId: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/jobs/${jobId}/parts/${partId}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating delete job part.');
        const list = getSimulatedJobParts();
        const updatedList = list.filter(item => item.id !== partId);
        saveSimulatedJobParts(updatedList);
        return { success: true };
      }
      throw err;
    }
  }
};

