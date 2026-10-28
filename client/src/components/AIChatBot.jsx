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
import useAuthStore from '../store/useAuthStore';

export const AIChatBot = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

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
          patientId: bookingInfo?.patientId || undefined,
          scheduledAt: isoDate,
          type: bookingType,
          notes: 'Appointment booked directly via HealthVerse AI Assistant'
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
          date: bookingDate,
          time: bookingTime,
          type: bookingType
        }
      }));

      // Append assistant confirmation message
      const confirmMsg = {
        id: `ai-confirm-${Date.now()}`,
        sender: 'assistant',
        text: `🎉 **Appointment Successfully Confirmed!**\n\n- **Doctor:** ${doctorName}\n- **Date:** ${new Date(isoDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- **Time:** ${bookingTime}\n- **Mode:** ${bookingType === 'in_person' ? 'Hospital Visit' : 'Telephonic Consultation'}\n\nYour clinical team has been notified. You can review and manage this in your **Patient Follow-up Schedule**.`,
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
            role: user?.role,
            userName: user?.name,
            language: user?.preferredLanguage || 'en',
            doctors: doctorsList
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

      if (data.appointmentBooking?.defaultDoctorId) {
        setBookingDocId(data.appointmentBooking.defaultDoctorId);
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
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open HealthVerse AI Health Assistant"
          className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-teal-500/30"
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
        <div className="fixed bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[440px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
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
                      <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-xs pb-1 border-b border-teal-200/60 dark:border-teal-900/60">
                        <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Book Doctor Appointment</span>
                      </div>

                      {bookedAppointments[m.id] ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="font-bold">Appointment Confirmed!</p>
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
