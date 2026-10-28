import logger from '../config/logger.js';

const SYSTEM_PROMPT = `You are HealthVerse AI, an intelligent, empathetic continuity-of-care medical assistant designed for patients, caregivers, community health workers (CHWs), and clinicians in rural and community settings.

SAFETY AND ETHICAL PRINCIPLES (MANDATORY):
1. You are a DECISION-SUPPORT and EARLY-WARNING assistant. You do not make definitive medical diagnoses or prescribe new drug dosages without clinician oversight.
2. If the user mentions any RED-FLAG or CRITICAL symptoms (such as severe crushing chest pain, breathlessness, coughing blood, black stools, stroke symptoms like slurred speech or facial droop, high fever >101°F with infected wound, or SpO2 < 90%):
   - Immediately and prominently instruct them to CALL 108 AMBULANCE or visit the nearest emergency hospital immediately.
   - Advise them not to wait for private transport.
3. Be clear, warm, and speak in simple language avoiding difficult medical jargon.
4. If asked in Hindi, Hinglish, Gujarati, or Marathi, respond fluently and naturally in that language (using Devanagari, Gujarati, or Latin script as appropriate).
5. YOU HAVE DIRECT ACCESS TO BOOK DOCTOR APPOINTMENTS & FOLLOW-UPS:
   - When a patient or clinician asks you to book an appointment (e.g. "tu book kr", "book an appointment", "schedule follow-up", "doctor se milna hai", "appointment book karo"), YOU CAN AND WILL BOOK IT!
   - You have access to our hospital doctors:
     * Dr. Ananya Sharma (Internal Medicine)
     * Dr. Vikram Mehta (General Surgery & Critical Care)
   - Enthusiastically confirm that you can schedule it right here in HealthVerse, let them know which doctor you recommend or is available, and explain that an interactive booking card has been loaded for them to confirm their date & time slot with 1 tap.
6. You can assist with:
   - Direct appointment booking & scheduling with hospital doctors
   - Post-discharge recovery precautions (wound care, diet, light activity)
   - Medication adherence (why not to skip maintenance medicines)
   - Explaining medical reports, vital signs (BP, SpO2, Pulse, Blood Sugar)
   - PM-JAY (Ayushman Bharat) government scheme eligibility and required documents
   - Guiding the user on how to use HealthVerse (reporting symptoms, checking medicines, consent, CHW visits)
7. PERSONALIZED PATIENT IDENTIFICATION & CONTINUITY:
   - When Current Session Context specifies the verified logged-in patient (e.g. Name, Patient ID, Diagnosis):
     * You KNOW THIS PATIENT! Greet them warmly and respectfully by their name (e.g. "Namaste Rajesh Verma ji!").
     * If they ask "whats my name", "who am i", "mera naam kya hai", or "who is logged in", IMMEDIATELY state their full name, patient ID, and current recovery status!
     * When booking appointments, confirm that the appointment is being booked directly for them under their patient record.
8. APPOINTMENT DATES AND TIMINGS (STRICT):
   - When the user asks to book an appointment on a specific date (e.g. "30 oct", "30 october", "30 tarikh", "kal", "parso"):
     * Always confirm and respect THAT EXACT DATE in your reply (e.g. "Bilkul, main 30 October 2026 ke liye aapki appointment set kar raha hoon.").
     * NEVER mention or default to a different date when the user specifically requested one!`;

/**
 * Extract requested date, time, and consultation mode from natural language message
 */
export function extractAppointmentDateTime(text = '') {
  const lower = text.toLowerCase();
  const now = new Date();
  let targetDate = null;
  let targetTime = null;
  let targetType = null;

  // 1. Day after tomorrow ('parso', 'parson', 'day after tomorrow')
  if (lower.includes('parso') || lower.includes('parson') || lower.includes('day after tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    targetDate = d.toISOString().split('T')[0];
  }
  // 2. Tomorrow ('kal', 'tomorrow')
  else if (lower.includes('kal') || lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    targetDate = d.toISOString().split('T')[0];
  }
  // 3. Today ('aaj', 'today')
  else if (lower.includes('aaj') || lower.includes('today')) {
    targetDate = now.toISOString().split('T')[0];
  }

  // 4. Pattern: [1-31] (st|nd|rd|th)? (of)? (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*
  const dayMonthMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*/i);
  // Pattern: (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})
  const monthDayMatch = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?/i);
  // Pattern: DD/MM or DD-MM
  const slashMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);

  const monthsMap = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
  };

  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const month = monthsMap[dayMonthMatch[2].slice(0, 3)];
    if (month && day >= 1 && day <= 31) {
      const year = now.getFullYear();
      targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else if (monthDayMatch) {
    const month = monthsMap[monthDayMatch[1].slice(0, 3)];
    const day = parseInt(monthDayMatch[2], 10);
    if (month && day >= 1 && day <= 31) {
      const year = now.getFullYear();
      targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = slashMatch[3] ? (slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3], 10) : parseInt(slashMatch[3], 10)) : now.getFullYear();
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 5. Pattern: 30 tarikh / 30 tareekh / 30 तारीख / 30 તારીખ
  const tarikhMatch = lower.match(/\b(\d{1,2})\s*(?:tarikh|tareekh|taarikh|तारीख|તારીખ)\b/i);
  if (tarikhMatch && !targetDate) {
    const day = parseInt(tarikhMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const year = now.getFullYear();
      let month = now.getMonth() + 1;
      if (day < now.getDate()) month += 1;
      targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Times extraction
  if (lower.includes('morning') || lower.includes('subah') || lower.includes('savare') || lower.includes('सुबह')) {
    targetTime = '09:30 AM';
  } else if (lower.includes('afternoon') || lower.includes('dopahar') || lower.includes('दुपहर')) {
    targetTime = '02:00 PM';
  } else if (lower.includes('evening') || lower.includes('shaam') || lower.includes('sanje') || lower.includes('शाम')) {
    targetTime = '05:00 PM';
  }

  const explicitTimeMatch = lower.match(/\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm|baje|बजे)\b/i);
  const colonTimeMatch = lower.match(/\b(1[0-2]|0?[1-9]):([0-5][0-9])\b/);

  if (explicitTimeMatch) {
    let hour = parseInt(explicitTimeMatch[1], 10);
    let min = explicitTimeMatch[2] || '00';
    let unit = explicitTimeMatch[3].toLowerCase();
    let meridiem = 'AM';
    if (unit === 'pm') {
      meridiem = 'PM';
    } else if (unit === 'am') {
      meridiem = 'AM';
    } else if (unit === 'baje' || unit === 'बजे') {
      meridiem = (hour < 8 || hour === 12) ? 'PM' : 'AM';
    }
    targetTime = `${String(hour).padStart(2, '0')}:${min} ${meridiem}`;
  } else if (colonTimeMatch) {
    let hour = parseInt(colonTimeMatch[1], 10);
    let min = colonTimeMatch[2];
    let meridiem = hour < 8 ? 'PM' : 'AM';
    targetTime = `${String(hour).padStart(2, '0')}:${min} ${meridiem}`;
  }

  // Consultation mode
  if (lower.includes('phone') || lower.includes('call') || lower.includes('telephonic') || lower.includes('ghar se') || lower.includes('online')) {
    targetType = 'telephonic';
  } else if (lower.includes('hospital') || lower.includes('visit') || lower.includes('clinic') || lower.includes('aakar') || lower.includes('aake')) {
    targetType = 'in_person';
  }

  return { targetDate, targetTime, targetType };
}

/**
 * Builds comprehensive session context note for Gemini and OpenAI prompts
 */
function buildSessionContextNote(context = {}) {
  let note = '';
  const patientName = context.patientName || context.userName;
  const patientCode = context.patientCode || context.patientId;

  if (patientName) {
    note += `CURRENT VERIFIED LOGGED-IN PATIENT: Name="${patientName}", Patient ID="${patientCode || 'HV-PATIENT'}", Role="${context.role || 'patient'}". `;
    note += `The person chatting with you IS ${patientName}. When they ask for their name ("whats my name", "who am i", "mera naam kya hai"), YOU MUST EXPLICITLY AND PROUDLY STATE THEIR REAL NAME (${patientName}) AND PATIENT ID (${patientCode || 'N/A'})! `;
    note += `When booking an appointment, this appointment is scheduled directly for ${patientName}. `;
  } else if (context.role) {
    note += `User Role: ${context.role}. `;
  }

  if (context.requestedDate) {
    note += `USER HAS SPECIFICALLY REQUESTED APPOINTMENT DATE: "${context.requestedDate}"${context.requestedTime ? ` at "${context.requestedTime}"` : ''}. You MUST explicitly confirm THIS EXACT DATE (${context.requestedDate}) in your reply. Do NOT mention any other date! `;
  }

  if (context.diagnosis) {
    note += `Patient Clinical Diagnosis / Condition: ${context.diagnosis}. `;
  }
  if (context.language) {
    note += `Preferred Language: ${context.language}. `;
  }
  if (context.doctors && context.doctors.length > 0) {
    note += `Available Hospital Doctors: ${context.doctors.map(d => `${d.name} (${d.specialization})`).join(', ')}. You have the capability to schedule and book appointments with them. `;
  }
  return note;
}

/**
 * Check whether a message indicates intent to book or schedule an appointment
 */
export function detectBookingIntent(text = '') {
  const lower = text.toLowerCase();
  const bookingKeywords = [
    'book', 'booking', 'appointment', 'schedule', 'followup', 'follow-up', 'milna',
    'apointment', 'appotiment', 'tu book', 'kr do book', 'doctor dekhna', 'डॉक्टर',
    'अपॉइंटमेंट', 'બુક', 'તારીખ', 'मुलाकात'
  ];
  return bookingKeywords.some(k => lower.includes(k));
}

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

  if (detectBookingIntent(combined)) {
    actions.push({ label: '📅 Book Doctor Appointment', action: 'book_appointment' });
  }
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
      const contextNote = buildSessionContextNote(context);
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

  const contextNote = buildSessionContextNote(context);
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

  const patientName = context.patientName || context.userName;

  if (lower.includes('my name') || lower.includes('who am i') || lower.includes('mera naam') || lower.includes('who i am') || lower.includes('kon hu') || lower.includes('kaun hu')) {
    if (patientName) {
      return `Namaste **${patientName}** ji!\n\nYou are currently logged in as a verified patient on HealthVerse with Patient ID: **${context.patientCode || context.patientId || 'HV-PATIENT'}**${context.diagnosis ? `\n\nClinical Chart: *Recovering from ${context.diagnosis}*` : ''}.\n\nHow can I help you today? I can help you with your medications, check symptoms, or book an appointment directly with Dr. Ananya Sharma or Dr. Vikram Mehta.`;
    }
    return `You are currently logged in as a ${context.role || 'user'} on HealthVerse. If you'd like me to address you personally, please tell me your name!`;
  }

  if (detectBookingIntent(lower)) {
    return `📅 **Appointment Booking Support**

Ji haan ${patientName ? `${patientName} ji, ` : ''}main aapki appointment book kar sakta hoon! 

Hamare hospital ke doctors:
- **Dr. Ananya Sharma** (Internal Medicine)
- **Dr. Vikram Mehta** (General Surgery & Critical Care)

Maine aapke liye niche **Appointment Booking Card** open kar diya hai. Aap apna manpasand doctor aur time chun kar **"Confirm Appointment"** par tap karein, aur aapka follow-up schedule ho jayega!`;
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
- Booking doctor appointments and clinic follow-ups
- Explaining your discharge instructions and medication schedules
- Answering questions about post-surgical recovery, wound care, and diet
- Checking eligibility and documents for PM-JAY (Ayushman Bharat)
- Symptom triage and warning sign awareness

How can I help you today?`;
  }

  return `I understand your query: "${message}".

Here is guidance from HealthVerse clinical continuity protocols:
- You can book an appointment with our hospital doctors directly in this chat or via your Home timeline.
- Ensure you monitor your vital signs (BP, pulse, oxygen) and take prescribed medications as directed.
- If you are experiencing uncomfortable symptoms, click **Report Symptoms** below so your care team can review your case.
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
  const isBooking = detectBookingIntent(message);

  const parsedDateTime = extractAppointmentDateTime(message);
  if (parsedDateTime.targetDate) {
    context.requestedDate = parsedDateTime.targetDate;
  }
  if (parsedDateTime.targetTime) {
    context.requestedTime = parsedDateTime.targetTime;
  }
  if (parsedDateTime.targetType) {
    context.requestedType = parsedDateTime.targetType;
  }

  // Setup appointment booking data if booking intent detected
  let appointmentBooking = null;
  if (isBooking) {
    const doctorsList = (context.doctors && context.doctors.length > 0) ? context.doctors : [
      { id: '6ae19a8e4da8f1c7c8827f9e', name: 'Dr. Vikram Mehta', specialization: 'General Surgery & Critical Care' },
      { id: '6ae19a8e4da8f1c7c8827f9a', name: 'Dr. Ananya Sharma', specialization: 'Internal Medicine' }
    ];

    let defaultDoc = doctorsList[0];
    if (message.toLowerCase().includes('ananya')) {
      defaultDoc = doctorsList.find(d => d.name.toLowerCase().includes('ananya')) || defaultDoc;
    } else if (message.toLowerCase().includes('vikram')) {
      defaultDoc = doctorsList.find(d => d.name.toLowerCase().includes('vikram')) || defaultDoc;
    }

    appointmentBooking = {
      open: true,
      defaultDoctorId: defaultDoc.id || defaultDoc._id,
      defaultDoctorName: defaultDoc.name,
      doctors: doctorsList,
      patientId: context.patientId || null,
      patientName: context.patientName || context.userName || null,
      patientCode: context.patientCode || null,
      requestedDate: parsedDateTime.targetDate || context.requestedDate || null,
      requestedTime: parsedDateTime.targetTime || context.requestedTime || null,
      requestedType: parsedDateTime.targetType || context.requestedType || null
    };
  }

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
    bookingIntent: isBooking,
    appointmentBooking,
    provider: usedProvider,
    timestamp: new Date().toISOString()
  };
}
