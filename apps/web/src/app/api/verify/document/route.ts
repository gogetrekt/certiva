import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

export async function POST(request: Request) {
  const incomingFormData = await request.formData();
  const file = incomingFormData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "A PDF file is required." }, { status: 400 });
  }

  const outboundFormData = new FormData();
  outboundFormData.set("file", file, file.name);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/verify/document`, {
      method: "POST",
      body: outboundFormData,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return NextResponse.json({ message: "Invalid response from service" }, { status: 502 });
  }

  if (response.status >= 500) {
    return NextResponse.json({ message: "An error occurred. Please try again." }, { status: response.status });
  }

  return NextResponse.json(payload, { status: response.status });
}
