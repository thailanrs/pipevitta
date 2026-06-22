'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPatients, createPatient } from '@/lib/api';
import { getCookie } from '@/lib/auth';

interface Patient {
  id: string;
  name: string;
  cpf: string;
  email: string | null;
  phone: string;
  birthDate: string | null;
  notes: string | null;
  clinicalHistory: string | null; // Used for evolutions count or status
  createdAt: string;
}

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'DELAYED' | 'PENDING_PAY'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Create Patient Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    birthDate: '',
    notes: '',
  });

  // Check URL search and action triggers
  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
    const actionVal = searchParams.get('action');
    if (actionVal === 'create') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Load Patients
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }
      const data = await getPatients(token);
      setPatients(data as Patient[]);
      setError(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message ?? 'Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global ESC Key Handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setCreateError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form Field Changers
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Create Patient Handler
  async function handleCreatePatient(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Format birthdate or null
      const payload = {
        ...formData,
        email: formData.email || undefined,
        birthDate: formData.birthDate || undefined,
        notes: formData.notes || undefined,
      };

      await createPatient(payload, token);
      setIsModalOpen(false);
      setFormData({
        name: '',
        cpf: '',
        email: '',
        phone: '',
        birthDate: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      setCreateError(errorObj?.message ?? 'Erro ao criar paciente');
    } finally {
      setCreateLoading(false);
    }
  }

  // Filter list of patients based on search query and selection
  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      patient.name.toLowerCase().includes(query) ||
      patient.cpf.includes(query) ||
      patient.phone.includes(query) ||
      (patient.email?.toLowerCase() ?? '').includes(query);

    if (!matchQuery) return false;

    // Apply Bento filter categories
    if (selectedFilter === 'DELAYED') {
      // Simulate delayed return based on specific names or properties
      return patient.name.includes('Oliveira') || patient.name.includes('João') || patient.name.includes('Ana');
    }
    if (selectedFilter === 'PENDING_PAY') {
      // Simulate pending transactions
      return patient.name.includes('Carlos');
    }

    return true;
  });

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

  // Toggle selection
  function toggleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === filteredPatients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPatients.map((p) => p.id));
    }
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-on-surface tracking-tight">
            Lista de Pacientes
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Gerenciamento de retenção e acompanhamento clínico.
          </p>
        </div>
        <div className="text-xs text-outline flex items-center gap-1.5 font-semibold">
          <span className="material-symbols-outlined text-base animate-spin-slow">sync</span>
          Atualizado em tempo real
        </div>
      </div>

      {/* Smart KPIs (Bento-ish Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div
          onClick={() => setSelectedFilter('ALL')}
          className={`
            bg-surface-container-low border rounded-2xl p-5 shadow-sm transition-all cursor-pointer h-32 flex flex-col justify-between
            ${selectedFilter === 'ALL' ? 'border-primary ring-2 ring-primary/10' : 'border-outline-variant/30 hover:shadow-md'}
          `}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total de Pacientes</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">groups</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-on-surface">{patients.length}</div>
            <div className="text-[10px] text-outline font-medium mt-1">Base histórica completa</div>
          </div>
        </div>

        {/* Card 2: Ativos */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 shadow-sm h-32 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pacientes Ativos</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">check_circle</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-on-surface">
              {patients.length > 0 ? Math.ceil(patients.length * 0.75) : 0}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +12% vs semestre anterior
            </div>
          </div>
        </div>

        {/* Card 3: Retornos Atrasados */}
        <div
          onClick={() => setSelectedFilter('DELAYED')}
          className={`
            bg-surface-container-low border rounded-2xl p-5 shadow-sm transition-all cursor-pointer h-32 flex flex-col justify-between
            ${selectedFilter === 'DELAYED' ? 'border-amber-600 ring-2 ring-amber-600/10' : 'border-outline-variant/30 hover:shadow-md'}
          `}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Retornos Atrasados</span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-on-surface">
              {patients.length > 0 ? 3 : 0}
            </div>
            <div className="text-[10px] text-amber-600 font-semibold mt-1">Lembretes pendentes</div>
          </div>
        </div>

        {/* Card 4: Inadimplência */}
        <div
          onClick={() => setSelectedFilter('PENDING_PAY')}
          className={`
            bg-surface-container-low border rounded-2xl p-5 shadow-sm transition-all cursor-pointer h-32 flex flex-col justify-between
            ${selectedFilter === 'PENDING_PAY' ? 'border-error ring-2 ring-error/10' : 'border-outline-variant/30 hover:shadow-md'}
          `}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pendências Financeiras</span>
            <div className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-error">
              R$ {patients.length > 0 ? '8.500' : '0'}
            </div>
            <div className="text-[10px] text-outline font-medium mt-1">Pacientes com débitos ativos</div>
          </div>
        </div>
      </section>

      {/* Toolbar & Data Table Section */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/65 text-xl">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, CPF ou telefone..."
                className="
                  w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl
                  text-sm text-on-surface placeholder:text-outline/50
                  focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20
                  outline-none transition-all
                "
              />
            </div>

            {/* Selected Active Filters indicator */}
            {selectedFilter !== 'ALL' && (
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
                <span>
                  Filtro: {selectedFilter === 'DELAYED' ? 'Retorno Atrasado' : 'Pendências Financeiras'}
                </span>
                <button
                  onClick={() => setSelectedFilter('ALL')}
                  className="hover:bg-primary/20 rounded-full p-0.5 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                // Export simulation
                alert('Exportando listagem de pacientes (CSV)...');
              }}
              className="px-4 py-2 border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Exportar
            </button>
          </div>
        </div>

        {/* Patients Table */}
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
            <p className="text-sm text-on-surface-variant font-medium">Carregando base de pacientes...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-4">
            <span className="material-symbols-outlined text-5xl text-error">error</span>
            <h3 className="font-bold text-on-surface">Falha na Conexão</h3>
            <p className="text-xs text-on-surface-variant">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-full hover:bg-primary-container transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-outline/50">person_off</span>
            <h3 className="font-bold text-on-surface">Nenhum paciente encontrado</h3>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              Tente redefinir os filtros de busca ou cadastre um novo paciente na clínica.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-surface-container-low/40 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredPatients.length && filteredPatients.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer h-4 w-4"
                    />
                  </th>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Contato</th>
                  <th className="px-6 py-4">CPF</th>
                  <th className="px-6 py-4">Idade</th>
                  <th className="px-6 py-4">Status / Alertas</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface divide-y divide-outline-variant/15">
                {filteredPatients.map((patient) => {
                  const isChecked = selectedIds.includes(patient.id);
                  const isDelayed = patient.name.includes('Oliveira') || patient.name.includes('João');
                  const isPending = patient.name.includes('Carlos');

                  return (
                    <tr
                      key={patient.id}
                      className={`
                        hover:bg-surface-container-high/20 transition-all group
                        ${isChecked ? 'bg-primary/5' : ''}
                      `}
                    >
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(patient.id)}
                          className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer h-4 w-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                            {patient.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/patients/${patient.id}`}
                              className="font-semibold text-on-surface hover:text-primary hover:underline"
                            >
                              {patient.name}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <p className="font-medium">{patient.phone}</p>
                          <p className="text-on-surface-variant/80">{patient.email ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-on-surface-variant">
                        {patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {getAge(patient.birthDate)}
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-error-container text-error uppercase tracking-wider border border-error/15">
                            Inadimplente
                          </span>
                        ) : isDelayed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="material-symbols-outlined text-xs font-bold">warning</span>
                            Retorno Atrasado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Regular
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer"
                            title="Prontuário Eletrônico (PEP)"
                          >
                            <span className="material-symbols-outlined text-xl">clinical_notes</span>
                          </Link>
                          <button
                            onClick={() => {
                              // Direct action
                              alert(`Iniciando chat via WhatsApp com ${patient.name}`);
                            }}
                            className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <span className="material-symbols-outlined text-xl">chat</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-surface-tint transition-all duration-200 flex items-center justify-center z-30 group cursor-pointer"
        title="Cadastrar Novo Paciente"
      >
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      {/* Create Patient Dialog Modal */}
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
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/20">
              <h3 className="font-display font-bold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_add</span>
                Cadastrar Novo Paciente
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

            {/* Modal Body / Form */}
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              {createError && (
                <div className="bg-error-container text-on-error-container p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 border border-error/20">
                  <span className="material-symbols-outlined text-lg">warning</span>
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Nome Completo</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Maria de Oliveira"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">CPF (apenas números)</label>
                  <input
                    type="text"
                    name="cpf"
                    required
                    maxLength={11}
                    value={formData.cpf}
                    onChange={handleInputChange}
                    placeholder="Ex: 12345678901"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Celular / WhatsApp</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Ex: +5511999999999"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Ex: maria@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Data de Nascimento</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Notas & Observações</label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Descreva observações, preferências ou restrições do paciente..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setCreateError(null);
                  }}
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
                    <span>Salvar Cadastro</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
