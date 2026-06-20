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

export type PageType = 'category' | 'content';

export interface TreeItem {
  label: string;
  uri: string;
  children: TreeItem[];
}

export interface CategoryPage {
  pageType: 'category';
  title: string;
  tree: TreeItem[];
}

export type BlockType = 'heading' | 'text' | 'steps' | 'image';

export interface TextBlock {
  type: 'text' | 'heading';
  text: string;
}

export interface StepsBlock {
  type: 'steps';
  items: string[];
}

export interface ImageBlock {
  type: 'image';
  src: string;
}

export type Block = TextBlock | StepsBlock | ImageBlock;

export interface ContentPage {
  pageType: 'content';
  title: string;
  blocks: Block[];
}

export type PageResponse = CategoryPage | ContentPage;
