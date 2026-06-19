import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const POST_INCLUDE = {
  author: {
    select: { id: true, name: true, handle: true, title: true, avatarUrl: true },
  },
  project: {
    select: {
      id: true,
      name: true,
      logoMark: true,
      logoColor: true,
      alphaStage: true,
      category: true,
    },
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No current user" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      type,
      body: postBody,
      audioTitle,
      audioDuration,
      audioWaveform,
      tags,
      projectId,
    } = body as {
      type?: string;
      body?: string;
      audioTitle?: string;
      audioDuration?: number;
      audioWaveform?: string;
      tags?: string;
      projectId?: string;
    };

    if (type !== "text" && type !== "audio") {
      return NextResponse.json(
        { error: "type must be 'text' or 'audio'" },
        { status: 400 }
      );
    }

    if (type === "audio") {
      if (!audioTitle || typeof audioTitle !== "string") {
        return NextResponse.json(
          { error: "audioTitle is required for audio posts" },
          { status: 400 }
        );
      }
      if (
        typeof audioDuration !== "number" ||
        audioDuration <= 0 ||
        !Number.isFinite(audioDuration)
      ) {
        return NextResponse.json(
          { error: "audioDuration must be a positive number (seconds)" },
          { status: 400 }
        );
      }
      if (!audioWaveform || typeof audioWaveform !== "string") {
        return NextResponse.json(
          { error: "audioWaveform is required for audio posts" },
          { status: 400 }
        );
      }
    } else {
      if (!postBody || typeof postBody !== "string" || postBody.trim().length === 0) {
        return NextResponse.json(
          { error: "body is required for text posts" },
          { status: 400 }
        );
      }
    }

    // If projectId provided, ensure it belongs to the current user.
    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (project.founderId !== user.id) {
        return NextResponse.json(
          { error: "You can only post to your own projects" },
          { status: 403 }
        );
      }
    }

    const post = await db.post.create({
      data: {
        authorId: user.id,
        type,
        body: type === "text" ? (postBody as string) : postBody ?? null,
        audioTitle: type === "audio" ? audioTitle : null,
        audioDuration: type === "audio" ? audioDuration : null,
        audioWaveform: type === "audio" ? audioWaveform : null,
        tags: typeof tags === "string" ? tags : null,
        projectId: projectId ?? null,
      },
      include: POST_INCLUDE,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/posts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
