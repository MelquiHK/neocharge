#!/usr/bin/env python3
"""Push de la rama actual a GitHub vía API (SSH bloqueado por el proxy).

Sube cada commit local posterior al HEAD remoto, en orden:
- Si el objeto commit ya existe en GitHub, lo reutiliza (toma su tree).
- Si no, crea tree (base_tree + contenido inline), verifica el SHA contra el
  tree local, crea el commit y lo reconstruye byte-idéntico por fuerza bruta
  de timestamp (ver ~/AGENTS.md "GitHub push vía API").
Al final mueve el ref de la rama (fast-forward).
"""
import datetime
import hashlib
import json
import subprocess
import sys
import zlib

sys.path.insert(0, "/home/hatch/workspace/skills/github/bin")
from github import api  # noqa: E402

REPO = "MelquiHK/neocharge"
BRANCH = "feature/diseno-azul-vidrio"


def sh(*args):
    return subprocess.run(args, capture_output=True, text=True, check=True).stdout.strip()


def gh_exists_commit(sha):
    try:
        _, r = api("GET", f"/repos/{REPO}/git/commits/{sha}")
        return r
    except RuntimeError as e:
        if "HTTP 404" in str(e):
            return None
        raise


def build_tree(base_tree_sha, commit_sha):
    """Crea en GitHub el tree del commit local y verifica el SHA."""
    files = sh("git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit_sha).split("\n")
    entries = []
    for path in files:
        if not path:
            continue
        exists = subprocess.run(["git", "cat-file", "-e", f"{commit_sha}:{path}"]).returncode == 0
        if exists:
            content = subprocess.run(["git", "show", f"{commit_sha}:{path}"],
                                     capture_output=True, check=True).stdout.decode("utf-8")
            ls = sh("git", "ls-tree", commit_sha, "--", path)
            mode = ls.split()[0] if ls else "100644"
            entries.append({"path": path, "mode": mode, "type": "blob", "content": content})
        else:
            entries.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
    _, tree_resp = api("POST", f"/repos/{REPO}/git/trees",
                       {"base_tree": base_tree_sha, "tree": entries})
    local_tree = sh("git", "rev-parse", f"{commit_sha}^{{tree}}")
    if tree_resp["sha"] != local_tree:
        raise RuntimeError(f"tree remoto {tree_resp['sha']} != local {local_tree}")
    return tree_resp["sha"]


def create_and_reconstruct(message, tree_sha, parent_sha):
    """Crea el commit vía API y lo reconstruye byte-idéntico en local."""
    message = message.rstrip("\n")
    _, commit_resp = api("POST", f"/repos/{REPO}/git/commits",
                         {"message": message, "tree": tree_sha, "parents": [parent_sha]})
    new_sha = commit_resp["sha"]
    _, real = api("GET", f"/repos/{REPO}/git/commits/{new_sha}")
    author, committer = real["author"], real["committer"]
    server_ts = int(datetime.datetime.fromisoformat(
        author["date"].replace("Z", "+00:00")).timestamp())
    target = bytes.fromhex(new_sha)
    found = None
    for ts in range(server_ts - 7200, server_ts + 7200):
        for tz in ("+0000", "-0400"):
            header = (
                f"tree {tree_sha}\n"
                f"parent {parent_sha}\n"
                f"author {author['name']} <{author['email']}> {ts} {tz}\n"
                f"committer {committer['name']} <{committer['email']}> {ts} {tz}\n"
                f"\n{message}"
            ).encode("utf-8")
            obj = b"commit %d\0" % len(header) + header
            if hashlib.sha1(obj).digest() == target:
                found = obj
                break
        if found:
            break
    if not found:
        raise RuntimeError("no se pudo reconstruir el commit byte-idéntico")
    d, f = new_sha[:2], new_sha[2:]
    subprocess.run(["mkdir", "-p", f".git/objects/{d}"], check=True)
    with open(f".git/objects/{d}/{f}", "wb") as fh:
        fh.write(zlib.compress(found))
    assert sh("git", "cat-file", "-t", new_sha) == "commit"
    return new_sha


def main():
    _, ref = api("GET", f"/repos/{REPO}/git/refs/heads/{BRANCH}")
    remote_sha = ref["object"]["sha"]
    head = sh("git", "rev-parse", "HEAD")
    print(f"remoto: {remote_sha}\nlocal HEAD: {head}")

    # El remoto debe ser ancestro del HEAD local
    anc = subprocess.run(["git", "merge-base", "--is-ancestor", remote_sha, head])
    if anc.returncode != 0:
        print("El remoto NO es ancestro del HEAD local. Abortando.", file=sys.stderr)
        return 1

    commits = sh("git", "rev-list", "--reverse", f"{remote_sha}..{head}").split("\n")
    commits = [c for c in commits if c]
    print(f"commits a subir: {len(commits)}")

    parent = remote_sha
    # tree del padre remoto
    _, parent_commit = api("GET", f"/repos/{REPO}/git/commits/{parent}")
    parent_tree = parent_commit["tree"]["sha"]
    new_head = None

    for c in commits:
        existing = gh_exists_commit(c)
        if existing:
            print(f"{c[:8]} ya existe en GitHub, reutilizando")
            new_head = c
            parent_tree = existing["tree"]["sha"]
            parent = c
            # Registrar el objeto local si no lo tenemos (no debería pasar)
            continue
        message = sh("git", "log", "-1", "--format=%B", c)
        tree_sha = build_tree(parent_tree, c)
        new_head = create_and_reconstruct(message, tree_sha, parent)
        print(f"{c[:8]} -> {new_head[:8]}")
        # Actualizar el ref local de la rama al SHA reconstruido
        sh("git", "update-ref", f"refs/heads/{BRANCH}", new_head)
        parent_tree = tree_sha
        parent = new_head

    if new_head and new_head != remote_sha:
        sh("git", "update-ref", f"refs/remotes/origin/{BRANCH}", new_head)
        api("PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}", {"sha": new_head})
        print(f"PUSH OK: {BRANCH} {remote_sha[:8]} -> {new_head[:8]}")
    else:
        print("Nada que subir.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
