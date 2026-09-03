const express = require('express');
const app = express();
app.use(express.json());

app.get('/webhook', (req, res) => {
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token === 'FlexBot2026') {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Webhook is listening'));
