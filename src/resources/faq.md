---
title: Got A Question?
format:
  html:
    code-fold: true
    toc: false
---
Still can’t find the answer? Please [contact us](https://www.openprotein.ai/contact){target="_blank"} and we will get back to you as soon as possible. 

## General 

::: {.callout-caution collapse="true" icon=false}
## **What are your data security policies? Should I be using my data on the platform will benefit other customers or competitors?**

Your datasets, trained models and results will not be shared with any other user on the platform. All communication with OpenProtein.AI servers is encrypted and your datasets and models are only accessible by you.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **What are the starting points for using the software?**

If you aren't starting with experimental data, our PoET tools offer a valuable starting point. You can use them to create a diverse sequence library, rank the sequence-only library, and conduct substitution analysis. Alternatively, if you already have experimental data, get started with our OP Models for protein optimization for further enhancement.
:::

```{=html}
<div class="divider"></div>
```
<!-- 
::: {.callout-caution collapse="true" icon=false}
## **I received an error message when using the tools, what do I do?**

Please refer to our list of error messages <need to assemble comprehensive list of error messages>
:::

```{=html}
<div class="divider"></div>
``` -->

::: {.callout-caution collapse="true" icon=false}
## **What is the difference between seed sequence, parent sequence and reference sequence?**

Seed sequence: This is the starting sequence used to create your multiple sequence alignment (MSA) in PoET. For more information about MSA, refer to [this article](../poet/prompts.md).

Parent sequence: This is the base sequence that your dataset can be based upon if you are using mutational codes. It is usually your wild type sequence. 

Reference sequence: A reference sequence is the sequence you use to compare against your sequences. This will help you visualize where mutations have been made (see article on adding reference sequence).
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **Do I need information about the target?**

No you do not need information about the target. To use Optimization and Prediction Models, you will need functional measurements as part of your dataset. 
:::

```{=html}
<div class="divider"></div>
```

## Optimization and Prediction Models (OP models)

::: {.callout-caution collapse="true" icon=false}
## **How much data do I need to get good performance?**

If you have not collected any measurements, please get started using the PoET workflow. If you have collected some measurements, we don't make specific recommendations on how much data you need, but encourage you to get started with the data you have, keeping in mind that you can add more data to a project at any time. If your data is only qualitative in nature, you can convert qualitative values into quantitative values (for example, binary) for compatibility with our model tools. 
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **How should my datasets be formatted?**

Please refer to [Uploading your data](../opmodels/uploading-your-data.md#format-your-dataset) for more details
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **What kinds of measurements can I upload?**

You can upload quantitative measurements for any properties. If you have qualitative data, please convert these to quantitative values. For example, you can use binary data to represent values such as "pathogenic" or "nonpathogenic".
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **Should I upload negative data from my experiments?**

Please upload your whole dataset to allow our models to learn both what works and what doesn't. The model is able to extrapolate and make predictions using negative data.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **How should measurement values be transformed to get the best performance?**

Ideally, your data should not be highly skewed and the experimental error of your measurements should not depend on the magnitude of the measurement (e.g. this may happen with count data in fluorescence assays as well as measurement of dissociation constants). If your data exhibits these characteristics, you can try a log or sqrt transform your data. The data should look normally distributed.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **What does "design criteria" mean?**

Design criteria are your design objectives, defined by a property’s value being greater than, less than, or equal to a target value. They are based on measurements from assays run on your variant library. For example, if you need a lower dissociation constant to improve binding affinity, set the desired target dissociation constant and select the < sign.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **Can I predict binding to multiple targets or optimize multiple properties at once?**

Yes, our platform supports multi parameter optimization, including binding to multiple targets. To optimize multiple properties at once, your dataset should include a separate column for each property and include corresponding data values. Similarly, if you're interested in optimizing binding to multiple targets at once, you'd express binding to each target as a separate column in your dataset, providing measurements for these. Refer to [Model training and evaluation](../opmodels/model-train-evaluate.md) to build models trained on multiple properties and [Designing sequences](../opmodels/design.md) for information on how to design sequences after model training.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **How do tell if the training was successful and interpret the results of my model's cross-validation?**

The cross-validation graphs and associated correlation statistics (e.g., Spearman's rho) can be used to assess the model's performance. The performance of a model is its ability to predict the properties of novel sequences that the model has not been trained on. The graphs show the predicted property value of a sequence on the x-axis, and the true value on the y-axis. A higher correlation indicates a better performing model. 

Cross-validation refers to the method used to evaluate the model on novel sequences; briefly, the full dataset is split into K subsets, and the model is trained and evaluated on non-overlapping subsets to ensure that the model is evaluated on sequences not seen during training.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **How do I interpret the results of my predicted library?**

The log-likelihood score(s), mean, and standard deviation all give you important information about your results. The log-likelihood score is the log probability that the sequence will achieve your design objective. The mean represents the expected value of the property, as predicted by the model, and the standard deviation indicates the dispersion about the mean.

The probability of a specific measurement being observed for that sequence in the lab can be determined from these values. For example, if your design objective is set to x>1 and the log-likelihood score of a sequence is -0.5, then the model predicts that x>1 with probability e^-0.5=~0.61. Continuing with this example, if the model returns a mean of 1 and a standard deviation of 0.5, the model predicts that the actual property value falls between 0 and 2 (2 standard deviations) with roughly 95% probability.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **The scores of the designed sequenced aren't what I expected e.g. most of the scores of my sequences are very low (extremely negative), very high (close to zero), and/or the predicted standard deviations are very large. What should I do?**

If the scores of the sequences are very low, it means that the design algorithm has not found any sequences that are likely to achieve the design criteria. Oftentimes, the predicted standard deviation of the sequences will be very high, because only sequences that the model is uncertain about have a chance of achieving the design criteria. These results suggest that the design criteria are too aggressive, and may need to be made less strongest. It may require additional experimental rounds that progressively increase the design criteria to achieve the original goal.

If the scores of the sequences are very high, it means that the design algorithm has found many sequences that it believes will achieve the design criteria. This is good! You may also want to experiment with setting a more aggressive design criteria to explore riskier sequences that may be even better, if it is necessary and within budget to do so.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **How can I tell where the mutations were made in the predicted sequences?**

By adding a reference sequence, you can visualize where mutations are made and what they are. See <Using a reference sequence> for more information how to do this. 
:::

```{=html}
<div class="divider"></div>
```

## Visualization

::: {.callout-caution collapse="true" icon=false}
## **What is a UMAP? Is it like a PCA?**

Uniform Manifold Approximation and Projection (UMAP) is a dimension reduction technique that can be used for visualisation similarly to t-SNE, but also for general nonlinear dimension reduction. A UMAP allows you to find interesting clusters within your dataset/predict sequences. For more information about UMAPs, visit [here](https://umap-learn.readthedocs.io/en/latest/){target="_blank"}.
:::

```{=html}
<div class="divider"></div>
```

## Embeddings

::: {.callout-caution collapse="true" icon=false}
## **What is an embedding?**

An embedding is a relatively low-dimensional space into which you can translate high-dimensional vectors. Embeddings make it easier to perform machine learning on large inputs like sparse vectors representing words or proteins. Essentially, embeddings enable machine learning models to find similar objects or in our context, protein sequences.
:::

```{=html}
<div class="divider"></div>
```

## PoET

::: {.callout-caution collapse="true" icon=false}
## **How should I interpret the PoET log-likelihood score and what is a good number?**

The PoET score of a sequence is a log-likelihood score, which expresses the model’s prediction of the fitness of the sequence in relation to your prompt. The higher or less negative the score is, the more fit the sequence. For more information, please refer to this article [PoET scoring system and log probability](../poet/scoring-log-likelihood.md)
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **PoET scores don't perfectly correlate with measurements, should I be worried?**

It is generally not possible to achieve a perfect correlation due to the noise inherent in experimental measurements and the fact that evolutionary fitness is not necessarily perfectly correlated with specific fitness-related properties. Noiser measurements will result in lower correlations and limit the maximum possible correlation. Thus, the correlation reflects both the predictive power of the model and the noise of the measurements; a low correlation >0.2 is often still sufficient, as long as it is reasonable to believe that the properties you are optimizing are evolutionarily favored.
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **What are the parameters top-p and top-k?**

Top-p (also known as nucleus sampling) limits sampling to the top amino acids with total likelihood that does not exceed the specified value. As a result, the list of possible amino acids is dynamically selected based on the sum of likelihood scores achieving the top-p value. For example, setting a top-p of 0.8 limits sampling to the smallest set of amino acids summing to an 80% or greater probability. Other amino acids are ignored. 

Top-k limits sampling to a shortlist of amino acids, where the top-k parameter sets the size of the shortlist. For example, setting top-k to 5 means the model samples from the 5 likeliest amino acids at each position. Other amino acids are ignored.

Smaller values of top-p and top-k encourage generation of sequences with higher likelihood but lower diversity.

We recommend that you use the default settings, but if you wish to fine tune settings, we recommend you use either top-p or top-k on a given job, not both. 
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **The PoET Generate tool sometimes produces sequences that look too long or too short. What should I do?**

While there isn't a feature that explicitly controls the length of sequence, you can control how similar the sequence will be to your seed sequence/prompt by fine tuning top p, top k, or temperature. 
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **Why does PoET sometimes score short sequences or sequence fragments highly and what should I do?**

This is dependent on the prompt used. You can increase homology by changing the parameters in the prompt sampling parameters for Homology level and Minimum similarity to seed sequence. 
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **When should I use prompt ensembling and how should I interpret ensemble scores?**

Use prompt ensembling to obtain more accurate log-likelihood scores. A greater value for the number of prompts ensembled is better, but may take longer to compute. As a starting point, we recommend a value of 5 to strike a good balance.

When the number of prompts to ensemble is set to N, (1) N prompts are randomly sampled (2) each sequence is scored by PoET conditioned on each of the N sampled prompts, resulting in N scores and (3) the final score is obtained by averaged the N scores. This is the score that is shown in the web app. The REST/Python APIs can be used to access the N prompts and N individual scores. In some cases, the variance of the N scores can be used as an indicator of the confidence of the model. 
:::

```{=html}
<div class="divider"></div>
```

::: {.callout-caution collapse="true" icon=false}
## **How do I compare results across prompts?**

It is not recommended to compare results between prompts. 
:::

```{=html}
<div class="divider"></div>
```
<br/>

## Structure Prediction

::: {.callout-caution collapse="true" icon=false}
## **Can the model predict binding between proteins?**

The current model can predict structures of multimers but not yet binding between proteins. 
:::

```{=html}
<div class="divider"></div>
```