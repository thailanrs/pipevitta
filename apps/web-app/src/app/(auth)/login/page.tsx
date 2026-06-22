'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginRequest } from '@/lib/api';
import { hashPassword, saveAuthCookies } from '@/lib/auth';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') ?? '/';

  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const pHash = await hashPassword(password);
      const data = await loginRequest({
        tenantSlug: slug.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        passwordHash: pHash,
      });

      // Save auth cookies client-side
      saveAuthCookies(data.accessToken, data.user, data.tenant);

      // Redirect user to the dashboard or previous path
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-error-container text-on-error-container text-sm px-4 py-3 rounded-lg border border-error/20 flex items-start gap-3 animate-pulse">
          <span className="material-symbols-outlined shrink-0 text-xl text-error">
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tenant Slug Input */}
        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-xs font-semibold text-on-surface-variant block">
            Subdomínio / Identificador da Clínica
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">
              business
            </span>
            <input
              id="slug"
              type="text"
              required
              placeholder="ex: clinica-sorriso"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={loading}
              className="
                w-full pl-11 pr-4 py-3
                bg-surface-container-low border border-outline-variant rounded-lg
                text-sm text-on-surface placeholder:text-outline/50
                focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary
                disabled:opacity-50 outline-none transition-all
              "
            />
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-on-surface-variant block">
            E-mail Corporativo
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">
              mail
            </span>
            <input
              id="email"
              type="email"
              required
              placeholder="ex: nome@clinica.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="
                w-full pl-11 pr-4 py-3
                bg-surface-container-low border border-outline-variant rounded-lg
                text-sm text-on-surface placeholder:text-outline/50
                focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary
                disabled:opacity-50 outline-none transition-all
              "
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="text-xs font-semibold text-on-surface-variant">
              Senha
            </label>
            <a href="#" className="text-xs text-primary hover:underline font-medium">
              Esqueceu a senha?
            </a>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-xl">
              lock
            </span>
            <input
              id="password"
              type="password"
              required
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="
                w-full pl-11 pr-4 py-3
                bg-surface-container-low border border-outline-variant rounded-lg
                text-sm text-on-surface placeholder:text-outline/50
                focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary
                disabled:opacity-50 outline-none transition-all
              "
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full py-3 px-4 mt-2
            bg-primary text-on-primary font-semibold text-sm rounded-lg shadow-md
            hover:bg-primary-container hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed transition-all
            flex items-center justify-center gap-2 cursor-pointer
          "
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <span>Entrar</span>
              <span className="material-symbols-outlined text-lg">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Left panel: Brand Identity & Positioning (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-fixed-dim via-primary to-on-primary-fixed-variant p-16 flex-col justify-between text-on-primary relative overflow-hidden select-none">
        {/* Decorative background shapes */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_45%)]" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        
        {/* Header Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-12 h-12 rounded-full bg-white text-primary flex items-center justify-center font-bold text-xl shadow-lg">
            PV
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight text-white">PipeVitta</h2>
            <p className="text-xs text-white/80">RevOps inteligente para clínicas</p>
          </div>
        </div>

        {/* Content & Tagline */}
        <div className="relative my-auto max-w-lg z-10 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-display font-extrabold leading-tight text-white tracking-tight">
            Para clínicas que colocam pessoas em primeiro lugar.
          </h1>
          <p className="text-lg text-white/90 leading-relaxed font-light">
            O PipeVitta é a plataforma all-in-one que liberta clínicas do caos operacional. Eliminamos a burocracia para que você tenha tempo de fazer o que realmente importa: ouvir, acolher e transformar vidas.
          </p>
        </div>

        {/* Footer */}
        <div className="relative text-sm text-white/60 z-10">
          &copy; {new Date().getFullYear()} PipeVitta. Todos os direitos reservados.
        </div>
      </div>

      {/* Right panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile brand header (Visible only on mobile/tablet) */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-md">
              PV
            </div>
            <div>
              <h2 className="text-xl font-display font-bold tracking-tight text-on-surface">PipeVitta</h2>
              <p className="text-[10px] text-on-surface-variant">Para clínicas que colocam pessoas em primeiro lugar</p>
            </div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-on-surface tracking-tight">
              Acessar plataforma
            </h2>
            <p className="text-sm text-on-surface-variant">
              Insira as credenciais da clínica para continuar
            </p>
          </div>

          <Suspense fallback={
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <LoginFormContent />
          </Suspense>

          {/* Additional Help/Disclaimer info */}
          <div className="text-center text-xs text-on-surface-variant/80 border-t border-outline-variant/30 pt-6">
            Não possui uma conta? <a href="https://pipevitta.com" className="text-primary hover:underline font-medium">Falar com vendas</a>
          </div>
        </div>
      </div>
    </div>
  );
}
