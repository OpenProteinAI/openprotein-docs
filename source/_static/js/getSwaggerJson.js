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
  "/api/v1/workflow/train",
  "/api/v1/workflow/train/br",
  "/api/v1/workflow/train/gp",
  "/api/v1/workflow/train/{job_id}",
  "/api/v1/workflow/design/genetic-algorithm",
  "/api/v1/workflow/design/{job_id}",
  "/api/v1/workflow/predict",
  "/api/v1/workflow/predict/single_site",
  "/api/v1/workflow/predict/{job_id}",
  "/api/v1/workflow/predict/single_site/{job_id}",
  "/api/v1/workflow/embed/umap/{assay_id}",
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
];

const apiPathAlign = [
  "/api/v1/align/upload_prompt",
  "/api/v1/align/prompt",
  "/api/v1/align/msa",
  "/api/v1/align/metadata",
  "/api/v1/align/abnumber",
  "/api/v1/align/antibody_schema",
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
    name: "train",
    description: "Train ML models based on your datasets!",
  },
  {
    name: "predict",
    description:
      "Endpoints for predicting properties on arbitary sequences with your OpenProtein trained models!",
  },
  {
    name: "assaydata",
    description:
      "Upload your dataset for use with /train and /design endpoints!",
  },
  {
    name: "design",
    description: "design new variants to meet your design objectives!",
  },
  {
    name: "embed",
    description: "Create and retrieve UMAP embeddings for your data!",
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
  "/api/v1/login/user-access-token",
];
const apiTagsAuth = [
  {
    name: "login",
    description: "Login to authorize your API requests!",
  },
  {
    name: "jobs",
    description: "Track your submitted workflow jobs!",
  },
];

const devFetchUrls = {
  projectUrl: "https://dev.api.openprotein.ai/api/v1/openapi.json",
  poetUrl: "https://dev.api.openprotein.ai/api/v1/poet/openapi.json",
  authUrl: "https://dev.api.openprotein.ai/openapi.json",
  embeddingsUrl:
    "https://dev.api.openprotein.ai/api/v1/embeddings/swagger/doc.json",
};

const prodFetchUrls = {
  projectUrl: "https://api.openprotein.ai/api/v1/openapi.json",
  poetUrl: "https://api.openprotein.ai/api/v1/poet/openapi.json",
  authUrl: "https://api.openprotein.ai/openapi.json",
  embeddingsUrl:
    "https://api.openprotein.ai/api/v1/embeddings/swagger/doc.json",
};

export default async function getSwaggerJson(swaggerType) {
  let apiPathToShow = [];
  let apiSchemasToShow = [];
  let swagerSpecs = {};

  const environment = getEnvironment();
  const fetchUrls = environment === "dev" ? devFetchUrls : prodFetchUrls;

  if (swaggerType === "project") {
    // get the full swagger specs
    swagerSpecs = await (await fetch(fetchUrls.projectUrl)).json();
    // update variables according to the swagger type
    apiPathToShow = apiPathProject;
    apiSchemasToShow = apiSchemasProject;
    swagerSpecs.tags = apiTagsProject;
  }
  if (swaggerType === "align") {
    // get the full swagger specs
    swagerSpecs = await (await fetch(fetchUrls.projectUrl)).json();

    // update variables according to the swagger type
    apiPathToShow = apiPathAlign;
    apiSchemasToShow = apiSchemasAlign;
    swagerSpecs.tags = apiTagsAlign;
  } else if (swaggerType === "poet") {
    // get the full swagger specs
    swagerSpecs = await (await fetch(fetchUrls.poetUrl)).json();
    // update variables according to the swagger type
    apiPathToShow = apiPathPoet;
    apiSchemasToShow = apiSchemasPoet;
    swagerSpecs.tags = apiTagsPoet;
  } else if (swaggerType === "auth") {
    // get the full swagger specs
    swagerSpecs = await (await fetch(fetchUrls.authUrl)).json();
    // update variables according to the swagger type
    apiPathToShow = apiPathAuth;
    apiSchemasToShow = apiSchemasAuth;
    swagerSpecs.tags = apiTagsAuth;
  } else if (swaggerType === "embeddings") {
    // get the full swagger specs
    swagerSpecs = await (await fetch(fetchUrls.embeddingsUrl)).json();
    return swagerSpecs;
  }

  const filteredPathsToShow = {};
  for (const pathKey in swagerSpecs.paths) {
    apiPathToShow.forEach((pathToShow) => {
      if (pathToShow === pathKey) {
        filteredPathsToShow[pathToShow] = swagerSpecs.paths[pathToShow];
      }
    });
  }

  swagerSpecs.paths = filteredPathsToShow;

  const filteredSchemasToShow = {};
  for (const schemaKey in swagerSpecs.components.schemas) {
    console.log(schemaKey);
    apiSchemasToShow.forEach((schemaKeyToShow) => {
      if (schemaKeyToShow === schemaKey) {
        filteredSchemasToShow[schemaKeyToShow] =
          swagerSpecs.components.schemas[schemaKeyToShow];
      }
    });
  }

  swagerSpecs.components.schemas = filteredSchemasToShow;

  return swagerSpecs;
}
