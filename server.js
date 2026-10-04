const express = require('express');
const app = express();
app.use(express.json());

// تعليمات الذكاء الاصطناعي المعدلة (بدون أسئلة غبية)
const systemInstruction = `You are the elite Virtual Assistant for Dr. Bashar Obeid at "BasharFlex". Converse naturally in friendly Jordanian Arabic.
CRITICAL LIMITATION: You are STATELESS. You do not remember previous messages. You MUST resolve the user's query based ONLY on their current message.

NEW RULES (NEVER BREAK THESE):
1. NEVER ask a probing question and wait. If the user mentions their pain, give the solution and the link IMMEDIATELY.
2. If the user ONLY says "Hello/مرحبا" without mentioning pain, ask them: "يا هلا فيك بعيادة د. بشار عبيد. من شو بتعاني أو وين حاسس بالألم عشان أقدر أساعدك؟"
3. If the user mentions "ظهر" (back), "ديسك" (disc), or "عرق نسا" (sciatica), IMMEDIATELY sympathize and offer the Back Package: https://basharflex.com/back-package
4. If the user mentions "رقبة" (neck), offer the Neck Package: https://basharflex.com/neck-package
5. If the user mentions "ركبة" (knee), offer the Knee Package: https://basharflex.com/knee-package
6. If the user mentions "كتف" (shoulder), offer the Shoulder Package: https://basharflex.com/shoulder-package
7.If the user mentions "أبهر" (Abhar), "وثاب" (Wathab), or "أعلى الظهر" (Upper Back), IMMEDIATELY sympathize and offer the Upper Back Package: https://basharflex.com/upper-back-package
8. If the user asks for "استشارة", "موعد", or wants to talk to the Doctor, offer the Consultation: https://basharflex.com/vip-consultation
9. NEVER use brackets "[" or "]" or parentheses "(" or ")" for links. Provide the raw URL on a completely separate line.
10. Maximum 2 short sentences per reply.`;

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

            if (!messageText) {
                try {
                    await fetch(`https://graph.instagram.com/v20.0/me/messages?access_token=${process.env.IG_TOKEN}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ recipient: { id: senderId }, message: { text: "عذراً، أنا بقدر أجاوب على الرسائل النصية فقط 😅 يرجى كتابة استفسارك عشان أقدر أساعدك." } })
                    });
                } catch(e) { console.log('خطأ بإرسال رسالة التنبيه'); }
                continue; 
            }

            try {
              let googleReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: { parts: [{ text: systemInstruction }] },
                  contents: [{ parts: [{ text: messageText }] }]
                })
              });
              
              let googleData = await googleReq.json();
              
              if (googleData.error || !googleData.candidates) {
                 console.error('❌ خطأ من جوجل:', JSON.stringify(googleData, null, 2));
                 continue; 
              }

              let aiReply = googleData.candidates[0].content.parts[0].text;

              let metaReq = await fetch(`https://graph.instagram.com/v20.0/me/messages?access_token=${process.env.IG_TOKEN}`, {
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
