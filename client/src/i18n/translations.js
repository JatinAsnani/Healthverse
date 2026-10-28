export const resources = {
  en: {
    translation: {
      appName: 'HealthVerse',
      appTagline: 'AI-Assisted Continuity-of-Care Platform',
      safetyPrinciple: 'SAFETY PRINCIPLE: The AI is a decision-support and early-warning tool only. It never diagnoses or prescribes. Every high or critical alert must be reviewed by a qualified clinician.',
      online: 'Online',
      offline: 'Offline Mode (Local Storage Active)',
      syncing: 'Syncing...',
      syncNow: 'Sync Now',
      pendingSync: 'Not synced',
      synced: 'Synced',
      roles: {
        patient: 'Patient',
        caregiver: 'Caregiver',
        doctor: 'Doctor',
        nurse: 'Nurse',
        chw: 'Community Health Worker (CHW)',
        hospital_admin: 'Hospital Administrator'
      },
      nav: {
        home: 'Home Timeline',
        logMeds: 'Log Medicines',
        reportSymptoms: 'Report Symptoms',
        results: 'Test Results',
        education: 'Health Guides',
        pmjay: 'PM-JAY Check',
        consent: 'Privacy & Consent',
        caregivers: 'Caregivers',
        patients: 'Patient Roster',
        alerts: 'Alert Inbox',
        registerPatient: 'Register Patient',
        adminAnalytics: 'Hospital Analytics',
        staff: 'Staff Management',
        logout: 'Log Out'
      },
      patientHome: {
        greeting: 'Welcome back',
        todayMeds: "Today's Prescriptions",
        nextFollowup: 'Next Clinic Visit',
        pendingTests: 'Pending Lab Tests',
        adherenceRate: 'Adherence Streak',
        recentStatus: 'Recent Recovery Check',
        noPendingTests: 'All scheduled lab tests are resulted and up to date.',
        noUpcomingFollowup: 'No scheduled follow-up visits pending.',
        logAdherenceBtn: 'Mark Medicine Taken / Skipped',
        reportSymptomBtn: 'Check Symptoms & Vitals'
      },
      symptoms: {
        title: 'Check Post-Discharge Symptoms',
        subtitle: 'Select any sensations or warning signs you are experiencing today. Clear icons and simple ratings.',
        chest_pain: 'Chest Pain or Heaviness',
        breathlessness: 'Shortness of Breath',
        fever: 'High Fever / Shivering',
        bleeding: 'Bleeding from Wound / Cough',
        wound_discharge: 'Wound Pus or Discharge',
        confusion: 'Sudden Confusion / Dizziness',
        persistent_vomiting: 'Severe Vomiting (Cannot keep fluids)',
        reduced_urine_output: 'No Urination in 12 Hours',
        headache: 'Throbbing Headache',
        fatigue: 'Extreme Weakness',
        severityLevels: {
          0: 'None',
          1: 'Mild',
          2: 'Moderate',
          3: 'Severe'
        },
        vitalsTitle: 'Record Vital Signs (Optional but Recommended)',
        temperature: 'Temperature (°C)',
        pulse: 'Pulse (bpm)',
        spo2: 'Oxygen SpO2 (%)',
        bloodPressure: 'Blood Pressure (e.g. 120/80)',
        submitReport: 'Run Early-Warning Evaluation',
        evaluating: 'Evaluating Rule Engine...',
        emergencyCall: 'EMERGENCY: Call 108 Immediately'
      },
      adherence: {
        title: 'Log Today’s Medicines',
        takeNow: 'I Took This Dose',
        missDose: 'I Missed This',
        skipDose: 'Doctor Told to Skip',
        criticalNotice: 'CRITICAL MEDICINE: Please do not stop without consulting your doctor.',
        allTaken: 'All doses logged for today! Great job maintaining your recovery.'
      },
      clinician: {
        rosterTitle: 'Discharged Patient Roster',
        alertInboxTitle: 'Clinical Alert Inbox',
        filterAll: 'All Patients',
        filterCritical: 'Critical Alerts',
        filterHigh: 'High Alerts',
        filterMedium: 'Medium Advisory',
        acknowledgeBtn: 'Acknowledge',
        resolveBtn: 'Record Decision & Resolve',
        clinicianDecision: 'Clinician Action & Instructions',
        createDischarge: 'New Discharge Summary',
        scheduleFollowup: 'Schedule Follow-up',
        orderInvestigation: 'Order Investigation',
        updateResult: 'Enter Result'
      },
      pmjay: {
        title: 'Ayushman Bharat PM-JAY Eligibility Assistance',
        disclaimer: 'Guidance only. This screening is not an official government determination. For official enrollment, consult your nearest Ayushman Mitra at any empaneled hospital.',
        checkEligibility: 'Check Scheme Assistance'
      }
    }
  },
  hi: {
    translation: {
      appName: 'हेल्थवर्स (HealthVerse)',
      appTagline: 'अस्पताल डिस्चार्ज के बाद निरंतर देखभाल मंच',
      safetyPrinciple: 'सुरक्षा सिद्धांत: यह AI केवल निर्णय-सहायता और चेतावनी उपकरण है। यह कभी निदान या दवा नहीं लिखता। हर उच्च या गंभीर चेतावनी की समीक्षा योग्य डॉक्टर द्वारा की जानी चाहिए।',
      online: 'ऑनलाइन',
      offline: 'ऑफलाइन मोड (लोकल स्टोरेज सक्रिय)',
      syncing: 'सिंक हो रहा है...',
      syncNow: 'अभी सिंक करें',
      pendingSync: 'सिंक लंबित',
      synced: 'सिंक पूर्ण',
      roles: {
        patient: 'मरीज (Patient)',
        caregiver: 'देखभालकर्ता (Caregiver)',
        doctor: 'डॉक्टर (Doctor)',
        nurse: 'नर्स (Nurse)',
        chw: 'आशा / स्वास्थ्य कार्यकर्ता (CHW)',
        hospital_admin: 'अस्पताल प्रशासक'
      },
      nav: {
        home: 'मुख्य टाइमलाइन',
        logMeds: 'दवाइयां दर्ज करें',
        reportSymptoms: 'लक्षण बताएं',
        results: 'जांच रिपोर्ट',
        education: 'स्वास्थ्य मार्गदर्शिका',
        pmjay: 'आयुष्मान (PM-JAY)',
        consent: 'सहमति एवं गोपनीयता',
        caregivers: 'देखभालकर्ता',
        patients: 'मरीजों की सूची',
        alerts: 'अलर्ट इनबॉक्स',
        registerPatient: 'मरीज पंजीकरण',
        adminAnalytics: 'अस्पताल आंकड़े',
        staff: 'स्टाफ प्रबंधन',
        logout: 'लॉग आउट'
      },
      patientHome: {
        greeting: 'नमस्ते',
        todayMeds: 'आज की दवाइयां',
        nextFollowup: 'अगली अस्पताल जांच',
        pendingTests: 'लंबित लैब जांच',
        adherenceRate: 'दवा लेने का नियम',
        recentStatus: 'हालिया स्वास्थ्य स्थिति',
        noPendingTests: 'सभी जांच रिपोर्ट आ चुकी हैं।',
        noUpcomingFollowup: 'कोई आगामी अस्पताल जांच लंबित नहीं है।',
        logAdherenceBtn: 'दवाई ली / छूटी दर्ज करें',
        reportSymptomBtn: 'लक्षण और बीपी/नाड़ी जांचें'
      },
      symptoms: {
        title: 'अस्पताल से छुट्टी के बाद लक्षण जांचें',
        subtitle: 'यदि आज कोई तकलीफ महसूस हो रही है तो नीचे दिए गए बड़े बटनों से चुनें।',
        chest_pain: 'सीने में दर्द या भारीपन',
        breathlessness: 'सांस फूलना या दम घुटना',
        fever: 'तेज बुखार / ठंड लगना',
        bleeding: 'घाव या खांसी से खून आना',
        wound_discharge: 'घाव से मवाद या पानी बहना',
        confusion: 'अचानक चक्कर / बेहोशी / भ्रम',
        persistent_vomiting: 'लगातार उल्टियां होना',
        reduced_urine_output: '12 घंटे से पेशाब न आना',
        headache: 'तेज सिरदर्द',
        fatigue: 'अत्यधिक कमजोरी',
        severityLevels: {
          0: 'नहीं है',
          1: 'हल्का',
          2: 'मध्यम',
          3: 'तेज / गंभीर'
        },
        vitalsTitle: 'वाइटल्स दर्ज करें (यदि उपकरण उपलब्ध हो)',
        temperature: 'तापमान (°C)',
        pulse: 'नाड़ी / नब्ज (bpm)',
        spo2: 'ऑक्सीजन SpO2 (%)',
        bloodPressure: 'रक्तचाप (BP)',
        submitReport: 'तुरंत जांच करें',
        evaluating: 'नियम जांचे जा रहे हैं...',
        emergencyCall: 'आपातकाल: तुरंत 108 पर कॉल करें'
      },
      adherence: {
        title: 'आज की दवा का समय',
        takeNow: 'मैंने यह दवाई खा ली',
        missDose: 'यह खुराक छूट गई',
        skipDose: 'डॉक्टर ने बंद करने को कहा',
        criticalNotice: 'महत्वपूर्ण दवा: डॉक्टर की सलाह के बिना इसे कभी बंद न करें।',
        allTaken: 'आज की सभी दवाएं पूरी हो गईं! आपका स्वास्थ्य तेजी से सुधर रहा है।'
      },
      clinician: {
        rosterTitle: 'डिस्चार्ज मरीजों की सूची',
        alertInboxTitle: 'क्लिनिकल अलर्ट इनबॉक्स',
        filterAll: 'सभी मरीज',
        filterCritical: 'गंभीर अलर्ट (Critical)',
        filterHigh: 'उच्च अलर्ट (High)',
        filterMedium: 'मध्यम सलाह (Medium)',
        acknowledgeBtn: 'स्वीकार करें (Acknowledge)',
        resolveBtn: 'निर्णय लिखकर समाधान करें',
        clinicianDecision: 'डॉक्टर का निर्णय और निर्देश',
        createDischarge: 'नया डिस्चार्ज सारांश',
        scheduleFollowup: 'फॉलो-अप तय करें',
        orderInvestigation: 'जांच लिखें',
        updateResult: 'जांच रिपोर्ट दर्ज करें'
      },
      pmjay: {
        title: 'आयुष्मान भारत PM-JAY पात्रता सहायता',
        disclaimer: 'यह केवल मार्गदर्शन है, आधिकारिक सरकारी निर्णय नहीं। आधिकारिक गोल्डन कार्ड के लिए नजदीकी अस्पताल या सीएससी केंद्र में संपर्क करें।',
        checkEligibility: 'पात्रता जांचें'
      }
    }
  },
  gu: {
    translation: {
      appName: 'હેલ્થવર્સ (HealthVerse)',
      appTagline: 'હોસ્પિટલ ડિસ્ચાર્જ પછી સતત સંભાળ પ્લેટફોર્મ',
      safetyPrinciple: 'સુરક્ષા સિદ્ધાંત: આ AI ફક્ત નિર્ણય-સહાય અને પ્રારંભિક ચેતવણી સાધન છે. તે ક્યારેય રોગનું નિદાન કે દવા લખતું નથી. દરેક ઉચ્ચ કે ગંભીર ચેતવણીની લાયક ડોક્ટર દ્વારા સમીક્ષા થવી અનિવાર્ય છે.',
      online: 'ઓનલાઇન',
      offline: 'ઓફલાઇન મોડ (સ્થાનિક સ્ટોરેજ સક્રિય)',
      syncing: 'સિંક થઈ રહ્યું છે...',
      syncNow: 'હમણાં સિંક કરો',
      pendingSync: 'સિંક બાકી',
      synced: 'સિંક પૂર્ણ',
      roles: {
        patient: 'દર્દી (Patient)',
        caregiver: 'સંભાળકર્તા (Caregiver)',
        doctor: 'ડોક્ટર (Doctor)',
        nurse: 'નર્સ (Nurse)',
        chw: 'આશા / આરોગ્ય કાર્યકર (CHW)',
        hospital_admin: 'હોસ્પિટલ સંચાલક'
      },
      nav: {
        home: 'મુખ્ય ટાઇમલાઇન',
        logMeds: 'દવા નોંધો',
        reportSymptoms: 'લક્ષણો જણાવો',
        results: 'લેબ રિપોર્ટ',
        education: 'આરોગ્ય માર્ગદર્શિકા',
        pmjay: 'આયુષ્માન (PM-JAY)',
        consent: 'સંમતિ અને ગોપનીયતા',
        caregivers: 'સંભાળકર્તા',
        patients: 'દર્દીઓની યાદી',
        alerts: 'ચેતવણી ઇનબોક્સ',
        registerPatient: 'દર્દી નોંધણી',
        adminAnalytics: 'હોસ્પિટલ આંકડા',
        staff: 'સ્ટાફ વ્યવસ્થા',
        logout: 'લોગ આઉટ'
      },
      patientHome: {
        greeting: 'નમસ્તે',
        todayMeds: 'આજની દવાઓ',
        nextFollowup: 'આગામી તપાસ તારીખ',
        pendingTests: 'બાકી રહેલ લેબ તપાસ',
        adherenceRate: 'દવા લેવાની નિયમિતતા',
        recentStatus: 'તાજેતરની તબિયત',
        noPendingTests: 'બધા રિપોર્ટ આવી ગયા છે.',
        noUpcomingFollowup: 'કોઈ આગામી તપાસ બાકી નથી.',
        logAdherenceBtn: 'દવા લીધી / બાકી નોંધો',
        reportSymptomBtn: 'લક્ષણો અને બીપી તપાસો'
      },
      symptoms: {
        title: 'ડિસ્ચાર્જ પછીના લક્ષણો તપાસો',
        subtitle: 'આજે તમને કેવું લાગે છે તે નીચેના મોટા બટનો વડે સરળતાથી નોંધાવો.',
        chest_pain: 'છાતીમાં દુખાવો કે ભારેપણું',
        breathlessness: 'શ્વાસ લેવામાં તકલીફ',
        fever: 'તેજ તાવ / ધ્રુજારી',
        bleeding: 'ટાંકા કે ઉધરસમાં લોહી નીકળવું',
        wound_discharge: 'ઘામાંથી પરુ કે પાણી નીકળવું',
        confusion: 'અચાનક ચક્કર કે બેભાન થવું',
        persistent_vomiting: 'સતત ઉલટી થવી',
        reduced_urine_output: '૧૨ કલાકથી પેશાબ ન થવો',
        headache: 'તીવ્ર માથાનો દુખાવો',
        fatigue: 'અતિશય નબળાઈ',
        severityLevels: {
          0: 'નથી',
          1: 'સાધારણ',
          2: 'મધ્યમ',
          3: 'વધારે / ગંભીર'
        },
        vitalsTitle: 'વાઇટલ્સ નોંધો (જો સાધન હોય તો)',
        temperature: 'તાવ / ટેમ્પરેચર (°C)',
        pulse: 'પલ્સ / નાડીના ધબકારા',
        spo2: 'ઓક્સિજન SpO2 (%)',
        bloodPressure: 'બ્લડ પ્રેશર (BP)',
        submitReport: 'તપાસનું પરિણામ મેળવો',
        evaluating: 'નિયમો ચકાસાઈ રહ્યા છે...',
        emergencyCall: 'ઇમરજન્સી: તરત જ 108 પર કોલ કરો'
      },
      adherence: {
        title: 'આજની દવાઓ',
        takeNow: 'મેં આ દવા લઈ લીધી',
        missDose: 'આ દવા લેવાની ચૂકી ગયો',
        skipDose: 'ડોક્ટરે લેવાની ના પાડી',
        criticalNotice: 'ખાસ મહત્વની દવા: ડોક્ટરની મંજૂરી વગર આ દવા ક્યારેય બંધ ન કરવી.',
        allTaken: 'આજની તમામ દવાઓ લેવાઈ ગઈ છે! તમારી તબિયત સુધરી રહી છે.'
      },
      clinician: {
        rosterTitle: 'ડિસ્ચાર્જ દર્દીઓની યાદી',
        alertInboxTitle: 'ક્લિનિકલ ચેતવણી ઇનબોક્સ',
        filterAll: 'બધા દર્દીઓ',
        filterCritical: 'ગંભીર ચેતવણીઓ (Critical)',
        filterHigh: 'ઉચ્ચ ચેતવણીઓ (High)',
        filterMedium: 'મધ્યમ સલાહ (Medium)',
        acknowledgeBtn: 'સ્વીકારો (Acknowledge)',
        resolveBtn: 'નિર્ણય નોંધી ઉકેલો',
        clinicianDecision: 'ડોક્ટરનો નિર્ણય અને સારવાર નોંધ',
        createDischarge: 'નવો ડિસ્ચાર્જ સારાંશ',
        scheduleFollowup: 'તપાસની તારીખ નક્કી કરો',
        orderInvestigation: 'લેબ ટેસ્ટ લખો',
        updateResult: 'રિપોર્ટ નોંધો'
      },
      pmjay: {
        title: 'આયુષ્માન ભારત PM-JAY પાત્રતા સહાય',
        disclaimer: 'આ ફક્ત માર્ગદર્શન છે, સત્તાવાર સરકારી નિર્ણય નથી. સત્તાવાર ગોલ્ડન કાર્ડ માટે હોસ્પિટલ કે ગ્રામ પંચાયત કેન્દ્રમાં સંપર્ક કરવો.',
        checkEligibility: 'પાત્રતા ચકાસો'
      }
    }
  }
};
