// The old ChatGPT-scoped pilot endpoint is retired; its data stays in the DB.
export function GET() {
  return Response.json(
    { error: '앱을 업데이트하고 틈픽 계정으로 로그인해 주세요.' },
    { status: 410 },
  );
}
export const POST = GET;
