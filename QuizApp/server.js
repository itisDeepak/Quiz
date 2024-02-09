const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(express.static("public"));
app.use(express.urlencoded());


const secretKey = 'your-secret-key';

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/home.html"));
});

mongoose.connect('mongodb+srv://itisDeepakSharma:Deepak45516111@cluster0.y9ariix.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.use(bodyParser.json());

const userSchema = new mongoose.Schema({
    rollnumber: { type: Number, unique: true },
    name: String,
    gender: { type: String, enum: ['male', "MALE", 'Male', 'FEMALE', 'Female', 'female', 'OTHER', 'Other', 'other'] },
    age: { type: Number, min: 18, max: 99 },
    password: String,
});

const User = mongoose.model('User', userSchema);

function authenticateToken(req, res, next) {
    // Check if the 'Authorization' header, 'token' query parameter, or 'token' cookie is present
    const token = req.header('Authorization') || req.query.token || req.cookies.token;

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    try {
    
        const user = jwt.verify(token, secretKey);

        // Check if the user object has the expected structure
        if (!user || !user.rollnumber) {
            return res.sendStatus(403); // Forbidden
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Error verifying token:', err);
        return res.sendStatus(403); // Forbidden
    }
}



app.post("/login", async (req, res) => {
    try {
        const { rollnumber, password } = req.body;

        const user = await User.findOne({ rollnumber });

        if (user) {
            if (user.password === password) {
                // Generate a JWT token with the user information
                const token = jwt.sign({ rollnumber: user.rollnumber, password: user.password }, secretKey);

                // Redirect the user to the dashboard with the token as a query parameter
                res.redirect(`/dashboard?token=${token}`);
            } else {
                res.status(401).json({ error: 'Invalid password' });
            }
        } else {
            res.status(401).json({ error: 'Invalid roll number' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { rollnumber, name, gender, age, password } = req.body;

        if (!['male', 'MALE', 'Male', 'female', 'Female', 'FEMALE', 'other', 'Other', 'OTHER'].includes(gender)) {
            return res.status(400).json({ error: 'Invalid gender' });
        }

        if (age < 18 || age > 99) {
            return res.status(400).json({ error: 'Age must be between 18 and 99' });
        }

        const existingUser = await User.findOne({ rollnumber });
        if (existingUser) {
            return res.status(400).json({ error: 'Roll number already exists' });
        }

        const newUser = new User({ rollnumber, name, gender, age, password });
        await newUser.save();
        res.status(201).json({ message: 'User signed up successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/dashboard', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/'); 
});



const Question = mongoose.model('Question', {
  question: String,
  options: [String],
  correctAnswer: String,
});

app.get('/get-random-questions', async (req, res) => {
  try {
    // Fetch 5 random questions from the database
    const questions = await Question.aggregate([{ $sample: { size: 5 } }]);

    res.json(questions);
  } catch (error) {
    console.error('Error fetching random questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const Attempt = mongoose.model('Attempt', {
    rollnumber: Number, 
    score: Number,
    date: Date,
});



app.post('/submit-score', async (req, res) => {
    try {
        const { score } = req.body;
        const currentDate = new Date();

        // Create a new attempt record
        const newAttempt = new Attempt({
            score,
            date: currentDate,
            
        });

        await newAttempt.save();

       
        res.json({ message: 'Score submitted successfully' +" your score: "+score });
    } catch (error) {
        console.error('Error submitting score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.get('/view-attempts', authenticateToken, async (req, res) => {
    try {
      
        const attempts = await Attempt.find({ rollnumber: req.user.rollnumber });
        res.render('view-attempts', { attempts });
    } catch (error) {
        console.error('Error fetching attempt records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
