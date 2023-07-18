import addSwaggerEndpointsToTOC from "./addSwaggerEndpointsToTOC.js";
import getSwaggerJson from "./getSwaggerJson.js";

window.onload = async function () {
  // get swagerSpecs manipulated
  const swagerSpecs = await getSwaggerJson("embeddings");

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
      request.url = "https://dev.api.openprotein.ai/" + requestPath;

      return request;
    },
  });
  addSwaggerEndpointsToTOC(0);
};
