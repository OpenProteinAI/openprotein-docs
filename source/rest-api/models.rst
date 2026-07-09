Models
======

The Models API is a single, consistent way to call any model on the platform and to discover what each model can do. It unifies foundation models, property predictors, structure predictors, and structure/sequence generators behind one namespace.

Discovery is driven by model metadata. Each model publishes a metadata document describing the inferences it supports, so clients (including our own web app) can build request forms and model cards directly from it — there is no need to hardcode per-model behaviour.

Core concepts
-------------

Every inference is addressed by two path segments, ``{method}/{output}``:

- **method** — how inputs are enumerated and the cardinality of the call, e.g. ``batch`` (N sequences → N results), ``single-site`` (one base sequence → all point mutants), ``indel``, ``fold`` (sequence → structure), or ``generate`` (sampling). It is an open set.
- **output** — the primary output produced, e.g. ``embeddings``, ``logits``, ``attn``, ``loglikelihood``, ``predictions``, ``structure``, or ``sequences``. Also an open set; models may expose their own.

A model supports an inference only if it declares that ``(method, output)`` pair in its metadata. Each declared inference lists its ``outputs`` (name → output type) and the ``params`` it accepts as an inline JSON Schema, which is enough to render an input form.

Like the rest of the platform, inferences are asynchronous: a ``POST`` returns a job handle, and outputs are fetched from the jobs service once the job completes.

The endpoints include:

- **List models** — ``GET /api/v1/models``, with filters (``scope``, ``method``, ``output``, ``output_type``) and a ``verbose`` flag for full metadata.
- **Get model metadata** — ``GET /api/v1/models/{model_id}``, the discovery surface a client renders from.
- **Get model tokens** — ``GET /api/v1/models/{model_id}/tokens``, the input/output token vocabularies (kept out of metadata to keep it small).
- **Run an inference** — ``POST /api/v1/models/{model_id}/{method}/{output}``, which returns a job handle.

Endpoints
---------

.. raw:: html

   <script type="module" src="/_static/js/swaggerModels.js"></script>
   <div id="swagger-ui"></div>
