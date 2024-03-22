import addSwaggerEndpointsToTOC from "./addSwaggerEndpointsToTOC.js";
import getSwaggerJson from "./getSwaggerJson.js";
import getBackendUrl from "./getBackendUrl.js";

// get swagerSpecs manipulated
// const swagerSpecs = await getSwaggerJson("embeddings");

SwaggerUIBundle({
  // spec: swagerSpecs,
  url: "../openapi/embeddings.yml",
  dom_id: "#swagger-ui",
  config: {
    deepLinking: true,
    tagsSorter: "alpha",
    docExpansion: "list",
  },
  requestInterceptor: (request) => {
    if (request.url.includes("openapi") && request.url.endsWith(".yml")) {
      return request;
    }
    var requestPath = request.url;
    if (requestPath.startsWith("http")) {
      requestPath = requestPath.split("/").slice(3).join("/");
    }
    if (requestPath.startsWith("/")) {
      requestPath = requestPath.slice(1);
    }
    const backendUrl = getBackendUrl();
    request.url = backendUrl + requestPath;

    return request;
  },
  responseInterceptor: async (res) => {
    if (res.data.type === "application/json5") {
      const text = await res.data.text();

      res.data = text;
      res.text = text;
    }

    return res;
  },
});

await new Promise((r) => setTimeout(r, 500));

addSwaggerEndpointsToTOC(0);
