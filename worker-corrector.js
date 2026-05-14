// Cloudflare Worker: gspn-corrector
// Proxy entre la app GSPN y la API de Anthropic para corrección de texto por voz
// Deploy en: https://dash.cloudflare.com -> Workers -> Create Worker
// Variable de entorno: ANTHROPIC_API_KEY = tu API key de Anthropic

export default {
  async fetch(request, env) {
    // CORS headers para permitir llamadas desde GitHub Pages
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://racosta123.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const rawText = body?.text || '';

      if (!rawText.trim()) {
        return new Response(JSON.stringify({ corrected: '' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Llamada a la API de Anthropic
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: 'Eres un asistente de redacción para guardias de seguridad en México. Tu única tarea es corregir el texto dictado por voz: ortografía perfecta, mayúsculas al inicio de oraciones y nombres propios, puntuación correcta, sintaxis natural en español mexicano. Conserva todos los datos técnicos (números, placas, sellos, candados) exactamente como están. No agregues nada, no cambies el significado, no pongas comillas ni explicaciones. Devuelve únicamente el texto corregido.',
          messages: [{
            role: 'user',
            content: 'Corrige este texto dictado por voz por un guardia de seguridad: ' + rawText
          }]
        })
      });

      const data = await response.json();
      const corrected = data?.content?.[0]?.text?.trim() || rawText;

      return new Response(JSON.stringify({ corrected }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (e) {
      return new Response(JSON.stringify({ corrected: null, error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
