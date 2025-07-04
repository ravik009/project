const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/remove-bg', upload.single('image'), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = inputPath + '-out.png';

  let model = req.body.model || 'u2net'; // default
  const filename = req.file.originalname.toLowerCase();

  if (!req.body.model) {
    if (filename.includes('human') || filename.includes('person')) {
      model = 'u2net_human_seg';
    } else if (filename.includes('anime')) {
      model = 'isnet-anime';
    } else if (filename.includes('sky') || filename.includes('tajmahal') || filename.includes('building')) {
      model = 'isnet-general-use';
    }
  }

  if (model === 'bria' || model === 'bria-rmbg') {
    model = 'bria-rmbg';
  }

  console.log(`Processing "${filename}" with model: ${model}`);

  const python = spawn('python', [
    '-m', 'rembg.cli', 'i',
    '-m', model,
    inputPath, outputPath
  ]);

  python.on('close', (code) => {
    if (code === 0) {
      res.sendFile(path.resolve(outputPath), {}, (err) => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });
    } else {
      res.status(500).json({ error: 'Background removal failed' });
      fs.unlinkSync(inputPath);
    }
  });
});

app.get('/', (req, res) => {
  res.send('Background Removal API is running!');
});

app.listen(5000, () => {
  console.log('Server started on http://localhost:5000');
});