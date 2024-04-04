import getSwaggerJson from "./getSwaggerJson.js";
import getBackendUrl from "./getBackendUrl.js";

// get swagerSpecs manipulated
// const swagerSpecs = await getSwaggerJson("embeddings");

const ui = SwaggerUIBundle({
  // spec: swagerSpecs,
  url: "../openapi/embeddings.yml",
  dom_id: "#swagger-ui",
  deepLinking: true,
  docExpansion: "list",
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
  onComplete: () => {
    addSwaggerEndpointsToTOC(0);
    adjustDescriptions();
  },
});

const HIERARCHY = {
  overview: {
    displayName: "Overview",
    description: null,
    tags: ["embeddings", "svd"],
  },
  computations: {
    displayName: "Computations",
    description: null,
    tags: ["embed", "logits", "attn", "score", "generate"],
  },
  openprotein: {
    displayName: "OpenProtein",
    description: "Proprietary protein language models developed in-house.",
    tags: [
      "prot-seq",
      "rotaprot-large-uniref50w",
      "rotaprot-large-uniref90-ft",
      "poet",
    ],
  },
  esm1: {
    displayName: "ESM1",
    description:
      "Community based ESM1 models, with different versions having different model parameters and training data",
    tags: [
      "esm1b_t33_650M_UR50S",
      "esm1v_t33_650M_UR90S_1",
      "esm1v_t33_650M_UR90S_2",
      "esm1v_t33_650M_UR90S_3",
      "esm1v_t33_650M_UR90S_4",
      "esm1v_t33_650M_UR90S_5",
    ],
  },
  esm2: {
    displayName: "ESM2",
    description:
      "Community based ESM2 models, with different versions having different model parameters and training data",
    tags: [
      "esm2_t6_8M_UR50D",
      "esm2_t12_35M_UR50D",
      "esm2_t30_150M_UR50D",
      "esm2_t33_650M_UR50D",
      "esm2_t36_3B_UR50D",
    ],
  },
};

function adjustDescriptions() {
  // adjust group descriptions
  for (const groupName in HIERARCHY) {
    const tag = document.querySelector(`#operations-tag-${groupName}`);
    if (tag == null) {
      continue;
    }
    const description = tag.querySelector(".renderedMarkdown");
    tag.parentElement.appendChild(description);
    for (const modelName of HIERARCHY[groupName].tags) {
      const tag = document.querySelector(`#operations-tag-${modelName}`);
      if (tag == null) {
        continue;
      }
      const description = tag.querySelector(".renderedMarkdown");
      tag.parentElement.appendChild(description);
    }
  }
}

function addSwaggerEndpointsToTOC(endpointPosition) {
  // Get table of content and add new ul element to the li of Endpoints
  const tocContainer = document.querySelector("#TOC ul");
  const tocEndpoints = tocContainer.querySelectorAll("li")[endpointPosition];
  if (!tocContainer || !tocEndpoints) return;

  const tocUlContainer = document.createElement("ul");
  tocEndpoints.appendChild(tocUlContainer);

  // add toc endpoint for group
  for (const groupName in HIERARCHY) {
    const groupListItem = document.createElement("li");
    const group = HIERARCHY[groupName];
    // check if this is a tag
    const tag = document.querySelector(`#operations-tag-${groupName}`);
    if (tag == null) {
      groupListItem.innerText = group.displayName;
      groupListItem.style.fontWeight = "bold";
      groupListItem.style.paddingLeft = "1.2em";
      groupListItem.style.borderLeft = "1px solid #e9ecef";
    } else {
      const tagSection = document.createElement("section");

      tagSection.setAttribute("id", `${groupName}-endpoint`);
      tagSection.classList.add("level3");

      tag.classList.add("anchored");
      tag.setAttribute("data-anchor-id", `${groupName}-endpoint`);

      tag.insertAdjacentElement("beforebegin", tagSection);

      tagSection.appendChild(tag);

      const tagAnchor = document.createElement("a");
      tagAnchor.innerText = group.displayName;
      tagAnchor.style.fontWeight = "bold";

      tagAnchor.classList.add("nav-link");
      tagAnchor.setAttribute("data-scroll-target", groupName);
      tagAnchor.setAttribute("href", `#${groupName}-endpoint`);
      tagAnchor.setAttribute("id", `toc-${groupName}-endpoint`);

      groupListItem.appendChild(tagAnchor);
    }
    tocUlContainer.appendChild(groupListItem);

    // add toc endpoints under this group
    for (const tagName of group.tags) {
      const tag = document.querySelector(`#operations-tag-${tagName}`);
      if (tag == null) {
        continue;
      }
      // create a section for each swagger tag
      const tagSection = document.createElement("section");

      tagSection.setAttribute("id", `${tagName}-endpoint`);
      tagSection.classList.add("level3");

      // Add to the tah h3 element the quarto classe and attributes
      tag.classList.add("anchored");
      tag.setAttribute("data-anchor-id", `${tagName}-endpoint`);

      // Insert section as the parent element of tag
      tag.insertAdjacentElement("beforebegin", tagSection);

      tagSection.appendChild(tag);

      // Adding new links to the table of content
      // Create a new anchor element for the toc
      const tagAnchor = document.createElement("a");
      tagAnchor.innerText = tagName;

      // Add classes and attributes to the anchor element
      tagAnchor.classList.add("nav-link");
      tagAnchor.setAttribute("data-scroll-target", tagName);
      tagAnchor.setAttribute("href", `#${tagName}-endpoint`);
      tagAnchor.setAttribute("id", `toc-${tagName}-endpoint`);

      // Create a new list item element for the table of content
      const tagListItem = document.createElement("li");
      tagListItem.appendChild(tagAnchor);

      // Add the tag to the table of contents
      tocUlContainer.appendChild(tagListItem);
    }
  }

  // // Iterate over each Swagger tag and add it to the table of contents
  // swaggerTags.forEach((tag) => {
  //   // Split tagname to remove description
  //   const tagName = tag.innerText.split("\n")[0];
  //   // create a section for each swagger tag
  //   const tagSection = document.createElement("section");

  //   tagSection.setAttribute("id", `${tagName}-endpoint`);
  //   tagSection.classList.add("level3");

  //   // Add to the tah h3 element the quarto classe and attributes
  //   tag.classList.add("anchored");
  //   tag.setAttribute("data-anchor-id", `${tagName}-endpoint`);

  //   // Insert section as the parent element of tag
  //   tag.insertAdjacentElement("beforebegin", tagSection);

  //   tagSection.appendChild(tag);

  //   // Adding new links to the table of content
  //   // Create a new anchor element for the toc
  //   const tagAnchor = document.createElement("a");
  //   tagAnchor.innerText = tagName;

  //   // Add classes and attributes to the anchor element
  //   tagAnchor.classList.add("nav-link");
  //   tagAnchor.setAttribute("data-scroll-target", tagName);
  //   tagAnchor.setAttribute("href", `#${tagName}-endpoint`);
  //   tagAnchor.setAttribute("id", `toc-${tagName}-endpoint`);

  //   // Create a new list item element for the table of content
  //   const tagListItem = document.createElement("li");
  //   tagListItem.appendChild(tagAnchor);

  //   // Add the tag to the table of contents
  //   tocUlContainer.appendChild(tagListItem);
  // });
}
