import { useQuery } from "@tanstack/react-query";
import { getCampusCatalog } from "./server";

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => getCampusCatalog(),
    staleTime: 60_000,
  });
}
