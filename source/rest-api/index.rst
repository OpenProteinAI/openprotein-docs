REST API documentation
======================

This section of our site provides documentation supporting our REST API.

Here, you can find an overview of our workflow offerings and information needed to get started with our Property Regression, PoET, Align, Fold, and Embeddings workflows via the REST API.

Another method for interacting with our API is by using our `Python API <../python-api/index.rst>`__.

`Authentication and Jobs <./authentication-and-jobs.rst>`_
----------------------------------------------------------
We recommend starting here for the fundamental steps for user authentication and the endpoints for jobs. On top of log in instructions, we describe how our job system is designed and how jobs can be tracked.

The endpoints include:

- Login
- Jobs

After authenticating, we recommend proceeding directly to the respective workflow pages:

`Property Regression <./property-regression.rst>`_
--------------------------------------------------

Kickoff your Property Regression by using the endpoints to enable analyzing datasets, training sequence-to-function prediction models, using those models to predict properties for new sequences, and designing optimized libraries of sequence variants.

The endpoints include:

- Assaydata
- Train
- Predict
- Design
- Jobs
- Embeddings
- Predictor

`PoET <./poet.rst>`_
--------------------
Design *de novo* sequences using these endpoints, without functional measurements of the protein of interest. Our proprietary models enable generation of single substitution, combinatorial variant libraries, or a high-diversity library.

The endpoints include:

- PoET

`Foundation Models <./embeddings.rst>`_
---------------------------------------
Calculate raw embeddings on protein sequences using powerful foundational models. Our platform offers a range of endpoints that harness the power of both our proprietary and open-source models.

The endpoints include:

- Embeddings
- Svd


`Align <./align.rst>`_
----------------------
Use these endpoints to align multiple sequences. This forms the basis for PoET and certain Fold workflows. 

The endpoints include:

- Align

`Prompt <./prompt.rst>`_
----------------------
Learn more about the endpoints needed to provide queries/prompts for PoET-2.

The endpoints include:

- Prompt

`Structure Prediction <./fold.rst>`_
------------------------------------
Create structure predictions on protein sequences. Our platform offers access to ESMFold and AlphaFold2.

The endpoints include:

- Fold

`Predictor <./predictor.rst>`_
------------------------------------
Train property predictors from your assays here. Our platform offers access to training with Gaussian Process models.

The endpoints include:

- Predictor

`Design <./design.rst>`_
------------------------------------
Design de novo sequences and structures on our platform! You can either start from your assays and design sequences which optimize targets using your trained property predictors, or you can start from a target structure and use RFdiffusion to generate a structure based on your input structure.

The endpoints include:

- Design

Next steps
----------
To start accessing our suite of APIs, refer to these articles to get started:

- `How to log in <./authentication-and-jobs.rst#login>`_
- `Jobs tracking <./authentication-and-jobs.rst#jobs>`_
- `Starting a Property Regression <./property-regression.rst>`_


.. toctree::
   :hidden:
   :maxdepth: 1

    Authentication and Jobs <authentication-and-jobs>
    Property Regression <property-regression>
    PoET <poet>
    Align <align>
    Prompt <prompt>
    Embeddings <embeddings>
    Fold <fold>
    Predictor <predictor>
    Design <design>
