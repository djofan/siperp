"""Root-only, opt-in permission repair. No audio/database/env contents are changed."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import stat
import subprocess


def targets(storage, paths):
    root = storage / 'app/private'
    if root.is_symlink() or root.resolve() != root:
        raise RuntimeError('Private root must be a direct directory')
    directories = []
    for path in [storage, storage/'app', root, root/'rapat', root/'rapat/media', root/'rapat/attachments']:
        if path.is_symlink():
            raise RuntimeError('Refusing linked directory')
        if path.exists():
            if not path.is_dir():
                raise RuntimeError('Invalid private directory')
            directories.append(path)
    files, missing = [], 0
    for relative in set(paths):
        if not isinstance(relative, str) or not re.fullmatch(r'rapat/(media|attachments)/[a-f0-9-]{36}\.enc', relative):
            raise RuntimeError('Invalid registered upload path')
        file = root/relative
        if file.is_symlink():
            raise RuntimeError('Refusing linked upload')
        if not file.exists():
            missing += 1
            continue
        info = file.lstat()
        if file.resolve() != file or not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise RuntimeError('Refusing indirect or shared upload')
        files.append(file)
    return root, directories, files, missing


def repair(root, directories, files, gid):
    # Above Rapat: only permit traversal; no listing/write access is added.
    for directory in directories:
        if directory == root or directory in root.parents:
            if directory.stat().st_gid != gid:
                raise RuntimeError('Ancestor group differs; manual review required')
    snapshot = [dict(path=str(p), mode=stat.S_IMODE(p.stat().st_mode), uid=p.stat().st_uid, gid=p.stat().st_gid) for p in directories+files]
    return snapshot


def apply(root, directories, files, gid):
    for directory in directories:
        if directory == root or directory in root.parents:
            os.chmod(directory, stat.S_IMODE(directory.stat().st_mode) | stat.S_IXGRP)
        else:
            os.chown(directory, -1, gid)
            os.chmod(directory, 0o2770)
    for file in files:
        os.chown(file, -1, gid)
        os.chmod(file, 0o640)


def main():
    import fcntl
    import grp
    import pwd
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise RuntimeError('Run as root')
    base = Path('/var/www/siperp-deploy')
    with open('/run/lock/siperp-release.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        release = (base/'current').resolve(strict=True)
        if release.parent != base/'releases' or not re.fullmatch(r'[0-9]{14}-[a-f0-9]{12}', release.name):
            raise RuntimeError('Invalid active release')
        registry = json.loads((base/'registry.json').read_text())
        if registry['active'] != release.name:
            raise RuntimeError('Registry and current differ')
        php = r'''
require $argv[1].'/api/vendor/autoload.php';
$app=require $argv[1].'/api/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if(config('filesystems.disks.local.driver')!=='local') exit(2);
$paths=App\Modules\Rapat\Models\Media::query()->pluck('path')->all();
if(class_exists(App\Modules\Rapat\Models\Attachment::class)) {
 $paths=array_merge($paths,App\Modules\Rapat\Models\Attachment::query()->pluck('path')->all());
}
echo json_encode(['storage'=>realpath(storage_path()),'root'=>realpath(config('filesystems.disks.local.root')),'paths'=>$paths]);
'''
        query = subprocess.run(['/usr/bin/php8.4', '-r', php, str(release)], capture_output=True, timeout=60)
        if query.returncode != 0:
            raise RuntimeError('Cannot read private storage metadata')
        data = json.loads(query.stdout)
        storage = Path(data['storage'])
        if storage != (release/'api/storage').resolve() or data['root'] != str(storage/'app/private'):
            raise RuntimeError('Storage root differs; manual review required')
        root, directories, files, missing = targets(storage, data['paths'])
        gid = grp.getgrnam('www-data').gr_gid
        worker = pwd.getpwnam('siperp')
        if gid not in os.getgrouplist(worker.pw_name, worker.pw_gid):
            # systemd sets Group=www-data; reproduce that identity in the check below.
            print('NOTE: using explicit worker group www-data for verification')
        snapshot = repair(root, directories, files, gid)
        print(json.dumps({'status':'RAPAT_ACCESS_PLAN','directories':len(directories),'uploads_found':len(files),'uploads_missing':missing}))
        if not args.apply:
            print('No permissions changed. Re-run with --apply.')
            return
        if not files:
            raise RuntimeError('No registered uploads found; refusing permission changes')
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
        audit = base/'audit'/('rapat-access-'+stamp+'.json')
        fd = os.open(audit, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as report:
            json.dump({'release': release.name, 'before': snapshot}, report, indent=2)
        apply(root, directories, files, gid)
        print('RAPAT_ACCESS_PERMISSIONS_UPDATED; private permission audit:', audit)
        check = subprocess.run(['runuser', '-u', 'siperp', '-g', 'www-data', '--', '/usr/bin/php8.4', str(release/'api/tools/check-rapat-audio.php')], capture_output=True, timeout=60)
        print(check.stdout.decode(errors='replace').strip())
        if check.returncode != 0:
            raise RuntimeError('Worker audio check did not pass; preserve the output above')
        print('RAPAT_ACCESS_REPAIR_COMPLETE')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Do not print raw PHP diagnostics, credentials, audio, or transcript.
        print('RAPAT_ACCESS_REPAIR_STOPPED:', type(error).__name__, str(error) if isinstance(error, RuntimeError) else 'Check filesystem and runtime prerequisites')
        raise SystemExit(1)
