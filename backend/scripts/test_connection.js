const mongoose = require('mongoose');
const dns = require('dns');

console.log('Setting DNS servers to 8.8.8.8...');
try {
  dns.setServers(['8.8.8.8']);
  console.log('DNS servers set to 8.8.8.8');
} catch (e) {
  console.error('Failed to set DNS servers:', e.message);
}

console.log('Node version:', process.version);
console.log('Resolving _mongodb._tcp.consultancy.baiim7n.mongodb.net using dns.resolveSrv...');

dns.resolveSrv('_mongodb._tcp.consultancy.baiim7n.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('dns.resolveSrv failed:', err);
  } else {
    console.log('dns.resolveSrv success:', addresses);
  }

  console.log('Attempting mongoose connection to MONGODB_URI...');
  const uri = "mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy";
  
  mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => {
    console.log('Mongoose connected successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Mongoose connection failed:', err);
    process.exit(1);
  });
});
