const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb+srv://ERP:ERP@consultancy.baiim7n.mongodb.net/?appName=consultancy')
  .then(async () => {
    // Find Riya by display name or first name or just grab a student
    let student = await User.findOne({ 'name.displayName': { $regex: 'Riya', $options: 'i' } }).lean();
    if (!student) {
        student = await User.findOne({ role: 'student' }).lean();
    }
    console.log(JSON.stringify(student, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
