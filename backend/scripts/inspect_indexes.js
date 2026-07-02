const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Prevent mongoose from trying to connect if we just compile schemas, or connect to dummy
// We can actually just compile schemas without connection if we define them,
// but some models might initialize immediately. Let's load them and see.
const modelsDir = path.join(__dirname, '../models');
const files = fs.readdirSync(modelsDir);

console.log('Scanning models in:', modelsDir);

files.forEach(file => {
  if (!file.endsWith('.js')) return;
  try {
    // Clear cache if any
    delete require.cache[require.resolve(path.join(modelsDir, file))];
    const modelExport = require(path.join(modelsDir, file));
    
    // Determine the schema(s)
    let schemasToCheck = [];
    
    if (modelExport.schema) {
      schemasToCheck.push({ name: modelExport.modelName || file, schema: modelExport.schema });
    } else if (typeof modelExport === 'function' && modelExport.prototype instanceof mongoose.Model) {
      schemasToCheck.push({ name: modelExport.modelName, schema: modelExport.schema });
    } else if (modelExport.getModelForConnection) {
      // Special case: SOSAlert or other context-based models
      // Let's create a dummy connection and compile it
      const dummyConn = mongoose.createConnection();
      try {
        const model = modelExport.getModelForConnection(dummyConn);
        schemasToCheck.push({ name: `${file} (getModelForConnection)`, schema: model.schema });
      } catch (e) {
        console.log(`Could not instantiate getModelForConnection for ${file}:`, e.message);
      }
    } else {
      // Check if it exports multiple schemas or models
      for (const key of Object.keys(modelExport)) {
        const val = modelExport[key];
        if (val && val.schema) {
          schemasToCheck.push({ name: `${file} [${key}]`, schema: val.schema });
        }
      }
    }

    if (schemasToCheck.length === 0) {
      // Maybe it's a schema directly? Let's check
      console.log(`No explicit schema found for ${file}`);
      return;
    }

    schemasToCheck.forEach(({ name, schema }) => {
      const indexes = schema.indexes();
      console.log(`\n--- Indexes for ${name} ---`);
      const seen = new Map();
      indexes.forEach(idx => {
        const keysStr = JSON.stringify(idx[0]);
        const options = idx[1] || {};
        console.log(`  Keys: ${keysStr}, Options: ${JSON.stringify(options)}`);
        
        // Normalize keysStr for duplicate check (order of fields matters in compound, but we check exact match)
        if (seen.has(keysStr)) {
          seen.get(keysStr).push(options);
        } else {
          seen.set(keysStr, [options]);
        }
      });

      let hasDups = false;
      for (const [keys, optList] of seen.entries()) {
        if (optList.length > 1) {
          hasDups = true;
          console.log(`  ⚠️ DUPLICATE INDEX DETECTED on keys: ${keys}`);
          optList.forEach((opt, idxNum) => {
            console.log(`    Duplicate ${idxNum + 1}: ${JSON.stringify(opt)}`);
          });
        }
      }
      if (!hasDups) {
        console.log(`  ✅ No duplicate indexes.`);
      }
    });
  } catch (err) {
    console.error(`Error loading model ${file}:`, err.message);
  }
});
process.exit(0);
