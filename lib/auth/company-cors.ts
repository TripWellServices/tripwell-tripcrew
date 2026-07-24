export function getCompanyCorsOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_COMPANY_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function companyCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getCompanyCorsOrigin(),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function companyOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: companyCorsHeaders(),
  });
}
