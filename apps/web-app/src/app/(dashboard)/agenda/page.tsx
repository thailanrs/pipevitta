'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAppointments, getPatients, getUsers, createAppointment, deleteAppointment, updateAppointment } from '@/lib/api';
import { getCookie } from '@/lib/auth';

interface Patient {
  id: string;
  name: string;
}

interface Professional {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patient: { name: string; phone?: string };
  professionalId: string;
  professional: { name: string };
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  room: string | null;
  bufferMinutes: number;
  notes: string | null;
}

export default function AgendaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar Date State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'LIST'>('DAILY');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientId: '',
    professionalId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    durationMinutes: '60',
    room: 'Sala 1',
    bufferMinutes: '15',
    notes: '',
    status: 'PENDING' as Appointment['status'],
  });

  // Selected appointment options
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);

  // Check URL triggers
  useEffect(() => {
    const actionVal = searchParams.get('action');
    if (actionVal === 'create') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }
      const [appData, patData, profData] = await Promise.all([
        getAppointments(token),
        getPatients(token).catch(() => []),
        getUsers(token).catch(() => []),
      ]);
      setAppointments(appData as Appointment[]);
      setPatients(patData as Patient[]);
      setProfessionals(profData as Professional[]);
      setError(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj?.message ?? 'Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modal Form Inputs Handlers
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Create Appointment Action
  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Calculate dates
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + Number(formData.durationMinutes) * 60 * 1000);

      const payload = {
        patientId: formData.patientId,
        professionalId: formData.professionalId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        room: formData.room || undefined,
        bufferMinutes: Number(formData.bufferMinutes),
        notes: formData.notes || undefined,
        status: formData.status,
      };

      await createAppointment(payload, token);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      // Expose NestJS ConflictException message to EMR operator
      setCreateError(errorObj?.message ?? 'Erro ao agendar consulta');
    } finally {
      setCreateLoading(false);
    }
  }

  // Update Status Action
  async function handleUpdateStatus(id: string, newStatus: Appointment['status']) {
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await updateAppointment(id, { status: newStatus }, token);
      setActiveAppointment(null);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Erro ao alterar status: ${errorObj?.message}`);
    }
  }

  // Delete Appointment Action
  async function handleDeleteAppointment(id: string) {
    if (!confirm('Deseja realmente cancelar e excluir este agendamento?')) return;
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await deleteAppointment(id, token);
      setActiveAppointment(null);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Erro ao excluir agendamento: ${errorObj?.message}`);
    }
  }

  // Date picker navigation
  function adjustDate(amount: number) {
    const newDate = new Date(currentDate);
    if (viewMode === 'DAILY') {
      newDate.setDate(newDate.getDate() + amount);
    } else if (viewMode === 'WEEKLY') {
      newDate.setDate(newDate.getDate() + amount * 7);
    } else if (viewMode === 'MONTHLY') {
      newDate.setMonth(newDate.getMonth() + amount);
    }
    setCurrentDate(newDate);
  }

  // Date Check Utilities
  function isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  // Get appointments for a specific day
  function getAppointmentsForDay(date: Date): Appointment[] {
    return appointments.filter((app) => isSameDay(new Date(app.startTime), date));
  }

  // Generate list of days of the active week
  function getWeekDays(): Date[] {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Start week on Monday
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // Generate list of days of the active month
  function getMonthDays(): Date[] {
    const days: Date[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Add offset for start day of month (prev month padding)
    const dayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Align Monday first
    
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(firstDay.getDate() - startOffset);

    // Render 35 squares (5 weeks)
    for (let i = 0; i < 35; i++) {
      const d = new Date(startCalendar);
      d.setDate(startCalendar.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // Date labels
  function getHeaderLabel(): string {
    if (viewMode === 'DAILY') {
      return currentDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
    if (viewMode === 'WEEKLY') {
      const week = getWeekDays();
      return `${week[0].getDate()} - ${week[6].toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`;
    }
    return currentDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-16 h-full flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-on-surface tracking-tight">
            Agenda de Consultas
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Planejamento diário da equipe clínica, salas e equipamentos.
          </p>
        </div>

        {/* View Selection controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-auto">
          {/* Navigation controls */}
          {viewMode !== 'LIST' && (
            <div className="flex items-center bg-surface-container-low border border-outline-variant/30 rounded-xl px-1.5 py-0.5">
              <button
                onClick={() => adjustDate(-1)}
                className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined block text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-bold text-on-surface-variant hover:text-primary cursor-pointer hover:bg-surface-container-high rounded"
              >
                Hoje
              </button>
              <button
                onClick={() => adjustDate(1)}
                className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined block text-[18px]">chevron_right</span>
              </button>
            </div>
          )}

          {/* View mode selectors */}
          <div className="flex bg-surface-container-low border border-outline-variant/20 p-1 rounded-xl">
            {(['DAILY', 'WEEKLY', 'MONTHLY', 'LIST'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer
                  ${viewMode === mode ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}
                `}
              >
                {mode === 'DAILY' ? 'Diário' : ''}
                {mode === 'WEEKLY' ? 'Semanal' : ''}
                {mode === 'MONTHLY' ? 'Mensal' : ''}
                {mode === 'LIST' ? 'Lista' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Header indicator */}
      {viewMode !== 'LIST' && (
        <h2 className="text-base font-bold text-primary capitalize tracking-tight shrink-0 flex items-center gap-2">
          <span className="material-symbols-outlined">calendar_today</span>
          {getHeaderLabel()}
        </h2>
      )}

      {loading ? (
        <div className="py-24 text-center space-y-4 flex-1">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
          <p className="text-sm text-on-surface-variant font-medium">Carregando consultas...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center max-w-md mx-auto space-y-4 flex-1">
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <h3 className="font-bold text-on-surface">Erro ao carregar Agenda</h3>
          <p className="text-xs text-on-surface-variant">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-full hover:bg-primary-container transition-all cursor-pointer"
          >
            Recarregar
          </button>
        </div>
      ) : (
        /* CALENDAR WORKSPACE SHEETS */
        <div className="flex-1 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col p-4">
          
          {/* VIEW: DAILY */}
          {viewMode === 'DAILY' && (
            <div className="flex-1 divide-y divide-outline-variant/15 overflow-y-auto pr-1">
              {getAppointmentsForDay(currentDate).length === 0 ? (
                <div className="py-24 text-center space-y-3">
                  <span className="material-symbols-outlined text-5xl text-outline/50">event_busy</span>
                  <h3 className="font-bold text-on-surface">Nenhuma consulta hoje</h3>
                  <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                    Não há agendamentos cadastrados para esta data. Clique no FAB flutuante para agendar uma consulta.
                  </p>
                </div>
              ) : (
                getAppointmentsForDay(currentDate).map((app) => {
                  const startHour = new Date(app.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const endHour = new Date(app.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={app.id}
                      onClick={() => setActiveAppointment(app)}
                      className="py-4 px-3 hover:bg-surface-container-low/40 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-4 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-center border-r border-outline-variant/30 pr-3 shrink-0">
                          <p className="text-sm font-extrabold text-primary">{startHour}</p>
                          <p className="text-[10px] text-outline font-semibold">{endHour}</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                            {app.patient.name}
                          </p>
                          <div className="flex items-center gap-x-2 gap-y-0.5 text-xs text-on-surface-variant font-medium flex-wrap mt-0.5">
                            <span>Sala: {app.room ?? '—'}</span>
                            <span>&bull;</span>
                            <span>Profissional: {app.professional.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {app.notes && (
                          <span className="material-symbols-outlined text-outline/60 text-[18px]" title={app.notes}>
                            notes
                          </span>
                        )}

                        <span
                          className={`
                            text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border
                            ${app.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                            ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                            ${app.status === 'COMPLETED' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                            ${app.status === 'CANCELLED' ? 'bg-error-container text-error border-error/20' : ''}
                          `}
                        >
                          {app.status === 'CONFIRMED' ? 'Confirmado' : ''}
                          {app.status === 'PENDING' ? 'Pendente' : ''}
                          {app.status === 'COMPLETED' ? 'Concluído' : ''}
                          {app.status === 'CANCELLED' ? 'Cancelado' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW: WEEKLY */}
          {viewMode === 'WEEKLY' && (
            <div className="flex-1 grid grid-cols-7 divide-x divide-outline-variant/15 overflow-x-auto min-w-[700px]">
              {getWeekDays().map((day) => {
                const isToday = isSameDay(day, new Date());
                const dayAppointments = getAppointmentsForDay(day);

                return (
                  <div key={day.toISOString()} className="flex flex-col p-2 min-h-[350px]">
                    {/* Header Col */}
                    <div className="text-center pb-2 border-b border-outline-variant/15 mb-3 shrink-0">
                      <p className="text-[10px] text-outline font-bold uppercase">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </p>
                      <p
                        className={`
                          text-base font-extrabold mx-auto mt-0.5 flex items-center justify-center w-7 h-7 rounded-full
                          ${isToday ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface'}
                        `}
                      >
                        {day.getDate()}
                      </p>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                      {dayAppointments.map((app) => {
                        const start = new Date(app.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div
                            key={app.id}
                            onClick={() => setActiveAppointment(app)}
                            className="bg-surface-container-low border border-outline-variant/35 rounded-xl p-2 text-left cursor-pointer hover:border-primary transition-all shadow-sm"
                          >
                            <p className="text-[10px] font-extrabold text-primary">{start}</p>
                            <p className="text-xs font-bold text-on-surface truncate mt-0.5">{app.patient.name}</p>
                            <p className="text-[9px] text-outline truncate">{app.professional.name}</p>
                          </div>
                        );
                      })}
                      {dayAppointments.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[10px] text-outline/45 select-none pt-12">
                          Vazio
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW: MONTHLY */}
          {viewMode === 'MONTHLY' && (
            <div className="flex-1 flex flex-col">
              {/* Week header labels */}
              <div className="grid grid-cols-7 border-b border-outline-variant/20 pb-2 text-center text-[10px] font-bold text-outline uppercase tracking-wider shrink-0">
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
                <div>Dom</div>
              </div>

              {/* Grid squares */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 border-l border-t border-outline-variant/15 mt-2">
                {getMonthDays().map((day) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(day, new Date());
                  const dayApps = getAppointmentsForDay(day);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('DAILY');
                      }}
                      className={`
                        border-r border-b border-outline-variant/15 p-2 flex flex-col justify-between cursor-pointer hover:bg-surface-container-high/15 transition-all
                        ${isCurrentMonth ? 'bg-white' : 'bg-surface-container-low/20 opacity-50'}
                      `}
                    >
                      <div className="flex justify-between items-start shrink-0">
                        <span
                          className={`
                            text-xs font-bold flex items-center justify-center w-5 h-5 rounded-full
                            ${isToday ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'}
                          `}
                        >
                          {day.getDate()}
                        </span>
                        
                        {dayApps.length > 0 && (
                          <span className="bg-primary/10 text-primary font-extrabold text-[9px] px-1.5 rounded-full">
                            {dayApps.length}
                          </span>
                        )}
                      </div>

                      {/* Dots list */}
                      <div className="space-y-0.5 overflow-hidden max-h-[40px] mt-1 pr-0.5">
                        {dayApps.slice(0, 2).map((app) => (
                          <div key={app.id} className="text-[9px] font-medium text-on-surface-variant truncate bg-surface-container border border-outline-variant/10 px-1 py-0.5 rounded">
                            {app.patient.name}
                          </div>
                        ))}
                        {dayApps.length > 2 && (
                          <div className="text-[8px] text-outline text-right font-bold pr-1">+{dayApps.length - 2} mais</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: LIST */}
          {viewMode === 'LIST' && (
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-surface-container-low/40 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="px-6 py-4">Data / Horário</th>
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">Profissional</th>
                    <th className="px-6 py-4">Sala</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-on-surface divide-y divide-outline-variant/15">
                  {appointments.map((app) => {
                    const appDate = new Date(app.startTime).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={app.id}
                        onClick={() => setActiveAppointment(app)}
                        className="hover:bg-surface-container-high/20 transition-all cursor-pointer"
                      >
                        <td className="px-6 py-4 font-semibold text-primary">{appDate}</td>
                        <td className="px-6 py-4 font-medium">{app.patient.name}</td>
                        <td className="px-6 py-4 text-on-surface-variant">{app.professional.name}</td>
                        <td className="px-6 py-4 text-on-surface-variant">{app.room ?? '—'}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`
                              text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border
                              ${app.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                              ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                              ${app.status === 'COMPLETED' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                              ${app.status === 'CANCELLED' ? 'bg-error-container text-error border-error/20' : ''}
                            `}
                          >
                            {app.status === 'CONFIRMED' ? 'Confirmado' : ''}
                            {app.status === 'PENDING' ? 'Pendente' : ''}
                            {app.status === 'COMPLETED' ? 'Concluído' : ''}
                            {app.status === 'CANCELLED' ? 'Cancelado' : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-xs text-on-surface-variant font-medium">
                        Nenhum agendamento registrado na clínica.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* FAB: Create Appointment Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 hover:bg-surface-tint transition-all duration-200 flex items-center justify-center z-30 group cursor-pointer"
        title="Agendar Consulta"
      >
        <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      {/* Modal: Create Appointment Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in animate-none">
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/20">
              <h3 className="font-display font-bold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_box</span>
                Agendar Nova Consulta
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

            {/* Modal Form */}
            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
              {createError && (
                <div className="bg-error-container text-on-error-container p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 border border-error/20">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Selecionar Paciente</label>
                  <select
                    name="patientId"
                    required
                    value={formData.patientId}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant font-semibold"
                  >
                    <option value="">Selecione o paciente...</option>
                    {patients.map((pat) => (
                      <option key={pat.id} value={pat.id}>{pat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Profissional Clínico</label>
                  <select
                    name="professionalId"
                    required
                    value={formData.professionalId}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  >
                    <option value="">Selecione o profissional...</option>
                    {professionals.map((prof) => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">Data da Consulta</label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Horário Início</label>
                  <input
                    type="time"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Duração (min)</label>
                  <select
                    name="durationMinutes"
                    value={formData.durationMinutes}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Sala / Recurso</label>
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleInputChange}
                    placeholder="Ex: Consultório 1"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Buffer Time (min)</label>
                  <input
                    type="number"
                    name="bufferMinutes"
                    value={formData.bufferMinutes}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant">Status Inicial</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="CONFIRMED">Confirmado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant">Notas & Recomendações</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Queixas iniciais, observações de preparo ou restrições..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none text-on-surface"
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
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Agendar Consulta</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Appointment Option Box / Dialog */}
      {activeAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in animate-none">
          <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/20">
              <h3 className="font-display font-bold text-sm text-on-surface uppercase tracking-wider">Opções do Agendamento</h3>
              <button
                onClick={() => setActiveAppointment(null)}
                className="p-1 text-on-surface-variant hover:bg-surface-container-high rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs text-on-surface-variant space-y-1 border-b border-outline-variant/10 pb-3">
                <p className="text-sm font-bold text-on-surface">{activeAppointment.patient.name}</p>
                <p>Profissional: {activeAppointment.professional.name}</p>
                <p>Horário: {new Date(activeAppointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeAppointment.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p>Sala: {activeAppointment.room ?? '—'}</p>
                {activeAppointment.notes && <p className="italic">Notas: &quot;{activeAppointment.notes}&quot;</p>}
              </div>

              {/* Status Update Actions */}
              <div className="space-y-2">
                <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Alterar Status</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'CONFIRMED')}
                    className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'COMPLETED')}
                    className="py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Concluir
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'PENDING')}
                    className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Pendente
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'CANCELLED')}
                    className="py-2 bg-error-container/20 hover:bg-error-container/30 text-error border border-error/20 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar Consulta
                  </button>
                </div>
              </div>

              {/* Delete / Remove Action */}
              <div className="pt-3 border-t border-outline-variant/15 flex justify-end">
                <button
                  onClick={() => handleDeleteAppointment(activeAppointment.id)}
                  className="px-4 py-2 border border-error hover:bg-error/5 text-error text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Excluir Agendamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
