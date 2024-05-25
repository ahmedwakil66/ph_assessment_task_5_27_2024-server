const jwt = require('jsonwebtoken');
const { connect } = require('./db');
const { ObjectId } = require('mongodb');

//verify jwt token
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.send({ error: true, status: 401, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.send({ error: true, status: 401, message: 'unauthorized request detected' })
        }
        else {
            req.decoded = decoded;
            next();
        }
    })
};

// API protection middleware
// Allow sending data only to the purchasers of the recipes
const recipeDataSendOnlyToValidViewer = async (req, res, next) => {
    try {
        const viewerId = req.decoded._id;
        const viewerEmail = req.decoded.email;
        const recipeId = req.params.recipeId;

        const { recipeCollection } = await connect();
        const recipe = await recipeCollection.findOne(
            { _id: new ObjectId(recipeId) },
            { projection: { purchased_by: 1, creator_id: 1 } }
        );

        if (!recipe) throw new Error('Recipe does not exist.');

        const validViewer = recipe.creator_id === viewerId || recipe.purchased_by.indexOf(viewerEmail) !== -1;
        if (validViewer) return next();

        throw new Error('You must first purchase this recipe to view its details.');

    } catch (error) {
        console.log('recipeDataSendOnlyToValidViewer middleware error: ', error.message);
        next(error);
    }
}

module.exports = {
    verifyJWT,
    recipeDataSendOnlyToValidViewer
}