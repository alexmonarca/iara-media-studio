// Centraliza variáveis de ambiente para facilitar deploy (Vercel/GitHub).
// Em Vite, variáveis expostas no client precisam começar com VITE_.

export const env = {
  // Recomendido: configurar no Vercel como VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
  // Fallback mantém o preview funcionando enquanto você migra.
  supabaseUrl:
    import.meta.env.VITE_SUPABASE_URL ??
    "https://wjyrinydwrazuzjczhbw.supabase.co",
  supabaseAnonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeXJpbnlkd3JhenV6amN6aGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0OTA3MTAsImV4cCI6MjA3OTA2NjcxMH0.lx5gKNPJLBfBouwH99MFFYHtjvxDZeohwoJr9JlSblg",

  // n8n (webhook público) - acionado a cada mensagem do usuário na tela inicial
  n8nAiWebhookUrl:
    import.meta.env.VITE_N8N_AI_WEBHOOK_URL ??
    "https://webhook.monarcahub.com/webhook/ensinar_ia",

  // Retenção (disparos em massa)
  retentionMassWebhookUrl:
    import.meta.env.VITE_RETENTION_MASS_WEBHOOK_URL ??
    "https://webhook.monarcahub.com/webhook/retencao-disparos",
};

