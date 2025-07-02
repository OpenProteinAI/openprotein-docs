Property Regression Models
==========================

Our Python API Property Regression Models allow you to harness our platform’s machine learning capabilities to design customized sequences optimized to your specifications. 

There are three main modules:

* Our `Data <../api-reference/data.rst>`_ module allows you to upload your dataset to OpenProtein.AI’s engineering platform. This dataset forms the basis for training and design tasks. Your data should be formatted as a 2 column CSV, including the full sequence of each variant and one or more columns for your measured properties.  
 
* Our `Predictor <../api-reference/predictor.rst>`_ module provides functions to create and use models on your measured properties. This step is essential for enabling predictions for new sequences. These workflows also perform cross-validation on your models to estimate uncertainty. The **Predictor** module also provides functions to make predictions on arbitrary sequences using your custom trained models, including predictions for single sequences as well as single mutant variants of the sequence. You can also experiment with various supported embedding models from our `Embedding <../api-reference/embedding.rst>`_ module. 
 
* Our `Design <../api-reference/design.rst>`_ module provides the capability to design new sequences based on your objectives.

Get started using Property Regression Models
--------------------------------------------

**Tutorials:**

* `Uploading data <./uploading-data.ipynb>`_
* `Training models <./training-models.ipynb>`_
* `Designing sequences <./designing-sequences.ipynb>`_ 
* `Predicting sequences <./predicting-sequences.ipynb>`_
* `Single site analysis <./single-site-analysis.ipynb>`_

`API Reference <../api-reference/index.rst>`_


.. toctree::
   :hidden:
   :maxdepth: 2
   
    Uploading data <uploading-data>
    Training models <training-models>
    Designing sequences <designing-sequences>
    Predicting sequences <predicting-sequences>
    Single site analysis <single-site-analysis>
