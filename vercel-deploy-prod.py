#!/usr/bin/env python3
"""Crea un deployment de PRODUCCIÓN en Vercel desde la rama de GitHub.

Uso: python3 vercel-deploy-prod.py <git-sha>
"""
import json
import sys
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response  # noqa: E402

API = "https://api.vercel.com"
ALLOWED = ["api.vercel.com"]
CRED = "custom.vercel"
PROJECT_ID = "prj_fORCkzQBEaG6YsMZ0s5nH8A6DuoK"
REPO_ID = 1213579492
BRANCH = "feature/diseno-azul-vidrio"


def main():
    sha = sys.argv[1] if len(sys.argv) > 1 else None
    if not sha:
        print("uso: vercel-deploy-prod.py <git-sha>", file=sys.stderr)
        return 2
    body = {
        "name": "tienda-neocharge",
        "project": PROJECT_ID,
        "target": "production",
        "gitSource": {
            "type": "github",
            "repoId": REPO_ID,
            "ref": BRANCH,
            "sha": sha,
        },
    }
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{API}/v13/deployments", data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    add_surrogate_to_request(req, CRED, allowed_hosts=ALLOWED)
    with urllib.request.urlopen(req, timeout=60) as r:
        resp = read_json_response(r)
    print(json.dumps({"id": resp.get("id"), "url": resp.get("url"),
                      "status": resp.get("status"), "target": resp.get("target")},
                     ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
