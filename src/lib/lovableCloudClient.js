import { createClient } from "@supabase/supabase-js";

// Cliente separado apenas para chamadas ao backend do Lovable Cloud (funções/IA).
// Isso evita mexer no backend existente que seu app já usa (tabelas/storage/etc.).
const url = import.meta.env.VITE_LOVABLE_CLOUD_URL;
const key = import.meta.env.VITE_LOVABLE_CLOUD_PUBLISHABLE_KEY;

export const lovableCloudClient = url && key ? createClient(url, key) : null;
