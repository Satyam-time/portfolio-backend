require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// 1. Security & Middleware
// Allows your frontend to communicate with this backend
app.use(cors({ origin: '*' })); 
app.use(express.json());

// 2. WebSocket Setup (For Multiplayer Cursors)
const io = new Server(server, {
    cors: { origin: '*' }
});

// Listen for connections from visitors
io.on('connection', (socket) => {
    console.log(`📡 New visitor connected: ${socket.id}`);

    // Listen for mouse coordinates from this specific visitor
    socket.on('cursor_move', (data) => {
        // Broadcast those coordinates to EVERYONE ELSE
        socket.broadcast.emit('update_cursor', {
            id: socket.id,
            x: data.x,
            y: data.y
        });
    });

    // Clean up when they close the tab
    socket.on('disconnect', () => {
        console.log(`👋 Visitor disconnected: ${socket.id}`);
        io.emit('remove_cursor', socket.id);
    });
});

// 3. REST API Setup (For the Contact Form)
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    // Validate the incoming data
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Configure the email sender (using Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS  
            }
        });

        // Construct the email you will receive
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Sending it to yourself
            replyTo: email, // If you hit 'reply', it goes to the sender
            subject: `🚀 Portfolio Contact from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        };

        // Send it
        await transporter.sendMail(mailOptions);
        console.log(`✉️ Message sent successfully from ${name}`);
        res.status(200).json({ success: 'Message routed successfully!' });

    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

// 4. Start the Engine
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ SKS Physics Engine Backend running on port ${PORT}`);
});