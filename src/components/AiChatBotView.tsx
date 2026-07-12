import React, { useState, useEffect, useRef } from 'react';
import { Bot, Copy, Check, Play, RotateCcw, Sparkles, Send, CheckCircle, Smartphone, Code, FileText, Layout } from 'lucide-react';

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
}

interface ChatBotConfig {
  id: string;
  business_description: string;
  main_role: string;
  uploaded_docs: string;
  character_theme: 'professional' | 'mascot_cat' | 'minimalist_tech';
  primary_cta: string;
  bot_profile: BotProfile;
  ui_configuration: UiConfiguration;
  embed_code_snippet: string;
}

const PREMADE_BOTS: ChatBotConfig[] = [
  {
    id: 'cooper-patrol',
    business_description: 'Ragnarök Auto Workshop - Special custom builds, Corvettes, and performance tuning.',
    main_role: 'Lead-generation and booking scout specializing in performance upgrades.',
    uploaded_docs: `SERVICES & PRICING:
- Spark Plug Tune-up: $90 (Complete LS/LT swap)
- ATF Transmission Flush & Filter: $110
- Suspension Rebuild: $180 (Full alignment check)
LOCATION & HOURS:
- 123 Resistance Way, Pasadena, CA. Open Mon-Sat 8AM - 6PM.
- Contact: usmc6123@gmail.com | 555-0199
BOOKING LINK: https://ragnarok.work/book`,
    character_theme: 'mascot_cat',
    primary_cta: 'https://ragnarok.work/book',
    bot_profile: {
      name: 'Cooper - Laser Patrol Rep',
      avatar_url: 'https://raw.githubusercontent.com/usmc6123/images/main/cooper-logo.png',
      system_instruction: 'You are Cooper, the Laser Patrol Sales Mascot for Ragnarök Auto Workshop. Your tone is witty, super high energy, and emoji-friendly with playful cat quirks. Combine these facts: Rebuilds start at $180, spark plugs are $90, ATF is $110. Your main goal is to capture contact info or send users to booking: https://ragnarok.work/book. NEVER mention you are an AI. Keep answers strictly under 3 sentences.'
    },
    ui_configuration: {
      layout_style: 'floating_bubble',
      primary_color: '#f97316',
      secondary_color: '#eab308',
      font_family: 'monospace',
      welcome_message: 'Meow! 🐾 Cooper here on high-alert laser patrol! Ready to vaporize your service issues with top-tier mechanics? Let\'s chat! ⚡'
    },
    embed_code_snippet: '<!-- Embed Script Code Placeholder -->'
  },
  {
    id: 'sarah-advisor',
    business_description: 'Ragnarök Auto Workshop - Reliable family car service, diagnostics, and general maintenance.',
    main_role: 'Professional Service Coordinator & appointment scheduler.',
    uploaded_docs: `Standard Diagnostics: $49 (Waived with repair)
Brake Pads Swap: $149 per axle
Oil Change & Filters: $59.99
Shop Policy: All work has a 12-month warranty. Same-day appointments available.`,
    character_theme: 'professional',
    primary_cta: 'https://ragnarok.work/book',
    bot_profile: {
      name: 'Sarah - Service Advisor',
      avatar_url: 'https://raw.githubusercontent.com/usmc6123/images/main/roscoe-logo.png',
      system_instruction: 'You are Sarah, the Professional Service Advisor at Ragnarök Auto Workshop. Your tone is corporate, direct, polite, and helpful. Diagnostics is $49, brake pads are $149, oil change is $59.99. Proactively assist the customer and request their contact details to finalize scheduling at https://ragnarok.work/book. NEVER mention you are an AI. Limit responses to 2 sentences.'
    },
    ui_configuration: {
      layout_style: 'side_panel',
      primary_color: '#1e3a8a',
      secondary_color: '#475569',
      font_family: 'sans-serif',
      welcome_message: 'Hello! Thank you for visiting Ragnarök Auto. How can I assist you with scheduling your service or pricing inquiries today?'
    },
    embed_code_snippet: '<!-- Embed Script Code Placeholder -->'
  },
  {
    id: 'ragnarok-tech',
    business_description: 'Cyberdyne Diagnostic Hub - Autonomous vehicle scanning and performance analysis.',
    main_role: 'AI Diagnostic Assistant for instant telemetry queries and technical appointments.',
    uploaded_docs: `AUTONOMOUS INTELLIGENCE MEMORY:
- ECU Code Scans: Free.
- Advanced Tuning & Mapping: $250.
- Database Version: Ragnarök CRM-v1.2.0.`,
    character_theme: 'minimalist_tech',
    primary_cta: 'https://ragnarok.work/book',
    bot_profile: {
      name: 'RAGNARÖK-v1',
      avatar_url: 'https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg',
      system_instruction: 'You are RAGNARÖK-v1, an autonomous tech advisor. Use extremely short, highly precise, system-like vocabulary. ECU scans are free, advanced mapping is $250. Direct inquiries to system log booking at https://ragnarok.work/book. NEVER mention you are an AI. Answers must be 1 to 2 sentences max.'
    },
    ui_configuration: {
      layout_style: 'inline_card',
      primary_color: '#14b8a6',
      secondary_color: '#1e293b',
      font_family: 'sans-serif',
      welcome_message: 'System initialized. State: Active. Ready to process your diagnostic request or booking coordinate.'
    },
    embed_code_snippet: '<!-- Embed Script Code Placeholder -->'
  }
];

export default function AiChatBotView() {
  const [savedBots, setSavedBots] = useState<ChatBotConfig[]>(() => {
    const saved = localStorage.getItem('ragnarok_custom_chat_bots');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return PREMADE_BOTS;
  });

  const [activeBotId, setActiveBotId] = useState<string>('cooper-patrol');
  const [activeTab, setActiveTab] = useState<'preview' | 'json_code'>('preview');

  // Form Inputs
  const [botName, setBotName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [mainRole, setMainRole] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState('');
  const [theme, setTheme] = useState<'professional' | 'mascot_cat' | 'minimalist_tech'>('mascot_cat');
  const [layoutStyle, setLayoutStyle] = useState<'floating_bubble' | 'side_panel' | 'inline_card'>('floating_bubble');
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [secondaryColor, setSecondaryColor] = useState('#eab308');
  const [fontFamily, setFontFamily] = useState('monospace');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [primaryCta, setPrimaryCta] = useState('https://ragnarok.work/book');

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

  // Load selected bot's config into form
  useEffect(() => {
    const target = savedBots.find(b => b.id === activeBotId);
    if (target) {
      setBotName(target.bot_profile.name);
      setBusinessDesc(target.business_description);
      setMainRole(target.main_role);
      setUploadedDocs(target.uploaded_docs);
      setTheme(target.character_theme);
      setLayoutStyle(target.ui_configuration.layout_style);
      setPrimaryColor(target.ui_configuration.primary_color);
      setSecondaryColor(target.ui_configuration.secondary_color);
      setFontFamily(target.ui_configuration.font_family);
      setWelcomeMessage(target.ui_configuration.welcome_message);
      setPrimaryCta(target.primary_cta || 'https://ragnarok.work/book');
      
      // Auto compile instructions and JSON on load
      compileBot(target);
    }
  }, [activeBotId]);

  // Scroll to bottom of chat simulator when messages update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  // Pre-configured Quick Theme Apply
  const applyQuickThemeColors = (selectedTheme: typeof theme) => {
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
    }
  };

  const handleThemeChange = (newTheme: typeof theme) => {
    setTheme(newTheme);
    applyQuickThemeColors(newTheme);
  };

  // Compile JSON deployment package & embed script locally using prompt rules
  const compileBot = (overrideBot?: ChatBotConfig) => {
    const currentName = overrideBot ? overrideBot.bot_profile.name : botName;
    const currentTheme = overrideBot ? overrideBot.character_theme : theme;
    const currentCta = overrideBot ? overrideBot.primary_cta : primaryCta;
    const currentLayout = overrideBot ? overrideBot.ui_configuration.layout_style : layoutStyle;
    const currentPrimary = overrideBot ? overrideBot.ui_configuration.primary_color : primaryColor;
    const currentSecondary = overrideBot ? overrideBot.ui_configuration.secondary_color : secondaryColor;
    const currentFont = overrideBot ? overrideBot.ui_configuration.font_family : fontFamily;
    const currentWelcome = overrideBot ? overrideBot.ui_configuration.welcome_message : welcomeMessage;
    const currentBusinessDesc = overrideBot ? overrideBot.business_description : businessDesc;
    const currentMainRole = overrideBot ? overrideBot.main_role : mainRole;
    const currentUploadedDocs = overrideBot ? overrideBot.uploaded_docs : uploadedDocs;

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
    }

    systemInstruction += `CRITICAL DIRECTIVES:
1. NEVER mention you are an AI or virtual assistant. Act as a live dedicated assistant.
2. Keep answers brief (strictly under 3 sentences) to fit a small chat overlay window.
3. Proactively steer the customer toward scheduling or sharing contact details using the CTA link: ${currentCta}.
4. Capture user intent to book a service.`;

    // 2. Avatar Selection
    let avatarUrl = 'https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg';
    if (currentTheme === 'mascot_cat') {
      avatarUrl = 'https://raw.githubusercontent.com/usmc6123/images/main/cooper-logo.png';
    } else if (currentTheme === 'professional') {
      avatarUrl = 'https://raw.githubusercontent.com/usmc6123/images/main/roscoe-logo.png';
    }

    // 3. Assemble complete JSON
    const configPackage = {
      bot_profile: {
        name: currentName,
        avatar_url: avatarUrl,
        system_instruction: systemInstruction
      },
      ui_configuration: {
        layout_style: currentLayout,
        primary_color: currentPrimary,
        secondary_color: currentSecondary,
        font_family: currentFont,
        welcome_message: currentWelcome
      },
      embed_code_snippet: `<!-- Ragnarök AI Chat Bot Embed Widget -->
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
        layout_style: "${currentLayout}",
        primary_color: "${currentPrimary}",
        secondary_color: "${currentSecondary}",
        font_family: "${currentFont}",
        welcome_message: "${currentWelcome.replace(/"/g, '\\"')}"
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
        let avatarUrl = 'https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg';
        if (theme === 'mascot_cat') {
          avatarUrl = 'https://raw.githubusercontent.com/usmc6123/images/main/cooper-logo.png';
        } else if (theme === 'professional') {
          avatarUrl = 'https://raw.githubusercontent.com/usmc6123/images/main/roscoe-logo.png';
        }

        return {
          ...b,
          business_description: businessDesc,
          main_role: mainRole,
          uploaded_docs: uploadedDocs,
          character_theme: theme,
          primary_cta: primaryCta,
          bot_profile: {
            name: botName,
            avatar_url: avatarUrl,
            system_instruction: generatedInstructions
          },
          ui_configuration: {
            layout_style: layoutStyle,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            font_family: fontFamily,
            welcome_message: welcomeMessage
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
      business_description: 'Custom Service Business - details here.',
      main_role: 'Customer helper and appointment scout.',
      uploaded_docs: 'Contact email: hello@mybusiness.com\nBooking: https://ragnarok.work/book',
      character_theme: 'mascot_cat',
      primary_cta: 'https://ragnarok.work/book',
      bot_profile: {
        name: 'New Custom Bot',
        avatar_url: 'https://raw.githubusercontent.com/usmc6123/images/main/cooper-logo.png',
        system_instruction: ''
      },
      ui_configuration: {
        layout_style: 'floating_bubble',
        primary_color: '#f97316',
        secondary_color: '#eab308',
        font_family: 'monospace',
        welcome_message: 'Hi there! Let me help you schedule an appointment.'
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
      setSavedBots(PREMADE_BOTS);
      localStorage.setItem('ragnarok_custom_chat_bots', JSON.stringify(PREMADE_BOTS));
      setActiveBotId('cooper-patrol');
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
      const hasPrice = lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('pricing');
      const hasLocation = lower.includes('where') || lower.includes('location') || lower.includes('address') || lower.includes('hours') || lower.includes('open');
      const hasBooking = lower.includes('book') || lower.includes('appointment') || lower.includes('schedule') || lower.includes('reserve');
      const hasAI = lower.includes('ai') || lower.includes('robot') || lower.includes('bot') || lower.includes('computer');

      if (theme === 'mascot_cat') {
        if (hasAI) {
          botResponse = `Meow! 🐾 I am Cooper, the lead shop patrol cat! I don't know what high-tech AI chips you're talking about, but my laser sensors are fully focused! ⚡`;
        } else if (hasPrice) {
          botResponse = `Vaporizing prices! 🐾 Spark plugs swap is $90, ATF transmission flush is $110, and suspension rebuilds start at $180! Extremely premium and super cat-speed! ⚡`;
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
          botResponse = `Our transparent rates are as follows: standard diagnostics is $49, brake pad installations are $149 per axle, and routine oil/filter service is $59.99. All backed by our warranty.`;
        } else if (hasLocation) {
          botResponse = `Our garage is conveniently located at 123 Resistance Way, Pasadena, CA. We are open Monday through Saturday, 8:00 AM to 6:00 PM.`;
        } else if (hasBooking) {
          botResponse = `I would be glad to secure your slot. Please visit our professional scheduling desk at ${primaryCta} or leave your phone number here.`;
        } else {
          botResponse = `Thank you for details. Let's arrange a dedicated diagnostic test on our vehicle lift. You can lock in a session at ${primaryCta}.`;
        }
      } else {
        // Minimalist tech
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
      }

      setIsTyping(false);
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1000);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 text-text-theme" id="ai-bot-builder-view">
      {/* Visual Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface-theme border border-[#1e202d] rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-theme/10 border border-primary-theme/20 rounded-xl">
            <Bot className="w-8 h-8 text-primary-theme animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-100">
              AI Chat Bot Builder
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-wide mt-1">
              PROMPT DESIGN • CONVERSION ENGINE • MULTI-SITE WIDGET DEPLOYMENT
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-primary-theme hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-xs rounded-lg transition active:scale-95 cursor-pointer"
          >
            + Create New Bot
          </button>
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-[#12141c] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-red-400 font-mono uppercase tracking-wider text-xs rounded-lg transition active:scale-95 cursor-pointer"
          >
            Reset Templates
          </button>
        </div>
      </div>

      {/* Grid: Bot Selection list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="bot-selectors-grid">
        {savedBots.map((b) => {
          const isActive = b.id === activeBotId;
          const isCat = b.character_theme === 'mascot_cat';
          const isPro = b.character_theme === 'professional';

          let cardColor = 'border-slate-800 bg-[#0e0f14]/50';
          if (isActive) {
            cardColor = isCat 
              ? 'border-orange-500/50 bg-orange-500/5 shadow-lg shadow-orange-500/5' 
              : isPro
                ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/5'
                : 'border-teal-500/50 bg-teal-500/5 shadow-lg shadow-teal-500/5';
          }

          return (
            <div
              key={b.id}
              onClick={() => setActiveBotId(b.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-slate-600 ${cardColor}`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={b.bot_profile.avatar_url || 'https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg'}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-100 truncate uppercase">
                      {b.bot_profile.name}
                    </h3>
                    <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded uppercase">
                      {b.character_theme.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate font-mono mt-1">
                    {b.business_description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Workspace split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Configuration (Lg: 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleGenerate} className="bg-surface-theme border border-[#1e202d] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Layout className="w-4.5 h-4.5 text-primary-theme" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  Configure Bot Engine
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                BOT_ID: {activeBotId}
              </span>
            </div>

            {/* Inputs Block */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                    Bot Public Name
                  </label>
                  <input
                    type="text"
                    required
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full bg-[#0a0b0e] border border-[#212330] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-theme transition"
                    placeholder="e.g. Cooper - Sales Patrol"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                    Character Theme Mode
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value as any)}
                    className="w-full bg-[#0a0b0e] border border-[#212330] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-theme transition cursor-pointer"
                  >
                    <option value="mascot_cat">🐾 High-Energy Sales Cat / Mascot</option>
                    <option value="professional">💼 Professional Assistant</option>
                    <option value="minimalist_tech">🤖 Minimalist / Modern Tech</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  Business Description
                </label>
                <input
                  type="text"
                  required
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                  className="w-full bg-[#0a0b0e] border border-[#212330] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary-theme transition"
                  placeholder="e.g. Ragnarök Auto Workshop - corvette tuning and repairs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  Main Role & Goal Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={mainRole}
                  onChange={(e) => setMainRole(e.target.value)}
                  className="w-full bg-[#0a0b0e] border border-[#212330] rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-primary-theme transition font-mono"
                  placeholder="e.g. Booking assistant & high-converting sales advisor"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Uploaded Knowledge base (Documents, prices, FAQ)</span>
                  <span className="text-[8px] bg-primary-theme/10 text-primary-theme border border-primary-theme/20 px-1.5 py-0.2 rounded">INJECTED TEXT</span>
                </label>
                <textarea
                  rows={4}
                  value={uploadedDocs}
                  onChange={(e) => setUploadedDocs(e.target.value)}
                  className="w-full bg-[#0a0b0e] border border-[#212330] rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-theme transition"
                  placeholder="Paste pricing schedules, addresses, phone numbers, or rules here..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                    Call To Action (CTA) Link
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryCta}
                    onChange={(e) => setPrimaryCta(e.target.value)}
                    className="w-full bg-[#0a0b0e] border border-[#212330] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-theme transition"
                    placeholder="e.g. https://ragnarok.work/book"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                    Widget Layout style
                  </label>
                  <select
                    value={layoutStyle}
                    onChange={(e) => setLayoutStyle(e.target.value as any)}
                    className="w-full bg-[#0a0b0e] border border-[#212330] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-theme transition cursor-pointer"
                  >
                    <option value="floating_bubble">💬 Floating Bubble (Standard)</option>
                    <option value="side_panel">📋 Side Drawer / Panel</option>
                    <option value="inline_card">🗂️ Inline Embedded Card</option>
                  </select>
                </div>
              </div>

              {/* Advanced UI Colors / Font styling */}
              <div className="p-4 bg-[#0a0b0e] border border-[#1a1b24] rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Visual Styling Configurations
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Primary Theme
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full bg-black/40 border border-[#212330] rounded px-2 py-1 text-[10px] text-slate-355 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Secondary Accent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full bg-black/40 border border-[#212330] rounded px-2 py-1 text-[10px] text-slate-355 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                      Typography
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full bg-black/40 border border-[#212330] rounded px-2 py-1.5 text-[10px] text-slate-200 font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="monospace">monospace (Console)</option>
                      <option value="sans-serif">sans-serif (Modern)</option>
                      <option value="Georgia, serif">serif (Editorial)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                    Widget Welcome Opening Message
                  </label>
                  <input
                    type="text"
                    required
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full bg-black/40 border border-[#212330] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-primary-theme transition"
                    placeholder="Welcome opening line..."
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-primary-theme to-amber-500 text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                Compile & Deploy Bot Package
              </button>
              <button
                type="button"
                onClick={handleSaveBot}
                className="px-6 py-3 bg-[#11131a] hover:bg-white/5 border border-white/5 hover:border-white/10 text-slate-300 font-mono uppercase tracking-wider text-xs rounded-xl transition active:scale-98 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
            
            {saveSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4" />
                <span>AI Bot configuration updated and saved successfully! Deployment files updated in local local-disk.</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Dual tabs Live Preview / JSON Export (Lg: 5 columns) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Tabs Selector */}
          <div className="flex border border-white/5 bg-[#0d0e14]/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition ${
                activeTab === 'preview' ? 'bg-primary-theme text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Live Widget Preview
              </span>
            </button>
            <button
              onClick={() => setActiveTab('json_code')}
              className={`flex-1 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition ${
                activeTab === 'json_code' ? 'bg-primary-theme text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                Deployment Code JSON
              </span>
            </button>
          </div>

          {/* Tab content 1: Interactive Chat Simulator Mockup */}
          {activeTab === 'preview' && (
            <div className="border border-[#1e202d] bg-surface-theme rounded-2xl p-4 shadow-xl flex flex-col h-[580px] overflow-hidden">
              {/* Simulator Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Interactive Simulator
                  </span>
                </div>
                <button
                  onClick={() => compileBot()}
                  className="p-1 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-md transition"
                  title="Reload Simulator State"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Phone Device Mockup Container */}
              <div className="flex-1 mt-4 border border-[#212330] rounded-xl overflow-hidden bg-[#07080b] flex flex-col relative" style={{ fontFamily: fontFamily === 'monospace' ? "'Courier New', monospace" : 'Inter, sans-serif' }}>
                {/* Bot Profile Top Header */}
                <div
                  className="p-3 text-white flex items-center justify-between shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={theme === 'mascot_cat' ? 'https://raw.githubusercontent.com/usmc6123/images/main/cooper-logo.png' : theme === 'professional' ? 'https://raw.githubusercontent.com/usmc6123/images/main/roscoe-logo.png' : 'https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg'}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-white/20 object-cover"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white truncate leading-none">
                        {botName || 'Custom Helper'}
                      </h4>
                      <span className="text-[8px] opacity-80 uppercase tracking-widest font-mono mt-0.5 block">
                        Online • Support Patrol
                      </span>
                    </div>
                  </div>
                  <span className="text-[8px] bg-black/20 border border-white/10 px-1.5 py-0.5 rounded font-mono uppercase">
                    {layoutStyle}
                  </span>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#0a0b0e]">
                  {chatMessages.map((msg, idx) => {
                    const isBot = msg.sender === 'bot';
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                      >
                        {isBot && (
                          <img
                            src={theme === 'mascot_cat' ? 'https://raw.githubusercontent.com/usmc6123/images/main/cooper-logo.png' : theme === 'professional' ? 'https://raw.githubusercontent.com/usmc6123/images/main/roscoe-logo.png' : 'https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg'}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full border border-white/10 object-cover mt-0.5 shrink-0"
                          />
                        )}
                        <div className="space-y-0.5">
                          <div
                            className={`p-2.5 rounded-xl text-[11px] leading-relaxed break-words ${
                              isBot 
                                ? 'bg-[#12141a] text-slate-100 border border-white/5 rounded-tl-none' 
                                : 'text-slate-950 font-semibold rounded-tr-none'
                            }`}
                            style={!isBot ? { backgroundColor: primaryColor } : undefined}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[8px] text-slate-600 block px-1 text-right">
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex items-start gap-2 mr-auto max-w-[80%] animate-pulse">
                      <img
                        src={theme === 'mascot_cat' ? 'https://raw.githubusercontent.com/usmc6123/images/main/cooper-logo.png' : theme === 'professional' ? 'https://raw.githubusercontent.com/usmc6123/images/main/roscoe-logo.png' : 'https://raw.githubusercontent.com/usmc6123/images/main/newlogo.jpg'}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full border border-white/10 object-cover mt-0.5 shrink-0"
                      />
                      <div className="bg-[#12141a] border border-white/5 text-slate-400 p-2.5 rounded-xl rounded-tl-none text-[10px] font-mono">
                        Typing coordinate logs...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input form */}
                <form onSubmit={handleSendMessage} className="p-2 border-t border-[#1a1b24] bg-[#07080b] flex items-center gap-1.5">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="flex-1 bg-[#0d0e12] border border-[#212330] rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-slate-500"
                    placeholder="Type client inquiry..."
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg text-slate-950 transition hover:scale-105 cursor-pointer shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab content 2: Deployment Code JSON & Embed Snippet */}
          {activeTab === 'json_code' && (
            <div className="border border-[#1e202d] bg-surface-theme rounded-2xl p-4 shadow-xl flex flex-col h-[580px] space-y-4 overflow-hidden">
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                {/* Block 1: JSON Output */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary-theme" />
                      JSON Deployment Package (Strict Format)
                    </span>
                    <button
                      onClick={handleCopyJson}
                      className="p-1 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-md transition flex items-center gap-1 text-[10px]"
                    >
                      {copyJsonSuccess ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copyJsonSuccess ? 'Copied' : 'Copy JSON'}
                    </button>
                  </div>
                  <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-lg overflow-auto text-[10px] font-mono text-amber-500/90 leading-relaxed scrollbar-none">
                    {generatedJson}
                  </pre>
                </div>

                {/* Block 2: Embed script code */}
                <div className="h-[200px] flex flex-col shrink-0">
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Code className="w-3.5 h-3.5 text-primary-theme" />
                      Copyable Embed Script
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-md transition flex items-center gap-1 text-[10px]"
                    >
                      {copyCodeSuccess ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copyCodeSuccess ? 'Copied' : 'Copy Script'}
                    </button>
                  </div>
                  <pre className="flex-1 p-3 bg-black/40 border border-[#212330] rounded-lg overflow-auto text-[10px] font-mono text-slate-355 scrollbar-none select-all">
                    {embedCode}
                  </pre>
                </div>
              </div>

              {/* Mini Deployment Instructions */}
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed shrink-0">
                <span className="text-white font-bold block mb-1">🔧 HOW TO DEPLOY WIDGET:</span>
                Copy the script snippet above and place it immediately before the closing <code className="text-primary-theme">&lt;/body&gt;</code> tag of any landing page, custom-designed Website, or Funnel to run this specific chatbot configuration live.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
