const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { connect } = require('../db');
const { ObjectId } = require('mongodb');

// Save user info in database if first timer
// Also send a jwt signed signature & user information
router.post('/', async (req, res, next) => {
    try {
        const user = req.body;

        if (!user || !user.email || !user.uid) {
            res.send({ error: true, message: 'provide the email address & firebase UID of the user' });
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
            // this is a workaround against race condition
            // have plan updating it with locking mechanism
            const result = await userCollection.findOne({ email: user.email });
            userInfo = {
                ...result,
                _id: result?._id.toString()
            }
        }

        const token = jwt.sign({ email: user.email, _id: userInfo._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token, userInfo });

    } catch (error) {
        next(error);
    }
})

module.exports = router;