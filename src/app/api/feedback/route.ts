import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();
        
        const { content, type } = body;

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const feedback = await prisma.feedback.create({
            data: {
                content: content.trim(),
                type: type || "General",
                userId: session?.user?.id || null,
            }
        });

        // ✉️ Send Email via Resend if configured
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            try {
                const resend = new Resend(resendApiKey);
                const userEmail = session?.user?.email || "Anonymous User";
                
                await resend.emails.send({
                    from: "Timeline Creator Feedback <onboarding@resend.dev>",
                    to: "pranavkolambkar23@gmail.com",
                    subject: `New Feedback Submitted: [${type || "General"}]`,
                    html: `
                        <div style="font-family: sans-serif; padding: 24px; background-color: #f9f9f9; border-radius: 12px; border: 1px solid #eee; max-width: 600px; margin: 0 auto; color: #333;">
                            <h2 style="color: #4f46e5; margin-bottom: 4px;">New Feedback Received!</h2>
                            <p style="color: #666; font-size: 14px; margin-top: 0;">A user has submitted feedback on the Timeline Creator platform.</p>
                            
                            <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                                <span style="display: inline-block; padding: 4px 8px; background-color: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px;">
                                    ${type || "General"}
                                </span>
                                <p style="font-size: 16px; line-height: 1.6; color: #1f2937; margin: 0; font-style: italic;">
                                    "${content.trim()}"
                                </p>
                            </div>
                            
                            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                            
                            <table style="width: 100%; font-size: 12px; color: #6b7280;">
                                <tr>
                                    <td><strong>Submitted By:</strong></td>
                                    <td style="text-align: right;">${userEmail}</td>
                                </tr>
                                <tr>
                                    <td><strong>Date:</strong></td>
                                    <td style="text-align: right;">${new Date().toLocaleDateString()}</td>
                                </tr>
                            </table>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error("Failed to send email notification:", emailErr);
                // Gracefully continue so database entry is still preserved
            }
        }

        return NextResponse.json({ success: true, feedback }, { status: 201 });
    } catch (error) {
        console.error("Feedback creation error:", error);
        return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const feedbacks = await prisma.feedback.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { email: true }
                }
            }
        });

        return NextResponse.json(feedbacks, { status: 200 });
    } catch (error) {
        console.error("Fetch feedback error:", error);
        return NextResponse.json({ error: "Failed to fetch feedbacks" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Feedback ID is required" }, { status: 400 });
        }

        await prisma.feedback.delete({
            where: { id }
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Delete feedback error:", error);
        return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
    }
}
