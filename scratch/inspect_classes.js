const { MongoClient } = require('mongodb');

async function main() {
    const uri = "mongodb+srv://ssinphinite:rahul123@cluster0.p76lo.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");
        
        const db = client.db('R_school'); // Assuming school code is R
        const classes = await db.collection('classes').find({ isActive: true }).toArray();
        
        console.log("Found classes:", classes.length);
        classes.forEach(c => {
            console.log(`- ${c.className} (${c.academicYear})`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

main();
