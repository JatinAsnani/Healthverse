import { Router } from 'express';
import { processAIChat } from '../services/aiChatService.js';
import { verifyAccessToken, verifyRefreshToken } from '../utils/token.js';
import { User, Staff, Patient, Caregiver, Discharge } from '../models/index.js';

const router = Router();

/**
 * Optional authentication middleware - reliably attaches user/patient/staff if present without rejecting guests
 */
async function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    let decoded = token ? verifyAccessToken(token) : null;

    if (!decoded) {
      const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
      if (refreshToken) {
        decoded = verifyRefreshToken(refreshToken);
      }
    }

    if (decoded?.id) {
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user && user.active) {
        req.user = user;
        if (user.role === 'patient') {
          req.patient = await Patient.findOne({ user: user._id }).populate('hospital');
        } else if (user.role === 'caregiver') {
          req.caregiver = await Caregiver.findOne({ user: user._id });
        } else if (['doctor', 'nurse', 'chw', 'hospital_admin'].includes(user.role)) {
          req.staff = await Staff.findOne({ user: user._id }).populate('hospital');
        }
      }
    }
  } catch (err) {
    // Non-blocking for optional auth
  }
  next();
}

/**
 * @swagger
 * /api/v1/ai/status:
 *   get:
 *     summary: Check AI service configuration status
 *     tags: [AI Assistant]
 */
router.get('/status', (req, res) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);

  res.json({
    hasServerApiKey: hasGemini || hasOpenAI,
    defaultProvider: hasGemini ? 'gemini' : hasOpenAI ? 'openai' : 'none',
    supportedProviders: ['gemini', 'openai'],
    safetyNotice: 'The AI is a decision-support and early-warning tool only. It never diagnoses or prescribes.'
  });
});

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: Interact with HealthVerse AI Health Assistant
 *     tags: [AI Assistant]
 */
router.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    const { message, history, apiKey, provider, context = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    // Retrieve active doctors for context
    const doctors = await Staff.find({ role: 'doctor', active: true })
      .select('name specialization phone');

    // Resolve patient details
    let resolvedPatient = req.patient;
    if (!resolvedPatient && context.patientId) {
      resolvedPatient = await Patient.findById(context.patientId).populate('hospital');
    }
    if (!resolvedPatient && req.user?.role === 'patient') {
      resolvedPatient = await Patient.findOne({ user: req.user._id }).populate('hospital');
    }

    let patientName = resolvedPatient?.name || context.patientName || context.userName;
    let patientCode = resolvedPatient?.patientId || context.patientCode;
    let patientId = resolvedPatient?._id?.toString() || context.patientId;
    let diagnosis = context.diagnosis;

    if (resolvedPatient && !diagnosis) {
      const latestDischarge = await Discharge.findOne({ patient: resolvedPatient._id }).sort({ dischargeDate: -1 });
      diagnosis = latestDischarge?.diagnosis || resolvedPatient.medicalHistory?.[0] || 'Post-discharge recovery';
    }

    // Merge session context if user is logged in
    const sessionContext = {
      ...context,
      role: req.user?.role || context.role || 'patient',
      userName: patientName,
      patientName: patientName,
      patientCode: patientCode,
      patientId: patientId,
      diagnosis: diagnosis,
      doctors: doctors.map(d => ({
        id: d._id.toString(),
        name: d.name,
        specialization: d.specialization
      }))
    };

    // Client can also pass apiKey in header x-ai-api-key
    const clientKey = apiKey || req.headers['x-ai-api-key'];

    const result = await processAIChat({
      message,
      history: Array.isArray(history) ? history : [],
      apiKey: clientKey,
      provider: provider || 'gemini',
      context: sessionContext
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
