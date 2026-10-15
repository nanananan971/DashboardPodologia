// src/lib/pdfFicha.js

export function imprimirFichaPaciente(paciente, notes, profile, notasPersonalizadas = '') {
  // Creamos una ventana emergente limpia para imprimir o guardar como PDF
  const ventana = window.open('', '_blank');
  
  if (!ventana) {
    alert('Por favor, permite las ventanas emergentes (pop-ups) para generar el PDF.');
    return;
  }

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ficha Clínica - ${paciente.full_name}</title>
      <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; padding: 30px; font-size: 13px; line-height: 1.5; }
        .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: start; }
        .clinic-name { font-size: 18px; font-weight: bold; color: #0284c7; }
        .doc-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #334155; margin-top: 5px; }
        .section { margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
        .section-title { font-size: 14px; font-weight: bold; color: #0369a1; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .field { margin-bottom: 6px; }
        .label { font-weight: bold; color: #475569; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f1f5f9; color: #334155; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; pt: 10px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="clinic-name">${profile?.clinic_name || 'Clínica Podológica'}</div>
          <div class="doc-title">Ficha Clínica y Registro de Atenciones</div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Fecha de emisión: ${fechaActual}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos del Paciente</div>
        <div class="grid">
          <div class="field"><span class="label">Nombre completo:</span> ${paciente.full_name}</div>
          <div class="field"><span class="label">RUN:</span> ${paciente.rut || 'No registrado'}</div>
          <div class="field"><span class="label">Teléfono:</span> ${paciente.phone || 'No registrado'}</div>
          <div class="field"><span class="label">Correo:</span> ${paciente.email || 'No registrado'}</div>
        </div>
        ${paciente.allergies ? `<div class="field" style="margin-top: 8px; color: #b91c1c;"><span class="label">Alergias:</span> ${paciente.allergies}</div>` : ''}
        ${paciente.medical_history ? `<div class="field" style="margin-top: 4px;"><span class="label">Antecedentes médicos:</span> ${paciente.medical_history}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Patologías y Observaciones Clínicas</div>
        <p><strong>Patologías marcadas:</strong> ${Array.isArray(paciente.conditions) && paciente.conditions.length > 0 ? paciente.conditions.join(', ') : 'Ninguna registrada'}</p>
        ${paciente.conditions_notes ? `<p style="margin-top: 6px;"><strong>Detalle:</strong> ${paciente.conditions_notes}</p>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Recomendaciones y Tratamientos Indicados</div>
        <p><strong>Tratamientos de base:</strong> ${Array.isArray(paciente.treatment_recommendations) && paciente.treatment_recommendations.length > 0 ? paciente.treatment_recommendations.join(', ') : 'Ninguno registrado'}</p>
        ${paciente.treatment_notes ? `<p style="margin-top: 6px;"><strong>Indicaciones:</strong> ${paciente.treatment_notes}</p>` : ''}
      </div>

      ${notasPersonalizadas ? `
        <div class="section">
          <div class="section-title">Observaciones Adicionales / Nota del Profesional</div>
          <p style="white-space: pre-wrap;">${notasPersonalizadas}</p>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Registro Cronológico de Sesiones (${notes.length} atenciones)</div>
        ${notes.length === 0 ? '<p>No hay sesiones registradas.</p>': `
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Fecha / Sesión</th>
                <th style="width: 75%;">Evolución y Procedimiento</th>
              </tr>
            </thead>
            <tbody>
              ${notes.map(n => `
                <tr>
                  <td><strong>Sesión #${n.session_number || '-'}</strong><br><span style="font-size: 11px; color: #64748b;">${new Date(n.created_at).toLocaleDateString('es-CL')}</span></td>
                  <td>${n.notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <div class="footer">
        <p>Documento generado desde el sistema clínico podológico · Profesional: ${profile?.full_name || 'Especialista'}</p>
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  ventana.document.write(htmlContent);
  ventana.document.close();
}