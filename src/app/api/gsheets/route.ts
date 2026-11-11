import { NextResponse } from 'next/server';

const WEB_APP_URL = process.env.GOOGLE_WEB_APP_URL as string;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sheet = searchParams.get('sheet');

  if (!sheet) {
    return NextResponse.json({ error: 'Parameter sheet diperlukan' }, { status: 400 });
  }

  try {
    const response = await fetch(`${WEB_APP_URL}?sheet=${sheet}`, {
      cache: 'no-store'
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data dari Google Sheets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengirim data ke Google Sheets' }, { status: 500 });
  }
}
