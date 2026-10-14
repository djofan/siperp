import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
const require = createRequire(path.resolve('package.json'));
const env = require('dotenv').parse(fs.readFileSync('api/.env'));
if (env.DB_DATABASE !== 'sipmodular_laravel_dev' || env.DB_URL) throw Error('Requires isolated Laravel clone');
process.env.DATABASE_URL = `mysql://${encodeURIComponent(env.DB_USERNAME)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_DATABASE}`;
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const { prisma } = await import('../../lib/prisma.ts');
try {
  if (input.operation === 'create') {
    const { createUserWithAccess } = await import('../../modules/core/users.ts');
    const { authenticate } = await import('../../modules/core/auth.ts');
    const password = randomBytes(24).toString('base64url');
    const email = `laravel-foundation-${randomBytes(12).toString('hex')}@example.test`;
    const user = await createUserWithAccess({name:'Laravel foundation test',email,password,isSuperadmin:false,moduleIds:[]});
    try {
      const session = await authenticate(email,password);
      if(session?.userId !== user.id) throw Error('Next Core login failed');
      const { verifySessionToken } = await import('../../lib/session.ts');
      const { POST } = await import('../../app/api/auth/login/route.ts');
      process.env.SESSION_SECRET = env.APP_KEY;
      const response = await POST(new Request('http://localhost:3000/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}));
      const cookie = response.headers.get('set-cookie')?.match(/sip_session=([^;]+)/)?.[1];
      if(response.status !== 200 || !cookie || (await verifySessionToken(decodeURIComponent(cookie)))?.userId !== user.id) throw Error('Next HTTP login/session verification failed');
      console.log(JSON.stringify({id:user.id,password,hash:user.passwordHash}));
    } catch (error) { await prisma.user.delete({where:{id:user.id}}); throw error; }
  } else if (input.operation === 'verify') {
    const { authenticate } = await import('../../modules/core/auth.ts');
    const user=await prisma.user.findUniqueOrThrow({where:{id:input.id}});
    if(!user.email.startsWith('laravel-foundation-') || !user.email.endsWith('@example.test')) throw Error('Not a fixture');
    const result = require('bcryptjs').compareSync(input.password,user.passwordHash);
    const session=await authenticate(user.email,input.password);
    process.env.SESSION_SECRET = env.APP_KEY;
    const { POST } = await import('../../app/api/auth/login/route.ts');
    const response = await POST(new Request('http://localhost:3000/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:input.password})}));
    console.log(JSON.stringify({verified:result && session?.userId===user.id && response.status===200,prefix:user.passwordHash.slice(0,4)}));
  } else { throw Error('Unknown operation'); }
} finally { await prisma.$disconnect(); }
