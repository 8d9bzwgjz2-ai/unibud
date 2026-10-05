import { useQuery } from "@tanstack/react-query";
import { getCampusCatalog } from "./server";
import { registerDirectory } from "./catalog";

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const catalog = await getCampusCatalog();
      // Hydrate the in-memory directory with the real accounts only.
      registerDirectory(catalog.people);
      return catalog;
    },
    staleTime: 60_000,
  });
}
