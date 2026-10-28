import { Router } from 'express';
import { processAIChat } from '../services/aiChatService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Optional authentication middleware - attaches user if present without rejecting guests
 */
function optionalAuth(req, res, next) {
  const token = req.cookies?.hv_token || req.headers.authorization?.split(' ')[1];
  if (!token) return next();

  try {
    const jwt = req.app.get('jwt') || null;
    // Handled gracefully if auth middleware helper is used
    authenticate(req, res, () => next());
  } catch {
    next();
  }
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

    // Merge session context if user is logged in
    const sessionContext = {
      ...context,
      role: req.user?.role || context.role,
      userName: req.user?.name || context.userName
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
