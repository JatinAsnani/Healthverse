import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import logger from './config/logger.js';
import swaggerSpec from './config/swagger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import initializeScheduler from './services/scheduler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import dischargeRoutes from './routes/discharge.routes.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import adherenceRoutes from './routes/adherence.routes.js';
import followupRoutes from './routes/followup.routes.js';
import investigationRoutes from './routes/investigation.routes.js';
import symptomRoutes from './routes/symptom.routes.js';
import alertRoutes from './routes/alert.routes.js';
import syncRoutes from './routes/sync.routes.js';
import consentRoutes from './routes/consent.routes.js';
import eligibilityRoutes from './routes/eligibility.routes.js';
import educationRoutes from './routes/education.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import aiRoutes from './routes/ai.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allow Swagger UI and API assets
}));

const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all dev origins for offline testing
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all /api/v1 routes
app.use('/api/v1', apiLimiter);

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'HealthVerse API Server is live and running',
    version: '1.0.0',
    health: '/health',
    docs: '/api/docs'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'HealthVerse Continuity-of-Care API',
    safetyNotice: 'The AI is a decision-support and early-warning tool only. It never diagnoses or prescribes. Every high or critical alert must be reviewed by a qualified clinician.'
  });
});

// Swagger Documentation at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'HealthVerse API Docs',
  customCss: '.swagger-ui .topbar { display: none }'
}));

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/discharges', dischargeRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/adherence', adherenceRoutes);
app.use('/api/v1/followups', followupRoutes);
app.use('/api/v1/investigations', investigationRoutes);
app.use('/api/v1/symptoms', symptomRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/consent', consentRoutes);
app.use('/api/v1/eligibility', eligibilityRoutes);
app.use('/api/v1/education', educationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/ai', aiRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Start Server
async function startServer() {
  await connectDB();
  initializeScheduler();

  const server = app.listen(PORT, () => {
    logger.info(`=======================================================`);
    logger.info(`🚀 HealthVerse API Server running on port ${PORT}`);
    logger.info(`📖 OpenAPI/Swagger Documentation: http://localhost:${PORT}/api/docs`);
    logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
    logger.info(`=======================================================`);
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
