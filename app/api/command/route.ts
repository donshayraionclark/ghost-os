import { NextResponse } from "next/server";

export const runtime = "edge";

type CommandBody = { input?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CommandBody;
    const input = (body.input || "").trim();

    const ghostReply =
      input.length === 0
        ? "Give me the objective in one line. What outcome do you want?"
        : `Objective received: "${input}". Here’s the plan and who owns each step.`;

    const plan = [
      { owner: "Ops", task: "Break objective into 3 steps + constraints" },
      { owner: "Research", task: "Pull options, risks, and best path" },
      { owner: "Outreach", task: "Draft message templates if needed" },
      { owner: "Automation", task: "Suggest automations + trackers" },
    ];

    return NextResponse.json({ ok: true, ghostReply, plan });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
