Models
======

The Models API is a single, consistent way to call any model on the platform and to discover what each model can do. It unifies foundation models, property predictors, structure predictors, and structure/sequence generators behind one namespace.

Discovery is driven by model metadata. Each model publishes a metadata document describing the methods it supports, so clients (including our own web app) can build request forms and model cards directly from it — there is no need to hardcode per-model behaviour.

Core concepts
-------------

Every method is addressed by two path segments, ``{input}/{output}``:

- **input** — how inputs are enumerated and the cardinality of the call, e.g. ``batch`` (N sequences → N results; folding is a ``batch`` call too, N complexes → N structures), ``single-site`` (one base sequence → all point mutants), ``indel``, or ``generate`` (sampling). It is an open set.
- **output** — the primary output produced, e.g. ``embeddings``, ``logits``, ``attn``, ``loglikelihood``, ``predictions``, ``structures``, or ``sequences``. Also an open set; models may expose their own.

A model supports a method only if it declares that ``(input, output)`` pair in its metadata. Each declared method lists its ``outputs`` (name → output type). The request ``params`` a method accepts are fetched separately, per method, from ``.../{input}/{output}/params`` (an inline JSON Schema, enough to render an input form) — this keeps model metadata small even for models with many methods.

Like the rest of the platform, calls are asynchronous: a ``POST`` returns a job handle, and outputs are fetched from the jobs service once the job completes.

The endpoints include:

- **List models** — ``GET /api/v1/models``, with filters (``scope``, ``input``, ``output``, ``output_type``) and a ``verbose`` flag for full metadata.
- **Get model metadata** — ``GET /api/v1/models/{model_id}``, the discovery surface a client renders from.
- **Get model tokens** — ``GET /api/v1/models/{model_id}/tokens``, the input/output token vocabularies (kept out of metadata to keep it small).
- **Get a method's params** — ``GET /api/v1/models/{model_id}/{input}/{output}/params``, the method's request JSON Schema (fetched per method, so metadata stays lean).
- **Run a method** — ``POST /api/v1/models/{model_id}/{input}/{output}``, which returns a job handle.

Endpoints
---------

.. raw:: html

   <script type="module" src="/_static/js/swaggerModels.js"></script>
   <div id="swagger-ui"></div>
