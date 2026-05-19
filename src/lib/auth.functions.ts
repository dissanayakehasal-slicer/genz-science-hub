import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BOOTSTRAP_EMAIL = "hasal@gmszcience.local";
const BOOTSTRAP_USERNAME = "hasal";

/** One-time setup: creates/updates hasal via Auth Admin API (fixes SQL-seeded passwords). */
export const bootstrapHasalAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ setupToken: z.string().min(8) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_SETUP_TOKEN;
    if (!expected || data.setupToken !== expected) {
      throw new Error("Forbidden");
    }

    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Hasal@2011";

    const { data: listed, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);

    const existing = listed.users.find((u) => u.email === BOOTSTRAP_EMAIL);
    let userId: string;

    if (existing) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { username: BOOTSTRAP_USERNAME },
      });
      if (error) throw new Error(error.message);
      userId = existing.id;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: BOOTSTRAP_EMAIL,
        password,
        email_confirm: true,
        user_metadata: { username: BOOTSTRAP_USERNAME },
      });
      if (error) throw new Error(error.message);
      userId = created.user!.id;
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "super_admin" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, email: BOOTSTRAP_EMAIL, username: BOOTSTRAP_USERNAME };
  });
