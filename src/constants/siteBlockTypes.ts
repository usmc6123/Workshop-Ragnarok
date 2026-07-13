import { SiteBlockType, HeroBlockContent, TextBlockContent, ImageBlockContent, VideoBlockContent, CtaBlockContent, ContactFormBlockContent, TestimonialBlockContent, PricingBlockContent, FaqBlockContent, SpacerBlockContent, AiChatBotBlockContent, FunnelBlockContent } from '../types';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutTemplate, Type, Image as ImageIcon, Film, MousePointerClick, Mail,
  Quote, Tag, HelpCircle, MoveVertical, Bot, Filter,
} from 'lucide-react';

// Shared registry of the 10 block types — icon, label, and a fresh default
// content payload. Used by both the builder canvas and the block-type picker,
// so adding an 11th block type later only means adding one entry here.
export interface BlockTypeMeta {
  type: SiteBlockType;
  label: string;
  icon: LucideIcon;
  defaultContent: () => object;
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
  { type: 'hero', label: 'Hero', icon: LayoutTemplate, defaultContent: () => ({ headline: 'Your Big Headline', subheadline: 'A short supporting line goes here.', cta_text: 'Get Started', cta_link: '' } as HeroBlockContent) },
  { type: 'text', label: 'Text', icon: Type, defaultContent: () => ({ headline: '', body: 'Write something here...', align: 'left' } as TextBlockContent) },
  { type: 'image', label: 'Image Gallery', icon: ImageIcon, defaultContent: () => ({ images: [] } as ImageBlockContent) },
  { type: 'video', label: 'Video', icon: Film, defaultContent: () => ({ video_url: '', autoplay: false, controls: true } as VideoBlockContent) },
  { type: 'cta', label: 'Call To Action', icon: MousePointerClick, defaultContent: () => ({ headline: 'Ready to get started?', subheadline: '', button_text: 'Contact Us', button_link: '' } as CtaBlockContent) },
  { type: 'contact_form', label: 'Contact Form', icon: Mail, defaultContent: () => ({ headline: 'Get In Touch', subheadline: '', button_text: 'Send Message' } as ContactFormBlockContent) },
  { type: 'testimonial', label: 'Testimonial', icon: Quote, defaultContent: () => ({ quote: '', author: '', role: '' } as TestimonialBlockContent) },
  { type: 'pricing', label: 'Pricing', icon: Tag, defaultContent: () => ({ headline: 'Plans & Pricing', tiers: [{ name: 'Basic', price: '$0', features: [] }] } as PricingBlockContent) },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, defaultContent: () => ({ headline: 'Frequently Asked Questions', items: [] } as FaqBlockContent) },
  { type: 'spacer', label: 'Spacer', icon: MoveVertical, defaultContent: () => ({ size: 'md' } as SpacerBlockContent) },
  { type: 'ai_chat_bot', label: 'AI Chat Bot', icon: Bot, defaultContent: () => ({ headline: 'Chat with our AI Assistant', subheadline: 'Ask us anything or book your appointment right here!', bot_id: 'cooper-patrol-cat' } as AiChatBotBlockContent) },
  { type: 'funnel', label: 'Lead Funnel', icon: Filter, defaultContent: () => ({ headline: 'Exclusive Service Offer', subheadline: 'Submit details below to lock in custom discounts and instant quotes.' } as FunnelBlockContent) },
];

export function blockMeta(type: SiteBlockType): BlockTypeMeta {
  return BLOCK_TYPES.find(b => b.type === type) || BLOCK_TYPES[0];
}

// One-line preview summary shown on a block's card, so the owner can tell
// blocks apart at a glance without opening each one.
export function blockSummary(blockType: SiteBlockType, content: any): string {
  switch (blockType) {
    case 'hero': return content.headline || 'Untitled hero';
    case 'text': return content.headline || (content.body ? content.body.slice(0, 60) : 'Empty text block');
    case 'image': return `${(content.images || []).length} image(s)`;
    case 'video': return content.video_url ? content.video_url : 'No video set';
    case 'cta': return content.headline || 'Untitled CTA';
    case 'contact_form': return content.headline || 'Contact form';
    case 'testimonial': return content.author ? `Quote from ${content.author}` : 'Untitled testimonial';
    case 'pricing': return `${(content.tiers || []).length} plan(s)`;
    case 'faq': return `${(content.items || []).length} question(s)`;
    case 'spacer': return `Size: ${content.size || 'md'}`;
    case 'ai_chat_bot': return content.bot_id ? `AI Bot: ${content.bot_id}` : 'AI Bot';
    case 'funnel': return content.funnel_id ? `Funnel ID: ${content.funnel_id}` : 'Lead Funnel';
    default: return '';
  }
}
