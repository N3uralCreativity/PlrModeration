const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.json());

// Database connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'playerbase'
});

// Register a new moderator
app.post('/moderators/register', async (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const moderatorID = uuidv4();

    try {
        await db.execute(
            'INSERT INTO Moderators (ModeratorID, Username, PasswordHash, Role) VALUES (?, ?, ?, ?)',
            [moderatorID, username, hashedPassword, role]
        );
        res.status(201).json({ message: 'Moderator registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Login for moderators
app.post('/moderators/login', async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await db.execute('SELECT * FROM Moderators WHERE Username = ?', [username]);
    
    if (rows.length > 0) {
        const match = await bcrypt.compare(password, rows[0].PasswordHash);
        if (match) {
            const token = jwt.sign({ id: rows[0].ModeratorID }, 'secretKey');
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Fetch player information
app.get('/players/:id', async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM Players WHERE PlayerID = ?', [req.params.id]);
    if (rows.length > 0) {
        res.json(rows[0]);
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

// Issue a ban
app.post('/bans', async (req, res) => {
    const { playerID, banType, endDate, reasonCode, moderatorID } = req.body;
    const banID = uuidv4();

    try {
        await db.execute(
            'INSERT INTO BanHistory (BanID, PlayerID, BanType, StartDate, EndDate, ReasonCode, ModeratorID) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)',
            [banID, playerID, banType, endDate, reasonCode, moderatorID]
        );

        await db.execute(
            'UPDATE Players SET BanStatus = TRUE, TotalOffenses = TotalOffenses + 1 WHERE PlayerID = ?',
            [playerID]
        );

        res.status(201).json({ message: 'Player banned successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Get ban history for a player
app.get('/players/:id/bans', async (req, res) => {
    const [rows] = await db.execute(
        'SELECT * FROM BanHistory WHERE PlayerID = ?',
        [req.params.id]
    );
    res.json(rows);
});

// Lift a ban
app.put('/bans/:id/lift', async (req, res) => {
    try {
        await db.execute('DELETE FROM BanHistory WHERE BanID = ?', [req.params.id]);
        await db.execute('UPDATE Players SET BanStatus = FALSE WHERE PlayerID = ?', [req.params.id]);
        res.json({ message: 'Ban lifted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
