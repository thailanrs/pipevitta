'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLeads, createLead, updateLead, deleteLead, getUsers, createPatient } from '@/lib/api';
import { getCookie, getAuthUser } from '@/lib/auth';
import { CSVExportButton } from '@/components/csv-export-button';
import { AdvancedFilters } from '@/components/advanced-filters';
import { PeriodSelector, PeriodDropdownValue } from '@/components/period-selector';
import { SelectionCell } from '@/components/selection-cell';
import { BatchActionMenu } from '@/components/batch-action-menu';
import { TagsInput } from '@/components/tags-input';

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
  tags?: { name: string }[] | null;
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

  // Filter states
  const [filterFunnel, setFilterFunnel] = useState<string>('ALL');
  const [period, setPeriod] = useState<PeriodDropdownValue>({ type: 'ALL' });
  
  // Advanced filters (unified state)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [crmFilters, setCrmFilters] = useState({
    status: 'ALL',
    source: 'ALL',
    procedure: '',
    professionalId: 'ALL',
    estimatedValueMin: '',
    estimatedValueMax: '',
    probabilityMin: '',
    tags: [] as string[],
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Drag and drop helper state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Active User / Permissions
  const [canDeleteLead, setCanDeleteLead] = useState(false);

  // Inline editing in lead drawer
  const [editingField, setEditingField] = useState<string | null>(null);

  // New Lead Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    funnel: 'AESTHETICS' as 'AESTHETICS' | 'DENTAL',
    procedure: '',
    estimatedValue: '',
    source: 'WhatsApp',
    probability: 20,
    notes: '',
    professionalId: '',
    tags: [] as string[],
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
    status: 'NEW' as Lead['status'],
    funnel: 'AESTHETICS' as 'AESTHETICS' | 'DENTAL',
    cleanProcedure: '',
    tags: [] as string[],
    phone: '',
    email: '',
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

  // Global ESC Key Handler to close modal and drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setCreateError(null);
        setSelectedLead(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      const procedure = buildProcedureWithFunnel(formData.procedure, formData.funnel);

      const payload = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        procedure,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
        source: formData.source,
        probability: Number(formData.probability),
        notes: formData.notes || undefined,
        professionalId: formData.professionalId || undefined,
        warningText: undefined,
        tags: formData.tags,
      };

      await createLead(payload, token);
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        funnel: 'AESTHETICS',
        procedure: '',
        estimatedValue: '',
        source: 'WhatsApp',
        probability: 20,
        notes: '',
        professionalId: '',
        tags: [],
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

  const getInitials = (n: string) => {
    const parts = n.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  function calculateLeadScore(lead: Lead) {
    let score = 0;
    if (lead.estimatedValue && parseFloat(lead.estimatedValue) > 0) score += 25;
    if (lead.phone) score += 25;
    if (lead.email) score += 15;
    if (lead.professionalId) score += 15;
    if (lead.probability) {
      score += Math.min(20, Math.round((lead.probability / 100) * 20));
    }
    return Math.min(100, score);
  }

  const handleBatchChangeStage = async () => {
    const stage = prompt('Digite o novo estágio (NEW, NEGOTIATION, SCHEDULED, WON, LOST):');
    if (!stage) return;
    const upperStage = stage.toUpperCase() as Lead['status'];
    if (!['NEW', 'NEGOTIATION', 'SCHEDULED', 'WON', 'LOST'].includes(upperStage)) {
      alert('Estágio inválido.');
      return;
    }
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await Promise.all(selectedLeadIds.map((id) => updateLead(id, { status: upperStage }, token)));
      setSelectedLeadIds([]);
      loadData();
    } catch {
      alert('Erro ao atualizar estágio em lote.');
    }
  };

  const handleBatchDeleteLeads = async () => {
    if (!confirm('Deseja realmente remover os leads selecionados?')) return;
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await Promise.all(selectedLeadIds.map((id) => deleteLead(id, token)));
      setSelectedLeadIds([]);
      loadData();
    } catch {
      alert('Erro ao remover leads em lote.');
    }
  };

  const handleBatchAssignProfessional = async () => {
    if (staff.length === 0) {
      alert('Nenhum profissional disponível para atribuição.');
      return;
    }
    const optionsText = staff.map((s, index) => `${index + 1}. ${s.name}`).join('\n');
    const choice = prompt("Selecione o número do profissional/SDR para atribuir aos leads selecionados:\n" + optionsText);
    if (choice === null) return;
    const choiceIndex = parseInt(choice) - 1;
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= staff.length) {
      alert('Opção inválida.');
      return;
    }
    const targetProfessional = staff[choiceIndex];
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await Promise.all(
        selectedLeadIds.map((id) =>
          updateLead(id, { professionalId: targetProfessional.id }, token)
        )
      );
      setSelectedLeadIds([]);
      loadData();
    } catch {
      alert('Erro ao atribuir profissional em lote.');
    }
  };

  const handleCrmFilterChange = (key: string, value: string | number | boolean | string[] | null | undefined) => {
    setCrmFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearCrmField = (key: string) => {
    setCrmFilters((prev) => ({
      ...prev,
      [key]: key === 'status' || key === 'source' || key === 'professionalId' ? 'ALL' : (key === 'tags' ? [] : '')
    }));
  };

  const handleClearAllCrmFilters = () => {
    setCrmFilters({
      status: 'ALL',
      source: 'ALL',
      procedure: '',
      professionalId: 'ALL',
      estimatedValueMin: '',
      estimatedValueMax: '',
      probabilityMin: '',
      tags: [],
    });
  };

  const crmFilterFields = [
    {
      key: 'status',
      label: 'Estágio',
      type: 'select' as const,
      options: [
        { value: 'NEW', label: 'Novo Lead' },
        { value: 'NEGOTIATION', label: 'Em Negociação' },
        { value: 'SCHEDULED', label: 'Agendado' },
        { value: 'WON', label: 'Fechado / Ganho' },
        { value: 'LOST', label: 'Perdido' },
      ],
    },
    {
      key: 'source',
      label: 'Canal de Origem',
      type: 'select' as const,
      options: [
        { value: 'WhatsApp', label: 'WhatsApp' },
        { value: 'Instagram DM', label: 'Instagram DM' },
        { value: 'Meta Ads', label: 'Meta Ads' },
        { value: 'Indicação', label: 'Indicação' },
        { value: 'Site/Landing Page', label: 'Site/Landing Page' },
      ],
    },
    {
      key: 'professionalId',
      label: 'Profissional',
      type: 'select' as const,
      options: [
        { value: 'NONE', label: 'Não atribuído' },
        ...staff.map((s) => ({ value: s.id, label: s.name })),
      ],
    },
    {
      key: 'procedure',
      label: 'Procedimento',
      type: 'text' as const,
      placeholder: 'Ex: Preenchimento Labial',
    },
    {
      key: 'estimatedValueMin',
      label: 'Valor Estimado Mín',
      type: 'number' as const,
      placeholder: 'Mínimo R$',
    },
    {
      key: 'estimatedValueMax',
      label: 'Valor Estimado Máx',
      type: 'number' as const,
      placeholder: 'Máximo R$',
    },
    {
      key: 'probabilityMin',
      label: 'Probabilidade Mín (%)',
      type: 'number' as const,
      placeholder: 'Ex: 50',
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'tags' as const,
      placeholder: 'Pressione Enter para adicionar tag...',
    },
  ];

  const crmValueLabelsMap = {
    status: {
      NEW: 'Novo Lead',
      NEGOTIATION: 'Em Negociação',
      SCHEDULED: 'Agendado',
      WON: 'Fechado / Ganho',
      LOST: 'Perdido',
    },
    source: {
      WhatsApp: 'WhatsApp',
      'Instagram DM': 'Instagram DM',
      'Meta Ads': 'Meta Ads',
      Indicação: 'Indicação',
      'Site/Landing Page': 'Site/Landing Page',
    },
    professionalId: {
      NONE: 'Não atribuído',
      ...staff.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}),
    },
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
    
    // Store mouse offset X and Y from the top-left of the dragged card
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabX = e.clientX - rect.left;
    const grabY = e.clientY - rect.top;
    e.dataTransfer.setData('grabX', String(grabX));
    e.dataTransfer.setData('grabY', String(grabY));
    e.dataTransfer.setData('cardWidth', String(rect.width));
    e.dataTransfer.setData('cardHeight', String(rect.height));
  };

  const handleDrop = async (e: React.DragEvent, fallbackStatus: Lead['status']) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const grabX = Number(e.dataTransfer.getData('grabX') || 0);
    const grabY = Number(e.dataTransfer.getData('grabY') || 0);
    const cardWidth = Number(e.dataTransfer.getData('cardWidth') || 250);
    const cardHeight = Number(e.dataTransfer.getData('cardHeight') || 150);

    const cardLeft = e.clientX - grabX;
    const cardTop = e.clientY - grabY;

    const columns = document.querySelectorAll('.kanban-column');
    let targetStatus = fallbackStatus;
    let bestOverlapArea = -1;

    columns.forEach((col) => {
      const colRect = col.getBoundingClientRect();
      const colStatus = col.getAttribute('data-status-id') as Lead['status'] | null;
      if (!colStatus) return;

      // Calculate horizontal overlap width
      const overlapLeft = Math.max(cardLeft, colRect.left);
      const overlapRight = Math.min(cardLeft + cardWidth, colRect.right);
      const overlapWidth = Math.max(0, overlapRight - overlapLeft);

      // Calculate vertical overlap height
      const overlapTop = Math.max(cardTop, colRect.top);
      const overlapBottom = Math.min(cardTop + cardHeight, colRect.bottom);
      const overlapHeight = Math.max(0, overlapBottom - overlapTop);

      const overlapArea = overlapWidth * overlapHeight;

      if (overlapArea > bestOverlapArea) {
        bestOverlapArea = overlapArea;
        targetStatus = colStatus;
      }
    });

    setDraggedLeadId(null);
    await updateLeadStatus(leadId, targetStatus);
  };

  function getFunnelFromProcedure(procedure: string | null): 'AESTHETICS' | 'DENTAL' {
    if (!procedure) return 'AESTHETICS';
    if (procedure.startsWith('[Odontologia]')) return 'DENTAL';
    if (procedure.startsWith('[Harmonização]')) return 'AESTHETICS';
    
    // Dynamic fallback ("plus" as requested)
    const p = procedure.toLowerCase();
    const AESTHETICS_PROCEDURES = [
      'harmonização', 'botox', 'toxina', 'preenchimento', 'fios de pdo', 'pdo', 'bioestimulador', 'peeling', 'estética'
    ];
    const isAesthetics = AESTHETICS_PROCEDURES.some(keyword => p.includes(keyword));
    return isAesthetics ? 'AESTHETICS' : 'DENTAL';
  }

  function getCleanProcedure(procedure: string | null): string {
    if (!procedure) return '';
    return procedure
      .replace(/^\[Harmonização\]\s*/, '')
      .replace(/^\[Odontologia\]\s*/, '')
      .trim();
  }

  function buildProcedureWithFunnel(cleanProcedure: string, funnel: 'AESTHETICS' | 'DENTAL'): string {
    const prefix = funnel === 'DENTAL' ? '[Odontologia]' : '[Harmonização]';
    return `${prefix} ${cleanProcedure.trim()}`.trim();
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
      funnel: getFunnelFromProcedure(lead.procedure),
      cleanProcedure: getCleanProcedure(lead.procedure),
      tags: lead.tags ? lead.tags.map((t) => t.name) : [],
      phone: lead.phone || '',
      email: lead.email || '',
    });
    setDrawerError(null);
  }

  // Save Lead updates from Drawer (now field-specific)
  async function handleSaveLeadField(field: 'funnel' | 'cleanProcedure' | 'status' | 'professionalId' | 'valueProbability' | 'tags' | 'notes' | 'phone' | 'email') {
    if (!selectedLead) return;
    try {
      setDrawerLoading(true);
      setDrawerError(null);
      const token = getCookie('pipevitta_token');
      if (!token) return;

      let payload: Record<string, unknown> = {};

      if (field === 'funnel' || field === 'cleanProcedure') {
        const procedure = buildProcedureWithFunnel(drawerData.cleanProcedure, drawerData.funnel);
        payload = { procedure };
      } else if (field === 'status') {
        payload = { status: drawerData.status };
      } else if (field === 'professionalId') {
        payload = { professionalId: drawerData.professionalId || null };
      } else if (field === 'valueProbability') {
        payload = {
          estimatedValue: drawerData.estimatedValue ? parseFloat(drawerData.estimatedValue) : null,
          probability: Number(drawerData.probability),
        };
      } else if (field === 'tags') {
        payload = { tags: drawerData.tags };
      } else if (field === 'notes') {
        payload = { notes: drawerData.notes || null };
      } else if (field === 'phone') {
        payload = { phone: drawerData.phone || '' };
      } else if (field === 'email') {
        payload = { email: drawerData.email || '' };
      }

      const updatedLead = await updateLead(selectedLead.id, payload, token);
      const lead = updatedLead as Lead;
      setSelectedLead(lead);
      setDrawerData({
        estimatedValue: lead.estimatedValue ? parseFloat(lead.estimatedValue).toString() : '',
        probability: lead.probability,
        notes: lead.notes || '',
        professionalId: lead.professionalId || '',
        status: lead.status,
        funnel: getFunnelFromProcedure(lead.procedure),
        cleanProcedure: getCleanProcedure(lead.procedure),
        tags: lead.tags ? lead.tags.map((t) => t.name) : [],
        phone: lead.phone || '',
        email: lead.email || '',
      });
      setEditingField(null);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      setDrawerError(errorObj?.message ?? 'Erro ao salvar alteração');
    } finally {
      setDrawerLoading(false);
    }
  }

  async function handleDisqualifyLead() {
    if (!selectedLead) return;
    if (!confirm('Deseja desqualificar este lead? ele será marcado como Perdido.')) return;
    try {
      setDrawerLoading(true);
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await updateLead(selectedLead.id, { status: 'LOST' }, token);
      setSelectedLead(null);
      loadData();
    } catch {
      alert('Erro ao desqualificar lead.');
    } finally {
      setDrawerLoading(false);
    }
  }

  async function handleConvertToPatient() {
    if (!selectedLead) return;
    const cpf = prompt(`Digite o CPF para cadastrar ${selectedLead.name} como paciente:`);
    if (cpf === null) return;
    if (!cpf.trim()) {
      alert('CPF é obrigatório para cadastrar o paciente.');
      return;
    }

    try {
      setDrawerLoading(true);
      const token = getCookie('pipevitta_token');
      if (!token) return;

      // 1. Create Patient
      await createPatient({
        name: selectedLead.name,
        email: selectedLead.email,
        phone: selectedLead.phone || '',
        cpf: cpf.trim(),
      }, token);

      // 2. Set Lead to WON
      await updateLead(selectedLead.id, { status: 'WON' }, token);

      alert('Lead convertido em Paciente com sucesso! Redirecionando para a Agenda para agendamento.');
      setSelectedLead(null);
      loadData();
      router.push('/agenda');
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Erro ao converter lead: ${errorObj?.message}`);
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

  const allExistingTags = Array.from(
    new Set(leads.flatMap((l) => (l.tags ? l.tags.map((t) => t.name) : [])))
  );

  // Filter leads by search term, funnel, period, and crmFilters metadata
  const filteredLeads = leads.filter((lead) => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const cleanProc = getCleanProcedure(lead.procedure).toLowerCase();
      const matchSearch =
        lead.name.toLowerCase().includes(query) ||
        cleanProc.includes(query) ||
        (lead.phone ?? '').includes(query);
      if (!matchSearch) return false;
    }

    // 2. Funnel Filter (Global dropdown distinct by procedure category)
    if (filterFunnel !== 'ALL') {
      const leadFunnel = getFunnelFromProcedure(lead.procedure);
      if (leadFunnel !== filterFunnel) return false;
    }

    // 3. Period / Date Filters
    const leadDate = new Date(lead.createdAt);
    const now = new Date();
    
    if (period.type === 'TODAY') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      if (leadDate < todayStart || leadDate > todayEnd) return false;
    } else if (period.type === 'LAST_7_DAYS') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (leadDate < sevenDaysAgo) return false;
    } else if (period.type === 'LAST_30_DAYS') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (leadDate < thirtyDaysAgo) return false;
    } else if (period.type === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      if (leadDate < startOfMonth || leadDate > endOfMonth) return false;
    } else if (period.type === 'CUSTOM') {
      if (period.startDate) {
        const start = new Date(period.startDate + 'T00:00:00');
        if (leadDate < start) return false;
      }
      if (period.endDate) {
        const end = new Date(period.endDate + 'T23:59:59');
        if (leadDate > end) return false;
      }
    }

    // 4. Advanced Filters (crmFilters)
    if (crmFilters.status !== 'ALL' && lead.status !== crmFilters.status) return false;
    if (crmFilters.source !== 'ALL' && lead.source !== crmFilters.source) return false;
    if (crmFilters.professionalId !== 'ALL') {
      if (crmFilters.professionalId === 'NONE') {
        if (lead.professionalId) return false;
      } else if (lead.professionalId !== crmFilters.professionalId) {
        return false;
      }
    }
    if (crmFilters.procedure) {
      const cleanProc = getCleanProcedure(lead.procedure).toLowerCase();
      if (!cleanProc.includes(crmFilters.procedure.toLowerCase())) return false;
    }
    if (crmFilters.estimatedValueMin) {
      const minVal = parseFloat(crmFilters.estimatedValueMin);
      if (!lead.estimatedValue || parseFloat(lead.estimatedValue) < minVal) return false;
    }
    if (crmFilters.estimatedValueMax) {
      const maxVal = parseFloat(crmFilters.estimatedValueMax);
      if (!lead.estimatedValue || parseFloat(lead.estimatedValue) > maxVal) return false;
    }
    if (crmFilters.probabilityMin) {
      const minProb = parseInt(crmFilters.probabilityMin);
      if (lead.probability < minProb) return false;
    }
    if (crmFilters.tags && crmFilters.tags.length > 0) {
      const leadTags = lead.tags
        ? lead.tags.map((t) => t.name.toLowerCase())
        : [];
      const hasAnyTag = crmFilters.tags.some((tag) =>
        leadTags.includes(tag.toLowerCase())
      );
      if (!hasAnyTag) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalLeads = filteredLeads.length;
  const totalPages = Math.ceil(totalLeads / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalLeads);
  const paginatedLeads = viewMode === 'LIST' 
    ? filteredLeads.slice(startIndex, endIndex)
    : filteredLeads;

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
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/65 text-xl">
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

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low/30 px-6 py-4 rounded-2xl border border-outline-variant/30 shrink-0 select-none">
        <div className="flex flex-wrap items-center gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Período:</span>
            <PeriodSelector
              mode="dropdown"
              dropdownValue={period}
              onDropdownChange={(val) => setPeriod(val)}
            />
          </div>

          {/* Funnel/Stage Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Funil:</span>
            <select
              value={filterFunnel}
              onChange={(e) => setFilterFunnel(e.target.value)}
              className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow cursor-pointer"
            >
              <option value="ALL">Todos os Funis</option>
              <option value="AESTHETICS">Funil de Harmonização Facial</option>
              <option value="DENTAL">Funil de Odontologia</option>
            </select>
          </div>
        </div>

        {viewMode === 'LIST' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 border border-outline rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors cursor-pointer ${
                showAdvancedFilters ? 'bg-primary/10 text-primary border-primary/20' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              Filtros Avançados
            </button>
            <CSVExportButton
              headers={['Lead', 'Procedimento', 'Canal Origem', 'Estágio', 'Valor Estimado', 'Probabilidade', 'Data Criação']}
              rows={filteredLeads.map((lead) => [
                `"${lead.name}"`,
                `"${lead.procedure ?? '—'}"`,
                `"${lead.source ?? '—'}"`,
                `"${lead.status}"`,
                `"R$ ${lead.estimatedValue ? parseFloat(lead.estimatedValue).toFixed(2) : '0.00'}"`,
                `"${lead.probability}%"`,
                `"${new Date(lead.createdAt).toLocaleDateString('pt-BR')}"`
              ])}
              filename={`leads_crm_${new Date().toISOString().split('T')[0]}.csv`}
            />
          </div>
        )}
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
        <div className="space-y-4 shrink-0">
          {/* Advanced Filters Panel */}
          <AdvancedFilters
            isOpen={showAdvancedFilters}
            filters={crmFilters}
            fields={crmFilterFields}
            onChange={handleCrmFilterChange}
            onClearField={handleClearCrmField}
            onClearAll={handleClearAllCrmFilters}
            valueLabelsMap={crmValueLabelsMap}
            tagSuggestions={allExistingTags}
          />

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-container-low/40 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="px-6 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(filteredLeads.map((l) => l.id));
                          } else {
                            setSelectedLeadIds([]);
                          }
                        }}
                        className="rounded border-outline-variant text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4">Lead</th>
                    <th className="px-6 py-4">Procedimento</th>
                    <th className="px-6 py-4">Canal Origem</th>
                    <th className="px-6 py-4">Estágio</th>
                    <th className="px-6 py-4 text-right">Valor Estimado</th>
                    <th className="px-6 py-4 text-center">Probabilidade</th>
                    <th className="px-6 py-4">Tags</th>
                    <th className="px-6 py-4 text-center">Alerta</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-on-surface divide-y divide-outline-variant/15">
                  {paginatedLeads.map((lead) => {
                    const hasWarning = !!lead.warningText;
                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-surface-container-high/20 transition-all cursor-pointer group ${selectedLeadIds.includes(lead.id) ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-6 py-4 w-12 text-center select-none" onClick={(e) => e.stopPropagation()}>
                          <SelectionCell
                            id={lead.id}
                            name={lead.name}
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={(isChecked) => {
                              if (isChecked) {
                                setSelectedLeadIds((prev) => [...prev, lead.id]);
                              } else {
                                setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
                              }
                            }}
                          />
                        </td>
                        <td
                          className="px-6 py-4 font-semibold text-primary hover:underline font-bold"
                          onClick={() => openLeadDrawer(lead)}
                        >
                          {lead.name}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant" onClick={() => openLeadDrawer(lead)}>
                          {lead.procedure ?? '—'}
                        </td>
                        <td className="px-6 py-4" onClick={() => openLeadDrawer(lead)}>
                          <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded text-xs font-semibold text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">
                              {getSourceIcon(lead.source)}
                            </span>
                            {lead.source}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={() => openLeadDrawer(lead)}>
                          <span className="text-xs font-bold uppercase">
                            {lead.status === 'NEW' ? 'Novo Lead' : ''}
                            {lead.status === 'NEGOTIATION' ? 'Negociação' : ''}
                            {lead.status === 'SCHEDULED' ? 'Agendado' : ''}
                            {lead.status === 'WON' ? 'Fechado / Ganho' : ''}
                            {lead.status === 'LOST' ? 'Perdido' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium" onClick={() => openLeadDrawer(lead)}>
                          {lead.estimatedValue
                            ? `R$ ${parseFloat(lead.estimatedValue).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-center" onClick={() => openLeadDrawer(lead)}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${lead.probability}%` }} />
                            </div>
                            <span className="text-xs font-bold">{lead.probability}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4" onClick={() => openLeadDrawer(lead)}>
                          {lead.tags && lead.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lead.tags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-outline text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center" onClick={() => openLeadDrawer(lead)}>
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

            {/* Paginator Footer */}
            <div className="px-6 py-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest text-xs font-bold text-on-surface-variant select-none">
              <div className="text-sm font-semibold text-on-surface-variant">
                {totalLeads === 0 ? (
                  'Mostrando 0 de 0 leads'
                ) : (
                  <>
                    Mostrando <span className="font-bold text-on-surface">{startIndex + 1}</span>-
                    <span className="font-bold text-on-surface">{endIndex}</span> de{' '}
                    <span className="font-bold text-on-surface">{totalLeads}</span> leads
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6">
                {/* Rows per page selector */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Linhas por página:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-2 py-1 text-xs font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Page Navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low disabled:opacity-40 transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm block">chevron_left</span>
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const p = idx + 1;
                      const shouldShow = p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                      const showEllipsisBefore = p === 2 && currentPage > 3;
                      const showEllipsisAfter = p === totalPages - 1 && currentPage < totalPages - 2;

                      if (shouldShow) {
                        return (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentPage === p
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'hover:bg-surface-container-low text-on-surface-variant'
                            }`}
                            type="button"
                          >
                            {p}
                          </button>
                        );
                      }

                      if (showEllipsisBefore && p < currentPage) {
                        return <span key={p} className="px-1 text-outline">...</span>;
                      }
                      if (showEllipsisAfter && p > currentPage) {
                        return <span key={p} className="px-1 text-outline">...</span>;
                      }

                      return null;
                    })}

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low disabled:opacity-40 transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm block">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <BatchActionMenu
            selectedCount={selectedLeadIds.length}
            onClear={() => setSelectedLeadIds([])}
            actions={[
              {
                label: 'Atribuir Responsável / SDR',
                icon: 'person_add',
                variant: 'primary',
                onClick: handleBatchAssignProfessional,
              },
              {
                label: 'Alterar Estágio',
                icon: 'move_up',
                variant: 'primary',
                onClick: handleBatchChangeStage,
              },
              {
                label: 'Excluir Leads',
                icon: 'delete',
                variant: 'danger',
                onClick: handleBatchDeleteLeads,
              },
            ]}
          />
        </div>
      ) : (
        /* CRM KANBAN BOARD */
        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-background kanban-board w-full -mx-4 px-4">
          <div className="flex gap-4 h-full pb-4">
            {/* Columns Mapping */}
            {(() => {
              const activeColumns = ['NEW', 'NEGOTIATION', 'SCHEDULED', 'WON'] as const;

              return activeColumns.map((columnKey) => {
                const columnLeads = getLeadsByStatus(columnKey);
                const columnValue = getColumnSum(columnKey);

                const colTitle =
                  columnKey === 'NEW'
                    ? 'Novos Leads'
                    : columnKey === 'NEGOTIATION'
                    ? 'Em Negociação'
                    : columnKey === 'SCHEDULED'
                    ? 'Agendado'
                    : columnKey === 'WON'
                    ? 'Fechado / Ganho'
                    : 'Perdido';

                const badgeColor =
                  columnKey === 'NEW'
                    ? 'bg-primary'
                    : columnKey === 'NEGOTIATION'
                    ? 'bg-secondary'
                    : columnKey === 'SCHEDULED'
                    ? 'bg-amber-600'
                    : columnKey === 'WON'
                    ? 'bg-emerald-600'
                    : 'bg-error';

                return (
                  <div
                    key={columnKey}
                    className="kanban-column flex-1 min-w-[280px] max-w-sm flex flex-col max-h-full bg-surface-container-low/40 p-3 rounded-2xl border border-outline-variant/10 shadow-inner"
                    data-status-id={columnKey}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, columnKey)}
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
                    <div className="text-xs font-bold text-on-surface-variant/80 mb-3 px-1">
                      Previsto: {columnValue}
                    </div>

                    {/* Cards Area */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 custom-scrollbar min-h-[200px]">
                      {columnLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => openLeadDrawer(lead)}
                          className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group select-none"
                        >
                          {/* Alert tag decoration */}
                          {lead.status === 'WON' && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                          )}
                          {lead.status === 'LOST' && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />
                          )}
                          {lead.warningText && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                          )}

                          <div className="flex justify-between items-start mb-2.5">
                            <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-md">
                              <span className="material-symbols-outlined text-xs">
                                {getSourceIcon(lead.source)}
                              </span>
                              {lead.source}
                            </span>

                            <span className="material-symbols-outlined text-outline text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              edit
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-on-surface text-sm mb-0.5">{lead.name}</h4>
                            <p className="text-xs text-on-surface-variant mb-3">{lead.procedure ?? 'Sem procedimento'}</p>
                          </div>

                          {/* Tags customizadas card */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {lead.tags.map((tag, idx) => (
                                <div key={idx} className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  {tag.name}
                                </div>
                              ))}
                            </div>
                          )}

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

                            {/* Assigned Professional */}
                            <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                              <span className="material-symbols-outlined text-xs">person</span>
                              {lead.professional ? lead.professional.name : 'Não atribuído'}
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
              });
            })()}
          </div>
        </main>
      )}

      {/* FAB: Add Lead Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-surface-tint transition-all duration-200 flex items-center justify-center z-30 group cursor-pointer"
        title="Cadastrar Novo Lead"
      >
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
              setCreateError(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
        >
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
                  <span className="material-symbols-outlined text-lg">warning</span>
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
                <label className="text-xs font-semibold text-on-surface-variant">Tags</label>
                <TagsInput
                  tags={formData.tags}
                  onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
                  placeholder="Pressione Enter para adicionar tag..."
                  suggestions={allExistingTags}
                />
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
                      <span className="material-symbols-outlined text-lg animate-spin">sync</span>
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLead(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        >
          <div className="fixed top-0 right-0 h-full w-full max-w-[900px] bg-surface-container-lowest shadow-2xl z-50 flex slide-in transform overflow-hidden">
            {drawerError && (
              <div className="absolute top-4 right-4 z-50 bg-error-container text-on-error-container p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border border-error/20 mb-4 shrink-0 shadow-lg">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>{drawerError}</span>
              </div>
            )}

            <div className="flex flex-1 flex-row h-full overflow-hidden">
              {/* Left Context Panel (Dark Sidebar) - bg-inverse-surface */}
              <div className="w-[320px] bg-inverse-surface text-white flex flex-col relative shrink-0 select-none border-r border-white/5">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedLead(null)}
                  type="button"
                  className="absolute top-4 left-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>

                <div className="p-8 pt-16 flex flex-col items-center border-b border-white/10">
                  {/* Score Avatar */}
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center font-display text-3xl font-bold border-4 border-inverse-surface shadow-lg relative z-10 text-white select-none">
                      {getInitials(selectedLead.name)}
                    </div>
                    {/* Score Ring */}
                    <svg className="absolute -top-2 -left-2 w-28 h-28 transform -rotate-90 z-0" viewBox="0 0 100 100">
                      <circle className="text-white/10" cx="50" cy="50" fill="transparent" r="45" stroke="currentColor" strokeWidth="5"></circle>
                      <circle className="text-green-500 stroke-current" cx="50" cy="50" fill="transparent" r="45" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * calculateLeadScore(selectedLead)) / 100} strokeWidth="5"></circle>
                    </svg>
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mb-2 text-center truncate w-full">
                    {selectedLead.name}
                  </h2>

                  {/* Telefone and E-mail Block directly below name (collapsed inline style) */}
                  {editingField === 'phone' ? (
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl mt-1 mb-4 space-y-2 w-full text-left">
                      <p className="text-[10px] font-bold text-primary-fixed-dim uppercase tracking-wider">Editar Telefone</p>
                      <input
                        type="text"
                        value={drawerData.phone}
                        onChange={(e) => setDrawerData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-2 py-1 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                        placeholder="Ex: (11) 98765-4321"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingField(null)}
                          className="px-2 py-0.5 text-[9px] font-bold text-white/60 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveLeadField('phone')}
                          className="px-2.5 py-0.5 bg-primary text-white text-[9px] font-bold rounded hover:bg-primary/90"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : editingField === 'email' ? (
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl mt-1 mb-4 space-y-2 w-full text-left">
                      <p className="text-[10px] font-bold text-primary-fixed-dim uppercase tracking-wider">Editar E-mail</p>
                      <input
                        type="email"
                        value={drawerData.email}
                        onChange={(e) => setDrawerData((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full px-2 py-1 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                        placeholder="Ex: nome@email.com"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingField(null)}
                          className="px-2 py-0.5 text-[9px] font-bold text-white/60 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveLeadField('email')}
                          className="px-2.5 py-0.5 bg-primary text-white text-[9px] font-bold rounded hover:bg-primary/90"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Default Collapsed State matching prototype age • plan layout */
                    <div className="text-white/65 text-xs mt-1 mb-4 flex items-center justify-center gap-1.5 select-none font-medium">
                      <span 
                        onClick={() => setEditingField('phone')}
                        className="hover:text-white hover:underline cursor-pointer transition-colors"
                        title="Clique para editar Telefone"
                      >
                        {drawerData.phone || 'Sem telefone'}
                      </span>
                      <span>•</span>
                      <span 
                        onClick={() => setEditingField('email')}
                        className="hover:text-white hover:underline cursor-pointer transition-colors truncate max-w-[170px]"
                        title="Clique para editar E-mail"
                      >
                        {drawerData.email || 'Sem e-mail'}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    <a
                      href={`https://wa.me/${selectedLead.phone?.replace(/\D/g, '') || ''}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-grow inline-flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer text-center"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${selectedLead.phone || ''}`}
                      className="w-10 h-10 inline-flex items-center justify-center bg-white/10 text-white hover:bg-white/20 font-bold rounded-lg transition-colors border border-white/10"
                    >
                      <span className="material-symbols-outlined text-lg">call</span>
                    </a>
                    <a
                      href={`mailto:${selectedLead.email || ''}`}
                      className="w-10 h-10 inline-flex items-center justify-center bg-white/10 text-white hover:bg-white/20 font-bold rounded-lg transition-colors border border-white/10"
                    >
                      <span className="material-symbols-outlined text-lg">mail</span>
                    </a>
                  </div>
                </div>

                {/* Context list info */}
                <div className="p-6 flex-1 overflow-y-auto agenda-scroll space-y-5">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Dados do Lead</h3>
                  
                  <div className="space-y-4">
                    {/* Funil */}
                    {editingField === 'funnel' ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Funil</p>
                        <select
                          value={drawerData.funnel}
                          onChange={(e) => setDrawerData((prev) => ({ ...prev, funnel: e.target.value as 'AESTHETICS' | 'DENTAL' }))}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="AESTHETICS">Harmonização Facial</option>
                          <option value="DENTAL">Odontologia</option>
                        </select>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadField('funnel')}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingField('funnel');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">account_tree</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Funil
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <p className="font-bold text-sm text-white">
                            {drawerData.funnel === 'DENTAL' ? 'Odontologia' : 'Harmonização Facial'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Procedimento */}
                    {editingField === 'procedure' ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Procedimento</p>
                        <input
                          type="text"
                          value={drawerData.cleanProcedure}
                          onChange={(e) => setDrawerData((prev) => ({ ...prev, cleanProcedure: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                          placeholder="Ex: Toxina Botulínica"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadField('cleanProcedure')}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingField('procedure');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">medical_services</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Procedimento
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <p className="font-bold text-sm text-white">
                            {drawerData.cleanProcedure || 'Não definido'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Estágio */}
                    {editingField === 'status' ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Estágio</p>
                        <select
                          value={drawerData.status}
                          onChange={(e) => setDrawerData((prev) => ({ ...prev, status: e.target.value as Lead['status'] }))}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="NEW">Novos Leads</option>
                          <option value="NEGOTIATION">Em Negociação</option>
                          <option value="SCHEDULED">Agendado</option>
                          <option value="WON">Fechado / Ganho</option>
                          <option value="LOST">Perdido</option>
                        </select>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadField('status')}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingField('status');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">info</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Estágio
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <p className="font-bold text-sm text-white">
                            {drawerData.status === 'NEW' ? 'Novo Lead' : ''}
                            {drawerData.status === 'NEGOTIATION' ? 'Em Negociação' : ''}
                            {drawerData.status === 'SCHEDULED' ? 'Agendado' : ''}
                            {drawerData.status === 'WON' ? 'Fechado / Ganho' : ''}
                            {drawerData.status === 'LOST' ? 'Perdido' : ''}
                          </p>
                        </div>
                      </div>
                    )}



                    {/* Responsável / SDR */}
                    {editingField === 'professionalId' ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Responsável</p>
                        <select
                          value={drawerData.professionalId}
                          onChange={(e) => setDrawerData((prev) => ({ ...prev, professionalId: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="">Não atribuído</option>
                          {staff.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadField('professionalId')}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingField('professionalId');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">person</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Responsável / SDR
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <p className="font-bold text-sm text-white">
                            {staff.find((s) => s.id === drawerData.professionalId)?.name || 'Não atribuído'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Valor Estimado */}
                    {editingField === 'estimatedValue' ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Valor Estimado</p>
                        <input
                          type="number"
                          value={drawerData.estimatedValue}
                          onChange={(e) => setDrawerData((prev) => ({ ...prev, estimatedValue: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                          placeholder="0.00"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadField('valueProbability')}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingField('estimatedValue');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">monetization_on</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Valor Estimado
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <p className="font-bold text-sm text-white">
                            {drawerData.estimatedValue
                              ? `R$ ${parseFloat(drawerData.estimatedValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : 'R$ 0,00'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Probabilidade */}
                    {editingField === 'probability' ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Probabilidade</p>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={drawerData.probability}
                          onChange={(e) => setDrawerData((prev) => ({ ...prev, probability: Number(e.target.value) }))}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                          placeholder="Ex: 50"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadField('valueProbability')}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingField('probability');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">percent</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Probabilidade
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <p className="font-bold text-sm text-white">
                            {drawerData.probability}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {editingField === 'tags' ? (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                        <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Tags</p>
                        <TagsInput
                          tags={drawerData.tags}
                          onChange={(tags) => setDrawerData((prev) => ({ ...prev, tags }))}
                          placeholder="Adicionar tag..."
                          dark={true}
                          suggestions={allExistingTags}
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingField(null)}
                            className="px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLeadField('tags')}
                            className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setEditingField('tags');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">label</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Tags
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {drawerData.tags.length > 0 ? (
                              drawerData.tags.map((t, idx) => (
                                <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/20">
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-white/50 text-[11px] font-bold">Sem tags</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (Scrollable Main Content Panel) */}
              <div className="flex-1 flex flex-col h-full bg-[#f4f5f8] overflow-hidden">
                {/* Header Row */}
                <div className="px-8 py-5 border-b border-outline-variant/30 flex justify-between items-center bg-white shrink-0 shadow-sm">
                  <h3 className="font-display font-bold text-base text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">analytics</span>
                    Atividade &amp; Informações do Lead
                  </h3>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-full cursor-pointer transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                {/* Main scrollable body */}
                <div className="flex-1 overflow-y-auto agenda-scroll p-6 space-y-6">
                  {/* AI Resumo / Insights */}
                  <section className="bg-primary-container/5 border border-primary/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-md shrink-0">
                        <span className="material-symbols-outlined text-2xl fill">auto_awesome</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-display font-bold text-base text-on-surface mb-1">Resumo da IA &amp; Sentimento</h4>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          O lead demonstrou forte interesse no procedimento de <strong className="text-on-surface font-semibold">{getCleanProcedure(selectedLead.procedure) || 'Avaliação'}</strong>. 
                          Sentimento geral é <strong className="text-green-600 font-bold">Positivo</strong> e há engajamento imediato. IA recomenda: Enviar portfólio de antes/depois e sugerir agendamento de avaliação presencial para alinhamento de expectativas.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Rastreamento e Origem */}
                  <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-6 space-y-4">
                    <h4 className="font-display font-bold text-sm text-on-surface flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-secondary text-lg">route</span>
                      Rastreamento e Origem
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl space-y-1">
                        <span className="material-symbols-outlined text-lg text-primary block">ads_click</span>
                        <span className="text-xs text-outline block font-medium">1. Origem</span>
                        <span className="text-sm font-bold text-on-surface truncate block">{selectedLead.source || 'Tráfego Direto'}</span>
                      </div>
                      <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl space-y-1">
                        <span className="material-symbols-outlined text-lg text-primary block">captive_portal</span>
                        <span className="text-xs text-outline block font-medium">2. LP</span>
                        <span className="text-sm font-bold text-on-surface truncate block">Landing Page</span>
                      </div>
                      <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl space-y-1">
                        <span className="material-symbols-outlined text-lg text-primary block">chat</span>
                        <span className="text-xs text-outline block font-medium">3. Conversão</span>
                        <span className="text-sm font-bold text-on-surface truncate block">WhatsApp</span>
                      </div>
                    </div>
                  </section>

                  {/* Histórico de Interações */}
                  <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-6 space-y-6">
                    <h4 className="font-display font-bold text-sm text-on-surface flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-secondary text-lg">history</span>
                      HISTÓRICO DE INTERAÇÕES
                    </h4>
                    
                    <div className="space-y-6">
                      {/* Item 1 (WhatsApp) */}
                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-[#e8f5e9] flex items-center justify-center text-[#25D366]">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"></path></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <p className="text-sm font-semibold text-on-surface">WhatsApp</p>
                            <span className="text-xs text-outline font-medium">Agora mesmo</span>
                          </div>
                          <p className="text-sm text-on-surface-variant bg-[#f0f4f9] p-3 rounded-xl rounded-tl-none leading-relaxed">
                            Mensagem automática enviada pela IA: Catálogo de Harmonização
                          </p>
                        </div>
                      </div>

                      {/* Item 2 (Instagram) */}
                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-[#f3e5f5] flex items-center justify-center text-[#9c27b0]">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <p className="text-sm font-semibold text-on-surface">Instagram</p>
                            <span className="text-xs text-outline font-medium">Há 2 horas</span>
                          </div>
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            Lead comentou &quot;PREÇO&quot; no post do dia 20/05
                          </p>
                        </div>
                      </div>

                      {/* Item 3 (Website) */}
                      <div className="flex gap-4">
                        <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-[#e3f2fd] flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[16px]">web</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <p className="text-sm font-semibold text-on-surface">Website</p>
                            <span className="text-xs text-outline font-medium">Ontem</span>
                          </div>
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            Visitou a página de &quot;Quem Somos&quot; (Rastreado via CAPI)
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Internal Notes */}
                  <section className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-6 space-y-3">
                    <h4 className="font-display font-bold text-sm text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-lg">edit_note</span>
                      Anotações e Follow-up
                    </h4>
                    <textarea
                      rows={3}
                      value={drawerData.notes}
                      onChange={(e) => setDrawerData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Adicione notas internas sobre conversas, restrições e follow-up..."
                      className="w-full px-3 py-2 bg-slate-50 border border-outline-variant/35 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none font-medium text-sm text-on-surface"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveLeadField('notes')}
                        disabled={drawerLoading}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                      >
                        Salvar Nota
                      </button>
                    </div>
                  </section>
                </div>

                {/* Fixed Footer */}
                <div className="border-t border-outline-variant/35 bg-white p-5 shrink-0 shadow-md flex items-center justify-between gap-6 z-20">
                  <button
                    type="button"
                    onClick={handleDisqualifyLead}
                    disabled={drawerLoading}
                    className="text-red-500 hover:text-red-600 font-semibold text-sm transition-colors cursor-pointer bg-transparent border-0 shrink-0"
                  >
                    Desqualificar Lead
                  </button>
                  <button
                    type="button"
                    onClick={handleConvertToPatient}
                    disabled={drawerLoading}
                    className="flex-grow max-w-[450px] flex items-center justify-center gap-2 bg-[#005db8] hover:bg-[#005db8]/95 text-white py-3.5 px-6 rounded-full font-bold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">event_available</span>
                    Converter em Paciente e Agendar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomStyles />
    </div>
  );
}

// Inline styling injection for prototype-faithful styles
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .agenda-scroll::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .agenda-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .agenda-scroll::-webkit-scrollbar-thumb {
      background-color: rgba(113, 119, 133, 0.25);
      border-radius: 3px;
    }
    /* Slide-in animation for drawer */
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .slide-in {
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `}} />
);
