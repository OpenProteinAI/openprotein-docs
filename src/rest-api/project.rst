Project
=======

Tap into the ‘Project’ module’s functionality and explore all endpoints available. Effortlessly access features like model training, making predictions, designing sequences based on properties, and checking job statuses—all programmatically for a seamless and efficient experience.

Assaydata
---------
Endpoints to upload a dataset to OpenProtein’s engineering platform for training, predicting and evaluating tasks. The expected format of each dataset as 2 column CSV:

- The full sequence of each variant (mutation codes are also accepted)
- 1+ columns with your measured properties (missing values are acceptable)

Train
-----
Endpoints to train a model(s) on your measured properties to enable predictions for new sequences! These workflows will additionally perform cross-validation on specific models to estimate uncertainty.

Predict
-------
Endpoints for predicting properties on arbitrary sequences with your OpenProtein trained models! Make predictions for single sequences as well as single mutant variants of the sequence.

.. note::
   A trained model is required before predict endpoints can be utilized.

Design
------
Endpoints to design new sequences based on your stated objectives and our genetic algorithm! These endpoints will require datasets to be uploaded via assaydata endpoints.

.. note::
   A trained model is required before design endpoints can be utilized.

Endpoints
---------
.. raw:: html

   <script type="module" src="../js/swaggerProject.js"></script>
   <div id="swagger-ui"></div>
