const express = require('express');
const { verifyJWT } = require('../../middlewares');
const router = express.Router();

router.use((req, res, next) => {
    verifyJWT(req, res, next)
})

router.get('/', async (req, res) => {
    res.send({ message: 'success' })
})

module.exports = router;