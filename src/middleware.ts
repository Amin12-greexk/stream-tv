// File: src/middleware.ts

import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  // Lindungi hanya rute yang diawali dengan /dashboard
  matcher: ["/dashboard/:path*"],
};