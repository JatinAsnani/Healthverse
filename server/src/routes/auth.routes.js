import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { User, Staff, Patient, Caregiver, Hospital } from '../models/index.js';
import { generateTokens, cookieOptions } from '../utils/token.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route POST /api/v1/auth/login
 * @desc Login user with phone/email and password
 */
router.post(
  '/login',
  authLimiter,
  [
    body('identifier').notEmpty().withMessage('Phone or email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { identifier, password } = req.body;
      const cleanIdentifier = identifier.trim().toLowerCase();

      // Find user by phone or email
      const user = await User.findOne({
        $or: [
          { phone: identifier.trim() },
          { email: cleanIdentifier }
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your phone/email and password.'
        });
      }

      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact your hospital administrator.'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your phone/email and password.'
        });
      }

      // Generate JWTs
      const tokens = generateTokens({
        id: user._id.toString(),
        role: user.role,
        phone: user.phone,
        language: user.language
      });

      // Set httpOnly cookies
      res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 mins
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Fetch profile
      let profile = null;
      if (['doctor', 'nurse', 'chw', 'hospital_admin'].includes(user.role)) {
        profile = await Staff.findOne({ user: user._id }).populate('hospital', 'name facilityCode address');
      } else if (user.role === 'patient') {
        profile = await Patient.findOne({ user: user._id }).populate('hospital', 'name facilityCode');
      } else if (user.role === 'caregiver') {
        profile = await Caregiver.findOne({ user: user._id });
      }

      await logAuditEvent({
        userId: user._id,
        action: 'read',
        resourceType: 'Patient',
        resourceId: profile?._id,
        patientId: user.role === 'patient' ? profile?._id : undefined,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `User logged in successfully with role '${user.role}'`
      });

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          role: user.role,
          language: user.language
        },
        profile,
        token: tokens.accessToken // Returned for convenience in offline/header authorization
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /api/v1/auth/register
 * @desc Self-registration for patient or caregiver
 */
router.post(
  '/register',
  [
    body('phone').trim().notEmpty().withMessage('Valid phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['patient', 'caregiver']).withMessage('Role must be patient or caregiver'),
    body('name').trim().notEmpty().withMessage('Full name is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { phone, password, role, name, email, language = 'en', hospitalId, dob, gender, address } = req.body;

      const existingUser = await User.findOne({ phone: phone.trim() });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this phone number already exists.'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        phone: phone.trim(),
        email: email ? email.trim().toLowerCase() : undefined,
        passwordHash,
        role,
        language
      });

      let profile = null;
      if (role === 'patient') {
        let assignedHospital = hospitalId;
        if (!assignedHospital) {
          const firstHospital = await Hospital.findOne();
          assignedHospital = firstHospital?._id;
        }

        const patientId = `HV-${Date.now().toString().slice(-6)}`;
        profile = await Patient.create({
          user: user._id,
          hospital: assignedHospital,
          patientId,
          name,
          dob: dob || new Date('1990-01-01'),
          gender: gender || 'other',
          language,
          phone: phone.trim(),
          address: address || 'Rural District, Sector 4'
        });
      } else if (role === 'caregiver') {
        profile = await Caregiver.create({
          user: user._id,
          name,
          phone: phone.trim(),
          language
        });
      }

      const tokens = generateTokens({
        id: user._id.toString(),
        role: user.role,
        phone: user.phone,
        language: user.language
      });

      res.cookie('accessToken', tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
      res.cookie('refreshToken', tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          role: user.role,
          language: user.language
        },
        profile,
        token: tokens.accessToken
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Clear auth cookies
 */
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get currently logged-in user profile
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
      language: req.user.language
    },
    profile: req.staff || req.patient || req.caregiver
  });
});

/**
 * @route PATCH /api/v1/auth/language
 * @desc Update preferred language (en, hi, gu)
 */
router.patch('/language', authenticate, async (req, res, next) => {
  try {
    const { language } = req.body;
    if (!['en', 'hi', 'gu'].includes(language)) {
      return res.status(400).json({ success: false, message: 'Invalid language. Choose en, hi, or gu.' });
    }

    req.user.language = language;
    await req.user.save();

    if (req.patient) {
      req.patient.language = language;
      await req.patient.save();
    } else if (req.caregiver) {
      req.caregiver.language = language;
      await req.caregiver.save();
    }

    res.json({
      success: true,
      message: 'Language preference updated',
      language
    });
  } catch (err) {
    next(err);
  }
});

export default router;
