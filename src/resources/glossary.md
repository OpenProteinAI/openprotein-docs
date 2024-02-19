---
title: Glossary
format:
  html:
    code-fold: true
---

## General 

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>Project</td>
        <td>A project houses data for your protein of interest. You can upload multiple datasets, but each project should be for a different protein of interest.</td>
    </tr>
    <tr>
        <td>Library</td>
        <td>A library is a repository for your designed sequence variants. By saving your predicted results as a library, you can easily reference previously created variants. </td>
    </tr>
    <tr>
        <td>Fitness</td>
        <td>Similar to evolutionary fitness, but in this case refers to how much better in performance a protein is in terms of the design objective or natural evolutionary landscape.</td>
    </tr>
</table>
```


## Datasets

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>Identifier</td>
        <td>This column contains the name of your sequence.</td>
    </tr>
    <tr>
        <td>Property</td>
        <td>This column contains the measured values of your functions of interest. You can input more than 1 property.</td>
    </tr>
    <tr>
        <td>Sequence</td>
        <td>This column contains the protein sequences of your variants.</td>
    </tr>
    <tr>
        <td>Mutant</td>
        <td>This column denotes your mutation codes. If you use mutation codes (for example, A20T where alanine at site 20 is substituted with threonine), you will be required to input the parent sequence.</td>
    </tr>
    <tr>
        <td>Parent sequence</td>
        <td>This is the base sequence that your dataset can be based upon if you are using mutational codes. It is usually your wild type sequence.</td>
    </tr>
</table>
```

## Visualizations

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>UMAP</td>
        <td>Uniform Manifold Approximation and Projection (UMAP) is a dimension reduction technique that can be used for visualisation similarly to t-SNE, and also for general nonlinear dimension reduction. Read more <a href="https://umap-learn.readthedocs.io/en/latest/" target="_blank">here</a>.</td>
    </tr>
    <tr>
        <td>Histogram</td>
        <td>A representation of the distribution of the data, showing the number of observations that fall within each bin.</td>
    </tr>
    <tr>
        <td>Joint plots</td>
        <td>A way of understanding the relationship between two variables and the distribution of individuals of each variable.</td>
    </tr>
</table>
```

## Models

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>Gaussian process</td>
        <td>A nonparametric supervised machine learning method that models and predicts functions. It defines a distribution over functions, allowing for flexibility in capturing uncertainty and making predictions.</td>
    </tr>
    <tr>
        <td>Bayesian regression</td>
        <td>Bayesian regression is a statistical method that combines prior knowledge with observed data. It provides a framework for making predictions while accounting for uncertainty.</td>
    </tr>
    <tr>
        <td>Embeddings</td>
        <td>Embeddings are a way to represent the meaning of sequences as a list of numbers.</td>
    </tr>
    <tr>
        <td>Dimension reduction</td>
        <td>Transformation of data from a high-dimensional space into a low-dimensional space so that the low-dimensional representation retains some meaningful properties of the original data, ideally close to its intrinsic dimension.</td>
    </tr>
    <tr>
        <td>Cross-validation</td>
        <td>Cross-validation is a resampling method that uses different portions of the data to test and train a model on different iterations.</td>
    </tr>
    <tr>
        <td>Training curve</td>
        <td>Plots the optimal value of a model's loss function for a training set against this loss function evaluated on a validation data set using the same parameters that produced the optimal function.</td>
    </tr>
    <tr>
        <td>Spearman rho</td>
        <td>A nonparametric measure of rank correlation. It assesses how well the relationship between two variables can be described using a monotonic function.</td>
    </tr>
    <tr>
        <td>Loss</td>
        <td>The training loss indicates how well the model is fitting the training data.</td>
    </tr>
</table>
```                                                                                                                                             

## Design

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>Design objectives</td>
        <td>This is your desired output based on your functions of interest.</td>
    </tr>
    <tr>
        <td>Target value</td>
        <td>The value you wish the output should achieve.</td>
    </tr>
    <tr>
        <td>Direction</td>
        <td>The direction you wish the output should achieve.</td>
    </tr>
    <tr>
        <td>Weight</td>
        <td>This helps the model to generate results based on the priorities of the output.</td>
    </tr>
    <tr>
        <td>Iterations</td>
        <td>The number of iterations is equivalent to the number of batches needed to complete one epoch during model training. So if a dataset includes 1,000 images split into mini-batches of 100 images, it will take 10 iterations to complete a single epoch.</td>
    </tr>
    <tr>
        <td>Log-likelihood score or score</td>
        <td>Indicates the probability that a predicted sequence will achieve the specified design objective.</td>
    </tr>
    <tr>
        <td>Mean</td>
        <td>The mean of the predicted experimental value that a sequence would achieve.</td>
    </tr>
    <tr>
        <td>Standard deviation</td>
        <td>Indicates the amount of variation in the mean value and therefore provides a level of confidence in the predicted value.</td>
    </tr>
</table>
```

## PoET

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>Prompt</td>
        <td>A prompt is an input that instructs a Generative AI model to generate the desired response. PoET uses a prompt made up of a set of related sequences. These sequences may be homologs, family members, or some other grouping that represents your protein of interest.</td>
    </tr>
    <tr>
        <td>Query</td>
        <td>This refers to the list of sequences you wish to score using our PoET model.</td>
    </tr>
    <tr>
        <td>Multiple sequence alignment</td>
        <td>The sequence alignment of three or more biological sequences, usually DNA, RNA or protein. It can identify the evolutionary relationships and common patterns between genes and proteins.</td>
    </tr>
</table>
```

## Sampling methods

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>Ensemble</td>
        <td>In an ensemble, multiple prompts are sampled independently from the MSA following the prompt sampling parameters. Each sequence is scored using each prompt individually, and the final score is the average score across prompts. Ensembling improves the accuracy of the sequence scores, but takes longer to run.</td>
    </tr>
    <tr>
        <td>Neighbors</td>
        <td>Sample more diverse, less redundant sequences from the MSA by sampling each sequence with weight inversely proportional to its number of homologs in the MSA.</td>
    </tr>
    <tr>
        <td>Homology level</td>
        <td>Determines the identity at which two sequences are considered redundant. For example, when the homology level is set to 0.8, it means that a sequence will be considered to belong to the same group if it has more than 80% sequence identity.</td>
    </tr>
    <tr>
        <td>Random seed</td>
        <td>Determines the state of the random number generator for random sampling. If it set to a specific number, the algorithm will sample the same set of sequences each time.</td>
    </tr>
</table>
```

## Sampling parameters

```{=html}
<table>
    <tr>
        <td style="width:20%"><b>Term</b></td>
        <td><b>Definition</b></td>
    </tr>
    <tr>
        <td>Top-p</td>
        <td>Top-p (also known as nucleus sampling) limits sampling to amino acids with sum likelihoods which do not exceed the specified value. As a result, the list of possible amino acids is dynamically selected based on the sum of likelihood scores achieving the top-p value. For example, setting a top-p of 0.8 limits sampling to amino acids summing to an 80% or greater probability. Other amino acids are ignored.</td>
    </tr>
    <tr>
        <td>Top-k</td>
        <td>Top-k limits sampling to a shortlist of amino acids, where the top-k parameter sets the size of the shortlist. For example, setting top-k to 5 means the model samples from the 5 likeliest amino acids at each position. Other amino acids are ignored.</td>
    </tr>
    <tr>
        <td>Temperature</td>
        <td>Temperature is a number used to tune the degree of randomness. A lower temperature means less randomness; a temperature of 0 will always yield the same output.</td>
    </tr>
</table>
```