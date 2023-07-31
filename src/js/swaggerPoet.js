import addSwaggerEndpointsToTOC from "./addSwaggerEndpointsToTOC.js";
import getSwaggerJson from "./getSwaggerJson.js";
import getBackendUrl from "./getBackendUrl.js";

// get swagerSpecs manipulated
const swagerSpecs = await getSwaggerJson("poet");

SwaggerUIBundle({
  spec: swagerSpecs,
  dom_id: "#swagger-ui",
  config: {
    deepLinking: true,
    tagsSorter: "alpha",
    docExpansion: "list",
  },
  requestInterceptor: (request) => {
    const requestPath = request.url.split("/").slice(3).join("/");
    if (!request.url.includes("openapi.json")) {
      const backendUrl = getBackendUrl()
      request.url = backendUrl + requestPath;
    }
    request.headers["Access-Control-Allow-Headers"] = "*";
    return request;
  },
  responseInterceptor: async (res) => {
    if (res.data.type === 'application/json5') {
      const text = await res.data.text();

      res.data = text;
      res.text = text;
    }

    return res;
  },
});

addSwaggerEndpointsToTOC(2);
