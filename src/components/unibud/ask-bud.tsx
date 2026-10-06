import { BudWave } from "@/components/shell/bud-wave";
import { SparkQuickActions } from "@/components/shell/spark-quick-actions";

/**
 * Compatibility wrapper for the existing shell slot.
 * Bud is the large bottom intelligence signal; Spark is its separate
 * three-action quick gateway. No permanent "Ask Bud" pill remains.
 */
export function AskBudFab({ menuOpen }: { menuOpen: boolean }) {
  if (menuOpen) return null;
  return (
    <>
      <BudWave />
      <SparkQuickActions />
    </>
  );
}
