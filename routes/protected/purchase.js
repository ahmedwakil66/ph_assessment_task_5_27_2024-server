const express = require('express');
const { verifyJWT } = require('../../middlewares');
const { connect, client } = require('../../db');
const router = express.Router();

// JWT verification middleware
router.use((req, res, next) => {
    verifyJWT(req, res, next)
})

// Purchase coin
router.post('/coin', async (req, res, next) => {
    try {
        const userId = req.decoded._id;
        const package = req.body.package; console.log('body', req.body, req.body.package);
        // package 'base' => 100 coin for $1
        // package 'standard' => 500 coin for $5
        // package 'premium' => 1000 coin for $10
        const coins = package === 'base' ? 100 : package === 'standard' ? 500 : 1000;
        const price = package === 'base' ? 1 : package === 'standard' ? 5 : 10;

        if (!package) throw new Error('A package must be mentioned. Available are- base, standard or premium.')

        const { userCollection } = await connect();
        const result = await userCollection.updateOne(
            { _id: userId },
            { $inc: { coin: coins } }
        )

        if (result.modifiedCount > 0) {
            return res.send({ 
                success: true, 
                message: `${coins} Coins added successfully! You have been charged $${price}.`, 
                amountInserted: coins, 
                priceDeducted: price,
            });
        }
        throw new Error('Could not purchase, please try again later.');

    } catch (error) {
        console.log('Purchase coin error: ', error.message);
        next(error);
    }


})

// Purchase recipe
router.post('/recipe', async (req, res, next) => {
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