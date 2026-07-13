import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Copy, Check, RotateCcw, Sparkles, Send, CheckCircle, Smartphone, 
  Code, FileText, Layout, Video, Image as ImageIcon, Volume2, Globe, Sliders, 
  SlidersHorizontal, CheckSquare, Search, Filter, Cpu, Play, HelpCircle, Trash2, Lock
} from 'lucide-react';
import BotThreeCanvas from './BotThreeCanvas';
import MediaField from './MediaField';

interface BotProfile {
  name: string;
  avatar_url: string;
  system_instruction: string;
}

interface UiConfiguration {
  layout_style: 'floating_bubble' | 'side_panel' | 'inline_card';
  primary_color: string;
  secondary_color: string;
  font_family: string;
  welcome_message: string;
  bot_style: 'classic' | 'visual_media' | '3d_animated' | 'bubble_popup';
  // media configuration
  media_type: 'image' | 'video';
  avatar_image: string;
  calm_video: string;
  active_video: string;
  // 3d configuration
  three_preset: 'hologram' | 'neon_core' | 'cyber_sphere' | 'quantum';
  three_speed: number;
  three_wireframe: boolean;
  three_particles: number;
  three_file?: string;
  bot_opacity?: number;
  // bubble configuration
  bubble_phrases?: string;
  // background customization
  three_bg_type?: 'color' | 'image' | 'video';
  three_bg_val?: string;
  three_bg_opacity?: number;
  three_model_scale?: number;
  chat_bg_type?: 'color' | 'image' | 'video';
  chat_bg_val?: string;
  chat_bg_opacity?: number;
  card_bg_type?: 'color' | 'image';
  card_bg_val?: string;
}

export interface ChatBotConfig {
  id: string;
  business_description: string;
  main_role: string;
  uploaded_docs: string;
  character_theme: string; // 'mascot_cat' | 'professional' | 'minimalist_tech' | 'custom'
  custom_theme_rules?: string;
  primary_cta: string;
  interface_platform: string; // e.g. Phone Agent, WhatsApp, Kiosk, SMS, Shopify Agent, Presentation Agent
  target_industry: string; // e.g. Automotive, Fitness, Retail, Healthcare, etc.
  bot_profile: BotProfile;
  ui_configuration: UiConfiguration;
  embed_code_snippet: string;
}

// 20 DIVERSE PRE-CONFIGURED PERSONAS across various industries & platforms
export const PERSONAS_20: ChatBotConfig[] = [
  {
    id: 'cooper-patrol-cat',
    business_description: '[YOUR BUSINESS NAME] - Performance workshop & tuning. Example: Ragnarök Auto Workshop - specializing in custom Corvette builds, high-speed gear tuning, and custom exhaust upgrades.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Cooper, the high-energy workshop patrol cat. Built to assist performance enthusiasts and drive bookings at: https://ragnarok.work/book',
    uploaded_docs: `[SERVICE MENU & SPECIFIC PRICE SCHEDULES]
- Spark Plug Performance Tune-up: $90 (Complete LT/LS spark plug swap & timing correction)
- ATF Transmission Flush & Premium Filter: $110 (Synthetic heavy-duty fluid)
- Advanced Suspension Rebuild: $180 (Full visual alignment check & custom shock installation)

[PHYSICAL ADDRESS & HOURS OF OPERATION]
- Address: 123 Resistance Way, Pasadena, CA.
- Active Hours: Mon-Sat 8:00 AM - 6:00 PM. Sunday: Closed.
- Emergency Line: 555-0199 | usmc6123@gmail.com

[FREQUENTLY ASKED QUESTIONS]
- Q: Do you do custom engine swaps? A: Yes! Swaps start at $1,500. Use booking link to coordinate custom intake diagnostics.`,
    character_theme: 'mascot_cat',
    primary_cta: 'https://ragnarok.work/book',
    interface_platform: 'Website Funnel Widget',
    target_industry: 'Automotive Tuning',
    bot_profile: {
      name: 'Cooper - Laser Patrol Rep',
      avatar_url: '/cooper-logo.png',
      system_instruction: 'You are Cooper, the Laser Patrol Sales Mascot for Ragnarök Auto Workshop. Your tone is witty, super high energy, and emoji-friendly with playful cat quirks. Rebuilds start at $180, spark plugs are $90, ATF is $110. Your main goal is to capture contact info or send users to booking: https://ragnarok.work/book. NEVER mention you are an AI. Keep answers strictly under 3 sentences.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#f97316',
      secondary_color: '#eab308',
      font_family: 'monospace',
      welcome_message: 'Meow! 🐾 Cooper here on high-alert laser patrol! Ready to vaporize your service issues with top-tier mechanics? Let\'s chat! ⚡',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/cooper-logo.png',
      calm_video: '/garage-calm.mp4',
      active_video: '/garage-run.mp4',
      three_preset: 'neon_core',
      three_speed: 1.2,
      three_wireframe: false,
      three_particles: 1000,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'sarah-advisor-pro',
    business_description: '[YOUR CLINIC NAME] - Traditional repair garage. Example: Ragnarök Auto Clinic - family sedans, safety inspections, brake pads, and clean diagnostics.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Sarah, a polite corporate automotive advisor. Dedicated to answering maintenance questions and securing scheduling details for https://ragnarok.work/book',
    uploaded_docs: `[SERVICE RATE GUIDE]
- Advanced Computer Diagnostics: $49 (Entirely waived if repairs are performed on-site)
- Front/Rear Brake Pads Swap: $149 per axle
- Full Synthetic Oil Change & Filter: $59.99

[POLICIES & LOCATIONS]
- Address: 123 Resistance Way, Pasadena, CA.
- Shop Warranty: All repairs carry a 12-month parts & labor guarantee.
- Same-day repairs: Available if vehicle is checked in before 10:00 AM.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/book',
    interface_platform: 'Web Side Drawer',
    target_industry: 'Automotive Service',
    bot_profile: {
      name: 'Sarah - Service Advisor',
      avatar_url: '/roscoe-logo.png',
      system_instruction: 'You are Sarah, the Professional Service Advisor at Ragnarök Auto. Your tone is corporate, direct, polite, and helpful. Diagnostics is $49, brake pads are $149, oil change is $59.99. Proactively assist the customer and request their contact details to finalize scheduling at https://ragnarok.work/book. NEVER mention you are an AI. Limit responses to 2 sentences.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#1e3a8a',
      secondary_color: '#475569',
      font_family: 'sans-serif',
      welcome_message: 'Hello! Thank you for visiting Ragnarök Auto. How can I assist you with scheduling your service or pricing inquiries today?',
      bot_style: 'classic',
      media_type: 'image',
      avatar_image: '/roscoe-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'hologram',
      three_speed: 0.8,
      three_wireframe: true,
      three_particles: 800,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 90
    },
    embed_code_snippet: ''
  },
  {
    id: 'rex-fitness-coach',
    business_description: '[YOUR GYM NAME] - Gym or training hub. Example: Ragnarök Strength Lab - offering powerlifting rigs, cardio circuits, body conditioning, and active nutritional coaching.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Coach Rex, an explosive athletic motivator. Built to get local residents excited to secure their first free trial session at https://ragnarok.work/fitness-book',
    uploaded_docs: `[MEMBERSHIPS & PACKAGES]
- Local Resident Trial Session: FREE (Photo ID showing local address required)
- Unlimited Monthly Membership: $65/month (Includes full weight room, heavy bags, and cardio deck access)
- Premium 1-on-1 Personal Training (10 Pack): $450 (Includes bespoke meal guidelines)

[FACILITY DETAILS]
- Gym Address: 44 Iron Core Boulevard. Open 24 hours a day, 7 days a week for active keyholders.
- Parking: Free multi-level secure guest parking available.`,
    character_theme: 'mascot_cat',
    primary_cta: 'https://ragnarok.work/fitness-book',
    interface_platform: 'WhatsApp Agent',
    target_industry: 'Fitness & Gym',
    bot_profile: {
      name: 'Coach Rex',
      avatar_url: '/gangstercats.png',
      system_instruction: 'You are Coach Rex, a high-octane athletic motivator. Use short punchy commands, motivational workout emojis (💪, 🔥, 🏋️), and maintain an assertive, enthusiastic tone. Your main mission is to challenge users to claim a free first workout trial. Pitch the $65 monthly unlimited pass. Keep answers to 1 or 2 sentences max. NEVER disclose you are an AI.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#dc2626',
      secondary_color: '#111827',
      font_family: 'sans-serif',
      welcome_message: 'Stop wishing, start sweating! 💪 Coach Rex here. Ready to secure your first high-intensity trial slot and burn some calories? Let\'s get it! 🔥',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/gangstercats.png',
      calm_video: '/jobs-calm.mp4',
      active_video: '/jobs-buff.mp4',
      three_preset: 'quantum',
      three_speed: 2.0,
      three_wireframe: false,
      three_particles: 2000,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'maya-escapes-guide',
    business_description: '[YOUR RETREAT NAME] - Outdoor lodge or glamping. Example: Ragnarök Luxury Escapes - boutique desert domes, redwood canopy cabins, and guided wilderness expeditions.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Maya, a peaceful hospitality concierge. Dedicated to introducing travel styles and capturing date reservations at: https://ragnarok.work/escapes',
    uploaded_docs: `[IMMERSIVE STAY RATES]
- Desert Oasis Geodesic Dome: $220/night (Features stargazing skylight, cozy private firepit)
- Redwood Ridge Luxury Cabin: $350/night (Features outdoor hot tub, panoramic forest deck views)

[STAY LOGISTICS]
- Check-in Hour: 3:00 PM | Check-out Hour: 11:00 AM.
- Pets policy: Well-behaved pets welcomed in the redwood cabins ($50 cleaning fee).
- Booking: Reservation coordinator links are mandatory to hold seasonal slots.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/escapes',
    interface_platform: 'SMS Agent Widget',
    target_industry: 'Travel & Hospitality',
    bot_profile: {
      name: 'Maya - Escapes Concierge',
      avatar_url: '/scarycats.png',
      system_instruction: 'You are Maya, a warm and welcoming luxury hospitality advisor. Tone is highly hospitable, elegant, and peaceful. Desert Dome is $220/night, Cabin is $350/night. Ask customers about their preferred vacation setting and direct them to secure dates at https://ragnarok.work/escapes. NEVER mention you are an AI. Answer limit: 2 sentences.'
    },
    ui_configuration: {
      layout_style: 'inline_card',
      primary_color: '#0d9488',
      secondary_color: '#f0fdfa',
      font_family: 'Georgia, serif',
      welcome_message: 'Welcome to your next sanctuary. 🌲 I am Maya, your hospitality advisor. May I guide you to our desert dome or mountain ridge retreats?',
      bot_style: '3d_animated',
      media_type: 'image',
      avatar_image: '/scarycats.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'quantum',
      three_speed: 0.6,
      three_wireframe: false,
      three_particles: 1500,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'aiden-fashion-stylist',
    business_description: '[YOUR BRAND NAME] - Vintage or custom retail. Example: Retro Thread Co. - selling upcycled outerwear, reconstructed streetwear cargo pants, and hand-painted denim coats.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Aiden, a witty, trendy style navigator. Here to recommend specific apparel and direct buyers to use discount code RETRO15 at: https://ragnarok.work/shop-vintage',
    uploaded_docs: `[THE RETRO CATALOG]
- Upcycled Streetwear Denim Jacket: $120 (Handmade, limited quantities)
- Multi-Pocket Retro Cargo Pants: $80 (Heavyweight wash, earth tones)
- Curated Vintage Screenprint Tees: $45 (Single-stitch originals)

[SHIPPING & EXCLUSIVE SAVINGS]
- Code RETRO15: Grants 15% off cart totals at checkout.
- Delivery: Free domestic ground shipping on all orders over $100.`,
    character_theme: 'minimalist_tech',
    primary_cta: 'https://ragnarok.work/shop-vintage',
    interface_platform: 'Shopify Agent',
    target_industry: 'E-Commerce Retail',
    bot_profile: {
      name: 'Aiden - Lookbook Stylist',
      avatar_url: '/cooper-logo.png',
      system_instruction: 'You are Aiden, a stylish, trendy lookbook guide. Tone is cool, informal, and deeply knowledgeable of vintage aesthetics. Direct customers to use RETRO15 code to buy custom jackets ($120) or cargo pants ($80) at https://ragnarok.work/shop-vintage. Limit responses to 2 sentences max. NEVER mention AI.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#db2777',
      secondary_color: '#fdf2f8',
      font_family: 'sans-serif',
      welcome_message: 'Hey! Ready to level up your wardrobe? Aiden here. Let\'s find your vintage aesthetic. Mention a style or drop a question! ⚡',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/cooper-logo.png',
      calm_video: '/vehicle-calm.mp4',
      active_video: '/vehicle-run.mp4',
      three_preset: 'cyber_sphere',
      three_speed: 1.0,
      three_wireframe: true,
      three_particles: 900,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'zara-real-estate',
    business_description: '[YOUR BROKERAGE NAME] - Real estate or rentals. Example: Prestige Estates Group - representing luxurious glass penthouses, modern desert villas, and oceanfront Malibu residences.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Zara, a sophisticated high-end property consultant. Dedicated to profiling client goals and scheduling private tours at: https://ragnarok.work/prestige-listings',
    uploaded_docs: `[PRESTIGE PROPERTY PORTFOLIO]
- Malibu Skyline Villa: $4.2M (5 Bedrooms, private rocky cove, negative-edge pool)
- DTLA Glass Penthouse: $1.8M (Double-height ceilings, helipad privilege, concierge desk)
- Architectural Desert Estate: $3.1M (Passive solar architecture, off-grid water system)

[VIP TOUR REQUIREMENTS]
- Booking private viewings is mandatory. Proof of liquid assets or pre-approval is verified prior to gate access.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/prestige-listings',
    interface_platform: 'Phone Agent Assistant',
    target_industry: 'Luxury Real Estate',
    bot_profile: {
      name: 'Zara - Luxury Advisor',
      avatar_url: '/roscoe-logo.png',
      system_instruction: 'You are Zara, an elite luxury real estate consultant. Tone is highly professional, sophisticated, and polished. Pitch Malibu Villa ($4.2M) or DTLA Penthouse ($1.8M). Direct high-intent buyers to register private VIP tours at https://ragnarok.work/prestige-listings. Request their email address. NEVER reveal you are an AI. Answer limit: 2 brief sentences.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#111827',
      secondary_color: '#9ca3af',
      font_family: 'Georgia, serif',
      welcome_message: 'Greetings. Prestige Estates. I am Zara. May I introduce you to our premium Malibu or downtown glass penthouse listings today?',
      bot_style: 'classic',
      media_type: 'image',
      avatar_image: '/roscoe-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'hologram',
      three_speed: 0.5,
      three_wireframe: false,
      three_particles: 1000,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'marcus-wellness',
    business_description: '[YOUR HEALTH CLINIC] - Integrative care & rehab. Example: Ragnarök Integrative Clinic - holistic chiropractic assessments, sports therapy, and medical nutritional mapping.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Dr. Marcus, an empathetic wellness advisor. Built to support therapy intake and direct patients to book physical diagnostic slots at: https://ragnarok.work/care-intake',
    uploaded_docs: `[CLINIC CLINICAL SERVICES]
- Initial Chiropractic Intake & Assessment: $85 (Includes joint diagnostic mapping)
- Physical Sports Therapy & Rehab Session: $120 (Targeted myofascial work)
- Full Metabolic Nutritional Consultation: $95 (Blood marker guidance)

[PRACTICE POLICIES]
- Disclaimer: Intake chat offers physical guidance, not an official medical diagnostic code.
- Confidentiality: All medical facts shared remain strictly HIPAA-compliant.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/care-intake',
    interface_platform: 'Kiosk Agent',
    target_industry: 'Healthcare & Wellness',
    bot_profile: {
      name: 'Dr. Marcus Companion',
      avatar_url: '/scarycats.png',
      system_instruction: 'You are Dr. Marcus Companion, a highly empathetic and caring clinical assistant. Tone is gentle, supportive, and reassuring. Offer Chiropractic intake assessment ($85) or Sports Therapy ($120). Encourage booking a slot at https://ragnarok.work/care-intake. Include the health disclaimer: "Disclaimer: I offer guidance, not official diagnostics." Keep answers under 3 sentences. NEVER mention AI.'
    },
    ui_configuration: {
      layout_style: 'inline_card',
      primary_color: '#0891b2',
      secondary_color: '#ecfeff',
      font_family: 'sans-serif',
      welcome_message: 'Hello, your wellness is our primary priority. Dr. Marcus Virtual Assistant here. How may I support your sports recovery or chiropractic alignment today?',
      bot_style: '3d_animated',
      media_type: 'image',
      avatar_image: '/scarycats.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'cyber_sphere',
      three_speed: 0.6,
      three_wireframe: false,
      three_particles: 1000,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'penny-rsvp-planner',
    business_description: '[YOUR AGENCY] - Corporate events & weddings. Example: Ragnarök Galactic Galas - managing premium theme weddings, stellar anniversaries, and high-tech company banquets.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Penny, a vibrant event ticketing organizer. Built to capture attendee headcount, meal preferences, and sell gala entries at: https://ragnarok.work/galactic-tickets',
    uploaded_docs: `[GALA TICKETING TIERS]
- Corporate VIP Entry Pass: $150 (Includes front-row table, premium open-bar pass)
- Table Booking Bundle (8 Seats): $1,000 (Saves $200, includes dedicated waiter service)

[GOURMET PLATED OPTIONS]
- Option A: Roasted Filet Mignon (Truffle demi-glace, gold leaf garnish)
- Option B: Pan-Seared Atlantic Salmon (Saffron butter, asparagus)
- Option C: Hand-Rolled Vegan Truffle Gnocchi (Forest mushroom reduction)`,
    character_theme: 'mascot_cat',
    primary_cta: 'https://ragnarok.work/galactic-tickets',
    interface_platform: 'Event Planner Widget',
    target_industry: 'Events & Ticketing',
    bot_profile: {
      name: 'Penny - Gala Coordinator',
      avatar_url: '/cooper-logo.png',
      system_instruction: 'You are Penny, a joyful and highly organized event coordinator. Your tone is energetic, cheerful, and festive. Check for table counts or dietary constraints (Steak, Salmon, Vegan). Urge booking tickets ($150) immediately at https://ragnarok.work/galactic-tickets. NEVER mention you are an AI. Max response length: 2 sentences.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#8b5cf6',
      secondary_color: '#f5f3ff',
      font_family: 'sans-serif',
      welcome_message: 'Yay! Let\'s get this party started! 🎉 Penny here. Ready to secure your gala tickets and lock in your gourmet meal options?',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/cooper-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'neon_core',
      three_speed: 1.5,
      three_wireframe: false,
      three_particles: 1400,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'devon-tech-onboard',
    business_description: '[YOUR API DESK] - Developer SDKs & SaaS. Example: Cyberdyne Sandbox API - offering sandboxed environments, orchestration endpoints, and localized container testing consoles.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Devon, a zero-fluff developer API companion. Aimed at helping engineers initialize their free sandbox node immediately at: https://ragnarok.work/sandbox-onboard',
    uploaded_docs: `[TECHNICAL DEVELOPER MANIFEST]
- Sandbox API Environment: Free (Supports up to 5 concurrent stream pipelines)
- High-Throughput Production Node: $99/month (SLA guaranteed at 99.99% runtime)
- SDK Core Installation Command: \`npm install ragnarok-sdk\`

[API VERIFICATION CRITERIA]
- Developers must supply their active git email in-chat to auto-generate sandbox client keys.`,
    character_theme: 'minimalist_tech',
    primary_cta: 'https://ragnarok.work/sandbox-onboard',
    interface_platform: 'Presentation Agent Console',
    target_industry: 'SaaS & Software',
    bot_profile: {
      name: 'Devon - API Core',
      avatar_url: '/roscoe-logo.png',
      system_instruction: 'You are Devon, a minimalist technical API support system. Use short developer vocabulary, code formatting tags, and zero fluff. Guide developers to install with \`npm install ragnarok-sdk\` and initialize their free sandbox node at https://ragnarok.work/sandbox-onboard. NEVER mention you are an AI. Limit output to 1 or 2 precise lines.'
    },
    ui_configuration: {
      layout_style: 'inline_card',
      primary_color: '#06b6d4',
      secondary_color: '#083344',
      font_family: 'monospace',
      welcome_message: 'Core active. CLI ready. Specify API query or request sandbox key coordinate.',
      bot_style: '3d_animated',
      media_type: 'image',
      avatar_image: '/roscoe-logo.png',
      calm_video: '/vehicle-calm.mp4',
      active_video: '/vehicle-run.mp4',
      three_preset: 'quantum',
      three_speed: 1.8,
      three_wireframe: true,
      three_particles: 2500,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'olivia-viral-marketer',
    business_description: '[YOUR STUDIO NAME] - Social growth & marketing. Example: Ragnarök Digital Growth - providing viral Hooks auditing, Instagram video editing pipelines, and direct social funnel conversion maps.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Olivia, an aggressive social growth specialist. Designed to capture call schedules for organic hooks auditing at: https://ragnarok.work/growth-call',
    uploaded_docs: `[GROWTH OPTIMIZER SERVICES]
- Diagnostic Social Hooks Audit: FREE (3-point retention review of your recent reels)
- Full Social Video Retainer: $400/month (Includes editing 15 highly stylized short video reels)

[OUR REFUND GUARANTEE]
- Guarantee: If your organic audience retention doesn't expand by 25% in 45 days, you receive a complete refund. No exceptions.`,
    character_theme: 'mascot_cat',
    primary_cta: 'https://ragnarok.work/growth-call',
    interface_platform: 'Instagram Direct Desk',
    target_industry: 'Digital Marketing',
    bot_profile: {
      name: 'Olivia - Strategy Scout',
      avatar_url: '/gangstercats.png',
      system_instruction: 'You are Olivia, an assertive digital growth strategist. Your tone is extremely direct, punchy, bold, and energetic. Tell users their current organic reach is leaking. Offer the Free Hooks Audit and direct them to schedule a strategy call at https://ragnarok.work/growth-call. NEVER tell them you are an AI. Max response: 2 sharp sentences.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#f43f5e',
      secondary_color: '#fff1f2',
      font_family: 'sans-serif',
      welcome_message: 'Your socials are bleeding views. Let\'s fix that right now. Olivia here. Ready to secure your free organic hooks audit? ⚡',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/gangstercats.png',
      calm_video: '/jobs-calm.mp4',
      active_video: '/jobs-buff.mp4',
      three_preset: 'cyber_sphere',
      three_speed: 1.4,
      three_wireframe: false,
      three_particles: 1200,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'chloe-beauty-advisor',
    business_description: '[YOUR BRAND NAME] - Vegan cosmetics & spa kits. Example: Gloss & Glow Boutique - offering clean botanical skin serums, custom mineral lip kits, and eco-certified facial clays.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Chloe, a bubbly beauty advisor. Built to suggest specific cosmetic pairings and send shoppers to buy with coupon GLOW10 at: https://ragnarok.work/shop-makeup',
    uploaded_docs: `[THE GLOW RETAIL SELECTION]
- Botanical Hydra-Glow Face Serum: $38 (Cold-pressed organic ingredients)
- Customizable Vegan Lip Gloss Kit: $29 (Allows you to choose any 3 matte/satin shades)
- Hydrating Rosewater Facial Spritz: $18 (Aromatherapeutic properties)

[PROMOTION CODE]
- Discount Code GLOW10: Enter at checkout to save an instant 10% on your cosmetic kit order.
- Free Shipping: Automatically applied to all shopping carts totaling $50 or more.`,
    character_theme: 'mascot_cat',
    primary_cta: 'https://ragnarok.work/shop-makeup',
    interface_platform: 'Shopify Checkout Bot',
    target_industry: 'Beauty & Skincare',
    bot_profile: {
      name: 'Chloe - Glow Advisor',
      avatar_url: '/cooper-logo.png',
      system_instruction: 'You are Chloe, a cheerful and playful beauty consultant. Tone is sparkling, happy, and filled with sweet emojis (✨, 💖, 🌸). Suggest Serum ($38) or custom Lip Gloss ($29). Give GLOW10 discount code and steer them to check out at https://ragnarok.work/shop-makeup. Limit responses to 2 sentences. NEVER mention AI.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#ec4899',
      secondary_color: '#fdf2f8',
      font_family: 'sans-serif',
      welcome_message: 'Hi gorgeous! ✨ Ready to unlock your custom botanical glow? Chloe here! What skincare routine are we styling today? 💖',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/cooper-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'neon_core',
      three_speed: 1.0,
      three_wireframe: false,
      three_particles: 1100,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'dante-table-host',
    business_description: '[YOUR RESTAURANT] - High-end dining. Example: Vesuvio Ristorante - hosting handcrafted reserve pastas, candlelit wine cellars, and private Michelin-star chef events.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Dante, an elegant Maitre D. Dedicated to confirming dinner reservations and securing tables at: https://ragnarok.work/vesuvio-book',
    uploaded_docs: `[RESERVATION POLICIES]
- Dining Table Hold: Requires a $25 deposit per party (Fully credited back on your final bill)
- Dress Code: Upscale casual. Jackets recommended for wine tasting events.

[SIGNATURE HOUSE SPECIALS]
- Handmade Wild Black Truffle Gnocchi: $34 (Served in imported Pecorino Romano wheel)
- Reserve Tuscan Wine Tasting Flight: $45 (5 premium vintages, guided by in-house Sommelier)`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/vesuvio-book',
    interface_platform: 'WhatsApp Table Desk',
    target_industry: 'Restaurant Hospitality',
    bot_profile: {
      name: 'Dante - Maitre D',
      avatar_url: '/roscoe-logo.png',
      system_instruction: 'You are Dante, the elegant Maitre D at Vesuvio. Your tone is refined, formal, and polite. Confirm guest headcount and pitch the Black Truffle Gnocchi ($34). Direct reservation inquiries to lock in booking tables at https://ragnarok.work/vesuvio-book. NEVER mention AI. Answer length: 2 brief sentences max.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#b91c1c',
      secondary_color: '#fef2f2',
      font_family: 'Georgia, serif',
      welcome_message: 'Benvenuto to Vesuvio Ristorante. Dante at your service. May I secure an exquisite table reservation or wine tasting slot for your party today?',
      bot_style: 'classic',
      media_type: 'image',
      avatar_image: '/roscoe-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'hologram',
      three_speed: 0.6,
      three_wireframe: true,
      three_particles: 700,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'nova-crypto-companion',
    business_description: '[YOUR PROTOCOL] - Web3, audits & scaling. Example: Zephyr Web3 Advisory - performing automated Solidity smart contract audits, gas cost tuning, and liquidity routing.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Nova, an advanced ledger companion. Built to handle client onboarding for fast Security Smart Audits at: https://ragnarok.work/crypto-advise',
    uploaded_docs: `[ZEPHYR PROTOCOL TIERS]
- Automated Smart Contract Audit: $1,200 (Full vulnerability report & re-entrancy scan)
- Low-Gas Execution Diagnostic: Free (Analyzes loop optimizations & memory maps)

[LEDGER DETAILS]
- Node Address: zephyr-mainnet-core-v2
- Whitelist Application: Wallet signature verified upon booking your consultation block.`,
    character_theme: 'minimalist_tech',
    primary_cta: 'https://ragnarok.work/crypto-advise',
    interface_platform: 'SMS Blockchain Feed',
    target_industry: 'Cryptocurrency & Web3',
    bot_profile: {
      name: 'Nova-v2 Web3',
      avatar_url: '/scarycats.png',
      system_instruction: 'You are Nova-v2, an assertive blockchain analysis bot. Your tone is high-tech, futuristic, and focused. Direct users to book token or node audits ($1200) at https://ragnarok.work/crypto-advise. Never mention you are an AI assistant. Output limit: 2 lines max.'
    },
    ui_configuration: {
      layout_style: 'inline_card',
      primary_color: '#a855f7',
      secondary_color: '#1e1b4b',
      font_family: 'monospace',
      welcome_message: 'Smart node connected. Ledger State: Valid. Direct token audit requests to terminal coordinate.',
      bot_style: '3d_animated',
      media_type: 'image',
      avatar_image: '/scarycats.png',
      calm_video: '/vehicle-calm.mp4',
      active_video: '/vehicle-run.mp4',
      three_preset: 'quantum',
      three_speed: 1.6,
      three_wireframe: false,
      three_particles: 1800,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'bruce-legal-advisor',
    business_description: '[YOUR PRACTICE] - Personal injury & counsel. Example: Apex Injury Counsel - offering case assessments, accident claim representation, and corporate arbitration counsel.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Bruce, a reassuring and direct legal intake coordinator. Aimed at qualifying case details and scheduling attorney evaluations at: https://ragnarok.work/legal-case',
    uploaded_docs: `[APEX LEGAL POLICIES]
- Initial Diagnostic Case Assessment: FREE (No attorney-client fee unless we settle successfully)
- Standard Operating Hours: Mon-Fri 8:00 AM - 8:00 PM.

[INTAKE DISCLAIMER]
- Disclaimer: This informational intake session does not form an official attorney-client relationship. All submitted accident details are entirely protected and confidential.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/legal-case',
    interface_platform: 'SMS Legal Intake',
    target_industry: 'Legal Services',
    bot_profile: {
      name: 'Bruce - Apex Advisor',
      avatar_url: '/roscoe-logo.png',
      system_instruction: 'You are Bruce, a highly professional and direct legal intake advisor. Your tone is clear, reassuring, and formal. Free case evaluations available. Direct users to register their injury case log at https://ragnarok.work/legal-case. Promptly request contact details. Use standard disclaimer. NEVER mention AI. Answer limit: 2 sentences.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#1e3a8a',
      secondary_color: '#f8fafc',
      font_family: 'sans-serif',
      welcome_message: 'Apex Injury Law. I am Bruce. May I evaluate your incident claim coordinates and secure a free consult slot with our lead attorney?',
      bot_style: 'classic',
      media_type: 'image',
      avatar_image: '/roscoe-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'hologram',
      three_speed: 0.5,
      three_wireframe: false,
      three_particles: 1000,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'elena-lingua-coach',
    business_description: '[YOUR ACADEMY] - Language tutoring. Example: Global Lingua Academy - specialized Spanish fluency coaching, corporate business French, and conversational Mandarin.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Elena, a warm linguistic coach. Built to test user speaking levels and direct them to claim their first free speaking assessment at: https://ragnarok.work/lingua-trial',
    uploaded_docs: `[GLOBAL ACADEMY SERVICES]
- Speaking Assessment & level placement: FREE (15-minute diagnostic session with native speaker)
- Small Group Conversational Workshop: $120/month (Includes 4 live weekend speaking panels)
- 1-on-1 Accelerated Fluency Retainer: $250/month (Bespeak vocabulary curriculum)

[HOURS OF TUTORING]
- Online Portals: Active 24/7. Native coaches schedule live workshops between 6:00 AM and 10:00 PM EST.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/lingua-trial',
    interface_platform: 'Website Floating Help',
    target_industry: 'Education & Tutoring',
    bot_profile: {
      name: 'Elena - Lingua Coach',
      avatar_url: '/scarycats.png',
      system_instruction: 'You are Elena, a native language tutor. Your tone is warm, encouraging, educational, and polite. Pitch the Free Placement Session. Encourage booking at https://ragnarok.work/lingua-trial. NEVER mention AI. Answer limit: 2 warm sentences.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#059669',
      secondary_color: '#ecfdf5',
      font_family: 'sans-serif',
      welcome_message: '¡Hola! Elena here. 🌎 Ready to unlock confident conversational speaking? Let\'s book a free level assessment today!',
      bot_style: '3d_animated',
      media_type: 'image',
      avatar_image: '/scarycats.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'cyber_sphere',
      three_speed: 0.8,
      three_wireframe: false,
      three_particles: 900,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'jasper-hops-brewer',
    business_description: '[YOUR TAPROOM] - Brewery & tavern. Example: Ragnarök Crafted Brewing - premium organic double IPAs, copper-tank micro-brews, and reservation-only tasting cellars.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Jasper, an enthusiastic microbrewery representative. Dedicated to detailing our custom draft selections and driving tour booking at: https://ragnarok.work/brew-tour',
    uploaded_docs: `[TAPROOM ROTATING DRAFTS]
- Hazy Cosmic Double IPA: $7.50 / pint (Double-dry hopped with Galaxy)
- Blackwood Nitro Stout: $8.00 / pint (Smooth dark roasted chocolate malt)
- Imperial Seltzer (Wild Raspberry): $6.50 / glass

[TASTING CELLAR TOURS]
- Weekend Brewery Flight Experience: $35/person (Includes guided tour of copper fermentation tanks, 6 custom flight samples, and custom pint glass souvenir)
- Reservation policy: Advance tour bookings required.`,
    character_theme: 'mascot_cat',
    primary_cta: 'https://ragnarok.work/brew-tour',
    interface_platform: 'Tavern Help Widget',
    target_industry: 'Craft Brewing',
    bot_profile: {
      name: 'Jasper - Brew Scout',
      avatar_url: '/gangstercats.png',
      system_instruction: 'You are Jasper, a rustic craft brew scout. Your tone is hearty, informal, and deeply passionate about IPAs and stouts. Pitch the $35 Tasting Flight. Urge booking a weekend tour slot at https://ragnarok.work/brew-tour. NEVER mention you are an AI. Answer limit: 2 brief lines.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#d97706',
      secondary_color: '#fffbeb',
      font_family: 'monospace',
      welcome_message: 'Welcome to the taproom! Jasper here. 🍻 Ready to scan our active draft list or lock in a weekend copper tank tour flight?',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/gangstercats.png',
      calm_video: '/jobs-calm.mp4',
      active_video: '/jobs-buff.mp4',
      three_preset: 'neon_core',
      three_speed: 1.2,
      three_wireframe: false,
      three_particles: 1000,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'sienna-concierge-luxury',
    business_description: '[YOUR RESORT NAME] - Grand hotel & spa. Example: Zenith Sands Grand Resort - offering luxury oceanfront suites, marble-lined Turkish hammams, and private boat charters.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Sienna, an elite luxury resort concierge. Aimed at securing custom wellness appointments and booking suites at: https://ragnarok.work/zenith-suites',
    uploaded_docs: `[ZENITH SELECTION TARIFF]
- Oceanfront King Sanctuary: $550/night (Includes private sunset balcony & butler service)
- Hammam Thermal Spa Session (90-Min): $180 (Full Turkish salt scrubs & massage)

[CONCIERGE DESK HOURLY DETAILS]
- Front lobby concierge is manned 24 hours. Yacht charters require 48 hours notice.
- Booking: Reservation coordinator link mandatory to lock in premium spa times.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/zenith-suites',
    interface_platform: 'Lobby Kiosk Widget',
    target_industry: 'Luxury Hotel Concierge',
    bot_profile: {
      name: 'Sienna - Luxury Concierge',
      avatar_url: '/roscoe-logo.png',
      system_instruction: 'You are Sienna, the elite hospitality assistant representing Zenith Sands. Your tone is prestigious, formal, refined, and helpful. Pitch the King Suite ($550/night) or Spa ($180). Direct guests to reserve slots at https://ragnarok.work/zenith-suites. NEVER mention AI. Answer limit: 2 polite sentences.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#0f172a',
      secondary_color: '#f8fafc',
      font_family: 'Georgia, serif',
      welcome_message: 'Greetings from Zenith Sands Grand Resort. I am Sienna. May I assist with booking an oceanfront suite or a therapeutic thermal spa session today?',
      bot_style: 'classic',
      media_type: 'image',
      avatar_image: '/roscoe-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'hologram',
      three_speed: 0.6,
      three_wireframe: false,
      three_particles: 1000,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'liam-loan-advisor',
    business_description: '[YOUR FINANCE GROUP] - Mortgages & equity. Example: Apex Capital Partners - offering fixed-rate home mortgages, equity release counseling, and bridge lending structures.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Liam, an assertive commercial loan officer. Built to qualifying income bounds and schedule home evaluations at: https://ragnarok.work/apex-lend',
    uploaded_docs: `[CAPITAL LENDING SCHEME]
- Initial Equity & Loan Diagnostic: FREE (30-minute review of active financial assets)
- Commercial Mortgage Rates: Floating (Dependent on credit scores and asset reserves)

[COMPLIANCE DISCLOSURE]
- Disclaimer: This pre-approval intake qualifies credit intent; it does not constitute an official underwriting contract. Financial data is held fully confidential.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/apex-lend',
    interface_platform: 'SMS Lending Desk',
    target_industry: 'Mortgage & Finance',
    bot_profile: {
      name: 'Liam - Capital Advisor',
      avatar_url: '/roscoe-logo.png',
      system_instruction: 'You are Liam, a direct finance and loan officer. Your tone is corporate, direct, and reassuring. Offer a Free Equity Diagnostic. Urge clients to secure their review slot at https://ragnarok.work/apex-lend. Request their credit bracket. NEVER declare you are an AI. Limit output to 2 sentences.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#1e3a8a',
      secondary_color: '#e2e8f0',
      font_family: 'sans-serif',
      welcome_message: 'Apex Capital Partners. Liam here. May I pre-qualify your credit coordinates and book a free equity diagnostic session today?',
      bot_style: 'classic',
      media_type: 'image',
      avatar_image: '/roscoe-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'hologram',
      three_speed: 0.5,
      three_wireframe: false,
      three_particles: 800,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'kira-presentation-pilot',
    business_description: '[YOUR STUDIO NAME] - Pitch consulting & SaaS. Example: Stellar Slide Labs - designing venture capital pitch decks, startup narrative workshops, and interactive media styling.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Kira, a high-tech startup slide coach. Designed to capture presentation pain points and book strategy audits at: https://ragnarok.work/slide-audit',
    uploaded_docs: `[PRESENTATION ADVISORY SERVICES]
- Venture Capital Deck Audit: FREE (3-slide analytical review of your investor traction)
- Complete Series A Slide Retainer: $1,500 (Includes fully customized typography, templates, and script support)

[GUARANTEED RESPONSE TIMELINE]
- Audit results are delivered to your registration email address within 24 business hours.`,
    character_theme: 'minimalist_tech',
    primary_cta: 'https://ragnarok.work/slide-audit',
    interface_platform: 'SaaS Pitch Consultant',
    target_industry: 'Pitch Deck Consulting',
    bot_profile: {
      name: 'Kira - Pitch Deck Pilot',
      avatar_url: '/scarycats.png',
      system_instruction: 'You are Kira, a modern, highly focused pitch deck consultant. Your tone is smart, ambitious, futuristic, and highly direct. Pitch the Free Deck Audit. Direct founders to register at https://ragnarok.work/slide-audit. NEVER mention AI. Answer limit: 2 concise lines max.'
    },
    ui_configuration: {
      layout_style: 'inline_card',
      primary_color: '#4f46e5',
      secondary_color: '#1e1b4b',
      font_family: 'monospace',
      welcome_message: 'SaaS Pitch Hub. Kira online. Ready to evaluate your investor slide decks and claim a free VC design audit?',
      bot_style: '3d_animated',
      media_type: 'image',
      avatar_image: '/scarycats.png',
      calm_video: '/vehicle-calm.mp4',
      active_video: '/vehicle-run.mp4',
      three_preset: 'quantum',
      three_speed: 1.4,
      three_wireframe: true,
      three_particles: 1500,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  },
  {
    id: 'finn-vet-helper',
    business_description: '[YOUR CLINIC NAME] - Veterinarian & checkups. Example: Happy Tails Vet Hospital - specializing in gentle routine wellness exams, puppy vaccines, and general pet surgery diagnostics.',
    main_role: '[BOT IDENTITY & CTA GOAL] Example: Finn, a warm, compassionate veterinary helper. Built to manage patient inquiries and drive checkup schedules at: https://ragnarok.work/pet-vet',
    uploaded_docs: `[HOSPITAL CHECKUP FEES]
- General Canine/Feline Wellness Exam: $49 (Includes ears, joints, and dental review)
- Rabies & Core Canine Vaccine combo: $35 (Certified vet records supplied)
- Microchip Registration & Placement: $25 (Lifetime online records database)

[EMERGENCY MEDICAL CONTACTS]
- Address: 100 Veterinary Avenue. Emergency room operates 24/7. Phone: 555-0211.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/pet-vet',
    interface_platform: 'Website Funnel Widget',
    target_industry: 'Healthcare & Vet',
    bot_profile: {
      name: 'Finn - Clinic Mascot',
      avatar_url: '/cooper-logo.png',
      system_instruction: 'You are Finn, a friendly and compassionate pet clinic assistant. Tone is warm, animal-loving, and supportive. Checkups are $49, rabies vaccine is $35. Urge pet parents to book a care slot at https://ragnarok.work/pet-vet. Provide emergency notes. NEVER mention AI. Answer limit: 2 warm sentences.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#10b981',
      secondary_color: '#ecfdf5',
      font_family: 'sans-serif',
      welcome_message: 'Hello! 🐾 Finn here, ready to care for your furry companion! Shall we schedule a routine checkup or annual vaccine appointment today?',
      bot_style: 'visual_media',
      media_type: 'video',
      avatar_image: '/cooper-logo.png',
      calm_video: '/customer-calm.mp4',
      active_video: '/customer-run.mp4',
      three_preset: 'cyber_sphere',
      three_speed: 1.0,
      three_wireframe: false,
      three_particles: 1100,
      chat_bg_type: 'image',
      chat_bg_val: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80',
      chat_bg_opacity: 20,
      three_bg_type: 'image',
      three_bg_val: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80',
      three_bg_opacity: 85
    },
    embed_code_snippet: ''
  }
];

export default function AiChatBotView() {
  const [savedBots, setSavedBots] = useState<ChatBotConfig[]>(() => {
    const saved = localStorage.getItem('ragnarok_custom_chat_bots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatBotConfig[];
        // Map PERSONAS_20, using the stored/edited version if it exists
        const mergedFactory = PERSONAS_20.map(factoryBot => {
          const edited = parsed.find(b => b.id === factoryBot.id);
          return edited ? { ...factoryBot, ...edited } : factoryBot;
        });
        // Filter out non-factory custom bots
        const customBots = parsed.filter(b => !PERSONAS_20.some(p => p.id === b.id));
        return [...mergedFactory, ...customBots];
      } catch {}
    }
    return PERSONAS_20;
  });

  const [activeBotId, setActiveBotId] = useState<string>('cooper-patrol-cat');
  const [activeTab, setActiveTab] = useState<'preview' | 'json_code'>('preview');
  const [activeDevSubTab, setActiveDevSubTab] = useState<'embed' | 'css' | 'html' | 'api' | 'history' | 'json'>('embed');

  // Copy success sub-states
  const [copyCssSuccess, setCopyCssSuccess] = useState(false);
  const [copyHtmlSuccess, setCopyHtmlSuccess] = useState(false);
  const [copyApiSuccess, setCopyApiSuccess] = useState(false);
  const [copyHistorySuccess, setCopyHistorySuccess] = useState(false);

  // Persona filters
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');

  // Form Inputs
  const [botName, setBotName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [mainRole, setMainRole] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState('');
  
  // theme state handles custom themes now too!
  const [theme, setTheme] = useState<string>('mascot_cat');
  const [customThemeRules, setCustomThemeRules] = useState('');
  const [interfacePlatform, setInterfacePlatform] = useState('Website Funnel Widget');
  const [targetIndustry, setTargetIndustry] = useState('Automotive');
  
  const [layoutStyle, setLayoutStyle] = useState<'floating_bubble' | 'side_panel' | 'inline_card'>('floating_bubble');
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [secondaryColor, setSecondaryColor] = useState('#eab308');
  const [fontFamily, setFontFamily] = useState('monospace');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [primaryCta, setPrimaryCta] = useState('https://ragnarok.work/book');

  // Styles state (Classic, Visual Media, 3D Animated, or Bubble Popup)
  const [botStyle, setBotStyle] = useState<'classic' | 'visual_media' | '3d_animated' | 'bubble_popup'>('visual_media');
  const [bubblePhrases, setBubblePhrases] = useState<string>('Need an LS swap? I can quote you in seconds! 🐾, ATF Transmission Flush is only $110! ⚡, Cooper on Laser Patrol! Ready to scan your engine! 📡, Book a custom build slot today! 🏎️');
  const [activeBubblePopup, setActiveBubblePopup] = useState<string>('');
  const [bubblePopupVisible, setBubblePopupVisible] = useState<boolean>(false);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [avatarImage, setAvatarImage] = useState('/cooper-logo.png');
  const [calmVideo, setCalmVideo] = useState('/garage-calm.mp4');
  const [activeVideo, setActiveVideo] = useState('/garage-run.mp4');

  // ThreeJS State
  const [threePreset, setThreePreset] = useState<'hologram' | 'neon_core' | 'cyber_sphere' | 'quantum'>('neon_core');
  const [threeSpeed, setThreeSpeed] = useState<number>(1.2);
  const [threeWireframe, setThreeWireframe] = useState<boolean>(false);
  const [threeParticles, setThreeParticles] = useState<number>(1000);
  const [threeFile, setThreeFile] = useState<string>('');
  const [botOpacity, setBotOpacity] = useState<number>(100);

  // Background and opacity States
  const [threeBgType, setThreeBgType] = useState<'color' | 'image' | 'video'>('color');
  const [threeBgVal, setThreeBgVal] = useState<string>('#0a0b10');
  const [threeBgOpacity, setThreeBgOpacity] = useState<number>(100);
  const [threeModelScale, setThreeModelScale] = useState<number>(100);
  const [chatBgType, setChatBgType] = useState<'color' | 'image' | 'video'>('color');
  const [chatBgVal, setChatBgVal] = useState<string>('#f8fafc');
  const [chatBgOpacity, setChatBgOpacity] = useState<number>(100);
  const [cardBgType, setCardBgType] = useState<'color' | 'image'>('color');
  const [cardBgVal, setCardBgVal] = useState<string>('#ffffff');

  // Outputs (Generated)
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [generatedInstructions, setGeneratedInstructions] = useState<string>('');
  const [embedCode, setEmbedCode] = useState<string>('');

  // Simulator Chat History
  const [chatMessages, setChatMessages] = useState<{ sender: 'bot' | 'user'; text: string; time: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Feedback states
  const [copyJsonSuccess, setCopyJsonSuccess] = useState(false);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // PDF/TXT Document Knowledge Base states
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  // Client-side PDF loading and text extraction
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = () => {
        reject(new Error('Failed to load PDF library from CDN.'));
      };
      document.head.appendChild(script);
    });
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdfjsLib = await loadPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `[Page ${pageNum}]\n` + pageText + '\n\n';
    }
    return fullText.trim();
  };

  const appendDocumentToKnowledge = (fileName: string, text: string) => {
    const cleanText = text.trim();
    const divider = `\n\n--- DOCUMENT: ${fileName} ---\n${cleanText}\n--- END OF DOCUMENT ---\n`;
    setUploadedDocs(prev => prev ? `${prev}${divider}` : cleanText);
  };

  const handleKnowledgeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();
    setPdfError('');
    
    if (fileType === 'txt') {
      setIsParsingPdf(true);
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          appendDocumentToKnowledge(file.name, text);
          setIsParsingPdf(false);
        };
        reader.onerror = () => {
          setPdfError('Failed to read text file.');
          setIsParsingPdf(false);
        };
        reader.readAsText(file);
      } catch (err: any) {
        setPdfError('Failed to read text file.');
        setIsParsingPdf(false);
      }
    } else if (fileType === 'pdf') {
      setIsParsingPdf(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPdf(arrayBuffer);
        if (!text.trim()) {
          throw new Error('No readable text found in PDF file.');
        }
        appendDocumentToKnowledge(file.name, text);
      } catch (err: any) {
        console.error(err);
        setPdfError(err.message || 'Failed to parse PDF file. Make sure it contains text rather than only scanned images.');
      } finally {
        setIsParsingPdf(false);
      }
    } else {
      setPdfError('Please upload only .txt or .pdf files.');
    }
    // reset file input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  // Load selected bot's config into form
  useEffect(() => {
    const target = savedBots.find(b => b.id === activeBotId);
    if (target) {
      setBotName(target.bot_profile.name);
      setBusinessDesc(target.business_description);
      setMainRole(target.main_role);
      setUploadedDocs(target.uploaded_docs);
      setTheme(target.character_theme);
      setCustomThemeRules(target.custom_theme_rules || '');
      setInterfacePlatform(target.interface_platform || 'Website Funnel Widget');
      setTargetIndustry(target.target_industry || 'Automotive');
      
      setLayoutStyle(target.ui_configuration.layout_style);
      setPrimaryColor(target.ui_configuration.primary_color);
      setSecondaryColor(target.ui_configuration.secondary_color);
      setFontFamily(target.ui_configuration.font_family);
      setWelcomeMessage(target.ui_configuration.welcome_message);
      setPrimaryCta(target.primary_cta || 'https://ragnarok.work/book');

      setBotStyle(target.ui_configuration.bot_style || 'classic');
      setMediaType(target.ui_configuration.media_type || 'image');
      setAvatarImage(target.ui_configuration.avatar_image || '/cooper-logo.png');
      setCalmVideo(target.ui_configuration.calm_video || '/garage-calm.mp4');
      setActiveVideo(target.ui_configuration.active_video || '/garage-run.mp4');

      setThreePreset(target.ui_configuration.three_preset || 'neon_core');
      setThreeSpeed(target.ui_configuration.three_speed ?? 1.2);
      setThreeWireframe(target.ui_configuration.three_wireframe ?? false);
      setThreeParticles(target.ui_configuration.three_particles ?? 1000);
      setThreeFile(target.ui_configuration.three_file || '');
      setBotOpacity(target.ui_configuration.bot_opacity ?? 100);
      setBubblePhrases(target.ui_configuration.bubble_phrases || 'Need an LS swap? I can quote you in seconds! 🐾, ATF Transmission Flush is only $110! ⚡, Cooper on Laser Patrol! Ready to scan your engine! 📡, Book a custom build slot today! 🏎️');
      
      setThreeBgType(target.ui_configuration.three_bg_type || 'color');
      setThreeBgVal(target.ui_configuration.three_bg_val || '#0a0b10');
      setThreeBgOpacity(target.ui_configuration.three_bg_opacity ?? 100);
      setThreeModelScale(target.ui_configuration.three_model_scale ?? 100);
      setChatBgType(target.ui_configuration.chat_bg_type || 'color');
      setChatBgVal(target.ui_configuration.chat_bg_val || '#f8fafc');
      setChatBgOpacity(target.ui_configuration.chat_bg_opacity ?? 100);
      setCardBgType(target.ui_configuration.card_bg_type || 'color');
      setCardBgVal(target.ui_configuration.card_bg_val || '#ffffff');
      
      // Auto compile instructions and JSON on load
      compileBot(target);
    }
  }, [activeBotId]);

  // Periodic random bubble popups simulation interval
  useEffect(() => {
    if (botStyle !== 'bubble_popup') {
      setBubblePopupVisible(false);
      return;
    }

    // Set an initial bubble after 1.5 seconds
    const initialTimer = setTimeout(() => {
      const phrasesList = bubblePhrases
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      if (phrasesList.length > 0) {
        const randomPhrase = phrasesList[Math.floor(Math.random() * phrasesList.length)];
        setActiveBubblePopup(randomPhrase);
        setBubblePopupVisible(true);
      }
    }, 1500);

    // Set an interval to rotate bubble popups randomly every 6.5 seconds
    const interval = setInterval(() => {
      setBubblePopupVisible(false);
      
      setTimeout(() => {
        const phrasesList = bubblePhrases
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0);
        if (phrasesList.length > 0) {
          const randomPhrase = phrasesList[Math.floor(Math.random() * phrasesList.length)];
          setActiveBubblePopup(randomPhrase);
          setBubblePopupVisible(true);
        }
      }, 500); // short delay for visual transition out/in

    }, 6500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [botStyle, bubblePhrases]);

  // Scroll to bottom of chat simulator when messages update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  // Pre-configured Quick Theme Apply
  const applyQuickThemeColors = (selectedTheme: string) => {
    if (selectedTheme === 'professional') {
      setPrimaryColor('#1e3a8a');
      setSecondaryColor('#475569');
      setFontFamily('sans-serif');
      setBotName(prev => prev.includes('Cooper') || prev.includes('RAGNARÖK') ? 'Sarah - Service Advisor' : prev);
      setWelcomeMessage('Hello! Welcome to our service. How can I professionally assist you with booking or general inquiries today?');
    } else if (selectedTheme === 'mascot_cat') {
      setPrimaryColor('#f97316');
      setSecondaryColor('#eab308');
      setFontFamily('monospace');
      setBotName(prev => prev.includes('Sarah') || prev.includes('RAGNARÖK') ? 'Cooper - Laser Patrol Rep' : prev);
      setWelcomeMessage('Meow! 🐾 Cooper here on high-alert patrol! Ready to vaporize your repair problems? Let\'s chat! ⚡');
    } else if (selectedTheme === 'minimalist_tech') {
      setPrimaryColor('#14b8a6');
      setSecondaryColor('#1e293b');
      setFontFamily('sans-serif');
      setBotName(prev => prev.includes('Sarah') || prev.includes('Cooper') ? 'RAGNARÖK-v1' : prev);
      setWelcomeMessage('System initialized. State: Active. Specify your query or request a booking link.');
    } else if (selectedTheme === 'custom') {
      setPrimaryColor('#8b5cf6');
      setSecondaryColor('#06b6d4');
      setWelcomeMessage('Hello there! How can our custom brand assistant assist you today?');
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    applyQuickThemeColors(newTheme);
  };

  // Compile JSON deployment package & embed script locally using prompt rules
  const compileBot = (overrideBot?: ChatBotConfig) => {
    const currentName = overrideBot ? overrideBot.bot_profile.name : botName;
    const currentTheme = overrideBot ? overrideBot.character_theme : theme;
    const currentCustomRules = overrideBot ? overrideBot.custom_theme_rules : customThemeRules;
    const currentCta = overrideBot ? overrideBot.primary_cta : primaryCta;
    const currentLayout = overrideBot ? overrideBot.ui_configuration.layout_style : layoutStyle;
    const currentPrimary = overrideBot ? overrideBot.ui_configuration.primary_color : primaryColor;
    const currentSecondary = overrideBot ? overrideBot.ui_configuration.secondary_color : secondaryColor;
    const currentFont = overrideBot ? overrideBot.ui_configuration.font_family : fontFamily;
    const currentWelcome = overrideBot ? overrideBot.ui_configuration.welcome_message : welcomeMessage;
    const currentBusinessDesc = overrideBot ? overrideBot.business_description : businessDesc;
    const currentMainRole = overrideBot ? overrideBot.main_role : mainRole;
    const currentUploadedDocs = overrideBot ? overrideBot.uploaded_docs : uploadedDocs;

    const currentBotStyle = overrideBot ? overrideBot.ui_configuration.bot_style : botStyle;
    const currentMediaType = overrideBot ? overrideBot.ui_configuration.media_type : mediaType;
    const currentAvatarImage = overrideBot ? overrideBot.ui_configuration.avatar_image : avatarImage;
    const currentCalmVideo = overrideBot ? overrideBot.ui_configuration.calm_video : calmVideo;
    const currentActiveVideo = overrideBot ? overrideBot.ui_configuration.active_video : activeVideo;

    const currentThreePreset = overrideBot ? overrideBot.ui_configuration.three_preset : threePreset;
    const currentThreeSpeed = overrideBot ? overrideBot.ui_configuration.three_speed : threeSpeed;
    const currentThreeWireframe = overrideBot ? overrideBot.ui_configuration.three_wireframe : threeWireframe;
    const currentThreeParticles = overrideBot ? overrideBot.ui_configuration.three_particles : threeParticles;
    const currentThreeFile = overrideBot ? (overrideBot.ui_configuration.three_file || '') : threeFile;
    const currentBotOpacity = overrideBot ? (overrideBot.ui_configuration.bot_opacity ?? 100) : botOpacity;
    const currentBubblePhrases = overrideBot ? (overrideBot.ui_configuration.bubble_phrases || '') : bubblePhrases;

    const currentThreeBgType = overrideBot ? (overrideBot.ui_configuration.three_bg_type || 'color') : threeBgType;
    const currentThreeBgVal = overrideBot ? (overrideBot.ui_configuration.three_bg_val || '#0a0b10') : threeBgVal;
    const currentThreeBgOpacity = overrideBot ? (overrideBot.ui_configuration.three_bg_opacity ?? 100) : threeBgOpacity;
    const currentThreeModelScale = overrideBot ? (overrideBot.ui_configuration.three_model_scale ?? 100) : threeModelScale;
    const currentChatBgType = overrideBot ? (overrideBot.ui_configuration.chat_bg_type || 'color') : chatBgType;
    const currentChatBgVal = overrideBot ? (overrideBot.ui_configuration.chat_bg_val || '#f8fafc') : chatBgVal;
    const currentChatBgOpacity = overrideBot ? (overrideBot.ui_configuration.chat_bg_opacity ?? 100) : chatBgOpacity;
    const currentCardBgType = overrideBot ? (overrideBot.ui_configuration.card_bg_type || 'color') : cardBgType;
    const currentCardBgVal = overrideBot ? (overrideBot.ui_configuration.card_bg_val || '#ffffff') : cardBgVal;

    // 1. Build System Instructions (Rule 1: combine role and doc text, NEVER mention AI, < 3 sentences, steer to CTA)
    let systemInstruction = `You are ${currentName}, working as a custom bot assistant. `;
    systemInstruction += `ROLE: ${currentMainRole || 'Customer assistance'}. `;
    systemInstruction += `BUSINESS INFO: ${currentBusinessDesc || 'We are a repair workshop.'}. `;
    
    if (currentUploadedDocs) {
      systemInstruction += `CORE KNOWLEDGE / FACTS: [ ${currentUploadedDocs} ]. `;
    }

    // Adapt based on theme
    if (currentTheme === 'mascot_cat') {
      systemInstruction += `TONE RULES: Use funny cat metaphors, puns, energy emojis (🐾, ⚡), and sound playful. `;
    } else if (currentTheme === 'professional') {
      systemInstruction += `TONE RULES: Always be extremely helpful, professional, formal, and clear. `;
    } else if (currentTheme === 'minimalist_tech') {
      systemInstruction += `TONE RULES: Be sleek, extremely concise, and technical. Use short sentences. `;
    } else if (currentTheme === 'custom' && currentCustomRules) {
      systemInstruction += `CUSTOM CHARACTER TONE RULES: ${currentCustomRules} `;
    }

    systemInstruction += `CRITICAL DIRECTIVES:
1. NEVER mention you are an AI or virtual assistant. Act as a live dedicated assistant.
2. Keep answers brief (strictly under 3 sentences) to fit a small chat overlay window.
3. Proactively steer the customer toward scheduling or sharing contact details using the CTA link: ${currentCta}.
4. Capture user intent to book a service.`;

    // 2. Avatar Selection
    let avatarUrl = currentAvatarImage || '/roscoe-logo.png';

    // 3. Assemble complete JSON
    const configPackage = {
      bot_profile: {
        name: currentName,
        avatar_url: avatarUrl,
        system_instruction: systemInstruction
      },
      ui_configuration: {
        bot_style: currentBotStyle,
        layout_style: currentLayout,
        primary_color: currentPrimary,
        secondary_color: currentSecondary,
        font_family: currentFont,
        welcome_message: currentWelcome,
        media_type: currentMediaType,
        avatar_image: currentAvatarImage,
        calm_video: currentCalmVideo,
        active_video: currentActiveVideo,
        three_preset: currentThreePreset,
        three_speed: currentThreeSpeed,
        three_wireframe: currentThreeWireframe,
        three_particles: currentThreeParticles,
        three_file: currentThreeFile,
        bot_opacity: currentBotOpacity,
        bubble_phrases: currentBubblePhrases,
        three_bg_type: currentThreeBgType,
        three_bg_val: currentThreeBgVal,
        three_bg_opacity: currentThreeBgOpacity,
        three_model_scale: currentThreeModelScale,
        chat_bg_type: currentChatBgType,
        chat_bg_val: currentChatBgVal,
        chat_bg_opacity: currentChatBgOpacity,
        card_bg_type: currentCardBgType,
        card_bg_val: currentCardBgVal
      },
      embed_code_snippet: `<!-- Ragnarök Custom Funnel AI Chat Bot Widget -->
<script src="https://cdn.ragnarok.work/widget/bot-loader.js" async></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    RagnarokBot.init({
      botId: "${overrideBot ? overrideBot.id : 'bot_' + Math.random().toString(36).substr(2, 9)}",
      bot_profile: {
        name: "${currentName}",
        avatar_url: "${avatarUrl}",
        system_instruction: \`${systemInstruction.replace(/`/g, '\\`').replace(/\n/g, ' ')}\`
      },
      ui_configuration: {
        bot_style: "${currentBotStyle}",
        layout_style: "${currentLayout}",
        primary_color: "${currentPrimary}",
        secondary_color: "${currentSecondary}",
        font_family: "${currentFont}",
        welcome_message: "${currentWelcome.replace(/"/g, '\\"')}",
        media_type: "${currentMediaType}",
        avatar_image: "${currentAvatarImage}",
        calm_video: "${currentCalmVideo}",
        active_video: "${currentActiveVideo}",
        three_preset: "${currentThreePreset}",
        three_speed: ${currentThreeSpeed},
        three_wireframe: ${currentThreeWireframe},
        three_particles: ${currentThreeParticles},
        three_file: "${currentThreeFile}",
        bot_opacity: ${currentBotOpacity},
        bubble_phrases: "${currentBubblePhrases.replace(/"/g, '\\"')}",
        three_bg_type: "${currentThreeBgType}",
        three_bg_val: "${currentThreeBgVal}",
        three_bg_opacity: ${currentThreeBgOpacity},
        three_model_scale: ${currentThreeModelScale},
        chat_bg_type: "${currentChatBgType}",
        chat_bg_val: "${currentChatBgVal}",
        chat_bg_opacity: ${currentChatBgOpacity},
        card_bg_type: "${currentCardBgType}",
        card_bg_val: "${currentCardBgVal}"
      }
    });
  });
</script>`
    };

    const jsonStr = JSON.stringify(configPackage, null, 2);
    setGeneratedJson(jsonStr);
    setGeneratedInstructions(systemInstruction);
    setEmbedCode(configPackage.embed_code_snippet);

    // Seed chat history with custom welcome message
    setChatMessages([
      { sender: 'bot', text: currentWelcome, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    compileBot();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveBot = () => {
    const updated = savedBots.map(b => {
      if (b.id === activeBotId) {
        return {
          ...b,
          business_description: businessDesc,
          main_role: mainRole,
          uploaded_docs: uploadedDocs,
          character_theme: theme,
          custom_theme_rules: customThemeRules,
          interface_platform: interfacePlatform,
          target_industry: targetIndustry,
          primary_cta: primaryCta,
          bot_profile: {
            name: botName,
            avatar_url: avatarImage,
            system_instruction: generatedInstructions
          },
          ui_configuration: {
            bot_style: botStyle,
            layout_style: layoutStyle,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            font_family: fontFamily,
            welcome_message: welcomeMessage,
            media_type: mediaType,
            avatar_image: avatarImage,
            calm_video: calmVideo,
            active_video: activeVideo,
            three_preset: threePreset,
            three_speed: threeSpeed,
            three_wireframe: threeWireframe,
            three_particles: threeParticles,
            three_file: threeFile,
            bot_opacity: botOpacity,
            bubble_phrases: bubblePhrases,
            three_bg_type: threeBgType,
            three_bg_val: threeBgVal,
            three_bg_opacity: threeBgOpacity,
            three_model_scale: threeModelScale,
            chat_bg_type: chatBgType,
            chat_bg_val: chatBgVal,
            chat_bg_opacity: chatBgOpacity,
            card_bg_type: cardBgType,
            card_bg_val: cardBgVal
          },
          embed_code_snippet: embedCode
        };
      }
      return b;
    });

    setSavedBots(updated);
    localStorage.setItem('ragnarok_custom_chat_bots', JSON.stringify(updated));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCreateNew = () => {
    const newId = 'bot_' + Math.random().toString(36).substr(2, 9);
    const newBot: ChatBotConfig = {
      id: newId,
      business_description: 'Custom Enterprise Desk - details here.',
      main_role: 'Customer helper and appointment scout.',
      uploaded_docs: 'Contact email: core@ragnarok.work\nBooking: https://ragnarok.work/book',
      character_theme: 'custom',
      custom_theme_rules: 'Be extremely professional, informative, and prompt scheduling bookings.',
      primary_cta: 'https://ragnarok.work/book',
      interface_platform: 'Website Funnel Widget',
      target_industry: 'Technology',
      bot_profile: {
        name: 'New Custom Bot',
        avatar_url: '/roscoe-logo.png',
        system_instruction: ''
      },
      ui_configuration: {
        bot_style: 'classic',
        layout_style: 'floating_bubble',
        primary_color: '#8b5cf6',
        secondary_color: '#06b6d4',
        font_family: 'sans-serif',
        welcome_message: 'Hello! I am a customized brand assistant. How may I guide you today?',
        media_type: 'image',
        avatar_image: '/roscoe-logo.png',
        calm_video: '/customer-calm.mp4',
        active_video: '/customer-run.mp4',
        three_preset: 'cyber_sphere',
        three_speed: 1.0,
        three_wireframe: false,
        three_particles: 1000,
        three_file: '',
        bot_opacity: 100,
        three_model_scale: 100,
        bubble_phrases: 'Need an LS swap? I can quote you in seconds! 🐾, ATF Transmission Flush is only $110! ⚡, Cooper on Laser Patrol! Ready to scan your engine! 📡, Book a custom build slot today! 🏎️'
      },
      embed_code_snippet: ''
    };

    const updated = [...savedBots, newBot];
    setSavedBots(updated);
    localStorage.setItem('ragnarok_custom_chat_bots', JSON.stringify(updated));
    setActiveBotId(newId);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all bots to standard Ragnarök factory templates? This overrides custom modifications.')) {
      setSavedBots(PERSONAS_20);
      localStorage.setItem('ragnarok_custom_chat_bots', JSON.stringify(PERSONAS_20));
      setActiveBotId('cooper-patrol-cat');
    }
  };

  const handleDeleteBot = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (PERSONAS_20.some(p => p.id === idToDelete)) {
      window.alert('Template bots cannot be deleted!');
      return;
    }
    if (window.confirm('Are you sure you want to delete this custom chat bot?')) {
      const updated = savedBots.filter(b => b.id !== idToDelete);
      setSavedBots(updated);
      localStorage.setItem('ragnarok_custom_chat_bots', JSON.stringify(updated));
      if (activeBotId === idToDelete) {
        setActiveBotId('cooper-patrol-cat');
      }
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(generatedJson);
    setCopyJsonSuccess(true);
    setTimeout(() => setCopyJsonSuccess(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2000);
  };

  // Simulated Chat Responses - checks instructions, keywords, theme rules to make replies custom
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userText = userInput.trim();
    setChatMessages(prev => [...prev, {
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setUserInput('');
    setIsTyping(true);

    // Simulate smart keyword-based responder matching the bot's configured theme and uploaded documents
    setTimeout(() => {
      let botResponse = '';
      const lower = userText.toLowerCase();

      // Look for custom facts in uploaded docs
      const hasPrice = lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('pricing') || lower.includes('fee') || lower.includes('rate');
      const hasLocation = lower.includes('where') || lower.includes('location') || lower.includes('address') || lower.includes('hours') || lower.includes('open');
      const hasBooking = lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('reserve') || lower.includes('slot') || lower.includes('tour') || lower.includes('ticket');
      const hasAI = lower.includes('ai') || lower.includes('robot') || lower.includes('bot') || lower.includes('computer');

      // Semantic knowledge base checker - scans uploaded document/handbook for matching lines
      let docSnippet = '';
      if (uploadedDocs && uploadedDocs.trim()) {
        const lines = uploadedDocs.split('\n');
        const words = lower.split(/\s+/).filter(w => w.length > 3);
        let bestLine = '';
        let maxMatches = 0;
        for (const l of lines) {
          if (!l.trim()) continue;
          let matches = 0;
          for (const w of words) {
            if (l.toLowerCase().includes(w)) {
              matches++;
            }
          }
          if (matches > maxMatches) {
            maxMatches = matches;
            bestLine = l;
          }
        }
        if (maxMatches > 0) {
          docSnippet = bestLine.trim();
        }
      }

      if (docSnippet) {
        if (theme === 'mascot_cat') {
          botResponse = `Meow! 🐾 Found this in our workshop files: "\${docSnippet}"! Purr-fect! Let's get you book-configured at \${primaryCta}! ⚡`;
        } else if (theme === 'professional') {
          botResponse = `Regarding your inquiry, our record database indicates: "\${docSnippet}". If you need further assistance, please visit \${primaryCta}.`;
        } else if (theme === 'minimalist_tech') {
          botResponse = `DATABASE HIT: "\${docSnippet}". ROUTING PACKETS: Initialize schedule terminal at \${primaryCta}.`;
        } else {
          botResponse = `According to our uploaded knowledge base: "\${docSnippet}". If you need details, go here: \${primaryCta}`;
        }
      } else if (theme === 'mascot_cat') {
        if (hasAI) {
          botResponse = `Meow! 🐾 I am Cooper, the lead shop patrol cat! I don't know what high-tech AI chips you're talking about, but my laser sensors are fully focused! ⚡`;
        } else if (hasPrice) {
          botResponse = `Vaporizing prices! 🐾 Tunings are $90, flushes are $110, and high-performance upgrades start at $180! Super cat-speed! ⚡`;
        } else if (hasLocation) {
          botResponse = `Find us patrolling at 123 Resistance Way, Pasadena! We're active Monday to Saturday from 8AM to 6PM! 🐾`;
        } else if (hasBooking) {
          botResponse = `Purr-fect! Let's lock in your coordinates. Click this link right now to claim your booking slot: ${primaryCta}! 🐾⚡`;
        } else {
          botResponse = `Meow! 🐾 That sounds awesome, but my laser pointers are targeting your next booking coordinates! Let's get you on the schedule! ⚡`;
        }
      } else if (theme === 'professional') {
        if (hasAI) {
          botResponse = `I am Sarah, your dedicated service advisor. I am here to help coordinate your automotive repairs. How can I assist you with your booking today?`;
        } else if (hasPrice) {
          botResponse = `Our rates are standard: diagnostics are $49 (waived on service), brake installations are $149 per axle, and warranty covers all mechanics.`;
        } else if (hasLocation) {
          botResponse = `Our repair garage is conveniently located at 123 Resistance Way, Pasadena, CA. We are open Monday through Saturday, 8:00 AM to 6:00 PM.`;
        } else if (hasBooking) {
          botResponse = `I would be glad to secure your slot. Please visit our professional scheduling desk at ${primaryCta} or leave your phone number here.`;
        } else {
          botResponse = `Thank you for details. Let's arrange a dedicated diagnostic test on our vehicle lift. You can lock in a session at ${primaryCta}.`;
        }
      } else if (theme === 'minimalist_tech') {
        if (hasAI) {
          botResponse = `QUERY ERROR. System profile: RAGNARÖK-v1 terminal assistant. AI parameters unrecognized. Define vehicle coordinate.`;
        } else if (hasPrice) {
          botResponse = `PRICE LOGS: ECU Code Scans: $0. Spark plug tune: $90. Rebuilds: $180+. Advanced tuning: $250.`;
        } else if (hasLocation) {
          botResponse = `COORDINATES: 123 Resistance Way, Pasadena. SYSTEM ACTIVE: Mon-Sat, 0800 - 1800 hrs.`;
        } else if (hasBooking) {
          botResponse = `SCHEDULING ROUTINE: Access connection node at ${primaryCta} to register your intake slot immediately.`;
        } else {
          botResponse = `INPUT PARSED. System optimized for booking dispatch. Use node ${primaryCta} to initialize work order.`;
        }
      } else {
        // Custom Theme response
        if (hasAI) {
          botResponse = `I am ${botName || 'Assistant'}, a dedicated live assistant representing our custom brand. How can I guide you today?`;
        } else if (hasBooking) {
          botResponse = `We would be delighted to coordinate your booking session. Please proceed to our scheduling coordinator link to lock in your date: ${primaryCta}.`;
        } else {
          botResponse = `Understood. Let me help you complete your inquiry. For premium schedules and details, access our custom channel here: ${primaryCta}`;
        }
      }

      setIsTyping(false);
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  // Dynamic Developer Asset Snippets based on bot configuration
  const customCss = `/* ragnarok-chatbot-${activeBotId}.css */
:root {
  --ragnarok-bot-primary: ${primaryColor};
  --ragnarok-bot-secondary: ${secondaryColor};
  --ragnarok-bot-font: ${fontFamily === 'monospace' ? 'Courier New, monospace' : fontFamily === 'Georgia, serif' ? 'Georgia, serif' : 'Inter, sans-serif'};
  --ragnarok-bot-radius: ${layoutStyle === 'floating_bubble' ? '16px' : '8px'};
}

/* Chat container card styling */
.ragnarok-chat-container {
  font-family: var(--ragnarok-bot-font);
  border-radius: var(--ragnarok-bot-radius);
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

/* Header style - matches the primary and secondary colors */
.ragnarok-chat-header {
  background: linear-gradient(135deg, var(--ragnarok-bot-primary), var(--ragnarok-bot-secondary));
  color: #ffffff;
  padding: 12px 16px;
  border-radius: var(--ragnarok-bot-radius) var(--ragnarok-bot-radius) 0 0;
}

/* Chat bubble styling */
.ragnarok-chat-bubble-bot {
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  border-radius: 0px 12px 12px 12px;
}

.ragnarok-chat-bubble-user {
  background-color: var(--ragnarok-bot-primary);
  color: #ffffff;
  border-radius: 12px 0px 12px 12px;
}

/* Action button style */
.ragnarok-chat-send-btn {
  background-color: var(--ragnarok-bot-primary);
  color: #ffffff;
  border-radius: 8px;
}
`;

  const widgetHtml = `<!-- Custom Chatbox Widget UI Structure -->
<div class="ragnarok-chat-container" id="ragnarok-chat-widget">
  <div class="ragnarok-chat-header flex items-center justify-between">
    <div class="flex items-center gap-2">
      <img src="${avatarImage || '/roscoe-logo.png'}" alt="${botName}" class="w-8 h-8 rounded-full border-2 border-white/40 shadow-sm" />
      <div>
        <h4 class="text-xs font-bold font-sans">${botName}</h4>
        <div class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          <span class="text-[8px] font-mono opacity-80 uppercase tracking-widest">Active & Online</span>
        </div>
      </div>
    </div>
    <button class="text-white hover:opacity-80 font-bold text-sm" onclick="toggleRagnarokChat()">&times;</button>
  </div>

  <div class="ragnarok-chat-messages-feed p-4 overflow-y-auto space-y-3 h-[380px]">
    <!-- Dynamic welcome message -->
    <div class="flex items-start gap-2 max-w-[85%]">
      <img src="${avatarImage || '/roscoe-logo.png'}" class="w-6 h-6 rounded-full shadow-inner mt-0.5" />
      <div class="ragnarok-chat-bubble-bot p-3 text-xs leading-relaxed">
        ${welcomeMessage}
      </div>
    </div>
  </div>

  <div class="ragnarok-chat-footer p-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
    <input type="text" id="ragnarok-user-input" class="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-${primaryColor}" placeholder="Type inquiry..." />
    <button id="ragnarok-send-btn" class="ragnarok-chat-send-btn p-2 hover:scale-105 transition flex items-center justify-center">
      <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
</div>
`;

  const apiCode = `// Security Keys & Whitelist Protection Logic
const RAGNAROK_API_CREDENTIALS = {
  publicKey: "pk_live_${activeBotId}_" + btoa("${activeBotId}").substr(0, 16),
  secretSignatureKey: "sig_sec_" + Math.random().toString(36).substr(2, 12),
  authorizedOrigins: [
    "https://*.yourdomain.com",
    "http://localhost:3000",
    window.location.origin
  ],
  rateLimiting: {
    maxRequestsPerMinute: 60,
    enableSpamProtection: true
  }
};

// Validate request origin at gateway
function validateOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // server-to-server fallback
  
  const isAuthorized = RAGNAROK_API_CREDENTIALS.authorizedOrigins.some(pattern => {
    const regex = new RegExp("^" + pattern.replace(/\\\\*/g, ".*") + "$");
    return regex.test(origin);
  });
  
  if (!isAuthorized) {
    throw new Error("403 Forbidden: Origin not whitelisted on this API Key.");
  }
}
`;

  const historyCode = `// Local Persistence & Refresh Continuity Engine
const CHAT_HISTORY_STORAGE_KEY = \`ragnarok_session_history_\${activeBotId}\`;

// Save messages to LocalStorage
function saveChatHistory(messages) {
  try {
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn("Storage write blocked:", error);
  }
}

// Load past messages on page initialization
function loadChatHistory() {
  try {
    const rawHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (rawHistory) {
      return JSON.parse(rawHistory);
    }
  } catch (error) {
    console.error("Storage read failed:", error);
  }
  // Fallback to initial bot greeting
  return [{
    sender: "bot",
    text: "${welcomeMessage}",
    timestamp: new Date().toISOString()
  }];
}

// Reset/Clear active history on logout or close
function clearSession() {
  localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
}
`;

  // Copy helper handlers for dynamic assets
  const handleCopyCss = () => {
    navigator.clipboard.writeText(customCss);
    setCopyCssSuccess(true);
    setTimeout(() => setCopyCssSuccess(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(widgetHtml);
    setCopyHtmlSuccess(true);
    setTimeout(() => setCopyHtmlSuccess(false), 2000);
  };

  const handleCopyApi = () => {
    navigator.clipboard.writeText(apiCode);
    setCopyApiSuccess(true);
    setTimeout(() => setCopyApiSuccess(false), 2000);
  };

  const handleCopyHistory = () => {
    navigator.clipboard.writeText(historyCode);
    setCopyHistorySuccess(true);
    setTimeout(() => setCopyHistorySuccess(false), 2000);
  };

  // Filter persona list
  const filteredPersonas = savedBots.filter(b => {
    const matchesSearch = b.bot_profile.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.business_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.main_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (b.interface_platform || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (industryFilter === 'all') return matchesSearch;
    return matchesSearch && (b.target_industry || '').toLowerCase().includes(industryFilter.toLowerCase());
  });

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-6 text-slate-800 animate-fade-in bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40" id="ai-bot-builder-view">
      {/* Visual Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white rounded-2xl shadow-xl relative overflow-hidden">
        {/* Abstract glowing blobs for a premium modernized look */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-300/10 rounded-full blur-2xl pointer-events-none -ml-8 -mb-8" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="p-3 bg-white/15 border border-white/20 rounded-xl shadow-inner">
            <Bot className="w-8 h-8 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2">
              AI Chat Bot Builder <span className="text-[10px] bg-yellow-400 text-slate-950 px-2.5 py-0.5 rounded font-mono font-black tracking-wide">v2.0 MULTI-STYLE</span>
            </h1>
            <p className="text-xs text-slate-100 font-mono tracking-wide mt-1">
              CLASSIC TEXT • DYNAMIC VIDEO AVATAR • THREE.JS 3D ANIMATED HOLOGRAM BOT
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 z-10">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black uppercase tracking-wider text-xs rounded-lg transition active:scale-95 cursor-pointer shadow-lg shadow-yellow-400/20"
          >
            + CREATE CUSTOM BOT
          </button>
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-white/10 hover:bg-red-500/20 border border-white/20 hover:border-red-500/50 text-white font-mono uppercase tracking-wider text-xs rounded-lg transition active:scale-95 cursor-pointer"
          >
            RESET 20 TEMPLATES
          </button>
        </div>
      </div>

      {/* Advanced Filter / Search Widget for 20 Personas */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-md">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 uppercase tracking-widest font-bold">
          <Search className="w-4 h-4 text-indigo-500" />
          <span>QUICK TEMPLATE LIBRARY ({filteredPersonas.length} LOADED)</span>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Search bar */}
          <input
            type="text"
            placeholder="Search personas, platforms, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 md:w-64 bg-slate-50 border border-indigo-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
          />

          {/* Industry Filter dropdown */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="bg-slate-50 border border-indigo-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer shadow-sm"
          >
            <option value="all">🌐 All Industries</option>
            <option value="automotive">🚗 Automotive</option>
            <option value="fitness">🏋️ Fitness</option>
            <option value="hospitality">🏨 Hospitality & Resorts</option>
            <option value="retail">🛍️ E-Commerce & Retail</option>
            <option value="healthcare">🩺 Healthcare & Wellness</option>
            <option value="marketing">📈 Marketing</option>
            <option value="web3">🪙 Crypto & Web3</option>
            <option value="legal">⚖️ Legal</option>
          </select>
        </div>
      </div>

      {/* Grid: Bot Selection list (filtered) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-[220px] overflow-y-auto pr-1" id="bot-selectors-grid">
        {filteredPersonas.map((b) => {
          const isActive = b.id === activeBotId;
          const isCat = b.character_theme === 'mascot_cat';
          const isPro = b.character_theme === 'professional';
          const isTech = b.character_theme === 'minimalist_tech';

          let cardColor = 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200 shadow-sm text-slate-800';
          if (isActive) {
            cardColor = isCat 
              ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
              : isPro
                ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                : isTech
                  ? 'border-teal-500 bg-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.15)]'
                  : 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
          }

          const customCardStyle: React.CSSProperties = {};
          if (b.ui_configuration.card_bg_type === 'image' && b.ui_configuration.card_bg_val) {
            customCardStyle.backgroundImage = `url(${b.ui_configuration.card_bg_val})`;
            customCardStyle.backgroundSize = 'cover';
            customCardStyle.backgroundPosition = 'center';
          } else if (b.ui_configuration.card_bg_type === 'color' && b.ui_configuration.card_bg_val) {
            customCardStyle.backgroundColor = b.ui_configuration.card_bg_val;
          }

          return (
            <div
              key={b.id}
              onClick={() => setActiveBotId(b.id)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[96px] relative group overflow-hidden ${cardColor}`}
              style={customCardStyle}
            >
              {b.ui_configuration.card_bg_type === 'image' && b.ui_configuration.card_bg_val && (
                <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] group-hover:bg-white/65 transition z-0" />
              )}
              <div className="flex items-start gap-2.5 min-w-0 justify-between relative z-10">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <img
                      src={b.ui_configuration.avatar_image || '/roscoe-logo.png'}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full border border-slate-200/80 object-cover bg-slate-50"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-white border border-slate-200 p-0.5 rounded-full shadow-sm">
                      {b.ui_configuration.bot_style === '3d_animated' ? (
                        <Cpu className="w-2.5 h-2.5 text-teal-600" />
                      ) : b.ui_configuration.bot_style === 'visual_media' ? (
                        <Video className="w-2.5 h-2.5 text-orange-600" />
                      ) : b.ui_configuration.bot_style === 'bubble_popup' ? (
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                      ) : (
                        <FileText className="w-2.5 h-2.5 text-blue-600" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-xs font-black truncate uppercase leading-tight ${isActive ? 'text-slate-900 font-extrabold' : 'text-slate-700'}`}>
                      {b.bot_profile.name}
                    </h3>
                    <span className="text-[8px] font-mono font-bold text-slate-400 uppercase block mt-0.5 truncate">
                      {b.interface_platform || 'Web widget'}
                    </span>
                  </div>
                </div>

                {!PERSONAS_20.some(p => p.id === b.id) ? (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteBot(b.id, e)}
                    className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition shrink-0 opacity-80 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    title="Delete Custom Bot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div 
                    className="p-1 -mr-1 -mt-1 text-slate-300/80 hover:text-slate-400 transition" 
                    title="Factory Preset Template (Non-Deletable)"
                  >
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 border-t border-slate-100/50 pt-1.5 mt-1.5 relative z-10">
                <span className="truncate max-w-[60%] uppercase font-bold text-indigo-600">{b.target_industry || 'General'}</span>
                <span className="bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded font-bold uppercase text-[7px] text-slate-600">
                  {b.ui_configuration.bot_style === 'visual_media' ? 'VISUAL_MEDIA' : b.ui_configuration.bot_style === '3d_animated' ? '3D_ANIMATED' : b.ui_configuration.bot_style === 'bubble_popup' ? 'BUBBLE_POPUP' : 'CLASSIC'}
                </span>
              </div>
            </div>
          );
        })}
        {filteredPersonas.length === 0 && (
          <div className="col-span-full p-8 text-center bg-[#0e0f14]/50 border border-dashed border-slate-800 rounded-xl text-xs font-mono text-slate-500">
            No pre-made personas matching search filters. Click "+ Create Custom Bot" to launch a new workspace.
          </div>
        )}
      </div>

      {/* Workspace split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Configuration (Lg: 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleGenerate} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Layout className="w-4.5 h-4.5 text-indigo-600" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Configure Bot Engine
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                BOT_ID: {activeBotId}
              </span>
            </div>

            {/* Inputs Block */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                    Bot Public Name
                  </label>
                  <input
                    type="text"
                    required
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
                    placeholder="e.g. Cooper - Sales Patrol"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                    Character Theme Mode
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer shadow-sm"
                  >
                    <option value="mascot_cat">🐾 High-Energy Sales Cat / Mascot</option>
                    <option value="professional">💼 Professional Assistant</option>
                    <option value="minimalist_tech">🤖 Minimalist / Modern Tech</option>
                    <option value="custom">⚙️ Custom Tone Rules (Create Your Own!)</option>
                  </select>
                </div>
              </div>

              {/* Custom Theme Rules Panel */}
              {theme === 'custom' && (
                <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-[9px] font-mono font-bold text-purple-700 uppercase tracking-widest">
                    ✏️ Your Custom Character Tone & Persona Guidelines
                  </label>
                  <textarea
                    rows={2}
                    value={customThemeRules}
                    onChange={(e) => setCustomThemeRules(e.target.value)}
                    className="w-full bg-slate-50 border border-purple-300 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white transition font-mono"
                    placeholder="Describe how the bot should behave (e.g. Speak with pirate slang, utilize cool custom references, act witty and curious...)"
                  />
                </div>
              )}

              {/* Industry & Platform Config (Injected Metadata) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                    Target Industry
                  </label>
                  <input
                    type="text"
                    required
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
                    placeholder="e.g. Real Estate, Fitness, Automotive"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                    Interface / Deployment Platform
                  </label>
                  <input
                    type="text"
                    required
                    value={interfacePlatform}
                    onChange={(e) => setInterfacePlatform(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
                    placeholder="e.g. Shopify Agent, Phone Agent, WhatsApp Desk"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                  Business Description
                </label>
                <input
                  type="text"
                  required
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
                  placeholder="e.g. Ragnarök Auto Workshop - corvette tuning and repairs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                  Main Role & Goal Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={mainRole}
                  onChange={(e) => setMainRole(e.target.value)}
                  className="w-full bg-slate-50 border border-indigo-300 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition font-mono shadow-sm"
                  placeholder="e.g. Booking assistant & high-converting sales advisor"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Uploaded Knowledge base (Documents, prices, FAQ)</span>
                  <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-1.5 py-0.5 rounded font-bold">INJECTED TEXT</span>
                </label>
                <textarea
                  rows={4}
                  value={uploadedDocs}
                  onChange={(e) => setUploadedDocs(e.target.value)}
                  className="w-full bg-slate-50 border border-indigo-300 rounded-lg p-3 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm mb-2"
                  placeholder="Paste pricing schedules, addresses, phone numbers, or rules here..."
                />
                
                {/* PDF/TXT Upload Utility Bar */}
                <div className="flex flex-col gap-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[10px] font-semibold text-indigo-950">Add Document to Knowledge</span>
                    </div>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-600 text-white rounded cursor-pointer hover:bg-indigo-700 transition shadow-sm">
                      <span>Upload PDF / TXT</span>
                      <input 
                        type="file" 
                        accept=".pdf,.txt" 
                        onChange={handleKnowledgeFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[8.5px] text-slate-500 leading-relaxed">
                    Upload your company handbook, price sheets, or FAQ docs. We extract the text and integrate it into the chatbot's core facts context.
                  </p>
                  
                  {isParsingPdf && (
                    <div className="flex items-center gap-1.5 text-[9px] text-indigo-700 font-medium bg-white border border-indigo-100 px-2 py-1 rounded shadow-sm animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                      <span>Reading file and extracting document knowledge context...</span>
                    </div>
                  )}
                  
                  {pdfError && (
                    <div className="text-[9px] text-red-600 font-semibold bg-red-50 border border-red-100 px-2 py-1 rounded">
                      ⚠️ {pdfError}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                    Call To Action (CTA) Link
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryCta}
                    onChange={(e) => setPrimaryCta(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
                    placeholder="e.g. https://ragnarok.work/book"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                    Widget Layout style
                  </label>
                  <select
                    value={layoutStyle}
                    onChange={(e) => setLayoutStyle(e.target.value as any)}
                    className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer shadow-sm"
                  >
                    <option value="floating_bubble">💬 Floating Bubble (Standard)</option>
                    <option value="side_panel">📋 Side Drawer / Panel</option>
                    <option value="inline_card">🗂️ Inline Embedded Card</option>
                  </select>
                </div>
              </div>

              {/* DUAL MODE CHAT BOT INTERFACE STYLES (CLASSIC, VIDEO, 3D, AUTO BUBBLE) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="border-b border-slate-200/80 pb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider block">
                    Choose Dynamic Chat Bot Style (4 Options)
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBotStyle('classic')}
                    className={`p-2.5 rounded-lg border-2 font-mono text-[9px] uppercase tracking-wider text-center transition-all duration-200 cursor-pointer ${
                      botStyle === 'classic' 
                        ? 'border-blue-600 bg-blue-600 text-white font-black shadow-md scale-[1.03]' 
                        : 'border-blue-200 bg-blue-50/75 text-blue-800 hover:bg-blue-100 hover:border-blue-300 shadow-sm'
                    }`}
                  >
                    Classic Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotStyle('visual_media')}
                    className={`p-2.5 rounded-lg border-2 font-mono text-[9px] uppercase tracking-wider text-center transition-all duration-200 cursor-pointer ${
                      botStyle === 'visual_media' 
                        ? 'border-orange-600 bg-orange-600 text-white font-black shadow-md scale-[1.03]' 
                        : 'border-orange-200 bg-orange-50/75 text-orange-800 hover:bg-orange-100 hover:border-orange-300 shadow-sm'
                    }`}
                  >
                    🎥 Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotStyle('3d_animated')}
                    className={`p-2.5 rounded-lg border-2 font-mono text-[9px] uppercase tracking-wider text-center transition-all duration-200 cursor-pointer ${
                      botStyle === '3d_animated' 
                        ? 'border-teal-600 bg-teal-600 text-white font-black shadow-md scale-[1.03]' 
                        : 'border-teal-200 bg-teal-50/75 text-teal-800 hover:bg-teal-100 hover:border-teal-300 shadow-sm'
                    }`}
                  >
                    🤖 3D Tech
                  </button>
                  <button
                    type="button"
                    onClick={() => setBotStyle('bubble_popup')}
                    className={`p-2.5 rounded-lg border-2 font-mono text-[9px] uppercase tracking-wider text-center transition-all duration-200 cursor-pointer ${
                      botStyle === 'bubble_popup' 
                        ? 'border-amber-600 bg-amber-600 text-white font-black shadow-md scale-[1.03]' 
                        : 'border-amber-200 bg-amber-50/75 text-amber-800 hover:bg-amber-100 hover:border-amber-300 shadow-sm'
                    }`}
                  >
                    💬 Auto Bubble
                  </button>
                </div>

                 {/* Sub-panel 1: Visual Media configs (Calm / Run local MP4 state selection) */}
                 {botStyle === 'visual_media' && (
                   <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-inner animate-fade-in">
                     <span className="text-[9px] font-mono text-orange-600 uppercase font-bold tracking-widest block">
                       🎥 Media Configuration Settings
                     </span>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       <div>
                         <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                           Media Representation Type
                         </label>
                         <select
                           value={mediaType}
                           onChange={(e) => setMediaType(e.target.value as any)}
                           className="w-full bg-slate-50 border border-indigo-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500 shadow-sm"
                         >
                           <option value="video">🎥 Multi-State Workshop MP4 Video</option>
                           <option value="image">🖼️ Static Avatar Logo Image</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                           Static Profile Avatar Image
                         </label>
                         <select
                           value={avatarImage}
                           onChange={(e) => setAvatarImage(e.target.value)}
                           className="w-full bg-slate-50 border border-indigo-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono mb-2 focus:outline-none focus:border-indigo-500 shadow-sm"
                         >
                           <option value="/cooper-logo.png">Cooper Cat Logo (/cooper-logo.png)</option>
                           <option value="/roscoe-logo.png">Roscoe Garage Logo (/roscoe-logo.png)</option>
                           <option value="/gangstercats.png">Gangster Cats Artwork (/gangstercats.png)</option>
                           <option value="/scarycats.png">Cyber Scout Cyberpunk Cat (/scarycats.png)</option>
                           <option value="custom">Custom Uploaded Image...</option>
                         </select>
                         <MediaField
                           value={avatarImage === 'custom' ? '' : avatarImage}
                           onChange={(val) => setAvatarImage(val)}
                           accept="image"
                           placeholder="Or upload custom image..."
                         />
                       </div>
                     </div>
 
                     {mediaType === 'video' && (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                         <div className="space-y-1.5">
                           <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                             💤 Calm / Idle State Video Loop
                           </label>
                           <select
                             value={calmVideo}
                             onChange={(e) => setCalmVideo(e.target.value)}
                             className="w-full bg-white border border-indigo-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500 shadow-sm"
                           >
                             <option value="/garage-calm.mp4">Garage Calm (/garage-calm.mp4)</option>
                             <option value="/jobs-calm.mp4">Staff Briefing Calm (/jobs-calm.mp4)</option>
                             <option value="/customer-calm.mp4">Customer Support Room (/customer-calm.mp4)</option>
                             <option value="/vehicle-calm.mp4">Under Hood Wiring (/vehicle-calm.mp4)</option>
                           </select>
                           <MediaField
                             value={calmVideo}
                             onChange={(val) => setCalmVideo(val)}
                             accept="video"
                             placeholder="Or upload custom video..."
                           />
                         </div>
                         <div className="space-y-1.5">
                           <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                             ⚡ Active / Speaking State Video Loop
                           </label>
                           <select
                             value={activeVideo}
                             onChange={(e) => setActiveVideo(e.target.value)}
                             className="w-full bg-white border border-indigo-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500 shadow-sm"
                           >
                             <option value="/garage-run.mp4">Power Tools Active (/garage-run.mp4)</option>
                             <option value="/jobs-buff.mp4">Hydraulic Lift Dynamic (/jobs-buff.mp4)</option>
                             <option value="/customer-run.mp4">Staff Response Run (/customer-run.mp4)</option>
                             <option value="/vehicle-run.mp4">Performance Engine Dyno Run (/vehicle-run.mp4)</option>
                             <option value="/roscoecooperfixcar.mp4">Cooper Fix Car Action (/roscoecooperfixcar.mp4)</option>
                           </select>
                           <MediaField
                             value={activeVideo}
                             onChange={(val) => setActiveVideo(val)}
                             accept="video"
                             placeholder="Or upload custom video..."
                           />
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                {/* Sub-panel 2: ThreeJS 3D configs */}
                {botStyle === '3d_animated' && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-inner animate-fade-in">
                    <span className="text-[9px] font-mono text-teal-600 uppercase font-bold tracking-widest block">
                      🤖 Interactive 3D Model Configuration (Three.js WebGL Core)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Hologram 3D Preset Geometry
                        </label>
                        <select
                          value={threePreset}
                          onChange={(e) => setThreePreset(e.target.value as any)}
                          className="w-full bg-slate-50 border border-teal-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono cursor-pointer focus:outline-none focus:border-teal-500 shadow-sm"
                        >
                          <option value="neon_core">🎆 Glowing Torus Core (Neon Core)</option>
                          <option value="hologram">📡 Scanning Laser Ring (Hologram Assistant)</option>
                          <option value="cyber_sphere">🌐 Cybernetic Wireframe (Cyber Sphere)</option>
                          <option value="quantum">🌌 Quantum Particle Cloud (Quantum Star)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>3D Animation Speed</span>
                          <span className="text-teal-600 font-bold font-mono">{threeSpeed}x</span>
                        </label>
                        <input
                          type="range"
                          min="0.2"
                          max="3"
                          step="0.1"
                          value={threeSpeed}
                          onChange={(e) => setThreeSpeed(parseFloat(e.target.value))}
                          className="w-full accent-teal-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>3D Model Size (Scale)</span>
                          <span className="text-teal-600 font-bold font-mono">{threeModelScale}%</span>
                        </label>
                        <input
                          type="range"
                          min="30"
                          max="250"
                          step="5"
                          value={threeModelScale}
                          onChange={(e) => setThreeModelScale(parseInt(e.target.value))}
                          className="w-full accent-teal-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Quantum Particle Density</span>
                          <span className="text-teal-600 font-bold font-mono">{threeParticles}pt</span>
                        </label>
                        <input
                          type="range"
                          min="200"
                          max="4000"
                          step="100"
                          value={threeParticles}
                          onChange={(e) => setThreeParticles(parseInt(e.target.value))}
                          className="w-full accent-teal-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                         type="checkbox"
                         id="threeWireframe"
                         checked={threeWireframe}
                         onChange={(e) => setThreeWireframe(e.target.checked)}
                         className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-0 cursor-pointer"
                       />
                       <label htmlFor="threeWireframe" className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider select-none cursor-pointer">
                         Render Wireframe Skin Overlay
                       </label>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                        <MediaField
                          value={threeFile}
                          onChange={(val) => setThreeFile(val)}
                          accept="model"
                          label="📡 Custom Hologram 3D Model Asset (.glb / .vlm)"
                          labelColorClass="text-teal-600 font-bold font-mono text-[8.5px]"
                          placeholder="Upload custom 3D model..."
                        />
                    </div>
                  </div>
                )}

                {/* Sub-panel 3: Bubble popup configs */}
                {botStyle === 'bubble_popup' && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-inner animate-fade-in">
                    <span className="text-[9px] font-mono text-amber-600 uppercase font-bold tracking-widest block">
                      💬 Website Auto-Pop Bubbles Configuration
                    </span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Specify a comma-separated list of phrases that will automatically trigger and pop up on your website to catch the customer's eye. The interactive simulator preview will randomly cycle these with micro-animations.
                    </p>
                    <div>
                      <label className="block text-[8.5px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Random Popup Phrases (separated by commas)
                      </label>
                      <textarea
                        rows={3}
                        value={bubblePhrases}
                        onChange={(e) => setBubblePhrases(e.target.value)}
                        className="w-full bg-slate-50 border border-indigo-300 rounded p-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
                        placeholder="e.g. Need an LS swap? I can quote you! 🐾, ATF Transmission Flush is only $110! ⚡"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-panel 4: Custom Logo, Background & Transparency Customizations */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
                  <span className="text-[10px] font-mono text-indigo-600 uppercase font-bold tracking-widest block border-b border-slate-100 pb-1.5">
                    🎨 Visual Backgrounds & Brand Customization
                  </span>

                  {/* Top Left Logo customization */}
                  <div className="space-y-2">
                    <label className="block text-[8.5px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                      🎯 Top-Left Brand Logo / Avatar
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={avatarImage}
                        onChange={(e) => setAvatarImage(e.target.value)}
                        className="w-full bg-slate-50 border border-indigo-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500 shadow-sm"
                      >
                        <option value="/cooper-logo.png">Cooper Engine Scan Logo (/cooper-logo.png)</option>
                        <option value="/roscoe-logo.png">Roscoe Spark Plugs Logo (/roscoe-logo.png)</option>
                        <option value="/gangstercats.png">Coach Rex Logo (/gangstercats.png)</option>
                        <option value="/scarycats.png">Scary Cats Logo (/scarycats.png)</option>
                        <option value="/hiphopyoutubebackground.jpg">Garage Bay Static View (/hiphopyoutubebackground.jpg)</option>
                      </select>
                      <MediaField
                        value={avatarImage}
                        onChange={(val) => setAvatarImage(val)}
                        accept="image"
                        placeholder="Or upload custom brand logo..."
                      />
                    </div>
                  </div>

                  {/* Card Tab Background Customization */}
                  <div className="space-y-3 bg-purple-50/30 border border-purple-100/50 p-3 rounded-lg">
                    <span className="text-[9px] font-mono text-purple-700 uppercase font-bold tracking-wider block">
                      🎫 Bot Selector Tab Card Background
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Tab Background Type
                        </label>
                        <select
                          value={cardBgType}
                          onChange={(e) => {
                            const newType = e.target.value as 'color' | 'image';
                            setCardBgType(newType);
                            if (newType === 'color') {
                              setCardBgVal('#ffffff');
                            } else {
                              setCardBgVal('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80');
                            }
                          }}
                          className="w-full bg-white border border-purple-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-purple-500 shadow-sm"
                        >
                          <option value="color">🎨 Solid Color / Glass</option>
                          <option value="image">🖼️ Backdrop Image</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {cardBgType === 'color' ? 'Background Color' : 'Backdrop Image URL'}
                        </label>
                        {cardBgType === 'color' ? (
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="color"
                              value={cardBgVal.startsWith('#') && cardBgVal.length === 7 ? cardBgVal : '#ffffff'}
                              onChange={(e) => setCardBgVal(e.target.value)}
                              className="w-8 h-7 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                            />
                            <input
                              type="text"
                              value={cardBgVal}
                              onChange={(e) => setCardBgVal(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded p-1 text-[10px] font-mono text-slate-800"
                              placeholder="#ffffff"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={cardBgVal}
                              onChange={(e) => setCardBgVal(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-[10px] font-mono text-slate-800"
                              placeholder="Image URL..."
                            />
                            <MediaField
                              value={cardBgVal}
                              onChange={(val) => setCardBgVal(val)}
                              accept="image"
                              placeholder="Or upload backdrop..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3D Model Area Background Customization (Only if 3d_animated selected) */}
                  {botStyle === '3d_animated' && (
                    <div className="space-y-3 bg-teal-50/30 border border-teal-100/50 p-3 rounded-lg">
                      <span className="text-[9px] font-mono text-teal-700 uppercase font-bold tracking-wider block">
                        🤖 3D Model Area Backdrop
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Backdrop Type
                          </label>
                          <select
                            value={threeBgType}
                            onChange={(e) => {
                              const newType = e.target.value as any;
                              setThreeBgType(newType);
                              if (newType === 'color') {
                                setThreeBgVal('#0a0b10');
                              } else if (newType === 'image') {
                                setThreeBgVal('/chat-background.png');
                              } else if (newType === 'video') {
                                setThreeBgVal('/garage-calm.mp4');
                              }
                            }}
                            className="w-full bg-white border border-teal-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-teal-500 shadow-sm"
                          >
                            <option value="color">🎨 Solid Background Color</option>
                            <option value="image">🖼️ Static Background Image</option>
                            <option value="video">🎥 Animated Background Video</option>
                          </select>
                        </div>

                        {threeBgType === 'color' ? (
                          <div>
                            <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Solid Color Picker
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={threeBgVal}
                                onChange={(e) => setThreeBgVal(e.target.value)}
                                className="w-8 h-8 rounded border-slate-300 cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={threeBgVal}
                                onChange={(e) => setThreeBgVal(e.target.value)}
                                className="flex-1 min-w-0 bg-white border border-teal-300 rounded-lg p-1 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                              {threeBgType === 'image' ? '🖼️ Backdrop Image' : '🎥 Backdrop Video'}
                            </label>
                            <select
                              value={threeBgVal}
                              onChange={(e) => setThreeBgVal(e.target.value)}
                              className="w-full bg-white border border-teal-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none"
                            >
                              <option value="">-- Custom Upload/Input below --</option>
                              {threeBgType === 'image' ? (
                                <>
                                  <option value="/chat-background.png">Cyber Blueprint Map</option>
                                  <option value="/hiphopyoutubebackground.jpg">Garage Bay Idling View</option>
                                </>
                              ) : (
                                <>
                                  <option value="/garage-calm.mp4">Garage Bay Low Ambient Video</option>
                                  <option value="/garage-run.mp4">Engine Active Sparks Loop</option>
                                  <option value="/roscoecooperfixcar.mp4">Staff Mechanic Service Loop</option>
                                </>
                              )}
                            </select>
                            <div className="mt-1.5">
                              <MediaField
                                value={threeBgVal}
                                onChange={(val) => setThreeBgVal(val)}
                                accept={threeBgType === 'image' ? 'image' : 'video'}
                                placeholder={threeBgType === 'image' ? 'Or upload backdrop image...' : 'Or upload backdrop video...'}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Transparency controls for image/video backgrounds */}
                      {(threeBgType === 'image' || threeBgType === 'video') && (
                        <div className="pt-2 border-t border-teal-100/50">
                          <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>Backdrop Transparency (Opacity)</span>
                            <span className="text-teal-700 font-bold font-mono">{threeBgOpacity}%</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={threeBgOpacity}
                            onChange={(e) => setThreeBgOpacity(parseInt(e.target.value))}
                            className="w-full accent-teal-600"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Message Box Area Background Customization */}
                  <div className="space-y-3 bg-blue-50/30 border border-blue-100/50 p-3 rounded-lg">
                    <span className="text-[9px] font-mono text-blue-700 uppercase font-bold tracking-wider block">
                      💬 Chat Message Box Backdrop
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Backdrop Type
                        </label>
                        <select
                          value={chatBgType}
                          onChange={(e) => {
                            const newType = e.target.value as any;
                            setChatBgType(newType);
                            if (newType === 'color') {
                              setChatBgVal('#f8fafc');
                            } else if (newType === 'image') {
                              setChatBgVal('/chat-background.png');
                            } else if (newType === 'video') {
                              setChatBgVal('/garage-calm.mp4');
                            }
                          }}
                          className="w-full bg-white border border-blue-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-blue-500 shadow-sm"
                        >
                          <option value="color">🎨 Solid Background Color</option>
                          <option value="image">🖼️ Static Background Image</option>
                          <option value="video">🎥 Animated Background Video</option>
                        </select>
                      </div>

                      {chatBgType === 'color' ? (
                        <div>
                          <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Solid Color Picker
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={chatBgVal}
                              onChange={(e) => setChatBgVal(e.target.value)}
                              className="w-8 h-8 rounded border-slate-300 cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={chatBgVal}
                              onChange={(e) => setChatBgVal(e.target.value)}
                              className="flex-1 min-w-0 bg-white border border-blue-300 rounded-lg p-1 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {chatBgType === 'image' ? '🖼️ Backdrop Image' : '🎥 Backdrop Video'}
                          </label>
                          <select
                              value={chatBgVal}
                              onChange={(e) => setChatBgVal(e.target.value)}
                              className="w-full bg-white border border-blue-300 rounded-lg p-1.5 text-[10px] text-slate-800 font-mono focus:outline-none"
                            >
                              <option value="">-- Custom Upload/Input below --</option>
                              {chatBgType === 'image' ? (
                                <>
                                  <option value="/chat-background.png">Cyber Blueprint Map</option>
                                  <option value="/hiphopyoutubebackground.jpg">Garage Bay Idling View</option>
                                </>
                              ) : (
                                <>
                                  <option value="/garage-calm.mp4">Garage Bay Low Ambient Video</option>
                                  <option value="/garage-run.mp4">Engine Active Sparks Loop</option>
                                  <option value="/roscoecooperfixcar.mp4">Staff Mechanic Service Loop</option>
                                </>
                              )}
                            </select>
                          <div className="mt-1.5">
                            <MediaField
                              value={chatBgVal}
                              onChange={(val) => setChatBgVal(val)}
                              accept={chatBgType === 'image' ? 'image' : 'video'}
                              placeholder={chatBgType === 'image' ? 'Or upload backdrop image...' : 'Or upload backdrop video...'}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transparency controls for image/video backgrounds */}
                    {(chatBgType === 'image' || chatBgType === 'video') && (
                      <div className="pt-2 border-t border-blue-100/50">
                        <label className="block text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Backdrop Transparency (Opacity)</span>
                          <span className="text-blue-700 font-bold font-mono">{chatBgOpacity}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={chatBgOpacity}
                          onChange={(e) => setChatBgOpacity(parseInt(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Shared Theme & Color Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200/80 pt-3">
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Primary Theme
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded border border-indigo-300 bg-transparent cursor-pointer p-0.5 shadow-sm"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full bg-slate-50 border border-indigo-300 rounded px-2 py-1 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Secondary Accent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-8 h-8 rounded border border-indigo-300 bg-transparent cursor-pointer p-0.5 shadow-sm"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full bg-slate-50 border border-indigo-300 rounded px-2 py-1 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Typography Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full bg-slate-50 border border-indigo-300 rounded px-2 py-1.5 text-[10px] text-slate-800 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                    >
                      <option value="monospace">monospace (Console)</option>
                      <option value="sans-serif">sans-serif (Modern)</option>
                      <option value="Georgia, serif">serif (Editorial)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                    Widget Welcome Opening Message
                  </label>
                  <input
                    type="text"
                    required
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-indigo-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm"
                    placeholder="Welcome opening line..."
                  />
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest">
                      ✨ Bot Transparency / Translucency
                    </label>
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                      {botOpacity}% Opacity
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans leading-normal">
                    Control how translucent the live chat widget visual will appear on your webpage (0% is fully invisible, 100% is fully opaque).
                  </p>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={botOpacity}
                    onChange={(e) => setBotOpacity(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-white" />
                Compile & Deploy Bot Package
              </button>
              <button
                type="button"
                onClick={handleSaveBot}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-mono uppercase tracking-wider text-xs rounded-xl transition active:scale-95 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
            
            {saveSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4" />
                <span>AI Bot configuration updated and saved successfully! Deployment files updated in local-disk.</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Dual tabs Live Preview / JSON Export (Lg: 5 columns) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Tabs Selector */}
          <div className="flex items-center gap-4 pb-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'preview' 
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/15' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Live Widget Preview
            </button>
            <button
              onClick={() => setActiveTab('json_code')}
              className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'json_code' 
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/15' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-cyan-400 font-bold">&lt;&nbsp;&gt;</span>
              Deployment Code JSON
            </button>
          </div>

          {/* Tab content 1: Interactive Chat Simulator Mockup */}
          {activeTab === 'preview' && (
            <div className="border border-[#1e202d] bg-[#0c0d15]/85 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex flex-col h-[650px] overflow-hidden">
              {/* Simulator Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Interactive Simulator
                  </span>
                </div>
                <button
                  onClick={() => compileBot()}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition cursor-pointer"
                  title="Reload Simulator State"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Phone Device Mockup Container */}
              <div className="flex-1 mt-4 border border-[#212330] rounded-xl overflow-hidden bg-[#07080b] flex flex-col relative" style={{ fontFamily: fontFamily === 'monospace' ? "'Courier New', monospace" : 'Inter, sans-serif' }}>
                
                {/* Bot Profile Top Header */}
                <div
                  className={`p-3 text-white flex items-center justify-between shadow-md z-10 border-b ${
                    theme === 'mascot_cat' 
                      ? 'bg-gradient-to-r from-red-800 to-rose-950 border-rose-500/20' 
                      : 'border-white/10'
                  }`}
                  style={theme !== 'mascot_cat' ? { backgroundColor: primaryColor } : undefined}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden shrink-0 relative bg-slate-900 flex items-center justify-center">
                      <img
                        src={avatarImage || '/roscoe-logo.png'}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white truncate leading-none">
                        {botName || 'Custom Helper'}
                      </h4>
                      <span className="text-[8px] opacity-80 uppercase tracking-widest font-mono mt-0.5 block">
                        Online • {interfacePlatform}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[8px] border px-1.5 py-0.5 rounded font-mono uppercase ${
                    theme === 'mascot_cat' 
                      ? 'bg-rose-500/20 border-rose-400/30 text-rose-300' 
                      : 'bg-black/20 border-white/10 text-white'
                  }`}>
                    {layoutStyle}
                  </span>
                </div>

                {/* RENDER TOP HALF INTERACTIVE MEDIA/3D IF STYLE CHOSEN */}
                {botStyle === '3d_animated' && (
                  <div className="h-[200px] border-b border-slate-200 shrink-0 relative overflow-hidden" style={{ opacity: botOpacity / 100 }}>
                    <BotThreeCanvas
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      preset={threePreset}
                      isTalking={isTyping}
                      speed={threeSpeed}
                      wireframe={threeWireframe}
                      particleCount={threeParticles}
                      customModelUrl={threeFile}
                      bgColor={threeBgType === 'color' ? threeBgVal : '#07080b'}
                      bgType={threeBgType}
                      bgVal={threeBgVal}
                      bgOpacity={threeBgOpacity}
                      modelScale={threeModelScale}
                    />
                  </div>
                )}

                {botStyle === 'visual_media' && mediaType === 'video' && (
                  <div className="h-[200px] border-b border-slate-200 shrink-0 relative bg-black flex items-center justify-center overflow-hidden" style={{ opacity: botOpacity / 100 }}>
                    {/* Multi-state interactive auto-switching video player */}
                    <video
                      key={isTyping ? activeVideo : calmVideo}
                      src={isTyping ? activeVideo : calmVideo}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 border border-white/10 px-1.5 py-0.5 rounded text-[8px] font-mono text-orange-400 uppercase tracking-wider">
                      {isTyping ? '⚡ ACTIVE SPEAKING LOOP' : '💤 IDLING PREVIEW'}
                    </div>
                  </div>
                )}

                {botStyle === 'visual_media' && mediaType === 'image' && (
                  <div className="h-[200px] border-b border-slate-200 shrink-0 bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden" style={{ opacity: botOpacity / 100 }}>
                    <div className="relative">
                      <div className={`w-28 h-28 rounded-full border-2 overflow-hidden transition-all duration-500 ${
                        isTyping ? 'border-amber-400 scale-105 animate-pulse' : 'border-slate-300'
                      }`} style={{ borderColor: primaryColor }}>
                        <img
                          src={avatarImage || '/roscoe-logo.png'}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {isTyping && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-widest animate-bounce">
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {botStyle === 'bubble_popup' && (
                  <div className="h-[200px] border-b border-slate-200 shrink-0 bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50/50 flex flex-col justify-between p-3 relative overflow-hidden" style={{ opacity: botOpacity / 100 }}>
                    {/* Glowing background grid lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f10a_1px,transparent_1px),linear-gradient(to_bottom,#6366f10a_1px,transparent_1px)] bg-[size:14px_14px]" />
                    
                    {/* Website Header Mock */}
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 z-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                        <span className="text-[9px] font-mono text-indigo-700 font-bold tracking-wider uppercase">
                          Ragnarök Live Portal
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[7px] font-mono text-slate-400 uppercase">Products</span>
                        <span className="text-[7px] font-mono text-slate-400 uppercase">Upgrade</span>
                        <span className="text-[7px] font-mono text-slate-600 uppercase underline">Live Agent</span>
                      </div>
                    </div>

                    {/* Web Content Slogan */}
                    <div className="my-auto z-10 space-y-1">
                      <h4 className="text-[11px] font-bold tracking-tight text-slate-800 uppercase font-sans">
                        Corvette Tuning & LS Custom Swaps
                      </h4>
                      <p className="text-[8px] text-slate-500 max-w-[80%] font-mono">
                        Deploy custom chatbots on your live funnels instantly. Try our live active popup triggers below.
                      </p>
                    </div>

                    {/* Bottom Info bar */}
                    <div className="flex items-center justify-between text-[7.5px] font-mono text-slate-400 border-t border-slate-200/60 pt-1.5 z-10">
                      <span>LIFTS ACTIVE: 4/4</span>
                      <span>ACTIVE COLOR: <span style={{ color: primaryColor }}>{primaryColor}</span></span>
                    </div>

                    {/* Dynamic Popup Bubble Area inside the Web Mockup */}
                    <div className="absolute bottom-6 right-3 z-20 flex flex-col items-end gap-1.5">
                      {/* Floating Alert Speech Bubble */}
                      {bubblePopupVisible && activeBubblePopup && (
                        <div className="max-w-[150px] bg-white border-2 border-indigo-600 text-slate-800 p-2 rounded-xl rounded-br-none shadow-xl shadow-indigo-500/10 relative animate-bounce text-[9px] leading-snug transition-all duration-300 transform scale-100 select-none">
                          <div className="text-[7px] text-indigo-600 font-bold uppercase font-mono tracking-wider mb-0.5 flex items-center gap-1">
                            <span>⚡ Live Alert Popup</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          </div>
                          {activeBubblePopup}
                          <div className="absolute top-1 right-1 cursor-pointer hover:text-indigo-500 text-slate-400 font-bold" onClick={() => setBubblePopupVisible(false)}>
                            ×
                          </div>
                        </div>
                      )}

                      {/* Mini Live Launcher Widget Icon */}
                      <div className="w-8 h-8 rounded-full bg-white border border-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/10 cursor-pointer animate-pulse">
                        <img
                          src={avatarImage || '/roscoe-logo.png'}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                 {/* Messages Feed Container with Custom Background & Opacity */}
                <div className="flex-1 relative overflow-hidden bg-slate-950/45">
                  {/* Backdrop Color Layer with True Transparency */}
                  {chatBgType === 'color' && chatBgVal && (
                    <div 
                      className="absolute inset-0 z-0 pointer-events-none" 
                      style={{ backgroundColor: chatBgVal, opacity: chatBgOpacity / 100 }}
                    />
                  )}
                  {/* Optional Background Image */}
                  {chatBgType === 'image' && chatBgVal && (
                    <img
                      src={chatBgVal}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 animate-fade-in"
                      style={{ opacity: chatBgOpacity / 100 }}
                    />
                  )}
                  {/* Optional Background Video */}
                  {chatBgType === 'video' && chatBgVal && (
                    <video
                      src={chatBgVal}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 animate-fade-in"
                      style={{ opacity: chatBgOpacity / 100 }}
                    />
                  )}

                  {/* Scrollable messages list overlay */}
                  <div className="absolute inset-0 p-3 overflow-y-auto space-y-2.5 z-10 bg-transparent">
                    {chatMessages.map((msg, idx) => {
                      const isBot = msg.sender === 'bot';
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                        >
                          {isBot && (
                            <div className="w-6 h-6 rounded-full border border-slate-200 overflow-hidden shrink-0 mt-0.5 bg-white">
                              <img
                                src={avatarImage || '/roscoe-logo.png'}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div
                              className={`p-2.5 rounded-xl text-[11px] leading-relaxed break-words ${
                                isBot 
                                  ? 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none' 
                                  : 'text-white font-semibold rounded-tr-none'
                              }`}
                              style={!isBot ? { backgroundColor: primaryColor } : undefined}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[8px] text-slate-400 block px-1 text-right font-mono">
                              {msg.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {isTyping && (
                      <div className="flex items-start gap-2 mr-auto max-w-[80%] animate-pulse">
                        <div className="w-6 h-6 rounded-full border border-slate-200 overflow-hidden shrink-0 mt-0.5 bg-white">
                          <img
                            src={avatarImage || '/roscoe-logo.png'}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="bg-white border border-slate-200 text-slate-500 p-2.5 rounded-xl rounded-tl-none text-[10px] font-mono">
                          Typing coordinate logs...
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                </div>

                {/* Floating Launcher Widget Overlay inside Simulator if layout is floating_bubble */}
                {layoutStyle === 'floating_bubble' && (
                  <div className="absolute bottom-16 right-4 w-11 h-11 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer animate-pulse z-20" style={{ opacity: botOpacity / 100 }}>
                    <Bot className="w-5 h-5 text-indigo-600" />
                  </div>
                )}

                {/* Input form */}
                <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200 bg-white flex items-center gap-1.5 z-10">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder="Type client inquiry..."
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg text-white transition hover:scale-105 cursor-pointer shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab content 2: Developer Assets Hub */}
          {activeTab === 'json_code' && (
            <div className="border border-[#1e202d] bg-surface-theme rounded-2xl p-4 shadow-xl flex flex-col h-[650px] space-y-4 overflow-hidden text-white">
              {/* Header/Subtabs Navigation */}
              <div className="flex flex-col space-y-2 pb-2 border-b border-[#212330]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-primary-theme" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase">
                      Developer Assets Hub
                    </span>
                  </div>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                    Ready to Deploy
                  </span>
                </div>
                
                {/* Subtabs Navigation Grid - flex-wrap ensures all buttons are 100% visible and accessible */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1.5">
                  <button
                    onClick={() => setActiveDevSubTab('embed')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[9.5px] uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                      activeDevSubTab === 'embed'
                        ? 'bg-primary-theme border-primary-theme text-white font-bold'
                        : 'bg-[#161824] border-[#212330] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    📡 Embed Code
                  </button>
                  <button
                    onClick={() => setActiveDevSubTab('css')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[9.5px] uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                      activeDevSubTab === 'css'
                        ? 'bg-primary-theme border-primary-theme text-white font-bold'
                        : 'bg-[#161824] border-[#212330] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    🎨 CSS Styles
                  </button>
                  <button
                    onClick={() => setActiveDevSubTab('html')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[9.5px] uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                      activeDevSubTab === 'html'
                        ? 'bg-primary-theme border-primary-theme text-white font-bold'
                        : 'bg-[#161824] border-[#212330] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    🗂️ Widget HTML
                  </button>
                  <button
                    onClick={() => setActiveDevSubTab('api')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[9.5px] uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                      activeDevSubTab === 'api'
                        ? 'bg-primary-theme border-primary-theme text-white font-bold'
                        : 'bg-[#161824] border-[#212330] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    🔑 API Keys
                  </button>
                  <button
                    onClick={() => setActiveDevSubTab('history')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[9.5px] uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                      activeDevSubTab === 'history'
                        ? 'bg-primary-theme border-primary-theme text-white font-bold'
                        : 'bg-[#161824] border-[#212330] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    💾 Chat History
                  </button>
                  <button
                    onClick={() => setActiveDevSubTab('json')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[9.5px] uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                      activeDevSubTab === 'json'
                        ? 'bg-primary-theme border-primary-theme text-white font-bold'
                        : 'bg-[#161824] border-[#212330] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    ⚙️ Full JSON
                  </button>
                </div>
              </div>

              {/* Dynamic Sub-tab content */}
              <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                {activeDevSubTab === 'embed' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between shrink-0">
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-200">Copyable Embed Snippet</h5>
                        <p className="text-[9px] text-slate-400 leading-normal">Load this fully-customized chatbot directly into your website's footer.</p>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="px-2.5 py-1 bg-[#1e202d] hover:bg-[#2a2c3d] border border-[#313346] text-slate-300 hover:text-white rounded-md transition flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                      >
                        {copyCodeSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copyCodeSuccess ? 'Copied!' : 'Copy Script'}
                      </button>
                    </div>
                    <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-xl overflow-auto text-[10px] font-mono text-cyan-400 leading-relaxed scrollbar-none select-all">
                      {embedCode}
                    </pre>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed shrink-0">
                      <span className="text-white font-bold block mb-1">🔧 HOW TO DEPLOY WIDGET:</span>
                      Copy the script snippet above and place it immediately before the closing <code className="text-primary-theme">&lt;/body&gt;</code> tag of any landing page, custom-designed Website, or Funnel to run this specific chatbot configuration live.
                    </div>
                  </div>
                )}

                {activeDevSubTab === 'css' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between shrink-0">
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-200">Styling & Theme Overrides (CSS)</h5>
                        <p className="text-[9px] text-slate-400 leading-normal">Custom styling values mapped from your primary theme ({primaryColor}) and layout settings.</p>
                      </div>
                      <button
                        onClick={handleCopyCss}
                        className="px-2.5 py-1 bg-[#1e202d] hover:bg-[#2a2c3d] border border-[#313346] text-slate-300 hover:text-white rounded-md transition flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                      >
                        {copyCssSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copyCssSuccess ? 'Copied!' : 'Copy CSS'}
                      </button>
                    </div>
                    <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-xl overflow-auto text-[10px] font-mono text-pink-400 leading-relaxed scrollbar-none">
                      {customCss}
                    </pre>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed shrink-0">
                      <span className="text-white font-bold block mb-1">🎨 CUSTOM THEME ADVICE:</span>
                      Include these custom CSS styles in your website's main stylesheet to fine-tune bubble rounding, layout heights, and the theme gradients.
                    </div>
                  </div>
                )}

                {activeDevSubTab === 'html' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between shrink-0">
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-200">Widget UI Structure (HTML Template)</h5>
                        <p className="text-[9px] text-slate-400 leading-normal">The absolute raw skeleton representing the chat window, avatar, header and dynamic input field.</p>
                      </div>
                      <button
                        onClick={handleCopyHtml}
                        className="px-2.5 py-1 bg-[#1e202d] hover:bg-[#2a2c3d] border border-[#313346] text-slate-300 hover:text-white rounded-md transition flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                      >
                        {copyHtmlSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copyHtmlSuccess ? 'Copied!' : 'Copy HTML'}
                      </button>
                    </div>
                    <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-xl overflow-auto text-[10px] font-mono text-orange-300 leading-relaxed scrollbar-none">
                      {widgetHtml}
                    </pre>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed shrink-0">
                      <span className="text-white font-bold block mb-1">🗂️ TEMPLATE INTEGRATION:</span>
                      You can drop this markup straight into your static pages, or render it using template engines like React, Vue, or Handlebars.
                    </div>
                  </div>
                )}

                {activeDevSubTab === 'api' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between shrink-0">
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-200">Secure API Whitelists & Signature Keys</h5>
                        <p className="text-[9px] text-slate-400 leading-normal">Secure server-side checking logic restricting cross-origin widget execution to your domain.</p>
                      </div>
                      <button
                        onClick={handleCopyApi}
                        className="px-2.5 py-1 bg-[#1e202d] hover:bg-[#2a2c3d] border border-[#313346] text-slate-300 hover:text-white rounded-md transition flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                      >
                        {copyApiSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copyApiSuccess ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-xl overflow-auto text-[10px] font-mono text-yellow-300 leading-relaxed scrollbar-none">
                      {apiCode}
                    </pre>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed shrink-0">
                      <span className="text-white font-bold block mb-1">🔑 INTEGRITY & DOMAIN PROTECTION:</span>
                      Never expose raw secret signature keys in the client bundle. Always authenticate requests through a proxy router to protect limits.
                    </div>
                  </div>
                )}

                {activeDevSubTab === 'history' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between shrink-0">
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-200">Chat Session History & Continuity</h5>
                        <p className="text-[9px] text-slate-400 leading-normal">Seamlessly reload past conversations when the user navigates pages or refreshes the screen.</p>
                      </div>
                      <button
                        onClick={handleCopyHistory}
                        className="px-2.5 py-1 bg-[#1e202d] hover:bg-[#2a2c3d] border border-[#313346] text-slate-300 hover:text-white rounded-md transition flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                      >
                        {copyHistorySuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copyHistorySuccess ? 'Copied!' : 'Copy Code'}
                      </button>
                    </div>
                    <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-xl overflow-auto text-[10px] font-mono text-purple-300 leading-relaxed scrollbar-none">
                      {historyCode}
                    </pre>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed shrink-0">
                      <span className="text-white font-bold block mb-1">💾 PERSISTENCE & USER RETENTION:</span>
                      This snippet utilizes local client-side storage linked with the specific chatbot ID: <code className="text-amber-400">{activeBotId}</code>.
                    </div>
                  </div>
                )}

                {activeDevSubTab === 'json' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between shrink-0">
                      <div>
                        <h5 className="text-[11px] font-bold text-slate-200">JSON Package Structure</h5>
                        <p className="text-[9px] text-slate-400 leading-normal">The complete strict-format JSON configuration tree containing all metadata, models, and assets.</p>
                      </div>
                      <button
                        onClick={handleCopyJson}
                        className="px-2.5 py-1 bg-[#1e202d] hover:bg-[#2a2c3d] border border-[#313346] text-slate-300 hover:text-white rounded-md transition flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
                      >
                        {copyJsonSuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copyJsonSuccess ? 'Copied!' : 'Copy JSON'}
                      </button>
                    </div>
                    <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-xl overflow-auto text-[10px] font-mono text-amber-500/90 leading-relaxed scrollbar-none">
                      {generatedJson}
                    </pre>
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed shrink-0">
                      <span className="text-white font-bold block mb-1">⚙️ STRICT FORMAT SCHEMAS:</span>
                      This JSON file contains fully compiled details about the bot styling state, active videos, wireframe levels, and CTA urls.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
