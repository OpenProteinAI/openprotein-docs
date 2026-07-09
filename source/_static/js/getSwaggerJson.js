import getEnvironment from "./getEnvironment.js";

// Project swagger data to show
const apiSchemasProject = [
  "AssayMetadata",
  "Body_create_assay_data_assaydata_post",
  "CriterionSchema",
  "DesignJob",
  "DesignJobResult",
  "DirectionEnum",
  "EmbedJob",
  "Embedding",
  "GeneticAlgorithmJobCreate",
  "HTTPExceptionResponse",
  "HTTPValidationError",
  "Job",
  "JobStatus",
  "JobType",
  "ModelCriterion",
  "NMutationsCriterion",
  "PredictJob",
  "PredictJobCreate",
  "PredictJobDetails",
  "PredictSingleSiteJob",
  "PredictSingleSiteJobCreate",
  "PredictSingleSiteJobDetails",
  "Prediction",
  "SubscoreMetadata",
  "TrainGraphPoint",
  "TrainJob",
  "TrainJobCreate",
  "ValidationError",
  "vault__schemas__workflow__predict__PredictJob__SequencePrediction",
  "vault__schemas__workflow__predict__PredictSingleSiteJob__SequencePrediction",
];

const apiPathProject = [
  "/api/v1/assaydata",
  "/api/v1/assaydata/metadata",
  "/api/v1/assaydata/{assay_id}",
  "/api/v1/assaydata/{assay_id}/sequences",
  "/api/v1/assaydata/{assay_id}/csv",
];

const apiSchemasAlign = [
  "MSASamplingStrategy",
  "ValidationError",
  "HTTPExceptionResponse",
  "HTTPValidationError",
  "JobType",
  "JobStatus",
  "PromptJob",
  "AlignJob",
  "MSAType",
  "MSAMetadata",
  "InputsResponse",
  "MSAGeneratedMetaData",
  "MSASampledMetaData",
  "MSARawMetaData",
  "MSASeed",
  "Body_user_upload_prompt_align_upload_prompt_post",
  "Body_create_msa_job_align_msa_post",
  "Body_create_mafft_alignment_align_mafft_post",
  "Body_create_clustalo_alignment_align_clustalo_post",
  "Body_create_abnumber_alignment_align_abnumber_post",
  "AntibodyAnnotateRequest",
];

const apiPathAlign = [
  "/api/v1/align/upload_prompt",
  "/api/v1/align/prompt",
  "/api/v1/align/msa",
  "/api/v1/align/metadata",
  "/api/v1/align/abnumber",
  "/api/v1/align/antibody_schema",
  "/api/v1/align/antibody/annotate",
  "/api/v1/align/clustalo",
  "/api/v1/align/mafft",
  "/api/v1/align/seed",
  "/api/v1/align/inputs",
];

const apiTagsAlign = [
  { name: "align data", description: "Data, upload, and homology search" },
  {
    name: "general msa",
    description: "Multiple sequence aligners [General]",
  },
  {
    name: "antibody msa",
    description: "Multiple sequence aligners [Antibodies]",
  },
];

const apiTagsProject = [
  {
    name: "assaydata",
    description:
      "Upload your dataset for use with /predictor and /design endpoints!",
  },
];

// PoET swagger data to show
const apiSchemasPoet = [
  "AlignJob",
  "Body_add_poet_child_add_sequences_post",
  "Body_create_msa_job_align_msa_post",
  "Body_create_poet_scores_score_post",
  "Body_user_upload_prompt_align_upload_prompt_post",
  "HTTPExceptionResponse",
  "HTTPValidationError",
  "InputsResponse",
  "Job",
  "JobStatus",
  "JobType",
  "MSAGeneratedMetaData",
  "MSAMetadata",
  "MSARawMetaData",
  "MSASampledMetaData",
  "MSASamplingStrategy",
  "MSAType",
  "PoetJob",
  "PoetJobDetails",
  "PoetSSPmetadata",
  "Poetgeneratemetadata",
  "Poetmetadata",
  "Poetmetadatamulti",
  "PromptJob",
  "SequencePrediction",
  "TextResponse",
  "ValidationError",
  "securitySchemes",
];

const apiPathPoet = [
  "/api/v1/poet/score",
  "/api/v1/poet/single_site",
  "/api/v1/poet/add_sequences",
  "/api/v1/poet/generate",
  "/api/v1/poet/add_generate",
  "/api/v1/poet/inputs",
  "/api/v1/poet/metadata",
];

const apiTagsPoet = [
  {
    name: "poet",
    description:
      "Protein Evolutionary Transformer (PoET): a generative protein language model with evolutionary prompting!",
  },
];

// Auth and jobs swagger data to show
const apiSchemasAuth = [
  "HTTPExceptionResponse",
  "HTTPValidationError",
  "Job",
  "JobStatus",
  "JobType",
  "Token",
  "ValidationError",
  "securitySchemes",
  "JobMetadataUpdate",
];
const apiPathAuth = [
  "/api/v1/jobs",
  "/api/v1/jobs/{job_id}",
  "/api/v1/auth/login",
];
const apiTagsAuth = [
  {
    name: "auth",
    description: "Login to authorize your API requests!",
  },
  {
    name: "jobs",
    description: "Track your submitted workflow jobs!",
  },
];

const devFetchUrls = {
  projectUrl: "https://dev.api.openprotein.ai/openapi.json",
  poetUrl: "https://dev.api.openprotein.ai/openapi.json",
  authUrl: "https://dev.api.openprotein.ai/openapi.json",
  embeddingsUrl:
    "https://dev.api.openprotein.ai/api/v1/embeddings/swagger/doc.json",
  promptUrl: "https://dev.api.openprotein.ai/api/v1/prompt/openapi.json",
};

const prodFetchUrls = {
  projectUrl: "https://api.openprotein.ai/openapi.json",
  poetUrl: "https://api.openprotein.ai/openapi.json",
  authUrl: "https://api.openprotein.ai/openapi.json",
  embeddingsUrl:
    "https://api.openprotein.ai/api/v1/embeddings/swagger/doc.json",
  promptUrl: "https://api.openprotein.ai/api/v1/prompt/openapi.json",
};

export default async function getSwaggerJson(swaggerType) {
  let apiPathToShow = [];
  let apiSchemasToShow = [];
  let swaggerSpecs = {};

  const environment = getEnvironment();
  const fetchUrls = environment === "dev" ? devFetchUrls : prodFetchUrls;

  if (swaggerType === "project") {
    // get the full swagger specs
    swaggerSpecs = await (await fetch(fetchUrls.projectUrl)).json();
    // update variables according to the swagger type
    apiPathToShow = apiPathProject;
    apiSchemasToShow = apiSchemasProject;
    swaggerSpecs.tags = apiTagsProject;
  }
  if (swaggerType === "align") {
    // get the full swagger specs
    swaggerSpecs = await (await fetch(fetchUrls.projectUrl)).json();

    // update variables according to the swagger type
    apiPathToShow = apiPathAlign;
    apiSchemasToShow = apiSchemasAlign;
    swaggerSpecs.tags = apiTagsAlign;
  } else if (swaggerType === "poet") {
    // get the full swagger specs
    swaggerSpecs = await (await fetch(fetchUrls.poetUrl)).json();
    // update variables according to the swagger type
    apiPathToShow = apiPathPoet;
    apiSchemasToShow = apiSchemasPoet;
    swaggerSpecs.tags = apiTagsPoet;
  } else if (swaggerType === "auth") {
    // get the full swagger specs
    swaggerSpecs = await (await fetch(fetchUrls.authUrl)).json();
    // update variables according to the swagger type
    apiPathToShow = apiPathAuth;
    apiSchemasToShow = apiSchemasAuth;
    swaggerSpecs.tags = apiTagsAuth;
  } else if (swaggerType === "embeddings") {
    // get the full swagger specs
    swaggerSpecs = await (await fetch(fetchUrls.embeddingsUrl)).json();
    return swaggerSpecs;
  } else if (swaggerType === "prompt") {
    // The prompt service exports its own (prompt-only) spec, so there is
    // nothing to filter — fetch and return it as-is. Includes the dynamic
    // per-system-prompt routes whenever the backend DB is seeded.
    swaggerSpecs = await (await fetch(fetchUrls.promptUrl)).json();
    return swaggerSpecs;
  } else if (swaggerType === "models") {
    // Served from the main service. Rather than curating explicit path/schema
    // allowlists, just keep the models module's routes (everything under
    // /api/v1/models) and leave components/tags untouched.
    swaggerSpecs = await (await fetch(fetchUrls.projectUrl)).json();
    const modelsPaths = {};
    for (const pathKey in swaggerSpecs.paths) {
      if (pathKey.startsWith("/api/v1/models")) {
        modelsPaths[pathKey] = swaggerSpecs.paths[pathKey];
      }
    }
    swaggerSpecs.paths = modelsPaths;
    return swaggerSpecs;
  }

  const filteredPathsToShow = {};
  for (const pathKey in swaggerSpecs.paths) {
    apiPathToShow.forEach((pathToShow) => {
      if (pathToShow === pathKey) {
        filteredPathsToShow[pathToShow] = swaggerSpecs.paths[pathToShow];
      }
    });
  }

  swaggerSpecs.paths = filteredPathsToShow;

  const filteredSchemasToShow = {};
  for (const schemaKey in swaggerSpecs.components.schemas) {
    apiSchemasToShow.forEach((schemaKeyToShow) => {
      if (schemaKeyToShow === schemaKey) {
        filteredSchemasToShow[schemaKeyToShow] =
          swaggerSpecs.components.schemas[schemaKeyToShow];
      }
    });
  }

  swaggerSpecs.components.schemas = filteredSchemasToShow;

  return swaggerSpecs;
}
