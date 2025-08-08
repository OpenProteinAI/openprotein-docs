const designSpec = {
  openapi: "3.0.2",
  info: {
    title: "OpenProtein Design",
    description:
      "# Design API\nThe Design API provided by OpenProtein.ai builds on top of our predictive models to empower you to achieve your protein design goals easily. \n\nCurrently, we support the following design algorithms:\n- **Genetic Algorithm**\n",
    version: "1.0.0",
  },
  paths: {
    "/api/v1/design/genetic-algorithm": {
      post: {
        tags: ["design"],
        summary: "Design using genetic algorithm",
        description:
          "Create a design job.\n\nExpects a job schema containing an assay_id (from your POST /assaydata flow) and a criteria; which can be a nested list of properties and targets defining the objective function of the design algorithm.\n\nThe outer list defines an OR condition whereas the inner list defines an AND condition. E.g. the corresponding objective for [[A>1, B>1], [C<5]] is (A>1 AND B>1) OR C<5.\nTwo types of objectives are supported:\n\n* model: find sequences that maximize the probability that a property is less than, equal to, or greater than a given value, where the probability is predicted by a previously trained model\n* n_mutations: find sequences that minimize the number of mutations relative to a set of sequences. Useful for exploring the trade-off between number of mutations and fitness.\n\nSee the User Guide or api schema (below).",
        operationId: "designGA",
        requestBody: {
          description:
            "Request to design new variants.\n\nCreates a pending job to design new sequences using genetic algorithm.",
          content: {
            "application/json": {
              schema: {
                title: "DesignRequestGeneticAlgorithm",
                description:
                  "Request to design new variants using genetic algorithm.",
                required: ["criteria", "num_steps", "assay_id"],
                type: "object",
                properties: {
                  num_steps: {
                    title: "Number of Steps",
                    description: "Number of steps to run the algorithm for.",
                    minimum: 1,
                    type: "integer",
                    example: 25,
                    "x-order": 10,
                  },
                  assay_id: {
                    title: "Assay ID",
                    description: "Assay ID to use as a starting point.",
                    type: "string",
                    format: "uuid",
                    "x-order": 11,
                  },
                  criteria: {
                    title: "Criteria",
                    description:
                      "List of criterion, within which is a list of same-typed of subcriterion.",
                    type: "array",
                    items: {
                      title: "Subcriteria",
                      description:
                        "List of subcriterion, each of which must be the same type.",
                      type: "array",
                      items: {
                        title: "Subcriterion",
                        description:
                          "Actual criterion that can be evaluated as a score/objective to optimize.",
                        oneOf: [
                          {
                            title: "ModelCriterion",
                            description: "Criteria for design model.",
                            required: [
                              "criterion_type",
                              "measurement_name",
                              "criterion",
                              "model_id",
                            ],
                            type: "object",
                            properties: {
                              criterion_type: {
                                title: "Criterion Type",
                                description: "Type of criterion.",
                                type: "string",
                              },
                              measurement_name: {
                                title: "Measurement Name",
                                description:
                                  "Name of measurement for objective.",
                                type: "string",
                              },
                              criterion: {
                                title: "Criterion for Model",
                                description:
                                  "Criterion for a model-based objective with a target, direction and weight.",
                                required: ["target", "direction"],
                                type: "object",
                                properties: {
                                  target: {
                                    title: "Target",
                                    description: "Target objective.",
                                    type: "number",
                                  },
                                  direction: {
                                    title: "Direction",
                                    description:
                                      "Direction of objective describing the inequality.",
                                    enum: [">", "<", "="],
                                    type: "string",
                                  },
                                  weight: {
                                    title: "Weight",
                                    description: "Weight of objective.",
                                    type: "number",
                                    default: 1,
                                  },
                                },
                              },
                              model_id: {
                                title: "ModelID",
                                description:
                                  "Model ID to use for computing objective scores.",
                                type: "string",
                              },
                            },
                          },
                          {
                            title: "NMutationsCriterion",
                            description:
                              "Criteria for design based on mutations.",
                            required: ["criterion_type"],
                            type: "object",
                            properties: {
                              criterion_type: {
                                title: "Criterion Type",
                                description: "Type of criterion.",
                                type: "string",
                              },
                              sequences: {
                                title: "Sequences",
                                description:
                                  "Sequences to use as reference for calculating the number of mutations.",
                                type: "array",
                                items: {
                                  title: "Sequence",
                                  description: "Protein sequence",
                                  type: "string",
                                  example: "MSKGEELFTGV",
                                },
                              },
                            },
                          },
                        ],
                        discriminator: {
                          propertyName: "criterion_type",
                          mapping: {
                            model: "#/components/schemas/ModelCriterion",
                            n_mutations:
                              "#/components/schemas/NMutationsCriterion",
                          },
                        },
                      },
                    },
                    "x-order": 12,
                    example: [
                      [
                        {
                          criterion_type: "model",
                          model_id: "ec0364fd-83ff-4f26-bc17-eb0bd8cfcae5",
                          measurement_name: "activity",
                          criterion: {
                            target: 0,
                            weight: 0.5,
                            direction: ">",
                          },
                        },
                      ],
                    ],
                  },
                  allowed_tokens: {
                    title: "Allowed Tokens",
                    description: "Hash map of position to allowed tokens.",
                    type: "object",
                    additionalProperties: {
                      type: "array",
                      items: {
                        type: "string",
                        description: "Allowed tokens in this position.",
                        example: ["A", "C", "M"],
                      },
                    },
                    "x-order": 13,
                    example: {
                      "1": ["M", "W", "A"],
                      "104": ["C"],
                      "131": ["C"],
                    },
                  },
                  pop_size: {
                    title: "Population Size",
                    description:
                      "Size of population or number of candidates to explore per step.",
                    type: "integer",
                    nullable: true,
                    default: 256,
                    example: 256,
                    "x-order": 101,
                  },
                  n_offsprings: {
                    title: "Number of Offsprings",
                    description: "Number of offsprings in genetic algorithm.",
                    type: "integer",
                    default: 5120,
                    example: 5120,
                    "x-order": 101,
                  },
                  crossover_prob: {
                    title: "Crossover Probability",
                    description: "Crossover probability in genetic algorithm.",
                    type: "number",
                    default: 1,
                    example: 1,
                    "x-order": 102,
                  },
                  crossover_prob_pointwise: {
                    title: "Crossover Probability Pointwise",
                    description:
                      "Pointwise crossover probability in genetic algorithm.",
                    type: "number",
                    default: 0.2,
                    example: 0.2,
                    "x-order": 103,
                  },
                  mutation_average_mutations_per_seq: {
                    title: "Average Mutations",
                    description: "Targeted average mutations per seuqnces",
                    type: "integer",
                    default: 1,
                    example: 1,
                    "x-order": 104,
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Design job created and pending.",
            content: {
              "application/json": {
                schema: {
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
            description: "Bad request.",
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
            description: "Unauthorized.",
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
          "403": {
            description: "Forbidden.",
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
            description: "Not found.",
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
            description: "Validation error.",
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
        p: "designGA",
      },
    },
    "/api/v1/design/models/rfdiffusion": {
      post: {
        tags: ["structure generation"],
        summary: "Design structures using RFdiffusion",
        description:
          "Create an RFdiffusion structure design job.\n\nCan be used for motif scaffolding, binder design, symmetric structure generation, etc. Also exposes RFpeptides using the cyclic and cyc_chain flags as explained in the RFdiffusion documentation.\n\nNOTE: These design jobs are not compatible with the above endpoints for working with design jobs. Our team is working on unifying these interfaces together.",
        operationId: "designRFdiffusion",
        requestBody: {
          description:
            "Request to design new structures.\n\nCreates a pending job to design new structures using RFdiffusion.",
          content: {
            "application/json": {
              schema: {
                title: "DesignRequestRFdiffusion",
                description:
                  "Request to design new structures using RFdiffusion.",
                type: "object",
                properties: {
                  n: {
                    title: "Number of Designs",
                    description:
                      "Number of designs to generate based on given parameters.",
                    type: "integer",
                    default: 1,
                    example: 1,
                    "x-order": 101,
                  },
                  structure_text: {
                    title: "Structure Text",
                    description: "String contents of the input PDB file.",
                    type: "string",
                    nullable: true,
                    default: null,
                    example:
                      "ATOM      1  N   ALA A   1       0.000   0.000   0.000  1.00  0.00           N\n...\n",
                    "x-order": 102,
                  },
                  contigs: {
                    title: "Contigs",
                    description:
                      "Contigs specification for providing lengths and fixed residues.",
                    type: "string",
                    nullable: true,
                    default: null,
                    example: "100-100",
                    "x-order": 103,
                  },
                  inpaint_seq: {
                    title: "Inpaint Sequences",
                    description:
                      "Mask input residues from the input structure.",
                    type: "string",
                    nullable: true,
                    default: null,
                    example: "A1/A30-40",
                    "x-order": 104,
                  },
                  provide_seq: {
                    title: "Provide Sequences",
                    description:
                      "Fix input residues when doing partial diffusion.",
                    type: "string",
                    nullable: true,
                    default: null,
                    example: "100-119",
                    "x-order": 105,
                  },
                  hotspot: {
                    title: "Hotspots",
                    description:
                      "Hotspot residues to indicate to the model which sites the binder should interact.",
                    type: "string",
                    nullable: true,
                    default: null,
                    example: "A30,A33,A34",
                    "x-order": 106,
                  },
                  T: {
                    title: "Number of Iterations",
                    description: "Number of diffusion steps to take.",
                    type: "integer",
                    default: 50,
                    example: 50,
                    "x-order": 107,
                  },
                  partial_T: {
                    title: "Number of Partial Diffusion Iterations",
                    description: "Number of partial diffusion steps to take.",
                    type: "integer",
                    default: 20,
                    example: 20,
                    "x-order": 108,
                  },
                  use_active_site_model: {
                    title: "Use Active Site Model",
                    description:
                      "Whether or not to use the active site model, which is useful for holding very small motifs in place.",
                    type: "boolean",
                    default: false,
                    example: false,
                    "x-order": 109,
                  },
                  use_beta_model: {
                    title: "Use Beta Model",
                    description:
                      "Whether or not to use the beta model, which is useful for generating more diverse topologies but possibly trading off for success rates.",
                    type: "boolean",
                    default: false,
                    example: false,
                    "x-order": 110,
                  },
                  symmetry: {
                    title: "Symmetry",
                    description: "Type of symmetry to constrain the design to.",
                    type: "string",
                    enum: ["cyclic", "dihedral", "tetrahedral"],
                    nullable: true,
                    default: null,
                    "x-order": 111,
                  },
                  order: {
                    title: "Symmetry Order",
                    description:
                      "The order of symmetry the design should have, in the case of cyclic and dihedral.",
                    type: "integer",
                    nullable: true,
                    default: null,
                    "x-order": 112,
                  },
                  add_potential: {
                    title: "Add Potential",
                    description:
                      "Whether or not to use potential when creating symmetrical designs, which has been found to be useful. If `null`, defaults to true when doing symmetrical design.",
                    type: "boolean",
                    nullable: true,
                    default: null,
                    "x-order": 113,
                  },
                  scaffold_target_structure_text: {
                    title: "Scaffold Target Structure Text",
                    description:
                      "String contents of the input PDB file for scaffold guided design. This PDB is used to provide secondary structure and block adjacency information for doing fold conditioning towards the input topology.",
                    type: "string",
                    nullable: true,
                    default: null,
                    example:
                      "ATOM      1  N   ALA A   1       0.000   0.000   0.000  1.00  0.00           N\n...\n",
                    "x-order": 114,
                  },
                  scaffold_target_use_struct: {
                    title: "Scaffold Target Use Structure",
                    description:
                      "Whether or not to use the input scaffold structure PDB as a target for scaffold guided binder design.",
                    type: "boolean",
                    default: false,
                    example: false,
                    "x-order": 115,
                  },
                },
                examples: {
                  unconditional: {
                    n: 3,
                    contigs: "100-100",
                  },
                  motif_scaffolding: {
                    contigs: "10-40/A163-181/10-40",
                    structure_text: "...",
                  },
                },
                example: {
                  n: 3,
                  contigs: "100-100",
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Design job created and pending.",
            content: {
              "application/json": {
                schema: {
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
            description: "Bad request.",
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
            description: "Unauthorized.",
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
          "403": {
            description: "Forbidden.",
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
            description: "Not found.",
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
            description: "Validation error.",
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
        p: "designRFdiffusion",
      },
    },
    "/api/v1/design/{job_id}/continue": {
      post: {
        tags: ["design"],
        summary: "Continue design job",
        description: "Request a continuation of a design job.",
        operationId: "continueDesignJob",
        parameters: [
          {
            name: "job_id",
            in: "path",
            description: "Design job ID to continue generating sequences",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                title: "DesignContinueRequest",
                description: "Request to continue a design job.",
                required: ["num_steps"],
                type: "object",
                properties: {
                  num_steps: {
                    title: "Number of steps",
                    minimum: 1,
                    type: "integer",
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "200": {
            description: "Design continue job created and pending.",
            content: {
              "application/json": {
                schema: {
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
            description: "Bad request.",
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
            description: "Unauthorized.",
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
          "403": {
            description: "Forbidden.",
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
            description: "Not found.",
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
            description: "Validation error.",
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
        p: "continueDesignJob",
      },
    },
    "/api/v1/design": {
      get: {
        tags: ["design"],
        summary: "List designs",
        description: "List designs.",
        operationId: "listDesigns",
        parameters: [
          {
            required: false,
            schema: {
              title: "Page Size",
              maximum: 1000,
              minimum: 0,
              type: "integer",
              default: 1000,
            },
            name: "page_size",
            in: "query",
          },
          {
            required: false,
            schema: {
              title: "Page Offset",
              minimum: 0,
              type: "integer",
              default: 0,
            },
            name: "page_offset",
            in: "query",
          },
        ],
        responses: {
          "200": {
            description: "List of designs with their metadata.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    title: "Design",
                    description:
                      "Design with metadata of request and results if succeeded.",
                    type: "object",
                    required: [
                      "id",
                      "status",
                      "current_step",
                      "terminated",
                      "progress_counter",
                      "created_date",
                      "algorithm",
                      "num_rows",
                      "criteria",
                      "num_steps",
                      "assay_id",
                    ],
                    properties: {
                      id: {
                        title: "ID",
                        description: "ID of design.",
                        type: "string",
                        format: "uuid",
                        "x-order": 0,
                      },
                      status: {
                        title: "JobStatus",
                        description: "Status of job.",
                        type: "string",
                        enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                        "x-order": 7,
                      },
                      current_step: {
                        title: "Current Step",
                        description: "Current step in the algorithm",
                        type: "integer",
                      },
                      terminated: {
                        title: "Terminated",
                        description:
                          "Whether the algorithm was terminated early.",
                        type: "boolean",
                      },
                      progress_counter: {
                        title: "Progress Counter",
                        description:
                          "Counter of the progress of job from 0 to 100.",
                        type: "integer",
                        minimum: 0,
                        maximum: 100,
                        example: 0,
                        default: 0,
                      },
                      created_date: {
                        title: "Created Date",
                        description: "Datetime of created object",
                        type: "string",
                        format: "date-time",
                        example: "2024-01-01T12:34:56.789Z",
                        "x-order": 4,
                      },
                      algorithm: {
                        title: "Algorithm",
                        description: "Design algorithm used.",
                        type: "string",
                      },
                      num_rows: {
                        title: "Number of Rows",
                        description:
                          "Number of rows in output of design result.",
                        type: "integer",
                      },
                      num_steps: {
                        title: "Number of Steps",
                        description:
                          "Number of steps to run the algorithm for.",
                        minimum: 1,
                        type: "integer",
                        example: 25,
                        "x-order": 10,
                      },
                      assay_id: {
                        title: "Assay ID",
                        description: "Assay ID to use as a starting point.",
                        type: "string",
                        format: "uuid",
                        "x-order": 11,
                      },
                      criteria: {
                        title: "Criteria",
                        description:
                          "List of criterion, within which is a list of same-typed of subcriterion.",
                        type: "array",
                        items: {
                          title: "Subcriteria",
                          description:
                            "List of subcriterion, each of which must be the same type.",
                          type: "array",
                          items: {
                            title: "Subcriterion",
                            description:
                              "Actual criterion that can be evaluated as a score/objective to optimize.",
                            oneOf: [
                              {
                                title: "ModelCriterion",
                                description: "Criteria for design model.",
                                required: [
                                  "criterion_type",
                                  "measurement_name",
                                  "criterion",
                                  "model_id",
                                ],
                                type: "object",
                                properties: {
                                  criterion_type: {
                                    title: "Criterion Type",
                                    description: "Type of criterion.",
                                    type: "string",
                                  },
                                  measurement_name: {
                                    title: "Measurement Name",
                                    description:
                                      "Name of measurement for objective.",
                                    type: "string",
                                  },
                                  criterion: {
                                    title: "Criterion for Model",
                                    description:
                                      "Criterion for a model-based objective with a target, direction and weight.",
                                    required: ["target", "direction"],
                                    type: "object",
                                    properties: {
                                      target: {
                                        title: "Target",
                                        description: "Target objective.",
                                        type: "number",
                                      },
                                      direction: {
                                        title: "Direction",
                                        description:
                                          "Direction of objective describing the inequality.",
                                        enum: [">", "<", "="],
                                        type: "string",
                                      },
                                      weight: {
                                        title: "Weight",
                                        description: "Weight of objective.",
                                        type: "number",
                                        default: 1,
                                      },
                                    },
                                  },
                                  model_id: {
                                    title: "ModelID",
                                    description:
                                      "Model ID to use for computing objective scores.",
                                    type: "string",
                                  },
                                },
                              },
                              {
                                title: "NMutationsCriterion",
                                description:
                                  "Criteria for design based on mutations.",
                                required: ["criterion_type"],
                                type: "object",
                                properties: {
                                  criterion_type: {
                                    title: "Criterion Type",
                                    description: "Type of criterion.",
                                    type: "string",
                                  },
                                  sequences: {
                                    title: "Sequences",
                                    description:
                                      "Sequences to use as reference for calculating the number of mutations.",
                                    type: "array",
                                    items: {
                                      title: "Sequence",
                                      description: "Protein sequence",
                                      type: "string",
                                      example: "MSKGEELFTGV",
                                    },
                                  },
                                },
                              },
                            ],
                            discriminator: {
                              propertyName: "criterion_type",
                              mapping: {
                                model: "#/components/schemas/ModelCriterion",
                                n_mutations:
                                  "#/components/schemas/NMutationsCriterion",
                              },
                            },
                          },
                        },
                        "x-order": 12,
                        example: [
                          [
                            {
                              criterion_type: "model",
                              model_id: "ec0364fd-83ff-4f26-bc17-eb0bd8cfcae5",
                              measurement_name: "activity",
                              criterion: {
                                target: 0,
                                weight: 0.5,
                                direction: ">",
                              },
                            },
                          ],
                        ],
                      },
                      allowed_tokens: {
                        title: "Allowed Tokens",
                        description: "Hash map of position to allowed tokens.",
                        type: "object",
                        additionalProperties: {
                          type: "array",
                          items: {
                            type: "string",
                            description: "Allowed tokens in this position.",
                            example: ["A", "C", "M"],
                          },
                        },
                        "x-order": 13,
                        example: {
                          "1": ["M", "W", "A"],
                          "104": ["C"],
                          "131": ["C"],
                        },
                      },
                      pop_size: {
                        title: "Population Size",
                        description:
                          "Size of population or number of candidates to explore per step.",
                        type: "integer",
                        nullable: true,
                        default: 256,
                        example: 256,
                        "x-order": 101,
                      },
                    },
                    oneOf: [
                      {
                        title: "GeneticAlgorithmParams",
                        description:
                          "Parameters for running genetic-algorithm.",
                        type: "object",
                        properties: {
                          n_offsprings: {
                            title: "Number of Offsprings",
                            description:
                              "Number of offsprings in genetic algorithm.",
                            type: "integer",
                            default: 5120,
                            example: 5120,
                            "x-order": 101,
                          },
                          crossover_prob: {
                            title: "Crossover Probability",
                            description:
                              "Crossover probability in genetic algorithm.",
                            type: "number",
                            default: 1,
                            example: 1,
                            "x-order": 102,
                          },
                          crossover_prob_pointwise: {
                            title: "Crossover Probability Pointwise",
                            description:
                              "Pointwise crossover probability in genetic algorithm.",
                            type: "number",
                            default: 0.2,
                            example: 0.2,
                            "x-order": 103,
                          },
                          mutation_average_mutations_per_seq: {
                            title: "Average Mutations",
                            description:
                              "Targeted average mutations per seuqnces",
                            type: "integer",
                            default: 1,
                            example: 1,
                            "x-order": 104,
                          },
                        },
                      },
                    ],
                    example: {
                      id: "15cde424-04fc-4bce-88ea-4c2eae225d47",
                      status: "PENDING",
                      progress_counter: 0,
                      created_date: "2024-10-30T18:21:08.046624Z",
                      algorithm: "genetic-algorithm",
                      num_rows: 0,
                      num_steps: 10,
                      assay_id: "99dc46be-5fb1-4771-a59a-65ec76d70765",
                      criteria: [
                        [
                          {
                            criterion_type: "model",
                            measurement_name: "fitness",
                            criterion: {
                              target: 0,
                              direction: ">",
                              weight: 0.5,
                            },
                            model_id: "c887360c-fa9c-4357-97fc-ad0c3e9ca3dc",
                          },
                          {
                            criterion_type: "model",
                            measurement_name: "fitness",
                            criterion: {
                              target: 0.5,
                              direction: "<",
                              weight: 0.5,
                            },
                            model_id: "0082d4f6-703f-4f94-b888-b1015fe798eb",
                          },
                        ],
                      ],
                      allowed_tokens: {
                        "1": ["M", "W", "A"],
                        "104": ["C"],
                        "131": ["C"],
                      },
                      pop_size: 1024,
                      n_offsprings: 256,
                      crossover_prob: 1,
                      crossover_prob_pointwise: 0.2,
                      mutation_average_mutations_per_seq: 1,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request.",
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
            description: "Unauthorized.",
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
          "403": {
            description: "Forbidden.",
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
            description: "Not found.",
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
            description: "Validation error.",
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
        p: "listDesigns",
      },
    },
    "/api/v1/design/{job_id}": {
      get: {
        tags: ["design"],
        summary: "Get design metadata",
        description:
          "Get design job metadata.\n\nThis endpoint will be used after a successful POST request.",
        operationId: "getDesign",
        parameters: [
          {
            required: true,
            schema: {
              title: "Design Job ID",
              description: "ID of design job whose metadata to fetch.",
              type: "string",
              format: "uuid",
            },
            name: "job_id",
            in: "path",
          },
        ],
        responses: {
          "200": {
            description: "Design metadata.",
            content: {
              "application/json": {
                schema: {
                  title: "Design",
                  description:
                    "Design with metadata of request and results if succeeded.",
                  type: "object",
                  required: [
                    "id",
                    "status",
                    "current_step",
                    "terminated",
                    "progress_counter",
                    "created_date",
                    "algorithm",
                    "num_rows",
                    "criteria",
                    "num_steps",
                    "assay_id",
                  ],
                  properties: {
                    id: {
                      title: "ID",
                      description: "ID of design.",
                      type: "string",
                      format: "uuid",
                      "x-order": 0,
                    },
                    status: {
                      title: "JobStatus",
                      description: "Status of job.",
                      type: "string",
                      enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                      "x-order": 7,
                    },
                    current_step: {
                      title: "Current Step",
                      description: "Current step in the algorithm",
                      type: "integer",
                    },
                    terminated: {
                      title: "Terminated",
                      description:
                        "Whether the algorithm was terminated early.",
                      type: "boolean",
                    },
                    progress_counter: {
                      title: "Progress Counter",
                      description:
                        "Counter of the progress of job from 0 to 100.",
                      type: "integer",
                      minimum: 0,
                      maximum: 100,
                      example: 0,
                      default: 0,
                    },
                    created_date: {
                      title: "Created Date",
                      description: "Datetime of created object",
                      type: "string",
                      format: "date-time",
                      example: "2024-01-01T12:34:56.789Z",
                      "x-order": 4,
                    },
                    algorithm: {
                      title: "Algorithm",
                      description: "Design algorithm used.",
                      type: "string",
                    },
                    num_rows: {
                      title: "Number of Rows",
                      description: "Number of rows in output of design result.",
                      type: "integer",
                    },
                    num_steps: {
                      title: "Number of Steps",
                      description: "Number of steps to run the algorithm for.",
                      minimum: 1,
                      type: "integer",
                      example: 25,
                      "x-order": 10,
                    },
                    assay_id: {
                      title: "Assay ID",
                      description: "Assay ID to use as a starting point.",
                      type: "string",
                      format: "uuid",
                      "x-order": 11,
                    },
                    criteria: {
                      title: "Criteria",
                      description:
                        "List of criterion, within which is a list of same-typed of subcriterion.",
                      type: "array",
                      items: {
                        title: "Subcriteria",
                        description:
                          "List of subcriterion, each of which must be the same type.",
                        type: "array",
                        items: {
                          title: "Subcriterion",
                          description:
                            "Actual criterion that can be evaluated as a score/objective to optimize.",
                          oneOf: [
                            {
                              title: "ModelCriterion",
                              description: "Criteria for design model.",
                              required: [
                                "criterion_type",
                                "measurement_name",
                                "criterion",
                                "model_id",
                              ],
                              type: "object",
                              properties: {
                                criterion_type: {
                                  title: "Criterion Type",
                                  description: "Type of criterion.",
                                  type: "string",
                                },
                                measurement_name: {
                                  title: "Measurement Name",
                                  description:
                                    "Name of measurement for objective.",
                                  type: "string",
                                },
                                criterion: {
                                  title: "Criterion for Model",
                                  description:
                                    "Criterion for a model-based objective with a target, direction and weight.",
                                  required: ["target", "direction"],
                                  type: "object",
                                  properties: {
                                    target: {
                                      title: "Target",
                                      description: "Target objective.",
                                      type: "number",
                                    },
                                    direction: {
                                      title: "Direction",
                                      description:
                                        "Direction of objective describing the inequality.",
                                      enum: [">", "<", "="],
                                      type: "string",
                                    },
                                    weight: {
                                      title: "Weight",
                                      description: "Weight of objective.",
                                      type: "number",
                                      default: 1,
                                    },
                                  },
                                },
                                model_id: {
                                  title: "ModelID",
                                  description:
                                    "Model ID to use for computing objective scores.",
                                  type: "string",
                                },
                              },
                            },
                            {
                              title: "NMutationsCriterion",
                              description:
                                "Criteria for design based on mutations.",
                              required: ["criterion_type"],
                              type: "object",
                              properties: {
                                criterion_type: {
                                  title: "Criterion Type",
                                  description: "Type of criterion.",
                                  type: "string",
                                },
                                sequences: {
                                  title: "Sequences",
                                  description:
                                    "Sequences to use as reference for calculating the number of mutations.",
                                  type: "array",
                                  items: {
                                    title: "Sequence",
                                    description: "Protein sequence",
                                    type: "string",
                                    example: "MSKGEELFTGV",
                                  },
                                },
                              },
                            },
                          ],
                          discriminator: {
                            propertyName: "criterion_type",
                            mapping: {
                              model: "#/components/schemas/ModelCriterion",
                              n_mutations:
                                "#/components/schemas/NMutationsCriterion",
                            },
                          },
                        },
                      },
                      "x-order": 12,
                      example: [
                        [
                          {
                            criterion_type: "model",
                            model_id: "ec0364fd-83ff-4f26-bc17-eb0bd8cfcae5",
                            measurement_name: "activity",
                            criterion: {
                              target: 0,
                              weight: 0.5,
                              direction: ">",
                            },
                          },
                        ],
                      ],
                    },
                    allowed_tokens: {
                      title: "Allowed Tokens",
                      description: "Hash map of position to allowed tokens.",
                      type: "object",
                      additionalProperties: {
                        type: "array",
                        items: {
                          type: "string",
                          description: "Allowed tokens in this position.",
                          example: ["A", "C", "M"],
                        },
                      },
                      "x-order": 13,
                      example: {
                        "1": ["M", "W", "A"],
                        "104": ["C"],
                        "131": ["C"],
                      },
                    },
                    pop_size: {
                      title: "Population Size",
                      description:
                        "Size of population or number of candidates to explore per step.",
                      type: "integer",
                      nullable: true,
                      default: 256,
                      example: 256,
                      "x-order": 101,
                    },
                  },
                  oneOf: [
                    {
                      title: "GeneticAlgorithmParams",
                      description: "Parameters for running genetic-algorithm.",
                      type: "object",
                      properties: {
                        n_offsprings: {
                          title: "Number of Offsprings",
                          description:
                            "Number of offsprings in genetic algorithm.",
                          type: "integer",
                          default: 5120,
                          example: 5120,
                          "x-order": 101,
                        },
                        crossover_prob: {
                          title: "Crossover Probability",
                          description:
                            "Crossover probability in genetic algorithm.",
                          type: "number",
                          default: 1,
                          example: 1,
                          "x-order": 102,
                        },
                        crossover_prob_pointwise: {
                          title: "Crossover Probability Pointwise",
                          description:
                            "Pointwise crossover probability in genetic algorithm.",
                          type: "number",
                          default: 0.2,
                          example: 0.2,
                          "x-order": 103,
                        },
                        mutation_average_mutations_per_seq: {
                          title: "Average Mutations",
                          description:
                            "Targeted average mutations per seuqnces",
                          type: "integer",
                          default: 1,
                          example: 1,
                          "x-order": 104,
                        },
                      },
                    },
                  ],
                  example: {
                    id: "15cde424-04fc-4bce-88ea-4c2eae225d47",
                    status: "PENDING",
                    progress_counter: 0,
                    created_date: "2024-10-30T18:21:08.046624Z",
                    algorithm: "genetic-algorithm",
                    num_rows: 0,
                    num_steps: 10,
                    assay_id: "99dc46be-5fb1-4771-a59a-65ec76d70765",
                    criteria: [
                      [
                        {
                          criterion_type: "model",
                          measurement_name: "fitness",
                          criterion: {
                            target: 0,
                            direction: ">",
                            weight: 0.5,
                          },
                          model_id: "c887360c-fa9c-4357-97fc-ad0c3e9ca3dc",
                        },
                        {
                          criterion_type: "model",
                          measurement_name: "fitness",
                          criterion: {
                            target: 0.5,
                            direction: "<",
                            weight: 0.5,
                          },
                          model_id: "0082d4f6-703f-4f94-b888-b1015fe798eb",
                        },
                      ],
                    ],
                    allowed_tokens: {
                      "1": ["M", "W", "A"],
                      "104": ["C"],
                      "131": ["C"],
                    },
                    pop_size: 1024,
                    n_offsprings: 256,
                    crossover_prob: 1,
                    crossover_prob_pointwise: 0.2,
                    mutation_average_mutations_per_seq: 1,
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request.",
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
            description: "Unauthorized.",
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
          "403": {
            description: "Forbidden.",
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
            description: "Not found.",
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
            description: "Validation error.",
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
        p: "getDesign",
      },
    },
    "/api/v1/design/{job_id}/results": {
      get: {
        tags: ["design"],
        summary: "Get design results",
        description:
          "Get design job with results if available.\n\nThis endpoint will be used after a successful POST request.",
        operationId: "getDesignResults",
        parameters: [
          {
            required: true,
            schema: {
              title: "Design Job ID",
              description: "ID of design job whose result to fetch.",
              type: "string",
              format: "uuid",
            },
            name: "job_id",
            in: "path",
          },
          {
            required: false,
            schema: {
              title: "Step",
              description: "Design step number of the results to return.",
              minimum: -1,
              type: "integer",
              default: null,
              nullable: true,
            },
            name: "step",
            in: "query",
          },
        ],
        responses: {
          "200": {
            description: "Design results.",
            content: {
              "text/csv": {
                schema: {
                  type: "string",
                  format: "binary",
                  example:
                    "step,sample_index,sequence,score1,score2,...\n0,0,ABC,0.123,0.456,...\n",
                },
              },
            },
          },
          "400": {
            description: "Bad request.",
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
            description: "Unauthorized.",
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
          "403": {
            description: "Forbidden.",
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
            description: "Not found.",
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
            description: "Validation error.",
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
        p: "getDesignResults",
      },
    },
    "/api/v1/design/n_successes": {
      post: {
        tags: ["design"],
        summary: "Calculate N Successes",
        description:
          "Compute the number of expected successes for designs based on Gaussian predictions.\n\nThis function is used compute the histogram of the number of successes expected for\nthe designed library performance. It expects that given `N` sequences in the library,\nand each `N` sequence has `M` associated means and std devs, one for each of the `M`\npredicted properties.\n\nIt works by created `N x M` normal distributions, and sampling `k` times, yielding\n`k x N x M` predicted properties. Each of the `k` sample trials are then checked, to see\nfor each of the `N` sequences, how many passed all `M` criteria.\n\n`k`: Large number of samples to form the histogram. Trade-off speed for correctness.\n\n`N`: Number of sequences in library.\n\n`M`: Number of criteria.",
        operationId: "calculateNSuccesses",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                title: "NSuccessRequest",
                description:
                  "Request to calculate the number of successes expected for a design request.",
                required: ["means", "stddevs", "criteria"],
                type: "object",
                properties: {
                  means: {
                    title: "Means",
                    description: "N x M array of means of predictions.",
                    type: "array",
                    items: {
                      type: "array",
                      items: {
                        type: "number",
                      },
                    },
                  },
                  stddevs: {
                    title: "Standard Deviations",
                    description: "N x M array of stddevs of predictions.",
                    type: "array",
                    items: {
                      type: "array",
                      items: {
                        type: "number",
                      },
                    },
                  },
                  criteria: {
                    title: "Criteria",
                    description:
                      "M array of model criterion, same as submitting a design job.\n",
                    type: "array",
                    items: {
                      title: "ModelCriterion",
                      description: "Criteria for design model.",
                      required: [
                        "criterion_type",
                        "measurement_name",
                        "criterion",
                        "model_id",
                      ],
                      type: "object",
                      properties: {
                        criterion_type: {
                          title: "Criterion Type",
                          description: "Type of criterion.",
                          type: "string",
                        },
                        measurement_name: {
                          title: "Measurement Name",
                          description: "Name of measurement for objective.",
                          type: "string",
                        },
                        criterion: {
                          title: "Criterion for Model",
                          description:
                            "Criterion for a model-based objective with a target, direction and weight.",
                          required: ["target", "direction"],
                          type: "object",
                          properties: {
                            target: {
                              title: "Target",
                              description: "Target objective.",
                              type: "number",
                            },
                            direction: {
                              title: "Direction",
                              description:
                                "Direction of objective describing the inequality.",
                              enum: [">", "<", "="],
                              type: "string",
                            },
                            weight: {
                              title: "Weight",
                              description: "Weight of objective.",
                              type: "number",
                              default: 1,
                            },
                          },
                        },
                        model_id: {
                          title: "ModelID",
                          description:
                            "Model ID to use for computing objective scores.",
                          type: "string",
                        },
                      },
                    },
                  },
                  k: {
                    title: "K",
                    description:
                      "Number of samples to draw in a Monte Carlo. Defaults to 10000.",
                    type: "integer",
                    default: 10000,
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "200": {
            description: "Successful Response",
            content: {
              "application/json": {
                schema: {
                  title: "NSuccess",
                  description:
                    "Number of successes expected for a design job, as a histogram.",
                  required: ["histogram", "mean", "stddev", "percentile"],
                  type: "object",
                  properties: {
                    histogram: {
                      title: "Histogram",
                      description: "N array of probability of success.",
                      type: "array",
                      items: {
                        type: "number",
                      },
                    },
                    mean: {
                      title: "Mean",
                      description: "Mean of the output histogram.",
                      type: "number",
                    },
                    stddev: {
                      title: "Standrd Deviation",
                      description: "Standard deviation of output histogram.",
                      type: "number",
                    },
                    percentile: {
                      title: "Percentile",
                      description:
                        "Dictionary of percentiles of the histogram.",
                      type: "object",
                      additionalProperties: {
                        type: "integer",
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request.",
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
            description: "Unauthorized.",
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
          "403": {
            description: "Forbidden.",
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
            description: "Not found.",
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
            description: "Validation error.",
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
        p: "calculateNSuccesses",
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
      ModelCriterion: {
        title: "ModelCriterion",
        description: "Criteria for design model.",
        required: [
          "criterion_type",
          "measurement_name",
          "criterion",
          "model_id",
        ],
        type: "object",
        properties: {
          criterion_type: {
            title: "Criterion Type",
            description: "Type of criterion.",
            type: "string",
          },
          measurement_name: {
            title: "Measurement Name",
            description: "Name of measurement for objective.",
            type: "string",
          },
          criterion: {
            title: "Criterion for Model",
            description:
              "Criterion for a model-based objective with a target, direction and weight.",
            required: ["target", "direction"],
            type: "object",
            properties: {
              target: {
                title: "Target",
                description: "Target objective.",
                type: "number",
              },
              direction: {
                title: "Direction",
                description:
                  "Direction of objective describing the inequality.",
                enum: [">", "<", "="],
                type: "string",
              },
              weight: {
                title: "Weight",
                description: "Weight of objective.",
                type: "number",
                default: 1,
              },
            },
          },
          model_id: {
            title: "ModelID",
            description: "Model ID to use for computing objective scores.",
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
      NMutationsCriterion: {
        title: "NMutationsCriterion",
        description: "Criteria for design based on mutations.",
        required: ["criterion_type"],
        type: "object",
        properties: {
          criterion_type: {
            title: "Criterion Type",
            description: "Type of criterion.",
            type: "string",
          },
          sequences: {
            title: "Sequences",
            description:
              "Sequences to use as reference for calculating the number of mutations.",
            type: "array",
            items: {
              title: "Sequence",
              description: "Protein sequence",
              type: "string",
              example: "MSKGEELFTGV",
            },
          },
        },
      },
      DesignParams: {
        title: "DesignParams",
        description: "Parameters for requesting design of new variants.",
        required: ["criteria", "num_steps", "assay_id"],
        type: "object",
        properties: {
          num_steps: {
            title: "Number of Steps",
            description: "Number of steps to run the algorithm for.",
            minimum: 1,
            type: "integer",
            example: 25,
            "x-order": 10,
          },
          assay_id: {
            title: "Assay ID",
            description: "Assay ID to use as a starting point.",
            type: "string",
            format: "uuid",
            "x-order": 11,
          },
          criteria: {
            title: "Criteria",
            description:
              "List of criterion, within which is a list of same-typed of subcriterion.",
            type: "array",
            items: {
              title: "Subcriteria",
              description:
                "List of subcriterion, each of which must be the same type.",
              type: "array",
              items: {
                title: "Subcriterion",
                description:
                  "Actual criterion that can be evaluated as a score/objective to optimize.",
                oneOf: [
                  {
                    title: "ModelCriterion",
                    description: "Criteria for design model.",
                    required: [
                      "criterion_type",
                      "measurement_name",
                      "criterion",
                      "model_id",
                    ],
                    type: "object",
                    properties: {
                      criterion_type: {
                        title: "Criterion Type",
                        description: "Type of criterion.",
                        type: "string",
                      },
                      measurement_name: {
                        title: "Measurement Name",
                        description: "Name of measurement for objective.",
                        type: "string",
                      },
                      criterion: {
                        title: "Criterion for Model",
                        description:
                          "Criterion for a model-based objective with a target, direction and weight.",
                        required: ["target", "direction"],
                        type: "object",
                        properties: {
                          target: {
                            title: "Target",
                            description: "Target objective.",
                            type: "number",
                          },
                          direction: {
                            title: "Direction",
                            description:
                              "Direction of objective describing the inequality.",
                            enum: [">", "<", "="],
                            type: "string",
                          },
                          weight: {
                            title: "Weight",
                            description: "Weight of objective.",
                            type: "number",
                            default: 1,
                          },
                        },
                      },
                      model_id: {
                        title: "ModelID",
                        description:
                          "Model ID to use for computing objective scores.",
                        type: "string",
                      },
                    },
                  },
                  {
                    title: "NMutationsCriterion",
                    description: "Criteria for design based on mutations.",
                    required: ["criterion_type"],
                    type: "object",
                    properties: {
                      criterion_type: {
                        title: "Criterion Type",
                        description: "Type of criterion.",
                        type: "string",
                      },
                      sequences: {
                        title: "Sequences",
                        description:
                          "Sequences to use as reference for calculating the number of mutations.",
                        type: "array",
                        items: {
                          title: "Sequence",
                          description: "Protein sequence",
                          type: "string",
                          example: "MSKGEELFTGV",
                        },
                      },
                    },
                  },
                ],
                discriminator: {
                  propertyName: "criterion_type",
                  mapping: {
                    model: "#/components/schemas/ModelCriterion",
                    n_mutations: "#/components/schemas/NMutationsCriterion",
                  },
                },
              },
            },
            "x-order": 12,
            example: [
              [
                {
                  criterion_type: "model",
                  model_id: "ec0364fd-83ff-4f26-bc17-eb0bd8cfcae5",
                  measurement_name: "activity",
                  criterion: {
                    target: 0,
                    weight: 0.5,
                    direction: ">",
                  },
                },
              ],
            ],
          },
          allowed_tokens: {
            title: "Allowed Tokens",
            description: "Hash map of position to allowed tokens.",
            type: "object",
            additionalProperties: {
              type: "array",
              items: {
                type: "string",
                description: "Allowed tokens in this position.",
                example: ["A", "C", "M"],
              },
            },
            "x-order": 13,
            example: {
              "1": ["M", "W", "A"],
              "104": ["C"],
              "131": ["C"],
            },
          },
          pop_size: {
            title: "Population Size",
            description:
              "Size of population or number of candidates to explore per step.",
            type: "integer",
            nullable: true,
            default: 256,
            example: 256,
            "x-order": 101,
          },
        },
      },
      GeneticAlgorithmParams: {
        title: "GeneticAlgorithmParams",
        description: "Parameters for running genetic-algorithm.",
        type: "object",
        properties: {
          n_offsprings: {
            title: "Number of Offsprings",
            description: "Number of offsprings in genetic algorithm.",
            type: "integer",
            default: 5120,
            example: 5120,
            "x-order": 101,
          },
          crossover_prob: {
            title: "Crossover Probability",
            description: "Crossover probability in genetic algorithm.",
            type: "number",
            default: 1,
            example: 1,
            "x-order": 102,
          },
          crossover_prob_pointwise: {
            title: "Crossover Probability Pointwise",
            description:
              "Pointwise crossover probability in genetic algorithm.",
            type: "number",
            default: 0.2,
            example: 0.2,
            "x-order": 103,
          },
          mutation_average_mutations_per_seq: {
            title: "Average Mutations",
            description: "Targeted average mutations per seuqnces",
            type: "integer",
            default: 1,
            example: 1,
            "x-order": 104,
          },
        },
      },
      DesignRequestGA: {
        title: "DesignRequestGeneticAlgorithm",
        description: "Request to design new variants using genetic algorithm.",
        required: ["criteria", "num_steps", "assay_id"],
        type: "object",
        properties: {
          num_steps: {
            title: "Number of Steps",
            description: "Number of steps to run the algorithm for.",
            minimum: 1,
            type: "integer",
            example: 25,
            "x-order": 10,
          },
          assay_id: {
            title: "Assay ID",
            description: "Assay ID to use as a starting point.",
            type: "string",
            format: "uuid",
            "x-order": 11,
          },
          criteria: {
            title: "Criteria",
            description:
              "List of criterion, within which is a list of same-typed of subcriterion.",
            type: "array",
            items: {
              title: "Subcriteria",
              description:
                "List of subcriterion, each of which must be the same type.",
              type: "array",
              items: {
                title: "Subcriterion",
                description:
                  "Actual criterion that can be evaluated as a score/objective to optimize.",
                oneOf: [
                  {
                    title: "ModelCriterion",
                    description: "Criteria for design model.",
                    required: [
                      "criterion_type",
                      "measurement_name",
                      "criterion",
                      "model_id",
                    ],
                    type: "object",
                    properties: {
                      criterion_type: {
                        title: "Criterion Type",
                        description: "Type of criterion.",
                        type: "string",
                      },
                      measurement_name: {
                        title: "Measurement Name",
                        description: "Name of measurement for objective.",
                        type: "string",
                      },
                      criterion: {
                        title: "Criterion for Model",
                        description:
                          "Criterion for a model-based objective with a target, direction and weight.",
                        required: ["target", "direction"],
                        type: "object",
                        properties: {
                          target: {
                            title: "Target",
                            description: "Target objective.",
                            type: "number",
                          },
                          direction: {
                            title: "Direction",
                            description:
                              "Direction of objective describing the inequality.",
                            enum: [">", "<", "="],
                            type: "string",
                          },
                          weight: {
                            title: "Weight",
                            description: "Weight of objective.",
                            type: "number",
                            default: 1,
                          },
                        },
                      },
                      model_id: {
                        title: "ModelID",
                        description:
                          "Model ID to use for computing objective scores.",
                        type: "string",
                      },
                    },
                  },
                  {
                    title: "NMutationsCriterion",
                    description: "Criteria for design based on mutations.",
                    required: ["criterion_type"],
                    type: "object",
                    properties: {
                      criterion_type: {
                        title: "Criterion Type",
                        description: "Type of criterion.",
                        type: "string",
                      },
                      sequences: {
                        title: "Sequences",
                        description:
                          "Sequences to use as reference for calculating the number of mutations.",
                        type: "array",
                        items: {
                          title: "Sequence",
                          description: "Protein sequence",
                          type: "string",
                          example: "MSKGEELFTGV",
                        },
                      },
                    },
                  },
                ],
                discriminator: {
                  propertyName: "criterion_type",
                  mapping: {
                    model: "#/components/schemas/ModelCriterion",
                    n_mutations: "#/components/schemas/NMutationsCriterion",
                  },
                },
              },
            },
            "x-order": 12,
            example: [
              [
                {
                  criterion_type: "model",
                  model_id: "ec0364fd-83ff-4f26-bc17-eb0bd8cfcae5",
                  measurement_name: "activity",
                  criterion: {
                    target: 0,
                    weight: 0.5,
                    direction: ">",
                  },
                },
              ],
            ],
          },
          allowed_tokens: {
            title: "Allowed Tokens",
            description: "Hash map of position to allowed tokens.",
            type: "object",
            additionalProperties: {
              type: "array",
              items: {
                type: "string",
                description: "Allowed tokens in this position.",
                example: ["A", "C", "M"],
              },
            },
            "x-order": 13,
            example: {
              "1": ["M", "W", "A"],
              "104": ["C"],
              "131": ["C"],
            },
          },
          pop_size: {
            title: "Population Size",
            description:
              "Size of population or number of candidates to explore per step.",
            type: "integer",
            nullable: true,
            default: 256,
            example: 256,
            "x-order": 101,
          },
          n_offsprings: {
            title: "Number of Offsprings",
            description: "Number of offsprings in genetic algorithm.",
            type: "integer",
            default: 5120,
            example: 5120,
            "x-order": 101,
          },
          crossover_prob: {
            title: "Crossover Probability",
            description: "Crossover probability in genetic algorithm.",
            type: "number",
            default: 1,
            example: 1,
            "x-order": 102,
          },
          crossover_prob_pointwise: {
            title: "Crossover Probability Pointwise",
            description:
              "Pointwise crossover probability in genetic algorithm.",
            type: "number",
            default: 0.2,
            example: 0.2,
            "x-order": 103,
          },
          mutation_average_mutations_per_seq: {
            title: "Average Mutations",
            description: "Targeted average mutations per seuqnces",
            type: "integer",
            default: 1,
            example: 1,
            "x-order": 104,
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
      DesignRequestRFdiffusion: {
        title: "DesignRequestRFdiffusion",
        description: "Request to design new structures using RFdiffusion.",
        type: "object",
        properties: {
          n: {
            title: "Number of Designs",
            description:
              "Number of designs to generate based on given parameters.",
            type: "integer",
            default: 1,
            example: 1,
            "x-order": 101,
          },
          structure_text: {
            title: "Structure Text",
            description: "String contents of the input PDB file.",
            type: "string",
            nullable: true,
            default: null,
            example:
              "ATOM      1  N   ALA A   1       0.000   0.000   0.000  1.00  0.00           N\n...\n",
            "x-order": 102,
          },
          contigs: {
            title: "Contigs",
            description:
              "Contigs specification for providing lengths and fixed residues.",
            type: "string",
            nullable: true,
            default: null,
            example: "100-100",
            "x-order": 103,
          },
          inpaint_seq: {
            title: "Inpaint Sequences",
            description: "Mask input residues from the input structure.",
            type: "string",
            nullable: true,
            default: null,
            example: "A1/A30-40",
            "x-order": 104,
          },
          provide_seq: {
            title: "Provide Sequences",
            description: "Fix input residues when doing partial diffusion.",
            type: "string",
            nullable: true,
            default: null,
            example: "100-119",
            "x-order": 105,
          },
          hotspot: {
            title: "Hotspots",
            description:
              "Hotspot residues to indicate to the model which sites the binder should interact.",
            type: "string",
            nullable: true,
            default: null,
            example: "A30,A33,A34",
            "x-order": 106,
          },
          T: {
            title: "Number of Iterations",
            description: "Number of diffusion steps to take.",
            type: "integer",
            default: 50,
            example: 50,
            "x-order": 107,
          },
          partial_T: {
            title: "Number of Partial Diffusion Iterations",
            description: "Number of partial diffusion steps to take.",
            type: "integer",
            default: 20,
            example: 20,
            "x-order": 108,
          },
          use_active_site_model: {
            title: "Use Active Site Model",
            description:
              "Whether or not to use the active site model, which is useful for holding very small motifs in place.",
            type: "boolean",
            default: false,
            example: false,
            "x-order": 109,
          },
          use_beta_model: {
            title: "Use Beta Model",
            description:
              "Whether or not to use the beta model, which is useful for generating more diverse topologies but possibly trading off for success rates.",
            type: "boolean",
            default: false,
            example: false,
            "x-order": 110,
          },
          symmetry: {
            title: "Symmetry",
            description: "Type of symmetry to constrain the design to.",
            type: "string",
            enum: ["cyclic", "dihedral", "tetrahedral"],
            nullable: true,
            default: null,
            "x-order": 111,
          },
          order: {
            title: "Symmetry Order",
            description:
              "The order of symmetry the design should have, in the case of cyclic and dihedral.",
            type: "integer",
            nullable: true,
            default: null,
            "x-order": 112,
          },
          add_potential: {
            title: "Add Potential",
            description:
              "Whether or not to use potential when creating symmetrical designs, which has been found to be useful. If `null`, defaults to true when doing symmetrical design.",
            type: "boolean",
            nullable: true,
            default: null,
            "x-order": 113,
          },
          scaffold_target_structure_text: {
            title: "Scaffold Target Structure Text",
            description:
              "String contents of the input PDB file for scaffold guided design. This PDB is used to provide secondary structure and block adjacency information for doing fold conditioning towards the input topology.",
            type: "string",
            nullable: true,
            default: null,
            example:
              "ATOM      1  N   ALA A   1       0.000   0.000   0.000  1.00  0.00           N\n...\n",
            "x-order": 114,
          },
          scaffold_target_use_struct: {
            title: "Scaffold Target Use Structure",
            description:
              "Whether or not to use the input scaffold structure PDB as a target for scaffold guided binder design.",
            type: "boolean",
            default: false,
            example: false,
            "x-order": 115,
          },
        },
        examples: {
          unconditional: {
            n: 3,
            contigs: "100-100",
          },
          motif_scaffolding: {
            contigs: "10-40/A163-181/10-40",
            structure_text: "...",
          },
        },
        example: {
          n: 3,
          contigs: "100-100",
        },
      },
      DesignContinueRequest: {
        title: "DesignContinueRequest",
        description: "Request to continue a design job.",
        required: ["num_steps"],
        type: "object",
        properties: {
          num_steps: {
            title: "Number of steps",
            minimum: 1,
            type: "integer",
          },
        },
      },
      DesignMetadata: {
        title: "DesignMetadata",
        description: "Metadata of existing design.",
        type: "object",
        required: [
          "id",
          "status",
          "current_step",
          "terminated",
          "progress_counter",
          "created_date",
          "algorithm",
          "num_rows",
        ],
        properties: {
          id: {
            title: "ID",
            description: "ID of design.",
            type: "string",
            format: "uuid",
            "x-order": 0,
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          current_step: {
            title: "Current Step",
            description: "Current step in the algorithm",
            type: "integer",
          },
          terminated: {
            title: "Terminated",
            description: "Whether the algorithm was terminated early.",
            type: "boolean",
          },
          progress_counter: {
            title: "Progress Counter",
            description: "Counter of the progress of job from 0 to 100.",
            type: "integer",
            minimum: 0,
            maximum: 100,
            example: 0,
            default: 0,
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          algorithm: {
            title: "Algorithm",
            description: "Design algorithm used.",
            type: "string",
          },
          num_rows: {
            title: "Number of Rows",
            description: "Number of rows in output of design result.",
            type: "integer",
          },
        },
      },
      Design: {
        title: "Design",
        description:
          "Design with metadata of request and results if succeeded.",
        type: "object",
        required: [
          "id",
          "status",
          "current_step",
          "terminated",
          "progress_counter",
          "created_date",
          "algorithm",
          "num_rows",
          "criteria",
          "num_steps",
          "assay_id",
        ],
        properties: {
          id: {
            title: "ID",
            description: "ID of design.",
            type: "string",
            format: "uuid",
            "x-order": 0,
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          current_step: {
            title: "Current Step",
            description: "Current step in the algorithm",
            type: "integer",
          },
          terminated: {
            title: "Terminated",
            description: "Whether the algorithm was terminated early.",
            type: "boolean",
          },
          progress_counter: {
            title: "Progress Counter",
            description: "Counter of the progress of job from 0 to 100.",
            type: "integer",
            minimum: 0,
            maximum: 100,
            example: 0,
            default: 0,
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          algorithm: {
            title: "Algorithm",
            description: "Design algorithm used.",
            type: "string",
          },
          num_rows: {
            title: "Number of Rows",
            description: "Number of rows in output of design result.",
            type: "integer",
          },
          num_steps: {
            title: "Number of Steps",
            description: "Number of steps to run the algorithm for.",
            minimum: 1,
            type: "integer",
            example: 25,
            "x-order": 10,
          },
          assay_id: {
            title: "Assay ID",
            description: "Assay ID to use as a starting point.",
            type: "string",
            format: "uuid",
            "x-order": 11,
          },
          criteria: {
            title: "Criteria",
            description:
              "List of criterion, within which is a list of same-typed of subcriterion.",
            type: "array",
            items: {
              title: "Subcriteria",
              description:
                "List of subcriterion, each of which must be the same type.",
              type: "array",
              items: {
                title: "Subcriterion",
                description:
                  "Actual criterion that can be evaluated as a score/objective to optimize.",
                oneOf: [
                  {
                    title: "ModelCriterion",
                    description: "Criteria for design model.",
                    required: [
                      "criterion_type",
                      "measurement_name",
                      "criterion",
                      "model_id",
                    ],
                    type: "object",
                    properties: {
                      criterion_type: {
                        title: "Criterion Type",
                        description: "Type of criterion.",
                        type: "string",
                      },
                      measurement_name: {
                        title: "Measurement Name",
                        description: "Name of measurement for objective.",
                        type: "string",
                      },
                      criterion: {
                        title: "Criterion for Model",
                        description:
                          "Criterion for a model-based objective with a target, direction and weight.",
                        required: ["target", "direction"],
                        type: "object",
                        properties: {
                          target: {
                            title: "Target",
                            description: "Target objective.",
                            type: "number",
                          },
                          direction: {
                            title: "Direction",
                            description:
                              "Direction of objective describing the inequality.",
                            enum: [">", "<", "="],
                            type: "string",
                          },
                          weight: {
                            title: "Weight",
                            description: "Weight of objective.",
                            type: "number",
                            default: 1,
                          },
                        },
                      },
                      model_id: {
                        title: "ModelID",
                        description:
                          "Model ID to use for computing objective scores.",
                        type: "string",
                      },
                    },
                  },
                  {
                    title: "NMutationsCriterion",
                    description: "Criteria for design based on mutations.",
                    required: ["criterion_type"],
                    type: "object",
                    properties: {
                      criterion_type: {
                        title: "Criterion Type",
                        description: "Type of criterion.",
                        type: "string",
                      },
                      sequences: {
                        title: "Sequences",
                        description:
                          "Sequences to use as reference for calculating the number of mutations.",
                        type: "array",
                        items: {
                          title: "Sequence",
                          description: "Protein sequence",
                          type: "string",
                          example: "MSKGEELFTGV",
                        },
                      },
                    },
                  },
                ],
                discriminator: {
                  propertyName: "criterion_type",
                  mapping: {
                    model: "#/components/schemas/ModelCriterion",
                    n_mutations: "#/components/schemas/NMutationsCriterion",
                  },
                },
              },
            },
            "x-order": 12,
            example: [
              [
                {
                  criterion_type: "model",
                  model_id: "ec0364fd-83ff-4f26-bc17-eb0bd8cfcae5",
                  measurement_name: "activity",
                  criterion: {
                    target: 0,
                    weight: 0.5,
                    direction: ">",
                  },
                },
              ],
            ],
          },
          allowed_tokens: {
            title: "Allowed Tokens",
            description: "Hash map of position to allowed tokens.",
            type: "object",
            additionalProperties: {
              type: "array",
              items: {
                type: "string",
                description: "Allowed tokens in this position.",
                example: ["A", "C", "M"],
              },
            },
            "x-order": 13,
            example: {
              "1": ["M", "W", "A"],
              "104": ["C"],
              "131": ["C"],
            },
          },
          pop_size: {
            title: "Population Size",
            description:
              "Size of population or number of candidates to explore per step.",
            type: "integer",
            nullable: true,
            default: 256,
            example: 256,
            "x-order": 101,
          },
        },
        oneOf: [
          {
            title: "GeneticAlgorithmParams",
            description: "Parameters for running genetic-algorithm.",
            type: "object",
            properties: {
              n_offsprings: {
                title: "Number of Offsprings",
                description: "Number of offsprings in genetic algorithm.",
                type: "integer",
                default: 5120,
                example: 5120,
                "x-order": 101,
              },
              crossover_prob: {
                title: "Crossover Probability",
                description: "Crossover probability in genetic algorithm.",
                type: "number",
                default: 1,
                example: 1,
                "x-order": 102,
              },
              crossover_prob_pointwise: {
                title: "Crossover Probability Pointwise",
                description:
                  "Pointwise crossover probability in genetic algorithm.",
                type: "number",
                default: 0.2,
                example: 0.2,
                "x-order": 103,
              },
              mutation_average_mutations_per_seq: {
                title: "Average Mutations",
                description: "Targeted average mutations per seuqnces",
                type: "integer",
                default: 1,
                example: 1,
                "x-order": 104,
              },
            },
          },
        ],
        example: {
          id: "15cde424-04fc-4bce-88ea-4c2eae225d47",
          status: "PENDING",
          progress_counter: 0,
          created_date: "2024-10-30T18:21:08.046624Z",
          algorithm: "genetic-algorithm",
          num_rows: 0,
          num_steps: 10,
          assay_id: "99dc46be-5fb1-4771-a59a-65ec76d70765",
          criteria: [
            [
              {
                criterion_type: "model",
                measurement_name: "fitness",
                criterion: {
                  target: 0,
                  direction: ">",
                  weight: 0.5,
                },
                model_id: "c887360c-fa9c-4357-97fc-ad0c3e9ca3dc",
              },
              {
                criterion_type: "model",
                measurement_name: "fitness",
                criterion: {
                  target: 0.5,
                  direction: "<",
                  weight: 0.5,
                },
                model_id: "0082d4f6-703f-4f94-b888-b1015fe798eb",
              },
            ],
          ],
          allowed_tokens: {
            "1": ["M", "W", "A"],
            "104": ["C"],
            "131": ["C"],
          },
          pop_size: 1024,
          n_offsprings: 256,
          crossover_prob: 1,
          crossover_prob_pointwise: 0.2,
          mutation_average_mutations_per_seq: 1,
        },
      },
      NSuccessRequest: {
        title: "NSuccessRequest",
        description:
          "Request to calculate the number of successes expected for a design request.",
        required: ["means", "stddevs", "criteria"],
        type: "object",
        properties: {
          means: {
            title: "Means",
            description: "N x M array of means of predictions.",
            type: "array",
            items: {
              type: "array",
              items: {
                type: "number",
              },
            },
          },
          stddevs: {
            title: "Standard Deviations",
            description: "N x M array of stddevs of predictions.",
            type: "array",
            items: {
              type: "array",
              items: {
                type: "number",
              },
            },
          },
          criteria: {
            title: "Criteria",
            description:
              "M array of model criterion, same as submitting a design job.\n",
            type: "array",
            items: {
              title: "ModelCriterion",
              description: "Criteria for design model.",
              required: [
                "criterion_type",
                "measurement_name",
                "criterion",
                "model_id",
              ],
              type: "object",
              properties: {
                criterion_type: {
                  title: "Criterion Type",
                  description: "Type of criterion.",
                  type: "string",
                },
                measurement_name: {
                  title: "Measurement Name",
                  description: "Name of measurement for objective.",
                  type: "string",
                },
                criterion: {
                  title: "Criterion for Model",
                  description:
                    "Criterion for a model-based objective with a target, direction and weight.",
                  required: ["target", "direction"],
                  type: "object",
                  properties: {
                    target: {
                      title: "Target",
                      description: "Target objective.",
                      type: "number",
                    },
                    direction: {
                      title: "Direction",
                      description:
                        "Direction of objective describing the inequality.",
                      enum: [">", "<", "="],
                      type: "string",
                    },
                    weight: {
                      title: "Weight",
                      description: "Weight of objective.",
                      type: "number",
                      default: 1,
                    },
                  },
                },
                model_id: {
                  title: "ModelID",
                  description:
                    "Model ID to use for computing objective scores.",
                  type: "string",
                },
              },
            },
          },
          k: {
            title: "K",
            description:
              "Number of samples to draw in a Monte Carlo. Defaults to 10000.",
            type: "integer",
            default: 10000,
          },
        },
      },
      NSuccess: {
        title: "NSuccess",
        description:
          "Number of successes expected for a design job, as a histogram.",
        required: ["histogram", "mean", "stddev", "percentile"],
        type: "object",
        properties: {
          histogram: {
            title: "Histogram",
            description: "N array of probability of success.",
            type: "array",
            items: {
              type: "number",
            },
          },
          mean: {
            title: "Mean",
            description: "Mean of the output histogram.",
            type: "number",
          },
          stddev: {
            title: "Standrd Deviation",
            description: "Standard deviation of output histogram.",
            type: "number",
          },
          percentile: {
            title: "Percentile",
            description: "Dictionary of percentiles of the histogram.",
            type: "object",
            additionalProperties: {
              type: "integer",
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: "design",
      description: "Design new variants to meet your design objectives",
    },
    {
      name: "structure generation",
      description:
        "Generate de novo protein structures based on your target structures",
    },
  ],
};

export default designSpec;
