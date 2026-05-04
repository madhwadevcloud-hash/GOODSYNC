const fs = require('fs');

let fileContent = fs.readFileSync('d:\\ssinphinite\\ERP Latest\\GOODSYNC\\backend\\controllers\\simpleIDCardController.js', 'utf8');

// Replace generation block in generateIDCards
const genRegex = /\/\/ Generate ID cards with school info including logo\s+const results = await idCardGenerator\.generateBulkIDCards\([\s\S]*?res\.json\({[\s\S]*?totalFailed: results\.failed\.length\s+}\s+}\);\s+} catch \(error\)/;

const newGen = `// Generate ID cards with school info including logo
    const schoolInfoObj = {
        schoolName: school?.name || '',
        address: formattedAddress,
        logoUrl: school?.logoUrl || null,
        phone: school?.contact?.phone || school?.phone || '',
        email: school?.contact?.email || school?.email || ''
    };

    if (mappedStudents.length > 20) {
      const jobId = 'job_' + Date.now();
      res.json({
        success: true,
        message: 'Bulk generation started in background. You will be notified when ready.',
        jobId: jobId,
        isAsync: true
      });

      setImmediate(async () => {
        try {
          const results = await idCardGenerator.generateBulkIDCards(mappedStudents, orientation, includeBack, schoolInfoObj);
          const io = req.app.get('io');
          if (io && req.user && req.user.schoolCode) {
            io.to('school-' + req.user.schoolCode.toLowerCase()).emit('id-cards-ready', {
              jobId,
              success: true,
              data: {
                generated: results.success,
                failed: results.failed,
                totalRequested: studentIds.length,
                totalGenerated: results.success.length,
                totalFailed: results.failed.length
              }
            });
          }
        } catch (err) {
          const io = req.app.get('io');
          if (io && req.user && req.user.schoolCode) {
            io.to('school-' + req.user.schoolCode.toLowerCase()).emit('id-cards-error', { jobId, message: err.message });
          }
        }
      });
      return;
    }

    const results = await idCardGenerator.generateBulkIDCards(
      mappedStudents,
      orientation,
      includeBack,
      schoolInfoObj
    );

    console.log('✅ Generation results:', {
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed
    });

    res.json({
      success: true,
      message: \`Generated \${results.success.length} ID cards successfully\`,
      data: {
        generated: results.success,
        failed: results.failed,
        totalRequested: studentIds.length,
        totalGenerated: results.success.length,
        totalFailed: results.failed.length
      }
    });
  } catch (error)`;

fileContent = fileContent.replace(genRegex, newGen);

// Replace download block in downloadIDCards
const dlRegex = /\/\/ Generate ID cards with school info including logo\s+const results = await idCardGenerator\.generateBulkIDCards\([\s\S]*?console\.log\(`✅ Cleaned up \${deletedCount} generated files`\);\s+}\);\s+} catch \(error\)/;

const newDl = `// Generate ID cards with school info including logo
    const schoolInfoObj = {
        schoolName: school?.name || '',
        address: formattedAddress,
        logoUrl: school?.logoUrl || null,
        phone: school?.contact?.phone || school?.phone || '',
        email: school?.contact?.email || school?.email || ''
    };

    if (mappedStudents.length > 20) {
      const jobId = 'job_' + Date.now();
      res.json({
        success: true,
        message: 'Bulk ZIP generation started in background. You will be notified when it is ready.',
        jobId: jobId,
        isAsync: true
      });

      setImmediate(async () => {
        try {
          const results = await idCardGenerator.generateBulkIDCards(mappedStudents, orientation, includeBack, schoolInfoObj);
          
          if (results.success.length === 0) {
            const io = req.app.get('io');
            if (io && req.user && req.user.schoolCode) {
              io.to('school-' + req.user.schoolCode.toLowerCase()).emit('id-cards-error', { jobId, message: 'Failed to generate any ID cards' });
            }
            return;
          }

          const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          
          const schoolNameStr = school?.name || 'School';
          const zipFileName = \`IDCards_\${schoolNameStr.replace(/[^a-zA-Z0-9]/g, '_')}_\${Date.now()}.zip\`;
          const zipPath = path.join(tempDir, zipFileName);
          
          const output = fs.createWriteStream(zipPath);
          const archive = archiver('zip', { zlib: { level: 9 } });
          
          output.on('close', () => {
            const io = req.app.get('io');
            if (io && req.user && req.user.schoolCode) {
              io.to('school-' + req.user.schoolCode.toLowerCase()).emit('id-cards-zip-ready', {
                jobId,
                downloadUrl: \`/uploads/temp/\${zipFileName}\`,
                successCount: results.success.length
              });
            }
            
            // Cleanup PNGs
            const fsPromises = require('fs').promises;
            results.success.forEach(async (r) => {
              try {
                if (r.frontCard) await fsPromises.unlink(path.join(__dirname, '..', r.frontCard));
                if (r.backCard) await fsPromises.unlink(path.join(__dirname, '..', r.backCard));
              } catch (e) {}
            });
          });
          
          archive.on('error', (err) => { throw err; });
          archive.pipe(output);
          
          for (const result of results.success) {
            const studentFolderName = result.sequenceId || result.studentId || 'ID';
            if (result.frontCard) {
              const frontPath = path.join(__dirname, '..', result.frontCard);
              if (fs.existsSync(frontPath)) {
                archive.file(frontPath, { name: \`\${studentFolderName}/\${result.sequenceId}_front.png\` });
              }
            }
            if (result.backCard) {
              const backPath = path.join(__dirname, '..', result.backCard);
              if (fs.existsSync(backPath)) {
                archive.file(backPath, { name: \`\${studentFolderName}/\${result.sequenceId}_back.png\` });
              }
            }
          }
          
          await archive.finalize();
        } catch (err) {
          const io = req.app.get('io');
          if (io && req.user && req.user.schoolCode) {
            io.to('school-' + req.user.schoolCode.toLowerCase()).emit('id-cards-error', { jobId, message: err.message });
          }
        }
      });
      return;
    }

    const results = await idCardGenerator.generateBulkIDCards(
      mappedStudents,
      orientation,
      includeBack,
      schoolInfoObj
    );

    console.log('✅ Download generation results:', {
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed
    });

    if (results.success.length === 0) {
      console.error('❌ No ID cards generated successfully');
      return res.status(500).json({
        success: false,
        message: 'Failed to generate any ID cards',
        failed: results.failed
      });
    }

    // Create ZIP file
    const schoolNameStr = school?.name || 'School';
    const zipFileName = \`IDCards_\${schoolNameStr.replace(/[^a-zA-Z0-9]/g, '_')}_\${Date.now()}.zip\`;
    
    console.log('📦 Creating ZIP file:', zipFileName);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', \`attachment; filename="\${zipFileName}"\`);

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Handle errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({
        success: false,
        message: 'Error creating ZIP file',
        error: err.message
      });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add generated ID cards to ZIP
    let filesAdded = 0;
    for (const result of results.success) {
      const studentFolderName = result.sequenceId || result.studentId || 'ID';
      
      if (result.frontCard) {
        const frontPath = path.join(__dirname, '..', result.frontCard);
        if (fs.existsSync(frontPath)) {
          const frontFileName = \`\${result.sequenceId}_front.png\`;
          archive.file(frontPath, { name: \`\${studentFolderName}/\${frontFileName}\` });
          filesAdded++;
        }
      }
      if (result.backCard) {
        const backPath = path.join(__dirname, '..', result.backCard);
        if (fs.existsSync(backPath)) {
          const backFileName = \`\${result.sequenceId}_back.png\`;
          archive.file(backPath, { name: \`\${studentFolderName}/\${backFileName}\` });
          filesAdded++;
        }
      }
    }

    // Finalize archive
    await archive.finalize();

    // Clean up generated files after ZIP is sent
    archive.on('end', async () => {
      const fsPromises = require('fs').promises;
      for (const result of results.success) {
        try {
          if (result.frontCard) await fsPromises.unlink(path.join(__dirname, '..', result.frontCard));
          if (result.backCard) await fsPromises.unlink(path.join(__dirname, '..', result.backCard));
        } catch (err) {}
      }
    });
  } catch (error)`;

fileContent = fileContent.replace(dlRegex, newDl);

fs.writeFileSync('d:\\ssinphinite\\ERP Latest\\GOODSYNC\\backend\\controllers\\simpleIDCardController.js', fileContent);
console.log('Done!');
