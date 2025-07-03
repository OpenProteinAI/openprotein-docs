Glossary
========

General 
-------

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - Project
     - A project houses data for your protein of interest. You can upload multiple datasets, but each project should be for a different protein of interest.
   * - Library
     - A library is a repository for your designed sequence variants. By saving your predicted results as a library, you can easily reference previously created variants.
   * - Fitness
     - Similar to evolutionary fitness, but in this case refers to how much better in performance a protein is in terms of the design objective or natural evolutionary landscape.



Datasets
--------

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - Identifier
     - This column contains the name of your sequence.
   * - Property
     - This column contains the measured values of your functions of interest. You can input more than 1 property.
   * - Sequence
     - This column contains the protein sequences of your variants.
   * - Mutant
     - This column denotes your mutation codes. If you use mutation codes (for example, A20T where alanine at site 20 is substituted with threonine), you will be required to input the parent sequence.
   * - Parent
     - This is the base sequence that your dataset can be based upon if you are using mutational codes. It is usually your wild type sequence.

Visualizations
--------------

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - UMAP
     - Uniform Manifold Approximation and Projection (UMAP) is a dimension reduction technique that can be used for visualisation similarly to t-SNE, and also for general nonlinear dimension reduction. Read more `here <https://umap-learn.readthedocs.io/en/latest/>`_.
   * - Histogram
     - A representation of the distribution of the data, showing the number of observations that fall within each bin.
   * - Joint plots
     - A way of understanding the relationship between two variables and the distribution of individuals of each variable.


Models
------

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - Gaussian
     - A nonparametric supervised machine learning method that models and predicts functions. It defines a distribution over functions, allowing for flexibility in capturing uncertainty and making predictions.
   * - Bayesian regression
     - Bayesian regression is a statistical method that combines prior knowledge with observed data. It provides a framework for making predictions while accounting for uncertainty.
   * - Embeddings
     - Embeddings are a way to represent the meaning of sequences as a list of numbers.
   * - Dimension reduction
     - Transformation of data from a high-dimensional space into a low-dimensional space so that the low-dimensional representation retains some meaningful properties of the original data, ideally close to its intrinsic dimension.
   * - Cross-validation
     - Cross-validation is a resampling method that uses different portions of the data to test and train a model on different iterations.
   * - Training curve
     - Plots the optimal value of a model's loss function for a training set against this loss function evaluated on a validation data set using the same parameters that produced the optimal function.
   * - Spearman rho
     - A nonparametric measure of rank correlation. It assesses how well the relationship between two variables can be described using a monotonic function.
   * - Loss
     - The training loss indicates how well the model is fitting the training data.

Design
------

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - Design objectives
     - This is your desired output based on your functions of interest.
   * - Target value
     - The value you wish the output should achieve.
   * - Direction
     - The direction you wish the output should achieve.
   * - Weight
     - This helps the model to generate results based on the priorities of the output.
   * - Iterations
     - The number of iterations is equivalent to the number of batches needed to complete one epoch during model training. So if a dataset includes 1,000 images split into mini-batches of 100 images, it will take 10 iterations to complete a single epoch.
   * - Log-likelihood score
     - Indicates the probability that a predicted sequence will achieve the specified design objective.
   * - Mean
     - The mean of the predicted experimental value that a sequence would achieve.
   * - Standard deviation
     - Indicates the amount of variation in the mean value and therefore provides a level of confidence in the predicted value.


PoET
----

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - Prompt
     - A prompt is an input that instructs a Generative AI model to generate the desired response. PoET uses a prompt made up of a set of related sequences. These sequences may be homologs, family members, or some other grouping that represents your protein of interest.
   * - Query
     - This refers to the list of sequences you wish to score using our PoET model.
   * - Multiple sequence alignment
     - The sequence alignment of three or more biological sequences, usually DNA, RNA or protein. It can identify the evolutionary relationships and common patterns between genes and proteins.



Sampling methods
----------------

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - Ensemble
     - In an ensemble, multiple prompts are sampled independently from the MSA following the prompt sampling parameters. Each sequence is scored using each prompt individually, and the final score is the average score across prompts. Ensembling improves the accuracy of the sequence scores, but takes longer to run.
   * - Neighbors
     - Sample more diverse, less redundant sequences from the MSA by sampling each sequence with weight inversely proportional to its number of homologs in the MSA.
   * - Homology level
     - Determines the identity at which two sequences are considered redundant. For example, when the homology level is set to 0.8, it means that a sequence will be considered to belong to the same group if it has more than 80% sequence identity.
   * - Random seed
     - Determines the state of the random number generator for random sampling. If it set to a specific number, the algorithm will sample the same set of sequences each time.


Sampling parameters
-------------------

.. list-table::
   :header-rows: 1
   :widths: 10 50
   :align: left

   * - Term
     - Definition
   * - Top-p
     - Top-p (also known as nucleus sampling) limits sampling to amino acids with sum likelihoods which do not exceed the specified value. As a result, the list of possible amino acids is dynamically selected based on the sum of likelihood scores achieving the top-p value. For example, setting a top-p of 0.8 limits sampling to an 80% or greater probability. Other amino acids are ignored.
   * - Top-k
     - Top-k limits sampling to a shortlist of amino acids, where the top-k parameter sets the size of the shortlist. For example, setting top-k to 5 means the model samples from the 5 likeliest amino acids at each position. Other amino acids are ignored.
   * - Temperature
     - Temperature is a number used to tune the degree of randomness. A lower temperature means less randomness; a temperature of 0 will always yield the same output.

