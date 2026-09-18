import json
from pathlib import Path

graph_json = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding='utf-8'))

nodes = graph_json.get('nodes', [])
edges = graph_json.get('edges', [])

# Find nodes related to auth, security, RBAC, tenant isolation
security_keywords = ['auth', 'permission', 'rbac', 'tenant', 'business', 'audit', 'role', 'security', 'isolation', 'supabase', 'prisma', 'session', 'cookie', 'middleware', 'require', 'hasPermission', 'requirePermission', 'requireBusinessContext', 'requireAuth', 'logAudit']

print("=== SECURITY-RELEVANT NODES ===")
for n in nodes:
    label = n.get('label', '').lower()
    name = n.get('name', '').lower()
    for kw in security_keywords:
        if kw in label or kw in name:
            print(f"  {n.get('id', 'unknown')}: {n.get('label', 'unknown')} (community: {n.get('community', '?')})")
            break

print("\n=== HIGH-DEGREE NODES (security-relevant) ===")
high_degree = sorted([n for n in nodes if n.get('degree', 0) > 30], key=lambda x: x.get('degree', 0), reverse=True)
for n in high_degree[:15]:
    print(f"  {n.get('id', 'unknown')}: degree={n.get('degree', 0)}, label={n.get('label', 'unknown')}")

print("\n=== COMMUNITY SUMMARY ===")
for cid, members in analysis.get('communities', {}).items():
    community_nodes = [n for n in nodes if n.get('community') == int(cid)]
    security_count = sum(1 for n in community_nodes if any(kw in n.get('label', '').lower() or kw in n.get('name', '').lower() for kw in security_keywords))
    if security_count > 0:
        print(f"  Community {cid} ({len(community_nodes)} nodes): {security_count} security-relevant")
        for n in community_nodes:
            if any(kw in n.get('label', '').lower() or kw in n.get('name', '').lower() for kw in security_keywords):
                print(f"    - {n.get('label', 'unknown')}")