const predictorSpec = {
  openapi: "3.0.2",
  info: {
    title: "OpenProtein Predictor",
    description:
      "# Predictor API\nThe Predictor API provided by OpenProtein.ai allows you to train and use predictive models which are built on top of our state-of-the-art embedding models.\n\nCurrently, we support the following regressive models:\n- **Gaussian Process**\n",
    version: "1.0.0",
  },
  paths: {
    "/api/v1/predictor/gp": {
      post: {
        tags: ["predictor"],
        summary: "Train a predictor",
        description: "Train a predictor model using an assay.",
        operationId: "trainGP",
        requestBody: {
          description:
            "Request to train a predictor.\n\nCreates a pending job to train a predictor using an assay.",
          content: {
            "application/json": {
              schema: {
                title: "TrainRequestGP",
                description: "Request to train a predictor using GP.",
                type: "object",
                required: ["dataset", "features", "kernel"],
                properties: {
                  name: {
                    type: "string",
                    description: "Name of predictor to save.",
                  },
                  description: {
                    type: "string",
                    description: "Description of predictor.",
                  },
                  dataset: {
                    title: "TrainingDataset",
                    type: "object",
                    required: ["assay_id", "properties"],
                    properties: {
                      assay_id: {
                        title: "Assay ID",
                        description: "ID of assay",
                        type: "string",
                        format: "uuid",
                      },
                      properties: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                        example: ["fitness"],
                      },
                    },
                  },
                  features: {
                    type: "object",
                    required: ["type"],
                    properties: {
                      type: {
                        type: "string",
                        description:
                          "Type of featurization method. `SVD` refers to a fitted SVD.",
                        enum: ["1-HOT", "PLM", "SVD"],
                        example: "PLM",
                      },
                      model_id: {
                        type: "string",
                        description:
                          "Model ID to use if using `PLM`/`SVD` type.",
                        example: "prot-seq",
                      },
                      reduction: {
                        title: "Reduction",
                        description:
                          "Type of reduction to use with embeddings.",
                        type: "string",
                        enum: ["MEAN", "SUM"],
                      },
                      prompt_id: {
                        title: "PromptID",
                        description: "ID of created prompt",
                        type: "string",
                        format: "uuid",
                      },
                    },
                    title: "TrainFeatures",
                    description:
                      "Feature properties for training the predictor.",
                  },
                  kernel: {
                    title: "Kernel",
                    description:
                      "Kernel used for training a kernel-based predictor, e.g. GP.",
                    type: "object",
                    required: ["type", "multitask"],
                    properties: {
                      type: {
                        type: "string",
                        description: "Type of kernel to use with GP.",
                        enum: ["linear", "rbf", "matern21", "matern32"],
                        example: "rbf",
                      },
                      multitask: {
                        type: "boolean",
                        description: "Whether or not to train GP as multitask.",
                        example: true,
                        default: false,
                      },
                    },
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Training job created and pending.",
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
                      example: "/predictor/train",
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
            description: "Model or assay not found.",
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
        p: "trainGP",
      },
    },
    "/api/v1/predictor/ensemble": {
      post: {
        tags: ["predictor"],
        summary: "Ensemble trained predictors",
        description: "Create an ensemble predictor from a list of predictors.",
        operationId: "createEnsemble",
        requestBody: {
          description: "Request to create ensemble predictor.",
          content: {
            "application/json": {
              schema: {
                title: "EnsembleRequest",
                description: "Request to create ensemble predictor.",
                type: "object",
                required: ["model_ids"],
                properties: {
                  name: {
                    type: "string",
                    description: "Name of ensemble predictor to save.",
                    example: "My Ensemble Model",
                  },
                  description: {
                    type: "string",
                    description: "Description of ensemble predictor.",
                    example: "Ensemble model combining datasets.",
                  },
                  model_ids: {
                    title: "Model IDs to ensemble.",
                    type: "array",
                    items: {
                      type: "string",
                      format: "uuid",
                    },
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Ensemble predictor created.",
            content: {
              "application/json": {
                schema: {
                  title: "Predictor",
                  description:
                    "Predictor metadata, with calibration stats if available.",
                  oneOf: [
                    {
                      title: "TrainPredictor",
                      description:
                        "Predictor used to run predictions of properties on sequences.",
                      type: "object",
                      required: [
                        "id",
                        "name",
                        "status",
                        "created_date",
                        "owner",
                        "model_spec",
                        "training_dataset",
                      ],
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                          description: "ID of predictor.",
                          "x-order": 0,
                        },
                        name: {
                          type: "string",
                          description: "Name of predictor.",
                          "x-order": 1,
                          example: "My GP Model",
                        },
                        description: {
                          type: "string",
                          description: "Description of predictor.",
                          "x-order": 2,
                          example: "GP model trained on fitness",
                        },
                        status: {
                          title: "JobStatus",
                          description: "Status of job.",
                          type: "string",
                          enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                          "x-order": 7,
                        },
                        created_date: {
                          title: "Created Date",
                          description: "Datetime of created object",
                          type: "string",
                          format: "date-time",
                          example: "2024-01-01T12:34:56.789Z",
                          "x-order": 4,
                        },
                        model_spec: {
                          title: "ModelSpec",
                          description:
                            "Specification of the predictor's model.",
                          type: "object",
                          required: ["type"],
                          properties: {
                            type: {
                              title: "PredictorType",
                              description: "Type of model of the predictor.",
                              type: "string",
                              enum: ["GP", "ENSEMBLE"],
                            },
                            constraints: {
                              title: "Constraints",
                              description:
                                "Constraints imposed on using the predictor.",
                              type: "object",
                              properties: {
                                sequence_length: {
                                  description:
                                    "Possible constraint on fixed length sequence if no reduction was used to train.",
                                  type: "integer",
                                  example: 1024,
                                },
                              },
                            },
                            features: {
                              type: "object",
                              required: ["type"],
                              properties: {
                                type: {
                                  type: "string",
                                  description:
                                    "Type of featurization method. `SVD` refers to a fitted SVD.",
                                  enum: ["1-HOT", "PLM", "SVD"],
                                  example: "PLM",
                                },
                                model_id: {
                                  type: "string",
                                  description:
                                    "Model ID to use if using `PLM`/`SVD` type.",
                                  example: "prot-seq",
                                },
                                reduction: {
                                  title: "Reduction",
                                  description:
                                    "Type of reduction to use with embeddings.",
                                  type: "string",
                                  enum: ["MEAN", "SUM"],
                                },
                                prompt_id: {
                                  title: "PromptID",
                                  description: "ID of created prompt",
                                  type: "string",
                                  format: "uuid",
                                },
                              },
                              title: "TrainFeatures",
                              description:
                                "Feature properties for training the predictor.",
                            },
                            kernel: {
                              title: "Kernel",
                              description:
                                "Kernel used for training a kernel-based predictor, e.g. GP.",
                              type: "object",
                              required: ["type", "multitask"],
                              properties: {
                                type: {
                                  type: "string",
                                  description: "Type of kernel to use with GP.",
                                  enum: [
                                    "linear",
                                    "rbf",
                                    "matern21",
                                    "matern32",
                                  ],
                                  example: "rbf",
                                },
                                multitask: {
                                  type: "boolean",
                                  description:
                                    "Whether or not to train GP as multitask.",
                                  example: true,
                                  default: false,
                                },
                              },
                            },
                          },
                        },
                        training_dataset: {
                          type: "object",
                          required: [
                            "assay_id",
                            "properties",
                            "assay_id",
                            "properties",
                          ],
                          properties: {
                            assay_id: {
                              title: "Assay ID",
                              description: "ID of assay",
                              type: "string",
                              format: "uuid",
                            },
                            properties: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              example: ["fitness", "fitness"],
                            },
                          },
                          title: "TrainingDataset",
                        },
                        owner: {
                          type: "string",
                          example: "openprotein",
                        },
                        stats: {
                          title: "CalibrationStats",
                          description:
                            "Calibration stats of predictors from latest evaluation.",
                          type: "object",
                          properties: {
                            pearson: {
                              type: "number",
                              format: "float",
                              description:
                                "Pearson correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.123,
                            },
                            spearman: {
                              type: "number",
                              format: "float",
                              description:
                                "Spearman correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.248,
                            },
                            ece: {
                              type: "number",
                              format: "float",
                              description:
                                "Calibration score of the predictor's crossvalidation.",
                              example: 0.456,
                            },
                          },
                        },
                        calibration_curve: {
                          title: "CalibrationCurve",
                          description:
                            "Calibration curve of predictors from latest evaluation.",
                          type: "array",
                          items: {
                            type: "object",
                            required: ["x", "y"],
                            properties: {
                              x: {
                                type: "number",
                                format: "float",
                                description:
                                  "Predicted quantile for predictor's crossvalidation.",
                              },
                              y: {
                                type: "number",
                                format: "float",
                                description:
                                  "Observed quantile for predictor's crossvalidation.",
                              },
                            },
                          },
                          nullable: true,
                          example: [
                            {
                              x: 0.5,
                              y: 0.52,
                            },
                          ],
                        },
                      },
                    },
                    {
                      title: "EnsemblePredictor",
                      description:
                        "Predictor used to run predictions of properties on sequences.",
                      type: "object",
                      required: [
                        "id",
                        "name",
                        "status",
                        "created_date",
                        "owner",
                        "model_spec",
                        "training_dataset",
                        "ensemble_model_ids",
                      ],
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                          description: "ID of predictor.",
                          "x-order": 0,
                        },
                        name: {
                          type: "string",
                          description: "Name of predictor.",
                          "x-order": 1,
                          example: "My Ensemble Model",
                        },
                        description: {
                          type: "string",
                          description: "Description of predictor.",
                          "x-order": 2,
                          example: "Ensemble model combining datasets.",
                        },
                        status: {
                          title: "JobStatus",
                          description: "Status of job.",
                          type: "string",
                          enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                          "x-order": 7,
                        },
                        created_date: {
                          title: "Created Date",
                          description: "Datetime of created object",
                          type: "string",
                          format: "date-time",
                          example: "2024-01-01T12:34:56.789Z",
                          "x-order": 4,
                        },
                        model_spec: {
                          title: "ModelSpec",
                          description:
                            "Specification of the predictor's model.",
                          type: "object",
                          required: ["type"],
                          properties: {
                            type: {
                              title: "PredictorType",
                              description: "Type of model of the predictor.",
                              type: "string",
                              enum: ["GP", "ENSEMBLE"],
                            },
                            constraints: {
                              title: "Constraints",
                              description:
                                "Constraints imposed on using the predictor.",
                              type: "object",
                              properties: {
                                sequence_length: {
                                  description:
                                    "Possible constraint on fixed length sequence if no reduction was used to train.",
                                  type: "integer",
                                  example: 1024,
                                },
                              },
                            },
                            features: {
                              type: "object",
                              required: ["type"],
                              properties: {
                                type: {
                                  type: "string",
                                  description:
                                    "Type of featurization method. `SVD` refers to a fitted SVD.",
                                  enum: ["1-HOT", "PLM", "SVD"],
                                  example: "PLM",
                                },
                                model_id: {
                                  type: "string",
                                  description:
                                    "Model ID to use if using `PLM`/`SVD` type.",
                                  example: "prot-seq",
                                },
                                reduction: {
                                  title: "Reduction",
                                  description:
                                    "Type of reduction to use with embeddings.",
                                  type: "string",
                                  enum: ["MEAN", "SUM"],
                                },
                                prompt_id: {
                                  title: "PromptID",
                                  description: "ID of created prompt",
                                  type: "string",
                                  format: "uuid",
                                },
                              },
                              title: "TrainFeatures",
                              description:
                                "Feature properties for training the predictor.",
                            },
                            kernel: {
                              title: "Kernel",
                              description:
                                "Kernel used for training a kernel-based predictor, e.g. GP.",
                              type: "object",
                              required: ["type", "multitask"],
                              properties: {
                                type: {
                                  type: "string",
                                  description: "Type of kernel to use with GP.",
                                  enum: [
                                    "linear",
                                    "rbf",
                                    "matern21",
                                    "matern32",
                                  ],
                                  example: "rbf",
                                },
                                multitask: {
                                  type: "boolean",
                                  description:
                                    "Whether or not to train GP as multitask.",
                                  example: true,
                                  default: false,
                                },
                              },
                            },
                          },
                        },
                        training_dataset: {
                          type: "object",
                          required: ["assay_id", "properties"],
                          properties: {
                            assay_id: {
                              title: "Assay ID",
                              description: "ID of assay",
                              type: "string",
                              format: "uuid",
                            },
                            properties: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              example: ["fitness"],
                            },
                          },
                        },
                        owner: {
                          type: "string",
                          example: "openprotein",
                        },
                        stats: {
                          title: "CalibrationStats",
                          description:
                            "Calibration stats of predictors from latest evaluation.",
                          type: "object",
                          properties: {
                            pearson: {
                              type: "number",
                              format: "float",
                              description:
                                "Pearson correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.123,
                            },
                            spearman: {
                              type: "number",
                              format: "float",
                              description:
                                "Spearman correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.248,
                            },
                            ece: {
                              type: "number",
                              format: "float",
                              description:
                                "Calibration score of the predictor's crossvalidation.",
                              example: 0.456,
                            },
                          },
                        },
                        calibration_curve: {
                          title: "CalibrationCurve",
                          description:
                            "Calibration curve of predictors from latest evaluation.",
                          type: "array",
                          items: {
                            type: "object",
                            required: ["x", "y"],
                            properties: {
                              x: {
                                type: "number",
                                format: "float",
                                description:
                                  "Predicted quantile for predictor's crossvalidation.",
                              },
                              y: {
                                type: "number",
                                format: "float",
                                description:
                                  "Observed quantile for predictor's crossvalidation.",
                              },
                            },
                          },
                          nullable: true,
                          example: [
                            {
                              x: 0.5,
                              y: 0.52,
                            },
                          ],
                        },
                        ensemble_model_ids: {
                          title: "Ensemble Model IDs",
                          description:
                            "Model IDs that constitute the ensemble model.",
                          type: "array",
                          items: {
                            type: "string",
                            format: "uuid",
                          },
                        },
                      },
                    },
                  ],
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
            description: "Model or assay not found.",
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
        p: "createEnsemble",
      },
    },
    "/api/v1/predictor": {
      get: {
        tags: ["predictor"],
        summary: "List predictors",
        description: "List available predictors.",
        operationId: "listPredictors",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Limit of number of predictors",
            required: false,
            schema: {
              type: "integer",
              default: 100,
            },
          },
          {
            name: "offset",
            in: "query",
            description: "Offset to list of predictors for query",
            required: false,
            schema: {
              type: "integer",
              default: 0,
            },
          },
          {
            name: "project_uuid",
            in: "query",
            description: "Project UUID to filter for",
            required: false,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
          {
            name: "assay_id",
            in: "query",
            description: "Assay ID to filter for",
            required: false,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
          {
            name: "stats",
            in: "query",
            description:
              "Whether to include calibration stats in the metadata, using the latest crossvalidation.",
            required: false,
            schema: {
              type: "boolean",
              default: false,
            },
          },
          {
            name: "calibration_curve",
            in: "query",
            description:
              "Whether to include calibration curve in the metadata, using the latest crossvalidation.",
            required: false,
            schema: {
              type: "boolean",
              default: false,
            },
          },
        ],
        responses: {
          "200": {
            description: "Available predictors.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    title: "Predictor",
                    description:
                      "Predictor metadata, with calibration stats if available.",
                    oneOf: [
                      {
                        title: "TrainPredictor",
                        description:
                          "Predictor used to run predictions of properties on sequences.",
                        type: "object",
                        required: [
                          "id",
                          "name",
                          "status",
                          "created_date",
                          "owner",
                          "model_spec",
                          "training_dataset",
                        ],
                        properties: {
                          id: {
                            type: "string",
                            format: "uuid",
                            description: "ID of predictor.",
                            "x-order": 0,
                          },
                          name: {
                            type: "string",
                            description: "Name of predictor.",
                            "x-order": 1,
                            example: "My GP Model",
                          },
                          description: {
                            type: "string",
                            description: "Description of predictor.",
                            "x-order": 2,
                            example: "GP model trained on fitness",
                          },
                          status: {
                            title: "JobStatus",
                            description: "Status of job.",
                            type: "string",
                            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                            "x-order": 7,
                          },
                          created_date: {
                            title: "Created Date",
                            description: "Datetime of created object",
                            type: "string",
                            format: "date-time",
                            example: "2024-01-01T12:34:56.789Z",
                            "x-order": 4,
                          },
                          model_spec: {
                            title: "ModelSpec",
                            description:
                              "Specification of the predictor's model.",
                            type: "object",
                            required: ["type"],
                            properties: {
                              type: {
                                title: "PredictorType",
                                description: "Type of model of the predictor.",
                                type: "string",
                                enum: ["GP", "ENSEMBLE"],
                              },
                              constraints: {
                                title: "Constraints",
                                description:
                                  "Constraints imposed on using the predictor.",
                                type: "object",
                                properties: {
                                  sequence_length: {
                                    description:
                                      "Possible constraint on fixed length sequence if no reduction was used to train.",
                                    type: "integer",
                                    example: 1024,
                                  },
                                },
                              },
                              features: {
                                type: "object",
                                required: ["type"],
                                properties: {
                                  type: {
                                    type: "string",
                                    description:
                                      "Type of featurization method. `SVD` refers to a fitted SVD.",
                                    enum: ["1-HOT", "PLM", "SVD"],
                                    example: "PLM",
                                  },
                                  model_id: {
                                    type: "string",
                                    description:
                                      "Model ID to use if using `PLM`/`SVD` type.",
                                    example: "prot-seq",
                                  },
                                  reduction: {
                                    title: "Reduction",
                                    description:
                                      "Type of reduction to use with embeddings.",
                                    type: "string",
                                    enum: ["MEAN", "SUM"],
                                  },
                                  prompt_id: {
                                    title: "PromptID",
                                    description: "ID of created prompt",
                                    type: "string",
                                    format: "uuid",
                                  },
                                },
                                title: "TrainFeatures",
                                description:
                                  "Feature properties for training the predictor.",
                              },
                              kernel: {
                                title: "Kernel",
                                description:
                                  "Kernel used for training a kernel-based predictor, e.g. GP.",
                                type: "object",
                                required: ["type", "multitask"],
                                properties: {
                                  type: {
                                    type: "string",
                                    description:
                                      "Type of kernel to use with GP.",
                                    enum: [
                                      "linear",
                                      "rbf",
                                      "matern21",
                                      "matern32",
                                    ],
                                    example: "rbf",
                                  },
                                  multitask: {
                                    type: "boolean",
                                    description:
                                      "Whether or not to train GP as multitask.",
                                    example: true,
                                    default: false,
                                  },
                                },
                              },
                            },
                          },
                          training_dataset: {
                            type: "object",
                            required: [
                              "assay_id",
                              "properties",
                              "assay_id",
                              "properties",
                            ],
                            properties: {
                              assay_id: {
                                title: "Assay ID",
                                description: "ID of assay",
                                type: "string",
                                format: "uuid",
                              },
                              properties: {
                                type: "array",
                                items: {
                                  type: "string",
                                },
                                example: ["fitness", "fitness"],
                              },
                            },
                            title: "TrainingDataset",
                          },
                          owner: {
                            type: "string",
                            example: "openprotein",
                          },
                          stats: {
                            title: "CalibrationStats",
                            description:
                              "Calibration stats of predictors from latest evaluation.",
                            type: "object",
                            properties: {
                              pearson: {
                                type: "number",
                                format: "float",
                                description:
                                  "Pearson correlation of the predictor's crossvalidation.",
                                nullable: true,
                                example: 0.123,
                              },
                              spearman: {
                                type: "number",
                                format: "float",
                                description:
                                  "Spearman correlation of the predictor's crossvalidation.",
                                nullable: true,
                                example: 0.248,
                              },
                              ece: {
                                type: "number",
                                format: "float",
                                description:
                                  "Calibration score of the predictor's crossvalidation.",
                                example: 0.456,
                              },
                            },
                          },
                          calibration_curve: {
                            title: "CalibrationCurve",
                            description:
                              "Calibration curve of predictors from latest evaluation.",
                            type: "array",
                            items: {
                              type: "object",
                              required: ["x", "y"],
                              properties: {
                                x: {
                                  type: "number",
                                  format: "float",
                                  description:
                                    "Predicted quantile for predictor's crossvalidation.",
                                },
                                y: {
                                  type: "number",
                                  format: "float",
                                  description:
                                    "Observed quantile for predictor's crossvalidation.",
                                },
                              },
                            },
                            nullable: true,
                            example: [
                              {
                                x: 0.5,
                                y: 0.52,
                              },
                            ],
                          },
                        },
                      },
                      {
                        title: "EnsemblePredictor",
                        description:
                          "Predictor used to run predictions of properties on sequences.",
                        type: "object",
                        required: [
                          "id",
                          "name",
                          "status",
                          "created_date",
                          "owner",
                          "model_spec",
                          "training_dataset",
                          "ensemble_model_ids",
                        ],
                        properties: {
                          id: {
                            type: "string",
                            format: "uuid",
                            description: "ID of predictor.",
                            "x-order": 0,
                          },
                          name: {
                            type: "string",
                            description: "Name of predictor.",
                            "x-order": 1,
                            example: "My Ensemble Model",
                          },
                          description: {
                            type: "string",
                            description: "Description of predictor.",
                            "x-order": 2,
                            example: "Ensemble model combining datasets.",
                          },
                          status: {
                            title: "JobStatus",
                            description: "Status of job.",
                            type: "string",
                            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                            "x-order": 7,
                          },
                          created_date: {
                            title: "Created Date",
                            description: "Datetime of created object",
                            type: "string",
                            format: "date-time",
                            example: "2024-01-01T12:34:56.789Z",
                            "x-order": 4,
                          },
                          model_spec: {
                            title: "ModelSpec",
                            description:
                              "Specification of the predictor's model.",
                            type: "object",
                            required: ["type"],
                            properties: {
                              type: {
                                title: "PredictorType",
                                description: "Type of model of the predictor.",
                                type: "string",
                                enum: ["GP", "ENSEMBLE"],
                              },
                              constraints: {
                                title: "Constraints",
                                description:
                                  "Constraints imposed on using the predictor.",
                                type: "object",
                                properties: {
                                  sequence_length: {
                                    description:
                                      "Possible constraint on fixed length sequence if no reduction was used to train.",
                                    type: "integer",
                                    example: 1024,
                                  },
                                },
                              },
                              features: {
                                type: "object",
                                required: ["type"],
                                properties: {
                                  type: {
                                    type: "string",
                                    description:
                                      "Type of featurization method. `SVD` refers to a fitted SVD.",
                                    enum: ["1-HOT", "PLM", "SVD"],
                                    example: "PLM",
                                  },
                                  model_id: {
                                    type: "string",
                                    description:
                                      "Model ID to use if using `PLM`/`SVD` type.",
                                    example: "prot-seq",
                                  },
                                  reduction: {
                                    title: "Reduction",
                                    description:
                                      "Type of reduction to use with embeddings.",
                                    type: "string",
                                    enum: ["MEAN", "SUM"],
                                  },
                                  prompt_id: {
                                    title: "PromptID",
                                    description: "ID of created prompt",
                                    type: "string",
                                    format: "uuid",
                                  },
                                },
                                title: "TrainFeatures",
                                description:
                                  "Feature properties for training the predictor.",
                              },
                              kernel: {
                                title: "Kernel",
                                description:
                                  "Kernel used for training a kernel-based predictor, e.g. GP.",
                                type: "object",
                                required: ["type", "multitask"],
                                properties: {
                                  type: {
                                    type: "string",
                                    description:
                                      "Type of kernel to use with GP.",
                                    enum: [
                                      "linear",
                                      "rbf",
                                      "matern21",
                                      "matern32",
                                    ],
                                    example: "rbf",
                                  },
                                  multitask: {
                                    type: "boolean",
                                    description:
                                      "Whether or not to train GP as multitask.",
                                    example: true,
                                    default: false,
                                  },
                                },
                              },
                            },
                          },
                          training_dataset: {
                            type: "object",
                            required: ["assay_id", "properties"],
                            properties: {
                              assay_id: {
                                title: "Assay ID",
                                description: "ID of assay",
                                type: "string",
                                format: "uuid",
                              },
                              properties: {
                                type: "array",
                                items: {
                                  type: "string",
                                },
                                example: ["fitness"],
                              },
                            },
                          },
                          owner: {
                            type: "string",
                            example: "openprotein",
                          },
                          stats: {
                            title: "CalibrationStats",
                            description:
                              "Calibration stats of predictors from latest evaluation.",
                            type: "object",
                            properties: {
                              pearson: {
                                type: "number",
                                format: "float",
                                description:
                                  "Pearson correlation of the predictor's crossvalidation.",
                                nullable: true,
                                example: 0.123,
                              },
                              spearman: {
                                type: "number",
                                format: "float",
                                description:
                                  "Spearman correlation of the predictor's crossvalidation.",
                                nullable: true,
                                example: 0.248,
                              },
                              ece: {
                                type: "number",
                                format: "float",
                                description:
                                  "Calibration score of the predictor's crossvalidation.",
                                example: 0.456,
                              },
                            },
                          },
                          calibration_curve: {
                            title: "CalibrationCurve",
                            description:
                              "Calibration curve of predictors from latest evaluation.",
                            type: "array",
                            items: {
                              type: "object",
                              required: ["x", "y"],
                              properties: {
                                x: {
                                  type: "number",
                                  format: "float",
                                  description:
                                    "Predicted quantile for predictor's crossvalidation.",
                                },
                                y: {
                                  type: "number",
                                  format: "float",
                                  description:
                                    "Observed quantile for predictor's crossvalidation.",
                                },
                              },
                            },
                            nullable: true,
                            example: [
                              {
                                x: 0.5,
                                y: 0.52,
                              },
                            ],
                          },
                          ensemble_model_ids: {
                            title: "Ensemble Model IDs",
                            description:
                              "Model IDs that constitute the ensemble model.",
                            type: "array",
                            items: {
                              type: "string",
                              format: "uuid",
                            },
                          },
                        },
                      },
                    ],
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "listPredictors",
      },
    },
    "/api/v1/predictor/{model_id}": {
      get: {
        tags: ["predictor"],
        summary: "Get predictor",
        description: "Get predictor with training curves if available.",
        parameters: [
          {
            name: "model_id",
            in: "path",
            description: "Predictor ID to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
          {
            name: "measurement_name",
            in: "query",
            description:
              "Whether or not to return train graph for only a single measurement name.",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            name: "stats",
            in: "query",
            description:
              "Whether to include calibration stats in the metadata, using the latest crossvalidation.",
            required: false,
            schema: {
              type: "boolean",
              default: false,
            },
          },
          {
            name: "calibration_curve",
            in: "query",
            description:
              "Whether to include calibration curve in the metadata, using the latest crossvalidation.",
            required: false,
            schema: {
              type: "boolean",
              default: false,
            },
          },
          {
            name: "all_graphs",
            in: "query",
            description:
              "Whether or not to return all train graphs instead of only the best.",
            required: false,
            schema: {
              type: "boolean",
              default: false,
            },
          },
        ],
        operationId: "getPredictor",
        responses: {
          "200": {
            description:
              "Predictor details including train graphs if available.",
            content: {
              "application/json": {
                schema: {
                  title: "TrainedPredictor",
                  oneOf: [
                    {
                      title: "TrainPredictorWithTrainGraph",
                      description:
                        "Predictor with details of train graph if available.",
                      type: "object",
                      required: [
                        "id",
                        "name",
                        "status",
                        "created_date",
                        "owner",
                        "model_spec",
                        "training_dataset",
                      ],
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                          description: "ID of predictor.",
                          "x-order": 0,
                        },
                        name: {
                          type: "string",
                          description: "Name of predictor.",
                          "x-order": 1,
                          example: "My GP Model",
                        },
                        description: {
                          type: "string",
                          description: "Description of predictor.",
                          "x-order": 2,
                          example: "GP model trained on fitness",
                        },
                        status: {
                          title: "JobStatus",
                          description: "Status of job.",
                          type: "string",
                          enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                          "x-order": 7,
                        },
                        created_date: {
                          title: "Created Date",
                          description: "Datetime of created object",
                          type: "string",
                          format: "date-time",
                          example: "2024-01-01T12:34:56.789Z",
                          "x-order": 4,
                        },
                        model_spec: {
                          title: "ModelSpec",
                          description:
                            "Specification of the predictor's model.",
                          type: "object",
                          required: ["type"],
                          properties: {
                            type: {
                              title: "PredictorType",
                              description: "Type of model of the predictor.",
                              type: "string",
                              enum: ["GP", "ENSEMBLE"],
                            },
                            constraints: {
                              title: "Constraints",
                              description:
                                "Constraints imposed on using the predictor.",
                              type: "object",
                              properties: {
                                sequence_length: {
                                  description:
                                    "Possible constraint on fixed length sequence if no reduction was used to train.",
                                  type: "integer",
                                  example: 1024,
                                },
                              },
                            },
                            features: {
                              type: "object",
                              required: ["type"],
                              properties: {
                                type: {
                                  type: "string",
                                  description:
                                    "Type of featurization method. `SVD` refers to a fitted SVD.",
                                  enum: ["1-HOT", "PLM", "SVD"],
                                  example: "PLM",
                                },
                                model_id: {
                                  type: "string",
                                  description:
                                    "Model ID to use if using `PLM`/`SVD` type.",
                                  example: "prot-seq",
                                },
                                reduction: {
                                  title: "Reduction",
                                  description:
                                    "Type of reduction to use with embeddings.",
                                  type: "string",
                                  enum: ["MEAN", "SUM"],
                                },
                                prompt_id: {
                                  title: "PromptID",
                                  description: "ID of created prompt",
                                  type: "string",
                                  format: "uuid",
                                },
                              },
                              title: "TrainFeatures",
                              description:
                                "Feature properties for training the predictor.",
                            },
                            kernel: {
                              title: "Kernel",
                              description:
                                "Kernel used for training a kernel-based predictor, e.g. GP.",
                              type: "object",
                              required: ["type", "multitask"],
                              properties: {
                                type: {
                                  type: "string",
                                  description: "Type of kernel to use with GP.",
                                  enum: [
                                    "linear",
                                    "rbf",
                                    "matern21",
                                    "matern32",
                                  ],
                                  example: "rbf",
                                },
                                multitask: {
                                  type: "boolean",
                                  description:
                                    "Whether or not to train GP as multitask.",
                                  example: true,
                                  default: false,
                                },
                              },
                            },
                          },
                        },
                        training_dataset: {
                          type: "object",
                          required: [
                            "assay_id",
                            "properties",
                            "assay_id",
                            "properties",
                          ],
                          properties: {
                            assay_id: {
                              title: "Assay ID",
                              description: "ID of assay",
                              type: "string",
                              format: "uuid",
                            },
                            properties: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              example: ["fitness", "fitness"],
                            },
                          },
                          title: "TrainingDataset",
                        },
                        owner: {
                          type: "string",
                          example: "openprotein",
                        },
                        stats: {
                          title: "CalibrationStats",
                          description:
                            "Calibration stats of predictors from latest evaluation.",
                          type: "object",
                          properties: {
                            pearson: {
                              type: "number",
                              format: "float",
                              description:
                                "Pearson correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.123,
                            },
                            spearman: {
                              type: "number",
                              format: "float",
                              description:
                                "Spearman correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.248,
                            },
                            ece: {
                              type: "number",
                              format: "float",
                              description:
                                "Calibration score of the predictor's crossvalidation.",
                              example: 0.456,
                            },
                          },
                        },
                        calibration_curve: {
                          title: "CalibrationCurve",
                          description:
                            "Calibration curve of predictors from latest evaluation.",
                          type: "array",
                          items: {
                            type: "object",
                            required: ["x", "y"],
                            properties: {
                              x: {
                                type: "number",
                                format: "float",
                                description:
                                  "Predicted quantile for predictor's crossvalidation.",
                              },
                              y: {
                                type: "number",
                                format: "float",
                                description:
                                  "Observed quantile for predictor's crossvalidation.",
                              },
                            },
                          },
                          nullable: true,
                          example: [
                            {
                              x: 0.5,
                              y: 0.52,
                            },
                          ],
                        },
                        traingraphs: {
                          type: "array",
                          description: "Train graphs in the train job.",
                          items: {
                            title: "TrainGraph",
                            description:
                              "Train graph representing the loss curves for a train job.",
                            type: "object",
                            required: ["losses"],
                            properties: {
                              measurement_name: {
                                type: "string",
                                description:
                                  "Measurement name that was trained for this curve. Empty or null if multitask.",
                                "x-order": 1,
                              },
                              hyperparam_search_step: {
                                type: "integer",
                                description:
                                  "Step count in the hyperparameter search grid.",
                                "x-order": 2,
                              },
                              losses: {
                                type: "array",
                                description:
                                  "Losses per step in the train graph.",
                                "x-order": 3,
                                items: {
                                  type: "number",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    {
                      title: "EnsemblePredictor",
                      description:
                        "Predictor used to run predictions of properties on sequences.",
                      type: "object",
                      required: [
                        "id",
                        "name",
                        "status",
                        "created_date",
                        "owner",
                        "model_spec",
                        "training_dataset",
                        "ensemble_model_ids",
                      ],
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                          description: "ID of predictor.",
                          "x-order": 0,
                        },
                        name: {
                          type: "string",
                          description: "Name of predictor.",
                          "x-order": 1,
                          example: "My Ensemble Model",
                        },
                        description: {
                          type: "string",
                          description: "Description of predictor.",
                          "x-order": 2,
                          example: "Ensemble model combining datasets.",
                        },
                        status: {
                          title: "JobStatus",
                          description: "Status of job.",
                          type: "string",
                          enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                          "x-order": 7,
                        },
                        created_date: {
                          title: "Created Date",
                          description: "Datetime of created object",
                          type: "string",
                          format: "date-time",
                          example: "2024-01-01T12:34:56.789Z",
                          "x-order": 4,
                        },
                        model_spec: {
                          title: "ModelSpec",
                          description:
                            "Specification of the predictor's model.",
                          type: "object",
                          required: ["type"],
                          properties: {
                            type: {
                              title: "PredictorType",
                              description: "Type of model of the predictor.",
                              type: "string",
                              enum: ["GP", "ENSEMBLE"],
                            },
                            constraints: {
                              title: "Constraints",
                              description:
                                "Constraints imposed on using the predictor.",
                              type: "object",
                              properties: {
                                sequence_length: {
                                  description:
                                    "Possible constraint on fixed length sequence if no reduction was used to train.",
                                  type: "integer",
                                  example: 1024,
                                },
                              },
                            },
                            features: {
                              type: "object",
                              required: ["type"],
                              properties: {
                                type: {
                                  type: "string",
                                  description:
                                    "Type of featurization method. `SVD` refers to a fitted SVD.",
                                  enum: ["1-HOT", "PLM", "SVD"],
                                  example: "PLM",
                                },
                                model_id: {
                                  type: "string",
                                  description:
                                    "Model ID to use if using `PLM`/`SVD` type.",
                                  example: "prot-seq",
                                },
                                reduction: {
                                  title: "Reduction",
                                  description:
                                    "Type of reduction to use with embeddings.",
                                  type: "string",
                                  enum: ["MEAN", "SUM"],
                                },
                                prompt_id: {
                                  title: "PromptID",
                                  description: "ID of created prompt",
                                  type: "string",
                                  format: "uuid",
                                },
                              },
                              title: "TrainFeatures",
                              description:
                                "Feature properties for training the predictor.",
                            },
                            kernel: {
                              title: "Kernel",
                              description:
                                "Kernel used for training a kernel-based predictor, e.g. GP.",
                              type: "object",
                              required: ["type", "multitask"],
                              properties: {
                                type: {
                                  type: "string",
                                  description: "Type of kernel to use with GP.",
                                  enum: [
                                    "linear",
                                    "rbf",
                                    "matern21",
                                    "matern32",
                                  ],
                                  example: "rbf",
                                },
                                multitask: {
                                  type: "boolean",
                                  description:
                                    "Whether or not to train GP as multitask.",
                                  example: true,
                                  default: false,
                                },
                              },
                            },
                          },
                        },
                        training_dataset: {
                          type: "object",
                          required: ["assay_id", "properties"],
                          properties: {
                            assay_id: {
                              title: "Assay ID",
                              description: "ID of assay",
                              type: "string",
                              format: "uuid",
                            },
                            properties: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              example: ["fitness"],
                            },
                          },
                        },
                        owner: {
                          type: "string",
                          example: "openprotein",
                        },
                        stats: {
                          title: "CalibrationStats",
                          description:
                            "Calibration stats of predictors from latest evaluation.",
                          type: "object",
                          properties: {
                            pearson: {
                              type: "number",
                              format: "float",
                              description:
                                "Pearson correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.123,
                            },
                            spearman: {
                              type: "number",
                              format: "float",
                              description:
                                "Spearman correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.248,
                            },
                            ece: {
                              type: "number",
                              format: "float",
                              description:
                                "Calibration score of the predictor's crossvalidation.",
                              example: 0.456,
                            },
                          },
                        },
                        calibration_curve: {
                          title: "CalibrationCurve",
                          description:
                            "Calibration curve of predictors from latest evaluation.",
                          type: "array",
                          items: {
                            type: "object",
                            required: ["x", "y"],
                            properties: {
                              x: {
                                type: "number",
                                format: "float",
                                description:
                                  "Predicted quantile for predictor's crossvalidation.",
                              },
                              y: {
                                type: "number",
                                format: "float",
                                description:
                                  "Observed quantile for predictor's crossvalidation.",
                              },
                            },
                          },
                          nullable: true,
                          example: [
                            {
                              x: 0.5,
                              y: 0.52,
                            },
                          ],
                        },
                        ensemble_model_ids: {
                          title: "Ensemble Model IDs",
                          description:
                            "Model IDs that constitute the ensemble model.",
                          type: "array",
                          items: {
                            type: "string",
                            format: "uuid",
                          },
                        },
                      },
                    },
                  ],
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "getPredictor",
      },
      put: {
        tags: ["predictor"],
        summary: "Update predictor",
        description: "Update predictor.",
        parameters: [
          {
            name: "model_id",
            in: "path",
            description: "Predictor ID to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "updatePredictor",
        requestBody: {
          description: "Request to update a predictor.",
          content: {
            "application/json": {
              schema: {
                title: "UpdatePredictorRequest",
                description: "Request to update a predictor.",
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of predictor to save.",
                  },
                  description: {
                    type: "string",
                    description: "Description of predictor.",
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "200": {
            description: "Predictor details.",
            content: {
              "application/json": {
                schema: {
                  title: "Predictor",
                  description:
                    "Predictor metadata, with calibration stats if available.",
                  oneOf: [
                    {
                      title: "TrainPredictor",
                      description:
                        "Predictor used to run predictions of properties on sequences.",
                      type: "object",
                      required: [
                        "id",
                        "name",
                        "status",
                        "created_date",
                        "owner",
                        "model_spec",
                        "training_dataset",
                      ],
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                          description: "ID of predictor.",
                          "x-order": 0,
                        },
                        name: {
                          type: "string",
                          description: "Name of predictor.",
                          "x-order": 1,
                          example: "My GP Model",
                        },
                        description: {
                          type: "string",
                          description: "Description of predictor.",
                          "x-order": 2,
                          example: "GP model trained on fitness",
                        },
                        status: {
                          title: "JobStatus",
                          description: "Status of job.",
                          type: "string",
                          enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                          "x-order": 7,
                        },
                        created_date: {
                          title: "Created Date",
                          description: "Datetime of created object",
                          type: "string",
                          format: "date-time",
                          example: "2024-01-01T12:34:56.789Z",
                          "x-order": 4,
                        },
                        model_spec: {
                          title: "ModelSpec",
                          description:
                            "Specification of the predictor's model.",
                          type: "object",
                          required: ["type"],
                          properties: {
                            type: {
                              title: "PredictorType",
                              description: "Type of model of the predictor.",
                              type: "string",
                              enum: ["GP", "ENSEMBLE"],
                            },
                            constraints: {
                              title: "Constraints",
                              description:
                                "Constraints imposed on using the predictor.",
                              type: "object",
                              properties: {
                                sequence_length: {
                                  description:
                                    "Possible constraint on fixed length sequence if no reduction was used to train.",
                                  type: "integer",
                                  example: 1024,
                                },
                              },
                            },
                            features: {
                              type: "object",
                              required: ["type"],
                              properties: {
                                type: {
                                  type: "string",
                                  description:
                                    "Type of featurization method. `SVD` refers to a fitted SVD.",
                                  enum: ["1-HOT", "PLM", "SVD"],
                                  example: "PLM",
                                },
                                model_id: {
                                  type: "string",
                                  description:
                                    "Model ID to use if using `PLM`/`SVD` type.",
                                  example: "prot-seq",
                                },
                                reduction: {
                                  title: "Reduction",
                                  description:
                                    "Type of reduction to use with embeddings.",
                                  type: "string",
                                  enum: ["MEAN", "SUM"],
                                },
                                prompt_id: {
                                  title: "PromptID",
                                  description: "ID of created prompt",
                                  type: "string",
                                  format: "uuid",
                                },
                              },
                              title: "TrainFeatures",
                              description:
                                "Feature properties for training the predictor.",
                            },
                            kernel: {
                              title: "Kernel",
                              description:
                                "Kernel used for training a kernel-based predictor, e.g. GP.",
                              type: "object",
                              required: ["type", "multitask"],
                              properties: {
                                type: {
                                  type: "string",
                                  description: "Type of kernel to use with GP.",
                                  enum: [
                                    "linear",
                                    "rbf",
                                    "matern21",
                                    "matern32",
                                  ],
                                  example: "rbf",
                                },
                                multitask: {
                                  type: "boolean",
                                  description:
                                    "Whether or not to train GP as multitask.",
                                  example: true,
                                  default: false,
                                },
                              },
                            },
                          },
                        },
                        training_dataset: {
                          type: "object",
                          required: [
                            "assay_id",
                            "properties",
                            "assay_id",
                            "properties",
                          ],
                          properties: {
                            assay_id: {
                              title: "Assay ID",
                              description: "ID of assay",
                              type: "string",
                              format: "uuid",
                            },
                            properties: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              example: ["fitness", "fitness"],
                            },
                          },
                          title: "TrainingDataset",
                        },
                        owner: {
                          type: "string",
                          example: "openprotein",
                        },
                        stats: {
                          title: "CalibrationStats",
                          description:
                            "Calibration stats of predictors from latest evaluation.",
                          type: "object",
                          properties: {
                            pearson: {
                              type: "number",
                              format: "float",
                              description:
                                "Pearson correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.123,
                            },
                            spearman: {
                              type: "number",
                              format: "float",
                              description:
                                "Spearman correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.248,
                            },
                            ece: {
                              type: "number",
                              format: "float",
                              description:
                                "Calibration score of the predictor's crossvalidation.",
                              example: 0.456,
                            },
                          },
                        },
                        calibration_curve: {
                          title: "CalibrationCurve",
                          description:
                            "Calibration curve of predictors from latest evaluation.",
                          type: "array",
                          items: {
                            type: "object",
                            required: ["x", "y"],
                            properties: {
                              x: {
                                type: "number",
                                format: "float",
                                description:
                                  "Predicted quantile for predictor's crossvalidation.",
                              },
                              y: {
                                type: "number",
                                format: "float",
                                description:
                                  "Observed quantile for predictor's crossvalidation.",
                              },
                            },
                          },
                          nullable: true,
                          example: [
                            {
                              x: 0.5,
                              y: 0.52,
                            },
                          ],
                        },
                      },
                    },
                    {
                      title: "EnsemblePredictor",
                      description:
                        "Predictor used to run predictions of properties on sequences.",
                      type: "object",
                      required: [
                        "id",
                        "name",
                        "status",
                        "created_date",
                        "owner",
                        "model_spec",
                        "training_dataset",
                        "ensemble_model_ids",
                      ],
                      properties: {
                        id: {
                          type: "string",
                          format: "uuid",
                          description: "ID of predictor.",
                          "x-order": 0,
                        },
                        name: {
                          type: "string",
                          description: "Name of predictor.",
                          "x-order": 1,
                          example: "My Ensemble Model",
                        },
                        description: {
                          type: "string",
                          description: "Description of predictor.",
                          "x-order": 2,
                          example: "Ensemble model combining datasets.",
                        },
                        status: {
                          title: "JobStatus",
                          description: "Status of job.",
                          type: "string",
                          enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                          "x-order": 7,
                        },
                        created_date: {
                          title: "Created Date",
                          description: "Datetime of created object",
                          type: "string",
                          format: "date-time",
                          example: "2024-01-01T12:34:56.789Z",
                          "x-order": 4,
                        },
                        model_spec: {
                          title: "ModelSpec",
                          description:
                            "Specification of the predictor's model.",
                          type: "object",
                          required: ["type"],
                          properties: {
                            type: {
                              title: "PredictorType",
                              description: "Type of model of the predictor.",
                              type: "string",
                              enum: ["GP", "ENSEMBLE"],
                            },
                            constraints: {
                              title: "Constraints",
                              description:
                                "Constraints imposed on using the predictor.",
                              type: "object",
                              properties: {
                                sequence_length: {
                                  description:
                                    "Possible constraint on fixed length sequence if no reduction was used to train.",
                                  type: "integer",
                                  example: 1024,
                                },
                              },
                            },
                            features: {
                              type: "object",
                              required: ["type"],
                              properties: {
                                type: {
                                  type: "string",
                                  description:
                                    "Type of featurization method. `SVD` refers to a fitted SVD.",
                                  enum: ["1-HOT", "PLM", "SVD"],
                                  example: "PLM",
                                },
                                model_id: {
                                  type: "string",
                                  description:
                                    "Model ID to use if using `PLM`/`SVD` type.",
                                  example: "prot-seq",
                                },
                                reduction: {
                                  title: "Reduction",
                                  description:
                                    "Type of reduction to use with embeddings.",
                                  type: "string",
                                  enum: ["MEAN", "SUM"],
                                },
                                prompt_id: {
                                  title: "PromptID",
                                  description: "ID of created prompt",
                                  type: "string",
                                  format: "uuid",
                                },
                              },
                              title: "TrainFeatures",
                              description:
                                "Feature properties for training the predictor.",
                            },
                            kernel: {
                              title: "Kernel",
                              description:
                                "Kernel used for training a kernel-based predictor, e.g. GP.",
                              type: "object",
                              required: ["type", "multitask"],
                              properties: {
                                type: {
                                  type: "string",
                                  description: "Type of kernel to use with GP.",
                                  enum: [
                                    "linear",
                                    "rbf",
                                    "matern21",
                                    "matern32",
                                  ],
                                  example: "rbf",
                                },
                                multitask: {
                                  type: "boolean",
                                  description:
                                    "Whether or not to train GP as multitask.",
                                  example: true,
                                  default: false,
                                },
                              },
                            },
                          },
                        },
                        training_dataset: {
                          type: "object",
                          required: ["assay_id", "properties"],
                          properties: {
                            assay_id: {
                              title: "Assay ID",
                              description: "ID of assay",
                              type: "string",
                              format: "uuid",
                            },
                            properties: {
                              type: "array",
                              items: {
                                type: "string",
                              },
                              example: ["fitness"],
                            },
                          },
                        },
                        owner: {
                          type: "string",
                          example: "openprotein",
                        },
                        stats: {
                          title: "CalibrationStats",
                          description:
                            "Calibration stats of predictors from latest evaluation.",
                          type: "object",
                          properties: {
                            pearson: {
                              type: "number",
                              format: "float",
                              description:
                                "Pearson correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.123,
                            },
                            spearman: {
                              type: "number",
                              format: "float",
                              description:
                                "Spearman correlation of the predictor's crossvalidation.",
                              nullable: true,
                              example: 0.248,
                            },
                            ece: {
                              type: "number",
                              format: "float",
                              description:
                                "Calibration score of the predictor's crossvalidation.",
                              example: 0.456,
                            },
                          },
                        },
                        calibration_curve: {
                          title: "CalibrationCurve",
                          description:
                            "Calibration curve of predictors from latest evaluation.",
                          type: "array",
                          items: {
                            type: "object",
                            required: ["x", "y"],
                            properties: {
                              x: {
                                type: "number",
                                format: "float",
                                description:
                                  "Predicted quantile for predictor's crossvalidation.",
                              },
                              y: {
                                type: "number",
                                format: "float",
                                description:
                                  "Observed quantile for predictor's crossvalidation.",
                              },
                            },
                          },
                          nullable: true,
                          example: [
                            {
                              x: 0.5,
                              y: 0.52,
                            },
                          ],
                        },
                        ensemble_model_ids: {
                          title: "Ensemble Model IDs",
                          description:
                            "Model IDs that constitute the ensemble model.",
                          type: "array",
                          items: {
                            type: "string",
                            format: "uuid",
                          },
                        },
                      },
                    },
                  ],
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "updatePredictor",
      },
      delete: {
        tags: ["predictor"],
        summary: "Delete predictor",
        description: "Delete predictor.",
        parameters: [
          {
            name: "model_id",
            in: "path",
            description: "Predictor ID to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "deletePredictor",
        responses: {
          "204": {
            description: "Predictor was deleted successfully.",
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "deletePredictor",
      },
    },
    "/api/v1/predictor/{model_id}/crossvalidate": {
      post: {
        tags: ["predictor"],
        summary: "Crossvalidate a trained predictor",
        description: "Run crossvalidation on a trained predictor.",
        operationId: "crossValidate",
        parameters: [
          {
            name: "model_id",
            in: "path",
            description: "ID of predictor to crossvalidate.",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
          {
            name: "n_splits",
            in: "query",
            description: "Number of splits for crossvalidate.",
            required: false,
            schema: {
              type: "integer",
              default: 5,
              example: 5,
            },
          },
        ],
        responses: {
          "202": {
            description: "Crossvalidation job created and pending.",
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
                      example: "/predictor/crossvalidate",
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
            description: "Model or assay not found.",
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
        p: "crossValidate",
      },
    },
    "/api/v1/predictor/crossvalidate": {
      get: {
        tags: ["predictor"],
        summary: "List crossvalidations",
        description: "List crossvalidations performed on trained predictors.",
        parameters: [
          {
            name: "model_id",
            in: "query",
            description: "Model/Predictor IDs to filter for",
            required: false,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "listCrossValidate",
        responses: {
          "200": {
            description: "List of crossvalidations performed.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    title: "CrossvalidateJob",
                    description: "Crossvalidate job.",
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
                      "job_type",
                      "model_id",
                      "n_splits",
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
                        example: "/predictor/crossvalidate",
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
                      model_id: {
                        type: "string",
                        format: "uuid",
                      },
                      n_splits: {
                        type: "integer",
                        example: 5,
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "listCrossValidate",
      },
    },
    "/api/v1/predictor/crossvalidate/{job_id}": {
      get: {
        tags: ["predictor"],
        summary: "Get crossvalidate results",
        description: "Get evaluation results for a completed crossvalidation.",
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
        operationId: "getCrossValidate",
        responses: {
          "200": {
            description:
              "Crossvalidate results with evaluations encoded in csv format.",
            content: {
              "application/octet-stream": {
                schema: {
                  type: "string",
                  format: "binary",
                  example:
                    "row_index,sequence,measurement_name,y_mu,y_var\n1,MGHKL,measurement_1,0.123,0.456\n",
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "getCrossValidate",
      },
    },
    "/api/v1/predictor/{model_id}/predict": {
      post: {
        tags: ["predictor"],
        summary: "Run prediction",
        description: "Run a prediction using a trained predictor.",
        parameters: [
          {
            name: "model_id",
            in: "path",
            description: "Model ID to run prediction on.",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "predict",
        requestBody: {
          description:
            "Request to run a prediction using a predictor.\n\nCreates a pending job to run predictions on input sequences.",
          content: {
            "application/json": {
              schema: {
                title: "PredictRequest",
                description:
                  "Request to run predictions using a trained predictor.",
                type: "object",
                required: ["sequences"],
                properties: {
                  sequences: {
                    title: "Sequences",
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
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Predict job created and pending.",
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
                      example: "/predictor/predict",
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
            description: "Model or assay not found.",
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
        p: "predict",
      },
    },
    "/api/v1/predictor/{model_id}/predict_single_site": {
      post: {
        tags: ["predictor"],
        summary: "Run single site prediction",
        description: "Run a single site prediction using a trained predictor.",
        parameters: [
          {
            name: "model_id",
            in: "path",
            description: "Model ID to run prediction on.",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "predictSingleSite",
        requestBody: {
          description:
            "Request to run a single site prediction using a predictor.\n\nCreates a pending job to run single site predictions on an input base sequence.",
          content: {
            "application/json": {
              schema: {
                title: "PredictSingleSiteRequest",
                description:
                  "Request to run single site predictions using a trained predictor.",
                type: "object",
                required: ["base_sequence"],
                properties: {
                  base_sequence: {
                    title: "Sequence",
                    description: "Protein sequence",
                    type: "string",
                    example: "MSKGEELFTGV",
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Predict job created and pending.",
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
                      example: "/predictor/predict_single_site",
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
            description: "Model or assay not found.",
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
        p: "predictSingleSite",
      },
    },
    "/api/v1/predictor/predict": {
      post: {
        tags: ["predictor"],
        summary: "Run multi-model prediction",
        description: "Run a prediction using multiple trained predictor.",
        operationId: "predictMulti",
        requestBody: {
          description:
            "Request to run predictions using multiple models.\n\nCreates a pending job to run multi-model predictions on input sequences.",
          content: {
            "application/json": {
              schema: {
                title: "PredictMultiRequest",
                description: "Request to run multi-model predictions.",
                type: "object",
                required: ["model_ids", "sequences"],
                properties: {
                  model_ids: {
                    title: "Model IDs",
                    type: "array",
                    items: {
                      type: "string",
                      format: "uuid",
                    },
                  },
                  sequences: {
                    title: "Sequences",
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
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Multi-model predict job created and pending.",
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
                      example: "/predictor/predict_multi",
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
            description: "Model or assay not found.",
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
        p: "predictMulti",
      },
    },
    "/api/v1/predictor/predict_single_site": {
      post: {
        tags: ["predictor"],
        summary: "Run multi-model single-site prediction",
        description:
          "Run a single-site prediction using multiple trained predictor on a reference base sequence.",
        operationId: "predictSingleSiteMulti",
        requestBody: {
          description:
            "Request to run predictions using multiple models.\n\nCreates a pending job to run multi-model predictions on input sequences.",
          content: {
            "application/json": {
              schema: {
                title: "PredictSingleSiteMultiRequest",
                description:
                  "Request to run multi-model single-site predictions.",
                type: "object",
                required: ["model_ids", "base_sequence"],
                properties: {
                  model_ids: {
                    title: "Model IDs",
                    type: "array",
                    items: {
                      type: "string",
                      format: "uuid",
                    },
                  },
                  base_sequence: {
                    title: "Sequence",
                    description: "Protein sequence",
                    type: "string",
                    example: "MSKGEELFTGV",
                  },
                },
              },
            },
          },
          required: true,
        },
        responses: {
          "202": {
            description: "Multi-model predict job created and pending.",
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
                      example: "/predictor/predict_multi",
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
            description: "Model or assay not found.",
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
        p: "predictSingleSiteMulti",
      },
    },
    "/api/v1/predictor/predict/{job_id}/{sequence}": {
      get: {
        tags: ["predictor"],
        summary: "Retrieve prediction results",
        description: "Get predictions for a submitted prediction job.",
        parameters: [
          {
            name: "job_id",
            in: "path",
            description: "Job ID of predictions to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
          {
            name: "sequence",
            in: "path",
            description:
              "Sequence for which to retrieve result. Use `/sequences` endpoint to find sequences used in request.",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        operationId: "getPredictResult",
        responses: {
          "200": {
            description:
              "Prediction result in csv format. Format is `sequence,prop1_mu,prop1_var,prop2_mu,prop2_var,...`",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  format: "binary",
                  example: "MGHKL,0.123,0.456",
                },
              },
            },
          },
          "400": {
            description:
              "Prediction result retrieval error. Contact support for assistance if persistent.",
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
            description: "Predict job not found.",
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
        p: "getPredictResult",
      },
    },
    "/api/v1/predictor/predict/{job_id}/sequences": {
      get: {
        tags: ["predictor"],
        summary: "Get sequences used in request",
        description: "Get sequences used in a previous predict request.\n",
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
        operationId: "getSequences",
        responses: {
          "200": {
            description: "Request sequences",
            content: {
              "application/json": {
                schema: {
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
            description: "Predict job not found.",
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
        p: "getSequences",
      },
    },
    "/api/v1/predictor/predict/{job_id}": {
      get: {
        tags: ["predictor"],
        summary: "Get predict job batch results",
        description: "Get predict job with all results.",
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
        operationId: "getPredictResultBatch",
        responses: {
          "200": {
            description:
              "Prediction result in csv format. Format is `sequence,prop1_mu,prop1_var,prop2_mu,prop2_var,...`",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  format: "binary",
                  example: "MGHKL,0.123,0.456",
                },
              },
            },
          },
          "400": {
            description:
              "Prediction results retrieval error. Contact support for assistance if persistent.",
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
            description: "Predict job not found.",
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
        p: "getPredictResultBatch",
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
      AssayID: {
        title: "Assay ID",
        description: "ID of assay",
        type: "string",
        format: "uuid",
      },
      TrainingDataset: {
        title: "TrainingDataset",
        type: "object",
        required: ["assay_id", "properties"],
        properties: {
          assay_id: {
            title: "Assay ID",
            description: "ID of assay",
            type: "string",
            format: "uuid",
          },
          properties: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["fitness"],
          },
        },
      },
      Reduction: {
        title: "Reduction",
        description: "Type of reduction to use with embeddings.",
        type: "string",
        enum: ["MEAN", "SUM"],
      },
      ModelArgs: {
        title: "ModelArgs",
        description: "Arguments that are used for protein language models.",
        type: "object",
        properties: {
          reduction: {
            title: "Reduction",
            description: "Type of reduction to use with embeddings.",
            type: "string",
            enum: ["MEAN", "SUM"],
          },
          prompt_id: {
            title: "PromptID",
            description: "ID of created prompt",
            type: "string",
            format: "uuid",
          },
        },
      },
      TrainFeatures: {
        type: "object",
        required: ["type"],
        properties: {
          type: {
            type: "string",
            description:
              "Type of featurization method. `SVD` refers to a fitted SVD.",
            enum: ["1-HOT", "PLM", "SVD"],
            example: "PLM",
          },
          model_id: {
            type: "string",
            description: "Model ID to use if using `PLM`/`SVD` type.",
            example: "prot-seq",
          },
          reduction: {
            title: "Reduction",
            description: "Type of reduction to use with embeddings.",
            type: "string",
            enum: ["MEAN", "SUM"],
          },
          prompt_id: {
            title: "PromptID",
            description: "ID of created prompt",
            type: "string",
            format: "uuid",
          },
        },
        title: "TrainFeatures",
        description: "Feature properties for training the predictor.",
      },
      Kernel: {
        title: "Kernel",
        description:
          "Kernel used for training a kernel-based predictor, e.g. GP.",
        type: "object",
        required: ["type", "multitask"],
        properties: {
          type: {
            type: "string",
            description: "Type of kernel to use with GP.",
            enum: ["linear", "rbf", "matern21", "matern32"],
            example: "rbf",
          },
          multitask: {
            type: "boolean",
            description: "Whether or not to train GP as multitask.",
            example: true,
            default: false,
          },
        },
      },
      TrainRequestGP: {
        title: "TrainRequestGP",
        description: "Request to train a predictor using GP.",
        type: "object",
        required: ["dataset", "features", "kernel"],
        properties: {
          name: {
            type: "string",
            description: "Name of predictor to save.",
          },
          description: {
            type: "string",
            description: "Description of predictor.",
          },
          dataset: {
            title: "TrainingDataset",
            type: "object",
            required: ["assay_id", "properties"],
            properties: {
              assay_id: {
                title: "Assay ID",
                description: "ID of assay",
                type: "string",
                format: "uuid",
              },
              properties: {
                type: "array",
                items: {
                  type: "string",
                },
                example: ["fitness"],
              },
            },
          },
          features: {
            type: "object",
            required: ["type"],
            properties: {
              type: {
                type: "string",
                description:
                  "Type of featurization method. `SVD` refers to a fitted SVD.",
                enum: ["1-HOT", "PLM", "SVD"],
                example: "PLM",
              },
              model_id: {
                type: "string",
                description: "Model ID to use if using `PLM`/`SVD` type.",
                example: "prot-seq",
              },
              reduction: {
                title: "Reduction",
                description: "Type of reduction to use with embeddings.",
                type: "string",
                enum: ["MEAN", "SUM"],
              },
              prompt_id: {
                title: "PromptID",
                description: "ID of created prompt",
                type: "string",
                format: "uuid",
              },
            },
            title: "TrainFeatures",
            description: "Feature properties for training the predictor.",
          },
          kernel: {
            title: "Kernel",
            description:
              "Kernel used for training a kernel-based predictor, e.g. GP.",
            type: "object",
            required: ["type", "multitask"],
            properties: {
              type: {
                type: "string",
                description: "Type of kernel to use with GP.",
                enum: ["linear", "rbf", "matern21", "matern32"],
                example: "rbf",
              },
              multitask: {
                type: "boolean",
                description: "Whether or not to train GP as multitask.",
                example: true,
                default: false,
              },
            },
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
      EnsembleRequest: {
        title: "EnsembleRequest",
        description: "Request to create ensemble predictor.",
        type: "object",
        required: ["model_ids"],
        properties: {
          name: {
            type: "string",
            description: "Name of ensemble predictor to save.",
            example: "My Ensemble Model",
          },
          description: {
            type: "string",
            description: "Description of ensemble predictor.",
            example: "Ensemble model combining datasets.",
          },
          model_ids: {
            title: "Model IDs to ensemble.",
            type: "array",
            items: {
              type: "string",
              format: "uuid",
            },
          },
        },
      },
      PredictorType: {
        title: "PredictorType",
        description: "Type of model of the predictor.",
        type: "string",
        enum: ["GP", "ENSEMBLE"],
      },
      Constraints: {
        title: "Constraints",
        description: "Constraints imposed on using the predictor.",
        type: "object",
        properties: {
          sequence_length: {
            description:
              "Possible constraint on fixed length sequence if no reduction was used to train.",
            type: "integer",
            example: 1024,
          },
        },
      },
      ModelSpec: {
        title: "ModelSpec",
        description: "Specification of the predictor's model.",
        type: "object",
        required: ["type"],
        properties: {
          type: {
            title: "PredictorType",
            description: "Type of model of the predictor.",
            type: "string",
            enum: ["GP", "ENSEMBLE"],
          },
          constraints: {
            title: "Constraints",
            description: "Constraints imposed on using the predictor.",
            type: "object",
            properties: {
              sequence_length: {
                description:
                  "Possible constraint on fixed length sequence if no reduction was used to train.",
                type: "integer",
                example: 1024,
              },
            },
          },
          features: {
            type: "object",
            required: ["type"],
            properties: {
              type: {
                type: "string",
                description:
                  "Type of featurization method. `SVD` refers to a fitted SVD.",
                enum: ["1-HOT", "PLM", "SVD"],
                example: "PLM",
              },
              model_id: {
                type: "string",
                description: "Model ID to use if using `PLM`/`SVD` type.",
                example: "prot-seq",
              },
              reduction: {
                title: "Reduction",
                description: "Type of reduction to use with embeddings.",
                type: "string",
                enum: ["MEAN", "SUM"],
              },
              prompt_id: {
                title: "PromptID",
                description: "ID of created prompt",
                type: "string",
                format: "uuid",
              },
            },
            title: "TrainFeatures",
            description: "Feature properties for training the predictor.",
          },
          kernel: {
            title: "Kernel",
            description:
              "Kernel used for training a kernel-based predictor, e.g. GP.",
            type: "object",
            required: ["type", "multitask"],
            properties: {
              type: {
                type: "string",
                description: "Type of kernel to use with GP.",
                enum: ["linear", "rbf", "matern21", "matern32"],
                example: "rbf",
              },
              multitask: {
                type: "boolean",
                description: "Whether or not to train GP as multitask.",
                example: true,
                default: false,
              },
            },
          },
        },
      },
      CalibrationStats: {
        title: "CalibrationStats",
        description: "Calibration stats of predictors from latest evaluation.",
        type: "object",
        properties: {
          pearson: {
            type: "number",
            format: "float",
            description:
              "Pearson correlation of the predictor's crossvalidation.",
            nullable: true,
            example: 0.123,
          },
          spearman: {
            type: "number",
            format: "float",
            description:
              "Spearman correlation of the predictor's crossvalidation.",
            nullable: true,
            example: 0.248,
          },
          ece: {
            type: "number",
            format: "float",
            description:
              "Calibration score of the predictor's crossvalidation.",
            example: 0.456,
          },
        },
      },
      CalibrationCurve: {
        title: "CalibrationCurve",
        description: "Calibration curve of predictors from latest evaluation.",
        type: "array",
        items: {
          type: "object",
          required: ["x", "y"],
          properties: {
            x: {
              type: "number",
              format: "float",
              description:
                "Predicted quantile for predictor's crossvalidation.",
            },
            y: {
              type: "number",
              format: "float",
              description: "Observed quantile for predictor's crossvalidation.",
            },
          },
        },
        nullable: true,
        example: [
          {
            x: 0.5,
            y: 0.52,
          },
        ],
      },
      BasePredictor: {
        title: "Predictor",
        description:
          "Predictor used to run predictions of properties on sequences.",
        type: "object",
        required: [
          "id",
          "name",
          "status",
          "created_date",
          "owner",
          "model_spec",
          "training_dataset",
        ],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "ID of predictor.",
            "x-order": 0,
          },
          name: {
            type: "string",
            description: "Name of predictor.",
            "x-order": 1,
          },
          description: {
            type: "string",
            description: "Description of predictor.",
            "x-order": 2,
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          model_spec: {
            title: "ModelSpec",
            description: "Specification of the predictor's model.",
            type: "object",
            required: ["type"],
            properties: {
              type: {
                title: "PredictorType",
                description: "Type of model of the predictor.",
                type: "string",
                enum: ["GP", "ENSEMBLE"],
              },
              constraints: {
                title: "Constraints",
                description: "Constraints imposed on using the predictor.",
                type: "object",
                properties: {
                  sequence_length: {
                    description:
                      "Possible constraint on fixed length sequence if no reduction was used to train.",
                    type: "integer",
                    example: 1024,
                  },
                },
              },
              features: {
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    type: "string",
                    description:
                      "Type of featurization method. `SVD` refers to a fitted SVD.",
                    enum: ["1-HOT", "PLM", "SVD"],
                    example: "PLM",
                  },
                  model_id: {
                    type: "string",
                    description: "Model ID to use if using `PLM`/`SVD` type.",
                    example: "prot-seq",
                  },
                  reduction: {
                    title: "Reduction",
                    description: "Type of reduction to use with embeddings.",
                    type: "string",
                    enum: ["MEAN", "SUM"],
                  },
                  prompt_id: {
                    title: "PromptID",
                    description: "ID of created prompt",
                    type: "string",
                    format: "uuid",
                  },
                },
                title: "TrainFeatures",
                description: "Feature properties for training the predictor.",
              },
              kernel: {
                title: "Kernel",
                description:
                  "Kernel used for training a kernel-based predictor, e.g. GP.",
                type: "object",
                required: ["type", "multitask"],
                properties: {
                  type: {
                    type: "string",
                    description: "Type of kernel to use with GP.",
                    enum: ["linear", "rbf", "matern21", "matern32"],
                    example: "rbf",
                  },
                  multitask: {
                    type: "boolean",
                    description: "Whether or not to train GP as multitask.",
                    example: true,
                    default: false,
                  },
                },
              },
            },
          },
          training_dataset: {
            type: "object",
            required: ["assay_id", "properties"],
            properties: {
              assay_id: {
                title: "Assay ID",
                description: "ID of assay",
                type: "string",
                format: "uuid",
              },
              properties: {
                type: "array",
                items: {
                  type: "string",
                },
                example: ["fitness"],
              },
            },
          },
          owner: {
            type: "string",
            example: "openprotein",
          },
          stats: {
            title: "CalibrationStats",
            description:
              "Calibration stats of predictors from latest evaluation.",
            type: "object",
            properties: {
              pearson: {
                type: "number",
                format: "float",
                description:
                  "Pearson correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.123,
              },
              spearman: {
                type: "number",
                format: "float",
                description:
                  "Spearman correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.248,
              },
              ece: {
                type: "number",
                format: "float",
                description:
                  "Calibration score of the predictor's crossvalidation.",
                example: 0.456,
              },
            },
          },
          calibration_curve: {
            title: "CalibrationCurve",
            description:
              "Calibration curve of predictors from latest evaluation.",
            type: "array",
            items: {
              type: "object",
              required: ["x", "y"],
              properties: {
                x: {
                  type: "number",
                  format: "float",
                  description:
                    "Predicted quantile for predictor's crossvalidation.",
                },
                y: {
                  type: "number",
                  format: "float",
                  description:
                    "Observed quantile for predictor's crossvalidation.",
                },
              },
            },
            nullable: true,
            example: [
              {
                x: 0.5,
                y: 0.52,
              },
            ],
          },
        },
      },
      TrainPredictor: {
        title: "TrainPredictor",
        description:
          "Predictor used to run predictions of properties on sequences.",
        type: "object",
        required: [
          "id",
          "name",
          "status",
          "created_date",
          "owner",
          "model_spec",
          "training_dataset",
        ],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "ID of predictor.",
            "x-order": 0,
          },
          name: {
            type: "string",
            description: "Name of predictor.",
            "x-order": 1,
            example: "My GP Model",
          },
          description: {
            type: "string",
            description: "Description of predictor.",
            "x-order": 2,
            example: "GP model trained on fitness",
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          model_spec: {
            title: "ModelSpec",
            description: "Specification of the predictor's model.",
            type: "object",
            required: ["type"],
            properties: {
              type: {
                title: "PredictorType",
                description: "Type of model of the predictor.",
                type: "string",
                enum: ["GP", "ENSEMBLE"],
              },
              constraints: {
                title: "Constraints",
                description: "Constraints imposed on using the predictor.",
                type: "object",
                properties: {
                  sequence_length: {
                    description:
                      "Possible constraint on fixed length sequence if no reduction was used to train.",
                    type: "integer",
                    example: 1024,
                  },
                },
              },
              features: {
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    type: "string",
                    description:
                      "Type of featurization method. `SVD` refers to a fitted SVD.",
                    enum: ["1-HOT", "PLM", "SVD"],
                    example: "PLM",
                  },
                  model_id: {
                    type: "string",
                    description: "Model ID to use if using `PLM`/`SVD` type.",
                    example: "prot-seq",
                  },
                  reduction: {
                    title: "Reduction",
                    description: "Type of reduction to use with embeddings.",
                    type: "string",
                    enum: ["MEAN", "SUM"],
                  },
                  prompt_id: {
                    title: "PromptID",
                    description: "ID of created prompt",
                    type: "string",
                    format: "uuid",
                  },
                },
                title: "TrainFeatures",
                description: "Feature properties for training the predictor.",
              },
              kernel: {
                title: "Kernel",
                description:
                  "Kernel used for training a kernel-based predictor, e.g. GP.",
                type: "object",
                required: ["type", "multitask"],
                properties: {
                  type: {
                    type: "string",
                    description: "Type of kernel to use with GP.",
                    enum: ["linear", "rbf", "matern21", "matern32"],
                    example: "rbf",
                  },
                  multitask: {
                    type: "boolean",
                    description: "Whether or not to train GP as multitask.",
                    example: true,
                    default: false,
                  },
                },
              },
            },
          },
          training_dataset: {
            type: "object",
            required: ["assay_id", "properties", "assay_id", "properties"],
            properties: {
              assay_id: {
                title: "Assay ID",
                description: "ID of assay",
                type: "string",
                format: "uuid",
              },
              properties: {
                type: "array",
                items: {
                  type: "string",
                },
                example: ["fitness", "fitness"],
              },
            },
            title: "TrainingDataset",
          },
          owner: {
            type: "string",
            example: "openprotein",
          },
          stats: {
            title: "CalibrationStats",
            description:
              "Calibration stats of predictors from latest evaluation.",
            type: "object",
            properties: {
              pearson: {
                type: "number",
                format: "float",
                description:
                  "Pearson correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.123,
              },
              spearman: {
                type: "number",
                format: "float",
                description:
                  "Spearman correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.248,
              },
              ece: {
                type: "number",
                format: "float",
                description:
                  "Calibration score of the predictor's crossvalidation.",
                example: 0.456,
              },
            },
          },
          calibration_curve: {
            title: "CalibrationCurve",
            description:
              "Calibration curve of predictors from latest evaluation.",
            type: "array",
            items: {
              type: "object",
              required: ["x", "y"],
              properties: {
                x: {
                  type: "number",
                  format: "float",
                  description:
                    "Predicted quantile for predictor's crossvalidation.",
                },
                y: {
                  type: "number",
                  format: "float",
                  description:
                    "Observed quantile for predictor's crossvalidation.",
                },
              },
            },
            nullable: true,
            example: [
              {
                x: 0.5,
                y: 0.52,
              },
            ],
          },
        },
      },
      EnsemblePredictor: {
        title: "EnsemblePredictor",
        description:
          "Predictor used to run predictions of properties on sequences.",
        type: "object",
        required: [
          "id",
          "name",
          "status",
          "created_date",
          "owner",
          "model_spec",
          "training_dataset",
          "ensemble_model_ids",
        ],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "ID of predictor.",
            "x-order": 0,
          },
          name: {
            type: "string",
            description: "Name of predictor.",
            "x-order": 1,
            example: "My Ensemble Model",
          },
          description: {
            type: "string",
            description: "Description of predictor.",
            "x-order": 2,
            example: "Ensemble model combining datasets.",
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          model_spec: {
            title: "ModelSpec",
            description: "Specification of the predictor's model.",
            type: "object",
            required: ["type"],
            properties: {
              type: {
                title: "PredictorType",
                description: "Type of model of the predictor.",
                type: "string",
                enum: ["GP", "ENSEMBLE"],
              },
              constraints: {
                title: "Constraints",
                description: "Constraints imposed on using the predictor.",
                type: "object",
                properties: {
                  sequence_length: {
                    description:
                      "Possible constraint on fixed length sequence if no reduction was used to train.",
                    type: "integer",
                    example: 1024,
                  },
                },
              },
              features: {
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    type: "string",
                    description:
                      "Type of featurization method. `SVD` refers to a fitted SVD.",
                    enum: ["1-HOT", "PLM", "SVD"],
                    example: "PLM",
                  },
                  model_id: {
                    type: "string",
                    description: "Model ID to use if using `PLM`/`SVD` type.",
                    example: "prot-seq",
                  },
                  reduction: {
                    title: "Reduction",
                    description: "Type of reduction to use with embeddings.",
                    type: "string",
                    enum: ["MEAN", "SUM"],
                  },
                  prompt_id: {
                    title: "PromptID",
                    description: "ID of created prompt",
                    type: "string",
                    format: "uuid",
                  },
                },
                title: "TrainFeatures",
                description: "Feature properties for training the predictor.",
              },
              kernel: {
                title: "Kernel",
                description:
                  "Kernel used for training a kernel-based predictor, e.g. GP.",
                type: "object",
                required: ["type", "multitask"],
                properties: {
                  type: {
                    type: "string",
                    description: "Type of kernel to use with GP.",
                    enum: ["linear", "rbf", "matern21", "matern32"],
                    example: "rbf",
                  },
                  multitask: {
                    type: "boolean",
                    description: "Whether or not to train GP as multitask.",
                    example: true,
                    default: false,
                  },
                },
              },
            },
          },
          training_dataset: {
            type: "object",
            required: ["assay_id", "properties"],
            properties: {
              assay_id: {
                title: "Assay ID",
                description: "ID of assay",
                type: "string",
                format: "uuid",
              },
              properties: {
                type: "array",
                items: {
                  type: "string",
                },
                example: ["fitness"],
              },
            },
          },
          owner: {
            type: "string",
            example: "openprotein",
          },
          stats: {
            title: "CalibrationStats",
            description:
              "Calibration stats of predictors from latest evaluation.",
            type: "object",
            properties: {
              pearson: {
                type: "number",
                format: "float",
                description:
                  "Pearson correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.123,
              },
              spearman: {
                type: "number",
                format: "float",
                description:
                  "Spearman correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.248,
              },
              ece: {
                type: "number",
                format: "float",
                description:
                  "Calibration score of the predictor's crossvalidation.",
                example: 0.456,
              },
            },
          },
          calibration_curve: {
            title: "CalibrationCurve",
            description:
              "Calibration curve of predictors from latest evaluation.",
            type: "array",
            items: {
              type: "object",
              required: ["x", "y"],
              properties: {
                x: {
                  type: "number",
                  format: "float",
                  description:
                    "Predicted quantile for predictor's crossvalidation.",
                },
                y: {
                  type: "number",
                  format: "float",
                  description:
                    "Observed quantile for predictor's crossvalidation.",
                },
              },
            },
            nullable: true,
            example: [
              {
                x: 0.5,
                y: 0.52,
              },
            ],
          },
          ensemble_model_ids: {
            title: "Ensemble Model IDs",
            description: "Model IDs that constitute the ensemble model.",
            type: "array",
            items: {
              type: "string",
              format: "uuid",
            },
          },
        },
      },
      Predictor: {
        title: "Predictor",
        description: "Predictor metadata, with calibration stats if available.",
        oneOf: [
          {
            title: "TrainPredictor",
            description:
              "Predictor used to run predictions of properties on sequences.",
            type: "object",
            required: [
              "id",
              "name",
              "status",
              "created_date",
              "owner",
              "model_spec",
              "training_dataset",
            ],
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "ID of predictor.",
                "x-order": 0,
              },
              name: {
                type: "string",
                description: "Name of predictor.",
                "x-order": 1,
                example: "My GP Model",
              },
              description: {
                type: "string",
                description: "Description of predictor.",
                "x-order": 2,
                example: "GP model trained on fitness",
              },
              status: {
                title: "JobStatus",
                description: "Status of job.",
                type: "string",
                enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                "x-order": 7,
              },
              created_date: {
                title: "Created Date",
                description: "Datetime of created object",
                type: "string",
                format: "date-time",
                example: "2024-01-01T12:34:56.789Z",
                "x-order": 4,
              },
              model_spec: {
                title: "ModelSpec",
                description: "Specification of the predictor's model.",
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    title: "PredictorType",
                    description: "Type of model of the predictor.",
                    type: "string",
                    enum: ["GP", "ENSEMBLE"],
                  },
                  constraints: {
                    title: "Constraints",
                    description: "Constraints imposed on using the predictor.",
                    type: "object",
                    properties: {
                      sequence_length: {
                        description:
                          "Possible constraint on fixed length sequence if no reduction was used to train.",
                        type: "integer",
                        example: 1024,
                      },
                    },
                  },
                  features: {
                    type: "object",
                    required: ["type"],
                    properties: {
                      type: {
                        type: "string",
                        description:
                          "Type of featurization method. `SVD` refers to a fitted SVD.",
                        enum: ["1-HOT", "PLM", "SVD"],
                        example: "PLM",
                      },
                      model_id: {
                        type: "string",
                        description:
                          "Model ID to use if using `PLM`/`SVD` type.",
                        example: "prot-seq",
                      },
                      reduction: {
                        title: "Reduction",
                        description:
                          "Type of reduction to use with embeddings.",
                        type: "string",
                        enum: ["MEAN", "SUM"],
                      },
                      prompt_id: {
                        title: "PromptID",
                        description: "ID of created prompt",
                        type: "string",
                        format: "uuid",
                      },
                    },
                    title: "TrainFeatures",
                    description:
                      "Feature properties for training the predictor.",
                  },
                  kernel: {
                    title: "Kernel",
                    description:
                      "Kernel used for training a kernel-based predictor, e.g. GP.",
                    type: "object",
                    required: ["type", "multitask"],
                    properties: {
                      type: {
                        type: "string",
                        description: "Type of kernel to use with GP.",
                        enum: ["linear", "rbf", "matern21", "matern32"],
                        example: "rbf",
                      },
                      multitask: {
                        type: "boolean",
                        description: "Whether or not to train GP as multitask.",
                        example: true,
                        default: false,
                      },
                    },
                  },
                },
              },
              training_dataset: {
                type: "object",
                required: ["assay_id", "properties", "assay_id", "properties"],
                properties: {
                  assay_id: {
                    title: "Assay ID",
                    description: "ID of assay",
                    type: "string",
                    format: "uuid",
                  },
                  properties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    example: ["fitness", "fitness"],
                  },
                },
                title: "TrainingDataset",
              },
              owner: {
                type: "string",
                example: "openprotein",
              },
              stats: {
                title: "CalibrationStats",
                description:
                  "Calibration stats of predictors from latest evaluation.",
                type: "object",
                properties: {
                  pearson: {
                    type: "number",
                    format: "float",
                    description:
                      "Pearson correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.123,
                  },
                  spearman: {
                    type: "number",
                    format: "float",
                    description:
                      "Spearman correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.248,
                  },
                  ece: {
                    type: "number",
                    format: "float",
                    description:
                      "Calibration score of the predictor's crossvalidation.",
                    example: 0.456,
                  },
                },
              },
              calibration_curve: {
                title: "CalibrationCurve",
                description:
                  "Calibration curve of predictors from latest evaluation.",
                type: "array",
                items: {
                  type: "object",
                  required: ["x", "y"],
                  properties: {
                    x: {
                      type: "number",
                      format: "float",
                      description:
                        "Predicted quantile for predictor's crossvalidation.",
                    },
                    y: {
                      type: "number",
                      format: "float",
                      description:
                        "Observed quantile for predictor's crossvalidation.",
                    },
                  },
                },
                nullable: true,
                example: [
                  {
                    x: 0.5,
                    y: 0.52,
                  },
                ],
              },
            },
          },
          {
            title: "EnsemblePredictor",
            description:
              "Predictor used to run predictions of properties on sequences.",
            type: "object",
            required: [
              "id",
              "name",
              "status",
              "created_date",
              "owner",
              "model_spec",
              "training_dataset",
              "ensemble_model_ids",
            ],
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "ID of predictor.",
                "x-order": 0,
              },
              name: {
                type: "string",
                description: "Name of predictor.",
                "x-order": 1,
                example: "My Ensemble Model",
              },
              description: {
                type: "string",
                description: "Description of predictor.",
                "x-order": 2,
                example: "Ensemble model combining datasets.",
              },
              status: {
                title: "JobStatus",
                description: "Status of job.",
                type: "string",
                enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                "x-order": 7,
              },
              created_date: {
                title: "Created Date",
                description: "Datetime of created object",
                type: "string",
                format: "date-time",
                example: "2024-01-01T12:34:56.789Z",
                "x-order": 4,
              },
              model_spec: {
                title: "ModelSpec",
                description: "Specification of the predictor's model.",
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    title: "PredictorType",
                    description: "Type of model of the predictor.",
                    type: "string",
                    enum: ["GP", "ENSEMBLE"],
                  },
                  constraints: {
                    title: "Constraints",
                    description: "Constraints imposed on using the predictor.",
                    type: "object",
                    properties: {
                      sequence_length: {
                        description:
                          "Possible constraint on fixed length sequence if no reduction was used to train.",
                        type: "integer",
                        example: 1024,
                      },
                    },
                  },
                  features: {
                    type: "object",
                    required: ["type"],
                    properties: {
                      type: {
                        type: "string",
                        description:
                          "Type of featurization method. `SVD` refers to a fitted SVD.",
                        enum: ["1-HOT", "PLM", "SVD"],
                        example: "PLM",
                      },
                      model_id: {
                        type: "string",
                        description:
                          "Model ID to use if using `PLM`/`SVD` type.",
                        example: "prot-seq",
                      },
                      reduction: {
                        title: "Reduction",
                        description:
                          "Type of reduction to use with embeddings.",
                        type: "string",
                        enum: ["MEAN", "SUM"],
                      },
                      prompt_id: {
                        title: "PromptID",
                        description: "ID of created prompt",
                        type: "string",
                        format: "uuid",
                      },
                    },
                    title: "TrainFeatures",
                    description:
                      "Feature properties for training the predictor.",
                  },
                  kernel: {
                    title: "Kernel",
                    description:
                      "Kernel used for training a kernel-based predictor, e.g. GP.",
                    type: "object",
                    required: ["type", "multitask"],
                    properties: {
                      type: {
                        type: "string",
                        description: "Type of kernel to use with GP.",
                        enum: ["linear", "rbf", "matern21", "matern32"],
                        example: "rbf",
                      },
                      multitask: {
                        type: "boolean",
                        description: "Whether or not to train GP as multitask.",
                        example: true,
                        default: false,
                      },
                    },
                  },
                },
              },
              training_dataset: {
                type: "object",
                required: ["assay_id", "properties"],
                properties: {
                  assay_id: {
                    title: "Assay ID",
                    description: "ID of assay",
                    type: "string",
                    format: "uuid",
                  },
                  properties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    example: ["fitness"],
                  },
                },
              },
              owner: {
                type: "string",
                example: "openprotein",
              },
              stats: {
                title: "CalibrationStats",
                description:
                  "Calibration stats of predictors from latest evaluation.",
                type: "object",
                properties: {
                  pearson: {
                    type: "number",
                    format: "float",
                    description:
                      "Pearson correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.123,
                  },
                  spearman: {
                    type: "number",
                    format: "float",
                    description:
                      "Spearman correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.248,
                  },
                  ece: {
                    type: "number",
                    format: "float",
                    description:
                      "Calibration score of the predictor's crossvalidation.",
                    example: 0.456,
                  },
                },
              },
              calibration_curve: {
                title: "CalibrationCurve",
                description:
                  "Calibration curve of predictors from latest evaluation.",
                type: "array",
                items: {
                  type: "object",
                  required: ["x", "y"],
                  properties: {
                    x: {
                      type: "number",
                      format: "float",
                      description:
                        "Predicted quantile for predictor's crossvalidation.",
                    },
                    y: {
                      type: "number",
                      format: "float",
                      description:
                        "Observed quantile for predictor's crossvalidation.",
                    },
                  },
                },
                nullable: true,
                example: [
                  {
                    x: 0.5,
                    y: 0.52,
                  },
                ],
              },
              ensemble_model_ids: {
                title: "Ensemble Model IDs",
                description: "Model IDs that constitute the ensemble model.",
                type: "array",
                items: {
                  type: "string",
                  format: "uuid",
                },
              },
            },
          },
        ],
      },
      TrainGraph: {
        title: "TrainGraph",
        description:
          "Train graph representing the loss curves for a train job.",
        type: "object",
        required: ["losses"],
        properties: {
          measurement_name: {
            type: "string",
            description:
              "Measurement name that was trained for this curve. Empty or null if multitask.",
            "x-order": 1,
          },
          hyperparam_search_step: {
            type: "integer",
            description: "Step count in the hyperparameter search grid.",
            "x-order": 2,
          },
          losses: {
            type: "array",
            description: "Losses per step in the train graph.",
            "x-order": 3,
            items: {
              type: "number",
            },
          },
        },
      },
      TrainPredictorWithTrainGraph: {
        title: "TrainPredictorWithTrainGraph",
        description: "Predictor with details of train graph if available.",
        type: "object",
        required: [
          "id",
          "name",
          "status",
          "created_date",
          "owner",
          "model_spec",
          "training_dataset",
        ],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "ID of predictor.",
            "x-order": 0,
          },
          name: {
            type: "string",
            description: "Name of predictor.",
            "x-order": 1,
            example: "My GP Model",
          },
          description: {
            type: "string",
            description: "Description of predictor.",
            "x-order": 2,
            example: "GP model trained on fitness",
          },
          status: {
            title: "JobStatus",
            description: "Status of job.",
            type: "string",
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
            "x-order": 7,
          },
          created_date: {
            title: "Created Date",
            description: "Datetime of created object",
            type: "string",
            format: "date-time",
            example: "2024-01-01T12:34:56.789Z",
            "x-order": 4,
          },
          model_spec: {
            title: "ModelSpec",
            description: "Specification of the predictor's model.",
            type: "object",
            required: ["type"],
            properties: {
              type: {
                title: "PredictorType",
                description: "Type of model of the predictor.",
                type: "string",
                enum: ["GP", "ENSEMBLE"],
              },
              constraints: {
                title: "Constraints",
                description: "Constraints imposed on using the predictor.",
                type: "object",
                properties: {
                  sequence_length: {
                    description:
                      "Possible constraint on fixed length sequence if no reduction was used to train.",
                    type: "integer",
                    example: 1024,
                  },
                },
              },
              features: {
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    type: "string",
                    description:
                      "Type of featurization method. `SVD` refers to a fitted SVD.",
                    enum: ["1-HOT", "PLM", "SVD"],
                    example: "PLM",
                  },
                  model_id: {
                    type: "string",
                    description: "Model ID to use if using `PLM`/`SVD` type.",
                    example: "prot-seq",
                  },
                  reduction: {
                    title: "Reduction",
                    description: "Type of reduction to use with embeddings.",
                    type: "string",
                    enum: ["MEAN", "SUM"],
                  },
                  prompt_id: {
                    title: "PromptID",
                    description: "ID of created prompt",
                    type: "string",
                    format: "uuid",
                  },
                },
                title: "TrainFeatures",
                description: "Feature properties for training the predictor.",
              },
              kernel: {
                title: "Kernel",
                description:
                  "Kernel used for training a kernel-based predictor, e.g. GP.",
                type: "object",
                required: ["type", "multitask"],
                properties: {
                  type: {
                    type: "string",
                    description: "Type of kernel to use with GP.",
                    enum: ["linear", "rbf", "matern21", "matern32"],
                    example: "rbf",
                  },
                  multitask: {
                    type: "boolean",
                    description: "Whether or not to train GP as multitask.",
                    example: true,
                    default: false,
                  },
                },
              },
            },
          },
          training_dataset: {
            type: "object",
            required: ["assay_id", "properties", "assay_id", "properties"],
            properties: {
              assay_id: {
                title: "Assay ID",
                description: "ID of assay",
                type: "string",
                format: "uuid",
              },
              properties: {
                type: "array",
                items: {
                  type: "string",
                },
                example: ["fitness", "fitness"],
              },
            },
            title: "TrainingDataset",
          },
          owner: {
            type: "string",
            example: "openprotein",
          },
          stats: {
            title: "CalibrationStats",
            description:
              "Calibration stats of predictors from latest evaluation.",
            type: "object",
            properties: {
              pearson: {
                type: "number",
                format: "float",
                description:
                  "Pearson correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.123,
              },
              spearman: {
                type: "number",
                format: "float",
                description:
                  "Spearman correlation of the predictor's crossvalidation.",
                nullable: true,
                example: 0.248,
              },
              ece: {
                type: "number",
                format: "float",
                description:
                  "Calibration score of the predictor's crossvalidation.",
                example: 0.456,
              },
            },
          },
          calibration_curve: {
            title: "CalibrationCurve",
            description:
              "Calibration curve of predictors from latest evaluation.",
            type: "array",
            items: {
              type: "object",
              required: ["x", "y"],
              properties: {
                x: {
                  type: "number",
                  format: "float",
                  description:
                    "Predicted quantile for predictor's crossvalidation.",
                },
                y: {
                  type: "number",
                  format: "float",
                  description:
                    "Observed quantile for predictor's crossvalidation.",
                },
              },
            },
            nullable: true,
            example: [
              {
                x: 0.5,
                y: 0.52,
              },
            ],
          },
          traingraphs: {
            type: "array",
            description: "Train graphs in the train job.",
            items: {
              title: "TrainGraph",
              description:
                "Train graph representing the loss curves for a train job.",
              type: "object",
              required: ["losses"],
              properties: {
                measurement_name: {
                  type: "string",
                  description:
                    "Measurement name that was trained for this curve. Empty or null if multitask.",
                  "x-order": 1,
                },
                hyperparam_search_step: {
                  type: "integer",
                  description: "Step count in the hyperparameter search grid.",
                  "x-order": 2,
                },
                losses: {
                  type: "array",
                  description: "Losses per step in the train graph.",
                  "x-order": 3,
                  items: {
                    type: "number",
                  },
                },
              },
            },
          },
        },
      },
      TrainedPredictor: {
        title: "TrainedPredictor",
        oneOf: [
          {
            title: "TrainPredictorWithTrainGraph",
            description: "Predictor with details of train graph if available.",
            type: "object",
            required: [
              "id",
              "name",
              "status",
              "created_date",
              "owner",
              "model_spec",
              "training_dataset",
            ],
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "ID of predictor.",
                "x-order": 0,
              },
              name: {
                type: "string",
                description: "Name of predictor.",
                "x-order": 1,
                example: "My GP Model",
              },
              description: {
                type: "string",
                description: "Description of predictor.",
                "x-order": 2,
                example: "GP model trained on fitness",
              },
              status: {
                title: "JobStatus",
                description: "Status of job.",
                type: "string",
                enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                "x-order": 7,
              },
              created_date: {
                title: "Created Date",
                description: "Datetime of created object",
                type: "string",
                format: "date-time",
                example: "2024-01-01T12:34:56.789Z",
                "x-order": 4,
              },
              model_spec: {
                title: "ModelSpec",
                description: "Specification of the predictor's model.",
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    title: "PredictorType",
                    description: "Type of model of the predictor.",
                    type: "string",
                    enum: ["GP", "ENSEMBLE"],
                  },
                  constraints: {
                    title: "Constraints",
                    description: "Constraints imposed on using the predictor.",
                    type: "object",
                    properties: {
                      sequence_length: {
                        description:
                          "Possible constraint on fixed length sequence if no reduction was used to train.",
                        type: "integer",
                        example: 1024,
                      },
                    },
                  },
                  features: {
                    type: "object",
                    required: ["type"],
                    properties: {
                      type: {
                        type: "string",
                        description:
                          "Type of featurization method. `SVD` refers to a fitted SVD.",
                        enum: ["1-HOT", "PLM", "SVD"],
                        example: "PLM",
                      },
                      model_id: {
                        type: "string",
                        description:
                          "Model ID to use if using `PLM`/`SVD` type.",
                        example: "prot-seq",
                      },
                      reduction: {
                        title: "Reduction",
                        description:
                          "Type of reduction to use with embeddings.",
                        type: "string",
                        enum: ["MEAN", "SUM"],
                      },
                      prompt_id: {
                        title: "PromptID",
                        description: "ID of created prompt",
                        type: "string",
                        format: "uuid",
                      },
                    },
                    title: "TrainFeatures",
                    description:
                      "Feature properties for training the predictor.",
                  },
                  kernel: {
                    title: "Kernel",
                    description:
                      "Kernel used for training a kernel-based predictor, e.g. GP.",
                    type: "object",
                    required: ["type", "multitask"],
                    properties: {
                      type: {
                        type: "string",
                        description: "Type of kernel to use with GP.",
                        enum: ["linear", "rbf", "matern21", "matern32"],
                        example: "rbf",
                      },
                      multitask: {
                        type: "boolean",
                        description: "Whether or not to train GP as multitask.",
                        example: true,
                        default: false,
                      },
                    },
                  },
                },
              },
              training_dataset: {
                type: "object",
                required: ["assay_id", "properties", "assay_id", "properties"],
                properties: {
                  assay_id: {
                    title: "Assay ID",
                    description: "ID of assay",
                    type: "string",
                    format: "uuid",
                  },
                  properties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    example: ["fitness", "fitness"],
                  },
                },
                title: "TrainingDataset",
              },
              owner: {
                type: "string",
                example: "openprotein",
              },
              stats: {
                title: "CalibrationStats",
                description:
                  "Calibration stats of predictors from latest evaluation.",
                type: "object",
                properties: {
                  pearson: {
                    type: "number",
                    format: "float",
                    description:
                      "Pearson correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.123,
                  },
                  spearman: {
                    type: "number",
                    format: "float",
                    description:
                      "Spearman correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.248,
                  },
                  ece: {
                    type: "number",
                    format: "float",
                    description:
                      "Calibration score of the predictor's crossvalidation.",
                    example: 0.456,
                  },
                },
              },
              calibration_curve: {
                title: "CalibrationCurve",
                description:
                  "Calibration curve of predictors from latest evaluation.",
                type: "array",
                items: {
                  type: "object",
                  required: ["x", "y"],
                  properties: {
                    x: {
                      type: "number",
                      format: "float",
                      description:
                        "Predicted quantile for predictor's crossvalidation.",
                    },
                    y: {
                      type: "number",
                      format: "float",
                      description:
                        "Observed quantile for predictor's crossvalidation.",
                    },
                  },
                },
                nullable: true,
                example: [
                  {
                    x: 0.5,
                    y: 0.52,
                  },
                ],
              },
              traingraphs: {
                type: "array",
                description: "Train graphs in the train job.",
                items: {
                  title: "TrainGraph",
                  description:
                    "Train graph representing the loss curves for a train job.",
                  type: "object",
                  required: ["losses"],
                  properties: {
                    measurement_name: {
                      type: "string",
                      description:
                        "Measurement name that was trained for this curve. Empty or null if multitask.",
                      "x-order": 1,
                    },
                    hyperparam_search_step: {
                      type: "integer",
                      description:
                        "Step count in the hyperparameter search grid.",
                      "x-order": 2,
                    },
                    losses: {
                      type: "array",
                      description: "Losses per step in the train graph.",
                      "x-order": 3,
                      items: {
                        type: "number",
                      },
                    },
                  },
                },
              },
            },
          },
          {
            title: "EnsemblePredictor",
            description:
              "Predictor used to run predictions of properties on sequences.",
            type: "object",
            required: [
              "id",
              "name",
              "status",
              "created_date",
              "owner",
              "model_spec",
              "training_dataset",
              "ensemble_model_ids",
            ],
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "ID of predictor.",
                "x-order": 0,
              },
              name: {
                type: "string",
                description: "Name of predictor.",
                "x-order": 1,
                example: "My Ensemble Model",
              },
              description: {
                type: "string",
                description: "Description of predictor.",
                "x-order": 2,
                example: "Ensemble model combining datasets.",
              },
              status: {
                title: "JobStatus",
                description: "Status of job.",
                type: "string",
                enum: ["PENDING", "RUNNING", "SUCCESS", "FAILURE"],
                "x-order": 7,
              },
              created_date: {
                title: "Created Date",
                description: "Datetime of created object",
                type: "string",
                format: "date-time",
                example: "2024-01-01T12:34:56.789Z",
                "x-order": 4,
              },
              model_spec: {
                title: "ModelSpec",
                description: "Specification of the predictor's model.",
                type: "object",
                required: ["type"],
                properties: {
                  type: {
                    title: "PredictorType",
                    description: "Type of model of the predictor.",
                    type: "string",
                    enum: ["GP", "ENSEMBLE"],
                  },
                  constraints: {
                    title: "Constraints",
                    description: "Constraints imposed on using the predictor.",
                    type: "object",
                    properties: {
                      sequence_length: {
                        description:
                          "Possible constraint on fixed length sequence if no reduction was used to train.",
                        type: "integer",
                        example: 1024,
                      },
                    },
                  },
                  features: {
                    type: "object",
                    required: ["type"],
                    properties: {
                      type: {
                        type: "string",
                        description:
                          "Type of featurization method. `SVD` refers to a fitted SVD.",
                        enum: ["1-HOT", "PLM", "SVD"],
                        example: "PLM",
                      },
                      model_id: {
                        type: "string",
                        description:
                          "Model ID to use if using `PLM`/`SVD` type.",
                        example: "prot-seq",
                      },
                      reduction: {
                        title: "Reduction",
                        description:
                          "Type of reduction to use with embeddings.",
                        type: "string",
                        enum: ["MEAN", "SUM"],
                      },
                      prompt_id: {
                        title: "PromptID",
                        description: "ID of created prompt",
                        type: "string",
                        format: "uuid",
                      },
                    },
                    title: "TrainFeatures",
                    description:
                      "Feature properties for training the predictor.",
                  },
                  kernel: {
                    title: "Kernel",
                    description:
                      "Kernel used for training a kernel-based predictor, e.g. GP.",
                    type: "object",
                    required: ["type", "multitask"],
                    properties: {
                      type: {
                        type: "string",
                        description: "Type of kernel to use with GP.",
                        enum: ["linear", "rbf", "matern21", "matern32"],
                        example: "rbf",
                      },
                      multitask: {
                        type: "boolean",
                        description: "Whether or not to train GP as multitask.",
                        example: true,
                        default: false,
                      },
                    },
                  },
                },
              },
              training_dataset: {
                type: "object",
                required: ["assay_id", "properties"],
                properties: {
                  assay_id: {
                    title: "Assay ID",
                    description: "ID of assay",
                    type: "string",
                    format: "uuid",
                  },
                  properties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    example: ["fitness"],
                  },
                },
              },
              owner: {
                type: "string",
                example: "openprotein",
              },
              stats: {
                title: "CalibrationStats",
                description:
                  "Calibration stats of predictors from latest evaluation.",
                type: "object",
                properties: {
                  pearson: {
                    type: "number",
                    format: "float",
                    description:
                      "Pearson correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.123,
                  },
                  spearman: {
                    type: "number",
                    format: "float",
                    description:
                      "Spearman correlation of the predictor's crossvalidation.",
                    nullable: true,
                    example: 0.248,
                  },
                  ece: {
                    type: "number",
                    format: "float",
                    description:
                      "Calibration score of the predictor's crossvalidation.",
                    example: 0.456,
                  },
                },
              },
              calibration_curve: {
                title: "CalibrationCurve",
                description:
                  "Calibration curve of predictors from latest evaluation.",
                type: "array",
                items: {
                  type: "object",
                  required: ["x", "y"],
                  properties: {
                    x: {
                      type: "number",
                      format: "float",
                      description:
                        "Predicted quantile for predictor's crossvalidation.",
                    },
                    y: {
                      type: "number",
                      format: "float",
                      description:
                        "Observed quantile for predictor's crossvalidation.",
                    },
                  },
                },
                nullable: true,
                example: [
                  {
                    x: 0.5,
                    y: 0.52,
                  },
                ],
              },
              ensemble_model_ids: {
                title: "Ensemble Model IDs",
                description: "Model IDs that constitute the ensemble model.",
                type: "array",
                items: {
                  type: "string",
                  format: "uuid",
                },
              },
            },
          },
        ],
      },
      UpdatePredictorRequest: {
        title: "UpdatePredictorRequest",
        description: "Request to update a predictor.",
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of predictor to save.",
          },
          description: {
            type: "string",
            description: "Description of predictor.",
          },
        },
      },
      CrossvalidateJob: {
        title: "CrossvalidateJob",
        description: "Crossvalidate job.",
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
          "job_type",
          "model_id",
          "n_splits",
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
            example: "/predictor/crossvalidate",
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
          model_id: {
            type: "string",
            format: "uuid",
          },
          n_splits: {
            type: "integer",
            example: 5,
          },
        },
      },
      Sequence: {
        title: "Sequence",
        description: "Protein sequence",
        type: "string",
        example: "MSKGEELFTGV",
      },
      PredictRequest: {
        title: "PredictRequest",
        description: "Request to run predictions using a trained predictor.",
        type: "object",
        required: ["sequences"],
        properties: {
          sequences: {
            title: "Sequences",
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
      PredictSingleSiteRequest: {
        title: "PredictSingleSiteRequest",
        description:
          "Request to run single site predictions using a trained predictor.",
        type: "object",
        required: ["base_sequence"],
        properties: {
          base_sequence: {
            title: "Sequence",
            description: "Protein sequence",
            type: "string",
            example: "MSKGEELFTGV",
          },
        },
      },
      PredictMultiRequest: {
        title: "PredictMultiRequest",
        description: "Request to run multi-model predictions.",
        type: "object",
        required: ["model_ids", "sequences"],
        properties: {
          model_ids: {
            title: "Model IDs",
            type: "array",
            items: {
              type: "string",
              format: "uuid",
            },
          },
          sequences: {
            title: "Sequences",
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
      PredictSingleSiteMultiRequest: {
        title: "PredictSingleSiteMultiRequest",
        description: "Request to run multi-model single-site predictions.",
        type: "object",
        required: ["model_ids", "base_sequence"],
        properties: {
          model_ids: {
            title: "Model IDs",
            type: "array",
            items: {
              type: "string",
              format: "uuid",
            },
          },
          base_sequence: {
            title: "Sequence",
            description: "Protein sequence",
            type: "string",
            example: "MSKGEELFTGV",
          },
        },
      },
    },
  },
  tags: [
    {
      name: "predictor",
      description:
        "Train and use predictor to predict properties for your sequences",
    },
  ],
};

export default predictorSpec;
