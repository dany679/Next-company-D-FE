import { checkApiLimit, incrementApiLimit } from "@/lib/api-limits";
import { checkSubscription } from "@/lib/subscription";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessage } from "openai/resources/chat/index.mjs";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { messages } = body;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!openai.apiKey) {
      return new NextResponse("OpenAi Api Key not configured", { status: 500 });
    }
    if (!messages) {
      return new NextResponse("Messages are required", { status: 400 });
    }

    const instructionMessage: ChatCompletionMessage = {
      role: "system",
      content:
        "You are a code generator. You must answer only in markdown code snippets. Use code comments for explanations.",
    };
    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();
    if (!freeTrial && !isPro) {
      return new NextResponse("Free Trial expired", { status: 403 });
    }
    const completion = await openai.chat.completions.create({
      messages: [instructionMessage, ...messages],
      model: "gpt-3.5-turbo",
    });

    if (!isPro) await incrementApiLimit();
    return NextResponse.json(completion.choices[0].message);
  } catch (error) {
    console.log("[CODE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
