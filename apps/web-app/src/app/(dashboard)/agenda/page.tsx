'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getAppointments,
  getPatients,
  getUsers,
  createAppointment,
  deleteAppointment,
  updateAppointment,
  getResources,
  createPatient
} from '@/lib/api';
import { getCookie } from '@/lib/auth';
import { CSVExportButton } from '@/components/csv-export-button';
import { AdvancedFilters } from '@/components/advanced-filters';
import { PeriodSelector } from '@/components/period-selector';
import { SelectionCell } from '@/components/selection-cell';
import { BatchActionMenu } from '@/components/batch-action-menu';

interface Patient {
  id: string;
  name: string;
  phone?: string;
  clinicalHistory?: string | null;
}

interface Professional {
  id: string;
  name: string;
}

interface Resource {
  id: string;
  name: string;
  type: 'ROOM' | 'EQUIPMENT' | 'PROFISSIONAL';
}

interface AppointmentResourceRelation {
  resource: Resource;
}

interface Appointment {
  id: string;
  patientId: string;
  patient: { name: string; phone?: string; clinicalHistory?: string | null };
  professionalId: string;
  professional: { name: string };
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  room: string | null;
  bufferMinutes: number;
  notes: string | null;
  resources?: AppointmentResourceRelation[];
}

export default function AgendaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Navigation Date State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'LIST'>('DAILY');

  // Professional Filters
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);
  const [isProfDropdownOpen, setIsProfDropdownOpen] = useState(false);

  // Room Filters
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);

  // List View states
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Helpers for unified AdvancedFilters component
  const agendaFilters = {
    status: filterStatus,
    startDate: filterStartDate,
    endDate: filterEndDate,
  };

  const agendaFilterFields = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'CONFIRMED', label: 'Confirmado' },
        { value: 'PENDING', label: 'Pendente' },
        { value: 'COMPLETED', label: 'Em Atendimento' },
        { value: 'CANCELLED', label: 'Cancelado' },
      ],
    },
    {
      key: 'startDate',
      label: 'Data Inicial',
      type: 'date' as const,
    },
    {
      key: 'endDate',
      label: 'Data Final',
      type: 'date' as const,
    },
  ];

  const agendaValueLabelsMap = {
    status: {
      CONFIRMED: 'Confirmado',
      PENDING: 'Pendente',
      COMPLETED: 'Em Atendimento',
      CANCELLED: 'Cancelado',
    },
  };

  const handleFilterChange = (key: string, value: string | number | boolean | string[] | null | undefined) => {
    const val = Array.isArray(value) ? value.join(',') : String(value ?? '');
    if (key === 'status') setFilterStatus(val);
    if (key === 'startDate') setFilterStartDate(val);
    if (key === 'endDate') setFilterEndDate(val);
  };

  const handleClearField = (key: string) => {
    if (key === 'status') setFilterStatus('ALL');
    if (key === 'startDate') setFilterStartDate('');
    if (key === 'endDate') setFilterEndDate('');
  };

  const handleClearAllFilters = () => {
    setFilterStatus('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Drag and drop helper state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editAppointmentId, setEditAppointmentId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    patientId: '',
    professionalId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    durationMinutes: '60',
    resourceId: '', // Room / Resource ID mapping
    bufferMinutes: '15',
    notes: '',
    status: 'PENDING' as Appointment['status'],
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientResults, setShowPatientResults] = useState(false);

  // Fast patient registration states
  const [fastRegister, setFastRegister] = useState(false);
  const [fastPatientData, setFastPatientData] = useState({
    cpf: '',
    email: '',
    birthDate: '',
    phone: '',
  });

  function handleFastPatientChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFastPatientData((prev) => ({ ...prev, [name]: value }));
  }

  // Selected appointment drawer options
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);

  // Drawer inline edit states
  const [editingField, setEditingField] = useState<'dateTime' | 'procedure' | 'profRoom' | 'annotation' | null>(null);
  const [drawerEditData, setDrawerEditData] = useState({
    date: '',
    startTime: '',
    durationMinutes: '60',
    notes: '',
    professionalId: '',
    resourceId: '',
  });

  const annotationText = activeAppointment?.notes?.includes('|')
    ? activeAppointment.notes.split('|')[1]
    : '';

  const annotationInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField === 'annotation') {
      setTimeout(() => {
        annotationInputRef.current?.focus();
      }, 50);
    }
  }, [editingField]);

  // Save inline edits from the drawer
  async function handleDrawerSave(field: 'dateTime' | 'procedure' | 'profRoom' | 'annotation') {
    if (!activeAppointment) return;
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;

      let payload: {
        startTime?: string;
        endTime?: string;
        notes?: string;
        professionalId?: string;
        resourceIds?: string[];
      } = {};
      if (field === 'dateTime') {
        const startDateTime = new Date(`${drawerEditData.date}T${drawerEditData.startTime}:00`);
        const endDateTime = new Date(startDateTime.getTime() + Number(drawerEditData.durationMinutes) * 60 * 1000);
        payload = {
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        };
      } else if (field === 'procedure') {
        const baseNote = activeAppointment.notes?.includes('|') ? activeAppointment.notes.substring(activeAppointment.notes.indexOf('|') + 1) : activeAppointment.notes || '';
        payload = {
          notes: `${drawerEditData.notes}|${baseNote}`,
        };
      } else if (field === 'profRoom') {
        payload = {
          professionalId: drawerEditData.professionalId,
          resourceIds: drawerEditData.resourceId ? [drawerEditData.resourceId] : [],
        };
      } else if (field === 'annotation') {
        const baseProc = activeAppointment.notes?.includes('|') ? activeAppointment.notes.split('|')[0] : activeAppointment.notes || 'Consulta Clínica';
        payload = {
          notes: `${baseProc}|${drawerEditData.notes}`,
        };
      }

      await updateAppointment(activeAppointment.id, payload, token);
      
      // Update local active appointment
      setActiveAppointment((prev) => {
        if (!prev) return null;
        const newResources = field === 'profRoom' 
          ? (drawerEditData.resourceId ? [{ resource: resources.find(r => r.id === drawerEditData.resourceId)! }] : [])
          : prev.resources;
        const newProf = field === 'profRoom'
          ? { name: professionals.find(p => p.id === drawerEditData.professionalId)?.name || prev.professional.name }
          : prev.professional;

        return {
          ...prev,
          startTime: payload.startTime || prev.startTime,
          endTime: payload.endTime || prev.endTime,
          notes: payload.notes !== undefined ? payload.notes : prev.notes,
          professionalId: payload.professionalId || prev.professionalId,
          professional: newProf,
          resources: newResources,
        };
      });

      setEditingField(null);
      loadData();
    } catch {
      alert('Erro ao salvar alteração. Verifique conflitos de horários.');
    }
  }

  // Time Tracker State
  const [currentTop, setCurrentTop] = useState<number | null>(null);

  // Scrolling References
  const gridRef = useRef<HTMLDivElement>(null);
  const timeColRef = useRef<HTMLDivElement>(null);

  // Sync scroll function
  const handleGridScroll = () => {
    if (gridRef.current && timeColRef.current) {
      timeColRef.current.scrollTop = gridRef.current.scrollTop;
    }
  };

  // Check current time and update red line height
  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      if (hours >= 8 && hours <= 19) {
        setCurrentTop(((hours - 8) * 60 + minutes) * 2);
      } else {
        setCurrentTop(null);
      }
    }
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Global ESC Key Handler to close modals and drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setActiveAppointment(null);
        setCreateError(null);
        setShowPatientResults(false);
        setIsProfDropdownOpen(false);
        setIsRoomDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      const [appData, patData, profData, resData] = await Promise.all([
        getAppointments(token),
        getPatients(token).catch(() => []),
        getUsers(token).catch(() => []),
        getResources(token).catch(() => []),
      ]);
      setAppointments(appData as Appointment[]);
      setPatients(patData as Patient[]);
      setProfessionals(profData as Professional[]);
      setResources(resData as Resource[]);
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

  // Reset fast patient registration when modal is closed
  useEffect(() => {
    if (!isModalOpen) {
      setFastRegister(false);
      setFastPatientData({
        cpf: '',
        email: '',
        birthDate: '',
        phone: '',
      });
    }
  }, [isModalOpen]);

  // Check if a specific slot is available. Returns conflict reason or null if available.
  function checkSlotConflict(
    dateStr: string,
    timeStr: string,
    durationMin: number,
    profId: string,
    resId: string,
    excludeAppId?: string | null
  ): 'professional' | 'resource' | null {
    if (!dateStr || !timeStr || !profId) {
      return null;
    }

    const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const endDateTime = new Date(startDateTime.getTime() + durationMin * 60 * 1000);

    if (isNaN(startDateTime.getTime())) {
      return null;
    }

    for (const app of appointments) {
      if (excludeAppId && app.id === excludeAppId) {
        continue;
      }
      if (app.status === 'CANCELLED') {
        continue;
      }

      const appStart = new Date(app.startTime);
      const appEnd = new Date(app.endTime);

      // Check time overlap
      const overlaps = startDateTime < appEnd && endDateTime > appStart;
      if (overlaps) {
        // 1. Check professional conflict
        if (app.professionalId === profId) {
          return 'professional';
        }
        // 2. Check room/resource conflict
        if (resId && app.resources?.some((r) => r.resource.id === resId)) {
          return 'resource';
        }
      }
    }

    return null;
  }

  // Check if currently configured slot is available
  function getSlotConflict(): 'professional' | 'resource' | null {
    return checkSlotConflict(
      formData.startDate,
      formData.startTime,
      Number(formData.durationMinutes),
      formData.professionalId,
      formData.resourceId,
      editMode ? editAppointmentId : null
    );
  }

  // Modal Form Inputs Handlers
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Toggle button status handler
  function handleStatusChange(status: Appointment['status']) {
    setFormData((prev) => ({ ...prev, status }));
  }

  // Create or Update Appointment Action
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);
      const token = getCookie('pipevitta_token');
      if (!token) {
        router.push('/login');
        return;
      }

      let activePatientId = formData.patientId;

      if (fastRegister) {
        if (!patientSearch.trim()) {
          throw new Error('O nome do paciente é obrigatório.');
        }
        if (fastPatientData.cpf.length !== 11 || isNaN(Number(fastPatientData.cpf))) {
          throw new Error('O CPF deve possuir exatamente 11 dígitos numéricos.');
        }
        if (!fastPatientData.phone.trim()) {
          throw new Error('O WhatsApp/Celular é obrigatório.');
        }

        const newPatient = await createPatient({
          name: patientSearch,
          cpf: fastPatientData.cpf,
          email: fastPatientData.email || undefined,
          phone: fastPatientData.phone,
          birthDate: fastPatientData.birthDate || undefined,
        }, token) as { id: string };

        activePatientId = newPatient.id;
      }

      // Calculate dates
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + Number(formData.durationMinutes) * 60 * 1000);

      const payload = {
        patientId: activePatientId,
        professionalId: formData.professionalId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        bufferMinutes: Number(formData.bufferMinutes),
        notes: formData.notes || undefined,
        status: formData.status,
        resourceIds: formData.resourceId ? [formData.resourceId] : [],
      };

      if (editMode && editAppointmentId) {
        await updateAppointment(editAppointmentId, payload, token);
      } else {
        await createAppointment(payload, token);
      }

      setIsModalOpen(false);
      setEditMode(false);
      setEditAppointmentId(null);
      setFastRegister(false);
      setFastPatientData({
        cpf: '',
        email: '',
        birthDate: '',
        phone: '',
      });
      // Clean form
      setFormData({
        patientId: '',
        professionalId: '',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        durationMinutes: '60',
        resourceId: '',
        bufferMinutes: '15',
        notes: '',
        status: 'PENDING',
      });
      setPatientSearch('');
      loadData();
      setActiveAppointment(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      setCreateError(errorObj?.message ?? 'Erro ao salvar consulta');
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
      loadData();
      setActiveAppointment(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Erro ao alterar status: ${errorObj?.message}`);
    }
  }

  // Delete Appointment Action
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleDeleteAppointment(id: string) {
    if (!confirm('Deseja realmente cancelar e excluir este agendamento?')) return;
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await deleteAppointment(id, token);
      loadData();
      setActiveAppointment(null);
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Erro ao excluir agendamento: ${errorObj?.message}`);
    }
  }

  // Open Edit Mode inside Modal
  function handleOpenEdit(app: Appointment) {
    setEditMode(true);
    setEditAppointmentId(app.id);
    const start = new Date(app.startTime);
    const end = new Date(app.endTime);
    const duration = (end.getTime() - start.getTime()) / 60000;
    const dateStr = start.toISOString().split('T')[0];
    const timeStr = start.toTimeString().split(' ')[0].substring(0, 5);
    const matchedRoom = app.resources?.find((r) => r.resource.type === 'ROOM')?.resource.id || '';

    setFormData({
      patientId: app.patientId,
      professionalId: app.professionalId,
      startDate: dateStr,
      startTime: timeStr,
      durationMinutes: String(duration),
      resourceId: matchedRoom,
      bufferMinutes: String(app.bufferMinutes),
      notes: app.notes || '',
      status: app.status,
    });
    setPatientSearch(app.patient.name);
    setIsModalOpen(true);
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

  // Filter professionals
  const visibleProfessionals = selectedProfIds.length === 0
    ? professionals
    : professionals.filter((p) => selectedProfIds.includes(p.id));

  // Get appointments and filter by visible professionals + rooms
  const filteredAppointments = appointments.filter((app) => {
    const matchProf = selectedProfIds.length === 0 || selectedProfIds.includes(app.professionalId);
    const matchRoom = selectedRoomIds.length === 0 || app.resources?.some((r) => selectedRoomIds.includes(r.resource.id));
    return matchProf && matchRoom;
  });

  // Get appointments for a specific day
  function getAppointmentsForDay(date: Date): Appointment[] {
    return filteredAppointments.filter((app) => isSameDay(new Date(app.startTime), date));
  }

  // Generate list of days of the active week (Seg a Sáb)
  function getWeekDays(): Date[] {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Start week on Monday
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) { // Render Seg to Dom (7 days)
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
    
    const dayOfWeek = firstDay.getDay(); 
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Align Monday first
    
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(firstDay.getDate() - startOffset);

    // 35 squares (5 weeks)
    for (let i = 0; i < 35; i++) {
      const d = new Date(startCalendar);
      d.setDate(startCalendar.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // Filtered patient list
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Date labels
  function getHeaderLabel(): string {
    if (viewMode === 'DAILY') {
      return currentDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    if (viewMode === 'WEEKLY') {
      const week = getWeekDays();
      return `${week[0].getDate()} a ${week[6].toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`;
    }
    return currentDate.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  }

  // Value mapping function based on procedure
  function getAppointmentValue(notes: string | null): number {
    const proc = notes?.includes('|') ? notes.split('|')[0] : 'Consulta Estética';
    if (proc.includes('Harmonização')) return 1200;
    if (proc.includes('Limpeza')) return 250;
    if (proc.includes('Clareamento')) return 450;
    if (proc.includes('Retorno')) return 150;
    if (proc.includes('Avaliação') || proc.includes('Pendente')) return 0;
    return 250;
  }

  // Total Monthly Predicted Revenue
  const totalMonthlyPredicted = filteredAppointments.reduce((sum, app) => {
    const d = new Date(app.startTime);
    if (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()) {
      return sum + getAppointmentValue(app.notes);
    }
    return sum;
  }, 0);

  // List view search & advanced filter logic
  const listApps = filteredAppointments.filter((app) => {
    const proc = app.notes?.includes('|') ? app.notes.split('|')[0] : 'Consulta Estética';
    const query = listSearchQuery.toLowerCase();
    const matchSearch =
      app.patient.name.toLowerCase().includes(query) ||
      app.professional.name.toLowerCase().includes(query) ||
      proc.toLowerCase().includes(query);

    let matchStatus = true;
    if (filterStatus !== 'ALL') {
      matchStatus = app.status === filterStatus;
    }

    let matchDate = true;
    if (filterStartDate) {
      matchDate = matchDate && new Date(app.startTime) >= new Date(filterStartDate);
    }
    if (filterEndDate) {
      matchDate = matchDate && new Date(app.startTime) <= new Date(filterEndDate + 'T23:59:59');
    }

    return matchSearch && matchStatus && matchDate;
  });

  // Date formatter for list view
  function formatListDate(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const month = months[d.getMonth()];
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month}, ${hour}:${min}`;
  }

  // Batch actions in List view
  const handleBatchConfirm = async () => {
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await Promise.all(selectedAppIds.map((id) => updateAppointment(id, { status: 'CONFIRMED' }, token)));
      setSelectedAppIds([]);
      loadData();
    } catch {
      alert('Erro ao confirmar agendamentos em lote.');
    }
  };

  const handleBatchCancel = async () => {
    if (!confirm('Deseja realmente cancelar os agendamentos selecionados?')) return;
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await Promise.all(selectedAppIds.map((id) => updateAppointment(id, { status: 'CANCELLED' }, token)));
      setSelectedAppIds([]);
      loadData();
    } catch {
      alert('Erro ao cancelar agendamentos em lote.');
    }
  };

  const handleBatchReschedule = async () => {
    const targetDateStr = prompt('Digite a nova data para os agendamentos selecionados (AAAA-MM-DD):');
    if (!targetDateStr) return;
    const targetDate = new Date(`${targetDateStr}T00:00:00`);
    if (isNaN(targetDate.getTime())) {
      alert('Data inválida.');
      return;
    }
    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await Promise.all(
        selectedAppIds.map((id) => {
          const app = appointments.find((a) => a.id === id);
          if (!app) return Promise.resolve();
          const currentStart = new Date(app.startTime);
          const currentEnd = new Date(app.endTime);
          const duration = currentEnd.getTime() - currentStart.getTime();

          const newStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), currentStart.getHours(), currentStart.getMinutes(), 0);
          const newEnd = new Date(newStart.getTime() + duration);

          return updateAppointment(id, {
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString()
          }, token);
        })
      );
      setSelectedAppIds([]);
      loadData();
    } catch {
      alert('Erro ao reagendar agendamentos. Verifique conflitos de horários.');
    }
  };

  // Drag and Drop implementation logic
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
    setDraggedAppId(appId);
    
    // Store mouse offset Y and X from the top-left of the dragged card
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabY = e.clientY - rect.top;
    const grabX = e.clientX - rect.left;
    e.dataTransfer.setData('grabY', String(grabY));
    e.dataTransfer.setData('grabX', String(grabX));
  };

  const handleDailyDrop = async (e: React.DragEvent<HTMLDivElement>, professionalId: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    if (!appId) return;

    const grabY = Number(e.dataTransfer.getData('grabY') || 0);
    const grabX = Number(e.dataTransfer.getData('grabX') || 0);
    const cardLeft = e.clientX - grabX;

    // Find all daily-column elements to determine the column with the highest horizontal overlap
    const columns = document.querySelectorAll('.daily-column');
    let targetProfId = professionalId;
    let bestOverlap = -1;

    columns.forEach((col) => {
      const colRect = col.getBoundingClientRect();
      const colProfId = col.getAttribute('data-prof-id');
      if (!colProfId) return;

      const cardWidth = colRect.width - 16;
      const overlapStart = Math.max(cardLeft, colRect.left);
      const overlapEnd = Math.min(cardLeft + cardWidth, colRect.right);
      const overlapWidth = overlapEnd - overlapStart;

      if (overlapWidth > bestOverlap) {
        bestOverlap = overlapWidth;
        targetProfId = colProfId;
      }
    });

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top - grabY; // Calculate relative Y based on card's top edge
    const minutes = relativeY / 2;
    // Snap to 30 mins (grid spans 11 hours = 660 mins)
    const snappedMinutes = Math.max(0, Math.min(11 * 60, Math.round(minutes / 30) * 30));

    const app = appointments.find((a) => a.id === appId);
    if (!app) return;

    const appDate = new Date(app.startTime);
    const newStart = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate(), 8, 0, 0);
    newStart.setMinutes(snappedMinutes);

    const duration = new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await updateAppointment(appId, {
        professionalId: targetProfId,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      }, token);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Erro ao reagendar: ${errorObj?.message ?? 'Conflito de horário detectado.'}`);
    } finally {
      setDraggedAppId(null);
    }
  };

  const handleWeeklyDrop = async (e: React.DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    if (!appId) return;

    const grabY = Number(e.dataTransfer.getData('grabY') || 0);
    const grabX = Number(e.dataTransfer.getData('grabX') || 0);
    const cardLeft = e.clientX - grabX;

    // Find all weekly-column elements to determine the column with the highest horizontal overlap
    const columns = document.querySelectorAll('.weekly-column');
    let finalTargetDate = targetDate;
    let bestOverlap = -1;

    columns.forEach((col) => {
      const colRect = col.getBoundingClientRect();
      const dateStr = col.getAttribute('data-date');
      if (!dateStr) return;

      const cardWidth = colRect.width - 4;
      const overlapStart = Math.max(cardLeft, colRect.left);
      const overlapEnd = Math.min(cardLeft + cardWidth, colRect.right);
      const overlapWidth = overlapEnd - overlapStart;

      if (overlapWidth > bestOverlap) {
        bestOverlap = overlapWidth;
        finalTargetDate = new Date(dateStr);
      }
    });

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top - grabY; // Calculate relative Y based on card's top edge
    const minutes = relativeY / 2;
    const snappedMinutes = Math.max(0, Math.min(10 * 60, Math.round(minutes / 30) * 30));

    const app = appointments.find((a) => a.id === appId);
    if (!app) return;

    const newStart = new Date(finalTargetDate.getFullYear(), finalTargetDate.getMonth(), finalTargetDate.getDate(), 8, 0, 0);
    newStart.setMinutes(snappedMinutes);

    const duration = new Date(app.endTime).getTime() - new Date(app.startTime).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    try {
      const token = getCookie('pipevitta_token');
      if (!token) return;
      await updateAppointment(appId, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      }, token);
      loadData();
    } catch (err) {
      const errorObj = err as { message?: string };
      alert(`Erro ao reagendar: ${errorObj?.message ?? 'Conflito de horário detectado.'}`);
    } finally {
      setDraggedAppId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans pb-16 h-full flex flex-col relative overflow-hidden">
      <CustomStyles />

      {/* Top Header / Navigation / Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-surface px-6 py-4 border-b border-outline-variant/30">
        {/* Navigation buttons */}
        <div className="flex items-center gap-4">
          <PeriodSelector
            label={getHeaderLabel()}
            type={viewMode === 'DAILY' || viewMode === 'WEEKLY' ? 'date' : 'month'}
            value={
              viewMode === 'DAILY' || viewMode === 'WEEKLY'
                ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                : `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
            }
            onChange={(val) => {
              if (viewMode === 'DAILY' || viewMode === 'WEEKLY') {
                const [year, month, day] = val.split('-').map(Number);
                setCurrentDate(new Date(year, month - 1, day));
              } else {
                const [year, month] = val.split('-').map(Number);
                setCurrentDate(new Date(year, month - 1, 1));
              }
            }}
            onAdjust={adjustDate}
          />
          {viewMode === 'DAILY' && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 border border-outline-variant/30 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Filters and View Switchers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Professional Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfDropdownOpen(!isProfDropdownOpen);
                setIsRoomDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer animate-fade-in"
            >
              <span className="material-symbols-outlined text-lg text-on-surface-variant">group</span>
              {selectedProfIds.length === 0
                ? 'Todos Profissionais'
                : `${selectedProfIds.length} Profissionais`}
              <span className="material-symbols-outlined text-lg text-on-surface-variant">arrow_drop_down</span>
            </button>

            {isProfDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/35 rounded-xl shadow-xl z-50 p-3 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                  <span className="text-xs font-bold text-outline uppercase">Profissionais</span>
                  <button
                    onClick={() => {
                      setSelectedProfIds([]);
                      setIsProfDropdownOpen(false);
                    }}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Todos
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 agenda-scroll pr-1">
                  {professionals.map((prof) => (
                    <label key={prof.id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer p-1 hover:bg-surface-container-low rounded">
                      <input
                        type="checkbox"
                        checked={selectedProfIds.includes(prof.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProfIds((prev) => [...prev, prof.id]);
                          } else {
                            setSelectedProfIds((prev) => prev.filter((id) => id !== prof.id));
                          }
                        }}
                        className="rounded border-outline-variant text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-medium text-xs text-on-surface-variant truncate">{prof.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Room Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsRoomDropdownOpen(!isRoomDropdownOpen);
                setIsProfDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer animate-fade-in"
            >
              <span className="material-symbols-outlined text-lg text-on-surface-variant">meeting_room</span>
              {selectedRoomIds.length === 0
                ? 'Todas as Salas'
                : `${selectedRoomIds.length} Salas`}
              <span className="material-symbols-outlined text-lg text-on-surface-variant">arrow_drop_down</span>
            </button>

            {isRoomDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/35 rounded-xl shadow-xl z-50 p-3 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                  <span className="text-xs font-bold text-outline uppercase">Salas</span>
                  <button
                    onClick={() => {
                      setSelectedRoomIds([]);
                      setIsRoomDropdownOpen(false);
                    }}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Todas
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 agenda-scroll pr-1">
                  {resources.filter((r) => r.type === 'ROOM').map((room) => (
                    <label key={room.id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer p-1 hover:bg-surface-container-low rounded">
                      <input
                        type="checkbox"
                        checked={selectedRoomIds.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoomIds((prev) => [...prev, room.id]);
                          } else {
                            setSelectedRoomIds((prev) => prev.filter((id) => id !== room.id));
                          }
                        }}
                        className="rounded border-outline-variant text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-medium text-xs text-on-surface-variant truncate">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* View Modes */}
          <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant/20">
            {(['DAILY', 'WEEKLY', 'MONTHLY', 'LIST'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  setIsProfDropdownOpen(false);
                  setIsRoomDropdownOpen(false);
                  setSelectedAppIds([]);
                }}
                className={`
                  px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer
                  ${viewMode === mode ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}
                `}
              >
                {mode === 'DAILY' ? 'Dia' : ''}
                {mode === 'WEEKLY' ? 'Semana' : ''}
                {mode === 'MONTHLY' ? 'Mês' : ''}
                {mode === 'LIST' ? 'Lista' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-4 flex-1">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
          <p className="text-sm text-on-surface-variant font-medium">Carregando dados da agenda...</p>
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
        /* INTERACTIVE GRID CALENDAR CANVAS */
        <div className="flex-1 bg-surface-container-lowest overflow-hidden flex flex-col p-4">
          
          {/* VIEW: DAILY */}
          {viewMode === 'DAILY' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Y-Axis: Time slots column */}
              <div className="w-16 flex-shrink-0 border-r border-outline-variant/30 bg-surface-container-lowest flex flex-col z-10 select-none">
                <div className="h-14 border-b border-outline-variant/30 shrink-0"></div> {/* Header spacer */}
                <div ref={timeColRef} className="flex-grow overflow-hidden relative border-r border-outline-variant/20">
                  <div className="relative h-[1320px]">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const h = i + 8;
                      return (
                        <div key={h} className="absolute w-full pr-2 flex items-center justify-end h-0" style={{ top: `${i * 120}px` }}>
                          <span className="text-xs font-bold text-on-surface-variant leading-none">{String(h).padStart(2, '0')}:00</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* X-Axis and Grid container */}
              <div
                ref={gridRef}
                onScroll={handleGridScroll}
                className="flex-grow overflow-x-auto overflow-y-auto agenda-scroll relative bg-surface-container-lowest"
              >
                {/* Professionals Headers row */}
                <div className="sticky top-0 z-20 flex bg-surface border-b border-outline-variant/30 w-full shadow-sm h-14 shrink-0">
                  {visibleProfessionals.map((prof) => (
                    <div
                      key={prof.id}
                      style={{ flex: '1 0 250px' }}
                      className="h-14 flex items-center gap-3 px-4 border-r border-outline-variant/30 bg-surface select-none min-w-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs border border-primary/10 shadow-sm shrink-0">
                        {prof.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-on-surface truncate">{prof.name}</p>
                        <p className="text-xs text-outline truncate">Profissional Clínico</p>
                      </div>
                    </div>
                  ))}
                  {visibleProfessionals.length === 0 && (
                    <div className="h-14 flex items-center px-6 text-xs text-outline italic">
                      Nenhum profissional selecionado
                    </div>
                  )}
                </div>

                {/* Grid Body */}
                <div className="relative w-full flex bg-surface-container-lowest select-none">
                  {/* Horizontal grid lines */}
                  <div className="absolute inset-0 z-0 pointer-events-none flex flex-col">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-[60px] border-b border-outline-variant/20 ${i % 2 === 0 ? 'border-dashed' : ''}`}
                      />
                    ))}
                  </div>
                  {/* Current Time Indicator line */}
                  {currentTop !== null && (
                    <div
                      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                      style={{
                        top: `${currentTop}px`
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-error shrink-0"></div>
                      <div className="h-[2px] bg-error w-full shadow-sm"></div>
                    </div>
                  )}

                  {/* Lunch break bar */}
                  <div
                    className="absolute h-[120px] top-[480px] left-0 bg-surface-container-high/40 z-0 border-y border-outline-variant/30 flex items-center justify-center pointer-events-none w-full"
                  >
                    <span className="text-xs text-outline font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">restaurant</span>
                      Horário de Almoço (12:00 - 13:00)
                    </span>
                  </div>

                  {/* Columns representation */}
                  {visibleProfessionals.map((prof) => {
                    const profApps = getAppointmentsForDay(currentDate).filter((a) => a.professionalId === prof.id);

                    return (
                      <div
                        key={prof.id}
                        data-prof-id={prof.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDailyDrop(e, prof.id)}
                        style={{ flex: '1 0 250px' }}
                        className="daily-column border-r border-outline-variant/20 relative h-[1320px] bg-transparent"
                      >
                        {profApps.map((app) => {
                          const start = new Date(app.startTime);
                          const end = new Date(app.endTime);
                          const top = ((start.getHours() - 8) * 60 + start.getMinutes()) * 2;
                          const duration = (end.getTime() - start.getTime()) / 60000;
                          const height = duration * 2 - 2;

                          const roomName = app.resources?.find((r) => r.resource.type === 'ROOM')?.resource.name || 'Sala 1';
                          const proc = app.notes?.includes('|') ? app.notes.split('|')[0] : 'Consulta Clínica';

                          return (
                            <div
                              key={app.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, app.id)}
                              onClick={() => setActiveAppointment(app)}
                              style={{ top: `${top}px`, height: `${height}px` }}
                              className={`
                                absolute left-2 right-2 rounded-xl border p-2.5 flex flex-col justify-between cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group z-10 overflow-hidden
                                ${app.status === 'CONFIRMED' ? 'bg-[#d1fae5] border-emerald-300 text-emerald-950' : ''}
                                ${app.status === 'PENDING' ? 'bg-[#fef3c7] border-amber-300 text-amber-950 border-dashed' : ''}
                                ${app.status === 'COMPLETED' ? 'bg-primary/10 border-primary/30 text-on-surface-variant' : ''}
                                ${app.status === 'CANCELLED' ? 'bg-error-container/40 border-error/20 text-on-error-container' : ''}
                              `}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <div className="truncate">
                                  <p className="text-base font-extrabold truncate leading-tight group-hover:text-primary transition-colors">
                                    {app.patient.name}
                                  </p>
                                  <p className="text-xs font-semibold opacity-70 truncate mt-0.5">{proc}</p>
                                </div>
                                <span
                                  className={`
                                    text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0
                                    ${app.status === 'CONFIRMED' ? 'bg-emerald-600 text-white' : ''}
                                    ${app.status === 'PENDING' ? 'bg-amber-600 text-white' : ''}
                                    ${app.status === 'COMPLETED' ? 'bg-primary text-white' : ''}
                                    ${app.status === 'CANCELLED' ? 'bg-error text-white' : ''}
                                  `}
                                >
                                  {app.status === 'CONFIRMED' ? 'Confirmado' : ''}
                                  {app.status === 'PENDING' ? 'Pendente' : ''}
                                  {app.status === 'COMPLETED' ? 'Em Atendimento' : ''}
                                  {app.status === 'CANCELLED' ? 'Cancelado' : ''}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] mt-1 select-none border-t border-outline-variant/10 pt-1">
                                <span className="flex items-center gap-0.5 truncate flex-grow">
                                  <span className="material-symbols-outlined shrink-0">meeting_room</span>
                                  <span className="truncate">{roomName}</span>
                                </span>
                                <p className="font-extrabold text-primary">
                                  {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: WEEKLY */}
          {viewMode === 'WEEKLY' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Days Columns Headers */}
              <div className="flex border-b border-outline-variant/30 shrink-0 bg-surface z-20 shadow-sm select-none">
                <div className="w-16 shrink-0 border-r border-outline-variant/20"></div>
                <div className="flex-grow grid grid-cols-7 divide-x divide-outline-variant/20 text-center">
                  {getWeekDays().map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const dayApps = getAppointmentsForDay(day);
                    const isSunday = day.getDay() === 0;

                    const capacity = 8;
                    const pct = Math.min(Math.round((dayApps.length / capacity) * 100), 100);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`py-3 flex flex-col items-center justify-center relative ${isToday ? 'bg-surface-container-low/50 border-b-2 border-primary' : ''}`}
                      >
                        <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>
                          {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                        <span className={`text-xl font-bold mt-0.5 ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                          {day.getDate()}
                        </span>
                        {!isSunday ? (
                          <div
                            className={`
                              mt-2 px-2 py-0.5 rounded text-xs font-bold border
                              ${pct >= 85 ? 'bg-primary-fixed-dim/30 text-primary-container border-primary/20' : pct >= 50 ? 'bg-surface-container text-on-surface-variant border-outline-variant/30' : 'bg-tertiary-fixed/50 text-tertiary border-tertiary/20'}
                            `}
                          >
                            {pct >= 85 ? '85% Cheio' : pct >= 50 ? 'Ocupação Ideal' : 'Baixa Ocupação'}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-outline font-bold uppercase tracking-wider">Fechado</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid hours weekly scrolling area */}
              <div className="flex-grow overflow-y-auto agenda-scroll relative">
                <div className="flex min-h-max relative">
                  {/* Hours axis */}
                  <div className="w-16 shrink-0 bg-surface border-r border-outline-variant/30 z-10 relative select-none">
                    <div className="relative h-[1200px]">
                      {Array.from({ length: 11 }).map((_, i) => {
                        const h = i + 8;
                        return (
                          <div key={h} className="absolute w-full pr-2 flex items-center justify-end h-0" style={{ top: `${i * 120}px` }}>
                            <span className="text-xs font-bold text-on-surface-variant leading-none">{String(h).padStart(2, '0')}:00</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Columns area */}
                  <div className="flex-1 relative" style={{ height: '1200px' }}>
                    {/* Horizontal grid lines */}
                    <div className="absolute inset-0 z-0 pointer-events-none flex flex-col">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-[60px] border-b border-outline-variant/20 ${i % 2 === 0 ? 'border-dashed' : ''}`}
                        />
                      ))}
                    </div>

                    {/* Columns dividers */}
                    <div className="absolute inset-0 z-0 pointer-events-none grid grid-cols-7 divide-x divide-outline-variant/20">
                      {getWeekDays().map((day) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div key={day.toISOString()} className={isToday ? 'bg-surface-container-low/25' : ''} />
                        );
                      })}
                    </div>

                    {/* Events render container */}
                    <div className="absolute inset-0 z-10 grid grid-cols-7 gap-x-1 p-1">
                      {getWeekDays().map((day, dayIndex) => {
                        const dayApps = getAppointmentsForDay(day);

                        return (
                          <div
                            key={day.toISOString()}
                            data-date={day.toISOString()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleWeeklyDrop(e, day)}
                            className="weekly-column relative h-full"
                          >
                            {/* Render red timeline line if today */}
                            {isSameDay(day, new Date()) && currentTop !== null && (
                              <div className="absolute left-[-2px] right-[-2px] z-20 flex items-center pointer-events-none" style={{ top: `${currentTop}px` }}>
                                <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0"></div>
                                <div className="h-[2px] bg-error w-full shadow-sm"></div>
                              </div>
                            )}

                            {/* Render hatched block reservation on Saturday after 12:00 */}
                            {dayIndex === 5 && (
                              <div
                                className="absolute left-0 right-0 rounded border border-outline-variant/40 hatched-bg text-on-surface-variant flex items-center justify-center opacity-85 pointer-events-none"
                                style={{ top: '480px', height: '360px' }}
                              >
                                <div className="bg-surface/90 px-2 py-1 rounded border border-outline-variant/20 text-center backdrop-blur-sm shadow-sm max-w-[90%]">
                                  <span className="material-symbols-outlined text-outline text-xs block">cleaning_services</span>
                                  <span className="text-[8px] font-bold block uppercase mt-0.5">Esterilização</span>
                                </div>
                              </div>
                            )}

                            {dayApps.map((app) => {
                              const start = new Date(app.startTime);
                              const end = new Date(app.endTime);
                              const top = ((start.getHours() - 8) * 60 + start.getMinutes()) * 2;
                              const duration = (end.getTime() - start.getTime()) / 60000;
                              const height = duration * 2 - 2;

                              const roomName = app.resources?.find((r) => r.resource.type === 'ROOM')?.resource.name || 'Sala 1';
                              const proc = app.notes?.includes('|') ? app.notes.split('|')[0] : 'Consulta Clínica';

                              return (
                                <div
                                  key={app.id}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, app.id)}
                                  onClick={() => setActiveAppointment(app)}
                                  style={{ top: `${top}px`, height: `${height}px` }}
                                  className={`
                                    absolute left-0.5 right-0.5 rounded border p-1.5 shadow-sm hover:shadow-md group cursor-grab active:cursor-grabbing overflow-hidden transition-all flex flex-col justify-between z-10
                                    ${app.status === 'CONFIRMED' ? 'bg-[#d1fae5] border-emerald-300 text-emerald-950' : ''}
                                    ${app.status === 'PENDING' ? 'bg-[#fef3c7] border-amber-300 text-amber-950 border-dashed' : ''}
                                    ${app.status === 'COMPLETED' ? 'bg-primary/10 border-primary/20 text-on-surface-variant' : ''}
                                    ${app.status === 'CANCELLED' ? 'bg-error-container/40 border-error/20 text-on-error-container' : ''}
                                  `}
                                >
                                  <div className="flex flex-col gap-0.5 select-none h-full justify-between w-full">
                                    <div className="space-y-0.5 w-full">
                                      <div className="flex justify-between items-start gap-1 w-full">
                                        <p className="text-base font-extrabold truncate leading-tight group-hover:text-primary transition-colors flex-grow">
                                          {app.patient.name}
                                        </p>
                                        <span
                                          className={`
                                            text-[10px] font-extrabold px-1 rounded uppercase shrink-0 leading-normal
                                            ${app.status === 'CONFIRMED' ? 'bg-emerald-600 text-white' : ''}
                                            ${app.status === 'PENDING' ? 'bg-amber-600 text-white' : ''}
                                            ${app.status === 'COMPLETED' ? 'bg-primary text-white' : ''}
                                            ${app.status === 'CANCELLED' ? 'bg-error text-white' : ''}
                                          `}
                                        >
                                          {app.status === 'CONFIRMED' ? 'Conf' : ''}
                                          {app.status === 'PENDING' ? 'Pend' : ''}
                                          {app.status === 'COMPLETED' ? 'Atend' : ''}
                                          {app.status === 'CANCELLED' ? 'Canc' : ''}
                                        </span>
                                      </div>
                                      <p className="text-xs font-semibold opacity-70 truncate">{proc}</p>
                                      <p className="text-[10px] opacity-75 truncate flex items-center gap-0.5 mt-0.5">
                                        <span className="material-symbols-outlined text-[10px] shrink-0">person</span>
                                        <span className="truncate">{app.professional.name}</span>
                                      </p>
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] opacity-75 mt-1 border-t border-outline-variant/10 pt-1 w-full">
                                      <span className="flex items-center gap-0.5 truncate flex-grow">
                                        <span className="material-symbols-outlined text-[10px] shrink-0">meeting_room</span>
                                        <span className="truncate">{roomName}</span>
                                      </span>
                                      <span className="shrink-0 font-bold ml-1">
                                        {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MONTHLY */}
          {viewMode === 'MONTHLY' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Month Header Days */}
              <div className="grid grid-cols-7 border-b border-outline-variant/35 bg-surface-container-low select-none">
                {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((d) => (
                  <div key={d} className="py-2.5 text-center font-bold text-xs text-on-surface-variant tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-outline-variant/25 mt-1 border border-outline-variant/35 rounded-xl overflow-hidden animate-fade-in">
                {getMonthDays().map((day) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(day, new Date());
                  const dayApps = getAppointmentsForDay(day);
                  const isSunday = day.getDay() === 0;

                  const capacity = 8;
                  const pct = Math.min(Math.round((dayApps.length / capacity) * 100), 100);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        p-2 flex flex-col justify-between min-h-[90px] relative group transition-colors select-none
                        ${isCurrentMonth ? 'bg-surface-container-lowest hover:bg-surface-container-low/30 cursor-pointer' : 'bg-surface-container-low/20 opacity-40'}
                      `}
                      onClick={() => {
                        if (isCurrentMonth) {
                          setCurrentDate(day);
                          setViewMode('DAILY');
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        {isToday ? (
                          <span className="w-6 h-6 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-xs shadow-md animate-fade-in">
                            {day.getDate()}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-on-surface-variant">
                            {day.getDate()}
                          </span>
                        )}
                        
                        {isToday && pct < 40 && (
                          <span className="material-symbols-outlined text-base text-tertiary-container animate-pulse" title="Dica da IA disponível">
                            campaign
                          </span>
                        )}
                      </div>

                      {/* AI Hover tip card */}
                      {isToday && pct < 40 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-inverse-surface text-inverse-on-surface p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-inverse-primary text-sm mt-0.5">lightbulb</span>
                            <p className="text-xs font-medium leading-relaxed">
                              Dica da IA: Envie mensagem para os 45 pacientes sem retorno há 6 meses para ocupar a agenda de hoje.
                            </p>
                          </div>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-inverse-surface rotate-45"></div>
                        </div>
                      )}

                      {!isSunday ? (
                        dayApps.length > 0 ? (
                          <div className="mt-auto space-y-1">
                            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                              <div
                                className={`h-full ${pct >= 80 ? 'bg-[#10B981]' : pct >= 50 ? 'bg-primary' : 'bg-tertiary'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-xs text-on-surface-variant font-bold truncate">
                              {dayApps.length} agend. • R$ {dayApps.reduce((acc, a) => acc + getAppointmentValue(a.notes), 0).toLocaleString('pt-BR')} prev.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-outline mt-auto italic">Sem agendamentos</p>
                        )
                      ) : (
                        <p className="text-xs text-outline mt-auto font-bold uppercase text-center select-none opacity-60">Fechado</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legends Footer */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant px-2 select-none shrink-0 bg-surface p-3 rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                    <span className="font-semibold text-xs text-on-surface-variant">Alta Ocupação (&gt;80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="font-semibold text-xs text-on-surface-variant">Ocupação Ideal (50-80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-tertiary"></div>
                    <span className="font-semibold text-xs text-on-surface-variant">Baixa Ocupação (&lt;50%)</span>
                  </div>
                </div>
                <div className="font-bold text-on-surface text-sm">
                  Total Mensal Previsto: R$ {totalMonthlyPredicted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: LIST */}
          {viewMode === 'LIST' && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden relative m-2">
              {/* Table search toolbar */}
              <div className="p-4 border-b border-outline-variant flex flex-col gap-4 shrink-0 bg-surface-container-low/10 select-none">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="relative flex items-center w-full sm:w-1/2">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-sm">search</span>
                    <input
                      type="text"
                      placeholder="Buscar por paciente, profissional ou procedimento..."
                      value={listSearchQuery}
                      onChange={(e) => setListSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all w-full"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`flex items-center gap-2 px-3 py-1.5 border border-outline rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors cursor-pointer ${showAdvancedFilters ? 'bg-primary/10 text-primary border-primary/20' : 'text-on-surface-variant'}`}
                    >
                      <span className="material-symbols-outlined text-sm">tune</span>
                      Filtros Avançados
                    </button>
                    <CSVExportButton
                      headers={['Data e Hora', 'Paciente', 'Procedimento', 'Profissional', 'Status', 'Valor']}
                      rows={listApps.map((app) => {
                        const date = formatListDate(app.startTime);
                        const proc = app.notes?.includes('|') ? app.notes.split('|')[0] : 'Consulta Estética';
                        const val = getAppointmentValue(app.notes);
                        return [
                          `"${date}"`,
                          `"${app.patient.name}"`,
                          `"${proc}"`,
                          `"${app.professional.name}"`,
                          `"${app.status}"`,
                          `"R$ ${val.toFixed(2)}"`
                        ];
                      })}
                      filename={`agenda_vitta_${new Date().toISOString().split('T')[0]}.csv`}
                    />
                  </div>
                </div>

                {/* Advanced filter panels */}
                <AdvancedFilters
                  isOpen={showAdvancedFilters}
                  filters={agendaFilters}
                  fields={agendaFilterFields}
                  onChange={handleFilterChange}
                  onClearField={handleClearField}
                  onClearAll={handleClearAllFilters}
                  valueLabelsMap={agendaValueLabelsMap}
                />
              </div>

              {/* Table rendering */}
              <div className="table-container overflow-auto flex-1 agenda-scroll">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-surface-container-low sticky top-0 z-10 shadow-sm text-xs font-bold text-on-surface-variant uppercase select-none">
                    <tr className="border-b border-outline-variant">
                      <th className="py-3 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedAppIds.length === listApps.length && listApps.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAppIds(listApps.map((a) => a.id));
                            } else {
                              setSelectedAppIds([]);
                            }
                          }}
                          className="rounded border-outline-variant text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 tracking-wider">Data / Horário</th>
                      <th className="py-3 px-4 tracking-wider">Paciente</th>
                      <th className="py-3 px-4 tracking-wider">Procedimento</th>
                      <th className="py-3 px-4 tracking-wider">Profissional</th>
                      <th className="py-3 px-4 tracking-wider">Status</th>
                      <th className="py-3 px-4 tracking-wider text-right">Valor</th>
                      <th className="py-3 px-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15 text-sm text-on-surface">
                    {listApps.map((app) => {
                      const proc = app.notes?.includes('|') ? app.notes.split('|')[0] : 'Consulta Estética';
                      const val = getAppointmentValue(app.notes);

                      return (
                        <tr
                          key={app.id}
                          className={`hover:bg-surface-container-low/20 transition-colors group ${selectedAppIds.includes(app.id) ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                        >
                          <td className="py-3 px-4 w-12 text-center select-none">
                            <SelectionCell
                              id={app.id}
                              name={app.patient.name}
                              checked={selectedAppIds.includes(app.id)}
                              onChange={(isChecked) => {
                                if (isChecked) {
                                  setSelectedAppIds((prev) => [...prev, app.id]);
                                } else {
                                  setSelectedAppIds((prev) => prev.filter((id) => id !== app.id));
                                }
                              }}
                            />
                          </td>
                          <td
                            onClick={() => setActiveAppointment(app)}
                            className="py-3 px-4 font-semibold text-primary cursor-pointer"
                          >
                            {formatListDate(app.startTime)}
                          </td>
                          <td
                            onClick={() => setActiveAppointment(app)}
                            className="py-3 px-4 font-bold cursor-pointer"
                          >
                            {app.patient.name}
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant">{proc}</td>
                          <td className="py-3 px-4 text-on-surface-variant">{app.professional.name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`
                                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase border
                                ${app.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                ${app.status === 'COMPLETED' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                                ${app.status === 'CANCELLED' ? 'bg-error-container/40 text-error border-error/20' : ''}
                              `}
                            >
                              {app.status === 'CONFIRMED' ? 'Confirmado' : ''}
                              {app.status === 'PENDING' ? 'Pendente' : ''}
                              {app.status === 'COMPLETED' ? 'Em Atendimento' : ''}
                              {app.status === 'CANCELLED' ? 'Cancelado' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 w-12 text-center select-none">
                            <button
                              onClick={() => handleOpenEdit(app)}
                              className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-lg block">edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {listApps.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-20 text-center text-xs text-outline italic">
                          Nenhum agendamento encontrado na listagem.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Floating Batch Action overlay bar */}
              <BatchActionMenu
                selectedCount={selectedAppIds.length}
                onClear={() => setSelectedAppIds([])}
                actions={[
                  {
                    label: 'Confirmar',
                    icon: 'check_circle',
                    variant: 'primary',
                    onClick: handleBatchConfirm,
                  },
                  {
                    label: 'Reagendar',
                    icon: 'schedule',
                    variant: 'secondary',
                    onClick: handleBatchReschedule,
                  },
                  {
                    label: 'Cancelar',
                    icon: 'cancel',
                    variant: 'danger',
                    onClick: handleBatchCancel,
                  },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) for Scheduling */}
      <button
        onClick={() => {
          setEditMode(false);
          setFormData({
            patientId: '',
            professionalId: '',
            startDate: currentDate.toISOString().split('T')[0],
            startTime: '09:00',
            durationMinutes: '60',
            resourceId: '',
            bufferMinutes: '15',
            notes: '',
            status: 'PENDING',
          });
          setPatientSearch('');
          setIsModalOpen(true);
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-primary/95 transition-all duration-200 flex items-center justify-center z-30 group cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/20"
        title="Agendar Consulta"
      >
        <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">
          add
        </span>
      </button>

      {/* Modal Dialog: New / Edit Appointment */}
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
          <div className="relative w-full max-w-[600px] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden slide-in">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/20">
              <h2 className="font-display font-semibold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {editMode ? 'edit_calendar' : 'add_box'}
                </span>
                {editMode ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setCreateError(null);
                }}
                className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="bg-error-container text-on-error-container p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 border border-error/20">
                  <span className="material-symbols-outlined text-lg">warning</span>
                  <span>{createError}</span>
                </div>
              )}

              {/* 1. Patient Search Input */}
              <div className="space-y-1 relative">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-on-surface-variant">Paciente</label>
                  {fastRegister && (
                    <span className="bg-green-100 text-green-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                      Novo Paciente
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                  <input
                    type="text"
                    required
                    placeholder="Buscar paciente por nome..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientResults(true);
                    }}
                    onFocus={() => setShowPatientResults(true)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow"
                  />
                  {patientSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientSearch('');
                        setFormData((prev) => ({ ...prev, patientId: '' }));
                        setFastRegister(false);
                        setFastPatientData({ cpf: '', email: '', birthDate: '', phone: '' });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-base block">cancel</span>
                    </button>
                  )}
                </div>

                {showPatientResults && patientSearch && (
                  <div className="absolute left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/35 rounded-xl shadow-xl z-50 p-2 max-h-48 overflow-y-auto agenda-scroll">
                    {filteredPatients.map((pat) => (
                      <div
                        key={pat.id}
                        onClick={() => {
                          setPatientSearch(pat.name);
                          setFormData((prev) => ({ ...prev, patientId: pat.id }));
                          setFastRegister(false);
                          setShowPatientResults(false);
                        }}
                        className="p-2 text-xs font-bold text-on-surface hover:bg-surface-container-low rounded-lg cursor-pointer transition-colors"
                      >
                        {pat.name}
                      </div>
                    ))}
                    {!editMode && (!filteredPatients.some(p => p.name.toLowerCase() === patientSearch.toLowerCase())) && (
                      <div
                        onClick={() => {
                          setFastRegister(true);
                          setFormData((prev) => ({ ...prev, patientId: 'NEW_PATIENT_TEMP' }));
                          setShowPatientResults(false);
                        }}
                        className="p-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg cursor-pointer transition-colors flex items-center gap-1 border-t border-outline-variant/20 mt-1"
                      >
                        <span className="material-symbols-outlined text-base">person_add</span>
                        Criar novo paciente rapidamente: &quot;{patientSearch}&quot;
                      </div>
                    )}
                    {filteredPatients.length === 0 && (
                      <div className="p-2 text-xs text-outline italic">Nenhum paciente encontrado</div>
                    )}
                  </div>
                )}
              </div>

              {/* Conditionally render Fast Patient Fields */}
              {fastRegister && (
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 space-y-3 animate-fade-in">
                  <div className="text-xs font-bold text-green-800 flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-base">info</span>
                    Dados para cadastro rápido do paciente
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface-variant">CPF (Apenas números, 11 dígitos)</label>
                      <input
                        type="text"
                        name="cpf"
                        maxLength={11}
                        required
                        value={fastPatientData.cpf}
                        onChange={handleFastPatientChange}
                        placeholder="00000000000"
                        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface-variant">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={fastPatientData.email}
                        onChange={handleFastPatientChange}
                        placeholder="email@exemplo.com"
                        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface-variant">Data de Nascimento</label>
                      <input
                        type="date"
                        name="birthDate"
                        value={fastPatientData.birthDate}
                        onChange={handleFastPatientChange}
                        onClick={(e) => e.currentTarget.showPicker()}
                        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface-variant">WhatsApp / Celular</label>
                      <input
                        type="text"
                        name="phone"
                        required
                        value={fastPatientData.phone}
                        onChange={handleFastPatientChange}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Service & Professional Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-on-surface-variant">Procedimento / Serviço</label>
                  <select
                    name="notes"
                    value={formData.notes.split('|')[0] || ''}
                    onChange={(e) => {
                      const baseNote = formData.notes.includes('|') ? formData.notes.substring(formData.notes.indexOf('|') + 1) : formData.notes;
                      setFormData((prev) => ({ ...prev, notes: `${e.target.value}|${baseNote}` }));
                    }}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                  >
                    <option value="Consulta Estética">Consulta de Avaliação Estética</option>
                    <option value="Limpeza Facial">Limpeza de Pele Profunda</option>
                    <option value="Harmonização Facial">Harmonização Facial (Preenchimento)</option>
                    <option value="Clareamento Dental">Clareamento Clínico</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-on-surface-variant">Profissional Responsável</label>
                  <select
                    name="professionalId"
                    required
                    value={formData.professionalId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                  >
                    <option value="">Selecione um profissional</option>
                    {professionals.map((prof) => (
                      <option key={prof.id} value={prof.id}>{prof.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Schedule details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant">Data</label>
                    <input
                      type="date"
                      name="startDate"
                      required
                      value={formData.startDate}
                      onChange={handleInputChange}
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant">Horário Início</label>
                    <select
                      name="startTime"
                      required
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow cursor-pointer"
                    >
                      {[
                        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
                        '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
                        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
                        '17:00', '17:30', '18:00', '18:30'
                      ].map((t) => {
                        const conflict = checkSlotConflict(
                          formData.startDate,
                          t,
                          Number(formData.durationMinutes),
                          formData.professionalId,
                          formData.resourceId,
                          editMode ? editAppointmentId : null
                        );
                        const isOccupied = conflict !== null;
                        return (
                          <option
                            key={t}
                            value={t}
                            disabled={isOccupied}
                            className={isOccupied ? 'text-outline-variant line-through bg-surface-container-high/30' : ''}
                          >
                            {t} {conflict === 'professional' ? '(Profissional Ocupado)' : conflict === 'resource' ? '(Sala Ocupada)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant">Duração (minutos)</label>
                    <input
                      type="number"
                      name="durationMinutes"
                      required
                      min="5"
                      max="480"
                      step="5"
                      value={formData.durationMinutes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant">Buffer de Descanso (minutos)</label>
                    <input
                      type="number"
                      name="bufferMinutes"
                      required
                      min="0"
                      max="120"
                      step="5"
                      value={formData.bufferMinutes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface-variant">Sala / Recurso</label>
                    <select
                      name="resourceId"
                      value={formData.resourceId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow"
                    >
                      <option value="">Selecione uma sala</option>
                      {resources.filter((r) => r.type === 'ROOM').map((res) => (
                        <option key={res.id} value={res.id}>{res.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Availability check feedback */}
              {(() => {
                const conflict = getSlotConflict();
                if (!conflict) return null;
                return (
                  <div className="flex items-center gap-2 text-xs font-bold text-error mt-1 select-none bg-error-container/20 p-2 rounded-lg border border-error/10">
                    <span className="material-symbols-outlined text-lg text-error">cancel</span>
                    <span>
                      {conflict === 'professional'
                        ? 'Profissional indisponível neste horário (conflito de agenda)'
                        : 'Sala / Recurso indisponível neste horário (já reservado)'}
                    </span>
                  </div>
                );
              })()}

              {/* 4. Status toggle buttons */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface-variant">Status Inicial</label>
                <div className="flex p-1 bg-surface-container-low rounded-lg border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('CONFIRMED')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md transition-colors ${formData.status === 'CONFIRMED' ? 'bg-surface-container-lowest text-on-surface border border-outline-variant/20 shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Confirmado
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('PENDING')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md transition-colors ${formData.status === 'PENDING' ? 'bg-surface-container-lowest text-on-surface border border-outline-variant/20 shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Pendente
                  </button>
                </div>
              </div>

              {/* 5. Custom Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-on-surface-variant">Observações Clínicas</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes.includes('|') ? formData.notes.substring(formData.notes.indexOf('|') + 1) : formData.notes}
                  onChange={(e) => {
                    const proc = formData.notes.includes('|') ? formData.notes.split('|')[0] : 'Consulta Estética';
                    setFormData((prev) => ({ ...prev, notes: `${proc}|${e.target.value}` }));
                  }}
                  placeholder="Queixas principais, restrições ou alertas..."
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow resize-none"
                />
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setCreateError(null);
                  }}
                  className="px-4 py-2 border border-outline-variant/40 hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">sync</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>Salvar Agendamento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Right Panel: Appointment Detail Command Center */}
      {activeAppointment && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveAppointment(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity duration-300"
        >
          <div className="fixed top-0 right-0 h-full w-full max-w-[900px] bg-surface-container-lowest shadow-2xl z-50 flex slide-in transform overflow-hidden">
            {/* Left Context Panel (Dark Sidebar) */}
            <div className="w-[320px] text-white flex flex-col relative shrink-0 bg-inverse-surface select-none border-r border-white/5">
              {/* Close Button */}
              <button
                onClick={() => setActiveAppointment(null)}
                className="absolute top-4 left-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>

              <div className="p-8 pt-16 flex flex-col items-center border-b border-white/10">
                {/* Score Avatar */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center font-display text-3xl font-bold border-4 border-[#1e2329] shadow-lg relative z-10">
                    {activeAppointment.patient.name.substring(0, 2).toUpperCase()}
                  </div>
                  {/* Score Ring */}
                  <svg className="absolute -top-2 -left-2 w-28 h-28 transform -rotate-90 z-0" viewBox="0 0 100 100">
                    <circle className="text-green-500 stroke-current" cx="50" cy="50" fill="transparent" r="45" strokeDasharray="282.7" strokeDashoffset="0" strokeWidth="5"></circle>
                  </svg>
                </div>
                <h2 className="font-display text-xl font-bold text-white mb-1 text-center truncate w-full">
                  {activeAppointment.patient.name}
                </h2>
                <p className="text-white/60 text-xs mb-4 text-center">
                  32 anos • Bradesco Saúde
                </p>

                <div className="flex gap-2 w-full">
                  <a
                    href={`https://wa.me/${activeAppointment.patient.phone || ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    WhatsApp
                  </a>
                  <button className="w-10 h-10 inline-flex items-center justify-center bg-white/10 text-white hover:bg-white/20 font-bold rounded-lg transition-colors border border-white/10">
                    <span className="material-symbols-outlined text-lg">call</span>
                  </button>
                </div>
              </div>

              {/* Context list info */}
              <div className="p-6 flex-1 overflow-y-auto agenda-scroll space-y-5">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Contexto Clínica</h3>
                
                <div className="space-y-4 select-none">
                  {/* Data & Hora */}
                  {editingField === 'dateTime' ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                      <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Data e Hora</p>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={drawerEditData.date}
                          onChange={(e) => setDrawerEditData(prev => ({ ...prev, date: e.target.value }))}
                          onClick={(e) => e.currentTarget.showPicker()}
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                        />
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={drawerEditData.startTime}
                            onChange={(e) => setDrawerEditData(prev => ({ ...prev, startTime: e.target.value }))}
                            className="flex-1 px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                          />
                          <select
                            value={drawerEditData.durationMinutes}
                            onChange={(e) => setDrawerEditData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                            className="flex-1 px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                          >
                            <option value="30">30 min</option>
                            <option value="60">1h</option>
                            <option value="90">1h30</option>
                            <option value="120">2h</option>
                          </select>
                        </div>
                      </div>
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
                          onClick={() => handleDrawerSave('dateTime')}
                          className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        const start = new Date(activeAppointment.startTime);
                        const end = new Date(activeAppointment.endTime);
                        const duration = (end.getTime() - start.getTime()) / 60000;
                        setDrawerEditData({
                          date: start.toISOString().split('T')[0],
                          startTime: start.toTimeString().split(' ')[0].substring(0, 5),
                          durationMinutes: String(duration),
                          notes: activeAppointment.notes || '',
                          professionalId: activeAppointment.professionalId,
                          resourceId: activeAppointment.resources?.find((r) => r.resource.type === 'ROOM')?.resource.id || '',
                        });
                        setEditingField('dateTime');
                      }}
                      className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                    >
                      <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">calendar_today</span>
                      <div className="flex-grow">
                        <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                          Data &amp; Hora
                          <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                        </p>
                        <p className="font-bold text-sm text-white">
                          {new Date(activeAppointment.startTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          <br />
                          <span className="text-xs font-medium text-primary-fixed-dim">
                            {new Date(activeAppointment.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(activeAppointment.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Procedimento */}
                  {editingField === 'procedure' ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                      <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Procedimento</p>
                      <select
                        value={drawerEditData.notes.split('|')[0] || ''}
                        onChange={(e) => setDrawerEditData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                      >
                        <option value="Consulta Estética">Consulta de Avaliação Estética</option>
                        <option value="Limpeza Facial">Limpeza de Pele Profunda</option>
                        <option value="Harmonização Facial">Harmonização Facial (Preenchimento)</option>
                        <option value="Clareamento Dental">Clareamento Clínico</option>
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
                          onClick={() => handleDrawerSave('procedure')}
                          className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        const start = new Date(activeAppointment.startTime);
                        const end = new Date(activeAppointment.endTime);
                        const duration = (end.getTime() - start.getTime()) / 60000;
                        setDrawerEditData({
                          date: start.toISOString().split('T')[0],
                          startTime: start.toTimeString().split(' ')[0].substring(0, 5),
                          durationMinutes: String(duration),
                          notes: activeAppointment.notes || '',
                          professionalId: activeAppointment.professionalId,
                          resourceId: activeAppointment.resources?.find((r) => r.resource.type === 'ROOM')?.resource.id || '',
                        });
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
                          {activeAppointment.notes?.includes('|') ? activeAppointment.notes.split('|')[0] : 'Consulta Clínica'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Profissional & Local */}
                  {editingField === 'profRoom' ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                      <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Profissional e Local</p>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[8px] text-white/50 mb-1">Profissional</label>
                          <select
                            value={drawerEditData.professionalId}
                            onChange={(e) => setDrawerEditData(prev => ({ ...prev, professionalId: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                          >
                            {professionals.map((prof) => (
                              <option key={prof.id} value={prof.id}>{prof.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] text-white/50 mb-1">Sala / Recurso</label>
                          <select
                            value={drawerEditData.resourceId}
                            onChange={(e) => setDrawerEditData(prev => ({ ...prev, resourceId: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary"
                          >
                            <option value="">Nenhuma Sala</option>
                            {resources.filter(r => r.type === 'ROOM').map((room) => (
                              <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
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
                          onClick={() => handleDrawerSave('profRoom')}
                          className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        const start = new Date(activeAppointment.startTime);
                        const end = new Date(activeAppointment.endTime);
                        const duration = (end.getTime() - start.getTime()) / 60000;
                        setDrawerEditData({
                          date: start.toISOString().split('T')[0],
                          startTime: start.toTimeString().split(' ')[0].substring(0, 5),
                          durationMinutes: String(duration),
                          notes: activeAppointment.notes || '',
                          professionalId: activeAppointment.professionalId,
                          resourceId: activeAppointment.resources?.find((r) => r.resource.type === 'ROOM')?.resource.id || '',
                        });
                        setEditingField('profRoom');
                      }}
                      className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                    >
                      <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">person</span>
                      <div className="flex-grow">
                        <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                          Profissional &amp; Local
                          <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                        </p>
                        <p className="font-bold text-sm text-white">
                          {activeAppointment.professional.name}
                          <br />
                          <span className="text-xs font-medium text-white/70">
                            {activeAppointment.resources?.find((r) => r.resource.type === 'ROOM')?.resource.name || 'Sala 1'}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Anotação */}
                  {editingField === 'annotation' ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                      <p className="text-[10px] font-bold text-primary-fixed-dim uppercase">Editar Anotação</p>
                      <textarea
                        ref={annotationInputRef}
                        value={drawerEditData.notes}
                        onChange={(e) => setDrawerEditData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-neutral-900 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-primary h-20 resize-none"
                        placeholder="Adicione observações da consulta..."
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
                          onClick={() => handleDrawerSave('annotation')}
                          className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    annotationText && (
                      <div 
                        onClick={() => {
                          const start = new Date(activeAppointment.startTime);
                          const end = new Date(activeAppointment.endTime);
                          const duration = (end.getTime() - start.getTime()) / 60000;
                          setDrawerEditData({
                            date: start.toISOString().split('T')[0],
                            startTime: start.toTimeString().split(' ')[0].substring(0, 5),
                            durationMinutes: String(duration),
                            notes: annotationText,
                            professionalId: activeAppointment.professionalId,
                            resourceId: activeAppointment.resources?.find((r) => r.resource.type === 'ROOM')?.resource.id || '',
                          });
                          setEditingField('annotation');
                        }}
                        className="flex items-start gap-3 cursor-pointer hover:bg-white/5 hover:ring-1 hover:ring-white/20 rounded-lg p-2 -mx-2 transition-all group/item"
                      >
                        <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">description</span>
                        <div className="flex-grow">
                          <p className="text-xs font-semibold text-white/60 flex justify-between items-center mb-0.5">
                            Anotação
                            <span className="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100 transition-opacity">edit</span>
                          </p>
                          <p className="text-sm font-semibold text-white break-words">
                            {annotationText}
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {/* Status */}
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-white/50 text-lg mt-0.5">check_circle</span>
                    <div>
                      <p className="text-xs font-semibold text-white/60 mb-0.5">Status</p>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/20 text-primary-fixed-dim text-xs font-bold uppercase mt-1">
                        {activeAppointment.status === 'CONFIRMED' ? 'Confirmado' : activeAppointment.status === 'PENDING' ? 'Pendente' : activeAppointment.status === 'COMPLETED' ? 'Em Atendimento' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-0.5">Histórico Financeiro</p>
                    <p className="text-white font-bold">Sem pendências</p>
                  </div>
                  <span className="material-symbols-outlined text-green-400 text-lg">check_circle</span>
                </div>
              </div>
            </div>

            {/* Right Main Panel */}
            <div className="flex-1 flex flex-col bg-surface-bright relative">
              {/* Quick actions top bar */}
              <div className="bg-white border-b border-outline-variant/30 p-4 px-6 shadow-sm z-10 select-none">
                <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Ações Rápidas</h3>
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Row 1 */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'CONFIRMED')}
                    className="w-full justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">how_to_reg</span>
                    Check-in (Chegou)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEdit(activeAppointment);
                      setActiveAppointment(null);
                    }}
                    className="w-full justify-center px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container rounded-lg transition-colors border border-outline-variant/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">edit_calendar</span>
                    Reagendar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeAppointment.id, 'CANCELLED')}
                    className="w-full justify-center px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">event_busy</span>
                    Cancelar (No-show)
                  </button>

                  {/* Row 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      const start = new Date(activeAppointment.startTime);
                      const end = new Date(activeAppointment.endTime);
                      const duration = (end.getTime() - start.getTime()) / 60000;
                      setDrawerEditData({
                        date: start.toISOString().split('T')[0],
                        startTime: start.toTimeString().split(' ')[0].substring(0, 5),
                        durationMinutes: String(duration),
                        notes: annotationText,
                        professionalId: activeAppointment.professionalId,
                        resourceId: activeAppointment.resources?.find((r) => r.resource.type === 'ROOM')?.resource.id || '',
                      });
                      setEditingField('annotation');
                    }}
                    className="col-span-1 w-full justify-center px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container rounded-lg transition-colors border border-outline-variant/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">notes</span>
                    {annotationText ? 'Editar anotação' : 'Adicionar anotação'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateStatus(activeAppointment.id, 'COMPLETED');
                      alert('Atendimento iniciado! Prontuário aberto.');
                    }}
                    className="col-span-2 w-full justify-center px-4 py-2 bg-primary hover:bg-[#00458d] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base icon-fill">play_arrow</span>
                    Iniciar Atendimento
                  </button>
                </div>
              </div>

              {/* Scrollable details cards */}
              <div className="flex-grow overflow-y-auto agenda-scroll p-6 space-y-6 select-none">
                {/* AI Insight Card */}
                <div className="bg-white rounded-2xl shadow-md border border-primary/20 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined icon-fill text-xl">auto_awesome</span>
                        <h4 className="font-display font-bold text-sm text-on-surface">Inteligência FooNewOps</h4>
                      </div>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">Recomendação</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1.5">
                        <p className="font-bold text-outline uppercase text-xs">Análise de Contexto</p>
                        <p className="text-on-surface-variant leading-relaxed">
                          Paciente não comparece à clínica há 8 meses. Última interação no WhatsApp demonstrou interesse em Toxina Botulínica. Histórico clínico indica preferência por tratamentos rápidos e preventivos.
                        </p>
                      </div>
                      <div className="bg-surface-container-low p-4 rounded-xl border border-primary/10 space-y-1.5">
                        <p className="font-bold text-primary uppercase text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">lightbulb</span>
                          Ação Recomendada
                        </p>
                        <p className="text-on-surface leading-relaxed font-semibold">
                          Oferecer plano de prevenção de Harmonização Completa (Botox + Preenchedores). Probabilidade de Conversão: <span className="text-green-600 font-extrabold">Alta (85%)</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treatment History Timeline */}
                <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-6">
                  <h4 className="font-display font-bold text-sm text-on-surface flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-secondary">history</span>
                    Histórico Recente de Atendimentos
                  </h4>
                  <div className="relative border-l border-outline-variant/40 ml-3 space-y-6">
                    <div className="relative pl-6">
                      <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-primary"></span>
                      <p className="text-sm font-bold text-on-surface">Limpeza Profunda Facial</p>
                      <p className="text-xs text-outline mt-1 font-medium">15 Abr 2026 • Dra. Ana Souza</p>
                    </div>
                    <div className="relative pl-6">
                      <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-outline-variant"></span>
                      <p className="text-sm font-bold text-on-surface">Harmonização - Etapa 2</p>
                      <p className="text-xs text-outline mt-1 font-medium">10 Fev 2026 • Dra. Ana Souza</p>
                    </div>
                    <div className="relative pl-6">
                      <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-outline-variant"></span>
                      <p className="text-sm font-bold text-on-surface">Avaliação Ortodôntica</p>
                      <p className="text-xs text-outline mt-1 font-medium">12 Jan 2026 • Dr. Carlos Silva</p>
                    </div>
                  </div>
                </div>

                {/* Patient Clinical History snippet */}
                <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-6 space-y-3">
                  <h4 className="font-display font-bold text-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">description</span>
                    Anotações Clínicas Recentes
                  </h4>
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 text-sm">
                    <p className="text-outline font-bold mb-1.5 text-xs">Evolução de 10 Fev 2026 — Dra. Ana Souza</p>
                    <p className="text-on-surface leading-relaxed">
                      {activeAppointment.patient.clinicalHistory || 'Paciente relatou leve sensibilidade pós-procedimento na região frontal da face, resolvido com analgésicos comuns após 3 dias. Satisfeita com o resultado estético atual.'}
                    </p>
                  </div>
                </div>

                {/* Value Metrics LTV */}
                <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/40 p-6">
                  <h4 className="font-display font-bold text-sm text-on-surface flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-secondary">payments</span>
                    Métricas de Valor do Paciente
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                      <p className="text-xs text-outline uppercase tracking-wider font-bold mb-1">Ticket Médio</p>
                      <p className="text-lg font-extrabold text-on-surface">R$ 850,00</p>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                      <p className="text-xs text-outline uppercase tracking-wider font-bold mb-1">LTV (Life Time Value)</p>
                      <p className="text-lg font-extrabold text-primary">R$ 4.250,00</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed drawer footer actions */}
              <div className="border-t border-outline-variant/35 bg-white p-5 shrink-0 shadow-md flex gap-4 z-20">
                <button
                  type="button"
                  onClick={() => router.push(`/patients/${activeAppointment.patientId}`)}
                  className="flex-1 py-4 px-8 bg-primary hover:bg-primary/95 text-on-primary rounded-2xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">folder_open</span>
                  Abrir Prontuário Completo (PEP)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(activeAppointment.id, 'COMPLETED');
                    setActiveAppointment(null);
                  }}
                  className="py-4 px-8 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-2xl font-bold text-base transition-all border border-outline-variant/40 flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
                >
                  Finalizar Atendimento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline styling injection for prototype-faithful grids
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .grid-bg-lines {
      background-image: linear-gradient(to bottom, transparent calc(100% - 1px), rgba(193, 198, 213, 0.25) 1px);
      background-size: 100% 60px;
    }
    .hatched-bg {
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 5px,
        rgba(193, 198, 213, 0.35) 5px,
        rgba(193, 198, 213, 0.35) 10px
      );
    }
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
    /* Slide-up animation for list float actions */
    @keyframes slideUp {
      from { transform: translate(-50%, 100%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    .animate-slide-up {
      animation: slideUp 0.25s ease-out forwards;
    }
  `}} />
);
