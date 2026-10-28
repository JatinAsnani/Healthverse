import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { Notification } from '../models/index.js';

const router = express.Router();

/**
 * @route GET /api/v1/notifications
 * @desc Get user notifications (in-app alerts, dose reminders, escalation warnings)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      status: { $in: ['pending', 'sent'] }
    });

    res.json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route PATCH /api/v1/notifications/:id/read
 * @desc Mark a notification as read
 */
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.status = 'read';
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, message: 'Notification marked as read', data: notification });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/notifications/mark-all-read
 * @desc Mark all user notifications as read
 */
router.post('/mark-all-read', authenticate, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, status: { $in: ['pending', 'sent'] } },
      { $set: { status: 'read', readAt: new Date() } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
