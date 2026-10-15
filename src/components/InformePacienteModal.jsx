// src/components/InformePacienteModal.jsx

import React, { useState } from 'react';
import { getTreatmentLabel } from '../lib/treatments';

export default function InformePacienteModal({ paciente, profile, onClose }) {
  const [tituloInforme, setTituloInforme] = useState('Informe de Atención y Recomendaciones Podológicas');
  const [mensajePaciente, setMensajePaciente] = useState(
    'Se hace entrega al paciente del presente informe sobre la atención podológica realizada, detallando los procedimientos efectuados y las recomendaciones para el cuidado domiciliario.'
  );
  const [indicacionesCasa, setIndicacionesCasa] = useState(
    paciente?.treatment_notes || 'Mantener una correcta higiene y secado interdigital diario. Aplicar crema hidratante recomendada.'
  );
  const [proximaCitaSugerida, setProximaCitaSugerida] = useState('En 4 semanas');

  const handleGenerarPDF = () => {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('Por favor, permite las ventanas emergentes para generar el PDF.');
      return;
    }

    const fechaActual = new Date().toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const tratamientosLimpios = Array.isArray(paciente.treatment_recommendations)
      ? paciente.treatment_recommendations.map(getTreatmentLabel)
      : [];

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Informe para Paciente - ${paciente.full_name}</title>
        <style>
          @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; font-size: 13px; line-height: 1.6; background: #ffffff; }
          .header { border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .clinic-name { font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.3px; }
          .clinic-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .doc-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-top: 6px; }
          .date-badge { font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .card { margin-bottom: 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
          .card-title { font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .field { font-size: 12px; color: #334155; }
          .label { font-weight: 700; color: #64748b; }
          .treatment-list { list-style: none; padding: 0; margin: 4px 0 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
          .treatment-item { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
          .next-visit { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 12px 18px; margin-top: 18px; }
          .next-visit-title { font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 2px; }
          .next-visit-text { font-size: 13px; font-weight: 800; color: #0c4a6e; }
          .footer { margin-top: 45px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; border-top: 1px solid #f1f5f9; }
          .footer-note { font-size: 10px; color: #94a3b8; max-width: 280px; }
          .firma-box { text-align: center; width: 220px; border-top: 1.5px solid #334155; padding-top: 6px; font-size: 11px; }
          .firma-nombre { font-weight: 800; color: #0f172a; }
          .firma-cargo { font-size: 10px; color: #64748b; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-name">${profile?.clinic_name || 'Clínica Podológica'}</div>
            <div class="clinic-sub">Atención & Salud Podológica Especializada</div>
            <div class="doc-title">${tituloInforme}</div>
          </div>
          <div class="date-badge">Fecha: ${fechaActual}</div>
        </div>

        <div class="card">
          <div class="card-title">1. Datos del Paciente</div>
          <div class="grid">
            <div class="field"><span class="label">Nombre:</span> <strong>${paciente.full_name}</strong></div>
            <div class="field"><span class="label">RUN:</span> ${paciente.rut || 'No especificado'}</div>
            <div class="field"><span class="label">Teléfono:</span> ${paciente.phone || 'No especificado'}</div>
            <div class="field"><span class="label">Correo:</span> ${paciente.email || 'No especificado'}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">2. Resumen de la Atención Podológica</div>
          <p style="margin: 0; white-space: pre-wrap; color: #334155;">${mensajePaciente}</p>
        </div>

        <div class="card">
          <div class="card-title">3. Indicaciones y Cuidados en el Hogar</div>
          <p style="margin: 0; white-space: pre-wrap; color: #334155;">${indicacionesCasa}</p>
        </div>

        ${tratamientosLimpios.length > 0 ? `
          <div class="card">
            <div class="card-title">4. Tratamientos / Productos Indicados en Consulta</div>
            <ul class="treatment-list">
              ${tratamientosLimpios.map(t => `<li class="treatment-item">✔ ${t}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="next-visit">
          <div class="next-visit-title">🗓️ Próxima Visita Sugerida</div>
          <div class="next-visit-text">${proximaCitaSugerida}</div>
        </div>

        <div class="footer">
          <div class="footer-note">
            Este documento es un comprobante de atención e indicaciones de cuidado personal emitido por su profesional tratante.
          </div>
          <div class="firma-box">
            <div class="firma-nombre">${profile?.full_name || 'Especialista Podólogo'}</div>
            <div class="firma-cargo">Podólogo/a Clínico/a Registrado/a</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    ventana.document.write(htmlContent);
    ventana.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-3 sm:pt-6 bg-black/50 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">📄 Generar Informe para el Paciente</h3>
          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer p-1">✕ Cerrar</button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-700">Título del Documento</label>
            <input
              type="text"
              value={tituloInforme}
              onChange={(e) => setTituloInforme(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">Descripción / Mensaje General</label>
            <textarea
              value={mensajePaciente}
              onChange={(e) => setMensajePaciente(e.target.value)}
              rows="3"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-semibold text-slate-800 outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">Instrucciones y Cuidados para el Hogar</label>
            <textarea
              value={indicacionesCasa}
              onChange={(e) => setIndicacionesCasa(e.target.value)}
              rows="3"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-semibold text-slate-800 outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">Próxima Visita Sugerida</label>
            <input
              type="text"
              value={proximaCitaSugerida}
              onChange={(e) => setProximaCitaSugerida(e.target.value)}
              placeholder="Ej. En 4 semanas, Control en 1 mes..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 font-semibold text-slate-800 outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-wrap">
          <button onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-300 transition">Cancelar</button>
          <button
            onClick={handleGenerarPDF}
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition cursor-pointer"
          >
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
}