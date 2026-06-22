'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPatient, addEvolution } from '@/lib/api';
import { getCookie, getAuthUser, AuthUser } from '@/lib/auth';

interface Evolution {
  date: string;
  professionalName: string;
  content: string;
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  professional: { name: string };
}

interface Transaction {
  id: string;
  amount: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

interface PatientDetail {
  id: string;
  name: string;
  cpf: string;
  email: string | null;
  phone: string;
  birthDate: string | null;
  notes: string | null;
  clinicalHistory: string | null; // Stores JSON array of clinical evolutions
  createdAt: string;
  appointments: Appointment[];
  transactions: Transaction[];
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EVOLUTION' | 'BUDGETS' | 'FINANCIAL' | 'MEDIA'>('OVERVIEW');

  // User auth state to verify role
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [canAddEvolution, setCanAddEvolution] = useState(false);

  // New evolution form
  const [newContent, setNewContent] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const user = getAuthUser();
    setCurrentUser(user);
    if (user) {
      const isAuthorized = user.profiles.includes('ADMIN') || user.profiles.includes('PROFISSIONAL');
      setCanAddEvolution(isAuthorized);
    }
  }, []);

  const loadPatientDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }
      const data = await getPatient(id, token);
      setPatient(data as PatientDetail);
      setError(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message ?? 'Erro ao carregar detalhes do paciente');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadPatientDetails();
  }, [loadPatientDetails]);

  // Handle clinical evolution post
  async function handleAddEvolution(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim() || !id) return;
    try {
      setSubmitLoading(true);
      setSubmitError(null);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }
      await addEvolution(id, newContent, token);
      setNewContent('');
      loadPatientDetails(); // Refresh patient info to show new timeline item
    } catch (err) {
      const errorObj = err as { message?: string };
      setSubmitError(errorObj?.message ?? 'Erro ao adicionar evolução');
    } finally {
      setSubmitLoading(false);
    }
  }

  // Parse evolutions timeline from patient clinical history JSON
  function getEvolutionsList(): Evolution[] {
    if (!patient?.clinicalHistory) return [];
    try {
      const parsed = JSON.parse(patient.clinicalHistory);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // Calculate age utility
  function getAge(birthDateString: string | null): string {
    if (!birthDateString) return '—';
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} anos`;
  }

  // Calculate LTV (Lifetime value) from completed transaction inflow records
  function calculateLTV(): string {
    if (!patient?.transactions) return 'R$ 0';
    const total = patient.transactions
      .filter((t) => t.type === 'INFLOW' && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 font-sans">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
        <p className="text-sm text-on-surface-variant font-medium">Carregando prontuário eletrônico...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4 font-sans">
        <span className="material-symbols-outlined text-5xl text-error">error</span>
        <h3 className="font-bold text-on-surface">Falha ao abrir prontuário</h3>
        <p className="text-xs text-on-surface-variant">{error ?? 'Paciente não encontrado'}</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/patients"
            className="px-4 py-2 border border-outline-variant/40 rounded-full text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Voltar para lista
          </Link>
          <button
            onClick={loadPatientDetails}
            className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-full hover:bg-primary-container transition-all cursor-pointer"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  const evolutions = getEvolutionsList();
  const ltv = calculateLTV();
  const age = getAge(patient.birthDate);

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-16">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-outline">
        <Link href="/patients" className="hover:text-primary transition-colors">
          Pacientes
        </Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-on-surface-variant font-normal">Prontuário de {patient.name}</span>
      </div>

      {/* Patient Header Card */}
      <section className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar circles with initials */}
          <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-2xl shadow-sm">
            {patient.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-display font-extrabold text-on-surface tracking-tight">
              {patient.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant font-semibold">
              <span>CPF: {patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
              <span>&bull;</span>
              <span>Idade: {age}</span>
              <span>&bull;</span>
              <span>WhatsApp: {patient.phone}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* LTV & Plan details */}
          <div className="bg-surface-container-high/40 border border-outline-variant/30 px-4 py-2 rounded-xl text-center flex-1 md:flex-none">
            <p className="text-[10px] text-outline font-bold uppercase tracking-wider">LTV Histórico</p>
            <p className="text-base font-extrabold text-primary mt-0.5">{ltv}</p>
          </div>

          <div className="bg-surface-container-high/40 border border-outline-variant/30 px-4 py-2 rounded-xl text-center flex-1 md:flex-none">
            <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Convênio</p>
            <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">
              Particular
            </span>
          </div>

          <button
            onClick={() => alert(`Enviando mensagem para ${patient.phone}...`)}
            className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer w-full md:w-auto justify-center"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            Enviar Mensagem
          </button>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="border-b border-outline-variant/20 flex gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`
            px-4 py-2.5 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap border-b-2
            ${activeTab === 'OVERVIEW' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}
          `}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('EVOLUTION')}
          className={`
            px-4 py-2.5 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap border-b-2
            ${activeTab === 'EVOLUTION' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}
          `}
        >
          Evoluções ({evolutions.length})
        </button>
        <button
          onClick={() => setActiveTab('BUDGETS')}
          className={`
            px-4 py-2.5 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap border-b-2
            ${activeTab === 'BUDGETS' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}
          `}
        >
          Orçamentos
        </button>
        <button
          onClick={() => setActiveTab('FINANCIAL')}
          className={`
            px-4 py-2.5 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap border-b-2
            ${activeTab === 'FINANCIAL' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}
          `}
        >
          Financeiro
        </button>
        <button
          onClick={() => setActiveTab('MEDIA')}
          className={`
            px-4 py-2.5 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap border-b-2
            ${activeTab === 'MEDIA' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}
          `}
        >
          Mídias & Anexos
        </button>
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 gap-6">
        {/* PANEL 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Clinical details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Patient Notes */}
              <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-display font-bold text-sm text-on-surface uppercase tracking-wider">
                  Notas de Relacionamento
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {patient.notes ?? 'Sem notas de relacionamento cadastradas.'}
                </p>
              </div>

              {/* Appointment History Panel */}
              <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-outline-variant/20">
                  <h3 className="font-display font-bold text-sm text-on-surface uppercase tracking-wider">
                    Histórico de Consultas
                  </h3>
                </div>
                {patient.appointments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-on-surface-variant">
                    Nenhuma consulta registrada para este paciente.
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/10">
                    {patient.appointments.map((app) => {
                      const date = new Date(app.startTime).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div key={app.id} className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-on-surface">{date}</p>
                            <p className="text-xs text-on-surface-variant">Profissional: {app.professional.name}</p>
                          </div>
                          <span
                            className={`
                              text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border
                              ${app.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                              ${app.status === 'CONFIRMED' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                              ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                              ${app.status === 'CANCELLED' ? 'bg-error-container text-error border-error/20' : ''}
                            `}
                          >
                            {app.status === 'COMPLETED' ? 'Concluído' : ''}
                            {app.status === 'CONFIRMED' ? 'Confirmado' : ''}
                            {app.status === 'PENDING' ? 'Pendente' : ''}
                            {app.status === 'CANCELLED' ? 'Cancelado' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: AI Insights and Quick Actions */}
            <div className="space-y-6">
              {/* AI Copilot clinical summarizer */}
              <div className="bg-gradient-to-br from-primary-fixed-dim/40 to-primary-container/20 border border-primary/20 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  <h3 className="font-display font-extrabold text-sm text-on-primary-container uppercase tracking-wider">
                    Copiloto Clínico IA
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  &ldquo;Este paciente apresenta histórico de sensibilidade. Em sua última evolução, registrou-se interesse em clareamento dentário. Recomendo abordar o tema na próxima consulta, com atenção à barreira de hipersensibilidade.&rdquo;
                </p>
                <div className="text-[10px] text-outline font-semibold">
                  Métricas IA &bull; 98% confiabilidade
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: EVOLUTION (EMR Timeline) */}
        {activeTab === 'EVOLUTION' && (
          <div className="space-y-6 max-w-4xl">
            {/* New Clinical Evolution Form (RBAC Checked) */}
            {canAddEvolution ? (
              <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-display font-bold text-sm text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">add_notes</span>
                  Registrar Nova Evolução Clínica
                </h3>
                <form onSubmit={handleAddEvolution} className="space-y-3">
                  {submitError && (
                    <div className="bg-error-container text-on-error-container p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border border-error/20">
                      <span className="material-symbols-outlined text-base">warning</span>
                      <span>{submitError}</span>
                    </div>
                  )}
                  <textarea
                    required
                    rows={4}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Descreva detalhadamente o procedimento executado, queixas do paciente, medicações prescritas e observações clínicas relevantes..."
                    className="w-full px-3.5 py-2.5 bg-surface-container-high/40 border border-outline-variant/40 rounded-xl text-sm focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none text-on-surface"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-outline">
                      Identificado como: <strong className="text-on-surface-variant">{currentUser?.name}</strong>
                    </p>
                    <button
                      type="submit"
                      disabled={submitLoading || !newContent.trim()}
                      className="px-5 py-2 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitLoading ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-spin">sync</span>
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <span>Publicar Evolução</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-surface-container-low border border-outline-variant/20 p-5 rounded-2xl shadow-sm text-center flex items-center gap-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-outline text-xl">lock</span>
                <span>O registro de evoluções clínicas é restrito a administradores e profissionais clínicos autorizados.</span>
              </div>
            )}

            {/* Evolutions Timeline list */}
            <div className="space-y-6 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-px before:bg-outline-variant/30">
              {evolutions.length === 0 ? (
                <div className="bg-surface-container-low/30 border border-outline-variant/20 border-dashed p-10 rounded-2xl text-center space-y-2">
                  <span className="material-symbols-outlined text-4xl text-outline/40">timeline</span>
                  <p className="text-sm font-semibold text-on-surface">Histórico Clínico Vazio</p>
                  <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                    Nenhuma anotação de evolução clínica registrada neste prontuário até o momento.
                  </p>
                </div>
              ) : (
                evolutions.map((ev, index) => {
                  const evDate = new Date(ev.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={index} className="flex gap-4 relative group animate-fade-in">
                      {/* Timeline circle badge */}
                      <div className="w-12 h-12 rounded-full bg-surface-container-high border-2 border-outline-variant flex items-center justify-center text-outline group-hover:border-primary group-hover:text-primary transition-colors shrink-0 z-10 bg-white">
                        <span className="material-symbols-outlined text-xl font-bold">clinical_notes</span>
                      </div>
                      
                      <div className="flex-1 bg-surface-container-low border border-outline-variant/20 p-5 rounded-2xl shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 border-b border-outline-variant/10 pb-2">
                          <p className="text-xs text-outline font-semibold">{evDate}</p>
                          <div className="flex items-center gap-1 text-xs">
                            <span className="material-symbols-outlined text-base text-primary">person</span>
                            <span className="font-semibold text-on-surface-variant">{ev.professionalName}</span>
                          </div>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                          {ev.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PANELS 3, 4, 5: placeholders */}
        {activeTab === 'BUDGETS' && (
          <div className="bg-surface-container-low border border-outline-variant/20 p-10 rounded-2xl shadow-sm text-center space-y-3 max-w-md mx-auto">
            <span className="material-symbols-outlined text-5xl text-outline/50">receipt_long</span>
            <h3 className="font-bold text-on-surface">Orçamentos e Tratamentos</h3>
            <p className="text-xs text-on-surface-variant">
              Módulo de gestão de propostas orçamentárias e contratos odontológicos/estéticos. Em desenvolvimento para a próxima fase.
            </p>
          </div>
        )}

        {activeTab === 'FINANCIAL' && (
          <div className="bg-surface-container-low border border-outline-variant/20 p-10 rounded-2xl shadow-sm text-center space-y-3 max-w-md mx-auto">
            <span className="material-symbols-outlined text-5xl text-outline/50">payments</span>
            <h3 className="font-bold text-on-surface">Financeiro do Paciente</h3>
            <p className="text-xs text-on-surface-variant">
              Visualização de faturas abertas, históricos de transações, link de pagamentos PIX e regulação de inadimplência.
            </p>
          </div>
        )}

        {activeTab === 'MEDIA' && (
          <div className="bg-surface-container-low border border-outline-variant/20 p-10 rounded-2xl shadow-sm text-center space-y-3 max-w-md mx-auto">
            <span className="material-symbols-outlined text-5xl text-outline/50">photo_library</span>
            <h3 className="font-bold text-on-surface">Mídias e Anexos</h3>
            <p className="text-xs text-on-surface-variant">
              Upload e visualização de fotos de antes/depois, exames laboratoriais, PDFs de prescrições e laudos assinados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
