export default function getEnvironment() {
  const url = window.location.href;
  if(url.includes("dev.api.openprotein.ai") || url.includes('localhost')) return "dev";
  return "prod";
}