const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
    try {
        const { name, phone, message } = req.body;

        if (!name || !phone || !message) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Configure transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"Saavi Lite Website" <${process.env.EMAIL_USER}>`,
            to: 'saavilite@gmail.com',
            subject: `New Contact Enquiry from ${name}`,
            html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <hr>
        <p style="color:#888; font-size:12px;">Sent from Saavi Lite website contact form</p>
      `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Message sent successfully!' });
    } catch (err) {
        console.error('Contact form error:', err.message);
        // Still return success-ish if email fails but data was valid
        res.status(500).json({ error: 'Failed to send message. Please try calling us directly.' });
    }
});

module.exports = router;
