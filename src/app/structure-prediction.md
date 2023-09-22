---
title: Structural Prediction
format:
  html:
    code-fold: true
bibliography: references.bib
---

Visualize the 3D structures of your protein sequences using open source models like ESMfold, @lin2023evolutionary.  ESMFold leverages the ESM2 protein language model to derive meaningful representations from the protein sequence. Subsequently, the ESMFold structure prediction neural network employs these representations to directly forecast the 3D coordinates of the protein's constituent atoms. For detailed information about the model, please refer [here](https://www.science.org/doi/10.1126/science.ade2574). 
The ESMfold model can also be accessed via REST APIs or our python client. 

  

## Input Protein Sequence
Start by accessing the Protein Structure Visualization feature on our platform and input your protein sequence. Simply type it in or upload a .fasta file containing the sequence data.

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/struct_input.gif" width="600" height="300"></img>
</p>

## Model Training
Once your sequence is entered, click the "Next" button to proceed. This will initiate the ESMfold model to begin its analysis.The model will process your data, interpreting the sequence to predict the 3D folding structure.

  

## Explore 3D Visualization
After the model has completed its training, you'll be presented with a 3D visualization of the protein structure. This visualization is powered by the Mol* Viewer tool, @rose_alexander_s_2022_7089479 (https://molstar.org/viewer/), which allows you to interactively explore the structure. Use the tools provided by the Mol* Viewer to zoom, rotate, and pan through the 3D structure. 

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/struct_molstar.gif" width="600" height="300"></img>
</p>
  
## Export
If you wish to save or share the 3D structure, you can export it as a .pdb file.

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/struct_export.png" width="600" height="300"></img>
</p>

## History

To view your previously generated structure, under the ‘History’ section, select the previous jobs by the file name or date of creation.   

<p align="center">
  <img style="display:flex;" src="/main_tutorial_images/struct_history.gif" width="600" height="300"></img>
</p>