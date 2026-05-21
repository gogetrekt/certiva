import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getApiBaseUrl } from "../../../../lib/api";

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("certiva_access_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const response = await fetch(`${getApiBaseUrl()}/document-proofs/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
