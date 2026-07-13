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

export interface Tag {
  id: number;
  user_id?: number;
  name: string;
  color: string;
  created_at?: string;
}

export interface SegmentFilters {
  tagIds: number[];
  tagMatch: 'any' | 'all';
  hasEmail?: boolean;
  hasPhone?: boolean;
  lastVisitBeforeDays?: number;
  lastVisitAfterDays?: number;
}

export interface Segment {
  id: number;
  user_id?: number;
  name: string;
  filters_json: string;
  filters?: SegmentFilters;
  created_at?: string;
  updated_at?: string;
}

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
  tags?: Tag[];
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
  estimated_hours?: number | null;
  mileage_at_intake?: number | null;
  priority?: 'Standard' | 'Rush';
  customer_approved?: boolean | number;
  payment_status?: 'Paid' | 'Unpaid';
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

export interface JobNoteAttachment {
  id: number;
  note_id: number;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
  created_at?: string;
}

export interface JobNote {
  id: number;
  job_id: number;
  user_id?: number;
  note_text: string;
  created_at?: string;
  attachments: JobNoteAttachment[];
}

export type AppointmentType = 'general' | 'diagnostic' | 'repair' | 'pickup' | 'consultation';
export type AppointmentRecurrence = 'none' | 'weekly' | 'monthly';

export interface Appointment {
  id: number;
  title: string;
  customer_id: number;
  vehicle_id: number;
  job_id?: number | null;
  appointment_type?: AppointmentType;
  date: string;
  time: string;
  duration_minutes: number;
  notes: string;
  reminder_sent?: number;
  recurrence?: AppointmentRecurrence;
  recurrence_group_id?: string | null;
  created_at?: string;
  // Joined Fields
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_engine?: string;
  job_status?: Job['status'];
  job_description?: string;
}

export interface Funnel {
  id: number;
  slug: string;
  headline: string;
  subheadline: string | null;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  card_video_url: string | null;
  headline_bg_image_url: string | null;
  headline_bg_video_url: string | null;
  headline_bg_video_url_2: string | null;
  secondary_video_url: string | null;
  secondary_video_url_2: string | null;
  hero_video_url: string | null;
  video_form_bg_image_url: string | null;
  media_opacity: string | null; // JSON map of media field key -> 0-100 opacity, e.g. '{"image_url":80}'
  service_type: string | null;
  cta_text: string;
  active: number; // 0 or 1
  layout: 'classic' | 'modern' | 'video';
  thumbnail_url: string | null; // explicit override for the funnels-list card preview (falls back to image_url/video_url/hero_video_url if unset)
  created_at?: string;
  updated_at?: string;
  user_id?: number;
  // Joined stats (from GET /api/funnels list)
  lead_count?: number;
  converted_count?: number;
}

// Shape returned by the public GET /api/funnels/:slug renderer (no internal fields)
export interface PublicFunnel {
  slug: string;
  headline: string;
  subheadline: string | null;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  card_video_url: string | null;
  headline_bg_image_url: string | null;
  headline_bg_video_url: string | null;
  headline_bg_video_url_2: string | null;
  secondary_video_url: string | null;
  secondary_video_url_2: string | null;
  hero_video_url: string | null;
  video_form_bg_image_url: string | null;
  media_opacity: string | null;
  service_type: string | null;
  cta_text: string;
  layout: 'classic' | 'modern' | 'video';
}

// --- SITES: general-purpose block-based website builder ---

export type SiteBlockType =
  | 'hero' | 'text' | 'image' | 'video' | 'cta'
  | 'contact_form' | 'testimonial' | 'pricing' | 'faq' | 'spacer'
  | 'ai_chat_bot' | 'funnel';

// Site-wide look-and-feel — a flexible JSON blob (like block content/style)
// rather than fixed columns, since the set of themeable properties keeps
// growing. accent_color drives every button/highlight/active-state color on
// the public page. heading_font/body_font are a real font *pairing* (heading
// tags use one, everything else uses the other) — font_family is kept as a
// legacy fallback for sites created before pairing existed.
export interface ThemeConfig {
  accent_color?: string; // hex, e.g. "#f59e0b"
  secondary_color?: string; // hex — a second accent for variety (badges, secondary buttons)
  font_family?: string; // legacy single-font field, still read as a fallback
  heading_font?: string; // font used for all heading tags (h1-h6)
  body_font?: string; // font used for body/paragraph text
}

// Structured-data / crawler-facing SEO settings — a flexible JSON blob (same
// pattern as ThemeConfig) rather than fixed columns, since this list of
// fields is likely to grow. `schema_type` drives whether/what JSON-LD gets
// injected into the served HTML: 'none' emits nothing, 'LocalBusiness' and
// 'AutoRepair' both emit a schema.org block using site.name as the business
// name, business_phone/business_address if provided, and the site's
// thumbnail (or first Hero image) as the business image — 'AutoRepair' is
// schema.org's more specific subtype, a natural fit given what this app is
// for. Both og_title/og_description overrides are optional — when unset,
// Open Graph tags fall back to the site's title and meta_description.
export interface SiteSeoConfig {
  schema_type?: 'none' | 'LocalBusiness' | 'AutoRepair';
  business_phone?: string;
  business_address?: string;
  og_title_override?: string;
  og_description_override?: string;
}

export interface Site {
  id: number;
  name: string;
  subdomain: string;
  title: string | null;
  theme: 'dark' | 'light';
  active: number; // 0 or 1
  theme_config: string | null; // JSON string of ThemeConfig
  meta_description: string | null; // SEO <meta name="description">
  favicon_url: string | null;
  thumbnail_url: string | null; // custom override for the Sites list card preview (falls back to a live block-render if unset)
  seo_config: string | null; // JSON string of SiteSeoConfig
  created_at?: string;
  updated_at?: string;
  user_id?: number;
  block_count?: number;
  message_count?: number;
}

// Shape returned by the public by-subdomain resolve endpoint (no internal fields)
export interface PublicSite {
  name: string;
  subdomain: string;
  title: string | null;
  theme: 'dark' | 'light';
  theme_config: string | null;
  meta_description: string | null;
  favicon_url: string | null;
}

export type DeviceBreakpoint = 'desktop' | 'tablet' | 'mobile';

// A narrow slice of BlockStyle that can be overridden specifically for phones —
// e.g. a Hero that's text-xl on desktop can drop to text-md on mobile without
// touching the desktop look at all.
export interface MobileStyleOverride {
  font_size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
}

// Per-block style override — anything left unset falls back to the site's
// ThemeConfig (font_family, accent_color) or a sensible built-in default.
export interface BlockStyle {
  align?: 'left' | 'center' | 'right';
  bg_color?: string; // hex, overrides the block's default/transparent background
  text_color?: string; // hex, overrides body text color
  font_family?: string; // overrides the site default for this block only
  font_size?: 'sm' | 'md' | 'lg' | 'xl'; // scales headline/body text together
  padding?: 'sm' | 'md' | 'lg'; // internal breathing room

  // Typography fine-tuning
  line_height?: 'tight' | 'normal' | 'relaxed';
  letter_spacing?: 'tight' | 'normal' | 'wide';
  text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Background: solid color (bg_color above) or a gradient between two colors
  bg_type?: 'solid' | 'gradient';
  bg_gradient_from?: string;
  bg_gradient_to?: string;
  bg_gradient_direction?: 'to-r' | 'to-l' | 'to-b' | 'to-t' | 'to-br' | 'to-bl';
  bg_image_url?: string;
  bg_image_size?: 'cover' | 'contain' | 'auto';
  bg_image_position?: string;
  bg_image_opacity?: number;

  // Border
  border_width?: 0 | 1 | 2 | 4;
  border_style?: 'solid' | 'dashed' | 'dotted';
  border_color?: string;
  border_radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';

  // Shadow
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';

  // Hover state — applies to this block's primary button, if it has one
  hover_bg_color?: string;
  hover_text_color?: string;

  // Responsiveness
  mobile?: MobileStyleOverride;
  hide_on?: 'mobile' | 'desktop';

  // Position/size on the page's 12-column grid — set by dragging/resizing the
  // block on the builder canvas. grid_col/grid_col_span are 0-11 / 1-12
  // (columns); grid_row/grid_row_span are in fixed row-height units. Missing
  // values default to "full width, stacked below the last block."
  grid_col?: number;
  grid_col_span?: number;
  grid_row?: number;
  grid_row_span?: number;

  // Layers panel: pins a block's stacking order so it always renders in
  // front of (or behind) every other block on the page, regardless of which
  // block is currently selected. Without this, the canvas's selection-based
  // z-index bump (see SiteGridCanvas) can visually override a manually
  // arranged stacking order just by clicking a different block.
  z_lock?: 'front' | 'back';

  // Layers panel: user-editable display name shown instead of the generic
  // block-type label (e.g. "Hero Video" instead of just "Video"), purely
  // cosmetic — falls back to the block type's default label when unset.
  custom_label?: string;

  // Custom child layer layout features (visibility and nudge translation)
  invisible?: boolean;
  deleted_children?: string[];
  child_offsets?: Record<string, { x: number; y: number }>;
}

export interface SiteBlock {
  id: number;
  site_id: number;
  block_type: SiteBlockType;
  position: number;
  content: string; // JSON string, shape depends on block_type (see BlockContent below)
  media_opacity: string; // JSON map of media field key -> 0-100 opacity
  media_transform?: string; // JSON map of media field key -> MediaTransform (zoom/pan)
  style: string; // JSON string of BlockStyle
  created_at?: string;
  updated_at?: string;
  user_id?: number;
}

// Per-media-field zoom/pan, set via the builder canvas's right-click "Zoom &
// Position" mode. `zoom` is a scale factor (1 = fit/cover as normal, up to 4
// = 400%). `x`/`y` are percentage offsets of the media's own box, applied as
// `translate(x%, y%) scale(zoom)` — panning is intentionally computed in the
// UI relative to the CURRENT zoom level so a given mouse-drag distance feels
// the same regardless of how zoomed in you are.
export interface MediaTransform {
  zoom: number;
  x: number;
  y: number;
  rotate?: number;
}

export interface BlockOverlayItem {
  id: string;
  type: 'text' | 'image';
  text?: string;
  image_url?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
}

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

// A named, curated icon reference (Lucide icon name, e.g. "ArrowRight",
// "Phone", "Star") rather than free text — keeps the picker's choices and the
// rendered result guaranteed to match.
export type IconName = string;

// The parsed shape of SiteBlock.content, per block_type. Every field is optional
// since a freshly-added block starts as `{}` before the owner fills anything in.
// Body-like fields (body, quote, answer) hold HTML from the rich text editor
// (bold/italic/underline/strikethrough/links) rather than plain text.
export interface HeroBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  subheadline?: string; // rich HTML
  image_url?: string;
  image_alt?: string; // accessibility + SEO alt text for image_url, separate from the visible headline
  video_url?: string; // supports YouTube/Vimeo URLs (auto-embedded) or direct MP4
  object_fit?: 'cover' | 'contain';
  cta_text?: string;
  cta_link?: string;
  cta_icon?: IconName;
  cta_icon_position?: 'left' | 'right';
}
export interface TextBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  body?: string; // rich HTML
  align?: 'left' | 'center';
}
export interface ImageBlockContent {
  // `alt` is accessibility/SEO text (read by screen readers, indexed by Google
  // Images) — deliberately separate from `caption`, which is visible on-page
  // text. Falls back to caption if left blank, but the two often want to say
  // different things (a caption like "Our Team" vs. alt text describing what's
  // actually in the photo).
  images?: { url: string; caption?: string; alt?: string }[];
  layout?: 'grid' | 'carousel';
  object_fit?: 'cover' | 'contain';
  carousel_autoplay?: boolean;
}
export interface VideoBlockContent {
  video_url?: string; // supports YouTube/Vimeo URLs (auto-embedded) or direct MP4
  autoplay?: boolean;
  controls?: boolean;
  object_fit?: 'cover' | 'contain';
}
export interface CtaBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  subheadline?: string; // rich HTML
  button_text?: string;
  button_link?: string;
  button_icon?: IconName;
  button_icon_position?: 'left' | 'right';
}
export interface ContactFormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'dropdown' | 'checkbox';
  label: string;
  options?: string[]; // for 'dropdown'
  required?: boolean;
}
export interface ContactFormBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  subheadline?: string;
  button_text?: string;
  // Custom field builder — when present/non-empty, these render instead of the
  // fixed name/email/message trio. Submissions are stored as a JSON map keyed
  // by field id in site_messages.extra_fields.
  fields?: ContactFormField[];
}
export interface TestimonialBlockContent {
  quote?: string; // rich HTML
  author?: string;
  role?: string;
  photo_url?: string;
}
export interface PricingTier {
  name?: string;
  price?: string;
  features?: string[];
  highlighted?: boolean;
}
export interface PricingBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  tiers?: PricingTier[];
}
export interface FaqItem {
  question?: string;
  answer?: string; // rich HTML
}
export interface FaqBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  items?: FaqItem[];
}
export interface SpacerBlockContent {
  size?: 'sm' | 'md' | 'lg';
}
export interface AiChatBotBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  subheadline?: string;
  bot_id?: string;
  custom_avatar_image?: string;
}
export interface FunnelBlockContent {
  headline?: string;
  headline_tag?: HeadingTag;
  subheadline?: string;
  funnel_id?: number;
}

export interface SiteMessage {
  id: number;
  site_id: number;
  name: string | null;
  email: string | null;
  message: string;
  extra_fields: string | null; // JSON map of custom-field-id -> submitted value
  ip_address: string | null;
  created_at: string;
  user_id?: number;
}

export interface FunnelLead {
  id: number;
  funnel_id: number;
  name: string;
  phone: string;
  email: string;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  message: string;
  status: 'new' | 'converted' | 'spam';
  customer_id: number | null;
  job_id: number | null;
  ip_address: string | null;
  created_at: string;
  // Joined fields
  customer_name?: string;
  job_status?: string;
}

export interface DatabaseStats {
  totalManuals: number;
  totalCustomers: number;
  totalVehicles: number;
  activeJobs: number;
  avgRepairHours?: number;
  totalPendingHours?: number;
  lowStockCount?: number;
  queueCount?: number;
  // Financials (from realized Stripe payments)
  revenueTotalCents?: number;
  revenueThisMonthCents?: number;
  refundedTotalCents?: number;
  succeededPaymentsCount?: number;
  avgPaymentValueCents?: number;
  unpaidJobsCount?: number;
  unpaidJobsValue?: number;
  // Job pipeline breakdown
  totalJobsAllTime?: number;
  completedJobsCount?: number;
  rushJobsCount?: number;
  // Funnels & leads
  totalFunnels?: number;
  activeFunnels?: number;
  totalLeads?: number;
  convertedLeads?: number;
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
  default_parts_markup?: number;
  admin_notification_email?: string;
  daily_capacity_hours?: number;
  ical_token?: string;
  google_review_url?: string;
  local_access_url?: string;
}

export interface InventoryItem {
  id: number;
  part_number: string;
  name: string;
  category: 'brakes' | 'filters' | 'fluids' | 'electrical' | 'engine' | 'parts' | 'other';
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

export interface Service {
  id: number;
  user_id?: number;
  name: string;
  base_price: number;
  included_hours?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobService {
  id: number;
  job_id: number;
  service_id?: number | null;
  service_name_snapshot: string;
  base_price_charged: number;
  additional_hours?: number | null;
  additional_hours_cost?: number | null;
  created_at?: string;
  user_id?: number;
}

export interface Receipt {
  id: number;
  user_id: number;
  file_path: string;
  photo_data: string;
  uploaded_at: string;
  supplier_name: string | null;
  invoice_date: string | null;
  linked_import_summary: string | null;
  notes: string | null;
}

export interface EmailTemplate {
  id: number;
  user_id: number;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSent {
  id: number;
  user_id: number;
  to_email: string;
  to_customer_id: number | null;
  subject: string;
  body: string;
  template_id: number | null;
  status: 'sent' | 'failed';
  sent_at: string;
  
  // Joined from customers
  customer_name?: string | null;
}

export interface EmailReceived {
  id: number;
  user_id: number | null;
  from_email: string;
  from_customer_id: number | null;
  subject: string;
  body: string;
  received_at: string;

  // Joined from customers
  customer_name?: string | null;
}

export type SmsTriggerType = 'manual' | 'appointment_reminder' | 'job_complete' | 'funnel_confirmation' | 'funnel_admin_alert' | 'stale_lead_followup' | 'unpaid_reminder' | 'winback' | 'review_request';
export type SmsStatus = 'sent' | 'failed' | 'not_configured';

export interface SmsMessage {
  id: number;
  customer_id: number | null;
  phone: string;
  body: string;
  direction: 'outbound' | 'inbound';
  status: SmsStatus;
  error_message: string | null;
  trigger_type: SmsTriggerType;
  related_job_id: number | null;
  related_appointment_id: number | null;
  related_funnel_id: number | null;
  created_at: string;
  user_id?: number;
  // Joined from customers
  customer_name?: string | null;
}


