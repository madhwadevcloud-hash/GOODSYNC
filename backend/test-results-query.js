// Quick test script to check results in database
const { MongoClient } = require('mongodb');

async function testResultsQuery() {
  const uri = process.env.MONGODB_URI || 'your-mongodb-uri';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('school_avm');
    const resultsCollection = db.collection('results');
    
    // Check all results
    const allResults = await resultsCollection.find({}).limit(5).toArray();
    console.log(`\n📊 Total results in collection: ${await resultsCollection.countDocuments()}`);
    
    if (allResults.length > 0) {
      console.log('\n📝 Sample result document:');
      console.log(JSON.stringify(allResults[0], null, 2));
      
      console.log('\n🔍 Field analysis:');
      console.log('- className:', allResults[0].className);
      console.log('- section:', allResults[0].section);
      console.log('- academicYear:', allResults[0].academicYear);
      console.log('- subjects count:', allResults[0].subjects?.length);
    }
    
    // Test query with className
    console.log('\n🔎 Testing query with className="2", section="B"');
    const query1 = { className: '2', section: 'B' };
    const results1 = await resultsCollection.find(query1).toArray();
    console.log(`Found ${results1.length} results`);
    
    // Test query with class
    console.log('\n🔎 Testing query with class="2", section="B"');
    const query2 = { class: '2', section: 'B' };
    const results2 = await resultsCollection.find(query2).toArray();
    console.log(`Found ${results2.length} results`);
    
    // Check academic year formats
    const distinctYears = await resultsCollection.distinct('academicYear');
    console.log('\n📅 Academic years in database:', distinctYears);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testResultsQuery();
