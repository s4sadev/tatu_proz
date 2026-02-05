const express = require('express')
const multer = require('multer')
const portfolioController = require('../controllers/portfolioController')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// Config multer for memory storage
const upload = multer({ storage: multer.memoryStorage() })

// Public routes
router.get('/get', portfolioController.getPortfolio)

// Protected routes (admin only)
router.post('/upload', authMiddleware, upload.single('image'), portfolioController.uploadPortfolioImage)
router.delete('/:id', authMiddleware, portfolioController.deletePortfolioImage)

module.exports = router