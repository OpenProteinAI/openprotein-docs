import addSwaggerEndpointsToTOC from "./addSwaggerEndpointsToTOC.js";
import getSwaggerJson from "./getSwaggerJson.js";
import getBackendUrl from "./getBackendUrl.js";

// Fetch the main-service spec and keep only the /api/v1/models routes.
const swagerSpecs = await getSwaggerJson("models");

SwaggerUIBundle({
  spec: swagerSpecs,
  dom_id: "#swagger-ui",
  deepLinking: true,
  tagsSorter: "alpha",
  docExpansion: "list",
  // Hide the bottom "Schemas" section — we render the models routes as-is and
  // don't curate the component list.
  defaultModelsExpandDepth: -1,
  requestInterceptor: (request) => {
    const requestPath = request.url.split("/").slice(3).join("/");
    if (!request.url.includes("openapi.json")) {
      const backendUrl = getBackendUrl();
      // Route "Try it out" calls at the live backend.
      request.url = backendUrl + requestPath;
    }
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

addSwaggerEndpointsToTOC(6);
