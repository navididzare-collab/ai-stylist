import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://app-python-f3b4n.apps.teh11.abrhapaas.com";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const response = await fetch(`${API_URL}/products/${id}`, { cache: "no-store" });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(null, { status: 404 });
      }
      return NextResponse.json(
        { error: "خطا در دریافت محصول" },
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