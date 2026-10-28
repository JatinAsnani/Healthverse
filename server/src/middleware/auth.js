import { verifyAccessToken, verifyRefreshToken, generateTokens, cookieOptions } from '../utils/token.js';
import { User, Staff, Patient, Caregiver } from '../models/index.js';

export async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    let decoded = token ? verifyAccessToken(token) : null;

    // Seamless refresh attempt if access token is expired or absent, but refresh token is present
    if (!decoded) {
      const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];
      if (refreshToken) {
        const refreshDecoded = verifyRefreshToken(refreshToken);
        if (refreshDecoded) {
          const user = await User.findById(refreshDecoded.id);
          if (user && user.active) {
            const tokens = generateTokens({
              id: user._id.toString(),
              role: user.role,
              phone: user.phone,
              language: user.language
            });

            res.cookie('accessToken', tokens.accessToken, {
              ...cookieOptions,
              maxAge: 15 * 60 * 1000 // 15m
            });
            res.cookie('refreshToken', tokens.refreshToken, {
              ...cookieOptions,
              maxAge: 7 * 24 * 60 * 60 * 1000 // 7d
            });

            decoded = { id: user._id.toString(), role: user.role };
          }
        }
      }
    }

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'User account is invalid or deactivated.'
      });
    }

    req.user = user;

    // Load corresponding profile
    if (['doctor', 'nurse', 'chw', 'hospital_admin'].includes(user.role)) {
      req.staff = await Staff.findOne({ user: user._id }).populate('hospital');
    } else if (user.role === 'patient') {
      req.patient = await Patient.findOne({ user: user._id }).populate('hospital');
    } else if (user.role === 'caregiver') {
      req.caregiver = await Caregiver.findOne({ user: user._id });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Authentication error: ${error.message}`
    });
  }
}

export default authenticate;
