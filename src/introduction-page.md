---
title: Introduction to OpenProtein
format:
  html:
    code-fold: true
---
OpenProtein.AI is a powerful platform that leverages state-of-the-art machine learning techniques to facilitate protein engineering and analysis.

We offer multiple toolsets to get a project started, including:

* Projects: a set of tools to analyze your sequences that have measured properties. Projects can be used to train machine learning models to predict properties of new, unmeasured sequences and create design de novo sequences that follow user-specified constraints. 
* PoET: Our generative model trained on millions of evolutionary sequences. PoET is able to use evolutionary context (e.g. from an MSA) to score the fitness landscape of sequences without wet lab measurements. 
* Embeddings: Accessible via APIs, our embedding service enables calculation of raw embeddings on protein sequences using a number of proprietary and open-source models.

Each of these workflows offers unique functionalities to help you engineer better proteins! 

We offer our tools through [a web application](./dataset-page.md) or a suite of accessible [APIs](./api-introduction.qmd). Both the app and API suite contain the same functionality, so that it can suit any workflows. 

## Starting your first project

When embarking on the first project, it is essential to choose the appropriate module based on the dataset. 
<style>
.callout-tip-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  /* align-items: center; */
}

.callout-tip-container div.callout-tip.callout{
  width: 40%;
}
</style>

<div class="callout-tip-container">
::: {.callout-tip} 
## To create a design, you will need:
  * Dataset with mesurements
  * Target design objectives
:::
::: {.callout-tip} 
## To use PoET, you will need:
  * Seed sequence
  * Query (optional)
:::
</div>

For users with functional measurements, who want to extrapolate sequence - function relationships using OpenProtein’s suite of machine learning tools, this is the place to start. [Projects](./dataset-page.md) enable visualizing data, use existing data to predict novel sequence properties, and design new sequences with user-specified constraints. To learn how to initiate a project, please refer to our detailed step-by-step [tutorial](./mutagenesis-page).

For users who want to start de novo, without wet lab measurements, use our generative PoET workflow to score and generate sequences. PoET infers sequence fitness based on evolutionary fitness from a user-defined [prompt](./poet-defining-prompts-page), most commonly a multiple sequence alignment. For more details on PoET, please refer to our detailed step-by-step tutorial.

To learn how to interact with the platform’s functionality via API, view more details [here](./api-introduction.qmd). The suite of API allows integrating OpenProtein.AI into specific applications or workflows which also allows access to features such as project management, PoET capabilities, and data analysis.

## What’s next?

For the next steps, initiate a [project](./dataset-page.md) or run a job via [PoET](./poet-introduction-page.md). If you are looking for more in depth information, take a look at our [walkthrough](./demo-datasets-page.md) section and learn how to do more specific things like exploring a dataset, setting design criteria, and defining prompts.