const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = 443;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// SSL Certificate
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/xrp-bridge.xyz/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/xrp-bridge.xyz/fullchain.pem')
};

const password = "P%40%24%24w0rdtrin"; // Encoded password
const uri = `mongodb+srv://mabo99:${password}@watifquestions.0mw79.mongodb.net/?retryWrites=true&w=majority&appName=watifQuestions`;
const client = new MongoClient(uri);

let questionsCollection;
let votesCollection;

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const database = client.db('watifQuestions');
        questionsCollection = database.collection('questions');
        votesCollection = database.collection('votes');
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

// Call the run function to connect to the database
run().catch(console.error());

// API Endpoints
app.get('/question/:id', async (req, res) => {
    const question = await questionsCollection.findOne({ id: req.params.id });
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
});

app.post('/vote', async (req, res) => {
    console.log('Received vote request:', req.body); // Log the request body

    const { pairId, option, otherOption } = req.body;

    // Validate the request
    if (!pairId || !option || !otherOption) {
        return res.status(400).json({ error: 'Missing required fields: pairId, option, and otherOption' });
    }

    // Check if the vote pair exists
    const existingVote = await votesCollection.findOne({ pair: pairId });
    if (!existingVote) {
        console.log(`Vote pair not found in database: ${pairId}`); // Log if pair is not found
        return res.status(404).json({ error: 'Vote pair not found' });
    }

    // Increment the vote count for the selected option
    existingVote.votes[option]++;
    await votesCollection.updateOne({ pair: pairId }, { $set: { votes: existingVote.votes } });

    // Respond with the updated vote counts
    res.json(existingVote.votes);
});

app.get('/questions/random', async (req, res) => {
    try {
        const questions = await questionsCollection.find({}).toArray(); // Fetch all questions
        if (questions.length === 0) return res.status(404).json({ error: 'No questions found' });

        // Shuffle the questions array
        const shuffledQuestions = questions.sort(() => 0.5 - Math.random());

        // Return the first question from the shuffled array
        res.json(shuffledQuestions[0]);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// New endpoint to add option pairs
app.post('/votes/pair', async (req, res) => {
    const { optionA, optionB } = req.body;

    // Sort options alphabetically to create a unique pair ID
    const pairId = [optionA, optionB].sort().join('-');

    // Debugging information
    console.log(`Adding vote pair: optionA = ${optionA}, optionB = ${optionB}, pairId = ${pairId}`);

    // Check if the pair already exists
    const existingVote = await votesCollection.findOne({ pair: pairId });
    if (existingVote) {
        return res.status(409).json({ message: 'Pair already exists' });
    }

    // If not, create a new entry with 0 votes for each option
    const newVoteEntry = {
        pair: pairId,
        votes: {
            [optionA]: 0,
            [optionB]: 0
        }
    };

    await votesCollection.insertOne(newVoteEntry);
    res.status(201).json(newVoteEntry);
});

// New endpoint to get total votes
app.get('/votes/total', async (req, res) => {
    try {
        const allVotes = await votesCollection.find({}).toArray(); // Fetch all vote entries
        let totalVotes = 0;

        // Sum the votes for each entry
        allVotes.forEach(voteEntry => {
            for (const option in voteEntry.votes) {
                totalVotes += voteEntry.votes[option]; // Add the vote count for each option
            }
        });

        res.json({ totalVotes }); // Respond with the total votes
    } catch (error) {
        console.error("Error fetching total votes:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start HTTPS Server
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Server running on https://xrp-bridge.xyz:${PORT}`);
});