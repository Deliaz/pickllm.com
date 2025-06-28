import { NextResponse } from 'next/server';

const MODEL_PRICES_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json';

export async function GET() {
  const res = await fetch(MODEL_PRICES_URL, { next: { revalidate: 86400 } });
  const data = await res.json();
  return NextResponse.json(data);
}
