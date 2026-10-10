// src/components/Perfil.jsx
//
// Conectada a la tabla `profiles` (ver supabase/schema_setup.sql) para
// que puedas editar tus datos profesionales reales, y también permite
// cambiar la contraseña de acceso usando el sistema de autenticación de
// Supabase. Al guardar, avisa a App.jsx (onProfileSaved) para refrescar
// el nombre que se muestra en el header y en el panel de Profesionales.

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Perfil({ session, onProfileSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    full_name: '',
    specialty: '',
    phone: '',
    clinic_name: '',
  })

  const [passwords, setPasswords] = useState({ nueva: '', confirmar: '' })
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')

  useEffect(() => {
    if (session?.user?.id) fetchProfile()
  }, [session])

  const fetchProfile = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, specialty, phone, clinic_name')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Error al cargar perfil:', error.message)
    } else if (data) {
      setFormData({
        full_name: data.full_name || '',
        specialty: data.specialty || '',
        phone: data.phone || '',
        clinic_name: data.clinic_name || '',
      })
    }
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMensaje('')
    setErrorMsg('')

    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      ...formData,
    })

    if (error) {
      setErrorMsg('Error al guardar: ' + error.message)
    } else {
      setMensaje('Perfil actualizado con éxito.')
      onProfileSaved?.()
      setTimeout(() => setMensaje(''), 2500)
    }
    setSaving(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg('')

    if (passwords.nueva.length < 6) {
      setPasswordMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (passwords.nueva !== passwords.confirmar) {
      setPasswordMsg('Las contraseñas no coinciden.')
      return
    }

    setCambiandoPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.nueva })
    setCambiandoPassword(false)

    if (error) {
      setPasswordMsg('Error: ' + error.message)
    } else {
      setPasswordMsg('Contraseña actualizada con éxito.')
      setPasswords({ nueva: '', confirmar: '' })
      setTimeout(() => setPasswordMsg(''), 2500)
    }
  }

  const iniciales = (formData.full_name || session.user.email || '?')
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h3 className="text-lg font-semibold text-slate-800">Perfil Profesional</h3>
        <p className="text-sm text-slate-500">Estos datos son los que verán tus pacientes y los que usa la plataforma para identificarte.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xs lg:col-span-1">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-2xl font-bold text-sky-700">
            {iniciales}
          </div>
          <p className="mt-3 truncate text-sm font-medium text-slate-800">{formData.full_name || 'Sin nombre configurado'}</p>
          <p className="truncate text-xs text-slate-500">{session.user.email}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 lg:col-span-2">
          <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Nombre completo</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Ej. Dra. Camila Rojas"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Especialidad</label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="Ej. Podología clínica"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Teléfono de contacto</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+56912345678"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Nombre de la clínica / consulta</label>
              <input
                type="text"
                name="clinic_name"
                value={formData.clinic_name}
                onChange={handleChange}
                placeholder="Ej. Centro Podológico Ñuñoa"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-60 cursor-pointer"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              {mensaje && <p className="animate-fade-in text-xs font-medium text-emerald-600">{mensaje}</p>}
              {errorMsg && <p className="animate-fade-in text-xs font-medium text-red-600">{errorMsg}</p>}
            </div>
          </form>
        </div>
      </div>

      {/* Cambio de contraseña */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <h4 className="mb-1 text-base font-medium text-slate-800">Seguridad</h4>
        <p className="mb-4 text-xs text-slate-500">Cambia la contraseña con la que inicias sesión.</p>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Nueva contraseña</label>
            <input
              type="password"
              value={passwords.nueva}
              onChange={(e) => setPasswords({ ...passwords, nueva: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Confirmar contraseña</label>
            <input
              type="password"
              value={passwords.confirmar}
              onChange={(e) => setPasswords({ ...passwords, confirmar: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-sky-600 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={cambiandoPassword}
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
            >
              {cambiandoPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
            {passwordMsg && (
              <p className={`animate-fade-in text-xs font-medium ${passwordMsg.includes('éxito') ? 'text-emerald-600' : 'text-red-600'}`}>
                {passwordMsg}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
