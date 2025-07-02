Predictor
=========

The Predictor API provided by OpenProtein.AI allows you to train property predictors from your assays, building on top of embeddings and reductions (e.g. SVD) provided by our `Embeddings API <./embeddings.rst>`_.

You can list the available embeddings models that can be used with protein language model (``PLM``) feature types using the ``/embeddings/models`` endpoint. Do note that, currently, using PLMs will require a reduction type to be specified (e.g. MEAN or SUM). 

Similarly, SVD embeddings can also be specified using ``SVD`` feature type with the appropriate fitted svd, which can be listed using the ``/svd`` endpoint.

Currently, we support the following predictor types:

- **Gaussian Process**

Endpoints
---------

.. raw:: html

    <script type="module" src="../_static/js/swaggerPredictor.js"></script>
    <div id="swagger-ui"></div>
