// src/components/Profesionales.jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const PLAN_LABELS = {
  esencial: 'Esencial (1 profesional)',
  equipo: 'Equipo (hasta 3 profesionales)',
  clinico: 'Clínico (3 a 5 profesionales)',
}

export default function Profesionales({ profile }) {
  const [equipo, setEquipo] = useState([])
  const [invites, setInvites] = useState([])
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esError, setEsError] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')

  const esOwner = profile?.role === 'owner' || !profile?.account_id

  const cargarTodo = useCallback(async () => {
    setLoading(true)

    try {
      // Si no hay account_id, cargamos al menos el perfil actual para evitar bloqueos
      if (!profile?.account_id) {
        setEquipo([
          {
            id: profile?.id,
            full_name: profile?.full_name || 'Sin nombre',
            role: profile?.role || 'owner',
            is_active: true,
            specialty: profile?.specialty || '',
          },
        ])
        setAccount({ plan_name: 'esencial', max_professionals: 1 })
        setLoading(false)
        return
      }

      const [{ data: equipoData, error: equipoError }, { data: accountData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, role, is_active, specialty')
          .eq('account_id', profile.account_id)
          .order('role', { ascending: true }),
        supabase
          .from('accounts')
          .select('plan_name, max_professionals')
          .eq('id', profile.account_id)
          .maybeSingle(),
      ])

      if (equipoError) console.error('Error al cargar equipo:', equipoError.message)
      setEquipo(equipoData && equipoData.length > 0 ? equipoData : [
        {
          id: profile?.id,
          full_name: profile?.full_name || 'Sin nombre',
          role: profile?.role || 'owner',
          is_active: true,
          specialty: profile?.specialty || '',
        }
      ])
      setAccount(accountData || { plan_name: 'esencial', max_professionals: 1 })

      if (esOwner && profile?.account_id) {
        const { data: invitesData, error: invitesError } = await supabase
          .from('invites')
          .select('id, code, email, used, created_at, expires_at')
          .eq('account_id', profile.account_id)
          .eq('used', false)
          .order('created_at', { ascending: false })

        if (invitesError) console.error('Error al cargar invitaciones:', invitesError.message)
        setInvites(invitesData || [])
      }
    } catch (err) {
      console.error('Error general en Profesionales:', err)
      setEquipo([
        {
          id: profile?.id,
          full_name: profile?.full_name || 'Sin nombre',
          role: 'owner',
          is_active: true,
          specialty: profile?.specialty || '',
        },
      ])
    }

    setLoading(false)
  }, [profile?.account_id, profile?.id, profile?.full_name, profile?.role, profile?.specialty, esOwner])

  useEffect(() => {
    if (profile) {
      cargarTodo()
    }
  }, [profile, cargarTodo])

  const cuposUsados = equipo.filter((p) => p.is_active !== false).length
  const cuposTotales = account?.max_professionals ?? 1
  const sinCupo = cuposUsados >= cuposTotales

  const handleGenerarInvitacion = async () => {
    setGenerando(true)
    setMensaje('')
    setEsError(false)

    const { error } = await supabase.rpc('create_invite', { p_email: null })

    if (error) {
      setEsError(true)
      setMensaje(
        error.message?.includes('plan_limit_reached')
          ? `Ya usaste los ${cuposTotales} cupo(s) de profesionales de tu plan.`
          : 'No se pudo generar la invitación: ' + error.message
      )
    } else {
      await cargarTodo()
    }
    setGenerando(false)
  }

  const handleCopiar = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 1800)
    } catch {
      // Ignorar si el portapapeles está bloqueado
    }
  }

  const handleDesactivar = async (profesionalId) => {
    if (!window.confirm('¿Quitar a este profesional del equipo? Ya no podrá acceder, pero sus pacientes y citas se conservan.')) return

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', profesionalId)

    if (error) {
      alert('Error al desactivar: ' + error.message)
    } else {
      cargarTodo()
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-16 w-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Plan actual</p>
          <p className="text-sm font-semibold text-slate-800">{PLAN_LABELS[account?.plan_name] || account?.plan_name || 'Esencial'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Profesionales</p>
          <p className={`text-sm font-semibold ${sinCupo ? 'text-amber-600' : 'text-slate-800'}`}>
            {cuposUsados} / {cuposTotales}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {equipo.map((p) => (
          <div
            key={p.id || 'current'}
            className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 transition-colors ${
              p.is_active !== false ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {p.full_name || 'Sin nombre'}
                {p.id === profile?.id && <span className="ml-2 text-xs font-normal text-slate-400">(tú)</span>}
              </p>
              <p className="text-xs text-slate-500">
                {p.role === 'owner' ? 'Dueño de la cuenta' : 'Profesional'}
                {p.specialty ? ` · ${p.specialty}` : ''}
                {p.is_active === false ? ' · Inactivo' : ''}
              </p>
            </div>
            {esOwner && p.role !== 'owner' && p.is_active !== false && (
              <button
                onClick={() => handleDesactivar(p.id)}
                className="shrink-0 text-xs font-medium text-red-500 transition-colors hover:text-red-700 cursor-pointer"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
      </div>

      {esOwner && profile?.account_id && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h5 className="text-sm font-semibold text-slate-700">Invitar profesional</h5>
            <button
              onClick={handleGenerarInvitacion}
              disabled={generando || sinCupo}
              className="rounded-md bg-sky-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {generando ? 'Generando...' : '+ Generar código'}
            </button>
          </div>

          {sinCupo && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Ya usaste todos los cupos de tu plan ({cuposTotales}).
            </p>
          )}

          {invites.length === 0 ? (
            <p className="text-xs text-slate-400">No tienes invitaciones pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-800">{inv.code}</p>
                    <p className="text-[11px] text-slate-400">Expira {new Date(inv.expires_at).toLocaleDateString('es-CL')}</p>
                  </div>
                  <button
                    onClick={() => handleCopiar(inv.code)}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
                  >
                    {copiedCode === inv.code ? '¡Copiado!' : 'Copiar código'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mensaje && (
        <p className={`animate-fade-in rounded-md px-3 py-2 text-xs font-medium ${esError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {mensaje}
        </p>
      )}
    </div>
  )
}