const { MongoClient } = require('mongodb');
const xlsx = require('xlsx');

const password = "P%40%24%24w0rdtrin"; // Encoded password
const uri = `mongodb+srv://mabo99:${password}@watifquestions.0mw79.mongodb.net/?retryWrites=true&w=majority&appName=watifQuestions`; // Use the password variable
const client = new MongoClient(uri);

async function addQuestions() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        const database = client.db('watifQuestions'); // Use your database name
        const questionsCollection = database.collection('questions');

        // Clear existing questions collection
        await questionsCollection.deleteMany({});
        console.log("Cleared existing questions.");

        // Read the Excel file
        const workbook = xlsx.readFile('qNa.xlsx'); // Update with your file path
        const questionsSheet = workbook.Sheets['questions'];
        const answersSheet = workbook.Sheets['answers'];

        // Convert sheets to JSON
        const questionsData = xlsx.utils.sheet_to_json(questionsSheet);
        const answersData = xlsx.utils.sheet_to_json(answersSheet);

        // Process questions
        for (const question of questionsData) {
            const newQuestion = {
                id: question.questionID,
                text: question.question,
                options: [] // Initialize options array
            };
            await questionsCollection.insertOne(newQuestion);
            console.log(`Inserted question: ${newQuestion.id}`);
        }

        // Process answers
        for (const answer of answersData) {
            const questionId = answer.questionID;
            const existingQuestion = await questionsCollection.findOne({ id: questionId });
            if (existingQuestion) {
                const answerId = `${questionId}A${existingQuestion.options.length + 1}`; // Generate unique answer ID
                const newAnswer = {
                    uniqueId: answerId,
                    text: answer.answer,
                    image: answer.image,
                    questionId: questionId
                };
                existingQuestion.options.push(newAnswer); // Add answer to the question's options
                await questionsCollection.updateOne({ id: questionId }, { $set: { options: existingQuestion.options } });
                console.log(`Inserted answer: ${newAnswer.uniqueId} for question: ${questionId}`);
            } else {
                console.log(`Question not found for answer: ${answer.answer}`);
            }
        }

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    } finally {
        await client.close();
    }
}

addQuestions().catch(console.error); 