import addSwaggerEndpointsToTOC from "./addSwaggerEndpointsToTOC.js";
import getSwaggerJson from "./getSwaggerJson.js";

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
      request.url = "https://dev.api.openprotein.ai/" + requestPath;
    }
    request.headers["Access-Control-Allow-Headers"] = "*";
    return request;
  },
});

addSwaggerEndpointsToTOC(2);
