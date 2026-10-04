const express = require('express');
const app = express();
app.use(express.json());

const systemInstruction = `You are the elite Virtual Assistant for Dr. Bashar Obeid at "BasharFlex". Converse naturally in friendly Jordanian Arabic.
CRITICAL LIMITATION: You are STATELESS. You do not remember previous messages. You MUST resolve the user's query based ONLY on their current message.

NEW RULES (NEVER BREAK THESE):
1. NEVER ask a probing question and wait. If the user mentions their pain, give the solution and the link IMMEDIATELY.
2. If the user ONLY says "Hello/مرحبا" without mentioning pain, ask them: "يا هلا فيك بعيادة د. بشار عبيد. من شو بتعاني أو وين حاسس بالألم عشان أقدر أساعدك؟"
3. If the user mentions "ظهر" (back), "ديسك" (disc), or "عرق نسا" (sciatica), IMMEDIATELY sympathize and offer the Back Package: https://basharflex.com/back-package
4. If the user mentions "رقبة" (neck), offer the Neck Package: https://basharflex.com/neck-package
5. If the user mentions "ركبة" (knee), offer the Knee Package: https://basharflex.com/knee-package
6. If the user mentions "كتف" (shoulder), offer the Shoulder Package: https://basharflex.com/shoulder-package
7. If the user mentions "أبهر" (Abhar), "وثاب" (Wathab), or "أعلى الظهر" (Upper Back), IMMEDIATELY sympathize and offer the Upper Back Package: https://basharflex.com/upper-back-package
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
          if (!messaging.message || messaging.message.is_echo) continue;

          let senderId = messaging.sender.id;
          let messageText = messaging.message.text ? messaging.message.text.trim() : "";

          if (!messageText) continue;

          try {
            // الاتصال المباشر بـ Google Gemini API
            const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/Gemini 3.1 Flash Lite:generateContent?key=${apiKey}`;

            let geminiReq = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: {
                  parts: [{ text: systemInstruction }]
                },
                contents: [
                  {
                    role: "user",
                    parts: [{ text: messageText }]
                  }
                ],
                generationConfig: {
                  maxOutputTokens: 200,
                  temperature: 0.4
                }
              })
            });

            let geminiData = await geminiReq.json();

            if (!geminiReq.ok || !geminiData.candidates || geminiData.candidates.length === 0) {
              console.error('❌ خطأ تفصيلي من Gemini:', JSON.stringify(geminiData));
              continue;
            }

            let aiReply = geminiData.candidates[0].content.parts[0].text;

            // إرسال الرد للمستخدم عبر إنستغرام
            let metaReq = await fetch(`https://graph.instagram.com/v20.0/me/messages?access_token=${process.env.IG_TOKEN}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } })
            });

            let metaResponse = await metaReq.json();
            if (metaResponse.error) {
              console.error('⚠️ خطأ من ميتا أثناء الإرسال:', JSON.stringify(metaResponse));
            } else {
              console.log('✅ تم إرسال الرد بنجاح!');
            }

          } catch (error) {
            console.error('❌ خطأ برمجي عام:', error);
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
module.exports = app;
