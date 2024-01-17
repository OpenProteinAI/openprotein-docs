---
title: Use our Optimization and Prediction Models (OP models) to to analyze and optimize sequences based on your data
format:
  html:
    code-fold: true
---

Our OP models tool allows you to use our protein large language models to learn then predict sequence-to-function relationships from your experimental data. Use your functional measurements to train machine learning models, then use these custom models to design and visualize sequences within your specified constraints.

<p align="center">
  <img src="./img/index-diagram.png" alt="OP models tool" width="80%"/>
</p>

Our models provide a quantitative score for property prediction, and display a standard deviation value to indicate the level of confidence in the variant effect. This lets you make data-driven decisions about your library selection and optimize for performance despite cost and workflow constraints.

You can optimize for multiple properties in a single design cycle, as well as train models iteratively across multiple experimental cycles. Add more data at any time to further optimize your designs.

After you have designed libraries that meet your criteria, refine your variants by predicting the effect of each mutating site in your experimental context.

## Learn more and get started with our tutorials
General tutorials

:::: {.columns}

::: {.column width="45%"}
* [Upload data](./uploading-your-data.md)
* [OP models history](./navigating-your-projects.md)
:::

::: {.column width="10%"}
<!-- empty column to create gap -->
:::

::: {.column width="45%"}
* [Visualization](./visualizing-your-data.md)
:::

::::

Using the web application

:::: {.columns}

::: {.column width="45%"}
* [Model training and evaluation](./core-model-train-evaluate.md)
* [Design](./design-sequence.md)
:::

::: {.column width="10%"}
<!-- empty column to create gap -->
:::

::: {.column width="45%"}
* [Substitution analysis with OP models](./sub-analysis.md)
:::

::::

Using the Python client API

:::: {.columns}

::: {.column width="45%"}
* [Sequence-based learning](https://docs.openprotein.ai/api-python/demos/core_demo.html)
* [Protein language models and embeddings](https://docs.openprotein.ai/api-python/embedding_workflow.html)
:::

::: {.column width="10%"}
<!-- empty column to create gap -->
:::

::: {.column width="45%"}
* [Quantitative decision making for library design](#)
:::

::::