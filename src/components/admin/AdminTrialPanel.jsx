import React, { useEffect, useMemo, useState } from "react";
import { Save, Pencil, RefreshCw, Users } from "lucide-react";

export default function AdminTrialPanel({ supabaseClient, adminEmail }) {
  const [userId, setUserId] = useState("");
  const [trialDays, setTrialDays] = useState(2);
  const [trialStartDate, setTrialStartDate] = useState(""); // ISO-local (yyyy-mm-ddThh:mm)
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingUserId, setEditingUserId] = useState(null);

  const canSave = useMemo(() => {
    return !!userId && String(userId).trim().length > 10 && Number(trialDays) > 0;
  }, [userId, trialDays]);

  const resetForm = () => {
    setUserId("");
    setTrialDays(2);
    setTrialStartDate("");
    setNotes("");
    setEditingUserId(null);
  };

  const loadList = async () => {
    if (!supabaseClient) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: qErr } = await supabaseClient
        .from("user_trial_settings")
        .select("id,user_id,trial_days,trial_start_date,notes,updated_at,updated_by")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (qErr) throw qErr;
      setItems(data || []);
    } catch (e) {
      setError(e?.message || "Erro ao carregar trials customizados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (row) => {
    setEditingUserId(row.user_id);
    setUserId(row.user_id);
    setTrialDays(row.trial_days ?? 2);
    setNotes(row.notes ?? "");

    // Converte para input datetime-local (sem timezone)
    if (row.trial_start_date) {
      const d = new Date(row.trial_start_date);
      const pad = (n) => String(n).padStart(2, "0");
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setTrialStartDate(local);
    } else {
      setTrialStartDate("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabaseClient || !canSave) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        user_id: userId.trim(),
        trial_days: Number(trialDays),
        notes: notes || null,
        updated_by: adminEmail || null,
      };

      if (trialStartDate) {
        // datetime-local -> Date (local) -> ISO
        const iso = new Date(trialStartDate).toISOString();
        payload.trial_start_date = iso;
      }

      const { error: upErr } = await supabaseClient
        .from("user_trial_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (upErr) throw upErr;
      await loadList();
      resetForm();
    } catch (e2) {
      setError(e2?.message || "Erro ao salvar trial customizado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Trials customizados por usuário</h3>
          </div>
          <button
            type="button"
            onClick={loadList}
            className="text-xs px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">UUID do usuário</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="ex: 2d7c..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 outline-none transition-all text-sm"
              />
              {editingUserId && (
                <p className="text-[10px] text-purple-300 mt-1">Editando: {editingUserId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dias de trial</label>
              <input
                type="number"
                min={1}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 outline-none transition-all text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1">Ex.: 2 (padrão), 7, 14…</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Início do trial</label>
              <input
                type="datetime-local"
                value={trialStartDate}
                onChange={(e) => setTrialStartDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 outline-none transition-all text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1">Se vazio, usa o padrão do banco (now).</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Observação / motivo</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: cortesia, suporte solicitou extensão, problema na integração…"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 outline-none transition-all text-sm min-h-[90px]"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
            >
              Limpar
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                !canSave || saving
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600"
                  : "bg-orange-400 hover:bg-orange-500 text-white shadow-md shadow-orange-500/20 border-b-2 border-orange-600 active:border-b-0 active:translate-y-0.5"
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : editingUserId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-4">
          <h3 className="text-lg font-semibold text-white">Lista de trials configurados</h3>
          <div className="text-xs text-gray-500">{items.length} registros</div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 text-sm">Nenhum trial customizado ainda.</div>
        ) : (
          <div className="space-y-3">
            {items.map((row) => (
              <div key={row.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">User ID</div>
                    <div className="text-sm text-white font-mono break-all">{row.user_id}</div>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <span className="text-[11px] px-2 py-1 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20">
                        {row.trial_days} dias
                      </span>
                      <span className="text-[11px] px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        Início: {row.trial_start_date ? new Date(row.trial_start_date).toLocaleString() : "-"}
                      </span>
                      <span className="text-[11px] px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        Atualizado: {row.updated_at ? new Date(row.updated_at).toLocaleString() : "-"}
                      </span>
                      {row.updated_by && (
                        <span className="text-[11px] px-2 py-1 rounded bg-purple-500/10 text-purple-200 border border-purple-500/20">
                          by {row.updated_by}
                        </span>
                      )}
                    </div>
                    {row.notes && <div className="mt-2 text-xs text-gray-400 whitespace-pre-wrap">{row.notes}</div>}
                  </div>

                  <div className="flex gap-2 md:flex-col md:items-end">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 border border-purple-500/30 flex items-center gap-2 text-sm"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
