const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'konoha-services-app-ready-to-upload.zip');
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log('Successfully created zip file at: ' + outputPath);
  console.log('Size: ' + archive.pointer() + ' total bytes');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

archive.glob('**/*', { 
  ignore: ['node_modules/**', '.git/**', '.env', 'zip.js'] 
});

archive.finalize();
