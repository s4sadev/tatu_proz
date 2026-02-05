const express = require('express')
const router = express.Router()
const sql = require('../config/db')

const authController = require("../controllers/authController")
const authMiddleware = authController.authMiddleware

router.post('/register', authController.createRegister)
router.post('/login', authController.authLogin)
router.get('/me', authMiddleware, authController.authMe)
router.post('/forgot-password', authController.forgotPassword)
module.exports = router
