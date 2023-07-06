---
title: Introduction to OpenProtein
format:
  html:
    code-fold: true
---

This article includes a high-level summary of core features, along with links to explore more
documentation for each area.

<table class="table table-bordered">
  <!-- <caption>As described in the section above, Quarto tables are great.</caption> -->
  <thead>
    <tr>
      <th scope="col" colspan="2">Content</th>
      <th scope="col">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr scope="row">
      <td class="p-3" rowspan="4">Projects</td>
      <td class="p-3"><a href="./dataset-page.md">Dataset</a></td>
      <td class="pe-5 pt-3">
        This section includes details about the expected format of datasets, steps to upload and dataset visualizations. 
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./predictions-page.md">Prediction</a></td>
      <td class="pe-5 pt-3">
        Learn how you can run prediction jobs using a variant sequence and view property predictions for all single variants. 
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./design-page.md">Design</a></td>
      <td class="pe-5 pt-3">
        The design module allows you to create the best base sequences based on specific properties. Once a user has run the design tool, you can find your optimized sequences in this module.  
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./models-page.md">Models</a></td>
      <td class="pe-5 pt-3">
        This section includes details about training models and how you can evaluate the predictive performance of the trained models. 
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3" colspan="2"><a href="./job-status-page.md">Job Status</a></td>
      <td class="pe-5 pt-3">
        This section provides an overview of job status, enabling users to track the progress of their submitted jobs. 
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3" rowspan="3">PoET</td>
      <td class="p-3"><a href="./poet-introduction-page.md">Introduction to PoET</a></td>
      <td class="pe-5 pt-3">
        PoET is a generative protein language model that allows you to design protein sequences de novo, without functional measurements of your protein of interest. 
        <br></br>
        This section highlights the key features of PoET 
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./poet-defining-prompts-page.md">Using PoET</a></td>
      <td class="pe-5 pt-3">
        Learn about how you can define your prompts to specify and control what sequences are used to define this generative context. 
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./poet-tools-page.md">PoET tools</a></td>
      <td class="pe-5 pt-3">
        Step by step guide to using PoET:
        <ul>
          <li>Scoring sequences</li>
          <li>Single site analysis</li>
          <li>Generate novel sequences</li>
        </ul>
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3" rowspan="4">Walkthroughs</td>
      <td class="p-3"><a href="./demo-datasets-page.md">Demo datasets</a></td>
      <td class="pe-5 pt-3">
        View and download the dataset used in our tutorials as well as links to the published papers.
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./mutagenesis-page.md">Walkthrough: ML-guided mutagenesis and sequence-to-function modeling</a></td>
      <td class="pe-5 pt-3">
        This walkthrough uses a deep mutational scanning dataset of an aliphatic amide hydrolase from Pseudomonas aeruginosa. In this tutorial you will learn how to: 
        <ul>
          <li>Analyzing mutagenesis datasets</li>
          <li>Train sequence-to-function prediction models</li>
          <li>Design optimized libraries of sequence variants</li>
        </ul>
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./poet-tutorial-page.md">Tutorial: Designing de novo variant libraries using PoET</a></td>
      <td class="pe-5 pt-3">
        Chorismate mutase is an important enzyme involved in the biosynthesis of aromatic amino acids. Specifically, it catalyzes the conversion of chorismate to prephenate. In this tutorial, we will use PoET to generate a prospective de novo variant library for chorismate mutase
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3"><a href="./poet-thiolase-codehidden.ipynb">Tutorial: Generating substrate specific thiolases with PoET</a></td>
      <td class="pe-5 pt-3">
        Thiolases play a critical role in catalyzing thioester formation — a key process in fatty acid biosynthesis in vivo. In this tutorial, we will show how you can explore your data, core candidate proteins, or generate a custom diverse library before running any wetlab experiments.
      </td>
    </tr>
    <tr scope="row">
      <td class="p-3" colspan="2"><a href="./api-introduction.qmd">API docs</a></td>
      <td class="pe-5 pt-3">
        This section includes the details about our endpoints and how you can initiate and track your jobs. 
      </td>
    </tr>
  </tbody>
</table>