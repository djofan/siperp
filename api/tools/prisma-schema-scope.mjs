import { mkdirSync, lstatSync, realpathSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

/** Scope Prisma's recursive loader to the two existing schema roots.
 * Junction resolution preserves original schema paths and generator output.
 */
export function scopedPrismaSchema(repoRoot) {
    const scope = resolve(repoRoot, 'api/storage/app/prisma-scan');
    mkdirSync(scope, { recursive: true });
    for (const [name, relative] of [['core', 'prisma/schema'], ['modules', 'modules']]) {
        const target = resolve(repoRoot, relative);
        const link = resolve(scope, name);
        let exists = false;
        try { lstatSync(link); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (!exists) symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
        if (realpathSync(link) !== realpathSync(target)) throw new Error(`Unexpected Prisma schema link: ${name}`);
    }
    return scope;
}
