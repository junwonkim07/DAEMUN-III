import { redirect } from "next/navigation";

export default function RootPage() {
  // 실제 인증 여부는 dashboard(클라이언트)에서 useSession으로 확인하고,
  // 미인증이면 proxy.ts가 /login으로 보낸다.
  redirect("/dashboard");
}
