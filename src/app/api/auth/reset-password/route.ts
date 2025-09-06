import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
          },
        },
      },
    });
    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }
    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: "Token has already been used" },
        { status: 400 }
      );
    }
    if (resetToken.user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "User account is not active" },
        { status: 400 }
      );
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: resetToken.user.id },
      data: {
        password: hashedPassword,
      },
    });
    await prisma.passwordReset.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
      },
    });
    await prisma.userSession.deleteMany({
      where: { userId: resetToken.user.id },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: resetToken.user.id },
    });
    await prisma.auditLog.create({
      data: {
        userId: resetToken.user.id,
        action: "password.reset.completed",
        resource: "auth",
        metadata: JSON.stringify({
          email: resetToken.user.email,
          tokenUsed: token.substring(0, 8) + "...",
          sessionsInvalidated: true,
          timestamp: new Date().toISOString(),
        }),
      },
    });
    return NextResponse.json({
      message: "Password reset successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
