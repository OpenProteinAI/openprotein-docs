export default function getEnvironment() {
  const url = window.location.href;
  console.log(url);
  if(url.includes("dev.api.openprotein.ai") || url.includes('localhost')) return "dev";
  return "prod";
}