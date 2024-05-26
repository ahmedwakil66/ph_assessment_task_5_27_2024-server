const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
const { connect } = require('./db');

// import routes
const jwtRoute = require('./routes/jwt');
const getRecipeRoute = require('./routes/get-recipes'); // public 
const recipeRoute = require('./routes/protected/recipes'); // protect
const purchaseRoute = require('./routes/protected/purchase');

const app = express();

app.use(cors());
app.use(express.json());

// Use route files as middleware
app.use('/jwt', jwtRoute);
app.use('/recipes', recipeRoute);
app.use('/purchase', purchaseRoute);
app.use('/get-recipes', getRecipeRoute);


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
    return res.send({ recipeCount, userCount })
})


// app.get('/one-time', async (req, res) => { // testing purpose
//     const query = req.query.qs;
//     const parsed = QueryString.parse(query);
//     console.log({query, parsed});

//     return res.send({query, parsed})
// })


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.message, err.stack);
    return res.status(err.statusCode || 500).json({ message: err.message });
})


app.listen(port, () => {
    console.log(`simply recipes has been started on port ${port}`)
})