const promptSpec = {
  openapi: "3.0.2",
  info: {
    title: "OpenProtein Prompt",
    description:
      "# Prompt API\nThe Prompt API provided by OpenProtein.ai allows you to construct and upload prompts to use with our PoET models.\n",
    version: "1.0.0",
  },
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
                  project_uuid: {
                    type: "string",
                    format: "uuid",
                    description:
                      "Optional project UUID to attach the prompt to.",
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
                  $ref: "#/components/schemas/PromptMetadata",
                },
              },
            },
          },
          "400": {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/PromptMetadata",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Prompt not found.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
      put: {
        tags: ["prompt"],
        summary: "Update prompt metadata",
        description:
          "Update the name, description, or project attachment of a prompt.\n\nOnly the fields provided in the request body are changed; fields that\nare omitted retain their existing value. Nullable fields may be cleared\nby passing an explicit null value.",
        parameters: [
          {
            name: "prompt_id",
            in: "path",
            description: "Prompt ID to update",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "updatePrompt",
        requestBody: {
          description: "Fields to update on the prompt.",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PromptUpdate",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "The updated prompt metadata.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PromptMetadata",
                },
              },
            },
          },
          "400": {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Prompt not found.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Prompt not found.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
    "/api/v1/prompt": {
      get: {
        tags: ["prompt"],
        summary: "List prompts",
        description: "List prompts available.\n",
        operationId: "listPrompts",
        parameters: [
          {
            name: "project_uuid",
            in: "query",
            description: "Optional project UUID to filter prompts by.",
            required: false,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          "200": {
            description: "List of prompts",
            content: {
              "application/json": {
                schema: {
                  description: "List of prompts",
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/PromptMetadata",
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
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/QueryMetadata",
                },
              },
            },
          },
          "400": {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/QueryMetadata",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Query not found.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Query not found.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
    "/api/v1/prompt/extract_chain": {
      post: {
        tags: ["prompt"],
        summary: "Extract chain",
        description: "Extract chain from protein complex.\n",
        operationId: "extractChain",
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
                    description: "CIF file containing the protein complex.",
                  },
                  chain_id: {
                    type: "string",
                    description: "Chain ID to extract from protein file.",
                  },
                  use_bfactor_as_plddt: {
                    type: "boolean",
                    description: "Use bfactor as pLDDT.",
                  },
                },
                required: ["protein", "chain_id", "use_bfactor_as_plddt"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Extracted protein as CIF file.",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
    "/api/v1/prompt/normalize_structure": {
      post: {
        tags: ["prompt"],
        summary: "Normalize a protein structure file",
        description:
          "Normalize a protein structure by converting it into standardized CIF format.\nSupports input in both PDB and CIF formats.",
        operationId: "normalizeStructure",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["protein"],
                properties: {
                  protein: {
                    type: "string",
                    format: "binary",
                    description: "Protein structure file in PDB or CIF format.",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Normalized protein CIF file.",
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
    "/api/v1/prompt/sequence_align_batch": {
      post: {
        tags: ["prompt"],
        summary:
          "Batch sequence alignment and identity computation (Streaming)",
        description:
          "Align the query sequence against each target sequence using pairwise alignment\nand compute sequence identity.\n\n**Streaming Endpoint:** Returns a stream of JSON objects (NDJSON), where each line\ncorresponds to one target sequence in the order provided.",
        operationId: "sequenceAlignBatch",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["query_sequence", "target_sequences"],
                properties: {
                  query_sequence: {
                    type: "string",
                    description:
                      "Query protein sequence (single-letter amino acid codes).",
                  },
                  target_sequences: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description: "List of target protein sequences.",
                  },
                  return_alignment: {
                    type: "boolean",
                    description:
                      "Whether to return aligned query and target sequences as tuples.",
                    default: false,
                  },
                },
              },
              example: {
                query_sequence: "MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQ",
                target_sequences: [
                  "MKTAYIAKQRQISFVKSHFSRQLDERLGLIEVQ",
                  "ARNMKTAYIAKQRQISYVKSHFSRQLDERLGLIEVQ",
                ],
                return_alignment: true,
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Stream of sequence identities (and optionally alignments).\nEach line is a JSON object representing the result for a single target.",
            content: {
              "application/x-ndjson": {
                schema: {
                  type: "object",
                  properties: {
                    identity: {
                      type: "number",
                      format: "float",
                      description:
                        "Sequence identity for this target, normalized to alignment length (0-1).",
                    },
                    alignment: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                      description:
                        "Tuple of (aligned_query_sequence, aligned_target_sequence).\nPresent if `return_alignment=true`.",
                    },
                  },
                  example: {
                    identity: 0.97,
                    alignment: [
                      "MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQ",
                      "MKTAYIAKQRQISFVKSHFSRQLDERLGLIEVQ",
                    ],
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
    "/api/v1/prompt/structure_align_batch_by_id": {
      post: {
        tags: ["prompt"],
        summary: "Batch structure alignment using specified method (Streaming)",
        description:
          "Perform structure-based alignment between the uploaded query structure and targets.\n\n**Streaming Endpoint:** Returns a stream of JSON objects (NDJSON), where each line\ncorresponds to one target structure.",
        operationId: "structureAlignBatchById",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: [
                  "protein",
                  "chain_id",
                  "targets_id",
                  "method",
                  "return_transform",
                  "return_alignment",
                  "return_identities",
                  "return_plddt",
                ],
                properties: {
                  protein: {
                    type: "string",
                    format: "binary",
                    description: "CIF file containing the query structure.",
                  },
                  chain_id: {
                    type: "string",
                    description: "Chain ID for the query structure.",
                  },
                  targets_id: {
                    type: "string",
                    format: "uuid",
                    description:
                      "Target ID referencing a **collection** of structures to align against.",
                  },
                  method: {
                    type: "string",
                    description:
                      'The alignment method to use. Supported values are "kabsch", "nwalign", and "tmalign".',
                    default: "tmalign",
                  },
                  return_transform: {
                    type: "boolean",
                    description:
                      "Whether to return 3x3 rotation matrices and 3x1 translation vectors.",
                    default: false,
                  },
                  return_alignment: {
                    type: "boolean",
                    description:
                      "Whether to return aligned query and target sequences as tuples.",
                    default: false,
                  },
                  return_identities: {
                    type: "boolean",
                    description:
                      "Whether to return sequence identities normalized to alignment length (0-1).",
                    default: false,
                  },
                  return_plddt: {
                    type: "boolean",
                    description: "Whether to return mean pLDDT per target.",
                    default: false,
                  },
                },
              },
              example: {
                protein: "<binary CIF file>",
                chain_id: "A",
                targets_id: "1dfcb748-0f66-4cd0-9fbf-6c5b0da32512",
                method: "tmalign",
                return_transform: true,
                return_alignment: false,
                return_identities: true,
                return_plddt: true,
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Stream of structure alignment results.\nEach line is a JSON object representing the result for a single target.",
            content: {
              "application/x-ndjson": {
                schema: {
                  type: "object",
                  properties: {
                    tmscore: {
                      type: "number",
                      format: "float",
                      description: "TM-score for this target structure.",
                    },
                    rmsd: {
                      type: "number",
                      format: "float",
                      description: "RMSD for this target structure.",
                    },
                    identity: {
                      type: "number",
                      format: "float",
                      description:
                        "Sequence identity for this target, normalized to alignment length (0-1).\nPresent if `return_identities=true`.",
                    },
                    R: {
                      type: "array",
                      items: {
                        type: "array",
                        items: {
                          type: "number",
                          format: "float",
                        },
                      },
                      description:
                        "3x3 rotation matrix for this target (present if `return_transform=true`).",
                    },
                    t: {
                      type: "array",
                      items: {
                        type: "number",
                        format: "float",
                      },
                      description:
                        "3x1 translation vector for this target (present if `return_transform=true`).",
                    },
                    alignment: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                      description:
                        "Tuple of (aligned_query_sequence, aligned_target_sequence).\nPresent if `return_alignment=true`.",
                    },
                    plddt: {
                      type: "number",
                      format: "float",
                      description:
                        "Mean pLDDT for this target (present if `return_plddt=true`).",
                    },
                  },
                  example: {
                    tmscore: 0.89,
                    rmsd: 1.82,
                    identity: 0.95,
                    R: [
                      [0.998, -0.015, 0.062],
                      [0.017, 0.999, -0.041],
                      [-0.061, 0.042, 0.997],
                    ],
                    t: [1.23, -0.45, 0.12],
                    plddt: 87.3,
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
    "/api/v1/prompt/plddt_batch_by_id": {
      get: {
        tags: ["prompt"],
        summary: "Get mean pLDDT for all structures in targets_id (Streaming)",
        description:
          "Retrieve the mean pLDDT scores for all structures contained within the collection\nidentified by `targets_id`.\n\n**Streaming Endpoint:** Returns a stream of JSON objects (NDJSON).",
        operationId: "getPlddtBatchById",
        parameters: [
          {
            name: "targets_id",
            in: "query",
            description:
              "Target ID referencing a **collection** of structures.",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          "200": {
            description: "Stream of pLDDT scores.",
            content: {
              "application/x-ndjson": {
                schema: {
                  type: "object",
                  properties: {
                    plddt: {
                      type: "number",
                      format: "float",
                      description: "Mean pLDDT for a single target structure.",
                    },
                  },
                  example: {
                    plddt: 87.3,
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
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Targets ID not found.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
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
            tokenUrl: "/api/v1/auth/login",
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
          "project_uuid",
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
          project_uuid: {
            type: "string",
            format: "uuid",
            description: "Project this prompt is attached to.",
            nullable: true,
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
      PromptUpdate: {
        title: "PromptUpdate",
        description:
          "Fields to update on a prompt. Omitted fields are left unchanged; fields\nprovided with an explicit null value (for nullable fields) are cleared.",
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the prompt.",
            example: "My Awesome Prompt",
          },
          description: {
            type: "string",
            description: "Description of the prompt.",
            example: "Prompt for use with top secret project.",
            nullable: true,
          },
          project_uuid: {
            type: "string",
            format: "uuid",
            description: "Project to attach the prompt to.",
            nullable: true,
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
