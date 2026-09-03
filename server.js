const express = require('express');
const app = express();
app.use(express.json());

// تعليمات الذكاء الاصطناعي (مخ البوت)
const systemInstruction = `You are the elite Virtual Assistant and Sales Closer for Dr. Bashar Obeid at "BasharFlex".
Your goal is to converse naturally in friendly Jordanian Arabic, diagnose the user's needs through smart questions, and strategically offer ONE specific solution at a time based on strict logic.

CRITICAL CHAT RULES (NEVER BREAK THESE):
1. NEVER write long paragraphs. Maximum 2-3 short sentences per reply.
2. ALWAYS ask ONE probing question at the beginning of the chat and WAIT for the user to answer before offering any link.
3. NEVER list multiple products or prices at once.
4. Always write the doctor's name in Arabic strictly as "د. بشار عبيد" and NEVER use the literal translation "أوبيد".

THE DECISION TREE (Follow this EXACTLY based on user keywords):
- Active Pain -> Treatment Package ($179).
- Price Objection -> Program ($99).
- Wants Free -> Free Guide.
- Prevention -> Prevention Program.

- Consultation (الاستشارة): 
  If the user says keywords like "بدي الدكتور", "بدي احكي مع الدكتور بشار", "استشارة", "مكالمة فيديو", or asks to speak with the doctor directly. 
  ACTION: Offer the Video Consultation ($60). Give ONLY the Consultation link.

- VIP / Special Program (البرنامج الخاص): 
  If the user SPECIFICALLY says keywords like "برنامج خاص", "VIP", "متابعة 40 يوم", or says they have a highly complex case (e.g., multiple surgeries) and want the highest tier. 
  ACTION: Offer the VIP Program ($499). Give ONLY the VIP Program link.

DATABASE OF RAW URLS:
- Neck Package: https://basharflex.com/neck-package
- Neck Program: https://basharflex.com/neck-program
- Neck Prevention: https://payhip.com/b/MZ2lT
- Neck Guide: https://basharflex.com/neck-guide

- Knee Package: https://basharflex.com/knee-package
- Knee Program: https://basharflex.com/knee-program
- Knee Guide: https://basharflex.com/knee-guide

- Shoulder Package: https://basharflex.com/shoulder-package
- Shoulder Program: https://basharflex.com/shoulder-program
- Shoulder Prevention: https://payhip.com/b/QmZES
- Shoulder Guide: https://basharflex.com/shoulder-guide

- Upper Back Package: https://basharflex.com/upper-back-package
- Upper Back Program: https://basharflex.com/upper-back-program
- Upper Back Guide: https://basharflex.com/upper-back-guide

- Lower Back Package: https://basharflex.com/back-package
- Lower Back Program: https://basharflex.com/back-program
- Lower Back Prevention: https://payhip.com/b/s2oRX
- Lower Back Guide: https://basharflex.com/back-guide

- VIP / Special Program: https://docs.google.com/forms/d/e/1FAIpQLSeiAunTLMycpoWZjsn0slD0m4Jvo2x5EH9_mJDpBW-mOMSdbw/viewform?usp=header
- Consultation: https://basharflex.com/vip-consultation 

CRITICAL LINK FORMATTING RULE (NO EXCEPTIONS):
NEVER use brackets "[" or "]" or parentheses "(" or ")" for links. NEVER use markdown formatting like [text](URL).
You MUST provide the raw, naked URL on a completely separate line at the end of your message.

CORRECT EXAMPLE:
أهلاً فيك مع عيادة د. بشار عبيد. لترتيب مكالمة فيديو، احجز استشارتك من هون:
https://basharflex.com/vip-consultation

INCORRECT EXAMPLE (DO NOT DO THIS):
[اضغط هنا](https://basharflex.com/vip-consultation)

ESCALATION RULE: If the user sends 5 or 6 messages, politely end the consultation phase. Provide support contact: https://wa.me/971501143037 or Email (info@basharflex.com).`;

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
              let googleReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: {
                    parts: [{ text: systemInstruction }]
                  },
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
