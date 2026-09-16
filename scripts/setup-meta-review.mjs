// Explicit operator setup. Never print credentials, tokens, or Graph response bodies.
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

if (process.argv.includes('--help')) {
 console.log('Loads .env.local. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, META_GRAPH_VERSION, META_TEST_ACCESS_TOKEN, META_TEST_WABA_ID, META_TEST_PHONE_NUMBER_ID, META_REVIEW_ACTOR_ID (existing staff user), META_TOKEN_ENCRYPTION_KEY. Creates an explicitly labelled review sandbox and binds an existing Meta test number. Does not register/migrate numbers or send messages.');
 process.exit(0);
}
try {
 try { process.loadEnvFile('.env.local'); } catch { /* Deployment environments can supply variables directly. */ }
 const env = process.env;
 for (const name of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','META_GRAPH_VERSION','META_TEST_ACCESS_TOKEN','META_TEST_WABA_ID','META_TEST_PHONE_NUMBER_ID','META_REVIEW_ACTOR_ID','META_TOKEN_ENCRYPTION_KEY']) if (!env[name]) throw new Error(`Missing ${name}`);
 if (!/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION) || !/^\d+$/.test(env.META_TEST_WABA_ID) || !/^\d+$/.test(env.META_TEST_PHONE_NUMBER_ID)) throw new Error('Invalid Graph identifiers');
 if (!new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.startsWith('lyvoiipsmcbffvpkrxhy.')) throw new Error('Expected Soulvd Supabase project; check the configured URL.');
 const source = await readFile(new URL('../src/lib/meta/security.ts',import.meta.url),'utf8');
 const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
 const { encryptToken,normalizePhone } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
 const encrypted = encryptToken(env.META_TEST_ACCESS_TOKEN);
 const response = await fetch(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${env.META_TEST_WABA_ID}/phone_numbers`,{headers:{Authorization:`Bearer ${env.META_TEST_ACCESS_TOKEN}`},signal:AbortSignal.timeout(15000)});
 if (!response.ok) throw new Error('Meta asset verification failed');
 const data = await response.json();
 const number = data.data?.find(item=>item.id===env.META_TEST_PHONE_NUMBER_ID);
 if (!number) throw new Error('Number does not belong to the configured WABA');
 const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const workspace = await db.rpc('soulvd_meta_review_workspace',{p_actor:env.META_REVIEW_ACTOR_ID});
 if (workspace.error) throw new Error('Unable to create review sandbox; verify migration and staff role');
 const result = await db.rpc('soulvd_meta_bind',{p_tenant:workspace.data,p_actor:env.META_REVIEW_ACTOR_ID,p_phone:`+${normalizePhone(number.display_phone_number)}`,p_waba:env.META_TEST_WABA_ID,p_number:env.META_TEST_PHONE_NUMBER_ID,p_token:encrypted,p_mode:'test'});
 if (result.error) throw new Error('Unable to save test binding');
 console.log('Review sandbox created and test authorization saved. Configure the webhook and WABA subscription in Meta, then open /app/whatsapp and refresh templates. No message has been sent.');
} catch(error) { console.error(error.message); process.exitCode=1; }
