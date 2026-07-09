// test-redis.js
require('dotenv').config();
const { createClient } = require('redis');

(async () => {
  console.log('Connecting to:', process.env.REDIS_URL);
  const client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => console.error('Redis Client Error:', err));
  await client.connect();
  console.log('Connected!');
  await client.set('foo', 'bar');
  const val = await client.get('foo');
  console.log('foo =', val);
  await client.quit();
})();