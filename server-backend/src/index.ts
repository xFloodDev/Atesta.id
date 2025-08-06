
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';

// Impor kedua service
// import { checkKredibel } from './services/kredibel.service'; // Kita nonaktifkan sementara
import { checkSlither } from './services/slither.service';

type AnalysisRequestPayload = {
  transactionDetails: {
    to: string;
    from: string;
    value?: string;
    data?: string;
  };
  offChainEntity?: string;
  sourceUrl: string;
  chainId: string;
};

const app = new Hono();

// --- Middleware ---
app.use('*', logger());
app.use('/api/*', cors({ origin: '*', allowMethods: ['POST', 'GET', 'OPTIONS'] }));

// --- Routes ---
app.get('/', (c) => c.json({ message: 'Atesta.id Analysis Server is running!' }));

app.post('/api/analyze', async (c) => {
  try {
    const payload = await c.req.json<AnalysisRequestPayload>();
    const { transactionDetails, chainId } = payload;

    if (!transactionDetails || !transactionDetails.to) {
      return c.json({ error: 'Invalid transaction details provided.' }, 400);
    }

    console.log('Menerima permintaan analisis untuk:', transactionDetails.to);

    // --- LOGIKA ANALISIS GABUNGAN ---

    // 1. Analisis Off-Chain (Kredibel) - Masih menggunakan data palsu/mock
    const kredibelResult = {
        status: 'Clear',
        message: 'Layanan pemeriksaan rekening akan segera tersedia.'
    };

    // 2. Analisis On-Chain (Slither) - Menggunakan data nyata
    // Kita asumsikan alamat 'to' adalah alamat kontrak untuk dianalisis
    const slitherResult = await checkSlither(transactionDetails.to, chainId);

    // 3. Gabungkan hasil analisis menjadi satu respons
    const details = [
        {
          layer: 'off-chain',
          title: 'Pemeriksaan Laporan Lokal',
          status: kredibelResult.status,
          message: kredibelResult.message,
        },
        {
          layer: 'on-chain-static',
          title: 'Analisis Keamanan Smart Contract',
          status: slitherResult.status,
          message: slitherResult.message,
        }
    ];

    // Tentukan skor dan level risiko akhir berdasarkan temuan paling parah
    let finalRiskLevel: 'High' | 'Medium' | 'Low' | 'Clear' = 'Clear';
    if (details.some(d => d.status === 'High')) {
        finalRiskLevel = 'High';
    } else if (details.some(d => d.status === 'Medium')) {
        finalRiskLevel = 'Medium';
    }

    const finalResponse = {
      riskLevel: finalRiskLevel,
      summary: `Analisis Selesai: Risiko Ditemukan Tingkat ${finalRiskLevel}`,
      details: details,
    };

    return c.json(finalResponse);

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
