import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PromptInput = z.object({
  mood: z.enum(["general", "need_advice", "just_venting"]).optional().default("general"),
});

export const getJournalPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PromptInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const flavor =
      data.mood === "need_advice"
        ? "the user wants advice on something tender; give them one journaling prompt that helps them write the post clearly and honestly"
        : data.mood === "just_venting"
          ? "the user just needs to vent; give them one journaling prompt that helps them release what they're feeling without judging it"
          : "give them one warm journaling prompt that helps them start writing a story for the community";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a gentle journaling companion for Her Haven, a women's community. Write one short, specific journaling prompt (1-2 sentences). Warm, never clinical. No emoji. No quotes around the prompt.",
          },
          { role: "user", content: flavor },
        ],
        temperature: 0.85,
      }),
    });

    if (res.status === 429) throw new Error("Slow down — try again in a moment");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace");
    if (!res.ok) throw new Error(`AI gateway error (${res.status})`);

    const json = await res.json();
    const prompt: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    return { prompt };
  });
