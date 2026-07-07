/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Vehicle, GarageItem, PageResponse, Customer, CustomerVehicle, 
  ServiceHistory, Job, JobPart, Appointment, DatabaseStats, VehicleManual, ShopSettings, JobPhoto,
  InventoryItem, WorkOrderPart
} from '../types';

import { 
  MOCK_GARAGE, 
  MOCK_MAKES, 
  MOCK_YEARS, 
  MOCK_VEHICLES, 
  MOCK_TOC, 
  MOCK_PAGES 
} from './mockData';

const STORAGE_KEY = 'car_manual_api_base';
const DEFAULT_API_BASE = '';

const SIMULATED_GARAGE_KEY = 'ragnarok_simulated_garage_v1';
const SIMULATED_CUSTOMERS_KEY = 'ragnarok_simulated_customers_v1';
const SIMULATED_VEHICLES_KEY = 'ragnarok_simulated_vehicles_v1';
const SIMULATED_SERVICE_HISTORY_KEY = 'ragnarok_simulated_service_history_v1';
const SIMULATED_JOBS_KEY = 'ragnarok_simulated_jobs_v1';
const SIMULATED_JOB_PARTS_KEY = 'ragnarok_simulated_job_parts_v1';
const SIMULATED_APPOINTMENTS_KEY = 'ragnarok_simulated_appointments_v1';
const SIMULATED_VEHICLE_MANUALS_KEY = 'ragnarok_simulated_vehicle_manuals_v1';

// Offline Simulators
function getSimulatedVehicleManuals(): VehicleManual[] {
  const saved = localStorage.getItem(SIMULATED_VEHICLE_MANUALS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const initial: VehicleManual[] = [];
  localStorage.setItem(SIMULATED_VEHICLE_MANUALS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedVehicleManuals(list: VehicleManual[]) {
  localStorage.setItem(SIMULATED_VEHICLE_MANUALS_KEY, JSON.stringify(list));
}

// Offline Simulators
function getSimulatedCustomers(): Customer[] {
  const saved = localStorage.getItem(SIMULATED_CUSTOMERS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const initial: Customer[] = [
    { id: 1, name: 'Sarah Connor', phone: '555-0199', email: 'sconnor@cyberdyne.net', address: '123 Resistance Way, Los Angeles, CA', notes: 'Loyal customer. Prefers phone.' },
    { id: 2, name: 'John Doe', phone: '555-4321', email: 'johndoe@example.com', address: '456 Main St, Pasadena, CA', notes: 'Routine maintenance customer.' },
    { id: 3, name: 'Miles Dyson', phone: '555-2099', email: 'mdyson@cyberdyne.net', address: '789 Cyberdyne Blvd, Sunnyvale, CA', notes: 'Corvette collector.' }
  ];
  localStorage.setItem(SIMULATED_CUSTOMERS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedCustomers(list: Customer[]) {
  localStorage.setItem(SIMULATED_CUSTOMERS_KEY, JSON.stringify(list));
}

function getSimulatedVehicles(): CustomerVehicle[] {
  const saved = localStorage.getItem(SIMULATED_VEHICLES_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const initial: CustomerVehicle[] = [
    { id: 1, customer_id: 1, year: '1991', make: 'Chevrolet', model: 'Caprice', engine: '5.0L V8', vin: '1G1BL51E6MR123456', color: 'Midnight Blue', purchase_date: '1991-05-15', purchase_mileage: 0, current_mileage: 142000, notes: 'Heavy-duty suspension.', customer_name: 'Sarah Connor' },
    { id: 2, customer_id: 2, year: '2019', make: 'Toyota', model: 'Tacoma', engine: '3.5L V6', vin: '5TFDZ5AN4KX987654', color: 'Cement Gray', purchase_date: '2019-10-10', purchase_mileage: 12, current_mileage: 68500, notes: 'Regular servicing.', customer_name: 'John Doe' },
    { id: 3, customer_id: 3, year: '2011', make: 'Chevrolet', model: 'Corvette', engine: '6.2L V8 LS3', vin: '1G1YY2DW6B5100000', color: 'Torch Red', purchase_date: '2015-04-20', purchase_mileage: 12000, current_mileage: 31000, notes: 'Showroom condition.', customer_name: 'Miles Dyson' }
  ];
  localStorage.setItem(SIMULATED_VEHICLES_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedVehicles(list: CustomerVehicle[]) {
  localStorage.setItem(SIMULATED_VEHICLES_KEY, JSON.stringify(list));
}

function getSimulatedServiceHistory(): ServiceHistory[] {
  const saved = localStorage.getItem(SIMULATED_SERVICE_HISTORY_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const initial: ServiceHistory[] = [
    { id: 1, vehicle_id: 2, date: '2025-11-10', mileage: 58000, description: 'Routine Oil Service & Filter Replacement', parts_used: '7qt 0W-20 Full Synth, Oil Filter', cost: 59.99, technician: 'Marcus Vance', notes: 'Oil black but normal. Air filters checked clean.' },
    { id: 2, vehicle_id: 3, date: '2026-06-24', mileage: 31000, description: 'Misfire diagnostic spark plug swap', parts_used: '8x NGK Iridium Plugs', cost: 161.92, technician: 'David Miller', notes: 'Scanned cylinder 5 misfire. Spark plugs swapped.' }
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
    try { return JSON.parse(saved); } catch {}
  }
  const initial: Job[] = [
    { id: 1, customer_id: 1, vehicle_id: 1, description: 'Front suspension rebuild', diagnosis_notes: 'Inspect front end control arms, bushings, and tie rods for heavy wear.', labor_notes: 'Replace upper ball joints and sway bar links. Perform alignment.', status: 'In Progress', estimated_completion: '2026-06-27', labor_cost: 180.00, customer_name: 'Sarah Connor', customer_phone: '555-0199', customer_email: 'sconnor@cyberdyne.net', vehicle_year: '1991', vehicle_make: 'Chevrolet', vehicle_model: 'Caprice' },
    { id: 2, customer_id: 2, vehicle_id: 2, description: 'Tire rotation & transmission flush', diagnosis_notes: 'ATF inspection. Check cabin filters.', labor_notes: 'Rotate tires, flush automatic transmission fluid. Replaced cabin filter.', status: 'Pending', estimated_completion: '2026-06-26', labor_cost: 110.00, customer_name: 'John Doe', customer_phone: '555-4321', customer_email: 'johndoe@example.com', vehicle_year: '2019', vehicle_make: 'Toyota', vehicle_model: 'Tacoma' },
    { id: 3, customer_id: 3, vehicle_id: 3, description: 'Spark plug tune-up', diagnosis_notes: 'Missfire on cylinder 5 detected.', labor_notes: 'Scan ECU codes. Replace spark plugs on all cylinders.', status: 'Complete', estimated_completion: '2026-06-24', labor_cost: 90.00, customer_name: 'Miles Dyson', customer_phone: '555-2099', customer_email: 'mdyson@cyberdyne.net', vehicle_year: '2011', vehicle_make: 'Chevrolet', vehicle_model: 'Corvette' }
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
    try { return JSON.parse(saved); } catch {}
  }
  const initial: JobPart[] = [
    { id: 1, job_id: 1, part_name: 'Front Upper Ball Joint', part_number: 'K772', quantity: 2, unit_cost: 34.99, notes: 'Moog Problem Solver' },
    { id: 2, job_id: 1, part_name: 'Sway Bar Link Kit', part_number: 'K8268', quantity: 2, unit_cost: 18.50, notes: 'Front L/R Sway Bar' },
    { id: 3, job_id: 2, part_name: 'Toyota Genuine WS Fluid', part_number: '08886-02305', quantity: 4, unit_cost: 14.25, notes: 'Transmission Fluid quarts' },
    { id: 4, job_id: 3, part_name: 'NGK Iridium Spark Plugs', part_number: 'TR55IX', quantity: 8, unit_cost: 8.99, notes: 'Pre-gapped to 0.040"' }
  ];
  localStorage.setItem(SIMULATED_JOB_PARTS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedJobParts(list: JobPart[]) {
  localStorage.setItem(SIMULATED_JOB_PARTS_KEY, JSON.stringify(list));
}

const SIMULATED_JOB_PHOTOS_KEY = 'ragnarok_simulated_job_photos_v1';

function getSimulatedJobPhotos(): JobPhoto[] {
  const saved = localStorage.getItem(SIMULATED_JOB_PHOTOS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const initial: JobPhoto[] = [];
  localStorage.setItem(SIMULATED_JOB_PHOTOS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedJobPhotos(list: JobPhoto[]) {
  localStorage.setItem(SIMULATED_JOB_PHOTOS_KEY, JSON.stringify(list));
}

function getSimulatedAppointments(): Appointment[] {
  const saved = localStorage.getItem(SIMULATED_APPOINTMENTS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const initial: Appointment[] = [
    { id: 1, title: 'Sarah Connor - Caprice Rebuild Drop-off', customer_id: 1, vehicle_id: 1, date: '2026-06-27', time: '08:30', duration_minutes: 60, notes: 'Morning key drop. Requesting loaner.', customer_name: 'Sarah Connor', customer_phone: '555-0199', vehicle_year: '1991', vehicle_make: 'Chevrolet', vehicle_model: 'Caprice' },
    { id: 2, title: 'John Doe - Tacoma Service Wait', customer_id: 2, vehicle_id: 2, date: '2026-06-26', time: '13:00', duration_minutes: 90, notes: 'Wait in customer lounge.', customer_name: 'John Doe', customer_phone: '555-4321', vehicle_year: '2019', vehicle_make: 'Toyota', vehicle_model: 'Tacoma' }
  ];
  localStorage.setItem(SIMULATED_APPOINTMENTS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedAppointments(list: Appointment[]) {
  localStorage.setItem(SIMULATED_APPOINTMENTS_KEY, JSON.stringify(list));
}

function getSimulatedGarage(): GarageItem[] {
  const saved = localStorage.getItem(SIMULATED_GARAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [...MOCK_GARAGE];
}

function saveSimulatedGarage(list: GarageItem[]) {
  localStorage.setItem(SIMULATED_GARAGE_KEY, JSON.stringify(list));
}

const SIMULATED_SHOP_SETTINGS_KEY = 'ragnarok_simulated_shop_settings_v1';

function getSimulatedShopSettings(): ShopSettings {
  const saved = localStorage.getItem(SIMULATED_SHOP_SETTINGS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const initial: ShopSettings = {
    shop_name: '',
    shop_address: '',
    shop_city: '',
    shop_state: '',
    shop_phone: '',
    shop_logo_url: '',
    tax_rate: 0,
    default_labor_rate: 0,
    zip_code: ''
  };
  localStorage.setItem(SIMULATED_SHOP_SETTINGS_KEY, JSON.stringify(initial));
  return initial;
}

function saveSimulatedShopSettings(settings: ShopSettings) {
  localStorage.setItem(SIMULATED_SHOP_SETTINGS_KEY, JSON.stringify(settings));
}

export function getApiBase(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (saved.trim() === 'http://localhost:4000' || saved.trim() === 'http://localhost:3000')) {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_API_BASE;
  }
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

  const token = localStorage.getItem('workshop_token');
  const headers = {
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const mergedOptions = {
    ...options,
    headers,
  };

  try {
    const response = await fetchWithTimeout(url, mergedOptions);
    if (!response.ok) {
      throw new ApiError(`Server responded with status ${response.status}: ${response.statusText}`, false);
    }
    return await response.json() as T;
  } catch (error: any) {
    console.error('API request failed:', error);
    if (error instanceof ApiError) {
      throw error;
    }
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
        console.warn('API offline — returning MOCK_MAKES.');
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
        const vehicle = MOCK_VEHICLES.find((v) => v.id === vehicleId);
        if (!vehicle) {
          throw new ApiError('Requested vehicle not found.', false);
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
      // uri may already be URL-encoded (from resolveHref in TreeView).
      // Decode first to prevent double-encoding (%20 becoming %2520).
      console.log('[API] getPage uri:', uri);
      return await request<PageResponse>(`/api/page?uri=${encodeURIComponent(uri)}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const cleanUri = uri.trim().replace(/\/$/, '');
        if (MOCK_PAGES[cleanUri]) {
          return MOCK_PAGES[cleanUri];
        }
        return MOCK_TOC;
      }
      throw err;
    }
  },

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
        const manuals = MOCK_VEHICLES.length;
        const customers = getSimulatedCustomers().length;
        const vehicles = getSimulatedVehicles().length;
        const jobs = getSimulatedJobs().filter(j => j.status !== 'Complete' && j.status !== 'Cancelled').length;
        return {
          totalManuals: manuals,
          totalCustomers: customers,
          totalVehicles: vehicles,
          activeJobs: jobs,
          avgRepairHours: 3.2,
          totalPendingHours: 14.5,
          lowStockCount: 3,
          queueCount: jobs
        };
      }
      throw err;
    }
  },

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    try {
      return await request<Customer[]>('/api/customers');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const custs = getSimulatedCustomers();
        const vehs = getSimulatedVehicles();
        const history = getSimulatedServiceHistory();
        return custs.map(c => {
          const cVehs = vehs.filter(v => v.customer_id === c.id);
          const vIds = cVehs.map(v => v.id);
          const cHistory = history.filter(h => vIds.includes(h.vehicle_id));
          const lastVisitDate = cHistory.length > 0 ? cHistory.sort((a,b)=>b.date.localeCompare(a.date))[0].date : undefined;
          return {
            ...c,
            vehicle_count: cVehs.length,
            last_visit: lastVisitDate
          };
        });
      }
      throw err;
    }
  },

  async addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    try {
      return await request<Customer>('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedCustomers();
        const nextId = list.reduce((max, c) => Math.max(max, c.id), 0) + 1;
        const newItem: Customer = { ...customer, id: nextId };
        saveSimulatedCustomers([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async updateCustomer(id: number, customer: Customer): Promise<Customer> {
    try {
      return await request<Customer>(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedCustomers();
        const idx = list.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Customer not found');
        const updated = [...list];
        updated[idx] = customer;
        saveSimulatedCustomers(updated);
        return customer;
      }
      throw err;
    }
  },

  async deleteCustomer(id: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/customers/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedCustomers();
        saveSimulatedCustomers(list.filter(c => c.id !== id));
        // clean up associated vehicles and jobs in simulation
        const vehicles = getSimulatedVehicles();
        saveSimulatedVehicles(vehicles.filter(v => v.customer_id !== id));
        const jobs = getSimulatedJobs();
        saveSimulatedJobs(jobs.filter(j => j.customer_id !== id));
        const appointments = getSimulatedAppointments();
        saveSimulatedAppointments(appointments.filter(a => a.customer_id !== id));
        return { success: true };
      }
      throw err;
    }
  },

  // --- VEHICLES ---
  async getVehiclesAll(): Promise<CustomerVehicle[]> {
    try {
      return await request<CustomerVehicle[]>('/api/vehicles-all');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const vehs = getSimulatedVehicles();
        const custs = getSimulatedCustomers();
        const history = getSimulatedServiceHistory();
        return vehs.map(v => {
          const owner = custs.find(c => c.id === v.customer_id);
          const vHistory = history.filter(h => h.vehicle_id === v.id);
          const lastServiceDate = vHistory.length > 0 ? vHistory.sort((a,b)=>b.date.localeCompare(a.date))[0].date : undefined;
          return {
            ...v,
            customer_name: owner ? owner.name : 'Unknown Owner',
            customer_phone: owner ? owner.phone : '',
            customer_email: owner ? owner.email : '',
            last_service_date: lastServiceDate
          };
        });
      }
      throw err;
    }
  },

  async getCustomerVehicles(customerId: number): Promise<CustomerVehicle[]> {
    try {
      return await request<CustomerVehicle[]>(`/api/customers/${customerId}/vehicles`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        return getSimulatedVehicles().filter(v => v.customer_id === customerId);
      }
      throw err;
    }
  },

  async addVehicle(vehicle: Omit<CustomerVehicle, 'id'>): Promise<CustomerVehicle> {
    try {
      return await request<CustomerVehicle>('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedVehicles();
        const nextId = list.reduce((max, v) => Math.max(max, v.id), 0) + 1;
        const owner = getSimulatedCustomers().find(c => c.id === vehicle.customer_id);
        const newItem: CustomerVehicle = { 
          ...vehicle, 
          id: nextId,
          customer_name: owner ? owner.name : 'Unknown'
        };
        saveSimulatedVehicles([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async updateVehicle(id: number, vehicle: CustomerVehicle): Promise<CustomerVehicle> {
    try {
      return await request<CustomerVehicle>(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedVehicles();
        const idx = list.findIndex(v => v.id === id);
        if (idx === -1) throw new Error('Vehicle not found');
        const updated = [...list];
        updated[idx] = vehicle;
        saveSimulatedVehicles(updated);
        return vehicle;
      }
      throw err;
    }
  },

  async deleteVehicle(id: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/vehicles/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedVehicles();
        saveSimulatedVehicles(list.filter(v => v.id !== id));
        // clean up histories and appointments in simulation
        const history = getSimulatedServiceHistory();
        saveSimulatedServiceHistory(history.filter(h => h.vehicle_id !== id));
        const appointments = getSimulatedAppointments();
        saveSimulatedAppointments(appointments.filter(a => a.vehicle_id !== id));
        const jobs = getSimulatedJobs();
        saveSimulatedJobs(jobs.filter(j => j.vehicle_id !== id));
        return { success: true };
      }
      throw err;
    }
  },

  // For backwards compatibility with old GarageView
  async getGarageVehicles(): Promise<CustomerVehicle[]> {
    return this.getVehiclesAll();
  },
  async addGarageVehicle(vehicle: any): Promise<CustomerVehicle> {
    // Map to a default or first customer if not specified, to prevent breaks
    const custs = getSimulatedCustomers();
    const defaultCustId = custs.length > 0 ? custs[0].id : 1;
    return this.addVehicle({
      customer_id: vehicle.customer_id || defaultCustId,
      ...vehicle
    });
  },
  async updateGarageVehicle(id: number, vehicle: any): Promise<CustomerVehicle> {
    return this.updateVehicle(id, vehicle);
  },
  async deleteGarageVehicle(id: number): Promise<{ success: boolean }> {
    return this.deleteVehicle(id);
  },

  // --- SERVICE HISTORY ---
  async getServiceHistory(vehicleId: number): Promise<ServiceHistory[]> {
    try {
      return await request<ServiceHistory[]>(`/api/vehicles/${vehicleId}/service-history`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        return getSimulatedServiceHistory().filter(h => h.vehicle_id === vehicleId);
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
        const list = getSimulatedServiceHistory();
        const nextId = list.reduce((max, h) => Math.max(max, h.id), 0) + 1;
        const newItem: ServiceHistory = { ...entry, id: nextId };
        saveSimulatedServiceHistory([...list, newItem]);

        // Max mileage synchronization
        const vehicles = getSimulatedVehicles();
        const vIdx = vehicles.findIndex(v => v.id === entry.vehicle_id);
        if (vIdx !== -1) {
          const updated = [...vehicles];
          updated[vIdx].current_mileage = Math.max(updated[vIdx].current_mileage, entry.mileage);
          saveSimulatedVehicles(updated);
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
        const list = getSimulatedServiceHistory();
        const idx = list.findIndex(h => h.id === id);
        if (idx === -1) throw new Error('Service history not found');
        const updated = [...list];
        updated[idx] = entry;
        saveSimulatedServiceHistory(updated);

        // Max mileage synchronization
        const vehicles = getSimulatedVehicles();
        const vIdx = vehicles.findIndex(v => v.id === entry.vehicle_id);
        if (vIdx !== -1) {
          const updatedVehicles = [...vehicles];
          updatedVehicles[vIdx].current_mileage = Math.max(updatedVehicles[vIdx].current_mileage, entry.mileage);
          saveSimulatedVehicles(updatedVehicles);
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
        const list = getSimulatedServiceHistory();
        saveSimulatedServiceHistory(list.filter(h => h.id !== id));
        return { success: true };
      }
      throw err;
    }
  },

  // --- JOBS ---
  async getJobs(): Promise<Job[]> {
    try {
      return await request<Job[]>('/api/jobs');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const jobs = getSimulatedJobs();
        const custs = getSimulatedCustomers();
        const vehs = getSimulatedVehicles();
        return jobs.map(j => {
          const owner = custs.find(c => c.id === j.customer_id);
          const vehicle = vehs.find(v => v.id === j.vehicle_id);
          return {
            ...j,
            customer_name: owner ? owner.name : 'Unknown',
            customer_phone: owner ? owner.phone : '',
            customer_email: owner ? owner.email : '',
            vehicle_year: vehicle ? vehicle.year : '',
            vehicle_make: vehicle ? vehicle.make : '',
            vehicle_model: vehicle ? vehicle.model : '',
            vehicle_vin: vehicle ? vehicle.vin : '',
            vehicle_current_mileage: vehicle ? vehicle.current_mileage : 0
          };
        });
      }
      throw err;
    }
  },

  async getJobDetail(id: number): Promise<Job> {
    try {
      return await request<Job>(`/api/jobs/${id}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedJobs();
        const job = list.find(j => j.id === id);
        if (!job) throw new Error('Job not found');
        const owner = getSimulatedCustomers().find(c => c.id === job.customer_id);
        const vehicle = getSimulatedVehicles().find(v => v.id === job.vehicle_id);
        return {
          ...job,
          customer_name: owner ? owner.name : 'Unknown',
          customer_phone: owner ? owner.phone : '',
          customer_email: owner ? owner.email : '',
          customer_address: owner ? owner.address : '',
          vehicle_year: vehicle ? vehicle.year : '',
          vehicle_make: vehicle ? vehicle.make : '',
          vehicle_model: vehicle ? vehicle.model : '',
          vehicle_vin: vehicle ? vehicle.vin : '',
          vehicle_engine: vehicle ? vehicle.engine : '',
          vehicle_color: vehicle ? vehicle.color : '',
          vehicle_current_mileage: vehicle ? vehicle.current_mileage : 0
        };
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
        const list = getSimulatedJobs();
        const nextId = list.reduce((max, j) => Math.max(max, j.id), 0) + 1;
        const owner = getSimulatedCustomers().find(c => c.id === job.customer_id);
        const vehicle = getSimulatedVehicles().find(v => v.id === job.vehicle_id);
        const newItem: Job = { 
          ...job, 
          id: nextId,
          customer_name: owner ? owner.name : 'Unknown',
          vehicle_year: vehicle ? vehicle.year : '',
          vehicle_make: vehicle ? vehicle.make : '',
          vehicle_model: vehicle ? vehicle.model : ''
        };
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
        const list = getSimulatedJobs();
        const idx = list.findIndex(j => j.id === id);
        if (idx === -1) throw new Error('Job not found');
        const updated = [...list];
        updated[idx] = job;
        saveSimulatedJobs(updated);
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
        const list = getSimulatedJobs();
        saveSimulatedJobs(list.filter(j => j.id !== id));
        // clean up associated parts in simulation
        const parts = getSimulatedJobParts();
        saveSimulatedJobParts(parts.filter(p => p.job_id !== id));
        return { success: true };
      }
      throw err;
    }
  },

  // --- JOB PARTS (INVENTORY INTEGRATED) ---
  async updateJobPart(jobId: number, partId: number, part: JobPart): Promise<JobPart> {
    try {
      return await request<JobPart>(`/api/jobs/${jobId}/parts/${partId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(part)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedJobParts();
        const idx = list.findIndex(p => p.id === partId);
        if (idx === -1) throw new Error('Part not found');
        const updated = [...list];
        updated[idx] = part;
        saveSimulatedJobParts(updated);
        return part;
      }
      throw err;
    }
  },

  // --- JOB PHOTOS ---
  async getJobPhotos(jobId: number): Promise<JobPhoto[]> {
    try {
      return await request<JobPhoto[]>(`/api/jobs/${jobId}/photos`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        return getSimulatedJobPhotos().filter(p => p.job_id === jobId);
      }
      throw err;
    }
  },

  async addJobPhoto(jobId: number, photo: Omit<JobPhoto, 'id' | 'job_id'>): Promise<JobPhoto> {
    try {
      return await request<JobPhoto>(`/api/jobs/${jobId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photo)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedJobPhotos();
        const nextId = list.reduce((max, p) => Math.max(max, p.id), 0) + 1;
        const newItem: JobPhoto = { ...photo, id: nextId, job_id: jobId };
        saveSimulatedJobPhotos([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async deleteJobPhoto(jobId: number, photoId: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/jobs/${jobId}/photos/${photoId}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedJobPhotos();
        saveSimulatedJobPhotos(list.filter(p => p.id !== photoId));
        return { success: true };
      }
      throw err;
    }
  },

  // --- APPOINTMENTS ---
  async getAppointments(month?: string): Promise<Appointment[]> {
    try {
      const url = month ? `/api/appointments?month=${month}` : '/api/appointments';
      return await request<Appointment[]>(url);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        let appts = getSimulatedAppointments();
        if (month) {
          appts = appts.filter(a => a.date.startsWith(month));
        }
        const custs = getSimulatedCustomers();
        const vehs = getSimulatedVehicles();
        return appts.map(a => {
          const owner = custs.find(c => c.id === a.customer_id);
          const vehicle = vehs.find(v => v.id === a.vehicle_id);
          return {
            ...a,
            customer_name: owner ? owner.name : 'Unknown',
            customer_phone: owner ? owner.phone : '',
            customer_email: owner ? owner.email : '',
            vehicle_year: vehicle ? vehicle.year : '',
            vehicle_make: vehicle ? vehicle.make : '',
            vehicle_model: vehicle ? vehicle.model : '',
            vehicle_engine: vehicle ? vehicle.engine : ''
          };
        });
      }
      throw err;
    }
  },

  async addAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    try {
      return await request<Appointment>('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedAppointments();
        const nextId = list.reduce((max, a) => Math.max(max, a.id), 0) + 1;
        const owner = getSimulatedCustomers().find(c => c.id === appointment.customer_id);
        const vehicle = getSimulatedVehicles().find(v => v.id === appointment.vehicle_id);
        const newItem: Appointment = { 
          ...appointment, 
          id: nextId,
          customer_name: owner ? owner.name : 'Unknown',
          customer_phone: owner ? owner.phone : '',
          vehicle_year: vehicle ? vehicle.year : '',
          vehicle_make: vehicle ? vehicle.make : '',
          vehicle_model: vehicle ? vehicle.model : ''
        };
        saveSimulatedAppointments([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async updateAppointment(id: number, appointment: Appointment): Promise<Appointment> {
    try {
      return await request<Appointment>(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedAppointments();
        const idx = list.findIndex(a => a.id === id);
        if (idx === -1) throw new Error('Appointment not found');
        const updated = [...list];
        updated[idx] = appointment;
        saveSimulatedAppointments(updated);
        return appointment;
      }
      throw err;
    }
  },

  async deleteAppointment(id: number): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/api/appointments/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        const list = getSimulatedAppointments();
        saveSimulatedAppointments(list.filter(a => a.id !== id));
        return { success: true };
      }
      throw err;
    }
  },

  async getVehicleManuals(garageVehicleId: number): Promise<VehicleManual[]> {
    try {
      return await request<VehicleManual[]>(`/api/vehicle-manuals/${garageVehicleId}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — serving simulated vehicle manuals.');
        return getSimulatedVehicleManuals().filter(m => m.garageVehicleId === garageVehicleId);
      }
      throw err;
    }
  },

  async saveVehicleManual(data: { garageVehicleId: number, manualUri: string, manualTitle: string, manualMake: string, manualYear: string, manualModel: string, manualEngine: string }): Promise<VehicleManual> {
    try {
      return await request<VehicleManual>('/api/vehicle-manuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating save vehicle manual.');
        const list = getSimulatedVehicleManuals();
        const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const newItem: VehicleManual = {
          id: nextId,
          ...data,
          savedAt: new Date().toISOString()
        };
        saveSimulatedVehicleManuals([...list, newItem]);
        return newItem;
      }
      throw err;
    }
  },

  async deleteVehicleManual(id: number): Promise<void> {
    try {
      await request<void>(`/api/vehicle-manuals/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        console.warn('API is offline — simulating delete vehicle manual.');
        const list = getSimulatedVehicleManuals();
        saveSimulatedVehicleManuals(list.filter(m => m.id !== id));
        return;
      }
      throw err;
    }
  },

  // --- SHOP SETTINGS ---
  async getShopSettings(): Promise<ShopSettings> {
    try {
      return await request<ShopSettings>('/api/shop-settings');
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        return getSimulatedShopSettings();
      }
      throw err;
    }
  },

  async updateShopSettings(settings: ShopSettings): Promise<ShopSettings> {
    try {
      return await request<ShopSettings>('/api/shop-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isOffline) {
        saveSimulatedShopSettings(settings);
        return settings;
      }
      throw err;
    }
  },

  // --- INVENTORY MANAGEMENT ---
  async getInventory(q?: string, category?: string): Promise<InventoryItem[]> {
    let url = '/api/inventory?';
    if (q) url += `q=${encodeURIComponent(q)}&`;
    if (category) url += `category=${encodeURIComponent(category)}`;
    return await request<InventoryItem[]>(url);
  },

  async createInventoryItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    return await request<InventoryItem>('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  async updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem> {
    return await request<InventoryItem>(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  async deleteInventoryItem(id: number): Promise<{ success: boolean }> {
    return await request<{ success: boolean }>(`/api/inventory/${id}`, {
      method: 'DELETE'
    });
  },

  async adjustInventoryItem(id: number, delta: number, reason: string): Promise<InventoryItem> {
    return await request<InventoryItem>(`/api/inventory/${id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, reason })
    });
  },

  async parseInvoice(image: string, mimeType?: string): Promise<{ supplier_name: string | null; date: string | null; line_items: Array<{ name: string; part_number: string | null; quantity: number; unit_price: number; total_price: number }> }> {
    return await request<any>('/api/inventory/parse-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mimeType })
    });
  },

  // --- WORK ORDER INTEGRATION ---
  async getJobParts(jobId: number): Promise<any[]> {
    const raw = await request<any[]>(`/api/jobs/${jobId}/parts`);
    return (raw || []).map(p => ({
      ...p,
      part_name: p.part_name_snapshot,
      quantity: p.quantity_used,
      unit_cost: p.price_charged,
      part_number: p.part_number || ''
    }));
  },

  async addJobPart(jobId: number, data: any): Promise<any> {
    const payload = {
      inventory_item_id: data.inventory_item_id || null,
      part_name_snapshot: data.part_name_snapshot || data.part_name,
      quantity_used: data.quantity_used || data.quantity || 1,
      price_charged: data.price_charged !== undefined ? data.price_charged : data.unit_cost
    };
    const res = await request<any>(`/api/jobs/${jobId}/parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const partsList = (res.parts || []).map((p: any) => ({
      ...p,
      part_name: p.part_name_snapshot,
      quantity: p.quantity_used,
      unit_cost: p.price_charged,
      part_number: p.part_number || ''
    }));
    return {
      ...res,
      parts: partsList
    };
  },

  async deleteJobPart(jobId: number, partId: number): Promise<{ success: boolean }> {
    return await request<{ success: boolean }>(`/api/jobs/${jobId}/parts/${partId}`, {
      method: 'DELETE'
    });
  }
};
