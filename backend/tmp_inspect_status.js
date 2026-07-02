require('dotenv').config();
const { MongoClient } = require('mongodb');
(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('NO_URI');
    process.exit(1);
  }
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('studentfeerecords');
    const statuses = ['paid','PAID','pending','PENDING','partial','PARTIAL','overdue','OVERDUE'];
    for (const status of statuses) {
      const count = await col.countDocuments({ status });
      console.log(status, count);
    }
    const sample = await col.find({ status: { $regex: '^paid$', $options: 'i' } }).limit(10).project({ _id:0, studentName:1, studentClass:1, studentSection:1, totalAmount:1, totalPaid:1, totalPending:1, status:1, installments:1 }).toArray();
    console.log('SAMPLE_PAID', JSON.stringify(sample, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
})();