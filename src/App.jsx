// Update v1.719
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminTrialPanel from "./components/admin/AdminTrialPanel.jsx";
import HomeAIStart from "./components/HomeAIStart.jsx";
import ConnectionsPage from "./components/ConnectionsPage.jsx";
import MidiasPage from "./components/MidiasPage.jsx";
import MidiasAppPage from "./components/MidiasAppPage.jsx";
import LandingPage from "./components/LandingPage.jsx";
import { supabase as supabaseClient } from "@/lib/supabaseClient";
import { env } from "@/config/env";

import {
  Dumbbell,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Save,
  CreditCard,
  LogOut,
  User,
  CheckCircle2,
  BrainCircuit,
  Smartphone,
  QrCode,
  PhoneCall,
  Calendar,
  DollarSign,
  Upload,
  ShieldAlert,
  RefreshCw,
  Minus,
  Plus,
  MapPin,
  Trash2,
  Mic,
  Users,
  Image as ImageIcon,
  ExternalLink,
  HelpCircle,
  History,
  Instagram,
  Wifi,
  Eye,
  EyeOff,
  Power,
  LayoutList,
  ShoppingCart,
  X,
  Loader2,
  MessageCircle,
  Menu,
  CheckSquare,
  Beaker,
  Send,
  Globe,
  RotateCcw,
  Unplug,
  Star,
  ChevronDown,
  ChevronUp,
  Rocket,
  Clock,
  Check,
  Lock,
  PlayCircle,
  Tag,
  Facebook,
  Gift,
  ArrowLeft,
} from "lucide-react";

// ==========================================
// ⚙️ CONFIG (migre para env no Vercel)
// ==========================================
const SUPER_ADMIN_EMAIL = "noreply@monarcahub.com";

// DURAÇÃO DO TRIAL EM HORAS
const TRIAL_HOURS = 48;

// Link do Vídeo Tutorial
const TUTORIAL_VIDEO_ID = "2rgyPJzZXQg";

// Webhooks do n8n
const WEBHOOK_SALES_URL = "https://webhook.monarcahub.com/webhook/assinar";
const WEBHOOK_EVOLUTION_URL = "https://webhook.monarcahub.com/webhook/evo-manager-v4all";
const WEBHOOK_QR_HTML_URL = "https://webhook.monarcahub.com/webhook/qrcode";
const WEBHOOK_SIGNUP_SYNC_URL = "https://webhook.monarcahub.com/webhook/signup-sync";

// Configurações do Chatwoot
const CHATWOOT_BASE_URL = "https://chat.monarcahub.com";
const CHATWOOT_TOKEN = "mQv55WtU3obZ6HpzYfyor4sn";

const WHATSAPP_SALES_NUMBER = "5555996079863";

// Configurações Meta Embedded Signup (API Oficial)
const META_APP_ID = "1322580525486349";
// Config IDs (Meta) - Embedded Signup
// - WhatsApp only
const META_CONFIG_ID_WHATSAPP = "1772141070125396";
// - Instagram only
const META_CONFIG_ID_INSTAGRAM = "1386103829450334";
// - WhatsApp + Instagram
const META_CONFIG_ID_BOTH = "878421224769472";
const WEBHOOK_META_SETUP_URL = "https://webhook.monarcahub.com/webhook/whatsapp-setup";

// ==========================================
// HELPERS
// ==========================================
const getCleanInstanceName = (email) => {
  if (!email) return "";
  const namePart = email.split("@")[0];
  return namePart.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
};

// Nova Lógica de Nomes de Planos Baseada no Valor
const getPlanNameByPrice = (price, currentPlanType) => {
  // Se estiver no período de trial e não tiver pago nada ainda
  if (currentPlanType === "trial_7_days") return "Trial Grátis";

  if (price <= 250) return "Plano Base";
  if (price <= 700) return "Plano Start";
  if (price <= 1250) return "Plano Premium";
  return "Enterprise";
};

const isSubscriptionActive = (status) => {
  if (!status) return false;
  const s = status.toString().toLowerCase().trim();
  return ["active", "completed", "approved", "paid", "succeeded"].includes(s);
};

// Cálculo atualizado com desconto de Onboarding
const calculateTotal = (
  data,
  extraChannels,
  extraUsers,
  extraCreditsCost = 0,
  couponDiscount = 0,
  onboardingDiscount = 0,
) => {
  let total = 250;
  if (!data) return total;

  // Adicionais
  if (data.branches && data.branches.length > 0) total += data.branches.length * 150;
  if (data.omnichannel) total += 150;
  if (data.integrate_agenda) total += 50;
  if (data.recognize_payments) total += 50;
  if (data.mass_sender_active) total += 150;
  if (data.use_official_api_coexistencia) total += 50;
  if (data.use_official_api_somente) total += 150;

  // Extras
  total += (extraChannels || 0) * 50;
  total += (extraUsers || 0) * 50;
  total += extraCreditsCost || 0;

  // Aplica descontos
  let totalDiscount = couponDiscount + onboardingDiscount;
  total = total - totalDiscount;

  return Math.max(0, Math.ceil(total)); // Garante que não fique negativo
};

// ===============================
// Retenção (Disparos em massa)
// ===============================
const MIN_TOTAL_FOR_RETENTION = 300;

const normalizePhone = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits;
};

const parseContactsFromText = (rawText) => {
  const text = String(rawText ?? "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Limite de segurança para não explodir payload / UX
  const limited = lines.slice(0, 500);

  const contacts = [];

  for (const line of limited) {
    // Aceita formatos:
    // "Nome - 5511999998888" | "Nome, 5511..." | "Nome; 5511..." | "5511..."
    const parts = line.split(/\s*[-,;|\t]\s*/).filter(Boolean);
    const maybePhone = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const phone = normalizePhone(maybePhone);

    if (!phone || phone.length < 8) continue;

    const name = parts.length > 1 ? parts.slice(0, -1).join(" ").trim() : "";
    contacts.push({ name: name || null, phone });
  }

  return contacts;
};

// ==========================================
// COMPONENTES VISUAIS (UI)
// ==========================================
const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }) => {
  const variants = {
    primary:
      "bg-orange-400 hover:bg-orange-500 text-white shadow-md shadow-orange-500/20 border-b-2 border-orange-600 active:border-b-0 active:translate-y-0.5",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700",
    success: "bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/20",
    outline: "border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
    whatsapp: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30 border-b-2 border-green-800",
    facebook: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 border-b-2 border-blue-800",
    admin: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30",
    disabled: "bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${disabled ? variants.disabled : variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const InputGroup = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  multiline = false,
  helpText,
  required = false,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="mb-5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <div className="relative">
        {multiline ? (
          <textarea
            className={`w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 outline-none transition-all min-h-[100px] text-sm leading-relaxed ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            required={required}
            disabled={disabled}
            readOnly={disabled}
          />
        ) : (
          <input
            type={isPassword ? (showPassword ? "text" : "password") : type}
            className={`w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 outline-none transition-all text-sm pr-10 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            required={required}
            disabled={disabled}
            readOnly={disabled}
          />
        )}
        {isPassword && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {helpText && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-500 bg-gray-800/50 p-2 rounded border border-gray-700/50">
          <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-orange-400/70" />
          <span>{helpText}</span>
        </div>
      )}
    </div>
  );
};

const CheckboxGroup = ({
  label,
  subLabel,
  checked,
  onChange,
  icon: Icon,
  priceTag,
  disabled = false,
  locked = false,
  onLockedClick,
}) => (
  <div
    onClick={() => {
      if (disabled) {
        if (locked && onLockedClick) onLockedClick();
        return;
      }
      onChange(!checked);
    }}
    className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all ${
      disabled
        ? "bg-gray-900/50 border-gray-700 opacity-60 cursor-not-allowed"
        : checked
          ? "bg-orange-500/10 border-orange-500/40 cursor-pointer"
          : "bg-gray-900 border-gray-700 hover:border-gray-600 cursor-pointer"
    }`}
  >
    <div
      className={`mt-1 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${checked ? "bg-orange-500 border-orange-500" : "border-gray-500"}`}
    >
      {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start gap-3">
        <div className="text-sm text-gray-200 font-medium flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          {label}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {locked && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border bg-gray-800 text-gray-300 border-gray-600">
              <Lock className="w-3 h-3" /> Bloqueado
            </span>
          )}
          {priceTag && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${checked ? "bg-green-500/20 text-green-400 border-green-500/20" : "bg-gray-800 text-gray-400 border-gray-600"}`}
            >
              {priceTag}
            </span>
          )}
        </div>
      </div>
      {subLabel && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{subLabel}</p>}
    </div>
  </div>
);

const Card = ({ title, children, icon: Icon, action, className = "" }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl ${className}`}>
    <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-6 h-6 text-orange-400" />}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

// ==========================================
// COMPONENTE: CHECKLIST ONBOARDING (COM RECOMPENSAS)
// ==========================================
const OnboardingChecklist = ({ gymData, connectionStatus, planType, goToPlans, openVideo, setOnboardingDiscount }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const isTrained = gymData.opening_hours && gymData.pricing_info && gymData.opening_hours.length > 5;
  const isConnected = connectionStatus === "connected" || gymData.ai_active_instagram;
  const isAiActive = gymData.ai_active;
  const isUpgraded = planType && planType !== "trial_7_days";

  // Cálculo do desconto ganho
  const discountTotal = (isTrained ? 25 : 0) + (isConnected ? 25 : 0) + (isAiActive ? 50 : 0);

  // Passa o valor do desconto para o componente pai
  useEffect(() => {
    setOnboardingDiscount(discountTotal);
  }, [discountTotal, setOnboardingDiscount]);

  if (planType !== "trial_7_days") return null;

  const steps = [
    { id: 1, label: "Treinar IA (Horários e Preços)", done: isTrained, reward: 25 },
    { id: 2, label: "Conectar WhatsApp (API MonarcaHub)", done: isConnected, reward: 25 },
    { id: 3, label: "Ativar IA e testar", done: isAiActive, reward: 50 },
    { id: 4, label: "Fazer upgrade e Lançar", done: isUpgraded, action: true },
  ];

  const completed = steps.filter((s) => s.done).length;
  const progress = (completed / steps.length) * 100;

  return (
    <div className="bg-gray-900 border border-orange-500/40 rounded-xl mb-6 overflow-hidden shadow-lg transition-all duration-300">
      <div
        className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <CheckSquare className="w-6 h-6 text-orange-400" />
            {completed === 4 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></span>
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              Primeiros Passos
              {discountTotal > 0 && (
                <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/30">
                  Economize R$ {discountTotal}
                </span>
              )}
            </h3>
            <div className="w-32 h-1.5 bg-gray-700 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openVideo();
            }}
            className="text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-blue-500/30 transition-colors z-20"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Tutorial
          </button>
          <button
            className="text-gray-400 hover:text-white p-1 z-20"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-2 border-t border-gray-800 bg-gray-900/50">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${step.done ? "bg-green-900/10 border-green-900/30 text-green-200" : "bg-gray-800 border-gray-700 text-gray-300"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step.done ? "bg-green-500 text-white" : "bg-gray-700 text-gray-400"}`}
                >
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </div>
                <span className={`text-sm ${step.done ? "line-through opacity-60" : ""}`}>{step.label}</span>
              </div>

              <div className="flex items-center gap-2">
                {step.reward && (
                  <span
                    className={`text-xs px-2 py-1 rounded border ${step.done ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-700 text-gray-500 border-gray-600"}`}
                  >
                    {step.done ? `Ganhou R$ ${step.reward} OFF` : `Ganhe R$ ${step.reward}`}
                  </span>
                )}

                {step.action && !step.done && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPlans();
                    }}
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md flex items-center gap-1"
                  >
                    <Rocket className="w-3 h-3" /> Ir
                  </button>
                )}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-gray-500 text-center pt-2">
            Complete as etapas para garantir o menor preço no Plano Base.
          </p>
        </div>
      )}
    </div>
  );
};

const TrialTimer = ({ endsAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!endsAt) return;

    const endDate = new Date(endsAt);
    if (Number.isNaN(endDate.getTime())) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = endDate - now;

      if (diff <= 0) {
        setTimeLeft("Expirado");
        clearInterval(interval);
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (totalDays > 0) {
        setTimeLeft(`${totalDays}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  return <span className="font-mono font-bold text-orange-400">{timeLeft}</span>;
};

// ... (Modais Checkout, HighTicket, QrCode) ...
const CheckoutModal = ({ isOpen, onClose, htmlContent, isProcessing, errorMsg }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (isOpen && htmlContent && containerRef.current) {
      const scripts = containerRef.current.getElementsByTagName("script");
      Array.from(scripts).forEach((script) => {
        const newScript = document.createElement("script");
        Array.from(script.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(script.innerHTML));
        script.parentNode.replaceChild(newScript, script);
      });
    }
  }, [isOpen, htmlContent]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      {" "}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {" "}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-1 rounded-full z-10"
        >
          <X className="w-5 h-5" />
        </button>{" "}
        <div className="p-8 text-center">
          {" "}
          {isProcessing ? (
            <div className="py-10">
              <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Processando seu Pedido</h3>
              <p className="text-gray-400 text-sm">Conectando com Ambiente Seguro Hotmart...</p>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <ShoppingCart className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white">Finalizar Assinatura</h3>
              </div>
              {errorMsg ? (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-gray-300">
                  <p className="text-red-400 font-bold mb-2">Não foi possível abrir o checkout automático.</p>
                  <a
                    href={`https://wa.me/${WHATSAPP_SALES_NUMBER}?text=Ol%C3%A1%2C%20gostaria%20de%20assinar%20o%20plano%20IARA%20Gym.`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" /> Falar com Suporte
                  </a>
                </div>
              ) : (
                <>
                  <div
                    ref={containerRef}
                    className="prose prose-invert max-w-none text-gray-300 text-sm bg-gray-800 p-4 rounded-lg min-h-[150px] flex flex-col items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                  <div className="mt-4 text-xs text-gray-500">Ambiente Seguro Hotmart</div>
                </>
              )}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
const HighTicketModal = ({ isOpen, onClose, total }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      {" "}
      <div className="bg-gray-900 border border-orange-500/50 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {" "}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-1 rounded-full z-10"
        >
          <X className="w-5 h-5" />
        </button>{" "}
        <div className="p-8 text-center">
          {" "}
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/20">
            <Smartphone className="w-10 h-10 text-white" />
          </div>{" "}
          <h3 className="text-2xl font-bold text-white mb-2">Plano Personalizado</h3>{" "}
          <p className="text-gray-400 text-sm mb-6">
            Seu plano atingiu o valor de <span className="text-white font-bold">R$ {total}</span>.<br />
            Para oferecer as melhores condições, finalizamos este pedido via atendimento humano.
          </p>{" "}
          <a
            href={`https://wa.me/${WHATSAPP_SALES_NUMBER}?text=Ol%C3%A1%2C%20gostaria%20de%20fechar%20meu%20plano%20Enterprise%20no%20valor%20de%20R%24${total}.`}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg transform hover:scale-105"
          >
            <MessageCircle className="w-6 h-6" /> Falar com Consultor no WhatsApp
          </a>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
const QrCodeModal = ({ isOpen, onClose, instanceName, connectionStatus, qrCodeBase64, isGenerating }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      {" "}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col">
        {" "}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 bg-gray-200 p-1 rounded-full z-10"
        >
          <X className="w-5 h-5" />
        </button>{" "}
        <div className="p-6 text-center bg-gray-50 border-b border-gray-200">
          {" "}
          <h3 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <QrCode className="w-6 h-6 text-orange-500" /> Conectar WhatsApp
          </h3>{" "}
          <p className="text-sm text-gray-500 mt-1">Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar</p>{" "}
          <p className="text-xs text-orange-400 mt-2 font-mono">ID: {instanceName}</p>{" "}
        </div>{" "}
        <div className="flex-1 bg-white p-4 flex items-center justify-center min-h-[350px]">
          {" "}
          {connectionStatus === "connected" ? (
            <div className="text-center">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-green-600">Conectado!</h3>
              <p className="text-gray-500 mt-2">Sincronização concluída.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center">
              {" "}
              {qrCodeBase64 ? (
                <img
                  src={qrCodeBase64}
                  alt="QR Code WhatsApp para conectar número"
                  className="w-64 h-64 object-contain border-4 border-gray-100 rounded-lg"
                />
              ) : isGenerating ? (
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Gerando nova conexão segura...</p>
                  <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns segundos.</p>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">Aguardando solicitação...</div>
              )}{" "}
            </div>
          )}{" "}
        </div>{" "}
        <div className="p-4 bg-gray-100 text-center border-t border-gray-200">
          {" "}
          {connectionStatus === "connected" ? (
            <Button onClick={onClose} variant="success" className="w-full">
              Fechar e Começar
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin text-orange-500" /> Verificando status automaticamente...
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
const VideoModal = ({ isOpen, onClose, videoId }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      {" "}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl relative overflow-hidden flex flex-col">
        {" "}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-800/50">
          {" "}
          <h3 className="text-white font-bold flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-blue-400" /> Tutorial IARA Gym
          </h3>{" "}
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-700 p-1 rounded-full">
            <X className="w-5 h-5" />
          </button>{" "}
        </div>{" "}
        <div className="aspect-video w-full bg-black">
          {" "}
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="Tutorial Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};

const OnboardingStepsModal = ({
  isOpen,
  onClose,
  gymData,
  connectionStatus,
  planType,
  goToPlans,
  openVideo,
  setOnboardingDiscount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-1 rounded-full z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Primeiros passos</h2>
              <p className="text-sm text-gray-400 mt-1">
                Complete as etapas para garantir desconto e finalizar sua assinatura.
              </p>
            </div>
          </div>

          <OnboardingChecklist
            gymData={gymData}
            connectionStatus={connectionStatus}
            planType={planType}
            goToPlans={goToPlans}
            openVideo={openVideo}
            setOnboardingDiscount={setOnboardingDiscount}
          />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// AUTH SCREEN
// ==========================================
const AuthScreen = ({ onLogin, initialMode = "login", onBackToLanding }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!supabaseClient) {
      setError("Erro: Supabase não iniciado.");
      setLoading(false);
      return;
    }
    try {
      let result;
      if (isSignUp)
        result = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { full_name: "Novo Cliente" } },
        });
      else result = await supabaseClient.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (isSignUp && !result.data.session) setError("Cadastro realizado! Verifique seu email.");
      else if (result.data.user) {
        fetch(WEBHOOK_SIGNUP_SYNC_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password, user_id: result.data.user.id }),
        }).catch(() => {});
        onLogin(result.data.session);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2"
            aria-label="Ir para a página inicial"
          >
            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 overflow-hidden">
              <img
                src="/favicon.png"
                alt="Logo IARA"
                className="w-7 h-7 object-contain"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
            <span className="text-white font-bold">IARA</span>
          </button>

          <div className="w-10 h-10" aria-hidden="true" />
        </div>
        <div className="text-center mb-8">
          <p className="text-gray-400 mt-2">
            {isSignUp ? "Crie sua conta e configure sua IA" : "Acesse o painel do seu Negócio"}
          </p>
        </div>
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm text-center border border-red-500/20 w-full">
            {error}
          </div>
        )}{" "}
        <form onSubmit={handleAuth} className="w-full">
          {" "}
          <InputGroup
            label="Email Corporativo"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />{" "}
          <InputGroup
            label="Senha"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />{" "}
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "Processando..." : isSignUp ? "Criar Conta Grátis" : "Entrar no Painel"}
          </Button>{" "}
        </form>{" "}
        <div className="mt-6 text-center">
          {" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-sm text-orange-400 hover:underline"
          >
            {isSignUp ? "Já tem uma conta? Faça Login" : "Não tem cadastro? Teste Grátis"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState("landing");

  // Para deploy (Vercel), usamos o SDK via npm (sem carregar via <script>), então já está disponível.
  const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

  // Script FB SDK e Chatwoot
  // - Deslogado (página inicial): expanded_bubble + "Converse com a IARA"
  // - Logado (plataforma): padrão, sem texto (mais discreto)
  useEffect(() => {
    // Apenas na landing (marketing): expanded_bubble + título
    // Em login/cadastro e dentro da plataforma: balão padrão, sem texto
    const isMarketingLanding = !session && authView === "landing";

    window.chatwootSettings = {
      position: "right",
      type: isMarketingLanding ? "expanded_bubble" : "standard",
      launcherTitle: isMarketingLanding ? "Converse com a IARA" : "",
    };

    const existing = document.getElementById("chatwoot-sdk");
    if (existing) {
      // Se o SDK já está carregado, reaplica config (ex.: após login)
      if (window.chatwootSDK) {
        window.chatwootSDK.run({ websiteToken: CHATWOOT_TOKEN, baseUrl: CHATWOOT_BASE_URL });
      }
      return;
    }

    (function (d, t) {
      var g = d.createElement(t),
        s = d.getElementsByTagName(t)[0];
      g.id = "chatwoot-sdk";
      g.src = CHATWOOT_BASE_URL + "/packs/js/sdk.js";
      g.defer = true;
      g.async = true;
      s.parentNode.insertBefore(g, s);
      g.onload = function () {
        if (window.chatwootSDK) {
          window.chatwootSDK.run({ websiteToken: CHATWOOT_TOKEN, baseUrl: CHATWOOT_BASE_URL });
        }
      };
    })(document, "script");
  }, [session, authView]);

  useEffect(() => {
    if (!isConfigured) return;
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => setSession(session));
    supabaseClient.auth.getSession().then(({ data: { session } }) => setSession(session));
    return () => subscription.unsubscribe();
  }, [isConfigured]);

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center flex-col text-white p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-red-400 mb-4" />
        <h1 className="text-xl font-bold mb-2">Configuração Pendente</h1>
        <p className="text-gray-400">Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente de deploy.</p>
      </div>
    );
  }

  if (!session) {
    if (authView === "landing") {
      return <LandingPage onOpenLogin={() => setAuthView("login")} onOpenSignup={() => setAuthView("signup")} />;
    }

    return (
      <AuthScreen
        initialMode={authView}
        onBackToLanding={() => setAuthView("landing")}
        onLogin={(sess) => setSession(sess)}
      />
    );
  }
  return <Dashboard session={session} />;
}

function Dashboard({ session }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabToPath = (tab) => {
    switch (tab) {
      case "dashboard":
        return "/";
      case "training":
        return "/treinar-ia";
      case "connections":
        return "/conexoes";
      case "midias":
        return "/midias";
      case "midias_app":
        return "/midias/app";
      case "plans":
        return "/assinatura";
      case "account":
        return "/minha-conta";
      case "admin":
        return "/admin";
      default:
        return "/";
    }
  };

  const pathToTab = (pathname) => {
    const path = String(pathname || "").toLowerCase();
    if (path === "/") return "dashboard";
    if (path === "/treinar-ia") return "training";
    if (path === "/conexoes") return "connections";
    if (path === "/midias") return "midias";
    if (path === "/midias/app") return "midias_app";
    if (path === "/assinatura") return "plans";
    if (path === "/minha-conta") return "account";
    if (path === "/admin") return "admin";
    return null;
  };

  const [activeTab, _setActiveTab] = useState(() => pathToTab(location.pathname) || "dashboard");
  const setActiveTab = (tab) => {
    _setActiveTab(tab);
    navigate(tabToPath(tab));
  };

  useEffect(() => {
    const next = pathToTab(location.pathname);
    if (!next) {
      navigate("/", { replace: true });
      _setActiveTab("dashboard");
      return;
    }
    _setActiveTab(next);
  }, [location.pathname]);

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const isSuperAdmin = session.user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const userId = session.user.id;
  const instanceName = getCleanInstanceName(session.user.email);

  const [connectionStep, setConnectionStep] = useState("disconnected");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [instanceCode, setInstanceCode] = useState("");
  const [trialInfo, setTrialInfo] = useState({ hoursLeft: 48, status: "active", endsAt: null, source: "default" });
  const [subscriptionInfo, setSubscriptionInfo] = useState({ plan_type: "trial_7_days", status: "active" });
  const [extraChannels, setExtraChannels] = useState(0);
  const [extraCreditsPack, setExtraCreditsPack] = useState(0); // 0 | 100 | 500 | 1000
  const [creditsBalance, setCreditsBalance] = useState(0);

  // MídIAs (subdomínio): redireciona automaticamente quando o usuário tiver créditos ativos.
  const MIDIAS_SUBDOMAIN_URL = "https://midias.monarcahub.com/";
  const hasMidiasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasMidiasRedirectedRef.current) return;
    if ((activeTab === "midias" || activeTab === "midias_app") && creditsBalance > 0) {
      hasMidiasRedirectedRef.current = true;
      window.location.assign(MIDIAS_SUBDOMAIN_URL);
    }
  }, [activeTab, creditsBalance]);

  const [logs, setLogs] = useState([]);
  const [trainingError, setTrainingError] = useState("");
  const [instagramError, setInstagramError] = useState("");

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isQrGenerating, setIsQrGenerating] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHighTicketOpen, setIsHighTicketOpen] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // CUPONS
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [savedCoupon, setSavedCoupon] = useState(null);
  // NOVO: Desconto por Gamificação
  const [onboardingDiscount, setOnboardingDiscount] = useState(0);

  const extraCreditsCost =
    extraCreditsPack === 100 ? 50 : extraCreditsPack === 500 ? 150 : extraCreditsPack === 1000 ? 250 : 0;

  const [isTestModeOpen, setIsTestModeOpen] = useState(false);
  const [isOfficialApiOpen, setIsOfficialApiOpen] = useState(false);

  // Identificação Chatwoot
  useEffect(() => {
    if (window.$chatwoot && session.user) {
      window.$chatwoot.setUser(session.user.id, {
        email: session.user.email,
        name: session.user.email.split("@")[0],
        identifier_hash: "",
      });
    }
  }, [session]);

  const VALID_COUPONS = { IARA50: 50, PROMO100: 100, PARCEIRO: 150, MONARCA200: 200 };
  const MIN_TOTAL_FOR_COUPON = 250;

  const handleApplyCoupon = () => {
    const code = coupon.toUpperCase().trim();
    const amount = VALID_COUPONS[code];

    // Regra: cupom só vale para compras acima de R$ 250 (valor do plano sem descontos).
    // Obs: aqui não consideramos descontos (cupom/onboarding) na elegibilidade.
    const totalWithoutDiscounts = calculateTotal(
      gymData,
      extraChannels,
      gymData.extra_users_count,
      extraCreditsCost,
      0,
      0,
    );

    if (!amount) {
      setAppliedCoupon(null);
      setCouponError("Cupom inválido ou expirado.");
      return;
    }

    if (totalWithoutDiscounts <= MIN_TOTAL_FOR_COUPON) {
      setAppliedCoupon(null);
      setCouponError("Cupom válido apenas para planos acima de R$ 250.");
      return;
    }

    setAppliedCoupon({ code, amount });
    setCouponError("");
  };

  const [gymData, setGymData] = useState({
    gym_name: "",
    phone: "",
    pix_key: "",
    address: "",
    branches: [],
    opening_hours: "",
    pricing_info: "",
    faq_text: "",
    tone_of_voice: "Motivador e energético.",
    observations: "",
    allow_calls: false,
    reply_groups: false,
    reply_audio: true,
    send_images: false,
    integrate_agenda: false,
    recognize_payments: false,
    omnichannel: false,
    connection_status: "disconnected",
    logo_url: null,
    email: session.user.email,
    password: "",
    needs_reprocessing: true,
    ai_active: false,
    ai_active_instagram: false,
    test_number: "",
    mass_sender_active: false,
    // Retenção: agora o usuário informa contatos direto (1 por linha) + mensagem/orientação
    mass_sender_contacts: "",
    mass_sender_message: "",
    mass_sender_days: "",
    mass_sender_hours: "",
    mass_sender_interval: "5min",
    use_official_api: false,
    extra_users_count: 0,
    instagram_status: "disconnected",
  });

  // Acesso ao Gestor de Mídias:
  // - saldo de créditos no perfil, OU
  // - pacote mensal selecionado (persistido), OU
  // - compatibilidade com contas antigas (`ia_gestor_midias`)
  const hasMidiasUpgrade = Boolean(creditsBalance > 0 || extraCreditsPack > 0 || gymData.ia_gestor_midias);

  const [initialGymData, setInitialGymData] = useState(null);
  // CRÍTICO: Bloquear autosaves enquanto dados estão carregando
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const isTrialExpired = trialInfo.status === "expired" && subscriptionInfo.plan_type === "trial_7_days";
  const forcedTrialPauseRef = useRef(false);

  const handleTrialExpired = async () => {
    if (!isTrialExpired) return;

    // Evita loops (ex: re-render, Timer, etc.)
    if (forcedTrialPauseRef.current) return;
    forcedTrialPauseRef.current = true;

    try {
      // Força IA pausada no banco (n8n depende disso)
      setGymData((prev) => ({ ...prev, ai_active: false }));
      await handlePartialSave({ ai_active: false });

      // (Opcional) se estiver conectado via MonarcaHub, desloga para garantir que não rode nada no trial expirado
      if (connectionStatus === "connected") {
        setConnectionStatus("disconnected");
        setConnectionStep("disconnected");
        setGymData((prev) => ({ ...prev, connection_status: "disconnected" }));
        await callEvolutionManager("logout");
        await handlePartialSave({ ai_active: false, connection_status: "disconnected" });
      }
    } catch (e) {
      console.error("Falha ao forçar pausa no trial expirado:", e);
    }
  };

  useEffect(() => {
    if (!isTrialExpired) {
      forcedTrialPauseRef.current = false;
      return;
    }
    handleTrialExpired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrialExpired]);

  const normalizeQrSrc = (raw) => {
    if (!raw) return "";
    const s = String(raw);
    if (s.startsWith("data:image")) return s;
    // Caso venha só o base64 puro
    return `data:image/png;base64,${s}`;
  };

  const extractQrBase64 = (payload) => {
    if (!payload) return "";
    const raw =
      payload?.base64 ??
      payload?.qrCodeBase64 ??
      payload?.qrcode ??
      payload?.qr ??
      payload?.data?.base64 ??
      payload?.data?.qrcode?.base64 ??
      payload?.body?.base64 ??
      payload?.response?.base64;

    return normalizeQrSrc(raw);
  };

  const callEvolutionManager = async (action) => {
    setIsActionLoading(true);
    try {
      const response = await fetch(WEBHOOK_EVOLUTION_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        // Mantém compatibilidade com o fluxo atual (action) e também envia o formato
        // esperado por alguns cenários no n8n (instance.state), ex: state = "logout".
        body: JSON.stringify({ action, instanceName, instance: { state: action } }),
      });

      const text = await response.text();
      if (!text) throw new Error("Sem resposta");
      const data = JSON.parse(text);
      return data;
    } catch (error) {
      console.error(`Erro ${action}:`, error);
      return null;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConnectNewNumber = async () => {
    setIsQrGenerating(true); // evita race condition com polling
    setQrCodeBase64("");
    setIsQrModalOpen(true);

    const createResult = await callEvolutionManager("create");
    if (!createResult) {
      alert("Erro ao criar conexão. Tente novamente.");
      setIsQrModalOpen(false);
      setIsQrGenerating(false);
      return;
    }

    // Tenta obter o QR pelo fluxo mais direto (qr) e, se não vier, cai no status
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const qrResult = await callEvolutionManager("qr");
    const qrFromQr = extractQrBase64(qrResult);
    if (qrFromQr) {
      setQrCodeBase64(qrFromQr);
      setIsQrGenerating(false);
      return;
    }

    const statusResult = await callEvolutionManager("status");
    const qrFromStatus = extractQrBase64(statusResult);
    if (qrFromStatus) setQrCodeBase64(qrFromStatus);

    setIsQrGenerating(false);

    // Dispara uma checagem imediata (não espera 5s) para preencher o QR assim que ele existir
    checkEvolutionStatus();
  };
  const handleRestart = async () => {
    if (confirm("Reiniciar conexão?")) {
      await callEvolutionManager("restart");
      alert("Reiniciando...");
    }
  };
  const handleLogout = async () => {
    if (confirm("Desconectar?")) {
      const res = await callEvolutionManager("logout");
      if (res) {
        setConnectionStatus("disconnected");
        setConnectionStep("disconnected");
        handlePartialSave({ connection_status: "disconnected", ai_active: false });
        alert("Desconectado.");
      }
    }
  };
  const handleManualCheck = async () => {
    const res = await callEvolutionManager("status");
    if (res && (res.status === "open" || res.status === "connected")) {
      setConnectionStatus("connected");
      setConnectionStep("connected");
      handlePartialSave({ connection_status: "connected" });
      alert("Conectado! 🟢");
    } else {
      setConnectionStatus("disconnected");
      setConnectionStep("disconnected");
      alert("Desconectado 🔴");
    }
  };
  const checkEvolutionStatus = async () => {
    try {
      const response = await fetch(WEBHOOK_EVOLUTION_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", instanceName: instanceName }),
      });

      const text = await response.text();
      if (!text) return;

      const data = JSON.parse(text);

      // Alguns fluxos retornam o QR (base64) também no status.
      const rawBase64 = data?.base64 ?? data?.body?.base64;
      if (isQrModalOpen && connectionStatus !== "connected" && rawBase64) {
        const normalized = String(rawBase64).startsWith("data:image")
          ? String(rawBase64)
          : `data:image/png;base64,${rawBase64}`;
        setQrCodeBase64(normalized);
      }

      if (data.status === "open" || data.status === "connected") {
        setConnectionStatus("connected");
        setConnectionStep("connected");
        if (isQrModalOpen) setTimeout(() => setIsQrModalOpen(false), 2000);
        handlePartialSave({ connection_status: "connected" });
      }
    } catch (e) {
      // silencioso
    }
  };
  useEffect(() => {
    let interval;
    if (((activeTab === "dashboard" && connectionStatus !== "connected") || isQrModalOpen) && !isQrGenerating) {
      interval = setInterval(() => checkEvolutionStatus(), 5000);
    }
    return () => clearInterval(interval);
  }, [activeTab, connectionStatus, isQrModalOpen, isQrGenerating, instanceName]);
  const createInstanceOnSave = async () => {
    try {
      fetch(WEBHOOK_EVOLUTION_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", instanceName: instanceName, webhook_url: WEBHOOK_SALES_URL }),
      }).catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    let cancelled = false;

    const computeDefaultTrial = () => {
      if (!session.user.created_at) return;
      const createdDate = new Date(session.user.created_at);
      const endsAt = new Date(createdDate.getTime() + TRIAL_HOURS * 60 * 60 * 1000);
      const now = new Date();
      const remainingHours = Math.max(0, Math.ceil((endsAt - now) / (1000 * 60 * 60)));

      setTrialInfo({
        hoursLeft: remainingHours,
        status: remainingHours > 0 ? "active" : "expired",
        endsAt: endsAt.toISOString(),
        source: "default",
      });
    };

    const loadCustomTrialIfAny = async () => {
      try {
        if (!supabaseClient || !userId) {
          computeDefaultTrial();
          return;
        }

        const { data, error } = await supabaseClient
          .from("user_trial_settings")
          .select("trial_days, trial_start_date")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        if (data?.trial_days && data?.trial_start_date) {
          const start = new Date(data.trial_start_date);
          const endsAt = new Date(start.getTime() + Number(data.trial_days) * 24 * 60 * 60 * 1000);
          const now = new Date();
          const remainingHours = Math.max(0, Math.ceil((endsAt - now) / (1000 * 60 * 60)));

          if (!cancelled) {
            setTrialInfo({
              hoursLeft: remainingHours,
              status: remainingHours > 0 ? "active" : "expired",
              endsAt: endsAt.toISOString(),
              source: "custom",
            });
          }
          return;
        }

        computeDefaultTrial();
      } catch (_e) {
        // Se falhar por qualquer motivo, cai no padrão
        computeDefaultTrial();
      }
    };

    loadCustomTrialIfAny();

    return () => {
      cancelled = true;
    };
  }, [session.user.created_at, userId]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      setIsDataLoaded(false);
      try {
        const { data } = await supabaseClient.from("gym_configs").select("*").eq("user_id", userId).maybeSingle();
        if (data) {
          const loadedData = { ...gymData, ...data, branches: data.branches || [], email: session.user.email };
          setGymData(loadedData);
          setInitialGymData(loadedData);
          if (data.connection_status) {
            setConnectionStatus(data.connection_status);
            setConnectionStep(data.connection_status);
          } else {
            setConnectionStatus("disconnected");
            setConnectionStep("disconnected");
          }
          if (data.extra_channels_count) setExtraChannels(data.extra_channels_count);
          if (data.extra_users_count) setGymData((prev) => ({ ...prev, extra_users_count: data.extra_users_count }));
          if (typeof data.extra_credits_pack === "number") setExtraCreditsPack(data.extra_credits_pack);
        } else {
          await supabaseClient.from("gym_configs").insert({
            user_id: userId,
            email: session.user.email,
            ai_active: false,
            connection_status: "disconnected",
          });
          setConnectionStatus("disconnected");
          setConnectionStep("disconnected");
          setInitialGymData(gymData);
        }
        // Saldo de créditos no perfil (libera MídIAs)
        {
          const { data: pData, error: pErr } = await supabaseClient
            .from("profiles")
            .select("credits_balance")
            .eq("id", userId)
            .maybeSingle();
          if (!pErr) setCreditsBalance(pData?.credits_balance ?? 0);
        }

        let sub = await supabaseClient
          .from("subscriptions")
          .select("plan_type, status, cupom")
          .eq("user_id", userId)
          .maybeSingle();
        if (!sub.data) {
          await supabaseClient
            .from("subscriptions")
            .insert({ user_id: userId, plan_type: "trial_7_days", status: "active" });
          sub = { data: { plan_type: "trial_7_days", status: "active" } };
        }
        if (sub.data) {
          setSubscriptionInfo(sub.data);
          if (sub.data.cupom) {
            const couponCode = sub.data.cupom;
            const couponAmount = VALID_COUPONS[couponCode] || 0;
            setSavedCoupon({ code: couponCode, amount: couponAmount });
          }
        }
        const { data: logData } = await supabaseClient
          .from("interaction_logs")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (logData) setLogs(logData);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingData(false);
        // Aguarda um tick para garantir que os estados estão sincronizados
        setTimeout(() => setIsDataLoaded(true), 100);
      }
    };
    fetchData();
  }, [userId, session.user.email]);

  // NOVO: Função para PATCH (atualizar apenas campos específicos)
  // Evita sobrescrever dados do treinamento durante autosaves de conexão/IA
  const handlePartialSave = async (fieldsToUpdate) => {
    // Bloqueia se os dados ainda não carregaram completamente
    if (!isDataLoaded) {
      console.warn("Autosave bloqueado: dados ainda não carregados completamente.");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("gym_configs")
        .update({
          ...fieldsToUpdate,
          updated_at: new Date(),
        })
        .eq("user_id", userId);

      if (error) throw error;
      console.log("PATCH aplicado com sucesso:", fieldsToUpdate);
    } catch (error) {
      console.error("Erro no handlePartialSave:", error);
    }
  };

  const handleSelectExtraCreditsPack = async (pack) => {
    setExtraCreditsPack(pack);
    await handlePartialSave({ extra_credits_pack: pack });
  };

  const handleSave = async (customData = null) => {
    const isFullSave = !customData;
    if (isFullSave) setIsSaving(true);
    const dataToSave = {
      user_id: userId,
      ...(customData || gymData),
      updated_at: new Date(),
      needs_reprocessing: true,
      extra_channels_count: extraChannels,
      extra_users_count: (customData || gymData).extra_users_count,
      extra_credits_pack: extraCreditsPack,
    };
    delete dataToSave.email;
    delete dataToSave.password;
    try {
      const { error } = await supabaseClient.from("gym_configs").upsert([dataToSave], { onConflict: "user_id" });
      if (error) throw error;
      if (isFullSave) {
        alert("Configurações salvas!");
        createInstanceOnSave();
        setInitialGymData(customData || gymData);

        // Disparos (retenção): envia configuração para o webhook SEM travar UX
        // Regra: disponível apenas fora do trial e para total >= R$300
        const totalNoDiscounts = calculateTotal(
          customData || gymData,
          extraChannels,
          (customData || gymData).extra_users_count,
          extraCreditsCost,
          0,
          0,
        );
        const retentionEnabledByPlan =
          isSubscriptionActive(subscriptionInfo?.status) &&
          subscriptionInfo?.plan_type !== "trial_7_days" &&
          totalNoDiscounts >= MIN_TOTAL_FOR_RETENTION;

        if (retentionEnabledByPlan && (customData || gymData).mass_sender_active) {
          const contacts = parseContactsFromText((customData || gymData).mass_sender_contacts);
          const message = String((customData || gymData).mass_sender_message ?? "").trim();

          // Validações mínimas para não disparar payload vazio
          if (contacts.length > 0 && message.length > 0) {
            const payload = {
              event: "retention_mass_config_saved",
              source: "training_tab",
              user_id: userId,
              email: session?.user?.email ?? null,
              contatos: contacts,
              mensagem: message,
              dias: String((customData || gymData).mass_sender_days ?? "").trim(),
              horarios: String((customData || gymData).mass_sender_hours ?? "").trim(),
              intervalo: String((customData || gymData).mass_sender_interval ?? "").trim(),
              created_at: new Date().toISOString(),
            };

            // fire-and-forget
            fetch(env.retentionMassWebhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              mode: "cors",
              body: JSON.stringify(payload),
            }).catch((err) => {
              console.warn("Falha ao enviar config de retenção:", err);
            });
          }
        }
      }
      if (isFullSave) setTrainingError("");
    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      if (isFullSave) setIsSaving(false);
    }
  };
  const toggleAI = async () => {
    if (isTrialExpired) {
      setTrainingError("Seu teste grátis terminou. Faça upgrade para ativar a IA.");
      setTimeout(() => setTrainingError(""), 5000);
      return;
    }

    const isWhatsAppConnected = connectionStatus === "connected" || Boolean(gymData.use_official_api);

    if (!gymData.ai_active && !isWhatsAppConnected) {
      setTrainingError("Erro: Conecte o WhatsApp (QR Code) primeiro.");
      setTimeout(() => setTrainingError(""), 5000);
      return;
    }

    if (!gymData.ai_active) {
      if (!gymData.opening_hours || gymData.opening_hours.length < 5) {
        setTrainingError('Erro: Preencha "Treinar IA" primeiro.');
        setTimeout(() => setTrainingError(""), 5000);
        return;
      }
    }

    setTrainingError("");
    const newState = !gymData.ai_active;
    setGymData((prev) => ({ ...prev, ai_active: newState }));
    await handlePartialSave({ ai_active: newState, needs_reprocessing: true });
  };
  const toggleInstagramAI = async () => {
    if (!gymData.ai_active_instagram && extraChannels < 1) {
      setInstagramError('Erro: Contrate Canal Extra na aba "Assinatura".');
      setTimeout(() => setInstagramError(""), 5000);
      return;
    }
    setInstagramError("");
    const newState = !gymData.ai_active_instagram;
    setGymData((prev) => ({ ...prev, ai_active_instagram: newState }));
    await handlePartialSave({ ai_active_instagram: newState, needs_reprocessing: true });
  };

  // CÁLCULO DE PREÇO (COM DESCONTO ONBOARDING)
  // Regra: cupom só aplica quando o total sem descontos for > R$ 250.
  const totalWithoutDiscounts = calculateTotal(gymData, extraChannels, gymData.extra_users_count, extraCreditsCost, 0, 0);
  const retentionUnlocked =
    isSubscriptionActive(subscriptionInfo?.status) &&
    subscriptionInfo?.plan_type !== "trial_7_days" &&
    totalWithoutDiscounts >= MIN_TOTAL_FOR_RETENTION;
  const couponAmountToApply =
    appliedCoupon && totalWithoutDiscounts > MIN_TOTAL_FOR_COUPON ? appliedCoupon.amount : 0;

  const totalPrice = calculateTotal(
    gymData,
    extraChannels,
    gymData.extra_users_count,
    extraCreditsCost,
    couponAmountToApply,
    onboardingDiscount,
  );
  const initialPrice = calculateTotal(
    initialGymData,
    extraChannels,
    gymData.extra_users_count,
    extraCreditsCost,
    couponAmountToApply,
    onboardingDiscount,
  );

  const isActiveSubscriber =
    isSubscriptionActive(subscriptionInfo.status) && subscriptionInfo.plan_type !== "trial_7_days";
  const upgradeValue = isActiveSubscriber ? Math.max(0, totalPrice - 250) : totalPrice;
  const finalCheckoutValue = isActiveSubscriber && upgradeValue > 0 ? upgradeValue : totalPrice;
  const checkoutLabel =
    isActiveSubscriber && upgradeValue > 0
      ? `Contratar Adicional (+ R$ ${upgradeValue})`
      : `Assinar / Atualizar (R$ ${totalPrice})`;

  // NOME DO PLANO BASEADO NO PREÇO
  const displayPlanName =
    isSubscriptionActive(subscriptionInfo.status) && subscriptionInfo.plan_type !== "trial_7_days"
      ? getPlanNameByPrice(totalPrice, subscriptionInfo.plan_type)
      : "Trial Grátis";

  const handleSubscribe = async () => {
    if (finalCheckoutValue > 1250) {
      setIsHighTicketOpen(true);
      return;
    }
    if (isActiveSubscriber && upgradeValue <= 0) {
      handleSave();
      alert("Plano atualizado com sucesso (sem custo adicional).");
      return;
    }
    
    if (couponAmountToApply > 0 && appliedCoupon) {
      try {
        await supabaseClient
          .from("subscriptions")
          .update({ cupom: appliedCoupon.code })
          .eq("user_id", userId);
        setSavedCoupon(appliedCoupon);
      } catch (error) {
        console.error("Erro ao salvar cupom:", error);
      }
    }
    
    setIsCheckoutOpen(true);
    setCheckoutProcessing(true);
    setCheckoutHtml("");
    setCheckoutError("");
    const payload = {
      user_id: userId,
      email: session.user.email,
      valor_total: finalCheckoutValue,
        cupom_aplicado: couponAmountToApply > 0 && appliedCoupon ? appliedCoupon.code : null,
      desconto_onboarding: onboardingDiscount,
      tipo_pagamento: isActiveSubscriber ? "upgrade" : "new",
      detalhes: {
        filiais: gymData.branches.length,
        omnichannel: gymData.omnichannel,
        canais_extras: extraChannels,
        agenda: gymData.integrate_agenda,
        pagamentos: gymData.recognize_payments,
        disparador: gymData.mass_sender_active,
        api_oficial: gymData.use_official_api,
        usuarios_extras: gymData.extra_users_count,
        creditos_adicionais: extraCreditsPack,
      },
    };
    try {
      const response = await fetch(WEBHOOK_SALES_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Resposta inválida");
      const responseText = await response.text();
      setTimeout(() => {
        setCheckoutHtml(responseText);
        setCheckoutProcessing(false);
      }, 1500);
    } catch (error) {
      console.error("Erro checkout:", error);
      setCheckoutError("Failed to fetch");
      setCheckoutProcessing(false);
    }
  };
  const addBranch = () =>
    setGymData((prev) => ({ ...prev, branches: [...prev.branches, { id: Date.now(), address: "" }] }));
  const updateBranch = (id, val) =>
    setGymData((prev) => ({ ...prev, branches: prev.branches.map((b) => (b.id === id ? { ...b, address: val } : b)) }));
  const removeBranch = (id) => setGymData((prev) => ({ ...prev, branches: prev.branches.filter((b) => b.id !== id) }));
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      // Compressão client-side para evitar upload pesado
      const compressImageFile = async (f, { maxSize = 1_500_000, maxDimension = 1600, quality = 0.82 } = {}) => {
        if (!f || f.size <= maxSize) return f;
        if (!f.type?.startsWith("image/")) return f;

        let bitmap;
        try {
          if (typeof createImageBitmap === "function") bitmap = await createImageBitmap(f);
        } catch (_e) {
          bitmap = null;
        }

        if (!bitmap) {
          const dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(new Error("Falha ao ler imagem."));
            r.onload = () => resolve(String(r.result));
            r.readAsDataURL(f);
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
        if (!ctx) return f;
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);

        const mime = "image/jpeg";
        let q = quality;
        let blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, q));
        for (let i = 0; i < 6 && blob && blob.size > maxSize; i++) {
          q = Math.max(0.4, q - 0.08);
          blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, q));
        }
        if (!blob) return f;
        const nextName = f.name.replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], nextName, { type: mime });
      };

      const compressed = await compressImageFile(file);

      // Upload para storage (não salvar base64 no banco)
      // IMPORTANTE: mantém o prefixo 'midias/{uid}/' para bater com as policies existentes do bucket.
      const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
      const path = `midias/${userId}/profile-${Date.now()}.${ext}`;

      const { error: upErr } = await supabaseClient.storage.from("brand-assets").upload(path, await compressed.arrayBuffer(), {
        contentType: compressed.type || "image/jpeg",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data } = supabaseClient.storage.from("brand-assets").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Não foi possível obter URL pública.");

      // Atualiza UI imediatamente
      setGymData((prev) => ({ ...prev, logo_url: publicUrl }));

      // Persiste automaticamente em gym_configs (update parcial)
      await handlePartialSave({ logo_url: publicUrl });

      // Recarrega do banco para evitar qualquer divergência
      const { data: fresh } = await supabaseClient.from("gym_configs").select("logo_url").eq("user_id", userId).maybeSingle();
      if (fresh?.logo_url) setGymData((prev) => ({ ...prev, logo_url: fresh.logo_url }));
    } catch (err) {
      console.error("Falha ao atualizar foto de perfil:", err);
      alert("Não foi possível salvar sua foto de perfil. Verifique as permissões do bucket e tente novamente.");
    }
  };
  const toggleOfficialApiCoexistencia = (val) => {
    setGymData((prev) => ({
      ...prev,
      use_official_api_coexistencia: val,
      use_official_api_somente: val ? false : prev.use_official_api_somente,
    }));
  };
  const toggleOfficialApiSomente = (val) => {
    setGymData((prev) => ({
      ...prev,
      use_official_api_somente: val,
      use_official_api_coexistencia: val ? false : prev.use_official_api_coexistencia,
      omnichannel: val ? true : prev.omnichannel,
    }));
    if (val)
      alert("A API Oficial (somente API) exige o uso do Painel Omnichannel. Ele foi selecionado automaticamente.");
  };

  // META EMBEDDED SIGNUP - API Oficial (WhatsApp / Instagram)
  const handleMetaEmbeddedSignup = async ({ mode } = {}) => {
    const selectedMode = mode || "both";
    const selectedConfigId =
      selectedMode === "whatsapp"
        ? META_CONFIG_ID_WHATSAPP
        : selectedMode === "instagram"
          ? META_CONFIG_ID_INSTAGRAM
          : META_CONFIG_ID_BOTH;

    // Se o WhatsApp estiver conectado via MonarcaHub, precisamos deslogar a instância
    // antes de iniciar a API Oficial; caso contrário, o número pode ficar "ocupado".
    if (connectionStatus === "connected") {
      const proceed = confirm(
        "Para conectar via API Oficial, vamos desconectar primeiro a instância atual (MonarcaHub). Deseja continuar?",
      );
      if (!proceed) return;

      // Dispara o workflow de logout (n8n lê {{$json.instance.state}} = 'logout')
      const logoutRes = await callEvolutionManager("logout");
      if (!logoutRes) {
        alert("Não foi possível desconectar a instância atual. Tente novamente.");
        return;
      }

      setConnectionStatus("disconnected");
      setConnectionStep("disconnected");
      handlePartialSave({ connection_status: "disconnected", ai_active: false });
    }

    // Verifica se o SDK da Meta já está carregado
    if (!window.FB) {
      alert("Carregando SDK da Meta. Aguarde um momento e tente novamente.");
      // Carrega o SDK
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        window.FB.init({
          appId: META_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: "v21.0",
        });
        console.log("SDK Meta carregado via script dinâmico.");
      };
      document.head.appendChild(script);
      return;
    }

    // Inicia o fluxo de login da Meta
    window.FB.login(
      function (response) {
        if (!response?.authResponse) {
          console.log("Conexão Meta cancelada:", response);
          return;
        }

        // Parte 3 (Meta): checar status logo após o login
        window.FB.getLoginStatus(function (statusResponse) {
          console.log("Meta getLoginStatus:", statusResponse);

          if (statusResponse?.status !== "connected") {
            alert("⚠️ Login concluído, mas não foi possível confirmar o status como 'connected'. Tente novamente.");
            return;
          }

          console.log("Sucesso Meta:", response);

          // Envia dados para o webhook do n8n
          fetch(WEBHOOK_META_SETUP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "meta_connected",
              meta_mode: selectedMode,
              meta_config_id: selectedConfigId,
              meta_status: statusResponse?.status,
              user_id: userId,
              email: session?.user?.email,
              access_token: response.authResponse.accessToken,
              code: response.authResponse.code,
              timestamp: new Date().toISOString(),
            }),
          })
            .then((res) => {
              if (res.ok) {
                alert("✅ Conectado com sucesso! O WhatsApp Business e/ou Instagram foram vinculados.");
                setGymData((prev) => ({ ...prev, use_official_api: true, omnichannel: true }));
              } else {
                alert("⚠️ Conectado na Meta, mas houve um erro ao salvar. Entre em contato com o suporte.");
              }
            })
            .catch((err) => {
              console.error("Erro ao salvar conexão Meta:", err);
              alert("⚠️ Conectado na Meta, mas houve um erro ao sincronizar. Verifique a conexão.");
            });
        });
      },
      {
        config_id: selectedConfigId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
          version: "v3",
          features: [{ name: "app_only_install" }],
        },
      },
    );
  };

  // Carrega SDK da Meta ao montar o componente
  useEffect(() => {
    if (!window.FB) {
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        window.FB.init({
          appId: META_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: "v21.0",
        });
        console.log("SDK Meta carregado.");
      };
      document.head.appendChild(script);
    }
  }, []);

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Visão Geral" },
    { id: "training", icon: BrainCircuit, label: "Treinar IA" },
    { id: "connections", icon: Smartphone, label: "Conexões" },
    { id: "midias", icon: ImageIcon, label: "MídIAs" },
    { id: "plans", icon: CreditCard, label: "Assinatura" },
    { id: "account", icon: User, label: "Minha Conta" },
  ];

  const renderContent = () => {
    if (isLoadingData)
      return (
        <div className="flex items-center justify-center h-64 text-orange-400">
          <Loader2 className="w-8 h-8 animate-spin mr-2" /> Carregando...
        </div>
      );

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="animate-in fade-in duration-500">
            <HomeAIStart
              user={{ id: userId, email: session?.user?.email }}
              webhookUrl={env.n8nAiWebhookUrl}
              planName={displayPlanName === "Trial Grátis" ? "Plano GRATUITO" : displayPlanName}
              trialExpired={subscriptionInfo?.plan_type === "trial_7_days" && trialInfo?.status === "expired"}
              isTrialPlan={displayPlanName === "Trial Grátis" || subscriptionInfo?.plan_type === "trial_7_days"}
              wantsOfficialApi={Boolean(gymData.use_official_api_coexistencia || gymData.use_official_api_somente)}
              onOpenPlansTab={() => setActiveTab("plans")}
              onOpenTrainTab={() => setActiveTab("training")}
              onOpenConnectionsTab={() => setActiveTab("connections")}
              whatsappUnofficialStatus={connectionStatus}
              whatsappOfficialStatus={gymData.use_official_api ? "connected" : "disconnected"}
              aiStatus={isTrialExpired ? "inactive" : gymData.ai_active ? "active" : "inactive"}
              showOnboardingStepsShortcut={false}
              onOpenOnboardingSteps={() => setIsOnboardingModalOpen(true)}
              onToggleAI={toggleAI}
            />
          </div>
        );
      case "connections":
        return (
          <ConnectionsPage
            planName={displayPlanName === "Trial Grátis" ? "Plano GRATUITO" : displayPlanName}
            isTrialPlan={displayPlanName === "Trial Grátis" || subscriptionInfo?.plan_type === "trial_7_days"}
            wantsOfficialApi={Boolean(gymData.use_official_api_coexistencia || gymData.use_official_api_somente)}
            extraChannels={extraChannels}
            onOpenPlansTab={() => setActiveTab("plans")}
            onOpenWhatsAppConnectUnofficial={handleConnectNewNumber}
            whatsappUnofficialStatus={connectionStatus}
            onOpenWhatsAppConnectOfficial={handleMetaEmbeddedSignup}
            whatsappOfficialStatus={gymData.use_official_api ? "connected" : "disconnected"}
            onWhatsAppDisconnect={handleLogout}
            onWhatsAppRestart={handleRestart}
          />
        );

      case "midias":
        return (
          <MidiasAppPage
            supabaseClient={supabaseClient}
            userId={userId}
            hasMediaUpgrade={hasMidiasUpgrade}
            selectedCreditsPack={extraCreditsPack}
            onOpenPlansTab={() => setActiveTab("plans")}
            onOpenConnectionsTab={() => setActiveTab("connections")}
            onOpenInstagramConnect={() => {
              setActiveTab("connections");
              // Dispara o mesmo fluxo do botão "Conectar Instagram" da aba Conexões
              handleMetaEmbeddedSignup?.({ mode: "instagram" });
            }}
          />
        );

      case "midias_app":
        // Mantido por compatibilidade (links antigos / estados antigos).
        return (
          <MidiasAppPage
            supabaseClient={supabaseClient}
            userId={userId}
            hasMediaUpgrade={hasMidiasUpgrade}
            selectedCreditsPack={extraCreditsPack}
            onBack={() => setActiveTab("midias")}
            onOpenPlansTab={() => setActiveTab("plans")}
            onOpenConnectionsTab={() => setActiveTab("connections")}
            onOpenInstagramConnect={() => {
              setActiveTab("connections");
              // Dispara o mesmo fluxo do botão "Conectar Instagram" da aba Conexões
              handleMetaEmbeddedSignup?.({ mode: "instagram" });
            }}
          />
        );

      // ... Outras abas (training, plans, account, admin) ...
      case "training":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4 duration-300">
            <div className="lg:col-span-2 space-y-6">
              {/* MODO TESTE SANDBOX - TOPO - Recolhível */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsTestModeOpen(!isTestModeOpen)}
                >
                  <div className="flex items-center gap-3">
                    <Beaker className="w-6 h-6 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Modo Teste (Sandbox)</h3>
                  </div>
                  {isTestModeOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {isTestModeOpen && (
                  <div className="p-6 pt-2 border-t border-gray-700">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                      <p className="text-yellow-200 text-sm">
                        <strong>Importante:</strong> É necessário treinar completamente a IA antes de ativar esse modo.
                        Basta colocar o número de Teste e a IA só se comunicará com esse número.
                      </p>
                      <p className="text-yellow-300/80 text-xs mt-2">
                        Para mais controle de quem a IA pode conversar, é recomendada a contratação do Painel
                        Omnichannel.
                      </p>
                    </div>
                    <InputGroup
                      label="Número para testar IA no WhatsApp"
                      placeholder="5511999998888"
                      value={gymData.test_number}
                      onChange={(e) => setGymData({ ...gymData, test_number: e.target.value })}
                      helpText="Somente esse número poderá obter as primeiras respostas da inteligência para você conferir a qualidade."
                    />
                  </div>
                )}
              </div>

              {/* API OFICIAL DA META - Acima do Cérebro - Recolhível */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsOfficialApiOpen(!isOfficialApiOpen)}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-6 h-6 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">WhatsApp API Oficial da Meta</h3>
                    {(gymData.use_official_api_coexistencia || gymData.use_official_api_somente) && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-bold">
                        Selecionado
                      </span>
                    )}
                  </div>
                  {isOfficialApiOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {isOfficialApiOpen && (
                  <div className="p-6 pt-2 border-t border-gray-700 space-y-4">
                    <div
                      className={`bg-gray-900 border ${gymData.use_official_api_coexistencia ? "border-green-500/50 bg-green-900/10" : "border-gray-700"} rounded-xl p-4`}
                    >
                      <CheckboxGroup
                        icon={MessageCircle}
                        label="Modo Coexistência (+R$50/número)"
                        subLabel="Continue usando o app do WhatsApp Business normalmente enquanto a API está ativa. Funcionalidade recente liberada pela Meta."
                        checked={gymData.use_official_api_coexistencia}
                        onChange={(val) => toggleOfficialApiCoexistencia(val)}
                        priceTag="+R$ 50"
                      />
                      <div className="mt-3 ml-8 text-xs text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-700/50 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>
                          Mais <strong className="text-green-400">segurança</strong> e{" "}
                          <strong className="text-green-400">estabilidade</strong>. Menor risco de bloqueio. Não é
                          necessário Painel Omnichannel neste modo.
                        </span>
                      </div>
                    </div>
                    <div
                      className={`bg-gray-900 border ${gymData.use_official_api_somente ? "border-blue-500/50 bg-blue-900/10" : "border-gray-700"} rounded-xl p-4`}
                    >
                      <CheckboxGroup
                        icon={Globe}
                        label="Somente API (+R$150)"
                        subLabel="Modo tradicional de API - requer Painel Omnichannel para gerenciar conversas."
                        checked={gymData.use_official_api_somente}
                        onChange={(val) => toggleOfficialApiSomente(val)}
                        priceTag="+R$ 150"
                      />
                      <div className="mt-3 ml-8 text-xs text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-700/50 flex items-start gap-2">
                        <LayoutList className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>
                          Indicado para quem quer <strong className="text-blue-400">gestão centralizada</strong> de
                          todas as conversas via Painel Omnichannel.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Card title="Informações Básicas" icon={Dumbbell}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup
                    label="Nome do Negócio (sua marca)"
                    value={gymData.gym_name}
                    onChange={(e) => setGymData({ ...gymData, gym_name: e.target.value })}
                    helpText="Como a IA deve chamar sua academia nas mensagens."
                  />
                  <InputGroup
                    label="Telefone / WhatsApp"
                    value={gymData.phone}
                    onChange={(e) => setGymData({ ...gymData, phone: e.target.value })}
                    helpText="O número oficial que os alunos entram em contato."
                  />
                </div>
                <InputGroup
                  label="Chave Pix"
                  value={gymData.pix_key}
                  onChange={(e) => setGymData({ ...gymData, pix_key: e.target.value })}
                  helpText="A IA enviará essa chave quando o cliente pedir para pagar."
                />
                <div className="pt-4 border-t border-gray-700 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-300">Endereços e Filiais</label>
                    <div className="flex flex-col items-end">
                      <Button variant="outline" onClick={addBranch} className="text-xs px-2 py-1">
                        <Plus className="w-3 h-3" /> Adicionar
                      </Button>
                      <span className="text-[10px] text-orange-400 mt-1 max-w-[200px] text-right">
                        *Se for 1 telefone diferente pra cada endereço é necessário valor mensal adicional (+R$ 150).
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <InputGroup
                      label="Endereço Principal (Incluso no Plano Base)"
                      value={gymData.address}
                      onChange={(e) => setGymData({ ...gymData, address: e.target.value })}
                      helpText="Necessário para a localização no Maps."
                    />
                    {gymData.branches.map((branch) => (
                      <div key={branch.id} className="relative flex gap-2">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-orange-500" />
                        <input
                          className="w-full bg-gray-900 border border-orange-500/30 rounded-lg pl-10 p-3 text-gray-100"
                          value={branch.address}
                          placeholder="Endereço da Filial (+ R$ 150)"
                          onChange={(e) => updateBranch(branch.id, e.target.value)}
                        />
                        <button
                          onClick={() => removeBranch(branch.id)}
                          className="p-3 hover:bg-red-500/10 rounded-lg text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="Cérebro da Operação" icon={BrainCircuit}>
                <InputGroup
                  label="Horários"
                  multiline
                  value={gymData.opening_hours}
                  onChange={(e) => setGymData({ ...gymData, opening_hours: e.target.value })}
                />
                <InputGroup
                  label="Preços"
                  multiline
                  value={gymData.pricing_info}
                  onChange={(e) => setGymData({ ...gymData, pricing_info: e.target.value })}
                />
                <InputGroup
                  label="FAQ / Regras"
                  multiline
                  value={gymData.faq_text}
                  onChange={(e) => setGymData({ ...gymData, faq_text: e.target.value })}
                />
                <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CheckboxGroup
                    icon={PhoneCall}
                    label="Aceitar ligações via WhatsApp?"
                    subLabel="aceita mas não atende as ligações."
                    checked={gymData.allow_calls}
                    onChange={(val) => setGymData({ ...gymData, allow_calls: val })}
                    disabled={subscriptionInfo?.plan_type === "trial_7_days"}
                    locked={subscriptionInfo?.plan_type === "trial_7_days"}
                    onLockedClick={() => setActiveTab("plans")}
                  />
                  <CheckboxGroup
                    icon={Users}
                    label="Responder em Grupos?"
                    subLabel="Não recomendado (pode gerar spam)."
                    checked={gymData.reply_groups}
                    onChange={(val) => setGymData({ ...gymData, reply_groups: val })}
                  />
                  <CheckboxGroup
                    icon={Mic}
                    label="Responder áudio?"
                    subLabel="IA ouve áudio e responde também em áudio. Se desativado sempre responderá em texto."
                    checked={
                      displayPlanName === "Trial Grátis" || displayPlanName === "Plano Start"
                        ? false
                        : gymData.reply_audio
                    }
                    onChange={(val) => setGymData({ ...gymData, reply_audio: val })}
                    disabled={displayPlanName === "Trial Grátis" || displayPlanName === "Plano Start"}
                    locked={displayPlanName === "Trial Grátis" || displayPlanName === "Plano Start"}
                    onLockedClick={() => setActiveTab("plans")}
                  />
                  <CheckboxGroup
                    icon={ImageIcon}
                    label="Enviar imagens?"
                    subLabel="(insira o link da imagem no bloco Observações)."
                    checked={gymData.send_images}
                    onChange={(val) => setGymData({ ...gymData, send_images: val })}
                    disabled={subscriptionInfo?.plan_type === "trial_7_days"}
                    locked={subscriptionInfo?.plan_type === "trial_7_days"}
                    onLockedClick={() => setActiveTab("plans")}
                  />
                  <CheckboxGroup
                    icon={Calendar}
                    label="Integrar Agenda (+R$50)"
                    subLabel="Link Google Calendar."
                    checked={gymData.integrate_agenda}
                    onChange={(val) => setGymData({ ...gymData, integrate_agenda: val })}
                  />
                  <CheckboxGroup
                    icon={DollarSign}
                    label="Reconhecer Pagamentos (+R$50)"
                    subLabel="Lê comprovantes Pix (OCR) - ajuda na baixa de pagamentos integrando-se ao seu sistema ou pode encaminhar para o seu financeiro."
                    checked={gymData.recognize_payments}
                    onChange={(val) => setGymData({ ...gymData, recognize_payments: val })}
                  />
                </div>
                <InputGroup
                  label="Observações / Links de Imagens"
                  multiline
                  value={gymData.observations}
                  onChange={(e) => setGymData({ ...gymData, observations: e.target.value })}
                  helpText="Cole aqui URLs de fotos se a opção 'Enviar Imagens' estiver ativa."
                />
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-400" /> Sistema de Retenção de Clientes
                  </h4>
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                    <h5 className="text-blue-200 font-bold text-sm mb-2">Defina a estratégia</h5>
                    <p className="text-blue-300/80 text-xs">
                      Mantenha seu cliente interessado e motivado, envie mensagens em massa objetivas, você pode mandar
                      dicas, lembretes, agradecer compra, parabenizar em aniversários e até reativar alunos
                      inadimplentes.
                    </p>
                  </div>
                  <div
                    className={`bg-gray-900 border ${gymData.mass_sender_active ? "border-blue-500/50 bg-blue-900/10" : "border-gray-700"} rounded-xl p-4 mb-4 transition-all`}
                  >
                    <CheckboxGroup
                      icon={Send}
                      label="Disparo de mensagens (+R$150)"
                      subLabel="Configure o envio automático para sua lista."
                      checked={gymData.mass_sender_active}
                      onChange={(val) => setGymData({ ...gymData, mass_sender_active: val })}
                      disabled={!retentionUnlocked}
                      locked={!retentionUnlocked}
                      onLockedClick={() => setActiveTab("plans")}
                    />
                    {gymData.mass_sender_active && (
                      <div className="mt-4 pl-2 border-l-2 border-blue-500/30 animate-in fade-in">
                        <h5 className="text-sm font-bold text-blue-300 mb-3">Configuração do Disparador em Massa</h5>
                        <InputGroup
                          label="Contatos (nome/telefone, 1 por linha)"
                          multiline
                          placeholder={"Ex:\nMaria - 5511999998888\nJoão; 5511988887777"}
                          value={gymData.mass_sender_contacts}
                          onChange={(e) => setGymData({ ...gymData, mass_sender_contacts: e.target.value })}
                          helpText="Você pode colar uma lista de contatos. O sistema normaliza os telefones (somente números)."
                        />
                        <InputGroup
                          label="Mensagem / orientação"
                          multiline
                          placeholder="Ex: Olá! Passando para lembrar do seu treino hoje..."
                          value={gymData.mass_sender_message}
                          onChange={(e) => setGymData({ ...gymData, mass_sender_message: e.target.value })}
                          helpText="Esse texto será enviado aos contatos conforme a programação."
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <InputGroup
                            label="Dia(s) de disparo"
                            placeholder="Ex: Seg, Qua, Sex"
                            value={gymData.mass_sender_days}
                            onChange={(e) => setGymData({ ...gymData, mass_sender_days: e.target.value })}
                          />
                          <InputGroup
                            label="Horários dos disparos"
                            placeholder="Ex: 09:00 - 18:00"
                            value={gymData.mass_sender_hours}
                            onChange={(e) => setGymData({ ...gymData, mass_sender_hours: e.target.value })}
                          />
                        </div>
                        <div className="mb-4">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
                            Intervalo de disparos
                          </label>
                          <select
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 outline-none text-sm"
                            value={gymData.mass_sender_interval}
                            onChange={(e) => setGymData({ ...gymData, mass_sender_interval: e.target.value })}
                          >
                            <option value="5min">Até ~150 pessoas/dia (a cada 5 min)</option>
                            <option value="3min">Até ~300 pessoas/dia (a cada 3 min)</option>
                            <option value="1min">1000 pessoas/dia (API Oficial Meta)</option>
                          </select>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded text-xs text-yellow-200">
                          <span className="font-bold block mb-1">Atenção:</span>Os disparos podem começar em até 24
                          horas após essa configuração. Chame no WhatsApp do Suporte caso precise fazer ajuste manual
                          ou se deseja pausar os disparos fora da programação estabelecida por exemplo. Estamos aqui
                          para ajudar!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-white mb-4">Resumo</h3>
                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status Conexão</span>
                    <span
                      className={connectionStep === "connected" ? "text-green-400 font-bold" : "text-red-400 font-bold"}
                    >
                      {connectionStep === "connected" ? "Online" : "Offline"}
                    </span>
                  </div>
                  {subscriptionInfo.plan_type === "trial_7_days" ? (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-green-400 font-semibold text-xs mb-3 flex items-center gap-1">
                        <Gift className="w-4 h-4" /> Incluso no Teste Grátis:
                      </p>
                      <ul className="space-y-2 text-xs text-gray-300">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> 1 Agente de IA Treinado
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> 1 Canal (Whats API MonarcaHub)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> 1 Usuário por dispositivo
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Suporte IA e manutenção
                        </li>
                      </ul>
                      <p className="text-red-400 font-semibold text-xs mb-2 mt-4 flex items-center gap-1">
                        <X className="w-4 h-4" /> Não incluso:
                      </p>
                      <ul className="space-y-2 text-xs text-gray-500">
                        <li className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0" />{" "}
                          <span className="line-through">IA Gestão de mídias e Designer</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0" />{" "}
                          <span className="line-through">Painel OmniChannel</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0" />{" "}
                          <span className="line-through">API Oficial (coexistência)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0" />{" "}
                          <span className="line-through">Sistema de retenção de alunos</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0" />{" "}
                          <span className="line-through">Suporte Prioritário no Whats</span>
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="flex justify-between mb-2">
                      <span className="text-white font-bold">Total Estimado</span>
                        <span className="text-orange-400 font-bold">
                          R$ {savedCoupon ? Math.max(0, totalPrice - savedCoupon.amount) : totalPrice}
                        </span>
                      </div>
                      {savedCoupon && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <Tag className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-xs font-semibold text-green-400">
                            Cupom {savedCoupon.code}: -R$ {savedCoupon.amount}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleSave()}
                  className="w-full bg-green-600 hover:bg-green-700 text-white border-none shadow-green-900/20"
                >
                  {isSaving ? "Salvando..." : "Salvar e Publicar IA"} <Save className="w-4 h-4 ml-2" />
                </Button>
                <div className="mt-4 text-center text-xs text-orange-300 flex items-center justify-center gap-1">
                  <Wifi className="w-3 h-3" /> Atualiza cérebro da IA
                </div>
              </div>
            </div>
          </div>
        );
      case "plans":
        return (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white">Sua Assinatura</h2>
              <p className="text-gray-400 mt-2">Confira o resumo e finalize seu plano.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800 border border-orange-500/30 rounded-2xl p-8 text-center h-fit">
                <p className="text-gray-400 text-sm uppercase tracking-wide">Total Mensal Estimado</p>
                <div className="flex items-center justify-center text-white mt-2">
                  <span className="text-5xl font-bold tracking-tight">
                    R$ {savedCoupon ? Math.max(0, totalPrice - savedCoupon.amount) : totalPrice}
                  </span>
                </div>
                {savedCoupon && (
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Tag className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">
                      Cupom {savedCoupon.code} ativo: -R$ {savedCoupon.amount}
                    </span>
                  </div>
                )}
                {/* LISTA DE INCLUSOS NO PLANO BASE */}
                <ul className="mt-4 space-y-2 text-xs text-gray-400 border-t border-gray-700 pt-4 mb-4 text-left">
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> 1 Agente de IA Treinado
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> 1 Canal (Whats ou Insta)
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> 1 Usuário por dispositivo
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Suporte IA e manutenção
                  </li>
                </ul>
                <div className="mt-6 space-y-2 text-sm text-left border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-gray-300">
                    <span>Plano Base</span>
                    <span>R$ 250</span>
                  </div>
                  {gymData.branches.length > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>+ {gymData.branches.length} Filiais Adicionais</span>
                      <span>R$ {gymData.branches.length * 150}</span>
                    </div>
                  )}
                  {extraChannels > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>+ {extraChannels} Canais Extras</span>
                      <span>R$ {extraChannels * 50}</span>
                    </div>
                  )}
                  {gymData.omnichannel && (
                    <div className="flex justify-between text-blue-400">
                      <span>+ Painel Omnichannel</span>
                      <span>R$ 150</span>
                    </div>
                  )}
                  {(gymData.integrate_agenda || gymData.recognize_payments) && (
                    <div className="flex justify-between text-gray-400">
                      <span>+ Adicionais</span>
                      <span>R$ {(gymData.integrate_agenda ? 50 : 0) + (gymData.recognize_payments ? 50 : 0)}</span>
                    </div>
                  )}
                  {gymData.mass_sender_active && (
                    <div className="flex justify-between text-blue-300">
                      <span>+ Disparador em Massa</span>
                      <span>R$ 150</span>
                    </div>
                  )}
                  {gymData.use_official_api && (
                    <div className="flex justify-between text-green-300">
                      <span>+ API Oficial Meta</span>
                      <span>R$ 50</span>
                    </div>
                  )}
                  {gymData.extra_users_count > 0 && (
                    <div className="flex justify-between text-purple-300">
                      <span>+ {gymData.extra_users_count} Usuários</span>
                      <span>R$ {gymData.extra_users_count * 50}</span>
                    </div>
                  )}
                  {extraCreditsPack > 0 && (
                    <div className="flex justify-between text-green-300">
                      <span>+ Créditos adicionais ({extraCreditsPack}/mês)</span>
                      <span>R$ {extraCreditsCost}</span>
                    </div>
                  )}
                </div>
                {/* CAMPO DE CUPOM E BOTÃO */}
                <div className="mt-4">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Cupom de desconto"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-xs text-green-400 font-bold mb-2">
                      Cupom {appliedCoupon.code} aplicado: - R$ {appliedCoupon.amount},00
                    </p>
                  )}
                  {onboardingDiscount > 0 && (
                    <p className="text-xs text-green-400 font-bold mb-2">
                      Descontos aplicados: - R$ {onboardingDiscount},00
                    </p>
                  )}
                  {couponError && <p className="text-xs text-red-400 mb-2">{couponError}</p>}
                  {savedCoupon && !appliedCoupon && (
                    <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                        <Tag className="w-3 h-3" />
                        <span>Cupom {savedCoupon.code} permanente ativo</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Desconto de R$ {savedCoupon.amount} aplicado em todas as mensalidades
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSubscribe}
                  className="w-full mt-2 bg-orange-500 hover:bg-orange-600 font-bold text-lg py-4 shadow-lg shadow-orange-500/20 transform hover:scale-105 transition-all"
                >
                  {checkoutLabel} <ShoppingCart className="w-5 h-5 ml-2" />
                </Button>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Adicionais</h3>
                <div className="space-y-4">
                  <div className="bg-gray-900 p-4 rounded-xl border border-blue-900/50 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 text-blue-200 font-medium mb-1">
                        <LayoutList className="w-4 h-4" /> Painel Omnichannel
                      </div>
                      <p className="text-xs text-gray-500">Gestão centralizada</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">R$ 150</span>
                      <input
                        type="checkbox"
                        checked={gymData.omnichannel}
                        onChange={() => setGymData((prev) => ({ ...prev, omnichannel: !prev.omnichannel }))}
                        className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-xl border border-green-900/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-green-200 font-medium mb-1">
                          <Gift className="w-4 h-4" /> Créditos adicionais (mensais)
                        </div>
                        <p className="text-xs text-gray-500">
                          Escolha um pacote para seu Gestor de Mídias com IA e acrescente o valor em seu saldo todo mês.
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500">Total</div>
                        <div className="text-xs font-semibold text-gray-200">R$ {extraCreditsCost}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectExtraCreditsPack(100)}
                        className={`px-3 py-2 rounded-lg border text-left transition-colors ${extraCreditsPack === 100 ? "bg-green-500/10 border-green-500/40 text-green-200" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700/50"}`}
                      >
                        <div className="text-xs font-bold">100 créditos</div>
                        <div className="text-[10px] text-gray-400">R$ 50/mês</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectExtraCreditsPack(500)}
                        className={`px-3 py-2 rounded-lg border text-left transition-colors ${extraCreditsPack === 500 ? "bg-green-500/10 border-green-500/40 text-green-200" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700/50"}`}
                      >
                        <div className="text-xs font-bold">500 créditos</div>
                        <div className="text-[10px] text-gray-400">R$ 150/mês</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectExtraCreditsPack(1000)}
                        className={`px-3 py-2 rounded-lg border text-left transition-colors ${extraCreditsPack === 1000 ? "bg-green-500/10 border-green-500/40 text-green-200" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700/50"}`}
                      >
                        <div className="text-xs font-bold">1000 créditos</div>
                        <div className="text-[10px] text-gray-400">R$ 250/mês</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectExtraCreditsPack(0)}
                        className={`px-3 py-2 rounded-lg border text-left transition-colors ${extraCreditsPack === 0 ? "bg-gray-700 border-gray-500 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700/50"}`}
                      >
                        <div className="text-xs font-bold">Sem adicionais</div>
                        <div className="text-[10px] text-gray-400">R$ 0/mês</div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-gray-200 font-medium">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        <Smartphone className="w-5 h-5 text-green-500" />
                        <span>Canais Extras</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExtraChannels(Math.max(0, extraChannels - 1))}
                          className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 rounded"
                        >
                          -
                        </button>
                        <span className="text-white font-bold w-4 text-center">{extraChannels}</span>
                        <button
                          onClick={() => setExtraChannels(extraChannels + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-right mb-4">+ R$ 50/cada</p>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-gray-200 font-medium">
                        <Users className="w-5 h-5 text-purple-500" />
                        <span>Usuários Painel</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setGymData((prev) => ({
                              ...prev,
                              extra_users_count: Math.max(0, prev.extra_users_count - 1),
                            }))
                          }
                          className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 rounded"
                        >
                          -
                        </button>
                        <span className="text-white font-bold w-4 text-center">{gymData.extra_users_count}</span>
                        <button
                          onClick={() =>
                            setGymData((prev) => ({ ...prev, extra_users_count: prev.extra_users_count + 1 }))
                          }
                          className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-600 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-right mb-4">+ R$ 50/usuário</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "account":
        return (
          <div className="max-w-2xl mx-auto text-center pt-10 animate-in fade-in">
            <div className="relative group w-24 h-24 mx-auto mb-6">
              {gymData.logo_url || gymData.gym_name ? (
                gymData.logo_url ? (
                  <img
                    src={gymData.logo_url}
                    alt="Logo"
                    className="w-full h-full rounded-full object-cover border-2 border-orange-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center border-2 border-orange-500 text-2xl font-bold text-orange-500">
                    {gymData.gym_name.slice(0, 2).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center border-2 border-dashed border-gray-600 group-hover:border-orange-500 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-500 group-hover:text-orange-500" />
                </div>
              )}
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleLogoUpload}
                accept="image/*"
              />
              <div className="absolute bottom-0 right-0 bg-orange-500 rounded-full p-1">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Minha Conta</h2>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-left mb-8 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-400" /> Dados de Acesso
              </h3>
              <div className="space-y-4">
                <InputGroup label="Email de Login" value={gymData.email} disabled />
                <InputGroup
                  label="Alterar Senha"
                  type="password"
                  placeholder="Nova senha..."
                  value={gymData.password}
                  onChange={(e) => setGymData({ ...gymData, password: e.target.value })}
                />
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded text-xs text-red-200 flex gap-2 items-start">
                  <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold block mb-1">Atenção:</span>Mudanças aqui não refletem na conta de
                    pagamentos (Ambiente Seguro Hotmart).
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="secondary" className="text-sm">
                    Atualizar Acesso
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-left mb-8 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-400" /> Financeiro
              </h3>
              <Button
                className="w-full py-3"
                variant="outline"
                onClick={() => window.open("https://consumer.hotmart.com/main", "_blank")}
              >
                Acessar Ambiente Seguro Hotmart <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={async () => {
                await supabaseClient.auth.signOut();
                window.location.reload();
              }}
              variant="danger"
              className="mx-auto"
            >
              Sair da Conta
            </Button>
          </div>
        );
      case "admin":
        return (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-xl mb-8">
              <h2 className="text-2xl font-bold text-purple-300 flex items-center gap-2 mb-2">
                <ShieldAlert className="w-8 h-8" /> Modo Deus (Admin)
              </h2>
              <p className="text-gray-400">Área restrita da Monarca Hub.</p>
            </div>

            {isSuperAdmin ? (
              <AdminTrialPanel supabaseClient={supabaseClient} adminEmail={session.user.email} />
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-red-200">
                Acesso negado.
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 z-30">
        <div className="p-6 flex items-center gap-2 font-bold text-2xl text-orange-400 tracking-tighter">
          <img
            src="/logo-iara.png"
            alt="IARA Gym"
            className="h-10 object-contain"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}
          />
          <span className="hidden">IARA chat</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "dashboard" ? "bg-orange-500/10 text-orange-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Visão Geral
          </button>
          <button
            onClick={() => setActiveTab("training")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "training" ? "bg-orange-500/10 text-orange-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
          >
            <BrainCircuit className="w-5 h-5" /> Treinar IA
          </button>
          <button
            onClick={() => setActiveTab("connections")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "connections" ? "bg-orange-500/10 text-orange-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
          >
            <Smartphone className="w-5 h-5" /> Conexões
          </button>
          <button
            onClick={() => setActiveTab("midias")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "midias" ? "bg-orange-500/10 text-orange-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
          >
            <ImageIcon className="w-5 h-5" /> MídIAs
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "plans" ? "bg-orange-500/10 text-orange-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
          >
            <CreditCard className="w-5 h-5" /> Assinatura
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "account" ? "bg-orange-500/10 text-orange-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
          >
            <User className="w-5 h-5" /> Minha Conta
          </button>
        </nav>
        {isSuperAdmin && (
          <div className="px-4 pb-2">
            <button
              onClick={() => setActiveTab("admin")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs uppercase tracking-wider font-bold text-purple-400 hover:bg-purple-900/20"
            >
              <ShieldAlert className="w-3 h-3" /> Modo Admin
            </button>
          </div>
        )}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="mb-4 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Desenvolvido por</p>
            <p className="text-xs text-orange-400 font-bold">Monarca Hub</p>
          </div>
          <button
            onClick={async () => {
              await supabaseClient.auth.signOut();
              window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-400/10 py-2 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold text-xl text-orange-400">
          <img src="/logo-iara.png" className="h-8" alt="IARA Gym" /> IARA Gym
        </div>
        <button className="text-gray-300 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-950 animate-in fade-in duration-200">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
            <div className="flex items-center gap-2 font-bold text-xl text-orange-400">
              <img src="/logo-iara.png" className="h-8" alt="IARA Gym" /> IARA Gym
            </div>
            <button className="text-gray-300 p-2" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="p-4 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl text-lg font-medium transition-colors ${activeTab === item.id ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
              >
                <item.icon className="w-6 h-6" /> {item.label}
              </button>
            ))}
            <button
              onClick={async () => {
                await supabaseClient.auth.signOut();
                window.location.reload();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-xl text-lg font-medium text-red-400 hover:bg-red-500/10 mt-8 border border-red-500/20"
            >
              <LogOut className="w-6 h-6" /> Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        {/* Tarja de trial (visível em toda a plataforma) */}
        {subscriptionInfo?.plan_type === "trial_7_days" && (
          <div className="sticky top-16 md:top-0 z-30 border-b border-orange-500/20 bg-gray-950/90 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-10 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-gray-200">
                  Seu teste do plano termina em{" "}
                  {trialInfo?.endsAt ? (
                    <TrialTimer
                      endsAt={trialInfo.endsAt}
                      onExpire={() => setTrialInfo((prev) => ({ ...prev, status: "expired" }))}
                    />
                  ) : (
                    <span className="text-orange-400 font-mono font-bold">—</span>
                  )}
                </span>
                {trialInfo?.status === "expired" && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                    Expirado
                  </span>
                )}
              </div>

              {/* Ações (mobile: empilha; desktop: lado a lado) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardingModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900 text-gray-100 font-semibold px-3 py-2 text-xs sm:text-sm whitespace-nowrap hover:bg-gray-800 transition-colors"
                  aria-label="Primeiros passos - Economize aqui"
                >
                  <CheckSquare className="w-4 h-4 text-orange-400" />
                  Primeiros passos - Economize aqui!
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("plans");
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 text-sm shadow-lg shadow-orange-500/20"
                >
                  Fazer upgrade
                  <Gift className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">{renderContent()}</div>
          <div className="mt-10 text-center md:hidden">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Desenvolvido por</p>
            <p className="text-xs text-orange-400 font-bold">Monarca Hub</p>
          </div>
        </div>
      </main>

      {/* MODAIS */}
      <OnboardingStepsModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        gymData={gymData}
        connectionStatus={connectionStatus}
        planType={subscriptionInfo?.plan_type}
        goToPlans={() => {
          setIsOnboardingModalOpen(false);
          setActiveTab("plans");
          setMobileMenuOpen(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        openVideo={() => setIsVideoModalOpen(true)}
        setOnboardingDiscount={setOnboardingDiscount}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutError("");
        }}
        htmlContent={checkoutHtml}
        isProcessing={checkoutProcessing}
        errorMsg={checkoutError}
      />

      <HighTicketModal isOpen={isHighTicketOpen} onClose={() => setIsHighTicketOpen(false)} total={totalPrice} />

      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        instanceName={instanceName}
        connectionStatus={connectionStatus}
        qrCodeBase64={qrCodeBase64}
        isGenerating={isQrGenerating}
      />

      <VideoModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} videoId={TUTORIAL_VIDEO_ID} />
    </div>
  );
}

// Adicione estas linhas ANTES do fechamento </body>

const PricingModal = ({ isOpen, onClose, planDetails, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-1 rounded-full z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Resumo do Plano</h3>
            <p className="text-gray-400 text-sm mt-2">Confira os detalhes antes de continuar</p>
          </div>

          <div className="space-y-3 mb-6">
            {planDetails.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-300 text-sm">{item.label}</span>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-700 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-white">Total Mensal</span>
              <span className="text-2xl font-bold text-orange-400">
                R$ {planDetails.reduce((acc, item) => acc + (item.price || 0), 0)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Voltar
            </Button>
            <Button onClick={onConfirm} variant="primary" className="flex-1">
              Confirmar Assinatura
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
