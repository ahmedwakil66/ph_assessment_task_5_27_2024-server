const express = require('express');
const router = express.Router();
const { connect } = require('../db');
const QueryString = require('qs');
const { updateRegexName, pagination } = require('../utils');

// send all recipes data
router.get('/:qs', async (req, res, next) => {
    try {
        let query = {}; // send all recipes when empty query
        const qs = req.params.qs;

        if (qs !== 'all-recipes') { // send recipes that match the query
            query = QueryString.parse(qs);
            updateRegexName(query); // allows search recipes by name
        }

        // implement pagination. accepts page & perPage as search params
        const { skip, limit } = pagination(req.query);

        const { recipeCollection } = await connect();
        const total = await recipeCollection.countDocuments(query);
        const cursor = recipeCollection
            .find(
                query,
                { skip }
            )
            .limit(limit)
            .project({
                name: 1,
                image: 1,
                purchased_by: 1,
                creator_email: 1,
                country: 1
            })
        const recipes = [];
        for await (const doc of cursor) {
            recipes.push(doc);
        }

        return res.send({ recipes, meta: { total } })

    } catch (error) {
        next(error);
    }
})

//send all recipes for a specific category
router.get('/categories/:category', async (req, res, next) => {
    try {
        const category = req.params.category;
        const { recipeCollection } = await connect();
        const cursor = recipeCollection.find({ category }).project({
            name: 1,
            image: 1,
            purchased_by: 1,
            creator_email: 1,
            country: 1
        })
        const recipes = [];
        for await (const doc of cursor) {
            recipes.push(doc);
        }
        return res.send(recipes);

    } catch (error) {
        next(error);
    }
})


module.exports = router