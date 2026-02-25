import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Palette,
  CreditCard,
  History as HistoryIcon,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Monitor,
  Smartphone,
  MessageSquare,
  Type,
  Square,
  RectangleVertical,
  AlertCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import GeneratedArtsHistoryList from "@/components/midias/GeneratedArtsHistoryList";
import GeneratedArtDetailsModal from "@/components/midias/GeneratedArtDetailsModal";

const STORAGE_BUCKET = "brand-assets";

function formatError(e) {
  if (!e) return "Erro desconhecido.";
  if (typeof e === "string") return e;
  return e?.message || "Erro desconhecido.";
}

async function fileToArrayBuffer(file) {
  return await file.arrayBuffer();
}

async function urlToBase64(url) {
  if (!url) return null;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao baixar referência (${resp.status})`);
  const blob = await resp.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.readAsDataURL(blob);
  });
}

async function compressImageFile(file, { maxSize = 1_500_000, maxDimension = 1600, quality = 0.82 } = {}) {
  // Se já estiver pequeno, mantém.
  if (!file || file.size <= maxSize) return file;
  if (!file.type?.startsWith("image/")) return file;

  // Evita travar com arquivos gigantes (ainda assim vai tentar, mas limita)
  const safeFile = file.size > 15_000_000 ? new File([file], file.name, { type: file.type }) : file;

  let bitmap;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(safeFile);
    }
  } catch (_e) {
    bitmap = null;
  }

  // Fallback via Image() para navegadores que não suportam createImageBitmap
  if (!bitmap) {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Falha ao ler imagem."));
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(safeFile);
    });

    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao decodificar imagem."));
      img.src = dataUrl;
    });
  }

  const width = bitmap.width;
  const height = bitmap.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  // Preferir jpeg para reduzir peso (webp pode falhar em alguns fluxos/policies)
  const mime = "image/jpeg";

  let q = quality;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, q));

  // Ajusta qualidade para bater o teto de tamanho
  for (let i = 0; i < 6 && blob && blob.size > maxSize; i++) {
    q = Math.max(0.4, q - 0.08);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, q));
  }

  if (!blob) return file;

  const nextName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], nextName, { type: mime });
}

function safeJsonArray(value) {
  if (!value) return [];

  // Já é array (json/jsonb no banco)
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }

  // Vem como string (ex.: "[\"url1\",\"url2\"]" em coluna TEXT)
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean);
      }
    } catch (_e) {
      // fallback: tenta quebrar por vírgula caso venha "url1,url2"
      if (trimmed.includes(",")) {
        return trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  }

  return [];
}

export default function MidiasAppPage({
  supabaseClient,
  userId,
  onBack,
  onOpenPlansTab,
  onOpenConnectionsTab,
  onOpenInstagramConnect,
  hasMediaUpgrade = false,
  selectedCreditsPack = 0,
}) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Segurança: sempre preferir o userId da sessão atual (evita injetar ID via props).
  const [effectiveUserId, setEffectiveUserId] = useState(userId || "");

  const [credits, setCredits] = useState(0);
  const [creditHistory, setCreditHistory] = useState([]);
  const [generatedArts, setGeneratedArts] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedArt, setSelectedArt] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Me diga o que você quer criar e eu gero a arte + legenda no seu estilo. Você só precisa configurar sua marca uma vez na aba \"Marca\".",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [selectedFormat, setSelectedFormat] = useState("quadrado");
  const [generating, setGenerating] = useState(false);

  const [activeTab, setActiveTab] = useState("gerar");

  const [brandData, setBrandData] = useState({
    colors: ["#EA580C"],
    logo_url: "",
    reference_images: [], // URLs
    tone_of_voice: "Profissional",
    personality: "",
  });
  const [newColor, setNewColor] = useState("#EA580C");
  const [saveStatus, setSaveStatus] = useState(null); // saving|saved|error

  const resolvedUserId = effectiveUserId || userId;

  useEffect(() => {
    let alive = true;
    if (!supabaseClient) return;

    supabaseClient.auth
      .getUser()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) return;
        const sessionUserId = data?.user?.id;
        if (sessionUserId) setEffectiveUserId(sessionUserId);
      })
      .catch(() => null);

    return () => {
      alive = false;
    };
  }, [supabaseClient]);

  // Regra:
  // - Acesso ao módulo: saldo > 0 OU pacote mensal selecionado
  // - Uso (gerar): exige saldo suficiente
  const canUse = credits > 0;
  const hasAccess = Boolean(hasMediaUpgrade || selectedCreditsPack > 0);

  const formats = useMemo(
    () => [
      { id: "texto", label: "Texto (ideia/legenda)", icon: MessageSquare },
      { id: "quadrado", label: "Quadrado", icon: Monitor },
      { id: "retrato_4x5", label: "Retrato (4:5)", icon: Monitor },
      { id: "story", label: "Story", icon: Smartphone },
    ],
    [],
  );

  const loadAll = async () => {
    if (!supabaseClient || !resolvedUserId) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // credits
      const { data: pData, error: pErr } = await supabaseClient
        .from("profiles")
        .select("credits_balance")
        .eq("id", resolvedUserId)
        .maybeSingle();
      if (pErr) throw pErr;
      setCredits(pData?.credits_balance ?? 0);

      // brand
      // Suporta 2 schemas comuns:
      // A) brand_settings.user_id (recomendado)
      // B) brand_settings.id == auth.uid() (legado)
      let bData = null;
      {
        const attemptUserId = await supabaseClient
          .from("brand_settings")
          .select("id,user_id,logo_url,colors,reference_images,personality,tone_of_voice")
          .eq("user_id", resolvedUserId)
          .maybeSingle();

        if (!attemptUserId.error) {
          bData = attemptUserId.data;
        } else if (
          String(attemptUserId.error?.message || "").includes("column") &&
          String(attemptUserId.error?.message || "").includes("user_id")
        ) {
          const attemptId = await supabaseClient
            .from("brand_settings")
            .select("id,logo_url,colors,reference_images,personality,tone_of_voice")
            .eq("id", resolvedUserId)
            .maybeSingle();
          if (attemptId.error) throw attemptId.error;
          bData = attemptId.data;
        } else {
          throw attemptUserId.error;
        }
      }

      if (bData) {
        setBrandData({
          colors: Array.isArray(bData.colors) ? bData.colors : ["#EA580C"],
          logo_url: bData.logo_url || "",
          reference_images: safeJsonArray(bData.reference_images),
          personality: bData.personality || "",
          tone_of_voice: bData.tone_of_voice || "Profissional",
        });
      }

      // histórico (gerações)
      const { data: gData, error: gErr } = await supabaseClient
        .from("generated_arts")
        .select("id,image_url,caption,format,prompt,created_at")
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (gErr) throw gErr;
      setGeneratedArts(Array.isArray(gData) ? gData : []);

      // extrato (créditos)
      const { data: hData, error: hErr } = await supabaseClient
        .from("credit_transactions")
        .select("id,amount,description,created_at")
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (hErr) throw hErr;
      setCreditHistory(hData || []);
    } catch (e) {
      setErrorMsg(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseClient, resolvedUserId]);

  // Realtime: quando uma nova arte entrar na tabela, atualiza histórico automaticamente
  useEffect(() => {
    if (!supabaseClient || !resolvedUserId) return;

    const channel = supabaseClient
      .channel(`generated_arts_${resolvedUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "generated_arts",
          filter: `user_id=eq.${resolvedUserId}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row?.id) return;
          setGeneratedArts((prev) => {
            const exists = prev.some((p) => p.id === row.id);
            if (exists) return prev;
            return [row, ...prev].slice(0, 50);
          });
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, resolvedUserId]);

  const uploadToStorage = async (file, kind) => {
    if (!supabaseClient || !resolvedUserId) throw new Error("Sem sessão.");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `midias/${resolvedUserId}/${kind}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, await fileToArrayBuffer(file), {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (upErr) throw upErr;

    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error("Não foi possível obter URL pública do arquivo.");

    return publicUrl;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setSaveStatus("saving");
      const compressed = await compressImageFile(file);
      const url = await uploadToStorage(compressed, "logo");
      setBrandData((prev) => ({ ...prev, logo_url: url }));
      setSaveStatus("saved");
    } catch (e2) {
      setSaveStatus("error");
      setErrorMsg(formatError(e2));
    }
  };

  const handleReferenceUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (brandData.reference_images.length >= 3) {
      alert("Limite de 3 imagens de referência atingido.");
      return;
    }

    try {
      setSaveStatus("saving");
      const compressed = await compressImageFile(file);
      const url = await uploadToStorage(compressed, `ref-${brandData.reference_images.length + 1}`);
      setBrandData((prev) => ({ ...prev, reference_images: [...prev.reference_images, url] }));
      setSaveStatus("saved");
    } catch (e2) {
      setSaveStatus("error");
      setErrorMsg(formatError(e2));
    }
  };

  const removeReference = (idx) => {
    setBrandData((prev) => ({
      ...prev,
      reference_images: prev.reference_images.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveBrand = async () => {
    if (!supabaseClient || !resolvedUserId) return;

    setSaveStatus("saving");
    setErrorMsg("");
    try {
      const basePayload = {
        logo_url: brandData.logo_url || null,
        colors: Array.isArray(brandData.colors) ? brandData.colors : ["#EA580C"],
        reference_images: safeJsonArray(brandData.reference_images),
        personality: brandData.personality || null,
        tone_of_voice: brandData.tone_of_voice || null,
      };

      // Preferido: user_id
      const attemptUserId = await supabaseClient
        .from("brand_settings")
        .upsert({ ...basePayload, user_id: resolvedUserId }, { onConflict: "user_id" });

      if (attemptUserId.error) {
        // Legado: id == userId
        if (
          String(attemptUserId.error?.message || "").includes("column") &&
          String(attemptUserId.error?.message || "").includes("user_id")
        ) {
          const attemptId = await supabaseClient
            .from("brand_settings")
            .upsert({ ...basePayload, id: resolvedUserId }, { onConflict: "id" });
          if (attemptId.error) throw attemptId.error;
        } else {
          throw attemptUserId.error;
        }
      }

      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      setErrorMsg(formatError(e));
    }
  };

  const handleAddColor = () => {
    const c = String(newColor || "").trim();
    if (!c) return;
    setBrandData((prev) => {
      const next = [...(prev.colors || []), c].slice(0, 6);
      return { ...prev, colors: next };
    });
  };

  const handleRemoveColor = (idx) => {
    setBrandData((prev) => ({
      ...prev,
      colors: (prev.colors || []).filter((_, i) => i !== idx),
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateFromPrompt = async (userPrompt) => {
    if (!supabaseClient || !resolvedUserId) {
      setErrorMsg("Você precisa estar logado.");
      return;
    }
    if (!String(userPrompt || "").trim()) return;
    if (!canUse) return;

    if (!env.geminiApiKey) {
      setErrorMsg("Gemini não configurado. Defina VITE_GEMINI_API_KEY no deploy.");
      return;
    }

    const isTextOnly = selectedFormat === "texto";
    const creditsToConsume = isTextOnly ? 1 : 10;

    if (credits < creditsToConsume) {
      setErrorMsg(`Créditos insuficientes. Necessário: ${creditsToConsume}.`);
      return;
    }

    setGenerating(true);
    setErrorMsg("");

    try {
      const prompt = String(userPrompt).trim();

      // 1) prepara contexto de marca
      const brandInfo = {
        colors: Array.isArray(brandData.colors) ? brandData.colors : ["#EA580C"],
        tone: brandData.tone_of_voice || "Profissional",
        personality: brandData.personality || "",
        logoUrl: brandData.logo_url || "",
        refs: safeJsonArray(brandData.reference_images),
      };

      const formatLabels = {
        texto: "caption only (no image)",
        quadrado: "1:1 square image",
        retrato_4x5: "3:4 portrait image",
        story: "9:16 story image",
      };

      const systemInstruction = isTextOnly
        ? `Você é um copywriter profissional. Escreva uma legenda em PT-BR para uma marca com: cores ${brandInfo.colors.join(", ")}; tom de voz ${brandInfo.tone}; personalidade ${brandInfo.personality}. Inclua hashtags relevantes. Não descreva imagens.`
        : `Você é um designer profissional. Gere uma imagem ${formatLabels[selectedFormat]} para uma marca com: cores ${brandInfo.colors.join(", ")}; tom de voz ${brandInfo.tone}; personalidade ${brandInfo.personality}. Incorpore o logo quando fornecido e siga a estética das referências. Também escreva uma legenda em PT-BR com hashtags. Retorne imagem e texto.`;

      const genAI = new GoogleGenAI({ apiKey: env.geminiApiKey });

      // 2) carrega refs/branding como base64 (apenas quando precisa de imagem)
      const lastMessageParts = [{ text: prompt }];

      let logoBase64 = null;
      let refsBase64 = [];

      if (!isTextOnly) {
        logoBase64 = brandInfo.logoUrl ? await urlToBase64(brandInfo.logoUrl) : null;
        refsBase64 = await Promise.all((brandInfo.refs || []).map((url) => urlToBase64(url).catch(() => null)));

        if (logoBase64) lastMessageParts.push({ inlineData: { mimeType: "image/png", data: logoBase64 } });
        (refsBase64 || []).forEach((data) => {
          if (data) lastMessageParts.push({ inlineData: { mimeType: "image/png", data } });
        });
      }

      const imageConfigMap = {
        quadrado: "1:1",
        retrato_4x5: "3:4",
        story: "9:16",
      };

      const config = {
        systemInstruction,
        generationConfig: {
          responseModalities: isTextOnly ? ["TEXT"] : ["TEXT", "IMAGE"],
        },
        ...(isTextOnly
          ? {}
          : {
              imageConfig: {
                aspectRatio: imageConfigMap[selectedFormat] || "1:1",
              },
            }),
      };

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ role: "user", parts: lastMessageParts }],
        config,
      });

      const parts = result?.candidates?.[0]?.content?.parts || [];
      let caption = "";
      let imageBase64 = "";

      parts.forEach((part) => {
        if (part?.text) caption += part.text;
        if (part?.inlineData?.data) imageBase64 = part.inlineData.data;
      });

      caption = String(caption || "").trim();

      // Alguns modelos / prompts podem devolver JSON como texto.
      // Aceitamos { caption, image } para compatibilidade com fluxos antigos.
      if (caption && (caption.startsWith("{") || caption.startsWith("["))) {
        try {
          const parsed = JSON.parse(caption);
          if (parsed && typeof parsed === "object") {
            if (typeof parsed.caption === "string" && parsed.caption.trim()) caption = parsed.caption.trim();
            if (!imageBase64 && typeof parsed.image === "string" && parsed.image.trim()) imageBase64 = parsed.image.trim();
          }
        } catch (_e) {
          // ignora (não era JSON)
        }
      }

      if (!caption && !imageBase64) {
        throw new Error("A resposta do Gemini veio vazia. Tente novamente com um prompt mais específico.");
      }

      let imageUrl = "";
      if (!isTextOnly && imageBase64) {
        const blob = await (await fetch(`data:image/png;base64,${imageBase64}`)).blob();
        const path = `midias/${resolvedUserId}/generated-${Date.now()}.png`;
        const { error: upErr } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, blob, {
          contentType: "image/png",
          upsert: true,
        });
        if (upErr) throw upErr;

        const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        imageUrl = data?.publicUrl || "";
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: caption || "(sem texto)",
          image: imageUrl,
          meta: { format: selectedFormat },
        },
      ]);

      // 3) consome crédito via RPC
      const { error: rpcErr } = await supabaseClient.rpc("consume_credits", {
        user_id_param: resolvedUserId,
        amount_to_consume: creditsToConsume,
        desc_param: isTextOnly ? "Texto (ideia/legenda)" : `Geração de imagem (${selectedFormat})`,
      });
      if (rpcErr) throw rpcErr;


      // 4) salva no histórico do gerador
      try {
        const { error: insErr } = await supabaseClient.from("generated_arts").insert({
          user_id: resolvedUserId,
          image_url: imageUrl || null,
          caption: caption || null,
          format: selectedFormat,
          prompt: prompt,
        });
        if (insErr) throw insErr;
      } catch (saveErr) {
        // não bloqueia o usuário se falhar salvar; apenas avisa.
        console.warn("Falha ao salvar em generated_arts:", saveErr);
      }

      await loadAll();

    } catch (e) {
      setErrorMsg(formatError(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!canUse || generating) return;

    const text = inputValue.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInputValue("");

    await generateFromPrompt(text);
  };

  if (!hasAccess) {
    return (
      <main className="max-w-5xl mx-auto animate-in fade-in">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Míd<span className="font-extrabold text-primary">IA</span>s (App)
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Módulo completo de Gestão de Mídias.</p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
            >
              Voltar
            </button>
          )}
        </header>

        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-foreground">Créditos necessários</div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Para usar o <strong className="text-foreground">Gestor de Mídias</strong>, selecione um pacote em{" "}
                <strong className="text-foreground">Assinatura → Créditos adicionais</strong> ou adicione créditos ao seu saldo.
              </p>
              {onOpenPlansTab && (
                <button
                  type="button"
                  onClick={onOpenPlansTab}
                  className="mt-3 inline-flex h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                >
                  Ver Assinatura
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto animate-in fade-in">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Míd<span className="font-extrabold text-primary">IA</span>s (App)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Gere criativos e legendas com base na sua marca.</p>
        </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-4 h-10">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Créditos:</span>
              <span className="text-sm font-semibold text-foreground">{credits}</span>
              {onOpenPlansTab && (
                <button
                  type="button"
                  onClick={onOpenPlansTab}
                  className="ml-2 text-xs font-semibold text-primary hover:underline"
                  title="Comprar créditos adicionais"
                >
                  Adicionar
                </button>
              )}
            </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm"
            >
              Voltar
            </button>
          )}
        </div>
      </header>

      {selectedCreditsPack > 0 && !canUse && !loading && (
        <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">
          <div className="font-semibold">Pacote selecionado — aguardando créditos</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Assim que os créditos entrarem no saldo, o chat libera automaticamente. Enquanto isso, você pode revisar sua Marca
            e histórico.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive-foreground p-4 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: main */}
        <section className="lg:flex-1 rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 overflow-hidden">
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl border border-border bg-background/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">Geração</div>
                <div className="text-xs text-muted-foreground">Prompt + formato → imagem e legenda</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("gerar")}
                className={
                  "h-9 px-4 rounded-full border text-sm transition-colors " +
                  (activeTab === "gerar"
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-background/60")
                }
              >
                Gerar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("marca")}
                className={
                  "h-9 px-4 rounded-full border text-sm transition-colors inline-flex items-center gap-2 " +
                  (activeTab === "marca"
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-background/60")
                }
              >
                <Palette className="w-4 h-4" /> Marca
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("historico")}
                className={
                  "h-9 px-4 rounded-full border text-sm transition-colors inline-flex items-center gap-2 " +
                  (activeTab === "historico"
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:bg-background/60")
                }
              >
                <HistoryIcon className="w-4 h-4" /> Histórico
              </button>
              <button
                type="button"
                onClick={loadAll}
                className="h-9 w-9 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors inline-flex items-center justify-center"
                title="Recarregar"
              >
                <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              </button>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : !supabaseClient || !resolvedUserId ? (
              <div className="rounded-2xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                Você precisa estar logado para usar este módulo.
              </div>
            ) : activeTab === "marca" ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Logo e referências
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    As imagens são enviadas para Storage e o banco guarda apenas as URLs.
                  </p>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="text-xs text-muted-foreground">Logo</div>
                      {brandData.logo_url ? (
                        <img
                          src={brandData.logo_url}
                          alt="Logo da marca"
                          className="mt-2 h-24 w-24 object-contain rounded-lg border border-border bg-background"
                          loading="lazy"
                        />
                      ) : (
                        <div className="mt-2 h-24 w-24 rounded-lg border border-border bg-background/40" />
                      )}
                      <label className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-xs cursor-pointer">
                        <Upload className="w-4 h-4" /> Enviar logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>

                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <div className="text-xs text-muted-foreground">Imagens de referência (até 3)</div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {brandData.reference_images.map((url, idx) => (
                          <div key={url + idx} className="relative">
                            <img
                              src={url}
                              alt={`Referência ${idx + 1}`}
                              className="h-20 w-full object-cover rounded-lg border border-border"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => removeReference(idx)}
                              className="absolute -top-2 -right-2 h-7 w-7 rounded-full border border-border bg-card/90 hover:bg-card text-foreground inline-flex items-center justify-center"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {brandData.reference_images.length < 3 && (
                          <label className="h-20 rounded-lg border border-border bg-background/40 hover:bg-background/60 transition-colors cursor-pointer flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
                          </label>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Dica: use referências do seu feed para manter consistência.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" /> Cores e personalidade
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Paleta (até 6)</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(brandData.colors || []).map((c, idx) => (
                          <button
                            key={c + idx}
                            type="button"
                            onClick={() => handleRemoveColor(idx)}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 h-9 text-xs text-foreground hover:bg-card"
                            title="Remover"
                          >
                            <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: c }} />
                            {c}
                            <Trash2 className="w-3.5 h-3.5 opacity-70" />
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="color"
                          value={newColor}
                          onChange={(e) => setNewColor(e.target.value)}
                          className="h-9 w-12 rounded-lg border border-border bg-background"
                          aria-label="Selecionar cor"
                        />
                        <button
                          type="button"
                          onClick={handleAddColor}
                          className="h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block">
                        <div className="text-xs text-muted-foreground">Tom de voz</div>
                        {(() => {
                          const presets = [
                            "Profissional",
                            "Amigável",
                            "Motivador",
                            "Divertido",
                            "Direto",
                            "Inspirador",
                            "Premium",
                          ];
                          const isCustom = Boolean(brandData.tone_of_voice) && !presets.includes(brandData.tone_of_voice);
                          const selectValue = isCustom ? "__custom__" : brandData.tone_of_voice;

                          return (
                            <div className="mt-1 space-y-2">
                              <select
                                value={selectValue || "Profissional"}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "__custom__") {
                                    setBrandData((p) => ({ ...p, tone_of_voice: "" }));
                                  } else {
                                    setBrandData((p) => ({ ...p, tone_of_voice: v }));
                                  }
                                }}
                                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                {presets.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                                <option value="__custom__">Personalizado…</option>
                              </select>

                              {(selectValue === "__custom__" || isCustom) && (
                                <input
                                  value={brandData.tone_of_voice}
                                  onChange={(e) => setBrandData((p) => ({ ...p, tone_of_voice: e.target.value }))}
                                  className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder="Ex.: acolhedor, técnico, irreverente…"
                                />
                              )}
                            </div>
                          );
                        })()}
                      </label>
                      <label className="block">
                        <div className="text-xs text-muted-foreground">Personalidade</div>
                        <textarea
                          value={brandData.personality}
                          onChange={(e) => setBrandData((p) => ({ ...p, personality: e.target.value }))}
                          className="mt-1 w-full min-h-[90px] rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Ex.: minimalista, premium, jovem, inspiradora…"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {saveStatus === "saving"
                        ? "Salvando…"
                        : saveStatus === "saved"
                          ? "Salvo."
                          : saveStatus === "error"
                            ? "Erro ao salvar."
                            : ""}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveBrand}
                      className="h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                    >
                      Salvar Marca
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === "historico" ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-border bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Histórico de criações</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        As novas artes entram automaticamente aqui (tempo real).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadAll}
                      className="h-9 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-xs font-semibold"
                    >
                      Atualizar
                    </button>
                  </div>

                  <div className="mt-4">
                    <GeneratedArtsHistoryList
                      items={generatedArts}
                      onOpenDetails={(art) => {
                        setSelectedArt(art);
                        setDetailsOpen(true);
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-background/40 p-4">
                  <div className="text-sm font-semibold text-foreground">Extrato de créditos</div>
                  <p className="mt-1 text-xs text-muted-foreground">Registro das últimas movimentações.</p>

                  <div className="mt-3 space-y-2">
                    {creditHistory.length === 0 ? (
                      <div className="rounded-2xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                        Sem transações ainda.
                      </div>
                    ) : (
                      creditHistory.map((row) => (
                        <div key={row.id} className="rounded-2xl border border-border bg-background/40 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-foreground">{row.description || "—"}</div>
                            <div className="text-sm font-semibold text-foreground">{row.amount}</div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* (removido) Top bar duplicado dentro da aba Gerar */}

                {/* Formato */}
                <div className="rounded-3xl border border-border bg-card/60 overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Selecione o formato</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Consumo: <span className="text-foreground font-semibold">{selectedFormat === "texto" ? "1" : "10"} créditos</span>
                        </div>
                      </div>

                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        {brandData.logo_url ? "Logo ativa ✓" : "Logo ausente"} · {brandData.reference_images.length}/3 referências
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(() => {
                        const items = [
                          { id: "texto", label: "Texto IA", icon: Type, meta: "só texto" },
                          { id: "quadrado", label: "Quadrado", icon: Square, meta: "1:1" },
                          { id: "retrato_4x5", label: "Retrato (4:5)", icon: RectangleVertical, meta: "3:4" },
                          { id: "story", label: "Story (9:16)", icon: Smartphone, meta: "9:16" },
                        ];
                        return items.map((it) => {
                          const active = selectedFormat === it.id;
                          const Icon = it.icon;
                          return (
                            <button
                              key={it.id}
                              type="button"
                              onClick={() => setSelectedFormat(it.id)}
                              className={
                                "h-12 px-4 rounded-2xl border text-sm font-semibold transition-colors inline-flex items-center gap-2 " +
                                (active
                                  ? "border-primary/40 bg-primary/10 text-foreground"
                                  : "border-border bg-background/30 text-muted-foreground hover:bg-background/50 hover:text-foreground")
                              }
                            >
                              <Icon className={"w-4 h-4 " + (active ? "text-primary" : "")} />
                              {it.label}
                              <span className={"ml-1 text-[11px] font-medium " + (active ? "text-muted-foreground" : "text-muted-foreground")}>({it.meta})</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Chat */}
                  <div className="p-5">
                    <section className="rounded-3xl border border-border bg-background/30 overflow-hidden">
                      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl border border-border bg-background/40 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">Assistente Criativo</div>
                            <div className="text-[11px] uppercase tracking-widest text-muted-foreground truncate">
                              Conversational AI Interface
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                          <span className="text-[11px] uppercase tracking-widest text-success">Online</span>
                        </div>
                      </div>

                      <div
                        className={
                          "flex flex-col " +
                          (messages.length <= 2 ? "h-[460px] md:h-[440px]" : "h-[70vh] md:h-[560px]")
                        }
                      >
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 chat-scroll">
                          {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[82%] rounded-3xl px-5 py-4 space-y-3 ${
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card/60 text-foreground border border-border"
                                }`}
                              >
                                {msg.image ? (
                                  <img
                                    src={msg.image}
                                    alt="Imagem gerada"
                                    className="w-full max-h-[420px] object-contain rounded-2xl border border-border bg-background"
                                    loading="lazy"
                                  />
                                ) : null}
                                {msg.content ? (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>

                        <div className="border-t border-border p-4 bg-background/40">
                          <form onSubmit={handleSend} className="flex items-end gap-3">
                            <textarea
                              rows={1}
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onInput={(e) => {
                                // auto-resize
                                const el = e.currentTarget;
                                el.style.height = "0px";
                                el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
                              }}
                              onKeyDown={(e) => {
                                if (!canUse) return;
                                // Envia com Enter, quebra linha com Shift+Enter
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSend(e);
                                }
                              }}
                              disabled={!canUse}
                              placeholder={
                                canUse
                                  ? "Descreva sua ideia com detalhes… (ex: Post elegante para joalheria)"
                                  : "Upgrade necessário"
                              }
                              className="flex-1 min-h-14 max-h-[240px] rounded-3xl border border-border bg-background/40 px-6 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed resize-none leading-relaxed overflow-y-auto"
                            />
                            <button
                              type="submit"
                              disabled={!canUse || generating || !inputValue.trim()}
                              className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Enviar"
                            >
                              {generating ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                <Send className="w-5 h-5" />
                              )}
                            </button>
                          </form>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            Enter para enviar • Shift+Enter para nova linha
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: tips */}
        <aside className="lg:w-[360px] space-y-6">
          <div className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-5">
            <div className="text-sm font-semibold text-foreground">Boas práticas</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Envie 1–3 referências do seu feed para manter consistência.</li>
              <li>• Inclua objetivo, oferta, público e CTA no prompt.</li>
              <li>• Salve sua marca antes de gerar para melhor resultado.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-5">
            <div className="text-sm font-semibold text-foreground">Postar agora / Agendar</div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Para postar ou agendar publicações direto por aqui, conecte seu <span className="text-foreground">Instagram API (Meta)</span>.
              Cada <span className="text-foreground">postagem</span> ou <span className="text-foreground">agendamento</span> consome{" "}
              <span className="text-foreground font-semibold">20 créditos</span>.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={credits > 0 ? onOpenInstagramConnect : undefined}
                disabled={credits <= 0 || !onOpenInstagramConnect}
                className="h-10 px-4 rounded-full border border-border bg-background/40 text-foreground hover:bg-background/60 transition-colors text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                title={credits <= 0 ? "Disponível quando você tiver créditos" : "Conectar Instagram API (Meta)"}
              >
                {credits <= 0 ? <AlertCircle className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                Conectar Instagram (Meta)
              </button>

              <button
                type="button"
                onClick={onOpenConnectionsTab}
                disabled={!onOpenConnectionsTab}
                className="h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Ir para Conexões
              </button>
            </div>

            {credits <= 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                Dica: compre um pacote em <span className="text-foreground">Assinatura</span> para liberar a conexão e começar a postar/agendar.
              </div>
            )}
          </div>
        </aside>
      </div>

      <GeneratedArtDetailsModal
        open={detailsOpen}
        art={selectedArt}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedArt(null);
        }}
      />
    </main>
  );
}
