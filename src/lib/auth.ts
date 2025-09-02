import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { Adapter } from "next-auth/adapters";

type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
    level: number;
  }>;
  permissions: Array<{
    id: string;
    name: string;
    displayName: string;
    resource: string;
    action: string;
  }>;
  twoFactorEnabled: boolean;
  requires2FA: boolean;
  twoFactorSecret?: string;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Find user with roles and permissions
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: credentials.username },
                { username: credentials.username },
              ],
              status: "ACTIVE",
            },
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          // Extract roles and permissions from database
          const userRoles = user.userRoles.map(
            (ur: {
              role: {
                id: string;
                name: string;
                displayName: string;
                level: number;
              };
            }) => ({
              id: ur.role.id,
              name: ur.role.name,
              displayName: ur.role.displayName,
              level: ur.role.level,
            })
          );

          // Flatten permissions from all roles and remove duplicates
          const allPermissions = user.userRoles.flatMap(
            (ur: {
              role: {
                rolePermissions: Array<{
                  permission: {
                    id: string;
                    name: string;
                    displayName: string;
                    resource: string;
                    action: string;
                  };
                }>;
              };
            }) =>
              ur.role.rolePermissions.map(
                (rp: {
                  permission: {
                    id: string;
                    name: string;
                    displayName: string;
                    resource: string;
                    action: string;
                  };
                }) => ({
                  id: rp.permission.id,
                  name: rp.permission.name,
                  displayName: rp.permission.displayName,
                  resource: rp.permission.resource,
                  action: rp.permission.action,
                })
              )
          );

          // Remove duplicate permissions
          const uniquePermissions = allPermissions.filter(
            (
              permission: { name: string },
              index: number,
              self: Array<{ name: string }>
            ) => index === self.findIndex((p) => p.name === permission.name)
          );

          const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            roles: userRoles,
            permissions: uniquePermissions,
            twoFactorEnabled: user.twoFactorEnabled,
            requires2FA: user.twoFactorEnabled && !!user.twoFactorSecret,
            twoFactorSecret: user.twoFactorSecret || undefined,
          };

          return authUser;
        } catch (error) {
          console.error("Error en autenticación:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.username = authUser.username;
        token.fullName = authUser.fullName;
        token.roles = authUser.roles;
        token.permissions = authUser.permissions;
        token.twoFactorEnabled = authUser.twoFactorEnabled;
        token.requires2FA = authUser.requires2FA;
        token.twoFactorSecret = authUser.twoFactorSecret;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.username = token.username as string | null;
        session.user.fullName = token.fullName as string;
        session.user.roles = token.roles as AuthUser["roles"];
        session.user.permissions = token.permissions as AuthUser["permissions"];
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.requires2FA = token.requires2FA as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Extended types for NextAuth with modern RBAC
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    username: string | null;
    fullName: string;
    roles: Array<{
      id: string;
      name: string;
      displayName: string;
      level: number;
    }>;
    permissions: Array<{
      id: string;
      name: string;
      displayName: string;
      resource: string;
      action: string;
    }>;
    twoFactorEnabled: boolean;
    requires2FA: boolean;
    twoFactorSecret?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      username: string | null;
      fullName: string;
      roles: Array<{
        id: string;
        name: string;
        displayName: string;
        level: number;
      }>;
      permissions: Array<{
        id: string;
        name: string;
        displayName: string;
        resource: string;
        action: string;
      }>;
      twoFactorEnabled: boolean;
      requires2FA: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string | null;
    fullName: string;
    roles: Array<{
      id: string;
      name: string;
      displayName: string;
      level: number;
    }>;
    permissions: Array<{
      id: string;
      name: string;
      displayName: string;
      resource: string;
      action: string;
    }>;
    twoFactorEnabled: boolean;
    requires2FA: boolean;
    twoFactorSecret?: string;
  }
}
