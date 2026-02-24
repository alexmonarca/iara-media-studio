import { createClient } from "@supabase/supabase-js";

// Cliente para chamadas ao backend do Lovable Cloud (funções/IA).
// Como este projeto já está com Cloud habilitado, reutilizamos as variáveis padrão
// do projeto (VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY).
// Mantemos também compatibilidade com variáveis explícitas, caso você queira separar depois.
const url =
  import.meta.env.VITE_LOVABLE_CLOUD_URL ??
  import.meta.env.VITE_SUPABASE_URL;

const key =
  import.meta.env.VITE_LOVABLE_CLOUD_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const lovableCloudClient = url && key ? createClient(url, key) : null;

