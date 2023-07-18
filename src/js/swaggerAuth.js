window.onload = async function () {
  // get swagerSpecs manipulated
  const swagerSpecs = await getSwaggerJson("auth");

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
        // Modify the request URL for other endpoints
        request.url = "https://dev.api.openprotein.ai/" + requestPath;
      }
      return request;
    },
  });
  addSwaggerEndpointsToTOC(4);
};
