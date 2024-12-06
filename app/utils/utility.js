const fs = require('fs');
const { DateTime } = require('luxon');
const { X509Certificate } = require('crypto');
const nodemailer = require('nodemailer');

const SMTP_EMAIL = 'automated@runright.io';

const transporter = nodemailer.createTransport({
    host: 'raspberry.active-ns.com',
    port: 465,
    secure: true,
    auth: {
        user: SMTP_EMAIL,
        pass: 'Jonathan12345!'
    }
});

exports.sendEmail = async (emailAddress, emailContents, subject) => {
    const mailOptions = {
        from: SMTP_EMAIL,
        to: emailAddress,
        subject: subject,
        text: emailContents
    };
    try {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

exports.checkCertificateFile = (certFile) => {
    try {
        const pem_data = fs.readFileSync(certFile, 'utf8');

        const certificate = new X509Certificate(pem_data);
        // Get the expiration date
        const expirationDateStr = certificate.validTo;
        const expirationDate = DateTime.fromJSDate(new Date(expirationDateStr));

        // const currentDate = DateTime.utc();
        // console.log(`Certificate Expiration Date: ${expirationDate.toLocaleString()}`);
        // console.log(`Current Date: ${currentDate.toLocaleString()}`);

        // if (expirationDate < currentDate) {
        //     console.log('The certificate is expired.');
        // } else {
        //     console.log('The certificate is valid.');
        // }
        return `${expirationDate.toLocaleString()}`;
    } catch (error) {
        console.error('Error checking certificate expiration date:', error);
    }
}

exports.compareDates = (firstDate, lastDate) => {
    const date1 = new Date(firstDate);
    const date2 = new Date(lastDate);
    // Convert to YYYY-MM-DD format
    const date1String = date1.toISOString().split('T')[0];
    const date2String = date2.toISOString().split('T')[0];
    if (date1String === date2String) {
        return true;
    } else {
        return false;
    }
}