import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  Send,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore.js';

// Helper to extract appointment date/time from natural language in English, Hindi & Hinglish
function extractDateFromText(text = '') {
  const lower = text.toLowerCase();
  const now = new Date();
  let targetDate = null;
  let targetTime = null;
  let targetType = null;

  if (lower.includes('parso') || lower.includes('parson') || lower.includes('day after tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    targetDate = d.toISOString().split('T')[0];
  } else if (lower.includes('kal') || lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    targetDate = d.toISOString().split('T')[0];
  } else if (lower.includes('aaj') || lower.includes('today')) {
    targetDate = now.toISOString().split('T')[0];
  }

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
      targetDate = `${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else if (monthDayMatch) {
    const month = monthsMap[monthDayMatch[1].slice(0, 3)];
    const day = parseInt(monthDayMatch[2], 10);
    if (month && day >= 1 && day <= 31) {
      targetDate = `${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  } else if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = slashMatch[3] ? (slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3], 10) : parseInt(slashMatch[3], 10)) : now.getFullYear();
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const tarikhMatch = lower.match(/\b(\d{1,2})\s*(?:tarikh|tareekh|taarikh|तारीख|તારીખ)\b/i);
  if (tarikhMatch && !targetDate) {
    const day = parseInt(tarikhMatch[1], 10);
    if (day >= 1 && day <= 31) {
      let month = now.getMonth() + 1;
      if (day < now.getDate()) month += 1;
      targetDate = `${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

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
    if (unit === 'pm') meridiem = 'PM';
    else if (unit === 'am') meridiem = 'AM';
    else if (unit === 'baje' || unit === 'बजे') meridiem = (hour < 8 || hour === 12) ? 'PM' : 'AM';
    targetTime = `${String(hour).padStart(2, '0')}:${min} ${meridiem}`;
  } else if (colonTimeMatch) {
    let hour = parseInt(colonTimeMatch[1], 10);
    let min = colonTimeMatch[2];
    let meridiem = hour < 8 ? 'PM' : 'AM';
    targetTime = `${String(hour).padStart(2, '0')}:${min} ${meridiem}`;
  }

  if (lower.includes('phone') || lower.includes('call') || lower.includes('telephonic') || lower.includes('ghar se') || lower.includes('online')) {
    targetType = 'telephonic';
  } else if (lower.includes('hospital') || lower.includes('visit') || lower.includes('clinic') || lower.includes('aakar') || lower.includes('aake')) {
    targetType = 'in_person';
  }

  return { targetDate, targetTime, targetType };
}

export const AIChatBot = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `👋 **Namaste! I am your HealthVerse AI Health Assistant.**\n\nI can assist you with:\n- 📅 **Directly booking doctor appointments** with Dr. Ananya Sharma or Dr. Vikram Mehta\n- Understanding post-discharge recovery precautions\n- Explaining your medications & adherence importance\n- Checking PM-JAY (Ayushman Bharat) eligibility & required documents\n- Symptom triage guidance & warning signs\n\n*How can I help you today?*`,
      suggestedActions: [
        { label: '📅 Book Appointment', action: 'book_appointment' },
        { label: '📋 Check PM-JAY', path: '/pmjay' },
        { label: '📝 Report Symptoms', path: '/symptoms/report' }
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Personalize welcome greeting when patient profile is loaded
  useEffect(() => {
    if (profile?.name) {
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'init-1') {
          return [
            {
              ...prev[0],
              text: `👋 **Namaste ${profile.name}! I am your HealthVerse AI Health Assistant.**\n\nI have loaded your patient profile (**${profile.patientId || 'Verified Patient'}**${profile.medicalHistory?.[0] ? ` • *${profile.medicalHistory[0]}*` : ''}).\n\nI can assist you with:\n- 📅 **Directly booking doctor appointments** with Dr. Ananya Sharma or Dr. Vikram Mehta\n- Understanding post-discharge recovery precautions\n- Explaining your medications & adherence importance\n- Checking PM-JAY (Ayushman Bharat) eligibility & required documents\n- Symptom triage guidance & warning signs\n\n*How can I help you today, ${profile.name.split(' ')[0]} ji?*`
            }
          ];
        }
        return prev;
      });
    }
  }, [profile?.name]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Appointment Booking State
  const [doctorsList, setDoctorsList] = useState([
    { _id: '6ae19a8e4da8f1c7c8827f9a', name: 'Dr. Ananya Sharma', specialization: 'Internal Medicine' },
    { _id: '6ae19a8e4da8f1c7c8827f9e', name: 'Dr. Vikram Mehta', specialization: 'General Surgery & Critical Care' }
  ]);
  const [bookingDocId, setBookingDocId] = useState('6ae19a8e4da8f1c7c8827f9a');
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [bookingTime, setBookingTime] = useState('10:30 AM');
  const [bookingType, setBookingType] = useState('in_person');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookedAppointments, setBookedAppointments] = useState({});

  // Audio / Speech State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setSpeechSupported(true);
    }

    // Fetch active doctors from backend
    fetch('/api/v1/followups/doctors')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          setDoctorsList(json.data);
          if (!bookingDocId) {
            setBookingDocId(json.data[0]._id);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch active doctors:', err));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Voice Input (Speech-to-Text)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = user?.preferredLanguage === 'gu' ? 'gu-IN' : user?.preferredLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  // Text-to-Speech (Audio Playback)
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const clean = text
      .replace(/[#*`_-]/g, ' ')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;

    if (/[\u0A80-\u0AFF]/.test(text)) {
      utterance.lang = 'gu-IN';
    } else if (/[\u0900-\u097F]/.test(text)) {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleBookFromChat = async (messageId, bookingInfo) => {
    setIsBookingSubmitting(true);
    try {
      const selectedDocId = bookingDocId || bookingInfo?.defaultDoctorId || doctorsList[0]?._id;
      const targetPatientId = bookingInfo?.patientId || profile?._id || user?._id;
      const patientDisplayName = bookingInfo?.patientName || profile?.name || 'you';

      let timeStr = bookingTime;
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [timePart, meridiem] = timeStr.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        timeStr = `${String(hours).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:00`;
      }
      const isoDate = new Date(`${bookingDate}T${timeStr}`).toISOString();

      const res = await fetch('/api/v1/followups/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          doctorId: selectedDocId,
          patientId: targetPatientId,
          scheduledAt: isoDate,
          type: bookingType,
          notes: `Appointment booked directly via HealthVerse AI Assistant for ${patientDisplayName}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.errors?.[0]?.msg || 'Failed to schedule appointment');
      }

      const bookedDoctor = doctorsList.find((d) => (d._id || d.id) === selectedDocId);
      const doctorName = data.data?.staff?.name || bookedDoctor?.name || 'Assigned Doctor';

      setBookedAppointments((prev) => ({
        ...prev,
        [messageId]: {
          doctorName,
          patientName: patientDisplayName,
          date: bookingDate,
          time: bookingTime,
          type: bookingType
        }
      }));

      // Append assistant confirmation message
      const confirmMsg = {
        id: `ai-confirm-${Date.now()}`,
        sender: 'assistant',
        text: `🎉 **Appointment Confirmed for ${patientDisplayName}!**\n\n- **Patient:** ${patientDisplayName} (${bookingInfo?.patientCode || profile?.patientId || 'HV-PATIENT'})\n- **Doctor:** ${doctorName}\n- **Date:** ${new Date(isoDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- **Time:** ${bookingTime}\n- **Mode:** ${bookingType === 'in_person' ? 'Hospital Visit' : 'Telephonic Consultation'}\n\nYour clinical team has been notified. You can review and manage this in your **Patient Follow-up Schedule**.`,
        suggestedActions: [
          { label: '📅 View Patient Dashboard', path: '/patient' }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, confirmMsg]);
    } catch (err) {
      alert(`Booking Notice: ${err.message}`);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputMessage;
    if (!textToSend.trim() || isLoading) return;

    // Instantly detect user-specified appointment date/time/mode
    const localParsed = extractDateFromText(textToSend);
    if (localParsed.targetDate) {
      setBookingDate(localParsed.targetDate);
    }
    if (localParsed.targetTime) {
      setBookingTime(localParsed.targetTime);
    }
    if (localParsed.targetType) {
      setBookingType(localParsed.targetType);
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text
      }));

      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message: textToSend.trim(),
          history,
          context: {
            role: user?.role || 'patient',
            userName: profile?.name || user?.name || user?.phone,
            patientName: profile?.name,
            patientId: profile?._id,
            patientCode: profile?.patientId,
            diagnosis: profile?.medicalHistory?.[0] || profile?.diagnosis,
            language: user?.preferredLanguage || profile?.language || 'en',
            doctors: doctorsList,
            requestedDate: localParsed.targetDate || undefined,
            requestedTime: localParsed.targetTime || undefined,
            requestedType: localParsed.targetType || undefined
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        suggestedActions: data.suggestedActions || [],
        emergencyDetected: data.emergencyDetected || false,
        appointmentBooking: data.appointmentBooking || null,
        provider: data.provider || 'fallback',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      if (data.appointmentBooking) {
        if (data.appointmentBooking.defaultDoctorId) {
          setBookingDocId(data.appointmentBooking.defaultDoctorId);
        }
        if (data.appointmentBooking.requestedDate) {
          setBookingDate(data.appointmentBooking.requestedDate);
        }
        if (data.appointmentBooking.requestedTime) {
          setBookingTime(data.appointmentBooking.requestedTime);
        }
        if (data.appointmentBooking.requestedType) {
          setBookingType(data.appointmentBooking.requestedType);
        }
      }

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ I encountered a temporary connection issue. Please make sure the backend server is running.\n\n*For emergencies, call **108** immediately.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '💊 Medication help', prompt: 'Why is it dangerous to stop my heart and blood pressure medicines?' },
    { label: '📋 PM-JAY documents', prompt: 'What documents are required to apply for PM-JAY Ayushman Bharat?' },
    { label: '🩹 Wound care rules', prompt: 'What are the main rules for caring for my surgical wound at home?' },
    { label: '🚨 Chest pain emergency', prompt: 'I feel sudden chest heaviness and breathlessness. What should I do?' }
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open HealthVerse AI Health Assistant"
          className="relative group flex items-center gap-2 sm:gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-teal-500/30"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
          </div>
          <span className="font-bold text-xs tracking-wide">HealthVerse AI</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300 opacity-90 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Chat Window Flyout */}
      {isOpen && (
        <div className="fixed bottom-16 sm:bottom-20 left-2 right-2 sm:left-auto sm:right-6 w-auto sm:w-[440px] h-[calc(100dvh-80px)] sm:h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white p-3.5 sm:p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight">HealthVerse AI</h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-teal-100/90 font-medium">Continuity-of-Care & Clinical Triage Guide</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/70 px-3.5 py-2 border-b border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-amber-900 dark:text-amber-200 text-[11px] leading-tight">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              Decision-support aid only. <strong>For medical emergencies, call 108 immediately.</strong>
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 dark:bg-slate-950/80 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : m.emergencyDetected
                      ? 'bg-red-50 dark:bg-red-950/80 text-red-950 dark:text-red-200 border-2 border-red-500 dark:border-red-600 rounded-bl-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-150 border border-slate-200 dark:border-slate-700/80 rounded-bl-none text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div className="whitespace-pre-line prose-xs font-normal">
                    {m.text}
                  </div>

                  {/* Interactive Doctor Appointment Booking Card */}
                  {m.appointmentBooking && (
                    <div className="mt-3 p-3 rounded-xl bg-teal-50/90 dark:bg-slate-900 border border-teal-200 dark:border-teal-800/80 text-slate-800 dark:text-slate-100 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between pb-1 border-b border-teal-200/60 dark:border-teal-900/60">
                        <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-xs">
                          <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span>Book Doctor Appointment</span>
                        </div>
                        {(m.appointmentBooking.patientName || profile?.name) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                            Patient: {m.appointmentBooking.patientName || profile?.name}
                          </span>
                        )}
                      </div>

                      {bookedAppointments[m.id] ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="font-bold">Appointment Confirmed for {bookedAppointments[m.id].patientName || 'Patient'}!</p>
                            <p className="text-[11px] opacity-90">
                              With {bookedAppointments[m.id].doctorName} on {bookedAppointments[m.id].date} at {bookedAppointments[m.id].time} ({bookedAppointments[m.id].type === 'in_person' ? 'Hospital Visit' : 'Telephonic'})
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 text-[11px]">
                          {/* Doctor Selection */}
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Select Doctor:
                            </label>
                            <select
                              value={bookingDocId || m.appointmentBooking.defaultDoctorId || doctorsList[0]?._id}
                              onChange={(e) => setBookingDocId(e.target.value)}
                              className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 font-medium"
                            >
                              {(m.appointmentBooking.doctors || doctorsList).map((doc) => (
                                <option key={doc._id || doc.id} value={doc._id || doc.id}>
                                  {doc.name} &bull; {doc.specialization}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Date & Time Slot */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Date:
                              </label>
                              <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Time Slot:
                              </label>
                              <select
                                value={bookingTime}
                                onChange={(e) => setBookingTime(e.target.value)}
                                className="w-full p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-teal-500"
                              >
                                <option value="09:30 AM">09:30 AM</option>
                                <option value="10:30 AM">10:30 AM</option>
                                <option value="11:30 AM">11:30 AM</option>
                                <option value="02:00 PM">02:00 PM</option>
                                <option value="03:30 PM">03:30 PM</option>
                                <option value="05:00 PM">05:00 PM</option>
                              </select>
                            </div>
                          </div>

                          {/* Mode: In Person vs Telephonic */}
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Consultation Mode:
                            </label>
                            <div className="flex items-center gap-4 text-xs">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`booking-mode-${m.id}`}
                                  value="in_person"
                                  checked={bookingType === 'in_person'}
                                  onChange={() => setBookingType('in_person')}
                                  className="text-teal-600 focus:ring-teal-500"
                                />
                                <span>Hospital Visit</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`booking-mode-${m.id}`}
                                  value="telephonic"
                                  checked={bookingType === 'telephonic'}
                                  onChange={() => setBookingType('telephonic')}
                                  className="text-teal-600 focus:ring-teal-500"
                                />
                                <span>Telephonic Call</span>
                              </label>
                            </div>
                          </div>

                          {/* Submit Booking Button */}
                          <button
                            type="button"
                            disabled={isBookingSubmitting}
                            onClick={() => handleBookFromChat(m.id, m.appointmentBooking)}
                            className="w-full py-2 px-3 mt-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {isBookingSubmitting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Booking Appointment...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm & Schedule with Doctor</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions / Navigations triggered by AI */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-750 flex flex-wrap gap-1.5">
                      {m.suggestedActions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (act.action === 'book_appointment') {
                              handleSendMessage('I want to book an appointment with a doctor');
                            } else if (act.path) {
                              navigate(act.path);
                              setIsOpen(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800 flex items-center gap-1 transition-all"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Bottom Message Metadata: Timestamp & Voice Speaker */}
                  <div className={`mt-2 flex items-center justify-between text-[10px] ${m.sender === 'user' ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    <span>{m.timestamp}</span>
                    {m.sender === 'assistant' && speechSupported && (
                      <button
                        onClick={() => speakText(m.text)}
                        title="Listen to this message"
                        className="hover:text-teal-600 dark:hover:text-teal-400 p-0.5 rounded transition-colors"
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300 text-xs py-2 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600 dark:text-teal-400" />
                <span className="font-medium">HealthVerse AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-white dark:bg-slate-900 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 hover:text-teal-700 dark:hover:text-teal-300 text-slate-600 dark:text-slate-300 text-[10px] font-semibold transition-colors flex-shrink-0"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Section */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Ask anything about medicines, wound, PM-JAY, or symptoms..."
              className="flex-1 py-2.5 px-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600"
            />

            {/* Voice Dictation (Speech to Text) */}
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Listening... click to stop' : 'Speak message (Voice)'}
              className={`p-2.5 rounded-xl border transition-all ${
                isListening
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatBot;
