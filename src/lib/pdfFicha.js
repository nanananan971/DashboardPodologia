// src/lib/pdfFicha.js
//
// Utilidad liviana para generar una ficha clínica imprimible/descargable
// en PDF. No usa ninguna librería externa: abre una ventana nueva con un
// documento HTML minimalista (sin logos ni marcas de agua) y dispara
// window.print(), para que el usuario elija "Guardar como PDF" desde el
// diálogo de impresión del navegador.

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

const formatFecha = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// paciente: fila de la tabla `patients` (full_name, rut, phone, email,
//   medical_history, allergies, conditions_notes, treatment_notes...)
// notes: filas de `clinical_notes` (registro cronológico) del paciente
// profile: perfil del profesional activo (clinic_name, full_name)
export function imprimirFichaPaciente(paciente, notes = [], profile = {}) {
  if (!paciente) return

  const clinica = escapeHtml(profile?.clinic_name || 'Clínica')
  const profesional = escapeHtml(profile?.full_name || 'Profesional a cargo')
  const fechaGeneracion = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const notasHtml = notes.length
    ? notes
        .map(
          (n) => `
        <div class="nota">
          <p class="nota-fecha">${n.session_number ? `Sesión #${n.session_number} · ` : ''}${formatFecha(n.created_at)}</p>
          <p class="nota-texto">${escapeHtml(n.notes)}</p>
        </div>`
        )
        .join('')
    : '<p class="vacio">Sin entradas registradas.</p>'

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Ficha Clínica - ${escapeHtml(paciente.full_name)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1e293b;
            padding: 32px;
            max-width: 720px;
            margin: 0 auto;
          }
          header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
          header h1 { font-size: 18px; margin: 0 0 4px; color: #0f172a; }
          header p { font-size: 12px; margin: 0; color: #64748b; }
          h2 { font-size: 14px; margin: 20px 0 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .datos { font-size: 12px; line-height: 1.6; }
          .datos strong { color: #334155; }
          .nota { border-bottom: 1px solid #f1f5f9; padding: 8px 0; }
          .nota-fecha { font-size: 11px; color: #64748b; margin: 0 0 2px; }
          .nota-texto { font-size: 12px; margin: 0; white-space: pre-wrap; }
          .vacio { font-size: 12px; color: #94a3b8; }
          footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <header>
          <h1>${clinica}</h1>
          <p>Profesional: ${profesional}</p>
          <p>Ficha clínica generada el ${fechaGeneracion}</p>
        </header>

        <h2>Datos del paciente</h2>
        <div class="datos">
          <p><strong>Nombre:</strong> ${escapeHtml(paciente.full_name || 'No especificado')}</p>
          <p><strong>RUN:</strong> ${escapeHtml(paciente.rut || 'No especificado')}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(paciente.phone || 'No especificado')}</p>
          <p><strong>Correo:</strong> ${escapeHtml(paciente.email || 'No especificado')}</p>
          ${paciente.allergies ? `<p><strong>Alergias:</strong> ${escapeHtml(paciente.allergies)}</p>` : ''}
          ${paciente.medical_history ? `<p><strong>Antecedentes:</strong> ${escapeHtml(paciente.medical_history)}</p>` : ''}
        </div>

        ${paciente.conditions_notes ? `<h2>Patologías / Observaciones</h2><p class="datos">${escapeHtml(paciente.conditions_notes)}</p>` : ''}
        ${paciente.treatment_notes ? `<h2>Indicaciones de tratamiento</h2><p class="datos">${escapeHtml(paciente.treatment_notes)}</p>` : ''}

        <h2>Registro cronológico</h2>
        ${notasHtml}

        <footer>Documento generado automáticamente. Uso clínico interno.</footer>
      </body>
    </html>
  `

  const ventana = window.open('', '_blank', 'width=800,height=900')
  if (!ventana) {
    alert('El navegador bloqueó la ventana emergente. Habilita las ventanas emergentes para descargar la ficha.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => ventana.print(), 300)
}
