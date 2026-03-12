import getBackendUrl from "./getBackendUrl.js";
import embeddingsSpec from "./embeddingsSpec.js";

const ui = SwaggerUIBundle({
  spec: embeddingsSpec,
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

const GROUP_DISPLAY_NAMES = {
  openprotein: "OpenProtein",
  esm1: "ESM1",
  esm2: "ESM2",
  community: "Community-based",
};

function buildHierarchy(spec) {
  const tagOrder = {};
  const tagDescriptions = {};
  if (spec.tags) {
    spec.tags.forEach((tag, i) => {
      tagOrder[tag.name] = i;
      tagDescriptions[tag.name] = tag.description;
    });
  }
  const bySpecOrder = (a, b) => (tagOrder[a] ?? Infinity) - (tagOrder[b] ?? Infinity);

  const overviewTags = new Set();
  const computationTypes = new Set();
  const groupChildren = {};

  // Scan all operations to discover tag structure:
  // - Single-tag operations → overview tags (e.g. ["embeddings"])
  // - Multi-tag operations → [group, ...models, computationType]
  for (const path in spec.paths) {
    for (const method in spec.paths[path]) {
      const op = spec.paths[path][method];
      if (!op.tags) continue;

      if (op.tags.length === 1) {
        overviewTags.add(op.tags[0]);
      } else if (op.tags.length >= 3) {
        const group = op.tags[0];
        computationTypes.add(op.tags[op.tags.length - 1]);
        if (!groupChildren[group]) groupChildren[group] = new Set();
        for (let i = 1; i < op.tags.length - 1; i++) {
          groupChildren[group].add(op.tags[i]);
        }
      }
    }
  }

  const hierarchy = {
    overview: {
      displayName: "Overview",
      description: null,
      tags: [...overviewTags].sort(bySpecOrder),
    },
    computations: {
      displayName: "Computations",
      description: null,
      tags: [...computationTypes].sort(bySpecOrder),
    },
  };

  for (const group of Object.keys(groupChildren).sort(bySpecOrder)) {
    hierarchy[group] = {
      displayName:
        GROUP_DISPLAY_NAMES[group] ||
        group.charAt(0).toUpperCase() + group.slice(1),
      description: tagDescriptions[group] || null,
      tags: [...groupChildren[group]].sort(bySpecOrder),
    };
  }

  return hierarchy;
}

const HIERARCHY = buildHierarchy(embeddingsSpec);

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
  const tocContainer = document.querySelector(".bd-toc-nav ul");
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
