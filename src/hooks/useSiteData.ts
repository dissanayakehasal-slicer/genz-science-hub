import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });
}

export function useContactSettings() {
  return useQuery({
    queryKey: ["contact_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("contact_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });
}

export function useSocialLinks() {
  return useQuery({
    queryKey: ["social_links"],
    queryFn: async () => {
      const { data } = await supabase.from("social_links").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });
}

export function useCategories(type: string) {
  return useQuery({
    queryKey: ["categories", type],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("type", type).order("sort_order");
      return data ?? [];
    },
  });
}
