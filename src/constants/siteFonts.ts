// Curated font list shared between the Sites builder (SitesView, SiteBuilderView)
// and the public renderer (SitePageView). Keeping this one small list everywhere
// means the builder's font dropdown and the actual Google Fonts <link> injected on
// the public page never drift out of sync with each other.
//
// "System Default" isn't a Google Font — it resolves to each device's native UI
// font stack, which is faster and often looks better for body text than forcing
// a web font everywhere.
export interface SiteFontOption {
  label: string;
  value: string; // CSS font-family value
  googleFont: string | null; // Google Fonts family name to request, or null for system fonts
  category: 'sans' | 'serif' | 'display' | 'system';
}

export const SITE_FONT_OPTIONS: SiteFontOption[] = [
  { label: 'System Default', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', googleFont: null, category: 'system' },
  { label: 'Inter', value: '"Inter", sans-serif', googleFont: 'Inter', category: 'sans' },
  { label: 'Roboto', value: '"Roboto", sans-serif', googleFont: 'Roboto', category: 'sans' },
  { label: 'Lato', value: '"Lato", sans-serif', googleFont: 'Lato', category: 'sans' },
  { label: 'Nunito', value: '"Nunito", sans-serif', googleFont: 'Nunito', category: 'sans' },
  { label: 'Work Sans', value: '"Work Sans", sans-serif', googleFont: 'Work Sans', category: 'sans' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif', googleFont: 'DM Sans', category: 'sans' },
  { label: 'Poppins', value: '"Poppins", sans-serif', googleFont: 'Poppins', category: 'sans' },
  { label: 'Montserrat', value: '"Montserrat", sans-serif', googleFont: 'Montserrat', category: 'sans' },
  { label: 'Raleway', value: '"Raleway", sans-serif', googleFont: 'Raleway', category: 'sans' },
  { label: 'Quicksand', value: '"Quicksand", sans-serif', googleFont: 'Quicksand', category: 'sans' },
  { label: 'Space Grotesk', value: '"Space Grotesk", sans-serif', googleFont: 'Space Grotesk', category: 'display' },
  { label: 'Oswald', value: '"Oswald", sans-serif', googleFont: 'Oswald', category: 'display' },
  { label: 'Bebas Neue', value: '"Bebas Neue", sans-serif', googleFont: 'Bebas Neue', category: 'display' },
  { label: 'Playfair Display', value: '"Playfair Display", serif', googleFont: 'Playfair Display', category: 'serif' },
  { label: 'Merriweather', value: '"Merriweather", serif', googleFont: 'Merriweather', category: 'serif' },
  { label: 'Source Serif 4', value: '"Source Serif 4", serif', googleFont: 'Source Serif 4', category: 'serif' },
];

export function findFontOption(value: string | undefined): SiteFontOption {
  return SITE_FONT_OPTIONS.find(f => f.value === value) || SITE_FONT_OPTIONS[0];
}

// Builds (or updates) a single <link> tag pulling exactly the Google Font
// families actually in use on the page — called with the site's default font
// plus every per-block font override so nothing renders with a FOUC-y fallback.
export function ensureGoogleFontsLoaded(fontValues: (string | undefined)[]) {
  const families = Array.from(new Set(
    fontValues
      .map(v => findFontOption(v).googleFont)
      .filter((f): f is string => !!f)
  ));
  if (families.length === 0) return;

  const linkId = 'ragnarok-sites-google-fonts';
  const href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`).join('&')}&display=swap`;

  let link = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) {
    link.href = href;
  }
}
