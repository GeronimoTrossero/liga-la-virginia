import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, homeDe, verificar } from "./lib/session";

// Redirige por rol. Las APIs vuelven a validar la sesión por su cuenta.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verificar(req.cookies.get(COOKIE)?.value);
  const login = new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url);

  if (!s) return NextResponse.redirect(login);

  const seg = decodeURIComponent(pathname.split("/")[2] ?? "");
  const home = new URL(homeDe(s), req.url);

  if (pathname.startsWith("/vendedor/")) {
    if (s.rol === "VENDEDOR" && seg !== s.ref) return NextResponse.redirect(home);
    return NextResponse.next(); // supervisor: la página valida que sea de su equipo
  }
  if (pathname.startsWith("/supervisor/")) {
    if (s.rol === "VENDEDOR" || (s.rol === "SUPERVISOR" && seg !== s.ref)) return NextResponse.redirect(home);
    return NextResponse.next();
  }
  if (pathname.startsWith("/regional/") || pathname.startsWith("/liga") || pathname.startsWith("/temporada")) {
    if (s.rol === "VENDEDOR") return NextResponse.redirect(home);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/vendedor/:path*", "/supervisor/:path*", "/regional/:path*", "/liga/:path*", "/liga", "/temporada"] };
