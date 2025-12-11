import nodemailer from "nodemailer"
import express from 'express'
import Users from '../db-schema/User.js'
import multer from "multer"
import fs from "fs"
import path from "path"

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(express.json());

router.post('/', upload.single("snapshot"), async (req, res) => {

    try {

        const { recipient } = await Users.findOne({ _id: req.body.userId})
        const recipientEmail = recipient.email;

        const snapshot = req.file;

        if (!snapshot || !recipientEmail) {
        return res.status(400).json({ error: "Missing snapshot or email" });
        }

        // Save snapshot locally
        const filename = `snapshot_${Date.now()}.jpg`;
        const savePath = path.join("uploads", filename);

        fs.writeFileSync(savePath, snapshot.buffer);

        // Create public URL
        const snapshotUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;

        // Configure email transporter
        const transporter = nodemailer.createTransport({
        service: "", // STMP
        auth: {
            type: "gmail",
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: "Notification from CAMERA",
            html: `
                <p>Your camera took a snapshot</p>
                <p><a href="${snapshotUrl}">Click here to download it</a></p>
            `
        }   

        // Send the email
        await transporter.sendMail(mailOptions)

        return res.status(200).send({ msg: "Email was sent successfully" })
    } catch (err) {
        console.log(`Mail was unable to be sent`)
        return res.status(400).send({ error: "Failed to send email" })
    }

});

export default router