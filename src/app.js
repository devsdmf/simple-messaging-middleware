const express = require('express');
const bodyParser = require('body-parser');
const Twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_ACCOUNT_TOKEN = process.env.TWILIO_ACCOUNT_TOKEN;

const app = express();
const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_ACCOUNT_TOKEN);
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/messaging', (req, res) => {
  const inboundResourceSid = req.body.inboundResourceSid;

  if (inboundResourceSid.startsWith('SM')) {
    getMessageDetails(inboundResourceSid)
      .then(m => saveMessage(m.from, m.to, m.body))
      .then(() => sendResponse(res, 'ok'));
  } else if (inboundResourceSid.startsWith('IM')) {
    const { 
      interactionServiceSid: serviceSid,
      interactionSessionSid: sessionSid,
      interactionSid
    } = req.body;

    getOutboundMessage(serviceSid, sessionSid, interactionSid)
      .then(getMessageDetails)
      .then(saveMessage)
      .then(() => sendResponse(res, 'ok'));
  } else {
    console.error('Invalid message prefix => ' + inboundResourceSid);
    sendResponse(res, 'failed');
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

const getMessageDetails = async (messageSid) => 
  client.messages(messageSid).fetch().then(m => ({ 
    from: m.from, 
    to: m.to, 
    body: m.body 
  }));

const getOutboundMessage = async (serviceSid, sessionSid, interactionSid) => 
  client.proxy.services(serviceSid)
    .sessions(sessionSid)
    .interactions(interactionSid)
    .fetch()
    .then(i => {
      if (i.outboundResourceSid === null) {
        return new Promise((resolve, reject) => {
          setTimeout(() => resolve(getOutboundMessage(serviceSid, sessionSid, interactionSid)), 3000);
        });
      }

      return i.outboundResourceSid;
    });

const sendResponse = (res, status) => res.send({ status });

// EXAMPLE FUNCTION TO SAVE THE MESSAGE
const saveMessage = async (from, to, body) => console.log(`Message sent from ${from}, to ${to}, with body ${body}`);

