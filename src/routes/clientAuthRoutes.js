const express = require('express')
const router = express.Router()
const sql = require('../config/db')

const clientAuthController = require("../controllers/clientAuthController")
const authMiddleware = require("../controllers/authController").authMiddleware

router.post('/check-phone', clientAuthController.checkPhone)
router.post('/register', clientAuthController.registerClient)
router.post('/login', clientAuthController.loginClient)
router.get('/me', authMiddleware, clientAuthController.getClientMe)

module.exports = router