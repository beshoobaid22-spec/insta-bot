const express = require('express');
const app = express();
app.use(express.json());

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === 'FlexBot2026') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  let body = req.body;
  
  if (body.object === 'instagram') {
    for (let entry of body.entry) {
      if (entry.messaging) {
        for (let messaging of entry.messaging) {
          if (messaging.message && !messaging.message.is_echo) {
            let senderId = messaging.sender.id;
            let messageText = messaging.message.text;

            try {
              // 1. طلب الرد من الذكاء الاصطناعي (جوجل)
              let googleReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: {
                    parts: [{ text: "أنت المساعد الذكي لمنصة العلاج الطبيعي 'BasharFlex'. مهمتك مساعدة الدكتور بشار عبيد في الرد على استفسارات المرضى بأسلوب طبي، ودود، ومحترف باللهجة الأردنية. قدم نصائح مبدئية، واقترح عليهم دائماً تصفح البرامج التأهيلية على الموقع." }]
                  },
                  contents: [{ parts: [{ text: messageText }] }]
                })
              });
              
              let googleData = await googleReq.json();
              
              // 2. فحص رد جوجل وطباعة الخطأ إن وُجد
              if (googleData.error || !googleData.candidates) {
                 console.error('❌ خطأ من جوجل:', JSON.stringify(googleData, null, 2));
                 continue; 
              }

              let aiReply = googleData.candidates[0].content.parts[0].text;

              // 3. إرسال الرد للمريض عبر ميتا (إنستغرام)
              let metaReq = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${process.env.IG_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } })
              });
              
              let metaResponse = await metaReq.json();
              if(metaResponse.error) {
                 console.log('⚠️ خطأ من ميتا أثناء الإرسال:', JSON.stringify(metaResponse));
              } else {
                 console.log('✅ تم إرسال الرد بنجاح!');
              }

            } catch (error) {
              console.error('❌ خطأ برمجي عام:', error);
            }
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
