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
    supportEmail: config.supportEmail,
    supportPhone: config.supportPhone,
  };
}

export default WhiteLabelProvider;
