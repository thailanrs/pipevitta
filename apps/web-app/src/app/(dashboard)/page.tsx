import { cookies } from 'next/headers';
import type { AuthUser, AuthTenant } from '@/lib/auth';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userRaw = cookieStore.get('pipevitta_user')?.value;
  const tenantRaw = cookieStore.get('pipevitta_tenant')?.value;

  let user: AuthUser | null = null;
  let tenant: AuthTenant | null = null;

  try {
    if (userRaw) user = JSON.parse(decodeURIComponent(userRaw));
  } catch {}

  try {
    if (tenantRaw) tenant = JSON.parse(decodeURIComponent(tenantRaw));
  } catch {}

  const userName = user?.name ?? 'Profissional';
  const tenantName = tenant?.name ?? 'Minha Clínica';

  // Current date formatting in Portuguese
  const today = new Date();
  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-on-surface tracking-tight">
            Olá, {userName}!
          </h1>
          <p className="text-sm text-on-surface-variant capitalize mt-1">
            {formattedDate} &bull; {tenantName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer">
            <span className="material-symbols-outlined text-lg">download</span>
            <span>Exportar Relatório</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold rounded-full shadow-md transition-all cursor-pointer">
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Today's Appointments */}
        <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Agendamentos de Hoje</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">14</span>
            <span className="text-xs text-primary font-semibold">4 pendentes</span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '70%' }} />
          </div>
          <p className="text-xs text-on-surface-variant">70% concluídos ou confirmados</p>
        </div>

        {/* Card 2: Active Patients */}
        <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pacientes Ativos</span>
            <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">group</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">1.248</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-sm">arrow_upward</span>
              4.2%
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: '85%' }} />
          </div>
          <p className="text-xs text-on-surface-variant">+52 novos pacientes este mês</p>
        </div>

        {/* Card 3: Monthly Revenue */}
        <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Faturamento Mensal</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl xl:text-3xl font-extrabold text-on-surface">R$ 45.200</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-sm">arrow_upward</span>
              12%
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: '90%' }} />
          </div>
          <p className="text-xs text-on-surface-variant">Meta mensal: R$ 50.000 (90%)</p>
        </div>

        {/* Card 4: CRM Conversion Rate */}
        <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Conversão do Funil</span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">trending_up</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">78%</span>
            <span className="text-xs text-amber-600 font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-sm">arrow_drop_up</span>
              Estável
            </span>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-600 h-full rounded-full" style={{ width: '78%' }} />
          </div>
          <p className="text-xs text-on-surface-variant">Média de mercado para saúde: 62%</p>
        </div>
      </div>

      {/* Main Content Area (Layout Split: 2/3 List, 1/3 Quick Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Appointments and Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Agenda Panel */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
              <h3 className="font-display font-bold text-lg text-on-surface">Próximos Pacientes</h3>
              <a href="/agenda" className="text-xs text-primary font-semibold hover:underline">Ver agenda completa</a>
            </div>
            
            <div className="divide-y divide-outline-variant/10">
              {/* Patient Row 1 */}
              <div className="p-4 sm:p-6 flex items-center justify-between gap-4 hover:bg-surface-container-high/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
                    MC
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Mariana Costa</h4>
                    <p className="text-xs text-on-surface-variant">Consulta de Avaliação &bull; Dr. Carlos Dentista</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                    Confirmado
                  </span>
                  <span className="text-sm font-bold text-on-surface">09:00</span>
                </div>
              </div>

              {/* Patient Row 2 */}
              <div className="p-4 sm:p-6 flex items-center justify-between gap-4 hover:bg-surface-container-high/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm">
                    RS
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Roberto Silva</h4>
                    <p className="text-xs text-on-surface-variant">Tratamento de Canal &bull; Dr. Carlos Dentista</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">
                    Pendente
                  </span>
                  <span className="text-sm font-bold text-on-surface">14:00</span>
                </div>
              </div>

              {/* Empty state simulation / more list items */}
              <div className="p-4 sm:p-6 flex items-center justify-between gap-4 hover:bg-surface-container-high/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-bold text-sm">
                    FL
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Fernanda Lima</h4>
                    <p className="text-xs text-on-surface-variant">Retorno Ortodontia &bull; Dr. Carlos Dentista</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                    Confirmado
                  </span>
                  <span className="text-sm font-bold text-on-surface">16:30</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & System Info */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="font-display font-bold text-lg text-on-surface">Ações Rápidas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center p-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all gap-2 text-center group cursor-pointer">
                <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">
                  person_add
                </span>
                <span className="text-xs font-semibold">Novo Paciente</span>
              </button>

              <button className="flex flex-col items-center justify-center p-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all gap-2 text-center group cursor-pointer">
                <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">
                  add_task
                </span>
                <span className="text-xs font-semibold">Criar Tarefa</span>
              </button>

              <button className="flex flex-col items-center justify-center p-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all gap-2 text-center group cursor-pointer">
                <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">
                  mail_outline
                </span>
                <span className="text-xs font-semibold">Disparar WhatsApp</span>
              </button>

              <button className="flex flex-col items-center justify-center p-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl transition-all gap-2 text-center group cursor-pointer">
                <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">
                  receipt_long
                </span>
                <span className="text-xs font-semibold">Emitir Recibo</span>
              </button>
            </div>
          </div>

          {/* Copiloto IA Card */}
          <div className="bg-gradient-to-br from-primary-fixed-dim/40 to-primary-container/20 border border-primary/20 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
              <h3 className="font-display font-extrabold text-base text-on-primary-container">Copiloto IA</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              &ldquo;Identifiquei que <strong>Roberto Silva</strong> possui um agendamento pendente para amanhã e ainda não confirmou via WhatsApp. Deseja que eu envie um lembrete automático?&rdquo;
            </p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-primary text-on-primary font-semibold text-xs rounded-lg hover:bg-primary-container transition-all cursor-pointer">
                Sim, enviar agora
              </button>
              <button className="px-3 py-2 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg hover:bg-outline-variant/30 transition-all cursor-pointer">
                Ignorar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
