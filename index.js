const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ImageKit = require('imagekit');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const generateRandomFileName = (ext = 'jpg') => {
  const timestamp = Date.now();
  return `img_${timestamp}.${ext}`;
};

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = originalName.split('.').pop();
    const randomName = generateRandomFileName(ext);

    const customFolder = `image-uploads/${new Date().toISOString().split('T')[0]}`;

    const result = await imagekit.upload({
      file: fs.createReadStream(filePath),
      fileName: randomName,
      folder: customFolder,
      useUniqueFileName: false,
    });

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      url: result.url,
      filePath: `${customFolder}/${randomName}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 Express server ready on http://localhost:3000');
});