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

  const response = await fetch(`${getApiBaseUrl()}/verify/document`, {
    method: "POST",
    body: outboundFormData,
    cache: "no-store",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
