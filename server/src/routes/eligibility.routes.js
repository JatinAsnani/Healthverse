import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePatientAccess } from '../middleware/rbac.js';
import { SchemeEligibility, Patient } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

const DISCLAIMER_TEXT = 'This screening is guidance only and not an official government determination. For official enrollment and confirmation, visit your nearest Ayushman Mitra at any empaneled government/private hospital or Common Service Centre (CSC).';

/**
 * Helper: Rule-based PM-JAY eligibility screening algorithm
 */
export function evaluatePmjayEligibility(responses) {
  const {
    hasAyushmanCard,
    rationCardType,
    ruralDeprivationCriteria = [],
    urbanOccupationCriteria = [],
    isIncomeUnderThreshold,
    isGovernmentEmployeeOrTaxpayer
  } = responses;

  const reasons = [];
  const nextSteps = [];

  // Automatic disqualification criteria
  if (isGovernmentEmployeeOrTaxpayer) {
    reasons.push('Household includes a regular government employee or income taxpayer.');
    nextSteps.push('Check eligibility under state government health schemes or standard medical insurance.');
    return {
      result: 'not_eligible',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // 1. Existing Ayushman Golden Card
  if (hasAyushmanCard) {
    reasons.push('Patient is already registered with an active Ayushman Bharat Golden Card.');
    nextSteps.push('Present your Ayushman Card and Discharge Card at the hospital PM-JAY helpdesk.');
    nextSteps.push('Avail 15 days of covered post-hospitalization diagnostics and medicines free of cost.');
    return {
      result: 'likely_eligible',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // 2. NFSA / BPL / Antyodaya Ration Card
  if (['bpl_antyodaya', 'state_bpl', 'phh_priority'].includes(rationCardType)) {
    reasons.push('Household holds a qualifying BPL / Antyodaya / Priority Ration Card under NFSA.');
    nextSteps.push('Carry your original Ration Card and Aadhaar cards of all family members to nearest Ayushman Kendra / CSC.');
    nextSteps.push('Complete biometric e-KYC to generate your free PM-JAY Golden Card.');
    return {
      result: 'likely_eligible',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // 3. Rural SECC Deprivation Criteria
  if (ruralDeprivationCriteria && ruralDeprivationCriteria.length > 0) {
    reasons.push(`Household satisfies ${ruralDeprivationCriteria.length} rural SECC deprivation criterion (e.g. ${ruralDeprivationCriteria.join(', ')}).`);
    nextSteps.push('Visit the Taluka Development Office or Village Panchayat Ayushman camp with family Aadhaar cards.');
    nextSteps.push('Ask the Ayushman Mitra to search your family in the SECC beneficiary database.');
    return {
      result: 'likely_eligible',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // 4. Urban Occupational Criteria
  if (urbanOccupationCriteria && urbanOccupationCriteria.length > 0) {
    reasons.push(`Occupation falls under qualifying informal worker categories (${urbanOccupationCriteria.join(', ')}).`);
    nextSteps.push('Visit nearest Urban Primary Health Centre (UPHC) or District Hospital Ayushman desk.');
    nextSteps.push('Carry e-Shram card, labor registration, and Aadhaar for verification.');
    return {
      result: 'likely_eligible',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // 5. Low Income but lacks documented card
  if (isIncomeUnderThreshold) {
    reasons.push('Household income is below the state economic threshold, but standard scheme documentation requires verification.');
    nextSteps.push('Obtain an Income Certificate from the Taluka Tehsildar / Revenue office.');
    nextSteps.push('Apply for a state BPL/PHH ration card at the local food and civil supplies office.');
    return {
      result: 'needs_verification',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER_TEXT
    };
  }

  // Default: Not eligible
  reasons.push('Does not meet current auto-inclusion criteria or SECC deprivation parameters.');
  nextSteps.push('Consult your local Community Health Worker (ASHA) for alternative state relief or charitable trust assistance.');
  return {
    result: 'not_eligible',
    reasons,
    nextSteps,
    disclaimer: DISCLAIMER_TEXT
  };
}

/**
 * @route POST /api/v1/eligibility/screen
 * @desc Submit PM-JAY eligibility questionnaire and receive rule-based assessment
 */
router.post(
  '/screen',
  authenticate,
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('responses').isObject().withMessage('Questionnaire responses must be provided')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { patientId, responses } = req.body;
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const evaluation = evaluatePmjayEligibility(responses);

      const record = await SchemeEligibility.create({
        patient: patient._id,
        scheme: 'PM-JAY',
        result: evaluation.result,
        reasons: evaluation.reasons,
        questionnaireResponses: responses,
        nextSteps: evaluation.nextSteps,
        checkedBy: req.user._id,
        checkedAt: new Date()
      });

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'SchemeEligibility',
        resourceId: record._id,
        patientId: patient._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `PM-JAY screening completed: Result '${evaluation.result}'`
      });

      res.status(201).json({
        success: true,
        message: 'PM-JAY eligibility screening evaluated',
        data: {
          result: evaluation.result,
          reasons: evaluation.reasons,
          nextSteps: evaluation.nextSteps,
          disclaimer: evaluation.disclaimer,
          checkedAt: record.checkedAt,
          id: record._id
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /api/v1/eligibility/patient/:patientId
 * @desc Get previous scheme eligibility checks for a patient
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const records = await SchemeEligibility.find({ patient: req.targetPatient._id })
      .populate('checkedBy', 'role phone')
      .sort({ checkedAt: -1 });

    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    next(err);
  }
});

export default router;
