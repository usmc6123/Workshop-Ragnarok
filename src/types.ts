/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vehicle {
  id: number;
  source: 'lemon' | 'charm';
  make: string;
  year: string;
  model: string;
  engine: string;
  uriPath: string;
  isComplete: number;
}

export interface GarageItem extends Vehicle {
  garageId: number;
  nickname?: string;
}

export type PageType = 'category' | 'content' | 'unknown';

export type CategoryTreeLink = {
  type: 'link';
  title: string;
  icon: string | null; // e.g. "/icons/service-and-repair.svg", or null
  href: string;         // percent-encoded, RELATIVE to the URI that fetched this tree
};

export type CategoryTreeFolder = {
  type: 'category';
  title: string;
  icon: string | null;
  children: CategoryTreeNode[];
};

export type CategoryTreeNode = CategoryTreeLink | CategoryTreeFolder;

export type CategoryPage = {
  pageType: 'category';
  title: string;
  tree: CategoryTreeNode[];
};

export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'image'; src: string }
  | { type: 'steps'; items: string[] }
  | { type: 'text'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

export type Block = ContentBlock; // alias for backward compatibility

export type ContentPage = {
  pageType: 'content';
  title: string;
  blocks: ContentBlock[];
};

export type UnknownPage = {
  pageType: 'unknown';
  title: string;
  blocks: [];
};

export type ParsedPage = CategoryPage | ContentPage | UnknownPage;
export type PageResponse = ParsedPage; // alias for client compatibility

// --- AUTO TECHNICIAN CRM TYPES ---

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at?: string;
  vehicle_count?: number;
  last_visit?: string;
}

export interface CustomerVehicle {
  id: number;
  customer_id: number;
  year: string;
  make: string;
  model: string;
  engine: string;
  vin: string;
  color: string;
  purchase_date: string;
  purchase_mileage: number;
  current_mileage: number;
  notes: string;
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  last_service_date?: string;
}

// For backwards-compatibility with old GarageView
export interface GarageVehicle {
  id: number;
  year: string;
  make: string;
  model: string;
  engine: string;
  vin: string;
  color: string;
  purchase_date: string;
  purchase_mileage: number;
  current_mileage: number;
  notes: string;
  created_at?: string;
}

export interface ServiceHistory {
  id: number;
  vehicle_id: number;
  job_id?: number | null;
  date: string;
  mileage: number;
  description: string;
  parts_used: string;
  cost: number;
  technician: string;
  notes: string;
  created_at?: string;
}

export interface Job {
  id: number;
  customer_id: number;
  vehicle_id: number;
  description: string;
  diagnosis_notes: string;
  labor_notes: string;
  status: 'Pending' | 'In Progress' | 'Complete' | 'Cancelled';
  estimated_completion: string;
  actual_completion?: string;
  labor_cost: number;
  created_at?: string;
  updated_at?: string;
  // Joined Fields
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  vehicle_engine?: string;
  vehicle_color?: string;
  vehicle_current_mileage?: number;
}

export interface JobPart {
  id: number;
  job_id: number;
  part_name: string;
  part_number: string;
  quantity: number;
  unit_cost: number;
  notes: string;
}

export interface JobPhoto {
  id: number;
  job_id: number;
  photo_data: string;
  caption: string;
  photo_type: 'before' | 'after';
  uploaded_at?: string;
}

export interface Appointment {
  id: number;
  title: string;
  customer_id: number;
  vehicle_id: number;
  date: string;
  time: string;
  duration_minutes: number;
  notes: string;
  created_at?: string;
  // Joined Fields
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_engine?: string;
}

export interface DatabaseStats {
  totalManuals: number;
  totalCustomers: number;
  totalVehicles: number;
  activeJobs: number;
}

export interface VehicleManual {
  id: number;
  garageVehicleId: number;
  manualUri: string;
  manualTitle: string;
  manualMake: string;
  manualYear: string;
  manualModel: string;
  manualEngine: string;
  savedAt: string;
}

export interface ShopSettings {
  id?: number;
  user_id?: number;
  shop_name: string;
  shop_address: string;
  shop_city: string;
  shop_state: string;
  shop_phone: string;
  shop_logo_url: string;
  tax_rate: number;
  default_labor_rate: number;
  zip_code: string;
}

export interface InventoryItem {
  id: number;
  part_number: string;
  name: string;
  category: 'brakes' | 'filters' | 'fluids' | 'electrical' | 'engine' | 'other';
  quantity_on_hand: number;
  reorder_threshold: number;
  unit_type: string;
  cost_price: number;
  sell_price: number;
  supplier_name?: string;
  location?: string;
  core_charge?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
}

export interface WorkOrderPart {
  id: number;
  job_id: number;
  inventory_item_id?: number | null;
  part_name_snapshot: string;
  quantity_used: number;
  price_charged: number;
  created_at?: string;
  user_id?: number;
  
  // Joined fields from inventory items
  part_number?: string;
  inventory_name?: string;
  category?: string;
  reorder_threshold?: number;
  quantity_on_hand?: number;
}

export interface InventoryAdjustment {
  id: number;
  item_id: number;
  delta: number;
  reason: string;
  created_at?: string;
  user_id?: number;
}

