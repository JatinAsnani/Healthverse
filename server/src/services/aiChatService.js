import logger from '../config/logger.js';

const SYSTEM_PROMPT = `You are HealthVerse AI, an intelligent, empathetic continuity-of-care medical assistant designed for patients, caregivers, community health workers (CHWs), and clinicians in rural and community settings.

SAFETY AND ETHICAL PRINCIPLES (MANDATORY):
1. You are a DECISION-SUPPORT and EARLY-WARNING assistant only. You are NOT a doctor and must never make a definitive medical diagnosis or prescribe new drug dosages.
2. If the user mentions any RED-FLAG or CRITICAL symptoms (such as severe crushing chest pain, breathlessness, coughing blood, black stools, stroke symptoms like slurred speech or facial droop, high fever >101°F with infected wound, or SpO2 < 90%):
   - Immediately and prominently instruct them to CALL 108 AMBULANCE or visit the nearest emergency hospital immediately.
   - Advise them not to wait for private transport.
3. Be clear, warm, and speak in simple language avoiding difficult medical jargon.
4. If asked in Hindi, Gujarati, or Marathi, respond fluently and naturally in that language (using Devanagari or Gujarati script).
5. You can assist with:
   - Post-discharge recovery precautions (wound care, diet, light activity)
   - Medication adherence (why not to skip maintenance medicines)
   - Explaining medical reports, vital signs (BP, SpO2, Pulse, Blood Sugar)
   - PM-JAY (Ayushman Bharat) government scheme eligibility and required documents
   - Guiding the user on how to use HealthVerse (reporting symptoms, checking medicines, consent, CHW visits)
6. Whenever you suggest an action the user can do in HealthVerse, mention it clearly (e.g., "You can report this symptom in the Symptom Report tab" or "You can check PM-JAY eligibility in the Schemes tab").`;

/**
 * Check whether a message contains critical emergency red flags
 */
export function detectEmergencyRedFlags(text = '') {
  const lower = text.toLowerCase();
  const redFlags = [
    'chest pain',
    'heart attack',
    'cannot breathe',
    'breathlessness',
    'breathing difficulty',
    'coughing blood',
    'vomiting blood',
    'black stool',
    'slurred speech',
    'facial droop',
    'sudden paralysis',
    'stroke',
    'unconscious',
    'spo2 below 90',
    'severe bleeding',
    'छाती में तेज दर्द',
    'सांस लेने में तकलीफ',
    'खून की उल्टी',
    'લકવો',
    'છાતીમાં ભીંસ',
    'શ્વાસ લેવામાં તકલીફ'
  ];

  return redFlags.some(flag => lower.includes(flag));
}

/**
 * Extract suggested actions based on context and message
 */
function extractSuggestedActions(text = '', userMessage = '') {
  const actions = [];
  const combined = (text + ' ' + userMessage).toLowerCase();

  if (combined.includes('symptom') || combined.includes('pain') || combined.includes('fever') || combined.includes('लक्षण')) {
    actions.push({ label: '📝 Report Symptoms', path: '/symptoms/report' });
  }
  if (combined.includes('pmjay') || combined.includes('ayushman') || combined.includes('scheme') || combined.includes('राशन') || combined.includes('યોજના')) {
    actions.push({ label: '📋 Check PM-JAY Eligibility', path: '/pmjay' });
  }
  if (combined.includes('education') || combined.includes('guide') || combined.includes('diet') || combined.includes('wound') || combined.includes('માર્ગદર્શન')) {
    actions.push({ label: '📚 Health Education Library', path: '/education' });
  }
  if (combined.includes('caregiver') || combined.includes('family') || combined.includes('consent') || combined.includes('સંમતિ')) {
    actions.push({ label: '🤝 Manage Caregiver Consent', path: '/consent' });
  }

  return actions;
}

/**
 * Call Google Gemini API
 */
async function callGemini(apiKey, message, history = [], context = {}) {
  // Try active Gemini models with fallbacks
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents = [];

      // Add context note if provided
      let contextNote = '';
      if (context.role) contextNote += `User Role: ${context.role}. `;
      if (context.diagnosis) contextNote += `Patient Diagnosis: ${context.diagnosis}. `;
      if (context.language) contextNote += `Preferred Language: ${context.language}. `;

      const effectiveSystemPrompt = contextNote
        ? `${SYSTEM_PROMPT}\n\nCurrent Session Context: ${contextNote}`
        : SYSTEM_PROMPT;

      // Map chat history to Gemini structure
      for (const h of history.slice(-8)) {
        contents.push({
          role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.content || '' }]
        });
      }

      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const body = {
        contents,
        systemInstruction: {
          parts: [{ text: effectiveSystemPrompt }]
        },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 900
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        throw new Error('Gemini returned an empty response.');
      }

      return reply;
    } catch (err) {
      lastError = err;
      logger.warn(`Gemini model ${model} failed, trying next fallback: ${err.message}`);
    }
  }

  throw lastError || new Error('All Gemini models failed.');
}

/**
 * Call OpenAI-compatible API
 */
async function callOpenAI(apiKey, message, history = [], context = {}, baseUrl = 'https://api.openai.com/v1') {
  const url = `${baseUrl}/chat/completions`;

  let contextNote = '';
  if (context.role) contextNote += `User Role: ${context.role}. `;
  if (context.diagnosis) contextNote += `Patient Diagnosis: ${context.diagnosis}. `;
  if (context.language) contextNote += `Preferred Language: ${context.language}. `;

  const effectiveSystemPrompt = contextNote
    ? `${SYSTEM_PROMPT}\n\nCurrent Session Context: ${contextNote}`
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: effectiveSystemPrompt }
  ];

  for (const h of history.slice(-8)) {
    messages.push({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.content || ''
    });
  }

  messages.push({ role: 'user', content: message });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 900
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

/**
 * Intelligent Rule-Based Fallback Assistant
 * Responds accurately when no external API key is provided
 */
function getRuleBasedResponse(message = '', context = {}) {
  const lower = message.toLowerCase().trim();

  if (detectEmergencyRedFlags(lower)) {
    return `🚨 **CRITICAL MEDICAL EMERGENCY ALERT**

Your symptoms indicate a potentially serious medical emergency that requires immediate clinical care:
- **Call 108 Ambulance right now** (Toll-Free).
- Do not attempt to drive yourself.
- Keep emergency contact numbers and hospital discharge summary accessible.
- If having chest pain, rest in a comfortable seated position with support behind your back.

*HealthVerse AI is an early-warning decision aid and does not replace emergency medical services.*`;
  }

  if (lower.includes('pmjay') || lower.includes('pm-jay') || lower.includes('ayushman') || lower.includes('scheme') || lower.includes('ration') || lower.includes('योजना')) {
    return `📋 **Ayushman Bharat PM-JAY Scheme Guidance**

**Coverage:** Up to ₹5,00,000 per family per year for secondary and tertiary hospitalization across all empanelled public and private hospitals.

**Key Documents Required:**
1. Aadhaar Card (or Government photo ID)
2. Ration Card (BPL / Antyodaya AAY / NFSA) or SECC letter
3. Active mobile phone for OTP verification

**How to verify:**
You can complete the self-assessment right here in HealthVerse by going to the **PM-JAY Assistance** tab. Our Ayushman Mitra / Scheme Officer will review your eligibility.`;
  }

  if (lower.includes('wound') || lower.includes('stitch') || lower.includes('bandage') || lower.includes('घाव') || lower.includes('ટાંકા')) {
    return `🩹 **Post-Surgical Wound Care Essentials**

1. **Keep it Dry & Clean:** Do not soak the surgical site in baths or buckets. Follow dressing change schedules given at discharge.
2. **Never Apply Home Powders:** Avoid applying turmeric, powders, or non-prescribed herbal pastes to open incisions.
3. **Wash Hands First:** Always wash hands with soap and water before touching dressings.
4. **Watch for Red Flags:** Increased redness spreading outwards, foul-smelling yellow/green discharge, fever >= 101°F, or opening of sutures.

If any red flags appear, record them in the **Symptom Report** tab and contact your doctor immediately.`;
  }

  if (lower.includes('medicine') || lower.includes('medication') || lower.includes('dose') || lower.includes('pill') || lower.includes('दवा') || lower.includes('દવા')) {
    return `💊 **Medication Safety & Adherence**

- **Never Skip Maintenance Medicines:** For heart conditions, diabetes, and blood pressure, stopping medications because you "feel fine" is the leading cause of emergency readmission.
- **Missed a dose?** Take it as soon as remembered unless it is almost time for the next dose. Never double the dose.
- **Log Your Adherence:** Mark your taken doses on the HealthVerse home screen to keep your care team informed.`;
  }

  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('namaste') || lower.includes('kem cho')) {
    return `👋 **Namaste! I am your HealthVerse AI Health Assistant.**

I can help you with:
- Explaining your discharge instructions and medication schedules
- Answering questions about post-surgical recovery, wound care, and diet
- Checking eligibility and documents for PM-JAY (Ayushman Bharat)
- Symptom triage and warning sign awareness
- Guiding you through HealthVerse features

How can I help you today?`;
  }

  return `I understand your query: "${message}".

Here is guidance from HealthVerse clinical continuity protocols:
- Ensure you monitor your vital signs (BP, pulse, oxygen) and take prescribed medications as directed.
- If you are experiencing uncomfortable symptoms, click **Report Symptoms** below so your hospital doctor and nurse can review your case.
- For emergency symptoms (chest tightness, severe breathing difficulty, sudden weakness), call **108** immediately.`;
}

/**
 * Main AI Chat Processor
 */
export async function processAIChat({
  message,
  history = [],
  apiKey,
  provider = 'gemini',
  context = {}
}) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required.');
  }

  const isEmergency = detectEmergencyRedFlags(message);

  // Determine effective API key
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

  let reply = '';
  let usedProvider = 'fallback';

  if (effectiveKey) {
    try {
      // If the key starts with AIza or AQ, or provider is gemini, treat as Gemini
      const isGeminiKey = effectiveKey.startsWith('AIza') || effectiveKey.startsWith('AQ.') || provider === 'gemini';

      if (isGeminiKey) {
        reply = await callGemini(effectiveKey, message, history, context);
        usedProvider = 'gemini';
      } else {
        reply = await callOpenAI(effectiveKey, message, history, context);
        usedProvider = 'openai';
      }
    } catch (err) {
      logger.error('Error invoking external AI model:', err.message);
      // Fallback gracefully so the user always receives a safe, helpful response
      const fallbackReply = getRuleBasedResponse(message, context);
      reply = `${fallbackReply}\n\n*(Note: External AI API returned an error: "${err.message}". Falling back to verified clinical continuity rules.)*`;
      usedProvider = 'fallback';
    }
  } else {
    // No API key provided, use clinical rule-based engine
    reply = getRuleBasedResponse(message, context);
    usedProvider = 'fallback';
  }

  const suggestedActions = extractSuggestedActions(reply, message);

  return {
    reply,
    suggestedActions,
    emergencyDetected: isEmergency,
    provider: usedProvider,
    timestamp: new Date().toISOString()
  };
}
