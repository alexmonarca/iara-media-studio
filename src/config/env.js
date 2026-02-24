// Centraliza variáveis de ambiente para facilitar deploy (Vercel/GitHub).
// Em Vite, variáveis expostas no client precisam começar com VITE_.

export const env = {
  // Configure no ambiente de deploy:
  // - VITE_SUPABASE_URL
  // - VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY em setups antigos)
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    "",

  // Gemini (atenção: variável VITE_* é exposta no client)
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY ?? "",

  // n8n (webhook público) - acionado a cada mensagem do usuário na tela inicial
  n8nAiWebhookUrl:
    import.meta.env.VITE_N8N_AI_WEBHOOK_URL ??
    "https://webhook.monarcahub.com/webhook/ensinar_ia",

  // Retenção (disparos em massa)
  retentionMassWebhookUrl:
    import.meta.env.VITE_RETENTION_MASS_WEBHOOK_URL ??
    "https://webhook.monarcahub.com/webhook/retencao-disparos",
};

