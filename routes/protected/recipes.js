const express = require('express');
const { verifyJWT, recipeDataSendOnlyToValidViewer, upload } = require('../../middlewares');
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

// Add new recipe route handler
router.post('/add', upload.single('file'), async (req, res, next) => {
    const userId = req.decoded._id;
    const userEmail = req.decoded.email;

    const { name, description, youtube_embed, country, ingredients, cooking_method, category } = req.body;
    const file = req.file;
    // console.log({ body: req.body, file });

    // ImageBB API key
    const apiKey = process.env.IMGBB_API_KEY;

    // Convert file buffer to base64
    const base64Image = file.buffer.toString('base64');

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', base64Image);


    try {
        // upload image to imgBB
        const imgBBResponse = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const imgData = await imgBBResponse.json();

        // check successful image upload
        if (!imgData.success) throw new Error(`Image upload error: ${imgData?.error?.message}`);

        // build new recipe document
        const newRecipe = {
            creator_id: userId,
            creator_email: userEmail,
            purchased_by: [],
            watch_count: 0,
            price: 10,
            rating: 4,
            tags: [],
            image: imgData.data.display_url,
            name,
            description,
            youtube_embed,
            country,
            ingredients: JSON.parse(ingredients),
            cooking_method,
            category,
        }

        // add to mongodb recipe collection
        const { recipeCollection } = await connect();
        const writeResult = await recipeCollection.insertOne(newRecipe);

        // finally send a response
        if (writeResult.insertedId) {
            return res.send({ success: true, insertedId: writeResult.insertedId })
        }

        throw new Error('Failed to write to database. Please try again later.')

    } catch (error) {
        console.log('Add recipe error: ', error.message);
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