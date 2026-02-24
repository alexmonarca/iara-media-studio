/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ReqBody = {
  mode: "text" | "image";
  prompt: string;
  format?: string;
  brand?: {
    colors?: string[];
    tone?: string;
    personality?: string;
  };
  // base64 puro (sem prefixo) ou dataURL
  logoBase64?: string | null;
  refsBase64?: Array<string | null>;
};

function toDataUrlMaybe(b64OrDataUrl?: string | null) {
  if (!b64OrDataUrl) return null;
  const s = String(b64OrDataUrl).trim();
  if (!s) return null;
  if (s.startsWith("data:image")) return s;
  // assume base64
  return `data:image/png;base64,${s}`;
}

function json(resBody: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "Lovable AI não configurado (LOVABLE_API_KEY ausente)." }, 500);
    }

    const body = (await req.json()) as ReqBody;
    const mode = body?.mode;
    const prompt = String(body?.prompt ?? "").trim();

    if (mode !== "text" && mode !== "image") {
      return json({ error: "Parâmetro 'mode' inválido." }, 400);
    }
    if (!prompt) return json({ error: "Prompt vazio." }, 400);

    const colors = Array.isArray(body?.brand?.colors) ? body.brand!.colors! : [];
    const tone = String(body?.brand?.tone ?? "Profissional").trim() || "Profissional";
    const personality = String(body?.brand?.personality ?? "").trim();

    const format = String(body?.format ?? "").trim();

    const systemText =
      mode === "text"
        ? `Você é um copywriter profissional. Escreva em PT-BR. Contexto de marca: cores ${colors.join(", ")}; tom de voz ${tone}; personalidade ${personality}. Gere uma legenda útil e inclua hashtags relevantes.`
        : `Você é um diretor de arte + social media. Gere uma imagem e uma legenda em PT-BR com hashtags. Contexto de marca: cores ${colors.join(", ")}; tom de voz ${tone}; personalidade ${personality}. Formato: ${format || "(não especificado)"}.`;

    const userContent: any[] = [{ type: "text", text: prompt }];

    if (mode === "image") {
      const logoUrl = toDataUrlMaybe(body.logoBase64 ?? null);
      if (logoUrl) userContent.push({ type: "image_url", image_url: { url: logoUrl } });

      const refs = Array.isArray(body.refsBase64) ? body.refsBase64 : [];
      for (const r of refs) {
        const u = toDataUrlMaybe(r);
        if (u) userContent.push({ type: "image_url", image_url: { url: u } });
      }
    }

    const model = mode === "text" ? "google/gemini-3-flash-preview" : "google/gemini-2.5-flash-image";

    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemText },
          { role: "user", content: mode === "text" ? prompt : userContent },
        ],
        ...(mode === "image" ? { modalities: ["image", "text"] } : {}),
      }),
    });

    if (!gatewayResp.ok) {
      const t = await gatewayResp.text();
      return json({ error: `Falha no provedor de IA (${gatewayResp.status}).`, details: t }, gatewayResp.status);
    }

    const data = await gatewayResp.json();
    const textOut = String(data?.choices?.[0]?.message?.content ?? "").trim();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;

    // Compat: se vier JSON no texto
    let caption = textOut;
    let imageDataUrl = imageUrl;
    if (caption && (caption.startsWith("{") || caption.startsWith("["))) {
      try {
        const parsed = JSON.parse(caption);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.caption === "string" && parsed.caption.trim()) caption = parsed.caption.trim();
          if (!imageDataUrl && typeof parsed.image === "string" && parsed.image.trim()) imageDataUrl = parsed.image.trim();
        }
      } catch {
        // ignore
      }
    }

    if (mode === "text") {
      if (!caption) return json({ error: "Resposta vazia." }, 500);
      return json({ caption });
    }

    if (!caption && !imageDataUrl) return json({ error: "Resposta vazia." }, 500);
    return json({ caption: caption || "", image: imageDataUrl || "" });
  } catch (e) {
    console.error("midias-generate error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido." }, 500);
  }
});