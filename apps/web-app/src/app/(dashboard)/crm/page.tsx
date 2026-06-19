'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLeads, createLead, updateLead, deleteLead, getUsers } from '@/lib/api';
import { getCookie, getAuthUser } from '@/lib/auth';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  procedure: string | null;
  estimatedValue: string | null;
  status: 'NEW' | 'NEGOTIATION' | 'SCHEDULED' | 'WON' | 'LOST';
  source: string | null;
  probability: number;
  warningText: string | null;
  notes: string | null;
  professionalId: string | null;
  professional?: { name: string } | null;
  createdAt: string;
}

interface StaffUser {
  id: string;
  name: string;
}

export default function CRMPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout View State (Kanban vs List)
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [searchQuery, setSearchQuery] = useState('');

  // Active User / Permissions
  const [canDeleteLead, setCanDeleteLead] = useState(false);

  // New Lead Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    procedure: '',
    estimatedValue: '',
    source: 'WhatsApp',
    probability: 20,
    notes: '',
    professionalId: '',
  });

  // Selected Lead Drawer State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState({
    estimatedValue: '',
    probability: 20,
    notes: '',
    professionalId: '',
    status: 'NEW',
  });

  // Check URL search and action triggers
  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
  }, [searchParams]);

  useEffect(() => {
    const user = getAuthUser();
    if (user) {
      // Restrict delete to ADMIN and GESTOR_RELACIONAMENTO
      const isAuthorized = user.profiles.includes('ADMIN') || user.profiles.includes('GESTOR_RELACIONAMENTO');
      setCanDeleteLead(isAuthorized);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }
      const [leadsData, staffData] = await Promise.all([
        getLeads(token),
        getUsers(token).catch(() => []),
      ]);
      setLeads(leadsData as Lead[]);
      setStaff(staffData as StaffUser[]);
      setError(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message ?? 'Erro ao carregar dados do CRM');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Form input handlers
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Create Lead Handler
  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const payload = {
        ...formData,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        procedure: formData.procedure || undefined,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
        probability: Number(formData.probability),
        professionalId: formData.professionalId || undefined,
      };

      await createLead(payload, token);
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        procedure: '',
        estimatedValue: '',
        source: 'WhatsApp',
        probability: 20,
        notes: '',
        professionalId: '',
      });
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      setCreateError(errorObj?.message ?? 'Erro ao criar lead');
    } finally {
      setCreateLoading(false);
    }
  }

  // Move Lead Status Handler (Drag/Click update)
  async function updateLeadStatus(id: string, newStatus: Lead['status']) {
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;

      // Update locally first for optimistic UI response
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead))
      );

      await updateLead(id, { status: newStatus }, token);
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Falha ao mover lead: ${errorObj?.message}`);
      loadData(); // Revert on failure
    }
  }

  // Select Lead to Open Drawer
  function openLeadDrawer(lead: Lead) {
    setSelectedLead(lead);
    setDrawerData({
      estimatedValue: lead.estimatedValue ? parseFloat(lead.estimatedValue).toString() : '',
      probability: lead.probability,
      notes: lead.notes || '',
      professionalId: lead.professionalId || '',
      status: lead.status,
    });
    setDrawerError(null);
  }

  // Save Lead updates from Drawer
  async function handleUpdateLeadDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      setDrawerLoading(true);
      setDrawerError(null);
      const token = getCookie('pipevitta_token');
      if (!token) return;

      const payload = {
        estimatedValue: drawerData.estimatedValue ? parseFloat(drawerData.estimatedValue) : undefined,
        probability: Number(drawerData.probability),
        notes: drawerData.notes || undefined,
        professionalId: drawerData.professionalId || undefined,
        status: drawerData.status as Lead['status'],
      };

      await updateLead(selectedLead.id, payload, token);
      setSelectedLead(null);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      setDrawerError(errorObj?.message ?? 'Erro ao salvar alterações');
    } finally {
      setDrawerLoading(false);
    }
  }

  // Delete Lead Handler
  async function handleDeleteLead(id: string) {
    if (!confirm('Deseja realmente remover este lead permanentemente?')) return;
    try {
      setDrawerLoading(true);
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await deleteLead(id, token);
      setSelectedLead(null);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      setDrawerError(errorObj?.message ?? 'Erro ao excluir lead');
    } finally {
      setDrawerLoading(false);
    }
  }

  // Filter leads by search term
  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      lead.name.toLowerCase().includes(query) ||
      (lead.procedure?.toLowerCase() ?? '').includes(query) ||
      (lead.phone ?? '').includes(query)
    );
  });

  // Calculate sum of values in column
  function getColumnSum(status: Lead['status']): string {
    const sum = filteredLeads
      .filter((l) => l.status === status)
      .reduce((acc, l) => acc + (l.estimatedValue ? parseFloat(l.estimatedValue) : 0), 0);
    return `R$ ${sum.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  }

  // Get list of leads in a specific status column
  function getLeadsByStatus(status: Lead['status']) {
    return filteredLeads.filter((l) => l.status === status);
  }

  // Get source icon mapping
  function getSourceIcon(source: string | null) {
    if (!source) return 'language';
    const s = source.toLowerCase();
    if (s.includes('whatsapp') || s.includes('whats')) return 'chat';
    if (s.includes('instagram') || s.includes('ig') || s.includes('dm')) return 'forum';
    if (s.includes('ads') || s.includes('meta')) return 'ads_click';
    if (s.includes('indica') || s.includes('recomenda')) return 'group_add';
    return 'link';
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-16 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-on-surface tracking-tight">
            Pipeline de Vendas (CRM)
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Qualificação e acompanhamento de novos leads de estética e tratamentos.
          </p>
        </div>

        {/* View Mode & Search controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-60">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/65 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar lead..."
              className="
                w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl
                text-sm text-on-surface placeholder:text-outline/50
                focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20
                outline-none transition-all
              "
            />
          </div>

          {/* Toggle Kanban/List view */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/20">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'KANBAN'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Visualização Kanban"
            >
              <span className="material-symbols-outlined block">view_kanban</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Visualização em Lista"
            >
              <span className="material-symbols-outlined block">view_list</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-4 flex-1">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
          <p className="text-sm text-on-surface-variant font-medium">Carregando painel do CRM...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center max-w-md mx-auto space-y-4 flex-1">
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <h3 className="font-bold text-on-surface">Erro ao carregar CRM</h3>
          <p className="text-xs text-on-surface-variant">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-full hover:bg-primary-container transition-all cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      ) : viewMode === 'LIST' ? (
        /* CRM LIST VIEW PANEL */
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden shrink-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surface-container-low/40 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="px-6 py-4">Lead</th>
                  <th className="px-6 py-4">Procedimento</th>
                  <th className="px-6 py-4">Canal Origem</th>
                  <th className="px-6 py-4">Estágio</th>
                  <th className="px-6 py-4 text-right">Valor Estimado</th>
                  <th className="px-6 py-4 text-center">Probabilidade</th>
                  <th className="px-6 py-4 text-center">Alerta</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface divide-y divide-outline-variant/15">
                {filteredLeads.map((lead) => {
                  const hasWarning = !!lead.warningText;
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => openLeadDrawer(lead)}
                      className="hover:bg-surface-container-high/20 transition-all cursor-pointer"
                    >
                      <td className="px-6 py-4 font-semibold text-primary hover:underline">
                        {lead.name}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {lead.procedure ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-semibold text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px]">
                            {getSourceIcon(lead.source)}
                          </span>
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold uppercase">
                          {lead.status === 'NEW' ? 'Novo Lead' : ''}
                          {lead.status === 'NEGOTIATION' ? 'Negociação' : ''}
                          {lead.status === 'SCHEDULED' ? 'Agendado' : ''}
                          {lead.status === 'WON' ? 'Fechado' : ''}
                          {lead.status === 'LOST' ? 'Perdido' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {lead.estimatedValue
                          ? `R$ ${parseFloat(lead.estimatedValue).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${lead.probability}%` }} />
                          </div>
                          <span className="text-xs font-bold">{lead.probability}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hasWarning ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {lead.warningText}
                          </span>
                        ) : (
                          <span className="text-outline text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CRM KANBAN BOARD */
        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-background kanban-board w-full -mx-4 px-4">
          <div className="flex gap-4 h-full pb-4">
            {/* Columns Mapping */}
            {(['NEW', 'NEGOTIATION', 'SCHEDULED', 'WON'] as const).map((columnKey) => {
              const columnLeads = getLeadsByStatus(columnKey);
              const columnValue = getColumnSum(columnKey);

              const colTitle =
                columnKey === 'NEW'
                  ? 'Novos Leads'
                  : columnKey === 'NEGOTIATION'
                  ? 'Em Negociação'
                  : columnKey === 'SCHEDULED'
                  ? 'Agendado'
                  : 'Fechado / Ganho';

              const badgeColor =
                columnKey === 'NEW'
                  ? 'bg-primary'
                  : columnKey === 'NEGOTIATION'
                  ? 'bg-secondary'
                  : columnKey === 'SCHEDULED'
                  ? 'bg-amber-600'
                  : 'bg-emerald-600';

              return (
                <div
                  key={columnKey}
                  className="flex-1 min-w-[280px] max-w-sm flex flex-col max-h-full bg-surface-container-low/40 p-3 rounded-2xl border border-outline-variant/10 shadow-inner"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${badgeColor}`} />
                      <h3 className="font-display font-bold text-on-surface text-sm">{colTitle}</h3>
                      <span className="bg-surface-container-high text-on-surface-variant text-xs font-bold px-2 py-0.5 rounded-full">
                        {columnLeads.length}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-on-surface-variant/80 mb-3 px-1">
                    Previsto: {columnValue}
                  </div>

                  {/* Cards Area */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 custom-scrollbar min-h-[200px]">
                    {columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group select-none"
                      >
                        {/* Alert tag decoration */}
                        {lead.status === 'WON' && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        )}
                        {lead.warningText && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                        )}

                        <div className="flex justify-between items-start mb-2.5" onClick={() => openLeadDrawer(lead)}>
                          <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-[12px]">
                              {getSourceIcon(lead.source)}
                            </span>
                            {lead.source}
                          </span>

                          <span className="material-symbols-outlined text-outline text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                            edit
                          </span>
                        </div>

                        <div onClick={() => openLeadDrawer(lead)}>
                          <h4 className="font-bold text-on-surface text-sm mb-0.5">{lead.name}</h4>
                          <p className="text-xs text-on-surface-variant mb-3">{lead.procedure ?? 'Sem procedimento'}</p>
                        </div>

                        {/* Warning warning text card */}
                        {lead.warningText && (
                          <div className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 mb-3 border border-amber-100">
                            <span className="material-symbols-outlined text-[13px] font-bold">warning</span>
                            {lead.warningText}
                          </div>
                        )}

                        {/* Card bottom details */}
                        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3 mt-1 shrink-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                            {lead.estimatedValue
                              ? `R$ ${parseFloat(lead.estimatedValue).toLocaleString('pt-BR', {
                                  maximumFractionDigits: 0,
                                })}`
                              : '—'}
                          </div>

                          {/* Quick move actions */}
                          <div className="flex items-center gap-1">
                            {columnKey !== 'NEW' && (
                              <button
                                onClick={() => {
                                  const prevMap: Record<Lead['status'], Lead['status']> = {
                                    NEGOTIATION: 'NEW',
                                    SCHEDULED: 'NEGOTIATION',
                                    WON: 'SCHEDULED',
                                    NEW: 'NEW',
                                    LOST: 'NEW',
                                  };
                                  updateLeadStatus(lead.id, prevMap[columnKey]);
                                }}
                                className="p-0.5 hover:bg-surface-container-high rounded text-outline hover:text-primary cursor-pointer"
                                title="Mover para esquerda"
                              >
                                <span className="material-symbols-outlined text-[16px] font-bold">arrow_left</span>
                              </button>
                            )}
                            {columnKey !== 'WON' && (
                              <button
                                onClick={() => {
                                  const nextMap: Record<Lead['status'], Lead['status']> = {
                                    NEW: 'NEGOTIATION',
                                    NEGOTIATION: 'SCHEDULED',
                                    SCHEDULED: 'WON',
                                    WON: 'WON',
                                    LOST: 'WON',
                                  };
                                  updateLeadStatus(lead.id, nextMap[columnKey]);
                                }}
                                className="p-0.5 hover:bg-surface-container-high rounded text-outline hover:text-primary cursor-pointer"
                                title="Mover para direita"
                              >
                                <span className="material-symbols-outlined text-[16px] font-bold">arrow_right</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {columnLeads.length === 0 && (
                      <div className="py-8 text-center text-xs text-outline border border-dashed border-outline-variant/30 rounded-xl">
                        Nenhum lead nesta coluna
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* FAB: Add Lead Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-surface-tint transition-all duration-200 flex items-center justify-center z-30 group cursor-pointer"
        title="Cadastrar Novo Lead"
      >
        <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/20">
              <h3 className="font-display font-bold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">group_add</span>
                Novo Lead de Vendas
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setCreateError(null);
                }}
                className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              {createError && (
                <div className="bg-error-container text-on-error-container p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border border-error/20">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Nome do Lead</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Mariana Silva"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">WhatsApp (Opcional)</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Ex: +5511999999999"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">E-mail (Opcional)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Ex: mariana@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Procedimento</label>
                  <input
                    type="text"
                    name="procedure"
                    value={formData.procedure}
                    onChange={handleInputChange}
                    placeholder="Ex: Preenchimento Labial"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Canal Origem</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram DM">Instagram DM</option>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Site/Landing Page">Site/Landing Page</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    name="estimatedValue"
                    value={formData.estimatedValue}
                    onChange={handleInputChange}
                    placeholder="Ex: 2400"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Atribuir a Profissional</label>
                  <select
                    name="professionalId"
                    value={formData.professionalId}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  >
                    <option value="">Não atribuir</option>
                    {staff.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Notas do Lead</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Observações do lead ou histórico inicial de contato..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant/40 hover:bg-surface-container-high rounded-xl text-sm font-bold text-on-surface transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-primary hover:bg-primary-container text-on-primary font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Cadastrar Lead</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Lead slide-over / drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setSelectedLead(null)} />

          <div className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl border-l border-outline-variant/30 flex flex-col p-6 animate-slide-in overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4 mb-5 shrink-0">
              <h3 className="font-display font-extrabold text-lg text-on-surface">Detalhamento do Lead</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {drawerError && (
              <div className="bg-error-container text-on-error-container p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border border-error/20 mb-4 shrink-0">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>{drawerError}</span>
              </div>
            )}

            {/* Content Form */}
            <form onSubmit={handleUpdateLeadDetails} className="flex-1 space-y-5">
              <div className="bg-surface-container-low p-4 rounded-xl space-y-2.5 border border-outline-variant/15 shrink-0">
                <p className="text-base font-extrabold text-on-surface">{selectedLead.name}</p>
                <div className="text-xs text-on-surface-variant/80 space-y-1 font-medium">
                  <p>WhatsApp: {selectedLead.phone ?? '—'}</p>
                  <p>E-mail: {selectedLead.email ?? '—'}</p>
                  <p>Procedimento: {selectedLead.procedure ?? '—'}</p>
                  <p>Canal: {selectedLead.source}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Estágio no Funil</label>
                <select
                  value={drawerData.status}
                  onChange={(e) => setDrawerData((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant font-semibold"
                >
                  <option value="NEW">Novos Leads</option>
                  <option value="NEGOTIATION">Em Negociação</option>
                  <option value="SCHEDULED">Agendado</option>
                  <option value="WON">Fechado / Ganho (Paciente)</option>
                  <option value="LOST">Perdido</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    value={drawerData.estimatedValue}
                    onChange={(e) => setDrawerData((prev) => ({ ...prev, estimatedValue: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Probabilidade (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={drawerData.probability}
                    onChange={(e) => setDrawerData((prev) => ({ ...prev, probability: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Profissional Responsável</label>
                <select
                  value={drawerData.professionalId}
                  onChange={(e) => setDrawerData((prev) => ({ ...prev, professionalId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                >
                  <option value="">Não atribuído</option>
                  {staff.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Histórico & Anotações</label>
                <textarea
                  rows={4}
                  value={drawerData.notes}
                  onChange={(e) => setDrawerData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Atualize anotações sobre o contato com o lead..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none text-on-surface"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/20 shrink-0">
                <button
                  type="submit"
                  disabled={drawerLoading}
                  className="w-full py-2.5 bg-primary hover:bg-primary-container text-on-primary font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {drawerLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>

                {canDeleteLead && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLead(selectedLead.id)}
                    disabled={drawerLoading}
                    className="w-full py-2.5 border border-error/40 hover:bg-error-container/10 text-error font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Excluir Lead
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
