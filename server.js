import dotenv from 'dotenv';
import OpenAI from 'openai';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); 
dotenv.config();

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const id = process.env.Assistant_Id;

// Global state to manage assistant and thread
let state = {
    assistant_id: id,
    assistant_name: "BankTest",
    threadId: null,
    messages: [],
};

// Route to retrieve an assistant
app.post('/api/assistants', async (req, res) => {
    try {
        const { name } = req.body;
        const myAssistant = await openai.beta.assistants.retrieve(name);
        
        state.assistant_id = myAssistant.id;
        state.assistant_name = myAssistant.name;
        
        res.status(200).json(state);
    } catch (error) {
        console.error('Error fetching assistant:', error);
        res.status(500).json({ error: 'Failed to fetch assistant' });
    }
});

// Route to create a new thread
app.post('/api/threads', async (req, res) => {
    try {
        const thread = await openai.beta.threads.create();
        
        state.threadId = thread.id;
        state.messages = []; // Reset messages
        
        res.json({ threadId: state.threadId });
    } catch (error) {
        console.error('Error creating thread:', error);
        res.status(500).json({ error: 'Failed to create thread' });
    }
});

// Route to send a message and run the Assistant
app.post('/api/run', async (req, res) => {
    const { message } = req.body;
    
    if (!state.threadId || !state.assistant_id) {
        return res.status(400).json({ error: 'Thread or Assistant not initialized' });
    }

    try {
        // Add user message to thread
        await openai.beta.threads.messages.create(state.threadId, {
            role: "user",
            content: message
        });

        // Create and poll the run
        const run = await openai.beta.threads.runs.createAndPoll(state.threadId, {
            assistant_id: state.assistant_id
        });

        // Check run status
        if (run.status !== 'completed') {
            return res.status(500).json({ error: `Run did not complete. Status: ${run.status}` });
        }

        // Retrieve messages after run completes
        const messagesResponse = await openai.beta.threads.messages.list(state.threadId);
        
        // Process messages
        const processedMessages = messagesResponse.data
            .filter(msg => msg.role === 'assistant')
            .map(msg => ({
                role: msg.role,
                content: msg.content[0].text.value
            }));

        // Update state messages
        state.messages = processedMessages;

        res.json({ messages: processedMessages });
    } catch (error) {
        console.error('Error running assistant:', error);
        res.status(500).json({ error: 'Failed to run assistant', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});