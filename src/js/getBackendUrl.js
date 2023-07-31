import getEnvironment from "./getEnvironment.js";

export default function getBackendUrl() {
  // get environment
  const environment = getEnvironment();
  return environment === "dev"
    ? "https://dev.api.openprotein.ai/"
    : "https://api.openprotein.ai/";
}
