/**
 * Bud's provider adapter now lives in the shared AI layer (`@/lib/ai/provider`)
 * so every AI feature reaches Oracle Arc through the same implementation.
 * Kept as a re-export for existing deep imports.
 */
export {
  getAIProvider,
  xaiFallbackEnabled,
  type AIProvider,
  type ProviderCapability,
  type ProviderMessage,
  type ProviderResult,
  type ProviderUsage,
} from "@/lib/ai/provider";
