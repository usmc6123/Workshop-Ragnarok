import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight, ArrowLeft, ArrowUpRight, ChevronRight, Check, CheckCircle2,
  Star, Heart, ThumbsUp, Zap, Sparkles, Award, Shield, ShieldCheck,
  Phone, Mail, MapPin, Calendar, Clock, MessageCircle,
  ShoppingCart, CreditCard, Tag, Gift, Download, Upload, ExternalLink,
  Play, Send, Rocket, Flame, Bell, Bookmark, Home, User, Users,
} from 'lucide-react';

// A curated, fixed set of icons a site owner can attach to buttons/headlines —
// deliberately a name -> component map (not "type any Lucide name") so the
// picker's choices and the rendered result are always guaranteed to match.
export const SITE_ICONS: Record<string, LucideIcon> = {
  ArrowRight, ArrowLeft, ArrowUpRight, ChevronRight, Check, CheckCircle2,
  Star, Heart, ThumbsUp, Zap, Sparkles, Award, Shield, ShieldCheck,
  Phone, Mail, MapPin, Calendar, Clock, MessageCircle,
  ShoppingCart, CreditCard, Tag, Gift, Download, Upload, ExternalLink,
  Play, Send, Rocket, Flame, Bell, Bookmark, Home, User, Users,
};

export const SITE_ICON_NAMES = Object.keys(SITE_ICONS);

export function getSiteIcon(name?: string): LucideIcon | null {
  if (!name) return null;
  return SITE_ICONS[name] || null;
}
