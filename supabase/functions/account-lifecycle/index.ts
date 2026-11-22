import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { createLifecycleHandler } from "./handler.mjs";
Deno.serve(
  createLifecycleHandler({
    createClient,
    url: Deno.env.get("SUPABASE_URL")!,
    anonKey: Deno.env.get("SUPABASE_ANON_KEY")!,
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  }),
);
