// src/components/Login.jsx

import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMensaje('')

    const identifier = email.trim().toLowerCase()

    try {
      // 1. Intentar autenticación con Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      })

      const isSuccess = !authError

      // 2. Reportar el resultado al backend (registra fallos o limpia si fue exitoso)
      const { data: backendRes, error: rpcError } = await supabase.rpc('attempt_login', {
        p_identifier: identifier,
        p_is_success: isSuccess
      })

      if (rpcError) {
        console.error('Error en RPC de seguridad:', rpcError)
      }

      if (!isSuccess) {
        // Mostrar el mensaje exacto controlado por el backend (ej. intento 2/5, cuenta bloqueada, etc.)
        setMensaje(backendRes?.message || 'Error en las credenciales.')
      }
    } catch (err) {
      setMensaje('Ocurrió un error inesperado al procesar el acceso.')
      console.error(err)
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-[380px] animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-2.5 w-2.5 rounded-full bg-sky-600" />
          <h2 className="text-xl font-semibold text-slate-900">Acceso Profesionales</h2>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-slate-700">Correo:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-600 focus:bg-white"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-xs font-medium text-slate-700">Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-sky-600 focus:bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-sky-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Entrando...' : 'Iniciar Sesión'}
        </button>

        {mensaje && <p className="mt-4 animate-fade-in text-center text-xs text-red-600">{mensaje}</p>}
      </form>
    </div>
  )
}