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
  | { type: 'text'; text: string };

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
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_vin: string;
  vehicle_mileage_in: number;
  description: string;
  notes: string;
  status: 'Pending' | 'In Progress' | 'Complete';
  estimated_completion: string;
  created_at?: string;
  updated_at?: string;
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

export interface DatabaseStats {
  totalManuals: number;
  totalGarageVehicles: number;
  totalJobs: number;
}

