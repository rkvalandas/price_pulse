const axios = require("axios");
const cheerio = require("cheerio");
const Alert = require("../models/alert");
const sendEmail = require("../utils/sendEmail");

async function handlePriceTracker(req, res) {
  try {
    const alerts = await Alert.find(); // Retrieve all alerts from the database

    if (alerts.length === 0) {
      return res.status(404).json({ message: "No alerts found to process." });
    }
    
    // Process each alert using a `for...of` loop for proper async handling
    for (const alert of alerts) {
      try {
        // Fetch the page HTML
        const { data } = await axios.get(alert.url);
        const $ = cheerio.load(data);

        // Extract the price from the target element
        const priceText = $("span.a-price-whole")
          .first()
          .text()
          .replace(/,/g, "") // Removes all commas globally
          .trim();
        const currentPrice = parseFloat(priceText);

        // Check if the current price is below or equal to the target price
        if (currentPrice <= alert.targetPrice) {
          const emailContent = `
            <!DOCTYPE html>
            <html>
            <head>
            <style>
                body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f9f9f9;
                color: #333;
                }
                .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #fff;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
                .header {
                text-align: center;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
                }
                .header h1 {
                margin: 0;
                color: #007BFF;
                }
                .content {
                margin-top: 20px;
                }
                .content p {
                line-height: 1.6;
                font-size: 16px;
                }
                .content a {
                display: inline-block;
                margin-top: 10px;
                padding: 10px 20px;
                background-color: #007BFF;
                color: #fff;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                }
                .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 12px;
                color: #888;
                }
            </style>
            </head>
            <body>
            <div class="container">
                <div class="header">
                <h1>Price Drop Alert!</h1>
                </div>
                <div class="content">
                <h4>${alert.title}</h4>
                <p>Good news! The price for the product you are tracking has dropped to <strong>${currentPrice}</strong>.</p>
                <p>Don't miss this opportunity to grab the product at a discounted price.</p>
                <a href="${alert.url}" target="_blank">View Product</a>
                </div>
                <div class="footer">
                <p>You are receiving this email because you subscribed to price alerts on our platform.</p>
                <p>&copy; ${new Date().getFullYear()} Price Tracker Inc. All rights reserved.</p>
                </div>
            </div>
            </body>
            </html>

          `;

          // Send the email
          await sendEmail(
            alert.userEmail,
            "🚨 Price Drop Alert for Your Tracked Product!",
            emailContent
          );
          await Alert.findByIdAndDelete(alert._id);
        }
      } catch (innerError) {
        console.error(
          `Error processing alert for URL: ${alert.url}`,
          innerError
        );
      }
    }

    // Respond to the client
    res.status(200).json({ message: "Price tracking process completed." });
  } catch (error) {
    console.error("Error in price tracking process:", error);
    res.status(500).json({
      error: "An unexpected error occurred while tracking prices.",
    });
  }
}

module.exports = {
  handlePriceTracker,
};
