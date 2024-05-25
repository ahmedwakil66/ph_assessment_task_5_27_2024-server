const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { connect } = require('../db');
const { ObjectId } = require('mongodb');

// save user info in database if first timer
// send a jwt signed signature
// send user information
router.post('/', async (req, res) => {
    const user = req.body;

    if (!user || !user.email || !user.uid) {
        res.send({ error: true, message: 'provide the email address of the user' });
        return;
    }

    let userInfo = {};
    const { userCollection } = await connect();

    try {
        const result = await userCollection.findOne({ email: user.email });

        if (!result) {
            const doc = {
                _id: user.uid,
                email: user.email,
                photoURL: user.photoURL || '',
                displayName: user.displayName,
                coin: 50,
            }
            const writeResult = await userCollection.insertOne(doc)
            userInfo = {
                ...doc,
                _id: writeResult.insertedId.toString()
            }

        } else {
            userInfo = {
                ...result,
                _id: result._id.toString()
            }
        }

    } catch (error) {
        const result = await userCollection.findOne({ email: user.email });
        userInfo = {
            ...result,
            _id: result?._id.toString()
        }
    }

    const token = jwt.sign({ email: user.email, _id: userInfo._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({ token, userInfo })
})

module.exports = router;