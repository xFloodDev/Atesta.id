import { exec as execCallback } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

// Mengubah exec menjadi fungsi berbasis Promise agar bisa digunakan dengan async/await
const exec = util.promisify(execCallback);

// Definisikan tipe data untuk hasil analisis Slither
interface SlitherFinding {
    check: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low' | 'Informational';
    // ... properti lain dari output Slither
}

interface SlitherResult {
    success: boolean;
    results: {
        detectors: SlitherFinding[];
    };
}

/**
 * Mengambil kode sumber dari smart contract yang sudah terverifikasi di Etherscan.
 * @param contractAddress Alamat smart contract.
 * @param chainId ID jaringan (misal: '1' untuk Ethereum Mainnet).
 * @returns Kode sumber Solidity.
 */
async function getSourceCode(contractAddress: string, chainId: string): Promise<string> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    // URL API Etherscan bisa berbeda untuk jaringan lain (misal: api.bscscan.com)
    const apiUrl = '[https://api.etherscan.io/api](https://api.etherscan.io/api)';

    if (!apiKey) {
        throw new Error('ETHERSCAN_API_KEY tidak ditemukan di .env');
    }

    const response = await axios.get(apiUrl, {
        params: {
            module: 'contract',
            action: 'getsourcecode',
            address: contractAddress,
            apikey: apiKey,
        },
    });

    if (response.data.status !== '1' || !response.data.result[0].SourceCode) {
        throw new Error('Gagal mengambil kode sumber atau kontrak belum terverifikasi.');
    }

    return response.data.result[0].SourceCode;
}

/**
 * Menjalankan analisis Slither pada sebuah alamat smart contract.
 * @param contractAddress Alamat smart contract yang akan dianalisis.
 * @param chainId ID jaringan.
 * @returns Hasil analisis keamanan dari Slither.
 */
export async function checkSlither(contractAddress: string, chainId: string) {
    const tempDir = path.join(__dirname, '..', 'temp_contracts');
    const filePath = path.join(tempDir, `${contractAddress}.sol`);
    const resultPath = path.join(tempDir, `${contractAddress}_results.json`);

    try {
        // 1. Ambil kode sumber
        const sourceCode = await getSourceCode(contractAddress, chainId);

        // 2. Buat direktori sementara jika belum ada
        await fs.mkdir(tempDir, { recursive: true });

        // 3. Tulis kode ke file sementara
        await fs.writeFile(filePath, sourceCode);

        // 4. Jalankan Slither pada file tersebut
        const command = `slither ${filePath} --json ${resultPath}`;
        await exec(command);

        // 5. Baca hasil analisis dari file JSON
        const resultJson = await fs.readFile(resultPath, 'utf-8');
        const results: SlitherResult = JSON.parse(resultJson);

        // 6. Proses hasilnya
        const highImpactFindings = results.results.detectors.filter(d => d.impact === 'High').length;
        const mediumImpactFindings = results.results.detectors.filter(d => d.impact === 'Medium').length;

        let status: 'High' | 'Medium' | 'Low' | 'Clear' = 'Clear';
        let message = 'Tidak ditemukan kerentanan keamanan kritis.';

        if (highImpactFindings > 0) {
            status = 'High';
            message = `TERDETEKSI ${highImpactFindings} kerentanan tingkat TINGGI.`;
        } else if (mediumImpactFindings > 0) {
            status = 'Medium';
            message = `Terdeteksi ${mediumImpactFindings} kerentanan tingkat medium.`;
        }

        return { status, message, details: results.results.detectors };

    } catch (error: any) {
        console.error(`Error saat analisis Slither untuk ${contractAddress}:`, error.message);
        return {
            status: 'Error',
            message: 'Gagal melakukan analisis keamanan pada smart contract.',
            details: [],
        };
    } finally {
        // 7. Hapus file sementara untuk menjaga kebersihan
        try {
            await fs.unlink(filePath);
            await fs.unlink(resultPath);
        } catch (cleanupError) {
            // Abaikan jika file sudah tidak ada
        }
    }
}