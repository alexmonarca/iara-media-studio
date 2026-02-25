import { supabase } from "@/integrations/supabase/client";

// Alias único para invocar backend functions via Lovable Cloud.
// Mantido separado para evitar imports circulares e facilitar manutenção.
export const lovableCloudClient = supabase;
