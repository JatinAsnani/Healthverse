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
6. YOU HAVE DIRECT ACCESS TO THE PATIENT'S MEDICAL REPORT & CLINICAL CHART:
   - When the user asks "mera medical report batana", "show my medical report", "meri bimari kya hai", or "discharge summary batao", summarize and explain their verified hospital diagnosis, treating doctor, prescribed medicines, and post-discharge precautions warmly and clearly in Hindi / Hinglish / Gujarati / English!
7. You can assist with:
   - Explaining medical reports, discharge diagnosis, and hospital records
   - Direct appointment booking & scheduling with hospital doctors
   - Post-discharge recovery precautions (wound care, diet, light activity)
   - Medication adherence (why not to skip maintenance medicines)
   - Explaining vital signs (BP, SpO2, Pulse, Blood Sugar)
   - PM-JAY (Ayushman Bharat) government scheme eligibility and required documents
   - Guiding the user on how to use HealthVerse (reporting symptoms, checking medicines, consent, CHW visits)
8. PERSONALIZED PATIENT IDENTIFICATION & CONTINUITY:
   - When Current Session Context specifies the verified logged-in patient (e.g. Name, Patient ID, Diagnosis, Medical Report):
     * You KNOW THIS PATIENT! Greet them warmly and respectfully by their name (e.g. "Namaste Rajesh Verma ji!").
     * If they ask "whats my name", "who am i", "mera naam kya hai", or "who is logged in", IMMEDIATELY state their full name, patient ID, and current recovery status!
     * When booking appointments, confirm that the appointment is being booked directly for them under their patient record.
9. APPOINTMENT DATES AND TIMINGS (STRICT):
   - When the user asks to book an appointment on a specific date (e.g. "30 oct", "30 october", "30 tarikh", "kal", "parso"):
     * Always confirm and respect THAT EXACT DATE in your reply (e.g. "Bilkul, main 30 October 2026 ke liye aapki appointment set kar raha hoon.").
     * NEVER mention or default to a different date when the user specifically requested one!
10. CLINICIAN VS PATIENT ROLE DISTINCTION (MANDATORY):
    - When the logged-in user is a CLINICIAN (Doctor, Nurse, CHW, Hospital Admin):
      * Address them respectfully as a clinician/doctor (e.g. "Namaste Dr. Vikram Mehta ji!").
      * NEVER greet a clinician as a recovering patient, NEVER tell them they were admitted or discharged, and NEVER give them a personal medical discharge report!
      * When a clinician asks for a patient's report (e.g. "krishna ki report batana", "rajesh verma ki report"):
        - If the patient is found in context, provide that specific patient's verified clinical chart, diagnosis, and medications to the doctor.
        - If the patient is NOT found in hospital database, inform the doctor respectfully that no patient with that name was found, and offer to look up any of the hospital's registered patients.`;

/**
 * Extract requested date, time, and consultation mode from natural language message
 */
/**
 * Extract target patient name or ID from natural language message (e.g. "krishna ki report batana", "rajesh verma ka discharge")
 */
export function extractTargetPatientQuery(text = '') {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // 1. Patient ID match: HV-2026-001, HV-P1002, etc.
  const idMatch = text.match(/\b(HV-[A-Za-z0-9\-]+)\b/i);
  if (idMatch) {
    return { type: 'id', query: idMatch[1].toUpperCase() };
  }

  // 2. "[Name] ki / ka / ke report / discharge / summary / record / status / chart"
  const kiMatch = lower.match(/(?:patient\s+)?([a-z\s]{2,30}?)\s+(?:ki|ka|ke|ko)\s+(?:report|discharge|summary|record|history|status|file|chart|details|bimari)/i);
  if (kiMatch) {
    const raw = kiMatch[1].trim()
      .replace(/^(mujhe|hume|doctor|bhai|plz|please|kripya|zara)\s+/i, '')
      .trim();
    if (raw && !['meri', 'mera', 'apni', 'apna', 'iski', 'uski', 'kisi', 'patient'].includes(raw)) {
      return { type: 'name', query: raw };
    }
  }

  // 3. "report / discharge / summary / chart / status of / for [Name]"
  const ofMatch = lower.match(/(?:report|discharge|summary|chart|status|record|history|details)\s+(?:of|for|about)\s+([a-z\s]{2,30})/i);
  if (ofMatch) {
    const raw = ofMatch[1].trim()
      .replace(/\s+(?:batao|batana|dikhao|show|please|plz).*$/i, '')
      .trim();
    if (raw && !['me', 'mine', 'patient', 'him', 'her'].includes(raw)) {
      return { type: 'name', query: raw };
    }
  }

  // 4. "patient [Name] report / record"
  const patientMatch = lower.match(/\bpatient\s+([a-z\s]{2,30}?)(?:\s+(?:ki|ka|report|record|chart)|$)/i);
  if (patientMatch) {
    const raw = patientMatch[1].trim();
    if (raw && !['details', 'report', 'record', 'summary', 'chart'].includes(raw)) {
      return { type: 'name', query: raw };
    }
  }

  return null;
}

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
  const monthDayMatch = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?/i);
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

  if (context.isClinician) {
    note += `LOGGED-IN USER IS A CLINICIAN: Name="${context.clinicianName || context.userName}", Role="${context.role}". They are a DOCTOR/NURSE/STAFF MEMBER at the hospital, NOT A PATIENT! NEVER address them as a recovering patient, never say they were discharged, and never give them a personal medical discharge summary. `;

    if (context.targetPatientNotFound) {
      note += `The clinician asked for patient "${context.targetPatientNotFound}", but NO patient with this name exists in hospital records. Inform the doctor clearly and respectfully that "${context.targetPatientNotFound}" was not found, and suggest looking up one of the active hospital patients: ${(context.registeredPatients || []).slice(0, 5).join(', ')}. `;
    } else if (context.medicalReport) {
      const mr = context.medicalReport;
      note += `THE CLINICIAN IS REVIEWING PATIENT RECORD FOR: Patient="${mr.patientName}" (${mr.patientId}), Diagnosis="${mr.diagnosis}", Treating Doctor="${mr.doctorName}", Prescriptions="${(mr.prescriptions || []).map(p => `${p.medicine} (${p.dosage})`).join('; ')}". Present this patient's clinical summary professionally to the doctor. `;
    } else {
      note += `Offer to help them pull up any patient's clinical chart, review alerts, or check scheduled appointments. Active hospital patients include: ${(context.registeredPatients || []).slice(0, 5).join(', ')}. `;
    }
  } else {
    const patientName = context.patientName || context.userName;
    const patientCode = context.patientCode || context.patientId;

    if (patientName) {
      note += `CURRENT VERIFIED LOGGED-IN PATIENT: Name="${patientName}", Patient ID="${patientCode || 'HV-PATIENT'}", Role="patient". `;
      note += `The person chatting with you IS ${patientName}. When they ask for their name ("whats my name", "who am i", "mera naam kya hai"), YOU MUST EXPLICITLY AND PROUDLY STATE THEIR REAL NAME (${patientName}) AND PATIENT ID (${patientCode || 'N/A'})! `;
      note += `When booking an appointment, this appointment is scheduled directly for ${patientName}. `;
    }

    if (context.medicalReport) {
      const mr = context.medicalReport;
      note += `VERIFIED PATIENT MEDICAL REPORT: Hospital="${mr.hospitalName}", Doctor="${mr.doctorName}", Admission="${mr.admissionDate}", Discharge="${mr.dischargeDate}", Diagnosis="${mr.diagnosis}", Summary="${mr.summary}", Diet="${mr.dietInstructions}", Activity="${mr.activityInstructions}", WarningSigns="${(mr.warningSigns || []).join(', ')}", PrescribedMedicines="${(mr.prescriptions || []).map(p => `${p.medicine} (${p.dosage}, ${p.timing})`).join('; ')}". When the user asks about their medical report ("mera medical report batana", "show my report", "meri bimari kya hai", "meri discharge summary"), explain and summarize these verified details clearly and warmly in the user's language! `;
    }
  }

  if (context.requestedDate) {
    note += `USER HAS SPECIFICALLY REQUESTED APPOINTMENT DATE: "${context.requestedDate}"${context.requestedTime ? ` at "${context.requestedTime}"` : ''}. You MUST explicitly confirm THIS EXACT DATE (${context.requestedDate}) in your reply. Do NOT mention any other date! `;
  }

  if (context.diagnosis) {
    note += `Clinical Diagnosis / Condition: ${context.diagnosis}. `;
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
  if (combined.includes('report') || combined.includes('discharge') || combined.includes('bimari') || combined.includes('history')) {
    actions.push({ label: '📅 Book Follow-up', action: 'book_appointment' });
    actions.push({ label: '📝 Report Symptoms', path: '/symptoms/report' });
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

  // Deduplicate suggested actions
  const seen = new Set();
  const uniqueActions = [];
  for (const act of actions) {
    const key = act.action ? `act:${act.action}` : `path:${act.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueActions.push(act);
    }
  }

  return uniqueActions;
}

/**
 * Call Google Gemini API
 */
async function callGemini(apiKey, message, history = [], context = {}) {
  const cleanKey = (apiKey || '').trim();

  // If the key is too short or clearly invalid, avoid wasteful network roundtrips
  if (!cleanKey || cleanKey.length < 15) {
    throw new Error('Invalid Gemini API Key provided.');
  }

  // Active production Google Gemini models with primary endpoints
  const modelConfigs = [
    { version: 'v1beta', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-2.0-flash' },
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-1.5-flash-8b' }
  ];

  let lastError = null;

  for (const { version, model } of modelConfigs) {
    try {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${cleanKey}`;

      const contents = [];

      const contextNote = buildSessionContextNote(context);
      const effectiveSystemPrompt = contextNote
        ? `${SYSTEM_PROMPT}\n\nCurrent Session Context: ${contextNote}`
        : SYSTEM_PROMPT;

      for (const h of history.slice(-8)) {
        contents.push({
          role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.content || '' }]
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const body = {
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 900
        }
      };

      if (effectiveSystemPrompt) {
        body.systemInstruction = {
          parts: [{ text: effectiveSystemPrompt }]
        };
      }

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
      logger.warn(`Gemini model ${model} (${version}) failed: ${err.message}`);
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

  // 1. Critical Red Flag Alert
  if (detectEmergencyRedFlags(lower)) {
    return `🚨 **CRITICAL MEDICAL EMERGENCY ALERT**

Your symptoms indicate a potentially serious medical emergency that requires immediate clinical care:
- **Call 108 Ambulance right now** (Toll-Free).
- Do not attempt to drive yourself.
- Keep emergency contact numbers and hospital discharge summary accessible.
- If having chest pain, rest in a comfortable seated position with support behind your back.

*HealthVerse AI is an early-warning decision aid and does not replace emergency medical services.*`;
  }

  // 2. Specific Patient Record Not Found (e.g. Doctor or user asked for "krishna ki report")
  if (context.targetPatientNotFound) {
    const suggestions = (context.registeredPatients && context.registeredPatients.length > 0)
      ? context.registeredPatients.map(p => `  • **${p}**`).join('\n')
      : '  • Rajesh Verma (HV-2026-001)\n  • Sunita Patel (HV-2026-002)\n  • Devendra Solanki (HV-2026-005)\n  • Kamla Ben (HV-2026-006)';

    if (context.isClinician) {
      const docGreeting = context.clinicianName ? (context.clinicianName.startsWith('Dr.') ? `**${context.clinicianName}**` : `Dr. **${context.clinicianName}**`) : 'Doctor';
      return `🔍 **Patient Record Not Found**

${docGreeting} ji, hospital database mein **"${context.targetPatientNotFound}"** naam ka koi patient record nahi mila.

Aap in active registered patients ka clinical chart dekh sakte hain:
${suggestions}

*Kisi bhi patient ki report dekhne ke liye likhein: "[Patient Name] ki report batana"* (jaise *"Rajesh Verma ki report"*)`;
    }

    return `🔍 **Record Not Found**

Maaf kijiye, hamare hospital records mein **"${context.targetPatientNotFound}"** naam ka koi patient register nahi mila.

Kripya sahi naam ya **Patient ID** (jaise *HV-2026-001*) likhein.`;
  }

  const patientName = context.patientName;
  const clinicianName = context.clinicianName || context.userName;

  // 3. User Name & Identity Query ("Who am I", "Mera naam kya hai")
  if (lower.includes('my name') || lower.includes('who am i') || lower.includes('mera naam') || lower.includes('who i am') || lower.includes('kon hu') || lower.includes('kaun hu')) {
    if (context.isClinician) {
      return `Namaste **${clinicianName}** ji!\n\nAap HealthVerse par **${context.role === 'doctor' ? 'Doctor / Clinician' : context.role}** ke roop mein logged in hain (${context.hospitalName || 'District Sub-Divisional Hospital & Trauma Centre, Mandvi'}).\n\nMain aapko patient records dekhne, clinical alerts review karne aur follow-up appointments manage karne mein madad kar sakta hoon.`;
    }
    if (patientName) {
      return `Namaste **${patientName}** ji!\n\nYou are currently logged in as a verified patient on HealthVerse with Patient ID: **${context.patientCode || context.patientId || 'HV-PATIENT'}**${context.diagnosis ? `\n\nClinical Chart: *Recovering from ${context.diagnosis}*` : ''}.\n\nHow can I help you today? I can help you with your medications, check symptoms, or book an appointment directly with Dr. Ananya Sharma or Dr. Vikram Mehta.`;
    }
    return `You are currently logged in as a ${context.role || 'user'} on HealthVerse. If you'd like me to address you personally, please tell me your name!`;
  }

  // 4. Handle Medical Report & Clinical Chart queries
  const isReportQuery =
    lower.includes('report') ||
    lower.includes('discharge') ||
    lower.includes('kya hua') ||
    lower.includes('meri bimari') ||
    lower.includes('mera bimari') ||
    lower.includes('meri tabiyat') ||
    lower.includes('diagnosis') ||
    lower.includes('history') ||
    lower.includes('medical summary') ||
    (lower.includes('medical') && (lower.includes('batao') || lower.includes('batana') || lower.includes('bata') || lower.includes('dikhao') || lower.includes('show')));

  if (isReportQuery) {
    if (context.medicalReport) {
      const mr = context.medicalReport;
      const medsList = mr.prescriptions && mr.prescriptions.length > 0
        ? mr.prescriptions.map(p => `  • **${p.medicine}** — ${p.dosage} (${p.timing})${p.critical ? ' ⚠️ *Critical*' : ''}`).join('\n')
        : '  • Maintenance medicines logged in clinical chart.';

      // If clinician is reviewing a patient's chart
      if (context.isClinician) {
        return `📋 **Patient Clinical Record — ${mr.patientName} (${mr.patientId})**

Doctor sahab, patient **${mr.patientName}** ka verified hospital clinical chart yeh hai:

- 🏥 **Hospital:** ${mr.hospitalName}
- 👨‍⚕️ **Primary Treating Doctor:** ${mr.doctorName}
- 🩺 **Diagnosis (बीमारी / निदान):** **${mr.diagnosis}**
- 📅 **Discharge Date:** ${mr.dischargeDate} (Admission: ${mr.admissionDate})
- 📝 **Clinical Summary:** ${mr.summary}

💊 **Prescribed Medicines (दवाइयाँ):**
${medsList}

⚠️ **Care Precautions & Monitoring:**
- **Diet:** ${mr.dietInstructions}
- **Activity:** ${mr.activityInstructions}
- **Monitored Warning Signs:** ${(mr.warningSigns || []).join(', ')}

*Aap is patient ke chart me naye prescriptions add kar sakte hain ya follow-up visit schedule kar sakte hain.*`;
      }

      // If patient asking for their own discharge summary
      return `📋 **Aapki Medical Discharge Report**

Namaste **${mr.patientName}** ji, aapka verified hospital record yeh hai:

- 🏥 **Hospital:** ${mr.hospitalName}
- 👨‍⚕️ **Treating Doctor:** ${mr.doctorName}
- 🩺 **Diagnosis (बीमारी / निदान):** **${mr.diagnosis}**
- 📅 **Discharge Date:** ${mr.dischargeDate}
- 📝 **Summary:** ${mr.summary}

💊 **Prescribed Medicines (दवाइयाँ):**
${medsList}

⚠️ **Care Precautions (सावधानियां):**
- **Diet:** ${mr.dietInstructions}
- **Activity:** ${mr.activityInstructions}
- **Watch for:** ${(mr.warningSigns || []).join(', ')}

*Aap chahein toh niche diye button se ${mr.doctorName} ke sath follow-up appointment book kar sakte hain!*`;
    }

    // Clinician asked for report without specifying any patient
    if (context.isClinician) {
      const suggestions = (context.registeredPatients && context.registeredPatients.length > 0)
        ? context.registeredPatients.map(p => `  • **${p}**`).join('\n')
        : '  • Rajesh Verma (HV-2026-001)\n  • Sunita Patel (HV-2026-002)\n  • Devendra Solanki (HV-2026-005)';

      return `👨‍⚕️ **Hospital Clinical Records Portal**

Namaste **${clinicianName || 'Doctor'}** ji! Aap clinician account se logged in hain.

Aap kis patient ka clinical chart ya discharge summary dekhna chahte hain?

Active registered patients:
${suggestions}

*Kisi bhi patient ki report dekhne ke liye likhein: "[Patient Name] ki report batana" (jaise: "Rajesh Verma ki report" ya "HV-2026-001")*`;
    }

    return `📋 **Aapki Medical Report & Discharge Summary**

Namaste! Aapka hospital medical record dekhne ke liye:
- Yadi aap logged in hain, aapka discharge summary aur doctor prescriptions aapke **Home Timeline** par available hain.
- Aapki dekhbhal kar rahe hospital doctors: **Dr. Ananya Sharma** (Internal Medicine) aur **Dr. Vikram Mehta** (General Surgery & Critical Care).
- Agar aap doctor se consult karna chahte hain, toh bas yahan likhein: *"Doctor appointment book karo"*, aur main aapka slot schedule kar dunga!`;
  }

  // 5. Registered Patients List query for Clinicians
  if (context.isClinician && (lower.includes('patient') && (lower.includes('list') || lower.includes('dikhao') || lower.includes('batao') || lower.includes('active') || lower.includes('roster')))) {
    const list = (context.registeredPatients && context.registeredPatients.length > 0)
      ? context.registeredPatients.map(p => `  • **${p}**`).join('\n')
      : '  • Rajesh Verma (HV-2026-001)\n  • Sunita Patel (HV-2026-002)\n  • Devendra Solanki (HV-2026-005)';

    return `👥 **Hospital Active Registered Patients**

Doctor sahab, aapke hospital ke active monitored patients yeh hain:

${list}

*Kisi bhi patient ka discharge record dekhne ke liye likhein: "[Patient Name] ki report"* (jaise *"Rajesh Verma ki report"*)`;
  }

  // 6. Appointment Booking Support
  if (detectBookingIntent(lower)) {
    if (context.isClinician) {
      return `📅 **Schedule Patient Follow-up**

Doctor sahab, aap kisi bhi patient ke liye follow-up appointment schedule kar sakte hain.

Maine niche **Appointment Booking Card** open kar diya hai. Kripya date aur format (Hospital Visit ya Telephonic) select karke **"Confirm Appointment"** par tap karein.`;
    }

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

  // Handle warm conversational greetings: "kesa hai", "kaise ho", "how are you", "kya haal hai"
  if (
    lower.includes('kaise ho') ||
    lower.includes('kaisa hai') ||
    lower.includes('kesa hai') ||
    lower.includes('kese ho') ||
    lower.includes('how are you') ||
    lower.includes('kya haal') ||
    lower.includes('kem cho') ||
    lower.includes('majama')
  ) {
    if (context.isClinician) {
      return `Namaste **${clinicianName}** ji! Main bilkul theek hoon, aapki seva mein hazir. 🙏\n\nAapko hospital ke kisi patient ka clinical chart, active alerts ya appointment status dekhna hai toh batayein!`;
    }
    return `Namaste${patientName ? ` **${patientName}** ji` : ''}! Main bilkul theek hoon, aapki seva ke liye hamesha taiyar. 🙏\n\nAapki tabiyat ab kaisi hai? Kya aapko dawaiyon, recovery precautions, doctor appointment ya medical report se judi koi jaankari chahiye?`;
  }

  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('namaste')) {
    if (context.isClinician) {
      const docGreeting = clinicianName ? (clinicianName.startsWith('Dr.') ? clinicianName : `Dr. ${clinicianName}`) : 'Doctor';
      return `👋 **Namaste ${docGreeting} ji!**

Main HealthVerse Clinical AI Assistant hoon. Main aapki in chizon mein madad kar sakta hoon:
- Kisi bhi patient ki medical report aur discharge summary nikalna (jaise *"Rajesh Verma ki report"* ya *"HV-2026-001"*)
- Hospital ke active alerts aur emergency cases check karna
- Patient appointments aur clinic follow-up schedule dekhna
- Hospital ke registered patients ki list check karna

Batayein, main aaj aapki kya madad karoon?`;
    }

    return `👋 **Namaste! I am your HealthVerse AI Health Assistant.**

I can help you with:
- Checking your medical reports and diagnosis ("mera medical report batana")
- Booking doctor appointments and clinic follow-ups
- Explaining your discharge instructions and medication schedules
- Answering questions about post-surgical recovery, wound care, and diet
- Checking eligibility and documents for PM-JAY (Ayushman Bharat)
- Symptom triage and warning sign awareness

How can I help you today?`;
  }

  return `I understand your query: "${message}".

Here is guidance from HealthVerse clinical continuity protocols:
- You can check your medical report by asking: *"Mera medical report batana"*
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
      patientName: context.patientName || (context.isClinician ? null : context.userName) || null,
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
      logger.warn(`Error invoking external AI model (${err.message}). Falling back to verified clinical continuity rules.`);
      // Fallback gracefully so the user always receives a safe, helpful, warm response without exposing internal errors
      reply = getRuleBasedResponse(message, context);
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
