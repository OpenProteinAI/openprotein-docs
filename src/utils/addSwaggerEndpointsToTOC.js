// Wait for the table of contents container element to become available
export default function addSwaggerEndpointsToTOC(endpointPosition) {
  setTimeout(function () {
    // Get table of content and add new ul element to the li of Endpoints
    const tocContainer = document.querySelector("#TOC ul");
    const tocEndpoints = tocContainer.querySelectorAll("li")[endpointPosition];
    const tocUlContainer = document.createElement("ul");
    tocEndpoints.appendChild(tocUlContainer);

    if (tocContainer) {
      clearTimeout(addSwaggerEndpointsToTOC);

      // Find all Swagger tags in the Swagger UI
      const swaggerTags = document.querySelectorAll(".opblock-tag");

      // Iterate over each Swagger tag and add it to the table of contents
      swaggerTags.forEach((tag, index) => {
        // Split tagname to remove description
        const tagName = tag.innerText.split("\n")[0];
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
      });
    }
  }, 1000);
}
