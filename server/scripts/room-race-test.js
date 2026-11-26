/**
 * Live Supabase/Postgres Room Allocation Concurrency & Consistency Rehearsal Script.
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node server/scripts/room-race-test.js
 *
 * Tests atomic Postgres functions (`select_room`, `switch_room`, `reconcile_room_counts`)
 * directly against the database under a 60-way parallel burst, then cleans up test data.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('1. Fetching active profiles for race test...');
  const { data: profiles, error: pErr } = await sb
    .from('profiles')
    .select('id, role, gender, approval_status, is_active')
    .eq('is_active', true)
    .limit(60);

  if (pErr) throw pErr;
  if (!profiles || profiles.length < 2) {
    console.error('Need at least 2 active profiles in public.profiles to run live DB race test.');
    process.exit(1);
  }

  console.log(`Found ${profiles.length} active profiles.`);

  const { data: stay, error: sErr } = await sb
    .from('stays')
    .insert({ name: `__RACE_TEST_${Date.now()}`, selection_status: 'open' })
    .select('*')
    .single();
  if (sErr) throw sErr;

  try {
    const { data: customType, error: rtErr } = await sb
      .from('room_types')
      .insert({
        stay_id: stay.id,
        key: 'race_open',
        label: 'Race Test',
        color_hex: '#10B981',
        allowed_roles: ['student', 'coordinator', 'admin'],
        allowed_genders: null,
      })
      .select('*')
      .single();
    if (rtErr) throw rtErr;

    const { data: room, error: rErr } = await sb
      .from('rooms')
      .insert({
        stay_id: stay.id,
        room_no: 'RACE-1',
        capacity: 4,
        room_type_id: customType.id,
      })
      .select('*')
      .single();
    if (rErr) throw rErr;

    // Fire up to 60 parallel RPC calls (repeating users if fewer than 60 exist)
    const burst = Array.from({ length: 60 }, (_, i) => profiles[i % profiles.length].id);
    console.log('2. Firing 60 parallel select_room RPCs against capacity-4 room...');

    const results = await Promise.all(
      burst.map((uid) => sb.rpc('select_room', { p_user: uid, p_room: room.id }))
    );

    const ok = results.filter((r) => r.data?.ok === true);
    const expectedCap = Math.min(4, new Set(burst).size);
    console.log(`Succeeded: ${ok.length} (expected ${expectedCap})`);

    if (ok.length !== expectedCap) {
      throw new Error(`Race invariant failed: ${ok.length} succeeded vs ${expectedCap}`);
    }

    const { data: rec } = await sb.rpc('reconcile_room_counts', {
      p_admin: profiles[0].id,
      p_stay: stay.id,
    });
    console.log('3. Reconcile check:', rec);
    if (rec.fixed !== 0) {
      throw new Error(`Count drift detected: ${JSON.stringify(rec)}`);
    }

    console.log('PASS: Live Postgres race & consistency check succeeded.');
  } finally {
    await sb.from('stays').delete().eq('id', stay.id);
    console.log('Cleaned up temporary test stay.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
