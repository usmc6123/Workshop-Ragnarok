import { SiteBlockType } from '../types';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase, Wrench, Rocket, UserRound, UtensilsCrossed, Hourglass,
} from 'lucide-react';

export interface SiteTemplateBlock {
  block_type: SiteBlockType;
  content: object;
  style?: object;
  // Position on the 12-column grid, in row units of 20px. Templates deliberately
  // use multi-column rows (two blocks sharing a row, etc.) so picking one actually
  // demonstrates the grid layout system rather than just stacking everything
  // full-width — that's also what the mini thumbnail preview renders from.
  grid_col: number;
  grid_col_span: number;
  grid_row: number;
  grid_row_span: number;
}

export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  blocks: SiteTemplateBlock[];
}

// A curated, sensible starting point for the most common reasons someone would
// spin up a one-off site with this builder. Each one is a real, usable page
// with placeholder copy the owner swaps out — not just an empty shell of
// blocks — and each lays blocks out across the 12-column grid, including
// multi-column rows, so applying one shows off real layout variety instead of
// a plain vertical stack every time.
export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'For freelancers, artists, and creatives showing off work.',
    icon: Briefcase,
    blocks: [
      { block_type: 'hero', content: { headline: 'Hi, I\'m [Your Name]', subheadline: 'I design and build things people love to use.', cta_text: 'View My Work', cta_link: '#gallery' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'text', content: { headline: 'About Me', body: 'Write a couple of sentences about who you are, what you do, and what makes your work different. Keep it short — this is the part people actually read.' }, grid_col: 0, grid_col_span: 7, grid_row: 20, grid_row_span: 12 },
      { block_type: 'testimonial', content: { quote: 'Working with them was the best decision we made all year.', author: 'A Happy Client', role: 'Company Name' }, grid_col: 7, grid_col_span: 5, grid_row: 20, grid_row_span: 12 },
      { block_type: 'image', content: { images: [{ url: '', caption: 'Project One' }, { url: '', caption: 'Project Two' }, { url: '', caption: 'Project Three' }] }, grid_col: 0, grid_col_span: 12, grid_row: 32, grid_row_span: 14 },
      { block_type: 'cta', content: { headline: 'Have a project in mind?', subheadline: 'I\'d love to hear about it.', button_text: 'Get In Touch', button_link: '#contact' }, grid_col: 0, grid_col_span: 12, grid_row: 46, grid_row_span: 10 },
      { block_type: 'contact_form', content: { headline: 'Contact', subheadline: 'Tell me a bit about what you\'re looking for.', button_text: 'Send Message' }, grid_col: 0, grid_col_span: 12, grid_row: 56, grid_row_span: 18 },
    ],
  },
  {
    id: 'local-service',
    name: 'Local Service Business',
    description: 'Shops, contractors, salons — anyone booking local customers.',
    icon: Wrench,
    blocks: [
      { block_type: 'hero', content: { headline: 'Your Business Name', subheadline: 'What you do, in one clear sentence — and why it matters to your customers.', cta_text: 'Book Now', cta_link: '#contact' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'text', content: { headline: 'What We Do', body: 'Describe your services in plain language. What problem do you solve? Why should someone choose you over the shop down the street?' }, grid_col: 0, grid_col_span: 12, grid_row: 20, grid_row_span: 10 },
      { block_type: 'pricing', content: { headline: 'Services & Pricing', tiers: [
        { name: 'Basic Service', price: '$49', features: ['Feature or inclusion one', 'Feature or inclusion two'] },
        { name: 'Standard Service', price: '$99', features: ['Everything in Basic', 'Additional feature', 'Additional feature'], highlighted: true },
        { name: 'Premium Service', price: '$149', features: ['Everything in Standard', 'Priority scheduling', 'Extended warranty'] },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 30, grid_row_span: 16 },
      { block_type: 'faq', content: { headline: 'Frequently Asked Questions', items: [
        { question: 'How do I book an appointment?', answer: 'Fill out the contact form below or give us a call — we\'ll get back to you within one business day.' },
        { question: 'What areas do you serve?', answer: 'Replace this with your actual service area.' },
      ] }, grid_col: 0, grid_col_span: 7, grid_row: 46, grid_row_span: 14 },
      { block_type: 'contact_form', content: { headline: 'Get a Free Quote', subheadline: 'Tell us what you need and we\'ll get back to you fast.', button_text: 'Request Quote' }, grid_col: 7, grid_col_span: 5, grid_row: 46, grid_row_span: 18 },
    ],
  },
  {
    id: 'product-launch',
    name: 'Product / App Landing Page',
    description: 'Launching a product, app, or SaaS — built to convert visitors.',
    icon: Rocket,
    blocks: [
      { block_type: 'hero', content: { headline: 'The [Product Name] Everyone\'s Talking About', subheadline: 'One clear sentence on what it does and who it\'s for.', cta_text: 'Get Started Free', cta_link: '#pricing' }, style: { align: 'center', font_size: 'lg' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'text', content: { headline: 'Why It Works', body: 'Explain the core value prop. What changes for the customer once they start using this? Focus on the outcome, not the feature list.' }, grid_col: 0, grid_col_span: 6, grid_row: 20, grid_row_span: 12 },
      { block_type: 'testimonial', content: { quote: 'This completely changed how our team works. We can\'t imagine going back.', author: 'Early Customer', role: 'Job Title, Company' }, grid_col: 6, grid_col_span: 6, grid_row: 20, grid_row_span: 12 },
      { block_type: 'pricing', content: { headline: 'Simple Pricing', tiers: [
        { name: 'Free', price: '$0', features: ['Core features', 'Community support'] },
        { name: 'Pro', price: '$19/mo', features: ['Everything in Free', 'Advanced features', 'Priority support'], highlighted: true },
        { name: 'Team', price: '$49/mo', features: ['Everything in Pro', 'Multiple seats', 'Admin controls'] },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 32, grid_row_span: 16 },
      { block_type: 'faq', content: { headline: 'Questions? Answered.', items: [
        { question: 'Is there a free trial?', answer: 'Yes — the Free plan never expires, and Pro comes with a 14-day trial.' },
        { question: 'Can I cancel anytime?', answer: 'Absolutely, no long-term contracts.' },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 48, grid_row_span: 14 },
      { block_type: 'cta', content: { headline: 'Ready to try it?', button_text: 'Get Started Free', button_link: '#' }, grid_col: 0, grid_col_span: 12, grid_row: 62, grid_row_span: 10 },
    ],
  },
  {
    id: 'about-me',
    name: 'Personal / About Me',
    description: 'A simple personal page — bio, links, and a way to reach you.',
    icon: UserRound,
    blocks: [
      { block_type: 'hero', content: { headline: 'Hey, I\'m [Your Name] 👋', subheadline: 'A one-line intro that sums up who you are.' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 18 },
      { block_type: 'image', content: { images: [{ url: '', caption: '' }] }, grid_col: 0, grid_col_span: 4, grid_row: 18, grid_row_span: 14 },
      { block_type: 'text', content: { headline: 'A Bit About Me', body: 'Share your story, what you\'re working on, or what you care about. This page works well kept short and conversational.' }, grid_col: 4, grid_col_span: 8, grid_row: 18, grid_row_span: 14 },
      { block_type: 'contact_form', content: { headline: 'Say Hello', subheadline: 'Reach out any time.', button_text: 'Send' }, grid_col: 0, grid_col_span: 12, grid_row: 32, grid_row_span: 18 },
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurant / Menu',
    description: 'Cafés, restaurants, food trucks — hours, menu, and location.',
    icon: UtensilsCrossed,
    blocks: [
      { block_type: 'hero', content: { headline: 'Restaurant Name', subheadline: 'Cuisine type · Neighborhood · Est. Year', cta_text: 'View Menu', cta_link: '#menu' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 18 },
      { block_type: 'text', content: { headline: 'Our Story', body: 'A short paragraph about your food, your kitchen, and what makes the place worth visiting.' }, grid_col: 0, grid_col_span: 12, grid_row: 18, grid_row_span: 9 },
      { block_type: 'pricing', content: { headline: 'Menu Highlights', tiers: [
        { name: 'Starters', price: 'from $8', features: ['Signature dish one', 'Signature dish two'] },
        { name: 'Mains', price: 'from $18', features: ['Signature dish one', 'Signature dish two', 'Signature dish three'], highlighted: true },
        { name: 'Desserts', price: 'from $6', features: ['Signature dish one', 'Signature dish two'] },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 27, grid_row_span: 16 },
      { block_type: 'image', content: { images: [{ url: '', caption: 'The Dining Room' }, { url: '', caption: 'Chef\'s Special' }] }, grid_col: 0, grid_col_span: 7, grid_row: 43, grid_row_span: 14 },
      { block_type: 'text', content: { headline: 'Hours & Location', body: 'Mon–Fri: 11am–9pm\nSat–Sun: 10am–10pm\n\n123 Main Street, Your City' }, grid_col: 7, grid_col_span: 5, grid_row: 43, grid_row_span: 14 },
      { block_type: 'contact_form', content: { headline: 'Make a Reservation', button_text: 'Request Reservation' }, grid_col: 0, grid_col_span: 12, grid_row: 57, grid_row_span: 16 },
    ],
  },
  {
    id: 'coming-soon',
    name: 'Coming Soon',
    description: 'A minimal pre-launch teaser page to collect early interest.',
    icon: Hourglass,
    blocks: [
      { block_type: 'hero', content: { headline: 'Something New Is Coming', subheadline: 'We\'re putting the finishing touches on it — leave your email and we\'ll let you know the moment it\'s live.' }, style: { align: 'center', font_size: 'xl' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'contact_form', content: { headline: 'Get Notified', subheadline: 'No spam, just one email when we launch.', button_text: 'Notify Me' }, grid_col: 2, grid_col_span: 8, grid_row: 20, grid_row_span: 16 },
    ],
  },
];
