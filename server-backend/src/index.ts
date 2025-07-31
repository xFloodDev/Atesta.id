import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Definisikan tipe data untuk request payload.
// Ini memastikan kita selalu menerima data yang benar dari frontend.
type AnalysisRequestPayload = {
  transactionDetails: {
    to: string;
    from: string;
    value?: string;
    data?: string;
  };
  sourceUrl: string;
  chainId: string;
};

// Inisialisasi aplikasi Hono
const app = new Hono();

// --- Middleware ---
// Middleware ini akan berjalan di setiap request.

// 1. Logger: Untuk menampilkan log request di terminal saat development.
app.use('*', logger());

// 2. CORS (Cross-Origin Resource Sharing):
// Ini WAJIB agar ekstensi frontend Anda bisa berkomunikasi dengan backend ini.
app.use(
  '/api/*',
  cors({
    origin: '*', // Untuk development, kita izinkan semua. Nanti bisa diperketat.
    allowMethods: ['POST', 'GET', 'OPTIONS'],
  })
);

// --- Routes ---
// Mendefinisikan endpoint API kita.

// Endpoint untuk health check, memastikan server berjalan.
app.get('/', (c) => {
  return c.json({ message: 'Atesta.id Analysis Server is running!' });
});

// Endpoint utama untuk analisis transaksi.
app.post('/api/analyze', async (c) => {
  try {
    const payload = await c.req.json<AnalysisRequestPayload>();

    // Validasi input dasar
    if (!payload.transactionDetails || !payload.transactionDetails.to) {
      return c.json({ error: 'Invalid transaction details provided.' }, 400);
    }

    console.log('Menerima permintaan analisis untuk:', payload.transactionDetails.to);

    // --- LOGIKA ANALISIS AKAN DIMASUKKAN DI SINI ---
    // Untuk sekarang, kita kembalikan data palsu (mock data).

    const mockResponse = {
      riskScore: 85,
      riskLevel: 'High',
      summary: 'Risiko Sangat Tinggi Terdeteksi',
      details: [
        {
          layer: 'off-chain',
          title: 'Pemeriksaan Laporan Lokal',
          status: 'High',
          message: 'Rekening terkait terdeteksi di database penipuan Kredibel.com (12 laporan).',
        },
        {
          layer: 'on-chain-static',
          title: 'Analisis Smart Contract',
          status: 'Medium',
          message: 'Ditemukan 2 kerentanan tingkat medium.',
        },
      ],
    };

    return c.json(mockResponse);

  } catch (error) {
    console.error('Error processing analysis request:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// --- Server Export ---
console.log('Server Hono siap berjalan di port 3000');
export default {
  port: 3000,
  fetch: app.fetch,
};
