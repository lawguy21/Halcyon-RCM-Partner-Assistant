import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    newUser: '/auth/register',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const loginUrl = `${apiUrl}/api/auth/login`;

        console.log('[NextAuth] Attempting login for:', credentials.email);
        console.log('[NextAuth] API URL:', apiUrl);
        console.log('[NextAuth] Full login URL:', loginUrl);

        // Call API to verify credentials
        let response;
        try {
          response = await fetch(
            loginUrl,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );
          console.log('[NextAuth] Response status:', response.status);
        } catch (fetchError) {
          console.error('[NextAuth] Fetch error:', fetchError);
          throw new Error('Unable to connect to authentication server');
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          console.log('[NextAuth] Login failed:', error);
          throw new Error(error?.error?.message || 'Invalid credentials');
        }

        const result = await response.json();
        console.log('[NextAuth] Login successful for:', credentials.email);

        // API returns { success, data: { user, accessToken, refreshToken } }
        if (!result.success || !result.data?.user) {
          throw new Error('Authentication failed');
        }

        // Return user with tokens for JWT callback
        return {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name,
          role: result.data.user.role,
          organizationId: result.data.user.organizationId,
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
      }
      // Include access token in session for API calls
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};
