import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET() {
  return NextResponse.json(
    { ok: true, timestamp: new Date().toISOString() },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: NO_STORE_HEADERS });
}
