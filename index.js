const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const chefsData = require('./data/chef_data.json');
const recipesData = require('./data/recipes_data.json');
const qAndA = require('./data/q&a_data.json');
const port = process.env.PORT || 3000;
const { verifyJWT } = require('./middlewares');

// import routes
const jwtRoute = require('./routes/jwt');
const recipeRoute = require('./routes/protected/recipes');
const connect = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Use route files as middleware
app.use('/jwt', jwtRoute);
app.use('/recipes', recipeRoute);


app.get('/', (req, res) => {
    res.send('Hello World!')
})



// send stats data
app.get('/get-stats', async (_, res) => {
    const { userCollection, recipeCollection } = await connect();
    const [recipeCount, userCount] = await Promise.all([
        recipeCollection.estimatedDocumentCount(),
        userCollection.estimatedDocumentCount()
    ])
    console.log('object', { recipeCount, userCount });
    return res.send({ recipeCount, userCount })
})

// send all recipes data for public route
app.get('/get-recipes', async (_, res) => {
    const { recipeCollection } = await connect();
    const cursor = recipeCollection.find().project({
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
    return res.send(recipes)
})

//send all recipes for a specific category
app.get('/get-recipes/categories/:category', async (req, res) => {
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
    return res.send(recipes)
})





//send all chef data
app.get('/simply-recipes/chefs', (_, res) => {
    res.send(chefsData);
})


//send specific chef data
app.get('/simply-recipes/chefs/:chefId', (req, res) => {
    const id = req.params.chefId;
    const chefData = chefsData.find(chef => chef._id === id);
    res.send(chefData);
})


//building category data from all recipe and sending it
app.get('/simply-recipes/categories', (req, res) => {
    const categories = [];
    const catData = [];
    recipesData.forEach(recipe => {
        const recipeCat = recipe.category;
        if (categories.indexOf(recipeCat) === -1) {
            categories.push(recipeCat);
            catData.push({
                category: recipe.category,
                image: recipe.image
            });
        }
    });
    res.send(catData);
})


//send specific recipes data by chef id
app.get('/simply-recipes/chef/:chefId', verifyJWT, (req, res) => {

    const id = req.params.chefId;
    const chef = chefsData.find(chef => chef._id === id);
    const chefRecipes = recipesData.filter(recipe => recipe.chef_id === id) || [];
    res.send({ chef, chefRecipes });
})


//send specific recipe data by recipe id
app.get('/simply-recipes/recipes/:recipeId', (req, res) => {
    const id = req.params.recipeId;
    const recipeData = recipesData.find(recipe => recipe._id === id) || [];
    res.send(recipeData);
})


//send today's pick
app.get('/simply-recipes/todays-pick', (req, res) => {
    res.send(recipesData.slice(0, 1));
})


//send all q&a data
app.get('/simply-recipes/q-and-a', (req, res) => {
    res.send(qAndA);
})


app.listen(port, () => {
    console.log(`simply recipes has been started on port ${port}`)
})