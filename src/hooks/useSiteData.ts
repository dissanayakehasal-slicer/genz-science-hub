import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getSiteSettings,
  getContactSettings,
  getSocialLinks,
  getCategories,
} from "@/lib/api/public.functions";

export function useSiteSettings() {
  const fn = useServerFn(getSiteSettings);
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useContactSettings() {
  const fn = useServerFn(getContactSettings);
  return useQuery({
    queryKey: ["contact_settings"],
    queryFn: () => fn(),
  });
}

export function useSocialLinks() {
  const fn = useServerFn(getSocialLinks);
  return useQuery({
    queryKey: ["social_links"],
    queryFn: () => fn(),
  });
}

export function useCategories(type: string) {
  const fn = useServerFn(getCategories);
  return useQuery({
    queryKey: ["categories", type],
    queryFn: () => fn({ data: { type } }),
  });
}
