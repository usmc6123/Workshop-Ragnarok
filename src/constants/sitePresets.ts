// Curated, ready-to-apply theme presets for the Sites builder's "Site Theme" tab.
// Each preset bundles a color pair + a font pairing that's been picked to look
// good together — the alternative (raw color pickers + font dropdowns with no
// example) made it hard to tell what a combination would actually look like
// before saving. `ThemePresetCard` in SiteBuilderView.tsx renders each one as a
// small live mockup using these exact values, so the thumbnail IS the preview.
import { SITE_FONT_OPTIONS } from './siteFonts';

function fontValue(label: string): string {
  return SITE_FONT_OPTIONS.find(f => f.label === label)?.value || SITE_FONT_OPTIONS[0].value;
}

export interface SiteThemePreset {
  id: string;
  name: string;
  description: string;
  accent_color: string;
  secondary_color: string;
  heading_font: string; // CSS font-family value, matches a SITE_FONT_OPTIONS entry
  body_font: string;
}

export const SITE_THEME_PRESETS: SiteThemePreset[] = [
  {
    id: 'amber-workshop',
    name: 'Amber Workshop',
    description: 'Bold garage energy — the app default.',
    accent_color: '#f59e0b',
    secondary_color: '#334155',
    heading_font: fontValue('Bebas Neue'),
    body_font: fontValue('Inter'),
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Clean and trustworthy, built for service pages.',
    accent_color: '#3b82f6',
    secondary_color: '#1e293b',
    heading_font: fontValue('Space Grotesk'),
    body_font: fontValue('Inter'),
  },
  {
    id: 'crimson-racer',
    name: 'Crimson Racer',
    description: 'High-contrast motorsport red.',
    accent_color: '#ef4444',
    secondary_color: '#18181b',
    heading_font: fontValue('Oswald'),
    body_font: fontValue('Roboto'),
  },
  {
    id: 'emerald-garage',
    name: 'Emerald Garage',
    description: 'Fresh green with a modern edge.',
    accent_color: '#10b981',
    secondary_color: '#064e3b',
    heading_font: fontValue('Space Grotesk'),
    body_font: fontValue('Work Sans'),
  },
  {
    id: 'violet-neon',
    name: 'Violet Neon',
    description: 'Playful, tech-forward purple.',
    accent_color: '#a855f7',
    secondary_color: '#1e1b4b',
    heading_font: fontValue('Poppins'),
    body_font: fontValue('DM Sans'),
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Warm and welcoming, great for family shops.',
    accent_color: '#fb923c',
    secondary_color: '#7c2d12',
    heading_font: fontValue('Montserrat'),
    body_font: fontValue('Nunito'),
  },
  {
    id: 'racing-yellow',
    name: 'Racing Yellow',
    description: 'Loud and confident, built to grab attention.',
    accent_color: '#facc15',
    secondary_color: '#18181b',
    heading_font: fontValue('Bebas Neue'),
    body_font: fontValue('Roboto'),
  },
  {
    id: 'classic-editorial',
    name: 'Classic Editorial',
    description: 'Serif headings for an established, premium feel.',
    accent_color: '#0ea5e9',
    secondary_color: '#64748b',
    heading_font: fontValue('Playfair Display'),
    body_font: fontValue('Merriweather'),
  },
  {
    id: 'slate-minimal',
    name: 'Slate Minimal',
    description: 'Understated monochrome, lets photos do the talking.',
    accent_color: '#94a3b8',
    secondary_color: '#334155',
    heading_font: fontValue('Inter'),
    body_font: fontValue('Inter'),
  },
  {
    id: 'pastel-soft',
    name: 'Pastel Soft',
    description: 'Rounded and friendly, softer than the rest.',
    accent_color: '#f472b6',
    secondary_color: '#a78bfa',
    heading_font: fontValue('Quicksand'),
    body_font: fontValue('Nunito'),
  },
  {
    id: 'forest-trail',
    name: 'Forest Trail',
    description: 'Earthy green-and-lime, outdoorsy feel.',
    accent_color: '#84cc16',
    secondary_color: '#365314',
    heading_font: fontValue('Raleway'),
    body_font: fontValue('Lato'),
  },
  {
    id: 'midnight-steel',
    name: 'Midnight Steel',
    description: 'Cool blue-gray, industrial and precise.',
    accent_color: '#38bdf8',
    secondary_color: '#0f172a',
    heading_font: fontValue('Oswald'),
    body_font: fontValue('Work Sans'),
  },
];
