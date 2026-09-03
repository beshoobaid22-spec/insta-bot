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
  console.log('📥 وصل إشعار من ميتا:', JSON.stringify(body, null, 2));
  
  if (body.object === 'instagram') {
    for (let entry of body.entry) {
      // حماية السيرفر: التأكد إنها رسالة حقيقية مش اختبار وهمي
      if (entry.messaging) {
        for (let messaging of entry.messaging) {
          if (messaging.message && !messaging.message.is_echo) {
            let senderId = messaging.sender.id;
            let messageText = messaging.message.text;

            try {
              let googleReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: {
                    parts: [{ text: "أنت المساعد الذكي لمنصة العلاج الطبيعي 'BasharFlex' الخاصة بالدكتور بشار عبيد. مهمتك الرد على استفسارات المرضى بأسلوب طبي، ودود، ومحترف باللهجة الأردنية. قدم نصائح مبدئية، واقترح عليهم دائماً تصفح البرامج التأهيلية على الموقع أو حجز موعد للتقييم الدقيق." }]
                  },
                  contents: [{ parts: [{ text: messageText }] }]
                })
              });
              
              let googleData = await googleReq.json();
              if (googleData.error) console.error('❌ خطأ من جوجل:', googleData.error);

              let aiReply = googleData.candidates[0].content.parts[0].text;

              await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${process.env.IG_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } })
              });
              console.log('✅ تم إرسال الرد بنجاح');
            } catch (error) {
              console.error('❌ خطأ عام:', error);
            }
          }
        }
      } else {
         console.log('⚠️ تم تجاهل رسالة اختبار من ميتا للحفاظ على استقرار السيرفر');
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Bot is ready!'));
