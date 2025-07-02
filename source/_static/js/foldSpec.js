const foldSpec = {
  openapi: "3.0.2",
  info: {
    title: "OpenProtein Fold",
    description:
      "# Fold API\nThe Fold API provided by OpenProtein.ai allows you to generate protein structures from both proprietary and open source models.\n\nYou can list the available models with `/fold/models` and view a model summary (including usage, citations, limitations and more) with `/fold/model/{model_id}`.\n\nCurrently, we support the following models:\n- **ESMFold**: Open-sourced ESMFold model.\n- **AlphaFold2**: Open-sourced implementation using colabfold.\n\n\n",
    version: "1.0.0",
  },
  servers: [
    {
      url: "https://dev.api.openprotein.ai",
      description: "Dev server",
    },
  ],
  paths: {
    "/api/v1/fold/models": {
      get: {
        tags: ["fold"],
        summary: "List fold models",
        description: "Get available models.",
        responses: {
          "200": {
            description: "Available fold models returned.",
            content: {
              "application/json": {
                schema: {
                  title: "Fold Models",
                  description: "List of available fold models.",
                  type: "array",
                  items: {
                    type: "string",
                  },
                  example: ["esmfold", "alphafold2", "..."],
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/models/{model_id}": {
      get: {
        tags: ["fold"],
        summary: "Get fold model metadata",
        description: "Get information about specific fold model.",
        operationId: "getModelMetadata",
        parameters: [
          {
            name: "model_id",
            description:
              "Model ID to query.\n\nList models to find available models.\n",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: ["esmfold", "alphafold2"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Detailed information about model returned.",
            content: {
              "application/json": {
                schema: {
                  title: "ModelMetadata",
                  description: "Metadata of protein language model.",
                  required: [
                    "dimension",
                    "description",
                    "input_tokens",
                    "max_sequence_length",
                    "model_id",
                    "output_tokens",
                    "output_types",
                    "token_descriptions",
                  ],
                  type: "object",
                  properties: {
                    model_id: {
                      title: "ModelID",
                      description: "ID of model to be used.",
                      type: "string",
                    },
                    description: {
                      title: "ModelDescription",
                      description:
                        "Description of the model including relevant citations.",
                      type: "object",
                      properties: {
                        summary: {
                          title: "Summary",
                          description: "Summary of the model description.",
                          type: "string",
                        },
                        citation_title: {
                          title: "CitationTitle",
                          description: "Title of the citation for the model.",
                          type: "string",
                        },
                        doi: {
                          title: "DOI",
                          description: "DOI of the citation for the model.",
                          type: "string",
                        },
                      },
                    },
                    dimension: {
                      type: "integer",
                      description:
                        "Output dimensions of the model. Returns `-1` if irrelevant.",
                    },
                    input_tokens: {
                      type: "array",
                      description: "List of valid input tokens.",
                      example: ["A", "R", "N"],
                      items: {
                        type: "string",
                      },
                    },
                    max_sequence_length: {
                      type: "integer",
                      description:
                        "Maximum sequence length supported by model.",
                    },
                    output_tokens: {
                      type: "array",
                      description:
                        "List of output tokens ordered by token id. Use this to decode logits.",
                      example: ["A", "R", "N"],
                      items: {
                        type: "string",
                      },
                    },
                    output_types: {
                      type: "array",
                      description: "Outputs supported by the model.",
                      items: {
                        type: "string",
                      },
                    },
                    token_descriptions: {
                      type: "array",
                      description:
                        "Description of all tokens, ordered by token id. The nth item describes the token(s) represented by token id `n`.\nSome token ids can represent multiple tokens.",
                      items: {
                        type: "array",
                        items: {
                          title: "TokenDetails",
                          description: "Details of token.",
                          required: ["id", "description", "primary", "token"],
                          type: "object",
                          properties: {
                            id: {
                              type: "integer",
                              description: "Token ID",
                            },
                            token: {
                              type: "string",
                              description: "The token's string representation",
                            },
                            description: {
                              type: "string",
                              description: "Meaning of this token",
                            },
                            primary: {
                              type: "boolean",
                              description:
                                "When a token id represents multiple tokens, this flag indicates whether or not this is the primary token.",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Model was not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "getModelMetadata",
      },
    },
    "/api/v1/fold/models/esmfold": {
      post: {
        tags: ["fold requests", "esmfold"],
        summary: "ESMFold",
        description:
          "Create structure prediction using ESMFold from input protein sequences.",
        requestBody: {
          description: "Request for structure predictions.",
          content: {
            "application/json": {
              schema: {
                title: "ESMFoldRequest",
                description: "Request for structure prediction using ESMFold.",
                type: "object",
                required: ["sequences"],
                properties: {
                  sequences: {
                    type: "array",
                    items: {
                      title: "Sequence",
                      description: "Protein sequence",
                      type: "string",
                      example: "MSKGEELFTGV",
                    },
                  },
                  num_recycles: {
                    description:
                      "Number of recycles. `null` lets the system decide.",
                    type: "number",
                    nullable: true,
                    minimum: 0,
                    maximum: 48,
                    default: null,
                    example: null,
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "ESMFold request created and pending",
            content: {
              "application/json": {
                schema: {
                  title: "FoldJob",
                  description:
                    "FoldJob represents a fold job for our platform.",
                  type: "object",
                  required: [
                    "job_id",
                    "prerequisite_job_id",
                    "job_type",
                    "created_date",
                    "start_date",
                    "end_date",
                    "status",
                    "progress_counter",
                  ],
                  properties: {
                    job_id: {
                      title: "JobID",
                      description: "ID of job.",
                      type: "string",
                      format: "uuid",
                      "x-order": 1,
                    },
                    prerequisite_job_id: {
                      title: "PrerequisiteJobID",
                      description: "Prerequisite job ID.",
                      type: "string",
                      format: "uuid",
                      nullable: true,
                      default: null,
                      example: null,
                      "x-order": 2,
                    },
                    job_type: {
                      title: "JobType",
                      description: "Type of job.",
                      type: "string",
                      enum: [
                        "/workflow/preprocess",
                        "/workflow/train",
                        "/workflow/embed/umap",
                        "/workflow/predict",
                        "/workflow/predict/single_site",
                        "/workflow/crossvalidate",
                        "/workflow/evaluate",
                        "/workflow/design",
                        "/align/align",
                        "/align/prompt",
                        "/poet",
                        "/poet/single_site",
                        "/poet/generate",
                        "/poet/score",
                        "/poet/embed",
                        "/poet/logits",
                        "/embeddings/embed",
                        "/embeddings/embed_reduced",
                        "/embeddings/svd",
                        "/svd/fit",
                        "/svd/embed",
                        "/embeddings/attn",
                        "/embeddings/logits",
                        "/embeddings/fold",
                        "/predictor/train",
                        "/predictor/predict",
                        "/predictor/predict_single_site",
                        "/predictor/predict_multi",
                        "/predictor/crossvalidate",
                        "/design",
                      ],
                      "x-order": 3,
                      example: "/fold/fold",
                    },
                    created_date: {
                      title: "Created Date",
                      description: "Datetime of created object",
                      type: "string",
                      format: "date-time",
                      example: "2024-01-01T12:34:56.789Z",
                      "x-order": 4,
                    },
                    start_date: {
                      title: "StartDate",
                      description: "Start date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 5,
                    },
                    end_date: {
                      title: "EndDate",
                      description: "End date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 6,
                    },
                    status: {
                      title: "JobStatus",
                      description: "Status of job.",
                      type: "string",
                      enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                      "x-order": 7,
                    },
                    progress_counter: {
                      title: "ProgressCounter",
                      description:
                        "Counter of the progress of job from 0 to 100.",
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                      example: 0,
                      default: 0,
                      "x-order": 8,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation errors in the submitted request.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Model not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "422": {
            description:
              "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            content: {
              "application/json": {
                schema: {
                  title: "ValidationError.yaml",
                  description: "An invalid object that could not be parsed.",
                  type: "object",
                  properties: {
                    detail: {
                      title: "ErrorDetailList",
                      type: "array",
                      items: {
                        title: "ErrorDetail",
                        required: ["loc", "msg", "type"],
                        type: "object",
                        properties: {
                          loc: {
                            title: "Location",
                            type: "array",
                            items: {
                              type: "integer",
                            },
                          },
                          msg: {
                            title: "Message",
                            type: "string",
                          },
                          type: {
                            title: "Error Type",
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "429": {
            description: "Too many requests. Try again later.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/models/alphafold2": {
      post: {
        tags: ["fold requests", "alphafold2"],
        summary: "AlphaFold2",
        description:
          "Create structure prediction using AlphaFold2 from created MSA.",
        requestBody: {
          description: "Request for structure prediction.",
          content: {
            "application/json": {
              schema: {
                title: "AlphaFold2Request",
                description:
                  "Request for structure prediction using AlphaFold2.",
                type: "object",
                required: ["msa_id"],
                properties: {
                  msa_id: {
                    description: "ID of MSA to use for fold.",
                    type: "string",
                    format: "uuid",
                  },
                  num_recycles: {
                    description:
                      "Number of recycles. `null` lets the system decide.",
                    type: "number",
                    nullable: true,
                    minimum: 0,
                    maximum: 48,
                    default: null,
                    example: null,
                  },
                  num_models: {
                    description: "Number of models.",
                    type: "number",
                    minimum: 0,
                    maximum: 5,
                    default: 1,
                    example: 1,
                  },
                  num_relax: {
                    description: "Number of relax.",
                    type: "number",
                    minimum: 0,
                    maximum: 5,
                    default: 0,
                    example: 0,
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "AlphaFold2 request created and pending",
            content: {
              "application/json": {
                schema: {
                  title: "FoldJob",
                  description:
                    "FoldJob represents a fold job for our platform.",
                  type: "object",
                  required: [
                    "job_id",
                    "prerequisite_job_id",
                    "job_type",
                    "created_date",
                    "start_date",
                    "end_date",
                    "status",
                    "progress_counter",
                  ],
                  properties: {
                    job_id: {
                      title: "JobID",
                      description: "ID of job.",
                      type: "string",
                      format: "uuid",
                      "x-order": 1,
                    },
                    prerequisite_job_id: {
                      title: "PrerequisiteJobID",
                      description: "Prerequisite job ID.",
                      type: "string",
                      format: "uuid",
                      nullable: true,
                      default: null,
                      example: null,
                      "x-order": 2,
                    },
                    job_type: {
                      title: "JobType",
                      description: "Type of job.",
                      type: "string",
                      enum: [
                        "/workflow/preprocess",
                        "/workflow/train",
                        "/workflow/embed/umap",
                        "/workflow/predict",
                        "/workflow/predict/single_site",
                        "/workflow/crossvalidate",
                        "/workflow/evaluate",
                        "/workflow/design",
                        "/align/align",
                        "/align/prompt",
                        "/poet",
                        "/poet/single_site",
                        "/poet/generate",
                        "/poet/score",
                        "/poet/embed",
                        "/poet/logits",
                        "/embeddings/embed",
                        "/embeddings/embed_reduced",
                        "/embeddings/svd",
                        "/svd/fit",
                        "/svd/embed",
                        "/embeddings/attn",
                        "/embeddings/logits",
                        "/embeddings/fold",
                        "/predictor/train",
                        "/predictor/predict",
                        "/predictor/predict_single_site",
                        "/predictor/predict_multi",
                        "/predictor/crossvalidate",
                        "/design",
                      ],
                      "x-order": 3,
                      example: "/fold/fold",
                    },
                    created_date: {
                      title: "Created Date",
                      description: "Datetime of created object",
                      type: "string",
                      format: "date-time",
                      example: "2024-01-01T12:34:56.789Z",
                      "x-order": 4,
                    },
                    start_date: {
                      title: "StartDate",
                      description: "Start date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 5,
                    },
                    end_date: {
                      title: "EndDate",
                      description: "End date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 6,
                    },
                    status: {
                      title: "JobStatus",
                      description: "Status of job.",
                      type: "string",
                      enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                      "x-order": 7,
                    },
                    progress_counter: {
                      title: "ProgressCounter",
                      description:
                        "Counter of the progress of job from 0 to 100.",
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                      example: 0,
                      default: 0,
                      "x-order": 8,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation errors in the submitted request.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Model not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "422": {
            description:
              "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            content: {
              "application/json": {
                schema: {
                  title: "ValidationError.yaml",
                  description: "An invalid object that could not be parsed.",
                  type: "object",
                  properties: {
                    detail: {
                      title: "ErrorDetailList",
                      type: "array",
                      items: {
                        title: "ErrorDetail",
                        required: ["loc", "msg", "type"],
                        type: "object",
                        properties: {
                          loc: {
                            title: "Location",
                            type: "array",
                            items: {
                              type: "integer",
                            },
                          },
                          msg: {
                            title: "Message",
                            type: "string",
                          },
                          type: {
                            title: "Error Type",
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "429": {
            description: "Too many requests. Try again later.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/models/boltz-1": {
      post: {
        tags: ["fold requests", "boltz"],
        summary: "Boltz-1",
        description:
          "Create structure prediction using boltz-1 from MSA, with additional chains.\n\nArgs:\n  - `sequences`: List of chain/molecule entities in the input. Each entry describes a protein, nucleic acid, or ligand, including its sequence, identifier(s), and optional attributes such as msa_id, SMILES string, CCD code.\n    - `msa_id` should refer to the id of an msa job which included this protein as a query, or `null` for single sequence mode.\n    - `smiles` and `ccd` are mutually exclusive for ligands.\n  - `constraints`: Optional constraints such as bonds, pockets, or contacts. These allow specification of covalent bonds between atoms, pocket conditioning (e.g., residues forming a binding site), or specific contacts between atoms or residues.\n  - `diffusion_samples`: Number of diffusion samples to use. Controls how many independent structure samples are generated per input. Default is 1.\n  - `recycling_steps`: Number of recycling steps to use. Determines how many times the model refines its prediction iteratively. Default is 3.\n  - `sampling_steps`: Number of sampling steps to use. Sets the number of steps in the diffusion process for each sample. Default is 200.\n  - `step_scale`: Scaling factor for diffusion steps. Adjusts the effective temperature or diversity of the sampling process; higher values increase diversity. Default is 1.638.\n\nFor more details, refer to official [Boltz documentation](https://github.com/jwohlwend/boltz/blob/v2.1.1/docs/prediction.md).",
        requestBody: {
          description: "Request for structure prediction.",
          content: {
            "application/json": {
              schema: {
                title: "Boltz1Request",
                description:
                  "Request for structure prediction using Boltz-1.\n",
                type: "object",
                required: ["sequences"],
                properties: {
                  sequences: {
                    type: "array",
                    description:
                      "List of chain/molecule entities in the input.",
                    items: {
                      title: "Chain",
                      description:
                        "A chain entity, which can be a protein, DNA, RNA, or ligand.",
                      oneOf: [
                        {
                          title: "Protein",
                          description: "Protein to be folded.",
                          type: "object",
                          required: ["id", "msa_id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Amino acid sequence of the protein chain.",
                            },
                            msa_id: {
                              type: "string",
                              format: "uuid",
                              nullable: true,
                              description:
                                "ID for an MSA job, or null for single-sequence mode.",
                            },
                          },
                          example: {
                            id: ["A", "B"],
                            sequence:
                              "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                            msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                          },
                        },
                        {
                          title: "DNA",
                          description: "DNA chain to be folded.",
                          type: "object",
                          required: ["id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Nucleotide sequence of the DNA chain.",
                            },
                          },
                          example: {
                            id: ["A", "B"],
                            sequence:
                              "ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
                          },
                        },
                        {
                          title: "RNA",
                          description: "RNA chain to be folded.",
                          type: "object",
                          required: ["id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Nucleotide sequence of the RNA chain.",
                            },
                            msa_id: {
                              type: "string",
                              format: "uuid",
                              description:
                                "ID for an MSA job, or null for single-sequence mode.",
                            },
                          },
                          example: {
                            id: "A",
                            sequence:
                              "GGGAUCCGAUGCUAGCUAGCUAGCUGAUGCUAGCUAGCUAGCUAGC",
                          },
                        },
                        {
                          title: "Ligand",
                          description:
                            "Small molecule ligand for structure prediction.",
                          type: "object",
                          required: ["id"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique identifier(s) for the ligand. Use an array for multiple identical ligands.",
                            },
                            smiles: {
                              type: "string",
                              description:
                                "SMILES string for the ligand. Mutually exclusive with ccd.",
                            },
                            ccd: {
                              type: "string",
                              description:
                                "CCD code for the ligand. Mutually exclusive with smiles.",
                            },
                          },
                          example: {
                            id: ["C", "D"],
                            ccd: "SAH",
                          },
                        },
                      ],
                    },
                  },
                  constraints: {
                    type: "array",
                    description:
                      "Optional constraints such as bonds, pockets, or contacts.",
                    items: {
                      oneOf: [
                        {
                          title: "BondConstraint",
                          description:
                            "Covalent bond constraint between two atoms.",
                          type: "object",
                          required: ["bond"],
                          properties: {
                            bond: {
                              type: "object",
                              required: ["atom1", "atom2"],
                              properties: {
                                atom1: {
                                  type: "array",
                                  description:
                                    "[CHAIN_ID, RES_IDX, ATOM_NAME] for the first atom.",
                                  items: {
                                    oneOf: [
                                      {
                                        type: "string",
                                      },
                                      {
                                        type: "integer",
                                      },
                                    ],
                                  },
                                },
                                atom2: {
                                  type: "array",
                                  description:
                                    "[CHAIN_ID, RES_IDX, ATOM_NAME] for the second atom.",
                                  items: {
                                    oneOf: [
                                      {
                                        type: "string",
                                      },
                                      {
                                        type: "integer",
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          },
                          example: {
                            bond: {
                              atom1: ["A", 42, "CA"],
                              atom2: ["C", 1, "N1"],
                            },
                          },
                        },
                        {
                          title: "PocketConstraint",
                          description:
                            "Specifies a pocket constraint for a binder chain and its contacts.",
                          type: "object",
                          required: ["binder", "contacts", "max_distance"],
                          properties: {
                            binder: {
                              type: "string",
                              description:
                                "Chain ID of the binder (e.g., ligand or protein).",
                            },
                            contacts: {
                              type: "array",
                              description:
                                "List of contacts, each as [CHAIN_ID, RES_IDX] or [CHAIN_ID, ATOM_NAME].",
                              items: {
                                type: "array",
                                items: {
                                  oneOf: [
                                    {
                                      type: "string",
                                    },
                                    {
                                      type: "integer",
                                    },
                                  ],
                                },
                                minItems: 2,
                                maxItems: 2,
                              },
                            },
                            max_distance: {
                              type: "number",
                              format: "float",
                              description:
                                "Maximum allowed distance (in angstroms) between binder and contacts.",
                            },
                          },
                          example: {
                            binder: "C",
                            contacts: [
                              ["A", 42],
                              ["A", 43],
                              ["B", 55],
                            ],
                            max_distance: 5,
                          },
                        },
                        {
                          title: "ContactConstraint",
                          description:
                            "Specifies a contact constraint between two atoms or residues.",
                          type: "object",
                          required: ["token1", "token2", "max_distance"],
                          properties: {
                            token1: {
                              type: "array",
                              description:
                                "Chain ID and residue index or atom name for the first contact point.",
                              items: {
                                oneOf: [
                                  {
                                    type: "string",
                                  },
                                  {
                                    type: "integer",
                                  },
                                ],
                              },
                            },
                            token2: {
                              type: "array",
                              description:
                                "Chain ID and residue index or atom name for the second contact point.",
                              items: {
                                oneOf: [
                                  {
                                    type: "string",
                                  },
                                  {
                                    type: "integer",
                                  },
                                ],
                              },
                            },
                            max_distance: {
                              type: "number",
                              format: "float",
                              description:
                                "Maximum allowed distance (in angstroms) between the two contact points.",
                            },
                          },
                          example: {
                            token1: ["A", 42],
                            token2: ["B", 55],
                            max_distance: 8,
                          },
                        },
                      ],
                    },
                  },
                  diffusion_samples: {
                    type: "integer",
                    description: "Number of diffusion samples to use.",
                    default: 1,
                  },
                  recycling_steps: {
                    type: "integer",
                    description: "Number of recycling steps to use.",
                    default: 3,
                  },
                  sampling_steps: {
                    type: "integer",
                    description: "Number of sampling steps to use.",
                    default: 200,
                  },
                  step_scale: {
                    type: "number",
                    format: "float",
                    description: "Scaling factor for diffusion steps.",
                    default: 1.638,
                  },
                },
                example: {
                  sequences: [
                    {
                      protein: {
                        id: ["A", "B"],
                        sequence:
                          "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                        msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                      },
                    },
                    {
                      ligand: {
                        id: ["C", "D"],
                        ccd: "SAH",
                      },
                    },
                    {
                      ligand: {
                        id: ["E", "F"],
                        smiles: "N[C@@H](Cc1ccc(O)cc1)C(=O)O",
                      },
                    },
                  ],
                  constraints: [
                    {
                      bond: {
                        atom1: ["A", 42, "CA"],
                        atom2: ["C", 1, "N1"],
                      },
                    },
                    {
                      pocket: {
                        binder: "C",
                        contacts: [
                          ["A", 42],
                          ["A", 43],
                          ["B", 55],
                        ],
                        max_distance: 5,
                      },
                    },
                  ],
                  diffusion_samples: 2,
                  recycling_steps: 4,
                  sampling_steps: 300,
                  step_scale: 1.2,
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Boltz-1 request created and pending",
            content: {
              "application/json": {
                schema: {
                  title: "FoldJob",
                  description:
                    "FoldJob represents a fold job for our platform.",
                  type: "object",
                  required: [
                    "job_id",
                    "prerequisite_job_id",
                    "job_type",
                    "created_date",
                    "start_date",
                    "end_date",
                    "status",
                    "progress_counter",
                  ],
                  properties: {
                    job_id: {
                      title: "JobID",
                      description: "ID of job.",
                      type: "string",
                      format: "uuid",
                      "x-order": 1,
                    },
                    prerequisite_job_id: {
                      title: "PrerequisiteJobID",
                      description: "Prerequisite job ID.",
                      type: "string",
                      format: "uuid",
                      nullable: true,
                      default: null,
                      example: null,
                      "x-order": 2,
                    },
                    job_type: {
                      title: "JobType",
                      description: "Type of job.",
                      type: "string",
                      enum: [
                        "/workflow/preprocess",
                        "/workflow/train",
                        "/workflow/embed/umap",
                        "/workflow/predict",
                        "/workflow/predict/single_site",
                        "/workflow/crossvalidate",
                        "/workflow/evaluate",
                        "/workflow/design",
                        "/align/align",
                        "/align/prompt",
                        "/poet",
                        "/poet/single_site",
                        "/poet/generate",
                        "/poet/score",
                        "/poet/embed",
                        "/poet/logits",
                        "/embeddings/embed",
                        "/embeddings/embed_reduced",
                        "/embeddings/svd",
                        "/svd/fit",
                        "/svd/embed",
                        "/embeddings/attn",
                        "/embeddings/logits",
                        "/embeddings/fold",
                        "/predictor/train",
                        "/predictor/predict",
                        "/predictor/predict_single_site",
                        "/predictor/predict_multi",
                        "/predictor/crossvalidate",
                        "/design",
                      ],
                      "x-order": 3,
                      example: "/fold/fold",
                    },
                    created_date: {
                      title: "Created Date",
                      description: "Datetime of created object",
                      type: "string",
                      format: "date-time",
                      example: "2024-01-01T12:34:56.789Z",
                      "x-order": 4,
                    },
                    start_date: {
                      title: "StartDate",
                      description: "Start date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 5,
                    },
                    end_date: {
                      title: "EndDate",
                      description: "End date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 6,
                    },
                    status: {
                      title: "JobStatus",
                      description: "Status of job.",
                      type: "string",
                      enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                      "x-order": 7,
                    },
                    progress_counter: {
                      title: "ProgressCounter",
                      description:
                        "Counter of the progress of job from 0 to 100.",
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                      example: 0,
                      default: 0,
                      "x-order": 8,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation errors in the submitted request.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Model not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "422": {
            description:
              "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            content: {
              "application/json": {
                schema: {
                  title: "ValidationError.yaml",
                  description: "An invalid object that could not be parsed.",
                  type: "object",
                  properties: {
                    detail: {
                      title: "ErrorDetailList",
                      type: "array",
                      items: {
                        title: "ErrorDetail",
                        required: ["loc", "msg", "type"],
                        type: "object",
                        properties: {
                          loc: {
                            title: "Location",
                            type: "array",
                            items: {
                              type: "integer",
                            },
                          },
                          msg: {
                            title: "Message",
                            type: "string",
                          },
                          type: {
                            title: "Error Type",
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "429": {
            description: "Too many requests. Try again later.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/models/boltz-1x": {
      post: {
        tags: ["fold requests", "boltz"],
        summary: "Boltz-1x",
        description:
          "Create structure prediction using boltz-1x from MSA, with additional chains.\n\nArgs:\n  - `sequences`: List of chain/molecule entities in the input. Each entry describes a protein, nucleic acid, or ligand, including its sequence, identifier(s), and optional attributes such as msa_id, SMILES string, CCD code.\n    - `msa_id` should refer to the id of an msa job which included this protein as a query, or `null` for single sequence mode.\n    - `smiles` and `ccd` are mutually exclusive for ligands.\n  - `constraints`: Optional constraints such as bonds, pockets, or contacts. These allow specification of covalent bonds between atoms, pocket conditioning (e.g., residues forming a binding site), or specific contacts between atoms or residues.\n  - `diffusion_samples`: Number of diffusion samples to use. Controls how many independent structure samples are generated per input. Default is 1.\n  - `recycling_steps`: Number of recycling steps to use. Determines how many times the model refines its prediction iteratively. Default is 3.\n  - `sampling_steps`: Number of sampling steps to use. Sets the number of steps in the diffusion process for each sample. Default is 200.\n  - `step_scale`: Scaling factor for diffusion steps. Adjusts the effective temperature or diversity of the sampling process; higher values increase diversity. Default is 1.638.\n\nFor more details, refer to official [Boltz documentation](https://github.com/jwohlwend/boltz/blob/v2.1.1/docs/prediction.md).",
        requestBody: {
          description: "Request for structure prediction.",
          content: {
            "application/json": {
              schema: {
                title: "Boltz1Request",
                description:
                  "Request for structure prediction using Boltz-1.\n",
                type: "object",
                required: ["sequences"],
                properties: {
                  sequences: {
                    type: "array",
                    description:
                      "List of chain/molecule entities in the input.",
                    items: {
                      title: "Chain",
                      description:
                        "A chain entity, which can be a protein, DNA, RNA, or ligand.",
                      oneOf: [
                        {
                          title: "Protein",
                          description: "Protein to be folded.",
                          type: "object",
                          required: ["id", "msa_id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Amino acid sequence of the protein chain.",
                            },
                            msa_id: {
                              type: "string",
                              format: "uuid",
                              nullable: true,
                              description:
                                "ID for an MSA job, or null for single-sequence mode.",
                            },
                          },
                          example: {
                            id: ["A", "B"],
                            sequence:
                              "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                            msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                          },
                        },
                        {
                          title: "DNA",
                          description: "DNA chain to be folded.",
                          type: "object",
                          required: ["id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Nucleotide sequence of the DNA chain.",
                            },
                          },
                          example: {
                            id: ["A", "B"],
                            sequence:
                              "ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
                          },
                        },
                        {
                          title: "RNA",
                          description: "RNA chain to be folded.",
                          type: "object",
                          required: ["id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Nucleotide sequence of the RNA chain.",
                            },
                            msa_id: {
                              type: "string",
                              format: "uuid",
                              description:
                                "ID for an MSA job, or null for single-sequence mode.",
                            },
                          },
                          example: {
                            id: "A",
                            sequence:
                              "GGGAUCCGAUGCUAGCUAGCUAGCUGAUGCUAGCUAGCUAGCUAGC",
                          },
                        },
                        {
                          title: "Ligand",
                          description:
                            "Small molecule ligand for structure prediction.",
                          type: "object",
                          required: ["id"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique identifier(s) for the ligand. Use an array for multiple identical ligands.",
                            },
                            smiles: {
                              type: "string",
                              description:
                                "SMILES string for the ligand. Mutually exclusive with ccd.",
                            },
                            ccd: {
                              type: "string",
                              description:
                                "CCD code for the ligand. Mutually exclusive with smiles.",
                            },
                          },
                          example: {
                            id: ["C", "D"],
                            ccd: "SAH",
                          },
                        },
                      ],
                    },
                  },
                  constraints: {
                    type: "array",
                    description:
                      "Optional constraints such as bonds, pockets, or contacts.",
                    items: {
                      oneOf: [
                        {
                          title: "BondConstraint",
                          description:
                            "Covalent bond constraint between two atoms.",
                          type: "object",
                          required: ["bond"],
                          properties: {
                            bond: {
                              type: "object",
                              required: ["atom1", "atom2"],
                              properties: {
                                atom1: {
                                  type: "array",
                                  description:
                                    "[CHAIN_ID, RES_IDX, ATOM_NAME] for the first atom.",
                                  items: {
                                    oneOf: [
                                      {
                                        type: "string",
                                      },
                                      {
                                        type: "integer",
                                      },
                                    ],
                                  },
                                },
                                atom2: {
                                  type: "array",
                                  description:
                                    "[CHAIN_ID, RES_IDX, ATOM_NAME] for the second atom.",
                                  items: {
                                    oneOf: [
                                      {
                                        type: "string",
                                      },
                                      {
                                        type: "integer",
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          },
                          example: {
                            bond: {
                              atom1: ["A", 42, "CA"],
                              atom2: ["C", 1, "N1"],
                            },
                          },
                        },
                        {
                          title: "PocketConstraint",
                          description:
                            "Specifies a pocket constraint for a binder chain and its contacts.",
                          type: "object",
                          required: ["binder", "contacts", "max_distance"],
                          properties: {
                            binder: {
                              type: "string",
                              description:
                                "Chain ID of the binder (e.g., ligand or protein).",
                            },
                            contacts: {
                              type: "array",
                              description:
                                "List of contacts, each as [CHAIN_ID, RES_IDX] or [CHAIN_ID, ATOM_NAME].",
                              items: {
                                type: "array",
                                items: {
                                  oneOf: [
                                    {
                                      type: "string",
                                    },
                                    {
                                      type: "integer",
                                    },
                                  ],
                                },
                                minItems: 2,
                                maxItems: 2,
                              },
                            },
                            max_distance: {
                              type: "number",
                              format: "float",
                              description:
                                "Maximum allowed distance (in angstroms) between binder and contacts.",
                            },
                          },
                          example: {
                            binder: "C",
                            contacts: [
                              ["A", 42],
                              ["A", 43],
                              ["B", 55],
                            ],
                            max_distance: 5,
                          },
                        },
                        {
                          title: "ContactConstraint",
                          description:
                            "Specifies a contact constraint between two atoms or residues.",
                          type: "object",
                          required: ["token1", "token2", "max_distance"],
                          properties: {
                            token1: {
                              type: "array",
                              description:
                                "Chain ID and residue index or atom name for the first contact point.",
                              items: {
                                oneOf: [
                                  {
                                    type: "string",
                                  },
                                  {
                                    type: "integer",
                                  },
                                ],
                              },
                            },
                            token2: {
                              type: "array",
                              description:
                                "Chain ID and residue index or atom name for the second contact point.",
                              items: {
                                oneOf: [
                                  {
                                    type: "string",
                                  },
                                  {
                                    type: "integer",
                                  },
                                ],
                              },
                            },
                            max_distance: {
                              type: "number",
                              format: "float",
                              description:
                                "Maximum allowed distance (in angstroms) between the two contact points.",
                            },
                          },
                          example: {
                            token1: ["A", 42],
                            token2: ["B", 55],
                            max_distance: 8,
                          },
                        },
                      ],
                    },
                  },
                  diffusion_samples: {
                    type: "integer",
                    description: "Number of diffusion samples to use.",
                    default: 1,
                  },
                  recycling_steps: {
                    type: "integer",
                    description: "Number of recycling steps to use.",
                    default: 3,
                  },
                  sampling_steps: {
                    type: "integer",
                    description: "Number of sampling steps to use.",
                    default: 200,
                  },
                  step_scale: {
                    type: "number",
                    format: "float",
                    description: "Scaling factor for diffusion steps.",
                    default: 1.638,
                  },
                },
                example: {
                  sequences: [
                    {
                      protein: {
                        id: ["A", "B"],
                        sequence:
                          "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                        msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                      },
                    },
                    {
                      ligand: {
                        id: ["C", "D"],
                        ccd: "SAH",
                      },
                    },
                    {
                      ligand: {
                        id: ["E", "F"],
                        smiles: "N[C@@H](Cc1ccc(O)cc1)C(=O)O",
                      },
                    },
                  ],
                  constraints: [
                    {
                      bond: {
                        atom1: ["A", 42, "CA"],
                        atom2: ["C", 1, "N1"],
                      },
                    },
                    {
                      pocket: {
                        binder: "C",
                        contacts: [
                          ["A", 42],
                          ["A", 43],
                          ["B", 55],
                        ],
                        max_distance: 5,
                      },
                    },
                  ],
                  diffusion_samples: 2,
                  recycling_steps: 4,
                  sampling_steps: 300,
                  step_scale: 1.2,
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Boltz-1 request created and pending",
            content: {
              "application/json": {
                schema: {
                  title: "FoldJob",
                  description:
                    "FoldJob represents a fold job for our platform.",
                  type: "object",
                  required: [
                    "job_id",
                    "prerequisite_job_id",
                    "job_type",
                    "created_date",
                    "start_date",
                    "end_date",
                    "status",
                    "progress_counter",
                  ],
                  properties: {
                    job_id: {
                      title: "JobID",
                      description: "ID of job.",
                      type: "string",
                      format: "uuid",
                      "x-order": 1,
                    },
                    prerequisite_job_id: {
                      title: "PrerequisiteJobID",
                      description: "Prerequisite job ID.",
                      type: "string",
                      format: "uuid",
                      nullable: true,
                      default: null,
                      example: null,
                      "x-order": 2,
                    },
                    job_type: {
                      title: "JobType",
                      description: "Type of job.",
                      type: "string",
                      enum: [
                        "/workflow/preprocess",
                        "/workflow/train",
                        "/workflow/embed/umap",
                        "/workflow/predict",
                        "/workflow/predict/single_site",
                        "/workflow/crossvalidate",
                        "/workflow/evaluate",
                        "/workflow/design",
                        "/align/align",
                        "/align/prompt",
                        "/poet",
                        "/poet/single_site",
                        "/poet/generate",
                        "/poet/score",
                        "/poet/embed",
                        "/poet/logits",
                        "/embeddings/embed",
                        "/embeddings/embed_reduced",
                        "/embeddings/svd",
                        "/svd/fit",
                        "/svd/embed",
                        "/embeddings/attn",
                        "/embeddings/logits",
                        "/embeddings/fold",
                        "/predictor/train",
                        "/predictor/predict",
                        "/predictor/predict_single_site",
                        "/predictor/predict_multi",
                        "/predictor/crossvalidate",
                        "/design",
                      ],
                      "x-order": 3,
                      example: "/fold/fold",
                    },
                    created_date: {
                      title: "Created Date",
                      description: "Datetime of created object",
                      type: "string",
                      format: "date-time",
                      example: "2024-01-01T12:34:56.789Z",
                      "x-order": 4,
                    },
                    start_date: {
                      title: "StartDate",
                      description: "Start date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 5,
                    },
                    end_date: {
                      title: "EndDate",
                      description: "End date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 6,
                    },
                    status: {
                      title: "JobStatus",
                      description: "Status of job.",
                      type: "string",
                      enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                      "x-order": 7,
                    },
                    progress_counter: {
                      title: "ProgressCounter",
                      description:
                        "Counter of the progress of job from 0 to 100.",
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                      example: 0,
                      default: 0,
                      "x-order": 8,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation errors in the submitted request.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Model not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "422": {
            description:
              "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            content: {
              "application/json": {
                schema: {
                  title: "ValidationError.yaml",
                  description: "An invalid object that could not be parsed.",
                  type: "object",
                  properties: {
                    detail: {
                      title: "ErrorDetailList",
                      type: "array",
                      items: {
                        title: "ErrorDetail",
                        required: ["loc", "msg", "type"],
                        type: "object",
                        properties: {
                          loc: {
                            title: "Location",
                            type: "array",
                            items: {
                              type: "integer",
                            },
                          },
                          msg: {
                            title: "Message",
                            type: "string",
                          },
                          type: {
                            title: "Error Type",
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "429": {
            description: "Too many requests. Try again later.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/models/boltz-2": {
      post: {
        tags: ["fold requests", "boltz"],
        summary: "Boltz-2",
        description:
          "Create structure prediction using boltz-2 from MSA, with additional chains.\n\nArgs:\n  - `sequences`: List of chain/molecule entities in the input. Each entry describes a protein, nucleic acid, or ligand, including its sequence, identifier(s), and optional attributes such as msa_id, SMILES string, CCD code.\n    - `msa_id` should refer to the id of an msa job which included this protein as a query, or `null` for single sequence mode.\n    - `smiles` and `ccd` are mutually exclusive for ligands.\n  - `constraints`: Optional constraints such as bonds, pockets, or contacts. These allow specification of covalent bonds between atoms, pocket conditioning (e.g., residues forming a binding site), or specific contacts between atoms or residues.\n  - `templates`: Optional field to specify structural templates for prediction. Each entry should provide the path to a template structure in CIF format. You may optionally specify which chains in your YAML should be templated using the `chain_id` entry, and define explicit chain mappings with `template_id`. Only protein chains can be templated.  \n    **Note:** Template support is not yet available, but will be added soon.\n  - `property`: Optional field to request additional computed properties, such as affinity. For affinity prediction, specify the binder chain (must be a ligand). Only one ligand can be specified for affinity computation.\n  - `diffusion_samples`: Number of diffusion samples to use. Controls how many independent structure samples are generated per input. Default is 1.\n  - `recycling_steps`: Number of recycling steps to use. Determines how many times the model refines its prediction iteratively. Default is 3.\n  - `sampling_steps`: Number of sampling steps to use. Sets the number of steps in the diffusion process for each sample. Default is 200.\n  - `step_scale`: Scaling factor for diffusion steps. Adjusts the effective temperature or diversity of the sampling process; higher values increase diversity. Default is 1.638.\n\nFor more details, refer to official [Boltz documentation](https://github.com/jwohlwend/boltz/blob/v2.1.1/docs/prediction.md).",
        requestBody: {
          description: "Request for structure prediction.",
          content: {
            "application/json": {
              schema: {
                title: "Boltz2Request",
                description: "Request for structure prediction using Boltz-2.",
                type: "object",
                required: ["sequences"],
                properties: {
                  sequences: {
                    type: "array",
                    description:
                      "List of chain/molecule entities in the input.",
                    items: {
                      title: "Chain",
                      description:
                        "A chain entity, which can be a protein, DNA, RNA, or ligand.",
                      oneOf: [
                        {
                          title: "Protein",
                          description: "Protein to be folded.",
                          type: "object",
                          required: ["id", "msa_id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Amino acid sequence of the protein chain.",
                            },
                            msa_id: {
                              type: "string",
                              format: "uuid",
                              nullable: true,
                              description:
                                "ID for an MSA job, or null for single-sequence mode.",
                            },
                          },
                          example: {
                            id: ["A", "B"],
                            sequence:
                              "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                            msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                          },
                        },
                        {
                          title: "DNA",
                          description: "DNA chain to be folded.",
                          type: "object",
                          required: ["id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Nucleotide sequence of the DNA chain.",
                            },
                          },
                          example: {
                            id: ["A", "B"],
                            sequence:
                              "ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
                          },
                        },
                        {
                          title: "RNA",
                          description: "RNA chain to be folded.",
                          type: "object",
                          required: ["id", "sequence"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique chain identifier(s). Use an array for multiple identical chains.",
                            },
                            sequence: {
                              type: "string",
                              description:
                                "Nucleotide sequence of the RNA chain.",
                            },
                            msa_id: {
                              type: "string",
                              format: "uuid",
                              description:
                                "ID for an MSA job, or null for single-sequence mode.",
                            },
                          },
                          example: {
                            id: "A",
                            sequence:
                              "GGGAUCCGAUGCUAGCUAGCUAGCUGAUGCUAGCUAGCUAGCUAGC",
                          },
                        },
                        {
                          title: "Ligand",
                          description:
                            "Small molecule ligand for structure prediction.",
                          type: "object",
                          required: ["id"],
                          properties: {
                            id: {
                              oneOf: [
                                {
                                  type: "string",
                                },
                                {
                                  type: "array",
                                  items: {
                                    type: "string",
                                  },
                                },
                              ],
                              description:
                                "Unique identifier(s) for the ligand. Use an array for multiple identical ligands.",
                            },
                            smiles: {
                              type: "string",
                              description:
                                "SMILES string for the ligand. Mutually exclusive with ccd.",
                            },
                            ccd: {
                              type: "string",
                              description:
                                "CCD code for the ligand. Mutually exclusive with smiles.",
                            },
                          },
                          example: {
                            id: ["C", "D"],
                            ccd: "SAH",
                          },
                        },
                      ],
                    },
                  },
                  constraints: {
                    type: "array",
                    description:
                      "Optional constraints such as bonds, pockets, or contacts.",
                    items: {
                      oneOf: [
                        {
                          title: "BondConstraint",
                          description:
                            "Covalent bond constraint between two atoms.",
                          type: "object",
                          required: ["bond"],
                          properties: {
                            bond: {
                              type: "object",
                              required: ["atom1", "atom2"],
                              properties: {
                                atom1: {
                                  type: "array",
                                  description:
                                    "[CHAIN_ID, RES_IDX, ATOM_NAME] for the first atom.",
                                  items: {
                                    oneOf: [
                                      {
                                        type: "string",
                                      },
                                      {
                                        type: "integer",
                                      },
                                    ],
                                  },
                                },
                                atom2: {
                                  type: "array",
                                  description:
                                    "[CHAIN_ID, RES_IDX, ATOM_NAME] for the second atom.",
                                  items: {
                                    oneOf: [
                                      {
                                        type: "string",
                                      },
                                      {
                                        type: "integer",
                                      },
                                    ],
                                  },
                                },
                              },
                            },
                          },
                          example: {
                            bond: {
                              atom1: ["A", 42, "CA"],
                              atom2: ["C", 1, "N1"],
                            },
                          },
                        },
                        {
                          title: "PocketConstraint",
                          description:
                            "Specifies a pocket constraint for a binder chain and its contacts.",
                          type: "object",
                          required: ["binder", "contacts", "max_distance"],
                          properties: {
                            binder: {
                              type: "string",
                              description:
                                "Chain ID of the binder (e.g., ligand or protein).",
                            },
                            contacts: {
                              type: "array",
                              description:
                                "List of contacts, each as [CHAIN_ID, RES_IDX] or [CHAIN_ID, ATOM_NAME].",
                              items: {
                                type: "array",
                                items: {
                                  oneOf: [
                                    {
                                      type: "string",
                                    },
                                    {
                                      type: "integer",
                                    },
                                  ],
                                },
                                minItems: 2,
                                maxItems: 2,
                              },
                            },
                            max_distance: {
                              type: "number",
                              format: "float",
                              description:
                                "Maximum allowed distance (in angstroms) between binder and contacts.",
                            },
                          },
                          example: {
                            binder: "C",
                            contacts: [
                              ["A", 42],
                              ["A", 43],
                              ["B", 55],
                            ],
                            max_distance: 5,
                          },
                        },
                        {
                          title: "ContactConstraint",
                          description:
                            "Specifies a contact constraint between two atoms or residues.",
                          type: "object",
                          required: ["token1", "token2", "max_distance"],
                          properties: {
                            token1: {
                              type: "array",
                              description:
                                "Chain ID and residue index or atom name for the first contact point.",
                              items: {
                                oneOf: [
                                  {
                                    type: "string",
                                  },
                                  {
                                    type: "integer",
                                  },
                                ],
                              },
                            },
                            token2: {
                              type: "array",
                              description:
                                "Chain ID and residue index or atom name for the second contact point.",
                              items: {
                                oneOf: [
                                  {
                                    type: "string",
                                  },
                                  {
                                    type: "integer",
                                  },
                                ],
                              },
                            },
                            max_distance: {
                              type: "number",
                              format: "float",
                              description:
                                "Maximum allowed distance (in angstroms) between the two contact points.",
                            },
                          },
                          example: {
                            token1: ["A", 42],
                            token2: ["B", 55],
                            max_distance: 8,
                          },
                        },
                      ],
                    },
                  },
                  properties: {
                    type: "array",
                    description:
                      "Optional properties to compute, such as affinity.",
                    items:
                      '<!doctype html> <html lang="en"> <head> <script type="module">import { injectIntoGlobalHook } from "/@react-refresh"; injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;</script>\n<script type="module" src="/@vite/client"></script>\n<meta charset="UTF-8" /> <link rel="icon" type="image/svg+xml" href="/favicon.svg" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <title>OpenProtein API</title> </head> <body> <div id="root"></div> <script type="module" src="/src/main.tsx"></script> </body> </html>',
                  },
                  diffusion_samples: {
                    type: "integer",
                    description: "Number of diffusion samples to use.",
                    default: 1,
                  },
                  recycling_steps: {
                    type: "integer",
                    description: "Number of recycling steps to use.",
                    default: 3,
                  },
                  sampling_steps: {
                    type: "integer",
                    description: "Number of sampling steps to use.",
                    default: 200,
                  },
                  step_scale: {
                    type: "number",
                    format: "float",
                    description: "Scaling factor for diffusion steps.",
                    default: 1.638,
                  },
                },
                example: {
                  sequences: [
                    {
                      protein: {
                        id: ["A", "B"],
                        sequence:
                          "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                        msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                      },
                    },
                    {
                      ligand: {
                        id: ["C", "D"],
                        ccd: "SAH",
                      },
                    },
                    {
                      ligand: {
                        id: ["E", "F"],
                        smiles: "N[C@@H](Cc1ccc(O)cc1)C(=O)O",
                      },
                    },
                  ],
                  constraints: [
                    {
                      bond: {
                        atom1: ["A", 42, "CA"],
                        atom2: ["C", 1, "N1"],
                      },
                    },
                    {
                      pocket: {
                        binder: "C",
                        contacts: [
                          ["A", 42],
                          ["A", 43],
                          ["B", 55],
                        ],
                        max_distance: 5,
                      },
                    },
                  ],
                  properties: [
                    {
                      affinity: {
                        binder: "C",
                      },
                    },
                  ],
                  diffusion_samples: 2,
                  recycling_steps: 4,
                  sampling_steps: 300,
                  step_scale: 1.2,
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Boltz-1 request created and pending",
            content: {
              "application/json": {
                schema: {
                  title: "FoldJob",
                  description:
                    "FoldJob represents a fold job for our platform.",
                  type: "object",
                  required: [
                    "job_id",
                    "prerequisite_job_id",
                    "job_type",
                    "created_date",
                    "start_date",
                    "end_date",
                    "status",
                    "progress_counter",
                  ],
                  properties: {
                    job_id: {
                      title: "JobID",
                      description: "ID of job.",
                      type: "string",
                      format: "uuid",
                      "x-order": 1,
                    },
                    prerequisite_job_id: {
                      title: "PrerequisiteJobID",
                      description: "Prerequisite job ID.",
                      type: "string",
                      format: "uuid",
                      nullable: true,
                      default: null,
                      example: null,
                      "x-order": 2,
                    },
                    job_type: {
                      title: "JobType",
                      description: "Type of job.",
                      type: "string",
                      enum: [
                        "/workflow/preprocess",
                        "/workflow/train",
                        "/workflow/embed/umap",
                        "/workflow/predict",
                        "/workflow/predict/single_site",
                        "/workflow/crossvalidate",
                        "/workflow/evaluate",
                        "/workflow/design",
                        "/align/align",
                        "/align/prompt",
                        "/poet",
                        "/poet/single_site",
                        "/poet/generate",
                        "/poet/score",
                        "/poet/embed",
                        "/poet/logits",
                        "/embeddings/embed",
                        "/embeddings/embed_reduced",
                        "/embeddings/svd",
                        "/svd/fit",
                        "/svd/embed",
                        "/embeddings/attn",
                        "/embeddings/logits",
                        "/embeddings/fold",
                        "/predictor/train",
                        "/predictor/predict",
                        "/predictor/predict_single_site",
                        "/predictor/predict_multi",
                        "/predictor/crossvalidate",
                        "/design",
                      ],
                      "x-order": 3,
                      example: "/fold/fold",
                    },
                    created_date: {
                      title: "Created Date",
                      description: "Datetime of created object",
                      type: "string",
                      format: "date-time",
                      example: "2024-01-01T12:34:56.789Z",
                      "x-order": 4,
                    },
                    start_date: {
                      title: "StartDate",
                      description: "Start date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 5,
                    },
                    end_date: {
                      title: "EndDate",
                      description: "End date of job.",
                      type: "string",
                      format: "date-time",
                      nullable: true,
                      example: null,
                      default: null,
                      "x-order": 6,
                    },
                    status: {
                      title: "JobStatus",
                      description: "Status of job.",
                      type: "string",
                      enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                      "x-order": 7,
                    },
                    progress_counter: {
                      title: "ProgressCounter",
                      description:
                        "Counter of the progress of job from 0 to 100.",
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                      example: 0,
                      default: 0,
                      "x-order": 8,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation errors in the submitted request.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Model not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "422": {
            description:
              "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            content: {
              "application/json": {
                schema: {
                  title: "ValidationError.yaml",
                  description: "An invalid object that could not be parsed.",
                  type: "object",
                  properties: {
                    detail: {
                      title: "ErrorDetailList",
                      type: "array",
                      items: {
                        title: "ErrorDetail",
                        required: ["loc", "msg", "type"],
                        type: "object",
                        properties: {
                          loc: {
                            title: "Location",
                            type: "array",
                            items: {
                              type: "integer",
                            },
                          },
                          msg: {
                            title: "Message",
                            type: "string",
                          },
                          type: {
                            title: "Error Type",
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "429": {
            description: "Too many requests. Try again later.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/{job_id}/sequences": {
      get: {
        tags: ["fold"],
        summary: "Get sequences used in a request",
        description: "Get sequences used in a previous request.",
        parameters: [
          {
            name: "job_id",
            in: "path",
            description: "Job ID of sequences to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          "200": {
            description: "Request sequences",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Fold job not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/{job_id}/{sequence}": {
      get: {
        tags: ["fold"],
        summary: "Retrieve protein structure",
        description: "Get protein structure for a submitted sequence",
        parameters: [
          {
            name: "job_id",
            in: "path",
            description: "Job ID to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
          {
            name: "sequence",
            in: "path",
            description: "Sequence for which to retrieve result",
            required: true,
            schema: {
              type: "string",
            },
          },
          {
            name: "format",
            in: "query",
            description:
              "Output format to retrieve the result in.\n\nDefaults to `pdb`. Note that requested format may not be supported for all jobs depending on when the job was created.\n",
            required: false,
            schema: {
              title: "OutputFormat",
              description:
                "Output format of folded structure. Defaults to pdb.",
              type: "string",
              enum: ["pdb", "mmcif"],
              default: "pdb",
            },
          },
        ],
        responses: {
          "200": {
            description: "Result encoded in requested format.",
            content: {
              "application/octet-stream": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          "400": {
            description:
              "Result retrieval error. Contact support for assistance if persistent.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Fold job not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
    "/api/v1/fold/{job_id}/complex": {
      get: {
        tags: ["fold"],
        summary: "Retrieve protein complex structure",
        description: "Get protein complex structure for a submitted sequence",
        parameters: [
          {
            name: "job_id",
            in: "path",
            description: "Job ID to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          "200": {
            description: "Result encoded in mmCIF.",
            content: {
              "chemical/x-mmcif": {
                schema: {
                  type: "string",
                  example:
                    'data_example\n#\n_entry.id   example\n#\nloop_\n_entity.id\n_entity.type\n_entity.pdbx_description\n1 polymer "Example protein chain"\n#\nloop_\n_atom_site.group_PDB\n_atom_site.id\n_atom_site.type_symbol\n_atom_site.label_atom_id\n_atom_site.label_comp_id\n_atom_site.label_asym_id\n_atom_site.label_entity_id\n_atom_site.label_seq_id\n_atom_site.Cartn_x\n_atom_site.Cartn_y\n_atom_site.Cartn_z\nATOM 1 N N MET A 1 1 12.011 13.456 14.789\nATOM 2 C CA MET A 1 1 13.123 14.567 15.890\nATOM 3 C C MET A 1 1 14.234 15.678 16.901\nATOM 4 O O MET A 1 1 15.345 16.789 17.012\n#\n',
                },
              },
            },
          },
          "400": {
            description:
              "Result retrieval error. Contact support for assistance if persistent.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description:
              "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Fold job not found.",
            content: {
              "application/json": {
                schema: {
                  title: "Error",
                  description: "A error object providing details of the error.",
                  required: ["detail"],
                  type: "object",
                  properties: {
                    detail: {
                      title: "Detail",
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
        security: [
          {
            oauth2: [],
          },
        ],
      },
    },
  },
  components: {
    securitySchemes: {
      oauth2: {
        type: "oauth2",
        flows: {
          password: {
            tokenUrl: "/api/v1/login/access-token",
            scopes: {},
          },
        },
      },
    },
    schemas: {
      ModelID: {
        title: "ModelID",
        description: "ID of model to be used.",
        type: "string",
      },
      ModelDescription: {
        title: "ModelDescription",
        description: "Description of the model including relevant citations.",
        type: "object",
        properties: {
          summary: {
            title: "Summary",
            description: "Summary of the model description.",
            type: "string",
          },
          citation_title: {
            title: "CitationTitle",
            description: "Title of the citation for the model.",
            type: "string",
          },
          doi: {
            title: "DOI",
            description: "DOI of the citation for the model.",
            type: "string",
          },
        },
      },
      Token: {
        title: "TokenDetails",
        description: "Details of token.",
        required: ["id", "description", "primary", "token"],
        type: "object",
        properties: {
          id: {
            type: "integer",
            description: "Token ID",
          },
          token: {
            type: "string",
            description: "The token's string representation",
          },
          description: {
            type: "string",
            description: "Meaning of this token",
          },
          primary: {
            type: "boolean",
            description:
              "When a token id represents multiple tokens, this flag indicates whether or not this is the primary token.",
          },
        },
      },
      ModelMetadata: {
        title: "ModelMetadata",
        description: "Metadata of protein language model.",
        required: [
          "dimension",
          "description",
          "input_tokens",
          "max_sequence_length",
          "model_id",
          "output_tokens",
          "output_types",
          "token_descriptions",
        ],
        type: "object",
        properties: {
          model_id: {
            title: "ModelID",
            description: "ID of model to be used.",
            type: "string",
          },
          description: {
            title: "ModelDescription",
            description:
              "Description of the model including relevant citations.",
            type: "object",
            properties: {
              summary: {
                title: "Summary",
                description: "Summary of the model description.",
                type: "string",
              },
              citation_title: {
                title: "CitationTitle",
                description: "Title of the citation for the model.",
                type: "string",
              },
              doi: {
                title: "DOI",
                description: "DOI of the citation for the model.",
                type: "string",
              },
            },
          },
          dimension: {
            type: "integer",
            description:
              "Output dimensions of the model. Returns `-1` if irrelevant.",
          },
          input_tokens: {
            type: "array",
            description: "List of valid input tokens.",
            example: ["A", "R", "N"],
            items: {
              type: "string",
            },
          },
          max_sequence_length: {
            type: "integer",
            description: "Maximum sequence length supported by model.",
          },
          output_tokens: {
            type: "array",
            description:
              "List of output tokens ordered by token id. Use this to decode logits.",
            example: ["A", "R", "N"],
            items: {
              type: "string",
            },
          },
          output_types: {
            type: "array",
            description: "Outputs supported by the model.",
            items: {
              type: "string",
            },
          },
          token_descriptions: {
            type: "array",
            description:
              "Description of all tokens, ordered by token id. The nth item describes the token(s) represented by token id `n`.\nSome token ids can represent multiple tokens.",
            items: {
              type: "array",
              items: {
                title: "TokenDetails",
                description: "Details of token.",
                required: ["id", "description", "primary", "token"],
                type: "object",
                properties: {
                  id: {
                    type: "integer",
                    description: "Token ID",
                  },
                  token: {
                    type: "string",
                    description: "The token's string representation",
                  },
                  description: {
                    type: "string",
                    description: "Meaning of this token",
                  },
                  primary: {
                    type: "boolean",
                    description:
                      "When a token id represents multiple tokens, this flag indicates whether or not this is the primary token.",
                  },
                },
              },
            },
          },
        },
      },
      Error: {
        title: "Error",
        description: "A error object providing details of the error.",
        required: ["detail"],
        type: "object",
        properties: {
          detail: {
            title: "Detail",
            type: "string",
          },
        },
      },
      Sequence: {
        title: "Sequence",
        description: "Protein sequence",
        type: "string",
        example: "MSKGEELFTGV",
      },
      ESMFoldRequest: {
        title: "ESMFoldRequest",
        description: "Request for structure prediction using ESMFold.",
        type: "object",
        required: ["sequences"],
        properties: {
          sequences: {
            type: "array",
            items: {
              title: "Sequence",
              description: "Protein sequence",
              type: "string",
              example: "MSKGEELFTGV",
            },
          },
          num_recycles: {
            description: "Number of recycles. `null` lets the system decide.",
            type: "number",
            nullable: true,
            minimum: 0,
            maximum: 48,
            default: null,
            example: null,
          },
        },
      },
      JobID: {
        title: "JobID",
        description: "ID of job.",
        type: "string",
        format: "uuid",
        "x-order": 1,
      },
      JobType: {
        title: "JobType",
        description: "Type of job.",
        type: "string",
        enum: [
          "/workflow/preprocess",
          "/workflow/train",
          "/workflow/embed/umap",
          "/workflow/predict",
          "/workflow/predict/single_site",
          "/workflow/crossvalidate",
          "/workflow/evaluate",
          "/workflow/design",
          "/align/align",
          "/align/prompt",
          "/poet",
          "/poet/single_site",
          "/poet/generate",
          "/poet/score",
          "/poet/embed",
          "/poet/logits",
          "/embeddings/embed",
          "/embeddings/embed_reduced",
          "/embeddings/svd",
          "/svd/fit",
          "/svd/embed",
          "/embeddings/attn",
          "/embeddings/logits",
          "/embeddings/fold",
          "/predictor/train",
          "/predictor/predict",
          "/predictor/predict_single_site",
          "/predictor/predict_multi",
          "/predictor/crossvalidate",
          "/design",
        ],
        "x-order": 3,
      },
      CreatedDate: {
        title: "Created Date",
        description: "Datetime of created object",
        type: "string",
        format: "date-time",
        example: "2024-01-01T12:34:56.789Z",
        "x-order": 4,
      },
      JobStatus: {
        title: "JobStatus",
        description: "Status of job.",
        type: "string",
        enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
        "x-order": 7,
      },
      Job: {
        title: "Job",
        description: "Job represents a job for our compute platform.",
        type: "object",
        required: [
          "job_id",
          "prerequisite_job_id",
          "job_type",
          "created_date",
          "start_date",
          "end_date",
          "status",
          "progress_counter",
        ],
        properties: {
          job_id: {
            title: "JobID",
            description: "ID of job.",
            type: "string",
            format: "uuid",
            "x-order": 1,
          },
          prerequisite_job_id: {
            title: "PrerequisiteJobID",
            description: "Prerequisite job ID.",
            type: "string",
            format: "uuid",
            nullable: true,
            default: null,
            example: null,
            "x-order": 2,
          },
          job_type: {
            title: "JobType",
            description: "Type of job.",
            type: "string",
            enum: [
              "/workflow/preprocess",
              "/workflow/train",
              "/workflow/embed/umap",
              "/workflow/predict",
              "/workflow/predict/single_site",
              "/workflow/crossvalidate",
              "/workflow/evaluate",
              "/workflow/design",
              "/align/align",
              "/align/prompt",
              "/poet",
              "/poet/single_site",
              "/poet/generate",
              "/poet/score",
              "/poet/embed",
              "/poet/logits",
              "/embeddings/embed",
              "/embeddings/embed_reduced",
              "/embeddings/svd",
              "/svd/fit",
              "/svd/embed",
              "/embeddings/attn",
              "/embeddings/logits",
              "/embeddings/fold",
              "/predictor/train",
              "/predictor/predict",
              "/predictor/predict_single_site",
              "/predictor/predict_multi",
              "/predictor/crossvalidate",
              "/design",
            ],
            "x-order": 3,
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          start_date: {
            title: "StartDate",
            description: "Start date of job.",
            type: "string",
            format: "date-time",
            nullable: true,
            example: null,
            default: null,
            "x-order": 5,
          },
          end_date: {
            title: "EndDate",
            description: "End date of job.",
            type: "string",
            format: "date-time",
            nullable: true,
            example: null,
            default: null,
            "x-order": 6,
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          progress_counter: {
            title: "ProgressCounter",
            description: "Counter of the progress of job from 0 to 100.",
            type: "integer",
            minimum: 0,
            maximum: 100,
            example: 0,
            default: 0,
            "x-order": 8,
          },
        },
      },
      FoldJob: {
        title: "FoldJob",
        description: "FoldJob represents a fold job for our platform.",
        type: "object",
        required: [
          "job_id",
          "prerequisite_job_id",
          "job_type",
          "created_date",
          "start_date",
          "end_date",
          "status",
          "progress_counter",
        ],
        properties: {
          job_id: {
            title: "JobID",
            description: "ID of job.",
            type: "string",
            format: "uuid",
            "x-order": 1,
          },
          prerequisite_job_id: {
            title: "PrerequisiteJobID",
            description: "Prerequisite job ID.",
            type: "string",
            format: "uuid",
            nullable: true,
            default: null,
            example: null,
            "x-order": 2,
          },
          job_type: {
            title: "JobType",
            description: "Type of job.",
            type: "string",
            enum: [
              "/workflow/preprocess",
              "/workflow/train",
              "/workflow/embed/umap",
              "/workflow/predict",
              "/workflow/predict/single_site",
              "/workflow/crossvalidate",
              "/workflow/evaluate",
              "/workflow/design",
              "/align/align",
              "/align/prompt",
              "/poet",
              "/poet/single_site",
              "/poet/generate",
              "/poet/score",
              "/poet/embed",
              "/poet/logits",
              "/embeddings/embed",
              "/embeddings/embed_reduced",
              "/embeddings/svd",
              "/svd/fit",
              "/svd/embed",
              "/embeddings/attn",
              "/embeddings/logits",
              "/embeddings/fold",
              "/predictor/train",
              "/predictor/predict",
              "/predictor/predict_single_site",
              "/predictor/predict_multi",
              "/predictor/crossvalidate",
              "/design",
            ],
            "x-order": 3,
            example: "/fold/fold",
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          start_date: {
            title: "StartDate",
            description: "Start date of job.",
            type: "string",
            format: "date-time",
            nullable: true,
            example: null,
            default: null,
            "x-order": 5,
          },
          end_date: {
            title: "EndDate",
            description: "End date of job.",
            type: "string",
            format: "date-time",
            nullable: true,
            example: null,
            default: null,
            "x-order": 6,
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          progress_counter: {
            title: "ProgressCounter",
            description: "Counter of the progress of job from 0 to 100.",
            type: "integer",
            minimum: 0,
            maximum: 100,
            example: 0,
            default: 0,
            "x-order": 8,
          },
        },
      },
      ValidationError: {
        title: "ValidationError.yaml",
        description: "An invalid object that could not be parsed.",
        type: "object",
        properties: {
          detail: {
            title: "ErrorDetailList",
            type: "array",
            items: {
              title: "ErrorDetail",
              required: ["loc", "msg", "type"],
              type: "object",
              properties: {
                loc: {
                  title: "Location",
                  type: "array",
                  items: {
                    type: "integer",
                  },
                },
                msg: {
                  title: "Message",
                  type: "string",
                },
                type: {
                  title: "Error Type",
                  type: "string",
                },
              },
            },
          },
        },
      },
      AF2Request: {
        title: "AlphaFold2Request",
        description: "Request for structure prediction using AlphaFold2.",
        type: "object",
        required: ["msa_id"],
        properties: {
          msa_id: {
            description: "ID of MSA to use for fold.",
            type: "string",
            format: "uuid",
          },
          num_recycles: {
            description: "Number of recycles. `null` lets the system decide.",
            type: "number",
            nullable: true,
            minimum: 0,
            maximum: 48,
            default: null,
            example: null,
          },
          num_models: {
            description: "Number of models.",
            type: "number",
            minimum: 0,
            maximum: 5,
            default: 1,
            example: 1,
          },
          num_relax: {
            description: "Number of relax.",
            type: "number",
            minimum: 0,
            maximum: 5,
            default: 0,
            example: 0,
          },
        },
      },
      Protein: {
        title: "Protein",
        description: "Protein to be folded.",
        type: "object",
        required: ["id", "msa_id", "sequence"],
        properties: {
          id: {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "array",
                items: {
                  type: "string",
                },
              },
            ],
            description:
              "Unique chain identifier(s). Use an array for multiple identical chains.",
          },
          sequence: {
            type: "string",
            description: "Amino acid sequence of the protein chain.",
          },
          msa_id: {
            type: "string",
            format: "uuid",
            nullable: true,
            description: "ID for an MSA job, or null for single-sequence mode.",
          },
        },
        example: {
          id: ["A", "B"],
          sequence:
            "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
          msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
        },
      },
      DNA: {
        title: "DNA",
        description: "DNA chain to be folded.",
        type: "object",
        required: ["id", "sequence"],
        properties: {
          id: {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "array",
                items: {
                  type: "string",
                },
              },
            ],
            description:
              "Unique chain identifier(s). Use an array for multiple identical chains.",
          },
          sequence: {
            type: "string",
            description: "Nucleotide sequence of the DNA chain.",
          },
        },
        example: {
          id: ["A", "B"],
          sequence:
            "ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
        },
      },
      RNA: {
        title: "RNA",
        description: "RNA chain to be folded.",
        type: "object",
        required: ["id", "sequence"],
        properties: {
          id: {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "array",
                items: {
                  type: "string",
                },
              },
            ],
            description:
              "Unique chain identifier(s). Use an array for multiple identical chains.",
          },
          sequence: {
            type: "string",
            description: "Nucleotide sequence of the RNA chain.",
          },
          msa_id: {
            type: "string",
            format: "uuid",
            description: "ID for an MSA job, or null for single-sequence mode.",
          },
        },
        example: {
          id: "A",
          sequence: "GGGAUCCGAUGCUAGCUAGCUAGCUGAUGCUAGCUAGCUAGCUAGC",
        },
      },
      Ligand: {
        title: "Ligand",
        description: "Small molecule ligand for structure prediction.",
        type: "object",
        required: ["id"],
        properties: {
          id: {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "array",
                items: {
                  type: "string",
                },
              },
            ],
            description:
              "Unique identifier(s) for the ligand. Use an array for multiple identical ligands.",
          },
          smiles: {
            type: "string",
            description:
              "SMILES string for the ligand. Mutually exclusive with ccd.",
          },
          ccd: {
            type: "string",
            description:
              "CCD code for the ligand. Mutually exclusive with smiles.",
          },
        },
        example: {
          id: ["C", "D"],
          ccd: "SAH",
        },
      },
      BoltzChain: {
        title: "Chain",
        description:
          "A chain entity, which can be a protein, DNA, RNA, or ligand.",
        oneOf: [
          {
            title: "Protein",
            description: "Protein to be folded.",
            type: "object",
            required: ["id", "msa_id", "sequence"],
            properties: {
              id: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                ],
                description:
                  "Unique chain identifier(s). Use an array for multiple identical chains.",
              },
              sequence: {
                type: "string",
                description: "Amino acid sequence of the protein chain.",
              },
              msa_id: {
                type: "string",
                format: "uuid",
                nullable: true,
                description:
                  "ID for an MSA job, or null for single-sequence mode.",
              },
            },
            example: {
              id: ["A", "B"],
              sequence:
                "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
              msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
            },
          },
          {
            title: "DNA",
            description: "DNA chain to be folded.",
            type: "object",
            required: ["id", "sequence"],
            properties: {
              id: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                ],
                description:
                  "Unique chain identifier(s). Use an array for multiple identical chains.",
              },
              sequence: {
                type: "string",
                description: "Nucleotide sequence of the DNA chain.",
              },
            },
            example: {
              id: ["A", "B"],
              sequence:
                "ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
            },
          },
          {
            title: "RNA",
            description: "RNA chain to be folded.",
            type: "object",
            required: ["id", "sequence"],
            properties: {
              id: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                ],
                description:
                  "Unique chain identifier(s). Use an array for multiple identical chains.",
              },
              sequence: {
                type: "string",
                description: "Nucleotide sequence of the RNA chain.",
              },
              msa_id: {
                type: "string",
                format: "uuid",
                description:
                  "ID for an MSA job, or null for single-sequence mode.",
              },
            },
            example: {
              id: "A",
              sequence: "GGGAUCCGAUGCUAGCUAGCUAGCUGAUGCUAGCUAGCUAGCUAGC",
            },
          },
          {
            title: "Ligand",
            description: "Small molecule ligand for structure prediction.",
            type: "object",
            required: ["id"],
            properties: {
              id: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                ],
                description:
                  "Unique identifier(s) for the ligand. Use an array for multiple identical ligands.",
              },
              smiles: {
                type: "string",
                description:
                  "SMILES string for the ligand. Mutually exclusive with ccd.",
              },
              ccd: {
                type: "string",
                description:
                  "CCD code for the ligand. Mutually exclusive with smiles.",
              },
            },
            example: {
              id: ["C", "D"],
              ccd: "SAH",
            },
          },
        ],
      },
      BondConstraint: {
        title: "BondConstraint",
        description: "Covalent bond constraint between two atoms.",
        type: "object",
        required: ["bond"],
        properties: {
          bond: {
            type: "object",
            required: ["atom1", "atom2"],
            properties: {
              atom1: {
                type: "array",
                description:
                  "[CHAIN_ID, RES_IDX, ATOM_NAME] for the first atom.",
                items: {
                  oneOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "integer",
                    },
                  ],
                },
              },
              atom2: {
                type: "array",
                description:
                  "[CHAIN_ID, RES_IDX, ATOM_NAME] for the second atom.",
                items: {
                  oneOf: [
                    {
                      type: "string",
                    },
                    {
                      type: "integer",
                    },
                  ],
                },
              },
            },
          },
        },
        example: {
          bond: {
            atom1: ["A", 42, "CA"],
            atom2: ["C", 1, "N1"],
          },
        },
      },
      PocketConstraint: {
        title: "PocketConstraint",
        description:
          "Specifies a pocket constraint for a binder chain and its contacts.",
        type: "object",
        required: ["binder", "contacts", "max_distance"],
        properties: {
          binder: {
            type: "string",
            description: "Chain ID of the binder (e.g., ligand or protein).",
          },
          contacts: {
            type: "array",
            description:
              "List of contacts, each as [CHAIN_ID, RES_IDX] or [CHAIN_ID, ATOM_NAME].",
            items: {
              type: "array",
              items: {
                oneOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "integer",
                  },
                ],
              },
              minItems: 2,
              maxItems: 2,
            },
          },
          max_distance: {
            type: "number",
            format: "float",
            description:
              "Maximum allowed distance (in angstroms) between binder and contacts.",
          },
        },
        example: {
          binder: "C",
          contacts: [
            ["A", 42],
            ["A", 43],
            ["B", 55],
          ],
          max_distance: 5,
        },
      },
      ContactConstraint: {
        title: "ContactConstraint",
        description:
          "Specifies a contact constraint between two atoms or residues.",
        type: "object",
        required: ["token1", "token2", "max_distance"],
        properties: {
          token1: {
            type: "array",
            description:
              "Chain ID and residue index or atom name for the first contact point.",
            items: {
              oneOf: [
                {
                  type: "string",
                },
                {
                  type: "integer",
                },
              ],
            },
          },
          token2: {
            type: "array",
            description:
              "Chain ID and residue index or atom name for the second contact point.",
            items: {
              oneOf: [
                {
                  type: "string",
                },
                {
                  type: "integer",
                },
              ],
            },
          },
          max_distance: {
            type: "number",
            format: "float",
            description:
              "Maximum allowed distance (in angstroms) between the two contact points.",
          },
        },
        example: {
          token1: ["A", 42],
          token2: ["B", 55],
          max_distance: 8,
        },
      },
      Boltz1Request: {
        title: "Boltz1Request",
        description: "Request for structure prediction using Boltz-1.\n",
        type: "object",
        required: ["sequences"],
        properties: {
          sequences: {
            type: "array",
            description: "List of chain/molecule entities in the input.",
            items: {
              title: "Chain",
              description:
                "A chain entity, which can be a protein, DNA, RNA, or ligand.",
              oneOf: [
                {
                  title: "Protein",
                  description: "Protein to be folded.",
                  type: "object",
                  required: ["id", "msa_id", "sequence"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique chain identifier(s). Use an array for multiple identical chains.",
                    },
                    sequence: {
                      type: "string",
                      description: "Amino acid sequence of the protein chain.",
                    },
                    msa_id: {
                      type: "string",
                      format: "uuid",
                      nullable: true,
                      description:
                        "ID for an MSA job, or null for single-sequence mode.",
                    },
                  },
                  example: {
                    id: ["A", "B"],
                    sequence:
                      "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                    msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                  },
                },
                {
                  title: "DNA",
                  description: "DNA chain to be folded.",
                  type: "object",
                  required: ["id", "sequence"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique chain identifier(s). Use an array for multiple identical chains.",
                    },
                    sequence: {
                      type: "string",
                      description: "Nucleotide sequence of the DNA chain.",
                    },
                  },
                  example: {
                    id: ["A", "B"],
                    sequence:
                      "ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
                  },
                },
                {
                  title: "RNA",
                  description: "RNA chain to be folded.",
                  type: "object",
                  required: ["id", "sequence"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique chain identifier(s). Use an array for multiple identical chains.",
                    },
                    sequence: {
                      type: "string",
                      description: "Nucleotide sequence of the RNA chain.",
                    },
                    msa_id: {
                      type: "string",
                      format: "uuid",
                      description:
                        "ID for an MSA job, or null for single-sequence mode.",
                    },
                  },
                  example: {
                    id: "A",
                    sequence: "GGGAUCCGAUGCUAGCUAGCUAGCUGAUGCUAGCUAGCUAGCUAGC",
                  },
                },
                {
                  title: "Ligand",
                  description:
                    "Small molecule ligand for structure prediction.",
                  type: "object",
                  required: ["id"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique identifier(s) for the ligand. Use an array for multiple identical ligands.",
                    },
                    smiles: {
                      type: "string",
                      description:
                        "SMILES string for the ligand. Mutually exclusive with ccd.",
                    },
                    ccd: {
                      type: "string",
                      description:
                        "CCD code for the ligand. Mutually exclusive with smiles.",
                    },
                  },
                  example: {
                    id: ["C", "D"],
                    ccd: "SAH",
                  },
                },
              ],
            },
          },
          constraints: {
            type: "array",
            description:
              "Optional constraints such as bonds, pockets, or contacts.",
            items: {
              oneOf: [
                {
                  title: "BondConstraint",
                  description: "Covalent bond constraint between two atoms.",
                  type: "object",
                  required: ["bond"],
                  properties: {
                    bond: {
                      type: "object",
                      required: ["atom1", "atom2"],
                      properties: {
                        atom1: {
                          type: "array",
                          description:
                            "[CHAIN_ID, RES_IDX, ATOM_NAME] for the first atom.",
                          items: {
                            oneOf: [
                              {
                                type: "string",
                              },
                              {
                                type: "integer",
                              },
                            ],
                          },
                        },
                        atom2: {
                          type: "array",
                          description:
                            "[CHAIN_ID, RES_IDX, ATOM_NAME] for the second atom.",
                          items: {
                            oneOf: [
                              {
                                type: "string",
                              },
                              {
                                type: "integer",
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                  example: {
                    bond: {
                      atom1: ["A", 42, "CA"],
                      atom2: ["C", 1, "N1"],
                    },
                  },
                },
                {
                  title: "PocketConstraint",
                  description:
                    "Specifies a pocket constraint for a binder chain and its contacts.",
                  type: "object",
                  required: ["binder", "contacts", "max_distance"],
                  properties: {
                    binder: {
                      type: "string",
                      description:
                        "Chain ID of the binder (e.g., ligand or protein).",
                    },
                    contacts: {
                      type: "array",
                      description:
                        "List of contacts, each as [CHAIN_ID, RES_IDX] or [CHAIN_ID, ATOM_NAME].",
                      items: {
                        type: "array",
                        items: {
                          oneOf: [
                            {
                              type: "string",
                            },
                            {
                              type: "integer",
                            },
                          ],
                        },
                        minItems: 2,
                        maxItems: 2,
                      },
                    },
                    max_distance: {
                      type: "number",
                      format: "float",
                      description:
                        "Maximum allowed distance (in angstroms) between binder and contacts.",
                    },
                  },
                  example: {
                    binder: "C",
                    contacts: [
                      ["A", 42],
                      ["A", 43],
                      ["B", 55],
                    ],
                    max_distance: 5,
                  },
                },
                {
                  title: "ContactConstraint",
                  description:
                    "Specifies a contact constraint between two atoms or residues.",
                  type: "object",
                  required: ["token1", "token2", "max_distance"],
                  properties: {
                    token1: {
                      type: "array",
                      description:
                        "Chain ID and residue index or atom name for the first contact point.",
                      items: {
                        oneOf: [
                          {
                            type: "string",
                          },
                          {
                            type: "integer",
                          },
                        ],
                      },
                    },
                    token2: {
                      type: "array",
                      description:
                        "Chain ID and residue index or atom name for the second contact point.",
                      items: {
                        oneOf: [
                          {
                            type: "string",
                          },
                          {
                            type: "integer",
                          },
                        ],
                      },
                    },
                    max_distance: {
                      type: "number",
                      format: "float",
                      description:
                        "Maximum allowed distance (in angstroms) between the two contact points.",
                    },
                  },
                  example: {
                    token1: ["A", 42],
                    token2: ["B", 55],
                    max_distance: 8,
                  },
                },
              ],
            },
          },
          diffusion_samples: {
            type: "integer",
            description: "Number of diffusion samples to use.",
            default: 1,
          },
          recycling_steps: {
            type: "integer",
            description: "Number of recycling steps to use.",
            default: 3,
          },
          sampling_steps: {
            type: "integer",
            description: "Number of sampling steps to use.",
            default: 200,
          },
          step_scale: {
            type: "number",
            format: "float",
            description: "Scaling factor for diffusion steps.",
            default: 1.638,
          },
        },
        example: {
          sequences: [
            {
              protein: {
                id: ["A", "B"],
                sequence:
                  "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
              },
            },
            {
              ligand: {
                id: ["C", "D"],
                ccd: "SAH",
              },
            },
            {
              ligand: {
                id: ["E", "F"],
                smiles: "N[C@@H](Cc1ccc(O)cc1)C(=O)O",
              },
            },
          ],
          constraints: [
            {
              bond: {
                atom1: ["A", 42, "CA"],
                atom2: ["C", 1, "N1"],
              },
            },
            {
              pocket: {
                binder: "C",
                contacts: [
                  ["A", 42],
                  ["A", 43],
                  ["B", 55],
                ],
                max_distance: 5,
              },
            },
          ],
          diffusion_samples: 2,
          recycling_steps: 4,
          sampling_steps: 300,
          step_scale: 1.2,
        },
      },
      Property:
        '<!doctype html> <html lang="en"> <head> <script type="module">import { injectIntoGlobalHook } from "/@react-refresh"; injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;</script>\n<script type="module" src="/@vite/client"></script>\n<meta charset="UTF-8" /> <link rel="icon" type="image/svg+xml" href="/favicon.svg" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <title>OpenProtein API</title> </head> <body> <div id="root"></div> <script type="module" src="/src/main.tsx"></script> </body> </html>',
      Boltz2Request: {
        title: "Boltz2Request",
        description: "Request for structure prediction using Boltz-2.",
        type: "object",
        required: ["sequences"],
        properties: {
          sequences: {
            type: "array",
            description: "List of chain/molecule entities in the input.",
            items: {
              title: "Chain",
              description:
                "A chain entity, which can be a protein, DNA, RNA, or ligand.",
              oneOf: [
                {
                  title: "Protein",
                  description: "Protein to be folded.",
                  type: "object",
                  required: ["id", "msa_id", "sequence"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique chain identifier(s). Use an array for multiple identical chains.",
                    },
                    sequence: {
                      type: "string",
                      description: "Amino acid sequence of the protein chain.",
                    },
                    msa_id: {
                      type: "string",
                      format: "uuid",
                      nullable: true,
                      description:
                        "ID for an MSA job, or null for single-sequence mode.",
                    },
                  },
                  example: {
                    id: ["A", "B"],
                    sequence:
                      "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                    msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
                  },
                },
                {
                  title: "DNA",
                  description: "DNA chain to be folded.",
                  type: "object",
                  required: ["id", "sequence"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique chain identifier(s). Use an array for multiple identical chains.",
                    },
                    sequence: {
                      type: "string",
                      description: "Nucleotide sequence of the DNA chain.",
                    },
                  },
                  example: {
                    id: ["A", "B"],
                    sequence:
                      "ATGCGTACGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGC",
                  },
                },
                {
                  title: "RNA",
                  description: "RNA chain to be folded.",
                  type: "object",
                  required: ["id", "sequence"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique chain identifier(s). Use an array for multiple identical chains.",
                    },
                    sequence: {
                      type: "string",
                      description: "Nucleotide sequence of the RNA chain.",
                    },
                    msa_id: {
                      type: "string",
                      format: "uuid",
                      description:
                        "ID for an MSA job, or null for single-sequence mode.",
                    },
                  },
                  example: {
                    id: "A",
                    sequence: "GGGAUCCGAUGCUAGCUAGCUAGCUGAUGCUAGCUAGCUAGCUAGC",
                  },
                },
                {
                  title: "Ligand",
                  description:
                    "Small molecule ligand for structure prediction.",
                  type: "object",
                  required: ["id"],
                  properties: {
                    id: {
                      oneOf: [
                        {
                          type: "string",
                        },
                        {
                          type: "array",
                          items: {
                            type: "string",
                          },
                        },
                      ],
                      description:
                        "Unique identifier(s) for the ligand. Use an array for multiple identical ligands.",
                    },
                    smiles: {
                      type: "string",
                      description:
                        "SMILES string for the ligand. Mutually exclusive with ccd.",
                    },
                    ccd: {
                      type: "string",
                      description:
                        "CCD code for the ligand. Mutually exclusive with smiles.",
                    },
                  },
                  example: {
                    id: ["C", "D"],
                    ccd: "SAH",
                  },
                },
              ],
            },
          },
          constraints: {
            type: "array",
            description:
              "Optional constraints such as bonds, pockets, or contacts.",
            items: {
              oneOf: [
                {
                  title: "BondConstraint",
                  description: "Covalent bond constraint between two atoms.",
                  type: "object",
                  required: ["bond"],
                  properties: {
                    bond: {
                      type: "object",
                      required: ["atom1", "atom2"],
                      properties: {
                        atom1: {
                          type: "array",
                          description:
                            "[CHAIN_ID, RES_IDX, ATOM_NAME] for the first atom.",
                          items: {
                            oneOf: [
                              {
                                type: "string",
                              },
                              {
                                type: "integer",
                              },
                            ],
                          },
                        },
                        atom2: {
                          type: "array",
                          description:
                            "[CHAIN_ID, RES_IDX, ATOM_NAME] for the second atom.",
                          items: {
                            oneOf: [
                              {
                                type: "string",
                              },
                              {
                                type: "integer",
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                  example: {
                    bond: {
                      atom1: ["A", 42, "CA"],
                      atom2: ["C", 1, "N1"],
                    },
                  },
                },
                {
                  title: "PocketConstraint",
                  description:
                    "Specifies a pocket constraint for a binder chain and its contacts.",
                  type: "object",
                  required: ["binder", "contacts", "max_distance"],
                  properties: {
                    binder: {
                      type: "string",
                      description:
                        "Chain ID of the binder (e.g., ligand or protein).",
                    },
                    contacts: {
                      type: "array",
                      description:
                        "List of contacts, each as [CHAIN_ID, RES_IDX] or [CHAIN_ID, ATOM_NAME].",
                      items: {
                        type: "array",
                        items: {
                          oneOf: [
                            {
                              type: "string",
                            },
                            {
                              type: "integer",
                            },
                          ],
                        },
                        minItems: 2,
                        maxItems: 2,
                      },
                    },
                    max_distance: {
                      type: "number",
                      format: "float",
                      description:
                        "Maximum allowed distance (in angstroms) between binder and contacts.",
                    },
                  },
                  example: {
                    binder: "C",
                    contacts: [
                      ["A", 42],
                      ["A", 43],
                      ["B", 55],
                    ],
                    max_distance: 5,
                  },
                },
                {
                  title: "ContactConstraint",
                  description:
                    "Specifies a contact constraint between two atoms or residues.",
                  type: "object",
                  required: ["token1", "token2", "max_distance"],
                  properties: {
                    token1: {
                      type: "array",
                      description:
                        "Chain ID and residue index or atom name for the first contact point.",
                      items: {
                        oneOf: [
                          {
                            type: "string",
                          },
                          {
                            type: "integer",
                          },
                        ],
                      },
                    },
                    token2: {
                      type: "array",
                      description:
                        "Chain ID and residue index or atom name for the second contact point.",
                      items: {
                        oneOf: [
                          {
                            type: "string",
                          },
                          {
                            type: "integer",
                          },
                        ],
                      },
                    },
                    max_distance: {
                      type: "number",
                      format: "float",
                      description:
                        "Maximum allowed distance (in angstroms) between the two contact points.",
                    },
                  },
                  example: {
                    token1: ["A", 42],
                    token2: ["B", 55],
                    max_distance: 8,
                  },
                },
              ],
            },
          },
          properties: {
            type: "array",
            description: "Optional properties to compute, such as affinity.",
            items:
              '<!doctype html> <html lang="en"> <head> <script type="module">import { injectIntoGlobalHook } from "/@react-refresh"; injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;</script>\n<script type="module" src="/@vite/client"></script>\n<meta charset="UTF-8" /> <link rel="icon" type="image/svg+xml" href="/favicon.svg" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <title>OpenProtein API</title> </head> <body> <div id="root"></div> <script type="module" src="/src/main.tsx"></script> </body> </html>',
          },
          diffusion_samples: {
            type: "integer",
            description: "Number of diffusion samples to use.",
            default: 1,
          },
          recycling_steps: {
            type: "integer",
            description: "Number of recycling steps to use.",
            default: 3,
          },
          sampling_steps: {
            type: "integer",
            description: "Number of sampling steps to use.",
            default: 200,
          },
          step_scale: {
            type: "number",
            format: "float",
            description: "Scaling factor for diffusion steps.",
            default: 1.638,
          },
        },
        example: {
          sequences: [
            {
              protein: {
                id: ["A", "B"],
                sequence:
                  "MVTPEGNVSLVDESLLVGVTDEDRAVRSAHQFYERLIGLWAPAVMEAAHELGVFAALAEAPADSGELARRLDCDARAMRVLLDALYAYDVIDRIHDTNGFRYLLSAEARECLLPGTLFSLVGKFMHDINVAWPAWRNLAEVVRHGARDTSGAESPNGIAQEDYESLVGGINFWAPPIVTTLSRKLRASGRSGDATASVLDVGCGTGLYSQLLLREFPRWTATGLDVERIATLANAQALRLGVEERFATRAGDFWRGGWGTGYDLVLFANIFHLQTPASAVRLMRHAAACLAPDGLVAVVDQIVDADREPKTPQDRFALLFAASMTNTGGGDAYTFQEYEEWFTAAGLQRIETLDTPMHRILLARRATEPSAVPEGQASENLYFQ",
                msa_id: "f9152774-c354-480a-9349-a41c5dfe198b",
              },
            },
            {
              ligand: {
                id: ["C", "D"],
                ccd: "SAH",
              },
            },
            {
              ligand: {
                id: ["E", "F"],
                smiles: "N[C@@H](Cc1ccc(O)cc1)C(=O)O",
              },
            },
          ],
          constraints: [
            {
              bond: {
                atom1: ["A", 42, "CA"],
                atom2: ["C", 1, "N1"],
              },
            },
            {
              pocket: {
                binder: "C",
                contacts: [
                  ["A", 42],
                  ["A", 43],
                  ["B", 55],
                ],
                max_distance: 5,
              },
            },
          ],
          properties: [
            {
              affinity: {
                binder: "C",
              },
            },
          ],
          diffusion_samples: 2,
          recycling_steps: 4,
          sampling_steps: 300,
          step_scale: 1.2,
        },
      },
      OutputFormat: {
        title: "OutputFormat",
        description: "Output format of folded structure. Defaults to pdb.",
        type: "string",
        enum: ["pdb", "mmcif"],
        default: "pdb",
      },
    },
  },
  tags: [
    {
      name: "fold",
      description: "Querying with fold models and jobs.",
    },
    {
      name: "fold requests",
      description: "Create requests to fold protein structures",
    },
    {
      name: "boltz",
      description:
        "Create structure prediction using Boltz-2, Boltz-1x, Boltz-1 models.",
    },
    {
      name: "alphafold2",
      description:
        "Create structure prediction using AlphaFold-2 model, provided by ColabFold.",
    },
    {
      name: "esmfold",
      description: "Create structure prediction using ESMFold.",
    },
  ],
};

export default foldSpec;
