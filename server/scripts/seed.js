import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { supabaseAdmin, isSupabaseAdminConfigured } from '../middleware/auth.js';

// Seed ONLY the Chief Administrator. Students and coordinators request access from the Login page!
const SEED_PEOPLE = [
  {
    role: 'admin',
    full_name: 'Chief Administrator',
    email: 'admin@college.edu',
    phone: '+91 94471 00001',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@IV2026!',
    details: {},
  },
];

async function wipeAllAuthUsers() {
  console.log('[Seed] Wiping existing users from Supabase Auth...');
  let totalDeleted = 0;
  let page = 1;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      console.error('[Seed] Error listing users to wipe:', error.message);
      break;
    }
    if (!data.users || data.users.length === 0) break;

    for (const u of data.users) {
      await supabaseAdmin.auth.admin.deleteUser(u.id);
      totalDeleted++;
    }
    page++;
  }
  console.log(`[Seed] Wiped ${totalDeleted} auth users from Supabase.`);
}

async function main() {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    console.error('[Seed] Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in your .env file.');
    process.exit(1);
  }

  const shouldReset = process.argv.includes('--reset');
  if (shouldReset) {
    await wipeAllAuthUsers();
  }

  console.log('[Seed] Seeding only primary Administrator (Students & Coordinators self-register & request Admin approval)...');
  const credentialRows = ['role,full_name,email,initial_password'];

  for (const person of SEED_PEOPLE) {
    const password = person.password;

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      app_metadata: { role: person.role },
      user_metadata: { full_name: person.full_name },
    });

    if (authErr) {
      console.error(`[Seed] Notice for ${person.email}:`, authErr.message);
      continue;
    }

    const userId = authUser.user.id;

    // Insert admin profile (pre-approved)
    const { error: pErr } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email: person.email,
      full_name: person.full_name,
      role: person.role,
      phone: person.phone || null,
      approval_status: 'approved',
      is_active: true,
      must_change_password: false,
      created_by: userId,
    });

    if (pErr) {
      console.error(`[Seed] Admin profile insert failed:`, pErr.message);
      continue;
    }

    credentialRows.push(`"${person.role}","${person.full_name}","${person.email}","${password}"`);
    console.log(`[Seed] Created ${person.role}: ${person.email} (Approved & Active)`);
  }

  const credentialsPath = path.resolve(process.cwd(), 'seed-credentials.csv');
  fs.writeFileSync(credentialsPath, credentialRows.join('\n'), 'utf8');
  console.log(`\n[Seed] Complete! Initial Admin credentials saved to: ${credentialsPath}`);
}

main().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
