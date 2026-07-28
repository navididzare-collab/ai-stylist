import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://app-python-f3b4n.apps.teh11.abrhapaas.com";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const url = query ? `${API_URL}/products?${query}` : `${API_URL}/products`;

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: "خطا در دریافت محصولات" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "خطا در ارتباط با سرور" },
      { status: 502 }
    );
  }
}