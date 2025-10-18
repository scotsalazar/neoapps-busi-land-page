const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'leads.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      try {
        if (contentType.includes('application/json')) {
          resolve(JSON.parse(body || '{}'));
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(body);
          const result = {};
          for (const [key, value] of params.entries()) {
            result[key] = value;
          }
          resolve(result);
        } else {
          resolve({ raw: body });
        }
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function handleContact(req, res) {
  try {
    const body = await parseBody(req);

    if (body.website) {
      return sendJson(res, 400, { message: 'Invalid request.' });
    }

    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const company = (body.company || '').trim();
    const message = (body.message || '').trim();

    if (!name || !email || !message) {
      return sendJson(res, 422, { message: 'Please provide your name, email, and a message.' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return sendJson(res, 422, { message: 'Please enter a valid email address.' });
    }

    ensureDataFile();
    const leads = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const newLead = {
      id: Date.now(),
      name,
      email,
      company,
      message,
      receivedAt: new Date().toISOString()
    };
    leads.push(newLead);
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));

    console.info('New lead received:', newLead);

    sendJson(res, 201, { message: 'Thanks! Your message is on its way to our team.', leadId: newLead.id });
  } catch (error) {
    console.error('Error handling contact form submission:', error);
    sendJson(res, 500, { message: 'We encountered an issue saving your details. Please try again later.' });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/contact') {
    return handleContact(req, res);
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    return sendJson(res, 200, { status: 'ok' });
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
