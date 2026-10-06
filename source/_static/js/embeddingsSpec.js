const embeddingsSpec = {
  "openapi": "3.0.2",
  "info": {
    "title": "OpenProtein Embeddings",
    "description": "# Embeddings API\nThe Embeddings API provided by OpenProtein.ai allows you to generate state-of-the-art protein sequence embeddings from both proprietary and open source models.\n\nYou can list the available models with `/embeddings/models` and view a model summary (including output dimensions, citations and more) with `/embeddings/models/{model_id}/metadata`.\n\nCurrently, we support the following models:\n- **PoET**: An OpenProtein.AI conditional protein language model that enables embedding, scoring, and generating sequences conditioned on an input protein family of interest. [Reference](https://papers.nips.cc/paper_files/paper/2023/hash/f4366126eba252699b280e8f93c0ab2f-Abstract-Conference.html).\n- **PoET-2**: An OpenProtein.AI conditional, multimodal protein language model that enables embedding, scoring, and generating sequences conditioned on an input protein family of interest. [Reference](https://proceedings.neurips.cc/paper_files/paper/2025/hash/4d19160864e6a644496d61b21c7e015a-Abstract-Conference.html).\n- **Prot-seq**: An OpenProtein.AI masked protein language model (~300M parameters) trained on UniRef50 with contact and secondary structure prediction as secondary objectives. This model utilizes random Fourier position embeddings and FlashAttention to enable fast inference.\n- **Rotaprot-large-uniref50w**: An OpenProtein.AI masked protein language model (~900M parameters) trained on UniRef100 with sequences weighted inversely proportional to the number of UniRef50 homologs. This model uses rotary relative position embeddings and FlashAttention to enable fast inference.\n- **Rotaprot-large-uniref90-ft**: A version of our proprietary rotaprot-large-uniref50w finetuned on UniRef100 with sequences weighted inversely proportional to the number of UniRef90 cluster members.\n- **ESM1 Models**: Community based ESM1 models, including: *esm1b_t33_650M_UR50S*, *esm1v_t33_650M_UR90S_1*, *esm1v_t33_650M_UR90S_2*, *esm1v_t33_650M_UR90S_3*, *esm1v_t33_650M_UR90S_4*, *esm1v_t33_650M_UR90S_5*. These are based on the ESM1 language model, with different versions having different model parameters and training data. [GitHub link](https://github.com/facebookresearch/esm), [ESM1b reference](https://www.pnas.org/doi/full/10.1073/pnas.2016239118), [ESM1v reference](https://proceedings.neurips.cc/paper/2021/hash/f51338d736f95dd42427296047067694-Abstract.html). Licensed under [MIT](https://choosealicense.com/licenses/mit/).\n- **ESM2 Models**: Community based ESM2 models, including: *esm2_t6_8M_UR50D*, *esm2_t12_35M_UR50D*, *esm2_t30_150M_UR50D*, *esm2_t33_650M_UR50D*. These models are based on the ESM2 language model, with different version having different model parameters and training data. [GitHub link](https://github.com/facebookresearch/esm), [Reference](https://www.science.org/doi/10.1126/science.ade2574). Licensed under [MIT](https://choosealicense.com/licenses/mit/).\n- **ESMC Models**: ESM Cambrian (ESMC) protein language models, including: *esmc-300m*, *esmc-600m*, *esmc-6b*. These are trained on UniRef, MGnify, and JGI, with different versions having different model parameters. [GitHub link](https://github.com/Biohub/esm), [Reference](https://biohub.ai/papers/esm_protein.pdf). Licensed under [MIT](https://choosealicense.com/licenses/mit/).\n- **ProtTrans Models**: Transformer-based models from RostLab, including: *prot_t5_xl_half_uniref50-enc*. These models are based on the ProtTrans models, with different versions having different transformer-based architectures, model parameters and precisions, as well as different training datasets. [GitHub link](https://github.com/agemagician/ProtTrans), [Reference](https://www.biorxiv.org/content/early/2020/07/21/2020.07.12.199554). Licensed under [Academic Free License v3.0 License](https://choosealicense.com/licenses/afl-3.0/).\n- **AbLang2**: An antibody-specific language model that provides residue-level and sequence-level representations for both heavy and light chains. [GitHub link](https://github.com/oxpig/AbLang2), [Reference](https://doi.org/10.1101/2024.02.02.578678). Licensed under [BSD-3](https://choosealicense.com/licenses/bsd-3-clause/).\n- **ProteinMPNN**: A model for inverse-folding of protein structures to predict suitable sequences. [GitHub link](https://github.com/dauparas/ProteinMPNN), [Reference](https://doi.org/10.1126/science.add2187). Licensed under [MIT](https://choosealicense.com/licenses/mit/).\n- **SolubleMPNN**: A variant of ProteinMPNN trained with weights tuned for soluble protein targets. Uses the same inverse-folding pipeline as ProteinMPNN; `soluble_model` is implied by the route, and `model_name` is restricted to the soluble-compatible weights (`v_48_010`, `v_48_020`). [GitHub link](https://github.com/dauparas/ProteinMPNN), [Reference](https://doi.org/10.1126/science.add2187). Licensed under [MIT](https://choosealicense.com/licenses/mit/).\n- **ESM-IF1**: A structure-conditioned inverse-folding model that scores or generates protein sequences given a backbone structure. It has a max sequence length of 500 residues. [GitHub link](https://github.com/facebookresearch/esm), [Reference](https://www.biorxiv.org/content/10.1101/2022.04.10.487779). Licensed under [MIT](https://choosealicense.com/licenses/mit/).\n\n",
    "version": "1.0.0"
  },
  "paths": {
    "/api/v1/embeddings/models": {
      "get": {
        "tags": [
          "embeddings"
        ],
        "summary": "List embeddings models",
        "description": "Get available models. By default returns a list of model ID strings.\nUse `verbose=true` to return full model metadata objects.\nUse `output_type` to filter models by supported output types.",
        "parameters": [
          {
            "name": "verbose",
            "in": "query",
            "required": false,
            "description": "When true, return full model metadata instead of just model IDs.",
            "schema": {
              "type": "boolean",
              "default": false
            }
          },
          {
            "name": "output_type",
            "in": "query",
            "required": false,
            "description": "Filter models by supported output type (e.g. `embed`, `logits`, `attn`, `score`, `generate`).\nCan be repeated to match models supporting any of the specified types.",
            "schema": {
              "type": "string"
            },
            "style": "form",
            "explode": true
          }
        ],
        "responses": {
          "200": {
            "description": "Available embeddings models returned.",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "title": "Model IDs",
                      "description": "List of model ID strings (default).",
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "example": [
                        "prot-seq",
                        "poet",
                        "..."
                      ]
                    },
                    {
                      "title": "Model Metadata",
                      "description": "List of full model metadata objects (when verbose=true).",
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/ModelMetadata"
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/models/{model_id}": {
      "get": {
        "tags": [
          "embeddings"
        ],
        "summary": "Get embeddings model metadata",
        "description": "Get information about specific embeddings model.",
        "parameters": [
          {
            "name": "model_id",
            "description": "Model ID to query.\n\nList models to find available models.\n",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "poet",
                "poet-2",
                "proteinmpnn",
                "solublempnn",
                "esm-if1",
                "prot-seq",
                "rotaprot-large-uniref50w",
                "rotaprot-large-uniref90-ft",
                "esm1b_t33_650M_UR50S",
                "esm1v_t33_650M_UR90S_1",
                "esm1v_t33_650M_UR90S_2",
                "esm1v_t33_650M_UR90S_3",
                "esm1v_t33_650M_UR90S_4",
                "esm1v_t33_650M_UR90S_5",
                "esm2_t6_8M_UR50D",
                "esm2_t12_35M_UR50D",
                "esm2_t30_150M_UR50D",
                "esm2_t33_650M_UR50D",
                "esm2_t36_3B_UR50D",
                "esmc-300m",
                "esmc-600m",
                "esmc-6b",
                "prott5-xl",
                "ablang2"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detailed information about model returned.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ModelMetadata"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model was not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/{job_id}": {
      "get": {
        "tags": [
          "embeddings"
        ],
        "summary": "Get embeddings request metadata",
        "description": "Get metadata about embeddings request.\n",
        "parameters": [
          {
            "name": "job_id",
            "in": "path",
            "description": "Job ID of embeddings request",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Embeddings metadata successfully returned.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Embed"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Embeddings job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/{job_id}/sequences": {
      "get": {
        "tags": [
          "embeddings"
        ],
        "summary": "Get sequences used in request",
        "description": "Get sequences used in a previous embeddings request.\n",
        "parameters": [
          {
            "name": "job_id",
            "in": "path",
            "description": "Job ID of sequences to fetch",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Request sequences",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Sequence"
                  }
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Embeddings job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/{job_id}/{sequence}": {
      "get": {
        "tags": [
          "embeddings"
        ],
        "summary": "Retrieve vector results",
        "description": "Get vector results for a submitted embeddings job.",
        "parameters": [
          {
            "name": "job_id",
            "in": "path",
            "description": "Job ID to fetch",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          },
          {
            "name": "sequence",
            "in": "path",
            "description": "Sequence for which to retrieve result. Use `/sequences` endpoint to find sequences used in request.",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Result encoded in numpy format",
            "content": {
              "application/octet-stream": {
                "schema": {
                  "type": "string",
                  "format": "binary",
                  "example": "\\x93NUMPY\\x01\\x00v\\x00{'descr': '<f4', 'fortran_order': False, 'shape': (0,), }\n"
                }
              }
            }
          },
          "400": {
            "description": "Vector retrieval error. Contact support for assistance if persistent.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Embeddings job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/{job_id}/scores": {
      "get": {
        "tags": [
          "embeddings"
        ],
        "summary": "Retrieve scores",
        "description": "Get scores for a submitted `/embeddings/score` job.",
        "parameters": [
          {
            "name": "job_id",
            "in": "path",
            "description": "Job ID to fetch",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Scored sequences with likelihoods encoded in csv format.",
            "content": {
              "text/csv": {
                "schema": {
                  "type": "string",
                  "format": "binary",
                  "example": "name,sequence,score1,score2,...\nsequence-1,MGHKL,0.123,0.456,...\n"
                }
              }
            }
          },
          "400": {
            "description": "Vector retrieval error. Contact support for assistance if persistent.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Embeddings job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/{job_id}/generate": {
      "get": {
        "tags": [
          "embeddings"
        ],
        "summary": "Retrieve generate results",
        "description": "Get generate results for a submitted `/embeddings/generate` job.",
        "parameters": [
          {
            "name": "job_id",
            "in": "path",
            "description": "Job ID to fetch",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Generated sequences with likelihoods encoded in csv format.",
            "content": {
              "text/csv": {
                "schema": {
                  "type": "string",
                  "format": "binary",
                  "example": "name,sequence,score\ngenerated-sequence-1,MGHKL,0.123\n"
                }
              }
            }
          },
          "400": {
            "description": "Vector retrieval error. Contact support for assistance if persistent.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Embeddings job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/{job_id}/extend": {
      "post": {
        "tags": [
          "embeddings"
        ],
        "summary": "Extend a score job",
        "description": "Extend a completed `/embeddings/score` job by providing more sequences.",
        "requestBody": {
          "description": "Request for adding sequences to score.",
          "content": {
            "application/json": {
              "schema": {
                "title": "ExtendScoreRequest",
                "description": "Request for adding sequences to score.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "ExtendScoreRequest",
                "description": "Request for adding sequences to score.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Score extension request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/{job_id}/extend_generate": {
      "post": {
        "tags": [
          "embeddings"
        ],
        "summary": "Extend a generate job",
        "description": "Extend a completed `/embeddings/generate` job by requesting more sequences.",
        "requestBody": {
          "description": "Request for adding sequences to generate.",
          "content": {
            "application/json": {
              "schema": {
                "title": "ExtendGenerateRequest",
                "description": "Request for adding sequences to generate.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "ExtendGenerateRequest",
                "description": "Request for adding sequences to generate.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Score extension request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/svd": {
      "get": {
        "tags": [
          "svd"
        ],
        "summary": "List SVDs",
        "description": "List SVDs available.\n\nYou may need to create an SVD first with POST `/svd` to see results here.\n",
        "responses": {
          "200": {
            "description": "List of SVDs",
            "content": {
              "application/json": {
                "schema": {
                  "description": "List of SVDs",
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/SVDMetadata"
                  }
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      },
      "post": {
        "tags": [
          "svd"
        ],
        "summary": "Request SVD",
        "description": "Create SVD from sequence embeddings. Requires a model_id, you\ncan see available models with the `/embeddings/models` endpoint.\nAlso view the model-specific parameters from the respective model sections.\n\nSVD inputs must include:\n  - **model_id**: the model id - SVD will be computed on the embeddings from this model\n  - **n_components**: the number of SVD components output\n  - **reduction**: the reduction type to apply to the embeddings prior to SVD (currently only MEAN/SUM supported)\n  - **sequences**: the protein sequences, as a list\n  - other model-specific parameters, e.g. `prompt_id` for `poet`, see the specific model for required params\n",
        "requestBody": {
          "description": "SVD request parameters",
          "content": {
            "application/json": {
              "schema": {
                "title": "SVDRequest",
                "description": "Request to fit an SVD with a foundational model and sequences.",
                "required": [
                  "model_id",
                  "n_components",
                  "sequences"
                ],
                "type": "object",
                "properties": {
                  "model_id": {
                    "type": "string"
                  },
                  "n_components": {
                    "minimum": 1,
                    "type": "integer",
                    "example": 1024
                  },
                  "reduction": {
                    "type": "string",
                    "description": "e.g. MEAN, nil",
                    "example": "MEAN"
                  },
                  "sequences": {
                    "minItems": 1,
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "SVDRequest",
                "description": "Request to fit an SVD with a foundational model and sequences.",
                "type": "object",
                "required": [
                  "model_id",
                  "n_components",
                  "variant_file"
                ],
                "properties": {
                  "model_id": {
                    "type": "string"
                  },
                  "n_components": {
                    "minimum": 1,
                    "type": "integer",
                    "example": 1024
                  },
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "reduction": {
                    "type": "string",
                    "description": "e.g. MEAN, nil",
                    "example": "MEAN"
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "PromptID to be used for `poet`."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "SVD request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Specified `model_id` not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/svd/{svd_id}": {
      "get": {
        "tags": [
          "svd"
        ],
        "summary": "Get SVD metadata",
        "description": "Get SVD job metadata. Including SVD dimension and sequence lengths.\n\nRequires a SVD job from POST /svd.\n",
        "parameters": [
          {
            "name": "svd_id",
            "in": "path",
            "description": "SVD ID from a POST `/svd` request.",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "SVD metadata",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SVDMetadata"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "SVD not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      },
      "delete": {
        "tags": [
          "svd"
        ],
        "summary": "Delete SVD model",
        "description": "Delete SVD model.",
        "parameters": [
          {
            "name": "svd_id",
            "in": "path",
            "description": "SVD ID from a POST `/svd` request.",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "SVD successfully deleted.",
            "content": {}
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "SVD not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/svd/{svd_id}/embed": {
      "post": {
        "tags": [
          "svd"
        ],
        "summary": "Create SVD embeddings",
        "description": "Create embeddings from your sequences and run an existing SVD on\nthe result.\n\nUse GET `/svd` to see the SVD models you have previously created.\n",
        "parameters": [
          {
            "name": "svd_id",
            "in": "path",
            "description": "ID of SVD model to use",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Protein sequences",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "minItems": 1,
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embeddings SVD request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/svd/{svd_id}/sequences": {
      "get": {
        "tags": [
          "svd"
        ],
        "summary": "Get sequences used to fit SVD",
        "description": "Get sequences used in a previous SVD fit request.\n",
        "parameters": [
          {
            "name": "svd_id",
            "in": "path",
            "description": "SVD fit's job ID of sequences to fetch",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Request sequences",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Sequence"
                  }
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "SVD fit job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/clustering": {
      "get": {
        "tags": [
          "clustering"
        ],
        "summary": "List clustering jobs",
        "description": "List clustering jobs. Optionally filter by method.\n",
        "parameters": [
          {
            "name": "method",
            "in": "query",
            "description": "Filter by clustering method (e.g. hierarchical).",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "hierarchical"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of clustering jobs",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/ClusteringMetadata"
                  }
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/clustering/{method}": {
      "post": {
        "tags": [
          "clustering"
        ],
        "summary": "Request clustering",
        "description": "Cluster sequence embeddings using the specified method. The clustering\nis computed asynchronously; poll the job status via GET `/clustering/{clustering_id}`.\n\nThe result is retrievable via GET `/clustering/{clustering_id}/result`.\n\nInputs:\n  - **model_id**: embedding model to cluster on\n  - **feature_type**: `PLM` for raw PLM embeddings or `SVD` for SVD-reduced embeddings\n  - **sequences**: protein sequences as a list (max 10,000)\n  - **reduction**: required for PLM feature_type (e.g. MEAN)\n  - **svd_id**: required when feature_type is SVD\n\nMethod-specific parameters vary. For `hierarchical`:\n  - **linkage_method**: scipy linkage method (ward, single, complete, average, weighted, centroid, median)\n  - **metric**: distance metric (euclidean, cosine, correlation, etc.)\n  - Linkage/metric constraints: `ward`, `centroid`, and `median` require `metric=euclidean`.\n",
        "parameters": [
          {
            "name": "method",
            "in": "path",
            "description": "Clustering method.",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "hierarchical"
              ]
            }
          }
        ],
        "requestBody": {
          "description": "Clustering request parameters",
          "content": {
            "application/json": {
              "schema": {
                "title": "ClusteringRequest",
                "description": "Request to fit a clustering with a foundational model and sequences.",
                "required": [
                  "model_id",
                  "feature_type",
                  "linkage_method",
                  "metric",
                  "sequences"
                ],
                "type": "object",
                "properties": {
                  "model_id": {
                    "type": "string",
                    "description": "Embedding model ID."
                  },
                  "feature_type": {
                    "type": "string",
                    "description": "Type of input features.",
                    "enum": [
                      "PLM",
                      "SVD"
                    ]
                  },
                  "linkage_method": {
                    "type": "string",
                    "description": "Scipy linkage method.",
                    "enum": [
                      "ward",
                      "single",
                      "complete",
                      "average",
                      "weighted",
                      "centroid",
                      "median"
                    ],
                    "example": "ward"
                  },
                  "metric": {
                    "type": "string",
                    "description": "Distance metric.",
                    "enum": [
                      "euclidean",
                      "cosine",
                      "correlation",
                      "hamming",
                      "chebyshev",
                      "cityblock",
                      "sqeuclidean",
                      "canberra",
                      "braycurtis"
                    ],
                    "example": "euclidean"
                  },
                  "reduction": {
                    "type": "string",
                    "description": "Reduction for per-residue embeddings. Required when feature_type is PLM.",
                    "example": "MEAN"
                  },
                  "svd_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "SVD model ID. Required when feature_type is SVD."
                  },
                  "sequences": {
                    "minItems": 1,
                    "maxItems": 10000,
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "Prompt ID for PoET models."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "ClusteringRequest",
                "description": "Request to fit a clustering with a foundational model and sequences from a file.",
                "type": "object",
                "required": [
                  "model_id",
                  "feature_type",
                  "linkage_method",
                  "metric",
                  "variant_file"
                ],
                "properties": {
                  "model_id": {
                    "type": "string"
                  },
                  "feature_type": {
                    "type": "string",
                    "enum": [
                      "PLM",
                      "SVD"
                    ]
                  },
                  "linkage_method": {
                    "type": "string",
                    "enum": [
                      "ward",
                      "single",
                      "complete",
                      "average",
                      "weighted",
                      "centroid",
                      "median"
                    ]
                  },
                  "metric": {
                    "type": "string",
                    "enum": [
                      "euclidean",
                      "cosine",
                      "correlation",
                      "hamming",
                      "chebyshev",
                      "cityblock",
                      "sqeuclidean",
                      "canberra",
                      "braycurtis"
                    ]
                  },
                  "reduction": {
                    "type": "string"
                  },
                  "svd_id": {
                    "type": "string",
                    "format": "uuid"
                  },
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid"
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Clustering request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Invalid request (bad parameters, illegal linkage/metric combo, size cap exceeded, etc.)",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/clustering/{clustering_id}": {
      "get": {
        "tags": [
          "clustering"
        ],
        "summary": "Get clustering metadata",
        "description": "Get clustering job metadata including method, parameters, and status.\n",
        "parameters": [
          {
            "name": "clustering_id",
            "in": "path",
            "description": "Clustering job ID.",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Clustering metadata",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ClusteringMetadata"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Clustering job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      },
      "delete": {
        "tags": [
          "clustering"
        ],
        "summary": "Delete clustering job",
        "description": "Delete a clustering job and its associated data.",
        "parameters": [
          {
            "name": "clustering_id",
            "in": "path",
            "description": "Clustering job ID.",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Clustering job successfully deleted.",
            "content": {}
          },
          "401": {
            "description": "Bad or expired token.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Clustering job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/clustering/{clustering_id}/result": {
      "get": {
        "tags": [
          "clustering"
        ],
        "summary": "Get clustering result",
        "description": "Get the result of a completed clustering job. The response shape depends\non the clustering method used.\n\nFor `hierarchical`, returns a linkage matrix and leaf order suitable\nfor rendering a dendrogram.\n\nOnly available when the job status is SUCCESS. Returns 400 if the job\nis still pending or running.\n",
        "parameters": [
          {
            "name": "clustering_id",
            "in": "path",
            "description": "Clustering job ID.",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Clustering linkage result",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ClusteringResult"
                }
              }
            }
          },
          "400": {
            "description": "Result not yet ready (job still pending/running).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Clustering job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/clustering/{clustering_id}/sequences": {
      "get": {
        "tags": [
          "clustering"
        ],
        "summary": "Get sequences used for clustering",
        "description": "Get the input sequences used in a clustering job, in their original order.\nUse the `leaf_order` indices from the `/result` endpoint to map dendrogram\nleaves back to these sequences.\n",
        "parameters": [
          {
            "name": "clustering_id",
            "in": "path",
            "description": "Clustering job ID.",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Input sequences in original order",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Sequence"
                  }
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Clustering job not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/models/poet/embed": {
      "post": {
        "tags": [
          "openprotein",
          "poet",
          "embed"
        ],
        "summary": "poet embed",
        "description": "Create embeddings vectors representing input protein sequences using `poet`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `poet`.",
                "type": "object",
                "required": [
                  "sequences",
                  "prompt_id"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `poet`.",
                "type": "object",
                "required": [
                  "variant_file",
                  "prompt_id"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet-2/embed": {
      "post": {
        "tags": [
          "openprotein",
          "poet-2",
          "embed"
        ],
        "summary": "poet-2 embed",
        "description": "Create embeddings vectors representing input protein sequences using `poet-2`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `poet-2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `poet-2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/prot-seq/embed": {
      "post": {
        "tags": [
          "openprotein",
          "prot-seq",
          "embed"
        ],
        "summary": "prot-seq embed",
        "description": "Create embeddings vectors representing input protein sequences using `prot-seq`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `prot-seq`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `prot-seq`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/rotaprot-large-uniref50w/embed": {
      "post": {
        "tags": [
          "openprotein",
          "rotaprot-large-uniref50w",
          "embed"
        ],
        "summary": "rotaprot-large-uniref50w embed",
        "description": "Create embeddings vectors representing input protein sequences using `rotaprot-large-uniref50w`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `rotaprot-large-uniref50w`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `rotaprot-large-uniref50w`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/rotaprot-large-uniref90-ft/embed": {
      "post": {
        "tags": [
          "openprotein",
          "rotaprot-large-uniref90-ft",
          "embed"
        ],
        "summary": "rotaprot-large-uniref90-ft embed",
        "description": "Create embeddings vectors representing input protein sequences using `rotaprot-large-uniref90-ft`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `rotaprot-large-uniref90-ft`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `rotaprot-large-uniref90-ft`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1b_t33_650M_UR50S/embed": {
      "post": {
        "tags": [
          "esm1",
          "esm1b_t33_650M_UR50S",
          "embed"
        ],
        "summary": "esm1b_t33_650M_UR50S embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm1b_t33_650M_UR50S`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1b_t33_650M_UR50S`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1b_t33_650M_UR50S`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_1/embed": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_1",
          "embed"
        ],
        "summary": "esm1v_t33_650M_UR90S_1 embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm1v_t33_650M_UR90S_1`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_1`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_1`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_2/embed": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_2",
          "embed"
        ],
        "summary": "esm1v_t33_650M_UR90S_2 embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm1v_t33_650M_UR90S_2`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_3/embed": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_3",
          "embed"
        ],
        "summary": "esm1v_t33_650M_UR90S_3 embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm1v_t33_650M_UR90S_3`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_3`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_3`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_4/embed": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_4",
          "embed"
        ],
        "summary": "esm1v_t33_650M_UR90S_4 embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm1v_t33_650M_UR90S_4`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_4`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_4`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_5/embed": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_5",
          "embed"
        ],
        "summary": "esm1v_t33_650M_UR90S_5 embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm1v_t33_650M_UR90S_5`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_5`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm1v_t33_650M_UR90S_5`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t6_8M_UR50D/embed": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t6_8M_UR50D",
          "embed"
        ],
        "summary": "esm2_t6_8M_UR50D embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm2_t6_8M_UR50D`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t6_8M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t6_8M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t12_35M_UR50D/embed": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t12_35M_UR50D",
          "embed"
        ],
        "summary": "esm2_t12_35M_UR50D embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm2_t12_35M_UR50D`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t12_35M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t12_35M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t30_150M_UR50D/embed": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t30_150M_UR50D",
          "embed"
        ],
        "summary": "esm2_t30_150M_UR50D embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm2_t30_150M_UR50D`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t30_150M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t30_150M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t33_650M_UR50D/embed": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t33_650M_UR50D",
          "embed"
        ],
        "summary": "esm2_t33_650M_UR50D embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm2_t33_650M_UR50D`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t33_650M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t33_650M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t36_3B_UR50D/embed": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t36_3B_UR50D",
          "embed"
        ],
        "summary": "esm2_t36_3B_UR50D embed",
        "description": "Create embeddings vectors representing input protein sequences using `esm2_t36_3B_UR50D`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t36_3B_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esm2_t36_3B_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-300m/embed": {
      "post": {
        "tags": [
          "esmc",
          "esmc-300m",
          "embed"
        ],
        "summary": "esmc-300m embed",
        "description": "Create embeddings vectors representing input protein sequences using `esmc-300m`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esmc-300m`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esmc-300m`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-600m/embed": {
      "post": {
        "tags": [
          "esmc",
          "esmc-600m",
          "embed"
        ],
        "summary": "esmc-600m embed",
        "description": "Create embeddings vectors representing input protein sequences using `esmc-600m`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esmc-600m`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esmc-600m`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-6b/embed": {
      "post": {
        "tags": [
          "esmc",
          "esmc-6b",
          "embed"
        ],
        "summary": "esmc-6b embed",
        "description": "Create embeddings vectors representing input protein sequences using `esmc-6b`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esmc-6b`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `esmc-6b`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/prott5-xl/embed": {
      "post": {
        "tags": [
          "community",
          "prott5-xl",
          "embed"
        ],
        "summary": "prott5-xl embed",
        "description": "Create embeddings vectors representing input protein sequences using `prott5-xl`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `prott5-xl`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `prott5-xl`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/ablang2/embed": {
      "post": {
        "tags": [
          "community",
          "antibody",
          "ablang2",
          "embed"
        ],
        "summary": "ablang2 embed",
        "description": "Create embeddings vectors representing input protein sequences using `ablang2`.",
        "requestBody": {
          "description": "Request for embeddings.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `ablang2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "EmbedRequest",
                "description": "Request for embeddings using `ablang2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Embed request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EmbedJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "401": {
            "description": "Bad or expired token. This can happen if the token is revoked or expired. User should re-authenticate with their credentials.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/prot-seq/attn": {
      "post": {
        "tags": [
          "openprotein",
          "prot-seq",
          "attn"
        ],
        "summary": "prot-seq attn",
        "description": "Use `prot-seq` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `prot-seq`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `prot-seq`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/rotaprot-large-uniref50w/attn": {
      "post": {
        "tags": [
          "openprotein",
          "rotaprot-large-uniref50w",
          "attn"
        ],
        "summary": "rotaprot-large-uniref50w attn",
        "description": "Use `rotaprot-large-uniref50w` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `rotaprot-large-uniref50w`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `rotaprot-large-uniref50w`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/rotaprot-large-uniref90-ft/attn": {
      "post": {
        "tags": [
          "openprotein",
          "rotaprot-large-uniref90-ft",
          "attn"
        ],
        "summary": "rotaprot-large-uniref90-ft attn",
        "description": "Use `rotaprot-large-uniref90-ft` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `rotaprot-large-uniref90-ft`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `rotaprot-large-uniref90-ft`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1b_t33_650M_UR50S/attn": {
      "post": {
        "tags": [
          "esm1",
          "esm1b_t33_650M_UR50S",
          "attn"
        ],
        "summary": "esm1b_t33_650M_UR50S attn",
        "description": "Use `esm1b_t33_650M_UR50S` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1b_t33_650M_UR50S`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1b_t33_650M_UR50S`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_1/attn": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_1",
          "attn"
        ],
        "summary": "esm1v_t33_650M_UR90S_1 attn",
        "description": "Use `esm1v_t33_650M_UR90S_1` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_1`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_1`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_2/attn": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_2",
          "attn"
        ],
        "summary": "esm1v_t33_650M_UR90S_2 attn",
        "description": "Use `esm1v_t33_650M_UR90S_2` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_3/attn": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_3",
          "attn"
        ],
        "summary": "esm1v_t33_650M_UR90S_3 attn",
        "description": "Use `esm1v_t33_650M_UR90S_3` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_3`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_3`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_4/attn": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_4",
          "attn"
        ],
        "summary": "esm1v_t33_650M_UR90S_4 attn",
        "description": "Use `esm1v_t33_650M_UR90S_4` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_4`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_4`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_5/attn": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_5",
          "attn"
        ],
        "summary": "esm1v_t33_650M_UR90S_5 attn",
        "description": "Use `esm1v_t33_650M_UR90S_5` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_5`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm1v_t33_650M_UR90S_5`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t6_8M_UR50D/attn": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t6_8M_UR50D",
          "attn"
        ],
        "summary": "esm2_t6_8M_UR50D attn",
        "description": "Use `esm2_t6_8M_UR50D` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t6_8M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t6_8M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t12_35M_UR50D/attn": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t12_35M_UR50D",
          "attn"
        ],
        "summary": "esm2_t12_35M_UR50D attn",
        "description": "Use `esm2_t12_35M_UR50D` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t12_35M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t12_35M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t30_150M_UR50D/attn": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t30_150M_UR50D",
          "attn"
        ],
        "summary": "esm2_t30_150M_UR50D attn",
        "description": "Use `esm2_t30_150M_UR50D` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t30_150M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t30_150M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t33_650M_UR50D/attn": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t33_650M_UR50D",
          "attn"
        ],
        "summary": "esm2_t33_650M_UR50D attn",
        "description": "Use `esm2_t33_650M_UR50D` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t33_650M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t33_650M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t36_3B_UR50D/attn": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t36_3B_UR50D",
          "attn"
        ],
        "summary": "esm2_t36_3B_UR50D attn",
        "description": "Use `esm2_t36_3B_UR50D` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t36_3B_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esm2_t36_3B_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-300m/attn": {
      "post": {
        "tags": [
          "esmc",
          "esmc-300m",
          "attn"
        ],
        "summary": "esmc-300m attn",
        "description": "Use `esmc-300m` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esmc-300m`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esmc-300m`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-600m/attn": {
      "post": {
        "tags": [
          "esmc",
          "esmc-600m",
          "attn"
        ],
        "summary": "esmc-600m attn",
        "description": "Use `esmc-600m` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esmc-600m`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esmc-600m`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-6b/attn": {
      "post": {
        "tags": [
          "esmc",
          "esmc-6b",
          "attn"
        ],
        "summary": "esmc-6b attn",
        "description": "Use `esmc-6b` to create attention maps of your sequences.",
        "requestBody": {
          "description": "Request attention maps for datasets.",
          "content": {
            "application/json": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esmc-6b`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "AttentionRequest",
                "description": "Request for attention using `esmc-6b`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Attention request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet/logits": {
      "post": {
        "tags": [
          "openprotein",
          "poet",
          "logits"
        ],
        "summary": "poet logits",
        "description": "Request for logits from input protein sequences using `poet`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `poet`.",
                "type": "object",
                "required": [
                  "sequences",
                  "prompt_id"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `poet`.",
                "type": "object",
                "required": [
                  "variant_file",
                  "prompt_id"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet-2/logits": {
      "post": {
        "tags": [
          "openprotein",
          "poet-2",
          "logits"
        ],
        "summary": "poet-2 logits",
        "description": "Request for logits from input protein sequences using `poet-2`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `poet-2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `poet-2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/prot-seq/logits": {
      "post": {
        "tags": [
          "openprotein",
          "prot-seq",
          "logits"
        ],
        "summary": "prot-seq logits",
        "description": "Request for logits from input protein sequences using `prot-seq`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `prot-seq`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `prot-seq`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/rotaprot-large-uniref50w/logits": {
      "post": {
        "tags": [
          "openprotein",
          "rotaprot-large-uniref50w",
          "logits"
        ],
        "summary": "rotaprot-large-uniref50w logits",
        "description": "Request for logits from input protein sequences using `rotaprot-large-uniref50w`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `rotaprot-large-uniref50w`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `rotaprot-large-uniref50w`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/rotaprot-large-uniref90-ft/logits": {
      "post": {
        "tags": [
          "openprotein",
          "rotaprot-large-uniref90-ft",
          "logits"
        ],
        "summary": "rotaprot-large-uniref90-ft logits",
        "description": "Request for logits from input protein sequences using `rotaprot-large-uniref90-ft`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `rotaprot-large-uniref90-ft`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `rotaprot-large-uniref90-ft`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1b_t33_650M_UR50S/logits": {
      "post": {
        "tags": [
          "esm1",
          "esm1b_t33_650M_UR50S",
          "logits"
        ],
        "summary": "esm1b_t33_650M_UR50S logits",
        "description": "Request for logits from input protein sequences using `esm1b_t33_650M_UR50S`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1b_t33_650M_UR50S`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1b_t33_650M_UR50S`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_1/logits": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_1",
          "logits"
        ],
        "summary": "esm1v_t33_650M_UR90S_1 logits",
        "description": "Request for logits from input protein sequences using `esm1v_t33_650M_UR90S_1`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_1`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_1`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_2/logits": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_2",
          "logits"
        ],
        "summary": "esm1v_t33_650M_UR90S_2 logits",
        "description": "Request for logits from input protein sequences using `esm1v_t33_650M_UR90S_2`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_3/logits": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_3",
          "logits"
        ],
        "summary": "esm1v_t33_650M_UR90S_3 logits",
        "description": "Request for logits from input protein sequences using `esm1v_t33_650M_UR90S_3`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_3`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_3`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_4/logits": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_4",
          "logits"
        ],
        "summary": "esm1v_t33_650M_UR90S_4 logits",
        "description": "Request for logits from input protein sequences using `esm1v_t33_650M_UR90S_4`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_4`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_4`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm1v_t33_650M_UR90S_5/logits": {
      "post": {
        "tags": [
          "esm1",
          "esm1v_t33_650M_UR90S_5",
          "logits"
        ],
        "summary": "esm1v_t33_650M_UR90S_5 logits",
        "description": "Request for logits from input protein sequences using `esm1v_t33_650M_UR90S_5`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_5`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm1v_t33_650M_UR90S_5`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t6_8M_UR50D/logits": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t6_8M_UR50D",
          "logits"
        ],
        "summary": "esm2_t6_8M_UR50D logits",
        "description": "Request for logits from input protein sequences using `esm2_t6_8M_UR50D`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t6_8M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t6_8M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t12_35M_UR50D/logits": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t12_35M_UR50D",
          "logits"
        ],
        "summary": "esm2_t12_35M_UR50D logits",
        "description": "Request for logits from input protein sequences using `esm2_t12_35M_UR50D`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t12_35M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t12_35M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t30_150M_UR50D/logits": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t30_150M_UR50D",
          "logits"
        ],
        "summary": "esm2_t30_150M_UR50D logits",
        "description": "Request for logits from input protein sequences using `esm2_t30_150M_UR50D`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t30_150M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t30_150M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t33_650M_UR50D/logits": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t33_650M_UR50D",
          "logits"
        ],
        "summary": "esm2_t33_650M_UR50D logits",
        "description": "Request for logits from input protein sequences using `esm2_t33_650M_UR50D`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t33_650M_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t33_650M_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm2_t36_3B_UR50D/logits": {
      "post": {
        "tags": [
          "esm2",
          "esm2_t36_3B_UR50D",
          "logits"
        ],
        "summary": "esm2_t36_3B_UR50D logits",
        "description": "Request for logits from input protein sequences using `esm2_t36_3B_UR50D`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t36_3B_UR50D`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esm2_t36_3B_UR50D`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-300m/logits": {
      "post": {
        "tags": [
          "esmc",
          "esmc-300m",
          "logits"
        ],
        "summary": "esmc-300m logits",
        "description": "Request for logits from input protein sequences using `esmc-300m`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esmc-300m`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esmc-300m`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-600m/logits": {
      "post": {
        "tags": [
          "esmc",
          "esmc-600m",
          "logits"
        ],
        "summary": "esmc-600m logits",
        "description": "Request for logits from input protein sequences using `esmc-600m`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esmc-600m`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esmc-600m`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esmc-6b/logits": {
      "post": {
        "tags": [
          "esmc",
          "esmc-6b",
          "logits"
        ],
        "summary": "esmc-6b logits",
        "description": "Request for logits from input protein sequences using `esmc-6b`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esmc-6b`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `esmc-6b`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/ablang2/logits": {
      "post": {
        "tags": [
          "community",
          "antibody",
          "ablang2",
          "logits"
        ],
        "summary": "ablang2 logits",
        "description": "Request for logits from input protein sequences using `ablang2`.\n\nThese logits represent the probability per amino acid for each position within the input sequences.",
        "requestBody": {
          "description": "Request for logits.\n\nVarious models may have specific arguments that are required.",
          "content": {
            "application/json": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `ablang2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "LogitsRequest",
                "description": "Request for logits using `ablang2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Logits request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet/score": {
      "post": {
        "tags": [
          "openprotein",
          "poet",
          "score"
        ],
        "summary": "poet score",
        "description": "Use `poet` to score sequences.",
        "requestBody": {
          "description": "Request scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "ScoreRequest",
                "description": "Request for scores using `poet`.",
                "type": "object",
                "required": [
                  "sequences",
                  "prompt_id"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "ScoreRequest",
                "description": "Request for scores using `poet`.",
                "type": "object",
                "required": [
                  "variant_file",
                  "prompt_id"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScoreJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet-2/score": {
      "post": {
        "tags": [
          "openprotein",
          "poet-2",
          "score"
        ],
        "summary": "poet-2 score",
        "description": "Use `poet-2` to score sequences.",
        "requestBody": {
          "description": "Request scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "ScoreRequest",
                "description": "Request for scores using `poet-2`.",
                "type": "object",
                "required": [
                  "sequences"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "ScoreRequest",
                "description": "Request for scores using `poet-2`.",
                "type": "object",
                "required": [
                  "variant_file"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScoreJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm-if1/score": {
      "post": {
        "tags": [
          "community",
          "esm-if1",
          "score"
        ],
        "summary": "esm-if1 score",
        "description": "Use `esm-if1` to score sequences.",
        "requestBody": {
          "description": "Request scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "ScoreRequest",
                "description": "Request for scores using `esm-if1`.",
                "type": "object",
                "required": [
                  "sequences",
                  "query_id"
                ],
                "properties": {
                  "sequences": {
                    "title": "Sequences",
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Sequence"
                    }
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "ScoreRequest",
                "description": "Request for scores using `esm-if1`.",
                "type": "object",
                "required": [
                  "variant_file",
                  "query_id"
                ],
                "properties": {
                  "variant_file": {
                    "type": "string",
                    "format": "binary",
                    "description": "File containing input sequences/variants."
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ScoreJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet/score/indel": {
      "post": {
        "tags": [
          "openprotein",
          "poet",
          "score"
        ],
        "summary": "poet score/indel",
        "description": "Use `poet` to score indels of a sequence.",
        "requestBody": {
          "description": "Request indel scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "IndelScoreRequest",
                "description": "Request for indel scores using `poet`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "prompt_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "insert": {
                    "type": "string",
                    "description": "Sequence to insert.",
                    "nullable": true,
                    "default": null
                  },
                  "delete": {
                    "type": "integer",
                    "description": "Number of amino acids to delete from base sequence.",
                    "nullable": true,
                    "default": null
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              },
              "examples": {
                "Insertion": {
                  "value": {
                    "base_sequence": "MSKGEELFTGV",
                    "insert": "GGE",
                    "prompt_id": "5f35c29c-b071-47db-9980-74cdbbe6ca96"
                  }
                },
                "Deletion": {
                  "value": {
                    "base_sequence": "MSKGEELFTGV",
                    "delete": 1,
                    "prompt_id": "5f35c29c-b071-47db-9980-74cdbbe6ca96"
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "IndelScoreRequest",
                "description": "Request for indel scores using `poet`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "prompt_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "insert": {
                    "type": "string",
                    "description": "Sequence to insert.",
                    "nullable": true,
                    "default": null
                  },
                  "delete": {
                    "type": "integer",
                    "description": "Number of amino acids to delete from base sequence.",
                    "nullable": true,
                    "default": null
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Indel score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet-2/score/indel": {
      "post": {
        "tags": [
          "openprotein",
          "poet-2",
          "score"
        ],
        "summary": "poet-2 score/indel",
        "description": "Use `poet-2` to score indels of a sequence.",
        "requestBody": {
          "description": "Request indel scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "IndelScoreRequest",
                "description": "Request for indel scores using `poet-2`.",
                "type": "object",
                "required": [
                  "base_sequence"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "insert": {
                    "type": "string",
                    "description": "Sequence to insert.",
                    "nullable": true,
                    "default": null
                  },
                  "delete": {
                    "type": "integer",
                    "description": "Number of amino acids to delete from base sequence.",
                    "nullable": true,
                    "default": null
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              },
              "examples": {
                "Insertion": {
                  "value": {
                    "base_sequence": "MSKGEELFTGV",
                    "insert": "GGE",
                    "prompt_id": "5f35c29c-b071-47db-9980-74cdbbe6ca96"
                  }
                },
                "Deletion": {
                  "value": {
                    "base_sequence": "MSKGEELFTGV",
                    "delete": 1,
                    "prompt_id": "5f35c29c-b071-47db-9980-74cdbbe6ca96"
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "IndelScoreRequest",
                "description": "Request for indel scores using `poet-2`.",
                "type": "object",
                "required": [
                  "base_sequence"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "insert": {
                    "type": "string",
                    "description": "Sequence to insert.",
                    "nullable": true,
                    "default": null
                  },
                  "delete": {
                    "type": "integer",
                    "description": "Number of amino acids to delete from base sequence.",
                    "nullable": true,
                    "default": null
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Indel score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm-if1/score/indel": {
      "post": {
        "tags": [
          "community",
          "esm-if1",
          "score"
        ],
        "summary": "esm-if1 score/indel",
        "description": "Use `esm-if1` to score indels of a sequence.",
        "requestBody": {
          "description": "Request indel scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "IndelScoreRequest",
                "description": "Request for indel scores using `esm-if1`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "query_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "insert": {
                    "type": "string",
                    "description": "Sequence to insert.",
                    "nullable": true,
                    "default": null
                  },
                  "delete": {
                    "type": "integer",
                    "description": "Number of amino acids to delete from base sequence.",
                    "nullable": true,
                    "default": null
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              },
              "examples": {
                "Insertion": {
                  "value": {
                    "base_sequence": "MSKGEELFTGV",
                    "insert": "GGE",
                    "prompt_id": "5f35c29c-b071-47db-9980-74cdbbe6ca96"
                  }
                },
                "Deletion": {
                  "value": {
                    "base_sequence": "MSKGEELFTGV",
                    "delete": 1,
                    "prompt_id": "5f35c29c-b071-47db-9980-74cdbbe6ca96"
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "IndelScoreRequest",
                "description": "Request for indel scores using `esm-if1`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "query_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "insert": {
                    "type": "string",
                    "description": "Sequence to insert.",
                    "nullable": true,
                    "default": null
                  },
                  "delete": {
                    "type": "integer",
                    "description": "Number of amino acids to delete from base sequence.",
                    "nullable": true,
                    "default": null
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Indel score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet/score/single_site": {
      "post": {
        "tags": [
          "openprotein",
          "poet",
          "score"
        ],
        "summary": "poet score/single_site",
        "description": "Use `poet` to score single site mutations of a sequence.",
        "requestBody": {
          "description": "Request single-site scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "SingleSiteScoreRequest",
                "description": "Request for scores using `poet`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "prompt_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "SingleSiteScoreRequest",
                "description": "Request for scores using `poet`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "prompt_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Single-site score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet-2/score/single_site": {
      "post": {
        "tags": [
          "openprotein",
          "poet-2",
          "score"
        ],
        "summary": "poet-2 score/single_site",
        "description": "Use `poet-2` to score single site mutations of a sequence.",
        "requestBody": {
          "description": "Request single-site scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "SingleSiteScoreRequest",
                "description": "Request for scores using `poet-2`.",
                "type": "object",
                "required": [
                  "base_sequence"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "SingleSiteScoreRequest",
                "description": "Request for scores using `poet-2`.",
                "type": "object",
                "required": [
                  "base_sequence"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Single-site score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/esm-if1/score/single_site": {
      "post": {
        "tags": [
          "community",
          "esm-if1",
          "score"
        ],
        "summary": "esm-if1 score/single_site",
        "description": "Use `esm-if1` to score single site mutations of a sequence.",
        "requestBody": {
          "description": "Request single-site scoring for sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "SingleSiteScoreRequest",
                "description": "Request for scores using `esm-if1`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "query_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "SingleSiteScoreRequest",
                "description": "Request for scores using `esm-if1`.",
                "type": "object",
                "required": [
                  "base_sequence",
                  "query_id"
                ],
                "properties": {
                  "base_sequence": {
                    "$ref": "#/components/schemas/Sequence"
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Single-site score request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Job"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ],
        "x-codegen-request-body-name": "request"
      }
    },
    "/api/v1/embeddings/models/poet/generate": {
      "post": {
        "tags": [
          "openprotein",
          "poet",
          "generate"
        ],
        "summary": "poet generate",
        "description": "Use `poet` to generate sequences based on score.",
        "requestBody": {
          "description": "Request generate sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `poet`.",
                "type": "object",
                "required": [
                  "n_sequences",
                  "prompt_id"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "top_k": {
                    "type": "number",
                    "default": 20,
                    "example": 20,
                    "description": "Top K for generate."
                  },
                  "top_p": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Top P for generate."
                  },
                  "temperature": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Temperature for generate."
                  },
                  "maxlen": {
                    "type": "integer",
                    "default": 1000,
                    "example": 1000,
                    "minimum": 1,
                    "description": "Maximum length of generated sequence."
                  },
                  "seed": {
                    "type": "integer",
                    "nullable": true,
                    "description": "Random seed to use for generating sequences."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `poet`.",
                "type": "object",
                "required": [
                  "n_sequences",
                  "prompt_id"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "top_k": {
                    "type": "number",
                    "default": 20,
                    "example": 20,
                    "description": "Top K for generate."
                  },
                  "top_p": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Top P for generate."
                  },
                  "temperature": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Temperature for generate."
                  },
                  "maxlen": {
                    "type": "integer",
                    "default": 1000,
                    "example": 1000,
                    "minimum": 1,
                    "description": "Maximum length of generated sequence."
                  },
                  "seed": {
                    "type": "integer",
                    "nullable": true,
                    "description": "Random seed to use for generating sequences."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt job."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Generate request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GenerateJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/models/poet-2/generate": {
      "post": {
        "tags": [
          "openprotein",
          "poet-2",
          "generate"
        ],
        "summary": "poet-2 generate",
        "description": "Use `poet-2` to generate sequences based on score.",
        "requestBody": {
          "description": "Request generate sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `poet-2`.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of query."
                  },
                  "top_k": {
                    "type": "number",
                    "default": 20,
                    "example": 20,
                    "description": "Top K for generate."
                  },
                  "top_p": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Top P for generate."
                  },
                  "temperature": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Temperature for generate."
                  },
                  "maxlen": {
                    "type": "integer",
                    "default": 1000,
                    "example": 1000,
                    "minimum": 1,
                    "description": "Maximum length of generated sequence."
                  },
                  "seed": {
                    "type": "integer",
                    "nullable": true,
                    "description": "Random seed to use for generating sequences."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `poet-2`.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of query."
                  },
                  "top_k": {
                    "type": "number",
                    "default": 20,
                    "example": 20,
                    "description": "Top K for generate."
                  },
                  "top_p": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Top P for generate."
                  },
                  "temperature": {
                    "type": "number",
                    "default": 1,
                    "example": 1,
                    "description": "Temperature for generate."
                  },
                  "maxlen": {
                    "type": "integer",
                    "default": 1000,
                    "example": 1000,
                    "minimum": 1,
                    "description": "Maximum length of generated sequence."
                  },
                  "seed": {
                    "type": "integer",
                    "nullable": true,
                    "description": "Random seed to use for generating sequences."
                  },
                  "prompt_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of prompt."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Generate request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GenerateJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/models/proteinmpnn/generate": {
      "post": {
        "tags": [
          "community",
          "proteinmpnn",
          "generate"
        ],
        "summary": "proteinmpnn generate",
        "description": "Use `proteinmpnn` to generate sequences based on score.",
        "requestBody": {
          "description": "Request generate sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `proteinmpnn`.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB structure"
                  },
                  "start_index": {
                    "type": "integer",
                    "description": "Generate start index",
                    "default": 0
                  },
                  "model_name": {
                    "type": "string",
                    "enum": [
                      "v_48_002",
                      "v_48_010",
                      "v_48_020",
                      "v_48_030"
                    ],
                    "description": "ProteinMPNN model version"
                  },
                  "ca_only": {
                    "type": "boolean",
                    "description": "Use CA-only model (v_48_002, v_48_010, v_48_020 only)"
                  },
                  "soluble_model": {
                    "type": "boolean",
                    "description": "Use soluble model (v_48_010, v_48_020 only)"
                  },
                  "temperature": {
                    "type": "number",
                    "format": "float",
                    "default": 0.1
                  },
                  "backbone_noise": {
                    "type": "number",
                    "format": "float"
                  },
                  "chains_to_design": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "fixed_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "omit_aas_global": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "omit_aas_per_chain_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "positions": {
                            "type": "array",
                            "items": {
                              "type": "integer"
                            }
                          },
                          "aas": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  },
                  "aa_bias_global": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "number",
                      "format": "float"
                    }
                  },
                  "aa_bias_per_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "array",
                        "items": {
                          "type": "number",
                          "format": "float"
                        }
                      }
                    }
                  },
                  "pssm": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "pssm_coef": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_bias": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_log_odds": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        }
                      }
                    }
                  },
                  "pssm_multi": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_threshold": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_log_odds": {
                    "type": "boolean"
                  },
                  "pssm_bias": {
                    "type": "boolean"
                  },
                  "tie_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "score_only": {
                    "type": "boolean"
                  },
                  "input_sequences": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "description": "Required if score_only is true"
                  },
                  "probabilities_output_mode": {
                    "type": "string",
                    "enum": [
                      "none",
                      "per_position",
                      "conditional",
                      "conditional_backbone",
                      "unconditional"
                    ]
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `proteinmpnn`.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB structure"
                  },
                  "start_index": {
                    "type": "integer",
                    "description": "Generate start index",
                    "default": 0
                  },
                  "model_name": {
                    "type": "string",
                    "enum": [
                      "v_48_002",
                      "v_48_010",
                      "v_48_020",
                      "v_48_030"
                    ],
                    "description": "ProteinMPNN model version"
                  },
                  "ca_only": {
                    "type": "boolean",
                    "description": "Use CA-only model (v_48_002, v_48_010, v_48_020 only)"
                  },
                  "soluble_model": {
                    "type": "boolean",
                    "description": "Use soluble model (v_48_010, v_48_020 only)"
                  },
                  "temperature": {
                    "type": "number",
                    "format": "float",
                    "default": 0.1
                  },
                  "backbone_noise": {
                    "type": "number",
                    "format": "float"
                  },
                  "chains_to_design": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "fixed_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "omit_aas_global": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "omit_aas_per_chain_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "positions": {
                            "type": "array",
                            "items": {
                              "type": "integer"
                            }
                          },
                          "aas": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  },
                  "aa_bias_global": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "number",
                      "format": "float"
                    }
                  },
                  "aa_bias_per_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "array",
                        "items": {
                          "type": "number",
                          "format": "float"
                        }
                      }
                    }
                  },
                  "pssm": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "pssm_coef": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_bias": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_log_odds": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        }
                      }
                    }
                  },
                  "pssm_multi": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_threshold": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_log_odds": {
                    "type": "boolean"
                  },
                  "pssm_bias": {
                    "type": "boolean"
                  },
                  "tie_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "score_only": {
                    "type": "boolean"
                  },
                  "input_sequences": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "description": "Required if score_only is true"
                  },
                  "probabilities_output_mode": {
                    "type": "string",
                    "enum": [
                      "none",
                      "per_position",
                      "conditional",
                      "conditional_backbone",
                      "unconditional"
                    ]
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Generate request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GenerateJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/models/solublempnn/generate": {
      "post": {
        "tags": [
          "community",
          "solublempnn",
          "generate"
        ],
        "summary": "solublempnn generate",
        "description": "Use `solublempnn` to generate sequences based on score.",
        "requestBody": {
          "description": "Request generate sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `solublempnn`.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB structure"
                  },
                  "start_index": {
                    "type": "integer",
                    "description": "Generate start index",
                    "default": 0
                  },
                  "model_name": {
                    "type": "string",
                    "enum": [
                      "v_48_010",
                      "v_48_020"
                    ],
                    "default": "v_48_020",
                    "description": "ProteinMPNN soluble-model version (restricted to soluble-compatible weights)"
                  },
                  "ca_only": {
                    "type": "boolean",
                    "description": "Use CA-only model"
                  },
                  "temperature": {
                    "type": "number",
                    "format": "float",
                    "default": 0.1
                  },
                  "backbone_noise": {
                    "type": "number",
                    "format": "float"
                  },
                  "chains_to_design": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "fixed_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "omit_aas_global": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "omit_aas_per_chain_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "positions": {
                            "type": "array",
                            "items": {
                              "type": "integer"
                            }
                          },
                          "aas": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  },
                  "aa_bias_global": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "number",
                      "format": "float"
                    }
                  },
                  "aa_bias_per_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "array",
                        "items": {
                          "type": "number",
                          "format": "float"
                        }
                      }
                    }
                  },
                  "pssm": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "pssm_coef": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_bias": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_log_odds": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        }
                      }
                    }
                  },
                  "pssm_multi": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_threshold": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_log_odds": {
                    "type": "boolean"
                  },
                  "pssm_bias": {
                    "type": "boolean"
                  },
                  "tie_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "score_only": {
                    "type": "boolean"
                  },
                  "input_sequences": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "description": "Required if score_only is true"
                  },
                  "probabilities_output_mode": {
                    "type": "string",
                    "enum": [
                      "none",
                      "per_position",
                      "conditional",
                      "conditional_backbone",
                      "unconditional"
                    ]
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `solublempnn`.",
                "type": "object",
                "required": [
                  "n_sequences"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB structure"
                  },
                  "start_index": {
                    "type": "integer",
                    "description": "Generate start index",
                    "default": 0
                  },
                  "model_name": {
                    "type": "string",
                    "enum": [
                      "v_48_010",
                      "v_48_020"
                    ],
                    "default": "v_48_020",
                    "description": "ProteinMPNN soluble-model version (restricted to soluble-compatible weights)"
                  },
                  "ca_only": {
                    "type": "boolean",
                    "description": "Use CA-only model"
                  },
                  "temperature": {
                    "type": "number",
                    "format": "float",
                    "default": 0.1
                  },
                  "backbone_noise": {
                    "type": "number",
                    "format": "float"
                  },
                  "chains_to_design": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "fixed_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "omit_aas_global": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "omit_aas_per_chain_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "positions": {
                            "type": "array",
                            "items": {
                              "type": "integer"
                            }
                          },
                          "aas": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  },
                  "aa_bias_global": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "number",
                      "format": "float"
                    }
                  },
                  "aa_bias_per_position": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "array",
                      "items": {
                        "type": "array",
                        "items": {
                          "type": "number",
                          "format": "float"
                        }
                      }
                    }
                  },
                  "pssm": {
                    "type": "object",
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "pssm_coef": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_bias": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        },
                        "pssm_log_odds": {
                          "type": "array",
                          "items": {
                            "type": "number",
                            "format": "float"
                          }
                        }
                      }
                    }
                  },
                  "pssm_multi": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_threshold": {
                    "type": "number",
                    "format": "float"
                  },
                  "pssm_log_odds": {
                    "type": "boolean"
                  },
                  "pssm_bias": {
                    "type": "boolean"
                  },
                  "tie_positions": {
                    "type": "array",
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    }
                  },
                  "score_only": {
                    "type": "boolean"
                  },
                  "input_sequences": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "description": "Required if score_only is true"
                  },
                  "probabilities_output_mode": {
                    "type": "string",
                    "enum": [
                      "none",
                      "per_position",
                      "conditional",
                      "conditional_backbone",
                      "unconditional"
                    ]
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Generate request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GenerateJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    },
    "/api/v1/embeddings/models/esm-if1/generate": {
      "post": {
        "tags": [
          "community",
          "esm-if1",
          "generate"
        ],
        "summary": "esm-if1 generate",
        "description": "Use `esm-if1` to generate sequences based on score.",
        "requestBody": {
          "description": "Request generate sequences.",
          "content": {
            "application/json": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `esm-if1`.",
                "type": "object",
                "required": [
                  "n_sequences",
                  "query_id"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "design_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of a design to use as the structure source (alternative to query_id)."
                  },
                  "temperature": {
                    "type": "number",
                    "format": "float",
                    "default": 1,
                    "example": 1,
                    "minimum": 0,
                    "description": "Temperature for generate."
                  },
                  "seed": {
                    "type": "integer",
                    "nullable": true,
                    "description": "Random seed to use for generating sequences."
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              }
            },
            "multipart/form-data": {
              "schema": {
                "title": "GenerateRequest",
                "description": "Request for generate sequences using `esm-if1`.",
                "type": "object",
                "required": [
                  "n_sequences",
                  "query_id"
                ],
                "properties": {
                  "n_sequences": {
                    "title": "Number of Sequences",
                    "type": "integer",
                    "minimum": 1,
                    "default": 100,
                    "example": 100
                  },
                  "design_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of a design to use as the structure source (alternative to query_id)."
                  },
                  "temperature": {
                    "type": "number",
                    "format": "float",
                    "default": 1,
                    "example": 1,
                    "minimum": 0,
                    "description": "Temperature for generate."
                  },
                  "seed": {
                    "type": "integer",
                    "nullable": true,
                    "description": "Random seed to use for generating sequences."
                  },
                  "query_id": {
                    "type": "string",
                    "format": "uuid",
                    "description": "ID of the uploaded PDB/CIF structure to condition on."
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "202": {
            "description": "Generate request created and pending",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GenerateJob"
                }
              }
            }
          },
          "400": {
            "description": "Validation errors in the submitted request.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "404": {
            "description": "Model not found.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          },
          "422": {
            "description": "Unexpected request format. The submitted request body cannot be validated. Double check the schema.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ValidationError"
                }
              }
            }
          },
          "429": {
            "description": "Too many requests. Try again later.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        },
        "security": [
          {
            "oauth2": []
          }
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "oauth2": {
        "type": "oauth2",
        "flows": {
          "password": {
            "tokenUrl": "/api/v1/auth/login",
            "scopes": {}
          }
        }
      }
    },
    "schemas": {
      "ModelID": {
        "title": "ModelID",
        "description": "ID of model to be used.",
        "type": "string"
      },
      "ModelDescription": {
        "title": "ModelDescription",
        "description": "Description of the model including relevant citations.",
        "type": "object",
        "properties": {
          "summary": {
            "title": "Summary",
            "description": "Summary of the model description.",
            "type": "string"
          },
          "citation_title": {
            "title": "CitationTitle",
            "description": "Title of the citation for the model.",
            "type": "string"
          },
          "doi": {
            "title": "DOI",
            "description": "DOI of the citation for the model.",
            "type": "string"
          }
        }
      },
      "Token": {
        "title": "TokenDetails",
        "description": "Details of token.",
        "required": [
          "id",
          "description",
          "primary",
          "token"
        ],
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "description": "Token ID"
          },
          "token": {
            "type": "string",
            "description": "The token's string representation"
          },
          "description": {
            "type": "string",
            "description": "Meaning of this token"
          },
          "primary": {
            "type": "boolean",
            "description": "When a token id represents multiple tokens, this flag indicates whether or not this is the primary token."
          }
        }
      },
      "ModelMetadata": {
        "title": "ModelMetadata",
        "description": "Metadata of protein language model.",
        "required": [
          "dimension",
          "description",
          "input_tokens",
          "max_sequence_length",
          "model_id",
          "output_tokens",
          "output_types",
          "token_descriptions"
        ],
        "type": "object",
        "properties": {
          "model_id": {
            "$ref": "#/components/schemas/ModelID"
          },
          "description": {
            "$ref": "#/components/schemas/ModelDescription"
          },
          "dimension": {
            "type": "integer",
            "description": "Output dimensions of the model. Returns `-1` if irrelevant."
          },
          "input_tokens": {
            "type": "array",
            "description": "List of valid input tokens.",
            "example": [
              "A",
              "R",
              "N"
            ],
            "items": {
              "type": "string"
            }
          },
          "max_sequence_length": {
            "type": "integer",
            "description": "Maximum sequence length supported by model."
          },
          "output_tokens": {
            "type": "array",
            "description": "List of output tokens ordered by token id. Use this to decode logits.",
            "example": [
              "A",
              "R",
              "N"
            ],
            "items": {
              "type": "string"
            }
          },
          "output_types": {
            "type": "array",
            "description": "Outputs supported by the model.",
            "items": {
              "type": "string"
            }
          },
          "token_descriptions": {
            "type": "array",
            "description": "Description of all tokens, ordered by token id. The nth item describes the token(s) represented by token id `n`.\nSome token ids can represent multiple tokens.",
            "items": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Token"
              }
            }
          }
        }
      },
      "Error": {
        "title": "Error",
        "description": "A error object providing details of the error.",
        "required": [
          "detail"
        ],
        "type": "object",
        "properties": {
          "detail": {
            "title": "Detail",
            "type": "string"
          }
        }
      },
      "JobID": {
        "title": "JobID",
        "description": "ID of job.",
        "type": "string",
        "format": "uuid",
        "x-order": 1
      },
      "CreatedDate": {
        "title": "Created Date",
        "description": "Datetime of created object",
        "type": "string",
        "format": "date-time",
        "example": "2024-01-01T12:34:56.789Z",
        "x-order": 4
      },
      "JobStatus": {
        "title": "JobStatus",
        "description": "Status of job.",
        "type": "string",
        "enum": [
          "PENDING",
          "RUNNING",
          "SUCCESS",
          "FAILURE"
        ],
        "x-order": 7
      },
      "Request": {
        "title": "Request",
        "description": "Request for our compute platform.",
        "type": "object",
        "required": [
          "job_id",
          "prerequisite_job_id",
          "created_date",
          "start_date",
          "end_date",
          "status",
          "progress_counter"
        ],
        "properties": {
          "job_id": {
            "$ref": "#/components/schemas/JobID"
          },
          "prerequisite_job_id": {
            "title": "PrerequisiteJobID",
            "description": "Prerequisite job ID.",
            "type": "string",
            "format": "uuid",
            "nullable": true,
            "default": null,
            "example": null,
            "x-order": 2
          },
          "created_date": {
            "$ref": "#/components/schemas/CreatedDate"
          },
          "start_date": {
            "title": "StartDate",
            "description": "Start date of job.",
            "type": "string",
            "format": "date-time",
            "nullable": true,
            "example": null,
            "default": null,
            "x-order": 5
          },
          "end_date": {
            "title": "EndDate",
            "description": "End date of job.",
            "type": "string",
            "format": "date-time",
            "nullable": true,
            "example": null,
            "default": null,
            "x-order": 6
          },
          "status": {
            "$ref": "#/components/schemas/JobStatus"
          },
          "progress_counter": {
            "title": "ProgressCounter",
            "description": "Counter of the progress of job from 0 to 100.",
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
            "example": 0,
            "default": 0,
            "x-order": 8
          }
        }
      },
      "Reduction": {
        "title": "Reduction",
        "description": "Type of reduction to use with embeddings.",
        "type": "string",
        "enum": [
          "MEAN",
          "SUM"
        ]
      },
      "Embed": {
        "title": "Embeddings",
        "description": "Embeddings request metadata.",
        "allOf": [
          {
            "$ref": "#/components/schemas/Request"
          },
          {
            "type": "object",
            "required": [
              "model_id",
              "n_sequences"
            ],
            "properties": {
              "model_id": {
                "type": "string",
                "example": "poet-2"
              },
              "n_sequences": {
                "type": "integer"
              },
              "reduction": {
                "allOf": [
                  {
                    "$ref": "#/components/schemas/Reduction"
                  },
                  {
                    "nullable": true
                  }
                ]
              }
            }
          }
        ]
      },
      "Sequence": {
        "title": "Sequence",
        "description": "Protein sequence",
        "type": "string",
        "example": "MSKGEELFTGV"
      },
      "JobType": {
        "title": "JobType",
        "description": "Type of job.",
        "type": "string",
        "enum": [
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
          "/clustering/hierarchical",
          "/design"
        ],
        "x-order": 3
      },
      "Job": {
        "title": "Job",
        "description": "Job represents a job for our compute platform.",
        "allOf": [
          {
            "$ref": "#/components/schemas/Request"
          },
          {
            "type": "object",
            "required": [
              "job_type"
            ],
            "properties": {
              "job_type": {
                "$ref": "#/components/schemas/JobType"
              }
            }
          }
        ]
      },
      "ValidationError": {
        "title": "ValidationError",
        "description": "An invalid object that could not be parsed.",
        "type": "object",
        "properties": {
          "detail": {
            "title": "ErrorDetailList",
            "type": "array",
            "items": {
              "title": "ErrorDetail",
              "required": [
                "loc",
                "msg",
                "type"
              ],
              "type": "object",
              "properties": {
                "loc": {
                  "title": "Location",
                  "type": "array",
                  "items": {
                    "type": "integer"
                  }
                },
                "msg": {
                  "title": "Message",
                  "type": "string"
                },
                "type": {
                  "title": "Error Type",
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "SVDMetadata": {
        "title": "SVDMetadata",
        "required": [
          "model_id"
        ],
        "type": "object",
        "properties": {
          "created_date": {
            "type": "string",
            "format": "date-time"
          },
          "id": {
            "type": "string"
          },
          "model_id": {
            "type": "string"
          },
          "n_components": {
            "minimum": 1,
            "type": "integer",
            "example": 1024
          },
          "reduction": {
            "type": "string",
            "description": "e.g. MEAN, nil",
            "example": "MEAN"
          },
          "sequence_length": {
            "type": "integer",
            "description": "used to check if input emb features will match"
          },
          "status": {
            "type": "string",
            "example": "PENDING"
          }
        }
      },
      "ClusteringMetadata": {
        "title": "ClusteringMetadata",
        "required": [
          "model_id",
          "linkage_method",
          "metric"
        ],
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "created_date": {
            "type": "string",
            "format": "date-time"
          },
          "status": {
            "type": "string",
            "example": "PENDING"
          },
          "method": {
            "type": "string",
            "description": "Clustering method used.",
            "example": "hierarchical",
            "enum": [
              "hierarchical"
            ]
          },
          "linkage_method": {
            "type": "string",
            "description": "Scipy linkage method.",
            "example": "ward",
            "enum": [
              "ward",
              "single",
              "complete",
              "average",
              "weighted",
              "centroid",
              "median"
            ]
          },
          "metric": {
            "type": "string",
            "description": "Distance metric for pairwise computation.",
            "example": "euclidean",
            "enum": [
              "euclidean",
              "cosine",
              "correlation",
              "hamming",
              "chebyshev",
              "cityblock",
              "sqeuclidean",
              "canberra",
              "braycurtis"
            ]
          },
          "reduction": {
            "type": "string",
            "description": "Reduction applied to per-residue embeddings before clustering. Required for PLM feature_type.",
            "example": "MEAN"
          },
          "feature_type": {
            "type": "string",
            "description": "Type of input features.",
            "example": "PLM",
            "enum": [
              "PLM",
              "SVD"
            ]
          },
          "model_id": {
            "type": "string",
            "description": "Embedding model used as input features."
          },
          "svd_id": {
            "type": "string",
            "format": "uuid",
            "description": "SVD model ID when feature_type is SVD."
          },
          "n_leaves": {
            "type": "integer",
            "description": "Number of input sequences (leaves in the dendrogram)."
          },
          "hash": {
            "type": "string",
            "description": "Content hash for caching."
          }
        }
      },
      "ClusteringResult": {
        "title": "ClusteringResult",
        "description": "Clustering result. Shape depends on clustering method. For hierarchical, contains a linkage matrix and leaf order for dendrogram rendering.",
        "required": [
          "n_leaves",
          "linkage",
          "leaf_order"
        ],
        "type": "object",
        "properties": {
          "n_leaves": {
            "type": "integer",
            "description": "Number of leaf nodes (input sequences).",
            "example": 3
          },
          "linkage": {
            "type": "array",
            "description": "Scipy linkage matrix with shape (N-1, 4). Each row is\n[cluster_a, cluster_b, distance, n_observations]. Cluster IDs and\nobservation counts are integers; distances are floats.\n",
            "items": {
              "type": "array",
              "items": {
                "type": "number"
              },
              "minItems": 4,
              "maxItems": 4
            },
            "example": [
              [
                0,
                1,
                0.12,
                2
              ],
              [
                3,
                2,
                0.43,
                3
              ]
            ]
          },
          "leaf_order": {
            "type": "array",
            "description": "Leaf indices in dendrogram-traversal order (from scipy leaves_list).\nIndices are 0-based positions into the input sequence list.\n",
            "items": {
              "type": "integer"
            },
            "example": [
              0,
              1,
              2
            ]
          }
        }
      },
      "EmbedJob": {
        "title": "EmbedJob",
        "description": "EmbedJob represents a embed job for our platform.",
        "allOf": [
          {
            "$ref": "#/components/schemas/Job"
          },
          {
            "type": "object",
            "properties": {
              "job_type": {
                "type": "string",
                "example": "/embeddings/embed"
              }
            }
          }
        ]
      },
      "ScoreJob": {
        "title": "ScoreJob",
        "description": "ScoreJob represents a score job for our platform.",
        "allOf": [
          {
            "$ref": "#/components/schemas/Job"
          },
          {
            "type": "object",
            "properties": {
              "job_type": {
                "type": "string",
                "example": "/embeddings/score"
              }
            }
          }
        ]
      },
      "IndelScoreRequest": {
        "title": "IndelScoreRequest",
        "description": "Request for indel scores using `%model_id%`.",
        "type": "object",
        "required": [
          "base_sequence"
        ],
        "properties": {
          "base_sequence": {
            "$ref": "#/components/schemas/Sequence"
          },
          "insert": {
            "type": "string",
            "description": "Sequence to insert.",
            "nullable": true,
            "default": null
          },
          "delete": {
            "type": "integer",
            "description": "Number of amino acids to delete from base sequence.",
            "nullable": true,
            "default": null
          }
        }
      },
      "GenerateJob": {
        "title": "GenerateJob",
        "description": "GenerateJob represents a generate job for our platform.",
        "allOf": [
          {
            "$ref": "#/components/schemas/Job"
          },
          {
            "type": "object",
            "properties": {
              "job_type": {
                "type": "string",
                "example": "/embeddings/generate"
              }
            }
          }
        ]
      }
    }
  },
  "tags": [
    {
      "name": "embeddings",
      "description": "Run computations with our embeddings models"
    },
    {
      "name": "svd",
      "description": "Fit SVDs to use for reduced embeddings"
    },
    {
      "name": "embed",
      "description": "Request for embeddings"
    },
    {
      "name": "logits",
      "description": "Request for logits"
    },
    {
      "name": "attn",
      "description": "Request attention maps"
    },
    {
      "name": "score",
      "description": "Request sequence scores"
    },
    {
      "name": "generate",
      "description": "Generate sequences"
    },
    {
      "name": "clustering",
      "description": "Clustering on protein embeddings"
    },
    {
      "name": "openprotein",
      "description": "Proprietary protein language models developed in-house."
    },
    {
      "name": "poet",
      "description": "poet"
    },
    {
      "name": "poet-2",
      "description": "poet-2"
    },
    {
      "name": "prot-seq",
      "description": "prot-seq"
    },
    {
      "name": "rotaprot-large-uniref50w",
      "description": "rotaprot-large-uniref50w"
    },
    {
      "name": "rotaprot-large-uniref90-ft",
      "description": "rotaprot-large-uniref90-ft"
    },
    {
      "name": "esm1",
      "description": "Community based ESM1 models, with different versions having different model parameters and training data."
    },
    {
      "name": "esm1b_t33_650M_UR50S",
      "description": "esm1b_t33_650M_UR50S"
    },
    {
      "name": "esm1v_t33_650M_UR90S_1",
      "description": "esm1v_t33_650M_UR90S_1"
    },
    {
      "name": "esm1v_t33_650M_UR90S_2",
      "description": "esm1v_t33_650M_UR90S_2"
    },
    {
      "name": "esm1v_t33_650M_UR90S_3",
      "description": "esm1v_t33_650M_UR90S_3"
    },
    {
      "name": "esm1v_t33_650M_UR90S_4",
      "description": "esm1v_t33_650M_UR90S_4"
    },
    {
      "name": "esm1v_t33_650M_UR90S_5",
      "description": "esm1v_t33_650M_UR90S_5"
    },
    {
      "name": "esm2",
      "description": "Community based ESM2 models, with different versions having different model parameters and training data."
    },
    {
      "name": "esm2_t6_8M_UR50D",
      "description": "esm2_t6_8M_UR50D"
    },
    {
      "name": "esm2_t12_35M_UR50D",
      "description": "esm2_t12_35M_UR50D"
    },
    {
      "name": "esm2_t30_150M_UR50D",
      "description": "esm2_t30_150M_UR50D"
    },
    {
      "name": "esm2_t33_650M_UR50D",
      "description": "esm2_t33_650M_UR50D"
    },
    {
      "name": "esm2_t36_3B_UR50D",
      "description": "esm2_t36_3B_UR50D"
    },
    {
      "name": "esmc",
      "description": "Community based ESM Cambrian (ESMC) models, with different versions having different model parameters."
    },
    {
      "name": "esmc-300m",
      "description": "esmc-300m"
    },
    {
      "name": "esmc-600m",
      "description": "esmc-600m"
    },
    {
      "name": "esmc-6b",
      "description": "esmc-6b"
    },
    {
      "name": "community",
      "description": "Other community based models."
    },
    {
      "name": "prott5-xl",
      "description": "prott5-xl"
    },
    {
      "name": "antibody",
      "description": "Models suitable for use with antibodies."
    },
    {
      "name": "ablang2",
      "description": "ablang2"
    },
    {
      "name": "esm-if1",
      "description": "esm-if1"
    },
    {
      "name": "proteinmpnn",
      "description": "proteinmpnn"
    },
    {
      "name": "solublempnn",
      "description": "solublempnn"
    }
  ]
};
export default embeddingsSpec;
