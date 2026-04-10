import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { photo_base64 } = await req.json();
    if (!photo_base64) {
      return new Response(JSON.stringify({ error: "photo_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active customers with photos
    const { data: customers, error: dbErr } = await supabase
      .from("customers")
      .select("id, name, phone, photo_url, tag_id, balance")
      .eq("active", true)
      .not("photo_url", "is", null);

    if (dbErr) throw dbErr;
    if (!customers || customers.length === 0) {
      return new Response(JSON.stringify({ match: false, reason: "no_customers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build image URLs for comparison (limit to 20 at a time to keep token usage manageable)
    const batch = customers.slice(0, 20);
    const customerList = batch.map((c, i) => `${i + 1}. ID=${c.id}, Name=${c.name}`).join("\n");

    const messages = [
      {
        role: "system",
        content: `You are a face recognition system. You will receive a scan photo and a list of customer photos. Your job is to determine if the scanned face matches any customer. Respond ONLY with a JSON object: {"match": true, "customer_index": <1-based index>} or {"match": false}. Be strict - only match if the faces clearly belong to the same person.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Scan photo to identify:` },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${photo_base64}` } },
          { type: "text", text: `\nCustomer database (${batch.length} customers):\n${customerList}\n\nCustomer photos:` },
          ...batch.map((c, i) => ({
            type: "image_url" as const,
            image_url: { url: c.photo_url },
          })),
          { type: "text", text: "Which customer (if any) matches the scan photo? Respond with JSON only." },
        ],
      },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione fundos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ match: false, reason: "no_parse" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.match && result.customer_index) {
      const idx = result.customer_index - 1;
      if (idx >= 0 && idx < batch.length) {
        const customer = batch[idx];
        return new Response(JSON.stringify({
          match: true,
          customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            photo_url: customer.photo_url,
            tag_id: customer.tag_id,
            balance: customer.balance,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ match: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("face-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
