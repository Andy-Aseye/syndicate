import httpx

token = "prtapi_0a68f4473d29f6ab825d05ae155560ae"
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
