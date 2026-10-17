"""Fixed, read-mostly bridge to a trusted *separately installed* Coding Agent.
No arbitrary Python command, build, install, project write, or GUI launch is accepted.
"""
import json
import hashlib
import re
import sys
from pathlib import Path


def emit(result):
    print(json.dumps(result, ensure_ascii=False, separators=(',', ':')))


def summarize(report):
    return {
        'state': report.level.value,
        'findings': [
            {'file': f.filename, 'rule': f.rule, 'level': f.level.value, 'detail': f.detail}
            for f in report.findings[:30]
        ],
        'truncated': len(report.findings) > 30,
    }


def main():
    if len(sys.argv) != 2:
        emit({'ok': False, 'error': 'Trusted checkout required'})
        return
    root = Path(sys.argv[1]).resolve(strict=True)
    sys.path.insert(0, str(root))
    data = json.loads(sys.stdin.read(16385))
    mode = data.get('mode')
    if mode in ('review', 'secure-preflight'):
        from chromaplex_agent.security import scan_files
        from chromaplex_agent.memory_safety import scan_memory_safety
        from chromaplex_agent.targets import get_target
        target = get_target(data['target'])
        filename = data['filename']
        if not isinstance(filename, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,99}', filename) or filename == '..':
            raise ValueError('Unsafe source filename')
        files = {filename: data['source']}
        language = data['language']
        static = summarize(scan_files(files))
        memory = summarize(scan_memory_safety(files, language, target=target))
        base = {
            'target': target.key, 'targetFamily': target.family,
            'staticAnalysis': static, 'memorySafety': memory,
            'sourceHashes': {filename: hashlib.sha256(data['source'].encode('utf-8')).hexdigest()},
            'fullSecureBuildVerified': False, 'binaryReleased': False,
        }
        if mode == 'review':
            emit({'ok': True, 'operation': 'source-review', **base,
                  'notice': 'Diagnostic source review only. No malware scan or build release. Not equivalent to Secure Compile Gate.'})
            return
        from chromaplex_agent.secure_compile import preflight_sources, SecureCompilePolicy
        # Mandatory malware scanning; no permissive fallback. May create short-lived
        # files in the official upstream preflight quarantine directory.
        try:
            gate = preflight_sources(files, language=language, target=target,
                                    policy=SecureCompilePolicy(malware_scan_required=True, allow_reviewed_source=False,
                                                               require_memory_safe=True))
        except Exception:
            emit({'ok': False, 'operation': 'secure-preflight', **base, 'malwareScan': 'NOT PASSED',
                  'notice': 'Fail-closed: upstream secure preflight did not pass. Nothing built, approved or released.'})
            return
        emit({'ok': True, 'operation': 'secure-preflight', **base,
              'malwareScan': gate.malware.state.value,
              'sourceHashes': gate.source_hashes,
              'notice': 'Upstream source preflight passed, including mandatory malware check. Binary gate, quarantine compilation, binary scan, SHA-256 release manifest and actual deployment NOT performed.'})
    elif mode == 'verify-artifact':
        from chromaplex_agent.secure_compile import verify_security_manifest
        binary = Path(data['path']).resolve(strict=True)
        manifest = binary.with_name(binary.name + '.security.json')
        if not manifest.exists() or manifest.is_symlink():
            emit({'ok': False, 'operation': 'verify-artifact', 'verified': False,
                  'notice': 'Trusted security manifest missing or symlinked; verification failed closed.'})
            return
        ok, issues = verify_security_manifest(binary, manifest)
        emit({'ok': bool(ok), 'operation': 'verify-artifact', 'verified': bool(ok),
              'problems': [str(i)[:200] for i in issues[:12]],
              'notice': 'Local SHA-256/security manifest verification; not publisher authenticity or physical hardware validation.'})
    else:
        emit({'ok': False, 'error': 'Unsupported operation'})


if __name__ == '__main__':
    try:
        main()
    except Exception:
        emit({'ok': False, 'error': 'Trusted Coding Agent operation unavailable or invalid; no security approval granted'})
