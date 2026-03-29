import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
  }
  interface Session {
    user: {
      id: string;
      username: string;
      name?: string | null;
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
  }
}