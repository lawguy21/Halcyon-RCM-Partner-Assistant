/**
 * PDF Styling Constants for Halcyon RCM Partner Assistant
 * Defines brand colors, fonts, and visual styling for PDF reports
 */

import type {
  PDFColorConfig,
  PDFFontConfig,
  PDFTableCellStyle,
  PDFReportConfig,
} from './types.js';

// ============================================================================
// HALCYON BRAND COLORS
// ============================================================================

/**
 * Primary Halcyon brand color palette
 * Blues and greens representing trust, reliability, and growth
 */
export const HALCYON_COLORS = {
  // Primary blues
  primaryDark: '#1a365d',      // Deep navy - headers, primary text
  primary: '#2b6cb0',          // Halcyon blue - main brand color
  primaryLight: '#4299e1',     // Light blue - accents
  primaryLighter: '#90cdf4',   // Very light blue - backgrounds
  primaryLightest: '#ebf8ff',  // Almost white blue - subtle backgrounds

  // Secondary greens
  secondaryDark: '#22543d',    // Deep green - success states
  secondary: '#38a169',        // Halcyon green - positive indicators
  secondaryLight: '#68d391',   // Light green - highlights
  secondaryLighter: '#9ae6b4', // Very light green - backgrounds
  secondaryLightest: '#f0fff4', // Almost white green - subtle backgrounds

  // Accent colors
  accent: '#805ad5',           // Purple - special callouts
  accentLight: '#b794f4',      // Light purple - secondary accents

  // Neutral colors
  black: '#1a202c',            // Near black - body text
  gray900: '#2d3748',          // Dark gray - headings
  gray700: '#4a5568',          // Medium dark gray - secondary text
  gray600: '#718096',          // Medium gray - labels
  gray400: '#a0aec0',          // Light gray - borders
  gray200: '#e2e8f0',          // Very light gray - dividers
  gray100: '#edf2f7',          // Lightest gray - backgrounds
  white: '#ffffff',            // White - page background

  // Status colors
  success: '#38a169',          // Green - success/positive
  warning: '#d69e2e',          // Yellow/Gold - warning
  danger: '#e53e3e',           // Red - error/critical
  info: '#3182ce',             // Blue - informational

  // Urgency level colors
  urgencyCritical: '#e53e3e',  // Red
  urgencyHigh: '#dd6b20',      // Orange
  urgencyMedium: '#d69e2e',    // Yellow
  urgencyLow: '#38a169',       // Green
} as const;

// ============================================================================
// DEFAULT COLOR CONFIGURATION
// ============================================================================

/**
 * Default color configuration for PDF reports
 */
export const DEFAULT_COLORS: PDFColorConfig = {
  primary: HALCYON_COLORS.primary,
  secondary: HALCYON_COLORS.secondary,
  accent: HALCYON_COLORS.accent,
  text: HALCYON_COLORS.black,
  textLight: HALCYON_COLORS.gray600,
  background: HALCYON_COLORS.white,
  border: HALCYON_COLORS.gray400,
  success: HALCYON_COLORS.success,
  warning: HALCYON_COLORS.warning,
  danger: HALCYON_COLORS.danger,
};

// ============================================================================
// FONT CONFIGURATIONS
// ============================================================================

/**
 * Default font sizes (in points)
 */
export const FONT_SIZES = {
  title: 24,
  heading1: 20,
  heading2: 16,
  heading3: 14,
  body: 11,
  small: 9,
  tiny: 8,
} as const;

/**
 * Default font configurations
 */
export const DEFAULT_FONTS = {
  heading: {
    family: 'Helvetica-Bold',
    size: FONT_SIZES.heading1,
    weight: 'bold',
  } as PDFFontConfig,
  subheading: {
    family: 'Helvetica-Bold',
    size: FONT_SIZES.heading2,
    weight: 'bold',
  } as PDFFontConfig,
  body: {
    family: 'Helvetica',
    size: FONT_SIZES.body,
    weight: 'normal',
  } as PDFFontConfig,
  small: {
    family: 'Helvetica',
    size: FONT_SIZES.small,
    weight: 'normal',
  } as PDFFontConfig,
};

// ============================================================================
// PAGE LAYOUT
// ============================================================================

/**
 * Standard page margins (in points, 72 points = 1 inch)
 */
export const PAGE_MARGINS = {
  standard: {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  },
  narrow: {
    top: 54,
    bottom: 54,
    left: 54,
    right: 54,
  },
  wide: {
    top: 72,
    bottom: 72,
    left: 108,
    right: 108,
  },
} as const;

/**
 * Page dimensions (in points)
 */
export const PAGE_DIMENSIONS = {
  letter: {
    width: 612,
    height: 792,
  },
  legal: {
    width: 612,
    height: 1008,
  },
  a4: {
    width: 595.28,
    height: 841.89,
  },
} as const;

/**
 * Common spacing values (in points)
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ============================================================================
// TABLE STYLES
// ============================================================================

/**
 * Default table header style
 */
export const TABLE_HEADER_STYLE: PDFTableCellStyle = {
  backgroundColor: HALCYON_COLORS.primaryDark,
  textColor: HALCYON_COLORS.white,
  fontSize: FONT_SIZES.body,
  fontWeight: 'bold',
  align: 'left',
  padding: 8,
};

/**
 * Default table body cell style
 */
export const TABLE_BODY_STYLE: PDFTableCellStyle = {
  backgroundColor: HALCYON_COLORS.white,
  textColor: HALCYON_COLORS.black,
  fontSize: FONT_SIZES.body,
  fontWeight: 'normal',
  align: 'left',
  padding: 6,
};

/**
 * Alternate row style for zebra striping
 */
export const TABLE_ALTERNATE_ROW_COLOR = HALCYON_COLORS.gray100;

/**
 * Table border color
 */
export const TABLE_BORDER_COLOR = HALCYON_COLORS.gray400;

// ============================================================================
// HEADER/FOOTER STYLES
// ============================================================================

/**
 * Header configuration
 */
export const HEADER_STYLES = {
  /** Header background color */
  backgroundColor: HALCYON_COLORS.white,
  /** Header text color */
  textColor: HALCYON_COLORS.primaryDark,
  /** Header border color */
  borderColor: HALCYON_COLORS.primary,
  /** Header border width */
  borderWidth: 2,
  /** Logo max width */
  logoMaxWidth: 120,
  /** Logo max height */
  logoMaxHeight: 50,
  /** Title font size */
  titleFontSize: FONT_SIZES.title,
  /** Subtitle font size */
  subtitleFontSize: FONT_SIZES.heading3,
  /** Header height */
  height: 80,
} as const;

/**
 * Footer configuration
 */
export const FOOTER_STYLES = {
  /** Footer background color */
  backgroundColor: HALCYON_COLORS.white,
  /** Footer text color */
  textColor: HALCYON_COLORS.gray600,
  /** Footer border color */
  borderColor: HALCYON_COLORS.gray200,
  /** Footer border width */
  borderWidth: 1,
  /** Footer font size */
  fontSize: FONT_SIZES.small,
  /** Footer height */
  height: 40,
  /** Page number format */
  pageNumberFormat: 'Page {current} of {total}',
} as const;

// ============================================================================
// CHART STYLES
// ============================================================================

/**
 * Default chart colors (for pie charts, bar charts, etc.)
 */
export const CHART_COLORS = [
  HALCYON_COLORS.primary,
  HALCYON_COLORS.secondary,
  HALCYON_COLORS.accent,
  HALCYON_COLORS.primaryLight,
  HALCYON_COLORS.secondaryLight,
  HALCYON_COLORS.accentLight,
  HALCYON_COLORS.warning,
  HALCYON_COLORS.info,
] as const;

/**
 * Chart styling configuration
 */
export const CHART_STYLES = {
  /** Default bar chart bar width */
  barWidth: 40,
  /** Default pie chart diameter */
  pieChartDiameter: 200,
  /** Chart title font size */
  titleFontSize: FONT_SIZES.heading3,
  /** Chart label font size */
  labelFontSize: FONT_SIZES.small,
  /** Chart value font size */
  valueFontSize: FONT_SIZES.body,
  /** Legend font size */
  legendFontSize: FONT_SIZES.small,
  /** Axis line color */
  axisColor: HALCYON_COLORS.gray400,
  /** Grid line color */
  gridColor: HALCYON_COLORS.gray200,
} as const;

// ============================================================================
// URGENCY INDICATOR STYLES
// ============================================================================

/**
 * Get color for urgency level
 */
export function getUrgencyColor(urgency: string): string {
  const upperUrgency = urgency.toUpperCase();
  switch (upperUrgency) {
    case 'CRITICAL':
      return HALCYON_COLORS.urgencyCritical;
    case 'HIGH':
      return HALCYON_COLORS.urgencyHigh;
    case 'MEDIUM':
      return HALCYON_COLORS.urgencyMedium;
    case 'LOW':
      return HALCYON_COLORS.urgencyLow;
    default:
      return HALCYON_COLORS.gray600;
  }
}

/**
 * Urgency badge styles
 */
export const URGENCY_BADGE_STYLES = {
  CRITICAL: {
    backgroundColor: HALCYON_COLORS.urgencyCritical,
    textColor: HALCYON_COLORS.white,
  },
  HIGH: {
    backgroundColor: HALCYON_COLORS.urgencyHigh,
    textColor: HALCYON_COLORS.white,
  },
  MEDIUM: {
    backgroundColor: HALCYON_COLORS.urgencyMedium,
    textColor: HALCYON_COLORS.black,
  },
  LOW: {
    backgroundColor: HALCYON_COLORS.urgencyLow,
    textColor: HALCYON_COLORS.white,
  },
} as const;

// ============================================================================
// SECTION STYLES
// ============================================================================

/**
 * Section title styles
 */
export const SECTION_STYLES = {
  /** Section title font size */
  titleFontSize: FONT_SIZES.heading2,
  /** Section title color */
  titleColor: HALCYON_COLORS.primaryDark,
  /** Section title underline color */
  underlineColor: HALCYON_COLORS.primary,
  /** Section title underline width */
  underlineWidth: 2,
  /** Space after section title */
  titleSpaceAfter: SPACING.md,
  /** Space between sections */
  sectionSpacing: SPACING.xl,
} as const;

// ============================================================================
// DEFAULT REPORT CONFIGURATION
// ============================================================================

/**
 * Default report configuration
 */
export const DEFAULT_REPORT_CONFIG: PDFReportConfig = {
  title: 'Halcyon RCM Report',
  subtitle: '',
  colors: DEFAULT_COLORS,
  fonts: DEFAULT_FONTS,
  margins: PAGE_MARGINS.standard,
  showPageNumbers: true,
  showDateStamp: true,
  footerText: 'Confidential - Halcyon RCM Partner Assistant',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Create a lighter version of a color
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const lighten = (c: number) => Math.round(c + (255 - c) * (percent / 100));

  const r = Math.min(255, lighten(rgb.r)).toString(16).padStart(2, '0');
  const g = Math.min(255, lighten(rgb.g)).toString(16).padStart(2, '0');
  const b = Math.min(255, lighten(rgb.b)).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

/**
 * Create a darker version of a color
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const darken = (c: number) => Math.round(c * (1 - percent / 100));

  const r = Math.max(0, darken(rgb.r)).toString(16).padStart(2, '0');
  const g = Math.max(0, darken(rgb.g)).toString(16).padStart(2, '0');
  const b = Math.max(0, darken(rgb.b)).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

/**
 * Format currency for display in PDFs
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage for display in PDFs
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date for display in PDFs
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format date range for display in PDFs
 */
export function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}
