const express = require('express');
const app = express();
app.use(express.json());

// توثيق ميتا
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === 'FlexBot2026') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// استقبال الرسائل والرد
app.post('/webhook', async (req, res) => {
  let body = req.body;
  
  if (body.object === 'instagram') {
    for (let entry of body.entry) {
      for (let messaging of entry.messaging) {
        if (messaging.message && !messaging.message.is_echo) {
          let senderId = messaging.sender.id;
          let messageText = messaging.message.text;

          try {
            // 1. طلب الرد من جوجل
            let googleReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: messageText }] }] })
            });
            let googleData = await googleReq.json();
            let aiReply = googleData.candidates[0].content.parts[0].text;

            // 2. إرسال الرد لإنستغرام
            await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${process.env.IG_TOKEN}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } })
            });
          } catch (error) {
            console.error('Error:', error);
          }
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Bot is ready!'));
