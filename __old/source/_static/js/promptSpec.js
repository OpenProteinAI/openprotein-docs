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
        tags: ["Prompt"],
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
          200: {
            description: "Prompt created successfully.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PromptMetadata",
                },
              },
            },
          },
          400: {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
    "/api/v1/prompt": {
      get: {
        tags: ["Prompt"],
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
          {
            name: "scope",
            in: "query",
            description:
              "Restrict the listing to the caller's own prompts (`mine`, the\ndefault), platform system prompts (`system`), or both (`all`).",
            required: false,
            schema: {
              type: "string",
              enum: ["mine", "system", "all"],
              default: "mine",
            },
          },
          {
            name: "search",
            in: "query",
            description:
              "Case-insensitive substring matched against prompt name and description.",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            name: "page_size",
            in: "query",
            description: "Maximum number of prompts to return.",
            required: false,
            schema: {
              type: "integer",
              default: 1024,
            },
          },
          {
            name: "page_offset",
            in: "query",
            description: "Number of prompts to skip before returning results.",
            required: false,
            schema: {
              type: "integer",
              default: 0,
            },
          },
        ],
        responses: {
          200: {
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
          401: {
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
      get: {
        tags: ["Query"],
        summary: "List queries",
        description: "List queries available.\n",
        operationId: "listQueries",
        parameters: [
          {
            name: "project_uuid",
            in: "query",
            description: "Optional project UUID to filter queries by.",
            required: false,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "List of queries",
            content: {
              "application/json": {
                schema: {
                  description: "List of queries",
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/QueryMetadata",
                  },
                },
              },
            },
          },
          401: {
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
      post: {
        tags: ["Query"],
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
                  project_uuid: {
                    type: "string",
                    format: "uuid",
                    description:
                      "Optional project UUID to attach the query to.",
                  },
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
          200: {
            description: "Query created successfully.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/QueryMetadata",
                },
              },
            },
          },
          400: {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
        tags: ["Query"],
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
          200: {
            description: "The metadata of the query.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/QueryMetadata",
                },
              },
            },
          },
          401: {
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
          404: {
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
      put: {
        tags: ["Query"],
        summary: "Update query metadata",
        description:
          "Update the project attachment of a query.\n\nOnly the fields provided in the request body are changed; fields that\nare omitted retain their existing value. Nullable fields may be cleared\nby passing an explicit null value.",
        parameters: [
          {
            name: "query_id",
            in: "path",
            description: "Query ID to update",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        operationId: "updateQuery",
        requestBody: {
          description: "Fields to update on the query.",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/QueryUpdate",
              },
            },
          },
        },
        responses: {
          200: {
            description: "The updated query metadata.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/QueryMetadata",
                },
              },
            },
          },
          400: {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
          404: {
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
        tags: ["Query"],
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
          200: {
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
          401: {
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
          404: {
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
    "/api/v1/prompt/{prompt_id}": {
      get: {
        tags: ["Prompt"],
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
          200: {
            description: "The metadata of the prompt.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PromptMetadata",
                },
              },
            },
          },
          401: {
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
          404: {
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
        tags: ["Prompt"],
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
          200: {
            description: "The updated prompt metadata.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PromptMetadata",
                },
              },
            },
          },
          400: {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
          403: {
            description:
              "The target prompt is a platform system prompt and cannot be modified.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          404: {
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
        tags: ["Prompt"],
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
          200: {
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
          401: {
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
          404: {
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
    "/api/v1/prompt/edit_protein": {
      post: {
        tags: ["Structure"],
        summary: "Edit protein structure",
        description:
          'Edit a Protein object by specifying aligned reference and new sequences, and a structure mask.\nHandles insertions, deletions, point mutations, and structure masking.\n\n**Advanced Multi-File Support:**\nInstead of passing a single `protein` file, you may supply multiple files into the `structures` array\nand provide a `config` JSON string to control how they are edited and grouped. By using `config`,\nyou can:\n- Construct 3D rigid bodies (groups) from multiple disparate chains.\n- Introduce sequence-only chains.\n- Rename chain IDs dynamically to avoid collisions natively.\n- Apply unique sequences, structure masks, binding tracks, and pLDDT overrides to any chains within the group structure.\n\nExample `config` JSON payload:\n```json\n{\n  "groups": [\n    {\n      "structures": [\n        {\n          "file_index": 0,\n          "chain_ids": {"A": "X", "B": "Y"},\n          "edits": {\n            "X": {\n              "reference_sequence": "ACDEFG",\n              "new_sequence": "ACHEFG",\n              "structure_mask": "SSXSSS",\n              "binding": "UUBUUU",\n              "plddt": 72.5\n            }\n          }\n        }\n      ],\n      "sequences": [\n        {\n          "sequence": "ACDEF",\n          "chain_id": "Z"\n        }\n      ]\n    }\n  ]\n}\n```\n\n**Config Field Details:**\n- **`groups`**: An array where each item defines a rigid-body group. All structures and sequences within the same group will have their relative positions fixed.\n- **`file_index`**: The integer index of the file in the `structures` array. `0` refers to the first file uploaded.\n- **`chain_ids` (optional)**: Renames chains from the input structure. A mapping of `{"original_id": "new_id"}`.\n  If provided, this acts as an **explicit inclusion list**: only chains mapped here will be extracted.\n  Unmapped chains are ignored. Map a chain to itself (e.g., `{"A": "A"}`) to keep it without renaming.\n- **`edits` (optional)**: Specifies modifications to be applied to specific chains (by their assigned ID). Each chain edit can describe all residue-level outputs for that chain:\n  - **Sequence edit** via `reference_sequence` and `new_sequence`\n  - **Structure edit** via `structure_mask`\n  - **Binding edit** via `binding`, an aligned string using `B` (binding), `N` (not binding), `U` (unknown), and `-` (deleted / no residue)\n  - **pLDDT override** via `plddt`, a scalar from `0` to `100` applied to final residues with known CA coordinates. Residues without structure keep `NaN`.\n- **`sequences`**: Used to supply sequence-only protein chains directly as strings without a structure file.\n\nLegacy single-file usage (via `protein`, `reference_sequence`, `new_sequence`, and `structure_mask`) remains fully supported if `config` and `structures` are omitted.\n',
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
                  structures: {
                    type: "array",
                    items: {
                      type: "string",
                      format: "binary",
                    },
                    description:
                      "Array of CIF or PDB files containing protein structures.",
                  },
                  config: {
                    description: "Configuration for groups and edits.",
                    allOf: [
                      {
                        $ref: "#/components/schemas/EditProteinConfig",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
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
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
        tags: ["Structure"],
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
          200: {
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
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
        tags: ["Structure"],
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
                  plddt: {
                    type: "string",
                    description:
                      "Optional scalar pLDDT override applied to all atoms in the normalized CIF output. Provide a number between 0 and 100 inclusive.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
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
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
        tags: ["Align"],
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
                      "Query protein sequence (single-letter amino acid codes).\nUse `:` to separate chains of a multichain query; target sequences\nmust then have the same number of chains, aligned chain-by-position.",
                  },
                  target_sequences: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    description:
                      "List of target protein sequences. Each entry may be multichain\nusing `:` separators; its chain count must match the query.",
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
          200: {
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
                        "Tuple of (aligned_query_sequence, aligned_target_sequence).\nFor multichain inputs, chains are joined with `:` within each\naligned string in the same order as the query chains.\nPresent if `return_alignment=true`.",
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
          400: {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
        tags: ["Align"],
        summary: "Batch structure alignment using specified method (Streaming)",
        description:
          "Perform structure-based alignment between query structures and targets.\n\nExactly one of `protein` or `design_id` must be provided as the query.\nWhen `design_id` is given, it references a fold job with N design\nstructures, and `targets_id` must contain a positive multiple of N\nstructures. Design `i` is aligned against `targets[i*k : (i+1)*k]`\nwhere `k = len(targets) / len(designs)`. Each result row carries a\n`design_index` (0-indexed) so callers can regroup the stream.\n\n**Streaming Endpoint:** Returns a stream of JSON objects (NDJSON), where each line\ncorresponds to one (query, target) pair.",
        operationId: "structureAlignBatchById",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: [
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
                    description:
                      "CIF or PDB file containing the query structure. All protein\nchains in the file are used; non-protein chains are filtered\nor rejected per the service's `REJECT_NON_PROTEIN_CHAINS`\nsetting. Targets must have matching chain ids.\nMutually exclusive with `design_id`; exactly one of the two\nmust be provided.",
                  },
                  design_id: {
                    type: "string",
                    format: "uuid",
                    description:
                      "Fold job ID referencing a **collection** of N query\nstructures (e.g. designs from RFdiffusion or BoltzGen).\nWhen provided, `targets_id` must contain N*k structures\nand design `i` is aligned against `targets[i*k:(i+1)*k]`.\nMutually exclusive with `protein`; exactly one of the two\nmust be provided.",
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
          200: {
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
                        "Tuple of (aligned_query_sequence, aligned_target_sequence).\nFor multichain inputs, chains are joined with `:` in the\norder of the query chain ids.\nPresent if `return_alignment=true`.",
                    },
                    plddt: {
                      type: "number",
                      format: "float",
                      description:
                        "Mean pLDDT for this target, averaged across all chains\n(NaN residues excluded). Present if `return_plddt=true`.",
                    },
                    design_index: {
                      type: "integer",
                      description:
                        "0-indexed position of the query design within `design_id`.\nPresent only when `design_id` was provided in the request;\nomitted when the request used an uploaded `protein`.",
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
                    design_index: 0,
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
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
        tags: ["Structure"],
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
          200: {
            description: "Stream of pLDDT scores.",
            content: {
              "application/x-ndjson": {
                schema: {
                  type: "object",
                  properties: {
                    plddt: {
                      type: "number",
                      format: "float",
                      description:
                        "Mean pLDDT for a single target structure, averaged across\nall chains (NaN residues excluded).",
                    },
                  },
                  example: {
                    plddt: 87.3,
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid input provided.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          401: {
            description: "Unauthorized.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          404: {
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
          sequence_length: {
            title: "Sequence Length",
            description:
              "Length of the prompt's context chains. Set when every chain across\nevery Complex across every replicate has the same length; null when\nchain lengths vary or no context has been parsed yet.",
            type: "integer",
            nullable: true,
          },
          is_system: {
            type: "boolean",
            default: false,
            description:
              "True for platform-curated system prompts available to every user.\nSystem prompts are read-only over the HTTP API; users cannot create,\nmodify, or delete them. False or absent for user-uploaded prompts.",
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
        required: ["id", "name", "created_date", "project_uuid"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Query unique identifier.",
          },
          name: {
            type: "string",
            description:
              "Display name of the query. Defaults to the query's UUID string when the\nuser has not set a name explicitly; clearing the name via PUT (passing\n`null` to `QueryUpdate.name`) resets it to this default.",
            example: "My Awesome Query",
          },
          created_date: {
            type: "string",
            format: "date-time",
            description: "The date the query was created.",
          },
          project_uuid: {
            type: "string",
            format: "uuid",
            description: "Project this query is attached to.",
            nullable: true,
          },
          sequence_length: {
            title: "Sequence Length",
            description:
              "Length of the query's protein chain(s). Set when every chain in the\nquery has the same length; null when chains differ in length.",
            type: "integer",
            nullable: true,
          },
        },
      },
      QueryUpdate: {
        title: "QueryUpdate",
        description:
          "Fields to update on a query. Omitted fields are left unchanged; fields\nprovided with an explicit null value (for nullable fields) are cleared.",
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the query.",
            example: "My Awesome Query",
            nullable: true,
          },
          project_uuid: {
            type: "string",
            format: "uuid",
            description: "Project to attach the query to.",
            nullable: true,
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
      EditProteinChainEditConfig: {
        title: "EditProteinChainEditConfig",
        type: "object",
        properties: {
          reference_sequence: {
            type: "string",
          },
          new_sequence: {
            type: "string",
          },
          structure_mask: {
            type: "string",
          },
          binding: {
            type: "string",
            description:
              "Optional aligned binding track for the edited chain, in addition to sequence and structure edits. Uses `B` (binding), `N` (not binding), `U` (unknown), and `-` (deleted / no residue).",
          },
          plddt: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description:
              "Optional scalar pLDDT override for the final edited chain. Applied only at residues with known CA coordinates; residues without structure keep NaN.",
          },
        },
      },
      EditProteinStructureConfig: {
        title: "EditProteinStructureConfig",
        type: "object",
        properties: {
          file_index: {
            type: "integer",
            description: "Index of the file in the uploaded structures array.",
          },
          chain_ids: {
            type: "object",
            additionalProperties: {
              type: "string",
            },
            description: "Mapping of original chain IDs to new chain IDs.",
            example: {
              A: "X",
              B: "Y",
            },
          },
          edits: {
            type: "object",
            additionalProperties: {
              $ref: "#/components/schemas/EditProteinChainEditConfig",
            },
            description:
              "Edits to apply to the chains (keyed by the assigned chain ID).",
            example: {
              X: {
                reference_sequence: "ACDEFG",
                new_sequence: "ACHEFG",
                structure_mask: "SSXSSS",
                binding: "UUBUUU",
              },
            },
          },
        },
      },
      EditProteinSequenceConfig: {
        title: "EditProteinSequenceConfig",
        type: "object",
        properties: {
          sequence: {
            type: "string",
          },
          chain_id: {
            type: "string",
          },
        },
      },
      EditProteinGroup: {
        title: "EditProteinGroup",
        type: "object",
        properties: {
          structures: {
            type: "array",
            items: {
              $ref: "#/components/schemas/EditProteinStructureConfig",
            },
          },
          sequences: {
            type: "array",
            items: {
              $ref: "#/components/schemas/EditProteinSequenceConfig",
            },
          },
        },
      },
      EditProteinConfig: {
        title: "EditProteinConfig",
        description:
          "Configuration for editing and combining multiple protein chains.",
        type: "object",
        properties: {
          groups: {
            type: "array",
            items: {
              $ref: "#/components/schemas/EditProteinGroup",
            },
          },
        },
        example: {
          groups: [
            {
              structures: [
                {
                  file_index: 0,
                  chain_ids: {
                    A: "X",
                    B: "Y",
                  },
                  edits: {
                    X: {
                      reference_sequence: "ACDEFG",
                      new_sequence: "ACHEFG",
                      structure_mask: "SSXSSS",
                      binding: "UUBUUU",
                      plddt: 72.5,
                    },
                  },
                },
              ],
              sequences: [
                {
                  sequence: "MKL",
                  chain_id: "Z",
                },
              ],
            },
          ],
        },
      },
    },
  },
  tags: [
    {
      name: "Prompt",
      description: "Prompt _context_ upload, get, and list operations.",
    },
    {
      name: "Query",
      description: "Prompt _query_ upload, get, and list operations.",
    },
    {
      name: "Structure",
      description: "Structure editing and normalization operations.",
    },
    {
      name: "Align",
      description: "Structure and sequence alignment operations.",
    },
  ],
};
export default promptSpec;
