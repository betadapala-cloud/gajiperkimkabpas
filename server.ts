import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));

// Direktori dan Berkas Database Server yang dibagikan ke semua browser
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'payroll-db.json');

// Pastikan folder data ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Endpoint GET: Mengambil data database terakhir yang sama untuk semua browser
app.get('/api/payroll', (_req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return res.json({
        success: true,
        data: parsed,
      });
    }
    return res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Error reading payroll db:', error);
    return res.status(500).json({ success: false, error: 'Gagal membaca database server' });
  }
});

// Endpoint POST: Menyimpan data realtime ke server database
app.post('/api/payroll', (req, res) => {
  try {
    const payload = req.body;
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({
      success: true,
      timestamp: Date.now(),
      message: 'Database berhasil disimpan ke server',
    });
  } catch (error) {
    console.error('Error saving payroll db:', error);
    return res.status(500).json({ success: false, error: 'Gagal menyimpan database server' });
  }
});

// Jalankan Server dengan Vite Middleware di mode dev atau Static di prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  if (isProd && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server database penggajian berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
