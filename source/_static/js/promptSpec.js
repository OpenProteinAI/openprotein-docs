const promptSpec = {
  openapi: "3.0.2",
  info: {
    title: "OpenProtein Prompt",
    description:
      "# Prompt API\nThe Prompt API provided by OpenProtein.ai allows you to construct and upload prompts to use with our PoET models.\n",
    version: "1.0.0",
  },
  servers: [
    {
      url: "https://dev.api.openprotein.ai",
      description: "Dev server",
    },
  ],
  paths: {
    "/api/v1/prompt/create_prompt": {
      post: {
        tags: ["prompt"],
        summary: "Create a prompt",
        description:
          "Create a prompt with provided context and query.\n\nThis endpoint accepts a list of files as context.\n",
        operationId: "createPrompt",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["context"],
                properties: {
                  name: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                    nullable: true,
                    default: null,
                  },
                  context: {
                    type: "array",
                    items: {
                      type: "string",
                      format: "binary",
                    },
                    description:
                      "A list of zip files, where the i'th file specifies the data\nfor the i'th context in the prompt. Each zip file may\ncontain:  \n  - fasta files containing lists of sequences\n  - cif structure files\nThe file extensions of the zipped files have to match.\n",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Prompt created successfully.",
            content: {
              "application/json": {
                schema: {
                  title: "PromptMetadata",
                  description:
                    "The metadata of a prompt entity containing sequences and/or structures as context and an optional query used to condition PoET models.",
                  type: "object",
                  required: [
                    "id",
                    "name",
                    "description",
                    "created_date",
                    "num_replicates",
                    "job_id",
                    "status",
                  ],
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      description: "Prompt unique identifier.",
                    },
                    name: {
                      type: "string",
                      description: "Name of the prompt",
                      example: "My Awesome Prompt",
                    },
                    description: {
                      type: "string",
                      description: "Description of the prompt",
                      example: "Prompt for use with top secret project.",
                      nullable: true,
                    },
                    created_date: {
                      type: "string",
                      format: "date-time",
                      description: "The date the prompt was created.",
                    },
                    num_replicates: {
                      type: "integer",
                      description: "Number of replicates provided as context.",
                    },
                    job_id: {
                      type: "string",
                      format: "uuid",
                      description:
                        "Job ID of any associated job for the prompt.",
                      nullable: true,
                    },
                    status: {
                      type: "string",
                      description: "Status of the prompt.",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input provided.",
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "createPrompt",
      },
    },
    "/api/v1/prompt/{prompt_id}": {
      get: {
        tags: ["prompt"],
        summary: "Get prompt metadata",
        description: "Get metadata of a prompt.",
        parameters: [
          {
            name: "prompt_id",
            in: "path",
            description: "Prompt ID to fetch metadata",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "getPromptMetadata",
        responses: {
          "200": {
            description: "The metadata of the prompt.",
            content: {
              "application/json": {
                schema: {
                  title: "PromptMetadata",
                  description:
                    "The metadata of a prompt entity containing sequences and/or structures as context and an optional query used to condition PoET models.",
                  type: "object",
                  required: [
                    "id",
                    "name",
                    "description",
                    "created_date",
                    "num_replicates",
                    "job_id",
                    "status",
                  ],
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      description: "Prompt unique identifier.",
                    },
                    name: {
                      type: "string",
                      description: "Name of the prompt",
                      example: "My Awesome Prompt",
                    },
                    description: {
                      type: "string",
                      description: "Description of the prompt",
                      example: "Prompt for use with top secret project.",
                      nullable: true,
                    },
                    created_date: {
                      type: "string",
                      format: "date-time",
                      description: "The date the prompt was created.",
                    },
                    num_replicates: {
                      type: "integer",
                      description: "Number of replicates provided as context.",
                    },
                    job_id: {
                      type: "string",
                      format: "uuid",
                      description:
                        "Job ID of any associated job for the prompt.",
                      nullable: true,
                    },
                    status: {
                      type: "string",
                      description: "Status of the prompt.",
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
            description: "Prompt not found.",
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
        p: "getPromptMetadata",
      },
    },
    "/api/v1/prompt/{prompt_id}/content": {
      get: {
        tags: ["prompt"],
        summary: "Get prompt content",
        description:
          "Get content of prompt by downloading the uploaded context files in a single zip.",
        parameters: [
          {
            name: "prompt_id",
            in: "path",
            description: "Prompt ID to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "getPrompt",
        responses: {
          "200": {
            description:
              "The prompt containing the context files in a zip file.",
            content: {
              "application/zip": {
                schema: {
                  type: "string",
                  format: "binary",
                  example: "<zip-file>",
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
            description: "Prompt not found.",
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
        p: "getPrompt",
      },
    },
    "/api/v1/prompt": {
      get: {
        tags: ["prompt"],
        summary: "List prompts",
        description: "List prompts available.\n",
        operationId: "listPrompts",
        responses: {
          "200": {
            description: "List of prompts",
            content: {
              "application/json": {
                schema: {
                  description: "List of prompts",
                  type: "array",
                  items: {
                    title: "PromptMetadata",
                    description:
                      "The metadata of a prompt entity containing sequences and/or structures as context and an optional query used to condition PoET models.",
                    type: "object",
                    required: [
                      "id",
                      "name",
                      "description",
                      "created_date",
                      "num_replicates",
                      "job_id",
                      "status",
                    ],
                    properties: {
                      id: {
                        type: "string",
                        format: "uuid",
                        description: "Prompt unique identifier.",
                      },
                      name: {
                        type: "string",
                        description: "Name of the prompt",
                        example: "My Awesome Prompt",
                      },
                      description: {
                        type: "string",
                        description: "Description of the prompt",
                        example: "Prompt for use with top secret project.",
                        nullable: true,
                      },
                      created_date: {
                        type: "string",
                        format: "date-time",
                        description: "The date the prompt was created.",
                      },
                      num_replicates: {
                        type: "integer",
                        description:
                          "Number of replicates provided as context.",
                      },
                      job_id: {
                        type: "string",
                        format: "uuid",
                        description:
                          "Job ID of any associated job for the prompt.",
                        nullable: true,
                      },
                      status: {
                        type: "string",
                        description: "Status of the prompt.",
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
        p: "listPrompts",
      },
    },
    "/api/v1/prompt/query": {
      post: {
        tags: ["prompt"],
        summary: "Create a query",
        description:
          "Create a query to be used to augment prompts for queries.\n\nThis endpoint accepts a single file as a query.\n",
        operationId: "createQuery",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["query"],
                properties: {
                  query: {
                    type: "string",
                    format: "binary",
                    description:
                      "A file specifying the query.\nThe file may be a specify a sequence (fasta) or a\nstructure (cif). The file extension have to match.\n",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Query created successfully.",
            content: {
              "application/json": {
                schema: {
                  title: "QueryMetadata",
                  description:
                    "The metadata of a query entity containing the sequence and/or structure used as a query to condition PoET2 models.",
                  type: "object",
                  required: ["id", "created_date"],
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      description: "Query unique identifier.",
                    },
                    created_date: {
                      type: "string",
                      format: "date-time",
                      description: "The date the query was created.",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid input provided.",
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
        },
        security: [
          {
            oauth2: [],
          },
        ],
        p: "createQuery",
      },
    },
    "/api/v1/prompt/query/{query_id}": {
      get: {
        tags: ["prompt"],
        summary: "Get query metadata",
        description: "Get metadata of a query.",
        parameters: [
          {
            name: "query_id",
            in: "path",
            description: "Query ID to fetch metadata",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "getQueryMetadata",
        responses: {
          "200": {
            description: "The metadata of the query.",
            content: {
              "application/json": {
                schema: {
                  title: "QueryMetadata",
                  description:
                    "The metadata of a query entity containing the sequence and/or structure used as a query to condition PoET2 models.",
                  type: "object",
                  required: ["id", "created_date"],
                  properties: {
                    id: {
                      type: "string",
                      format: "uuid",
                      description: "Query unique identifier.",
                    },
                    created_date: {
                      type: "string",
                      format: "date-time",
                      description: "The date the query was created.",
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
            description: "Query not found.",
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
        p: "getQueryMetadata",
      },
    },
    "/api/v1/prompt/query/{query_id}/content": {
      get: {
        tags: ["prompt"],
        summary: "Get query content",
        description:
          "Get content of query by downloading the uploaded query file.",
        parameters: [
          {
            name: "query_id",
            in: "path",
            description: "Query ID to fetch",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "getQuery",
        responses: {
          "200": {
            description:
              "The query file in either fasta or cif format depending on whether a sequence or structure was uploaded.",
            content: {
              "text/x-fasta": {
                schema: {
                  type: "string",
                  format: "binary",
                  example: "<fasta-file>",
                },
              },
              "chemical/x-mmcif": {
                schema: {
                  type: "string",
                  format: "binary",
                  example: "<cif-file>",
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
            description: "Query not found.",
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
        p: "getQuery",
      },
    },
    "/api/v1/prompt/edit_protein": {
      post: {
        tags: ["prompt"],
        summary: "Edit protein structure",
        description:
          "Edit a Protein object by specifying aligned reference and new sequences, and a structure mask.  \nHandles insertions, deletions, point mutations, and structure masking.\n",
        operationId: "editProteinStructure",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  protein: {
                    type: "string",
                    format: "binary",
                    description: "CIF file containing the protein structure.",
                  },
                  reference_sequence: {
                    type: "string",
                    description: 'Reference sequence (may include "-").',
                  },
                  new_sequence: {
                    type: "string",
                    description: 'New sequence (may include "-").',
                  },
                  structure_mask: {
                    type: "string",
                    description: 'String of "S" and "X" for structure masking.',
                  },
                },
                required: [
                  "protein",
                  "reference_sequence",
                  "new_sequence",
                  "structure_mask",
                ],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Edited protein CIF file",
            content: {
              "chemical/x-mmcif": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
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
            description: "Unauthorized",
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
        p: "editProteinStructure",
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
      PromptMetadata: {
        title: "PromptMetadata",
        description:
          "The metadata of a prompt entity containing sequences and/or structures as context and an optional query used to condition PoET models.",
        type: "object",
        required: [
          "id",
          "name",
          "description",
          "created_date",
          "num_replicates",
          "job_id",
          "status",
        ],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Prompt unique identifier.",
          },
          name: {
            type: "string",
            description: "Name of the prompt",
            example: "My Awesome Prompt",
          },
          description: {
            type: "string",
            description: "Description of the prompt",
            example: "Prompt for use with top secret project.",
            nullable: true,
          },
          created_date: {
            type: "string",
            format: "date-time",
            description: "The date the prompt was created.",
          },
          num_replicates: {
            type: "integer",
            description: "Number of replicates provided as context.",
          },
          job_id: {
            type: "string",
            format: "uuid",
            description: "Job ID of any associated job for the prompt.",
            nullable: true,
          },
          status: {
            type: "string",
            description: "Status of the prompt.",
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
      QueryMetadata: {
        title: "QueryMetadata",
        description:
          "The metadata of a query entity containing the sequence and/or structure used as a query to condition PoET2 models.",
        type: "object",
        required: ["id", "created_date"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Query unique identifier.",
          },
          created_date: {
            type: "string",
            format: "date-time",
            description: "The date the query was created.",
          },
        },
      },
    },
  },
  tags: [
    {
      name: "prompt",
      description: "Creating prompts for use with PoET models.",
    },
  ],
};

export default promptSpec;
