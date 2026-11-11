import { NextResponse } from 'next/server';

// WAJIB DITAMBAHKAN: Matikan cache Vercel agar data selalu real-time
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const WEB_APP_URL = process.env.GOOGLE_WEB_APP_URL as string;

// Fungsi untuk Mengambil Data (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sheet = searchParams.get('sheet'); 

  try {
    const response = await fetch(`${WEB_APP_URL}?sheet=${sheet}`, {
      cache: 'no-store', // Paksa ambil data baru setiap saat
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// Fungsi untuk Menambah Data (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json(); 
    
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}
