/**
 * Admin UI Theme Configuration
 *
 * Defines the cohesive visual identity for the Admin Interface based on the active PathAnimationMode.
 * Each theme provides tokens for colors, borders, fonts, and effects to match the 3D environment.
 */

import type { PathAnimationMode } from "@/types/atlas-admin";

export interface AdminUITheme {
  name: string;
  colors: {
    background: string; // Main panel background
    border: string; // Border color for panels/inputs
    primary: string; // Primary accent (buttons, active states)
    secondary: string; // Secondary accent
    text: {
      primary: string; // Headings, strong text
      secondary: string; // Descriptions, labels
      muted: string; // Disabled, subtle
    };
    hover: string; // Hover state background
  };
  effects: {
    backdropBlur: string; // fast blur class (e.g. backdrop-blur-md)
    glass: string; // Composite class for glass effect
    glow: string; // Box shadow for active elements
    mask?: string; // Optional masking class (e.g. for liquid)
  };
  typography: {
    fontFamily: string; // Tailwinc font class
    tracking: string; // Letter spacing
  };
  layout: {
    borderRadius: string; // Border radius class
  };
}

/**
 * DEFAULT: SUBTLE (Clinical, Clean)
 */
const SUBTLE_THEME: AdminUITheme = {
  name: "Subtle",
  colors: {
    background: "bg-gray-900/95",
    border: "border-gray-800",
    primary: "text-cyan-400",
    secondary: "text-gray-500",
    text: {
      primary: "text-gray-200",
      secondary: "text-gray-400",
      muted: "text-gray-600",
    },
    hover: "hover:bg-gray-800/50",
  },
  effects: {
    backdropBlur: "backdrop-blur-sm",
    glass: "bg-gray-900/90 border border-gray-800",
    glow: "shadow-[0_0_15px_rgba(34,211,238,0.1)]",
  },
  typography: {
    fontFamily: "font-sans",
    tracking: "tracking-normal",
  },
  layout: {
    borderRadius: "rounded-lg",
  },
};

/**
 * DYNAMIC (Energetic, Bold)
 */
const DYNAMIC_THEME: AdminUITheme = {
  name: "Dynamic",
  colors: {
    background: "bg-gray-900/90",
    border: "border-orange-500/30",
    primary: "text-orange-400",
    secondary: "text-yellow-500",
    text: {
      primary: "text-white",
      secondary: "text-gray-300",
      muted: "text-gray-600",
    },
    hover: "hover:bg-orange-500/10",
  },
  effects: {
    backdropBlur: "backdrop-blur-md",
    glass: "bg-gray-900/80 border-t border-orange-500/50",
    glow: "shadow-[0_4px_20px_rgba(249,115,22,0.2)]",
  },
  typography: {
    fontFamily: "font-sans",
    tracking: "tracking-wide",
  },
  layout: {
    borderRadius: "rounded-2xl",
  },
};

/**
 * MYSTICAL (Blurry, Deep)
 */
const MYSTICAL_THEME: AdminUITheme = {
  name: "Mystical",
  colors: {
    background: "bg-[#1a1033]/80", // Deep purple
    border: "border-purple-500/20",
    primary: "text-purple-300",
    secondary: "text-fuchsia-400",
    text: {
      primary: "text-purple-50",
      secondary: "text-purple-200/70",
      muted: "text-purple-900",
    },
    hover: "hover:bg-purple-500/10",
  },
  effects: {
    backdropBlur: "backdrop-blur-xl",
    glass: "bg-purple-900/20 border border-purple-500/30 shadow-inner",
    glow: "shadow-[0_0_30px_rgba(168,85,247,0.15)]",
  },
  typography: {
    fontFamily: "font-serif", // Ethereal feel
    tracking: "tracking-widest",
  },
  layout: {
    borderRadius: "rounded-xl",
  },
};

/**
 * CRYSTALLINE (Sharp, Clear)
 */
const CRYSTALLINE_THEME: AdminUITheme = {
  name: "Crystalline",
  colors: {
    background: "bg-gray-950/40", // Very transparent
    border: "border-white/40",
    primary: "text-cyan-200",
    secondary: "text-white",
    text: {
      primary: "text-white",
      secondary: "text-cyan-100/70",
      muted: "text-gray-600",
    },
    hover: "hover:bg-white/10",
  },
  effects: {
    backdropBlur: "backdrop-blur-[2px]", // Clear glass
    glass: "bg-white/5 border border-white/60",
    glow: "shadow-[0_0_0_1px_rgba(255,255,255,0.2)]",
  },
  typography: {
    fontFamily: "font-mono",
    tracking: "tracking-tight text-xs uppercase",
  },
  layout: {
    borderRadius: "rounded-none skew-x-[-2deg]", // Angular
  },
};

/**
 * LUMINOUS (Bright, Glowing)
 */
const LUMINOUS_THEME: AdminUITheme = {
  name: "Luminous",
  colors: {
    background: "bg-gray-900/95", // Dark back to let UI pop
    border: "border-yellow-200/50",
    primary: "text-yellow-300",
    secondary: "text-amber-200",
    text: {
      primary: "text-yellow-50 drop-shadow-[0_0_2px_rgba(255,255,0,0.5)]",
      secondary: "text-yellow-100/80",
      muted: "text-yellow-900",
    },
    hover: "hover:bg-yellow-400/10",
  },
  effects: {
    backdropBlur: "backdrop-blur-lg",
    glass: "bg-yellow-900/20 border border-yellow-200/40",
    glow: "shadow-[0_0_20px_rgba(253,224,71,0.2)]",
  },
  typography: {
    fontFamily: "font-sans",
    tracking: "tracking-wider",
  },
  layout: {
    borderRadius: "rounded-3xl", // Soft glowy shapes
  },
};

/**
 * LIQUID (Fluid, Organic)
 */
const LIQUID_THEME: AdminUITheme = {
  name: "Liquid",
  colors: {
    background: "bg-[#0b172a]/90", // Deep ocean
    border: "border-blue-400/20",
    primary: "text-blue-300",
    secondary: "text-cyan-300",
    text: {
      primary: "text-blue-50",
      secondary: "text-blue-200/60",
      muted: "text-blue-900",
    },
    hover: "hover:bg-blue-400/10",
  },
  effects: {
    backdropBlur: "backdrop-blur-xl",
    glass: "bg-blue-600/10 border-2 border-blue-400/10", // Thicker border
    glow: "shadow-[0_10px_30px_rgba(59,130,246,0.2)]",
  },
  typography: {
    fontFamily: "font-sans",
    tracking: "tracking-normal",
  },
  layout: {
    borderRadius: "rounded-[2rem]", // Super rounded
  },
};

/**
 * GLITCH (Raw, Chaotic)
 */
const GLITCH_THEME: AdminUITheme = {
  name: "Glitch",
  colors: {
    background: "bg-black",
    border: "border-green-600",
    primary: "text-green-500",
    secondary: "text-green-700",
    text: {
      primary: "text-green-500",
      secondary: "text-green-700",
      muted: "text-green-900",
    },
    hover: "hover:bg-green-900/30",
  },
  effects: {
    backdropBlur: "backdrop-blur-none",
    glass: "bg-black border-l-4 border-green-600",
    glow: "drop-shadow-[2px_2px_0px_rgba(0,255,0,0.3)]",
  },
  typography: {
    fontFamily: "font-mono",
    tracking: "tracking-tighter",
  },
  layout: {
    borderRadius: "rounded-none",
  },
};

/**
 * Theme Registry
 */
export const ADMIN_THEMES: Record<PathAnimationMode, AdminUITheme> = {
  subtle: SUBTLE_THEME,
  dynamic: DYNAMIC_THEME,
  mystical: MYSTICAL_THEME,
  crystalline: CRYSTALLINE_THEME,
  luminous: LUMINOUS_THEME,
  liquid: LIQUID_THEME,
  glitch: GLITCH_THEME,
};

/**
 * Get the theme configuration for a given mode
 */
export function getAdminTheme(mode: PathAnimationMode): AdminUITheme {
  return ADMIN_THEMES[mode] || SUBTLE_THEME;
}
