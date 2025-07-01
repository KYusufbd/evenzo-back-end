const express = require('express');
const app = express();
const port = 5000;
const frontendUrl = 'http://localhost:5173';


// Dotenv configuration
require('dotenv').config();
const db_password = process.env.DB_PASSWORD;

// JSON Web Token (JWT) configuration
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET

// Middlewares
app.use(express.json());

// Cookie parser middleware
// This middleware is used to parse cookies attached to the client request object
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// CORS configuration
// This middleware is used to enable Cross-Origin Resource Sharing (CORS) for the server
// It allows the server to accept requests from the frontend URL and specify allowed methods and credentials
const cors = require('cors');
app.use(cors({
    origin: frontendUrl, // Allow requests from the frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    credentials: true, // Allow cookies to be sent
}));


// Custom middleware to check authentication
const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please log in first.' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret); 
        req.userId = decoded.userId; 
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid token. Please log in again.' });
    };
};

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Test server
app.get('/', (req, res) => {
  res.send('Hello World!');
});


// MongoDB connection setup
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://yfaka001_dev:${db_password}@cluster0.tiftb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// MongoDB cursors
const db = client.db('evenzo');
const usersCollection = db.collection('users');
const eventsCollection = db.collection('events');

// Function to run the MongoDB client
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// New user registration endpoint
app.post('/register', async (req, res) => {
    const { name, email, password, photoUrl } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    };
    
    const userExists = await usersCollection.findOne({ email: email });
    if (userExists) {
        return res.status(400).json({ error: 'User already exists. Please log instead!'});
    };
    
    const newUser = {
        name,
        email,
        password, 
        photoUrl: photoUrl || 'user.svg'
    };

    try {
        const result = await usersCollection.insertOne(newUser);
        const token = jwt.sign({ userId: result.insertedId }, jwtSecret, { expiresIn: '6h' });
        res.status(201).cookie('token', token).json({ message: 'User registered successfully!'});
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
    
});

// User login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    };

    const user = await usersCollection.findOne({ email: email, password: password });
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    };

    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '6h' });
    res.status(200).cookie('token', token).json({ message: 'Login successful!'});
});

