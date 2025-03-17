import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/admin',
  },
})

export const config = {
  matcher: ['/admin/dashboard/:path*']
}
