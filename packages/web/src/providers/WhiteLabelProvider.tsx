'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  WhiteLabelConfig,
  FeatureToggles,
  loadWhiteLabelConfig,
  loadWhiteLabelConfigSync,
  saveToLocalStorage,
  generateCssVariables,
  validateConfig,
  defaultWhiteLabelConfig,
} from '@/config/white-label';

/**
 * Context value interface for white-label provider
 */
interface WhiteLabelContextValue {
  /** Current white-label configuration */
  config: WhiteLabelConfig;
  /** Whether the configuration is still loading */
  isLoading: boolean;
  /** Update the white-label configuration */
  updateConfig: (updates: Partial<WhiteLabelConfig>) => void;
  /** Update feature toggles */
  updateFeatures: (features: Partial<FeatureToggles>) => void;
  /** Reset configuration to defaults */
  resetConfig: () => void;
  /** Check if a feature is enabled */
  isFeatureEnabled: (feature: keyof FeatureToggles) => boolean;
  /** Save current configuration to localStorage */
  saveConfig: () => void;
  /** Validation errors for current config */
  validationErrors: string[];
}

/**
 * White-label context
 */
const WhiteLabelContext = createContext<WhiteLabelContextValue | undefined>(undefined);

/**
 * Props for WhiteLabelProvider
 */
interface WhiteLabelProviderProps {
  children: ReactNode;
  /** Initial configuration override */
  initialConfig?: Partial<WhiteLabelConfig>;
}

/**
 * Inject CSS variables into the document
 */
function injectCssVariables(config: WhiteLabelConfig): void {
  if (typeof document === 'undefined') return;

  const styleId = 'white-label-css-variables';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = generateCssVariables(config);
}

/**
 * Update favicon
 */
function updateFavicon(faviconUrl: string | undefined): void {
  if (typeof document === 'undefined' || !faviconUrl) return;

  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.href = faviconUrl;
}

/**
 * Update document title with brand name
 */
function updateDocumentTitle(brandName: string): void {
  if (typeof document === 'undefined') return;

  const currentTitle = document.title;
  const defaultBrandName = defaultWhiteLabelConfig.brandName;

  // Replace the default brand name with the new one
  if (currentTitle.includes(defaultBrandName)) {
    document.title = currentTitle.replace(defaultBrandName, brandName);
  }
}

/**
 * Initialize analytics tracking if analyticsTrackingId is provided
 */
function initializeAnalytics(trackingId: string | undefined): void {
  if (typeof window === 'undefined' || !trackingId) return;

  // Check if already initialized
  if ((window as unknown as Record<string, unknown>).__analyticsInitialized) return;

  // Detect tracking ID type and initialize accordingly
  if (trackingId.startsWith('G-') || trackingId.startsWith('UA-')) {
    // Google Analytics 4 or Universal Analytics
    initializeGoogleAnalytics(trackingId);
  } else if (trackingId.length === 32) {
    // Likely Mixpanel token (32 character hex string)
    initializeMixpanel(trackingId);
  }

  (window as unknown as Record<string, unknown>).__analyticsInitialized = true;
}

/**
 * Initialize Google Analytics
 */
function initializeGoogleAnalytics(trackingId: string): void {
  if (typeof window === 'undefined') return;

  // Add gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  // Initialize gtag
  (window as unknown as Record<string, unknown[]>).dataLayer = (window as unknown as Record<string, unknown[]>).dataLayer || [];
  function gtag(...args: unknown[]) {
    (window as unknown as Record<string, unknown[]>).dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', trackingId);
}

/**
 * Initialize Mixpanel
 */
function initializeMixpanel(token: string): void {
  if (typeof window === 'undefined') return;

  // Mixpanel snippet
  (function(f: unknown, b: Document){
    if (!(window as unknown as Record<string, unknown>).mixpanel) {
      let e: unknown; const g = function(a: unknown[]) {
        const d = function(h: unknown) { return function() {
          (a as unknown as { push: (v: unknown[]) => void }).push([h].concat(Array.prototype.slice.call(arguments, 0)));
        }; };
        const c = ['init', 'track', 'identify', 'people.set'];
        for (let h = 0; h < c.length; h++) {
          (d as unknown as { (prop: string): unknown })(c[h]);
        }
        return a;
      };
      (window as unknown as Record<string, unknown>).mixpanel = g([]);
      e = b.createElement('script');
      (e as HTMLScriptElement).type = 'text/javascript';
      (e as HTMLScriptElement).async = true;
      (e as HTMLScriptElement).src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      const a = b.getElementsByTagName('script')[0];
      a.parentNode?.insertBefore(e as Node, a);
    }
    ((window as unknown as Record<string, { init: (t: string) => void }>).mixpanel).init(token);
  })(window, document);
}

/**
 * White-label provider component
 * Provides white-label configuration to the entire application
 */
export function WhiteLabelProvider({ children, initialConfig }: WhiteLabelProviderProps) {
  // Initialize with sync config to avoid flash of default content
  const [config, setConfig] = useState<WhiteLabelConfig>(() => {
    const syncConfig = loadWhiteLabelConfigSync();
    return initialConfig
      ? { ...syncConfig, ...initialConfig, features: { ...syncConfig.features, ...initialConfig.features } }
      : syncConfig;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load async configuration on mount
  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      try {
        const asyncConfig = await loadWhiteLabelConfig();
        if (mounted) {
          const finalConfig = initialConfig
            ? { ...asyncConfig, ...initialConfig, features: { ...asyncConfig.features, ...initialConfig.features } }
            : asyncConfig;
          setConfig(finalConfig);
          setValidationErrors(validateConfig(finalConfig));
        }
      } catch (error) {
        console.error('Failed to load white-label config:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [initialConfig]);

  // Apply CSS variables and update favicon when config changes
  useEffect(() => {
    injectCssVariables(config);
    updateFavicon(config.favicon);
    updateDocumentTitle(config.brandName);
    initializeAnalytics(config.analyticsTrackingId);
  }, [config]);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<WhiteLabelConfig>) => {
    setConfig((prev) => {
      const newConfig = {
        ...prev,
        ...updates,
        features: updates.features
          ? { ...prev.features, ...updates.features }
          : prev.features,
      };
      setValidationErrors(validateConfig(newConfig));
      return newConfig;
    });
  }, []);

  // Update feature toggles
  const updateFeatures = useCallback((features: Partial<FeatureToggles>) => {
    setConfig((prev) => ({
      ...prev,
      features: { ...prev.features, ...features },
    }));
  }, []);

  // Reset configuration to defaults
  const resetConfig = useCallback(() => {
    setConfig(defaultWhiteLabelConfig);
    setValidationErrors([]);
  }, []);

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback(
    (feature: keyof FeatureToggles) => {
      return config.features[feature] ?? true;
    },
    [config.features]
  );

  // Save configuration to localStorage
  const saveConfig = useCallback(() => {
    saveToLocalStorage(config);
  }, [config]);

  const value: WhiteLabelContextValue = {
    config,
    isLoading,
    updateConfig,
    updateFeatures,
    resetConfig,
    isFeatureEnabled,
    saveConfig,
    validationErrors,
  };

  return (
    <WhiteLabelContext.Provider value={value}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

/**
 * Hook to access white-label configuration
 * @throws Error if used outside of WhiteLabelProvider
 */
export function useWhiteLabel(): WhiteLabelContextValue {
  const context = useContext(WhiteLabelContext);

  if (context === undefined) {
    throw new Error('useWhiteLabel must be used within a WhiteLabelProvider');
  }

  return context;
}

/**
 * Hook to check if a feature is enabled
 * Convenience hook for checking a single feature
 */
export function useFeatureEnabled(feature: keyof FeatureToggles): boolean {
  const { isFeatureEnabled } = useWhiteLabel();
  return isFeatureEnabled(feature);
}

/**
 * Hook to get brand information
 * Convenience hook for common brand-related values
 */
export function useBrandInfo() {
  const { config } = useWhiteLabel();

  return {
    brandName: config.brandName,
    logoUrl: config.logoUrl,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    accentColor: config.accentColor,
    headerBackgroundColor: config.headerBackgroundColor,
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
    companyWebsite: config.companyWebsite,
    organizationLegalName: config.organizationLegalName,
    footerText: config.footerText,
    hideHalcyonBranding: config.hideHalcyonBranding,
  };
}

/**
 * Hook to get legal links
 * Convenience hook for terms, privacy, etc.
 */
export function useLegalLinks() {
  const { config } = useWhiteLabel();

  return {
    termsOfServiceUrl: config.termsOfServiceUrl,
    privacyPolicyUrl: config.privacyPolicyUrl,
    customHelpUrl: config.customHelpUrl,
    customSupportUrl: config.customSupportUrl,
  };
}

/**
 * Hook to get contact information
 * Convenience hook for all contact-related values
 */
export function useContactInfo() {
  const { config } = useWhiteLabel();

  return {
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
    reportingEmail: config.reportingEmail,
    billingEmail: config.billingEmail,
  };
}

/**
 * Hook to get localization settings
 * Convenience hook for timezone, locale, date format, currency
 */
export function useLocalization() {
  const { config } = useWhiteLabel();

  return {
    timezone: config.timezone || 'America/New_York',
    locale: config.locale || 'en-US',
    dateFormat: config.dateFormat || 'MM/DD/YYYY',
    currencyCode: config.currencyCode || 'USD',
  };
}

export default WhiteLabelProvider;
