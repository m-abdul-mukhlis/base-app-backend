import bodyParser from 'body-parser'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import session from "express-session"
import fs from 'fs'
import ImageKit from 'imagekit'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from "url"

// recreate __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
const PORT = 5000

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// setup session
app.use(
  session({
    secret: "super-secret-key", // change this to env var in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set to true if HTTPS
  })
);

// serve static files
app.use(express.static(path.join(__dirname, "views")));

const upload = multer({ dest: 'uploads/' });

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

const generateRandomFileName = (ext = 'jpg') => {
  const timestamp = Date.now();
  return `img_${timestamp}.${ext}`;
};

// login page
app.get("/", (req, res) => {
  // if logged in, show dashboard
  if ((req.session as any).user) {
    // res.send(`
    //   <h2>Welcome, ${(req.session as any).user}</h2>
    //   <form action="/logout" method="POST"><button>Logout</button></form>
    // `);
    res.redirect("/admin")
  } else {
    res.sendFile(path.join(__dirname, "views/login.html"));
  }
});

// handle login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    (req.session as any).user = username;
    res.redirect("/admin"); // redirect after success ✅
  } else {
    res.status(401).send("❌ Invalid credentials. <a href='/'>Try again</a>");
  }
});

// middleware to protect routes
function authGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if ((req.session as any).user) {
    next();
  } else {
    res.redirect("/");
  }
}

// admin dashboard (protected)
app.get("/admin", authGuard, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin/index.html"));
});

// logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/api", (req, res) => {
  res.json({
    "ok": 0,
    "message": "Failed to Access"
  })
})

app.post('/api/image_upload', upload.single('image'), async (req: any, res) => {
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
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 handler (must be after all other routes)
app.use((req, res) => {
  const user = (req.session as any).user;

  // read the static template
  const filePath = path.join(__dirname, "views/404.html");
  let html = fs.readFileSync(filePath, "utf-8");

  // inject action button
  if (user) {
    html = html.replace(
      "{{button}}",
      `<a href="/admin" class="mt-6 inline-block bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">Back to Dashboard</a>`
    );
  } else {
    html = html.replace(
      "{{button}}",
      `<a href="/" class="mt-6 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Back Home</a>`
    );
  }

  res.status(404).send(html);
});

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})