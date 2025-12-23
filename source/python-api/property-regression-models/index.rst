Property Regression Models
==========================

Our Python API Property Regression Models allow you to harness our platform’s machine learning capabilities to design customized sequences optimized to your specifications. 

There are three main modules:

* Our :doc:`/python-api/api-reference/data` module allows you to upload your dataset to OpenProtein.AI’s engineering platform. This dataset forms the basis for training and design tasks. Your data should be formatted as a 2 column CSV, including the full sequence of each variant and one or more columns for your measured properties.  
 
* Our :doc:`/python-api/api-reference/predictor` module provides functions to create and use models on your measured properties. This step is essential for enabling predictions for new sequences. These workflows also perform cross-validation on your models to estimate uncertainty. The **Predictor** module also provides functions to make predictions on arbitrary sequences using your custom trained models, including predictions for single sequences as well as single mutant variants of the sequence. You can also experiment with various supported embedding models from our :doc:`/python-api/api-reference/embedding` module. 
 
* Our :doc:`/python-api/api-reference/design` module provides the capability to design new sequences based on your objectives.

Get started using Property Regression Models
--------------------------------------------

**Tutorials:**

* :doc:`Uploading data <./uploading-data>`
* :doc:`Training models <./training-models>`
* :doc:`Designing sequences <./designing-sequences>` 
* :doc:`Predicting sequences <./predicting-sequences>`
* :doc:`Single site analysis <./single-site-analysis>`

:doc:`API Reference </python-api/api-reference/index>`

.. toctree::
   :hidden:
   :maxdepth: 2
   
    Uploading data <uploading-data>
    Training models <training-models>
    Designing sequences <designing-sequences>
    Predicting sequences <predicting-sequences>
    Single site analysis <single-site-analysis>
