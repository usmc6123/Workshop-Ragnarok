import { SiteBlockType } from '../types';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase, Wrench, Rocket, UserRound, UtensilsCrossed, Hourglass,
  Car, Building2, Dumbbell, Camera, HeartHandshake, PartyPopper,
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
  {
    id: 'auto-repair-shop',
    name: 'Auto Repair Shop',
    description: 'A dedicated garage layout — services, pricing, and easy booking.',
    icon: Car,
    blocks: [
      { block_type: 'hero', content: { headline: 'Trusted Auto Repair, Done Right', subheadline: 'ASE-certified mechanics · Honest, upfront pricing · Most repairs done same-day.', cta_text: 'Book a Service', cta_link: '#contact' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'text', content: { headline: 'Why Drivers Trust Us', body: 'We\'ve been keeping this town on the road for years. No upsells, no surprise charges — just honest work explained in plain language before we ever touch your car.' }, grid_col: 0, grid_col_span: 7, grid_row: 20, grid_row_span: 12 },
      { block_type: 'testimonial', content: { quote: 'Fast, fair, and they actually explained what was wrong instead of just handing me a bill.', author: 'Local Customer', role: 'Repeat Customer' }, grid_col: 7, grid_col_span: 5, grid_row: 20, grid_row_span: 12 },
      { block_type: 'pricing', content: { headline: 'Popular Services', tiers: [
        { name: 'Oil Change', price: '$49', features: ['Up to 5 qts synthetic blend', 'Multi-point inspection'] },
        { name: 'Brake Service', price: '$189', features: ['Pads + rotor inspection', 'Free brake fluid check', 'Lifetime pad warranty'], highlighted: true },
        { name: 'Full Inspection', price: '$79', features: ['Bumper-to-bumper checklist', 'Printed report'] },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 32, grid_row_span: 16 },
      { block_type: 'image', content: { images: [{ url: '', caption: 'The Shop Floor' }, { url: '', caption: 'Our Team' }] }, grid_col: 0, grid_col_span: 7, grid_row: 48, grid_row_span: 14 },
      { block_type: 'text', content: { headline: 'Hours & Location', body: 'Mon–Fri: 8am–6pm\nSat: 9am–3pm\nClosed Sundays\n\n123 Main Street, Your City' }, grid_col: 7, grid_col_span: 5, grid_row: 48, grid_row_span: 14 },
      { block_type: 'contact_form', content: { headline: 'Schedule Service', subheadline: 'Tell us what\'s going on with your vehicle and we\'ll get you booked in.', button_text: 'Request Appointment' }, grid_col: 0, grid_col_span: 12, grid_row: 62, grid_row_span: 18 },
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate Listing',
    description: 'A single-property showcase — photos, details, and a tour request.',
    icon: Building2,
    blocks: [
      { block_type: 'hero', content: { headline: '123 Maple Street', subheadline: '4 bed · 3 bath · 2,400 sqft — offered at $549,000', cta_text: 'Schedule a Tour', cta_link: '#contact' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 18 },
      { block_type: 'image', content: { images: [{ url: '', caption: 'Front Exterior' }, { url: '', caption: 'Kitchen' }, { url: '', caption: 'Backyard' }] }, grid_col: 0, grid_col_span: 12, grid_row: 18, grid_row_span: 16 },
      { block_type: 'text', content: { headline: 'About This Home', body: 'A bright, freshly updated home on a quiet tree-lined street. Open-concept living, a chef\'s kitchen, and a fully fenced backyard perfect for entertaining.' }, grid_col: 0, grid_col_span: 6, grid_row: 34, grid_row_span: 12 },
      { block_type: 'text', content: { headline: 'Neighborhood', body: 'Walking distance to schools, parks, and downtown shops. Quick access to the highway makes commuting easy in any direction.' }, grid_col: 6, grid_col_span: 6, grid_row: 34, grid_row_span: 12 },
      { block_type: 'faq', content: { headline: 'Property Details', items: [
        { question: 'Year built?', answer: 'Replace with the actual build year.' },
        { question: 'Lot size?', answer: 'Replace with the actual lot size.' },
        { question: 'HOA fees?', answer: 'Replace with actual HOA info, or remove if none.' },
      ] }, grid_col: 0, grid_col_span: 7, grid_row: 46, grid_row_span: 16 },
      { block_type: 'contact_form', content: { headline: 'Request a Showing', subheadline: 'We\'ll follow up to find a time that works for you.', button_text: 'Request Showing' }, grid_col: 7, grid_col_span: 5, grid_row: 46, grid_row_span: 20 },
    ],
  },
  {
    id: 'fitness-gym',
    name: 'Fitness / Gym',
    description: 'Memberships, classes, and a clear path to signing up.',
    icon: Dumbbell,
    blocks: [
      { block_type: 'hero', content: { headline: 'Train Like You Mean It', subheadline: 'Personal training, group classes, and 24/7 open gym access — all on one membership.', cta_text: 'Start Free Trial', cta_link: '#pricing' }, style: { align: 'center', font_size: 'lg' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'text', content: { headline: 'What We Offer', body: 'Strength training, HIIT, yoga, and everything in between — led by certified coaches who actually care about your progress, not just clocking you in.' }, grid_col: 0, grid_col_span: 12, grid_row: 20, grid_row_span: 10 },
      { block_type: 'pricing', content: { headline: 'Membership Plans', tiers: [
        { name: 'Drop-In', price: '$15/visit', features: ['Full gym access', 'No commitment'] },
        { name: 'Monthly', price: '$59/mo', features: ['Unlimited classes', '24/7 access', 'Free guest pass monthly'], highlighted: true },
        { name: 'Annual', price: '$499/yr', features: ['Everything in Monthly', '2 months free', 'Free consult'] },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 30, grid_row_span: 16 },
      { block_type: 'testimonial', content: { quote: 'I\'ve tried a dozen gyms. This is the first one I actually look forward to going to.', author: 'Member Since 2023', role: 'Regular' }, grid_col: 0, grid_col_span: 6, grid_row: 46, grid_row_span: 12 },
      { block_type: 'image', content: { images: [{ url: '', caption: 'The Floor' }] }, grid_col: 6, grid_col_span: 6, grid_row: 46, grid_row_span: 12 },
      { block_type: 'contact_form', content: { headline: 'Join Today', subheadline: 'First class is on us — tell us a bit about your goals.', button_text: 'Claim Free Trial' }, grid_col: 0, grid_col_span: 12, grid_row: 58, grid_row_span: 18 },
    ],
  },
  {
    id: 'photography-studio',
    name: 'Photography Studio',
    description: 'Portfolio-forward layout for booking portrait or event shoots.',
    icon: Camera,
    blocks: [
      { block_type: 'hero', content: { headline: 'Moments, Captured Beautifully', subheadline: 'Portrait, event, and commercial photography based in [Your City].', cta_text: 'View Portfolio', cta_link: '#gallery' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 18 },
      { block_type: 'image', content: { images: [{ url: '', caption: '' }, { url: '', caption: '' }, { url: '', caption: '' }] }, grid_col: 0, grid_col_span: 12, grid_row: 18, grid_row_span: 16 },
      { block_type: 'text', content: { headline: 'About the Studio', body: 'A few sentences on your style, your background, and what clients can expect working with you — natural light, candid moments, whatever makes your work distinct.' }, grid_col: 0, grid_col_span: 7, grid_row: 34, grid_row_span: 12 },
      { block_type: 'testimonial', content: { quote: 'Hands down the best photos we\'ve ever had taken. Made us feel completely comfortable the whole time.', author: 'Recent Client', role: 'Portrait Session' }, grid_col: 7, grid_col_span: 5, grid_row: 34, grid_row_span: 12 },
      { block_type: 'pricing', content: { headline: 'Session Packages', tiers: [
        { name: 'Mini', price: '$150', features: ['30 min session', '10 edited photos'] },
        { name: 'Standard', price: '$350', features: ['90 min session', '40 edited photos', 'Online gallery'], highlighted: true },
        { name: 'Premium', price: '$650', features: ['Half-day session', 'All edited photos', 'Print release'] },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 46, grid_row_span: 16 },
      { block_type: 'contact_form', content: { headline: 'Book a Session', subheadline: 'Tell us about the shoot you have in mind.', button_text: 'Check Availability' }, grid_col: 0, grid_col_span: 12, grid_row: 62, grid_row_span: 18 },
    ],
  },
  {
    id: 'nonprofit-fundraiser',
    name: 'Nonprofit / Fundraiser',
    description: 'Mission-first page built to explain the cause and drive donations.',
    icon: HeartHandshake,
    blocks: [
      { block_type: 'hero', content: { headline: 'Help Us [Mission Statement]', subheadline: 'Every donation goes directly toward the cause — thank you for being part of it.', cta_text: 'Donate Now', cta_link: '#donate' }, style: { align: 'center' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'text', content: { headline: 'Our Mission', body: 'Explain who you serve, why it matters, and the difference donations make in plain, honest terms — this is the paragraph that turns a visitor into a donor.' }, grid_col: 0, grid_col_span: 12, grid_row: 20, grid_row_span: 10 },
      { block_type: 'image', content: { images: [{ url: '', caption: 'Our Work' }, { url: '', caption: 'The Community' }] }, grid_col: 0, grid_col_span: 12, grid_row: 30, grid_row_span: 14 },
      { block_type: 'testimonial', content: { quote: 'This organization changed my life when I needed it most. What they do matters.', author: 'Someone You\'ve Helped', role: 'Program Participant' }, grid_col: 0, grid_col_span: 6, grid_row: 44, grid_row_span: 12 },
      { block_type: 'text', content: { headline: 'How Funds Are Used', body: '70% direct program support\n20% community outreach\n10% operations\n\nReplace with your actual breakdown.' }, grid_col: 6, grid_col_span: 6, grid_row: 44, grid_row_span: 12 },
      { block_type: 'cta', content: { headline: 'Ready to make a difference?', subheadline: 'Every dollar helps.', button_text: 'Donate Now', button_link: '#donate' }, grid_col: 0, grid_col_span: 12, grid_row: 56, grid_row_span: 10 },
      { block_type: 'contact_form', content: { headline: 'Volunteer With Us', subheadline: 'Prefer to give your time instead? Let us know.', button_text: 'Sign Up to Volunteer' }, grid_col: 0, grid_col_span: 12, grid_row: 66, grid_row_span: 16 },
    ],
  },
  {
    id: 'event-wedding',
    name: 'Event / Wedding',
    description: 'A celebration page with the details and an easy way to RSVP.',
    icon: PartyPopper,
    blocks: [
      { block_type: 'hero', content: { headline: 'Sarah & James Are Getting Married', subheadline: 'Join us in celebrating our special day — Saturday, June 14, 2026.', cta_text: 'RSVP Now', cta_link: '#rsvp' }, style: { align: 'center', font_size: 'xl' }, grid_col: 0, grid_col_span: 12, grid_row: 0, grid_row_span: 20 },
      { block_type: 'text', content: { headline: 'Our Story', body: 'A short, sweet paragraph about how you met and the road that led here — this is the page guests actually read closely before the big day.' }, grid_col: 0, grid_col_span: 12, grid_row: 20, grid_row_span: 10 },
      { block_type: 'image', content: { images: [{ url: '', caption: '' }, { url: '', caption: '' }, { url: '', caption: '' }] }, grid_col: 0, grid_col_span: 12, grid_row: 30, grid_row_span: 14 },
      { block_type: 'text', content: { headline: 'The Details', body: 'Ceremony: 4:00pm at [Venue Name]\nReception: 6:00pm to follow\n\n123 Celebration Ave, Your City' }, grid_col: 0, grid_col_span: 6, grid_row: 44, grid_row_span: 12 },
      { block_type: 'text', content: { headline: 'Registry', body: 'Your presence is the only gift we need — but if you\'d like, we\'re registered at [Registry Name].' }, grid_col: 6, grid_col_span: 6, grid_row: 44, grid_row_span: 12 },
      { block_type: 'faq', content: { headline: 'Travel & Accommodations', items: [
        { question: 'Is there a hotel block?', answer: 'Replace with your reserved hotel block and discount code.' },
        { question: 'Is parking available?', answer: 'Replace with venue parking details.' },
      ] }, grid_col: 0, grid_col_span: 12, grid_row: 56, grid_row_span: 12 },
      { block_type: 'contact_form', content: { headline: 'RSVP', subheadline: 'Please respond by [Date] so we can finalize the headcount.', button_text: 'Send RSVP' }, grid_col: 0, grid_col_span: 12, grid_row: 68, grid_row_span: 18 },
    ],
  },
];
