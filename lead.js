// ============================================================
//  api/lead.js  —  Vercel Serverless Function
//  Recibe los leads del autodiagnóstico y del checklist.
//  Ruta pública: POST /api/lead
// ============================================================
//
//  Requiere estas variables de entorno en Vercel:
//    RESEND_API_KEY     -> tu API key de https://resend.com
//    OWNER_EMAIL        -> el email donde querés RECIBIR los leads
//    FROM_EMAIL         -> remitente verificado en Resend (ej: leads@tudominio.com)
//
//  (Opcional) Para guardar también en Airtable:
//    AIRTABLE_TOKEN     -> Personal Access Token de https://airtable.com/create/tokens
//    AIRTABLE_BASE_ID   -> el ID de tu base (empieza con "app...")
//    AIRTABLE_TABLE     -> nombre de la tabla (ej: "Leads"). Si no se define, usa "Leads".
//
//  Instalá la dependencia:  npm install resend
//  (Airtable NO necesita librería: se usa fetch directo.)
// ------------------------------------------------------------

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// --- Guardar un lead como fila en Airtable -------------------
async function saveToAirtable({ name, email, source, result, answers }) {
  // Si no están las variables, salteamos Airtable sin romper nada.
  if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE_ID) return;

  const table = process.env.AIRTABLE_TABLE || 'Leads';
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // typecast permite que Airtable cree opciones nuevas en campos de tipo "select"
      typecast: true,
      fields: {
        Nombre: name,
        Email: email,
        Fuente: source,
        Resultado: result ?? '',
        Respuestas: answers ? JSON.stringify(answers) : '',
        Fecha: new Date().toISOString(),
      },
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Airtable ${resp.status}: ${detail}`);
  }
}

export default async function handler(req, res) {
  // Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // El body puede venir como objeto (Vercel lo parsea solo) o como string
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { name, email, source = 'autodiagnostico', result = null, answers = null } = body;

  // Validación mínima en el servidor (nunca confíes solo en el front)
  if (!name || name.trim().length < 2 || !EMAIL_RE.test(email || '')) {
    return res.status(400).json({ error: 'Nombre o email inválido' });
  }

  try {
    // 1) Avisarte a VOS que entró un lead nuevo
    await resend.emails.send({
      from: `Blue Phoenix Lab <${process.env.FROM_EMAIL}>`,
      to: process.env.OWNER_EMAIL,
      subject: `🔥 Nuevo lead: ${name} — ${source}`,
      text:
        `Nombre:    ${name}\n` +
        `Email:     ${email}\n` +
        `Fuente:    ${source}\n` +
        `Resultado: ${result ?? '—'}\n` +
        (answers ? `Respuestas: ${JSON.stringify(answers)}\n` : ''),
    });

    // 2) Guardar el lead en Airtable (si están las variables configuradas)
    await saveToAirtable({ name, email, source, result, answers });

    // 3) (Opcional) Mandarle al lead un email de confirmación / el checklist
    //    Descomentá cuando tengas el copy y/o el PDF listos.
    // await resend.emails.send({
    //   from: `Blue Phoenix Lab <${process.env.FROM_EMAIL}>`,
    //   to: email,
    //   subject: 'Tu resultado del autodiagnóstico de IA',
    //   html: `<p>Hola ${name}, gracias por completar el autodiagnóstico...</p>`,
    // });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error guardando lead:', err);
    return res.status(500).json({ error: 'No se pudo procesar el lead' });
  }
}
