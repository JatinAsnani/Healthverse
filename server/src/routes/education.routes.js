import express from 'express';
import { EducationContent } from '../models/index.js';

const router = express.Router();

/**
 * @route GET /api/v1/education
 * @desc Get multilingual education articles filtered by language and topic
 */
router.get('/', async (req, res, next) => {
  try {
    const { language = 'en', topic } = req.query;
    const filter = {};

    if (['en', 'hi', 'gu'].includes(language)) {
      filter.language = language;
    } else {
      filter.language = 'en';
    }

    if (topic && topic !== 'all') {
      filter.topic = topic;
    }

    let articles = await EducationContent.find(filter).sort({ topic: 1 });

    // Fallback to English if no articles found for this language
    if (articles.length === 0 && filter.language !== 'en') {
      articles = await EducationContent.find({ ...filter, language: 'en' });
    }

    res.json({
      success: true,
      language: filter.language,
      count: articles.length,
      data: articles
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/v1/education/:id
 * @desc Get single article details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const article = await EducationContent.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    res.json({ success: true, data: article });
  } catch (err) {
    next(err);
  }
});

export default router;
