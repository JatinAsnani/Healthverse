export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'HealthVerse API Documentation',
    version: '1.0.0',
    description: 'API documentation for HealthVerse: AI-assisted continuity-of-care platform for hospital discharge in rural/low-connectivity environments.\n\n**SAFETY PRINCIPLE**: The AI is a decision-support and early-warning tool only. It never diagnoses or prescribes. Every high or critical alert must be reviewed by a qualified clinician.',
    contact: {
      name: 'HealthVerse Clinical Engineering',
      email: 'support@healthverse.local'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Development Server'
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken'
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    { cookieAuth: [] },
    { bearerAuth: [] }
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login with phone/email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'password'],
                properties: {
                  identifier: { type: 'string', example: '9800000002' },
                  password: { type: 'string', example: 'password123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Successful login with JWT cookies and user profile' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register new patient or caregiver',
        tags: ['Authentication'],
        responses: {
          201: { description: 'Registered successfully' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Profile returned' }
        }
      }
    },
    '/patients': {
      get: {
        summary: 'Get scoped patient list by role',
        tags: ['Patients'],
        responses: {
          200: { description: 'Patient list with latest risk & open alerts' }
        }
      },
      post: {
        summary: 'Register new patient with consent capture',
        tags: ['Patients'],
        responses: {
          201: { description: 'Patient registered successfully' }
        }
      }
    },
    '/patients/{id}': {
      get: {
        summary: 'Get complete clinical chart and timeline for a patient',
        tags: ['Patients'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Full clinical history' }
        }
      }
    },
    '/discharges': {
      post: {
        summary: 'Create discharge summary with initial prescriptions and follow-ups',
        tags: ['Discharges'],
        responses: {
          201: { description: 'Discharge created' }
        }
      }
    },
    '/adherence': {
      post: {
        summary: 'Log medication dose (taken/missed/skipped)',
        tags: ['Adherence'],
        responses: {
          201: { description: 'Dose logged and risk checked' }
        }
      }
    },
    '/symptoms': {
      post: {
        summary: 'Report symptoms and vitals with immediate risk assessment',
        tags: ['Symptoms & Risk'],
        responses: {
          201: { description: 'Symptom report logged and risk evaluated' }
        }
      }
    },
    '/alerts': {
      get: {
        summary: 'Get clinician alert inbox for hospital',
        tags: ['Alerts & Escalations'],
        responses: {
          200: { description: 'Alerts list' }
        }
      }
    },
    '/alerts/{id}/acknowledge': {
      patch: {
        summary: 'Acknowledge an alert',
        tags: ['Alerts & Escalations'],
        responses: {
          200: { description: 'Alert acknowledged' }
        }
      }
    },
    '/alerts/{id}/resolve': {
      patch: {
        summary: 'Resolve alert with clinician decision notes',
        tags: ['Alerts & Escalations'],
        responses: {
          200: { description: 'Alert resolved' }
        }
      }
    },
    '/sync': {
      post: {
        summary: 'Batch sync endpoint for offline IndexedDB records',
        tags: ['Offline Sync'],
        responses: {
          200: { description: 'Per-record sync and conflict outcomes' }
        }
      }
    },
    '/eligibility/screen': {
      post: {
        summary: 'Screen for PM-JAY eligibility questionnaire',
        tags: ['Scheme Eligibility'],
        responses: {
          201: { description: 'Eligibility guidance with reasons and next steps' }
        }
      }
    },
    '/consent': {
      post: {
        summary: 'Grant patient consent for healthcare purpose',
        tags: ['Consent & DPDP'],
        responses: {
          201: { description: 'Consent recorded' }
        }
      }
    },
    '/consent/{id}/revoke': {
      post: {
        summary: 'Revoke consent (DPDP Act Right to Withdraw)',
        tags: ['Consent & DPDP'],
        responses: {
          200: { description: 'Consent revoked' }
        }
      }
    },
    '/education': {
      get: {
        summary: 'Get multilingual health education articles (EN, HI, GU)',
        tags: ['Education Library'],
        responses: {
          200: { description: 'Articles list' }
        }
      }
    },
    '/admin/analytics': {
      get: {
        summary: 'Hospital admin analytics dashboard metrics',
        tags: ['Hospital Admin'],
        responses: {
          200: { description: 'Analytics data' }
        }
      }
    }
  }
};

export default swaggerSpec;
