import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CELL_IDS = ["A"];
const FT_IDS   = ["TR","AL", "BO", "CH", "AR"];

function generateID(num, cellIdx, ftIdx) {
  return `${String(num).padStart(3,"0")}${CELL_IDS[cellIdx] ?? "X"}${FT_IDS[ftIdx] ?? "XX"}`;
}

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  try {
    if (event.httpMethod === "GET") {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("member_num", { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    const body = JSON.parse(event.body || "{}");

    if (event.httpMethod === "POST") {
      const { data: seqData, error: seqErr } = await supabase.rpc("next_member_num");
      if (seqErr) throw seqErr;
      const num = seqData;
      const id  = generateID(num, Number(body.cell), Number(body.fireteam));
      const { data, error } = await supabase
        .from("members")
        .insert([{
          id,
          member_num: num,
          name:      body.name,
          email:     body.email,
          phone:     body.phone,
          age:       Number(body.age),
          cell:      Number(body.cell),
          fireteam:  Number(body.fireteam),
          rank:      body.rank,
          status:    body.status || "Active",
          join_date: body.joinDate,
          penalties: [],
        }])
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers, body: JSON.stringify(data) };
    }

    if (event.httpMethod === "PUT") {
      const { id, ...fields } = body;
      const { data: existing } = await supabase.from("members").select("member_num").eq("id", id).single();
      const newId = generateID(existing.member_num, Number(fields.cell), Number(fields.fireteam));
      const updatePayload = {
        id:        newId,
        name:      fields.name,
        email:     fields.email,
        phone:     fields.phone,
        age:       Number(fields.age),
        cell:      Number(fields.cell),
        fireteam:  Number(fields.fireteam),
        rank:      fields.rank,
        status:    fields.status,
        join_date: fields.joinDate,
      };
      if (fields.penalties !== undefined) updatePayload.penalties = fields.penalties;
      const { data, error } = await supabase
        .from("members")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = body;
      const { error } = await supabase
        .from("members")
        .update({ status: "Removed" })
        .eq("id", id);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
