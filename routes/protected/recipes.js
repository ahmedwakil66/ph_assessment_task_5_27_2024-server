const express = require('express');
const { verifyJWT, recipeDataSendOnlyToValidViewer } = require('../../middlewares');
const { client, connect } = require('../../db');
const { ObjectId } = require('mongodb');
const router = express.Router();

// JWT verification middleware
router.use((req, res, next) => {
    verifyJWT(req, res, next)
})

// Send recipe data route handler With API protection middleware
// That allows sending data only to the creator/purchaser of the recipes
router.get('/:recipeId', recipeDataSendOnlyToValidViewer, async (req, res, next) => {
    try {
        const recipeId = req.params.recipeId;
        const { recipeCollection } = await connect();
        const recipe = await recipeCollection.findOne({ _id: new ObjectId(recipeId) });
        if (!recipe) throw new Error('Recipe does not exist.');
        return res.send(recipe);

    } catch (error) {
        next(error);
    }
})

// Purchase route handler
router.post('/purchase', async (req, res, next) => {
    const userId = req.decoded._id;
    const userEmail = req.decoded.email;
    const recipeId = req.body.recipeId;

    let recipePrice;
    let creatorId;

    try {// checking if user has enough coin for the purchase
        const { userCollection, recipeCollection } = await connect();
        const user = await userCollection.findOne({ _id: userId });
        const recipe = await recipeCollection.findOne({ _id: new ObjectId(recipeId) });

        recipePrice = recipe?.price || 10;

        if (!user || !recipe) {
            throw new Error('User or Recipe does not exists!')
        }
        if (user.coin < recipePrice) {
            throw new Error("Not enough coin!");
        }

        creatorId = recipe.creator_id;

    } catch (error) {
        return next(error);
    }

    const session = client.startSession();

    try {
        session.startTransaction();

        const userCollection = client.db('simply-recipes').collection('users');
        const recipeCollection = client.db('simply-recipes').collection('recipes');

        // reduce 10 coin from purchaser
        await userCollection.findOneAndUpdate(
            { _id: userId },
            { $inc: { coin: recipePrice * -1 } },
            { session }
        )

        // add 1 coin to creator
        await userCollection.findOneAndUpdate(
            { _id: creatorId },
            { $inc: { coin: 1 } },
            { session }
        )

        // update recipe purchase_by and watch_count
        await recipeCollection.findOneAndUpdate(
            { _id: new ObjectId(recipeId) },
            {
                $addToSet: { purchased_by: userEmail },
                $inc: { watch_count: 1 }
            },
            { session }
        )

        await session.commitTransaction();

    } catch (error) {
        console.log('purchase transaction error: ' + error.message);
        await session.abortTransaction();
        return next(error);

    } finally {
        await session.endSession();
    }

    return res.send({ message: 'success', success: true });
})

module.exports = router;