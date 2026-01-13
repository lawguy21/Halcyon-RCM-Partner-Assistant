import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    organizationId?: string;
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    user: User & {
      id: string;
      role: string;
      organizationId?: string;
    };
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    organizationId?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}
