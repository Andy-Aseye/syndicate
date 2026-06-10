import os

import httpx

token = os.environ.get("SHOPIFY_PARTNER_TOKEN")
if not token:
    raise SystemExit(
        "SHOPIFY_PARTNER_TOKEN is not set. Export your Shopify Partner API token "
        "before running this script, e.g. `export SHOPIFY_PARTNER_TOKEN=prtapi_...`"
    )
url = "https://partners.shopify.com/api/2024-01/graphql"
query = """
query {
  organizations(first: 1) {
    nodes {
      id
      businessName
    }
  }
}
"""
response = httpx.post(url, headers={"X-Shopify-Access-Token": token, "Content-Type": "application/json"}, json={"query": query})
print("STATUS:", response.status_code)
print("BODY:", response.text)
